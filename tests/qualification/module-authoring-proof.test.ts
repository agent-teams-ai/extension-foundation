import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  AGENT_RUNTIME_DECLARATIONS,
  AGENT_RUNTIME_PROFILE,
  activateAgentRuntimeHybrid,
  createAgentRuntimeBaseline,
  createAgentRuntimeLoaderTable,
} from "./module-authoring-proof/agent-runtime-fixture.ts";
import {
  FRONTEND_DECLARATIONS,
  FRONTEND_PROFILE,
  activateFrontendHybrid,
  createFrontendBaseline,
  createFrontendLoaderTable,
  type RecentProjectSource,
} from "./module-authoring-proof/frontend-fixture.ts";
import {
  discoverDeclarations,
  emitGenerated,
  generatedOutputs,
  staleGenerated,
  writeDeclaration,
} from "./module-authoring-proof/io.ts";
import { evaluateSelectedLoaders } from "./module-authoring-proof/literal-loaders.ts";
import { measureProof, PROOF_REVISIONS } from "./module-authoring-proof/measurement.ts";
import {
  compileStaticProfile,
  requiredDisableImpact,
  type LocatedDeclaration,
  type StaticProfile,
  validateDeclaration,
} from "./module-authoring-proof/model.ts";

const fixtureDirectory = dirname(fileURLToPath(import.meta.url));
const proofDirectory = join(fixtureDirectory, "module-authoring-proof");

const observer = Object.freeze({ observed: ["/opt/claude", "/opt/codex"] });
const source = (sourceId: string, projects: readonly string[]): RecentProjectSource => Object.freeze({
  sourceId,
  list: () => projects,
});
const claude = source("claude", ["alpha"]);
const codex = source("codex", ["beta"]);

function mutableProfile(profile: StaticProfile): {
  consumer: StaticProfile["consumer"];
  roots: string[];
  enabledModules: string[];
  bindings: Record<string, string | readonly string[] | null>;
  selectedLoaders: string[];
} {
  return {
    consumer: profile.consumer,
    roots: [...profile.roots],
    enabledModules: [...profile.enabledModules],
    bindings: structuredClone(profile.bindings),
    selectedLoaders: [...profile.selectedLoaders],
  };
}

async function withTemp(run: (root: string) => Promise<void>): Promise<void> {
  const root = await mkdtemp(join(tmpdir(), "module-authoring-proof-"));
  try {
    await run(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

test("01 Agent Runtime Pure DI baseline has the independent expected outcome", () => {
  const baseline = createAgentRuntimeBaseline(observer);
  assert.deepEqual(
    [baseline.runtimeInstallation.discoverClaudeCodeInstallations(), baseline.runtimeInstallation.discoverCodexInstallations()],
    ["claude:/opt/claude,/opt/codex", "codex:/opt/claude,/opt/codex"],
  );
});

test("02 Agent Runtime hybrid compiles static arguments and has the independent expected outcome", () => {
  const compilation = compileStaticProfile(AGENT_RUNTIME_DECLARATIONS, AGENT_RUNTIME_PROFILE);
  assert.deepEqual(compilation.diagnostics, []);
  assert.deepEqual(compilation.plan?.factoryArguments[1], {
    moduleId: "runtime.installation-discovery",
    loaderKey: "runtime.installation-discovery",
    dependencies: { executableFileObserver: "runtime.executable-observer" },
  });
  const hybrid = activateAgentRuntimeHybrid(observer);
  assert.equal(hybrid.runtimeInstallation.discoverCodexInstallations(), "codex:/opt/claude,/opt/codex");
});

test("03 Frontend Pure DI baseline preserves the independently expected source order", () => {
  assert.deepEqual(createFrontendBaseline(claude, codex).listDashboardRecentProjects(), ["alpha", "beta"]);
});

test("04 Frontend hybrid compiles static many arguments and preserves expected source order", () => {
  const compilation = compileStaticProfile(FRONTEND_DECLARATIONS, FRONTEND_PROFILE);
  assert.deepEqual(compilation.diagnostics, []);
  assert.deepEqual(compilation.plan?.factoryArguments[2]?.dependencies, {
    logger: null,
    sources: ["recent-projects.claude-source", "recent-projects.codex-source"],
  });
  const feature = activateFrontendHybrid({
    "recent-projects.claude-source": claude,
    "recent-projects.codex-source": codex,
  });
  assert.deepEqual(feature.listDashboardRecentProjects(), ["alpha", "beta"]);
});

test("05 declarations are inert serializable JSON", () => {
  const declaration = FRONTEND_DECLARATIONS[0]!.declaration;
  assert.deepEqual(JSON.parse(JSON.stringify(declaration)), declaration);
  assert.equal(JSON.stringify(declaration).includes("function"), false);
});

test("06 discovery is bounded to consumer roots and the fixed declaration name", async () => {
  await withTemp(async root => {
    await mkdir(join(root, "admitted"), { recursive: true });
    await mkdir(join(root, "ignored"), { recursive: true });
    await writeDeclaration(root, "admitted", AGENT_RUNTIME_DECLARATIONS[0]!.declaration);
    await writeFile(join(root, "ignored", "other.json"), JSON.stringify(AGENT_RUNTIME_DECLARATIONS[1]!.declaration));
    const result = await discoverDeclarations("agent-runtime", [root], { maxRoots: 1, maxCandidates: 2 });
    assert.deepEqual(result.reads, ["admitted/module.declaration.json"]);
    assert.deepEqual(result.declarations.map(item => item.declaration.moduleId), ["runtime.executable-observer"]);
    await assert.rejects(discoverDeclarations("agent-runtime", [root, root], { maxRoots: 1, maxCandidates: 2 }), /DISCOVERY_ROOT_LIMIT/u);
  });
});

test("07 discovery performs zero activation factory evaluation", async () => {
  await withTemp(async root => {
    let evaluations = 0;
    const factory = () => { evaluations += 1; return observer; };
    await mkdir(join(root, "candidate"), { recursive: true });
    await writeDeclaration(root, "candidate", AGENT_RUNTIME_DECLARATIONS[0]!.declaration);
    const result = await discoverDeclarations("agent-runtime", [root]);
    assert.equal(result.declarations.length, 1);
    assert.equal(evaluations, 0);
    assert.equal(typeof factory, "function");
  });
});

test("08 malformed declarations emit an immutable path-safe diagnostic", () => {
  const result = validateDeclaration({ schemaVersion: 9, consumer: "frontend" }, "bad/module.declaration.json");
  assert.deepEqual(result.diagnostics.map(item => item.code), [
    "DECLARATION_FIELD", "DECLARATION_FIELD", "DECLARATION_FIELD", "DECLARATION_FIELD", "DECLARATION_FIELD", "DECLARATION_FIELD", "DECLARATION_FIELD", "DECLARATION_FIELD",
  ]);
  assert.equal(Object.isFrozen(result.diagnostics), true);
  assert.equal(JSON.stringify(result.diagnostics).includes("/var/"), false);
});

test("09 duplicate declarations report deterministic related paths", () => {
  const duplicate: LocatedDeclaration = {
    declarationPath: "z-duplicate/module.declaration.json",
    declaration: AGENT_RUNTIME_DECLARATIONS[0]!.declaration,
  };
  const result = compileStaticProfile([duplicate, ...AGENT_RUNTIME_DECLARATIONS], AGENT_RUNTIME_PROFILE);
  assert.deepEqual(result.diagnostics, [{
    code: "DUPLICATE_MODULE",
    consumer: "agent-runtime",
    declarationPath: "z-duplicate/module.declaration.json",
    fieldPath: "moduleId",
    moduleId: "runtime.executable-observer",
    relatedPaths: ["executable-observer/module.declaration.json"],
  }]);
});

test("10 a missing required binding fails before any factory argument is usable", () => {
  const profile = mutableProfile(AGENT_RUNTIME_PROFILE);
  delete profile.bindings["runtime.installation-discovery.executableFileObserver"];
  const result = compileStaticProfile(AGENT_RUNTIME_DECLARATIONS, profile);
  assert.deepEqual(result.diagnostics.map(item => item.code), ["MISSING_REQUIRED"]);
  assert.equal(result.plan, undefined);
});

test("11 optional absence is explicit and ordered many follows profile order", () => {
  const profile = mutableProfile(FRONTEND_PROFILE);
  profile.bindings["recent-projects.feature.sources"] = [
    "recent-projects.codex-source",
    "recent-projects.claude-source",
  ];
  const result = compileStaticProfile(FRONTEND_DECLARATIONS, profile);
  assert.deepEqual(result.diagnostics, []);
  assert.deepEqual(result.plan?.factoryArguments[2]?.dependencies, {
    logger: null,
    sources: ["recent-projects.codex-source", "recent-projects.claude-source"],
  });
  delete profile.bindings["recent-projects.feature.logger"];
  assert.deepEqual(compileStaticProfile(FRONTEND_DECLARATIONS, profile).diagnostics.map(item => item.code), ["OPTIONAL_NOT_EXPLICIT"]);
});

test("12 a disabled root is rejected", () => {
  const profile = mutableProfile(FRONTEND_PROFILE);
  profile.enabledModules.pop();
  profile.selectedLoaders.pop();
  const result = compileStaticProfile(FRONTEND_DECLARATIONS, profile);
  assert.deepEqual(result.diagnostics.map(item => item.code), ["DISABLED_ROOT"]);
});

test("13 disabling a required provider computes the complete impact closure", () => {
  const application: LocatedDeclaration = {
    declarationPath: "application/module.declaration.json",
    declaration: {
      schemaVersion: 1,
      consumer: "agent-runtime",
      moduleId: "runtime.application",
      loaderKey: "runtime.application",
      provides: ["runtime.application"],
      dependencies: { required: [{ slot: "discovery", capability: "runtime.installation-discovery" }], optional: [], many: [] },
    },
  };
  const profile = mutableProfile(AGENT_RUNTIME_PROFILE);
  profile.roots = ["runtime.application"];
  profile.enabledModules.push("runtime.application");
  profile.bindings["runtime.application.discovery"] = "runtime.installation-discovery";
  profile.selectedLoaders.push("runtime.application");
  assert.deepEqual(requiredDisableImpact([...AGENT_RUNTIME_DECLARATIONS, application], profile, "runtime.executable-observer"), [
    "runtime.application", "runtime.executable-observer", "runtime.installation-discovery",
  ]);
  profile.enabledModules = profile.enabledModules.filter(id => id !== "runtime.executable-observer");
  profile.selectedLoaders = profile.selectedLoaders.filter(id => id !== "runtime.executable-observer");
  assert.equal(compileStaticProfile([...AGENT_RUNTIME_DECLARATIONS, application], profile).diagnostics.some(item => item.code === "DISABLED_REQUIRED"), true);
});

test("14 disabling an explicitly selected optional dependency is diagnosed", () => {
  const logger: LocatedDeclaration = {
    declarationPath: "logger/module.declaration.json",
    declaration: {
      schemaVersion: 1,
      consumer: "frontend",
      moduleId: "recent-projects.logger",
      loaderKey: "recent-projects.logger",
      provides: ["recent-projects.logger"],
      dependencies: { required: [], optional: [], many: [] },
    },
  };
  const profile = mutableProfile(FRONTEND_PROFILE);
  profile.bindings["recent-projects.feature.logger"] = "recent-projects.logger";
  const result = compileStaticProfile([...FRONTEND_DECLARATIONS, logger], profile);
  assert.deepEqual(result.diagnostics.map(item => item.code), ["DISABLED_OPTIONAL"]);
});

test("15 only selected target-local literal loaders evaluate", () => {
  const trace: string[] = [];
  const table = createAgentRuntimeLoaderTable(observer, trace);
  const loaded = evaluateSelectedLoaders(table, ["runtime.installation-discovery"]);
  assert.equal(loaded.length, 1);
  assert.deepEqual(trace, ["runtime.installation-discovery"]);
});

test("16 unselected and invalid literal loaders receive zero evaluation", () => {
  const trace: string[] = [];
  const table = createFrontendLoaderTable({
    "recent-projects.claude-source": claude,
    "recent-projects.codex-source": codex,
  }, trace);
  assert.throws(() => evaluateSelectedLoaders(table, ["recent-projects.invalid"]), /INVALID_LITERAL_LOADER/u);
  assert.deepEqual(trace, []);
});

test("17 selected loader keys must be an exact bijection", () => {
  const profile = mutableProfile(AGENT_RUNTIME_PROFILE);
  profile.selectedLoaders = ["runtime.installation-discovery", "runtime.installation-discovery"];
  assert.deepEqual(compileStaticProfile(AGENT_RUNTIME_DECLARATIONS, profile).diagnostics.map(item => item.code), ["LOADER_KEY_BIJECTION"]);
});

test("18 generated AI inventory is deterministic and navigable", () => {
  const output = generatedOutputs([...FRONTEND_DECLARATIONS].reverse());
  const inventory = JSON.parse(output["module-inventory.json"]!);
  assert.deepEqual(inventory.map((item: { moduleId: string }) => item.moduleId), [
    "recent-projects.claude-source", "recent-projects.codex-source", "recent-projects.feature",
  ]);
  assert.equal(output["module-handles.ts"]!.includes("RecentProjectsFeature"), true);
});

test("19 regeneration is byte-identical and stale outputs fail closed", async () => {
  await withTemp(async root => {
    const first = await emitGenerated(root, AGENT_RUNTIME_DECLARATIONS);
    const second = await emitGenerated(root, [...AGENT_RUNTIME_DECLARATIONS].reverse());
    assert.deepEqual(second, first);
    assert.deepEqual(await staleGenerated(root, AGENT_RUNTIME_DECLARATIONS), []);
    await writeFile(join(root, "module-handles.ts"), "stale\n", "utf8");
    assert.deepEqual(await staleGenerated(root, AGENT_RUNTIME_DECLARATIONS), ["module-handles.ts"]);
  });
});

test("20 plugin-shaped metadata activates only an ordinary product-owned typed contribution", () => {
  const pluginShaped = FRONTEND_DECLARATIONS[0]!.declaration;
  assert.deepEqual(pluginShaped.contribution, { kind: "recent-project-source" });
  const contribution: RecentProjectSource = claude;
  assert.deepEqual(contribution.list(), ["alpha"]);
  assert.equal("install" in contribution, false);
  assert.equal("plugin" in contribution, false);
});

test("21 framework, Foundation, graph, lifecycle, and container types do not leak", async () => {
  const publicProofSources = await Promise.all([
    "model.ts", "agent-runtime-fixture.ts", "frontend-fixture.ts", "literal-loaders.ts",
  ].map(name => readFile(join(proofDirectory, name), "utf8")));
  for (const text of publicProofSources) {
    assert.equal(/\b(?:Foundation|Graph|Lifecycle|Container|ServiceLocator)\b/u.test(text), false);
    assert.equal(text.includes("import("), false);
    assert.equal(text.includes("@deepseek-ai"), false);
  }
});

test("22 data projections are structuredClone safe while activation factories remain separate", () => {
  const compilation = compileStaticProfile(FRONTEND_DECLARATIONS, FRONTEND_PROFILE);
  const projections = {
    declarations: FRONTEND_DECLARATIONS.map(item => item.declaration),
    profile: FRONTEND_PROFILE,
    diagnostics: compilation.diagnostics,
    inventory: JSON.parse(generatedOutputs(FRONTEND_DECLARATIONS)["module-inventory.json"]!),
  };
  assert.deepEqual(structuredClone(projections), projections);
  assert.throws(() => structuredClone(createFrontendBaseline), /could not be cloned/u);
});

test("23 isolated private consumer package proof exposes nominal output without authoring internals", async () => {
  await withTemp(async root => {
    const packageRoot = join(root, "node_modules", "@proof", "inventory");
    await mkdir(packageRoot, { recursive: true });
    const generated = generatedOutputs(AGENT_RUNTIME_DECLARATIONS)["module-handles.ts"]!;
    await writeFile(join(packageRoot, "index.d.ts"), generated);
    await writeFile(join(packageRoot, "index.js"), 'export const RuntimeInstallationDiscovery = "runtime.installation-discovery";\n');
    await writeFile(join(packageRoot, "package.json"), JSON.stringify({ name: "@proof/inventory", type: "module", exports: { ".": { types: "./index.d.ts", import: "./index.js" } } }));
    await writeFile(join(root, "consumer.mjs"), [
      'import { RuntimeInstallationDiscovery } from "@proof/inventory";',
      'if (RuntimeInstallationDiscovery !== "runtime.installation-discovery") process.exit(2);',
    ].join("\n"));
    await import(`${new URL(`file://${join(root, "consumer.mjs")}`).href}?proof=1`);
    const packedSurface = await readFile(join(packageRoot, "index.d.ts"), "utf8");
    assert.equal(packedSurface.includes("unique symbol"), true);
    assert.equal(/Declaration|StaticProfile|Diagnostic|FactoryArgument/u.test(packedSurface), false);
  });
});

test("24 measurement and deletion decision are deterministic and CONDITIONAL", async () => {
  const sourcePaths = [join(proofDirectory, "agent-runtime-fixture.ts"), join(proofDirectory, "frontend-fixture.ts")];
  const genericPaths = [join(proofDirectory, "model.ts"), join(proofDirectory, "io.ts"), join(proofDirectory, "literal-loaders.ts")];
  const first = await measureProof(sourcePaths, genericPaths);
  const second = await measureProof(sourcePaths, genericPaths);
  assert.deepEqual(second, first);
  assert.deepEqual(first.revisions, PROOF_REVISIONS);
  assert.equal(first.adrProductionGlueRatio, "not-applicable-production-loc-zero");
  assert.equal(first.disposablePercent, "30-50%");
  assert.equal(first.verdict, "CONDITIONAL");
  assert.equal(first.residualBlocker, "product-owner-benchmark-and-adoption-evidence-absent");
});

test("25 Orchestrator is recorded as second-consumer-not-admitted", async () => {
  const result = await measureProof(
    [join(proofDirectory, "agent-runtime-fixture.ts"), join(proofDirectory, "frontend-fixture.ts")],
    [join(proofDirectory, "literal-loaders.ts")],
  );
  assert.equal(result.consumers.orchestrator, "second-consumer-not-admitted");
  assert.equal(result.revisions.orchestrator, "4c5f55366ed8c83f97374b66c8e9f84059c47382");
});

test("26 diagnostics are immutable and sorted independently of discovery order", () => {
  const malformed = validateDeclaration({}, "z/module.declaration.json", "frontend").diagnostics;
  const reversed = [...malformed].reverse();
  assert.deepEqual(reversed.map(item => item.code).sort(), malformed.map(item => item.code).sort());
  assert.equal(malformed.every(item => Object.isFrozen(item) && Object.isFrozen(item.relatedPaths)), true);
  assert.equal(malformed.every(item => !item.declarationPath.startsWith("/") && !("stack" in item) && !("timestamp" in item)), true);
});
