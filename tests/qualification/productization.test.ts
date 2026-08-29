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
  readonly schemaVersion: number;
  readonly proofMode: string;
  readonly status: string;
  readonly claim: { readonly kind: string };
  readonly limitations: readonly string[];
  readonly verification: {
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
    }[];
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
  assert.equal(evidence.schemaVersion, 3);
  assert.equal(evidence.proofMode, "exact-git-source-custody");
  assert.equal(evidence.status, "candidate-source-records");
  assert.equal(evidence.claim.kind, "exact-git-source-custody");
  assert.equal(evidence.verification.authority, "local-git-object-custody-verifier");
  assert.equal(evidence.verification.promotionAuthority, false);
  assert.deepEqual(evidence.limitations, [
    "verifies only exact local Git origin, commit, tree, and declared regular-file blob identities",
    "does not interpret source text or prove symbols, topology, semantics, dataflow, or runtime behavior",
    "does not prove remote publication, repository independence, product approval, or promotion readiness",
  ]);
  assert.deepEqual(Object.keys(evidence.products).sort(), ["agentRuntime", "frontend", "orchestrator"]);

  for (const [product, record] of Object.entries(evidence.products)) {
    assert.match(record.repository, /^[^/]+\/[^/]+$/u, `${product} repository`);
    assert.match(record.commit, gitObject, `${product} commit`);
    assert.match(record.tree, gitObject, `${product} tree`);
    assert.ok(record.files.length > 0, `${product} needs at least one exact blob`);
    assert.equal(new Set(record.files.map(file => file.path)).size, record.files.length, `${product} paths must be unique`);
    for (const file of record.files) {
      assert.ok(!file.path.startsWith("/"), `${product} evidence path must be repository-relative`);
      assert.match(file.blob, gitObject, `${product}:${file.path} blob`);
    }
    assert.deepEqual(Object.keys(record).sort(), ["commit", "files", "repository", "tree"]);
  }
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
      readonly requiredDimensions: readonly string[];
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
    "candidate-source-records",
  );
  assert.equal(roadmap.levels.find(level => level.id === "L0")?.verdict, "SOURCE_CUSTODY_BASELINE_RECORDED");
  assert.equal(roadmap.levels.find(level => level.id === "L1")?.status, "no-go-measurement-candidate");
  assert.equal(roadmap.aiNavigationBenchmark.status, "product-owned-protocol-required");
  assert.equal(roadmap.levels.find(level => level.id === "L5")?.prerequisites?.includes(
    "package-admission-independence-defect-corrected-by-owning-task",
  ), false);
  assert.deepEqual(roadmap.aiNavigationBenchmark.requiredDimensions, [
    "find-owner-and-composition-root",
    "change-one-product-owned-binding",
    "trace-binding-to-use-case",
    "diagnose-missing-required-dependency",
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
  assert.deepEqual(
    roadmap.stopCriteria
      .filter(criterion => criterion.effect === "stop-or-move-back")
      .map(criterion => criterion.id),
    [
      "first-two-slices-framework-glue-over-30-percent",
      "ordinary-feature-work-repeatedly-changes-foundation",
      "candidate-runtime-needs-overlapping-lifecycle-state-machine",
    ],
  );
  const roadmapDocument = await readFile(resolve(dossier, "roadmap.md"), "utf8");
  const admissionDocument = await readFile(resolve(dossier, "consumer-admission.md"), "utf8");
  const performanceDocument = await readFile(resolve(universal, "performance-and-slo.md"), "utf8");
  assert.match(roadmapDocument, /Moving back or stopping is required[\s\S]{0,160}more than 30%[\s\S]{0,160}generic framework glue/u);
  assert.match(roadmapDocument, /safety\s+requirement can justify that cost only with explicit evidence/u);
  assert.match(roadmapDocument, /stop\s+conditions, not advisory metrics/u);
  assert.match(roadmapDocument, /ordinary feature work repeatedly requires Foundation changes/u);
  assert.match(roadmapDocument, /second overlapping lifecycle state machine/u);
  assert.match(performanceDocument, /first three conditions require stop or rollback under ADR-0013/u);
  assert.match(roadmapDocument, /not a\s+semantic-extraction prerequisite/u);
  assert.match(admissionDocument, /Owning-product decision, approved benchmark, measured authoring or drift problem, and executable product-owned evidence/u);
});

test("ADR-0015 authorizes neutral 0.x while retaining product-local gates", async () => {
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
  assert.match(verdict, /ADR-0015 supersedes ADR-0013 only for extraction timing/u);
  assert.match(verdict, /ADR-0013's product-first,[\s\S]{0,180}safeguards continue[\s\S]{0,40}ADR-0015/u);
  assert.match(verdict, /ADR-0014 remains the product-local authoring authority/u);
  assert.match(verdict, /adoption adapters[\s\S]{0,100}do not count as independent implementations of a public plugin SPI/u);
});

test("every current product projection uses one exact pinned revision", async () => {
  const evidence = parse(await readFile(resolve(dossier, "consumer-source-evidence.yaml"), "utf8")) as {
    readonly products: Record<string, { readonly commit: string }>;
  };
  const manifest = parse(await readFile(resolve(dossier, "research-manifest.yaml"), "utf8")) as {
    readonly baseline: {
      readonly pullRequest: number;
      readonly baseRevision: string;
      readonly stackedOn: string;
      readonly historicalFoundationPullRequest: number;
    };
    readonly products: Record<string, { readonly revision: string }>;
    readonly followUp: { readonly lineage: string; readonly agentRuntimeRevision: string };
    readonly verdicts: {
      readonly L0PureDi: { readonly orchestrator: string };
    };
  };
  assert.equal(manifest.baseline.pullRequest, 22);
  assert.equal(manifest.baseline.baseRevision, "fe15d6ae35275bb4c5456bd56645f60aa14684e1");
  assert.equal(manifest.baseline.stackedOn, "none");
  assert.equal(manifest.baseline.historicalFoundationPullRequest, 17);
  assert.equal(manifest.verdicts.L0PureDi.orchestrator, "exact-source-custody-recorded");
  const expected = Object.fromEntries(Object.entries(evidence.products).map(([product, record]) => [product, record.commit]));
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
  assert.match(roadmap, /sourceLock: consumer-source-evidence\.yaml/u);

  const historicalRevision = "493c6c37e247f021fc110c5fc624b72f1502d743";
  assert.equal(manifest.followUp.agentRuntimeRevision, historicalRevision);
  assert.equal(manifest.followUp.lineage, "historical-evidence-superseded-by-current-product-source-records");
});

test("source claims stay within exact Git custody", async () => {
  const evidence = parse(await readFile(resolve(dossier, "consumer-source-evidence.yaml"), "utf8")) as {
    readonly claim: { readonly kind: string };
    readonly verification: { readonly promotionAuthority: boolean };
    readonly limitations: readonly string[];
  };
  assert.equal(evidence.claim.kind, "exact-git-source-custody");
  assert.equal(evidence.verification.promotionAuthority, false);
  assert.ok(evidence.limitations.some(limit => limit.includes("does not interpret source text")));
  const admission = await readFile(resolve(dossier, "consumer-admission.md"), "utf8");
  const ledger = await readFile(resolve(dossier, "evidence-ledger.yaml"), "utf8");
  assert.match(admission, /Agent Runtime[^\n]+L1_NO_GO_MEASUREMENT_CANDIDATE[^\n]+L2-L5_NO_GO/u);
  assert.match(ledger, /Invalidate SOURCE_CUSTODY_BASELINE_RECORDED[\s\S]{0,180}ADR-0015-retained[\s\S]{0,80}product-owned Pure DI default remains authoritative/u);
  assert.doesNotMatch(ledger, /Revoke L0/u);
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
  assert.match(workflow, /pnpm qualification:product-sources:check --/u);
  for (const product of Object.keys((parse(await readFile(resolve(dossier, "consumer-source-evidence.yaml"), "utf8")) as SourceEvidence).products)) {
    assert.match(workflow, new RegExp(`--repository ${product}=`, "u"));
  }
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
    readonly jobEvidencePolicy: {
      readonly decisionAuthority: boolean;
      readonly portableArtifactLocator: string;
      readonly classification: string;
      readonly effect: string;
    };
    readonly claims: readonly { readonly sources?: readonly string[] }[];
  };
  assert.deepEqual(ledger.jobEvidencePolicy, {
    decisionAuthority: false,
    portableArtifactLocator: "unavailable",
    classification: "corroboration-only",
    effect: "job records cannot prove claims or authorize promotion",
  });
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
  assert.match(admission, /SOURCE_CUSTODY_BASELINE_RECORDED/u);
  assert.match(admission, /L1-L5_NO_GO/u);
  assert.match(roadmap, /No LOC\s+percentage decides adoption/u);
  assert.doesNotMatch(oss, /75%|25%/u);
});

test("qualification prose does not promote source custody into product semantics", async () => {
  const [authoring, verdict, roadmap, recommendation] = await Promise.all([
    readFile(resolve(dossier, "authoring-api-and-gap-matrix.md"), "utf8"),
    readFile(resolve(dossier, "executive-verdict.md"), "utf8"),
    readFile(resolve(dossier, "roadmap.md"), "utf8"),
    readFile(resolve(universal, "final-recommendation.md"), "utf8"),
  ]);
  assert.doesNotMatch(authoring, /repeat a composition pattern|No production adapter or application root/u);
  assert.doesNotMatch(verdict, /has a repeated setup-inspection workflow|same-seam case/u);
  assert.doesNotMatch(roadmap, /provider-contribution seam|sibling-capability seam/u);
  assert.match(recommendation, /ADR-0013 requires stop or rollback[\s\S]{0,180}exceeds 30%/u);
  assert.match(recommendation, /ordinary feature work repeatedly requires Foundation changes/u);
  assert.match(recommendation, /second overlapping lifecycle state[\s\S]{0,20}machine/u);
});
