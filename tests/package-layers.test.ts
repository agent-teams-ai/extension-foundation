import assert from "node:assert/strict";
import test from "node:test";
import { hasOwnedNodeCompilerBase, ownedPackageLayers, ownedPackageQualificationRoots, permitsCapturedArtifactEvaluation, validateOwnedPackageLayers } from "../architecture/checks/package-layers.ts";
import { analyzeSource } from "../architecture/checks/source-safety.mjs";
import type { PackageCatalogEntry } from "../architecture/checks/package-policy.mjs";

const entry: PackageCatalogEntry = {
  id: "extension.node-artifact", path: "packages/node-artifact", package_name: "@extension-foundation/node-artifact",
  role: "integration-adapter", owner_document: "ADR-0016",
};
const path = "src/features/verified-artifact/evaluate.ts";
const source = 'await import(`data:text/javascript;base64,${Buffer.from(source, "utf8").toString("base64")}#${evaluationId}`);';
const imports = (text: string) => analyzeSource(path, text).dynamicModuleImports;

test("only the exact owned adapter has a closed evaluation and filesystem layer", () => {
  const layers = ownedPackageLayers(entry, "verified-artifact");
  assert.equal(layers.length, 3);
  assert.deepEqual(ownedPackageQualificationRoots(entry), ["packages/node-artifact/qualification"]);
  assert.deepEqual(validateOwnedPackageLayers(entry, "verified-artifact", layers), []);
  assert.equal(validateOwnedPackageLayers(entry, "verified-artifact", layers.slice(0, 2)).length, 1);
  const changed = layers.map(layer => ({ ...layer, allow: { ...layer.allow, packages: ["unowned"] } }));
  assert.equal(validateOwnedPackageLayers(entry, "verified-artifact", changed).length, 3);
  for (const altered of [{ ...entry, owner_document: "ADR-0002" }, { ...entry, role: "foundation-component" },
    { ...entry, path: "packages/other" }, { ...entry, id: "extension.core" }]) {
    assert.deepEqual(ownedPackageLayers(altered, "verified-artifact"), []);
    assert.deepEqual(ownedPackageQualificationRoots(altered), []);
    assert.equal(permitsCapturedArtifactEvaluation(altered, path, imports(source)), false);
  }
});

test("captured data evaluation never gives other loaders or files permission", () => {
  assert.equal(permitsCapturedArtifactEvaluation(entry, path, imports(source)), true);
  assert.ok(analyzeSource(path, source).errors.includes("dynamic module loading"));
  assert.equal(permitsCapturedArtifactEvaluation(entry, "src/features/verified-artifact/verify.ts", imports(source)), false);
  for (const rejected of ['await import(url);', 'await import("node:fs");', source + source,
    source.replace("data:text/javascript;base64,", "file:"), source.replace('"base64"', '"hex"'),
    source.replace("Buffer.from", "Other.from"), source.replace("evaluationId", "callerUrl"),
    source.replace(".from(", '["from"](')]) {
    assert.equal(permitsCapturedArtifactEvaluation(entry, path, imports(rejected)), false, rejected);
  }
});

test("Node ambient compilation belongs only to the selected adapter and cannot inject other type packages", () => {
  const base = { extends: "./tsconfig.json", compilerOptions: { types: ["node"] } };
  assert.equal(hasOwnedNodeCompilerBase(entry, base), true);
  assert.equal(hasOwnedNodeCompilerBase({ ...entry, id: "extension.core" }, base), false);
  for (const invalid of [null, {}, { ...base, extends: "./other.json" },
    { ...base, files: ["other.ts"] }, { ...base, compilerOptions: { types: ["node", "jest"] } }]) {
    assert.equal(hasOwnedNodeCompilerBase(entry, invalid), false);
  }
});
