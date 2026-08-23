import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { validatePackageTopology } from "../architecture/checks/package-topology.mjs";

const repositoryRoot = fileURLToPath(new URL("..", import.meta.url));
const acceptedOwner = async id => ({ id, type: "adr", status: "accepted" });

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
    scripts: { check: "node --test" },
    exports: {
      ".": { types: "./dist/index.d.ts", import: "./dist/index.js" },
    },
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

function packageTsconfig(compilerOptions = { strict: true }) {
  return JSON.stringify({ extends: "../../tsconfig.json", compilerOptions });
}

function sourcePolicy({ packageBoundary = false } = {}) {
  const boundaries = [];
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
    governedRoots: packageBoundary ? ["packages/example/src"] : [],
    boundaries,
  });
}

async function writeArchitecture(root, { catalog = '{"version":1,"packages":[]}', packageBoundary = false } = {}) {
  await writeFixture(root, "architecture/package-catalog.json", `${catalog}\n`);
  await writeFixture(root, "architecture/foundation/source-dependencies.yaml", `${sourcePolicy({ packageBoundary })}\n`);
  await writeFixture(root, "tsconfig.json", '{"compilerOptions":{"strict":true}}\n');
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
      "packages/unknown/package.json: file is outside every cataloged package",
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
    await writeFixture(root, "packages/example/tsconfig.json", `${packageTsconfig()}\n`);
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
    await writeFixture(root, "packages/example/tsconfig.json", `${packageTsconfig()}\n`);
    await writeFixture(root, "packages/example/src/index.ts", "export {};\n");
    await writeFixture(root, "packages/example/src/features/example/capability.ts", "export {};\n");
    assert.deepEqual(await validatePackageTopology({ root, resolveOwner: acceptedOwner }), [
      "module.example: requires runtime source boundary package.module.example rooted at packages/example/src",
      "module.example: packages/example/src must be an explicit governed source root",
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
    await writeFixture(root, "packages/example/tsconfig.json", `${packageTsconfig()}\n`);
    await writeFixture(root, "packages/example/src/features/example/capability.ts", "export {};\n");
    const proposedOwner = async id => ({ id, type: "adr", status: "proposed" });
    assert.deepEqual(await validatePackageTopology({ root, resolveOwner: proposedOwner }), [
      "module.example: owner_document must resolve to one accepted ADR",
    ]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("topology rejects rogue source and reverse package-boundary declarations", async () => {
  const root = await mkdtemp(join(tmpdir(), "extension-topology-reverse-"));
  try {
    await writeArchitecture(root);
    const policy = JSON.parse(sourcePolicy());
    policy.governedRoots.push("packages/rogue/src");
    policy.boundaries.push({
      id: "package.module.rogue",
      dependencyMode: "runtime",
      roots: ["packages/rogue/src"],
      entrypoints: ["packages/rogue/src/index.ts"],
      allow: { boundaries: [], packages: [], builtins: [], runtimeReferences: [] },
    });
    await writeFixture(root, "architecture/foundation/source-dependencies.yaml", `${JSON.stringify(policy)}\n`);
    await writeFixture(root, "packages/rogue/src/index.ts", "export const escaped = true;\n");
    assert.deepEqual(await validatePackageTopology({ root, resolveOwner: acceptedOwner }), [
      "package.module.rogue: package boundary has no matching catalog entry",
      "packages/rogue/src: governed package root has no matching catalog entry",
      "packages/rogue/src/index.ts: file is outside every cataloged package",
    ]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("topology fails closed on dependency forms the shared source graph does not model", async () => {
  const root = await mkdtemp(join(tmpdir(), "extension-topology-source-"));
  try {
    await writeArchitecture(root, { catalog: packageCatalog(), packageBoundary: true });
    await writeFixture(root, "packages/example/package.json", `${packageManifest()}\n`);
    await writeFixture(root, "packages/example/tsconfig.json", `${packageTsconfig({ paths: { "#/*": ["src/*"] } })}\n`);
    await writeFixture(root, "packages/example/src/features/example/capability.ts", "const load = eval;\nload('import(\"hidden\")');\n");
    assert.deepEqual(await validatePackageTopology({ root, resolveOwner: acceptedOwner }), [
      "packages/example/tsconfig.json: compilerOptions.paths is prohibited until the shared source graph models it",
    ]);

    await writeFixture(root, "packages/example/src/features/example/capability.ts", 'eval("import(\\\"hidden\\\")");\n');
    assert.deepEqual(await validatePackageTopology({ root, resolveOwner: acceptedOwner }), [
      "packages/example/src/features/example/capability.ts: eval-based module loading are prohibited until the shared source graph models them",
      "packages/example/tsconfig.json: compilerOptions.paths is prohibited until the shared source graph models it",
    ]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("catalog root rejects unknown fields", async () => {
  const root = await mkdtemp(join(tmpdir(), "extension-topology-catalog-shape-"));
  try {
    await writeArchitecture(root, { catalog: '{"version":1,"packages":[],"future":true}' });
    assert.deepEqual(await validatePackageTopology({ root, resolveOwner: acceptedOwner }), [
      "architecture/package-catalog.json must contain exactly version 1 and a packages array",
    ]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
