import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { lstat, mkdir, mkdtemp, readFile, readdir, rename, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import {
  createAgentRuntimeBaseline,
} from "./module-authoring-proof/agent-runtime-baseline.ts";
import {
  AGENT_RUNTIME_DECLARATIONS,
  AGENT_RUNTIME_PROFILE,
  createAgentRuntimeCandidate,
} from "./module-authoring-proof/agent-runtime-candidate.ts";
import { createAgentRuntimeLoaderTable } from "./module-authoring-proof/agent-runtime-loaders.ts";
import {
  createFrontendBaseline,
} from "./module-authoring-proof/frontend-baseline.ts";
import {
  FRONTEND_DECLARATIONS,
  FRONTEND_PROFILE,
  createFrontendCandidate,
} from "./module-authoring-proof/frontend-candidate.ts";
import {
  type RecentProjectSource,
} from "./module-authoring-proof/frontend-fixture.ts";
import { createFrontendLoaderTable } from "./module-authoring-proof/frontend-loaders.ts";
import {
  discoverDeclarations,
  emitGenerated,
  generatedOutputs,
  type GenerationFileOperations,
  staleGenerated,
  writeDeclaration,
} from "./module-authoring-proof/io.ts";
import { evaluateSelectedLoaders } from "./module-authoring-proof/literal-loaders.ts";
import {
  CONTEXT_REVISIONS,
  measureProof,
  type ClassifiedProofPath,
  type MeasurementInput,
} from "./module-authoring-proof/measurement.ts";
import {
  binaryCompare,
  requiredDisableImpact,
  simulateCandidateProfile,
  type LocatedDeclaration,
  type SyntheticCandidateProfile,
  validateDeclaration,
  validateSyntheticCandidateProfile,
} from "./module-authoring-proof/model.ts";

const fixtureDirectory = dirname(fileURLToPath(import.meta.url));
const proofDirectory = join(fixtureDirectory, "module-authoring-proof");
const strictJsonRuntimePath = join(fixtureDirectory, "..", "..", "architecture", "checks", "strict-json.mjs");
const strictJsonTypePath = join(fixtureDirectory, "..", "..", "architecture", "checks", "strict-json.d.mts");
const execFileAsync = promisify(execFile);
const typescriptCli = fileURLToPath(new URL("../../node_modules/typescript/bin/tsc", import.meta.url));

const proofPath = (...parts: string[]): string => join(proofDirectory, ...parts);
const classified = (
  bucket: ClassifiedProofPath["bucket"],
  ...paths: readonly string[]
): readonly ClassifiedProofPath[] => paths.map(path => Object.freeze({ bucket, path }));
const measurementInput: MeasurementInput = {
  proofRoot: proofDirectory,
  classificationRoots: [
    proofDirectory,
    join(fixtureDirectory, "module-authoring-proof.test.ts"),
    strictJsonRuntimePath,
    strictJsonTypePath,
  ],
  admissionDocumentPath: join(fixtureDirectory, "..", "..", "docs", "qualification", "module-system-v1-productization", "consumer-admission.md"),
  classifiedPaths: [
    ...classified("baseline", proofPath("agent-runtime-baseline.ts"), proofPath("frontend-baseline.ts")),
    ...classified(
      "candidate-product",
      proofPath("agent-runtime-candidate.ts"),
      proofPath("agent-runtime-loaders.ts"),
      proofPath("frontend-candidate.ts"),
      proofPath("frontend-loaders.ts"),
      proofPath("fixtures", "agent-runtime", "executable-observer", "activation-factory.mjs"),
      proofPath("fixtures", "agent-runtime", "executable-observer", "module.declaration.json"),
      proofPath("fixtures", "agent-runtime", "runtime-installation", "module.declaration.json"),
      proofPath("fixtures", "agent-runtime", "profile.json"),
      proofPath("fixtures", "frontend", "claude-recent-projects", "module.declaration.json"),
      proofPath("fixtures", "frontend", "codex-recent-projects", "module.declaration.json"),
      proofPath("fixtures", "frontend", "recent-projects", "activation-factory.mjs"),
      proofPath("fixtures", "frontend", "recent-projects", "module.declaration.json"),
      proofPath("fixtures", "frontend", "profile.json"),
    ),
    ...classified("generic-proof", proofPath("model.ts"), proofPath("io.ts"), proofPath("literal-loaders.ts"), proofPath("fixture-data.ts")),
    ...classified("shared-fixture", proofPath("agent-runtime-fixture.ts"), proofPath("frontend-fixture.ts")),
    ...classified("measurement-harness", proofPath("measurement.ts"), join(fixtureDirectory, "module-authoring-proof.test.ts")),
    ...classified("support-runtime", strictJsonRuntimePath),
    ...classified("support-type", strictJsonTypePath),
  ],
  baselineBindingProbes: [
    { path: proofPath("agent-runtime-baseline.ts"), token: "@proof-binding-site runtime.executable-observer" },
    { path: proofPath("frontend-baseline.ts"), token: "@proof-binding-site recent-projects.sources" },
  ],
  candidateBindingProbes: [
    { path: proofPath("agent-runtime-candidate.ts"), token: "@proof-binding-site runtime.executable-observer" },
    { path: proofPath("frontend-candidate.ts"), token: "@proof-binding-site recent-projects.sources" },
    { path: proofPath("fixtures", "agent-runtime", "profile.json"), token: "\"runtime.installation-discovery.executableFileObserver\": \"runtime.executable-observer\"" },
    { path: proofPath("fixtures", "frontend", "profile.json"), token: "\"recent-projects.feature.sources\": [" },
  ],
};

async function execPnpm(args: readonly string[], options: Readonly<{ cwd: string; env: NodeJS.ProcessEnv }>): Promise<string> {
  if (process.platform === "win32") {
    const { stdout } = await execFileAsync(process.env.ComSpec ?? "cmd.exe", ["/d", "/s", "/c", "pnpm", ...args], options);
    return String(stdout);
  }
  const { stdout } = await execFileAsync("pnpm", args, options);
  return String(stdout);
}

const observer = Object.freeze({ observed: ["/opt/claude", "/opt/codex"] });
const source = (sourceId: string, projects: readonly string[]): RecentProjectSource => Object.freeze({
  sourceId,
  list: () => projects,
});
const claude = source("claude", ["alpha"]);
const codex = source("codex", ["beta"]);

function mutableProfile(profile: SyntheticCandidateProfile): {
  consumer: SyntheticCandidateProfile["consumer"];
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

function located(
  moduleId: string,
  provides: readonly string[],
  dependencies: LocatedDeclaration["declaration"]["dependencies"] = { required: [], optional: [], many: [] },
  consumer: LocatedDeclaration["declaration"]["consumer"] = "frontend",
): LocatedDeclaration {
  return {
    declarationPath: `${moduleId}/module.declaration.json`,
    declaration: { schemaVersion: 1, consumer, moduleId, loaderKey: moduleId, provides, dependencies },
  };
}

function changedAgentRuntimeGeneration(): readonly LocatedDeclaration[] {
  return Object.freeze([
    ...AGENT_RUNTIME_DECLARATIONS,
    located(
      "runtime.health-probe",
      ["runtime.health-probe/v1"],
      { required: [], optional: [], many: [] },
      "agent-runtime",
    ),
  ]);
}

test("01 Agent Runtime Pure DI baseline has the independent expected outcome", () => {
  const baseline = createAgentRuntimeBaseline(observer);
  assert.deepEqual(
    [baseline.runtimeInstallation.discoverClaudeCodeInstallations(), baseline.runtimeInstallation.discoverCodexInstallations()],
    ["claude:/opt/claude,/opt/codex", "codex:/opt/claude,/opt/codex"],
  );
});

test("02 Agent Runtime candidate validates metadata while execution stays Pure DI", () => {
  const compilation = simulateCandidateProfile(AGENT_RUNTIME_DECLARATIONS, AGENT_RUNTIME_PROFILE);
  assert.deepEqual(compilation.diagnostics, []);
  assert.deepEqual(compilation.plan?.factoryArguments[1], {
    moduleId: "runtime.installation-discovery",
    loaderKey: "runtime.installation-discovery",
    dependencies: { executableFileObserver: "runtime.executable-observer" },
  });
  const candidate = createAgentRuntimeCandidate(observer);
  assert.equal(candidate.runtimeInstallation.discoverCodexInstallations(), "codex:/opt/claude,/opt/codex");
});

test("03 Frontend Pure DI baseline preserves the independently expected source order", () => {
  assert.deepEqual(createFrontendBaseline(claude, codex).listDashboardRecentProjects(), ["alpha", "beta"]);
});

test("04 Frontend candidate validates ordered metadata while execution stays Pure DI", () => {
  const compilation = simulateCandidateProfile(FRONTEND_DECLARATIONS, FRONTEND_PROFILE);
  assert.deepEqual(compilation.diagnostics, []);
  assert.deepEqual(compilation.plan?.factoryArguments[2]?.dependencies, {
    logger: null,
    sources: ["recent-projects.claude-source", "recent-projects.codex-source"],
  });
  const feature = createFrontendCandidate(claude, codex);
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
    const result = await discoverDeclarations("agent-runtime", [root], { maxRoots: 1, maxEntries: 2 });
    assert.deepEqual(result.reads, ["admitted/module.declaration.json"]);
    assert.deepEqual(result.declarations.map(item => item.declaration.moduleId), ["runtime.executable-observer"]);
    await assert.rejects(discoverDeclarations("agent-runtime", [root, root], { maxRoots: 1, maxEntries: 2 }), /DISCOVERY_ROOT_LIMIT/u);
  });
});

test("07 discovery and generation perform zero activation factory evaluation", async () => {
  const marker = globalThis as typeof globalThis & { __moduleAuthoringProofActivationEvaluations?: number };
  delete marker.__moduleAuthoringProofActivationEvaluations;
  const agentRuntime = await discoverDeclarations("agent-runtime", [join(proofDirectory, "fixtures", "agent-runtime")]);
  const frontend = await discoverDeclarations("frontend", [join(proofDirectory, "fixtures", "frontend")]);
  generatedOutputs([...agentRuntime.declarations, ...frontend.declarations]);
  assert.equal(agentRuntime.declarations.length, 2);
  assert.equal(frontend.declarations.length, 3);
  assert.equal(marker.__moduleAuthoringProofActivationEvaluations, undefined);
  const sentinels = [
    new URL("./module-authoring-proof/fixtures/agent-runtime/executable-observer/activation-factory.mjs", import.meta.url),
    new URL("./module-authoring-proof/fixtures/frontend/recent-projects/activation-factory.mjs", import.meta.url),
  ];
  for (const sentinel of sentinels) {
    const source = await readFile(fileURLToPath(sentinel), "utf8");
    await execFileAsync(process.execPath, ["--input-type=module", "--eval", `${source}\nif (globalThis.__moduleAuthoringProofActivationEvaluations !== 1) process.exit(2);`]);
  }
  assert.equal(marker.__moduleAuthoringProofActivationEvaluations, undefined);
  delete marker.__moduleAuthoringProofActivationEvaluations;
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
  const result = simulateCandidateProfile([duplicate, ...AGENT_RUNTIME_DECLARATIONS], AGENT_RUNTIME_PROFILE);
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
  const result = simulateCandidateProfile(AGENT_RUNTIME_DECLARATIONS, profile);
  assert.deepEqual(result.diagnostics.map(item => item.code), ["MISSING_REQUIRED"]);
  assert.equal(result.plan, undefined);
});

test("11 optional absence is explicit and ordered many follows profile order", () => {
  const profile = mutableProfile(FRONTEND_PROFILE);
  profile.bindings["recent-projects.feature.sources"] = [
    "recent-projects.codex-source",
    "recent-projects.claude-source",
  ];
  const result = simulateCandidateProfile(FRONTEND_DECLARATIONS, profile);
  assert.deepEqual(result.diagnostics, []);
  assert.deepEqual(result.plan?.factoryArguments[2]?.dependencies, {
    logger: null,
    sources: ["recent-projects.codex-source", "recent-projects.claude-source"],
  });
  delete profile.bindings["recent-projects.feature.logger"];
  assert.deepEqual(simulateCandidateProfile(FRONTEND_DECLARATIONS, profile).diagnostics.map(item => item.code), ["OPTIONAL_NOT_EXPLICIT"]);
});

test("12 a disabled root is rejected", () => {
  const profile = mutableProfile(FRONTEND_PROFILE);
  profile.enabledModules.pop();
  profile.selectedLoaders.pop();
  const result = simulateCandidateProfile(FRONTEND_DECLARATIONS, profile);
  assert.equal(result.diagnostics.some(item => item.code === "DISABLED_ROOT"), true);
});

test("13 disabling a required provider computes the complete impact closure", () => {
  const application: LocatedDeclaration = {
    declarationPath: "application/module.declaration.json",
    declaration: {
      schemaVersion: 1,
      consumer: "agent-runtime",
      moduleId: "runtime.application",
      loaderKey: "runtime.application",
      provides: ["runtime.application/v1"],
      dependencies: { required: [{ slot: "discovery", capability: "runtime.installation-discovery/v1" }], optional: [], many: [] },
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
  assert.equal(simulateCandidateProfile([...AGENT_RUNTIME_DECLARATIONS, application], profile).diagnostics.some(item => item.code === "DISABLED_REQUIRED"), true);
});

test("14 disabling an explicitly selected optional dependency is diagnosed", () => {
  const logger: LocatedDeclaration = {
    declarationPath: "logger/module.declaration.json",
    declaration: {
      schemaVersion: 1,
      consumer: "frontend",
      moduleId: "recent-projects.logger",
      loaderKey: "recent-projects.logger",
      provides: ["recent-projects.logger/v1"],
      dependencies: { required: [], optional: [], many: [] },
    },
  };
  const profile = mutableProfile(FRONTEND_PROFILE);
  profile.bindings["recent-projects.feature.logger"] = "recent-projects.logger";
  const result = simulateCandidateProfile([...FRONTEND_DECLARATIONS, logger], profile);
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

test("17 duplicate selected loader keys fail closed", () => {
  const profile = mutableProfile(AGENT_RUNTIME_PROFILE);
  profile.selectedLoaders = ["runtime.installation-discovery", "runtime.installation-discovery"];
  assert.deepEqual(simulateCandidateProfile(AGENT_RUNTIME_DECLARATIONS, profile).diagnostics.map(item => item.code), ["DUPLICATE_PROFILE_LOADER"]);
});

test("18 generated AI inventory is deterministic and exposes nominal handles", () => {
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
    await writeFile(join(root, "obsolete.generated.ts"), "obsolete\n", "utf8");
    assert.deepEqual(await staleGenerated(root, AGENT_RUNTIME_DECLARATIONS), [
      "module-handles.ts",
      "obsolete.generated.ts",
    ]);
  });
});

test("19b ambiguous previous move restores the old generation before fallible staging cleanup", async () => {
  await withTemp(async root => {
    await emitGenerated(root, AGENT_RUNTIME_DECLARATIONS);
    const replacement = changedAgentRuntimeGeneration();
    let previousMoveInjected = false;
    const realOperations: GenerationFileOperations = { lstat, mkdtemp, rename, rm, writeFile };
    const failingOperations: GenerationFileOperations = {
      ...realOperations,
      async rename(source, destination) {
        if (!previousMoveInjected && String(source) === root && String(destination).includes(".backup-")) {
          previousMoveInjected = true;
          await rename(source, destination);
          throw new Error("INJECTED_AFTER_PREVIOUS_MOVE");
        }
        await rename(source, destination);
      },
      async rm(path, options) {
        if (String(path).includes(".staging-")) throw new Error("INJECTED_STAGING_CLEANUP_FAILURE");
        await rm(path, options);
      },
    };
    await assert.rejects(
      emitGenerated(root, replacement, failingOperations),
      /GENERATION_PUBLICATION_AND_RECOVERY_FAILED/u,
    );
    assert.deepEqual(await staleGenerated(root, AGENT_RUNTIME_DECLARATIONS), []);
    assert.notDeepEqual(await staleGenerated(root, replacement), []);
    const parentEntries = await readdir(dirname(root));
    const backupPrefix = `.${basename(root)}.backup-`;
    const stagingPrefix = `.${basename(root)}.staging-`;
    assert.equal(parentEntries.some(name => name.startsWith(backupPrefix)), false);
    const stagingArtifacts = parentEntries.filter(name => name.startsWith(stagingPrefix));
    assert.equal(stagingArtifacts.length, 1);
    await Promise.all(stagingArtifacts.map(name => rm(join(dirname(root), name), { recursive: true, force: true })));
  });
});

test("19c committed replacement reports backup cleanup failure without reverting the new generation", async () => {
  await withTemp(async root => {
    await emitGenerated(root, AGENT_RUNTIME_DECLARATIONS);
    const replacement = changedAgentRuntimeGeneration();
    let backupRemovals = 0;
    const failingOperations: GenerationFileOperations = {
      lstat,
      mkdtemp,
      rename,
      async rm(path, options) {
        if (String(path).includes(".backup-") && ++backupRemovals === 2) {
          throw new Error("INJECTED_BACKUP_CLEANUP_FAILURE");
        }
        await rm(path, options);
      },
      writeFile,
    };
    await assert.rejects(
      emitGenerated(root, replacement, failingOperations),
      /GENERATION_PUBLISHED_BACKUP_CLEANUP_FAILED/u,
    );
    assert.deepEqual(await staleGenerated(root, replacement), []);
    assert.notDeepEqual(await staleGenerated(root, AGENT_RUNTIME_DECLARATIONS), []);
    const parentEntries = await readdir(dirname(root));
    const backupPrefix = `.${basename(root)}.backup-`;
    const backupArtifacts = parentEntries.filter(name => name.startsWith(backupPrefix));
    assert.equal(backupArtifacts.length, 1);
    await Promise.all(backupArtifacts.map(name => rm(join(dirname(root), name), { recursive: true, force: true })));
  });
});

test("20 a plugin-shaped envelope maps to an ordinary product-owned contribution outside the generic grammar", () => {
  const pluginEnvelope = Object.freeze({
    contributionKind: "recent-project-source",
    moduleId: "recent-projects.claude-source",
  });
  const declaration = FRONTEND_DECLARATIONS.find(item => item.declaration.moduleId === pluginEnvelope.moduleId)?.declaration;
  assert.equal(declaration?.provides.includes("recent-projects.source/v1"), true);
  const contribution: RecentProjectSource = claude;
  assert.deepEqual(contribution.list(), ["alpha"]);
  assert.equal("contributionKind" in declaration!, false);
  assert.equal("install" in contribution, false);
  assert.equal("plugin" in contribution, false);
});

test("21 framework, graph, lifecycle, and container imports do not leak into fixture APIs", async () => {
  const publicProofSources = await Promise.all([
    "agent-runtime-fixture.ts", "agent-runtime-baseline.ts", "agent-runtime-candidate.ts",
    "frontend-fixture.ts", "frontend-baseline.ts", "frontend-candidate.ts",
  ].map(name => readFile(join(proofDirectory, name), "utf8")));
  for (const text of publicProofSources) {
    const imports = text.split("\n").filter(line => line.startsWith("import ")).join("\n");
    assert.equal(/\b(?:Graph|Lifecycle|Container|ServiceLocator)\b/u.test(imports), false);
    assert.equal(imports.includes("import("), false);
    assert.equal(imports.includes("@deepseek-ai"), false);
  }
});

test("22 data projections are structuredClone safe while activation factories remain separate", () => {
  const compilation = simulateCandidateProfile(FRONTEND_DECLARATIONS, FRONTEND_PROFILE);
  const projections = {
    declarations: FRONTEND_DECLARATIONS.map(item => item.declaration),
    profile: FRONTEND_PROFILE,
    diagnostics: compilation.diagnostics,
    inventory: JSON.parse(generatedOutputs(FRONTEND_DECLARATIONS)["module-inventory.json"]!),
  };
  assert.deepEqual(structuredClone(projections), projections);
  assert.throws(() => structuredClone(createFrontendBaseline), /could not be cloned/u);
});

test("23 packed private consumer installs, typechecks, and executes with the repository-compatible toolchain", async () => {
  await withTemp(async root => {
    const packageRoot = join(root, "package");
    const packRoot = join(root, "pack");
    const consumerRoot = join(root, "consumer");
    const commandEnvironment = {
      ...process.env,
      XDG_DATA_HOME: join(root, ".xdg", "data"),
      XDG_CONFIG_HOME: join(root, ".xdg", "config"),
      XDG_CACHE_HOME: join(root, ".xdg", "cache"),
      PNPM_HOME: join(root, ".pnpm-home"),
    };
    await mkdir(packageRoot, { recursive: true });
    await mkdir(packRoot, { recursive: true });
    await mkdir(consumerRoot, { recursive: true });
    assert.match((await execPnpm(["--version"], { cwd: root, env: commandEnvironment })).trim(), /^11\./u);
    const { stdout: typescriptVersion } = await execFileAsync(process.execPath, [typescriptCli, "--version"], { cwd: root, env: commandEnvironment });
    assert.equal(String(typescriptVersion).trim(), "Version 7.0.2");
    const generated = generatedOutputs(AGENT_RUNTIME_DECLARATIONS);
    await writeFile(join(packageRoot, "index.ts"), generated["module-handles.ts"]!);
    await writeFile(join(packageRoot, "index.js"), generated["module-handles.js"]!);
    await writeFile(join(packageRoot, "package.json"), JSON.stringify({ name: "@proof/inventory", version: "1.0.0", type: "module", packageManager: "pnpm@11.18.0", files: ["index.ts", "index.js"], exports: { ".": { types: "./index.ts", import: "./index.js" } } }));
    await execPnpm(["pack", "--pack-destination", packRoot], { cwd: packageRoot, env: commandEnvironment });
    const tarball = join(packRoot, "proof-inventory-1.0.0.tgz");
    await writeFile(join(consumerRoot, "package.json"), JSON.stringify({ private: true, type: "module", packageManager: "pnpm@11.18.0", dependencies: { "@proof/inventory": `file:${tarball}` } }));
    await writeFile(join(consumerRoot, "consumer.ts"), [
      'import { RuntimeExecutableObserver, RuntimeInstallationDiscovery, type ModuleId } from "@proof/inventory";',
      'const identity: ModuleId<"runtime.installation-discovery"> = RuntimeInstallationDiscovery;',
      'const observer: ModuleId<"runtime.executable-observer"> = RuntimeExecutableObserver;',
      'void identity;',
      'void observer;',
    ].join("\n"));
    await writeFile(join(consumerRoot, "consumer.mjs"), [
      'import { RuntimeExecutableObserver, RuntimeInstallationDiscovery } from "@proof/inventory";',
      'if (RuntimeInstallationDiscovery !== "runtime.installation-discovery") process.exit(2);',
      'if (RuntimeExecutableObserver !== "runtime.executable-observer") process.exit(3);',
    ].join("\n"));
    await writeFile(join(consumerRoot, "tsconfig.json"), JSON.stringify({
      compilerOptions: {
        module: "NodeNext",
        moduleResolution: "NodeNext",
        noEmit: true,
        strict: true,
      },
      files: ["consumer.ts"],
    }));
    await execPnpm(["install", "--offline", "--ignore-workspace", "--frozen-lockfile=false"], { cwd: consumerRoot, env: commandEnvironment });
    await execFileAsync(process.execPath, [typescriptCli, "--project", join(consumerRoot, "tsconfig.json"), "--pretty", "false"], { cwd: consumerRoot, env: commandEnvironment });
    await execFileAsync(process.execPath, [join(consumerRoot, "consumer.mjs")], { cwd: consumerRoot, env: commandEnvironment });
    const packedSurface = await readFile(join(consumerRoot, "node_modules", "@proof", "inventory", "index.ts"), "utf8");
    assert.equal(packedSurface.includes("unique symbol"), true);
    assert.equal(/Declaration|SyntheticCandidateProfile|Diagnostic|FactoryArgument/u.test(packedSurface), false);
  });
});

test("24 complete baseline/candidate measurement separates L1, L5, and synthetic evidence", async () => {
  const first = await measureProof(measurementInput);
  const second = await measureProof(measurementInput);
  assert.deepEqual(second, first);
  assert.deepEqual(first.contextualSourceLocks, CONTEXT_REVISIONS);
  assert.equal(first.adrProductionGlueRatio, "not-applicable-production-loc-zero");
  assert.equal(first.baselineWiringLoc, 23);
  assert.equal(first.candidateProductLoc, 165);
  assert.equal(first.genericProofGlueLoc, 752);
  assert.equal(first.candidateWithGenericLoc, 917);
  assert.equal(first.genericProofGlueRatio, 4.557576);
  assert.deepEqual(first.fileCounts, { baseline: 2, candidateProduct: 13, genericProof: 4 });
  assert.deepEqual(first.syntacticBindingMarkerSites, { baseline: 2, candidate: 4 });
  assert.deepEqual(first.syntacticBindingMarkerFiles, { baseline: 2, candidate: 4 });
  assert.equal(first.disposableExecutablePercent, 94);
  assert.equal(first.genericProofGlueRatio > 0.3, true);
  assert.deepEqual(first.governedAdmission, {
    agentRuntimeL1: "NO-GO-MEASUREMENT-CANDIDATE",
    frontendL1: "NO-GO-MEASUREMENT-CANDIDATE",
    sharedL5: "NO-GO",
  });
  assert.equal(first.verdict, "NO-GO");
  assert.deepEqual(first.l1NoGoReasons, ["canonical-consumer-admission-l1-no-go"]);
  assert.equal(first.l1ReconsiderWhen, "owning-product-benchmark-exists");
  assert.deepEqual(first.l5NoGoReasons, ["canonical-consumer-admission-l5-no-go"]);
  assert.equal(first.l5ReconsiderWhen, "second-real-consumer-and-executable-conformance-exist");
  assert.deepEqual(first.syntheticNegativeSignals, ["synthetic-generic-proof-glue-ratio-above-0.3"]);
  assert.equal(first.maintenanceDisposition, "delete-executable-proof-before-merge");
});

test("25 Orchestrator non-admission is read from the governed qualification authority", async () => {
  const admission = await readFile(join(fixtureDirectory, "..", "..", "docs", "qualification", "module-system-v1-productization", "consumer-admission.md"), "utf8");
  assert.match(admission, new RegExp("\\| Orchestrator \\| `" + CONTEXT_REVISIONS.orchestrator + "` \\|[^\\n]*`L1-L5_NO_GO`", "u"));
});

test("26 diagnostics are immutable and sorted independently of discovery order", () => {
  const malformed = validateDeclaration({}, "z/module.declaration.json", "frontend").diagnostics;
  const reversed = [...malformed].reverse();
  assert.deepEqual(reversed.map(item => item.code).sort(binaryCompare), malformed.map(item => item.code).sort(binaryCompare));
  assert.equal(malformed.every(item => Object.isFrozen(item) && Object.isFrozen(item.relatedPaths)), true);
  assert.equal(malformed.every(item => !item.declarationPath.startsWith("/") && !("stack" in item) && !("timestamp" in item)), true);
});

test("27 checked-in fixed-name JSON is the sole fixture declaration authority", async () => {
  const root = join(proofDirectory, "fixtures", "frontend");
  const discovered = await discoverDeclarations("frontend", [root]);
  assert.deepEqual(discovered.declarations, FRONTEND_DECLARATIONS);
  for (const name of ["agent-runtime-candidate.ts", "frontend-candidate.ts"]) {
    const fixtureSource = await readFile(join(proofDirectory, name), "utf8");
    assert.equal(fixtureSource.includes("schemaVersion"), false);
    assert.equal(fixtureSource.includes("provides:"), false);
  }
});

test("28 declaration admission rejects unknown fields and duplicate provides", () => {
  const raw = structuredClone(FRONTEND_DECLARATIONS[0]!.declaration) as unknown as Record<string, unknown>;
  raw.future = true;
  raw.provides = ["recent-projects.source/v1", "recent-projects.source/v1"];
  assert.deepEqual(validateDeclaration(raw, "candidate/module.declaration.json", "frontend").diagnostics.map(item => item.code), [
    "DUPLICATE_PROVIDES", "UNKNOWN_FIELD",
  ]);
});

test("29 profile admission rejects unknown fields and duplicate roots, modules, bindings, and loaders", () => {
  const duplicate = {
    consumer: "frontend",
    roots: ["recent-projects.feature", "recent-projects.feature"],
    enabledModules: ["recent-projects.feature", "recent-projects.feature"],
    bindings: [
      { slot: "recent-projects.feature.logger", value: null },
      { slot: "recent-projects.feature.logger", value: null },
    ],
    selectedLoaders: ["recent-projects.feature", "recent-projects.feature"],
    future: true,
  };
  assert.deepEqual(validateSyntheticCandidateProfile(duplicate).diagnostics.map(item => item.code), [
    "DUPLICATE_PROFILE_BINDING",
    "DUPLICATE_PROFILE_LOADER",
    "DUPLICATE_PROFILE_MODULE",
    "DUPLICATE_PROFILE_ROOT",
    "UNKNOWN_FIELD",
  ]);
});

test("30 unique module IDs admit while conflicting IDs fail deterministically", () => {
  assert.deepEqual(simulateCandidateProfile(AGENT_RUNTIME_DECLARATIONS, AGENT_RUNTIME_PROFILE).diagnostics, []);
  const duplicate = { ...AGENT_RUNTIME_DECLARATIONS[0]!, declarationPath: "zz/module.declaration.json" };
  assert.deepEqual(simulateCandidateProfile([duplicate, ...AGENT_RUNTIME_DECLARATIONS], AGENT_RUNTIME_PROFILE).diagnostics.map(item => item.code), ["DUPLICATE_MODULE"]);
});

test("31 declaration ownership is local to the admitted consumer", async () => {
  const compile = simulateCandidateProfile([FRONTEND_DECLARATIONS[0]!, ...AGENT_RUNTIME_DECLARATIONS], AGENT_RUNTIME_PROFILE);
  assert.equal(compile.diagnostics.some(item => item.code === "OWNER_CONSUMER_MISMATCH"), true);
  await withTemp(async root => {
    await mkdir(join(root, "foreign"), { recursive: true });
    await writeDeclaration(root, "foreign", FRONTEND_DECLARATIONS[0]!.declaration);
    const discovery = await discoverDeclarations("agent-runtime", [root]);
    assert.deepEqual(discovery.diagnostics.map(item => item.code), ["OWNER_CONSUMER_MISMATCH"]);
  });
});

test("32 optional and ordered-many slots admit explicit 0, 1, and many cardinalities", () => {
  const zero = mutableProfile(FRONTEND_PROFILE);
  zero.bindings["recent-projects.feature.sources"] = [];
  assert.deepEqual(simulateCandidateProfile(FRONTEND_DECLARATIONS, zero).plan?.factoryArguments[2]?.dependencies.sources, []);
  const one = mutableProfile(FRONTEND_PROFILE);
  one.bindings["recent-projects.feature.sources"] = ["recent-projects.codex-source"];
  assert.deepEqual(simulateCandidateProfile(FRONTEND_DECLARATIONS, one).plan?.factoryArguments[2]?.dependencies.sources, ["recent-projects.codex-source"]);
  assert.deepEqual(simulateCandidateProfile(FRONTEND_DECLARATIONS, FRONTEND_PROFILE).plan?.factoryArguments[2]?.dependencies.sources, [
    "recent-projects.claude-source", "recent-projects.codex-source",
  ]);
  const logger = located("recent-projects.logger", ["recent-projects.logger/v1"]);
  const optional = mutableProfile(FRONTEND_PROFILE);
  optional.enabledModules.push("recent-projects.logger");
  optional.selectedLoaders.push("recent-projects.logger");
  optional.bindings["recent-projects.feature.logger"] = "recent-projects.logger";
  assert.equal(simulateCandidateProfile([...FRONTEND_DECLARATIONS, logger], optional).plan?.factoryArguments[2]?.dependencies.logger, "recent-projects.logger");
  optional.bindings["recent-projects.feature.logger"] = [];
  assert.deepEqual(simulateCandidateProfile([...FRONTEND_DECLARATIONS, logger], optional).diagnostics.map(item => item.code), ["OPTIONAL_NOT_SINGLE"]);
});

test("33 ordered-many rejects a duplicate provider ID", () => {
  const profile = mutableProfile(FRONTEND_PROFILE);
  profile.bindings["recent-projects.feature.sources"] = ["recent-projects.claude-source", "recent-projects.claude-source"];
  assert.deepEqual(simulateCandidateProfile(FRONTEND_DECLARATIONS, profile).diagnostics.map(item => item.code), ["DUPLICATE_MANY_PROVIDER"]);
});

test("34 required binding never falls back to exactly one or ambiguous installed providers", () => {
  const missing = mutableProfile(AGENT_RUNTIME_PROFILE);
  delete missing.bindings["runtime.installation-discovery.executableFileObserver"];
  assert.deepEqual(simulateCandidateProfile(AGENT_RUNTIME_DECLARATIONS, missing).diagnostics.map(item => item.code), ["MISSING_REQUIRED"]);
  const alternate = located("runtime.alternate-observer", ["runtime.executable-observation/v1"], undefined, "agent-runtime");
  missing.enabledModules.push(alternate.declaration.moduleId);
  missing.selectedLoaders.push(alternate.declaration.loaderKey);
  assert.equal(simulateCandidateProfile([...AGENT_RUNTIME_DECLARATIONS, alternate], missing).diagnostics.some(item => item.code === "MISSING_REQUIRED"), true);
});

test("35 incompatible capability versions differ from unrelated mismatches", () => {
  const versioned = mutableProfile(AGENT_RUNTIME_PROFILE);
  const v2 = located("runtime.v2-observer", ["runtime.executable-observation/v2"], undefined, "agent-runtime");
  versioned.enabledModules.push(v2.declaration.moduleId);
  versioned.selectedLoaders.push(v2.declaration.loaderKey);
  versioned.bindings["runtime.installation-discovery.executableFileObserver"] = v2.declaration.moduleId;
  assert.equal(simulateCandidateProfile([...AGENT_RUNTIME_DECLARATIONS, v2], versioned).diagnostics.some(item => item.code === "INCOMPATIBLE_CAPABILITY_VERSION"), true);
  const unrelated = located("runtime.logger", ["runtime.logging/v1"], undefined, "agent-runtime");
  versioned.enabledModules = versioned.enabledModules.filter(id => id !== v2.declaration.moduleId);
  versioned.selectedLoaders = versioned.selectedLoaders.filter(id => id !== v2.declaration.loaderKey);
  versioned.enabledModules.push(unrelated.declaration.moduleId);
  versioned.selectedLoaders.push(unrelated.declaration.loaderKey);
  versioned.bindings["runtime.installation-discovery.executableFileObserver"] = unrelated.declaration.moduleId;
  assert.equal(simulateCandidateProfile([...AGENT_RUNTIME_DECLARATIONS, unrelated], versioned).diagnostics.some(item => item.code === "CAPABILITY_MISMATCH"), true);
});

test("36 static explicit bindings reject cycles with deterministic admission diagnostics", () => {
  const left = located("cycle.left", ["cycle.left/v1"], { required: [{ slot: "right", capability: "cycle.right/v1" }], optional: [], many: [] });
  const right = located("cycle.right", ["cycle.right/v1"], { required: [{ slot: "left", capability: "cycle.left/v1" }], optional: [], many: [] });
  const profile: SyntheticCandidateProfile = {
    consumer: "frontend",
    roots: ["cycle.left"],
    enabledModules: ["cycle.right", "cycle.left"],
    bindings: { "cycle.left.right": "cycle.right", "cycle.right.left": "cycle.left" },
    selectedLoaders: ["cycle.right", "cycle.left"],
  };
  const forward = simulateCandidateProfile([left, right], profile).diagnostics;
  const reverse = simulateCandidateProfile([right, left], { ...profile, enabledModules: [...profile.enabledModules].reverse(), selectedLoaders: [...profile.selectedLoaders].reverse() }).diagnostics;
  assert.deepEqual(forward, reverse);
  assert.deepEqual(forward.map(item => item.code), ["STATIC_PROFILE_CYCLE"]);
});

test("37 unknown roots, enabled modules, bindings, and loaders all fail closed", () => {
  const profile = mutableProfile(FRONTEND_PROFILE);
  profile.roots.push("unknown.root");
  profile.enabledModules.push("unknown.module");
  profile.bindings["unknown.module.slot"] = null;
  profile.selectedLoaders.push("unknown.loader");
  const codes = simulateCandidateProfile(FRONTEND_DECLARATIONS, profile).diagnostics.map(item => item.code);
  assert.equal(codes.includes("UNKNOWN_ROOT"), true);
  assert.equal(codes.includes("UNKNOWN_ENABLED_MODULE"), true);
  assert.equal(codes.includes("UNKNOWN_BINDING"), true);
  assert.equal(codes.includes("UNKNOWN_LOADER"), true);
});

test("38 plans, inventories, and diagnostics ignore non-semantic input permutations", () => {
  const baseline = mutableProfile(FRONTEND_PROFILE);
  baseline.roots.push("recent-projects.claude-source");
  const profile = mutableProfile(baseline);
  profile.roots.reverse();
  profile.enabledModules.reverse();
  profile.selectedLoaders.reverse();
  profile.bindings = Object.fromEntries(Object.entries(profile.bindings).reverse());
  assert.deepEqual(simulateCandidateProfile([...FRONTEND_DECLARATIONS].reverse(), profile).plan, simulateCandidateProfile(FRONTEND_DECLARATIONS, baseline).plan);
  assert.deepEqual(generatedOutputs([...FRONTEND_DECLARATIONS].reverse()), generatedOutputs(FRONTEND_DECLARATIONS));
  const duplicate = { ...FRONTEND_DECLARATIONS[0]!, declarationPath: "z/module.declaration.json" };
  assert.deepEqual(
    simulateCandidateProfile([duplicate, ...FRONTEND_DECLARATIONS], baseline).diagnostics,
    simulateCandidateProfile([...FRONTEND_DECLARATIONS].reverse().concat(duplicate), profile).diagnostics,
  );
});

test("39 discovery enforces declaration byte and duplicate-root bounds with relative errors", async () => {
  await withTemp(async root => {
    await mkdir(join(root, "large"), { recursive: true });
    await writeFile(join(root, "large", "module.declaration.json"), " ".repeat(20));
    await assert.rejects(discoverDeclarations("frontend", [root], { maxRoots: 1, maxEntries: 1, maxDeclarationBytes: 10 }), /DISCOVERY_DECLARATION_BYTE_LIMIT:large\/module\.declaration\.json/u);
    await assert.rejects(discoverDeclarations("frontend", [root, root], { maxRoots: 2, maxEntries: 2 }), /DISCOVERY_DUPLICATE_ROOT/u);
  });
});

test("40 diagnostics sanitize absolute and traversal paths", () => {
  const diagnostics = validateDeclaration({}, "/var/private/../secret.json", "frontend").diagnostics;
  assert.equal(diagnostics.every(item => item.declarationPath === "unsafe-path"), true);
  assert.equal(JSON.stringify(diagnostics).includes("/var/"), false);
});

test("41 capability declarations require an explicit nonzero contract version", () => {
  const raw = structuredClone(FRONTEND_DECLARATIONS[0]!.declaration) as unknown as Record<string, unknown>;
  raw.provides = ["recent-projects.source"];
  assert.deepEqual(validateDeclaration(raw, "candidate/module.declaration.json", "frontend").diagnostics.map(item => item.code), ["DECLARATION_FIELD"]);
});

test("42 loader and generated handle identities reject collisions", () => {
  const alphaDot = located("alpha.beta", ["alpha.beta/v1"]);
  const alphaDash = located("alpha-beta", ["alpha-beta/v1"]);
  const alphaDashSameLoader: LocatedDeclaration = {
    ...alphaDash,
    declaration: { ...alphaDash.declaration, loaderKey: alphaDot.declaration.loaderKey },
  };
  const profile = {
    consumer: "frontend",
    roots: ["alpha.beta"],
    enabledModules: ["alpha.beta", "alpha-beta"],
    bindings: {},
    selectedLoaders: ["alpha.beta"],
  } satisfies SyntheticCandidateProfile;
  assert.equal(simulateCandidateProfile([alphaDot, alphaDashSameLoader], profile).diagnostics.some(item => item.code === "DUPLICATE_LOADER_KEY"), true);
  assert.throws(() => generatedOutputs([alphaDot, alphaDash]), /GENERATED_HANDLE_COLLISION:AlphaBeta/u);
});

test("43 literal loader selection validates the complete set before evaluating anything", () => {
  const trace: string[] = [];
  const table = Object.freeze({ valid: () => trace.push("valid") });
  assert.throws(() => evaluateSelectedLoaders(table, ["valid", "invalid"]), /INVALID_LITERAL_LOADER:invalid/u);
  assert.throws(() => evaluateSelectedLoaders(table, ["valid", "valid"]), /DUPLICATE_LITERAL_LOADER/u);
  const accessorTable = Object.defineProperty({}, "accessor", {
    enumerable: true,
    get: () => {
      trace.push("accessor");
      return () => undefined;
    },
  }) as Readonly<Record<string, () => unknown>>;
  assert.throws(() => evaluateSelectedLoaders(accessorTable, ["accessor"]), /INVALID_LITERAL_LOADER:accessor/u);
  assert.deepEqual(trace, []);
});

test("44 discovery rejects unsafe declarations and charges every enumerated entry", async () => {
  await withTemp(async root => {
    await mkdir(join(root, "one"), { recursive: true });
    await mkdir(join(root, "two"), { recursive: true });
    await assert.rejects(discoverDeclarations("frontend", [root], { maxRoots: 1, maxEntries: 1 }), /DISCOVERY_ENTRY_LIMIT/u);

    if (process.platform !== "win32") {
      const outside = join(root, "outside.json");
      await writeFile(outside, JSON.stringify(FRONTEND_DECLARATIONS[0]!.declaration));
      await symlink(outside, join(root, "one", "module.declaration.json"));
      await assert.rejects(discoverDeclarations("frontend", [root]), /DISCOVERY_DECLARATION_NOT_REGULAR:one\/module\.declaration\.json/u);
    }
  });
  await withTemp(async root => {
    await writeFile(join(root, "ignored-a.txt"), "a");
    await writeFile(join(root, "ignored-b.txt"), "b");
    await assert.rejects(discoverDeclarations("frontend", [root], { maxRoots: 1, maxEntries: 1 }), /DISCOVERY_ENTRY_LIMIT/u);
  });
  await withTemp(async root => {
    await mkdir(join(root, "duplicate-json"), { recursive: true });
    const declaration = FRONTEND_DECLARATIONS[0]!.declaration;
    const duplicateJson = JSON.stringify(declaration).replace(
      `"moduleId":"${declaration.moduleId}"`,
      `"moduleId":"ignored","moduleId":"${declaration.moduleId}"`,
    );
    await writeFile(join(root, "duplicate-json", "module.declaration.json"), duplicateJson);
    const result = await discoverDeclarations("frontend", [root]);
    assert.equal(result.declarations.length, 0);
    assert.equal(result.diagnostics.length > 0, true);
  });
});

test("45 multi-root diagnostics remain deterministic when input roots are reversed", async () => {
  await withTemp(async root => {
    const firstRoot = join(root, "a-root");
    const secondRoot = join(root, "b-root");
    await mkdir(join(firstRoot, "shared"), { recursive: true });
    await mkdir(join(secondRoot, "shared"), { recursive: true });
    const alpha = located("alpha", ["alpha/v1"]);
    const beta = located("beta", ["beta/v1"]);
    await writeDeclaration(firstRoot, "shared", { ...alpha.declaration, loaderKey: "shared.loader" });
    await writeDeclaration(secondRoot, "shared", { ...beta.declaration, loaderKey: "shared.loader" });
    const first = { rootId: "first", path: firstRoot } as const;
    const second = { rootId: "second", path: secondRoot } as const;
    const forward = await discoverDeclarations("frontend", [first, second]);
    const reverse = await discoverDeclarations("frontend", [second, first]);
    assert.deepEqual(reverse, forward);
    assert.deepEqual(forward.reads, [
      "first/shared/module.declaration.json",
      "second/shared/module.declaration.json",
    ]);
    const profile = {
      consumer: "frontend",
      roots: ["alpha"],
      enabledModules: ["alpha", "beta"],
      bindings: {},
      selectedLoaders: ["shared.loader"],
    } satisfies SyntheticCandidateProfile;
    assert.deepEqual(
      simulateCandidateProfile(forward.declarations, profile).diagnostics,
      simulateCandidateProfile(reverse.declarations, profile).diagnostics,
    );
  });
});

test("46 prototype-like binding keys remain visible and fail closed", () => {
  const raw = structuredClone(FRONTEND_PROFILE) as unknown as Record<string, unknown>;
  raw.bindings = JSON.parse('{"__proto__":null}') as unknown;
  const checked = validateSyntheticCandidateProfile(raw);
  assert.notEqual(checked.profile, undefined);
  const result = simulateCandidateProfile(FRONTEND_DECLARATIONS, checked.profile!);
  assert.equal(result.diagnostics.some(item => item.code === "UNKNOWN_BINDING" && item.fieldPath.endsWith(".__proto__")), true);
});
