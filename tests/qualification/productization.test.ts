import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";

import { parse } from "yaml";

const root = resolve(import.meta.dirname, "..", "..");
const dossier = resolve(root, "docs", "qualification", "module-system-v1-productization");
const universal = resolve(root, "docs", "qualification", "universal-module-extension-system");
const gitObject = /^[a-f0-9]{40}$/u;

interface SourceEvidence {
  readonly schemaVersion: number;
  readonly proofMode: string;
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
    readonly claim: string;
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
    readonly topology: {
      readonly kind: "frontend-literal-provider-list";
      readonly root: string;
      readonly factory: string;
      readonly moduleResolution: { readonly source: string };
      readonly port: { readonly symbol: string; readonly source: string };
      readonly consumer: { readonly symbol: string; readonly source: string; readonly dependency: string };
      readonly orderedProviders: readonly { readonly symbol: string; readonly source: string }[];
      readonly facadeMember: string;
    } | {
      readonly kind: "agent-runtime-named-calls";
      readonly root: string;
      readonly rootFactory: string;
      readonly hostFactory: string;
      readonly contract: {
        readonly source: string;
        readonly interface: string;
        readonly capabilityMembers: Readonly<Record<string, readonly string[]>>;
      };
      readonly featureFactories: readonly {
        readonly symbol: string;
        readonly source: string;
        readonly barrel: string;
        readonly manifest: string;
        readonly moduleSpecifier: string;
      }[];
      readonly hostDependencies: Readonly<Record<string, readonly string[]>>;
    } | {
      readonly kind: "custody-negative-search-only";
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
  assert.equal(evidence.schemaVersion, 2);
  assert.equal(evidence.proofMode, "source-custody-named-topology");
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
  assert.equal(frontend?.topology.kind, "frontend-literal-provider-list");
  if (frontend?.topology.kind !== "frontend-literal-provider-list") {
    assert.fail("Frontend must use the literal provider-list topology grammar");
  }
  assert.equal(frontend.topology.orderedProviders.length, 2);
  assert.equal(frontend.topology.factory, "createRecentProjectsFeature");
  assert.equal(frontend.topology.moduleResolution.source, "tsconfig.json");
  assert.equal(frontend.topology.port.symbol, "RecentProjectsSourcePort");
  assert.equal(frontend.topology.consumer.symbol, "ListDashboardRecentProjectsUseCase");
  assert.equal(frontend.topology.consumer.dependency, "sources");
  assert.equal(frontend.topology.facadeMember, "listDashboardRecentProjects");
  for (const provider of frontend.topology.orderedProviders) {
    assert.ok(frontend?.files.some(file => file.path === provider.source && file.symbols.includes(provider.symbol)));
  }

  const agentRuntime = evidence.products.agentRuntime;
  assert.equal(agentRuntime?.topology.kind, "agent-runtime-named-calls");
  if (agentRuntime?.topology.kind !== "agent-runtime-named-calls") {
    assert.fail("Agent Runtime must use the named-call topology grammar");
  }
  assert.equal(agentRuntime?.commit, "7be998237a4c262bee9c4198d554b43cd2757ac6");
  assert.equal(agentRuntime.topology.rootFactory, "createDefaultAgentRuntimeHost");
  assert.equal(agentRuntime.topology.hostFactory, "createAgentRuntimeHost");
  assert.deepEqual(agentRuntime.topology.contract.capabilityMembers, {
    claudeCodeSetup: ["inspect"],
    codexSetup: ["inspect"],
  });
  assert.equal(agentRuntime.topology.featureFactories.length, 4);
  assert.deepEqual(Object.keys(agentRuntime.topology.hostDependencies), ["claudeCodeSetup", "codexSetup"]);
  assert.ok(Object.values(agentRuntime.topology.hostDependencies).every(dependencies => dependencies.length > 0));
  assert.equal(evidence.products.orchestrator?.topology.kind, "custody-negative-search-only");
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
    readonly projectionRecency: string;
    readonly authority: string;
    readonly recommendedBaselineForFutureDecision: string;
    readonly levels: readonly { readonly id: string; readonly verdict?: string; readonly status: string; readonly prerequisites?: readonly string[] }[];
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
      readonly exception?: string;
    }[];
  };
  assert.equal(roadmap.projectionKind, "non-authoritative-qualification-recommendation");
  assert.equal(roadmap.projectionRecency, "latest");
  assert.equal(roadmap.authority, "accepted-adrs-and-owning-product-decisions");
  assert.equal(roadmap.recommendedBaselineForFutureDecision, "product-owned-pure-di");
  assert.deepEqual(roadmap.levels.map(level => level.id), ["L0", "L1", "L2", "L3", "L4", "L5"]);
  assert.equal(
    roadmap.levels.find(level => level.id === "L0")?.status,
    "demonstrated-exact-source-named-call-topology",
  );
  assert.equal(roadmap.levels.find(level => level.id === "L0")?.verdict, "GO_PRODUCT_SOURCE_TOPOLOGY");
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
  const frameworkGlueStop = roadmap.stopCriteria.find(criterion => (
    criterion.id === "first-two-slices-framework-glue-over-30-percent"
  ));
  assert.deepEqual(frameworkGlueStop, {
    id: "first-two-slices-framework-glue-over-30-percent",
    appliesTo: ["L1", "L2", "L3", "L4", "L5"],
    observableEvidence: "more-than-30-percent-of-changed-production-code-is-generic-framework-glue",
    effect: "stop-or-move-back",
    exception: "safety-requirement-with-explicit-evidence",
  });
  const roadmapDocument = await readFile(resolve(dossier, "roadmap.md"), "utf8");
  assert.match(roadmapDocument, /Moving back or stopping is required[\s\S]{0,160}more than 30%[\s\S]{0,160}generic framework glue/u);
  assert.match(roadmapDocument, /safety requirement can justify that cost only with explicit evidence/u);
  assert.match(roadmapDocument, /stop condition, not an advisory metric/u);
});

test("accepted ADR-0014 operates under ADR-0013 without an invented successor gate", async () => {
  const ledger = parse(await readFile(resolve(universal, "decision-ledger.yaml"), "utf8")) as DecisionLedger;
  const phase0 = ledger.implementationGates.find(gate => gate.id === "phase-0-static-composition-rehearsal");
  const phase1 = ledger.implementationGates.find(gate => gate.id === "phase-1-static-module-authoring");
  const graph = ledger.implementationGates.find(gate => gate.id === "private-runtime-graph");
  assert.ok(phase0);
  assert.ok(phase1);
  assert.ok(graph);
  assert.equal(phase0.allOf.some(entry => entry.decision === "module-authoring-governance-successor"), false);
  assert.equal(phase1.allOf.some(entry => entry.evidence === "module-authoring-governance-successor"), false);
  assert.equal(graph.allOf.some(entry => entry.evidence === "lifecycle-semantic-review"), false);

  const provider = ledger.requirementDefinitions.find(definition => definition.id === "independent-consumer-provider-verification");
  assert.equal(provider?.selfReportedStatusAccepted, false);
  assert.equal(provider?.currentStatus, "missing");
  assert.equal(
    ledger.requirementDefinitions.some(definition => definition.id === "module-authoring-governance-successor"),
    false,
  );
  const verdict = await readFile(resolve(dossier, "executive-verdict.md"), "utf8");
  assert.match(verdict, /ADR-0013 assigns[\s\S]{0,100}ADR-0014 is[\s\S]{0,80}accepted product-local authoring authority under/u);
  assert.match(verdict, /qualification evidence adds no successor gate/u);
});

test("every current product projection uses one exact pinned revision", async () => {
  const expected = {
    agentRuntime: "7be998237a4c262bee9c4198d554b43cd2757ac6",
    orchestrator: "4c5f55366ed8c83f97374b66c8e9f84059c47382",
    frontend: "85c0850e2fc312b995ba3116f8d4aa46dcb0b1dd",
  } as const;
  const evidence = parse(await readFile(resolve(dossier, "consumer-source-evidence.yaml"), "utf8")) as {
    readonly products: Record<keyof typeof expected, { readonly commit: string }>;
  };
  const manifest = parse(await readFile(resolve(dossier, "research-manifest.yaml"), "utf8")) as {
    readonly products: Record<keyof typeof expected, { readonly revision: string }>;
    readonly followUp: { readonly lineage: string; readonly agentRuntimeRevision: string };
  };
  assert.deepEqual(
    Object.fromEntries(Object.entries(evidence.products).map(([product, record]) => [product, record.commit])),
    expected,
  );
  assert.deepEqual(
    Object.fromEntries(Object.entries(manifest.products).map(([product, record]) => [product, record.revision])),
    expected,
  );

  const admission = await readFile(resolve(dossier, "consumer-admission.md"), "utf8");
  const ledger = await readFile(resolve(dossier, "evidence-ledger.yaml"), "utf8");
  const roadmap = await readFile(resolve(dossier, "current-roadmap.yaml"), "utf8");
  for (const revision of Object.values(expected)) {
    assert.match(admission, new RegExp(revision, "u"));
    assert.match(ledger, new RegExp(revision, "u"));
  }
  assert.match(roadmap, new RegExp(`agent-runtime@${expected.agentRuntime}`, "u"));

  const historicalRevision = "493c6c37e247f021fc110c5fc624b72f1502d743";
  assert.equal(manifest.followUp.agentRuntimeRevision, historicalRevision);
  assert.equal(manifest.followUp.lineage, "historical-evidence-superseded-by-current-product-source-records");
  const historicalOccurrences: Record<string, number> = {};
  for (const name of await readdir(dossier)) {
    if (!/\.(?:md|ya?ml)$/u.test(name)) continue;
    const contents = await readFile(resolve(dossier, name), "utf8");
    const count = contents.split(historicalRevision).length - 1;
    if (count > 0) historicalOccurrences[name] = count;
  }
  assert.deepEqual(historicalOccurrences, {
    "evidence-ledger.yaml": 1,
    "research-manifest.yaml": 1,
  });
});

test("source claims stay within the restricted lexical verifier", async () => {
  const evidence = parse(await readFile(resolve(dossier, "consumer-source-evidence.yaml"), "utf8")) as {
    readonly products: { readonly agentRuntime: { readonly claim: string } };
  };
  const claim = evidence.products.agentRuntime.claim;
  assert.match(claim, /direct lexical feature-factory calls preceding one direct host-factory return/u);
  assert.match(claim, /named host dependency properties/u);
  assert.match(claim, /does not show that any reference carries a value/u);
  assert.doesNotMatch(claim, /structurally connected|proves runtime|provider execution/iu);
  const admission = await readFile(resolve(dossier, "consumer-admission.md"), "utf8");
  const roadmap = await readFile(resolve(dossier, "roadmap.md"), "utf8");
  for (const document of [admission, roadmap]) {
    assert.match(document, /direct[\s\S]{0,60}feature-factory calls[\s\S]{0,180}(?:host-factory|createAgentRuntimeHost)[\s\S]{0,30}return/u);
    assert.match(document, /host dependency propert/u);
    assert.doesNotMatch(document, /structurally connected/u);
    assert.doesNotMatch(document, /(?:share|shares|sharing) one (?:bounded )?host(?:-owned)? lifetime|synchronous fail-fast composition/iu);
  }
});

test("complete Linux CI verifies exact product sources without changing intrinsic local checks", async () => {
  const workflow = (await readFile(resolve(root, ".github", "workflows", "ci.yml"), "utf8"))
    .replace(/\r\n?/gu, "\n");
  const packageDocument = JSON.parse(await readFile(resolve(root, "package.json"), "utf8")) as {
    readonly scripts: Record<string, string>;
  };
  const ignore = await readFile(resolve(root, ".gitignore"), "utf8");
  assert.match(workflow, /^  product-sources:\n[\s\S]*?runs-on: ubuntu-24\.04/mu);
  for (const [repository, revision, path] of [
    ["agent-teams-ai/agent-runtime", "7be998237a4c262bee9c4198d554b43cd2757ac6", ".product-sources/agent-runtime"],
    ["agent-teams-ai/agent-teams-orchestrator", "4c5f55366ed8c83f97374b66c8e9f84059c47382", ".product-sources/agent-teams-orchestrator"],
    ["777genius/agent-teams-ai", "85c0850e2fc312b995ba3116f8d4aa46dcb0b1dd", ".product-sources/frontend"],
  ] as const) {
    assert.match(workflow, new RegExp(`repository: ${repository}[\\s\\S]{0,120}ref: ${revision}[\\s\\S]{0,120}path: ${path.replaceAll(".", "\\.")}`, "u"));
  }
  assert.match(
    workflow,
    /node architecture\/checks\/product-source-evidence-cli\.mjs[\s\S]*consumer-source-evidence\.yaml[\s\S]*--repository agentRuntime=[\s\S]*--repository orchestrator=[\s\S]*--repository frontend=/u,
  );
  assert.doesNotMatch(packageDocument.scripts["qualification:check"] ?? "", /product-sources/u);
  assert.match(ignore, /^\.product-sources\/$/mu);
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
    readonly jobs: readonly { readonly id: string; readonly role: string; readonly sourceRevision: string; readonly lineage?: string }[];
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
  const historicalAgentRuntimeJobs = ledger.jobs.filter(job => (
    /agent-runtime|tie-ar/u.test(job.id)
    && (job.role === "product-consumer-admission" || job.role === "agent-runtime-admission-tie-break")
  ));
  assert.equal(historicalAgentRuntimeJobs.length, 4);
  assert.ok(historicalAgentRuntimeJobs.every(job => (
    job.sourceRevision === "25b2b7f383347466fa74fdd5586c485f5181d8d9"
    && job.lineage === "historical-evidence-superseded-by-current-product-source-records"
  )));

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
  assert.match(admission, /GO_PRODUCT_SOURCE_TOPOLOGY/u);
  assert.match(admission, /L1-L5_NO_GO/u);
  assert.match(admission, /Hosted\s+routing[\s\S]{0,80}excluded/u);
  assert.match(roadmap, /No LOC\s+percentage decides adoption/u);
  assert.doesNotMatch(oss, /75%|25%/u);
});
