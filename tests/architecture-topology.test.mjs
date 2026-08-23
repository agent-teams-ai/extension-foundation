import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { validatePackageTopology } from "../architecture/checks/package-topology.mjs";

const repositoryRoot = fileURLToPath(new URL("..", import.meta.url));
const acceptedOwner = async id => ({ id, status: "accepted" });

async function writeFixture(root, path, contents) {
  const target = join(root, path);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, contents);
}

function packageManifest() {
  return JSON.stringify({
    name: "@agent-teams/example",
    private: true,
    type: "module",
    agentTeamsArchitecture: {
      role: "foundation-component",
      ownerDocument: "architecture.example-package",
    },
  });
}

function packageCatalog() {
  return JSON.stringify({
    version: 1,
    packages: [{
      id: "module.example",
      role: "foundation-component",
      path: "packages/example",
      package_name: "@agent-teams/example",
      owner_document: "architecture.example-package",
    }],
  });
}

function sourcePolicy({ packageBoundary = false } = {}) {
  const boundaries = [{
    id: "repository.packages-closed",
    dependencyMode: "runtime",
    roots: ["packages"],
    entrypoints: [],
    allow: { boundaries: [], packages: [], builtins: [], runtimeReferences: [] },
  }];
  if (packageBoundary) {
    boundaries.push({
      id: "package.module.example",
      dependencyMode: "runtime",
      roots: ["packages/example/src"],
      entrypoints: ["packages/example/src/index.ts"],
      allow: { boundaries: [], packages: [], builtins: [], runtimeReferences: [] },
    });
  }
  return JSON.stringify({
    schemaVersion: 1,
    workspace: { kind: "pnpm", manifest: "pnpm-workspace.yaml" },
    governedRoots: ["packages"],
    boundaries,
  });
}

async function writeArchitecture(root, { catalog = '{"version":1,"packages":[]}', packageBoundary = false } = {}) {
  await writeFixture(root, "architecture/package-catalog.json", `${catalog}\n`);
  await writeFixture(root, "architecture/foundation/source-dependencies.yaml", `${sourcePolicy({ packageBoundary })}\n`);
}

test("repository package topology is closed until an owned package is admitted", async () => {
  assert.deepEqual(await validatePackageTopology({ root: repositoryRoot }), []);
});

test("topology rejects unregistered and reserved-only packages", async () => {
  const unregistered = await mkdtemp(join(tmpdir(), "extension-topology-unregistered-"));
  const reserved = await mkdtemp(join(tmpdir(), "extension-topology-reserved-"));
  try {
    await writeArchitecture(unregistered);
    await writeFixture(unregistered, "packages/unknown/package.json", '{"name":"@agent-teams/unknown","type":"module"}\n');
    assert.deepEqual(await validatePackageTopology({ root: unregistered, resolveOwner: acceptedOwner }), [
      "packages/unknown: materialized package is absent from the package catalog",
    ]);

    await writeArchitecture(reserved, { catalog: packageCatalog(), packageBoundary: true });
    assert.deepEqual(await validatePackageTopology({ root: reserved, resolveOwner: acceptedOwner }), [
      "packages/example: catalog entry must be materialized with its real feature slice in the same change",
    ]);
  } finally {
    await rm(unregistered, { recursive: true, force: true });
    await rm(reserved, { recursive: true, force: true });
  }
});

test("topology requires feature ownership and rejects root-level layer leakage", async () => {
  const root = await mkdtemp(join(tmpdir(), "extension-topology-feature-"));
  try {
    await writeArchitecture(root, { catalog: packageCatalog(), packageBoundary: true });
    await writeFixture(root, "packages/example/package.json", `${packageManifest()}\n`);
    await writeFixture(root, "packages/example/src/index.ts", 'export * from "./features/example/index.js";\n');
    assert.deepEqual(await validatePackageTopology({ root, resolveOwner: acceptedOwner }), [
      "packages/example: requires a non-empty feature-owned implementation slice",
    ]);

    await writeFixture(root, "packages/example/src/features/example/capability.ts", "export const example = true;\n");
    assert.deepEqual(await validatePackageTopology({ root, resolveOwner: acceptedOwner }), []);

    await writeFixture(root, "packages/example/src/adapters/cordis.ts", "export {};\n");
    assert.deepEqual(await validatePackageTopology({ root, resolveOwner: acceptedOwner }), [
      "packages/example/src/adapters/cordis.ts: source must belong to a feature-owned slice",
    ]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("topology rejects packages without an explicit runtime source boundary", async () => {
  const root = await mkdtemp(join(tmpdir(), "extension-topology-boundary-"));
  try {
    await writeArchitecture(root, { catalog: packageCatalog() });
    await writeFixture(root, "packages/example/package.json", `${packageManifest()}\n`);
    await writeFixture(root, "packages/example/src/index.ts", "export {};\n");
    await writeFixture(root, "packages/example/src/features/example/capability.ts", "export {};\n");
    assert.deepEqual(await validatePackageTopology({ root, resolveOwner: acceptedOwner }), [
      "module.example: requires runtime source boundary package.module.example rooted at packages/example/src",
    ]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("topology rejects missing or unapproved package ownership", async () => {
  const root = await mkdtemp(join(tmpdir(), "extension-topology-owner-"));
  try {
    await writeArchitecture(root, { catalog: packageCatalog(), packageBoundary: true });
    await writeFixture(root, "packages/example/package.json", `${packageManifest()}\n`);
    await writeFixture(root, "packages/example/src/features/example/capability.ts", "export {};\n");
    const proposedOwner = async id => ({ id, status: "proposed" });
    assert.deepEqual(await validatePackageTopology({ root, resolveOwner: proposedOwner }), [
      "module.example: owner_document must resolve to one accepted or active document",
    ]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
