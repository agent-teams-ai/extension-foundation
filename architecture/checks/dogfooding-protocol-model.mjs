#!/usr/bin/env node

import { lstatSync, readFileSync, realpathSync } from "node:fs";
import { dirname, isAbsolute, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseSync, Visitor, visitorKeys } from "oxc-parser";

const repositoryRoot = realpathSync(fileURLToPath(new URL("../../", import.meta.url)));
const modelFiles = [
  "tests/qualification/dogfooding-protocol-contract.ts",
  "tests/qualification/dogfooding-protocol-oracle.ts",
  "tests/qualification/dogfooding-protocol-reducer.ts",
  "tests/qualification/dogfooding-protocol.test.ts",
];
const modelEntry = "tests/qualification/dogfooding-protocol.test.ts";
const expectedLocalDependencies = new Map([
  ["tests/qualification/dogfooding-protocol-contract.ts", []],
  [
    "tests/qualification/dogfooding-protocol-oracle.ts",
    ["tests/qualification/dogfooding-protocol-contract.ts"],
  ],
  [
    "tests/qualification/dogfooding-protocol-reducer.ts",
    ["tests/qualification/dogfooding-protocol-contract.ts"],
  ],
  [
    "tests/qualification/dogfooding-protocol.test.ts",
    [
      "tests/qualification/dogfooding-protocol-contract.ts",
      "tests/qualification/dogfooding-protocol-oracle.ts",
      "tests/qualification/dogfooding-protocol-reducer.ts",
    ],
  ],
]);
const limits = {
  structuralNodes: 50_546,
  physicalLines: 10_520,
  utf8Bytes: 370_975,
  charactersPerLine: 200,
};
const decode = new TextDecoder("utf-8", { fatal: true });
const allowedExternalDependencies = new Set(["fast-check", "node:assert/strict", "node:test"]);
const forbiddenRuntimeIdentifiers = new Set([
  "createRequire",
  "eval",
  "fetch",
  "Function",
  "getBuiltinModule",
  "globalThis",
  "importScripts",
  "module",
  "process",
  "Reflect",
  "require",
  "SharedWorker",
  "WebAssembly",
  "Worker",
]);
const forbiddenRuntimeProperties = new Set(["constructor"]);

const canonicalText = (text) => text.replace(/\r\n?|[\u2028\u2029]/gu, "\n");
const physicalLines = (text) => {
  const canonical = canonicalText(text);
  return canonical.length === 0
    ? 0
    : (canonical.match(/\n/gu)?.length ?? 0) + (canonical.endsWith("\n") ? 0 : 1);
};

// Structural metric v1 begins. Recalibration requires separately reviewed unchanged-source evidence.
const structuralMetric = Object.freeze({ version: 1, parserVersion: "0.146.0" });
const parserPackage = JSON.parse(
  readFileSync(new URL(import.meta.resolve("oxc-parser/package.json")), "utf8"),
);
if (
  structuralMetric.version !== 1 ||
  structuralMetric.parserVersion !== "0.146.0" ||
  parserPackage.name !== "oxc-parser" ||
  parserPackage.version !== structuralMetric.parserVersion
) {
  throw new Error("unsupported dogfooding structural metric or parser version");
}
const parseOptions = Object.freeze({
  lang: "ts",
  sourceType: "module",
  astType: "ts",
  preserveParens: true,
  showSemanticErrors: true,
});
const controlBodies = new Map([
  ["IfStatement", ["consequent", "alternate"]],
  ...["ForStatement", "ForInStatement", "ForOfStatement", "WhileStatement", "DoWhileStatement"].map(
    (type) => [type, ["body"]],
  ),
]);
const transparentStatements = new Set([
  "ExpressionStatement",
  "ReturnStatement",
  "ThrowStatement",
  "BreakStatement",
  "ContinueStatement",
  "EmptyStatement",
  "IfStatement",
  "ForStatement",
  "ForInStatement",
  "ForOfStatement",
  "WhileStatement",
  "DoWhileStatement",
]);
const positionFields = new Set(["start", "end", "loc", "range"]);
function structuralNodes(program) {
  const kinds = {};
  const unwrap = (value) => {
    while (value?.type === "ParenthesizedExpression" || value?.type === "TSParenthesizedType") {
      value = value[value.type === "ParenthesizedExpression" ? "expression" : "typeAnnotation"];
    }
    return value;
  };
  const count = (node, controlBody = false) => {
    if (
      node === null ||
      typeof node !== "object" ||
      Array.isArray(node) ||
      !Object.hasOwn(visitorKeys, node.type) ||
      !Array.isArray(visitorKeys[node.type])
    ) {
      throw new Error("unsupported structural AST node shape");
    }
    if (node.type === "ParenthesizedExpression" || node.type === "TSParenthesizedType") {
      return count(unwrap(node), controlBody);
    }
    if (controlBody && node.type === "BlockStatement") {
      if (
        !Array.isArray(node.body) ||
        Object.keys(node)
          .filter((key) => !positionFields.has(key))
          .sort()
          .join(",") !== "body,type"
      ) {
        throw new Error("unsupported structural control block shape");
      }
      const statement = node.body[0];
      const expression = unwrap(statement?.expression);
      if (
        node.body.length === 1 &&
        transparentStatements.has(statement?.type) &&
        !(
          statement.type === "ExpressionStatement" &&
          expression?.type === "Literal" &&
          typeof expression.value === "string"
        )
      ) {
        return count(statement);
      }
    }
    kinds[node.type] = (kinds[node.type] ?? 0) + 1;
    let total = 1;
    for (const key of visitorKeys[node.type]) {
      const child = node[key];
      const isControl = controlBodies.get(node.type)?.includes(key) === true;
      for (const value of Array.isArray(child) ? child : [child]) {
        if (value !== null && value !== undefined) {
          total += count(value, isControl);
        }
      }
    }
    return total;
  };
  return { count: count(program), kinds };
}
// Structural metric v1 ends.

const sources = modelFiles.map((relativePath) => {
  const path = resolve(repositoryRoot, relativePath);
  const metadata = lstatSync(path);
  if (!metadata.isFile() || metadata.isSymbolicLink()) {
    throw new Error(`${relativePath} must be a non-symlink regular file`);
  }
  return { path: realpathSync(path), relativePath, text: decode.decode(readFileSync(path)) };
});
const modelPaths = new Set(sources.map((source) => source.path));
if (modelFiles.length !== 4 || modelPaths.size !== 4) {
  throw new Error("dogfooding protocol model roster must contain four distinct files");
}

const structuralBySource = new Map();
const dependencySpecifiers = (source) => {
  const parsed = parseSync(source.path, source.text, parseOptions);
  if (parsed.errors.length > 0) {
    throw new Error(
      `${source.relativePath} cannot be parsed: ${parsed.errors.map((error) => error.message).join("; ")}`,
    );
  }

  structuralBySource.set(source.relativePath, structuralNodes(parsed.program));
  const specifiers = [];
  const literal = (node) => {
    if (node?.type !== "Literal" || typeof node.value !== "string") {
      throw new Error(`${source.relativePath} contains a non-literal module loader`);
    }
    specifiers.push(node.value);
  };
  new Visitor({
    ImportDeclaration: (node) => literal(node.source),
    ExportAllDeclaration: (node) => literal(node.source),
    ExportNamedDeclaration: (node) => {
      if (node.source !== null) {
        literal(node.source);
      }
    },
    ImportExpression: () => {
      throw new Error(`${source.relativePath} contains unsupported dynamic module loading`);
    },
    TSImportType: (node) => literal(node.source),
    TSImportEqualsDeclaration: () => {
      throw new Error(`${source.relativePath} contains unsupported TypeScript import-equals`);
    },
    Identifier: (node) => {
      if (forbiddenRuntimeIdentifiers.has(node.name)) {
        throw new Error(
          `${source.relativePath} contains forbidden runtime loader primitive ${node.name}`,
        );
      }
    },
    MemberExpression: (node) => {
      const property = node.computed ? node.property?.value : node.property?.name;
      if (typeof property === "string" && forbiddenRuntimeProperties.has(property)) {
        throw new Error(
          `${source.relativePath} contains forbidden runtime loader property ${property}`,
        );
      }
    },
  }).visit(parsed.program);
  return specifiers;
};

const localDependencies = new Map();
for (const source of sources) {
  const dependencies = [];
  for (const specifier of dependencySpecifiers(source)) {
    const fileUrl = /^file:/iu.test(specifier);
    const local = /^(?:\.{1,2}(?:[/\\]|$)|[/\\]|#)/u.test(specifier) || fileUrl;
    if (!local) {
      if (!allowedExternalDependencies.has(specifier)) {
        throw new Error(
          `${source.relativePath} imports unsupported external dependency ${specifier}`,
        );
      }
      continue;
    }
    if (specifier.startsWith("#")) {
      throw new Error(`${source.relativePath} uses unsupported local alias ${specifier}`);
    }
    const target = fileUrl
      ? fileURLToPath(specifier)
      : isAbsolute(specifier)
        ? specifier
        : resolve(dirname(source.path), specifier);
    let canonical;
    try {
      const metadata = lstatSync(target);
      if (!metadata.isFile() || metadata.isSymbolicLink()) {
        throw new Error("not a non-symlink regular file");
      }
      canonical = realpathSync(target);
    } catch {
      throw new Error(`${source.relativePath} has unresolvable local import ${specifier}`);
    }
    if (!modelPaths.has(canonical)) {
      throw new Error(
        `${source.relativePath} imports source outside the closed model: ${specifier}`,
      );
    }
    dependencies.push(canonical);
  }
  localDependencies.set(source.path, dependencies);
}

for (const source of sources) {
  const actual = [...new Set(localDependencies.get(source.path) ?? [])].sort();
  const expected = (expectedLocalDependencies.get(source.relativePath) ?? [])
    .map((relativePath) => realpathSync(resolve(repositoryRoot, relativePath)))
    .sort();
  if (
    actual.length !== expected.length ||
    actual.some((dependency, index) => dependency !== expected[index])
  ) {
    throw new Error(`${source.relativePath} violates the independent model dependency graph`);
  }
}

const reachablePaths = new Set();
const pendingPaths = [realpathSync(resolve(repositoryRoot, modelEntry))];
while (pendingPaths.length > 0) {
  const path = pendingPaths.pop();
  if (reachablePaths.has(path)) {
    continue;
  }
  reachablePaths.add(path);
  pendingPaths.push(...(localDependencies.get(path) ?? []));
}
const unreachableFiles = sources
  .filter((source) => !reachablePaths.has(source.path))
  .map((source) => source.relativePath);
if (reachablePaths.size !== modelPaths.size || unreachableFiles.length > 0) {
  throw new Error(
    `dogfooding protocol model roster is not its exact source closure: ${unreachableFiles.join(", ")}`,
  );
}
const measurements = {
  structuralNodes: [...structuralBySource.values()].reduce((sum, value) => sum + value.count, 0),
  physicalLines: sources.reduce((sum, source) => sum + physicalLines(source.text), 0),
  utf8Bytes: sources.reduce(
    (sum, source) => sum + Buffer.byteLength(canonicalText(source.text), "utf8"),
    0,
  ),
  charactersPerLine: Math.max(
    ...sources.flatMap((source) =>
      canonicalText(source.text)
        .split("\n")
        .map((line) => [...line].length),
    ),
  ),
};

for (const [measurement, maximum] of Object.entries(limits)) {
  if (measurements[measurement] > maximum) {
    throw new Error(
      `dogfooding protocol model ${measurement} is ${measurements[measurement]}, limit ${maximum}\nMODEL_BUDGET_MEASUREMENTS=${JSON.stringify({ structuralMetric, measurements, structuralBySource: Object.fromEntries(structuralBySource) })}`,
    );
  }
}

process.stdout.write(
  `${JSON.stringify({ modelFiles, structuralMetric, limits, measurements, structuralBySource: Object.fromEntries(structuralBySource) })}\n`,
);
