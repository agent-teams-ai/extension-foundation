import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, rename, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { promisify } from "node:util";
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
const execFileAsync = promisify(execFile);

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
    objects: [objectRecord(digest, { sourcePath: `job-config/${JOB_ID}/job.json` })],
    jobs: [{
      jobId: JOB_ID,
      wave: "W7",
      jobConfigObject: digest,
      attemptIds: [`${JOB_ID}:attempt:1`],
      currentAlias: digest,
      capturedObjects: [digest],
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
  manifest.jobs[0].currentAlias = "b".repeat(64);
  manifest.jobs[0].jobConfigObject = "c".repeat(64);
  const result = await verifyManifest(manifest);
  assert.equal(result.gates["G-ALIAS"].pass, false);
  assert.equal(result.gates["G-CUSTODY"].pass, false);
  assert.match(result.gates["G-CUSTODY"].failures.join("\n"), /missing object record/u);
});

test("verifier hash and size checks every declared object, including unreferenced records", async t => {
  const root = await temporaryDirectory(t);
  const store = new ObjectStore(root);
  const bytes = Buffer.from("evidence");
  const published = await store.publish(bytes);
  const manifest = validManifest(published.sha256);
  manifest.objects[0] = objectRecord(published.sha256, {
    bytes: bytes.length,
    sourcePath: `job-config/${JOB_ID}/job.json`,
  });
  const unreferenced = sha256("unreferenced");
  manifest.objects.push(objectRecord(unreferenced, { bytes: 12, sourcePath: "research/unreferenced.json" }));

  const missing = await verifyManifest(manifest, { store });
  assert.equal(missing.integrityValid, false);
  assert.match(missing.gates["G-CUSTODY"].failures.join("\n"), new RegExp(unreferenced, "u"));

  const corruptPath = store.objectPath(unreferenced);
  await mkdir(dirname(corruptPath), { recursive: true });
  await writeFile(corruptPath, "wrong bytes!");
  const corrupt = await verifyManifest(manifest, { store });
  assert.equal(corrupt.integrityValid, false);
  assert.match(corrupt.gates["G-CUSTODY"].failures.join("\n"), /corrupt object/u);
});

test("portable verification trusts stored objects and live-source audit is explicit", async t => {
  const root = await temporaryDirectory(t);
  const store = new ObjectStore(root);
  const bytes = Buffer.from("evidence");
  const published = await store.publish(bytes);
  const manifest = validManifest(published.sha256);
  manifest.objects[0] = objectRecord(published.sha256, { bytes: bytes.length, sourcePath: `runtime/${JOB_ID}/retired/source.json` });
  assert.equal((await verifyManifest(manifest, { store })).gates["G-PATH"].pass, true);
  assert.equal((await verifyManifest(manifest, { store, auditLiveSources: true, sourceRoot: root })).gates["G-PATH"].pass, false);
  manifest.objects[0].sourcePath = "/host-specific/source.json";
  assert.equal((await verifyManifest(manifest, { store })).gates["G-PATH"].pass, false);
});

test("job capturedObjects exactly accounts for portable provenance in sorted order", () => {
  const secondDigest = "b".repeat(64);
  const complete = validManifest();
  complete.objects.push(objectRecord(secondDigest, { sourcePath: `runtime/${JOB_ID}/state/attempt-journal/journal.json` }));
  complete.jobs[0].capturedObjects.push(secondDigest);
  assert.equal(validateManifest(complete).valid, true);

  for (const mutate of [
    manifest => { manifest.jobs[0].capturedObjects.pop(); },
    manifest => { manifest.jobs[0].capturedObjects.reverse(); },
    manifest => {
      const foreign = "c".repeat(64);
      manifest.objects.push(objectRecord(foreign, { sourcePath: "research/foreign.json" }));
      manifest.jobs[0].capturedObjects.push(foreign);
    },
    manifest => { manifest.jobs[0].capturedObjects.push(manifest.jobs[0].capturedObjects[0]); },
  ]) {
    const manifest = structuredClone(complete);
    mutate(manifest);
    assert.equal(validateManifest(manifest).valid, false);
  }
});

test("portable source paths and fragments agree in runtime and schema", async () => {
  const schema = JSON.parse(await readFile(join(import.meta.dirname, "..", "architecture", "evidence-custody-manifest.schema.json"), "utf8"));
  const schemaPattern = new RegExp(schema.$defs.object.properties.sourcePath.pattern, "u");
  for (const sourcePath of [
    `job-config/${JOB_ID}/job.json`,
    `job-config/${JOB_ID}/job.json#fragment`,
    `job-config/${JOB_ID}/job.json#attempts/1/lastOutputSummary`,
  ]) {
    const manifest = validManifest();
    manifest.objects[0].sourcePath = sourcePath;
    assert.equal(validateManifest(manifest).valid, true, `runtime rejected ${JSON.stringify(sourcePath)}`);
    assert.equal(schemaPattern.test(sourcePath), true, `schema rejected ${JSON.stringify(sourcePath)}`);
  }
  for (const sourcePath of ["C:/host/file", "z:/host/file", "/host/file", "host\\file", "host/../file", "host//file", "host/./file", "host\0file", "research/#", "research/file#fragment/../x", "research/file#fragment//x", "research/file#fragment#x"]) {
    const manifest = validManifest();
    manifest.objects[0].sourcePath = sourcePath;
    assert.equal(validateManifest(manifest).valid, false, `runtime accepted ${JSON.stringify(sourcePath)}`);
    assert.equal(schemaPattern.test(sourcePath), false, `schema accepted ${JSON.stringify(sourcePath)}`);
  }
});

test("qualification records keep unverifiable historical custody claims unproven", async () => {
  const qualificationRoot = join(import.meta.dirname, "..", "docs", "qualification", "universal-module-extension-system");
  const records = await Promise.all([
    readFile(join(qualificationRoot, "nightly-research-manifest.yaml"), "utf8"),
    readFile(join(qualificationRoot, "nightly", "claim-ledger.yaml"), "utf8"),
    readFile(join(qualificationRoot, "nightly", "README.md"), "utf8"),
  ]);
  const custodyClaims = records.join("\n");
  assert.match(custodyClaims, /verificationStatus: unproven|custody is \*\*unproven\*\*/u);
  assert.doesNotMatch(custodyClaims, /(?:evidenceToolRevision|manifestSha256|assetSha256|capturedJobs|capturedAttempts|capturedObjects|integrityValid:\s*true|integrityValid=true|Research jobs:\s*`\d+`|(?:Manifest|Archive SHA-256):\s*`[a-f0-9]{64}`)/u);
});

test("lineage requires exact membership, adjacent predecessors, and acyclic earlier continuations", () => {
  const secondDigest = "b".repeat(64);
  const base = validManifest();
  base.objects.push(objectRecord(secondDigest));
  base.jobs[0].attemptIds.push(`${JOB_ID}:attempt:2`);
  base.jobs[0].currentAlias = secondDigest;
  base.attempts.push({ ...base.attempts[0], attemptId: `${JOB_ID}:attempt:2`, attemptNumber: 2, predecessorAttemptId: base.attempts[0].attemptId, wrapperObject: secondDigest });
  assert.equal(validateManifest(base).valid, true);

  const duplicate = structuredClone(base);
  duplicate.jobs[0].attemptIds.push(duplicate.jobs[0].attemptIds[0]);
  assert.equal(validateManifest(duplicate).valid, false);
  const orphan = structuredClone(base);
  orphan.jobs[0].attemptIds.pop();
  assert.ok(validateManifest(orphan).errors.some(error => error.includes("exactly one")));
  const duplicateNumber = structuredClone(base);
  duplicateNumber.attempts[1].attemptNumber = 1;
  assert.ok(validateManifest(duplicateNumber).errors.some(error => error.includes("attemptNumber is duplicated")));
  const cycle = structuredClone(base);
  cycle.attempts[0].continuationOf = cycle.attempts[1].attemptId;
  cycle.attempts[1].continuationOf = cycle.attempts[0].attemptId;
  cycle.continuations = cycle.attempts.map(attempt => ({ attemptId: attempt.attemptId, continuationOf: attempt.continuationOf }));
  assert.ok(validateManifest(cycle).errors.some(error => error.includes("cyclic continuation")));
});

test("source and executable claims require bound publishers, attestations, and allowed kinds", async () => {
  const manifest = validManifest();
  manifest.claims.push({
    claimId: "claim",
    text: "claim",
    classification: "observed",
    applicability: "test",
    primarySourceObjects: [manifest.objects[0].sha256, manifest.objects[0].sha256],
    executableEvidenceObjects: [manifest.objects[0].sha256],
    publisherIndependence: [
      { sourceObject: manifest.objects[0].sha256, publisher: " Publisher " },
      { sourceObject: manifest.objects[0].sha256, publisher: "publisher" },
    ],
    executableEvidenceAttestations: [],
    hypothesis: false,
    promotionEligible: true,
  });
  const result = await verifyManifest(manifest);
  assert.equal(result.gates["G-SOURCE"].pass, false);
  assert.match(result.gates["G-CUSTODY"].failures.join("\n"), /unique items/u);
});

test("promotion claims cannot substitute executable evidence for primary sources or invent source kinds", async () => {
  const attestationDigest = "b".repeat(64);
  const executableOnly = validManifest();
  executableOnly.objects[0].kind = "executable-test-result";
  executableOnly.objects.push(objectRecord(attestationDigest, { kind: "execution-attestation", sourcePath: "research/attestation.json" }));
  executableOnly.claims.push({
    claimId: "executable-only",
    text: "Executable evidence cannot replace primary sources",
    classification: "observed",
    applicability: "test",
    primarySourceObjects: [],
    executableEvidenceObjects: [executableOnly.objects[0].sha256],
    publisherIndependence: [],
    executableEvidenceAttestations: [{ evidenceObject: executableOnly.objects[0].sha256, attestationObject: attestationDigest, publisher: "test-runner", status: "passed" }],
    hypothesis: false,
    promotionEligible: true,
  });
  const executableOnlyResult = await verifyManifest(executableOnly);
  assert.equal(executableOnlyResult.gates["G-SOURCE"].pass, false);
  assert.match(executableOnlyResult.gates["G-SOURCE"].failures.join("\n"), /requires both bound independent primary sources/u);

  const arbitrarySources = validManifest();
  const secondSource = "c".repeat(64);
  arbitrarySources.objects[0].kind = "log";
  arbitrarySources.objects.push(objectRecord(secondSource, { kind: "progress", sourcePath: "research/progress.json" }));
  arbitrarySources.claims.push({
    claimId: "invented-sources",
    text: "Arbitrary custody objects are not primary sources",
    classification: "observed",
    applicability: "test",
    primarySourceObjects: [arbitrarySources.objects[0].sha256, secondSource],
    executableEvidenceObjects: [],
    publisherIndependence: [
      { sourceObject: arbitrarySources.objects[0].sha256, publisher: "invented-a" },
      { sourceObject: secondSource, publisher: "invented-b" },
    ],
    executableEvidenceAttestations: [],
    hypothesis: false,
    promotionEligible: true,
  });
  const arbitraryResult = await verifyManifest(arbitrarySources);
  assert.equal(arbitraryResult.gates["G-SOURCE"].pass, false);
  assert.match(arbitraryResult.gates["G-SOURCE"].failures.join("\n"), /ineligible primary-source evidence kind/u);
});

test("executable evidence requires a stored successful attestation", async t => {
  const root = await temporaryDirectory(t);
  const store = new ObjectStore(root);
  const wrapperBytes = Buffer.from(JSON.stringify({ schemaVersion: 1, status: "done", taskId: JOB_ID, runId: JOB_ID, evidence: ["attempt_count:1"] }));
  const wrapper = await store.publish(wrapperBytes);
  const evidenceBytes = Buffer.from("executable result");
  const evidence = await store.publish(evidenceBytes);
  const firstSourceBytes = Buffer.from("primary source a");
  const secondSourceBytes = Buffer.from("primary source b");
  const firstSource = await store.publish(firstSourceBytes);
  const secondSource = await store.publish(secondSourceBytes);

  for (const { name, status, publisher, expected } of [
    { name: "failed", status: "failed", publisher: "test-runner", expected: false },
    { name: "foreign-publisher", status: "passed", publisher: "foreign-runner", expected: false },
    { name: "passed", status: "passed", publisher: "test-runner", expected: true },
  ]) {
    const attestationBytes = Buffer.from(JSON.stringify({ schemaVersion: 1, evidenceObject: evidence.sha256, publisher, status }));
    const attestation = await store.publish(attestationBytes);
    const manifest = validManifest(wrapper.sha256);
    manifest.objects[0] = objectRecord(wrapper.sha256, { bytes: wrapperBytes.length, sourcePath: `job-config/${JOB_ID}/job.json` });
    manifest.objects.push(
      objectRecord(evidence.sha256, { bytes: evidenceBytes.length, kind: "reproduction-result", sourcePath: "research/result.txt" }),
      objectRecord(attestation.sha256, { bytes: attestationBytes.length, kind: "execution-attestation", sourcePath: `research/attestation-${name}.json` }),
      objectRecord(firstSource.sha256, { bytes: firstSourceBytes.length, kind: "primary-source", sourcePath: "research/source-a.txt" }),
      objectRecord(secondSource.sha256, { bytes: secondSourceBytes.length, kind: "primary-source", sourcePath: "research/source-b.txt" }),
    );
    manifest.claims.push({
      claimId: `attestation-${name}`,
      text: "Executable result",
      classification: "observed",
      applicability: "test",
      primarySourceObjects: [firstSource.sha256, secondSource.sha256],
      executableEvidenceObjects: [evidence.sha256],
      publisherIndependence: [
        { sourceObject: firstSource.sha256, publisher: "publisher-a" },
        { sourceObject: secondSource.sha256, publisher: "publisher-b" },
      ],
      executableEvidenceAttestations: [{ evidenceObject: evidence.sha256, attestationObject: attestation.sha256, publisher: "test-runner", status: "passed" }],
      hypothesis: false,
      promotionEligible: true,
    });
    assert.equal(validateManifest(manifest).valid, true);
    const result = await verifyManifest(manifest, { store });
    assert.equal(result.gates["G-SOURCE"].pass, expected);
    if (name === "failed") assert.match(result.gates["G-SOURCE"].failures.join("\n"), /successful result/u);
    if (name === "foreign-publisher") assert.match(result.gates["G-SOURCE"].failures.join("\n"), /declared publisher/u);
  }
});

test("runtime validation closes shapes and matches digest, wave, safe-integer, and enum constraints", () => {
  for (const mutate of [
    manifest => { manifest.extra = true; },
    manifest => { manifest.objects[0].extra = true; },
    manifest => { manifest.jobs[0].wave = "W12"; },
    manifest => { manifest.attempts[0].attemptNumber = Number.MAX_SAFE_INTEGER + 1; },
    manifest => { manifest.attempts[0].status = "running"; },
    manifest => { manifest.jobs[0].jobConfigObject = "not-a-digest"; },
    manifest => { manifest.promotion.manifestGates = true; },
  ]) {
    const manifest = validManifest();
    mutate(manifest);
    assert.equal(validateManifest(manifest).valid, false);
  }
});

test("runtime validation enforces required unique digest arrays and unconditional object digest uniqueness", () => {
  for (const mutate of [
    manifest => { delete manifest.jobs[0].capturedObjects; },
    manifest => { manifest.jobs[0].capturedObjects.push(manifest.jobs[0].capturedObjects[0]); },
    manifest => { manifest.jobs[0].capturedObjects = ["not-a-digest"]; },
    manifest => { manifest.attempts[0].transcriptObjects.push(manifest.attempts[0].transcriptObjects[0]); },
    manifest => { manifest.claims = [{ claimId: "c", text: "t", classification: "observed", applicability: "a", primarySourceObjects: ["bad"], executableEvidenceObjects: [], publisherIndependence: [], executableEvidenceAttestations: [], hypothesis: false, promotionEligible: false }]; },
    manifest => { manifest.claims = [{ claimId: "c", text: "t", classification: "observed", applicability: "a", primarySourceObjects: [manifest.objects[0].sha256], executableEvidenceObjects: [], publisherIndependence: ["unbound-publisher"], executableEvidenceAttestations: [], hypothesis: false, promotionEligible: false }]; },
    manifest => { manifest.claims = [{ claimId: "c", text: "t", classification: "observed", applicability: "a", primarySourceObjects: [], executableEvidenceObjects: [manifest.objects[0].sha256], publisherIndependence: [], executableEvidenceAttestations: [], hypothesis: false, promotionEligible: false }]; },
    manifest => { manifest.claims = [{ claimId: "c", text: "t", classification: "observed", applicability: "a", primarySourceObjects: [], executableEvidenceObjects: [manifest.objects[0].sha256], publisherIndependence: [], executableEvidenceAttestations: [{ evidenceObject: manifest.objects[0].sha256, attestationObject: "b".repeat(64), publisher: "test-runner", status: "failed" }], hypothesis: false, promotionEligible: false }]; },
    manifest => { manifest.objects.push({ ...manifest.objects[0], kind: "rewritten-kind", sourcePath: "different/source.json" }); },
  ]) {
    const manifest = validManifest();
    mutate(manifest);
    assert.equal(validateManifest(manifest).valid, false);
  }
});

test("malformed manifest shapes return a structured fail-closed report and CLI exits nonzero", async t => {
  const manifest = validManifest();
  manifest.jobs = {};
  manifest.attempts = null;
  manifest.promotion = [];
  const report = await verifyManifest(manifest);
  assert.equal(report.valid, false);
  assert.equal(report.integrityValid, false);
  assert.equal(report.promotionAllowed, false);
  assert.ok(Object.values(report.gates).every(gate => gate.pass === false));
  const malformedEntries = validManifest();
  malformedEntries.attempts = [null];
  malformedEntries.continuations = [null];
  assert.equal((await verifyManifest(malformedEntries)).integrityValid, false);

  const root = await temporaryDirectory(t);
  const manifestPath = join(root, "malformed.json");
  await writeFile(manifestPath, JSON.stringify(manifest));
  const cli = join(import.meta.dirname, "..", "architecture", "checks", "evidence-custody-cli.mjs");
  await assert.rejects(execFileAsync(process.execPath, [cli, "verify", manifestPath, join(root, "objects")]), error => {
    const cliReport = JSON.parse(error.stdout);
    assert.equal(cliReport.verification.integrityValid, false);
    assert.match(cliReport.validation.errors.join("\n"), /jobs must be an array/u);
    return error.code === 1;
  });
});

test("CLI reports syntactically malformed JSON without stack traces or host paths", async t => {
  const root = await temporaryDirectory(t);
  const manifestPath = join(root, "syntactically-malformed.json");
  await writeFile(manifestPath, '{"schemaVersion":');
  const cli = join(import.meta.dirname, "..", "architecture", "checks", "evidence-custody-cli.mjs");
  await assert.rejects(execFileAsync(process.execPath, [cli, "verify", manifestPath, join(root, "objects")]), error => {
    assert.equal(error.code, 1);
    assert.equal(error.stderr, "");
    assert.deepEqual(JSON.parse(error.stdout), {
      ok: false,
      error: { code: "INVALID_JSON", message: "input must be valid JSON" },
    });
    assert.equal(error.stdout.includes(root), false);
    assert.equal(error.stdout.includes("SyntaxError"), false);
    return true;
  });
});

test("CLI rejects duplicate JSON keys before manifest validation", async t => {
  const root = await temporaryDirectory(t);
  const manifestPath = join(root, "duplicate-key.json");
  const serialized = JSON.stringify(validManifest()).replace('"status":"completed"', '"status":"running","status":"completed"');
  await writeFile(manifestPath, serialized);
  const cli = join(import.meta.dirname, "..", "architecture", "checks", "evidence-custody-cli.mjs");
  await assert.rejects(execFileAsync(process.execPath, [cli, "verify", manifestPath, join(root, "objects")]), error => {
    assert.equal(error.code, 1);
    assert.equal(error.stderr, "");
    assert.deepEqual(JSON.parse(error.stdout), {
      ok: false,
      error: { code: "INVALID_JSON", message: "input must be valid JSON" },
    });
    return true;
  });
});

test("publication fails closed when its parent directory identity changes", async t => {
  const root = await temporaryDirectory(t);
  const storeRoot = join(root, "store");
  let swapped = false;
  const store = new ObjectStore(storeRoot, { beforePublication: async ({ directory }) => {
    if (swapped) return;
    swapped = true;
    await rename(directory, `${directory}.replaced`);
    await mkdir(directory);
  } });
  await assert.rejects(store.publish("race"), /changed during publication/u);
});

test("worker accounting never becomes voting authority", async () => {
  const manifest = validManifest();
  manifest.promotion.workerAccounting = { countsAsVotes: true, workers: 140 };
  const result = await verifyManifest(manifest);
  assert.equal(result.gates["G-SOURCE"].pass, false);
  assert.match(result.gates["G-CUSTODY"].failures.join("\n"), /countsAsVotes must be false|workers is not allowed/u);
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
    publisherIndependence: [
      { sourceObject: manifest.objects[0].sha256, publisher: "publisher-a" },
      { sourceObject: manifest.objects[0].sha256, publisher: "publisher-b" },
    ],
    executableEvidenceAttestations: [],
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
    executableEvidenceAttestations: [],
    hypothesis: true,
    promotionEligible: false,
  });
  const result = await verifyManifest(manifest);
  assert.equal(result.gates["G-SOURCE"].pass, true);
  assert.equal(result.gates["G-HYPOTHESIS"].pass, true);
  assert.equal(result.gates["G-PROMOTION"].pass, false);
  assert.equal(result.integrityValid, true);
  assert.equal(result.promotionAllowed, false);
});

test("CLI verifies a portable NO-GO bundle without admitting promotion", async t => {
  const root = await temporaryDirectory(t);
  const store = new ObjectStore(join(root, "objects"));
  const bytes = Buffer.from(JSON.stringify({
    schemaVersion: 1,
    status: "done",
    taskId: JOB_ID,
    runId: JOB_ID,
    evidence: ["attempt_count:1"],
  }));
  const published = await store.publish(bytes);
  const manifest = validManifest(published.sha256);
  manifest.objects[0] = objectRecord(published.sha256, { bytes: bytes.length, sourcePath: `job-config/${JOB_ID}/job.json` });
  const manifestPath = join(root, "manifest.json");
  await writeFile(manifestPath, `${JSON.stringify(manifest)}\n`);
  const cli = join(import.meta.dirname, "..", "architecture", "checks", "evidence-custody-cli.mjs");

  const portable = await execFileAsync(process.execPath, [cli, "verify", manifestPath, store.root]);
  const report = JSON.parse(portable.stdout);
  assert.equal(report.verification.integrityValid, true);
  assert.equal(report.verification.promotionAllowed, false);
  await assert.rejects(execFileAsync(process.execPath, [cli, "verify", manifestPath, store.root, "--require-promotion"]), error => error.code === 1);
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
  await writeFile(join(jobRoot, `${JOB_ID}.latest-result.json`), JSON.stringify({
    schemaVersion: 1,
    status: "done",
    taskId: JOB_ID,
    runId: JOB_ID,
    evidence: ["attempt_count:1"],
  }));
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
  assert.deepEqual(result.manifest.jobs[0].capturedObjects, [...result.manifest.jobs[0].capturedObjects].sort());
  assert.equal(result.manifest.jobs[0].capturedObjects.length, result.manifest.objects.length);
  assert.ok(result.manifest.jobs[0].capturedObjects.includes(summary.sha256));
  assert.equal(result.manifest.exceptions.length, 0);
});

async function writeCaptureFixture(root, journalDocuments, { commonBytes = false, wrapper = true, wrapperDocument } = {}) {
  const runtimeRoot = join(root, "runtime");
  const configRoot = join(root, "configs");
  const jobRoot = join(runtimeRoot, JOB_ID);
  await mkdir(join(configRoot, JOB_ID), { recursive: true });
  await mkdir(jobRoot, { recursive: true });
  const contents = commonBytes ? "{}" : undefined;
  await writeFile(join(configRoot, JOB_ID, "job.json"), contents ?? '{"config":true}');
  const latestAttempt = journalDocuments
    .flatMap(document => document.attempts ?? [])
    .sort((left, right) => left.attemptNumber - right.attemptNumber)
    .at(-1);
  const defaultWrapper = {
    schemaVersion: 1,
    status: latestAttempt?.status === "completed" ? "done" : latestAttempt?.status,
    taskId: JOB_ID,
    runId: JOB_ID,
    evidence: [`attempt_count:${latestAttempt?.attemptNumber ?? 0}`],
  };
  if (wrapper) await writeFile(join(jobRoot, `${JOB_ID}.latest-result.json`), contents ?? JSON.stringify(wrapperDocument ?? defaultWrapper));
  await writeFile(join(jobRoot, `${JOB_ID}.progress.json`), contents ?? '{"progress":true}');
  await writeFile(join(jobRoot, `${JOB_ID}.events.jsonl`), contents ?? '{"event":true}');
  await writeFile(join(jobRoot, `${JOB_ID}.log`), contents ?? "complete");
  for (const [index, document] of journalDocuments.entries()) {
    const path = join(jobRoot, "state", "attempt-journal", `journal-${index}.json`);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, JSON.stringify(document));
  }
  return { runtimeRoot, jobConfigRoot: configRoot, outputRoot: join(root, "evidence") };
}

test("capture fails closed when identical bytes have conflicting provenance", async t => {
  const root = await temporaryDirectory(t);
  const paths = await writeCaptureFixture(root, [{ attempts: [] }], { commonBytes: true });
  await assert.rejects(captureEvidence({
    campaignId: "fixture-campaign",
    baseline: {},
    jobIds: [JOB_ID],
    ...paths,
  }), /conflicting provenance for captured object/u);
});

test("capture rejects duplicate keys in attempt journals", async t => {
  const root = await temporaryDirectory(t);
  const paths = await writeCaptureFixture(root, [{ attempts: [] }]);
  const journalPath = join(paths.runtimeRoot, JOB_ID, "state", "attempt-journal", "journal-0.json");
  await writeFile(journalPath, '{"attempts":[],"attempts":[{"attemptNumber":1}]}');
  await assert.rejects(captureEvidence({
    campaignId: "fixture-campaign",
    baseline: {},
    jobIds: [JOB_ID],
    ...paths,
  }), /duplicate JSON keys/u);
});

test("mutable wrappers with a stale attempt or foreign job remain unproven", async t => {
  const entry = { attemptNumber: 2, status: "completed", startedAt: "start", finishedAt: "finish" };
  for (const [name, wrapperDocument] of [
    ["stale", { schemaVersion: 1, status: "done", taskId: JOB_ID, runId: JOB_ID, evidence: ["attempt_count:1"] }],
    ["foreign", { schemaVersion: 1, status: "done", taskId: `${JOB_ID}-foreign`, runId: `${JOB_ID}-foreign`, evidence: ["attempt_count:2"] }],
  ]) {
    const root = await temporaryDirectory(t);
    const paths = await writeCaptureFixture(root, [{ attempts: [entry] }], { wrapperDocument });
    const result = await captureEvidence({ campaignId: `fixture-${name}`, baseline: {}, jobIds: [JOB_ID], ...paths });
    assert.equal(result.manifest.attempts[0].wrapperObject, null);
    assert.ok(result.manifest.exceptions.some(exception => exception.exceptionId.endsWith(":alias-binding:unproven")));
    const verification = await verifyManifest(result.manifest, { store: result.store });
    assert.equal(verification.gates["G-ALIAS"].pass, false);
    assert.equal(verification.integrityValid, false);
  }
});

test("multiple journals bind the wrapper only to the globally latest attempt", async t => {
  const root = await temporaryDirectory(t);
  const entry = attemptNumber => ({ attemptNumber, status: "completed", startedAt: `start-${attemptNumber}`, finishedAt: `finish-${attemptNumber}`, lastOutputSummary: `summary-${attemptNumber}` });
  const paths = await writeCaptureFixture(root, [{ attempts: [entry(1)] }, { attempts: [entry(2)] }]);
  const result = await captureEvidence({ campaignId: "fixture-campaign", baseline: {}, jobIds: [JOB_ID], ...paths });
  const [first, second] = result.manifest.attempts;
  assert.equal(first.wrapperObject, null);
  assert.equal(second.wrapperObject, result.manifest.jobs[0].currentAlias);
  assert.ok(result.manifest.exceptions.some(exception => exception.exceptionId === `${first.attemptId}:wrapper:missing`));
  assert.equal(result.manifest.exceptions.some(exception => exception.exceptionId === `${second.attemptId}:wrapper:missing`), false);
  assert.equal((await verifyManifest(result.manifest, { store: result.store })).integrityValid, true);
});

test("overlapping journals are rejected as ambiguous and missing current wrappers fail closed portably", async t => {
  const root = await temporaryDirectory(t);
  const entry = { attemptNumber: 1, status: "completed", startedAt: "start", finishedAt: "finish" };
  const ambiguous = await writeCaptureFixture(root, [{ attempts: [entry], journal: 1 }, { attempts: [entry], journal: 2 }]);
  await assert.rejects(captureEvidence({ campaignId: "fixture-campaign", baseline: {}, jobIds: [JOB_ID], ...ambiguous }), /ambiguous attempt 1/u);

  const missingRoot = await temporaryDirectory(t);
  const missing = await writeCaptureFixture(missingRoot, [{ attempts: [entry] }], { wrapper: false });
  const result = await captureEvidence({ campaignId: "fixture-campaign", baseline: {}, jobIds: [JOB_ID], ...missing });
  const wrapperExceptions = result.manifest.exceptions.filter(exception => exception.exceptionId.includes(":wrapper:missing"));
  assert.equal(wrapperExceptions.length, 2);
  assert.ok(wrapperExceptions.every(exception => !exception.detail.includes(missingRoot)));
  assert.equal((await verifyManifest(result.manifest, { store: result.store })).integrityValid, false);
});
