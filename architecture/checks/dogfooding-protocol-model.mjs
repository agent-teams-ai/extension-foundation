#!/usr/bin/env node

import { lstatSync, readFileSync, realpathSync } from "node:fs";
import { dirname, isAbsolute, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseSync, Visitor } from "oxc-parser";

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
  ["tests/qualification/dogfooding-protocol-oracle.ts", [
    "tests/qualification/dogfooding-protocol-contract.ts",
  ]],
  ["tests/qualification/dogfooding-protocol-reducer.ts", [
    "tests/qualification/dogfooding-protocol-contract.ts",
  ]],
  ["tests/qualification/dogfooding-protocol.test.ts", [
    "tests/qualification/dogfooding-protocol-contract.ts",
    "tests/qualification/dogfooding-protocol-oracle.ts",
    "tests/qualification/dogfooding-protocol-reducer.ts",
  ]],
]);
const limits = { physicalLines: 4_400, utf8Bytes: 332_000, charactersPerLine: 200 };
const decode = new TextDecoder("utf-8", { fatal: true });
const allowedExternalDependencies = new Set(["fast-check", "node:assert/strict", "node:test"]);
const forbiddenRuntimeIdentifiers = new Set([
  "createRequire", "eval", "fetch", "Function", "getBuiltinModule", "globalThis",
  "importScripts", "module", "process", "Reflect", "require", "SharedWorker",
  "WebAssembly", "Worker",
]);
const forbiddenRuntimeProperties = new Set(["constructor"]);

const canonicalText = (text) => text.replace(/\r\n?|[\u2028\u2029]/gu, "\n");
const physicalLines = (text) => {
  const canonical = canonicalText(text);
  return canonical.length === 0 ? 0
    : (canonical.match(/\n/gu)?.length ?? 0) + (canonical.endsWith("\n") ? 0 : 1);
};

const sources = modelFiles.map((relativePath) => {
  const path = resolve(repositoryRoot, relativePath);
  const metadata = lstatSync(path);
  if (!metadata.isFile() || metadata.isSymbolicLink()) {
    throw new Error(`${relativePath} must be a non-symlink regular file`);
  }
  return { path: realpathSync(path), relativePath, text: decode.decode(readFileSync(path)) };
});
const modelPaths = new Set(sources.map(source => source.path));
if (modelPaths.size !== modelFiles.length) {
  throw new Error("dogfooding protocol model roster must contain four distinct files");
}

const dependencySpecifiers = (source) => {
  const parsed = parseSync(source.path, source.text, { sourceType: "module" });
  if (parsed.errors.length > 0) {
    throw new Error(`${source.relativePath} cannot be parsed: ${parsed.errors.map(error => error.message).join("; ")}`);
  }

  const specifiers = [];
  const literal = (node) => {
    if (node?.type !== "Literal" || typeof node.value !== "string") {
      throw new Error(`${source.relativePath} contains a non-literal module loader`);
    }
    specifiers.push(node.value);
  };
  new Visitor({
    ImportDeclaration: node => literal(node.source),
    ExportAllDeclaration: node => literal(node.source),
    ExportNamedDeclaration: node => { if (node.source !== null) literal(node.source); },
    ImportExpression: () => {
      throw new Error(`${source.relativePath} contains unsupported dynamic module loading`);
    },
    TSImportType: node => literal(node.source),
    TSImportEqualsDeclaration: () => {
      throw new Error(`${source.relativePath} contains unsupported TypeScript import-equals`);
    },
    Identifier: node => {
      if (forbiddenRuntimeIdentifiers.has(node.name)) {
        throw new Error(`${source.relativePath} contains forbidden runtime loader primitive ${node.name}`);
      }
    },
    MemberExpression: node => {
      const property = node.computed ? node.property?.value : node.property?.name;
      if (typeof property === "string" && forbiddenRuntimeProperties.has(property)) {
        throw new Error(`${source.relativePath} contains forbidden runtime loader property ${property}`);
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
        throw new Error(`${source.relativePath} imports unsupported external dependency ${specifier}`);
      }
      continue;
    }
    if (specifier.startsWith("#")) {
      throw new Error(`${source.relativePath} uses unsupported local alias ${specifier}`);
    }
    const target = fileUrl ? fileURLToPath(specifier) :
      isAbsolute(specifier) ? specifier : resolve(dirname(source.path), specifier);
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
      throw new Error(`${source.relativePath} imports source outside the closed model: ${specifier}`);
    }
    dependencies.push(canonical);
  }
  localDependencies.set(source.path, dependencies);
}

for (const source of sources) {
  const actual = [...new Set(localDependencies.get(source.path) ?? [])].sort();
  const expected = (expectedLocalDependencies.get(source.relativePath) ?? [])
    .map(relativePath => realpathSync(resolve(repositoryRoot, relativePath)))
    .sort();
  if (actual.length !== expected.length ||
      actual.some((dependency, index) => dependency !== expected[index])) {
    throw new Error(`${source.relativePath} violates the independent model dependency graph`);
  }
}

const reachablePaths = new Set();
const pendingPaths = [realpathSync(resolve(repositoryRoot, modelEntry))];
while (pendingPaths.length > 0) {
  const path = pendingPaths.pop();
  if (reachablePaths.has(path)) continue;
  reachablePaths.add(path);
  pendingPaths.push(...localDependencies.get(path) ?? []);
}
const unreachableFiles = sources
  .filter(source => !reachablePaths.has(source.path))
  .map(source => source.relativePath);
if (reachablePaths.size !== modelPaths.size || unreachableFiles.length > 0) {
  throw new Error(`dogfooding protocol model roster is not its exact source closure: ${unreachableFiles.join(", ")}`);
}
const measurements = {
  physicalLines: sources.reduce((sum, source) => sum + physicalLines(source.text), 0),
  utf8Bytes: sources.reduce((sum, source) =>
    sum + Buffer.byteLength(canonicalText(source.text), "utf8"), 0),
  charactersPerLine: Math.max(...sources.flatMap(source =>
    canonicalText(source.text).split("\n").map(line => [...line].length))),
};

for (const [measurement, maximum] of Object.entries(limits)) {
  if (measurements[measurement] > maximum) {
    throw new Error(`dogfooding protocol model ${measurement} is ${measurements[measurement]}, limit ${maximum}`);
  }
}

process.stdout.write(`${JSON.stringify({ modelFiles, limits, measurements })}\n`);
