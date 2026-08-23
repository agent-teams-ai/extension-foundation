import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { promisify } from "node:util";

import {
  applyFilesystemScaffold,
  planScaffoldFromFile,
  recoverFilesystemScaffold,
} from "@agent-teams/engineering-foundation/scaffolding";

const execFileAsync = promisify(execFile);
const repositoryRoot = fileURLToPath(new URL("..", import.meta.url));
const foundationCli = join(
  repositoryRoot,
  "node_modules",
  ".bin",
  process.platform === "win32" ? "agent-teams-foundation.cmd" : "agent-teams-foundation",
);

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
      owner_document: "architecture.example-package",
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
  await writeFixture(root, "docs/architecture/example-package.md", `---
id: architecture.example-package
type: architecture
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

async function runScaffoldCli(root, args) {
  const { stdout } = await execFileAsync(foundationCli, [
    ...args,
    "--consumer",
    root,
    "--json",
  ], {
    cwd: repositoryRoot,
    encoding: "utf8",
  });
  return JSON.parse(stdout);
}

test("public CLI plans, applies, and confirms a clean recovery state", async () => {
  const root = await createConsumer();
  try {
    const plan = await runScaffoldCli(root, [
      "scaffold-plan",
      "architecture/scaffolding-intents/example.yaml",
    ]);
    await writeFixture(root, "architecture/scaffolding-plans/example.json", `${JSON.stringify(plan)}\n`);

    const receipt = await runScaffoldCli(root, [
      "scaffold-apply",
      "architecture/scaffolding-plans/example.json",
    ]);
    assert.equal(receipt.outcome, "applied");

    const recovery = await runScaffoldCli(root, ["scaffold-recover"]);
    assert.deepEqual(recovery, { outcome: "no-pending-transaction" });
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
    const ownerPath = join(root, "docs/architecture/example-package.md");
    const owner = await readFile(ownerPath, "utf8");
    await writeFile(ownerPath, owner.replace("disposable package", "changed disposable package"));

    const receipt = await applyFilesystemScaffold(root, plan);
    assert.equal(receipt.outcome, "authority-stale");
    assert.equal(await exists(join(root, "packages/example")), false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
