import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { posix } from "node:path";

import { parseSync } from "oxc-parser";

const execFileAsync = promisify(execFile);
const GIT_OBJECT = /^[a-f0-9]{40}$/u;
const REPOSITORY = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/u;
const MAX_GIT_OUTPUT_BYTES = 8 * 1024 * 1024;
const MAX_PRODUCTS = 8;
const MAX_FILES_PER_PRODUCT = 64;
const MAX_SOURCE_BYTES = 2 * 1024 * 1024;
const MAX_TOTAL_SOURCE_BYTES = 16 * 1024 * 1024;
const MAX_PATH_LENGTH = 1024;
const MAX_PATTERN_LENGTH = 4096;
const REGULAR_FILE_MODES = new Set(["100644", "100755"]);
const WORKSPACE_DEPENDENCY = /^workspace:[*^~]$/u;
const STATIC_BINDING_PATH = /^[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*$/u;

export class ProductSourceEvidenceError extends Error {
  constructor(code, message) {
    super(`${code}: ${message}`);
    this.name = "ProductSourceEvidenceError";
    this.code = code;
  }
}

function fail(code, message) {
  throw new ProductSourceEvidenceError(code, message);
}

function requireRecord(value, label) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    fail("E-SCHEMA", `${label} must be an object`);
  }
  return value;
}

function requireString(value, label) {
  if (typeof value !== "string" || value.length === 0) {
    fail("E-SCHEMA", `${label} must be a non-empty string`);
  }
  return value;
}

function requireGitObject(value, label) {
  const object = requireString(value, label);
  if (!GIT_OBJECT.test(object)) fail("E-SCHEMA", `${label} must be a full lowercase Git object ID`);
  return object;
}

function requireRepositoryPath(value, label) {
  const path = requireString(value, label);
  if (path.length > MAX_PATH_LENGTH
    || path.startsWith("/")
    || path.includes("\\")
    || path.includes("\0")
    || path.includes("\n")
    || path.includes("\r")
    || path.includes(":")) {
    fail("E-SCHEMA", `${label} must be a portable repository-relative path`);
  }
  const normalized = posix.normalize(path);
  if (normalized !== path || normalized === "." || normalized.startsWith("../")) {
    fail("E-SCHEMA", `${label} must not escape or normalize outside the repository`);
  }
  return path;
}

async function runGit(repositoryRoot, args, { allowNoMatches = false } = {}) {
  const gitEnvironment = {
    PATH: process.env.PATH,
    SystemRoot: process.env.SystemRoot,
    WINDIR: process.env.WINDIR,
    COMSPEC: process.env.COMSPEC,
    PATHEXT: process.env.PATHEXT,
    TMPDIR: process.env.TMPDIR,
    TMP: process.env.TMP,
    TEMP: process.env.TEMP,
    HOME: process.env.HOME,
    GIT_CONFIG_NOSYSTEM: "1",
    GIT_CONFIG_GLOBAL: process.platform === "win32" ? "NUL" : "/dev/null",
    GIT_NO_REPLACE_OBJECTS: "1",
    GIT_OPTIONAL_LOCKS: "0",
    LC_ALL: "C",
  };
  try {
    const result = await execFileAsync("git", ["--no-replace-objects", ...args], {
      cwd: repositoryRoot,
      encoding: "utf8",
      maxBuffer: MAX_GIT_OUTPUT_BYTES,
      env: Object.fromEntries(Object.entries(gitEnvironment).filter(([, value]) => value !== undefined)),
    });
    return { exitCode: 0, stdout: result.stdout, stderr: result.stderr };
  } catch (error) {
    if (allowNoMatches && error?.code === 1) {
      return {
        exitCode: 1,
        stdout: typeof error.stdout === "string" ? error.stdout : "",
        stderr: typeof error.stderr === "string" ? error.stderr : "",
      };
    }
    const detail = typeof error?.stderr === "string" && error.stderr.trim().length > 0
      ? error.stderr.trim()
      : error instanceof Error ? error.message : String(error);
    fail("E-GIT", `git ${args[0] ?? "command"} failed in ${repositoryRoot}: ${detail}`);
  }
}

function normalizeGitHubRepository(remote) {
  const value = remote.trim().replace(/\.git$/u, "");
  const scp = /^git@github\.com:([^/]+\/[^/]+)$/u.exec(value);
  if (scp !== null) return scp[1];
  try {
    const url = new URL(value);
    if (url.hostname !== "github.com") return undefined;
    return url.pathname.replace(/^\//u, "");
  } catch {
    return undefined;
  }
}

function syntaxName(node) {
  if (typeof node?.name === "string") return node.name;
  if (typeof node?.value === "string") return node.value;
  return undefined;
}

function bindingNames(pattern) {
  if (pattern?.type === "Identifier") return [pattern.name];
  if (pattern?.type === "ObjectPattern") {
    return pattern.properties.flatMap(property => bindingNames(property.value ?? property.argument));
  }
  if (pattern?.type === "ArrayPattern") return pattern.elements.flatMap(bindingNames);
  if (pattern?.type === "AssignmentPattern") return bindingNames(pattern.left);
  if (pattern?.type === "RestElement") return bindingNames(pattern.argument);
  return [];
}

function declarationNames(declaration) {
  if (declaration === null || declaration === undefined) return [];
  if (declaration.type === "VariableDeclaration") {
    return declaration.declarations.flatMap(entry => bindingNames(entry.id));
  }
  return typeof declaration.id?.name === "string" ? [declaration.id.name] : [];
}

function parseProgram(filename, source) {
  let result;
  try {
    result = parseSync(filename, source, { sourceType: "module" });
  } catch (error) {
    fail("E-AST", `${filename} cannot be parsed by Oxc: ${error instanceof Error ? error.message : String(error)}`);
  }
  const errors = result.errors.filter(error => error.severity === "Error");
  if (errors.length > 0) fail("E-AST", `${filename} cannot be parsed by Oxc: ${errors[0].message}`);
  return result.program;
}

function exportedNames(program) {
  const names = new Set();
  for (const node of program.body) {
    if (node.type === "ExportDefaultDeclaration") names.add("default");
    if (node.type !== "ExportNamedDeclaration") continue;
    for (const name of declarationNames(node.declaration)) names.add(name);
    for (const specifier of node.specifiers ?? []) {
      const name = syntaxName(specifier.exported);
      if (name !== undefined) names.add(name);
    }
  }
  return names;
}

function walk(value, visit, seen = new Set()) {
  if (typeof value !== "object" || value === null || seen.has(value)) return;
  seen.add(value);
  visit(value);
  for (const child of Object.values(value)) {
    if (Array.isArray(child)) {
      for (const entry of child) walk(entry, visit, seen);
    } else {
      walk(child, visit, seen);
    }
  }
}

function walkWithContext(value, visit, ancestors = [], parent = undefined, key = undefined) {
  if (typeof value !== "object" || value === null) return;
  visit(value, { ancestors, key, parent });
  const nextAncestors = [...ancestors, value];
  for (const [childKey, child] of Object.entries(value)) {
    if (Array.isArray(child)) {
      for (const entry of child) {
        walkWithContext(entry, visit, nextAncestors, value, childKey);
      }
    } else {
      walkWithContext(child, visit, nextAncestors, value, childKey);
    }
  }
}

function isWithinTypeSyntax(ancestors) {
  return ancestors.some(ancestor => (
    ancestor.type === "TSTypeAnnotation"
    || ancestor.type === "TSInterfaceDeclaration"
    || ancestor.type === "TSTypeAliasDeclaration"
    || ancestor.type === "TSTypeParameterDeclaration"
    || ancestor.type === "TSTypeParameterInstantiation"
    || ancestor.type === "TSHeritageClause"
  ));
}

function isRuntimeIdentifierReference(node, context) {
  const { ancestors, key, parent } = context;
  if (node.type !== "Identifier" || isWithinTypeSyntax(ancestors)) return false;
  if (ancestors.some(ancestor => ancestor.type === "ImportDeclaration")) return false;
  if ((parent?.type === "VariableDeclarator"
      || parent?.type === "FunctionDeclaration"
      || parent?.type === "FunctionExpression"
      || parent?.type === "ClassDeclaration"
      || parent?.type === "ClassExpression")
    && key === "id") return false;
  if (parent?.type === "MemberExpression" && key === "property" && parent.computed === false) {
    return false;
  }
  if ((parent?.type === "Property"
      || parent?.type === "MethodDefinition"
      || parent?.type === "PropertyDefinition"
      || parent?.type === "TSMethodSignature"
      || parent?.type === "TSPropertySignature")
    && key === "key"
    && parent.computed === false) return false;
  if ((parent?.type === "LabeledStatement"
      || parent?.type === "BreakStatement"
      || parent?.type === "ContinueStatement")
    && key === "label") return false;
  return true;
}

function runtimeIdentifierReferences(root, name) {
  const references = [];
  walkWithContext(root, (node, context) => {
    if (node.type === "Identifier"
      && node.name === name
      && isRuntimeIdentifierReference(node, context)) {
      references.push({ node, ...context });
    }
  });
  return references;
}

function assertExactRuntimeReferences(root, name, expectedNodes, label, product) {
  const references = runtimeIdentifierReferences(root, name);
  const expected = new Set(expectedNodes);
  if (references.length !== expected.size
    || references.some(reference => !expected.has(reference.node))) {
    fail("E-WIRING", `${product} ${label} ${name} must not be aliased, rebound, or used indirectly`);
  }
}

function collectBindingIdentifierNodes(pattern, bindings) {
  if (pattern?.type === "Identifier") {
    bindings.push(pattern);
    return;
  }
  if (pattern?.type === "ObjectPattern") {
    for (const property of pattern.properties) {
      collectBindingIdentifierNodes(property.value ?? property.argument, bindings);
    }
    return;
  }
  if (pattern?.type === "ArrayPattern") {
    for (const element of pattern.elements) collectBindingIdentifierNodes(element, bindings);
    return;
  }
  if (pattern?.type === "AssignmentPattern") {
    collectBindingIdentifierNodes(pattern.left, bindings);
    return;
  }
  if (pattern?.type === "RestElement" || pattern?.type === "TSParameterProperty") {
    collectBindingIdentifierNodes(pattern.argument ?? pattern.parameter, bindings);
  }
}

function bindingIdentifierNodes(root) {
  const bindings = [];
  walk(root, node => {
    if (node.type === "VariableDeclarator") collectBindingIdentifierNodes(node.id, bindings);
    if (node.type === "FunctionDeclaration"
      || node.type === "FunctionExpression"
      || node.type === "ArrowFunctionExpression") {
      if (node.id?.type === "Identifier") bindings.push(node.id);
      for (const parameter of node.params ?? []) collectBindingIdentifierNodes(parameter, bindings);
    }
    if ((node.type === "ClassDeclaration" || node.type === "ClassExpression")
      && node.id?.type === "Identifier") bindings.push(node.id);
    if (node.type === "CatchClause") collectBindingIdentifierNodes(node.param, bindings);
  });
  return bindings;
}

function assertNoLexicalShadowing(callable, names, allowedBindings, product) {
  const tracked = new Set(names);
  for (const binding of bindingIdentifierNodes(callable)) {
    if (tracked.has(binding.name) && !allowedBindings.has(binding)) {
      fail("E-WIRING", `${product} tracked runtime identifier ${binding.name} must not be lexically shadowed`);
    }
  }
}

function isMutationReference(reference) {
  return reference.ancestors.some(ancestor => (
    (ancestor.type === "AssignmentExpression"
      && reference.node.start >= ancestor.left.start
      && reference.node.end <= ancestor.left.end)
    || (ancestor.type === "UpdateExpression"
      && reference.node.start >= ancestor.argument.start
      && reference.node.end <= ancestor.argument.end)
    || (ancestor.type === "UnaryExpression"
      && ancestor.operator === "delete"
      && reference.node.start >= ancestor.argument.start
      && reference.node.end <= ancestor.argument.end)
  ));
}

function closureReturnsReference(reference, closure) {
  if (closure.type === "ArrowFunctionExpression" && closure.body?.type !== "BlockStatement") {
    return true;
  }
  return reference.ancestors.some(ancestor => (
    ancestor.type === "ReturnStatement"
    && ancestor.start >= closure.body.start
    && ancestor.end <= closure.body.end
  ));
}

function facadeClosureReturnsInvocation(reference, facade) {
  const closures = reference.ancestors.filter(ancestor => (
    ancestor.type === "FunctionExpression" || ancestor.type === "ArrowFunctionExpression"
  ));
  const closure = closures.at(-1);
  if (closure === undefined
    || !facade.properties.some(property => property.type === "Property" && property.value === closure)) {
    return false;
  }
  if (closureReturnsReference(reference, closure)) return true;
  const resultBinding = reference.ancestors.find(ancestor => (
    ancestor.type === "VariableDeclarator"
    && ancestor.id?.type === "Identifier"
    && reference.node.start >= ancestor.init?.start
    && reference.node.end <= ancestor.init?.end
  ));
  if (resultBinding === undefined) return false;
  return runtimeIdentifierReferences(closure.body, resultBinding.id.name).some(resultReference => (
    !isMutationReference(resultReference)
    && resultReference.ancestors.some(ancestor => ancestor.type === "ReturnStatement")
  ));
}

function resolveRelativeImportPath(rootPath, source) {
  if (!source.startsWith(".")) return undefined;
  const resolved = posix.normalize(posix.join(posix.dirname(rootPath), source));
  return posix.extname(resolved).length > 0 ? resolved : `${resolved}.ts`;
}

function parseModuleResolutionConfig(sourcePath, source) {
  let config;
  try {
    config = JSON.parse(source);
  } catch (error) {
    fail("E-WIRING", `${sourcePath} must be strict JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
  const compilerOptions = requireRecord(config.compilerOptions ?? {}, `${sourcePath}.compilerOptions`);
  const paths = requireRecord(compilerOptions.paths ?? {}, `${sourcePath}.compilerOptions.paths`);
  const baseUrl = compilerOptions.baseUrl === undefined
    ? "."
    : requireRepositoryPath(compilerOptions.baseUrl, `${sourcePath}.compilerOptions.baseUrl`);
  const mappings = [];
  for (const [pattern, targetsValue] of Object.entries(paths)) {
    if (pattern.length === 0 || pattern.length > MAX_PATH_LENGTH || /[\0\n\r]/u.test(pattern)) {
      fail("E-WIRING", `${sourcePath} contains an invalid path alias`);
    }
    if (!Array.isArray(targetsValue) || targetsValue.length !== 1) {
      fail("E-WIRING", `${sourcePath} path alias ${pattern} must have exactly one qualification target`);
    }
    const target = requireString(targetsValue[0], `${sourcePath}.compilerOptions.paths.${pattern}[0]`);
    const patternStars = [...pattern].filter(character => character === "*").length;
    const targetStars = [...target].filter(character => character === "*").length;
    if (patternStars > 1 || targetStars !== patternStars) {
      fail("E-WIRING", `${sourcePath} path alias ${pattern} is outside the qualification subset`);
    }
    mappings.push({ pattern, target });
  }
  return Object.freeze({ sourcePath, baseUrl, mappings: Object.freeze(mappings) });
}

function resolveImportPath(importerPath, source, moduleResolution) {
  const relative = resolveRelativeImportPath(importerPath, source);
  if (relative !== undefined) return relative;
  if (moduleResolution === undefined) return undefined;
  const matches = [];
  for (const mapping of moduleResolution.mappings) {
    const starIndex = mapping.pattern.indexOf("*");
    if (starIndex === -1) {
      if (source !== mapping.pattern) continue;
      matches.push(mapping.target);
      continue;
    }
    const prefix = mapping.pattern.slice(0, starIndex);
    const suffix = mapping.pattern.slice(starIndex + 1);
    if (!source.startsWith(prefix) || !source.endsWith(suffix)) continue;
    const wildcard = source.slice(prefix.length, source.length - suffix.length);
    matches.push(mapping.target.replace("*", wildcard));
  }
  if (matches.length !== 1) return undefined;
  const resolved = posix.normalize(posix.join(
    posix.dirname(moduleResolution.sourcePath),
    moduleResolution.baseUrl,
    matches[0],
  ));
  const withoutPrefix = resolved.replace(/^\.\//u, "");
  return posix.extname(withoutPrefix).length > 0 ? withoutPrefix : `${withoutPrefix}.ts`;
}

function importBindings(program, importerPath, moduleResolution) {
  const imports = [];
  for (const node of program.body) {
    if (node.type !== "ImportDeclaration" || typeof node.source?.value !== "string") continue;
    for (const specifier of node.specifiers ?? []) {
      const imported = specifier.type === "ImportSpecifier"
        ? syntaxName(specifier.imported)
        : specifier.type === "ImportDefaultSpecifier"
          ? "default"
          : specifier.type === "ImportNamespaceSpecifier"
            ? "*"
            : undefined;
      if (imported === undefined) continue;
      imports.push({
        imported,
        local: syntaxName(specifier.local),
        kind: node.importKind === "type" || specifier.importKind === "type" ? "type" : "value",
        moduleSpecifier: node.source.value,
        path: resolveImportPath(importerPath, node.source.value, moduleResolution),
      });
    }
  }
  return imports;
}

function exactImport(
  imports,
  { kind, moduleSpecifier, path, symbol },
  label,
  product,
) {
  const candidates = imports.filter(entry => (
    entry.imported === symbol
    && (moduleSpecifier === undefined || entry.moduleSpecifier === moduleSpecifier)
    && (path === undefined || entry.path === path)
  ));
  const localBindings = imports.filter(entry => entry.local === symbol);
  if (candidates.length !== 1
    || localBindings.length !== 1
    || localBindings[0] !== candidates[0]
    || candidates[0].local !== symbol
    || candidates[0].kind !== kind) {
    fail(
      "E-WIRING",
      `${product} ${label} must be exactly one ${kind} ${symbol} import with no alias`,
    );
  }
  return candidates[0];
}

function classConstructorDependency(
  classDeclaration,
  program,
  imports,
  { dependency, portSource, portSymbol },
  product,
) {
  const constructors = (classDeclaration.body?.body ?? [])
    .filter(member => member.type === "MethodDefinition" && member.kind === "constructor");
  if (constructors.length !== 1
    || constructors[0].value?.params?.length !== 1
    || constructors[0].value.params[0]?.type !== "TSParameterProperty") {
    fail("E-WIRING", `${product} consumer constructor must retain one readonly dependency parameter`);
  }
  const parameterProperty = constructors[0].value.params[0];
  const parameter = parameterProperty.parameter;
  if (parameter?.type !== "Identifier" || parameterProperty.readonly !== true) {
    fail("E-WIRING", `${product} consumer constructor dependency must be one readonly identifier property`);
  }
  const annotation = parameter.typeAnnotation?.typeAnnotation;
  let members;
  if (annotation?.type === "TSTypeLiteral") {
    members = annotation.members ?? annotation.body;
  } else {
    const dependencyTypeName = typeReferenceName(annotation);
    const declaration = dependencyTypeName === undefined
      ? undefined
      : declarationForType(program, dependencyTypeName);
    if (declaration?.type === "TSInterfaceDeclaration"
      && (declaration.extends ?? []).length === 0) {
      members = declaration.body?.body;
    } else if (declaration?.type === "TSTypeAliasDeclaration"
      && declaration.typeAnnotation?.type === "TSTypeLiteral") {
      members = declaration.typeAnnotation.members ?? declaration.typeAnnotation.body;
    }
  }
  const dependencyMembers = Array.isArray(members)
    ? members.filter(member => propertyName(member) === dependency)
    : [];
  if (dependencyMembers.length !== 1) {
    fail("E-WIRING", `${product} consumer constructor dependency object must contain exactly one ${dependency}`);
  }
  const dependencyMember = dependencyMembers[0];
  const dependencyType = dependencyMember?.typeAnnotation?.typeAnnotation;
  const typeArguments = dependencyType?.typeArguments?.params ?? dependencyType?.typeArguments?.arguments;
  const elementType = dependencyType?.type === "TSArrayType"
    ? dependencyType.elementType
    : dependencyType?.type === "TSTypeOperator"
      && dependencyType.operator === "readonly"
      && dependencyType.typeAnnotation?.type === "TSArrayType"
      ? dependencyType.typeAnnotation.elementType
      : dependencyType?.type === "TSTypeReference"
        && (typeReferenceName(dependencyType) === "ReadonlyArray"
          || typeReferenceName(dependencyType) === "Array")
        && typeArguments?.length === 1
        ? typeArguments[0]
      : undefined;
  if (dependencyMember?.type !== "TSPropertySignature"
    || dependencyMember.computed === true
    || dependencyMember.optional === true
    || propertyName(dependencyMember) !== dependency
    || typeReferenceName(elementType) !== portSymbol) {
    fail("E-WIRING", `${product} consumer constructor must accept ${dependency} as an ordered ${portSymbol} array`);
  }
  exactImport(
    imports,
    { kind: "type", path: portSource, symbol: portSymbol },
    "consumer port",
    product,
  );

  const uses = [];
  for (const member of classDeclaration.body?.body ?? []) {
    if (member === constructors[0]) continue;
    walkWithContext(member, (node, context) => {
      if (node.type !== "MemberExpression"
        || node.computed === true
        || syntaxName(node.property) !== dependency
        || node.object?.type !== "MemberExpression"
        || node.object.computed === true
        || node.object.object?.type !== "ThisExpression"
        || syntaxName(node.object.property) !== parameter.name) return;
      if (context.ancestors.some(ancestor => ancestor.type === "CallExpression")) {
        uses.push({ node, context });
      }
    });
  }
  if (uses.length === 0) {
    fail("E-WIRING", `${product} consumer behavior must use retained constructor dependency ${dependency}`);
  }
}

function exactExportedDeclaration(program, type, name) {
  const declarations = program.body
    .filter(node => node.type === "ExportNamedDeclaration")
    .map(node => node.declaration)
    .filter(declaration => declaration?.type === type && declaration.id?.name === name);
  return declarations.length === 1 ? declarations[0] : undefined;
}

function exportedCallable(program, name) {
  const callables = [];
  for (const node of program.body) {
    if (node.type !== "ExportNamedDeclaration") continue;
    if (node.declaration?.type === "FunctionDeclaration"
      && node.declaration.id?.name === name) {
      callables.push(node.declaration);
    }
    if (node.declaration?.type === "VariableDeclaration") {
      for (const entry of node.declaration.declarations) {
        if (entry.id?.type === "Identifier"
          && entry.id.name === name
          && (entry.init?.type === "ArrowFunctionExpression"
            || entry.init?.type === "FunctionExpression")) {
          callables.push(entry.init);
        }
      }
    }
  }
  return callables.length === 1 ? callables[0] : undefined;
}

function typeReferenceName(annotation) {
  const type = annotation?.type === "TSTypeAnnotation" ? annotation.typeAnnotation : annotation;
  return type?.type === "TSTypeReference" && type.typeName?.type === "Identifier"
    ? type.typeName.name
    : undefined;
}

function isPromiseVoid(annotation) {
  const type = annotation?.type === "TSTypeAnnotation" ? annotation.typeAnnotation : annotation;
  const argumentsList = type?.typeArguments?.params ?? type?.typeArguments?.arguments;
  return typeReferenceName(type) === "Promise"
    && argumentsList?.length === 1
    && argumentsList[0]?.type === "TSVoidKeyword";
}

function localInterfaceDeclaration(program, name, label, product) {
  const declarations = [];
  for (const node of program.body) {
    const declaration = node.type === "ExportNamedDeclaration" ? node.declaration : node;
    if (declaration?.type === "TSInterfaceDeclaration" && declaration.id?.name === name) {
      declarations.push(declaration);
    }
  }
  if (declarations.length !== 1) {
    fail("E-WIRING", `${product} ${label} ${name} must be one exact local interface declaration`);
  }
  return declarations[0];
}

function localDeclarationCount(program, name) {
  return program.body.reduce((count, node) => count + Number(declarationNames(
    node.type === "ExportNamedDeclaration" ? node.declaration : node,
  ).includes(name)), 0);
}

function interfaceDeclarations(program) {
  const declarations = new Map();
  for (const node of program.body) {
    const declaration = node.type === "ExportNamedDeclaration" ? node.declaration : node;
    if (declaration?.type === "TSInterfaceDeclaration" && declaration.id?.name !== undefined) {
      const entries = declarations.get(declaration.id.name) ?? [];
      entries.push(declaration);
      declarations.set(declaration.id.name, entries);
    }
  }
  return declarations;
}

function interfacePropertyNames(program, name, product) {
  const declarations = interfaceDeclarations(program);
  const visiting = new Set();
  const visited = new Set();
  const properties = new Set();
  const collect = currentName => {
    if (visited.has(currentName)) return;
    if (visiting.has(currentName)) {
      fail("E-WIRING", `${product} contract interface inheritance must be acyclic`);
    }
    const matchingDeclarations = declarations.get(currentName);
    if (matchingDeclarations === undefined || matchingDeclarations.length !== 1) {
      fail("E-WIRING", `${product} contract interface ${currentName} must be declared in the tracked contract source`);
    }
    const declaration = matchingDeclarations[0];
    visiting.add(currentName);
    for (const heritage of declaration.extends ?? []) {
      const inheritedName = syntaxName(heritage.expression);
      if (inheritedName === undefined) {
        fail("E-WIRING", `${product} contract interface ${currentName} uses unsupported inheritance`);
      }
      collect(inheritedName);
    }
    for (const member of declaration.body?.body ?? []) {
      if (member.type !== "TSPropertySignature"
        || member.computed === true
        || member.optional === true
        || member.readonly !== true) {
        fail("E-WIRING", `${product} contract interface ${currentName} must expose only required readonly capabilities`);
      }
      const memberName = propertyName(member);
      if (memberName === undefined || properties.has(memberName)) {
        fail("E-WIRING", `${product} contract capability names must be unique static keys`);
      }
      properties.add(memberName);
    }
    visiting.delete(currentName);
    visited.add(currentName);
  };
  collect(name);
  return [...properties].sort();
}

function interfacePropertyEntries(program, name, product) {
  const declarations = interfaceDeclarations(program);
  const entries = new Map();
  const visiting = new Set();
  const collect = currentName => {
    if (visiting.has(currentName)) {
      fail("E-WIRING", `${product} interface ${currentName} inheritance must be acyclic`);
    }
    const matching = declarations.get(currentName);
    if (matching?.length !== 1 || matching[0].typeParameters !== null) {
      fail("E-WIRING", `${product} interface ${currentName} must be one non-generic local declaration`);
    }
    visiting.add(currentName);
    for (const heritage of matching[0].extends ?? []) {
      const inheritedName = syntaxName(heritage.expression);
      if (inheritedName === undefined || heritage.typeArguments !== null) {
        fail("E-WIRING", `${product} interface ${currentName} uses unsupported generic inheritance`);
      }
      collect(inheritedName);
    }
    for (const member of matching[0].body?.body ?? []) {
      const memberName = propertyName(member);
      if (member.type !== "TSPropertySignature"
        || member.computed === true
        || member.optional === true
        || member.readonly !== true
        || memberName === undefined
        || entries.has(memberName)) {
        fail("E-WIRING", `${product} interface ${currentName} must have unique required readonly properties`);
      }
      entries.set(memberName, member);
    }
    visiting.delete(currentName);
  };
  collect(name);
  return entries;
}

function declarationForType(program, name) {
  const declarations = [];
  for (const node of program.body) {
    const declaration = node.type === "ExportNamedDeclaration" ? node.declaration : node;
    if ((declaration?.type === "TSInterfaceDeclaration"
        || declaration?.type === "TSTypeAliasDeclaration")
      && declaration.id?.name === name) declarations.push(declaration);
  }
  return declarations.length === 1 ? declarations[0] : undefined;
}

function closedTypeMemberNames(
  typeNode,
  program,
  programPath,
  imports,
  externalPrograms,
  label,
  product,
  visiting = new Set(),
) {
  if (typeNode?.type === "TSTypeAnnotation") {
    return closedTypeMemberNames(
      typeNode.typeAnnotation,
      program,
      programPath,
      imports,
      externalPrograms,
      label,
      product,
      visiting,
    );
  }
  if (typeNode?.type === "TSTypeLiteral") {
    const names = [];
    for (const member of typeNode.members ?? typeNode.body ?? []) {
      const name = propertyName(member);
      if ((member.type !== "TSPropertySignature" && member.type !== "TSMethodSignature")
        || member.computed === true
        || member.optional === true
        || name === undefined
        || names.includes(name)) {
        fail("E-WIRING", `${product} ${label} must contain unique required static members`);
      }
      names.push(name);
    }
    return names.sort();
  }
  const name = typeReferenceName(typeNode);
  if (name === undefined || visiting.has(name)) {
    fail("E-WIRING", `${product} ${label} must resolve to one closed non-generic object type`);
  }
  if (typeNode.typeArguments !== null) {
    fail("E-WIRING", `${product} ${label} must not use a generic type reference`);
  }
  const imported = imports.filter(entry => entry.local === name);
  let targetProgram = program;
  let targetProgramPath = programPath;
  let declarationName = name;
  if (imported.length > 0) {
    if (imported.length !== 1 || imported[0].kind !== "type" || imported[0].imported !== name) {
      fail("E-WIRING", `${product} ${label} must use one exact type import`);
    }
    targetProgramPath = imported[0].path?.replace(/\.(?:c|m)?js$/u, ".ts");
    targetProgram = externalPrograms.get(imported[0].path)
      ?? externalPrograms.get(targetProgramPath);
    if (targetProgram === undefined) {
      fail("E-WIRING", `${product} ${label} type ${name} must resolve to inspected source`);
    }
    declarationName = imported[0].imported;
  }
  const declaration = declarationForType(targetProgram, declarationName);
  if (declaration === undefined || declaration.typeParameters !== null) {
    fail("E-WIRING", `${product} ${label} type ${name} must be one non-generic declaration`);
  }
  const nextVisiting = new Set(visiting).add(name);
  if (declaration.type === "TSTypeAliasDeclaration") {
    return closedTypeMemberNames(
      declaration.typeAnnotation,
      targetProgram,
      targetProgramPath,
      importBindings(targetProgram, targetProgramPath),
      externalPrograms,
      label,
      product,
      nextVisiting,
    );
  }
  const names = [];
  for (const heritage of declaration.extends ?? []) {
    if (heritage.typeArguments !== null) {
      fail("E-WIRING", `${product} ${label} must not use generic inheritance`);
    }
    names.push(...closedTypeMemberNames(
      { type: "TSTypeReference", typeName: heritage.expression, typeArguments: null },
      targetProgram,
      targetProgramPath,
      importBindings(targetProgram, targetProgramPath),
      externalPrograms,
      label,
      product,
      nextVisiting,
    ));
  }
  for (const member of declaration.body?.body ?? []) {
    const memberName = propertyName(member);
    if ((member.type !== "TSPropertySignature" && member.type !== "TSMethodSignature")
      || member.computed === true
      || member.optional === true
      || memberName === undefined
      || names.includes(memberName)) {
      fail("E-WIRING", `${product} ${label} must contain unique required static members`);
    }
    names.push(memberName);
  }
  return names.sort();
}

function parseJsonRecord(sourcePath, source, label) {
  let value;
  try {
    value = JSON.parse(source);
  } catch (error) {
    fail("E-WIRING", `${sourcePath} must be strict JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
  return requireRecord(value, label);
}

function isPathWithin(directory, path) {
  return directory === "." || path.startsWith(`${directory}/`);
}

function sourcePathForRuntimeExport(importerPath, moduleSpecifier) {
  const resolved = resolveRelativeImportPath(importerPath, moduleSpecifier);
  if (resolved === undefined) return undefined;
  return resolved.replace(/\.(?:c|m)?js$/u, ".ts");
}

function verifyFactoryPublication(
  { barrelPath, manifestPath, moduleSpecifier, sourcePath, symbol },
  sourcesByPath,
  consumerDependencies,
  product,
) {
  const barrelSource = sourcesByPath.get(barrelPath);
  if (barrelSource === undefined) {
    fail("E-WIRING", `${product} composition barrel ${barrelPath} must also be listed in files`);
  }
  const barrelProgram = parseProgram(barrelPath, barrelSource);
  const reexports = [];
  for (const node of barrelProgram.body) {
    if (node.type !== "ExportNamedDeclaration" || typeof node.source?.value !== "string") continue;
    for (const specifier of node.specifiers ?? []) {
      if (syntaxName(specifier.exported) === symbol) reexports.push({ node, specifier });
    }
  }
  if (reexports.length !== 1
    || syntaxName(reexports[0].specifier.local ?? reexports[0].specifier.imported) !== symbol
    || reexports[0].node.exportKind === "type"
    || reexports[0].specifier.exportKind === "type"
    || sourcePathForRuntimeExport(barrelPath, reexports[0].node.source.value) !== sourcePath) {
    fail("E-WIRING", `${product} ${barrelPath} must value-re-export ${symbol} from ${sourcePath} with no alias`);
  }

  const manifestSource = sourcesByPath.get(manifestPath);
  if (manifestSource === undefined) {
    fail("E-WIRING", `${product} package manifest ${manifestPath} must also be listed in files`);
  }
  const manifest = parseJsonRecord(manifestPath, manifestSource, `${product} package manifest`);
  const packageName = requireString(manifest.name, `${product} package manifest.name`);
  if (!moduleSpecifier.startsWith(`${packageName}/`)) {
    fail("E-WIRING", `${product} ${moduleSpecifier} must be a subpath of ${packageName}`);
  }
  const subpath = `.${moduleSpecifier.slice(packageName.length)}`;
  const exports = requireRecord(manifest.exports, `${product} package manifest.exports`);
  const exportTarget = requireRecord(exports[subpath], `${product} package manifest.exports.${subpath}`);
  const importTarget = requireString(exportTarget.import, `${product} package manifest.exports.${subpath}.import`);
  const dependencyReference = consumerDependencies[packageName];
  if (typeof dependencyReference !== "string" || !WORKSPACE_DEPENDENCY.test(dependencyReference)) {
    fail(
      "E-WIRING",
      `${product} consumer must bind ${packageName} to the inspected package with a symbolic workspace dependency`,
    );
  }
  const manifestDirectory = posix.dirname(manifestPath);
  const sourceDirectory = posix.join(manifestDirectory, "src");
  const sourceRelative = posix.relative(sourceDirectory, barrelPath);
  if (sourceRelative.startsWith("../") || sourceRelative === ".." || posix.extname(sourceRelative) !== ".ts") {
    fail("E-WIRING", `${product} composition barrel ${barrelPath} must be under ${sourceDirectory}`);
  }
  if (!importTarget.startsWith("./") || importTarget.includes("\\") || /[\0\n\r]/u.test(importTarget)) {
    fail("E-WIRING", `${product} ${moduleSpecifier} import target must be a portable package-relative path`);
  }
  const targetSegments = importTarget.slice(2).split("/");
  if (targetSegments.some(segment => segment === "" || segment === "." || segment === "..")) {
    fail("E-WIRING", `${product} ${moduleSpecifier} import target must not contain dot or empty segments`);
  }
  const expectedTarget = `./dist/${sourceRelative.slice(0, -posix.extname(sourceRelative).length)}.js`;
  if (importTarget !== expectedTarget) {
    fail("E-WIRING", `${product} ${moduleSpecifier} export target does not identify ${barrelPath}`);
  }
  return packageName;
}

function propertyName(property) {
  if (property?.computed === true) return undefined;
  return syntaxName(property?.key);
}

function arrayProviderConstructions(expression) {
  if (expression?.type !== "ArrayExpression") return undefined;
  const constructions = [];
  for (const element of expression.elements) {
    if (element?.type !== "NewExpression" || element.callee?.type !== "Identifier") return undefined;
    constructions.push(element);
  }
  return constructions;
}

function verifyOrderedContributionsComposition(composition, sourcesByPath, product) {
  const rootPath = requireRepositoryPath(composition.root, `${product}.composition.root`);
  const rootSource = sourcesByPath.get(rootPath);
  if (rootSource === undefined) {
    fail("E-WIRING", `${product} composition root ${rootPath} must also be listed in files`);
  }
  if (!Array.isArray(composition.orderedProviders)
    || composition.orderedProviders.length < 2
    || composition.orderedProviders.length > MAX_FILES_PER_PRODUCT) {
    fail("E-SCHEMA", `${product}.composition.orderedProviders must contain 2-${MAX_FILES_PER_PRODUCT} providers`);
  }

  const resolution = requireRecord(composition.moduleResolution, `${product}.composition.moduleResolution`);
  const resolutionSource = requireRepositoryPath(
    resolution.source,
    `${product}.composition.moduleResolution.source`,
  );
  const resolutionBytes = sourcesByPath.get(resolutionSource);
  if (resolutionBytes === undefined) {
    fail("E-WIRING", `${product} module resolution source ${resolutionSource} must also be listed in files`);
  }
  const moduleResolution = parseModuleResolutionConfig(resolutionSource, resolutionBytes);
  const program = parseProgram(rootPath, rootSource);
  const imports = importBindings(program, rootPath, moduleResolution);
  const factory = requireString(composition.factory, `${product}.composition.factory`);
  const factoryDeclaration = exactExportedDeclaration(program, "FunctionDeclaration", factory);
  if (factoryDeclaration?.body?.type !== "BlockStatement") {
    fail("E-WIRING", `${product} root must export one exact function declaration ${factory}`);
  }

  const port = requireRecord(composition.port, `${product}.composition.port`);
  const portSymbol = requireString(port.symbol, `${product}.composition.port.symbol`);
  const portSource = requireRepositoryPath(port.source, `${product}.composition.port.source`);
  const portModuleSpecifier = requireString(port.moduleSpecifier, `${product}.composition.port.moduleSpecifier`);
  if (portModuleSpecifier.length > MAX_PATH_LENGTH || /[\0\n\r]/u.test(portModuleSpecifier)) {
    fail("E-SCHEMA", `${product}.composition.port.moduleSpecifier is invalid`);
  }
  const portBytes = sourcesByPath.get(portSource);
  if (portBytes === undefined) fail("E-WIRING", `${product} port source ${portSource} must also be listed in files`);
  const portProgram = parseProgram(portSource, portBytes);
  if (exactExportedDeclaration(portProgram, "TSInterfaceDeclaration", portSymbol) === undefined) {
    fail("E-WIRING", `${product} port ${portSymbol} must be one exact exported interface declaration`);
  }

  const consumer = requireRecord(composition.consumer, `${product}.composition.consumer`);
  const consumerSymbol = requireString(consumer.symbol, `${product}.composition.consumer.symbol`);
  const consumerSource = requireRepositoryPath(consumer.source, `${product}.composition.consumer.source`);
  const dependency = requireString(consumer.dependency, `${product}.composition.consumer.dependency`);
  const consumerBytes = sourcesByPath.get(consumerSource);
  if (consumerBytes === undefined) fail("E-WIRING", `${product} consumer source ${consumerSource} must also be listed in files`);
  const consumerProgram = parseProgram(consumerSource, consumerBytes);
  const consumerClass = exactExportedDeclaration(consumerProgram, "ClassDeclaration", consumerSymbol);
  if (consumerClass === undefined) {
    fail("E-WIRING", `${product} consumer ${consumerSymbol} must be one exact exported class declaration`);
  }
  classConstructorDependency(
    consumerClass,
    consumerProgram,
    importBindings(consumerProgram, consumerSource, moduleResolution),
    { dependency, moduleSpecifier: portModuleSpecifier, portSource, portSymbol },
    product,
  );
  exactImport(
    imports,
    { kind: "value", path: consumerSource, symbol: consumerSymbol },
    "composition root consumer",
    product,
  );

  const expectedProviders = [];
  const providerKeys = new Set();
  for (const [index, providerValue] of composition.orderedProviders.entries()) {
    const provider = requireRecord(providerValue, `${product}.composition.orderedProviders[${index}]`);
    const symbol = requireString(provider.symbol, `${product}.composition.orderedProviders[${index}].symbol`);
    const sourcePath = requireRepositoryPath(provider.source, `${product}.composition.orderedProviders[${index}].source`);
    const providerKey = `${sourcePath}\0${symbol}`;
    if (providerKeys.has(providerKey)) fail("E-SCHEMA", `${product}.composition.orderedProviders must be unique`);
    providerKeys.add(providerKey);
    if (!sourcesByPath.has(sourcePath)) {
      fail("E-WIRING", `${product} provider source ${sourcePath} must also be listed in files`);
    }
    exactImport(
      imports,
      { kind: "value", path: sourcePath, symbol },
      "composition root provider",
      product,
    );
    const providerProgram = parseProgram(sourcePath, sourcesByPath.get(sourcePath));
    const providerImports = importBindings(providerProgram, sourcePath, moduleResolution);
    exactImport(
      providerImports,
      {
        kind: "type",
        moduleSpecifier: portModuleSpecifier,
        path: portSource,
        symbol: portSymbol,
      },
      `provider ${symbol} port`,
      product,
    );
    const providerClass = exactExportedDeclaration(providerProgram, "ClassDeclaration", symbol);
    if (providerClass === undefined
      || !(providerClass.implements ?? []).some(entry => syntaxName(entry.expression) === portSymbol)) {
      fail("E-WIRING", `${product} provider ${symbol} must explicitly implement ${portSymbol} from ${portModuleSpecifier}`);
    }
    expectedProviders.push(symbol);
  }

  const consumerDeclarations = [];
  for (const [statementIndex, statement] of factoryDeclaration.body.body.entries()) {
    if (statement.type !== "VariableDeclaration") continue;
    for (const declaration of statement.declarations) {
      if (declaration.init?.type === "NewExpression"
        && declaration.init.callee?.type === "Identifier"
        && declaration.init.callee.name === consumerSymbol) {
        consumerDeclarations.push({ declaration, statement, statementIndex });
      }
    }
  }
  if (consumerDeclarations.length !== 1
    || consumerDeclarations[0].statement.kind !== "const"
    || consumerDeclarations[0].statement.declarations.length !== 1
    || consumerDeclarations[0].declaration.id?.type !== "Identifier") {
    fail("E-WIRING", `${product} ${consumerSymbol} must be constructed once into one top-level const`);
  }
  const consumerDeclaration = consumerDeclarations[0];
  const consumerConstruction = consumerDeclaration.declaration.init;
  const reservedRuntimeNames = new Set([consumerSymbol, ...expectedProviders]);
  if (reservedRuntimeNames.has(consumerDeclaration.declaration.id.name)) {
    fail("E-WIRING", `${product} consumer result binding must not shadow a tracked runtime import`);
  }
  assertExactRuntimeReferences(
    program,
    consumerSymbol,
    [consumerConstruction.callee],
    "composition consumer",
    product,
  );
  if (consumerConstruction.arguments?.length !== 1
    || consumerConstruction.arguments[0]?.type !== "ObjectExpression") {
    fail("E-WIRING", `${product} ${consumerSymbol} must receive one explicit dependency object`);
  }
  const dependencyObject = consumerConstruction.arguments[0];
  const dependencyProperties = staticObjectProperties(
    dependencyObject,
    `${consumerSymbol} dependency object`,
    product,
  );
  const dependencyValue = dependencyProperties.get(dependency);
  if (dependencyValue === undefined) {
    fail("E-WIRING", `${product} ${consumerSymbol} must receive ${dependency}`);
  }

  let providerArray = dependencyValue;
  let providerBinding;
  if (providerArray.type === "Identifier") {
    const declarations = factoryDeclaration.body.body
      .flatMap((statement, statementIndex) => statement.type === "VariableDeclaration"
        ? statement.declarations.map(declaration => ({ declaration, statement, statementIndex }))
        : [])
      .filter(({ declaration }) => declaration.id?.type === "Identifier"
        && declaration.id.name === providerArray.name);
    if (declarations.length !== 1
      || declarations[0].statement.kind !== "const"
      || declarations[0].statement.declarations.length !== 1) {
      fail("E-WIRING", `${product} effective ${dependency} binding must be one immutable top-level const`);
    }
    providerBinding = declarations[0];
    if (reservedRuntimeNames.has(providerBinding.declaration.id.name)) {
      fail("E-WIRING", `${product} provider collection binding must not shadow a tracked runtime import`);
    }
    assertExactRuntimeReferences(
      factoryDeclaration.body,
      providerArray.name,
      [dependencyValue],
      `effective ${dependency} binding`,
      product,
    );
    providerArray = providerBinding.declaration.init;
  }
  const providerConstructions = arrayProviderConstructions(providerArray);
  const effectiveProviders = providerConstructions?.map(construction => construction.callee.name);
  if (effectiveProviders === undefined
    || effectiveProviders.length !== expectedProviders.length
    || effectiveProviders.some((name, index) => name !== expectedProviders[index])) {
    fail("E-WIRING", `${product} effective ${dependency} order is ${JSON.stringify(effectiveProviders)}, expected ${JSON.stringify(expectedProviders)}`);
  }
  for (const [index, providerSymbol] of expectedProviders.entries()) {
    assertExactRuntimeReferences(
      program,
      providerSymbol,
      [providerConstructions[index].callee],
      "composition provider",
      product,
    );
  }

  const returnStatements = factoryDeclaration.body.body
    .map((statement, statementIndex) => ({ statement, statementIndex }))
    .filter(({ statement }) => statement.type === "ReturnStatement");
  if (returnStatements.length !== 1 || returnStatements[0].statement.argument?.type !== "ObjectExpression") {
    fail("E-WIRING", `${product} factory must directly return one facade object`);
  }
  const facade = returnStatements[0].statement.argument;
  const facadeClosures = [];
  const facadeNames = new Set();
  for (const property of facade.properties) {
    const name = propertyName(property);
    if (property.type !== "Property"
      || property.computed === true
      || property.kind !== "init"
      || name === undefined
      || facadeNames.has(name)
      || (property.value?.type !== "FunctionExpression"
        && property.value?.type !== "ArrowFunctionExpression")) {
      fail("E-WIRING", `${product} returned facade must contain unique static function or method closures`);
    }
    facadeNames.add(name);
    facadeClosures.push(property.value);
  }
  if (facadeClosures.length === 0) {
    fail("E-WIRING", `${product} returned facade must expose behavior closures`);
  }
  if (consumerDeclaration.statementIndex >= returnStatements[0].statementIndex
    || (providerBinding !== undefined
      && providerBinding.statementIndex >= consumerDeclaration.statementIndex)) {
    fail("E-WIRING", `${product} providers and consumer must be constructed before the returned facade`);
  }

  const consumerBinding = consumerDeclaration.declaration.id;
  const consumerReferences = runtimeIdentifierReferences(factoryDeclaration.body, consumerBinding.name);
  if (consumerReferences.length === 0
    || consumerReferences.some(reference => (
      !reference.ancestors.includes(facade)
      || reference.parent?.type !== "MemberExpression"
      || reference.key !== "object"
      || !reference.ancestors.some(ancestor => (
        ancestor.type === "CallExpression" && ancestor.callee === reference.parent
      ))
      || !facadeClosureReturnsInvocation(reference, facade)
      || isMutationReference(reference)
    ))) {
    fail("E-WIRING", `${product} returned facade behavior must retain and invoke the immutable consumer`);
  }
  if (facadeClosures.some(closure => !consumerReferences.some(reference => (
    reference.ancestors.includes(closure)
  )))) {
    fail("E-WIRING", `${product} every returned facade behavior must retain the immutable consumer`);
  }

  const allowedBindings = new Set([consumerBinding]);
  if (providerBinding !== undefined) allowedBindings.add(providerBinding.declaration.id);
  assertNoLexicalShadowing(
    factoryDeclaration,
    [consumerSymbol, ...expectedProviders, consumerBinding.name, providerBinding?.declaration.id.name]
      .filter(Boolean),
    allowedBindings,
    product,
  );
  return {
    kind: "ordered-contributions",
    root: rootPath,
    factory,
    port: portSymbol,
    consumer: consumerSymbol,
    dependency,
    orderedProviders: expectedProviders,
  };
}

function staticObjectProperties(expression, label, product) {
  if (expression?.type !== "ObjectExpression") {
    fail("E-WIRING", `${product} ${label} must be a static object literal`);
  }
  const properties = new Map();
  for (const property of expression.properties) {
    if (property.type !== "Property"
      || property.computed === true
      || property.kind !== "init"
      || property.method === true) {
      fail("E-WIRING", `${product} ${label} must not contain spreads, computed keys, methods, or accessors`);
    }
    const name = propertyName(property);
    if (name === undefined || properties.has(name)) {
      fail("E-WIRING", `${product} ${label} must use unique static keys`);
    }
    properties.set(name, property.value);
  }
  return properties;
}

function hostDependencyValue(dependencyObject, dependency, product) {
  let current = dependencyObject;
  const traversed = [];
  for (const segment of dependency.split(".")) {
    const properties = staticObjectProperties(
      current,
      traversed.length === 0
        ? "host dependency object"
        : `host dependency bundle ${traversed.join(".")}`,
      product,
    );
    current = properties.get(segment);
    traversed.push(segment);
    if (current === undefined) {
      fail("E-WIRING", `${product} host dependency ${dependency} is missing`);
    }
  }
  return current;
}

function featureDependencyBindingReference(value, binding, dependency, product) {
  if (value?.type === "Identifier" && value.name === binding) return value;
  const leaf = dependency.slice(dependency.lastIndexOf(".") + 1);
  if (value?.type === "MemberExpression"
    && value.computed === false
    && value.object?.type === "Identifier"
    && value.object.name === binding
    && syntaxName(value.property) === leaf) {
    return value.object;
  }
  fail(
    "E-WIRING",
    `${product} host dependency ${dependency} must be ${binding} or ${binding}.${leaf}`,
  );
}

function verifyHostFactoryContracts(
  program,
  hostCallable,
  rootImports,
  contractInterface,
  expectedCapabilities,
  contractProgram,
  contractSource,
  configuredDependencies,
  rootPath,
  sourcesByPath,
  product,
) {
  if (hostCallable.typeParameters !== null
    || hostCallable.params?.length !== 1
    || hostCallable.params[0]?.type !== "Identifier"
    || hostCallable.params[0].optional === true) {
    fail("E-WIRING", `${product} host factory must accept one simply typed dependency parameter`);
  }
  const dependencyInterfaceName = typeReferenceName(hostCallable.params[0].typeAnnotation);
  if (dependencyInterfaceName === undefined) {
    fail("E-WIRING", `${product} host factory dependency parameter must name one local interface`);
  }
  if (rootImports.some(entry => entry.local === dependencyInterfaceName)) {
    fail("E-WIRING", `${product} host dependency interface ${dependencyInterfaceName} must be local`);
  }
  const dependencyInterface = localInterfaceDeclaration(
    program,
    dependencyInterfaceName,
    "host dependency interface",
    product,
  );
  if (localDeclarationCount(program, dependencyInterfaceName) !== 1) {
    fail("E-WIRING", `${product} host dependency interface ${dependencyInterfaceName} must not have a local decoy`);
  }
  if ((dependencyInterface.extends ?? []).length !== 0
    || dependencyInterface.typeParameters !== null) {
    fail("E-WIRING", `${product} host dependency interface must declare its capabilities directly`);
  }
  const dependencyCapabilities = [];
  const dependencyMembers = new Map();
  const externalPrograms = new Map();
  for (const [sourcePath, source] of sourcesByPath) {
    if (/\.(?:c|m)?tsx?$/u.test(sourcePath)) {
      externalPrograms.set(sourcePath, parseProgram(sourcePath, source));
    }
  }
  for (const member of dependencyInterface.body?.body ?? []) {
    const name = propertyName(member);
    if (member.type !== "TSPropertySignature"
      || member.computed === true
      || member.optional === true
      || member.readonly !== true
      || name === undefined
      || dependencyCapabilities.includes(name)) {
      fail("E-WIRING", `${product} host dependency interface must contain unique required readonly capability properties`);
    }
    dependencyCapabilities.push(name);
    dependencyMembers.set(name, closedTypeMemberNames(
      member.typeAnnotation,
      program,
      rootPath,
      rootImports,
      externalPrograms,
      `host dependency capability ${name}`,
      product,
    ));
  }
  dependencyCapabilities.sort();
  if (dependencyCapabilities.length !== expectedCapabilities.length
    || dependencyCapabilities.some((name, index) => name !== expectedCapabilities[index])) {
    fail(
      "E-WIRING",
      `${product} host dependency capabilities are ${JSON.stringify(dependencyCapabilities)}, expected ${JSON.stringify(expectedCapabilities)}`,
    );
  }

  const hostInterfaceName = typeReferenceName(hostCallable.returnType);
  if (hostInterfaceName === undefined || rootImports.some(entry => entry.local === hostInterfaceName)) {
    fail("E-WIRING", `${product} host factory return type must name one local interface`);
  }
  const hostInterface = localInterfaceDeclaration(
    program,
    hostInterfaceName,
    "host return interface",
    product,
  );
  if (localDeclarationCount(program, hostInterfaceName) !== 1) {
    fail("E-WIRING", `${product} host return interface ${hostInterfaceName} must not have a local decoy`);
  }
  if (hostInterface.typeParameters !== null) {
    fail("E-WIRING", `${product} host return interface must not shadow its access contract`);
  }
  const interfaces = interfaceDeclarations(program);
  const accessMethods = [];
  const disposeMethods = [];
  const contractReferences = [];
  let hasAsyncDisposeMember = false;
  const visiting = new Set();
  const visited = new Set();
  const collectHostInterface = (name, declaration) => {
    if (visited.has(name)) return;
    if (visiting.has(name)) {
      fail("E-WIRING", `${product} host return interface inheritance must be acyclic`);
    }
    visiting.add(name);
    if (declaration.typeParameters !== null) {
      fail("E-WIRING", `${product} host return interface inheritance must be non-generic`);
    }
    for (const heritage of declaration.extends ?? []) {
      const inheritedName = syntaxName(heritage.expression);
      const inherited = inheritedName === undefined ? undefined : interfaces.get(inheritedName);
      if (inherited?.length === 1) {
        if (heritage.typeArguments !== null) {
          fail("E-WIRING", `${product} host return interface inheritance must be non-generic`);
        }
        collectHostInterface(inheritedName, inherited[0]);
        continue;
      }
      if (inheritedName !== "AsyncDisposable"
        || heritage.typeArguments !== null
        || rootImports.some(entry => entry.local === inheritedName)
        || localDeclarationCount(program, inheritedName) !== 0) {
        fail("E-WIRING", `${product} host return interface uses unproven inheritance ${inheritedName ?? "<computed>"}`);
      }
    }
    for (const member of declaration.body?.body ?? []) {
      if (member.computed === true) {
        const key = member.key;
        if (member.type !== "TSMethodSignature"
          || key?.type !== "MemberExpression"
          || key.computed === true
          || key.object?.type !== "Identifier"
          || key.object.name !== "Symbol"
          || syntaxName(key.property) !== "asyncDispose"
          || member.optional === true
          || member.params?.length !== 0
          || !isPromiseVoid(member.returnType)
          || hasAsyncDisposeMember) {
          fail("E-WIRING", `${product} host return interface contains an unsupported computed member`);
        }
        hasAsyncDisposeMember = true;
        continue;
      }
      const memberName = propertyName(member);
      if (memberName !== "bindAccess" && memberName !== "dispose") {
        fail("E-WIRING", `${product} host return interface may expose only bindAccess and dispose`);
      }
      if (member.type === "TSMethodSignature"
        && member.computed === false
        && memberName === "bindAccess"
        && member.optional !== true
        && member.typeParameters === null
        && member.params?.length === 1
        && typeReferenceName(member.returnType) === contractInterface) {
        accessMethods.push(member);
      }
      if (member.type === "TSMethodSignature"
        && member.computed === false
        && memberName === "dispose"
        && member.optional !== true
        && member.typeParameters === null
        && member.params?.length === 0
        && isPromiseVoid(member.returnType)) disposeMethods.push(member);
      walk(member, node => {
        if (node.type === "Identifier" && node.name === contractInterface) {
          contractReferences.push(node);
        }
      });
    }
    visiting.delete(name);
    visited.add(name);
  };
  collectHostInterface(hostInterfaceName, hostInterface);
  if (accessMethods.length !== 1 || disposeMethods.length !== 1) {
    fail(
      "E-WIRING",
      `${product} host return interface must expose exact bindAccess and dispose methods`,
    );
  }
  const accessContractReference = accessMethods[0].returnType.typeAnnotation.typeName;
  if (contractReferences.length !== 1 || contractReferences[0] !== accessContractReference) {
    fail("E-WIRING", `${product} host return interface must use ${contractInterface} only as that method return`);
  }

  const accessEntries = interfacePropertyEntries(contractProgram, contractInterface, product);
  const configuredByCapability = new Map(expectedCapabilities.map(capability => [capability, []]));
  for (const dependency of configuredDependencies) {
    const [capability, member, ...rest] = dependency.split(".");
    if (rest.length > 0) {
      fail("E-SCHEMA", `${product}.composition host dependencies must identify direct capability members`);
    }
    configuredByCapability.get(capability).push(member);
  }
  const contractImports = importBindings(contractProgram, contractSource);
  for (const capability of expectedCapabilities) {
    const accessMember = accessEntries.get(capability);
    const accessMembers = closedTypeMemberNames(
      accessMember.typeAnnotation,
      contractProgram,
      contractSource,
      contractImports,
      externalPrograms,
      `access capability ${capability}`,
      product,
    );
    const hostMembers = dependencyMembers.get(capability);
    const configuredMembers = configuredByCapability.get(capability).sort();
    if (accessMembers.length === 0) {
      fail("E-WIRING", `${product} access capability ${capability} must expose a closed non-empty surface`);
    }
    if (configuredMembers.some(name => !hostMembers.includes(name))) {
      fail(
        "E-WIRING",
        `${product} capability ${capability} configured ownership must be a subset of the closed host shape`,
      );
    }
  }

  verifyHostFactoryBody(
    hostCallable,
    contractInterface,
    expectedCapabilities,
    product,
  );
  return dependencyMembers;
}

function verifyHostFactoryBody(hostCallable, contractInterface, expectedCapabilities, product) {
  const dependencyParameter = hostCallable.params[0];
  const topLevelDeclarations = hostCallable.body?.type === "BlockStatement"
    ? hostCallable.body.body.flatMap(statement => statement.type === "VariableDeclaration"
      ? statement.declarations.map(declaration => ({ declaration, statement }))
      : [])
    : [];
  const unwrapParentheses = expression => expression?.type === "ParenthesizedExpression"
    ? unwrapParentheses(expression.expression)
    : expression;
  const hostObjectBindingReferences = [];
  const resolveHostObject = (expression, resolving = new Set()) => {
    const unwrapped = unwrapParentheses(expression);
    if (unwrapped?.type === "ObjectExpression") return unwrapped;
    if (unwrapped?.type === "CallExpression"
      && unwrapped.arguments?.length === 1
      && unwrapped.callee?.type === "MemberExpression"
      && unwrapped.callee.computed === false
      && unwrapped.callee.object?.type === "Identifier"
      && unwrapped.callee.object.name === "Object"
      && syntaxName(unwrapped.callee.property) === "freeze") {
      return resolveHostObject(unwrapped.arguments[0], resolving);
    }
    if (unwrapped?.type === "Identifier") {
      if (resolving.has(unwrapped.name)) return undefined;
      const matches = topLevelDeclarations.filter(({ declaration }) => (
        declaration.id?.type === "Identifier" && declaration.id.name === unwrapped.name
      ));
      if (matches.length === 1
        && matches[0].statement.kind === "const"
        && matches[0].statement.declarations.length === 1) {
        hostObjectBindingReferences.push({ name: unwrapped.name, reference: unwrapped });
        return resolveHostObject(
          matches[0].declaration.init,
          new Set(resolving).add(unwrapped.name),
        );
      }
    }
    return undefined;
  };
  let returnedExpression;
  if (hostCallable.body?.type === "BlockStatement") {
    const returns = hostCallable.body.body.filter(statement => statement.type === "ReturnStatement");
    if (returns.length === 1) returnedExpression = returns[0].argument;
  } else {
    returnedExpression = hostCallable.body;
  }
  const returnedHost = resolveHostObject(returnedExpression);
  if (returnedHost === undefined) {
    fail("E-WIRING", `${product} host factory must return a retained host object, not a cast decoy`);
  }
  for (const binding of hostObjectBindingReferences) {
    assertExactRuntimeReferences(
      hostCallable.body,
      binding.name,
      [binding.reference],
      "returned host binding",
      product,
    );
  }
  const closureBindingReferences = [];
  const resolveClosure = expression => {
    if (expression?.type === "FunctionExpression" || expression?.type === "ArrowFunctionExpression") {
      return expression;
    }
    if (expression?.type !== "Identifier") return undefined;
    const matches = topLevelDeclarations.filter(({ declaration }) => (
      declaration.id?.type === "Identifier" && declaration.id.name === expression.name
    ));
    if (matches.length !== 1
      || matches[0].statement.kind !== "const"
      || matches[0].statement.declarations.length !== 1) return undefined;
    const initializer = matches[0].declaration.init;
    if (initializer?.type !== "FunctionExpression" && initializer?.type !== "ArrowFunctionExpression") {
      return undefined;
    }
    closureBindingReferences.push({ name: expression.name, reference: expression });
    return initializer;
  };
  const methods = new Map();
  const returnedHostNames = new Set();
  let hasAsyncDispose = false;
  for (const property of returnedHost.properties) {
    if (property.type !== "Property" || property.kind !== "init") {
      fail("E-WIRING", `${product} returned host must not contain spreads or accessors`);
    }
    if (property.computed === true) {
      const key = property.key;
      if (key?.type !== "MemberExpression"
        || key.computed === true
        || key.object?.type !== "Identifier"
        || key.object.name !== "Symbol"
        || syntaxName(key.property) !== "asyncDispose"
        || hasAsyncDispose) {
        fail("E-WIRING", `${product} returned host must not contain unknown computed members`);
      }
      hasAsyncDispose = true;
      continue;
    }
    const name = propertyName(property);
    if (name === undefined || returnedHostNames.has(name)) {
      fail("E-WIRING", `${product} returned host must use unique static member names`);
    }
    returnedHostNames.add(name);
    if (name === "bindAccess" || name === "dispose") {
      if (methods.has(name)) {
        fail("E-WIRING", `${product} returned host must expose unique bindAccess and dispose closures`);
      }
      methods.set(name, resolveClosure(property.value));
    }
  }
  const bindAccess = methods.get("bindAccess");
  const dispose = methods.get("dispose");
  if (bindAccess === undefined
    || dispose === undefined
    || bindAccess.params?.length !== 1
    || (bindAccess.returnType != null
      && typeReferenceName(bindAccess.returnType) !== contractInterface)
    || dispose.params?.length !== 0) {
    fail("E-WIRING", `${product} returned host must implement bindAccess returning imported ${contractInterface} and dispose`);
  }
  for (const binding of closureBindingReferences) {
    const returnedHostReferences = returnedHost.properties
      .filter(property => (
        property.type === "Property"
        && property.value?.type === "Identifier"
        && property.value.name === binding.name
      ))
      .map(property => property.value);
    assertExactRuntimeReferences(
      hostCallable.body,
      binding.name,
      returnedHostReferences,
      "returned host closure",
      product,
    );
  }
  const isDiscardedReference = reference => reference.ancestors.some(ancestor => (
    ancestor.type === "UnaryExpression" && ancestor.operator === "void"
  ));
  const capabilityFromMemberReference = (reference, available) => {
    if (reference.parent?.type === "MemberExpression"
      && reference.key === "object"
      && reference.parent.computed === false) {
      const member = syntaxName(reference.parent.property);
      if (available.has(member)) return new Set([member]);
    }
    return new Set(available);
  };
  const derivedCapabilities = new Map();
  for (const { declaration, statement } of topLevelDeclarations) {
    if (statement.kind !== "const"
      || statement.declarations.length !== 1
      || declaration.id?.type !== "Identifier"
      || declaration.init === null) continue;
    const provenance = new Set();
    for (const reference of runtimeIdentifierReferences(declaration.init, dependencyParameter.name)) {
      if (isMutationReference(reference)) {
        fail("E-WIRING", `${product} composed host dependencies must remain immutable`);
      }
      if (!isDiscardedReference(reference)) {
        for (const capability of capabilityFromMemberReference(
          reference,
          new Set(expectedCapabilities),
        )) provenance.add(capability);
      }
    }
    for (const [binding, capabilities] of derivedCapabilities) {
      for (const reference of runtimeIdentifierReferences(declaration.init, binding)) {
        if (isMutationReference(reference)) {
          fail("E-WIRING", `${product} dependency-derived host bindings must remain immutable`);
        }
        if (!isDiscardedReference(reference)) {
          for (const capability of capabilityFromMemberReference(reference, capabilities)) {
            provenance.add(capability);
          }
        }
      }
    }
    if (provenance.size > 0) derivedCapabilities.set(declaration.id.name, provenance);
  }

  const retainedCapabilities = new Set();
  for (const reference of runtimeIdentifierReferences(bindAccess, dependencyParameter.name)) {
    if (!isMutationReference(reference)
      && !isDiscardedReference(reference)
      && closureReturnsReference(reference, bindAccess)) {
      for (const capability of capabilityFromMemberReference(
        reference,
        new Set(expectedCapabilities),
      )) retainedCapabilities.add(capability);
    }
  }
  for (const [binding, capabilities] of derivedCapabilities) {
    for (const reference of runtimeIdentifierReferences(bindAccess, binding)) {
      if (!isMutationReference(reference)
        && !isDiscardedReference(reference)
        && closureReturnsReference(reference, bindAccess)) {
        for (const capability of capabilityFromMemberReference(reference, capabilities)) {
          retainedCapabilities.add(capability);
        }
      }
    }
  }
  if (retainedCapabilities.size === 0) {
    fail("E-WIRING", `${product} returned host closures must retain the immutable composed dependencies`);
  }
  for (const capability of expectedCapabilities) {
    if (!retainedCapabilities.has(capability)) {
      fail("E-WIRING", `${product} bindAccess must retain composed capability ${capability}`);
    }
  }
}

function verifyCapabilityRootFactoryBody(
  program,
  callable,
  factoryEntries,
  hostFactory,
  expectedCapabilities,
  expectedCapabilityMembers,
  product,
) {
  if (callable.body?.type !== "BlockStatement") {
    fail("E-WIRING", `${product} tracked composition factory must have a block body`);
  }
  const bindings = new Map();
  for (const [statementIndex, statement] of callable.body.body.entries()) {
    if (statement.type !== "VariableDeclaration") continue;
    for (const declaration of statement.declarations) {
      if (declaration.init?.type !== "CallExpression"
        || declaration.init.callee?.type !== "Identifier"
        || !factoryEntries.some(entry => entry.symbol === declaration.init.callee.name)) continue;
      if (statement.kind !== "const" || declaration.id?.type !== "Identifier") {
        fail("E-WIRING", `${product} feature factory results must use immutable identifier bindings`);
      }
      if (bindings.has(declaration.init.callee.name)) {
        fail("E-WIRING", `${product} feature factory ${declaration.init.callee.name} has duplicate bindings`);
      }
      bindings.set(declaration.init.callee.name, {
        binding: declaration.id,
        call: declaration.init,
        statementIndex,
      });
    }
  }
  for (const entry of factoryEntries) {
    if (!bindings.has(entry.symbol)) {
      fail("E-WIRING", `${product} feature factory ${entry.symbol} must initialize one top-level const binding`);
    }
  }
  if (new Set([...bindings.values()].map(entry => entry.binding.name)).size !== bindings.size) {
    fail("E-WIRING", `${product} feature factory result bindings must be unique`);
  }
  const reservedRuntimeNames = new Set([hostFactory, ...factoryEntries.map(entry => entry.symbol)]);
  if ([...bindings.values()].some(entry => reservedRuntimeNames.has(entry.binding.name))) {
    fail("E-WIRING", `${product} feature result bindings must not shadow tracked runtime factories`);
  }

  const returnStatements = callable.body.body
    .map((statement, statementIndex) => ({ statement, statementIndex }))
    .filter(({ statement }) => statement.type === "ReturnStatement");
  if (returnStatements.length !== 1) {
    fail("E-WIRING", `${product} capability root must have exactly one top-level return`);
  }
  const hostCall = returnStatements[0].statement.argument;
  if (hostCall?.type !== "CallExpression"
    || hostCall.callee?.type !== "Identifier"
    || hostCall.callee.name !== hostFactory
    || hostCall.arguments?.length !== 1
    || hostCall.arguments[0]?.type !== "ObjectExpression") {
    fail("E-WIRING", `${product} capability root must directly return ${hostFactory} with one dependency object`);
  }
  const dependencyObject = hostCall.arguments[0];
  if ([...bindings.values()].some(entry => entry.statementIndex >= returnStatements[0].statementIndex)) {
    fail("E-WIRING", `${product} all feature factories must initialize before the returned host factory call`);
  }
  const capabilityProperties = staticObjectProperties(dependencyObject, "host dependency object", product);
  const observedCapabilities = [...capabilityProperties.keys()].sort();
  if (observedCapabilities.length !== expectedCapabilities.length
    || observedCapabilities.some((name, index) => name !== expectedCapabilities[index])) {
    fail(
      "E-WIRING",
      `${product} host dependency roots are ${JSON.stringify(observedCapabilities)}, expected ${JSON.stringify(expectedCapabilities)}`,
    );
  }
  for (const capability of expectedCapabilities) {
    const members = staticObjectProperties(
      capabilityProperties.get(capability),
      `host dependency bundle ${capability}`,
      product,
    );
    const observedMembers = [...members.keys()].sort();
    const expectedMembers = expectedCapabilityMembers.get(capability);
    if (observedMembers.length !== expectedMembers.length
      || observedMembers.some((name, index) => name !== expectedMembers[index])) {
      fail(
        "E-WIRING",
        `${product} host dependency bundle ${capability} members are ${JSON.stringify(observedMembers)}, expected closed host shape ${JSON.stringify(expectedMembers)}`,
      );
    }
  }

  const expectedBindingReferences = new Map();
  for (const entry of factoryEntries) {
    const bindingEntry = bindings.get(entry.symbol);
    const binding = bindingEntry.binding.name;
    const expectedReferences = [];
    for (const dependency of entry.hostDependencies) {
      const value = hostDependencyValue(dependencyObject, dependency, product);
      expectedReferences.push(featureDependencyBindingReference(value, binding, dependency, product));
    }
    expectedBindingReferences.set(binding, expectedReferences);
    assertExactRuntimeReferences(
      program,
      entry.symbol,
      [bindingEntry.call.callee],
      "feature factory",
      product,
    );
    assertExactRuntimeReferences(
      callable.body,
      binding,
      expectedReferences,
      `feature result for ${entry.symbol}`,
      product,
    );
  }
  assertExactRuntimeReferences(program, hostFactory, [hostCall.callee], "host factory", product);
  assertNoLexicalShadowing(
    callable,
    [
      hostFactory,
      ...factoryEntries.map(entry => entry.symbol),
      ...expectedBindingReferences.keys(),
    ],
    new Set([...bindings.values()].map(entry => entry.binding)),
    product,
  );
}

function verifyProductCapabilityRootComposition(composition, sourcesByPath, product) {
  const rootPath = requireRepositoryPath(composition.root, `${product}.composition.root`);
  const rootSource = sourcesByPath.get(rootPath);
  if (rootSource === undefined) {
    fail("E-WIRING", `${product} composition root ${rootPath} must also be listed in files`);
  }
  const rootFactory = requireString(composition.rootFactory, `${product}.composition.rootFactory`);
  const hostFactory = requireString(composition.hostFactory, `${product}.composition.hostFactory`);
  if (rootFactory === hostFactory) {
    fail("E-SCHEMA", `${product}.composition rootFactory and hostFactory must differ`);
  }
  const rootProgram = parseProgram(rootPath, rootSource);
  const rootCallable = exportedCallable(rootProgram, rootFactory);
  if (rootCallable === undefined) fail("E-WIRING", `${product} root must export callable ${rootFactory}`);
  const hostCallable = exportedCallable(rootProgram, hostFactory);
  if (hostCallable === undefined) {
    fail("E-WIRING", `${product} root must export callable ${hostFactory}`);
  }
  const rootImports = importBindings(rootProgram, rootPath);

  const consumerManifestPath = requireRepositoryPath(
    composition.consumerManifest,
    `${product}.composition.consumerManifest`,
  );
  const consumerManifestSource = sourcesByPath.get(consumerManifestPath);
  if (consumerManifestSource === undefined) {
    fail("E-WIRING", `${product} consumer manifest ${consumerManifestPath} is missing from exact source evidence`);
  }
  const consumerManifestDirectory = posix.dirname(consumerManifestPath);
  if (!isPathWithin(consumerManifestDirectory, rootPath)) {
    fail("E-WIRING", `${product} composition root ${rootPath} must be owned by ${consumerManifestPath}`);
  }
  const consumerManifest = parseJsonRecord(
    consumerManifestPath,
    consumerManifestSource,
    `${product} consumer package manifest`,
  );
  const consumerDependencies = requireRecord(
    consumerManifest.dependencies,
    `${product} consumer package manifest.dependencies`,
  );

  const contract = requireRecord(composition.contract, `${product}.composition.contract`);
  const contractSource = requireRepositoryPath(contract.source, `${product}.composition.contract.source`);
  const contractBytes = sourcesByPath.get(contractSource);
  if (contractBytes === undefined) {
    fail("E-WIRING", `${product} contract source ${contractSource} must also be listed in files`);
  }
  const contractInterface = requireString(contract.interface, `${product}.composition.contract.interface`);
  const contractModuleSpecifier = requireString(
    contract.moduleSpecifier,
    `${product}.composition.contract.moduleSpecifier`,
  );
  if (sourcePathForRuntimeExport(rootPath, contractModuleSpecifier) !== contractSource) {
    fail("E-WIRING", `${product} contract module specifier must resolve to ${contractSource}`);
  }
  exactImport(
    rootImports,
    { kind: "type", moduleSpecifier: contractModuleSpecifier, symbol: contractInterface },
    "access contract",
    product,
  );
  if (rootProgram.body.some(node => declarationNames(
    node.type === "ExportNamedDeclaration" ? node.declaration : node,
  ).includes(contractInterface))) {
    fail("E-WIRING", `${product} imported access contract ${contractInterface} must not have a local decoy`);
  }
  if (!Array.isArray(contract.capabilities)
    || contract.capabilities.length === 0
    || contract.capabilities.length > MAX_FILES_PER_PRODUCT) {
    fail("E-SCHEMA", `${product}.composition.contract.capabilities must contain 1-${MAX_FILES_PER_PRODUCT} names`);
  }
  const expectedCapabilities = contract.capabilities.map((capability, index) => requireString(
    capability,
    `${product}.composition.contract.capabilities[${index}]`,
  )).sort();
  if (new Set(expectedCapabilities).size !== expectedCapabilities.length) {
    fail("E-SCHEMA", `${product}.composition.contract.capabilities must be unique`);
  }
  const contractProgram = parseProgram(contractSource, contractBytes);
  if (exactExportedDeclaration(
    contractProgram,
    "TSInterfaceDeclaration",
    contractInterface,
  ) === undefined) {
    fail("E-WIRING", `${product} contract source must directly export interface ${contractInterface}`);
  }
  const observedCapabilities = interfacePropertyNames(
    contractProgram,
    contractInterface,
    product,
  );
  if (observedCapabilities.length !== expectedCapabilities.length
    || observedCapabilities.some((capability, index) => capability !== expectedCapabilities[index])) {
    fail(
      "E-WIRING",
      `${product} ${contractInterface} capabilities are ${JSON.stringify(observedCapabilities)}, expected ${JSON.stringify(expectedCapabilities)}`,
    );
  }
  const expectedCapabilitySet = new Set(expectedCapabilities);
  if (!Array.isArray(composition.featureFactories)
    || composition.featureFactories.length === 0
    || composition.featureFactories.length > MAX_FILES_PER_PRODUCT) {
    fail("E-SCHEMA", `${product}.composition.featureFactories must contain 1-${MAX_FILES_PER_PRODUCT} factories`);
  }
  const factoryEntries = [];
  const factoryKeys = new Set();
  const hostDependencyKeys = new Set();
  const packageManifests = new Map();
  for (const [index, factoryValue] of composition.featureFactories.entries()) {
    const factory = requireRecord(factoryValue, `${product}.composition.featureFactories[${index}]`);
    const symbol = requireString(factory.symbol, `${product}.composition.featureFactories[${index}].symbol`);
    const sourcePath = requireRepositoryPath(factory.source, `${product}.composition.featureFactories[${index}].source`);
    const moduleSpecifier = requireString(
      factory.moduleSpecifier,
      `${product}.composition.featureFactories[${index}].moduleSpecifier`,
    );
    const barrelPath = requireRepositoryPath(
      factory.barrel,
      `${product}.composition.featureFactories[${index}].barrel`,
    );
    const manifestPath = requireRepositoryPath(
      factory.manifest,
      `${product}.composition.featureFactories[${index}].manifest`,
    );
    if (!Array.isArray(factory.hostDependencies)
      || factory.hostDependencies.length === 0
      || factory.hostDependencies.length > MAX_FILES_PER_PRODUCT) {
      fail("E-SCHEMA", `${product}.composition.featureFactories[${index}].hostDependencies must contain 1-${MAX_FILES_PER_PRODUCT} names`);
    }
    const hostDependencies = factory.hostDependencies.map((dependency, dependencyIndex) => requireString(
      dependency,
      `${product}.composition.featureFactories[${index}].hostDependencies[${dependencyIndex}]`,
    ));
    for (const dependency of hostDependencies) {
      const segments = dependency.split(".");
      if (!STATIC_BINDING_PATH.test(dependency) || segments.length < 2) {
        fail("E-SCHEMA", `${product}.composition feature host dependency ${dependency} must be a dotted static binding path`);
      }
      if (!expectedCapabilitySet.has(segments[0])) {
        fail("E-WIRING", `${product} host dependency ${dependency} has undeclared capability root ${segments[0]}`);
      }
      if (hostDependencyKeys.has(dependency)) {
        fail("E-SCHEMA", `${product}.composition feature host dependencies must be globally unique`);
      }
      hostDependencyKeys.add(dependency);
    }
    const key = `${sourcePath}\0${symbol}`;
    if (factoryKeys.has(key)) fail("E-SCHEMA", `${product}.composition.featureFactories must be unique`);
    factoryKeys.add(key);
    const factorySource = sourcesByPath.get(sourcePath);
    if (factorySource === undefined) {
      fail("E-WIRING", `${product} feature factory source ${sourcePath} must also be listed in files`);
    }
    if (exportedCallable(parseProgram(sourcePath, factorySource), symbol) === undefined) {
      fail("E-WIRING", `${product} feature factory source ${sourcePath} must export callable ${symbol}`);
    }
    const packageName = verifyFactoryPublication(
      { barrelPath, manifestPath, moduleSpecifier, sourcePath, symbol },
      sourcesByPath,
      consumerDependencies,
      product,
    );
    const previousManifest = packageManifests.get(packageName);
    if (previousManifest !== undefined && previousManifest !== manifestPath) {
      fail("E-WIRING", `${product} package ${packageName} must resolve to one inspected manifest`);
    }
    packageManifests.set(packageName, manifestPath);
    exactImport(
      rootImports,
      { kind: "value", moduleSpecifier, symbol },
      "feature factory",
      product,
    );
    factoryEntries.push({ hostDependencies, symbol });
  }
  const configuredDependencies = [...hostDependencyKeys].sort();
  for (const [index, dependency] of configuredDependencies.entries()) {
    if (configuredDependencies.some((candidate, candidateIndex) => (
      candidateIndex !== index && candidate.startsWith(`${dependency}.`)
    ))) {
      fail("E-SCHEMA", `${product}.composition feature host dependencies must not overlap by prefix`);
    }
  }
  const configuredRoots = new Set(configuredDependencies.map(dependency => dependency.split(".")[0]));
  for (const capability of expectedCapabilities) {
    if (!configuredRoots.has(capability)) {
      fail("E-WIRING", `${product} capability ${capability} must have at least one configured feature dependency`);
    }
  }
  const expectedCapabilityMembers = verifyHostFactoryContracts(
    rootProgram,
    hostCallable,
    rootImports,
    contractInterface,
    expectedCapabilities,
    contractProgram,
    contractSource,
    configuredDependencies,
    rootPath,
    sourcesByPath,
    product,
  );
  verifyCapabilityRootFactoryBody(
    rootProgram,
    rootCallable,
    factoryEntries,
    hostFactory,
    expectedCapabilities,
    expectedCapabilityMembers,
    product,
  );
  return {
    kind: "product-capability-root",
    root: rootPath,
    rootFactory,
    hostFactory,
    consumerManifest: consumerManifestPath,
    contract: contractInterface,
    capabilities: observedCapabilities,
    featureFactories: factoryEntries.map(entry => entry.symbol),
  };
}

function verifyComposition(record, sourcesByPath, product) {
  if (record.composition === undefined) return undefined;
  const composition = requireRecord(record.composition, `${product}.composition`);
  const kind = requireString(composition.kind, `${product}.composition.kind`);
  if (kind === "ordered-contributions") {
    return verifyOrderedContributionsComposition(composition, sourcesByPath, product);
  }
  if (kind === "product-capability-root") {
    return verifyProductCapabilityRootComposition(composition, sourcesByPath, product);
  }
  fail("E-SCHEMA", `${product}.composition.kind is unsupported`);
}

async function verifyNegativeSearch(repositoryRoot, commit, value, product) {
  const search = requireRecord(value, `${product}.negativeSearch`);
  const pattern = requireString(search.pattern, `${product}.negativeSearch.pattern`);
  if (pattern.length > MAX_PATTERN_LENGTH) fail("E-SCHEMA", `${product}.negativeSearch.pattern is too long`);
  if (!Array.isArray(search.paths)
    || search.paths.length === 0
    || search.paths.length > MAX_FILES_PER_PRODUCT) {
    fail("E-SCHEMA", `${product}.negativeSearch.paths must contain 1-${MAX_FILES_PER_PRODUCT} paths`);
  }
  const paths = search.paths.map((path, index) => requireRepositoryPath(
    path,
    `${product}.negativeSearch.paths[${index}]`,
  ));
  if (!Number.isSafeInteger(search.matches) || search.matches < 0) {
    fail("E-SCHEMA", `${product}.negativeSearch.matches must be a non-negative integer`);
  }
  const result = await runGit(repositoryRoot, [
    "grep",
    "-E",
    "-c",
    "--no-color",
    "-e",
    pattern,
    commit,
    "--",
    ...paths,
  ], { allowNoMatches: true });
  const actualMatches = result.exitCode === 1
    ? 0
    : result.stdout.trim().split("\n").filter(Boolean).reduce((total, line) => {
      const match = /:(\d+)$/u.exec(line);
      if (match === null) fail("E-GIT", `${product} returned an unparseable git grep count`);
      return total + Number(match[1]);
    }, 0);
  if (actualMatches !== search.matches) {
    fail("E-SEARCH", `${product} negative search found ${actualMatches}, expected ${search.matches}`);
  }
  return { pattern, paths, matches: actualMatches };
}

async function readGitSource(repositoryRoot, commit, path, expectedBlob, product) {
  const treeResult = await runGit(repositoryRoot, [
    "ls-tree",
    "-z",
    "--full-tree",
    commit,
    "--",
    `:(literal)${path}`,
  ]);
  const entries = treeResult.stdout.split("\0");
  if (entries.at(-1) === "") entries.pop();
  if (entries.length !== 1) {
    fail("E-BLOB", `${product}:${path} must identify exactly one Git tree entry`);
  }
  const separator = entries[0].indexOf("\t");
  const header = separator === -1 ? "" : entries[0].slice(0, separator);
  const observedPath = separator === -1 ? "" : entries[0].slice(separator + 1);
  const headerMatch = /^(\d{6}) ([a-z]+) ([a-f0-9]{40})$/u.exec(header);
  if (headerMatch === null || observedPath !== path) {
    fail("E-BLOB", `${product}:${path} returned an invalid Git tree entry`);
  }
  const [, mode, type, observedBlob] = headerMatch;
  if (!REGULAR_FILE_MODES.has(mode)) {
    fail("E-MODE", `${product}:${path} has Git mode ${mode}, expected 100644 or 100755`);
  }
  if (type !== "blob") fail("E-BLOB", `${product}:${path} resolves to ${type}, expected blob`);
  if (expectedBlob !== undefined && observedBlob !== expectedBlob) {
    fail("E-BLOB", `${product}:${path} blob is ${observedBlob}, expected ${expectedBlob}`);
  }
  const source = (await runGit(repositoryRoot, ["cat-file", "blob", observedBlob])).stdout;
  return { blob: observedBlob, mode, source };
}

export async function verifyProductSourceRecord(product, recordValue, repositoryRoot) {
  const record = requireRecord(recordValue, product);
  const repository = requireString(record.repository, `${product}.repository`);
  if (!REPOSITORY.test(repository)) fail("E-SCHEMA", `${product}.repository must be owner/name`);
  const commit = requireGitObject(record.commit, `${product}.commit`);
  const expectedTree = requireGitObject(record.tree, `${product}.tree`);

  const topLevel = (await runGit(repositoryRoot, ["rev-parse", "--show-toplevel"])).stdout.trim();
  const observedRemote = (await runGit(topLevel, ["remote", "get-url", "origin"])).stdout.trim();
  const observedRepository = normalizeGitHubRepository(observedRemote);
  if (observedRepository !== repository) {
    fail("E-REPOSITORY", `${product} origin identifies ${observedRepository ?? observedRemote}, expected ${repository}`);
  }
  const resolvedCommit = (await runGit(topLevel, ["rev-parse", "--verify", `${commit}^{commit}`])).stdout.trim();
  if (resolvedCommit !== commit) fail("E-COMMIT", `${product} resolved ${resolvedCommit}, expected ${commit}`);
  const observedTree = (await runGit(topLevel, ["show", "-s", "--format=%T", commit])).stdout.trim();
  if (observedTree !== expectedTree) {
    fail("E-TREE", `${product} tree is ${observedTree}, expected ${expectedTree}`);
  }

  if (!Array.isArray(record.files)
    || record.files.length === 0
    || record.files.length > MAX_FILES_PER_PRODUCT) {
    fail("E-SCHEMA", `${product}.files must contain 1-${MAX_FILES_PER_PRODUCT} files`);
  }
  const sourcesByPath = new Map();
  const files = [];
  let totalSourceBytes = 0;
  for (const [index, fileValue] of record.files.entries()) {
    const file = requireRecord(fileValue, `${product}.files[${index}]`);
    const path = requireRepositoryPath(file.path, `${product}.files[${index}].path`);
    if (sourcesByPath.has(path)) fail("E-SCHEMA", `${product} repeats evidence path ${path}`);
    const expectedBlob = requireGitObject(file.blob, `${product}.files[${index}].blob`);
    const { blob: observedBlob, source } = await readGitSource(
      topLevel,
      commit,
      path,
      expectedBlob,
      product,
    );
    const sourceBytes = Buffer.byteLength(source);
    totalSourceBytes += sourceBytes;
    if (sourceBytes > MAX_SOURCE_BYTES || totalSourceBytes > MAX_TOTAL_SOURCE_BYTES) {
      fail("E-BOUNDS", `${product}:${path} exceeds qualification source bounds`);
    }
    sourcesByPath.set(path, source);

    if (!Array.isArray(file.symbols) || file.symbols.some(symbol => typeof symbol !== "string" || symbol.length === 0)) {
      fail("E-SCHEMA", `${product}:${path}.symbols must be an array of non-empty strings`);
    }
    if (file.symbols.length > 0) {
      const exported = exportedNames(parseProgram(path, source));
      const missing = file.symbols.filter(symbol => !exported.has(symbol));
      if (missing.length > 0) fail("E-EXPORT", `${product}:${path} does not export ${missing.join(", ")}`);
    }
    files.push({ path, blob: observedBlob, symbols: [...file.symbols] });
  }

  const compositionRecord = record.composition === undefined
    ? undefined
    : requireRecord(record.composition, `${product}.composition`);
  if (compositionRecord?.kind === "product-capability-root") {
    const consumerManifestPath = requireRepositoryPath(
      compositionRecord.consumerManifest,
      `${product}.composition.consumerManifest`,
    );
    if (!sourcesByPath.has(consumerManifestPath)) {
      const { source } = await readGitSource(
        topLevel,
        commit,
        consumerManifestPath,
        undefined,
        product,
      );
      const sourceBytes = Buffer.byteLength(source);
      totalSourceBytes += sourceBytes;
      if (sourceBytes > MAX_SOURCE_BYTES || totalSourceBytes > MAX_TOTAL_SOURCE_BYTES) {
        fail("E-BOUNDS", `${product}:${consumerManifestPath} exceeds qualification source bounds`);
      }
      sourcesByPath.set(consumerManifestPath, source);
    }
  }

  const negativeSearch = await verifyNegativeSearch(topLevel, commit, record.negativeSearch, product);
  const composition = verifyComposition(record, sourcesByPath, product);
  return {
    product,
    repository,
    repositoryRoot: topLevel,
    commit,
    tree: observedTree,
    files,
    negativeSearch,
    composition,
  };
}

export async function verifyProductSourceEvidence(evidenceValue, repositoryRoots) {
  const evidence = requireRecord(evidenceValue, "evidence");
  if (evidence.status !== "candidate-source-records") {
    fail("E-STATUS", "source evidence must remain candidate-source-records until separately authenticated");
  }
  const products = requireRecord(evidence.products, "evidence.products");
  const productNames = Object.keys(products).sort();
  if (productNames.length === 0 || productNames.length > MAX_PRODUCTS) {
    fail("E-SCHEMA", `evidence.products must contain 1-${MAX_PRODUCTS} products`);
  }
  const reports = [];
  const repositories = new Set();
  for (const product of productNames) {
    const repositoryRoot = repositoryRoots[product];
    if (typeof repositoryRoot !== "string" || repositoryRoot.length === 0) {
      fail("E-REPOSITORY", `repository root is missing for ${product}`);
    }
    const report = await verifyProductSourceRecord(product, products[product], repositoryRoot);
    if (repositories.has(report.repository)) {
      fail("E-INDEPENDENCE", `multiple product keys cannot reuse repository ${report.repository}`);
    }
    repositories.add(report.repository);
    reports.push(report);
  }
  return Object.freeze({ status: evidence.status, reports: Object.freeze(reports) });
}
