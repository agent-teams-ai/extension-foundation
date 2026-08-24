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
  ["prototype", "reflective prototype access"],
  ["__proto__", "reflective prototype access"],
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

function hasExportedRuntimeImplementation(program) {
  const runtimeBindings = new Set();
  const exportedBindings = new Set();
  for (const node of program.body) {
    if (node.type === "ExportDefaultDeclaration" && runtimeDeclaration(node.declaration)) {
      return true;
    }
    if (node.type === "ExportDefaultDeclaration"
      && node.declaration?.type === "Identifier") {
      exportedBindings.add(node.declaration.name);
    }
    const declaration = node.type === "ExportNamedDeclaration" ? node.declaration : node;
    const bindings = runtimeBindingNames(declaration);
    for (const binding of bindings) runtimeBindings.add(binding);
    if (node.type === "ExportNamedDeclaration") {
      for (const binding of bindings) exportedBindings.add(binding);
      if (node.source === null && node.exportKind !== "type") {
        for (const specifier of node.specifiers ?? []) {
          if (specifier.exportKind !== "type" && specifier.local?.name !== undefined) {
            exportedBindings.add(specifier.local.name);
          }
        }
      }
    }
  }
  return [...runtimeBindings].some(binding => exportedBindings.has(binding));
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

function observedRuntimeImportSources(program, testCallbacks) {
  const assertions = assertionBindings(program);
  const runtimeBindings = importedRuntimeBindings(program);
  const sources = new Set();
  for (const callback of testCallbacks) {
    walk(callback.body, candidate => {
      if (!isAssertionCall(candidate, assertions)) return;
      for (const argument of candidate.arguments ?? []) {
        walk(argument, value => {
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
    });
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
    const hasRuntimeExport = node.type === "ExportAllDeclaration"
      || (node.type === "ExportNamedDeclaration"
        && node.specifiers?.some(specifier => specifier.exportKind !== "type"));
    if (hasRuntimeExport
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
    hasRuntimeImplementation: hasExportedRuntimeImplementation(result.program),
    hasTestRegistration,
    observedRuntimeImportSources: observedRuntimeImportSources(
      result.program,
      testCallbacks,
    ),
    staticModuleDependencies: staticDependencies,
  };
}
