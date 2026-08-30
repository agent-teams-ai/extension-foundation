#!/usr/bin/env node

import { readFileSync, realpathSync, statSync } from "node:fs";
import { dirname, isAbsolute, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseSync, Visitor } from "oxc-parser";

const repositoryRoot = fileURLToPath(new URL("../../", import.meta.url));
const modelFiles = [
  "tests/qualification/dogfooding-protocol-contract.ts",
  "tests/qualification/dogfooding-protocol-oracle.ts",
  "tests/qualification/dogfooding-protocol-reducer.ts",
  "tests/qualification/dogfooding-protocol.test.ts",
];
const modelEntry = "tests/qualification/dogfooding-protocol.test.ts";
const limits = { physicalLines: 4_000, utf8Bytes: 320_000, charactersPerLine: 200 };
const decode = new TextDecoder("utf-8", { fatal: true });

const physicalLines = (text) => text.length === 0 ? 0
  : (text.match(/\n/gu)?.length ?? 0) + (text.endsWith("\n") ? 0 : 1);

const sources = modelFiles.map((relativePath) => {
  const path = resolve(repositoryRoot, relativePath);
  if (!statSync(path).isFile()) throw new Error(`${relativePath} must be a regular file`);
  return { path: realpathSync(path), relativePath, text: decode.decode(readFileSync(path)) };
});
const modelPaths = new Set(sources.map(source => source.path));

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
  const named = (node, name) => node.type === "Identifier" && node.name === name;
  new Visitor({
    ImportDeclaration: node => literal(node.source),
    ExportAllDeclaration: node => literal(node.source),
    ExportNamedDeclaration: node => { if (node.source !== null) literal(node.source); },
    ImportExpression: node => literal(node.source),
    TSImportType: node => literal(node.source),
    TSImportEqualsDeclaration: node => {
      if (node.moduleReference.type === "TSExternalModuleReference") {
        literal(node.moduleReference.expression);
      }
    },
    CallExpression: node => {
      const { callee } = node;
      const member = callee.type === "MemberExpression" && !callee.computed ? callee : null;
      const loader = named(callee, "require") || member !== null && (
        named(member.object, "require") && named(member.property, "resolve") ||
        named(member.object, "module") && named(member.property, "require") ||
        member.object.type === "MetaProperty" && named(member.object.meta, "import") &&
          named(member.object.property, "meta") && named(member.property, "resolve")
      );
      if (loader) literal(node.arguments[0]);
    },
  }).visit(parsed.program);
  return specifiers;
};

const localDependencies = new Map();
for (const source of sources) {
  const dependencies = [];
  for (const specifier of dependencySpecifiers(source)) {
    const local = /^(?:\.{1,2}(?:[/\\]|$)|[/\\]|file:|#)/u.test(specifier);
    if (!local) continue;
    if (specifier.startsWith("#")) {
      throw new Error(`${source.relativePath} uses unsupported local alias ${specifier}`);
    }
    const target = specifier.startsWith("file:") ? fileURLToPath(specifier) :
      isAbsolute(specifier) ? specifier : resolve(dirname(source.path), specifier);
    let canonical;
    try {
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
    sum + Buffer.byteLength(source.text.replace(/\r\n?/gu, "\n"), "utf8"), 0),
  charactersPerLine: Math.max(...sources.flatMap(source =>
    source.text.split("\n").map(line => [...line.replace(/\r$/u, "")].length))),
};

for (const [measurement, maximum] of Object.entries(limits)) {
  if (measurements[measurement] > maximum) {
    throw new Error(`dogfooding protocol model ${measurement} is ${measurements[measurement]}, limit ${maximum}`);
  }
}

process.stdout.write(`${JSON.stringify({ modelFiles, limits, measurements })}\n`);
