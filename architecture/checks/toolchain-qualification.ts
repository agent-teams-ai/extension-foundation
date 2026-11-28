import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

function manifest(bytes: string): Record<string, unknown> {
  const value: unknown = JSON.parse(bytes);
  if (!isRecord(value)) throw new Error("Invalid installed tool manifest.");
  return value;
}

function supportedCompiler(version: unknown): boolean {
  if (typeof version !== "string") return false;
  const match = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/u.exec(version);
  if (match === null) return false;
  const major = Number(match.at(1)); const minor = Number(match.at(2)); const patch = Number(match.at(3));
  return major > 7 || (major === 7 && (minor > 0 || patch >= 2));
}

// Read package data before importing any Foundation runtime. The previous
// Foundation 1.7.2 eagerly initialized API Extractor's TypeScript 5.9 compiler.
const foundationPath = import.meta.resolve("@agent-teams/engineering-foundation/package.json");
const foundation = manifest(await readFile(new URL(foundationPath), "utf8"));
const dependencies = foundation["dependencies"];
if (typeof dependencies !== "object" || dependencies === null ||
    !("typescript" in dependencies) || !supportedCompiler(dependencies.typescript) ||
    "@microsoft/api-extractor" in dependencies) {
  throw new Error("The installed Foundation runtime does not support the required TypeScript 7.0.2 floor. Complete the official managed-cohort upgrade before running Foundation gates.");
}
const requireFromFoundation = createRequire(foundationPath);
const compiler = manifest(await readFile(requireFromFoundation.resolve("typescript/package.json"), "utf8"));
const rootCompiler = manifest(await readFile(new URL(import.meta.resolve("typescript/package.json")), "utf8"));
if (!supportedCompiler(compiler["version"]) || !supportedCompiler(rootCompiler["version"])) {
  throw new Error("The actually resolved Foundation and repository compilers must both satisfy TypeScript >=7.0.2.");
}
console.log("Installed Foundation and repository compiler selection satisfies TypeScript >=7.0.2.");
