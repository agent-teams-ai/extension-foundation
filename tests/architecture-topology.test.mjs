import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { validatePackageTopology } from "../architecture/checks/package-topology.mjs";
import { analyzeSource } from "../architecture/checks/source-safety.mjs";

const repositoryRoot = fileURLToPath(new URL("..", import.meta.url));
const acceptedOwner = async id => ({
  id,
  type: "adr",
  status: "accepted",
  supersededBy: [],
  packageOwnership: [{
    packageId: "module.example",
    packageName: "@agent-teams/example",
    packagePath: "packages/example",
    features: ["example"],
  }],
});

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
    scripts: {
      build: "tsc --project tsconfig.json --pretty false",
      check: "pnpm run clean && pnpm run typecheck && pnpm run build && pnpm run test",
      clean: "node -e \"process.exit(0)\"",
      test: "node --test --test-concurrency=1",
      typecheck: "tsc --project tsconfig.json --noEmit --pretty false",
    },
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
  return JSON.stringify({
    extends: "../../tsconfig.json",
    compilerOptions,
    include: ["src/**/*.ts", "src/**/*.tsx", "src/**/*.mts", "src/**/*.cts"],
  });
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
  await writeFixture(root, "architecture/foundation/scaffolding.yaml", `schemaVersion: 1
compositions:
  - id: fixture
    targetRoles: [foundation-component, integration-adapter, testing-support]
`);
  await writeFixture(root, "architecture/foundation/source-dependencies.yaml", `${sourcePolicy({ packageBoundary })}\n`);
  await writeFixture(root, "node_modules/@agent-teams/engineering-foundation/presets/typescript/node.json", '{"compilerOptions":{"module":"nodenext","moduleResolution":"nodenext","target":"es2024","strict":true}}\n');
  await writeFixture(root, "tsconfig.json", '{"extends":"@agent-teams/engineering-foundation/presets/typescript/node.json","compilerOptions":{"composite":true,"noEmit":true},"files":[]}\n');
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
      "packages/example: feature example requires a value-level runtime implementation",
      "packages/example: feature example requires executable package-specific test evidence",
    ]);

    await writeFixture(root, "packages/example/src/features/example/capability.ts", "export const example = true;\n");
    assert.deepEqual(await validatePackageTopology({ root, resolveOwner: acceptedOwner }), [
      "packages/example: feature example requires executable package-specific test evidence",
    ]);
    await writeFixture(root, "packages/example/src/features/example/capability.test.ts", 'import test from "node:test";\ntest("example", () => {});\n');
    assert.deepEqual(await validatePackageTopology({ root, resolveOwner: acceptedOwner }), []);

    await writeFixture(root, "packages/example/src/adapters/cordis.ts", "export {};\n");
    assert.deepEqual(await validatePackageTopology({ root, resolveOwner: acceptedOwner }), [
      "packages/example/src/adapters/cordis.ts: source must be TypeScript inside an approved feature, composition, or generated path",
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
    await writeFixture(root, "packages/example/src/features/example/capability.ts", "export const example = true;\n");
    await writeFixture(root, "packages/example/src/features/example/capability.test.ts", 'import test from "node:test";\ntest("example", () => {});\n');
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
    await writeFixture(root, "packages/example/src/features/example/capability.ts", "export const example = true;\n");
    await writeFixture(root, "packages/example/src/features/example/capability.test.ts", 'import test from "node:test";\ntest("example", () => {});\n');
    const proposedOwner = async id => ({
      id,
      type: "adr",
      status: "proposed",
      supersededBy: [],
      packageOwnership: [],
    });
    assert.deepEqual(await validatePackageTopology({ root, resolveOwner: proposedOwner }), [
      "module.example: owner_document must be one effective accepted ADR bound to this exact package and its features",
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
    await writeFixture(root, "packages/example/src/features/example/capability.ts", "export const capability = true;\nconst load = eval;\nload('import(\"hidden\")');\n");
    await writeFixture(root, "packages/example/src/features/example/capability.test.ts", 'import test from "node:test";\ntest("example", () => {});\n');
    assert.deepEqual(await validatePackageTopology({ root, resolveOwner: acceptedOwner }), [
      "packages/example/src/features/example/capability.ts: eval-based module loading is prohibited until the shared source graph models it",
      "packages/example/tsconfig.json: compilerOptions.paths is prohibited until the shared source graph models it",
    ]);

    await writeFixture(root, "packages/example/src/features/example/capability.ts", 'export const capability = true;\neval("import(\\\"hidden\\\")");\n');
    assert.deepEqual(await validatePackageTopology({ root, resolveOwner: acceptedOwner }), [
      "packages/example/src/features/example/capability.ts: eval-based module loading is prohibited until the shared source graph models it",
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

test("topology rejects tracked generated-directory escapes", async () => {
  const root = await mkdtemp(join(tmpdir(), "extension-topology-tracked-ignore-"));
  try {
    await writeArchitecture(root);
    assert.deepEqual(await validatePackageTopology({
      root,
      resolveOwner: acceptedOwner,
      readTrackedPackagePaths: async () => ["packages/rogue/dist/package.json"],
    }), [
      "packages/rogue/dist/package.json: tracked files and links cannot hide inside ignored package directories",
    ]);
    await mkdir(join(root, "outside"));
    await mkdir(join(root, "packages"), { recursive: true });
    await symlink(join(root, "outside"), join(root, "packages/dist"));
    assert.ok((await validatePackageTopology({ root, resolveOwner: acceptedOwner }))[0].includes(
      "symbolic links are not allowed in governed package topology: dist",
    ));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("topology rejects code outside src and unsafe export fallback arrays", async () => {
  const root = await mkdtemp(join(tmpdir(), "extension-topology-envelope-"));
  try {
    await writeArchitecture(root, { catalog: packageCatalog(), packageBoundary: true });
    await writeFixture(root, "packages/example/package.json", `${packageManifest()}\n`);
    await writeFixture(root, "packages/example/tsconfig.json", `${packageTsconfig()}\n`);
    await writeFixture(root, "packages/example/src/features/example/capability.ts", "export const capability = true;\n");
    await writeFixture(root, "packages/example/src/features/example/capability.test.ts", 'import test from "node:test";\ntest("example", () => {});\n');
    await writeFixture(root, "packages/example/scripts/escape.mjs", 'import "node:child_process";\n');
    assert.ok((await validatePackageTopology({ root, resolveOwner: acceptedOwner })).includes(
      "packages/example/scripts/escape.mjs: file is outside the package source and approved envelope",
    ));

    await rm(join(root, "packages/example/scripts"), { recursive: true, force: true });
    const manifest = JSON.parse(packageManifest());
    manifest.exports = { ".": ["./dist/index.js", "./src/escape.ts"] };
    await writeFixture(root, "packages/example/package.json", `${JSON.stringify(manifest)}\n`);
    assert.ok((await validatePackageTopology({ root, resolveOwner: acceptedOwner })).includes(
      "packages/example: package exports must be explicit and target only dist/",
    ));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("topology rejects placeholder implementations and undeclared feature identities", async () => {
  const root = await mkdtemp(join(tmpdir(), "extension-topology-placeholder-"));
  try {
    await writeArchitecture(root, { catalog: packageCatalog(), packageBoundary: true });
    await writeFixture(root, "packages/example/package.json", `${packageManifest()}\n`);
    await writeFixture(root, "packages/example/tsconfig.json", `${packageTsconfig()}\n`);
    await writeFixture(root, "packages/example/src/features/example/capability.ts", "export {};\n");
    await writeFixture(root, "packages/example/src/features/example/capability.test.ts", 'import test from "node:test";\ntest("example", () => {});\n');
    assert.ok((await validatePackageTopology({ root, resolveOwner: acceptedOwner })).includes(
      "packages/example: feature example requires a value-level runtime implementation",
    ));

    const wrongFeatureOwner = async id => ({
      ...await acceptedOwner(id),
      packageOwnership: [{
        packageId: "module.example",
        packageName: "@agent-teams/example",
        packagePath: "packages/example",
        features: ["other"],
      }],
    });
    const errors = await validatePackageTopology({ root, resolveOwner: wrongFeatureOwner });
    assert.ok(errors.includes(
      "packages/example/src/features/example/capability.ts: feature example is not declared by the package owner ADR",
    ));
    assert.ok(errors.includes("packages/example: feature other requires a value-level runtime implementation"));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("topology resolves tsconfig inheritance and rejects compiler input escapes", async () => {
  const root = await mkdtemp(join(tmpdir(), "extension-topology-tsconfig-"));
  try {
    await writeArchitecture(root);
    await writeFixture(root, "escape.json", '{"compilerOptions":{"paths":{"#/*":["outside/*"]}}}\n');
    await writeFixture(root, "tsconfig.json", '{"extends":"./escape.json","files":[]}\n');
    const errors = await validatePackageTopology({ root, resolveOwner: acceptedOwner });
    assert.ok(errors.includes(
      "tsconfig.json: root config must extend the pinned Foundation preset with an empty files list",
    ));
    assert.ok(errors.includes(
      "tsconfig.json: compilerOptions.paths is prohibited until the shared source graph models it",
    ));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("topology rejects nested package roots", async () => {
  const root = await mkdtemp(join(tmpdir(), "extension-topology-overlap-"));
  try {
    const catalog = JSON.parse(packageCatalog());
    catalog.packages.push({
      id: "module.example-child",
      role: "foundation-component",
      path: "packages/example/internal",
      package_name: "@agent-teams/example-internal",
      owner_document: "architecture.example-package",
    });
    await writeArchitecture(root, { catalog: JSON.stringify(catalog), packageBoundary: true });
    assert.ok((await validatePackageTopology({ root, resolveOwner: acceptedOwner })).includes(
      "module.example-child: package path overlaps module.example",
    ));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("Oxc source safety catches aliases and optional calls without scanning comments", () => {
  assert.deepEqual(analyzeSource("example.ts", '// require("documentation-only")\nexport const value = true;\n').errors, []);
  assert.deepEqual(analyzeSource("example.ts", "const load = eval;\nload('x');\n").errors, [
    "eval-based module loading",
  ]);
  assert.deepEqual(analyzeSource("example.ts", "eval?.('x');\n").errors, [
    "eval-based module loading",
  ]);
  assert.deepEqual(analyzeSource("example.ts", "const load = Function;\nload('return 1');\n").errors, [
    "Function-constructor module loading",
  ]);
});
