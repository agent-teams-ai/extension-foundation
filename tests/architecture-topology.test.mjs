import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, win32 } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { validateBuiltPackageArtifacts } from "../architecture/checks/package-artifacts.mjs";
import { materializationPlanPath } from "../architecture/checks/package-policy.mjs";
import {
  isFilesystemPathInside,
  validatePackageTopology as validateRepositoryPackageTopology,
} from "../architecture/checks/package-topology.mjs";
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
const acceptedOwners = async () => [await acceptedOwner("ADR-0099")];
const noTrackedPackagePaths = async () => [];

async function fixtureMaterializationPlan(_root, entry) {
  const operation = (path, value) => ({
    kind: "materialize-file",
    path: `${entry.path}/${path}`,
    after: { contentBase64: Buffer.from(`${value}\n`).toString("base64") },
  });
  return {
    compiler: { id: "@agent-teams/engineering-foundation" },
    target: {
      id: entry.id,
      path: entry.path,
      packageName: entry.package_name,
      role: entry.role,
      ownerDocument: { id: entry.owner_document },
    },
    operations: [
      operation("package.json", packageManifest()),
      operation("tsconfig.json", packageTsconfig()),
    ],
  };
}

function validatePackageTopology(options) {
  return validateRepositoryPackageTopology({
    ...options,
    loadMaterializationPlan: options.loadMaterializationPlan ?? fixtureMaterializationPlan,
    listEffectiveOwners: options.listEffectiveOwners ?? (async () => []),
    readTrackedPackagePaths: options.readTrackedPackagePaths ?? noTrackedPackagePaths,
  });
}

async function writeFixture(root, path, contents) {
  const target = join(root, path);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, contents);
}

async function writeFeatureEntrypoint(root) {
  await writeFixture(
    root,
    "packages/example/src/index.ts",
    'export * from "./features/example/index.js";\n',
  );
  await writeFixture(
    root,
    "packages/example/src/features/example/index.ts",
    'export * from "./capability.js";\n',
  );
}

function packageManifest() {
  return JSON.stringify({
    name: "@agent-teams/example",
    version: "0.0.0",
    private: true,
    type: "module",
    scripts: {
      build: "tsc --project tsconfig.json --pretty false",
      check: "pnpm run clean && pnpm run typecheck && pnpm run build && pnpm run test",
      clean: "node -e \"const fs=require('node:fs'); for (const path of ['dist','.cache']) fs.rmSync(path, { recursive: true, force: true })\"",
      prepack: "pnpm run clean && pnpm run build",
      test: "node --test --test-concurrency=1",
      typecheck: "tsc --project tsconfig.json --noEmit --pretty false",
    },
    exports: {
      ".": { types: "./dist/index.d.ts", import: "./dist/index.js" },
    },
    files: ["dist"],
    agentTeamsArchitecture: {
      role: "foundation-component",
      ownerDocument: "ADR-0099",
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
      owner_document: "ADR-0099",
    }],
  });
}

function packageTsconfig(compilerOptions = {}) {
  return JSON.stringify({
    extends: "../../tsconfig.json",
    compilerOptions: {
      composite: true,
      declaration: true,
      declarationMap: true,
      noEmit: false,
      outDir: "dist",
      rootDir: "src",
      tsBuildInfoFile: ".cache/tsconfig.tsbuildinfo",
      ...compilerOptions,
    },
    include: ["src/**/*.ts", "src/**/*.tsx", "src/**/*.mts", "src/**/*.cts"],
  });
}

function featureAssertionTest() {
  return 'import assert from "node:assert/strict";\nimport test from "node:test";\nimport * as feature from "../../../src/features/example/index.ts";\ntest("feature exports runtime capability", () => { assert.ok(Object.keys(feature).length > 0); });\n';
}

function assertionWithoutFeatureImport() {
  return 'import assert from "node:assert/strict";\nimport test from "node:test";\ntest("unrelated assertion", () => { assert.equal(1, 1); });\n';
}

function sourcePolicy({ packageBoundary = false } = {}) {
  const boundaries = [];
  if (packageBoundary) {
    boundaries.push({
      id: "package.module.example",
      dependencyMode: "runtime",
      roots: ["packages/example/src"],
      entrypoints: ["packages/example/src/index.ts"],
      allow: {
        boundaries: ["package.module.example.feature.example"],
        packages: [],
        builtins: [],
        runtimeReferences: [],
      },
    });
    boundaries.push({
      id: "package.module.example.feature.example",
      dependencyMode: "runtime",
      roots: ["packages/example/src/features/example"],
      entrypoints: ["packages/example/src/features/example/index.ts"],
      allow: { boundaries: [], packages: [], builtins: [], runtimeReferences: [] },
    });
    boundaries.push({
      id: "package.module.example.feature.example.test",
      dependencyMode: "development",
      roots: ["packages/example/test/features/example"],
      entrypoints: [],
      allow: {
        boundaries: ["package.module.example.feature.example"],
        packages: [],
        builtins: ["node:assert/strict", "node:test"],
        runtimeReferences: [],
      },
    });
  }
  return JSON.stringify({
    schemaVersion: 1,
    workspace: { kind: "pnpm", manifest: "pnpm-workspace.yaml" },
    governedRoots: packageBoundary ? ["packages/example/src", "packages/example/test"] : [],
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
  assert.deepEqual(await validateRepositoryPackageTopology({ root: repositoryRoot }), []);
});

test("materialization plan paths are deterministic and collision-free for catalog punctuation", () => {
  assert.equal(
    materializationPlanPath({ id: "module.example-adapter" }),
    "architecture/scaffolding-plans/module-dot-example-dash-adapter.json",
  );
  assert.notEqual(
    materializationPlanPath({ id: "module.example" }),
    materializationPlanPath({ id: "module-example" }),
  );
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
    await writeFeatureEntrypoint(root);
    assert.deepEqual(await validatePackageTopology({ root, resolveOwner: acceptedOwner }), [
      "packages/example: feature example entrypoint must publicly reach a value-level runtime implementation",
      "packages/example: feature example requires an executable assertion over a value imported from its feature entrypoint",
    ]);

    await writeFixture(root, "packages/example/src/features/example/capability.ts", "export const example = true;\n");
    assert.deepEqual(await validatePackageTopology({ root, resolveOwner: acceptedOwner }), [
      "packages/example: feature example requires an executable assertion over a value imported from its feature entrypoint",
    ]);
    await writeFixture(root, "packages/example/test/features/example/capability.test.ts", featureAssertionTest());
    assert.deepEqual(await validatePackageTopology({ root, resolveOwner: acceptedOwner }), []);

    await writeFixture(root, "packages/example/src/adapters/cordis.ts", "export {};\n");
    assert.deepEqual(await validatePackageTopology({ root, resolveOwner: acceptedOwner }), [
      "packages/example/src/adapters/cordis.ts: code must be runtime TypeScript under src/features or test evidence under test/features",
    ]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("topology requires public reachability and tests through the feature entrypoint", async () => {
  const root = await mkdtemp(join(tmpdir(), "extension-topology-reachability-"));
  try {
    await writeArchitecture(root, { catalog: packageCatalog(), packageBoundary: true });
    await writeFixture(root, "packages/example/package.json", `${packageManifest()}\n`);
    await writeFixture(root, "packages/example/tsconfig.json", `${packageTsconfig()}\n`);
    await writeFeatureEntrypoint(root);
    await writeFixture(root, "packages/example/src/features/example/capability.ts", "export const example = true;\n");
    await writeFixture(root, "packages/example/test/features/example/capability.test.ts", featureAssertionTest());
    assert.deepEqual(await validatePackageTopology({ root, resolveOwner: acceptedOwner }), []);
    await writeFixture(
      root,
      "packages/example/test/features/example/capability.test.ts",
      'import test from "node:test";\nimport * as feature from "../../../src/features/example/index.ts";\ntest("no observation", () => { void feature; });\n',
    );
    assert.ok((await validatePackageTopology({ root, resolveOwner: acceptedOwner })).includes(
      "packages/example: feature example requires an executable assertion over a value imported from its feature entrypoint",
    ));
    await writeFixture(root, "packages/example/test/features/example/capability.test.ts", featureAssertionTest());
    assert.ok((await validatePackageTopology({
      root,
      resolveOwner: acceptedOwner,
      loadMaterializationPlan: async () => { throw new Error("materialization plan missing"); },
    })).includes("packages/example: materialization plan missing"));

    await writeFixture(root, "packages/example/src/index.ts", "export {};\n");
    assert.ok((await validatePackageTopology({ root, resolveOwner: acceptedOwner })).includes(
      "packages/example: public package export must reach feature example through its index.ts entrypoint",
    ));

    await writeFixture(root, "packages/example/src/index.ts", 'export * from "./features/example/index.js";\n');
    await writeFixture(root, "packages/example/src/features/example/index.ts", "export {};\n");
    assert.ok((await validatePackageTopology({ root, resolveOwner: acceptedOwner })).includes(
      "packages/example: feature example entrypoint must publicly reach a value-level runtime implementation",
    ));

    await writeFixture(
      root,
      "packages/example/src/index.ts",
      'export * from "./features/example/index.js";\nexport * from "./features/example/capability.js";\n',
    );
    assert.ok((await validatePackageTopology({ root, resolveOwner: acceptedOwner })).includes(
      "packages/example: feature example entrypoint must publicly reach a value-level runtime implementation",
    ));
    await writeFixture(root, "packages/example/src/index.ts", 'export * from "./features/example/index.js";\n');

    await writeFixture(
      root,
      "packages/example/src/features/example/index.ts",
      'export * from "./barrel.js";\n',
    );
    await writeFixture(
      root,
      "packages/example/src/features/example/capability.ts",
      "const implementation = true;\nexport default implementation;\n",
    );
    await writeFixture(
      root,
      "packages/example/src/features/example/barrel.ts",
      'export { default } from "./capability.js";\n',
    );
    assert.ok((await validatePackageTopology({ root, resolveOwner: acceptedOwner })).includes(
      "packages/example: feature example entrypoint must publicly reach a value-level runtime implementation",
    ));

    await writeFixture(
      root,
      "packages/example/src/features/example/index.ts",
      'export * as default from "./capability.js";\n',
    );
    assert.ok((await validatePackageTopology({ root, resolveOwner: acceptedOwner })).includes(
      "packages/example: feature example entrypoint must publicly reach a value-level runtime implementation",
    ));

    await writeFixture(
      root,
      "packages/example/src/features/example/index.ts",
      'export { placeholder } from "./capability.js";\n',
    );
    await writeFixture(
      root,
      "packages/example/src/features/example/capability.ts",
      "export const hidden = true;\nexport function placeholder() {}\n",
    );
    assert.ok((await validatePackageTopology({ root, resolveOwner: acceptedOwner })).includes(
      "packages/example: feature example entrypoint must publicly reach a value-level runtime implementation",
    ));

    await writeFixture(
      root,
      "packages/example/src/features/example/index.ts",
      'export * from "./capability.js";\n',
    );
    await writeFixture(
      root,
      "packages/example/src/features/example/capability.ts",
      "const implementation = true;\nexport default implementation;\n",
    );
    assert.ok((await validatePackageTopology({ root, resolveOwner: acceptedOwner })).includes(
      "packages/example: feature example entrypoint must publicly reach a value-level runtime implementation",
    ));

    await writeFixture(
      root,
      "packages/example/src/features/example/index.ts",
      'import { capability as implementation } from "./capability.js";\nexport { implementation as capability };\n',
    );
    await writeFixture(
      root,
      "packages/example/src/features/example/capability.ts",
      "export const capability = true;\n",
    );
    assert.deepEqual(await validatePackageTopology({ root, resolveOwner: acceptedOwner }), []);

    await writeFixture(
      root,
      "packages/example/src/features/example/index.ts",
      'export { placeholder as capability } from "./placeholder.js";\nexport * from "./capability.js";\n',
    );
    await writeFixture(
      root,
      "packages/example/src/features/example/placeholder.ts",
      "export function placeholder() {}\n",
    );
    assert.ok((await validatePackageTopology({ root, resolveOwner: acceptedOwner })).includes(
      "packages/example: feature example entrypoint must publicly reach a value-level runtime implementation",
    ));

    await writeFixture(
      root,
      "packages/example/src/features/example/index.ts",
      'export * from "./capability.js";\nexport * from "./other.js";\n',
    );
    await writeFixture(
      root,
      "packages/example/src/features/example/other.ts",
      "export const capability = true;\n",
    );
    assert.ok((await validatePackageTopology({ root, resolveOwner: acceptedOwner })).includes(
      "packages/example: feature example entrypoint must publicly reach a value-level runtime implementation",
    ));

    await writeFixture(
      root,
      "packages/example/src/features/example/index.ts",
      'export * from "./ambiguous.js";\nexport * from "./good.js";\n',
    );
    await writeFixture(
      root,
      "packages/example/src/features/example/ambiguous.ts",
      'export * from "./capability.js";\nexport * from "./other.js";\n',
    );
    await writeFixture(
      root,
      "packages/example/src/features/example/good.ts",
      'export { capability } from "./capability.js";\n',
    );
    assert.ok((await validatePackageTopology({ root, resolveOwner: acceptedOwner })).includes(
      "packages/example: feature example entrypoint must publicly reach a value-level runtime implementation",
    ));

    await writeFixture(
      root,
      "packages/example/src/features/example/index.ts",
      'export * from "./capability.js";\n',
    );
    await writeFixture(
      root,
      "packages/example/src/features/example/capability.ts",
      "export default function capability() { return true; }\nexport { capability };\n",
    );
    assert.deepEqual(await validatePackageTopology({ root, resolveOwner: acceptedOwner }), []);

    await writeFixture(
      root,
      "packages/example/src/features/example/index.ts",
      'export * from "./barrel-a.js";\nexport * from "./barrel-b.js";\n',
    );
    await writeFixture(
      root,
      "packages/example/src/features/example/barrel-a.ts",
      'export { default as capability } from "./capability.js";\n',
    );
    await writeFixture(
      root,
      "packages/example/src/features/example/barrel-b.ts",
      'export { capability } from "./capability.js";\n',
    );
    assert.deepEqual(await validatePackageTopology({ root, resolveOwner: acceptedOwner }), []);

    await writeFixture(
      root,
      "packages/example/src/features/example/capability.ts",
      "export let capability = false;\nexport default capability;\ncapability = true;\n",
    );
    assert.ok((await validatePackageTopology({ root, resolveOwner: acceptedOwner })).includes(
      "packages/example: feature example entrypoint must publicly reach a value-level runtime implementation",
    ));

    await writeFixture(
      root,
      "packages/example/src/index.ts",
      'export * from "./features/example/index.js";\n',
    );
    await writeFixture(
      root,
      "packages/example/src/features/example/index.ts",
      'export * as example from "./capability.js";\n',
    );
    await writeFixture(
      root,
      "packages/example/src/features/example/capability.ts",
      "export const capability = true;\n",
    );
    assert.ok((await validatePackageTopology({ root, resolveOwner: acceptedOwner })).includes(
      "packages/example: feature example entrypoint must publicly reach a value-level runtime implementation",
    ));

    await writeFixture(
      root,
      "packages/example/src/index.ts",
      'export { default as example } from "./features/example/index.js";\n',
    );
    await writeFixture(
      root,
      "packages/example/src/features/example/index.ts",
      'import { capability as implementation } from "./capability.js";\nexport default implementation;\n',
    );
    assert.deepEqual(await validatePackageTopology({ root, resolveOwner: acceptedOwner }), []);

    await writeFeatureEntrypoint(root);
    await writeFixture(root, "packages/example/src/features/example/capability.ts", "export const example = true;\n");
    await writeFixture(root, "packages/example/test/features/example/capability.test.ts", assertionWithoutFeatureImport());
    assert.ok((await validatePackageTopology({ root, resolveOwner: acceptedOwner })).includes(
      "packages/example: feature example requires an executable assertion over a value imported from its feature entrypoint",
    ));
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
    await writeFeatureEntrypoint(root);
    await writeFixture(root, "packages/example/src/features/example/capability.ts", "export const example = true;\n");
    await writeFixture(root, "packages/example/test/features/example/capability.test.ts", featureAssertionTest());
    assert.deepEqual(await validatePackageTopology({ root, resolveOwner: acceptedOwner }), [
      "module.example: requires a closed public boundary package.module.example over packages/example/src",
      "module.example: feature example requires runtime boundary package.module.example.feature.example",
      "module.example: feature example requires development boundary package.module.example.feature.example.test",
      "module.example: packages/example/src and packages/example/test must be explicit governed roots",
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
    await writeFeatureEntrypoint(root);
    await writeFixture(root, "packages/example/src/features/example/capability.ts", "export const example = true;\n");
    await writeFixture(root, "packages/example/test/features/example/capability.test.ts", featureAssertionTest());
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

test("topology rejects effective ADR ownership without an exact catalog entry", async () => {
  const root = await mkdtemp(join(tmpdir(), "extension-topology-reverse-owner-"));
  try {
    await writeArchitecture(root);
    assert.deepEqual(await validatePackageTopology({
      root,
      resolveOwner: acceptedOwner,
      listEffectiveOwners: acceptedOwners,
    }), [
      "ADR-0099: package ownership module.example requires one exact package catalog entry",
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
      "package.module.rogue: package boundary has no matching catalog feature role",
      "packages/rogue/src: governed package root has no matching catalog entry",
      "packages/rogue/src/index.ts: file is outside every cataloged package",
    ]);

    await writeArchitecture(root, { catalog: packageCatalog(), packageBoundary: true });
    const ownedPolicy = JSON.parse(sourcePolicy({ packageBoundary: true }));
    ownedPolicy.boundaries.push({
      id: "package.module.example.feature.undeclared",
      dependencyMode: "runtime",
      roots: ["packages/example/src/features/undeclared"],
      entrypoints: ["packages/example/src/features/undeclared/index.ts"],
      allow: { boundaries: [], packages: [], builtins: [], runtimeReferences: [] },
    });
    await writeFixture(root, "architecture/foundation/source-dependencies.yaml", `${JSON.stringify(ownedPolicy)}\n`);
    assert.ok((await validatePackageTopology({ root, resolveOwner: acceptedOwner })).includes(
      "package.module.example.feature.undeclared: package boundary has no matching catalog feature role",
    ));
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
    await writeFeatureEntrypoint(root);
    await writeFixture(root, "packages/example/src/features/example/capability.ts", "export const capability = true;\nconst load = eval;\nload('import(\"hidden\")');\n");
    await writeFixture(root, "packages/example/test/features/example/capability.test.ts", featureAssertionTest());
    assert.deepEqual(await validatePackageTopology({ root, resolveOwner: acceptedOwner }), [
      "packages/example/src/features/example/capability.ts: eval-based module loading is prohibited until the shared source graph models it",
      "packages/example/tsconfig.json: config differs from the reviewed Foundation materialization plan",
      "packages/example/tsconfig.json: compilerOptions.paths is prohibited until the shared source graph models it",
    ]);

    await writeFixture(root, "packages/example/src/features/example/capability.ts", 'export const capability = true;\neval("import(\\\"hidden\\\")");\n');
    assert.deepEqual(await validatePackageTopology({ root, resolveOwner: acceptedOwner }), [
      "packages/example/src/features/example/capability.ts: eval-based module loading is prohibited until the shared source graph models it",
      "packages/example/tsconfig.json: config differs from the reviewed Foundation materialization plan",
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
      "packages/rogue/dist/package.json: tracked files cannot hide inside ignored package directories",
    ]);
    assert.deepEqual(await validatePackageTopology({
      root,
      resolveOwner: acceptedOwner,
      readTrackedPackagePaths: async () => [{ mode: "120000", path: "packages/link" }],
    }), ["packages/link: tracked symbolic links are not allowed in governed packages"]);
    assert.deepEqual(await validatePackageTopology({
      root,
      resolveOwner: acceptedOwner,
      readTrackedPackagePaths: async () => [{ mode: "160000", path: "packages/vendor" }],
    }), ["packages/vendor: gitlinks and submodules are not allowed in governed packages"]);
    assert.deepEqual(await validatePackageTopology({
      root,
      resolveOwner: acceptedOwner,
      readTrackedPackagePaths: async () => { throw new Error("git unavailable"); },
    }), ["packages: git unavailable"]);
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
    await writeFeatureEntrypoint(root);
    await writeFixture(root, "packages/example/src/features/example/capability.ts", "export const capability = true;\n");
    await writeFixture(root, "packages/example/test/features/example/capability.test.ts", featureAssertionTest());
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
    manifest.exports = { "./*": "./dist/*.js" };
    await writeFixture(root, "packages/example/package.json", `${JSON.stringify(manifest)}\n`);
    assert.ok((await validatePackageTopology({ root, resolveOwner: acceptedOwner })).includes(
      "packages/example: package exports must be explicit and target only dist/",
    ));

    manifest.exports = { ".": { types: "./dist/index.d.ts" } };
    await writeFixture(root, "packages/example/package.json", `${JSON.stringify(manifest)}\n`);
    const typesOnlyErrors = await validatePackageTopology({ root, resolveOwner: acceptedOwner });
    assert.ok(typesOnlyErrors.includes(
      "packages/example: package exports must be explicit and target only dist/",
    ));
    assert.ok(typesOnlyErrors.includes(
      "packages/example: package exports differ from the reviewed Foundation materialization plan",
    ));

    manifest.exports = {
      ".": {
        types: "./dist/features/example/capability.d.ts",
        import: "./dist/features/example/capability.js",
      },
    };
    await writeFixture(root, "packages/example/package.json", `${JSON.stringify(manifest)}\n`);
    const internalExportErrors = await validatePackageTopology({ root, resolveOwner: acceptedOwner });
    assert.ok(internalExportErrors.includes(
      "packages/example: package exports must be explicit and target only dist/",
    ));
    assert.ok(internalExportErrors.includes(
      "packages/example: package exports differ from the reviewed Foundation materialization plan",
    ));

    manifest.exports = { ".": { types: "./dist/index.d.ts", import: "./dist/index.js" } };
    manifest.scripts.build = "node -e \"process.exit(0)\"";
    await writeFixture(root, "packages/example/package.json", `${JSON.stringify(manifest)}\n`);
    assert.ok((await validatePackageTopology({ root, resolveOwner: acceptedOwner })).includes(
      "packages/example: package scripts differ from the reviewed Foundation materialization plan",
    ));
    manifest.scripts.build = "tsc --project tsconfig.json --pretty false";
    manifest.scripts.prebuild = "node ./hidden-hook.mjs";
    await writeFixture(root, "packages/example/package.json", `${JSON.stringify(manifest)}\n`);
    assert.ok((await validatePackageTopology({ root, resolveOwner: acceptedOwner })).includes(
      "packages/example: package scripts differ from the reviewed Foundation materialization plan",
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
    await writeFeatureEntrypoint(root);
    await writeFixture(root, "packages/example/src/features/example/capability.ts", "const hidden = true;\nexport {};\n");
    await writeFixture(root, "packages/example/test/features/example/capability.test.ts", featureAssertionTest());
    assert.ok((await validatePackageTopology({ root, resolveOwner: acceptedOwner })).includes(
      "packages/example: feature example entrypoint must publicly reach a value-level runtime implementation",
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
    assert.ok(errors.includes("packages/example: feature other entrypoint must publicly reach a value-level runtime implementation"));

    await writeFixture(root, "packages/example/src/features/example/capability.ts", "export const example = true;\n");
    await writeFixture(
      root,
      "packages/example/tsconfig.json",
      `${packageTsconfig({ declarationDir: "../escaped" })}\n`,
    );
    const outputEscapeErrors = await validatePackageTopology({ root, resolveOwner: acceptedOwner });
    assert.ok(outputEscapeErrors.includes(
      "packages/example/tsconfig.json: config differs from the reviewed Foundation materialization plan",
    ));
    assert.ok(outputEscapeErrors.includes(
      "packages/example/tsconfig.json: effective compiler outputs must stay in governed package directories",
    ));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("topology resolves tsconfig inheritance and rejects compiler input escapes", async () => {
  const root = await mkdtemp(join(tmpdir(), "extension-topology-tsconfig-"));
  try {
    await writeArchitecture(root);
    await writeFixture(root, "escape.json", '{"compilerOptions":{"paths":{"#/*":["outside/*"]}}}\n');
    await writeFixture(root, "tsconfig.json", '{"extends":"./escape.json","files":[],"include":["outside/**/*.ts"]}\n');
    const errors = await validatePackageTopology({ root, resolveOwner: acceptedOwner });
    assert.ok(errors.includes(
      "tsconfig.json: root config must exactly extend the pinned Foundation preset without compiler inputs",
    ));
    assert.ok(errors.includes(
      "tsconfig.json: compilerOptions.paths is prohibited until the shared source graph models it",
    ));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("compiler input containment fails closed across Windows volumes", () => {
  assert.equal(isFilesystemPathInside(
    "C:\\package\\src\\feature.ts",
    "C:\\package\\src",
    win32,
  ), true);
  assert.equal(isFilesystemPathInside(
    "D:\\outside\\feature.ts",
    "C:\\package\\src",
    win32,
  ), false);
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
      owner_document: "ADR-0100",
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
  assert.deepEqual(analyzeSource("example.ts", 'globalThis["eval"]("1");\n').errors, [
    "eval-based module loading",
    "computed runtime property access",
    "ambient globalThis runtime access",
  ]);
  assert.deepEqual(analyzeSource("example.ts", 'process["getBuiltinModule"]("node:fs");\n').errors, [
    "process.getBuiltinModule",
    "computed runtime property access",
    "ambient process runtime access",
  ]);
  assert.deepEqual(analyzeSource("example.ts", 'import { createRequire as load } from "node:module";\n').errors, [
    "createRequire-based module loading",
  ]);
  assert.deepEqual(analyzeSource("example.ts", '(() => {})["constructor"]("return 1")();\n').errors, [
    "reflective Function-constructor access",
    "computed runtime property access",
  ]);
  assert.deepEqual(
    analyzeSource(
      "example.ts",
      'const key = ["con", "structor"].join("");\nexport const load = (() => {})[key]("return 1");\n',
    ).errors,
    ["computed runtime property access"],
  );
  assert.deepEqual(
    analyzeSource("example.ts", 'Reflect.get(() => {}, "constructor")("return 1")();\n').errors,
    ["reflective runtime access"],
  );
  assert.deepEqual(
    analyzeSource("example.ts", 'Object.getOwnPropertyDescriptor(() => {}, "constructor").value("return 1")();\n').errors,
    ["reflective property-descriptor access"],
  );
  assert.deepEqual(
    analyzeSource("example.ts", "const { constructor: Constructor } = (() => {});\n").errors,
    ["reflective Function-constructor access"],
  );
  assert.deepEqual(
    analyzeSource(
      "example.ts",
      "const { prototype, __proto__: inherited, getOwnPropertyDescriptor: descriptor } = value;\n",
    ).errors,
    ["reflective prototype access", "reflective property-descriptor access"],
  );
  assert.deepEqual(
    analyzeSource("example.ts", "value.prototype;\nvalue.__proto__;\n").errors,
    ["reflective prototype access"],
  );
  assert.deepEqual(
    analyzeSource("example.ts", "const { capability } = value;\n").errors,
    [],
  );
  assert.deepEqual(
    analyzeSource(
      "example.ts",
      "Object.getOwnPropertyDescriptors(Object.getPrototypeOf(() => undefined));\n",
    ).errors,
    ["reflective property-descriptor access", "reflective prototype access"],
  );
  assert.deepEqual(
    analyzeSource("example.ts", 'import type { X } from "./x.js";\nexport { type X } from "./x.js";\n')
      .staticModuleDependencies,
    [],
  );
  assert.deepEqual(
    analyzeSource("example.ts", 'export {} from "./hidden.js";\n').staticModuleDependencies,
    [],
  );
  assert.equal(
    analyzeSource("example.test.ts", 'import { before } from "node:test";\nbefore(() => {});\n').hasTestRegistration,
    false,
  );
  assert.equal(
    analyzeSource("example.test.ts", 'import test from "node:test";\nfunction register() { test("hidden", () => {}); }\n').hasTestRegistration,
    false,
  );
  assert.deepEqual(
    analyzeSource(
      "example.test.ts",
      'import assert from "node:assert/strict";\nimport test from "node:test";\nimport { capability } from "./index.js";\ntest("capability", () => { assert.equal(capability, true); });\n',
    ).observedRuntimeImportSources,
    ["./index.js"],
  );
  assert.deepEqual(
    analyzeSource(
      "example.test.ts",
      'import { strict as verify } from "node:assert";\nimport test from "node:test";\nimport { capability } from "./index.js";\ntest("strict namespace alias", () => { verify.equal(capability, true); });\n',
    ).observedRuntimeImportSources,
    ["./index.js"],
  );
  assert.deepEqual(
    analyzeSource(
      "example.test.ts",
      'import { strict } from "node:assert";\nimport test from "node:test";\nimport { capability } from "./index.js";\ntest("strict namespace", () => { strict.equal(capability, true); });\n',
    ).observedRuntimeImportSources,
    ["./index.js"],
  );
  assert.deepEqual(
    analyzeSource(
      "example.test.ts",
      'import assert from "node:assert/strict";\nimport test from "node:test";\nimport { capability } from "./index.js";\ntest("property names", () => { assert.deepEqual({ capability: 1 }, { capability: 1 }); });\n',
    ).observedRuntimeImportSources,
    [],
  );
  assert.deepEqual(
    analyzeSource(
      "example.test.ts",
      'import assert from "node:assert/strict";\nimport test from "node:test";\nimport { capability } from "./index.js";\ntest("message only", () => { assert.equal(true, true, capability); });\n',
    ).observedRuntimeImportSources,
    [],
  );
  assert.deepEqual(
    analyzeSource(
      "example.test.ts",
      'import assert from "node:assert/strict";\nimport test from "node:test";\nimport { meta } from "./index.js";\ntest("meta property", () => { assert.ok(import.meta); });\n',
    ).observedRuntimeImportSources,
    [],
  );
  assert.deepEqual(
    analyzeSource(
      "example.test.ts",
      'import assert from "node:assert/strict";\nimport test from "node:test";\nimport { capability } from "./index.js";\ntest("assignment target", () => { assert.ok(capability = true); });\n',
    ).observedRuntimeImportSources,
    [],
  );
  assert.deepEqual(
    analyzeSource(
      "example.test.ts",
      'import assert from "node:assert/strict";\nimport test from "node:test";\nimport { capability } from "./index.js";\ntest("logical assignment", () => { assert.ok(({ ready: true }.ready ||= capability())); });\n',
    ).observedRuntimeImportSources,
    [],
  );
  assert.deepEqual(
    analyzeSource(
      "example.test.ts",
      'import assert from "node:assert/strict";\nimport test from "node:test";\nimport { capability } from "./index.js";\ntest("spread message", () => { assert.ok(...[true, capability]); });\n',
    ).observedRuntimeImportSources,
    [],
  );
  assert.deepEqual(
    analyzeSource(
      "example.test.ts",
      'import assert from "node:assert/strict";\nimport test from "node:test";\nimport { capability } from "./index.js";\ntest("shorthand reads", () => { assert.deepEqual({ capability }, { capability }); });\n',
    ).observedRuntimeImportSources,
    ["./index.js"],
  );
  assert.deepEqual(
    analyzeSource(
      "example.test.ts",
      'import assert from "node:assert/strict";\nimport test from "node:test";\nimport { capability } from "./index.js";\ntest("computed reads", () => { assert.deepEqual({ [capability]: 1 }, { [capability]: 1 }); });\n',
    ).observedRuntimeImportSources,
    ["./index.js"],
  );
  assert.deepEqual(
    analyzeSource(
      "example.test.ts",
      'import assert from "node:assert/strict";\nimport test from "node:test";\nimport { capability } from "./index.js";\ntest("short-circuited optional call", () => { assert.equal(undefined?.(capability), undefined); });\n',
    ).observedRuntimeImportSources,
    [],
  );
  assert.deepEqual(
    analyzeSource(
      "example.test.ts",
      'import assert from "node:assert/strict";\nimport test from "node:test";\nimport { capability } from "./index.js";\ntest("optional call base", () => { assert.equal(capability?.(), true); });\n',
    ).observedRuntimeImportSources,
    ["./index.js"],
  );
  assert.deepEqual(
    analyzeSource(
      "example.test.ts",
      'import assert from "node:assert/strict";\nimport test from "node:test";\nimport { capability } from "./index.js";\ntest("pre-chain call argument", () => { assert.equal(Boolean(Object(capability)?.valueOf()), true); });\n',
    ).observedRuntimeImportSources,
    ["./index.js"],
  );
  assert.deepEqual(
    analyzeSource(
      "example.test.ts",
      'import assert from "node:assert/strict";\nimport test from "node:test";\nimport * as feature from "./index.js";\ntest("capability", () => { assert.ok(() => feature.capability); });\n',
    ).observedRuntimeImportSources,
    [],
  );
  assert.deepEqual(
    analyzeSource(
      "example.test.ts",
      'import assert from "node:assert/strict";\nimport test from "node:test";\nimport { capability } from "./index.js";\ntest("capability", () => { if (false) assert.equal(capability, true); });\n',
    ).observedRuntimeImportSources,
    [],
  );
  assert.deepEqual(
    analyzeSource(
      "example.test.ts",
      'import assert from "node:assert/strict";\nimport test from "node:test";\nimport { capability } from "./index.js";\ntest("capability", () => { assert.ok(false ? capability : true); });\n',
    ).observedRuntimeImportSources,
    [],
  );
  assert.deepEqual(
    analyzeSource(
      "example.test.ts",
      'import assert from "node:assert/strict";\nimport test from "node:test";\nimport { capability } from "./index.js";\ntest("capability", () => { const assert = { equal() {} }; const capability = true; assert.equal(capability, true); });\n',
    ).observedRuntimeImportSources,
    [],
  );
  assert.deepEqual(
    analyzeSource(
      "example.test.ts",
      'import assert from "node:assert/strict";\nimport test from "node:test";\nimport { capability } from "./index.js";\ntest("named callback shadow", function capability() { assert.equal(capability, capability); });\n',
    ).observedRuntimeImportSources,
    [],
  );
  const mutatedAssertion = analyzeSource(
    "example.test.ts",
    'import assert from "node:assert/strict";\nimport test from "node:test";\nimport { capability } from "./index.js";\nObject.assign(assert, { equal() {} });\ntest("mutated assertion", () => { assert.equal(capability, true); });\n',
  );
  assert.deepEqual(mutatedAssertion.observedRuntimeImportSources, []);
  assert.ok(mutatedAssertion.errors.includes("assertion namespace escape or mutation"));
  const escapedAssertion = analyzeSource(
    "example.test.ts",
    'import assert from "node:assert/strict";\nimport test from "node:test";\nimport { capability } from "./index.js";\nconst escaped = assert;\nescaped.equal = () => {};\ntest("escaped assertion", () => { assert.equal(capability, true); });\n',
  );
  assert.deepEqual(escapedAssertion.observedRuntimeImportSources, []);
  assert.ok(escapedAssertion.errors.includes("assertion namespace escape or mutation"));
  assert.deepEqual(
    analyzeSource(
      "example.test.ts",
      'import assert from "node:assert/strict";\nimport test from "node:test";\nimport { capability } from "./index.js";\ntest("capability", () => { assert.equal(capability, true); });\n',
    ).observedRuntimeImportSources,
    ["./index.js"],
  );
  assert.deepEqual(
    analyzeSource(
      "example.test.ts",
      'import assert from "node:assert/strict";\nimport test from "node:test";\nimport * as feature from "./index.js";\ntest("capability", () => { assert.ok(class { method() { return feature.capability; } }); });\n',
    ).observedRuntimeImportSources,
    [],
  );
  assert.deepEqual(
    analyzeSource(
      "example.test.ts",
      'import test from "node:test";\nimport { capability } from "./index.js";\ntest("capability", () => { void capability; });\n',
    ).observedRuntimeImportSources,
    [],
  );
  const skippedEvidence = analyzeSource(
    "example.test.ts",
    'import assert from "node:assert/strict";\nimport test from "node:test";\nimport { capability } from "./index.js";\ntest("capability", { skip: true }, () => { assert.equal(capability, true); });\n',
  );
  assert.equal(skippedEvidence.hasTestRegistration, false);
  assert.deepEqual(skippedEvidence.observedRuntimeImportSources, []);
  const trailingSkippedEvidence = analyzeSource(
    "example.test.ts",
    'import assert from "node:assert/strict";\nimport test from "node:test";\nimport { capability } from "./index.js";\ntest(() => { assert.equal(capability, true); }, { skip: true });\n',
  );
  assert.equal(trailingSkippedEvidence.hasTestRegistration, false);
  assert.deepEqual(trailingSkippedEvidence.observedRuntimeImportSources, []);
  const generatorEvidence = analyzeSource(
    "example.test.ts",
    'import assert from "node:assert/strict";\nimport test from "node:test";\nimport { capability } from "./index.js";\ntest("capability", function* () { assert.equal(capability, true); });\n',
  );
  assert.equal(generatorEvidence.hasTestRegistration, false);
  assert.deepEqual(generatorEvidence.observedRuntimeImportSources, []);
  assert.equal(analyzeSource("example.ts", "export function placeholder() {}\n").hasRuntimeImplementation, false);
  assert.equal(analyzeSource("example.ts", "export function placeholder() { ; }\n").hasRuntimeImplementation, false);
  assert.equal(analyzeSource("example.ts", 'export function placeholder() { "use strict"; }\n').hasRuntimeImplementation, false);
  assert.equal(analyzeSource("example.ts", "export const placeholder = () => {};\n").hasRuntimeImplementation, false);
  assert.equal(analyzeSource("example.ts", "const placeholder = function () {};\nexport default placeholder;\n").hasRuntimeImplementation, false);
  assert.equal(analyzeSource("example.ts", "export const placeholder = (() => {}) satisfies () => void;\n").hasRuntimeImplementation, false);
  assert.equal(analyzeSource("example.ts", "export const capability = () => true;\n").hasRuntimeImplementation, true);
  assert.deepEqual(
    analyzeSource("example.ts", "export default () => true;\n").exportedRuntimeImplementationNames,
    ["default"],
  );
  assert.equal(
    analyzeSource("example.ts", "export const [placeholder] = [() => {}];\n").hasRuntimeImplementation,
    false,
  );
  assert.equal(analyzeSource("example.ts", "const capability = function () { return true; };\nexport default capability;\n").hasRuntimeImplementation, true);
  assert.equal(analyzeSource("example.ts", "const hidden = true;\nexport {};\n").hasRuntimeImplementation, false);
  assert.equal(analyzeSource("example.ts", "const capability = true;\nexport default capability;\n").hasRuntimeImplementation, true);
  assert.deepEqual(
    analyzeSource(
      "example.ts",
      "export default function capability() { return true; }\nexport { capability };\n",
    ).exportedRuntimeImplementationNames.sort(),
    ["capability", "default"],
  );
  assert.deepEqual(
    analyzeSource(
      "example.ts",
      "export default class Capability { run() { return true; } }\nexport { Capability };\n",
    ).exportedRuntimeImplementationNames.sort(),
    ["Capability", "default"],
  );
  assert.deepEqual(
    analyzeSource(
      "example.ts",
      'const { ["constructor"]: Constructor } = (() => undefined);\nexport const escape = Constructor("return 1")();\n',
    ).errors,
    ["reflective Function-constructor access", "computed runtime property access"],
  );
});

test("built export evidence requires regular artifacts after the governed build", async () => {
  const root = await mkdtemp(join(tmpdir(), "extension-topology-artifacts-"));
  try {
    await writeArchitecture(root, { catalog: packageCatalog(), packageBoundary: true });
    await writeFixture(root, "packages/example/package.json", `${packageManifest()}\n`);
    assert.deepEqual(await validateBuiltPackageArtifacts({ root }), [
      "packages/example: built export target is missing: ./dist/index.d.ts (ENOENT)",
      "packages/example: built export target is missing: ./dist/index.js (ENOENT)",
    ]);
    await writeFixture(root, "packages/example/dist/index.d.ts", "export {};\n");
    await writeFixture(root, "packages/example/dist/index.js", "export {};\n");
    assert.ok((await validateBuiltPackageArtifacts({ root }))[0].includes("root runtime export is empty"));
    await writeFixture(root, "packages/example/dist/index.d.ts", "export declare const capability: boolean;\n");
    await writeFixture(root, "packages/example/dist/index.js", "export const capability = true;\n");
    assert.deepEqual(await validateBuiltPackageArtifacts({ root }), []);
    const traversingManifest = JSON.parse(packageManifest());
    traversingManifest.exports["."].import = "./dist/../src/index.ts";
    await writeFixture(root, "packages/example/package.json", `${JSON.stringify(traversingManifest)}\n`);
    await writeFixture(root, "packages/example/src/index.ts", "export const capability = true;\n");
    assert.ok((await validateBuiltPackageArtifacts({ root })).includes(
      "packages/example: package exports must be the canonical root import and types targets",
    ));
    const stringExportManifest = JSON.parse(packageManifest());
    stringExportManifest.exports = { ".": "./dist/index.js" };
    await writeFixture(root, "packages/example/package.json", `${JSON.stringify(stringExportManifest)}\n`);
    assert.ok((await validateBuiltPackageArtifacts({ root })).includes(
      "packages/example: package exports must be the canonical root import and types targets",
    ));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
