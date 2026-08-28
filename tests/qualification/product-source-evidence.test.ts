import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { promisify } from "node:util";

import {
  PRODUCT_SOURCE_PROOF_LIMITS,
  PRODUCT_SOURCE_PROOF_MODE,
  verifyProductSourceEvidence,
} from "../../architecture/checks/product-source-evidence.mjs";

const execFileAsync = promisify(execFile);

async function git(root: string, args: readonly string[]): Promise<string> {
  const result = await execFileAsync("git", [...args], {
    cwd: root,
    encoding: "utf8",
    env: {
      ...process.env,
      GIT_AUTHOR_EMAIL: "qualification@example.invalid",
      GIT_AUTHOR_NAME: "Qualification Fixture",
      GIT_COMMITTER_EMAIL: "qualification@example.invalid",
      GIT_COMMITTER_NAME: "Qualification Fixture",
    },
  });
  return result.stdout.trim();
}

async function put(root: string, path: string, source: string): Promise<void> {
  await mkdir(dirname(join(root, path)), { recursive: true });
  await writeFile(join(root, path), source);
}

async function initialize(root: string): Promise<void> {
  await git(root, ["init", "--quiet"]);
  await git(root, ["remote", "add", "origin", "https://github.com/example/product.git"]);
}

async function snapshot(root: string): Promise<{ commit: string; tree: string; blob(path: string): Promise<string> }> {
  await git(root, ["add", "."]);
  await git(root, ["commit", "--quiet", "-m", "test: exact source fixture"]);
  const commit = await git(root, ["rev-parse", "HEAD"]);
  return {
    commit,
    tree: await git(root, ["rev-parse", `${commit}^{tree}`]),
    blob: (path: string) => git(root, ["rev-parse", `${commit}:${path}`]),
  };
}

function envelope<T>(product: T) {
  return {
    schemaVersion: 2,
    proofMode: PRODUCT_SOURCE_PROOF_MODE,
    capturedAt: "2026-08-28",
    status: "candidate-source-records",
    verification: {
      command: "node architecture/checks/product-source-evidence-cli.mjs evidence.yaml",
      authority: "exact-local-mirror-only",
      promotionAuthority: false,
    },
    products: { fixture: product },
    limitations: [...PRODUCT_SOURCE_PROOF_LIMITS],
  };
}

async function frontendFixture(root: string) {
  await initialize(root);
  await put(root, "tsconfig.json", JSON.stringify({
    compilerOptions: { moduleResolution: "bundler", paths: { "@src/*": ["./src/*"] } },
  }));
  await put(root, "src/port.ts", "export interface SourcePort { read(): string; }\n");
  await put(root, "src/a.ts", "import type { SourcePort } from '@src/port'; export class SourceA implements SourcePort { read() { return 'a'; } }\n");
  await put(root, "src/b.ts", "import type { SourcePort } from '@src/port'; export class SourceB implements SourcePort { read() { return 'b'; } }\n");
  await put(root, "src/consumer.ts", "import type { SourcePort } from './port'; export class SourceConsumer { constructor(readonly deps: { sources: SourcePort[] }) {} }\n");
  await put(root, "src/root.ts", [
    "import { SourceA } from './a';",
    "import { SourceB } from './b';",
    "import { SourceConsumer } from './consumer';",
    "export function createSources() {",
    "  const sources = [new SourceA(), new SourceB()];",
    "  const consumer = new SourceConsumer({ sources });",
    "  return { read: () => consumer };",
    "}",
    "",
  ].join("\n"));
  const exact = await snapshot(root);
  const paths = ["tsconfig.json", "src/port.ts", "src/a.ts", "src/b.ts", "src/consumer.ts", "src/root.ts"];
  const symbols: Record<string, string[]> = {
    "tsconfig.json": [],
    "src/port.ts": ["SourcePort"],
    "src/a.ts": ["SourceA"],
    "src/b.ts": ["SourceB"],
    "src/consumer.ts": ["SourceConsumer"],
    "src/root.ts": ["createSources"],
  };
  return envelope({
    repository: "example/product",
    commit: exact.commit,
    tree: exact.tree,
    claim: "Literal named provider construction topology only.",
    files: await Promise.all(paths.map(async path => ({ path, blob: await exact.blob(path), symbols: symbols[path] }))),
    negativeSearch: { pattern: "ModuleGraph|ServiceLocator", paths: ["src"], matches: 0 },
    topology: {
      kind: "frontend-literal-provider-list",
      root: "src/root.ts",
      factory: "createSources",
      moduleResolution: { source: "tsconfig.json" },
      port: { symbol: "SourcePort", source: "src/port.ts" },
      consumer: { symbol: "SourceConsumer", source: "src/consumer.ts", dependency: "sources" },
      orderedProviders: [
        { symbol: "SourceA", source: "src/a.ts" },
        { symbol: "SourceB", source: "src/b.ts" },
      ],
      facadeMember: "read",
    },
  });
}

test("verifier reports the single honest proof mode and literal frontend topology", async () => {
  const root = await mkdtemp(join(tmpdir(), "source-custody-frontend-"));
  try {
    const evidence = await frontendFixture(root);
    const result = await verifyProductSourceEvidence(evidence, { fixture: root });
    assert.equal(result.schemaVersion, 2);
    assert.equal(result.proofMode, "source-custody-named-topology");
    assert.deepEqual(result.limits, PRODUCT_SOURCE_PROOF_LIMITS);
    assert.equal(result.reports[0]?.proofMode, result.proofMode);
    assert.equal(result.reports[0]?.negativeSearch.matches, 0);
    assert.deepEqual(result.reports[0]?.topology, {
      kind: "frontend-literal-provider-list",
      root: "src/root.ts",
      factory: "createSources",
      port: "SourcePort",
      consumer: "SourceConsumer",
      dependency: "sources",
      orderedProviders: ["SourceA", "SourceB"],
      facadeMember: "read",
    });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("schema downgrade, omitted topology, and an unknown strong field fail closed", async () => {
  const root = await mkdtemp(join(tmpdir(), "source-custody-schema-"));
  try {
    const evidence = await frontendFixture(root);
    const downgraded = structuredClone(evidence);
    downgraded.schemaVersion = 1;
    await assert.rejects(verifyProductSourceEvidence(downgraded, { fixture: root }), /E-SCHEMA.*schemaVersion/u);

    const wrongMode = structuredClone(evidence);
    Reflect.set(wrongMode, "proofMode", "semantic-provenance");
    await assert.rejects(verifyProductSourceEvidence(wrongMode, { fixture: root }), /E-PROOF-MODE/u);

    const omitted = structuredClone(evidence);
    Reflect.deleteProperty(omitted.products.fixture, "topology");
    await assert.rejects(verifyProductSourceEvidence(omitted, { fixture: root }), /E-SCHEMA/u);

    const fallback = structuredClone(evidence);
    Reflect.set(fallback.products.fixture.topology, "execution", { kind: "stronger" });
    await assert.rejects(verifyProductSourceEvidence(fallback, { fixture: root }), /unsupported fields/u);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("Git custody and negative-search paths are exact and non-vacuous", async () => {
  const root = await mkdtemp(join(tmpdir(), "source-custody-git-"));
  try {
    const evidence = await frontendFixture(root);
    const wrongTree = structuredClone(evidence);
    wrongTree.products.fixture.tree = "0".repeat(40);
    await assert.rejects(verifyProductSourceEvidence(wrongTree, { fixture: root }), /E-TREE/u);

    const wrongBlob = structuredClone(evidence);
    wrongBlob.products.fixture.files[1]!.blob = "0".repeat(40);
    await assert.rejects(verifyProductSourceEvidence(wrongBlob, { fixture: root }), /E-BLOB/u);

    const missingExport = structuredClone(evidence);
    missingExport.products.fixture.files[1]!.symbols = ["MissingPort"];
    await assert.rejects(verifyProductSourceEvidence(missingExport, { fixture: root }), /E-EXPORT/u);

    const missingSearchPath = structuredClone(evidence);
    missingSearchPath.products.fixture.negativeSearch.paths = ["does-not-exist"];
    await assert.rejects(verifyProductSourceEvidence(missingSearchPath, { fixture: root }), /E-BLOB/u);

    const wrongCount = structuredClone(evidence);
    wrongCount.products.fixture.negativeSearch = { pattern: "SourcePort", paths: ["src"], matches: 0 };
    await assert.rejects(verifyProductSourceEvidence(wrongCount, { fixture: root }), /E-SEARCH/u);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("frontend matcher checks only exact imports, literal order, one consumer, and one facade", async () => {
  const root = await mkdtemp(join(tmpdir(), "source-custody-topology-"));
  try {
    const evidence = await frontendFixture(root);
    const reversed = structuredClone(evidence);
    reversed.products.fixture.topology.orderedProviders.reverse();
    await assert.rejects(verifyProductSourceEvidence(reversed, { fixture: root }), /E-WIRING/u);

    const aliased = structuredClone(evidence);
    const rootFile = aliased.products.fixture.files.find(file => file.path === "src/root.ts")!;
    await put(root, "src/root.ts", (await readFile(join(root, "src/root.ts"), "utf8"))
      .replace("import { SourceA }", "import { SourceA as RenamedA }")
      .replace("new SourceA()", "new RenamedA()"));
    const changed = await snapshot(root);
    aliased.products.fixture.commit = changed.commit;
    aliased.products.fixture.tree = changed.tree;
    rootFile.blob = await changed.blob("src/root.ts");
    await assert.rejects(verifyProductSourceEvidence(aliased, { fixture: root }), /exact unaliased value import/u);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("restricted TypeScript path resolution rejects unsupported or ambiguous controls", async () => {
  const variants = [
    { extends: "./base.json", compilerOptions: { paths: { "@src/*": ["./src/*"] } } },
    { compilerOptions: { rootDirs: ["src", "generated"], paths: { "@src/*": ["./src/*"] } } },
    { compilerOptions: { moduleSuffixes: [".native", ""], paths: { "@src/*": ["./src/*"] } } },
    { compilerOptions: { paths: { "@src/*": ["/src/*"] } } },
    { compilerOptions: { paths: { "@src/*": ["./src/*", "./generated/*"] } } },
  ];
  for (const [index, config] of variants.entries()) {
    const root = await mkdtemp(join(tmpdir(), `source-custody-resolution-${index}-`));
    try {
      const evidence = await frontendFixture(root);
      await put(root, "tsconfig.json", JSON.stringify(config));
      const changed = await snapshot(root);
      evidence.products.fixture.commit = changed.commit;
      evidence.products.fixture.tree = changed.tree;
      evidence.products.fixture.files.find(file => file.path === "tsconfig.json")!.blob = await changed.blob("tsconfig.json");
      await assert.rejects(verifyProductSourceEvidence(evidence, { fixture: root }), /E-RESOLUTION/u);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  }
});

async function agentFixture(root: string) {
  await initialize(root);
  await put(root, "app/package.json", JSON.stringify({ dependencies: { "@scope/feature": "workspace:*" } }));
  await put(root, "app/contract.ts", [
    "export interface AlphaQueries { inspect(): void; }",
    "export interface AccessHandle { readonly alpha: AlphaQueries; }",
    "",
  ].join("\n"));
  await put(root, "app/host.ts", [
    "import { createFeature } from '@scope/feature/composition';",
    "export const createHost = (_deps: unknown) => ({ host: true });",
    "export const createDefaultHost = () => {",
    "  const feature = createFeature();",
    "  return createHost({ alpha: { member: feature } });",
    "};",
    "",
  ].join("\n"));
  await put(root, "feature/package.json", JSON.stringify({
    name: "@scope/feature",
    exports: {
      "./composition": { types: "./dist/composition.d.ts", import: "./dist/composition.js" },
    },
  }));
  await put(root, "feature/src/composition.ts", "export { createFeature } from './feature.js';\n");
  await put(root, "feature/src/feature.ts", "export const createFeature = () => ({ name: 'feature' });\n");
  const exact = await snapshot(root);
  const paths = ["app/package.json", "app/contract.ts", "app/host.ts", "feature/package.json", "feature/src/composition.ts", "feature/src/feature.ts"];
  const symbols: Record<string, string[]> = {
    "app/package.json": [],
    "app/contract.ts": ["AlphaQueries", "AccessHandle"],
    "app/host.ts": ["createHost", "createDefaultHost"],
    "feature/package.json": [],
    "feature/src/composition.ts": ["createFeature"],
    "feature/src/feature.ts": ["createFeature"],
  };
  return envelope({
    repository: "example/product",
    commit: exact.commit,
    tree: exact.tree,
    claim: "Named factory call and dependency property topology only.",
    files: await Promise.all(paths.map(async path => ({ path, blob: await exact.blob(path), symbols: symbols[path] }))),
    negativeSearch: { pattern: "ServiceLocator", paths: ["app", "feature/src"], matches: 0 },
    topology: {
      kind: "agent-runtime-named-calls",
      root: "app/host.ts",
      rootFactory: "createDefaultHost",
      hostFactory: "createHost",
      consumerManifest: "app/package.json",
      contract: { source: "app/contract.ts", interface: "AccessHandle", capabilityMembers: { alpha: ["inspect"] } },
      featureFactories: [{
        symbol: "createFeature",
        source: "feature/src/feature.ts",
        barrel: "feature/src/composition.ts",
        manifest: "feature/package.json",
        moduleSpecifier: "@scope/feature/composition",
      }],
      hostDependencies: { alpha: ["member"] },
    },
  });
}

test("agent matcher checks declared names, direct calls, host properties, and exact package exports", async () => {
  const root = await mkdtemp(join(tmpdir(), "source-custody-agent-"));
  try {
    const evidence = await agentFixture(root);
    const result = await verifyProductSourceEvidence(evidence, { fixture: root });
    assert.deepEqual(result.reports[0]?.topology, {
      kind: "agent-runtime-named-calls",
      root: "app/host.ts",
      rootFactory: "createDefaultHost",
      hostFactory: "createHost",
      capabilities: ["alpha"],
      capabilityMembers: { alpha: ["inspect"] },
      hostDependencies: { alpha: ["member"] },
      featureFactories: ["createFeature"],
    });

    const uninspectedCondition = structuredClone(evidence);
    await put(root, "feature/package.json", JSON.stringify({
      name: "@scope/feature",
      exports: {
        "./composition": {
          default: "./dist/decoy.js",
          types: "./dist/composition.d.ts",
          import: "./dist/composition.js",
        },
      },
    }));
    const changed = await snapshot(root);
    uninspectedCondition.products.fixture.commit = changed.commit;
    uninspectedCondition.products.fixture.tree = changed.tree;
    uninspectedCondition.products.fixture.files.find(file => file.path === "feature/package.json")!.blob = await changed.blob("feature/package.json");
    await assert.rejects(verifyProductSourceEvidence(uninspectedCondition, { fixture: root }), /E-EXPORTS/u);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("CLI exposes schema, proof mode, limits, and topology", async () => {
  const root = await mkdtemp(join(tmpdir(), "source-custody-cli-"));
  try {
    const evidence = await frontendFixture(root);
    const evidencePath = join(root, "evidence.yaml");
    await writeFile(evidencePath, JSON.stringify(evidence));
    const result = await execFileAsync(process.execPath, [
      "architecture/checks/product-source-evidence-cli.mjs",
      evidencePath,
      "--repository",
      `fixture=${root}`,
    ], { cwd: process.cwd(), encoding: "utf8" });
    const report = JSON.parse(result.stdout);
    assert.equal(report.schemaVersion, 2);
    assert.equal(report.proofMode, PRODUCT_SOURCE_PROOF_MODE);
    assert.deepEqual(report.limits, PRODUCT_SOURCE_PROOF_LIMITS);
    assert.equal(report.products[0].topology.kind, "frontend-literal-provider-list");
    assert.equal(report.products[0].negativeMatches, 0);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
