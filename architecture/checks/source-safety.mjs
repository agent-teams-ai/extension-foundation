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

function runtimeValueBindingNames(node) {
  if (typeof node !== "object" || node === null || node.declare === true) return [];
  if (node.type === "VariableDeclaration") {
    return node.declarations
      ?.filter(declaration => declaration.init != null && declaration.id?.type === "Identifier")
      .map(declaration => declaration.id.name) ?? [];
  }
  if (["ClassDeclaration", "FunctionDeclaration", "TSEnumDeclaration"].includes(node.type)
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
    const declaration = ["ExportNamedDeclaration", "ExportDefaultDeclaration"].includes(node.type)
      ? node.declaration
      : node;
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

function localRuntimeExportBindings(program) {
  const importedBindings = new Set();
  for (const node of program.body) {
    if (node.type !== "ImportDeclaration" || node.importKind === "type") continue;
    for (const specifier of node.specifiers ?? []) {
      if (specifier.importKind !== "type" && specifier.local?.name !== undefined) {
        importedBindings.add(specifier.local.name);
      }
    }
  }

  const exportedBindings = [];
  const addExport = (exportedName, localName) => {
    exportedBindings.push({ exportedName, localName });
  };
  for (const node of program.body) {
    if (node.type === "ExportDefaultDeclaration") {
      const importedIdentifier = node.declaration?.type === "Identifier"
        && importedBindings.has(node.declaration.name);
      if (!importedIdentifier) {
        const localName = node.declaration?.type === "Identifier"
          ? node.declaration.name
          : node.declaration?.id?.name ?? "#default";
        addExport("default", localName);
      }
      continue;
    }
    if (node.type !== "ExportNamedDeclaration" || node.exportKind === "type") continue;
    for (const name of runtimeValueBindingNames(node.declaration)) addExport(name, name);
    if (node.source !== null) continue;
    for (const specifier of node.specifiers ?? []) {
      const localName = syntaxName(specifier.local);
      const exportedName = syntaxName(specifier.exported);
      if (specifier.exportKind !== "type"
        && localName !== undefined
        && exportedName !== undefined
        && !importedBindings.has(localName)) {
        addExport(exportedName, localName);
      }
    }
  }
  return exportedBindings;
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
  const functions = new Map();
  const namespaces = new Set();
  for (const node of program.body) {
    if (node.type !== "ImportDeclaration"
      || !["node:assert", "node:assert/strict"].includes(node.source?.value)) continue;
    for (const specifier of node.specifiers) {
      if (["ImportDefaultSpecifier", "ImportNamespaceSpecifier"].includes(specifier.type)
        && specifier.local?.name !== undefined) {
        namespaces.add(specifier.local.name);
      }
      if (specifier.type === "ImportDefaultSpecifier" && specifier.local?.name !== undefined) {
        functions.set(specifier.local.name, "ok");
      }
      if (specifier.type === "ImportSpecifier"
        && specifier.importKind !== "type"
        && specifier.imported?.name !== undefined
        && specifier.local?.name !== undefined) {
        functions.set(specifier.local.name, specifier.imported.name);
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

function assertionMethod(node, assertions) {
  if (node.type !== "CallExpression") return undefined;
  if (node.callee?.type === "Identifier") return assertions.functions.get(node.callee.name);
  if (node.callee?.type === "MemberExpression"
    && node.callee.computed === false
    && node.callee.object?.type === "Identifier"
    && assertions.namespaces.has(node.callee.object.name)) {
    return syntaxName(node.callee.property);
  }
  return undefined;
}

const ASSERTION_VALUE_ARGUMENTS = new Map([
  ["ok", [0]],
  ["strict", [0]],
  ["equal", [0, 1]],
  ["notEqual", [0, 1]],
  ["strictEqual", [0, 1]],
  ["notStrictEqual", [0, 1]],
  ["deepEqual", [0, 1]],
  ["notDeepEqual", [0, 1]],
  ["deepStrictEqual", [0, 1]],
  ["notDeepStrictEqual", [0, 1]],
  ["partialDeepStrictEqual", [0, 1]],
  ["match", [0, 1]],
  ["doesNotMatch", [0, 1]],
  ["ifError", [0]],
]);

function activeTestCallback(call) {
  const callbackIndex = call.arguments?.findIndex(argument => (
    argument?.type === "ArrowFunctionExpression" || argument?.type === "FunctionExpression"
  )) ?? -1;
  if (callbackIndex < 0) return undefined;
  for (const [index, argument] of call.arguments.entries()) {
    if (index === callbackIndex) continue;
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
  const callback = call.arguments[callbackIndex];
  return callback.generator === true ? undefined : callback;
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
    const method = assertionMethod(callback.body, assertions);
    return method === undefined ? [] : [{ call: callback.body, method }];
  }
  const statements = callback.body.body.filter(statement => statement.type !== "EmptyStatement");
  if (statements.length === 0) return [];
  const calls = [];
  for (const statement of statements) {
    if (statement.type !== "ExpressionStatement") return [];
    const method = assertionMethod(statement.expression, assertions);
    if (method === undefined) return [];
    calls.push({ call: statement.expression, method });
  }
  return calls;
}

function walkEagerExpression(value, visit, seen = new Set()) {
  if (typeof value !== "object" || value === null || seen.has(value)) return;
  seen.add(value);
  if (visit(value) === false) return;
  if (value.type === "ChainExpression") {
    let base = value.expression;
    while (["CallExpression", "MemberExpression"].includes(base?.type)) {
      base = base.type === "CallExpression" ? base.callee : base.object;
    }
    walkEagerExpression(base, visit, seen);
    return;
  }
  if (value.type === "ConditionalExpression") {
    walkEagerExpression(value.test, visit, seen);
    return;
  }
  if (value.type === "LogicalExpression") {
    walkEagerExpression(value.left, visit, seen);
    return;
  }
  if (["TSAsExpression", "TSNonNullExpression", "TSSatisfiesExpression"].includes(value.type)) {
    walkEagerExpression(value.expression, visit, seen);
    return;
  }
  if (value.type?.startsWith("TS")) return;
  for (const [field, child] of Object.entries(value)) {
    const staticPropertyKey = field === "key"
      && value.computed !== true
      && ["MethodDefinition", "Property", "PropertyDefinition"].includes(value.type);
    const staticMemberName = field === "property"
      && value.computed !== true
      && ["MemberExpression", "OptionalMemberExpression"].includes(value.type);
    if (staticPropertyKey || staticMemberName) continue;
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
      functions: new Map([...importedAssertions.functions].filter(([name]) => !locals.has(name))),
      namespaces: new Set([...importedAssertions.namespaces].filter(name => !locals.has(name))),
    };
    const runtimeBindings = new Map(
      [...importedRuntime].filter(([name]) => !locals.has(name)),
    );
    for (const candidate of directAssertionCalls(callback, assertions)) {
      const evidenceArguments = ASSERTION_VALUE_ARGUMENTS.get(candidate.method) ?? [];
      for (const index of evidenceArguments) {
        const argument = candidate.call.arguments?.[index];
        if (argument === undefined) continue;
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
  const importedBindings = new Map();
  for (const node of program.body) {
    if (node.type !== "ImportDeclaration"
      || node.importKind === "type"
      || typeof node.source?.value !== "string") continue;
    for (const specifier of node.specifiers ?? []) {
      if (specifier.importKind === "type" || specifier.local?.name === undefined) continue;
      const importedName = specifier.type === "ImportDefaultSpecifier"
        ? "default"
        : specifier.type === "ImportNamespaceSpecifier"
          ? "*"
          : syntaxName(specifier.imported);
      if (importedName !== undefined) {
        importedBindings.set(specifier.local.name, {
          importedName,
          specifier: node.source.value,
        });
      }
    }
  }
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
    if (node.type === "ExportNamedDeclaration"
      && node.source === null
      && node.exportKind !== "type") {
      for (const specifier of node.specifiers ?? []) {
        const imported = importedBindings.get(syntaxName(specifier.local));
        const exportedName = syntaxName(specifier.exported);
        if (specifier.exportKind === "type"
          || imported === undefined
          || exportedName === undefined) continue;
        dependencies.push({
          kind: "export",
          specifier: imported.specifier,
          exportAll: imported.importedName === "*",
          importedName: imported.importedName === "*" ? undefined : imported.importedName,
          exportedName,
        });
      }
    }
    if (node.type === "ExportDefaultDeclaration"
      && node.declaration?.type === "Identifier") {
      const imported = importedBindings.get(node.declaration.name);
      if (imported !== undefined) {
        dependencies.push({
          kind: "export",
          specifier: imported.specifier,
          exportAll: imported.importedName === "*",
          importedName: imported.importedName === "*" ? undefined : imported.importedName,
          exportedName: "default",
        });
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
      localRuntimeExportNames: [],
      localRuntimeExportBindings: [],
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
  const runtimeExportBindings = localRuntimeExportBindings(result.program);
  const runtimeExportNames = [...new Set(
    runtimeExportBindings.map(binding => binding.exportedName),
  )];
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
    localRuntimeExportNames: runtimeExportNames,
    localRuntimeExportBindings: runtimeExportBindings,
    hasTestRegistration,
    observedRuntimeImportSources: observedRuntimeImportSources(
      result.program,
      testCallbacks,
    ),
    staticModuleDependencies: staticDependencies,
  };
}
