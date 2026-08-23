import { parseSync } from "oxc-parser";

const FORBIDDEN_RUNTIME_IDENTIFIERS = new Map([
  ["eval", "eval-based module loading"],
  ["Function", "Function-constructor module loading"],
  ["getBuiltinModule", "process.getBuiltinModule"],
  ["require", "CommonJS require"],
]);

const SOURCE_DIRECTIVES = Object.freeze([
  [/@jsxImportSource\b/u, "JSX import-source directives"],
  [/^\s*\/\/\/\s*<reference\b/mu, "triple-slash dependency directives"],
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
  return [
    "ClassDeclaration",
    "FunctionDeclaration",
    "TSEnumDeclaration",
  ].includes(node.type);
}

function testBindings(program) {
  const bindings = new Set();
  for (const node of program.body) {
    if (node.type !== "ImportDeclaration" || node.source?.value !== "node:test") continue;
    for (const specifier of node.specifiers) {
      if (specifier.local?.name !== undefined) bindings.add(specifier.local.name);
    }
  }
  return bindings;
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
    };
  }
  for (const error of result.errors.filter(error => error.severity === "Error")) {
    errors.add(`source cannot be parsed by Oxc: ${error.message}`);
  }
  const importedTestBindings = testBindings(result.program);
  let hasTestRegistration = false;
  walk(result.program, node => {
    if (node.type === "Identifier") {
      const label = FORBIDDEN_RUNTIME_IDENTIFIERS.get(node.name);
      if (label !== undefined) errors.add(label);
    }
    if (node.type === "CallExpression"
      && node.callee?.type === "Identifier"
      && importedTestBindings.has(node.callee.name)) {
      hasTestRegistration = true;
    }
  });

  return {
    errors: [...errors],
    hasExecutableCode: result.program.body.some(node => (
      runtimeDeclaration(node) || node.type === "ExpressionStatement"
    )),
    hasRuntimeImplementation: result.program.body.some(runtimeDeclaration),
    hasTestRegistration,
  };
}
