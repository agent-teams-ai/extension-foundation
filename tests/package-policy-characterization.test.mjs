import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { cp, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import test from "node:test";

import {
  hasCanonicalPackageRootExports,
  loadPackagePolicy,
  packageExportTargets,
  packageOwnerFeatures,
  requireValidPackagePolicy,
} from "../architecture/checks/package-policy.mjs";
import { validatePackageTopology } from "../architecture/checks/package-topology.mjs";
import {
  createDocsOwnerCatalog as createOwnerCatalog,
  ownerEvidenceFromDocsExecution,
} from "../architecture/checks/package-policy/docs-owner-source.mjs";

const BASE_SHA = "0836f62a386e253b156271f0b8f7defc969f3580";
const repositoryRoot = fileURLToPath(new URL("..", import.meta.url));
const execFileAsync = promisify(execFile);
const skipExpensiveIntegration = process.env.PACKAGE_POLICY_TEST_MODE === "fast"
  ? "skipped in package-policy fast mode"
  : false;

async function writeFixture(root, path, contents) {
  const target = join(root, path);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, contents);
}

function entry(overrides = {}) {
  return {
    id: "module.example",
    owner_document: "ADR-0099",
    package_name: "@agent-teams/example",
    path: "packages/example",
    role: "foundation-component",
    ...overrides,
  };
}

async function policyFixture(catalog = { version: 1, packages: [entry()] }) {
  const root = await mkdtemp(join(tmpdir(), "extension-policy-characterization-"));
  await writeFixture(root, "architecture/package-catalog.json", `${JSON.stringify(catalog)}\n`);
  await writeFixture(root, "architecture/foundation/scaffolding.yaml", `compositions:
  - id: fixture
    targetRoles: [foundation-component]
`);
  return root;
}

test(`catalog policy diagnostics are characterized at ${BASE_SHA}`, async () => {
  const root = await policyFixture({
    version: 1,
    packages: [
      entry(),
      entry({ id: "bad/id", role: "unknown", path: "packages/example/child", package_name: "wrong", owner_document: "OD-1" }),
      entry({ id: "module.example", path: "packages/other" }),
      { ...entry(), unknown: true },
    ],
  });
  try {
    const policy = await loadPackagePolicy(root);
    assert.deepEqual(policy.errors, [
      "bad/id: package id is invalid",
      "bad/id: unknown role unknown",
      "bad/id: package_name must use the @agent-teams scope",
      "bad/id: owner_document must be an ADR identity",
      "bad/id: package path overlaps module.example",
      "module.example: duplicate id module.example",
      "module.example: duplicate package_name @agent-teams/example",
      "architecture/package-catalog.json: every entry must contain exactly id, owner_document, package_name, path, role",
    ]);
    assert.equal(policy.entries.length, 3);
    assert.equal(policy.entriesById.get("module.example").path, "packages/other");
    await assert.rejects(requireValidPackagePolicy(root), /^Error: package catalog is invalid:/u);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("duplicate package paths retain their exact diagnostics and order", async () => {
  const root = await policyFixture({
    version: 1,
    packages: [
      entry(),
      entry({ id: "module.other", package_name: "@agent-teams/other" }),
    ],
  });
  try {
    assert.deepEqual((await loadPackagePolicy(root)).errors, [
      "module.other: duplicate path packages/example",
      "module.other: package path overlaps module.example",
    ]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("policy filesystem sources are fresh and preserve JSON/YAML failures", async () => {
  const root = await policyFixture({ version: 1, packages: [] });
  try {
    assert.deepEqual((await loadPackagePolicy(root)).entries, []);
    await writeFixture(root, "architecture/package-catalog.json", `${JSON.stringify({ version: 1, packages: [entry()] })}\n`);
    assert.equal((await loadPackagePolicy(root)).entries.length, 1);
    await writeFixture(root, "architecture/package-catalog.json", "{");
    await assert.rejects(loadPackagePolicy(root), SyntaxError);
    await writeFixture(root, "architecture/package-catalog.json", '{"version":1,"packages":[]}\n');
    await writeFixture(root, "architecture/foundation/scaffolding.yaml", "compositions: [\n");
    await assert.rejects(loadPackagePolicy(root), /Flow sequence/u);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("missing catalog and scaffolding policy files preserve filesystem failures", async () => {
  for (const missingPath of [
    "architecture/package-catalog.json",
    "architecture/foundation/scaffolding.yaml",
  ]) {
    const root = await policyFixture({ version: 1, packages: [] });
    try {
      await rm(join(root, missingPath));
      await assert.rejects(loadPackagePolicy(root), error => (
        error?.code === "ENOENT" && error.path === join(root, missingPath)
      ));
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  }
});

test("invalid package policy does not invoke Docs ownership lookup", async () => {
  const root = await policyFixture({
    version: 1,
    packages: [entry({ role: "unknown" })],
  });
  let docsCalls = 0;
  const bomb = async () => {
    docsCalls += 1;
    throw new Error("Docs lookup must not run");
  };
  try {
    assert.deepEqual(await validatePackageTopology({
      root,
      resolveOwner: bomb,
      listEffectiveOwners: bomb,
    }), ["module.example: unknown role unknown"]);
    assert.equal(docsCalls, 0);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("pure value helpers retain exact export and ownership behavior", () => {
  assert.equal(hasCanonicalPackageRootExports({ exports: { ".": { import: "./dist/index.js", types: "./dist/index.d.ts" } } }), true);
  assert.equal(hasCanonicalPackageRootExports({ exports: { ".": { import: "./dist/index.js", types: "./dist/index.d.ts", default: "./dist/index.js" } } }), false);
  assert.deepEqual(packageExportTargets({ import: ["./dist/a.js", { default: "./dist/b.js" }] }), ["./dist/a.js", "./dist/b.js"]);
  assert.equal(packageExportTargets({ import: 1 }), undefined);
  assert.deepEqual(packageOwnerFeatures(entry(), {
    id: "ADR-0099",
    type: "adr",
    status: "accepted",
    supersededBy: [],
    packageOwnershipErrors: [],
    packageOwnership: [{
      packageId: "module.example",
      packageName: "@agent-teams/example",
      packagePath: "packages/example",
      features: ["alpha"],
    }],
  }), ["alpha"]);
});

test("Docs envelopes, supersession, duplicates, and per-instance caching are characterized", async () => {
  const document = (id, metadata = {}) => ({
    id,
    metadata: { type: "adr", status: "accepted", ...metadata },
  });
  const evidence = ownerEvidenceFromDocsExecution({ envelope: { outcome: "success", result: { documents: [
    document("ADR-0097", { superseded_by: ["ADR-0101"] }),
    document("ADR-0098"),
    document("ADR-0099", { package_ownership: [{
      package_id: "module.example",
      package_name: "@agent-teams/example",
      package_path: "packages/example",
      features: ["zeta", "alpha"],
    }] }),
    document("ADR-0100", { supersedes: ["ADR-0098"] }),
    document("ADR-0101"),
  ] } } });
  let calls = 0;
  const catalog = createOwnerCatalog({ loadDocuments: async () => { calls += 1; return evidence; } });
  const [owner, effective] = await Promise.all([catalog.resolve("ADR-0099"), catalog.listEffective()]);
  assert.deepEqual(owner.packageOwnership[0].features, ["alpha", "zeta"]);
  assert.deepEqual(effective.map(item => item.id), ["ADR-0099", "ADR-0100", "ADR-0101"]);
  assert.deepEqual((await catalog.resolve("ADR-0097")).supersededBy, ["ADR-0101"]);
  assert.deepEqual((await catalog.resolve("ADR-0098")).supersededBy, ["ADR-0100"]);
  assert.equal(calls, 1);
  assert.equal(await createOwnerCatalog({ loadDocuments: async () => [evidence[2], evidence[2]] }).resolve("ADR-0099"), undefined);

  let rejectionCalls = 0;
  const rejected = createOwnerCatalog({ loadDocuments: async () => { rejectionCalls += 1; throw new Error("Docs failed"); } });
  await assert.rejects(rejected.resolve("ADR-0099"), /Docs failed/u);
  await assert.rejects(rejected.listEffective(), /Docs failed/u);
  assert.equal(rejectionCalls, 1);
  assert.equal((await createOwnerCatalog({ loadDocuments: async () => evidence }).resolve("ADR-0099")).id, "ADR-0099");
  assert.throws(() => ownerEvidenceFromDocsExecution({ envelope: { outcome: "failure" } }), /could not enumerate/u);
  assert.throws(() => ownerEvidenceFromDocsExecution({ envelope: { outcome: "success" } }), TypeError);
});

test("production CLIs preserve process output and exit codes", { skip: skipExpensiveIntegration }, async () => {
  for (const [path, expected] of [
    ["architecture/checks/package-topology.mjs", "Package topology check passed.\n"],
    ["architecture/checks/package-artifacts.mjs", "Built package artifact check passed.\n"],
  ]) {
    const result = await execFileAsync(process.execPath, [join(repositoryRoot, path)], { cwd: repositoryRoot });
    assert.equal(result.stdout, expected);
    assert.equal(result.stderr, "");
  }
  await assert.rejects(
    execFileAsync(process.execPath, [join(repositoryRoot, "architecture/checks/scaffold.mjs"), "invalid"], { cwd: repositoryRoot }),
    error => error.code === 2 && error.stdout === "" && error.stderr === "SCAFFOLD_POLICY_REJECTED: usage: scaffold.mjs plan <intent> <plan> | apply <plan> <plan-digest> | recover\n",
  );
});

test("topology and artifact CLIs preserve validation failure output and exit 1", { skip: skipExpensiveIntegration }, async () => {
  const root = await mkdtemp(join(repositoryRoot, ".package-policy-cli-"));
  try {
    await cp(join(repositoryRoot, "architecture/checks"), join(root, "architecture/checks"), { recursive: true });
    await writeFixture(root, "architecture/package-catalog.json", `${JSON.stringify({
      version: 1,
      packages: [entry({ role: "unknown" })],
    })}\n`);
    await writeFixture(root, "architecture/foundation/scaffolding.yaml", `compositions:
  - id: fixture
    targetRoles: [foundation-component]
`);
    for (const path of ["package-topology.mjs", "package-artifacts.mjs"]) {
      await assert.rejects(
        execFileAsync(process.execPath, [join(root, "architecture/checks", path)]),
        error => error.code === 1
          && error.stdout === ""
          && error.stderr === "ERROR module.example: unknown role unknown\n",
      );
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
