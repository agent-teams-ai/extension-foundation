import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, stat, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";

import {
  applyFilesystemScaffold,
  planScaffoldFromFile,
  recoverFilesystemScaffold,
} from "@agent-teams/engineering-foundation/scaffolding";
import {
  applyScaffoldPlan,
  publishScaffoldPlan,
} from "../architecture/checks/scaffold.mjs";
import { validatePackageTopology } from "../architecture/checks/package-topology.mjs";

const acceptedOwner = async id => ({ id, type: "adr", status: "accepted" });

async function writeFixture(root, path, contents) {
  const target = join(root, path);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, contents);
}

async function createConsumer() {
  const root = await mkdtemp(join(tmpdir(), "extension-scaffolding-"));
  const catalog = {
    version: 1,
    packages: [{
      id: "module.example",
      role: "foundation-component",
      path: "packages/example",
      package_name: "@agent-teams/example",
      owner_document: "ADR-0099",
    }],
  };

  await writeFixture(root, "architecture/package-catalog.json", `${JSON.stringify(catalog)}\n`);
  await writeFixture(root, "architecture/foundation/scaffolding.yaml", `schemaVersion: 1
projectId: extension-foundation-fixture
targetCatalogPath: architecture/package-catalog.json
compositions:
  - id: extension-foundation-library-boundary
    scaffoldProfile:
      ref:
        id: foundation.node-typescript-pnpm-esm
        contractVersion: 1
      parameters:
        tsconfigBase: tsconfig.json
    recipe:
      ref:
        id: foundation.node-typescript-library-boundary
        contractVersion: 1
    targetRoles:
      - foundation-component
    authorityVerifiers:
      - id: foundation.markdown-yaml-owner
        contractVersion: 1
        parameters:
          allowedStatuses:
            - accepted
          documentRoots:
            - docs
    policies: []
`);
  await writeFixture(root, "architecture/scaffolding-intents/example.yaml", `schemaVersion: 1
compositionId: extension-foundation-library-boundary
targetRef: module.example
`);
  await writeFixture(root, "docs/decisions/0099-example-package.md", `---
id: ADR-0099
type: adr
status: accepted
owner: architecture
summary: Owns the disposable package used by scaffolding qualification.
---

# Example Package
`);
  await writeFixture(root, "tsconfig.json", '{"compilerOptions":{"strict":true}}\n');
  return root;
}

async function exists(path) {
  try {
    await stat(path);
    return true;
  } catch (error) {
    if (error?.code === "ENOENT") return false;
    throw error;
  }
}

test("repository adapter publishes create-only, applies, and confirms clean recovery", async () => {
  const root = await createConsumer();
  try {
    const plan = await publishScaffoldPlan({
      root,
      intentPath: "architecture/scaffolding-intents/example.yaml",
      planPath: "architecture/scaffolding-plans/example.json",
    });
    assert.deepEqual(
      JSON.parse(await readFile(join(root, "architecture/scaffolding-plans/example.json"), "utf8")),
      plan,
    );

    const receipt = await applyScaffoldPlan({
      root,
      planPath: "architecture/scaffolding-plans/example.json",
    });
    assert.equal(receipt.outcome, "applied");

    assert.equal(await recoverFilesystemScaffold(root), undefined);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("plan publication cannot overwrite, traverse, or follow a plan-directory symlink", async () => {
  const root = await createConsumer();
  try {
    const input = {
      root,
      intentPath: "architecture/scaffolding-intents/example.yaml",
      planPath: "architecture/scaffolding-plans/example.json",
    };
    await publishScaffoldPlan(input);
    const original = await readFile(join(root, input.planPath), "utf8");
    await assert.rejects(publishScaffoldPlan(input), /EEXIST/u);
    assert.equal(await readFile(join(root, input.planPath), "utf8"), original);
    await assert.rejects(publishScaffoldPlan({
      ...input,
      planPath: "../escaped.json",
    }), /plan path must match/u);

    const linkedRoot = await createConsumer();
    try {
      await mkdir(join(linkedRoot, "outside"));
      await symlink(join(linkedRoot, "outside"), join(linkedRoot, "architecture/scaffolding-plans"));
      await assert.rejects(publishScaffoldPlan({ ...input, root: linkedRoot }), /symbolic link/u);
    } finally {
      await rm(linkedRoot, { recursive: true, force: true });
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("scaffolding plans, applies, proves idempotency, and never overwrites drift", async () => {
  const root = await createConsumer();
  try {
    const plan = await planScaffoldFromFile({
      consumerRoot: root,
      intentPath: "architecture/scaffolding-intents/example.yaml",
    });
    assert.equal(plan.target.id, "module.example");
    assert.equal(plan.operations.length, 3);

    const applied = await applyFilesystemScaffold(root, plan);
    assert.equal(applied.outcome, "applied");
    assert.equal(await exists(join(root, "packages/example/package.json")), true);

    const repeated = await applyFilesystemScaffold(root, plan);
    assert.equal(repeated.outcome, "already-applied");

    const changed = "export const userOwned = true;\n";
    await writeFile(join(root, "packages/example/src/index.ts"), changed);
    const rejected = await applyFilesystemScaffold(root, plan);
    assert.equal(rejected.outcome, "rejected");
    assert.equal(await readFile(join(root, "packages/example/src/index.ts"), "utf8"), changed);
    assert.equal(await recoverFilesystemScaffold(root), undefined);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("scaffolding rejects stale owner authority before publishing files", async () => {
  const root = await createConsumer();
  try {
    const plan = await planScaffoldFromFile({
      consumerRoot: root,
      intentPath: "architecture/scaffolding-intents/example.yaml",
    });
    const ownerPath = join(root, "docs/decisions/0099-example-package.md");
    const owner = await readFile(ownerPath, "utf8");
    await writeFile(ownerPath, owner.replace("disposable package", "changed disposable package"));

    const receipt = await applyFilesystemScaffold(root, plan);
    assert.equal(receipt.outcome, "authority-stale");
    assert.equal(await exists(join(root, "packages/example")), false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("scaffold output reaches a valid package only after the owner adds its real slice and boundary", async () => {
  const root = await createConsumer();
  try {
    const plan = await publishScaffoldPlan({
      root,
      intentPath: "architecture/scaffolding-intents/example.yaml",
      planPath: "architecture/scaffolding-plans/example.json",
    });
    assert.equal((await applyScaffoldPlan({
      root,
      planPath: "architecture/scaffolding-plans/example.json",
    })).outcome, "applied");
    await writeFixture(root, "packages/example/src/features/example/capability.ts", "export const capability = true;\n");
    await writeFixture(root, "architecture/foundation/source-dependencies.yaml", `schemaVersion: 1
workspace: {kind: pnpm, manifest: pnpm-workspace.yaml}
governedRoots: [packages/example/src]
boundaries:
  - id: package.module.example
    dependencyMode: runtime
    roots: [packages/example/src]
    entrypoints: [packages/example/src/index.ts]
    allow: {boundaries: [], packages: [], builtins: [], runtimeReferences: []}
`);
    assert.equal(plan.target.ownerDocument.id, "ADR-0099");
    assert.deepEqual(await validatePackageTopology({ root, resolveOwner: acceptedOwner }), []);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("apply rejects a plan after its catalog identity changes", async () => {
  const root = await createConsumer();
  try {
    await publishScaffoldPlan({
      root,
      intentPath: "architecture/scaffolding-intents/example.yaml",
      planPath: "architecture/scaffolding-plans/example.json",
    });
    const catalogPath = join(root, "architecture/package-catalog.json");
    const catalog = JSON.parse(await readFile(catalogPath, "utf8"));
    catalog.packages[0].path = "packages/renamed";
    await writeFile(catalogPath, `${JSON.stringify(catalog)}\n`);
    await assert.rejects(applyScaffoldPlan({
      root,
      planPath: "architecture/scaffolding-plans/example.json",
    }), /differs from the repository-owned package policy/u);
    assert.equal(await exists(join(root, "packages/example")), false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("apply rejects a symbolic-link plan file", async () => {
  const root = await createConsumer();
  try {
    await mkdir(join(root, "architecture/scaffolding-plans"));
    await writeFixture(root, "outside.json", "{}\n");
    await symlink(join(root, "outside.json"), join(root, "architecture/scaffolding-plans/example.json"));
    await assert.rejects(applyScaffoldPlan({
      root,
      planPath: "architecture/scaffolding-plans/example.json",
    }), /symbolic link/u);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
