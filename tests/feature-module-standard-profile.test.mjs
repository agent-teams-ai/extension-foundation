import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { parse as parseYaml } from "yaml";

import {
  checkFeatureModuleProfile, PROFILE_DOCUMENT, PROFILE_PATH, validateFeatureModuleProfile,
} from "../architecture/checks/feature-module-standard-profile.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const read = path => readFile(join(root, path), "utf8");
const input = {
  profile: JSON.parse(await read(PROFILE_PATH)),
  manifest: JSON.parse(await read("package.json")),
  catalog: JSON.parse(await read("architecture/package-catalog.json")),
  document: await read(PROFILE_DOCUMENT),
  index: await read("docs/README.md"),
  navigation: await read("AGENTS.md"),
  sourcePolicy: parseYaml(await read("architecture/foundation/source-dependencies.yaml")),
  workflow: parseYaml(await read(".github/workflows/ci.yml")),
};

test("checked-in profile binds the real pre-production repository", async () => {
  await checkFeatureModuleProfile(root);
  assert.equal(input.profile.standard.sha256,
    "851653f96643cf0466b67ab22963661976b00de44840fa3144a48a8c054f95fa");
  assert.equal(input.profile.status, "pre-production");
  assert.equal(input.profile.conformance.structural, "not-claimed");
});

test("rejects authority drift, silent scope changes and false conformance", async t => {
  const mutations = [
    ["digest", value => { value.profile.standard.sha256 = "a".repeat(64); }, /standard identity/u],
    ["moving revision", value => { value.profile.standard.revision = "main"; }, /standard identity/u],
    ["scope", value => { value.profile.scope.productionRoots = []; }, /scope/u],
    ["mapping", value => { value.profile.mapping.featureRoot = "src"; }, /mapping/u],
    ["local extensions", value => { value.profile.localExtensions.composition = "dynamic-host"; }, /local extensions/u],
    ["deviation", value => { value.profile.deviations = [{ reason: "skip" }]; }, /deviations/u],
    ["claim", value => { value.profile.conformance.structural = "passed"; }, /conformance/u],
    ["pending evidence", value => { value.profile.pendingProductionEvidence.pop(); }, /pending production evidence/u],
    ["unknown field", value => { value.profile.skip = true; }, /profile fields/u],
    ["package", value => { value.catalog.packages.push({ id: "new-package" }); }, /pre-production catalog/u],
  ];
  for (const [name, mutate, expected] of mutations) {
    await t.test(name, () => {
      const value = structuredClone(input);
      mutate(value);
      assert.throws(() => validateFeatureModuleProfile(value), expected);
    });
  }
});

test("rejects removed, no-op and nonblocking enforcement", async t => {
  const mutations = [
    ["missing leaf", value => { delete value.manifest.scripts["architecture:feature-module-profile"]; }],
    ["no-op leaf", value => { value.manifest.scripts["architecture:topology:check"] = "node -e ''"; }],
    ["missing full path", value => { value.manifest.scripts.check = "pnpm typecheck"; }],
    ["missing fast path", value => { value.manifest.scripts["check:fast"] = "pnpm typecheck"; }],
    ["hidden as echo", value => { value.manifest.scripts.check = "echo pnpm architecture:check"; }],
    ["swallowed failure", value => { value.manifest.scripts["architecture:check"] += " || true"; }],
    ["profile tests removed", value => { value.manifest.scripts["architecture:check:fast"] = value.manifest.scripts["architecture:check:fast"].replace("pnpm architecture:feature-module-profile:test && ", ""); }],
    ["CI removed", value => { value.workflow.jobs.check.steps = []; }],
    ["CI skipped", value => { value.workflow.jobs.check.if = false; }],
    ["CI soft failure", value => { value.workflow.jobs.check["continue-on-error"] = true; }],
  ];
  for (const [name, mutate] of mutations) {
    await t.test(name, () => {
      const value = structuredClone(input);
      mutate(value);
      assert.throws(() => validateFeatureModuleProfile(value), /FMS profile:/u);
    });
  }
});

test("rejects unreachable documentation and development boundary drift", async t => {
  for (const key of ["document", "index", "navigation"]) {
    await t.test(key, () => {
      const value = structuredClone(input);
      value[key] = "";
      assert.throws(() => validateFeatureModuleProfile(value), /FMS profile:/u);
    });
  }
  const value = structuredClone(input);
  value.sourcePolicy.boundaries.find(boundary => boundary.id === "repository.architecture-checks").dependencyMode = "runtime";
  assert.throws(() => validateFeatureModuleProfile(value), /governed development entrypoint/u);
});

test("filesystem check fails closed for absent files and ambiguous JSON", async () => {
  const fixture = await mkdtemp(join(tmpdir(), "ext-fo-fms-"));
  try {
    await assert.rejects(checkFeatureModuleProfile(fixture), /ENOENT/u);
    const paths = [PROFILE_PATH, PROFILE_DOCUMENT, "package.json", "architecture/package-catalog.json",
      "docs/README.md", "AGENTS.md", "architecture/foundation/source-dependencies.yaml",
      ".github/workflows/ci.yml", ...input.profile.authorities];
    for (const path of paths) {
      await mkdir(dirname(join(fixture, path)), { recursive: true });
      await writeFile(join(fixture, path), await read(path));
    }
    await checkFeatureModuleProfile(fixture);
    await writeFile(join(fixture, PROFILE_PATH), '{"status":"pre-production","status":"active"}');
    await assert.rejects(checkFeatureModuleProfile(fixture), /DUPLICATE_JSON_KEY/u);
    await writeFile(join(fixture, PROFILE_PATH), await read(PROFILE_PATH));
    await rm(join(fixture, input.profile.authorities[1]));
    await assert.rejects(checkFeatureModuleProfile(fixture), /ENOENT/u);
  } finally {
    await rm(fixture, { recursive: true, force: true });
  }
});
