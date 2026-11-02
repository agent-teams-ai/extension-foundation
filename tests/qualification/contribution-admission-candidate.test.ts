import assert from "node:assert/strict";
import test from "node:test";
import {
  preflightBundle,
  type CandidateBundle,
  type HostAdmissionEvidence,
} from "./contribution-admission-candidate.ts";

const hash = (char: string) => "sha256:" + char.repeat(64);
const candidate: CandidateBundle = {
  installationId: "bundle/one",
  artifactDigest: hash("a"),
  scope: "org/one",
  contributions: [
    { id: "greeting/tool", kind: "tool", port: "chat-actions", permission: "greeting.run" },
    { id: "greeting/skill", kind: "skill", port: "skill-catalog", permission: "greeting.read" },
    { id: "greeting/ui", kind: "ui", port: "panels", permission: "greeting.render" },
    { id: "greeting/worker", kind: "worker", port: "background-jobs", permission: "greeting.work" },
    { id: "greeting/state", kind: "state", port: "private-data", permission: "greeting.migrate",
      schema: { lineage: "greeting/db", migrationDigest: hash("b") } },
  ],
};
const evidence: HostAdmissionEvidence = {
  scope: "org/one",
  currentHeadRevision: 12,
  expectedHeadRevision: 12,
  verifiedArtifactDigest: hash("a"),
  boundPorts: {
    "greeting/tool": "tool:chat-actions",
    "greeting/skill": "skill:skill-catalog",
    "greeting/ui": "ui:panels",
    "greeting/worker": "worker:background-jobs",
    "greeting/state": "state:private-data",
  },
  effectiveGrants: {
    "greeting/tool": ["greeting.run"],
    "greeting/skill": ["greeting.read"],
    "greeting/ui": ["greeting.render"],
    "greeting/worker": ["greeting.work"],
    "greeting/state": ["greeting.migrate"],
  },
  qualifiedPlacements: { "greeting/ui": "isolated", "greeting/worker": "isolated" },
  custodyReceipts: { "greeting/state": { lineage: "greeting/db", migrationDigest: hash("b") } },
};
const withBundle = (patch: Partial<CandidateBundle>): CandidateBundle => ({ ...candidate, ...patch });
const withEvidence = (patch: Partial<HostAdmissionEvidence>): HostAdmissionEvidence => ({ ...evidence, ...patch });
const withContribution = (index: number, patch: Record<string, unknown>): CandidateBundle => ({
  ...candidate,
  contributions: candidate.contributions.map((c, i) => i === index ? { ...c, ...patch } : c),
});
function rejected(bundle: CandidateBundle, host: HostAdmissionEvidence, reason: string): void {
  assert.deepEqual(preflightBundle(bundle, host), { ok: false, reason });
}

test("one immutable artifact may describe five separately authorized contributions", () => {
  assert.deepEqual(preflightBundle(candidate, evidence), { ok: true, selected: candidate.contributions });
});
test("verified artifact and installation identity remain separate", () => {
  rejected(withBundle({ artifactDigest: hash("c") }), evidence, "unverified-artifact");
  rejected(candidate, withEvidence({ verifiedArtifactDigest: null }), "unverified-artifact");
  rejected(withBundle({ installationId: "../secret" }), evidence, "invalid-installation-id");
});
test("cross-organization install and stale active head fail closed", () => {
  rejected(withBundle({ scope: "org/two" }), evidence, "wrong-authority-scope");
  rejected(candidate, withEvidence({ expectedHeadRevision: 11 }), "stale-active-head");
});
test("manifest permission requests cannot become effective grants", () => {
  const grants = { ...evidence.effectiveGrants, "greeting/tool": [] };
  rejected(candidate, withEvidence({ effectiveGrants: grants }), "permission-not-granted");
  rejected(withContribution(0, { permission: "root" }), evidence, "permission-not-granted");
});
test("extension contributions cannot self-bind product ports", () => {
  const ports = { ...evidence.boundPorts, "greeting/tool": "tool:other" };
  rejected(candidate, withEvidence({ boundPorts: ports }), "unbound-product-port");
  rejected(withContribution(0, { port: "raw-domain-store" }), evidence, "unbound-product-port");
});
test("worker and UI require host-qualified placement, never a manifest flag", () => {
  rejected(candidate, withEvidence({ qualifiedPlacements: { "greeting/ui": "isolated" } }), "worker-not-isolated");
  rejected(candidate, withEvidence({ qualifiedPlacements: { "greeting/worker": "isolated" } }), "ui-placement-unqualified");
});
test("schema migration requires its own exact state custody evidence", () => {
  rejected(candidate, withEvidence({ custodyReceipts: {} }), "state-custody-not-authorized");
  rejected(withContribution(4, { schema: { lineage: "greeting/db", migrationDigest: hash("c") } }),
    evidence, "state-custody-not-authorized");
  rejected(withContribution(0, { schema: { lineage: "greeting/db", migrationDigest: hash("b") } }),
    evidence, "unexpected-state-schema");
});
test("duplicate, unknown, malformed and oversized descriptors fail atomically", () => {
  rejected(withBundle({ contributions: [...candidate.contributions, candidate.contributions[0]] }),
    evidence, "duplicate-contribution");
  rejected(withContribution(0, { kind: "root-shell" }), evidence, "invalid-contribution");
  rejected(withBundle({ contributions: [] }), evidence, "invalid-contribution-count");
  rejected(withBundle({ contributions: Array.from({ length: 65 }, (_, i) => ({
    id: "greeting/tool-" + i, kind: "tool", port: "chat-actions", permission: "greeting.run",
  })) }), evidence, "invalid-contribution-count");
});
test("preflight neither calls code nor mutates host-supplied evidence", () => {
  const before = JSON.stringify({ candidate, evidence });
  const first = preflightBundle(candidate, evidence);
  const second = preflightBundle(candidate, evidence);
  assert.deepEqual(first, second);
  assert.equal(JSON.stringify({ candidate, evidence }), before);
  assert.equal(first.ok, true);
  // This intentionally tests only preflight. It is NOT an execution, sandbox,
  // lifecycle, installation, migration or production Host conformance claim.
});
