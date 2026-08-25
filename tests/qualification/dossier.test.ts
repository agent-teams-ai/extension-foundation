import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { parse } from "yaml";

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
  readonly entries: readonly DecisionEntry[];
}

interface OssCandidate {
  readonly id: string;
  readonly versionOrRevision: string;
  readonly evidenceStatus: "pinned" | "orientation" | "qualified-experiment";
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
  assert.equal(ledger.schemaVersion, 1);
  const ids = ledger.entries.map(entry => entry.id);
  const topics = ledger.entries.map(entry => entry.topic);
  assert.equal(new Set(ids).size, ids.length);
  assert.equal(new Set(topics).size, topics.length);

  const approvals = ledger.entries.filter(entry => entry.approvalRequired);
  assert.deepEqual(
    approvals.map(entry => entry.id),
    Array.from({ length: 10 }, (_, index) => `UMEQ-${String(index + 9).padStart(3, "0")}`),
  );
  assert.ok(approvals.every(entry => entry.status === "open"));
  assert.ok(ledger.entries.every(entry => entry.authority.length > 0));

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

test("OSS comparison distinguishes immutable evidence from orientation research", async () => {
  const record = parse(await readFile(resolve(dossier, "oss-comparison.yaml"), "utf8")) as {
    readonly schemaVersion: number;
    readonly candidates: readonly OssCandidate[];
  };
  assert.equal(record.schemaVersion, 1);
  assert.equal(new Set(record.candidates.map(candidate => candidate.id)).size, record.candidates.length);
  for (const candidate of record.candidates) {
    assert.ok(["pinned", "orientation", "qualified-experiment"].includes(candidate.evidenceStatus));
    if (candidate.evidenceStatus === "orientation") assert.match(candidate.versionOrRevision, /^reviewed-/);
    if (candidate.evidenceStatus === "pinned") assert.doesNotMatch(candidate.versionOrRevision, /^reviewed-/);
  }
});
