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

  for (const entry of ledger.entries) {
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

  assert.match(antiPatterns, /AP-080 \| Extract a neutral package without satisfying an accepted ADR-0012 admission basis/);
  assert.doesNotMatch(antiPatterns, /AP-080 \| Extract a neutral package before a second consumer/);
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
  assert.match(files[3]!, /owning product.*accepted feature decision/is);
  assert.doesNotMatch(files[4]!, /independently packaged reference implementation/);
  assert.match(files[5]!, /first product-local graph slice requires its owning product's accepted\s+feature decision/is);
  assert.doesNotMatch(files[5]!, /Approve `UMEQ-011`.*before the\s+first product-local graph slice/is);
  assert.match(files[6]!, /status: proposed/);
  assert.match(files[6]!, /ADR-0012\s+remains the effective admission policy/);
  assert.match(files[6]!, /cannot narrow or block the admission bases already accepted in ADR-0012/);
  assert.doesNotMatch(files[6]!, /no Foundation runtime package or public SPI may be admitted/);
  assert.match(files[7]!, /Extract or publish only when at least one of these is proven/);
  assert.match(files[3]!, /ADR-0012 remains the effective admission policy/);
  assert.match(files[3]!, /does not make the proposal operative/);
  const packageCatalog = JSON.parse(await readFile(resolve(repositoryRoot, "architecture/package-catalog.json"), "utf8")) as {
    readonly packages?: readonly unknown[];
  };
  assert.deepEqual(packageCatalog.packages, [], "this qualification does not admit a production package");
});
