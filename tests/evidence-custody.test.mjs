import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { chmod, mkdir, mkdtemp, readFile, readdir, rename, rm, stat, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { delimiter, dirname, join } from "node:path";
import { promisify } from "node:util";
import test from "node:test";

import {
  assertExplicitJobIds,
  assertSafeEvidencePath,
  captureEvidence,
  deterministicJson,
  ObjectStore,
  readSafeJson,
  scanSecrets,
  sha256,
  validateManifest,
  verifyManifest as verifyManifestRaw,
} from "../architecture/checks/evidence-custody.mjs";
import { parseStrictJson } from "../architecture/checks/strict-json.mjs";

const JOB_ID = "modres-w7-example-20260826-r1";
const execFileAsync = promisify(execFile);
const captureTest = process.platform === "win32" ? test.skip : test;

async function createRepositoryFixture(root) {
  const repositoryRoot = join(root, "repository");
  await mkdir(repositoryRoot, { recursive: true });
  await writeFile(join(repositoryRoot, "package.json"), `${JSON.stringify({
    name: "fixture",
    private: true,
    packageManager: "pnpm@11.18.0",
    repository: { type: "git", url: "git+https://github.com/agent-teams-ai/extension-foundation.git" },
  })}\n`);
  await writeFile(join(repositoryRoot, "pnpm-lock.yaml"), "lockfileVersion: '9.0'\n");
  await execFileAsync("git", ["init", "--quiet", repositoryRoot]);
  await execFileAsync("git", ["-C", repositoryRoot, "config", "user.email", "fixture@example.invalid"]);
  await execFileAsync("git", ["-C", repositoryRoot, "config", "user.name", "Fixture"]);
  await execFileAsync("git", ["-C", repositoryRoot, "add", "package.json", "pnpm-lock.yaml"]);
  await execFileAsync("git", ["-C", repositoryRoot, "commit", "--quiet", "-m", "test: fixture"]);
  return repositoryRoot;
}

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

function baselineRecord() {
  return {
    derivation: "canonical-repository-observation-v1",
    repository: "agent-teams-ai/extension-foundation",
    commit: "e69ac5544ee64d497e56c060f75e8ba6eaae1ceb",
    tree: "d70ac93c303c0138d475ac9bf4950f3d3198e41f",
    lockfileSha256: "e".repeat(64),
    clean: true,
    platform: "test-platform",
    nodeVersion: "24.18.0",
    pnpmVersion: "11.18.0",
    capturedAt: "2026-08-26T00:00:00.000Z",
  };
}

function validManifest(digest = "a".repeat(64)) {
  const aliasDigest = digest === "b".repeat(64) ? "f".repeat(64) : "b".repeat(64);
  const summaryDigest = digest === "c".repeat(64) ? "f".repeat(64) : "c".repeat(64);
  const journalDigest = digest === "d".repeat(64) ? "f".repeat(64) : "d".repeat(64);
  return {
    schemaVersion: 2,
    campaignId: "campaign-1",
    baseline: baselineRecord(),
    objects: [
      objectRecord(digest, { kind: "jobConfig", sourcePath: `job-config/${JOB_ID}/job.json` }),
      objectRecord(aliasDigest, { kind: "worker-report", sourcePath: `runtime/${JOB_ID}/${JOB_ID}.latest-result.json` }),
      objectRecord(summaryDigest, {
        kind: "decoded-output-summary",
        sourcePath: `runtime/${JOB_ID}/state/attempt-journal/journal.json#attempts/1/lastOutputSummary`,
      }),
      objectRecord(journalDigest, { kind: "attempt-journal", sourcePath: `runtime/${JOB_ID}/state/attempt-journal/journal.json` }),
    ],
    jobs: [{
      jobId: JOB_ID,
      wave: "W7",
      jobConfigObject: digest,
      attemptIds: [`${JOB_ID}:attempt:1`],
      currentAlias: aliasDigest,
      capturedObjects: [digest, aliasDigest, summaryDigest, journalDigest].sort(),
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
      outputSummaryObject: summaryDigest,
      wrapperObject: aliasDigest,
      transcriptObjects: [journalDigest],
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

async function storedManifest(store) {
  const bytes = {
    config: Buffer.from('{"config":true}'),
    alias: Buffer.from(JSON.stringify({
      schemaVersion: 1,
      status: "done",
      taskId: JOB_ID,
      runId: JOB_ID,
      evidence: ["attempt_count:1"],
    })),
    summary: Buffer.from("summary"),
    journal: Buffer.from(JSON.stringify({ attempts: [{
      attemptNumber: 1,
      status: "completed",
      startedAt: "2026-08-26T00:00:00.000Z",
      finishedAt: "2026-08-26T00:01:00.000Z",
      lastOutputSummary: "summary",
    }] })),
  };
  const published = Object.fromEntries(await Promise.all(Object.entries(bytes).map(async ([key, value]) => [key, await store.publish(value)])));
  const manifest = validManifest(published.config.sha256);
  manifest.objects = [
    objectRecord(published.config.sha256, { bytes: bytes.config.length, kind: "jobConfig", sourcePath: `job-config/${JOB_ID}/job.json` }),
    objectRecord(published.alias.sha256, { bytes: bytes.alias.length, kind: "worker-report", sourcePath: `runtime/${JOB_ID}/${JOB_ID}.latest-result.json` }),
    objectRecord(published.summary.sha256, {
      bytes: bytes.summary.length,
      kind: "decoded-output-summary",
      sourcePath: `runtime/${JOB_ID}/state/attempt-journal/journal.json#attempts/1/lastOutputSummary`,
    }),
    objectRecord(published.journal.sha256, { bytes: bytes.journal.length, kind: "attempt-journal", sourcePath: `runtime/${JOB_ID}/state/attempt-journal/journal.json` }),
  ];
  manifest.jobs[0].jobConfigObject = published.config.sha256;
  manifest.jobs[0].currentAlias = published.alias.sha256;
  manifest.jobs[0].capturedObjects = Object.values(published).map(value => value.sha256).sort();
  manifest.attempts[0].wrapperObject = published.alias.sha256;
  manifest.attempts[0].outputSummaryObject = published.summary.sha256;
  manifest.attempts[0].transcriptObjects = [published.journal.sha256];
  return { manifest, published, bytes };
}

function trustedManifestOptions(manifest, options = {}) {
  const manifestBytes = Buffer.from(`${deterministicJson(manifest)}\n`, "utf8");
  return {
    ...options,
    manifestBytes,
    expectedManifestSha256: sha256(manifestBytes),
  };
}

async function verifyTrustedManifest(manifest, options = {}) {
  return verifyManifestRaw(manifest, trustedManifestOptions(manifest, options));
}

test("explicit allowlist rejects glob admission and duplicates", () => {
  assert.deepEqual(assertExplicitJobIds([JOB_ID]), [JOB_ID]);
  assert.throws(() => assertExplicitJobIds(["modres-w7-*-20260826-r1"]), /invalid explicit job ID/u);
  assert.throws(() => assertExplicitJobIds([JOB_ID, JOB_ID]), /duplicate job ID/u);
  assert.throws(() => assertExplicitJobIds([]), /non-empty explicit allowlist/u);
  assert.throws(() => assertExplicitJobIds([JOB_ID, `${JOB_ID}-extra`], 1), /1-item limit/u);

  let iteratorReads = 0;
  const customIterator = [JOB_ID];
  customIterator[Symbol.iterator] = function* iterator() {
    iteratorReads += 1;
    yield JOB_ID;
    yield `${JOB_ID}-hidden`;
  };
  assert.deepEqual(assertExplicitJobIds(customIterator), [JOB_ID]);
  assert.equal(iteratorReads, 0);
});

test("deterministic JSON documents and enforces its smaller supported domain", () => {
  assert.equal(deterministicJson({ z: 1, a: [true, null] }), '{"a":[true,null],"z":1}');
  assert.throws(() => deterministicJson({ value: undefined }), /outside the deterministic JSON domain/u);
  assert.throws(() => deterministicJson([, 1]), /sparse arrays/u);
  const cyclic = {};
  cyclic.self = cyclic;
  assert.throws(() => deterministicJson(cyclic), /cycle/u);
});

test("strict JSON enforces depth, node, and string limits before JSON.parse", () => {
  const originalParse = JSON.parse;
  let parseCalls = 0;
  JSON.parse = (...arguments_) => {
    parseCalls += 1;
    return originalParse(...arguments_);
  };
  try {
    for (const [text, limits, expected] of [
      ["[[[]]]", { maxDepth: 1, maxNodes: 100, maxStringLength: 100 }, /depth limit/u],
      ["[0,0]", { maxDepth: 10, maxNodes: 2, maxStringLength: 100 }, /node limit/u],
      ['"oversized"', { maxDepth: 10, maxNodes: 10, maxStringLength: 4 }, /string limit/u],
    ]) {
      assert.throws(() => parseStrictJson(text, limits), expected);
      assert.equal(parseCalls, 0, "resource rejection must precede JSON.parse");
    }
    assert.deepEqual(parseStrictJson('["ok"]', { maxDepth: 1, maxNodes: 2, maxStringLength: 2 }), ["ok"]);
    assert.equal(parseCalls, 1);
  } finally {
    JSON.parse = originalParse;
  }
});

test("object publication is idempotent and verifies hash and size", async t => {
  const root = await temporaryDirectory(t);
  const store = new ObjectStore(root);
  const bytes = Buffer.from("evidence");
  const first = await store.publish(bytes);
  const second = await store.publish(bytes);
  assert.deepEqual(second, first);
  assert.equal(await readFile(first.path, "utf8"), "evidence");
  if (process.platform !== "win32") {
    assert.equal((await stat(root)).mode & 0o077, 0, "object store root must be owner-only");
    assert.equal((await stat(first.path)).mode & 0o077, 0, "stored objects must be owner-only");
  }
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

captureTest("object store rejects symlink shards and source capture rejects symlinks", async t => {
  const root = await temporaryDirectory(t);
  const outside = await temporaryDirectory(t);
  const store = new ObjectStore(join(root, "store"));
  await store.initialize();
  const digest = sha256("attack");
  await symlink(outside, join(root, "store", "objects", "sha256", digest.slice(0, 2)));
  await assert.rejects(store.publish("attack"), /unsafe directory component/u);

  const runtimeRoot = join(root, "runtime");
  const configRoot = join(root, "configs");
  const repositoryRoot = await createRepositoryFixture(root);
  await mkdir(join(runtimeRoot, JOB_ID), { recursive: true });
  await mkdir(join(configRoot, JOB_ID), { recursive: true });
  const actual = join(outside, "job.json");
  await writeFile(actual, "{}");
  await symlink(actual, join(configRoot, JOB_ID, "job.json"));
  await assert.rejects(captureEvidence({
    campaignId: "attack",
    repositoryRoot,
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

test("manifest baseline and object roles are exact and fail closed", () => {
  const missingBaseline = validManifest();
  missingBaseline.baseline = {};
  assert.match(validateManifest(missingBaseline).errors.join("\n"), /baseline\.repository/u);

  const reusedRole = validManifest();
  reusedRole.jobs[0].currentAlias = reusedRole.jobs[0].jobConfigObject;
  reusedRole.attempts[0].wrapperObject = reusedRole.jobs[0].jobConfigObject;
  const errors = validateManifest(reusedRole).errors.join("\n");
  assert.match(errors, /must reference worker-report bytes/u);
  assert.match(errors, /incompatible custody roles/u);

  const arbitraryAttemptIdentity = validManifest();
  arbitraryAttemptIdentity.attempts[0].attemptId = "caller-selected-attempt";
  arbitraryAttemptIdentity.jobs[0].attemptIds = ["caller-selected-attempt"];
  assert.match(validateManifest(arbitraryAttemptIdentity).errors.join("\n"), /derived from jobId and attemptNumber/u);
});

captureTest("custody V2 explicitly rejects V1 manifests and declared capture identity", async t => {
  const manifest = validManifest();
  manifest.schemaVersion = 1;
  assert.match(validateManifest(manifest).errors.join("\n"), /schemaVersion 1 is unsupported/u);
  const root = await temporaryDirectory(t);
  const manifestPath = join(root, "v1.json");
  await writeFile(manifestPath, JSON.stringify(manifest));
  const cli = join(import.meta.dirname, "..", "architecture", "checks", "evidence-custody-cli.mjs");
  await assert.rejects(execFileAsync(process.execPath, [
    cli,
    "verify",
    manifestPath,
    join(root, "objects"),
    sha256(await readFile(manifestPath)),
  ]), error => {
    const report = JSON.parse(error.stdout);
    assert.match(report.validation.errors.join("\n"), /schemaVersion 1 is unsupported/u);
    return error.code === 1;
  });
  await assert.rejects(captureEvidence({
    campaignId: "legacy",
    baseline: baselineRecord(),
    repositoryRoot: "/not-consulted",
    jobIds: [JOB_ID],
    runtimeRoot: "/not-consulted",
    jobConfigRoot: "/not-consulted",
    outputRoot: "/not-consulted",
  }), /caller-declared V1 baselines are unsupported/u);
  await assert.rejects(captureEvidence({
    campaignId: "unbacked-lineage",
    repositoryRoot: "/not-consulted",
    jobIds: [JOB_ID],
    runtimeRoot: "/not-consulted",
    jobConfigRoot: "/not-consulted",
    outputRoot: "/not-consulted",
    continuations: [],
  }), /caller-declared continuations are unsupported/u);
});

test("manifest verification requires externally supplied exact manifest identity", async () => {
  const manifest = validManifest();
  const unanchored = await verifyManifestRaw(manifest);
  assert.equal(unanchored.integrityValid, false);
  assert.match(unanchored.gates["G-CUSTODY"].failures.join("\n"), /trusted expected SHA-256/u);
  assert.match(unanchored.gates["G-CUSTODY"].failures.join("\n"), /object store is required/u);
  assert.match(unanchored.gates["G-ALIAS"].failures.join("\n"), /object store is required/u);

  const options = trustedManifestOptions(manifest);
  const relabeled = await verifyManifestRaw(manifest, {
    ...options,
    expectedManifestSha256: "f".repeat(64),
  });
  assert.equal(relabeled.integrityValid, false);
  assert.match(relabeled.gates["G-CUSTODY"].failures.join("\n"), /do not match/u);
});

test("verifier reports missing object records even when alias lineage matches", async () => {
  const manifest = validManifest();
  manifest.jobs[0].currentAlias = "e".repeat(64);
  manifest.attempts[0].wrapperObject = "e".repeat(64);
  manifest.jobs[0].jobConfigObject = "f".repeat(64);
  const result = await verifyTrustedManifest(manifest);
  assert.equal(result.gates["G-ALIAS"].pass, false);
  assert.equal(result.gates["G-CUSTODY"].pass, false);
  assert.match(result.gates["G-CUSTODY"].failures.join("\n"), /missing object record/u);
});

test("verifier hash and size checks every declared object, including unreferenced records", async t => {
  const root = await temporaryDirectory(t);
  const store = new ObjectStore(root);
  const { manifest } = await storedManifest(store);
  const unreferenced = sha256("unreferenced");
  manifest.objects.push(objectRecord(unreferenced, { bytes: 12, sourcePath: "research/unreferenced.json" }));

  const missing = await verifyTrustedManifest(manifest, { store });
  assert.equal(missing.integrityValid, false);
  assert.match(missing.gates["G-CUSTODY"].failures.join("\n"), new RegExp(unreferenced, "u"));

  const corruptPath = store.objectPath(unreferenced);
  await mkdir(dirname(corruptPath), { recursive: true });
  await writeFile(corruptPath, "wrong bytes!");
  const corrupt = await verifyTrustedManifest(manifest, { store });
  assert.equal(corrupt.integrityValid, false);
  assert.match(corrupt.gates["G-CUSTODY"].failures.join("\n"), /corrupt object/u);
});

test("verification reparses stored journals instead of trusting manifest attempt fields", async t => {
  const root = await temporaryDirectory(t);
  const store = new ObjectStore(root);
  const { manifest: original } = await storedManifest(store);
  assert.equal((await verifyTrustedManifest(original, { store })).integrityValid, true);

  for (const mutate of [
    manifest => { manifest.attempts[0].status = "failed"; },
    manifest => { manifest.attempts[0].startedAt = "tampered-start"; },
    manifest => { manifest.attempts[0].finishedAt = "tampered-finish"; },
    manifest => { manifest.attempts[0].outputSummaryObject = null; },
    manifest => {
      const attempt = manifest.attempts[0];
      attempt.attemptNumber = 2;
      attempt.attemptId = `${JOB_ID}:attempt:2`;
      manifest.jobs[0].attemptIds = [attempt.attemptId];
      manifest.objects.find(object => object.sha256 === attempt.outputSummaryObject).sourcePath =
        `runtime/${JOB_ID}/state/attempt-journal/journal.json#attempts/2/lastOutputSummary`;
    },
  ]) {
    const manifest = structuredClone(original);
    mutate(manifest);
    assert.equal(validateManifest(manifest).valid, true);
    const verification = await verifyTrustedManifest(manifest, { store });
    assert.equal(verification.integrityValid, false);
    assert.match(verification.gates["G-CUSTODY"].failures.join("\n"), /stored (?:attempt-journal|journal)/u);
  }
});

test("portable verification trusts stored objects and live-source audit is explicit", async t => {
  const root = await temporaryDirectory(t);
  const store = new ObjectStore(root);
  const { manifest } = await storedManifest(store);
  const sourceBytes = Buffer.from("evidence");
  const source = await store.publish(sourceBytes);
  manifest.objects.push(objectRecord(source.sha256, { bytes: sourceBytes.length, sourcePath: "research/portable-source.json" }));
  assert.equal((await verifyTrustedManifest(manifest, { store })).gates["G-PATH"].pass, true);
  assert.equal((await verifyTrustedManifest(manifest, { store, auditLiveSources: true, sourceRoot: root })).gates["G-PATH"].pass, false);
  manifest.objects.at(-1).sourcePath = "/host-specific/source.json";
  assert.equal((await verifyTrustedManifest(manifest, { store })).gates["G-PATH"].pass, false);
});

test("live-source audit verifies bytes and rejects symlinked ancestors", async t => {
  const root = await temporaryDirectory(t);
  const store = new ObjectStore(join(root, "store"));
  const manifest = validManifest();
  const sourceRoot = join(root, "live");
  const sourceBytes = Buffer.from("exact live evidence");
  const source = await store.publish(sourceBytes);
  manifest.objects = [objectRecord(source.sha256, {
    bytes: sourceBytes.length,
    kind: "primary-source",
    sourcePath: "research/source.json",
  })];
  manifest.jobs = [];
  manifest.attempts = [];
  await mkdir(join(sourceRoot, "research"), { recursive: true });
  await writeFile(join(sourceRoot, "research", "source.json"), sourceBytes);
  assert.equal((await verifyTrustedManifest(manifest, {
    store,
    auditLiveSources: true,
    sourceRoot,
  })).gates["G-PATH"].pass, true);

  await writeFile(join(sourceRoot, "research", "source.json"), "changed");
  assert.equal((await verifyTrustedManifest(manifest, {
    store,
    auditLiveSources: true,
    sourceRoot,
  })).gates["G-PATH"].pass, false);

  const outside = join(root, "outside");
  await mkdir(outside);
  await writeFile(join(outside, "source.json"), sourceBytes);
  await rm(join(sourceRoot, "research"), { recursive: true });
  await symlink(outside, join(sourceRoot, "research"), "dir");
  const symlinked = await verifyTrustedManifest(manifest, { store, auditLiveSources: true, sourceRoot });
  assert.equal(symlinked.gates["G-PATH"].pass, false);
  assert.match(symlinked.gates["G-PATH"].failures.join("\n"), /live source verification failed/u);
});

test("job capturedObjects exactly accounts for portable provenance in sorted order", () => {
  const secondDigest = "e".repeat(64);
  const complete = validManifest();
  complete.objects.push(objectRecord(secondDigest, { kind: "progress", sourcePath: `runtime/${JOB_ID}/${JOB_ID}.progress.json` }));
  complete.jobs[0].capturedObjects.push(secondDigest);
  complete.jobs[0].capturedObjects.sort();
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
  assert.equal(schema.$id.endsWith(".v2.json"), true);
  assert.equal(schema.properties.schemaVersion.const, 2);
  assert.equal(schema.properties.objects.maxItems, 1024);
  assert.equal(schema.properties.claims.maxItems, 512);
  assert.equal(schema.$defs.boundedString.maxLength, 65_536);
  assert.equal(schema.$defs.object.properties.sourcePath.maxLength, 65_536);
  const schemaPattern = new RegExp(schema.$defs.object.properties.sourcePath.pattern, "u");
  for (const sourcePath of [
    "research/source.json",
    "research/source.json#fragment",
    "research/source.json#attempts/1/lastOutputSummary",
  ]) {
    const manifest = validManifest();
    manifest.objects.push(objectRecord("e".repeat(64), { sourcePath }));
    assert.equal(validateManifest(manifest).valid, true, `runtime rejected ${JSON.stringify(sourcePath)}`);
    assert.equal(schemaPattern.test(sourcePath), true, `schema rejected ${JSON.stringify(sourcePath)}`);
  }
  for (const sourcePath of ["C:/host/file", "z:/host/file", "/host/file", "host\\file", "host/../file", "host//file", "host/./file", "host\0file", "research/#", "research/file#fragment/../x", "research/file#fragment//x", "research/file#fragment#x"]) {
    const manifest = validManifest();
    manifest.objects.push(objectRecord("e".repeat(64), { sourcePath }));
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
  const secondDigest = "e".repeat(64);
  const base = validManifest();
  base.objects.push(objectRecord(secondDigest, { kind: "worker-report", sourcePath: `runtime/${JOB_ID}/${JOB_ID}.latest-result.json` }));
  base.jobs[0].capturedObjects.push(secondDigest);
  base.jobs[0].capturedObjects.sort();
  base.jobs[0].attemptIds.push(`${JOB_ID}:attempt:2`);
  base.jobs[0].currentAlias = secondDigest;
  base.attempts.push({
    ...base.attempts[0],
    attemptId: `${JOB_ID}:attempt:2`,
    attemptNumber: 2,
    predecessorAttemptId: base.attempts[0].attemptId,
    outputSummaryObject: null,
    wrapperObject: secondDigest,
  });
  assert.match(validateManifest(base).errors.join("\n"), /allowed only for the latest attempt/u);
  base.attempts[0].wrapperObject = null;
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
  const result = await verifyTrustedManifest(manifest);
  assert.equal(result.gates["G-SOURCE"].pass, false);
  assert.match(result.gates["G-CUSTODY"].failures.join("\n"), /unique items/u);
});

test("promotion claims cannot substitute executable evidence for primary sources or invent source kinds", async () => {
  const executableDigest = "e".repeat(64);
  const attestationDigest = "f".repeat(64);
  const executableOnly = validManifest();
  executableOnly.objects.push(objectRecord(executableDigest, { kind: "executable-test-result", sourcePath: "research/executable.json" }));
  executableOnly.objects.push(objectRecord(attestationDigest, { kind: "execution-attestation", sourcePath: "research/attestation.json" }));
  executableOnly.claims.push({
    claimId: "executable-only",
    text: "Executable evidence cannot replace primary sources",
    classification: "observed",
    applicability: "test",
    primarySourceObjects: [],
    executableEvidenceObjects: [executableDigest],
    publisherIndependence: [],
    executableEvidenceAttestations: [{ evidenceObject: executableDigest, attestationObject: attestationDigest, publisher: "test-runner", status: "passed" }],
    hypothesis: false,
    promotionEligible: true,
  });
  const executableOnlyResult = await verifyTrustedManifest(executableOnly);
  assert.equal(executableOnlyResult.gates["G-SOURCE"].pass, false);
  assert.match(executableOnlyResult.gates["G-SOURCE"].failures.join("\n"), /requires both authenticated independent primary sources/u);

  const arbitrarySources = validManifest();
  const firstSource = "e".repeat(64);
  const secondSource = "f".repeat(64);
  arbitrarySources.objects.push(
    objectRecord(firstSource, { kind: "log", sourcePath: "research/log.txt" }),
    objectRecord(secondSource, { kind: "progress", sourcePath: "research/progress.json" }),
  );
  arbitrarySources.claims.push({
    claimId: "invented-sources",
    text: "Arbitrary custody objects are not primary sources",
    classification: "observed",
    applicability: "test",
    primarySourceObjects: [firstSource, secondSource],
    executableEvidenceObjects: [],
    publisherIndependence: [
      { sourceObject: firstSource, publisher: "invented-a" },
      { sourceObject: secondSource, publisher: "invented-b" },
    ],
    executableEvidenceAttestations: [],
    hypothesis: false,
    promotionEligible: true,
  });
  const arbitraryResult = await verifyTrustedManifest(arbitrarySources);
  assert.equal(arbitraryResult.gates["G-SOURCE"].pass, false);
  assert.match(arbitraryResult.gates["G-SOURCE"].failures.join("\n"), /ineligible primary-source evidence kind/u);
});

test("non-promotable positive claims still cannot treat publisher metadata as authenticated", async () => {
  const manifest = validManifest();
  const first = "e".repeat(64);
  const second = "f".repeat(64);
  manifest.objects.push(
    objectRecord(first, { kind: "primary-source", sourcePath: "research/primary-a.json" }),
    objectRecord(second, { kind: "primary-source", sourcePath: "research/primary-b.json" }),
  );
  manifest.claims.push({
    claimId: "structurally-custodied-only",
    text: "Stored source bytes do not authenticate their publishers",
    classification: "observed",
    applicability: "qualification only",
    primarySourceObjects: [first, second],
    executableEvidenceObjects: [],
    publisherIndependence: [
      { sourceObject: first, publisher: "publisher-a" },
      { sourceObject: second, publisher: "publisher-b" },
    ],
    executableEvidenceAttestations: [],
    hypothesis: false,
    promotionEligible: false,
  });
  const result = await verifyTrustedManifest(manifest);
  assert.equal(result.gates["G-SOURCE"].pass, false);
  assert.match(result.gates["G-SOURCE"].failures.join("\n"), /positive claim/u);
});

test("source-free positive claims fail the V2 source gate", async () => {
  const manifest = validManifest();
  manifest.claims.push({
    claimId: "source-free-authority",
    text: "The candidate is approved",
    classification: "decision-authority",
    applicability: "qualification only",
    primarySourceObjects: [],
    executableEvidenceObjects: [],
    publisherIndependence: [],
    executableEvidenceAttestations: [],
    hypothesis: false,
    promotionEligible: false,
  });
  const result = await verifyTrustedManifest(manifest);
  assert.equal(result.gates["G-SOURCE"].pass, false);
  assert.match(result.gates["G-SOURCE"].failures.join("\n"), /authenticated source receipt/u);
  assert.equal(result.integrityValid, false);
});

test("V2 executable evidence remains unauthenticated even when stored JSON says passed", async t => {
  const root = await temporaryDirectory(t);
  const store = new ObjectStore(root);
  const { manifest: baseManifest } = await storedManifest(store);
  const evidenceBytes = Buffer.from("executable result");
  const evidence = await store.publish(evidenceBytes);
  const firstSourceBytes = Buffer.from("primary source a");
  const secondSourceBytes = Buffer.from("primary source b");
  const firstSource = await store.publish(firstSourceBytes);
  const secondSource = await store.publish(secondSourceBytes);

  for (const { name, status, publisher, expected } of [
    { name: "failed", status: "failed", publisher: "test-runner", expected: false },
    { name: "foreign-publisher", status: "passed", publisher: "foreign-runner", expected: false },
    { name: "passed", status: "passed", publisher: "test-runner", expected: false },
  ]) {
    const attestationBytes = Buffer.from(JSON.stringify({ schemaVersion: 1, evidenceObject: evidence.sha256, publisher, status }));
    const attestation = await store.publish(attestationBytes);
    const manifest = structuredClone(baseManifest);
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
    const result = await verifyTrustedManifest(manifest, { store });
    assert.equal(result.gates["G-SOURCE"].pass, expected);
    if (name === "failed") assert.match(result.gates["G-SOURCE"].failures.join("\n"), /successful result/u);
    if (name === "foreign-publisher") assert.match(result.gates["G-SOURCE"].failures.join("\n"), /declared publisher/u);
    if (name === "passed") assert.match(result.gates["G-SOURCE"].failures.join("\n"), /unauthenticated/u);
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
  const report = await verifyTrustedManifest(manifest);
  assert.equal(report.valid, false);
  assert.equal(report.integrityValid, false);
  assert.equal(report.promotionAllowed, false);
  assert.ok(Object.values(report.gates).every(gate => gate.pass === false));
  const malformedEntries = validManifest();
  malformedEntries.attempts = [null];
  malformedEntries.continuations = [null];
  assert.equal((await verifyTrustedManifest(malformedEntries)).integrityValid, false);

  const root = await temporaryDirectory(t);
  const manifestPath = join(root, "malformed.json");
  await writeFile(manifestPath, JSON.stringify(manifest));
  const cli = join(import.meta.dirname, "..", "architecture", "checks", "evidence-custody-cli.mjs");
  const manifestDigest = sha256(await readFile(manifestPath));
  await assert.rejects(execFileAsync(process.execPath, [cli, "verify", manifestPath, join(root, "objects"), manifestDigest]), error => {
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
  await assert.rejects(execFileAsync(process.execPath, [cli, "verify", manifestPath, join(root, "objects"), sha256(await readFile(manifestPath))]), error => {
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
  await assert.rejects(execFileAsync(process.execPath, [cli, "verify", manifestPath, join(root, "objects"), sha256(await readFile(manifestPath))]), error => {
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

test("publication rejects a symlink-swapped ancestor before creating an escaped object", async t => {
  const root = await temporaryDirectory(t);
  const storeRoot = join(root, "store");
  const movedObjects = join(root, "moved-objects");
  const store = new ObjectStore(storeRoot, { beforePublication: async () => {
    await rename(join(storeRoot, "objects"), movedObjects);
    await symlink(movedObjects, join(storeRoot, "objects"), "dir");
  } });
  await assert.rejects(store.publish("ancestor-race"), /unsafe directory component/u);
  const files = (await readdir(movedObjects, { recursive: true, withFileTypes: true }))
    .filter(entry => entry.isFile());
  assert.deepEqual(files, []);
});

test("object publication snapshots mutable Buffer input before asynchronous work", async t => {
  const root = await temporaryDirectory(t);
  const store = new ObjectStore(join(root, "objects"));
  const input = Buffer.from("immutable snapshot", "utf8");
  const expected = Buffer.from(input);
  const publication = store.publish(input);
  input.fill(0x78);
  const published = await publication;
  assert.equal(published.sha256, sha256(expected));
  assert.deepEqual(await readFile(published.path), expected);

  const arrayStore = new ObjectStore(join(root, "array-buffer-objects"));
  const mutableBytes = new TextEncoder().encode("array buffer snapshot");
  const expectedArrayBytes = Buffer.from(mutableBytes);
  const arrayPublication = arrayStore.publish(mutableBytes.buffer);
  mutableBytes.fill(0x78);
  const publishedArray = await arrayPublication;
  assert.equal(publishedArray.sha256, sha256(expectedArrayBytes));
  assert.deepEqual(await readFile(publishedArray.path), expectedArrayBytes);
});

test("object publication rejects shared memory inputs", async t => {
  const root = await temporaryDirectory(t);
  const store = new ObjectStore(join(root, "objects"));
  const shared = new SharedArrayBuffer(16);
  await assert.rejects(store.publish(shared), /must not use shared memory/u);
  await assert.rejects(store.publish(new Uint8Array(shared)), /must not use shared memory/u);
  const sharedBuffer = Buffer.from(shared);
  Object.defineProperty(sharedBuffer, "buffer", {
    configurable: true,
    get() {
      return new ArrayBuffer(16);
    },
  });
  await assert.rejects(store.publish(sharedBuffer), /must not use shared memory/u);

  const ordinary = new Uint8Array([1, 2, 3]);
  let overriddenGetterReads = 0;
  for (const property of ["buffer", "byteOffset", "byteLength"]) {
    Object.defineProperty(ordinary, property, {
      configurable: true,
      get() {
        overriddenGetterReads += 1;
        throw new Error("caller-owned getter must not run");
      },
    });
  }
  const published = await store.publish(ordinary);
  assert.deepEqual(await readFile(published.path), Buffer.from([1, 2, 3]));
  assert.equal(overriddenGetterReads, 0);
});

test("temporary recovery applies a streaming directory-entry budget", async t => {
  const root = await temporaryDirectory(t);
  const store = new ObjectStore(join(root, "objects"));
  await store.initialize();
  const shard = join(store.root, "objects", "sha256", "aa");
  await mkdir(shard);
  await writeFile(join(shard, "one"), "one");
  await writeFile(join(shard, "two"), "two");
  await assert.rejects(store.recoverTemporaries({ maxDirectoryEntries: 1 }), /recovery directory-entry limit/u);
});

test("worker accounting never becomes voting authority", async () => {
  const manifest = validManifest();
  manifest.promotion.workerAccounting = { countsAsVotes: true, workers: 140 };
  const result = await verifyTrustedManifest(manifest);
  assert.equal(result.gates["G-SOURCE"].pass, false);
  assert.match(result.gates["G-CUSTODY"].failures.join("\n"), /countsAsVotes must be false|workers is not allowed/u);
});

test("worker reports are not primary sources and unsupported inference needs a hypothesis label", async () => {
  const manifest = validManifest();
  const reportDigest = "e".repeat(64);
  manifest.objects.push(objectRecord(reportDigest, { kind: "worker-report", sourcePath: "research/worker-report.json" }));
  manifest.claims.push({
    claimId: "claim-1",
    text: "A correlated worker conclusion",
    classification: "inference",
    applicability: "campaign only",
    primarySourceObjects: [reportDigest, reportDigest],
    executableEvidenceObjects: [],
    publisherIndependence: [
      { sourceObject: reportDigest, publisher: "publisher-a" },
      { sourceObject: reportDigest, publisher: "publisher-b" },
    ],
    executableEvidenceAttestations: [],
    hypothesis: false,
    promotionEligible: true,
  });
  const result = await verifyTrustedManifest(manifest);
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
  const result = await verifyTrustedManifest(manifest);
  assert.equal(result.gates["G-SOURCE"].pass, true);
  assert.equal(result.gates["G-HYPOTHESIS"].pass, true);
  assert.equal(result.gates["G-PROMOTION"].pass, false);
  assert.equal(result.integrityValid, false);
  assert.equal(result.promotionAllowed, false);
});

test("CLI verifies a portable NO-GO bundle without admitting promotion", async t => {
  const root = await temporaryDirectory(t);
  const store = new ObjectStore(join(root, "objects"));
  const { manifest } = await storedManifest(store);
  const manifestPath = join(root, "manifest.json");
  await writeFile(manifestPath, `${JSON.stringify(manifest)}\n`);
  const cli = join(import.meta.dirname, "..", "architecture", "checks", "evidence-custody-cli.mjs");
  const manifestDigest = sha256(await readFile(manifestPath));

  const portable = await execFileAsync(process.execPath, [cli, "verify", manifestPath, store.root, manifestDigest]);
  const report = JSON.parse(portable.stdout);
  assert.equal(report.verification.integrityValid, true);
  assert.equal(report.verification.promotionAllowed, false);
  await assert.rejects(execFileAsync(process.execPath, [cli, "verify", manifestPath, store.root, manifestDigest, "--require-promotion"]), error => {
    assert.equal(error.code, 2);
    assert.match(error.stderr, /usage: evidence-custody/u);
    return true;
  });
});

test("secret scanning detects common credentials without echoing the secret", () => {
  const secret = `sk-proj-${"x".repeat(32)}`;
  assert.throws(() => scanSecrets(`token=${secret}`, "fixture"), error => {
    assert.match(error.message, /openai-key/u);
    assert.equal(error.message.includes(secret), false);
    return true;
  });
  assert.throws(() => scanSecrets(`token=${secret}`, secret), error => {
    assert.equal(error.message.includes(secret), false);
    assert.equal(error.findings.some(finding => finding.label.includes(secret)), false);
    return true;
  });
  assert.deepEqual(scanSecrets("ordinary research output"), []);
  assert.throws(() => scanSecrets(`token=${"a".repeat(24)}`), /credential-assignment/u);
  const hostileLabel = {
    [Symbol.toPrimitive]() {
      throw new Error(secret);
    },
  };
  assert.throws(() => scanSecrets(`token=${secret}`, hostileLabel), error => {
    assert.equal(error.message.includes(secret), false);
    assert.ok(error.findings.every(finding => finding.label === "[redacted-label]"));
    return true;
  });
});

test("decoded JSON secret escapes fail closed without echoing the secret", async t => {
  const root = await temporaryDirectory(t);
  const genericSecret = "a".repeat(24);
  const fixtures = [
    ["unicode", `{"unknown":"sk-\\u0070roj-${"x".repeat(32)}"}\n`, /openai-key/u, "sk-proj-"],
    ["quote", `${JSON.stringify({ message: `token=\"${genericSecret}\"` })}\n`, /credential-assignment/u, genericSecret],
    ["tab", `${JSON.stringify({ message: `token=\t${genericSecret}` })}\n`, /credential-assignment/u, genericSecret],
    ["newline", `${JSON.stringify({ message: `token=\n${genericSecret}` })}\n`, /credential-assignment/u, genericSecret],
    ["double-encoded", `${JSON.stringify({ message: JSON.stringify(`token=\"${genericSecret}\"`) })}\n`, /credential-assignment/u, genericSecret],
    ["authorization-field", `${JSON.stringify({ Authorization: `Bearer ${genericSecret}` })}\n`, /authorization-header/u, genericSecret],
    ["nested-token-array", `${JSON.stringify({ token: [{ value: genericSecret }] })}\n`, /credential-assignment/u, genericSecret],
    ["nested-token-object", `${JSON.stringify({ token: { value: genericSecret } })}\n`, /credential-assignment/u, genericSecret],
    ["nested-token-authorization", `${JSON.stringify({ token: { authorization: { value: genericSecret } } })}\n`, /credential-assignment/u, genericSecret],
    ["nested-authorization-token", `${JSON.stringify({ Authorization: { token: { value: `Bearer ${genericSecret}` } } })}\n`, /authorization-header/u, genericSecret],
    ["double-escaped-token-key", `${JSON.stringify({ "tok\\u0065n": genericSecret })}\n`, /credential-assignment/u, genericSecret],
    ["double-escaped-authorization-key", `${JSON.stringify({ "Authoriz\\u0061tion": `Bearer ${genericSecret}` })}\n`, /authorization-header/u, genericSecret],
  ];
  for (const [name, document, expected, secret] of fixtures) {
    const path = join(root, `${name}-escaped-secret.json`);
    await writeFile(path, document);
    await assert.rejects(readSafeJson(path), error => {
      assert.match(error.message, expected);
      assert.equal(error.message.includes(secret), false);
      return true;
    });
  }
});

test("secret-shaped evidence paths never appear in read diagnostics", async t => {
  const root = await temporaryDirectory(t);
  const secret = `sk-proj-${"x".repeat(32)}`;
  const secretPath = join(root, secret);
  await mkdir(secretPath);
  await assert.rejects(readSafeJson(secretPath), error => {
    assert.equal(error.message.includes(secret), false);
    return true;
  });
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

test("canonical auth-root checks reject a permitted-looking symlink ancestor", async t => {
  const root = await temporaryDirectory(t);
  const privateState = join(root, "private-state");
  const allowed = join(root, "allowed-link");
  await mkdir(privateState);
  await symlink(privateState, allowed);
  const prior = process.env.CODEX_HOME;
  process.env.CODEX_HOME = privateState;
  try {
    await assert.rejects(new ObjectStore(join(allowed, "evidence")).initialize(), /CODEX_HOME/u);
  } finally {
    if (prior === undefined) delete process.env.CODEX_HOME;
    else process.env.CODEX_HOME = prior;
  }
});

captureTest("capture preserves required runtime bytes and decodes lastOutputSummary", async t => {
  const root = await temporaryDirectory(t);
  const repositoryRoot = await createRepositoryFixture(root);
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
    repositoryRoot,
    jobIds: [JOB_ID],
    runtimeRoot,
    jobConfigRoot: configRoot,
    outputRoot,
    capturedAt: "2026-08-26T01:00:00.000Z",
  });
  const [{ stdout: commit }, { stdout: tree }] = await Promise.all([
    execFileAsync("git", ["-C", repositoryRoot, "rev-parse", "HEAD"]),
    execFileAsync("git", ["-C", repositoryRoot, "rev-parse", "HEAD^{tree}"]),
  ]);
  assert.deepEqual(result.manifest.baseline, {
    derivation: "canonical-repository-observation-v1",
    repository: "agent-teams-ai/extension-foundation",
    commit: commit.trim(),
    tree: tree.trim(),
    lockfileSha256: sha256(await readFile(join(repositoryRoot, "pnpm-lock.yaml"))),
    clean: true,
    platform: `${process.platform}/${process.arch}`,
    nodeVersion: process.versions.node,
    pnpmVersion: "11.18.0",
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
  const repositoryRoot = await createRepositoryFixture(root);
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
  return { repositoryRoot, runtimeRoot, jobConfigRoot: configRoot, outputRoot: join(root, "evidence") };
}

captureTest("capture requires a canonical clean repository root", async t => {
  const root = await temporaryDirectory(t);
  const paths = await writeCaptureFixture(root, [{ attempts: [] }]);
  await writeFile(join(paths.repositoryRoot, "untracked.txt"), "dirty");
  await assert.rejects(captureEvidence({
    campaignId: "dirty-baseline",
    jobIds: [JOB_ID],
    ...paths,
  }), /must be clean at capture/u);
  await rm(join(paths.repositoryRoot, "untracked.txt"));
  const nested = join(paths.repositoryRoot, "nested");
  await mkdir(nested);
  await assert.rejects(captureEvidence({
    campaignId: "noncanonical-baseline",
    jobIds: [JOB_ID],
    ...paths,
    repositoryRoot: nested,
  }), /canonical Git worktree root/u);
});

captureTest("capture rejects masked baseline files and oversized job allowlists before source I/O", async t => {
  for (const flag of ["--assume-unchanged", "--skip-worktree"]) {
    const root = await temporaryDirectory(t);
    const paths = await writeCaptureFixture(root, [{ attempts: [] }]);
    await execFileAsync("git", ["-C", paths.repositoryRoot, "update-index", flag, "package.json"]);
    await assert.rejects(captureEvidence({
      campaignId: "masked-baseline",
      jobIds: [JOB_ID],
      ...paths,
    }), /index flags/u);
  }

  for (const flag of ["--assume-unchanged", "--skip-worktree"]) {
    const root = await temporaryDirectory(t);
    const paths = await writeCaptureFixture(root, [{ attempts: [] }]);
    await writeFile(join(paths.repositoryRoot, "masked.txt"), "original\n");
    await execFileAsync("git", ["-C", paths.repositoryRoot, "add", "masked.txt"]);
    await execFileAsync("git", ["-C", paths.repositoryRoot, "commit", "--quiet", "-m", "test: tracked file"]);
    await execFileAsync("git", ["-C", paths.repositoryRoot, "update-index", flag, "masked.txt"]);
    await writeFile(join(paths.repositoryRoot, "masked.txt"), "modified but hidden\n");
    assert.equal((await execFileAsync("git", ["-C", paths.repositoryRoot, "status", "--porcelain=v1"])).stdout, "");
    await assert.rejects(captureEvidence({
      campaignId: "masked-worktree",
      jobIds: [JOB_ID],
      ...paths,
    }), /tracked files must not use/u);
  }

  const jobIds = Array.from({ length: 257 }, (_, index) => `modres-w7-job-${index + 1}-20260826-r1`);
  await assert.rejects(captureEvidence({
    campaignId: "oversized-job-list",
    repositoryRoot: "/definitely/not/a/repository",
    jobIds,
    runtimeRoot: "/definitely/not/a/runtime",
    jobConfigRoot: "/definitely/not/configs",
    outputRoot: "/definitely/not/output",
  }), /256-item limit/u);
});

captureTest("capture hashes exact HEAD bytes and rejects escaped secrets before publication", async t => {
  const exactRoot = await temporaryDirectory(t);
  const exactPaths = await writeCaptureFixture(exactRoot, [{ attempts: [] }]);
  const lockfileBytes = Buffer.concat([
    Buffer.from("lockfileVersion: '9.0'\n# "),
    Buffer.from([0xff, 0xfe]),
    Buffer.from("\n"),
  ]);
  await writeFile(join(exactPaths.repositoryRoot, "pnpm-lock.yaml"), lockfileBytes);
  await execFileAsync("git", ["-C", exactPaths.repositoryRoot, "add", "pnpm-lock.yaml"]);
  await execFileAsync("git", ["-C", exactPaths.repositoryRoot, "commit", "--quiet", "-m", "test: binary lockfile bytes"]);
  const exact = await captureEvidence({
    campaignId: "exact-head-bytes",
    jobIds: [JOB_ID],
    ...exactPaths,
  });
  assert.equal(exact.manifest.baseline.lockfileSha256, sha256(lockfileBytes));

  const secretRoot = await temporaryDirectory(t);
  const secretPaths = await writeCaptureFixture(secretRoot, [{ attempts: [] }]);
  const escapedSecret = "a".repeat(24);
  await writeFile(
    join(secretPaths.jobConfigRoot, JOB_ID, "job.json"),
    `${JSON.stringify({ message: `token=\"${escapedSecret}\"` })}\n`,
  );
  await assert.rejects(captureEvidence({
    campaignId: "escaped-capture-secret",
    jobIds: [JOB_ID],
    ...secretPaths,
  }), error => {
    assert.match(error.message, /credential-assignment/u);
    assert.equal(error.message.includes(escapedSecret), false);
    return true;
  });
  const outputEntries = await readdir(secretPaths.outputRoot, { recursive: true, withFileTypes: true });
  assert.equal(outputEntries.some(entry => entry.isFile()), false);

  const jsonlRoot = await temporaryDirectory(t);
  const jsonlPaths = await writeCaptureFixture(jsonlRoot, [{ attempts: [] }]);
  await writeFile(
    join(jsonlPaths.runtimeRoot, JOB_ID, `${JOB_ID}.events.jsonl`),
    `${JSON.stringify({ "tok\\u0065n": escapedSecret })}\n`,
  );
  await assert.rejects(captureEvidence({
    campaignId: "double-escaped-jsonl-key",
    jobIds: [JOB_ID],
    ...jsonlPaths,
  }), error => {
    assert.match(error.message, /credential-assignment/u);
    assert.equal(error.message.includes(escapedSecret), false);
    return true;
  });

  for (const [name, malformedDocument, expected] of [
    ["message", `{\"message\":\"token=\\\"${escapedSecret}\\\"\",}\n`, /credential-assignment/u],
    ["token-field", `{"token":"${escapedSecret}",}\n`, /valid bounded JSON/u],
    ["authorization-field", `{"Authorization":"Bearer ${escapedSecret}",}\n`, /valid bounded JSON/u],
  ]) {
    const malformedRoot = await temporaryDirectory(t);
    const malformedPaths = await writeCaptureFixture(malformedRoot, [{ attempts: [] }]);
    await writeFile(join(malformedPaths.jobConfigRoot, JOB_ID, "job.json"), malformedDocument);
    await assert.rejects(captureEvidence({
      campaignId: `malformed-escaped-secret-${name}`,
      jobIds: [JOB_ID],
      ...malformedPaths,
    }), expected);
    const malformedOutputEntries = await readdir(malformedPaths.outputRoot, { recursive: true, withFileTypes: true });
    assert.equal(malformedOutputEntries.some(entry => entry.isFile()), false);
  }
});

captureTest("capture scans the assembled manifest before publishing it", async t => {
  const root = await temporaryDirectory(t);
  const paths = await writeCaptureFixture(root, [{ attempts: [] }]);
  const secret = "a".repeat(24);
  await assert.rejects(captureEvidence({
    campaignId: "manifest-secret",
    jobIds: [JOB_ID],
    claims: [{
      claimId: "claim-1",
      text: `token=\"${secret}\"`,
      classification: "hypothesis",
      applicability: "qualification only",
      primarySourceObjects: [],
      executableEvidenceObjects: [],
      publisherIndependence: [],
      executableEvidenceAttestations: [],
      hypothesis: true,
      promotionEligible: false,
    }],
    ...paths,
  }), error => {
    assert.match(error.message, /credential-assignment/u);
    assert.equal(error.message.includes(secret), false);
    return true;
  });
  await assert.rejects(readdir(join(paths.outputRoot, "manifests")), error => error.code === "ENOENT");
  const storedFiles = (await readdir(paths.outputRoot, { recursive: true, withFileTypes: true }))
    .filter(entry => entry.isFile());
  for (const entry of storedFiles) {
    assert.equal((await readFile(join(entry.parentPath, entry.name), "utf8")).includes(secret), false);
  }

  const secretKeyRoot = await temporaryDirectory(t);
  const secretKeyPaths = await writeCaptureFixture(secretKeyRoot, [{ attempts: [] }]);
  const secretKey = `token=${secret}`;
  await assert.rejects(captureEvidence({
    campaignId: "manifest-secret-key",
    jobIds: [JOB_ID],
    claims: [{
      claimId: "claim-1",
      text: "safe",
      classification: "hypothesis",
      applicability: "qualification only",
      primarySourceObjects: [],
      executableEvidenceObjects: [],
      publisherIndependence: [],
      executableEvidenceAttestations: [],
      hypothesis: true,
      promotionEligible: false,
      [secretKey]: true,
    }],
    ...secretKeyPaths,
  }), error => {
    assert.match(error.message, /credential-assignment/u);
    assert.equal(error.message.includes(secret), false);
    return true;
  });
});

captureTest("capture snapshots claims and promotion input before asynchronous custody work", async t => {
  const root = await temporaryDirectory(t);
  const paths = await writeCaptureFixture(root, [{ attempts: [] }]);
  const claims = [{
    claimId: "claim-1",
    text: "initial claim",
    classification: "hypothesis",
    applicability: "qualification only",
    primarySourceObjects: [],
    executableEvidenceObjects: [],
    publisherIndependence: [],
    executableEvidenceAttestations: [],
    hypothesis: true,
    promotionEligible: false,
  }];
  const promotion = {};
  const capture = captureEvidence({
    campaignId: "snapshot-programmatic-input",
    jobIds: [JOB_ID],
    claims,
    promotion,
    ...paths,
  });
  claims[0].text = "mutated after invocation";
  promotion.unexpected = "mutated after invocation";
  const result = await capture;
  assert.equal(result.manifest.claims[0].text, "initial claim");
  assert.equal(Object.hasOwn(result.manifest.promotion, "unexpected"), false);
});

test("manifest node limits reject oversized sparse arrays before reading elements", () => {
  const claims = [];
  claims.length = 1_000_000;
  let elementRead = false;
  Object.defineProperty(claims, 0, {
    enumerable: true,
    get() {
      elementRead = true;
      return null;
    },
  });
  const manifest = validManifest();
  manifest.claims = claims;
  assert.deepEqual(validateManifest(manifest).errors, ["JSON node limit exceeded"]);
  assert.equal(elementRead, false);

  let iteratorReads = 0;
  const customIterator = [];
  customIterator[Symbol.iterator] = function* iterator() {
    iteratorReads += 1;
    yield null;
  };
  const iteratorManifest = validManifest();
  iteratorManifest.claims = customIterator;
  validateManifest(iteratorManifest, { maxJsonNodes: 64 });
  assert.equal(iteratorReads, 0);

  const nestedIteratorManifest = validManifest();
  const nestedAttemptIds = [...nestedIteratorManifest.jobs[0].attemptIds];
  nestedAttemptIds[Symbol.iterator] = function* iterator() {
    iteratorReads += 1;
    yield "attacker-controlled";
  };
  nestedIteratorManifest.jobs[0].attemptIds = nestedAttemptIds;
  assert.equal(validateManifest(nestedIteratorManifest).valid, true);
  assert.equal(iteratorReads, 0);

  const secret = `sk-proj-${"x".repeat(32)}`;
  const accessor = [null];
  Object.defineProperty(accessor, 0, {
    enumerable: true,
    get() {
      throw new Error(secret);
    },
  });
  const accessorManifest = validManifest();
  accessorManifest.claims = accessor;
  const accessorResult = validateManifest(accessorManifest);
  assert.deepEqual(accessorResult.errors, ["JSON value must not contain accessors"]);
  assert.equal(accessorResult.errors.join("\n").includes(secret), false);

  let proxyTrapCalls = 0;
  const proxiedPromotion = new Proxy({}, {
    ownKeys() {
      proxyTrapCalls += 1;
      throw new Error(secret);
    },
  });
  const proxyManifest = validManifest();
  proxyManifest.promotion = proxiedPromotion;
  assert.deepEqual(validateManifest(proxyManifest).errors, ["JSON value must not contain proxies"]);
  assert.equal(proxyTrapCalls, 0);
});

test("Windows remains verifier-only and rejects capture before source I/O", {
  skip: process.platform !== "win32",
}, async () => {
  await assert.rejects(captureEvidence({
    campaignId: "windows-verifier-only",
    repositoryRoot: "Z:\\must-not-read",
    jobIds: [JOB_ID],
    runtimeRoot: "Z:\\must-not-read-runtime",
    jobConfigRoot: "Z:\\must-not-read-config",
    outputRoot: "Z:\\must-not-write-output",
  }), /strict evidence capture is supported only on Linux and macOS/u);
});

captureTest("capture accepts only explicit credential-free GitHub repository URLs", async t => {
  for (const repository of [
    "file://github.com/agent-teams-ai/extension-foundation.git",
    "https://evilgithub.com/agent-teams-ai/extension-foundation.git",
    "https://user:sentinel-secret@github.com/agent-teams-ai/extension-foundation.git",
  ]) {
    const root = await temporaryDirectory(t);
    const paths = await writeCaptureFixture(root, [{ attempts: [] }]);
    const manifestPath = join(paths.repositoryRoot, "package.json");
    const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
    manifest.repository = { type: "git", url: repository };
    await writeFile(manifestPath, `${JSON.stringify(manifest)}\n`);
    await execFileAsync("git", ["-C", paths.repositoryRoot, "add", "package.json"]);
    await execFileAsync("git", ["-C", paths.repositoryRoot, "commit", "--quiet", "-m", "test: invalid repository identity"]);
    await assert.rejects(captureEvidence({
      campaignId: "invalid-repository-identity",
      jobIds: [JOB_ID],
      ...paths,
    }), error => {
      assert.match(error.message, /lowercase owner\/repository/u);
      assert.equal(error.message.includes("sentinel-secret"), false);
      return true;
    });
  }

  const root = await temporaryDirectory(t);
  const paths = await writeCaptureFixture(root, [{ attempts: [] }]);
  const manifestPath = join(paths.repositoryRoot, "package.json");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  manifest.repository.url = "git+https://GitHub.com/agent-teams-ai/extension-foundation.git";
  await writeFile(manifestPath, `${JSON.stringify(manifest)}\n`);
  await execFileAsync("git", ["-C", paths.repositoryRoot, "add", "package.json"]);
  await execFileAsync("git", ["-C", paths.repositoryRoot, "commit", "--quiet", "-m", "test: case-insensitive GitHub host"]);
  const result = await captureEvidence({ campaignId: "valid-repository-identity", jobIds: [JOB_ID], ...paths });
  assert.equal(result.manifest.baseline.repository, "agent-teams-ai/extension-foundation");
});

captureTest("capture bounds repository observation subprocesses", async t => {
  const root = await temporaryDirectory(t);
  const repositoryRoot = await createRepositoryFixture(root);
  const bin = join(root, "bin");
  await mkdir(bin);
  const fakeGit = join(bin, "git");
  await writeFile(fakeGit, "#!/usr/bin/env node\nsetInterval(() => {}, 1000);\n");
  await chmod(fakeGit, 0o755);
  const priorPath = process.env.PATH;
  process.env.PATH = `${bin}${delimiter}${priorPath ?? ""}`;
  try {
    await assert.rejects(captureEvidence({
      campaignId: "bounded-observation",
      repositoryRoot,
      jobIds: [JOB_ID],
      runtimeRoot: root,
      jobConfigRoot: root,
      outputRoot: join(root, "evidence"),
      resourceLimits: { maxObservationMs: 50 },
    }), /Git top-level observation timed out/u);
  } finally {
    if (priorPath === undefined) delete process.env.PATH;
    else process.env.PATH = priorPath;
  }
});

captureTest("capture derives its baseline without Git replacement refs", async t => {
  const root = await temporaryDirectory(t);
  const paths = await writeCaptureFixture(root, [{ attempts: [{
    attemptNumber: 1,
    status: "completed",
    startedAt: "start",
    finishedAt: "finish",
  }] }]);
  const { stdout: originalCommitOutput } = await execFileAsync(
    "git",
    ["-C", paths.repositoryRoot, "rev-parse", "HEAD"],
  );
  const { stdout: originalTreeOutput } = await execFileAsync(
    "git",
    ["-C", paths.repositoryRoot, "rev-parse", "HEAD^{tree}"],
  );
  await writeFile(join(paths.repositoryRoot, "forged.txt"), "replacement tree\n");
  await execFileAsync("git", ["-C", paths.repositoryRoot, "add", "forged.txt"]);
  await execFileAsync("git", ["-C", paths.repositoryRoot, "commit", "--quiet", "-m", "test: forged replacement"]);
  const { stdout: replacementCommitOutput } = await execFileAsync(
    "git",
    ["-C", paths.repositoryRoot, "rev-parse", "HEAD"],
  );
  await execFileAsync("git", ["-C", paths.repositoryRoot, "reset", "--hard", "--quiet", originalCommitOutput.trim()]);
  await execFileAsync("git", ["-C", paths.repositoryRoot, "replace", originalCommitOutput.trim(), replacementCommitOutput.trim()]);

  const result = await captureEvidence({
    campaignId: "replace-safe-baseline",
    jobIds: [JOB_ID],
    ...paths,
  });
  assert.equal(result.manifest.baseline.commit, originalCommitOutput.trim());
  assert.equal(result.manifest.baseline.tree, originalTreeOutput.trim());
});

captureTest("capture fails closed when identical bytes have conflicting provenance", async t => {
  const root = await temporaryDirectory(t);
  const paths = await writeCaptureFixture(root, [{ attempts: [] }], { commonBytes: true });
  await assert.rejects(captureEvidence({
    campaignId: "fixture-campaign",
    jobIds: [JOB_ID],
    ...paths,
  }), /conflicting provenance for captured object/u);
});

captureTest("capture rejects duplicate keys in attempt journals", async t => {
  const root = await temporaryDirectory(t);
  const paths = await writeCaptureFixture(root, [{ attempts: [] }]);
  const journalPath = join(paths.runtimeRoot, JOB_ID, "state", "attempt-journal", "journal-0.json");
  await writeFile(journalPath, '{"attempts":[],"attempts":[{"attemptNumber":1}]}');
  await assert.rejects(captureEvidence({
    campaignId: "fixture-campaign",
    jobIds: [JOB_ID],
    ...paths,
  }), /duplicate JSON keys/u);
});

captureTest("capture validates extensionless attempt journals before publication", async t => {
  const root = await temporaryDirectory(t);
  const paths = await writeCaptureFixture(root, [{ attempts: [] }]);
  const bytes = Buffer.from("not-json", "utf8");
  await writeFile(join(paths.runtimeRoot, JOB_ID, "state", "attempt-journal", "extensionless"), bytes);
  await assert.rejects(captureEvidence({
    campaignId: "extensionless-journal",
    jobIds: [JOB_ID],
    ...paths,
  }), /valid bounded JSON/u);
  const objectPath = new ObjectStore(paths.outputRoot).objectPath(sha256(bytes));
  await assert.rejects(readFile(objectPath), error => error.code === "ENOENT");
});

captureTest("capture enforces bounded files, aggregate bytes, and JSON complexity", async t => {
  for (const [name, resourceLimits, expected] of [
    ["file-size", { maxFileBytes: 2 }, /byte limit|file-size limit/u],
    ["file-count", { maxFiles: 3 }, /file-count limit/u],
    ["aggregate", { maxTotalBytes: 16 }, /aggregate byte limit/u],
    ["json-depth", { maxJsonDepth: 1 }, /JSON depth limit/u],
    ["json-nodes", { maxJsonNodes: 2 }, /JSON node limit/u],
    ["json-string", { maxJsonStringLength: 8 }, /JSON string limit/u],
  ]) {
    const root = await temporaryDirectory(t);
    const paths = await writeCaptureFixture(root, [{ attempts: [{
      attemptNumber: 1,
      status: "completed",
      startedAt: "start",
      finishedAt: "finish",
    }] }]);
    await assert.rejects(captureEvidence({
      campaignId: `fixture-${name}`,
      jobIds: [JOB_ID],
      resourceLimits,
      ...paths,
    }), expected);
  }
});

captureTest("capture applies tightened limits to final manifest validation", async t => {
  const root = await temporaryDirectory(t);
  const paths = await writeCaptureFixture(root, [{ attempts: [{
    attemptNumber: 1,
    status: "completed",
    startedAt: "start",
    finishedAt: "finish",
  }] }]);
  const claim = claimId => ({
    claimId,
    text: "unproven",
    classification: "hypothesis",
    applicability: "test",
    primarySourceObjects: [],
    executableEvidenceObjects: [],
    publisherIndependence: [],
    executableEvidenceAttestations: [],
    hypothesis: true,
    promotionEligible: false,
  });
  await assert.rejects(captureEvidence({
    campaignId: "fixture-final-limits",
    jobIds: [JOB_ID],
    claims: [claim("one"), claim("two")],
    resourceLimits: { maxManifestClaims: 1 },
    ...paths,
  }), /claims exceeds the 1-item limit/u);
});

captureTest("capture caps recursive directory traversal", async t => {
  const root = await temporaryDirectory(t);
  const paths = await writeCaptureFixture(root, [{ attempts: [] }]);
  const nested = join(paths.runtimeRoot, JOB_ID, "state", "attempt-journal", "nested");
  await mkdir(nested, { recursive: true });
  await writeFile(join(nested, "extra.json"), '{"extra":true}');
  await assert.rejects(captureEvidence({
    campaignId: "fixture-directories",
    jobIds: [JOB_ID],
    resourceLimits: { maxDirectories: 1 },
    ...paths,
  }), /directory-count limit/u);
  await assert.rejects(captureEvidence({
    campaignId: "fixture-directory-entries",
    jobIds: [JOB_ID],
    resourceLimits: { maxDirectoryEntries: 1 },
    ...paths,
  }), /directory-entry limit/u);
});

captureTest("capture bounds stale manifest recovery scans", async t => {
  const root = await temporaryDirectory(t);
  const paths = await writeCaptureFixture(root, [{ attempts: [] }]);
  const manifestDirectory = join(paths.outputRoot, "manifests", "bounded-manifest-recovery");
  await mkdir(manifestDirectory, { recursive: true });
  await writeFile(join(manifestDirectory, ".one.tmp"), "one");
  await writeFile(join(manifestDirectory, ".two.tmp"), "two");
  await assert.rejects(captureEvidence({
    campaignId: "bounded-manifest-recovery",
    jobIds: [JOB_ID],
    resourceLimits: { maxDirectoryEntries: 1 },
    ...paths,
  }), /recovery directory-entry limit/u);
});

test("manifest collection bounds fail before lineage expansion", () => {
  const manifest = validManifest();
  manifest.attempts.push({ ...manifest.attempts[0], attemptId: `${JOB_ID}:attempt:2`, attemptNumber: 2 });
  const result = validateManifest(manifest, { maxManifestAttempts: 1 });
  assert.equal(result.valid, false);
  assert.deepEqual(result.errors, ["attempts exceeds the 1-item limit"]);

  const references = validManifest();
  references.jobs[0].attemptIds.push(`${JOB_ID}:attempt:2`);
  const referenceResult = validateManifest(references, { maxReferencesPerEntry: 1 });
  assert.equal(referenceResult.valid, false);
  assert.match(referenceResult.errors.join("\n"), /attemptIds exceeds the 1-item limit/u);

  const strings = validManifest();
  assert.match(validateManifest(strings, { maxJsonStringLength: 4 }).errors.join("\n"), /JSON string limit exceeded/u);

  const bytes = validManifest();
  assert.match(validateManifest(bytes, { maxFileBytes: 4 }).errors.join("\n"), /file limit/u);
});

captureTest("mutable wrappers with a stale attempt or foreign job remain unproven", async t => {
  const entry = { attemptNumber: 2, status: "completed", startedAt: "start", finishedAt: "finish" };
  for (const [name, wrapperDocument] of [
    ["stale", { schemaVersion: 1, status: "done", taskId: JOB_ID, runId: JOB_ID, evidence: ["attempt_count:1"] }],
    ["foreign", { schemaVersion: 1, status: "done", taskId: `${JOB_ID}-foreign`, runId: `${JOB_ID}-foreign`, evidence: ["attempt_count:2"] }],
  ]) {
    const root = await temporaryDirectory(t);
    const paths = await writeCaptureFixture(root, [{ attempts: [entry] }], { wrapperDocument });
    const result = await captureEvidence({ campaignId: `fixture-${name}`, jobIds: [JOB_ID], ...paths });
    assert.equal(result.manifest.attempts[0].wrapperObject, null);
    assert.ok(result.manifest.exceptions.some(exception => exception.exceptionId.endsWith(":alias-binding:unproven")));
    const verification = await verifyTrustedManifest(result.manifest, { store: result.store });
    assert.equal(verification.gates["G-ALIAS"].pass, false);
    assert.equal(verification.integrityValid, false);
  }
});

captureTest("multiple journals bind the wrapper only to the globally latest attempt", async t => {
  const root = await temporaryDirectory(t);
  const entry = attemptNumber => ({ attemptNumber, status: "completed", startedAt: `start-${attemptNumber}`, finishedAt: `finish-${attemptNumber}`, lastOutputSummary: `summary-${attemptNumber}` });
  const paths = await writeCaptureFixture(root, [{ attempts: [entry(1)] }, { attempts: [entry(2)] }]);
  const result = await captureEvidence({ campaignId: "fixture-campaign", jobIds: [JOB_ID], ...paths });
  const [first, second] = result.manifest.attempts;
  assert.equal(first.wrapperObject, null);
  assert.equal(second.wrapperObject, result.manifest.jobs[0].currentAlias);
  assert.ok(result.manifest.exceptions.some(exception => exception.exceptionId === `${first.attemptId}:wrapper:missing`));
  assert.equal(result.manifest.exceptions.some(exception => exception.exceptionId === `${second.attemptId}:wrapper:missing`), false);
  assert.equal((await verifyTrustedManifest(result.manifest, { store: result.store })).integrityValid, true);
});

captureTest("stored journals are the only authority for continuation lineage", async t => {
  const root = await temporaryDirectory(t);
  const entry = attemptNumber => ({
    attemptNumber,
    status: "completed",
    startedAt: `start-${attemptNumber}`,
    finishedAt: `finish-${attemptNumber}`,
    ...(attemptNumber === 2 ? { continuationOf: 1 } : {}),
  });
  const paths = await writeCaptureFixture(root, [{ attempts: [entry(1), entry(2)] }]);
  const result = await captureEvidence({ campaignId: "fixture-continuation", jobIds: [JOB_ID], ...paths });
  assert.deepEqual(result.manifest.continuations, [{
    attemptId: `${JOB_ID}:attempt:2`,
    continuationOf: `${JOB_ID}:attempt:1`,
  }]);
  assert.equal((await verifyTrustedManifest(result.manifest, { store: result.store })).integrityValid, true);

  const unbacked = structuredClone(result.manifest);
  unbacked.attempts[1].continuationOf = null;
  unbacked.continuations = [];
  assert.equal(validateManifest(unbacked).valid, true);
  const verification = await verifyTrustedManifest(unbacked, { store: result.store });
  assert.equal(verification.integrityValid, false);
  assert.match(verification.gates["G-CUSTODY"].failures.join("\n"), /continuationOf does not match stored attempt-journal bytes/u);
});

captureTest("invalid journal paths and lineage fail before journal publication", async t => {
  const traversalRoot = await temporaryDirectory(t);
  const traversalPaths = await writeCaptureFixture(traversalRoot, []);
  const traversalSecret = `token=${"y".repeat(32)}`;
  const traversalDirectory = join(traversalPaths.runtimeRoot, JOB_ID, "state", "attempt-journal");
  await mkdir(traversalDirectory, { recursive: true });
  await symlink("missing-target", join(traversalDirectory, traversalSecret));
  await assert.rejects(captureEvidence({
    campaignId: "secret-journal-traversal",
    jobIds: [JOB_ID],
    ...traversalPaths,
  }), error => {
    assert.equal(error.message.includes(traversalSecret), false);
    return true;
  });

  const secretRoot = await temporaryDirectory(t);
  const secretPaths = await writeCaptureFixture(secretRoot, []);
  const secret = `token=${"x".repeat(32)}`;
  const invalidBytes = Buffer.from("not-json", "utf8");
  const invalidPath = join(secretPaths.runtimeRoot, JOB_ID, "state", "attempt-journal", secret);
  await mkdir(dirname(invalidPath), { recursive: true });
  await writeFile(invalidPath, invalidBytes);
  await assert.rejects(captureEvidence({
    campaignId: "secret-journal-path",
    jobIds: [JOB_ID],
    ...secretPaths,
  }), error => {
    assert.equal(error.message.includes(secret), false);
    return true;
  });
  await assert.rejects(
    stat(new ObjectStore(secretPaths.outputRoot).objectPath(sha256(invalidBytes))),
    error => error.code === "ENOENT",
  );

  const lineageRoot = await temporaryDirectory(t);
  const journal = { attempts: [{
    attemptNumber: 1,
    status: "completed",
    startedAt: "start",
    finishedAt: "finish",
    continuationOf: 1,
  }] };
  const lineagePaths = await writeCaptureFixture(lineageRoot, [journal]);
  const journalBytes = Buffer.from(JSON.stringify(journal));
  await assert.rejects(captureEvidence({
    campaignId: "invalid-journal-lineage",
    jobIds: [JOB_ID],
    ...lineagePaths,
  }), /invalid continuation lineage/u);
  await assert.rejects(
    stat(new ObjectStore(lineagePaths.outputRoot).objectPath(sha256(journalBytes))),
    error => error.code === "ENOENT",
  );
});

captureTest("global attempt bounds are checked before any journal publication", async t => {
  const root = await temporaryDirectory(t);
  const repositoryRoot = await createRepositoryFixture(root);
  const runtimeRoot = join(root, "runtime");
  const jobConfigRoot = join(root, "configs");
  const outputRoot = join(root, "evidence");
  const secondJobId = "modres-w7-second-20260826-r1";
  const journals = [];
  for (const [index, jobId] of [JOB_ID, secondJobId].entries()) {
    const journal = { attempts: [{
      attemptNumber: 1,
      status: "completed",
      startedAt: `start-${index}`,
      finishedAt: `finish-${index}`,
    }] };
    const bytes = Buffer.from(JSON.stringify(journal));
    const path = join(runtimeRoot, jobId, "state", "attempt-journal", "journal.json");
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, bytes);
    journals.push(bytes);
  }
  await assert.rejects(captureEvidence({
    campaignId: "global-attempt-bound",
    repositoryRoot,
    jobIds: [JOB_ID, secondJobId],
    runtimeRoot,
    jobConfigRoot,
    outputRoot,
    resourceLimits: { maxManifestAttempts: 1 },
  }), /global manifest attempt limit/u);
  for (const bytes of journals) {
    await assert.rejects(
      stat(new ObjectStore(outputRoot).objectPath(sha256(bytes))),
      error => error.code === "ENOENT",
    );
  }
});

captureTest("overlapping journals are rejected as ambiguous and missing current wrappers fail closed portably", async t => {
  const root = await temporaryDirectory(t);
  const entry = { attemptNumber: 1, status: "completed", startedAt: "start", finishedAt: "finish" };
  const ambiguous = await writeCaptureFixture(root, [{ attempts: [entry], journal: 1 }, { attempts: [entry], journal: 2 }]);
  await assert.rejects(captureEvidence({ campaignId: "fixture-campaign", jobIds: [JOB_ID], ...ambiguous }), /ambiguous attempt 1/u);

  const missingRoot = await temporaryDirectory(t);
  const missing = await writeCaptureFixture(missingRoot, [{ attempts: [entry] }], { wrapper: false });
  const result = await captureEvidence({ campaignId: "fixture-campaign", jobIds: [JOB_ID], ...missing });
  const wrapperExceptions = result.manifest.exceptions.filter(exception => exception.exceptionId.includes(":wrapper:missing"));
  assert.equal(wrapperExceptions.length, 2);
  assert.ok(wrapperExceptions.every(exception => !exception.detail.includes(missingRoot)));
  assert.equal((await verifyTrustedManifest(result.manifest, { store: result.store })).integrityValid, false);
});
