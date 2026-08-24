import { parseSync } from "oxc-parser";

const FORBIDDEN_RUNTIME_IDENTIFIERS = new Map([
  ["eval", "eval-based module loading"],
  ["Function", "Function-constructor module loading"],
  ["Reflect", "reflective runtime access"],
  ["createRequire", "createRequire-based module loading"],
  ["getBuiltinModule", "process.getBuiltinModule"],
  ["globalThis", "ambient globalThis runtime access"],
  ["process", "ambient process runtime access"],
  ["require", "CommonJS require"],
]);

const SOURCE_DIRECTIVES = Object.freeze([
  [/@jsxImportSource\b/u, "JSX import-source directives"],
  [/^\s*\/\/\/\s*<reference\b/mu, "triple-slash dependency directives"],
]);

const REFLECTIVE_RUNTIME_PROPERTIES = new Map([
  ["constructor", "reflective Function-constructor access"],
  ["getOwnPropertyDescriptor", "reflective property-descriptor access"],
]);

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

function runtimeDeclaration(node) {
  if (typeof node !== "object" || node === null) return false;
  if (node.type === "ExportNamedDeclaration" || node.type === "ExportDefaultDeclaration") {
    return runtimeDeclaration(node.declaration);
  }
  if (node.declare === true) return false;
  if (node.type === "VariableDeclaration") {
    return node.declarations?.some(declaration => declaration.init !== null) === true;
  }
  if (node.type === "ClassDeclaration") return node.body?.body?.length > 0;
  if (node.type === "FunctionDeclaration") return node.body?.body?.length > 0;
  return node.type === "TSEnumDeclaration" && node.body?.members?.length > 0;
}

function testBindings(program) {
  const bindings = new Set();
  for (const node of program.body) {
    if (node.type !== "ImportDeclaration" || node.source?.value !== "node:test") continue;
    for (const specifier of node.specifiers) {
      if (specifier.type === "ImportDefaultSpecifier" && specifier.local?.name !== undefined) {
        bindings.add(specifier.local.name);
      }
      if (specifier.type === "ImportSpecifier"
        && ["it", "test"].includes(specifier.imported?.name)
        && specifier.local?.name !== undefined) {
        bindings.add(specifier.local.name);
      }
    }
  }
  return bindings;
}

function staticModuleDependencies(program) {
  const dependencies = [];
  for (const node of program.body) {
    const typeOnlySpecifiers = node.specifiers?.length > 0
      && node.specifiers.every(specifier => specifier.importKind === "type" || specifier.exportKind === "type");
    if (node.type === "ImportDeclaration"
      && node.importKind !== "type"
      && !typeOnlySpecifiers
      && typeof node.source?.value === "string") {
      dependencies.push({ kind: "import", specifier: node.source.value });
    }
    if ((node.type === "ExportAllDeclaration" || node.type === "ExportNamedDeclaration")
      && node.exportKind !== "type"
      && !typeOnlySpecifiers
      && typeof node.source?.value === "string") {
      dependencies.push({ kind: "export", specifier: node.source.value });
    }
  }
  return dependencies;
}

export function analyzeSource(filename, source) {
  const errors = new Set();
  for (const [pattern, label] of SOURCE_DIRECTIVES) {
    if (pattern.test(source)) errors.add(label);
  }

  let result;
  try {
    result = parseSync(filename, source, { sourceType: "module" });
  } catch (error) {
    return {
      errors: [`source cannot be parsed by Oxc: ${error instanceof Error ? error.message : String(error)}`],
      hasExecutableCode: false,
      hasRuntimeImplementation: false,
      hasTestRegistration: false,
      staticModuleDependencies: [],
    };
  }
  for (const error of result.errors.filter(error => error.severity === "Error")) {
    errors.add(`source cannot be parsed by Oxc: ${error.message}`);
  }
  const importedTestBindings = testBindings(result.program);
  const staticDependencies = staticModuleDependencies(result.program);
  walk(result.program, node => {
    if (node.type === "Identifier") {
      const label = FORBIDDEN_RUNTIME_IDENTIFIERS.get(node.name);
      if (label !== undefined) errors.add(label);
    }
    if (node.type === "MemberExpression"
      && (typeof node.property?.value === "string" || typeof node.property?.name === "string")) {
      const property = node.property.value ?? node.property.name;
      const label = FORBIDDEN_RUNTIME_IDENTIFIERS.get(property)
        ?? REFLECTIVE_RUNTIME_PROPERTIES.get(property);
      if (label !== undefined) errors.add(label);
    }
  });

  const hasTestRegistration = result.program.body.some(node => (
    node.type === "ExpressionStatement"
    && node.expression?.type === "CallExpression"
    && node.expression.callee?.type === "Identifier"
    && importedTestBindings.has(node.expression.callee.name)
  ));

  return {
    errors: [...errors],
    hasExecutableCode: result.program.body.some(node => (
      runtimeDeclaration(node) || node.type === "ExpressionStatement"
    )),
    hasRuntimeImplementation: result.program.body.some(runtimeDeclaration),
    hasTestRegistration,
    staticModuleDependencies: staticDependencies,
  };
}
