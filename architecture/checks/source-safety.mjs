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
  ["getOwnPropertyDescriptors", "reflective property-descriptor access"],
  ["getOwnPropertyNames", "reflective property-name access"],
  ["getOwnPropertySymbols", "reflective property-symbol access"],
  ["getPrototypeOf", "reflective prototype access"],
  ["setPrototypeOf", "reflective prototype access"],
  ["prototype", "reflective prototype access"],
  ["__proto__", "reflective prototype access"],
  ["__defineGetter__", "reflective accessor access"],
  ["__defineSetter__", "reflective accessor access"],
  ["__lookupGetter__", "reflective accessor access"],
  ["__lookupSetter__", "reflective accessor access"],
]);

const COMPUTED_RUNTIME_PROPERTY_ACCESS = "computed runtime property access";

function walk(value, visit, seen = new Set(), parent) {
  if (typeof value !== "object" || value === null || seen.has(value)) return;
  seen.add(value);
  if (visit(value, parent) === false) return;
  for (const child of Object.values(value)) {
    if (Array.isArray(child)) {
      for (const entry of child) walk(entry, visit, seen, value);
    } else {
      walk(child, visit, seen, value);
    }
  }
}

function runtimeInitializer(node) {
  if (node === null || node === undefined) return false;
  if ([
    "ParenthesizedExpression",
    "TSAsExpression",
    "TSNonNullExpression",
    "TSSatisfiesExpression",
    "TSTypeAssertion",
  ].includes(node.type)) return runtimeInitializer(node.expression);
  if (!["ArrowFunctionExpression", "FunctionExpression"].includes(node.type)) return true;
  return node.body?.type !== "BlockStatement" || node.body.body?.length > 0;
}

function runtimeDeclaration(node) {
  if (typeof node !== "object" || node === null) return false;
  if (node.type === "ExportNamedDeclaration" || node.type === "ExportDefaultDeclaration") {
    return runtimeDeclaration(node.declaration);
  }
  if (node.declare === true) return false;
  if (node.type === "VariableDeclaration") {
    return node.declarations?.some(declaration => runtimeInitializer(declaration.init)) === true;
  }
  if (node.type === "ClassDeclaration") return node.body?.body?.length > 0;
  if (node.type === "FunctionDeclaration") return node.body?.body?.length > 0;
  return node.type === "TSEnumDeclaration" && node.body?.members?.length > 0;
}

function runtimeBindingNames(node) {
  if (typeof node !== "object" || node === null || node.declare === true) return [];
  if (node.type === "VariableDeclaration") {
    return node.declarations
      ?.filter(declaration => runtimeInitializer(declaration.init) && declaration.id?.type === "Identifier")
      .map(declaration => declaration.id.name) ?? [];
  }
  if (["ClassDeclaration", "FunctionDeclaration"].includes(node.type)
    && runtimeDeclaration(node)
    && node.id?.name !== undefined) {
    return [node.id.name];
  }
  if (node.type === "TSEnumDeclaration"
    && runtimeDeclaration(node)
    && node.id?.name !== undefined) {
    return [node.id.name];
  }
  return [];
}

function syntaxName(node) {
  if (typeof node?.name === "string") return node.name;
  if (typeof node?.value === "string") return node.value;
  return undefined;
}

function exportedRuntimeImplementationNames(program) {
  const runtimeBindings = new Set();
  const exportedBindings = new Set();
  for (const node of program.body) {
    const declaration = node.type === "ExportNamedDeclaration" ? node.declaration : node;
    for (const binding of runtimeBindingNames(declaration)) runtimeBindings.add(binding);
  }
  for (const node of program.body) {
    if (node.type === "ExportDefaultDeclaration" && runtimeDeclaration(node.declaration)) {
      exportedBindings.add("default");
    }
    if (node.type === "ExportDefaultDeclaration"
      && node.declaration?.type === "Identifier"
      && runtimeBindings.has(node.declaration.name)) {
      exportedBindings.add("default");
    }
    if (node.type === "ExportNamedDeclaration") {
      for (const binding of runtimeBindingNames(node.declaration)) exportedBindings.add(binding);
      if (node.source === null && node.exportKind !== "type") {
        for (const specifier of node.specifiers ?? []) {
          const localName = syntaxName(specifier.local);
          const exportedName = syntaxName(specifier.exported);
          if (specifier.exportKind !== "type"
            && localName !== undefined
            && exportedName !== undefined
            && runtimeBindings.has(localName)) {
            exportedBindings.add(exportedName);
          }
        }
      }
    }
  }
  return [...exportedBindings];
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

function assertionBindings(program) {
  const functions = new Set();
  const namespaces = new Set();
  for (const node of program.body) {
    if (node.type !== "ImportDeclaration"
      || !["node:assert", "node:assert/strict"].includes(node.source?.value)) continue;
    for (const specifier of node.specifiers) {
      if (["ImportDefaultSpecifier", "ImportNamespaceSpecifier"].includes(specifier.type)
        && specifier.local?.name !== undefined) {
        namespaces.add(specifier.local.name);
      }
      if (specifier.type === "ImportSpecifier"
        && specifier.importKind !== "type"
        && specifier.local?.name !== undefined) {
        functions.add(specifier.local.name);
      }
    }
  }
  return { functions, namespaces };
}

function importedRuntimeBindings(program) {
  const bindings = new Map();
  for (const node of program.body) {
    if (node.type !== "ImportDeclaration"
      || node.importKind === "type"
      || typeof node.source?.value !== "string"
      || ["node:assert", "node:assert/strict", "node:test"].includes(node.source.value)) continue;
    for (const specifier of node.specifiers) {
      if (specifier.importKind !== "type" && specifier.local?.name !== undefined) {
        bindings.set(specifier.local.name, node.source.value);
      }
    }
  }
  return bindings;
}

function isAssertionCall(node, assertions) {
  if (node.type !== "CallExpression") return false;
  if (node.callee?.type === "Identifier") return assertions.functions.has(node.callee.name);
  return node.callee?.type === "MemberExpression"
    && node.callee.computed === false
    && node.callee.object?.type === "Identifier"
    && assertions.namespaces.has(node.callee.object.name);
}

function activeTestCallback(call) {
  const callbackIndex = call.arguments?.findIndex(argument => (
    argument?.type === "ArrowFunctionExpression" || argument?.type === "FunctionExpression"
  )) ?? -1;
  if (callbackIndex < 0) return undefined;
  for (const argument of call.arguments.slice(0, callbackIndex)) {
    if (argument?.type === "Literal" && typeof argument.value === "string") continue;
    if (argument?.type === "TemplateLiteral" && argument.expressions?.length === 0) continue;
    if (argument?.type !== "ObjectExpression") return undefined;
    for (const property of argument.properties ?? []) {
      if (property.type !== "Property" || property.computed === true) return undefined;
      const name = property.key?.name ?? property.key?.value;
      if (!["skip", "todo"].includes(name)) continue;
      if (property.value?.type !== "Literal" || property.value.value !== false) return undefined;
    }
  }
  return call.arguments[callbackIndex];
}

function registeredTestCallbacks(program, importedTestBindings) {
  const callbacks = [];
  for (const node of program.body) {
    if (node.type !== "ExpressionStatement"
      || node.expression?.type !== "CallExpression"
      || node.expression.callee?.type !== "Identifier"
      || !importedTestBindings.has(node.expression.callee.name)) continue;
    const callback = activeTestCallback(node.expression);
    if (callback !== undefined) callbacks.push(callback);
  }
  return callbacks;
}

function addPatternBindings(pattern, bindings) {
  if (pattern?.type === "Identifier") {
    bindings.add(pattern.name);
    return;
  }
  if (["AssignmentPattern", "RestElement", "TSParameterProperty"].includes(pattern?.type)) {
    addPatternBindings(pattern.left ?? pattern.argument ?? pattern.parameter, bindings);
    return;
  }
  if (pattern?.type === "ArrayPattern") {
    for (const element of pattern.elements ?? []) addPatternBindings(element, bindings);
    return;
  }
  if (pattern?.type === "ObjectPattern") {
    for (const property of pattern.properties ?? []) {
      addPatternBindings(property.type === "Property" ? property.value : property.argument, bindings);
    }
  }
}

function callbackLocalBindings(callback) {
  const bindings = new Set();
  for (const parameter of callback.params ?? []) addPatternBindings(parameter, bindings);
  walk(callback.body, node => {
    if (node.type === "VariableDeclarator") addPatternBindings(node.id, bindings);
    if (["ClassDeclaration", "FunctionDeclaration"].includes(node.type)) {
      if (node.id?.name !== undefined) bindings.add(node.id.name);
      return false;
    }
    if (["ArrowFunctionExpression", "ClassExpression", "FunctionExpression"].includes(node.type)) {
      return false;
    }
    if (node.type === "CatchClause") addPatternBindings(node.param, bindings);
    return undefined;
  });
  return bindings;
}

function directAssertionCalls(callback, assertions) {
  if (callback.body?.type !== "BlockStatement") {
    return isAssertionCall(callback.body, assertions) ? [callback.body] : [];
  }
  const statements = callback.body.body.filter(statement => statement.type !== "EmptyStatement");
  if (statements.length === 0
    || statements.some(statement => (
      statement.type !== "ExpressionStatement"
      || !isAssertionCall(statement.expression, assertions)
    ))) return [];
  return statements.map(statement => statement.expression);
}

function walkEagerExpression(value, visit, seen = new Set()) {
  if (typeof value !== "object" || value === null || seen.has(value)) return;
  seen.add(value);
  if (visit(value) === false) return;
  if (value.type === "ConditionalExpression") {
    walkEagerExpression(value.test, visit, seen);
    return;
  }
  if (value.type === "LogicalExpression") {
    walkEagerExpression(value.left, visit, seen);
    return;
  }
  for (const child of Object.values(value)) {
    if (Array.isArray(child)) {
      for (const entry of child) walkEagerExpression(entry, visit, seen);
    } else {
      walkEagerExpression(child, visit, seen);
    }
  }
}

function observedRuntimeImportSources(program, testCallbacks) {
  const importedAssertions = assertionBindings(program);
  const importedRuntime = importedRuntimeBindings(program);
  const sources = new Set();
  for (const callback of testCallbacks) {
    const locals = callbackLocalBindings(callback);
    const assertions = {
      functions: new Set([...importedAssertions.functions].filter(name => !locals.has(name))),
      namespaces: new Set([...importedAssertions.namespaces].filter(name => !locals.has(name))),
    };
    const runtimeBindings = new Map(
      [...importedRuntime].filter(([name]) => !locals.has(name)),
    );
    for (const candidate of directAssertionCalls(callback, assertions)) {
      for (const argument of candidate.arguments ?? []) {
        walkEagerExpression(argument, value => {
          if ([
            "ArrowFunctionExpression",
            "ClassDeclaration",
            "ClassExpression",
            "FunctionDeclaration",
            "FunctionExpression",
          ].includes(value.type)) return false;
          if (value.type === "Identifier" && runtimeBindings.has(value.name)) {
            sources.add(runtimeBindings.get(value.name));
          }
          return undefined;
        });
      }
    }
  }
  return [...sources];
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
    if (node.type === "ExportAllDeclaration"
      && node.exportKind !== "type"
      && typeof node.source?.value === "string") {
      dependencies.push({
        kind: "export",
        specifier: node.source.value,
        exportAll: true,
        exportedName: syntaxName(node.exported),
      });
    }
    if (node.type === "ExportNamedDeclaration"
      && node.exportKind !== "type"
      && !typeOnlySpecifiers
      && typeof node.source?.value === "string") {
      for (const specifier of node.specifiers ?? []) {
        const importedName = syntaxName(specifier.local);
        const exportedName = syntaxName(specifier.exported);
        if (specifier.exportKind !== "type"
          && importedName !== undefined
          && exportedName !== undefined) {
          dependencies.push({
            kind: "export",
            specifier: node.source.value,
            exportAll: false,
            importedName,
            exportedName,
          });
        }
      }
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
      exportedRuntimeImplementationNames: [],
      hasTestRegistration: false,
      observedRuntimeImportSources: [],
      staticModuleDependencies: [],
    };
  }
  for (const error of result.errors.filter(error => error.severity === "Error")) {
    errors.add(`source cannot be parsed by Oxc: ${error.message}`);
  }
  const importedTestBindings = testBindings(result.program);
  const testCallbacks = registeredTestCallbacks(result.program, importedTestBindings);
  const staticDependencies = staticModuleDependencies(result.program);
  const runtimeImplementationNames = exportedRuntimeImplementationNames(result.program);
  walk(result.program, (node, parent) => {
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
    if (node.type === "Property"
      && parent?.type === "ObjectPattern"
      && (typeof node.key?.value === "string" || typeof node.key?.name === "string")) {
      const property = node.key.value ?? node.key.name;
      const label = FORBIDDEN_RUNTIME_IDENTIFIERS.get(property)
        ?? REFLECTIVE_RUNTIME_PROPERTIES.get(property);
      if (label !== undefined) errors.add(label);
    }
    if (node.computed === true) {
      errors.add(COMPUTED_RUNTIME_PROPERTY_ACCESS);
    }
  });

  const hasTestRegistration = testCallbacks.length > 0;

  return {
    errors: [...errors],
    hasExecutableCode: result.program.body.some(node => (
      runtimeDeclaration(node) || node.type === "ExpressionStatement"
    )),
    hasRuntimeImplementation: runtimeImplementationNames.length > 0,
    exportedRuntimeImplementationNames: runtimeImplementationNames,
    hasTestRegistration,
    observedRuntimeImportSources: observedRuntimeImportSources(
      result.program,
      testCallbacks,
    ),
    staticModuleDependencies: staticDependencies,
  };
}
