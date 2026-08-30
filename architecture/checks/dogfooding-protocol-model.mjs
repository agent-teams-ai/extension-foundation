#!/usr/bin/env node

import { readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = fileURLToPath(new URL("../../", import.meta.url));
const modelFiles = [
  "tests/qualification/dogfooding-protocol-contract.ts",
  "tests/qualification/dogfooding-protocol-oracle.ts",
  "tests/qualification/dogfooding-protocol-reducer.ts",
  "tests/qualification/dogfooding-protocol.test.ts",
];
const limits = { physicalLines: 4_000, utf8Bytes: 320_000, charactersPerLine: 200 };
const decode = new TextDecoder("utf-8", { fatal: true });

const physicalLines = (text) => text.length === 0 ? 0
  : (text.match(/\n/gu)?.length ?? 0) + (text.endsWith("\n") ? 0 : 1);

const sources = modelFiles.map((relativePath) => {
  const path = resolve(repositoryRoot, relativePath);
  if (!statSync(path).isFile()) throw new Error(`${relativePath} must be a regular file`);
  return { relativePath, text: decode.decode(readFileSync(path)) };
});
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
