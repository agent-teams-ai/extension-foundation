import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { promisify } from "node:util";

import { verifyProductSourceEvidence } from "../../architecture/checks/product-source-evidence.mjs";

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

test("product source verifier binds source evidence to an exact executable Git tree", async () => {
  const root = await mkdtemp(join(tmpdir(), "extension-source-evidence-"));
  try {
    await git(root, ["init", "--quiet"]);
    await git(root, ["remote", "add", "origin", "https://github.com/example/product.git"]);
    await writeFile(join(root, "tsconfig.json"), '{"compilerOptions":{"paths":{}}}\n');
    await writeFile(join(root, "port.ts"), "export interface SourcePort { read(): string; }\n");
    await writeFile(join(root, "a.ts"), "import type { SourcePort } from './port'; export class SourceA implements SourcePort { read(): string { return 'a'; } }\n");
    await writeFile(join(root, "b.ts"), "import type { SourcePort } from './port'; export class SourceB implements SourcePort { read(): string { return 'b'; } }\n");
    const consumerSource = "import type { SourcePort } from './port'; export class SourceConsumer { constructor(readonly deps: { sources: SourcePort[] }) {} read(): string { return this.deps.sources.map(source => source.read()).join(','); } }\n";
    await writeFile(join(root, "consumer.ts"), consumerSource);
    await writeFile(join(root, "root.ts"), [
      "import { SourceA } from './a';",
      "import { SourceB } from './b';",
      "import { SourceConsumer } from './consumer';",
      "export function createSources() { const sources = [new SourceA(), new SourceB()]; const consumer = new SourceConsumer({ sources }); return { read: () => consumer.read() }; }",
      "",
    ].join("\n"));
    await git(root, ["add", "."]);
    await git(root, ["commit", "--quiet", "-m", "test: add exact source fixture"]);
    const commit = await git(root, ["rev-parse", "HEAD"]);
    const tree = await git(root, ["rev-parse", "HEAD^{tree}"]);
    const blob = async (path: string): Promise<string> => git(root, ["rev-parse", `${commit}:${path}`]);
    const evidence = {
      status: "candidate-source-records",
      products: {
        fixture: {
          repository: "example/product",
          commit,
          tree,
          files: [
            { path: "tsconfig.json", blob: await blob("tsconfig.json"), symbols: [] },
            { path: "port.ts", blob: await blob("port.ts"), symbols: ["SourcePort"] },
            { path: "a.ts", blob: await blob("a.ts"), symbols: ["SourceA"] },
            { path: "b.ts", blob: await blob("b.ts"), symbols: ["SourceB"] },
            { path: "consumer.ts", blob: await blob("consumer.ts"), symbols: ["SourceConsumer"] },
            { path: "root.ts", blob: await blob("root.ts"), symbols: ["createSources"] },
          ],
          negativeSearch: {
            pattern: "ModuleGraph|ServiceLocator",
            paths: ["port.ts", "a.ts", "b.ts", "consumer.ts", "root.ts"],
            matches: 0,
          },
          composition: {
            kind: "ordered-contributions",
            root: "root.ts",
            factory: "createSources",
            moduleResolution: { source: "tsconfig.json" },
            port: { symbol: "SourcePort", source: "port.ts", moduleSpecifier: "./port" },
            consumer: { symbol: "SourceConsumer", source: "consumer.ts", dependency: "sources" },
            orderedProviders: [
              { symbol: "SourceA", source: "a.ts" },
              { symbol: "SourceB", source: "b.ts" },
            ],
          },
        },
      },
    };

    const verified = await verifyProductSourceEvidence(evidence, { fixture: root });
    assert.equal(verified.status, "candidate-source-records");
    assert.equal(verified.reports[0]?.tree, tree);
    const composition = verified.reports[0]?.composition;
    assert.equal(composition?.kind, "ordered-contributions");
    assert.ok(composition?.kind === "ordered-contributions");
    assert.deepEqual(composition.orderedProviders, ["SourceA", "SourceB"]);
    assert.equal(composition.consumer, "SourceConsumer");

    const nestedRoot = join(root, "nested-root");
    await mkdir(nestedRoot);
    const nestedVerified = await verifyProductSourceEvidence(evidence, { fixture: nestedRoot });
    assert.equal(
      await realpath(nestedVerified.reports[0]!.repositoryRoot),
      await realpath(root),
    );
    const nestedSearchBypass = structuredClone(evidence);
    nestedSearchBypass.products.fixture.negativeSearch = {
      pattern: "SourcePort",
      paths: ["port.ts"],
      matches: 0,
    };
    await assert.rejects(
      verifyProductSourceEvidence(nestedSearchBypass, { fixture: nestedRoot }),
      /E-SEARCH/u,
    );

    const wrongTree = structuredClone(evidence);
    wrongTree.products.fixture.tree = "0".repeat(40);
    await assert.rejects(verifyProductSourceEvidence(wrongTree, { fixture: root }), /E-TREE/u);

    const missingExport = structuredClone(evidence);
    missingExport.products.fixture.files[1]!.symbols = ["MissingSource"];
    await assert.rejects(verifyProductSourceEvidence(missingExport, { fixture: root }), /E-EXPORT/u);

    const searchDrift = structuredClone(evidence);
    searchDrift.products.fixture.negativeSearch.matches = 1;
    await assert.rejects(verifyProductSourceEvidence(searchDrift, { fixture: root }), /E-SEARCH/u);

    const reversedOrder = structuredClone(evidence);
    reversedOrder.products.fixture.composition.orderedProviders.reverse();
    await assert.rejects(verifyProductSourceEvidence(reversedOrder, { fixture: root }), /E-WIRING/u);

    const duplicateProvider = structuredClone(evidence);
    duplicateProvider.products.fixture.composition.orderedProviders[1] = structuredClone(
      duplicateProvider.products.fixture.composition.orderedProviders[0]!,
    );
    await assert.rejects(verifyProductSourceEvidence(duplicateProvider, { fixture: root }), /E-SCHEMA/u);

    const rootBlob = await blob("root.ts");
    await git(root, ["update-index", "--add", "--cacheinfo", `120000,${rootBlob},link.ts`]);
    await git(root, ["commit", "--quiet", "-m", "test: add symlink-mode source evidence"]);
    const symlinkSource = structuredClone(evidence);
    symlinkSource.products.fixture.commit = await git(root, ["rev-parse", "HEAD"]);
    symlinkSource.products.fixture.tree = await git(root, ["rev-parse", "HEAD^{tree}"]);
    symlinkSource.products.fixture.files.push({ path: "link.ts", blob: rootBlob, symbols: [] });
    await assert.rejects(
      verifyProductSourceEvidence(symlinkSource, { fixture: root }),
      /E-MODE/u,
    );

    await git(root, ["update-index", "--chmod=+x", "root.ts"]);
    await git(root, ["commit", "--quiet", "-m", "test: retain executable source evidence"]);
    const executableSource = structuredClone(evidence);
    executableSource.products.fixture.commit = await git(root, ["rev-parse", "HEAD"]);
    executableSource.products.fixture.tree = await git(root, ["rev-parse", "HEAD^{tree}"]);
    const executableVerified = await verifyProductSourceEvidence(executableSource, { fixture: root });
    assert.equal(executableVerified.reports[0]?.files.find(file => file.path === "root.ts")?.blob, rootBlob);

    const replacementRoot = await mkdtemp(join(tmpdir(), "extension-source-replacement-"));
    try {
      await git(replacementRoot, ["init", "--quiet"]);
      await writeFile(join(replacementRoot, "forged.txt"), "forged\n");
      await git(replacementRoot, ["add", "."]);
      await git(replacementRoot, ["commit", "--quiet", "-m", "test: create forged replacement"]);
      const forgedCommit = await git(replacementRoot, ["rev-parse", "HEAD"]);
      await git(root, ["fetch", "--quiet", replacementRoot, forgedCommit]);
      await git(root, ["replace", commit, "FETCH_HEAD"]);
      const replacementSafe = await verifyProductSourceEvidence(evidence, { fixture: root });
      assert.equal(replacementSafe.reports[0]?.commit, commit);
      await git(root, ["replace", "-d", commit]);
    } finally {
      await rm(replacementRoot, { recursive: true, force: true });
    }

    const withRoot = async (source: string): Promise<typeof evidence> => {
      await writeFile(join(root, "root.ts"), source);
      await git(root, ["add", "root.ts"]);
      await git(root, ["commit", "--quiet", "-m", "test: mutate exact composition fixture"]);
      const mutated = structuredClone(evidence);
      mutated.products.fixture.commit = await git(root, ["rev-parse", "HEAD"]);
      mutated.products.fixture.tree = await git(root, ["rev-parse", "HEAD^{tree}"]);
      const rootFile = mutated.products.fixture.files.find(file => file.path === "root.ts");
      assert.ok(rootFile);
      rootFile.blob = await git(root, ["rev-parse", `${mutated.products.fixture.commit}:root.ts`]);
      return mutated;
    };
    const reversedInjection = await withRoot([
      "import { SourceA } from './a';",
      "import { SourceB } from './b';",
      "import { SourceConsumer } from './consumer';",
      "export function createSources() { const sources = [new SourceB(), new SourceA()]; const consumer = new SourceConsumer({ sources }); return { read: () => consumer.read() }; }",
      "",
    ].join("\n"));
    await assert.rejects(verifyProductSourceEvidence(reversedInjection, { fixture: root }), /E-WIRING/u);

    const deadCode = await withRoot([
      "import { SourceA } from './a';",
      "import { SourceB } from './b';",
      "import { SourceConsumer } from './consumer';",
      "export function createSources() { new SourceA(); new SourceB(); const sources = []; const consumer = new SourceConsumer({ sources }); return { read: () => consumer.read() }; }",
      "",
    ].join("\n"));
    await assert.rejects(verifyProductSourceEvidence(deadCode, { fixture: root }), /E-WIRING/u);

    const nestedCode = await withRoot([
      "import { SourceA } from './a';",
      "import { SourceB } from './b';",
      "import { SourceConsumer } from './consumer';",
      "export function createSources() { const hidden = () => [new SourceA(), new SourceB()]; const consumer = new SourceConsumer({ sources: hidden() }); return { read: () => consumer.read() }; }",
      "",
    ].join("\n"));
    await assert.rejects(verifyProductSourceEvidence(nestedCode, { fixture: root }), /E-WIRING/u);

    const spreadOverride = await withRoot([
      "import { SourceA } from './a';",
      "import { SourceB } from './b';",
      "import { SourceConsumer } from './consumer';",
      "export function createSources() { const sources = [new SourceA(), new SourceB()]; const override = { sources: [] }; const consumer = new SourceConsumer({ sources, ...override }); return { read: () => consumer.read() }; }",
      "",
    ].join("\n"));
    await assert.rejects(verifyProductSourceEvidence(spreadOverride, { fixture: root }), /E-WIRING/u);

    const aliasedProviderImport = await withRoot([
      "import { SourceA as SourceAlias } from './a';",
      "import { SourceB } from './b';",
      "import { SourceConsumer } from './consumer';",
      "export function createSources() { const sources = [new SourceAlias(), new SourceB()]; const consumer = new SourceConsumer({ sources }); return { read: () => consumer.read() }; }",
      "",
    ].join("\n"));
    await assert.rejects(
      verifyProductSourceEvidence(aliasedProviderImport, { fixture: root }),
      /E-WIRING/u,
    );

    const indirectProviderConstruction = await withRoot([
      "import { SourceA } from './a';",
      "import { SourceB } from './b';",
      "import { SourceConsumer } from './consumer';",
      "export function createSources() { const SourceAlias = SourceA; const sources = [new SourceAlias(), new SourceB()]; const consumer = new SourceConsumer({ sources }); return { read: () => consumer.read() }; }",
      "",
    ].join("\n"));
    await assert.rejects(
      verifyProductSourceEvidence(indirectProviderConstruction, { fixture: root }),
      /E-WIRING/u,
    );

    const typeOnlyRuntimeImport = await withRoot([
      "import type { SourceA } from './a';",
      "import { SourceB } from './b';",
      "import { SourceConsumer } from './consumer';",
      "export function createSources() { const sources = [new SourceA(), new SourceB()]; const consumer = new SourceConsumer({ sources }); return { read: () => consumer.read() }; }",
      "",
    ].join("\n"));
    await assert.rejects(
      verifyProductSourceEvidence(typeOnlyRuntimeImport, { fixture: root }),
      /E-WIRING/u,
    );

    const shadowedProvider = await withRoot([
      "import { SourceA } from './a';",
      "import { SourceB } from './b';",
      "import { SourceConsumer } from './consumer';",
      "export function createSources() { const sources = [new SourceA(), new SourceB()]; const consumer = new SourceConsumer({ sources }); const decoy = (SourceA: unknown) => SourceA; void decoy; return { read: () => consumer.read() }; }",
      "",
    ].join("\n"));
    await assert.rejects(verifyProductSourceEvidence(shadowedProvider, { fixture: root }), /E-WIRING/u);

    const nestedOnlyConsumer = await withRoot([
      "import { SourceA } from './a';",
      "import { SourceB } from './b';",
      "import { SourceConsumer } from './consumer';",
      "export function createSources() { const sources = [new SourceA(), new SourceB()]; const build = () => new SourceConsumer({ sources }); return { read: () => build().read() }; }",
      "",
    ].join("\n"));
    await assert.rejects(verifyProductSourceEvidence(nestedOnlyConsumer, { fixture: root }), /E-WIRING/u);

    const detachedFacade = await withRoot([
      "import { SourceA } from './a';",
      "import { SourceB } from './b';",
      "import { SourceConsumer } from './consumer';",
      "export function createSources() { const sources = [new SourceA(), new SourceB()]; const consumer = new SourceConsumer({ sources }); const facade = { read: () => consumer.read() }; return facade; }",
      "",
    ].join("\n"));
    await assert.rejects(verifyProductSourceEvidence(detachedFacade, { fixture: root }), /E-WIRING/u);

    const mutableConsumer = await withRoot([
      "import { SourceA } from './a';",
      "import { SourceB } from './b';",
      "import { SourceConsumer } from './consumer';",
      "export function createSources() { const sources = [new SourceA(), new SourceB()]; let consumer = new SourceConsumer({ sources }); return { read: () => consumer.read() }; }",
      "",
    ].join("\n"));
    await assert.rejects(verifyProductSourceEvidence(mutableConsumer, { fixture: root }), /E-WIRING/u);

    const aliasedConsumer = await withRoot([
      "import { SourceA } from './a';",
      "import { SourceB } from './b';",
      "import { SourceConsumer } from './consumer';",
      "export function createSources() { const sources = [new SourceA(), new SourceB()]; const consumer = new SourceConsumer({ sources }); const alias = consumer; return { read: () => alias.read() }; }",
      "",
    ].join("\n"));
    await assert.rejects(verifyProductSourceEvidence(aliasedConsumer, { fixture: root }), /E-WIRING/u);

    const reboundConsumer = await withRoot([
      "import { SourceA } from './a';",
      "import { SourceB } from './b';",
      "import { SourceConsumer } from './consumer';",
      "export function createSources() { const sources = [new SourceA(), new SourceB()]; const consumer = new SourceConsumer({ sources }); consumer = new SourceConsumer({ sources }); return { read: () => consumer.read() }; }",
      "",
    ].join("\n"));
    await assert.rejects(verifyProductSourceEvidence(reboundConsumer, { fixture: root }), /E-WIRING/u);

    const falseSameNameConsumer = await withRoot([
      "import { SourceA } from './a';",
      "import { SourceB } from './b';",
      "import { SourceConsumer } from './consumer';",
      "export function createSources() { const sources = [new SourceA(), new SourceB()]; const consumer = new SourceConsumer({ sources }); const decoy = (SourceConsumer: new (value: unknown) => unknown) => new SourceConsumer({ sources: [] }); void decoy; return { read: () => consumer.read() }; }",
      "",
    ].join("\n"));
    await assert.rejects(
      verifyProductSourceEvidence(falseSameNameConsumer, { fixture: root }),
      /E-WIRING/u,
    );

    const fakeFacadePropertyRead = await withRoot([
      "import { SourceA } from './a';",
      "import { SourceB } from './b';",
      "import { SourceConsumer } from './consumer';",
      "export function createSources() { const sources = [new SourceA(), new SourceB()]; const consumer = new SourceConsumer({ sources }); return { read: () => consumer.read }; }",
      "",
    ].join("\n"));
    await assert.rejects(
      verifyProductSourceEvidence(fakeFacadePropertyRead, { fixture: root }),
      /returned facade behavior must retain and invoke the immutable consumer/u,
    );

    const methodFacade = await withRoot([
      "import { SourceA } from './a';",
      "import { SourceB } from './b';",
      "import { SourceConsumer } from './consumer';",
      "export function createSources() { const sources = [new SourceA(), new SourceB()]; const consumer = new SourceConsumer({ sources }); return { read() { return consumer.read(); } }; }",
      "",
    ].join("\n"));
    await verifyProductSourceEvidence(methodFacade, { fixture: root });

    const ignoredFacadeConsumerValue = await withRoot([
      "import { SourceA } from './a';",
      "import { SourceB } from './b';",
      "import { SourceConsumer } from './consumer';",
      "export function createSources() { const sources = [new SourceA(), new SourceB()]; const consumer = new SourceConsumer({ sources }); return { read: () => { consumer.read(); return 'fake'; } }; }",
      "",
    ].join("\n"));
    await assert.rejects(
      verifyProductSourceEvidence(ignoredFacadeConsumerValue, { fixture: root }),
      /returned facade behavior must retain and invoke the immutable consumer/u,
    );

    const decoyFacadeBehavior = await withRoot([
      "import { SourceA } from './a';",
      "import { SourceB } from './b';",
      "import { SourceConsumer } from './consumer';",
      "export function createSources() { const sources = [new SourceA(), new SourceB()]; const consumer = new SourceConsumer({ sources }); return { read: () => consumer.read(), fake: () => 'fake' }; }",
      "",
    ].join("\n"));
    await assert.rejects(
      verifyProductSourceEvidence(decoyFacadeBehavior, { fixture: root }),
      /every returned facade behavior must retain the immutable consumer/u,
    );

    const spreadFacadeOverride = await withRoot([
      "import { SourceA } from './a';",
      "import { SourceB } from './b';",
      "import { SourceConsumer } from './consumer';",
      "export function createSources() { const sources = [new SourceA(), new SourceB()]; const consumer = new SourceConsumer({ sources }); return { read: () => consumer.read(), ...{ read: () => 'fake' } }; }",
      "",
    ].join("\n"));
    await assert.rejects(
      verifyProductSourceEvidence(spreadFacadeOverride, { fixture: root }),
      /returned facade must contain unique static function or method closures/u,
    );

    const eagerConsumerRead = await withRoot([
      "import { SourceA } from './a';",
      "import { SourceB } from './b';",
      "import { SourceConsumer } from './consumer';",
      "export function createSources() { const sources = [new SourceA(), new SourceB()]; const consumer = new SourceConsumer({ sources }); const value = consumer.read(); return { read: () => value }; }",
      "",
    ].join("\n"));
    await assert.rejects(
      verifyProductSourceEvidence(eagerConsumerRead, { fixture: root }),
      /returned facade behavior must retain and invoke the immutable consumer/u,
    );

    const detachedConsumer = await withRoot([
      "import { SourceA } from './a';",
      "import { SourceB } from './b';",
      "import { SourceConsumer } from './consumer';",
      "export function createSources() { const sources = [new SourceA(), new SourceB()]; const consumer = new SourceConsumer({ sources }); return { read: () => 'detached' }; }",
      "",
    ].join("\n"));
    await assert.rejects(
      verifyProductSourceEvidence(detachedConsumer, { fixture: root }),
      /returned facade behavior must retain and invoke the immutable consumer/u,
    );

    await writeFile(join(root, "root.ts"), [
      "import { SourceA } from './a';",
      "import { SourceB } from './b';",
      "import { SourceConsumer } from './consumer';",
      "export function createSources() { const sources = [new SourceA(), new SourceB()]; const consumer = new SourceConsumer({ sources }); return { read: () => consumer.read() }; }",
      "",
    ].join("\n"));
    await git(root, ["add", "root.ts"]);
    await git(root, ["commit", "--quiet", "-m", "test: restore ordered facade fixture"]);
    const withConsumer = async (source: string): Promise<typeof evidence> => {
      await writeFile(join(root, "consumer.ts"), source);
      await git(root, ["add", "consumer.ts"]);
      await git(root, ["commit", "--quiet", "-m", "test: mutate ordered consumer fixture"]);
      const mutated = structuredClone(evidence);
      mutated.products.fixture.commit = await git(root, ["rev-parse", "HEAD"]);
      mutated.products.fixture.tree = await git(root, ["rev-parse", "HEAD^{tree}"]);
      const consumerFile = mutated.products.fixture.files.find(file => file.path === "consumer.ts");
      const rootFile = mutated.products.fixture.files.find(file => file.path === "root.ts");
      assert.ok(consumerFile);
      assert.ok(rootFile);
      consumerFile.blob = await git(root, ["rev-parse", `${mutated.products.fixture.commit}:consumer.ts`]);
      rootFile.blob = await git(root, ["rev-parse", `${mutated.products.fixture.commit}:root.ts`]);
      return mutated;
    };
    const ignoredProviders = await withConsumer(
      "import type { SourcePort } from './port'; export class SourceConsumer { constructor(readonly deps: { sources: SourcePort[] }) {} read(): string { void this.deps.sources; return 'fake'; } }\n",
    );
    await assert.rejects(
      verifyProductSourceEvidence(ignoredProviders, { fixture: root }),
      /consumer behavior must use retained constructor dependency sources/u,
    );

    const detachedConstructorDependency = await withConsumer(
      "import type { SourcePort } from './port'; export class SourceConsumer { constructor(readonly deps: { values: SourcePort[] }) {} read(): string { return this.deps.values.map(source => source.read()).join(','); } }\n",
    );
    await assert.rejects(
      verifyProductSourceEvidence(detachedConstructorDependency, { fixture: root }),
      /consumer constructor dependency object must contain exactly one sources/u,
    );

    await writeFile(join(root, "consumer.ts"), consumerSource);
    await git(root, ["add", "consumer.ts"]);
    await git(root, ["commit", "--quiet", "-m", "test: restore ordered consumer fixture"]);

    const promoted = structuredClone(evidence);
    promoted.status = "exact-committed-source";
    await assert.rejects(verifyProductSourceEvidence(promoted, { fixture: root }), /E-STATUS/u);

    const duplicateRepository = {
      ...structuredClone(evidence),
      products: {
        ...structuredClone(evidence.products),
        duplicate: structuredClone(evidence.products.fixture),
      },
    };
    await assert.rejects(
      verifyProductSourceEvidence(duplicateRepository, { fixture: root, duplicate: root }),
      /E-INDEPENDENCE/u,
    );

    await writeFile(join(root, "tsconfig.json"), JSON.stringify({
      compilerOptions: {
        paths: {
          "@fixture/**": ["src/**"],
        },
      },
    }));
    await git(root, ["add", "tsconfig.json"]);
    await git(root, ["commit", "--quiet", "-m", "test: add unsupported wildcard alias"]);
    const multipleWildcards = structuredClone(evidence);
    multipleWildcards.products.fixture.commit = await git(root, ["rev-parse", "HEAD"]);
    multipleWildcards.products.fixture.tree = await git(root, ["rev-parse", "HEAD^{tree}"]);
    const moduleResolutionFile = multipleWildcards.products.fixture.files.find(
      file => file.path === "tsconfig.json",
    );
    assert.ok(moduleResolutionFile);
    moduleResolutionFile.blob = await git(root, ["rev-parse", "HEAD:tsconfig.json"]);
    await assert.rejects(
      verifyProductSourceEvidence(multipleWildcards, { fixture: root }),
      /path alias @fixture\/\*\* is outside the qualification subset/u,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("product source verifier checks a restricted capability-root composition", async () => {
  const root = await mkdtemp(join(tmpdir(), "extension-capability-root-"));
  try {
    await git(root, ["init", "--quiet"]);
    await git(root, ["remote", "add", "origin", "https://github.com/example/capability-product.git"]);
    const contractSource = [
      "export interface AlphaSetupCapabilityBundle { readonly alpha: string; readonly plan: string; }",
      "export type BetaSetupCapabilityBundle = { readonly beta: string };",
      "export interface BaseAccessHandle { readonly alphaSetup: AlphaSetupCapabilityBundle; }",
      "export interface RuntimeAccessHandle extends BaseAccessHandle { readonly betaSetup: BetaSetupCapabilityBundle; }",
      "",
    ].join("\n");
    const featureAlphaSource = [
      "export const createAlphaFeature = () => ({ alpha: 'alpha' });",
      "export const unrelated = (): string => 'unrelated';",
      "",
    ].join("\n");
    const featureBetaSource = "export const createBetaFeature = (): string => 'beta';\n";
    const featureBarrelSource = [
      "export { createAlphaFeature } from './feature-alpha.js';",
      "export { createBetaFeature } from './feature-beta.js';",
      "",
    ].join("\n");
    const consumerPackageSource = JSON.stringify({
      name: "@fixture/consumer",
      dependencies: {
        "@fixture/features": "workspace:*",
      },
    });
    const featurePackageSource = JSON.stringify({
      name: "@fixture/features",
      exports: {
        "./composition": {
          import: "./dist/feature-barrel.js",
          types: "./dist/feature-barrel.d.ts",
        },
      },
    });
    const rootSource = [
      "import { createAlphaFeature, createBetaFeature } from '@fixture/features/composition';",
      "import type { AlphaSetupCapabilityBundle, BetaSetupCapabilityBundle, RuntimeAccessHandle } from './runtime-access.js';",
      "interface TrustedAccessScope { readonly id: string; }",
      "export interface AgentRuntimeHostDependencies { readonly alphaSetup: AlphaSetupCapabilityBundle; readonly betaSetup: BetaSetupCapabilityBundle; }",
      "export interface AgentRuntimeHost { bindAccess(scope: TrustedAccessScope): RuntimeAccessHandle; dispose(): Promise<void>; }",
      "const createLocalPlanner = (): string => 'plan';",
      "export const createHost = (dependencies: AgentRuntimeHostDependencies): AgentRuntimeHost => ({",
      "  bindAccess(_scope: TrustedAccessScope): RuntimeAccessHandle { return { alphaSetup: dependencies.alphaSetup, betaSetup: dependencies.betaSetup }; },",
      "  async dispose(): Promise<void> {},",
      "});",
      "export const createDefaultHost = () => {",
      "  const alpha = createAlphaFeature();",
      "  const beta = createBetaFeature();",
      "  return createHost({ alphaSetup: { alpha: alpha.alpha, plan: createLocalPlanner() }, betaSetup: { beta } });",
      "};",
      "",
    ].join("\n");
    await mkdir(join(root, "features", "src"), { recursive: true });
    await writeFile(join(root, "runtime-access.ts"), contractSource);
    await writeFile(join(root, "other-access.ts"), contractSource);
    await writeFile(join(root, "package.json"), consumerPackageSource);
    await writeFile(join(root, "features", "package.json"), featurePackageSource);
    await writeFile(join(root, "features", "src", "feature-alpha.ts"), featureAlphaSource);
    await writeFile(join(root, "features", "src", "feature-beta.ts"), featureBetaSource);
    await writeFile(join(root, "features", "src", "feature-barrel.ts"), featureBarrelSource);
    await writeFile(join(root, "root.ts"), rootSource);
    await git(root, ["add", "."]);
    await git(root, ["commit", "--quiet", "-m", "test: add capability-root fixture"]);
    const commit = await git(root, ["rev-parse", "HEAD"]);
    const tree = await git(root, ["rev-parse", "HEAD^{tree}"]);
    const blob = async (path: string): Promise<string> => git(root, ["rev-parse", `${commit}:${path}`]);
    const evidence = {
      status: "candidate-source-records",
      products: {
        fixture: {
          repository: "example/capability-product",
          commit,
          tree,
          files: [
            { path: "runtime-access.ts", blob: await blob("runtime-access.ts"), symbols: ["RuntimeAccessHandle"] },
            { path: "other-access.ts", blob: await blob("other-access.ts"), symbols: ["RuntimeAccessHandle"] },
            { path: "features/package.json", blob: await blob("features/package.json"), symbols: [] },
            { path: "features/src/feature-alpha.ts", blob: await blob("features/src/feature-alpha.ts"), symbols: ["createAlphaFeature"] },
            { path: "features/src/feature-beta.ts", blob: await blob("features/src/feature-beta.ts"), symbols: ["createBetaFeature"] },
            { path: "features/src/feature-barrel.ts", blob: await blob("features/src/feature-barrel.ts"), symbols: ["createAlphaFeature", "createBetaFeature"] },
            { path: "root.ts", blob: await blob("root.ts"), symbols: ["createHost", "createDefaultHost"] },
          ],
          negativeSearch: {
            pattern: "ModuleGraph|ServiceLocator",
            paths: ["runtime-access.ts", "features/src/feature-alpha.ts", "features/src/feature-beta.ts", "root.ts"],
            matches: 0,
          },
          composition: {
            kind: "product-capability-root",
            root: "root.ts",
            rootFactory: "createDefaultHost",
            hostFactory: "createHost",
            consumerManifest: "package.json",
            contract: {
              source: "runtime-access.ts",
              moduleSpecifier: "./runtime-access.js",
              interface: "RuntimeAccessHandle",
              capabilities: ["alphaSetup", "betaSetup"],
            },
            featureFactories: [
              { symbol: "createAlphaFeature", source: "features/src/feature-alpha.ts", barrel: "features/src/feature-barrel.ts", manifest: "features/package.json", moduleSpecifier: "@fixture/features/composition", hostDependencies: ["alphaSetup.alpha"] },
              { symbol: "createBetaFeature", source: "features/src/feature-beta.ts", barrel: "features/src/feature-barrel.ts", manifest: "features/package.json", moduleSpecifier: "@fixture/features/composition", hostDependencies: ["betaSetup.beta"] },
            ],
          },
        },
      },
    };

    const verified = await verifyProductSourceEvidence(evidence, { fixture: root });
    const composition = verified.reports[0]?.composition as unknown as {
      readonly kind: string;
      readonly capabilities: readonly string[];
      readonly featureFactories: readonly string[];
    } | undefined;
    assert.equal(composition?.kind, "product-capability-root");
    assert.deepEqual(
      composition?.capabilities,
      ["alphaSetup", "betaSetup"],
    );
    assert.deepEqual(
      composition?.featureFactories,
      ["createAlphaFeature", "createBetaFeature"],
    );

    const withChangedFile = async (
      path: string,
      source: string,
      message: string,
    ): Promise<typeof evidence> => {
      await writeFile(join(root, path), source);
      await git(root, ["add", path]);
      await git(root, ["commit", "--quiet", "-m", message]);
      const mutated = structuredClone(evidence);
      mutated.products.fixture.commit = await git(root, ["rev-parse", "HEAD"]);
      mutated.products.fixture.tree = await git(root, ["rev-parse", "HEAD^{tree}"]);
      const file = mutated.products.fixture.files.find(entry => entry.path === path);
      if (file === undefined) {
        assert.equal(path, mutated.products.fixture.composition.consumerManifest);
      } else {
        file.blob = await git(root, ["rev-parse", `${mutated.products.fixture.commit}:${path}`]);
      }
      return mutated;
    };

    const validHostFactory = [
      "export const createHost = (dependencies: AgentRuntimeHostDependencies): AgentRuntimeHost => ({",
      "  bindAccess(_scope: TrustedAccessScope): RuntimeAccessHandle { return { alphaSetup: dependencies.alphaSetup, betaSetup: dependencies.betaSetup }; },",
      "  async dispose(): Promise<void> {},",
      "});",
    ].join("\n");
    const retainedHostBindings = await withChangedFile(
      "root.ts",
      rootSource.replace(validHostFactory, [
        "export const createHost = (dependencies: AgentRuntimeHostDependencies): AgentRuntimeHost => {",
        "  const bindAccess = (_scope: TrustedAccessScope): RuntimeAccessHandle => ({ alphaSetup: dependencies.alphaSetup, betaSetup: dependencies.betaSetup });",
        "  const dispose = async (): Promise<void> => {};",
        "  const host = Object.freeze({ bindAccess, dispose });",
        "  return host;",
        "};",
      ].join("\n")),
      "test: retain host through immutable closures",
    );
    await verifyProductSourceEvidence(retainedHostBindings, { fixture: root });

    const discardedHostDependencies = await withChangedFile(
      "root.ts",
      rootSource.replace(validHostFactory, [
        "export const createHost = (dependencies: AgentRuntimeHostDependencies): AgentRuntimeHost => {",
        "  void dependencies;",
        "  return { bindAccess(_scope: TrustedAccessScope): RuntimeAccessHandle { return {} as RuntimeAccessHandle; }, async dispose(): Promise<void> {} };",
        "};",
      ].join("\n")),
      "test: discard composed host dependencies",
    );
    await assert.rejects(
      verifyProductSourceEvidence(discardedHostDependencies, { fixture: root }),
      /returned host closures must retain the immutable composed dependencies/u,
    );

    const ignoredHostDependencies = await withChangedFile(
      "root.ts",
      rootSource.replace(validHostFactory, [
        "export const createHost = (dependencies: AgentRuntimeHostDependencies): AgentRuntimeHost => ({",
        "  bindAccess(_scope: TrustedAccessScope): RuntimeAccessHandle { void dependencies.alphaSetup; void dependencies.betaSetup; return {} as RuntimeAccessHandle; },",
        "  async dispose(): Promise<void> {},",
        "});",
      ].join("\n")),
      "test: ignore retained host dependencies",
    );
    await assert.rejects(
      verifyProductSourceEvidence(ignoredHostDependencies, { fixture: root }),
      /returned host closures must retain the immutable composed dependencies/u,
    );

    const castHostDecoy = await withChangedFile(
      "root.ts",
      rootSource.replace(
        validHostFactory,
        "export const createHost = (dependencies: AgentRuntimeHostDependencies): AgentRuntimeHost => ({ dependencies } as unknown as AgentRuntimeHost);",
      ),
      "test: return a cast host decoy",
    );
    await assert.rejects(
      verifyProductSourceEvidence(castHostDecoy, { fixture: root }),
      /host factory must return a retained host object, not a cast decoy/u,
    );

    const mismatchedDependencyShape = await withChangedFile(
      "root.ts",
      rootSource.replace(
        "readonly betaSetup: BetaSetupCapabilityBundle",
        "readonly betaSetup: AlphaSetupCapabilityBundle",
      ),
      "test: mismatch a host dependency bundle shape",
    );
    await assert.rejects(
      verifyProductSourceEvidence(mismatchedDependencyShape, { fixture: root }),
      /capability betaSetup configured ownership must be a subset of the closed host shape/u,
    );

    const genericInheritedHost = await withChangedFile(
      "root.ts",
      rootSource.replace(
        "export interface AgentRuntimeHost { bindAccess(scope: TrustedAccessScope): RuntimeAccessHandle; dispose(): Promise<void>; }",
        "interface GenericHost<T> { bindAccess(scope: TrustedAccessScope): RuntimeAccessHandle; dispose(): Promise<void>; }\nexport interface AgentRuntimeHost extends GenericHost<RuntimeAccessHandle> {}",
      ),
      "test: spoof host access through generic inheritance",
    );
    await assert.rejects(
      verifyProductSourceEvidence(genericInheritedHost, { fixture: root }),
      /host return interface inheritance must be non-generic/u,
    );

    const duplicateTrackedImport = await withChangedFile(
      "root.ts",
      rootSource.replace(
        "import type { AlphaSetupCapabilityBundle, BetaSetupCapabilityBundle, RuntimeAccessHandle } from './runtime-access.js';",
        "import type { AlphaSetupCapabilityBundle, BetaSetupCapabilityBundle, RuntimeAccessHandle, RuntimeAccessHandle as RuntimeAccessHandle } from './runtime-access.js';",
      ),
      "test: duplicate a tracked import local binding",
    );
    await assert.rejects(
      verifyProductSourceEvidence(duplicateTrackedImport, { fixture: root }),
      /access contract must be exactly one type RuntimeAccessHandle import with no alias/u,
    );

    const aliasedFeatureImport = await withChangedFile(
      "root.ts",
      rootSource
        .replace(
          "import { createAlphaFeature, createBetaFeature }",
          "import { createAlphaFeature as createAlphaAlias, createBetaFeature }",
        )
        .replace("const alpha = createAlphaFeature();", "const alpha = createAlphaAlias();"),
      "test: alias a runtime feature import",
    );
    await assert.rejects(
      verifyProductSourceEvidence(aliasedFeatureImport, { fixture: root }),
      /E-WIRING/u,
    );

    const typeOnlyFeatureImport = await withChangedFile(
      "root.ts",
      rootSource.replace(
        "import { createAlphaFeature, createBetaFeature }",
        "import type { createAlphaFeature, createBetaFeature }",
      ),
      "test: make runtime feature imports type-only",
    );
    await assert.rejects(
      verifyProductSourceEvidence(typeOnlyFeatureImport, { fixture: root }),
      /E-WIRING/u,
    );

    const indirectFeatureCall = await withChangedFile(
      "root.ts",
      rootSource.replace(
        "  const alpha = createAlphaFeature();",
        "  const createAlpha = createAlphaFeature;\n  const alpha = createAlpha();",
      ),
      "test: call a feature factory through an alias",
    );
    await assert.rejects(
      verifyProductSourceEvidence(indirectFeatureCall, { fixture: root }),
      /E-WIRING/u,
    );

    const valueContractImport = await withChangedFile(
      "root.ts",
      rootSource.replace(
        "import type { AlphaSetupCapabilityBundle, BetaSetupCapabilityBundle, RuntimeAccessHandle }",
        "import { AlphaSetupCapabilityBundle, BetaSetupCapabilityBundle, RuntimeAccessHandle }",
      ),
      "test: make the access contract a runtime import",
    );
    await assert.rejects(
      verifyProductSourceEvidence(valueContractImport, { fixture: root }),
      /E-WIRING/u,
    );

    const shadowedHostFactory = await withChangedFile(
      "root.ts",
      rootSource.replace(
        "  return createHost({",
        "  const createHost = (value: AgentRuntimeHostDependencies) => value as unknown as AgentRuntimeHost;\n  return createHost({",
      ),
      "test: shadow the host factory",
    );
    await assert.rejects(
      verifyProductSourceEvidence(shadowedHostFactory, { fixture: root }),
      /E-WIRING/u,
    );

    const shadowedFeatureFactory = await withChangedFile(
      "root.ts",
      rootSource.replace(
        "  const alpha = createAlphaFeature();",
        "  const decoy = (createAlphaFeature: () => unknown) => createAlphaFeature();\n  void decoy;\n  const alpha = createAlphaFeature();",
      ),
      "test: shadow a feature factory",
    );
    await assert.rejects(
      verifyProductSourceEvidence(shadowedFeatureFactory, { fixture: root }),
      /E-WIRING/u,
    );

    const aliasedFeatureResult = await withChangedFile(
      "root.ts",
      rootSource
        .replace("  const beta = createBetaFeature();", "  const beta = createBetaFeature();\n  const betaAlias = beta;")
        .replace("betaSetup: { beta }", "betaSetup: { beta: betaAlias }"),
      "test: alias a feature result",
    );
    await assert.rejects(
      verifyProductSourceEvidence(aliasedFeatureResult, { fixture: root }),
      /E-WIRING/u,
    );

    const mutatedFeatureResult = await withChangedFile(
      "root.ts",
      rootSource.replace(
        "  const beta = createBetaFeature();",
        "  const beta = createBetaFeature();\n  (beta as unknown as { value: string }).value = 'mutated';",
      ),
      "test: mutate a feature result",
    );
    await assert.rejects(
      verifyProductSourceEvidence(mutatedFeatureResult, { fixture: root }),
      /E-WIRING/u,
    );

    const computedCapabilityLeaf = await withChangedFile(
      "root.ts",
      rootSource.replace("alpha: alpha.alpha", "['alpha']: alpha.alpha"),
      "test: compute a capability leaf",
    );
    await assert.rejects(
      verifyProductSourceEvidence(computedCapabilityLeaf, { fixture: root }),
      /host dependency bundle alphaSetup must not contain spreads, computed keys, methods, or accessors/u,
    );

    const spreadCapabilityLeaf = await withChangedFile(
      "root.ts",
      rootSource.replace(
        "alphaSetup: { alpha: alpha.alpha, plan: createLocalPlanner() }",
        "alphaSetup: { ...{ alpha: alpha.alpha }, plan: createLocalPlanner() }",
      ),
      "test: spread a capability leaf",
    );
    await assert.rejects(
      verifyProductSourceEvidence(spreadCapabilityLeaf, { fixture: root }),
      /host dependency bundle alphaSetup must not contain spreads, computed keys, methods, or accessors/u,
    );

    const accessorCapabilityLeaf = await withChangedFile(
      "root.ts",
      rootSource.replace(
        "alpha: alpha.alpha, plan: createLocalPlanner()",
        "get alpha() { return alpha.alpha; }, plan: createLocalPlanner()",
      ),
      "test: hide a capability leaf behind an accessor",
    );
    await assert.rejects(
      verifyProductSourceEvidence(accessorCapabilityLeaf, { fixture: root }),
      /host dependency bundle alphaSetup must not contain spreads, computed keys, methods, or accessors/u,
    );

    const methodCapabilityLeaf = await withChangedFile(
      "root.ts",
      rootSource.replace(
        "alpha: alpha.alpha, plan: createLocalPlanner()",
        "alpha() { return alpha.alpha; }, plan: createLocalPlanner()",
      ),
      "test: hide a capability leaf behind a method",
    );
    await assert.rejects(
      verifyProductSourceEvidence(methodCapabilityLeaf, { fixture: root }),
      /host dependency bundle alphaSetup must not contain spreads, computed keys, methods, or accessors/u,
    );

    const duplicateCapabilityLeaf = await withChangedFile(
      "root.ts",
      rootSource.replace(
        "alpha: alpha.alpha, plan: createLocalPlanner()",
        "alpha: alpha.alpha, alpha: alpha.alpha, plan: createLocalPlanner()",
      ),
      "test: duplicate a capability leaf",
    );
    await assert.rejects(
      verifyProductSourceEvidence(duplicateCapabilityLeaf, { fixture: root }),
      /host dependency bundle alphaSetup must use unique static keys/u,
    );

    const missingCapabilityLeaf = await withChangedFile(
      "root.ts",
      rootSource.replace("alpha: alpha.alpha, ", ""),
      "test: omit a configured capability leaf",
    );
    await assert.rejects(
      verifyProductSourceEvidence(missingCapabilityLeaf, { fixture: root }),
      /host dependency bundle alphaSetup members are .* expected closed host shape/u,
    );

    const falseMemberMatch = await withChangedFile(
      "root.ts",
      rootSource.replace("alpha: alpha.alpha", "alpha: alpha.decoy"),
      "test: use a false same-name feature member",
    );
    await assert.rejects(
      verifyProductSourceEvidence(falseMemberMatch, { fixture: root }),
      /host dependency alphaSetup\.alpha must be alpha or alpha\.alpha/u,
    );

    const extraAmbiguousLeaf = await withChangedFile(
      "root.ts",
      rootSource.replace("alpha: alpha.alpha,", "alpha: alpha.alpha, decoy: alpha.alpha,"),
      "test: reuse a feature result at an unconfigured leaf",
    );
    await assert.rejects(
      verifyProductSourceEvidence(extraAmbiguousLeaf, { fixture: root }),
      /host dependency bundle alphaSetup members are .* expected closed host shape/u,
    );

    const extraCapabilityRoot = await withChangedFile(
      "root.ts",
      rootSource.replace(
        "betaSetup: { beta }",
        "betaSetup: { beta }, decoySetup: { inspect: beta }",
      ),
      "test: add an undeclared dependency root",
    );
    await assert.rejects(
      verifyProductSourceEvidence(extraCapabilityRoot, { fixture: root }),
      /E-WIRING/u,
    );

    const extraDependencyInterfaceCapability = await withChangedFile(
      "root.ts",
      rootSource.replace(
        "readonly betaSetup: BetaSetupCapabilityBundle; }",
        "readonly betaSetup: BetaSetupCapabilityBundle; readonly decoySetup: BetaSetupCapabilityBundle; }",
      ),
      "test: add an undeclared dependency interface capability",
    );
    await assert.rejects(
      verifyProductSourceEvidence(extraDependencyInterfaceCapability, { fixture: root }),
      /E-WIRING/u,
    );

    const duplicateAccessMethod = await withChangedFile(
      "root.ts",
      rootSource.replace(
        "dispose(): Promise<void>; }",
        "otherAccess(scope: TrustedAccessScope): RuntimeAccessHandle; dispose(): Promise<void>; }",
      ),
      "test: expose a second access contract method",
    );
    await assert.rejects(
      verifyProductSourceEvidence(duplicateAccessMethod, { fixture: root }),
      /E-WIRING/u,
    );

    const localContractDecoy = await withChangedFile(
      "root.ts",
      rootSource.replace(
        "interface TrustedAccessScope",
        "interface RuntimeAccessHandle {}\ninterface TrustedAccessScope",
      ),
      "test: add a false same-name access contract",
    );
    await assert.rejects(
      verifyProductSourceEvidence(localContractDecoy, { fixture: root }),
      /E-(?:AST|WIRING)/u,
    );

    const missingConfiguredPath = structuredClone(evidence);
    missingConfiguredPath.products.fixture.composition.featureFactories[0]!.hostDependencies = [
      "alphaSetup.missing",
    ];
    await assert.rejects(
      verifyProductSourceEvidence(missingConfiguredPath, { fixture: root }),
      /E-WIRING/u,
    );

    const undeclaredCapabilityRoot = structuredClone(evidence);
    undeclaredCapabilityRoot.products.fixture.composition.featureFactories[0]!.hostDependencies = [
      "gammaSetup.alpha",
    ];
    await assert.rejects(
      verifyProductSourceEvidence(undeclaredCapabilityRoot, { fixture: root }),
      /E-WIRING/u,
    );

    const overlappingConfiguredPaths = structuredClone(evidence);
    overlappingConfiguredPaths.products.fixture.composition.featureFactories[1]!.hostDependencies.push(
      "alphaSetup.alpha.value",
    );
    await assert.rejects(
      verifyProductSourceEvidence(overlappingConfiguredPaths, { fixture: root }),
      /E-SCHEMA/u,
    );

    await writeFile(join(root, "root.ts"), rootSource);
    await git(root, ["add", "root.ts"]);
    await git(root, ["commit", "--quiet", "-m", "test: restore capability root after AST adversaries"]);

    const registryPackageFallback = await withChangedFile("package.json", JSON.stringify({
      name: "@fixture/consumer",
      dependencies: {
        "@fixture/features": "^1.0.0",
      },
    }), "test: replace exact workspace dependency with registry fallback");
    await assert.rejects(
      verifyProductSourceEvidence(registryPackageFallback, { fixture: root }),
      /E-WIRING/u,
    );
    await writeFile(join(root, "package.json"), consumerPackageSource);
    await git(root, ["add", "package.json"]);
    await git(root, ["commit", "--quiet", "-m", "test: restore workspace consumer manifest"]);

    const mismatchedConsumerManifest = structuredClone(evidence);
    mismatchedConsumerManifest.products.fixture.composition.consumerManifest = "features/package.json";
    await assert.rejects(
      verifyProductSourceEvidence(mismatchedConsumerManifest, { fixture: root }),
      /E-WIRING/u,
    );

    const missingFactoryCall = await withChangedFile(
      "root.ts",
      rootSource.replace("  const beta = createBetaFeature();", "  const beta = 'literal';"),
      "test: remove one capability factory call",
    );
    await assert.rejects(
      verifyProductSourceEvidence(missingFactoryCall, { fixture: root }),
      /feature factory createBetaFeature must initialize one top-level const binding/u,
    );

    const nestedFactoryCall = await withChangedFile(
      "root.ts",
      rootSource.replace(
        "  const beta = createBetaFeature();",
        "  const hidden = () => createBetaFeature();\n  const beta = hidden();",
      ),
      "test: hide one capability factory call",
    );
    await assert.rejects(
      verifyProductSourceEvidence(nestedFactoryCall, { fixture: root }),
      /feature factory createBetaFeature must initialize one top-level const binding/u,
    );

    const disconnectedFactoryResults = await withChangedFile(
      "root.ts",
      rootSource.replace(
        "alphaSetup: { alpha: alpha.alpha, plan: createLocalPlanner() }, betaSetup: { beta }",
        "alphaSetup: { alpha: 'fake', plan: 'fake' }, betaSetup: { beta: 'fake' }",
      ),
      "test: disconnect capability factory results",
    );
    await assert.rejects(
      verifyProductSourceEvidence(disconnectedFactoryResults, { fixture: root }),
      /host dependency alphaSetup\.alpha must be alpha or alpha\.alpha/u,
    );

    const conditionalFactoryCall = await withChangedFile(
      "root.ts",
      rootSource.replace(
        "  const beta = createBetaFeature();",
        "  const beta = true ? createBetaFeature() : 'fake';",
      ),
      "test: make capability factory conditional",
    );
    await assert.rejects(
      verifyProductSourceEvidence(conditionalFactoryCall, { fixture: root }),
      /feature factory createBetaFeature must initialize one top-level const binding/u,
    );

    const unusedHostCall = await withChangedFile(
      "root.ts",
      rootSource.replace(
        "  return createHost({ alphaSetup: { alpha: alpha.alpha, plan: createLocalPlanner() }, betaSetup: { beta } });",
        "  const host = createHost({ alphaSetup: { alpha: alpha.alpha, plan: createLocalPlanner() }, betaSetup: { beta } });\n  return host;",
      ),
      "test: disconnect returned host",
    );
    await assert.rejects(
      verifyProductSourceEvidence(unusedHostCall, { fixture: root }),
      /capability root must directly return createHost with one dependency object/u,
    );

    const lateFactoryInitialization = await withChangedFile(
      "root.ts",
      rootSource.replace(
        "  const beta = createBetaFeature();\n  return createHost({ alphaSetup: { alpha: alpha.alpha, plan: createLocalPlanner() }, betaSetup: { beta } });",
        "  return createHost({ alphaSetup: { alpha: alpha.alpha, plan: createLocalPlanner() }, betaSetup: { beta } });\n  const beta = createBetaFeature();",
      ),
      "test: initialize a feature after host return",
    );
    await assert.rejects(
      verifyProductSourceEvidence(lateFactoryInitialization, { fixture: root }),
      /all feature factories must initialize before the returned host factory call/u,
    );

    await writeFile(join(root, "root.ts"), rootSource);
    await git(root, ["add", "root.ts"]);
    await git(root, ["commit", "--quiet", "-m", "test: restore capability-root fixture"]);
    const missingCapability = await withChangedFile("runtime-access.ts", [
      "export interface SetupQueries { inspect(): Promise<void>; }",
      "export interface BaseAccessHandle { readonly alphaSetup: SetupQueries; }",
      "export interface RuntimeAccessHandle extends BaseAccessHandle {}",
      "",
    ].join("\n"), "test: remove one capability contract member");
    await assert.rejects(
      verifyProductSourceEvidence(missingCapability, { fixture: root }),
      /E-WIRING/u,
    );

    const mismatchedContractSource = structuredClone(evidence);
    mismatchedContractSource.products.fixture.composition.contract.source = "other-access.ts";
    await assert.rejects(
      verifyProductSourceEvidence(mismatchedContractSource, { fixture: root }),
      /E-WIRING/u,
    );

    const missingFactorySource = structuredClone(evidence);
    missingFactorySource.products.fixture.files = missingFactorySource.products.fixture.files.filter(
      file => file.path !== "features/src/feature-beta.ts",
    );
    await assert.rejects(
      verifyProductSourceEvidence(missingFactorySource, { fixture: root }),
      /E-WIRING/u,
    );

    const wrongBarrel = structuredClone(evidence);
    wrongBarrel.products.fixture.composition.featureFactories[1]!.source = "features/src/feature-alpha.ts";
    await assert.rejects(
      verifyProductSourceEvidence(wrongBarrel, { fixture: root }),
      /E-WIRING/u,
    );

    await writeFile(join(root, "runtime-access.ts"), contractSource);
    await git(root, ["add", "runtime-access.ts"]);
    await git(root, ["commit", "--quiet", "-m", "test: restore capability contract"]);
    const nonCallableFactory = await withChangedFile(
      "features/src/feature-beta.ts",
      "export const createBetaFeature = 'not-callable';\n",
      "test: replace capability factory with data",
    );
    await assert.rejects(
      verifyProductSourceEvidence(nonCallableFactory, { fixture: root }),
      /E-WIRING/u,
    );

    await writeFile(join(root, "features", "src", "feature-beta.ts"), featureBetaSource);
    await git(root, ["add", "features/src/feature-beta.ts"]);
    await git(root, ["commit", "--quiet", "-m", "test: restore capability factory"]);
    const aliasedBarrel = await withChangedFile("features/src/feature-barrel.ts", [
      "export { unrelated as createAlphaFeature } from './feature-alpha.js';",
      "export { createBetaFeature } from './feature-beta.js';",
      "",
    ].join("\n"), "test: alias an unrelated barrel export");
    await assert.rejects(
      verifyProductSourceEvidence(aliasedBarrel, { fixture: root }),
      /E-WIRING/u,
    );

    await writeFile(join(root, "features", "src", "feature-barrel.ts"), featureBarrelSource);
    await git(root, ["add", "features/src/feature-barrel.ts"]);
    await git(root, ["commit", "--quiet", "-m", "test: restore capability barrel"]);

    const typeOnlyBarrel = await withChangedFile("features/src/feature-barrel.ts", [
      "export type { createAlphaFeature } from './feature-alpha.js';",
      "export { createBetaFeature } from './feature-beta.js';",
      "",
    ].join("\n"), "test: make a runtime factory re-export type-only");
    await assert.rejects(
      verifyProductSourceEvidence(typeOnlyBarrel, { fixture: root }),
      /E-WIRING/u,
    );

    await writeFile(join(root, "features", "src", "feature-barrel.ts"), featureBarrelSource);
    await git(root, ["add", "features/src/feature-barrel.ts"]);
    await git(root, ["commit", "--quiet", "-m", "test: restore value capability barrel"]);

    const dotSegmentManifestTarget = await withChangedFile("features/package.json", JSON.stringify({
      name: "@fixture/features",
      exports: {
        "./composition": {
          import: "./dist/../dist/feature-barrel.js",
          types: "./dist/feature-barrel.d.ts",
        },
      },
    }), "test: insert dot segments into package export");
    await assert.rejects(
      verifyProductSourceEvidence(dotSegmentManifestTarget, { fixture: root }),
      /E-WIRING/u,
    );

    const nonCanonicalManifestTarget = await withChangedFile("features/package.json", JSON.stringify({
      name: "@fixture/features",
      exports: {
        "./composition": {
          import: "./dist//feature-barrel.js",
          types: "./dist/feature-barrel.d.ts",
        },
      },
    }), "test: use non-canonical raw package export");
    await assert.rejects(
      verifyProductSourceEvidence(nonCanonicalManifestTarget, { fixture: root }),
      /E-WIRING/u,
    );

    const wrongManifestTarget = await withChangedFile("features/package.json", JSON.stringify({
      name: "@fixture/features",
      exports: {
        "./composition": {
          import: "./unrelated/feature-barrel.js",
          types: "./unrelated/feature-barrel.d.ts",
        },
      },
    }), "test: redirect package export to unrelated directory");
    await assert.rejects(
      verifyProductSourceEvidence(wrongManifestTarget, { fixture: root }),
      /E-WIRING/u,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
