import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";

import { parse } from "yaml";

const root = resolve(import.meta.dirname, "..", "..");
const dossier = resolve(root, "docs", "qualification", "module-system-v1-productization");
const universal = resolve(root, "docs", "qualification", "universal-module-extension-system");
const gitObject = /^[a-f0-9]{40}$/u;

interface SourceEvidence {
  readonly status: string;
  readonly verification: {
    readonly command: string;
    readonly authority: string;
    readonly promotionAuthority: boolean;
  };
  readonly products: Record<string, {
    readonly repository: string;
    readonly commit: string;
    readonly tree: string;
    readonly files: readonly {
      readonly path: string;
      readonly blob: string;
      readonly symbols: readonly string[];
    }[];
    readonly negativeSearch: {
      readonly pattern: string;
      readonly paths: readonly string[];
      readonly matches: number;
    };
    readonly composition?: {
      readonly kind: "ordered-contributions";
      readonly root: string;
      readonly factory: string;
      readonly moduleResolution: { readonly source: string };
      readonly port: { readonly symbol: string; readonly source: string; readonly moduleSpecifier: string };
      readonly consumer: { readonly symbol: string; readonly source: string; readonly dependency: string };
      readonly orderedProviders: readonly { readonly symbol: string; readonly source: string }[];
    } | {
      readonly kind: "product-capability-root";
      readonly root: string;
      readonly rootFactory: string;
      readonly hostFactory: string;
      readonly contract: {
        readonly source: string;
        readonly moduleSpecifier: string;
        readonly interface: string;
        readonly capabilities: readonly string[];
      };
      readonly featureFactories: readonly {
        readonly symbol: string;
        readonly source: string;
        readonly barrel: string;
        readonly manifest: string;
        readonly moduleSpecifier: string;
        readonly hostDependencies: readonly string[];
      }[];
    };
  }>;
}

interface DecisionLedger {
  readonly requirementDefinitions: readonly {
    readonly id: string;
    readonly kind: "decision" | "evidence";
    readonly currentStatus?: string;
    readonly selfReportedStatusAccepted?: boolean;
  }[];
  readonly implementationGates: readonly {
    readonly id: string;
    readonly allOf: readonly Record<string, string>[];
  }[];
}

test("productization dossier remains active until final exact-head review", async () => {
  for (const name of [
    "authoring-api-and-gap-matrix.md",
    "consumer-admission.md",
    "executive-verdict.md",
    "roadmap.md",
  ]) {
    const document = (await readFile(resolve(dossier, name), "utf8")).replaceAll("\r\n", "\n");
    assert.match(document, /^---\n[\s\S]*?\nstatus: active\n[\s\S]*?\n---\n/u, `${name} must remain active until final exact-head review`);
  }
});

test("product source records remain candidate-only and structurally complete", async () => {
  const evidence = parse(await readFile(resolve(dossier, "consumer-source-evidence.yaml"), "utf8")) as SourceEvidence;
  assert.equal(evidence.status, "candidate-source-records");
  assert.equal(evidence.verification.promotionAuthority, false);
  assert.match(evidence.verification.command, /qualification:product-sources:check/u);
  assert.deepEqual(Object.keys(evidence.products).sort(), ["agentRuntime", "frontend", "orchestrator"]);

  for (const [product, record] of Object.entries(evidence.products)) {
    assert.match(record.repository, /^[^/]+\/[^/]+$/u, `${product} repository`);
    assert.match(record.commit, gitObject, `${product} commit`);
    assert.match(record.tree, gitObject, `${product} tree`);
    assert.ok(record.files.length >= 3, `${product} needs multiple corroborating blobs`);
    assert.equal(new Set(record.files.map(file => file.path)).size, record.files.length, `${product} paths must be unique`);
    for (const file of record.files) {
      assert.ok(!file.path.startsWith("/"), `${product} evidence path must be repository-relative`);
      assert.match(file.blob, gitObject, `${product}:${file.path} blob`);
      assert.ok(file.symbols.every(symbol => symbol.length > 0));
    }
    assert.ok(record.negativeSearch.pattern.length > 0);
    assert.ok(record.negativeSearch.paths.length > 0);
    assert.equal(record.negativeSearch.matches, 0);
  }

  const frontend = evidence.products.frontend;
  assert.equal(frontend?.composition?.kind, "ordered-contributions");
  if (frontend?.composition?.kind !== "ordered-contributions") {
    assert.fail("Frontend must use the ordered-contributions evidence grammar");
  }
  assert.equal(frontend?.composition?.orderedProviders.length, 2);
  assert.equal(frontend?.composition?.factory, "createRecentProjectsFeature");
  assert.equal(frontend?.composition?.moduleResolution.source, "tsconfig.json");
  assert.equal(frontend?.composition?.port.symbol, "RecentProjectsSourcePort");
  assert.equal(frontend?.composition?.consumer.symbol, "ListDashboardRecentProjectsUseCase");
  assert.equal(frontend?.composition?.consumer.dependency, "sources");
  for (const provider of frontend?.composition?.orderedProviders ?? []) {
    assert.ok(frontend?.files.some(file => file.path === provider.source && file.symbols.includes(provider.symbol)));
  }

  const agentRuntime = evidence.products.agentRuntime;
  assert.equal(agentRuntime?.composition?.kind, "product-capability-root");
  if (agentRuntime?.composition?.kind !== "product-capability-root") {
    assert.fail("Agent Runtime must use the product-capability-root evidence grammar");
  }
  assert.equal(agentRuntime?.commit, "7be998237a4c262bee9c4198d554b43cd2757ac6");
  assert.equal(agentRuntime.composition.rootFactory, "createDefaultAgentRuntimeHost");
  assert.equal(agentRuntime.composition.hostFactory, "createAgentRuntimeHost");
  assert.deepEqual(agentRuntime.composition.contract.capabilities, ["claudeCodeSetup", "codexSetup"]);
  assert.equal(agentRuntime.composition.featureFactories.length, 4);
  const hostDependencies = agentRuntime.composition.featureFactories.flatMap(
    factory => factory.hostDependencies,
  );
  assert.ok(agentRuntime.composition.featureFactories.every(factory => factory.hostDependencies.length > 0));
  assert.equal(new Set(hostDependencies).size, hostDependencies.length);
  assert.deepEqual(agentRuntime.negativeSearch.paths, [
    "packages/apps/embedded-runtime/src",
    "packages/contexts/agent-execution/src",
    "packages/contexts/runtime-configuration/src",
    "packages/contexts/runtime-security/src",
  ]);
  assert.ok(agentRuntime?.files.some(file => (
    file.path === "packages/apps/embedded-runtime/src/contracts/runtime-access.ts"
    && file.symbols.includes("RuntimeAccessHandle")
    && file.symbols.includes("CodexRuntimeSetupQueries")
    && file.symbols.includes("ClaudeCodeRuntimeSetupQueries")
  )));
  assert.ok(agentRuntime?.files.some(file => (
    file.path === "packages/apps/embedded-runtime/src/composition/agent-runtime-host.ts"
    && file.symbols.includes("createDefaultAgentRuntimeHost")
  )));
  assert.ok(agentRuntime?.files.some(file => file.path.endsWith("/codex-setup.e2e.test.ts")));
  assert.ok(agentRuntime?.files.some(file => file.path.endsWith("/claude-code-setup.e2e.test.ts")));
  assert.ok(agentRuntime?.files.some(file => file.path.endsWith("/capability-bundle-contract.test.ts")));
});

test("roadmap keeps authoring, selection, lifecycle, process hosting, and extraction independent", async () => {
  const roadmap = parse(await readFile(resolve(dossier, "current-roadmap.yaml"), "utf8")) as {
    readonly projectionKind: string;
    readonly recommendedBaselineForFutureDecision: string;
    readonly levels: readonly { readonly id: string; readonly status: string; readonly prerequisites?: readonly string[] }[];
    readonly aiNavigationBenchmark: {
      readonly status: string;
      readonly productSeams: readonly {
        readonly product: string;
        readonly seam: string;
        readonly tasks: readonly string[];
      }[];
    };
    readonly stopCriteria: readonly {
      readonly id: string;
      readonly appliesTo: readonly string[];
      readonly observableEvidence: string;
      readonly effect: string;
    }[];
  };
  assert.equal(roadmap.projectionKind, "non-authoritative-qualification-recommendation");
  assert.equal(roadmap.recommendedBaselineForFutureDecision, "product-owned-pure-di");
  assert.deepEqual(roadmap.levels.map(level => level.id), ["L0", "L1", "L2", "L3", "L4", "L5"]);
  assert.equal(
    roadmap.levels.find(level => level.id === "L0")?.status,
    "demonstrated-product-pure-di-source-architecture",
  );
  assert.equal(roadmap.levels.find(level => level.id === "L1")?.status, "no-go-measurement-candidate");
  assert.equal(roadmap.aiNavigationBenchmark.status, "product-owned-protocol-required");
  assert.ok(roadmap.levels.find(level => level.id === "L5")?.prerequisites?.includes(
    "package-admission-independence-defect-corrected-by-owning-task",
  ));
  assert.deepEqual(roadmap.aiNavigationBenchmark.productSeams.map(({ product }) => product), [
    "frontend",
    "agent-runtime",
  ]);
  assert.deepEqual(roadmap.aiNavigationBenchmark.productSeams[0]?.tasks, [
    "find-owner-and-composition-root",
    "add-or-remove-provider",
    "change-contribution-order",
    "trace-provider-to-use-case",
  ]);
  assert.deepEqual(roadmap.aiNavigationBenchmark.productSeams[1]?.tasks, [
    "find-owner-and-composition-root",
    "add-or-remove-sibling-capability",
    "wire-explicit-capability-to-host-dependency",
    "trace-capability-through-host-and-access-handle",
    "verify-deterministic-failure-for-missing-required-sibling-capability",
  ]);
  assert.ok(roadmap.stopCriteria.every(criterion => (
    criterion.appliesTo.length > 0
    && criterion.observableEvidence.length > 0
    && criterion.effect.length > 0
  )));
});

test("governance gates do not block Pure DI or trust self-reported provider success", async () => {
  const ledger = parse(await readFile(resolve(universal, "decision-ledger.yaml"), "utf8")) as DecisionLedger;
  const phase0 = ledger.implementationGates.find(gate => gate.id === "phase-0-static-composition-rehearsal");
  const phase1 = ledger.implementationGates.find(gate => gate.id === "phase-1-static-module-authoring");
  const graph = ledger.implementationGates.find(gate => gate.id === "private-runtime-graph");
  assert.ok(phase0);
  assert.ok(phase1);
  assert.ok(graph);
  assert.equal(phase0.allOf.some(entry => entry.decision === "module-authoring-governance-successor"), false);
  assert.equal(phase1.allOf.some(entry => entry.evidence === "module-authoring-governance-successor"), true);
  assert.equal(graph.allOf.some(entry => entry.evidence === "lifecycle-semantic-review"), false);

  const provider = ledger.requirementDefinitions.find(definition => definition.id === "independent-consumer-provider-verification");
  assert.equal(provider?.selfReportedStatusAccepted, false);
  assert.equal(provider?.currentStatus, "missing");
  const successor = ledger.requirementDefinitions.find(definition => definition.id === "module-authoring-governance-successor");
  assert.equal(successor?.kind, "evidence");
  assert.equal(successor?.currentStatus, "missing");
});

test("historical roadmaps cannot present themselves as current execution authority", async () => {
  const historical = await readFile(resolve(universal, "final-recommendation.md"), "utf8");
  assert.doesNotMatch(historical, /sole current recommendation/u);
  assert.doesNotMatch(historical, /^Proceed only with Phase/gmu);
  assert.match(historical, /current-roadmap\.yaml/u);
  assert.match(historical, /only an accepted owning-product decision can authorize execution/u);
});

test("performance evidence remains diagnostic until a calibrated gate exists", async () => {
  const spikeResults = await readFile(resolve(universal, "spike-results.md"), "utf8");
  const conformance = await readFile(resolve(universal, "conformance-plan.md"), "utf8");
  const recommendation = await readFile(resolve(universal, "final-recommendation.md"), "utf8");
  for (const document of [spikeResults, conformance, recommendation]) {
    assert.doesNotMatch(document, /stay(?:s|ed)? within provisional timing caps/u);
    assert.doesNotMatch(document, /10,000-node budget/u);
  }
  assert.match(spikeResults, /non-gating timings/u);
  assert.match(conformance, /No timing or memory threshold is enforced/u);
});

test("evidence ledger local source paths remain reachable", async () => {
  const ledger = parse(await readFile(resolve(dossier, "evidence-ledger.yaml"), "utf8")) as {
    readonly claims: readonly { readonly sources?: readonly string[] }[];
  };
  const localSources = ledger.claims.flatMap(claim => claim.sources ?? [])
    .filter(source => /^(?:architecture|docs|tests)\//u.test(source));
  assert.ok(localSources.length > 0);
  for (const source of localSources) {
    await readFile(resolve(root, source));
  }
});

test("hosted follow-up reports remain non-authoritative corroboration", async () => {
  const ledger = parse(await readFile(resolve(dossier, "evidence-ledger.yaml"), "utf8")) as {
    readonly jobs: readonly { readonly id: string; readonly sourceRevision: string }[];
    readonly followUpReports: {
      readonly status: string;
      readonly decisionAuthority: boolean;
      readonly custody: {
        readonly portableArtifactLocator: string;
        readonly authenticatedReceipt: boolean;
      };
      readonly inputs: {
        readonly extensionFoundation: string;
        readonly agentRuntime: string;
      };
      readonly reports: readonly {
        readonly jobId: string;
        readonly attemptId: string;
        readonly resultSha256: string;
      }[];
    };
  };
  const followUp = ledger.followUpReports;
  assert.equal(followUp.status, "corroboration-only-not-portable-evidence");
  assert.equal(followUp.decisionAuthority, false);
  assert.equal(followUp.custody.portableArtifactLocator, "unavailable");
  assert.equal(followUp.custody.authenticatedReceipt, false);
  assert.match(followUp.inputs.extensionFoundation, gitObject);
  assert.match(followUp.inputs.agentRuntime, gitObject);
  assert.equal(followUp.reports.length, 8);
  for (const report of followUp.reports) {
    assert.ok(report.attemptId.startsWith(`${report.jobId}-`));
    assert.match(report.resultSha256, /^[a-f0-9]{64}$/u);
  }
  assert.equal(
    ledger.jobs.find(job => job.id === "module-v1-audit-agent-runtime-r2")?.sourceRevision,
    "25b2b7f383347466fa74fdd5586c485f5181d8d9",
  );

  const manifest = parse(await readFile(resolve(dossier, "research-manifest.yaml"), "utf8")) as {
    readonly followUp: {
      readonly reportedHostedReviews: number;
      readonly evidenceStatus: string;
      readonly decisionAuthority: boolean;
    };
  };
  assert.equal(manifest.followUp.reportedHostedReviews, 8);
  assert.equal(manifest.followUp.evidenceStatus, "corroboration-only-not-portable");
  assert.equal(manifest.followUp.decisionAuthority, false);
});

test("Cordis remains a scorecard-qualified adapter without a fixed LOC threshold", async () => {
  const authoring = await readFile(resolve(dossier, "authoring-api-and-gap-matrix.md"), "utf8");
  const admission = await readFile(resolve(dossier, "consumer-admission.md"), "utf8");
  const roadmap = await readFile(resolve(dossier, "roadmap.md"), "utf8");
  const oss = await readFile(resolve(universal, "oss-comparison.md"), "utf8");
  assert.match(authoring, /No declarative candidate is preselected/u);
  assert.match(admission, /L0_GO/u);
  assert.match(admission, /L1-L5_NO_GO/u);
  assert.match(admission, /Hosted\s+routing[\s\S]{0,80}excluded/u);
  assert.match(roadmap, /No LOC\s+percentage decides adoption/u);
  assert.doesNotMatch(oss, /75%|25%/u);
});
