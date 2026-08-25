import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { parse } from "yaml";

import { CONFORMANCE_VERSION } from "../../architecture/checks/package-policy.mjs";

const dossier = fileURLToPath(new URL("../../docs/qualification/universal-module-extension-system/", import.meta.url));

interface DecisionEntry {
  readonly id: string;
  readonly status: string;
  readonly topic: string;
  readonly authority: string;
  readonly detail: string;
  readonly approvalRequired: boolean;
}

interface DecisionLedger {
  readonly schemaVersion: number;
  readonly sourceRepository: string;
  readonly sourceRevision: string;
  readonly sourcePurpose: string;
  readonly retiredIdentifiers: readonly {
    readonly id: string;
    readonly formerTopic: string;
    readonly disposition: string;
  }[];
  readonly externalDecisionGates: readonly {
    readonly id: string;
    readonly status: string;
    readonly topic: string;
    readonly authority: string;
    readonly detail: string;
    readonly effectWhileProposed: string;
    readonly approvalTrackedBy: string;
  }[];
  readonly implementationGates: readonly {
    readonly id: string;
    readonly appliesTo: readonly string[];
    readonly mode: "all" | "exactly-one-path";
    readonly allOf?: readonly {
      readonly decision: string;
      readonly requiredStatus: string;
    }[];
    readonly paths?: readonly {
      readonly id: string;
      readonly allOf: readonly {
        readonly decision: string;
        readonly requiredStatus: string;
      }[];
    }[];
  }[];
  readonly entries: readonly DecisionEntry[];
}

interface OssEvidence {
  readonly kind: "git-commit" | "npm-release" | "artifact-digest";
  readonly repository?: string;
  readonly revision?: string;
  readonly url?: string;
  readonly package?: string;
  readonly version?: string;
  readonly integrity?: string;
  readonly locked?: boolean;
  readonly command?: string;
  readonly digest?: string;
}

interface OssCandidate {
  readonly id: string;
  readonly versionOrRevision: string;
  readonly evidenceStatus: "pinned" | "orientation" | "qualified-experiment";
  readonly evidence?: readonly OssEvidence[];
}

function markdownAnchor(title: string): string {
  return title
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

test("decision ledger has one semantic owner and ten unique approval forks", async () => {
  const ledgerPath = resolve(dossier, "decision-ledger.yaml");
  const ledger = parse(await readFile(ledgerPath, "utf8")) as DecisionLedger;
  const currentState = await readFile(resolve(dossier, "current-state.md"), "utf8");
  assert.equal(ledger.schemaVersion, 1);
  assert.equal(ledger.sourceRepository, "agent-teams-ai/extension-foundation");
  assert.equal(ledger.sourcePurpose, "immutable-analyzed-baseline");
  assert.match(ledger.sourceRevision, /^[0-9a-f]{40}$/);
  const foundationRevision = currentState.match(
    /`agent-teams-ai\/extension-foundation` \| `([0-9a-f]{40})`/,
  )?.[1];
  assert.equal(ledger.sourceRevision, foundationRevision);
  assert.match(currentState, /agent-teams-platform` \| `[0-9a-f]{40}` \| private orientation only/);
  assert.match(currentState, /no finding depends on inaccessible\s+bytes from that repository/);
  const ids = ledger.entries.map(entry => entry.id);
  const retiredIds = ledger.retiredIdentifiers.map(entry => entry.id);
  const topics = ledger.entries.map(entry => entry.topic);
  assert.equal(new Set(ids).size, ids.length);
  assert.deepEqual(retiredIds, Array.from({ length: 5 }, (_, index) => `UMEQ-${String(index + 4).padStart(3, "0")}`));
  assert.ok(ledger.retiredIdentifiers.every(entry => (
    entry.formerTopic.length > 0
    && entry.disposition === "withdrawn-draft-consolidated-into-OD-003"
  )));
  assert.deepEqual(
    [...ids, ...retiredIds].sort(),
    Array.from({ length: 18 }, (_, index) => `UMEQ-${String(index + 1).padStart(3, "0")}`),
  );
  assert.equal(new Set(topics).size, topics.length);
  assert.deepEqual(ledger.externalDecisionGates, [
    {
      id: "ADR-0011",
      status: "proposed",
      topic: "production-extension-host-safety-closure",
      authority: "product-owner",
      detail: "../../decisions/0011-extension-admission-custody-and-retirement-closure.md",
      effectWhileProposed: "production-extension-host-phases-blocked",
      approvalTrackedBy: "adr-lifecycle",
    },
    {
      id: "ADR-0013",
      status: "proposed",
      topic: "first-consumer-module-semantics",
      authority: "product-owner",
      detail: "../../decisions/0013-first-consumer-module-semantics-before-foundation-extraction.md",
      effectWhileProposed: "product-local-phase-1-blocked",
      approvalTrackedBy: "adr-lifecycle",
    },
  ]);
  assert.deepEqual(ledger.implementationGates, [
    {
      id: "phase-1-graph-kernel",
      appliesTo: ["phase-1-graph-kernel"],
      mode: "exactly-one-path",
      paths: [
        {
          id: "product-local",
          allOf: [
            { decision: "ADR-0013", requiredStatus: "accepted" },
            { decision: "owning-product-feature-decision", requiredStatus: "accepted" },
          ],
        },
        {
          id: "foundation-owned",
          allOf: [
            { decision: "ADR-0012", requiredStatus: "accepted" },
            { decision: "UMEQ-011", requiredStatus: "resolved" },
            { decision: "UMEQ-013", requiredStatus: "resolved" },
          ],
        },
      ],
    },
    {
      id: "phase-3-reusable-contract-extraction",
      appliesTo: ["phase-3-reusable-internal-contracts"],
      mode: "exactly-one-path",
      paths: [
        {
          id: "product-local-extraction",
          allOf: [
            { decision: "ADR-0013", requiredStatus: "accepted" },
            { decision: "second-independent-consumer", requiredStatus: "proven" },
            { decision: "cross-implementation-conformance", requiredStatus: "passed" },
            { decision: "UMEQ-012", requiredStatus: "resolved" },
            { decision: "foundation-extraction-decision", requiredStatus: "accepted" },
          ],
        },
        {
          id: "foundation-owned-admission",
          allOf: [
            { decision: "ADR-0012", requiredStatus: "accepted" },
            { decision: "UMEQ-011", requiredStatus: "resolved" },
            { decision: "UMEQ-012", requiredStatus: "resolved" },
            { decision: "UMEQ-013", requiredStatus: "resolved" },
            { decision: "foundation-package-admission-decision", requiredStatus: "accepted" },
          ],
        },
      ],
    },
    {
      id: "phase-3-package-publication",
      appliesTo: ["phase-3-public-package-publication"],
      mode: "all",
      allOf: [
        { decision: "UMEQ-015", requiredStatus: "resolved" },
        { decision: "foundation-package-publication-decision", requiredStatus: "accepted" },
      ],
    },
    {
      id: "production-extension-host-safety",
      appliesTo: [
        "phase-4-process-host",
        "phase-5-packaging-and-installation",
        "phase-6-frontend-and-untrusted-hosts",
      ],
      mode: "all",
      allOf: [{ decision: "ADR-0011", requiredStatus: "accepted" }],
    },
    {
      id: "process-host-wire-format",
      appliesTo: ["phase-4-process-host"],
      mode: "all",
      allOf: [{ decision: "UMEQ-009", requiredStatus: "resolved" }],
    },
    {
      id: "frontend-extension-host",
      appliesTo: ["phase-6-frontend-and-untrusted-hosts"],
      mode: "all",
      allOf: [{ decision: "UMEQ-010", requiredStatus: "resolved" }],
    },
  ]);

  const approvals = ledger.entries.filter(entry => entry.approvalRequired);
  assert.deepEqual(
    approvals.map(entry => entry.id),
    Array.from({ length: 10 }, (_, index) => `UMEQ-${String(index + 9).padStart(3, "0")}`),
  );
  assert.ok(approvals.every(entry => entry.status === "open"));
  assert.ok(ledger.entries.every(entry => entry.authority.length > 0));
  assert.ok(
    approvals.every(entry => entry.authority === "product-owner" || /^OD-\d{3}$/.test(entry.authority)),
    "an open fork requires a resolving authority, not an already accepted ADR",
  );

  const knownIds = new Set([...ids, ...retiredIds]);
  const dossierFiles = (await readdir(dossier)).filter(name => /\.(?:md|ya?ml)$/.test(name));
  const markdownFiles = new Map<string, string>();
  for (const name of dossierFiles) {
    const contents = await readFile(resolve(dossier, name), "utf8");
    if (name.endsWith(".md")) markdownFiles.set(name, contents);
    const referencedIds = contents.match(/\bUMEQ-[A-Z0-9-]+\b/g) ?? [];
    for (const id of referencedIds) assert.ok(knownIds.has(id), `${name} references unledgered ${id}`);
  }

  for (const approval of approvals) {
    const normativeHeadings = [...markdownFiles].flatMap(([name, contents]) => (
      [...contents.matchAll(new RegExp(`^#{1,6}\\s+${approval.id}:`, "gm"))].map(match => ({ name, heading: match[0] }))
    ));
    assert.deepEqual(
      normativeHeadings.map(entry => entry.name),
      ["unresolved-decisions.md"],
      `${approval.id} must have exactly one normative approval heading`,
    );
  }

  for (const entry of [...ledger.entries, ...ledger.externalDecisionGates]) {
    const [relativePath, fragment] = entry.detail.split("#", 2);
    const targetPath = resolve(dirname(ledgerPath), relativePath!);
    const markdown = await readFile(targetPath, "utf8");
    if (fragment) {
      const anchors = markdown.matchAll(/^#{1,6}\s+(.+)$/gm);
      assert.ok([...anchors].some(match => markdownAnchor(match[1]!) === fragment), `${entry.id} has stale detail anchor`);
    }
  }
});

test("qualified identity and extraction rules preserve accepted ADR authority", async () => {
  const antiPatterns = await readFile(resolve(dossier, "anti-patterns.md"), "utf8");
  const moduleGraph = await readFile(resolve(dossier, "module-graph.md"), "utf8");
  const antiPatternIds = [...antiPatterns.matchAll(/^\| (AP-\d{3}) \|/gm)].map(match => match[1]);

  assert.deepEqual(
    antiPatternIds,
    Array.from({ length: 85 }, (_, index) => `AP-${String(index + 1).padStart(3, "0")}`),
    "anti-pattern identifiers must remain unique, contiguous, and ordered",
  );
  assert.match(antiPatterns, /AP-080 \| Extract a neutral package without satisfying an accepted ADR-0012 admission basis/);
  assert.doesNotMatch(antiPatterns, /AP-080 \| Extract a neutral package before a second consumer/);
  const catalogControls = [
    {
      decision: "../../decisions/0003-postgresql-canonical-catalog-state-and-signed-snapshots.md",
      decisionInvariant: /one PostgreSQL database as its only\s+canonical state/,
      control: /AP-084 \| Multiple canonical writers for one catalog source/,
    },
    {
      decision: "../../decisions/0004-deterministic-catalog-federation-and-namespace-authority.md",
      decisionInvariant: /never triggers implicit fallback to another\s+catalog/,
      control: /AP-085 \| Merge or fallback after catalog authority selection/,
    },
  ];
  for (const catalogControl of catalogControls) {
    const decision = await readFile(resolve(dossier, catalogControl.decision), "utf8");
    assert.match(decision, /^status: accepted$/m);
    assert.match(decision, catalogControl.decisionInvariant);
    assert.match(antiPatterns, catalogControl.control);
  }
  assert.match(moduleGraph, /`BuiltInModuleInstallation` activation-source identity/);
  assert.match(moduleGraph, /product authority scope, stable module identity, and immutable implementation\s+digest/);
  assert.doesNotMatch(moduleGraph, /built-in module has an immutable\s+implementation identity but no artifact or installation identity/);
});

test("OSS comparison distinguishes immutable evidence from orientation research", async () => {
  const repositoryRoot = resolve(dossier, "../../..");
  const lock = parse(await readFile(resolve(repositoryRoot, "pnpm-lock.yaml"), "utf8")) as {
    readonly packages: Readonly<Record<string, { readonly resolution?: { readonly integrity?: string } }>>;
  };
  const record = parse(await readFile(resolve(dossier, "oss-comparison.yaml"), "utf8")) as {
    readonly schemaVersion: number;
    readonly candidates: readonly OssCandidate[];
  };
  assert.equal(record.schemaVersion, 1);
  assert.ok(CONFORMANCE_VERSION.test("1.0.0-rc.4"));
  for (const invalid of ["01.0.0", "1.01.0", "1.0.01", "1.0.0-01", "1.0.0-alpha..1"]) {
    assert.ok(!CONFORMANCE_VERSION.test(invalid), `invalid SemVer accepted: ${invalid}`);
  }
  assert.equal(new Set(record.candidates.map(candidate => candidate.id)).size, record.candidates.length);
  for (const candidate of record.candidates) {
    assert.ok(["pinned", "orientation", "qualified-experiment"].includes(candidate.evidenceStatus));
    if (candidate.evidenceStatus === "orientation") assert.match(candidate.versionOrRevision, /^reviewed-/);
    if (candidate.evidenceStatus === "pinned") {
      assert.doesNotMatch(candidate.versionOrRevision, /^(?:reviewed-|latest$)/);
      assert.ok((candidate.evidence?.length ?? 0) > 0, `${candidate.id} requires immutable evidence`);
    }
    if (candidate.evidenceStatus === "qualified-experiment") {
      assert.ok(candidate.evidence?.some(evidence => evidence.kind === "artifact-digest"));
    }
    for (const evidence of candidate.evidence ?? []) {
      if (evidence.kind === "git-commit") {
        assert.match(evidence.repository ?? "", /^https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/);
        assert.match(evidence.revision ?? "", /^[0-9a-f]{40}$/);
        assert.equal(evidence.url, `${evidence.repository}/commit/${evidence.revision}`);
      } else if (evidence.kind === "npm-release") {
        assert.match(evidence.package ?? "", /^(?:@[a-z0-9_.-]+\/)?[a-z0-9_.-]+$/);
        assert.match(evidence.version ?? "", CONFORMANCE_VERSION);
        assert.match(evidence.url ?? "", /^https:\/\/registry\.npmjs\.org\//);
        assert.match(evidence.integrity ?? "", /^sha512-[A-Za-z0-9+/]+={0,2}$/);
        if (evidence.locked) {
          const entry = lock.packages[`${evidence.package}@${evidence.version}`];
          assert.equal(entry?.resolution?.integrity, evidence.integrity);
        }
      } else {
        assert.match(evidence.url ?? "", /^https:\/\//);
        assert.match(evidence.digest ?? "", /^sha256:[0-9a-f]{64}$/);
        assert.ok((evidence.command?.length ?? 0) > 0);
      }
    }
  }
});

test("accepted publication gates remain authoritative while proposed ADR-0013 is non-operative", async () => {
  const repositoryRoot = resolve(dossier, "../../..");
  const files = await Promise.all([
    readFile(resolve(repositoryRoot, "docs/decisions/0001-product-neutral-extension-foundation-boundary.md"), "utf8"),
    readFile(resolve(dossier, "invariant-map.md"), "utf8"),
    readFile(resolve(dossier, "conformance-plan.md"), "utf8"),
    readFile(resolve(dossier, "final-recommendation.md"), "utf8"),
    readFile(resolve(dossier, "product-adoption.md"), "utf8"),
    readFile(resolve(dossier, "unresolved-decisions.md"), "utf8"),
    readFile(resolve(repositoryRoot, "docs/decisions/0013-first-consumer-module-semantics-before-foundation-extraction.md"), "utf8"),
    readFile(resolve(repositoryRoot, "docs/decisions/0012-reusable-library-module-and-plugin-boundaries.md"), "utf8"),
  ]);
  assert.match(files[0]!, /Public SPI requires independent implementations/);
  for (const markdown of files.slice(1, 4)) assert.match(markdown, /two independently authored/);
  assert.doesNotMatch(files[2]!, /one real implementation plus a bounded reference adapter/);
  assert.match(files[3]!, /No graph implementation begins until one ownership path is explicitly opened/);
  assert.match(files[3]!, /Until one complete path is approved, Phase 1 is blocked/);
  assert.doesNotMatch(files[4]!, /independently packaged reference implementation/);
  assert.match(files[4]!, /accepted internal model\s+and one complete Phase 1 ownership path is approved/);
  assert.match(files[4]!, /product-local path additionally requires ADR-0013 acceptance/);
  assert.match(files[5]!, /No graph slice starts until its ownership path is complete/);
  assert.match(files[5]!, /ADR-0013.*owning product's\s+feature decision/is);
  assert.match(files[5]!, /ADR-0012 remains effective.*`UMEQ-011` and `UMEQ-013`/is);
  assert.match(files[2]!, /Under the product-local ADR-0013 path, two independent\s+consumers/);
  assert.match(files[2]!, /Under the\s+effective ADR-0012 path, the selected accepted admission basis/);
  assert.match(files[2]!, /a second consumer is not imposed on the other\s+accepted bases/);
  assert.match(files[3]!, /ADR-0012's accepted admission\s+bases/);
  assert.match(files[3]!, /not\s+silently narrowed to the second-consumer basis/);
  assert.match(files[3]!, /Internal extraction may proceed after the selected gate passes; package\s+publication additionally requires the separate `phase-3-package-publication`/);
  assert.match(files[5]!, /`UMEQ-012` is\s+needed before reusable contract extraction; `UMEQ-015` is additionally required\s+before package publication/);
  assert.match(files[6]!, /status: proposed/);
  assert.match(files[6]!, /ADR-0012\s+remains the effective admission policy/);
  assert.match(files[6]!, /cannot narrow or block the admission bases already accepted in ADR-0012/);
  assert.match(files[6]!, /related:[\s\S]*ADR-0012/);
  assert.doesNotMatch(files[6]!, /no Foundation runtime package or public SPI may be admitted/);
  assert.match(files[7]!, /Extract or publish only when at least one of these is proven/);
  assert.match(files[3]!, /If ADR-0012\s+remains effective/);
  assert.match(files[3]!, /does\s+not\s+make either approval path operative/);
  const packageCatalog = JSON.parse(await readFile(resolve(repositoryRoot, "architecture/package-catalog.json"), "utf8")) as {
    readonly packages?: readonly unknown[];
  };
  assert.deepEqual(packageCatalog.packages, [], "this qualification does not admit a production package");
});

test("execution admission and every production host remain independently gated", async () => {
  const trust = await readFile(resolve(dossier, "trust-and-security.md"), "utf8");
  const recommendation = await readFile(resolve(dossier, "final-recommendation.md"), "utf8");

  assert.match(trust, /entitlement decision = allow OR entitlement plane = explicitly not-applicable/);
  assert.match(trust, /product authorization = allow/);
  assert.match(trust, /current product capability grant/);
  assert.match(trust, /Request\["Capability request"\] --> Product\["Product authorization"\]/);
  assert.match(trust, /Product --> Intersect\["Authority intersection"\]/);
  assert.match(trust, /Grant\["Current product capability grant"\] --> Intersect/);
  assert.doesNotMatch(trust, /Product --> Grant/);
  assert.match(recommendation, /`UMEQ-009` is resolved through `OD-003` for the selected process wire format/);
  assert.match(trust, /AR authorization = allow when AR owns the capability/);
  assert.match(trust, /Unknown applicability, a bare decision without\s+an `allow` result.*deny execution/is);
  assert.match(
    recommendation,
    /Phase 6: Frontend And Untrusted Hosts[\s\S]*same ADR-0011 closure gate as Phases 4 and 5/,
  );
});
