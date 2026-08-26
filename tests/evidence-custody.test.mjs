import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";

import {
  assertExplicitJobIds,
  assertSafeEvidencePath,
  captureEvidence,
  deterministicJson,
  ObjectStore,
  scanSecrets,
  sha256,
  validateManifest,
  verifyManifest,
} from "../architecture/checks/evidence-custody.mjs";

const JOB_ID = "modres-w7-example-20260826-r1";

async function temporaryDirectory(t) {
  const root = await mkdtemp(join(tmpdir(), "evidence-custody-"));
  t.after(async () => {
    const { rm } = await import("node:fs/promises");
    await rm(root, { recursive: true, force: true });
  });
  return root;
}

function objectRecord(digest, overrides = {}) {
  return {
    sha256: digest,
    bytes: 8,
    mediaType: "application/json",
    kind: "source",
    sourcePath: "relative/source.json",
    capturedAt: "2026-08-26T00:00:00.000Z",
    ...overrides,
  };
}

function validManifest(digest = "a".repeat(64)) {
  return {
    schemaVersion: 1,
    campaignId: "campaign-1",
    baseline: { commit: "e69ac5544ee64d497e56c060f75e8ba6eaae1ceb" },
    objects: [objectRecord(digest)],
    jobs: [{
      jobId: JOB_ID,
      wave: "W7",
      jobConfigObject: digest,
      attemptIds: [`${JOB_ID}:attempt:1`],
      currentAlias: digest,
    }],
    attempts: [{
      attemptId: `${JOB_ID}:attempt:1`,
      jobId: JOB_ID,
      attemptNumber: 1,
      status: "completed",
      predecessorAttemptId: null,
      continuationOf: null,
      startedAt: "2026-08-26T00:00:00.000Z",
      finishedAt: "2026-08-26T00:01:00.000Z",
      outputSummaryObject: digest,
      wrapperObject: digest,
      transcriptObjects: [digest],
    }],
    continuations: [],
    claims: [],
    exceptions: [],
    promotion: {
      draftScope: "evidence-tooling-only",
      synthesisVerdict: "NO-GO",
      workerAccounting: { countsAsVotes: false },
      manifestGates: false,
      productOwnerReview: false,
      separateAdrChange: false,
      p0P1ExecutableClosure: false,
    },
  };
}

test("explicit allowlist rejects glob admission and duplicates", () => {
  assert.deepEqual(assertExplicitJobIds([JOB_ID]), [JOB_ID]);
  assert.throws(() => assertExplicitJobIds(["modres-w7-*-20260826-r1"]), /invalid explicit job ID/u);
  assert.throws(() => assertExplicitJobIds([JOB_ID, JOB_ID]), /duplicate job ID/u);
  assert.throws(() => assertExplicitJobIds([]), /non-empty explicit allowlist/u);
});

test("deterministic JSON documents and enforces its smaller supported domain", () => {
  assert.equal(deterministicJson({ z: 1, a: [true, null] }), '{"a":[true,null],"z":1}');
  assert.throws(() => deterministicJson({ value: undefined }), /outside the deterministic JSON domain/u);
  assert.throws(() => deterministicJson([, 1]), /sparse arrays/u);
  const cyclic = {};
  cyclic.self = cyclic;
  assert.throws(() => deterministicJson(cyclic), /cycle/u);
});

test("object publication is idempotent and verifies hash and size", async t => {
  const root = await temporaryDirectory(t);
  const store = new ObjectStore(root);
  const bytes = Buffer.from("evidence");
  const first = await store.publish(bytes);
  const second = await store.publish(bytes);
  assert.deepEqual(second, first);
  assert.equal(await readFile(first.path, "utf8"), "evidence");
});

test("concurrent create publishes one immutable object", async t => {
  const root = await temporaryDirectory(t);
  const store = new ObjectStore(root);
  const results = await Promise.all(Array.from({ length: 16 }, () => store.publish("same bytes")));
  assert.equal(new Set(results.map(result => result.path)).size, 1);
  assert.equal(await readFile(results[0].path, "utf8"), "same bytes");
});

test("corruption and a pre-existing collision are rejected", async t => {
  const root = await temporaryDirectory(t);
  const store = new ObjectStore(root);
  const bytes = Buffer.from("expected");
  const digest = sha256(bytes);
  const path = store.objectPath(digest);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, "corrupt!");
  await assert.rejects(store.publish(bytes), /collision or corruption/u);
  await assert.rejects(store.verify(digest, bytes), /collision or corruption/u);
});

test("object store rejects symlink shards and source capture rejects symlinks", async t => {
  const root = await temporaryDirectory(t);
  const outside = await temporaryDirectory(t);
  const store = new ObjectStore(join(root, "store"));
  await store.initialize();
  const digest = sha256("attack");
  await symlink(outside, join(root, "store", "objects", "sha256", digest.slice(0, 2)));
  await assert.rejects(store.publish("attack"), /unsafe directory component/u);

  const runtimeRoot = join(root, "runtime");
  const configRoot = join(root, "configs");
  await mkdir(join(runtimeRoot, JOB_ID), { recursive: true });
  await mkdir(join(configRoot, JOB_ID), { recursive: true });
  const actual = join(outside, "job.json");
  await writeFile(actual, "{}");
  await symlink(actual, join(configRoot, JOB_ID, "job.json"));
  await assert.rejects(captureEvidence({
    campaignId: "attack",
    baseline: {},
    jobIds: [JOB_ID],
    runtimeRoot,
    jobConfigRoot: configRoot,
    outputRoot: join(root, "output"),
  }), /non-symlink file/u);
});

test("recovery removes truncated crash temporaries without publishing them", async t => {
  const root = await temporaryDirectory(t);
  const store = new ObjectStore(root);
  await store.initialize();
  const shard = join(root, "objects", "sha256", "ab");
  await mkdir(shard);
  const temporary = join(shard, `.${"a".repeat(64)}.crash.tmp`);
  await writeFile(temporary, "truncated");
  await store.recoverTemporaries();
  await assert.rejects(readFile(temporary), error => error.code === "ENOENT");
});

test("manifest validator rejects invalid lineage", () => {
  const manifest = validManifest();
  manifest.attempts[0].predecessorAttemptId = "missing-attempt";
  const result = validateManifest(manifest);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some(error => error.includes("predecessorAttemptId does not resolve")));
});

test("verifier reports stale aliases and missing object records", async () => {
  const manifest = validManifest();
  manifest.jobs[0].currentAliasSha256 = "b".repeat(64);
  manifest.jobs[0].jobConfigObject = "c".repeat(64);
  const result = await verifyManifest(manifest);
  assert.equal(result.gates["G-ALIAS"].pass, false);
  assert.equal(result.gates["G-CUSTODY"].pass, false);
  assert.match(result.gates["G-CUSTODY"].failures.join("\n"), /missing object record/u);
});

test("worker accounting never becomes voting authority", async () => {
  const manifest = validManifest();
  manifest.promotion.workerAccounting = { countsAsVotes: true, workers: 140 };
  const result = await verifyManifest(manifest);
  assert.equal(result.gates["G-SOURCE"].pass, false);
  assert.match(result.gates["G-SOURCE"].failures.join("\n"), /never be votes/u);
});

test("worker reports are not primary sources and unsupported inference needs a hypothesis label", async () => {
  const manifest = validManifest();
  manifest.objects[0].kind = "worker-report";
  manifest.claims.push({
    claimId: "claim-1",
    text: "A correlated worker conclusion",
    classification: "inference",
    applicability: "campaign only",
    primarySourceObjects: [manifest.objects[0].sha256, manifest.objects[0].sha256],
    executableEvidenceObjects: [],
    publisherIndependence: ["publisher-a", "publisher-b"],
    hypothesis: false,
    promotionEligible: true,
  });
  const result = await verifyManifest(manifest);
  assert.equal(result.gates["G-SOURCE"].pass, false);
  assert.equal(result.gates["G-HYPOTHESIS"].pass, false);
});

test("an honestly labeled hypothesis is non-promotable", async () => {
  const manifest = validManifest();
  manifest.claims.push({
    claimId: "claim-hypothesis",
    text: "Needs executable reproduction",
    classification: "hypothesis",
    applicability: "unknown",
    primarySourceObjects: [],
    executableEvidenceObjects: [],
    publisherIndependence: [],
    hypothesis: true,
    promotionEligible: false,
  });
  const result = await verifyManifest(manifest);
  assert.equal(result.gates["G-SOURCE"].pass, true);
  assert.equal(result.gates["G-HYPOTHESIS"].pass, true);
  assert.equal(result.gates["G-PROMOTION"].pass, false);
});

test("secret scanning detects common credentials without echoing the secret", () => {
  const secret = `sk-proj-${"x".repeat(32)}`;
  assert.throws(() => scanSecrets(`token=${secret}`, "fixture"), error => {
    assert.match(error.message, /openai-key/u);
    assert.equal(error.message.includes(secret), false);
    return true;
  });
  assert.deepEqual(scanSecrets("ordinary research output"), []);
  assert.throws(() => scanSecrets(`token=${"a".repeat(24)}`), /credential-assignment/u);
});

test("auth roots and CODEX_HOME are rejected before reads", () => {
  assert.throws(() => assertSafeEvidencePath("/root/.cache/subscription-runtime/live-codex-auth/token"), /must not target/u);
  const prior = process.env.CODEX_HOME;
  process.env.CODEX_HOME = "/tmp/private-codex-state";
  try {
    assert.throws(() => assertSafeEvidencePath("/tmp/private-codex-state/credentials.json"), /CODEX_HOME/u);
  } finally {
    if (prior === undefined) delete process.env.CODEX_HOME;
    else process.env.CODEX_HOME = prior;
  }
});

test("capture preserves required runtime bytes and decodes lastOutputSummary", async t => {
  const root = await temporaryDirectory(t);
  const runtimeRoot = join(root, "runtime");
  const configRoot = join(root, "configs");
  const outputRoot = join(root, "evidence");
  const jobRoot = join(runtimeRoot, JOB_ID);
  const journalPath = join(jobRoot, "state", "attempt-journal", "attempt-journal", "journal.json");
  await mkdir(dirname(journalPath), { recursive: true });
  await mkdir(join(configRoot, JOB_ID), { recursive: true });
  await writeFile(join(configRoot, JOB_ID, "job.json"), '{"schemaVersion":1}\n');
  await writeFile(join(jobRoot, `${JOB_ID}.latest-result.json`), '{"status":"done"}\n');
  await writeFile(join(jobRoot, `${JOB_ID}.progress.json`), '{"status":"completed"}\n');
  await writeFile(join(jobRoot, `${JOB_ID}.events.jsonl`), '{"event":"done"}\n');
  await writeFile(join(jobRoot, `${JOB_ID}.log`), "completed\n");
  await writeFile(journalPath, JSON.stringify({ attempts: [{
    attemptNumber: 1,
    status: "completed",
    startedAt: "2026-08-26T00:00:00.000Z",
    finishedAt: "2026-08-26T00:01:00.000Z",
    lastOutputSummary: '{"claim":"preserve these exact UTF-8 bytes"}',
  }] }));

  const result = await captureEvidence({
    campaignId: "fixture-campaign",
    baseline: { commit: "e69ac5544ee64d497e56c060f75e8ba6eaae1ceb" },
    jobIds: [JOB_ID],
    runtimeRoot,
    jobConfigRoot: configRoot,
    outputRoot,
    capturedAt: "2026-08-26T01:00:00.000Z",
  });
  assert.equal(validateManifest(result.manifest).valid, true);
  const kinds = new Set(result.manifest.objects.map(object => object.kind));
  for (const kind of ["jobConfig", "worker-report", "progress", "events", "log", "attempt-journal", "decoded-output-summary"]) {
    assert.ok(kinds.has(kind), `missing ${kind}`);
  }
  const summary = result.manifest.objects.find(object => object.kind === "decoded-output-summary");
  assert.equal(await readFile(result.store.objectPath(summary.sha256), "utf8"), '{"claim":"preserve these exact UTF-8 bytes"}');
  assert.equal(result.manifest.exceptions.length, 0);
});
