import { createHash } from "node:crypto";
import { constants } from "node:fs";
import {
  link,
  lstat,
  mkdir,
  open,
  readdir,
  realpath,
  rm,
} from "node:fs/promises";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";

const SHA256 = /^[a-f0-9]{64}$/u;
const JOB_ID = /^modres-w(?:[1-9]|10|11)-[a-z0-9][a-z0-9-]*-\d{8}-r\d+$/u;
const CAMPAIGN_ID = /^[a-z0-9][a-z0-9.-]{0,127}$/u;
const TERMINAL = new Set(["abandoned", "blocked", "cancelled", "completed", "done", "failed"]);
const CLASSIFICATIONS = new Set([
  "observed",
  "inference",
  "hypothesis",
  "decision-authority",
  "unsupported",
  "contradicted",
]);
const GATES = [
  "G-CUSTODY",
  "G-TERMINAL",
  "G-ALIAS",
  "G-PATH",
  "G-SOURCE",
  "G-HYPOTHESIS",
  "G-DRAFT-SCOPE",
  "G-SYNTHESIS",
  "G-PROMOTION",
];
const REQUIRED_FILES = ["job.json", "latest-result", "progress", "events", "log", "attempt-journal"];
const SECRET_PATTERNS = [
  { id: "pem-private-key", expression: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/u },
  { id: "github-token", expression: /\b(?:gh[opusr]_[A-Za-z0-9_]{20,}|github_pat_[A-Za-z0-9_]{20,})\b/u },
  { id: "openai-key", expression: /\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}\b/u },
  { id: "aws-access-key", expression: /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/u },
  { id: "authorization-header", expression: /\bAuthorization\s*:\s*(?:Bearer|Basic)\s+[A-Za-z0-9+/_=.-]{12,}/iu },
  { id: "credential-assignment", expression: /\b(?:api[_-]?key|(?:access|auth)[_-]?token|token|client[_-]?secret|password)\s*[=:]\s*["']?[A-Za-z0-9+/_=.-]{16,}/iu },
];

function record(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function contained(root, candidate) {
  const relation = relative(root, candidate);
  return relation === "" || (!isAbsolute(relation) && relation !== ".." && !relation.startsWith(`..${sep}`));
}

export function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

/**
 * Deterministic JSON for an intentionally small domain: null, booleans,
 * strings, finite JSON numbers, dense arrays and plain string-keyed objects.
 * Object keys are sorted by UTF-16 code units. Unicode and number spellings are
 * those produced by JSON.stringify. This is not claimed to implement RFC 8785.
 */
export function deterministicJson(value) {
  const active = new Set();
  function encode(candidate, path) {
    if (candidate === null || typeof candidate === "boolean" || typeof candidate === "string") {
      return JSON.stringify(candidate);
    }
    if (typeof candidate === "number") {
      if (!Number.isFinite(candidate)) throw new TypeError(`${path} must contain only finite numbers`);
      return JSON.stringify(candidate);
    }
    if (typeof candidate !== "object") throw new TypeError(`${path} is outside the deterministic JSON domain`);
    if (active.has(candidate)) throw new TypeError(`${path} contains a cycle`);
    active.add(candidate);
    try {
      if (Array.isArray(candidate)) {
        for (let index = 0; index < candidate.length; index += 1) {
          if (!Object.hasOwn(candidate, index)) throw new TypeError(`${path} must not contain sparse arrays`);
        }
        return `[${candidate.map((entry, index) => encode(entry, `${path}[${index}]`)).join(",")}]`;
      }
      const prototype = Object.getPrototypeOf(candidate);
      if (prototype !== Object.prototype && prototype !== null) {
        throw new TypeError(`${path} must contain only plain objects`);
      }
      const keys = Object.keys(candidate).sort();
      return `{${keys.map(key => `${JSON.stringify(key)}:${encode(candidate[key], `${path}.${key}`)}`).join(",")}}`;
    } finally {
      active.delete(candidate);
    }
  }
  return encode(value, "$");
}

export function assertExplicitJobIds(jobIds) {
  if (!Array.isArray(jobIds) || jobIds.length === 0) throw new Error("jobIds must be a non-empty explicit allowlist");
  const seen = new Set();
  for (const jobId of jobIds) {
    if (typeof jobId !== "string" || !JOB_ID.test(jobId) || /[*?\[\]{}!]/u.test(jobId)) {
      throw new Error(`invalid explicit job ID: ${String(jobId)}`);
    }
    if (seen.has(jobId)) throw new Error(`duplicate job ID: ${jobId}`);
    seen.add(jobId);
  }
  return [...jobIds].sort();
}

function assertPermittedRoot(path, label) {
  const normalized = resolve(path);
  const forbidden = ["live-codex-auth", "codex-home", ".codex", "encryption-key.hex"];
  if (forbidden.some(part => normalized.split(sep).includes(part))) {
    throw new Error(`${label} must not target an auth root or CODEX_HOME`);
  }
  const configuredCodexHome = process.env.CODEX_HOME === undefined ? undefined : resolve(process.env.CODEX_HOME);
  if (configuredCodexHome !== undefined && contained(configuredCodexHome, normalized)) {
    throw new Error(`${label} must not target an auth root or CODEX_HOME`);
  }
  return normalized;
}

export function assertSafeEvidencePath(path, label = "evidence path") {
  return assertPermittedRoot(path, label);
}

async function assertDirectoryChain(root, directory) {
  if (!contained(root, directory)) throw new Error("path escapes its configured root");
  const relation = relative(root, directory);
  let current = root;
  const rootMetadata = await lstat(root);
  if (rootMetadata.isSymbolicLink() || !rootMetadata.isDirectory()) throw new Error("configured root must be a real directory");
  for (const part of relation.split(sep).filter(Boolean)) {
    current = join(current, part);
    let metadata;
    try {
      metadata = await lstat(current);
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
      await mkdir(current).catch(createError => {
        if (createError?.code !== "EEXIST") throw createError;
      });
      metadata = await lstat(current);
    }
    if (metadata.isSymbolicLink() || !metadata.isDirectory()) throw new Error(`unsafe directory component: ${current}`);
  }
}

async function syncDirectory(directory) {
  const handle = await open(directory, constants.O_RDONLY);
  try {
    await handle.sync();
  } catch (error) {
    if (process.platform !== "win32" || !["EACCES", "EINVAL", "EISDIR", "EPERM"].includes(error?.code)) throw error;
  } finally {
    await handle.close();
  }
}

async function secureRead(root, path) {
  const absoluteRoot = resolve(root);
  const absolutePath = resolve(path);
  if (!contained(absoluteRoot, absolutePath)) throw new Error(`source path escapes configured root: ${path}`);
  const rootMetadata = await lstat(absoluteRoot);
  if (rootMetadata.isSymbolicLink() || !rootMetadata.isDirectory()) throw new Error("source root must be a real directory");
  const parent = dirname(absolutePath);
  const [canonicalRoot, canonicalParent] = await Promise.all([realpath(absoluteRoot), realpath(parent)]);
  if (!contained(canonicalRoot, canonicalParent)) throw new Error(`source path traverses a symbolic link: ${path}`);
  const before = await lstat(absolutePath);
  if (before.isSymbolicLink() || !before.isFile()) throw new Error(`source must be a regular non-symlink file: ${path}`);
  const handle = await open(absolutePath, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
  try {
    const after = await handle.stat();
    if (!after.isFile() || before.dev !== after.dev || before.ino !== after.ino || before.size !== after.size) {
      throw new Error(`source changed while opening: ${path}`);
    }
    return await handle.readFile();
  } finally {
    await handle.close();
  }
}

let nonce = 0;
function temporaryName(digest) {
  nonce += 1;
  return `.${digest}.${process.pid}-${process.hrtime.bigint()}-${nonce}.tmp`;
}

function temporaryOwnerIsAlive(name) {
  const match = name.match(/^\.[a-f0-9]{64}\.(\d+)-.+\.tmp$/u);
  if (match === null) return false;
  try {
    process.kill(Number(match[1]), 0);
    return true;
  } catch (error) {
    if (error?.code === "EPERM") return true;
    if (error?.code === "ESRCH") return false;
    throw error;
  }
}

export class ObjectStore {
  constructor(root) {
    this.root = assertPermittedRoot(root, "object store");
  }

  objectPath(digest) {
    if (!SHA256.test(digest)) throw new Error("object digest must be lowercase SHA-256");
    return join(this.root, "objects", "sha256", digest.slice(0, 2), digest.slice(2));
  }

  async initialize() {
    await mkdir(this.root, { recursive: true });
    await assertDirectoryChain(this.root, join(this.root, "objects", "sha256"));
  }

  async recoverTemporaries() {
    await this.initialize();
    const base = join(this.root, "objects", "sha256");
    for (const shard of await readdir(base, { withFileTypes: true })) {
      if (!shard.isDirectory() || !/^[a-f0-9]{2}$/u.test(shard.name)) continue;
      const directory = join(base, shard.name);
      const metadata = await lstat(directory);
      if (metadata.isSymbolicLink()) throw new Error("object shard must not be a symlink");
      for (const entry of await readdir(directory, { withFileTypes: true })) {
        if (!entry.name.startsWith(".") || !entry.name.endsWith(".tmp")) continue;
        const path = join(directory, entry.name);
        const temporaryMetadata = await lstat(path);
        if (temporaryMetadata.isSymbolicLink() || !temporaryMetadata.isFile()) {
          throw new Error("publication temporary must remain a regular file");
        }
        if (temporaryOwnerIsAlive(entry.name)) continue;
        await rm(path);
      }
    }
  }

  async verify(digest, bytes) {
    const path = this.objectPath(digest);
    const stored = await secureRead(this.root, path);
    if (stored.length !== bytes.length || sha256(stored) !== digest || !stored.equals(bytes)) {
      throw new Error(`content-address collision or corruption at ${path}`);
    }
    return { path, sha256: digest, bytes: stored.length };
  }

  async publish(input) {
    const bytes = Buffer.isBuffer(input) ? input : Buffer.from(input);
    const digest = sha256(bytes);
    await this.initialize();
    const destination = this.objectPath(digest);
    const directory = dirname(destination);
    await assertDirectoryChain(this.root, directory);
    try {
      return await this.verify(digest, bytes);
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
    const temporary = join(directory, temporaryName(digest));
    const handle = await open(temporary, "wx", 0o444);
    let linked = false;
    try {
      await handle.writeFile(bytes);
      await handle.sync();
      await handle.close();
      try {
        await link(temporary, destination);
        linked = true;
        await syncDirectory(directory);
      } catch (error) {
        if (error?.code !== "EEXIST") throw error;
      }
      return await this.verify(digest, bytes);
    } finally {
      await handle.close().catch(() => undefined);
      await rm(temporary).catch(error => {
        if (error?.code !== "ENOENT") throw error;
      });
      if (linked) await syncDirectory(directory);
    }
  }
}

export function scanSecrets(bytes, label = "input") {
  const text = Buffer.isBuffer(bytes) ? bytes.toString("utf8") : String(bytes);
  const findings = SECRET_PATTERNS
    .filter(({ expression }) => expression.test(text))
    .map(({ id }) => ({ id, label }));
  if (findings.length > 0) {
    const error = new Error(`secret scan failed for ${label}: ${findings.map(entry => entry.id).join(", ")}`);
    error.findings = findings;
    throw error;
  }
  return [];
}

function requiredString(value, path, errors) {
  if (typeof value !== "string" || value.length === 0) errors.push(`${path} must be a non-empty string`);
}

function requiredArray(value, path, errors) {
  if (!Array.isArray(value)) errors.push(`${path} must be an array`);
}

export function validateManifest(manifest) {
  const errors = [];
  if (!record(manifest)) return { valid: false, errors: ["manifest must be an object"] };
  if (manifest.schemaVersion !== 1) errors.push("schemaVersion must be 1");
  requiredString(manifest.campaignId, "campaignId", errors);
  if (!CAMPAIGN_ID.test(manifest.campaignId ?? "")) errors.push("campaignId must be a safe lowercase path component");
  if (!record(manifest.baseline)) errors.push("baseline must be an object");
  for (const field of ["objects", "jobs", "attempts", "continuations", "claims", "exceptions"]) {
    requiredArray(manifest[field], field, errors);
  }
  if (!record(manifest.promotion)) errors.push("promotion must be an object");

  const objects = new Map();
  for (const [index, object] of (manifest.objects ?? []).entries()) {
    const path = `objects[${index}]`;
    if (!record(object)) { errors.push(`${path} must be an object`); continue; }
    for (const field of ["sha256", "mediaType", "kind", "sourcePath", "capturedAt"]) requiredString(object[field], `${path}.${field}`, errors);
    if (!SHA256.test(object.sha256 ?? "")) errors.push(`${path}.sha256 must be lowercase SHA-256`);
    if (!Number.isSafeInteger(object.bytes) || object.bytes < 0) errors.push(`${path}.bytes must be a non-negative safe integer`);
    const prior = objects.get(object.sha256);
    if (prior !== undefined && (prior.bytes !== object.bytes || prior.mediaType !== object.mediaType)) {
      errors.push(`${path} conflicts with another interpretation of identical bytes`);
    }
    objects.set(object.sha256, object);
  }

  const jobs = new Map();
  for (const [index, job] of (manifest.jobs ?? []).entries()) {
    const path = `jobs[${index}]`;
    if (!record(job)) { errors.push(`${path} must be an object`); continue; }
    for (const field of ["jobId", "wave", "jobConfigObject", "currentAlias"]) requiredString(job[field], `${path}.${field}`, errors);
    requiredArray(job.attemptIds, `${path}.attemptIds`, errors);
    if (!JOB_ID.test(job.jobId ?? "")) errors.push(`${path}.jobId is invalid`);
    if (jobs.has(job.jobId)) errors.push(`${path}.jobId is duplicated`);
    jobs.set(job.jobId, job);
  }

  const attempts = new Map();
  for (const [index, attempt] of (manifest.attempts ?? []).entries()) {
    const path = `attempts[${index}]`;
    if (!record(attempt)) { errors.push(`${path} must be an object`); continue; }
    for (const field of ["attemptId", "jobId", "status", "startedAt", "finishedAt", "outputSummaryObject", "wrapperObject"]) requiredString(attempt[field], `${path}.${field}`, errors);
    requiredArray(attempt.transcriptObjects, `${path}.transcriptObjects`, errors);
    if (!Number.isSafeInteger(attempt.attemptNumber) || attempt.attemptNumber < 1) errors.push(`${path}.attemptNumber must be positive`);
    if (!TERMINAL.has(attempt.status)) errors.push(`${path}.status must be terminal`);
    if (attempt.predecessorAttemptId !== null && typeof attempt.predecessorAttemptId !== "string") errors.push(`${path}.predecessorAttemptId must be a string or null`);
    if (attempt.continuationOf !== null && typeof attempt.continuationOf !== "string") errors.push(`${path}.continuationOf must be a string or null`);
    if (attempts.has(attempt.attemptId)) errors.push(`${path}.attemptId is duplicated`);
    attempts.set(attempt.attemptId, attempt);
  }
  for (const [index, job] of (manifest.jobs ?? []).entries()) {
    if (job.attemptIds?.length === 0) errors.push(`jobs[${index}].attemptIds must not be empty`);
    for (const attemptId of job.attemptIds ?? []) {
      const attempt = attempts.get(attemptId);
      if (attempt === undefined || attempt.jobId !== job.jobId) errors.push(`jobs[${index}].attemptIds contains invalid lineage`);
    }
  }
  for (const [index, attempt] of (manifest.attempts ?? []).entries()) {
    if (attempt.predecessorAttemptId !== null) {
      const predecessor = attempts.get(attempt.predecessorAttemptId);
      if (predecessor === undefined) errors.push(`attempts[${index}].predecessorAttemptId does not resolve`);
      else if (predecessor.jobId !== attempt.jobId || predecessor.attemptNumber >= attempt.attemptNumber) {
        errors.push(`attempts[${index}].predecessorAttemptId must identify an earlier attempt for the same job`);
      }
    }
    if (attempt.continuationOf !== null && !attempts.has(attempt.continuationOf)) {
      errors.push(`attempts[${index}].continuationOf does not resolve`);
    }
  }
  for (const [index, continuation] of (manifest.continuations ?? []).entries()) {
    if (!record(continuation)) { errors.push(`continuations[${index}] must be an object`); continue; }
    requiredString(continuation.attemptId, `continuations[${index}].attemptId`, errors);
    requiredString(continuation.continuationOf, `continuations[${index}].continuationOf`, errors);
    if (!attempts.has(continuation.attemptId) || !attempts.has(continuation.continuationOf)) {
      errors.push(`continuations[${index}] lineage does not resolve`);
    }
    if (continuation.attemptId === continuation.continuationOf) errors.push(`continuations[${index}] must not be self-referential`);
    if (attempts.get(continuation.attemptId)?.continuationOf !== continuation.continuationOf) {
      errors.push(`continuations[${index}] must match the attempt continuationOf field`);
    }
  }
  for (const [index, claim] of (manifest.claims ?? []).entries()) {
    const path = `claims[${index}]`;
    if (!record(claim)) { errors.push(`${path} must be an object`); continue; }
    for (const field of ["claimId", "text", "classification", "applicability"]) requiredString(claim[field], `${path}.${field}`, errors);
    for (const field of ["primarySourceObjects", "executableEvidenceObjects", "publisherIndependence"]) requiredArray(claim[field], `${path}.${field}`, errors);
    if (!CLASSIFICATIONS.has(claim.classification)) errors.push(`${path}.classification is invalid`);
    if (typeof claim.hypothesis !== "boolean" || typeof claim.promotionEligible !== "boolean") errors.push(`${path} boolean labels are required`);
    if (claim.hypothesis && claim.promotionEligible) errors.push(`${path} hypotheses cannot be promotion eligible`);
  }
  for (const [index, exception] of (manifest.exceptions ?? []).entries()) {
    if (!record(exception)) { errors.push(`exceptions[${index}] must be an object`); continue; }
    requiredString(exception.exceptionId, `exceptions[${index}].exceptionId`, errors);
    requiredString(exception.kind, `exceptions[${index}].kind`, errors);
    requiredString(exception.detail, `exceptions[${index}].detail`, errors);
  }
  if (record(manifest.promotion)) {
    if (manifest.promotion.draftScope !== "evidence-tooling-only") errors.push("promotion.draftScope must be evidence-tooling-only");
    if (manifest.promotion.synthesisVerdict !== "NO-GO") errors.push("promotion.synthesisVerdict must be NO-GO");
    if (!record(manifest.promotion.workerAccounting) || manifest.promotion.workerAccounting.countsAsVotes !== false) {
      errors.push("promotion.workerAccounting.countsAsVotes must be false");
    }
    for (const field of ["manifestGates", "productOwnerReview", "separateAdrChange", "p0P1ExecutableClosure"]) {
      if (typeof manifest.promotion[field] !== "boolean") errors.push(`promotion.${field} must be boolean`);
    }
  }
  return { valid: errors.length === 0, errors };
}

function referencedDigests(manifest) {
  const values = new Set();
  for (const job of manifest.jobs) {
    values.add(job.jobConfigObject);
    values.add(job.currentAlias);
  }
  for (const attempt of manifest.attempts) {
    values.add(attempt.outputSummaryObject);
    values.add(attempt.wrapperObject);
    for (const digest of attempt.transcriptObjects) values.add(digest);
  }
  for (const claim of manifest.claims) {
    for (const digest of [...claim.primarySourceObjects, ...claim.executableEvidenceObjects]) values.add(digest);
  }
  return values;
}

async function defaultPathExists(path) {
  const filesystemPath = path.split("#", 1)[0];
  try {
    const metadata = await lstat(filesystemPath);
    return !metadata.isSymbolicLink() && metadata.isFile();
  } catch (error) {
    if (error?.code === "ENOENT") return false;
    throw error;
  }
}

export async function verifyManifest(manifest, { store, pathExists = defaultPathExists } = {}) {
  const validation = validateManifest(manifest);
  const failures = Object.fromEntries(GATES.map(id => [id, []]));
  if (!validation.valid) failures["G-CUSTODY"].push(...validation.errors);
  const objectMap = new Map((manifest.objects ?? []).map(object => [object.sha256, object]));
  for (const digest of validation.valid ? referencedDigests(manifest) : []) {
    const object = objectMap.get(digest);
    if (object === undefined) { failures["G-CUSTODY"].push(`missing object record ${digest}`); continue; }
    if (store !== undefined) {
      try {
        const bytes = await secureRead(store.root, store.objectPath(digest));
        if (bytes.length !== object.bytes || sha256(bytes) !== digest) failures["G-CUSTODY"].push(`corrupt object ${digest}`);
      } catch (error) {
        failures["G-CUSTODY"].push(`unreadable object ${digest}: ${error.message}`);
      }
    }
  }
  for (const attempt of manifest.attempts ?? []) {
    if (!TERMINAL.has(attempt.status)) failures["G-TERMINAL"].push(`${attempt.attemptId} is not terminal`);
  }
  const attemptsById = new Map((manifest.attempts ?? []).map(attempt => [attempt.attemptId, attempt]));
  for (const job of manifest.jobs ?? []) {
    if (job.attemptIds.length === 0 || job.attemptIds.some(attemptId => !attemptsById.has(attemptId))) {
      failures["G-TERMINAL"].push(`${job.jobId} has incomplete attempt accounting`);
    }
    if (job.currentAliasSha256 !== undefined && job.currentAliasSha256 !== job.currentAlias) failures["G-ALIAS"].push(`${job.jobId} alias is stale`);
    const aliasObject = objectMap.get(job.currentAlias);
    if (aliasObject?.sourcePath.startsWith("/")) {
      try {
        const currentBytes = await secureRead(dirname(aliasObject.sourcePath), aliasObject.sourcePath);
        if (sha256(currentBytes) !== job.currentAlias) failures["G-ALIAS"].push(`${job.jobId} alias bytes changed after capture`);
      } catch (error) {
        failures["G-ALIAS"].push(`${job.jobId} alias is unreadable: ${error.message}`);
      }
    }
  }
  for (const object of manifest.objects ?? []) {
    if (object.sourcePath.startsWith("/") && !(await pathExists(object.sourcePath, object))) failures["G-PATH"].push(object.sourcePath);
  }
  for (const claim of manifest.claims ?? []) {
    const sourceSatisfied = claim.primarySourceObjects.length >= 2 && claim.publisherIndependence.length >= 2;
    const executableSatisfied = claim.executableEvidenceObjects.length > 0;
    if (claim.promotionEligible && !sourceSatisfied && !executableSatisfied) failures["G-SOURCE"].push(claim.claimId);
    if (!executableSatisfied && !claim.hypothesis && ["inference", "hypothesis"].includes(claim.classification)) failures["G-HYPOTHESIS"].push(claim.claimId);
    if (claim.primarySourceObjects.some(digest => objectMap.get(digest)?.kind === "worker-report")) failures["G-SOURCE"].push(`${claim.claimId} treats a worker report as primary`);
    if (claim.promotionEligible && ["unsupported", "contradicted"].includes(claim.classification)) failures["G-SYNTHESIS"].push(`${claim.claimId} is an unsupported positive claim`);
  }
  if (manifest.promotion.draftScope !== "evidence-tooling-only") failures["G-DRAFT-SCOPE"].push("draft scope is not evidence-tooling-only");
  if (manifest.promotion.synthesisVerdict !== "NO-GO") failures["G-SYNTHESIS"].push("synthesis verdict must remain NO-GO");
  if (manifest.promotion.workerAccounting?.countsAsVotes !== false) failures["G-SOURCE"].push("worker counts must never be votes");
  for (const prerequisite of ["manifestGates", "productOwnerReview", "separateAdrChange", "p0P1ExecutableClosure"]) {
    if (manifest.promotion[prerequisite] !== true) failures["G-PROMOTION"].push(`${prerequisite} is not proven`);
  }
  return {
    valid: validation.valid,
    gates: Object.fromEntries(GATES.map(id => [id, { pass: failures[id].length === 0, failures: failures[id] }])),
    promotionAllowed: GATES.every(id => failures[id].length === 0),
  };
}

function mediaType(path) {
  if (path.endsWith(".json")) return "application/json";
  if (path.endsWith(".jsonl")) return "application/x-ndjson";
  return "text/plain; charset=utf-8";
}

async function regularFilesBelow(root, relativeDirectory) {
  const directory = join(root, relativeDirectory);
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true, recursive: true });
  } catch (error) {
    if (error?.code === "ENOENT") return [];
    throw error;
  }
  const results = [];
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    const parent = entry.parentPath ?? entry.path;
    const path = join(parent, entry.name);
    const bytes = await secureRead(root, path);
    results.push({ path, bytes });
  }
  return results.sort((left, right) => left.path.localeCompare(right.path));
}

async function captureObject(store, bytes, { kind, sourcePath, capturedAt }) {
  scanSecrets(bytes, sourcePath);
  const published = await store.publish(bytes);
  return {
    sha256: published.sha256,
    bytes: published.bytes,
    mediaType: mediaType(sourcePath),
    kind,
    sourcePath,
    capturedAt,
  };
}

function waveFor(jobId) {
  return `W${jobId.match(/^modres-w(\d+)/u)?.[1]}`;
}

export async function captureEvidence({
  campaignId,
  baseline,
  jobIds,
  runtimeRoot,
  jobConfigRoot,
  outputRoot,
  capturedAt = new Date().toISOString(),
  claims = [],
  continuations = [],
  promotion = {},
}) {
  if (typeof campaignId !== "string" || !CAMPAIGN_ID.test(campaignId)) throw new Error("campaignId must be a safe lowercase path component");
  const allowlist = assertExplicitJobIds(jobIds);
  const safeRuntimeRoot = assertPermittedRoot(runtimeRoot, "runtime root");
  const safeConfigRoot = assertPermittedRoot(jobConfigRoot, "job config root");
  const store = new ObjectStore(assertPermittedRoot(outputRoot, "output root"));
  await store.recoverTemporaries();
  const objects = [];
  const jobs = [];
  const attempts = [];
  const exceptions = [];
  const objectByDigest = new Map();
  async function add(bytes, metadata) {
    const object = await captureObject(store, bytes, { ...metadata, capturedAt });
    const prior = objectByDigest.get(object.sha256);
    if (prior === undefined) { objectByDigest.set(object.sha256, object); objects.push(object); }
    return object.sha256;
  }
  for (const jobId of allowlist) {
    const jobRoot = join(safeRuntimeRoot, jobId);
    const expected = {
      jobConfig: join(safeConfigRoot, jobId, "job.json"),
      wrapper: join(jobRoot, `${jobId}.latest-result.json`),
      progress: join(jobRoot, `${jobId}.progress.json`),
      events: join(jobRoot, `${jobId}.events.jsonl`),
      log: join(jobRoot, `${jobId}.log`),
    };
    const captured = {};
    for (const [kind, path] of Object.entries(expected)) {
      try {
        captured[kind] = await add(await secureRead(kind === "jobConfig" ? safeConfigRoot : safeRuntimeRoot, path), {
          kind: kind === "wrapper" ? "worker-report" : kind,
          sourcePath: path,
        });
      } catch (error) {
        if (error?.code !== "ENOENT") throw error;
        exceptions.push({ exceptionId: `${jobId}:${kind}:missing`, kind: "missing-historical-bytes", detail: `${path} was unavailable; no bytes were fabricated` });
      }
    }
    const journalFiles = await regularFilesBelow(jobRoot, "state/attempt-journal");
    if (journalFiles.length === 0) exceptions.push({ exceptionId: `${jobId}:attempt-journal:missing`, kind: "missing-historical-bytes", detail: "No attempt journal was available; no lineage was inferred" });
    let priorAttemptId = null;
    const attemptIds = [];
    for (const journalFile of journalFiles) {
      const journalDigest = await add(journalFile.bytes, { kind: "attempt-journal", sourcePath: journalFile.path });
      let journal;
      try { journal = JSON.parse(journalFile.bytes.toString("utf8")); }
      catch { exceptions.push({ exceptionId: `${jobId}:journal:${journalDigest}:invalid`, kind: "unknown-historical-bytes", detail: "Attempt journal is not valid JSON and was preserved only as raw bytes" }); continue; }
      const journalAttempts = journal.attempts ?? [];
      for (const [entryIndex, entry] of journalAttempts.entries()) {
        const attemptId = `${jobId}:attempt:${entry.attemptNumber}`;
        const summary = typeof entry.lastOutputSummary === "string" ? Buffer.from(entry.lastOutputSummary, "utf8") : undefined;
        let summaryDigest = "missing";
        if (summary === undefined) {
          exceptions.push({ exceptionId: `${attemptId}:summary:missing`, kind: "missing-historical-bytes", detail: "lastOutputSummary was absent; no output was fabricated" });
        } else {
          summaryDigest = await add(summary, { kind: "decoded-output-summary", sourcePath: `${journalFile.path}#attempts/${entry.attemptNumber}/lastOutputSummary` });
        }
        const isCurrentAttempt = entryIndex === journalAttempts.length - 1;
        if (!isCurrentAttempt) {
          exceptions.push({
            exceptionId: `${attemptId}:wrapper:missing`,
            kind: "missing-historical-bytes",
            detail: "Only the current mutable wrapper was available; an earlier wrapper was not inferred",
          });
        }
        attempts.push({
          attemptId,
          jobId,
          attemptNumber: entry.attemptNumber,
          status: entry.status,
          predecessorAttemptId: priorAttemptId,
          continuationOf: null,
          startedAt: entry.startedAt ?? "unknown",
          finishedAt: entry.finishedAt ?? "unknown",
          outputSummaryObject: summaryDigest,
          wrapperObject: isCurrentAttempt ? (captured.wrapper ?? "missing") : "missing",
          transcriptObjects: [journalDigest],
        });
        attemptIds.push(attemptId);
        priorAttemptId = attemptId;
      }
    }
    jobs.push({
      jobId,
      wave: waveFor(jobId),
      jobConfigObject: captured.jobConfig ?? "missing",
      attemptIds,
      currentAlias: captured.wrapper ?? "missing",
      capturedObjects: Object.values(captured),
    });
  }
  const continuationByAttempt = new Map(continuations.map(continuation => [continuation.attemptId, continuation.continuationOf]));
  const manifest = {
    schemaVersion: 1,
    campaignId,
    baseline,
    objects: objects.sort((left, right) => left.sha256.localeCompare(right.sha256)),
    jobs,
    attempts: attempts.map(attempt => ({
      ...attempt,
      continuationOf: continuationByAttempt.get(attempt.attemptId) ?? attempt.continuationOf,
    })),
    continuations,
    claims,
    exceptions,
    promotion: {
      draftScope: "evidence-tooling-only",
      synthesisVerdict: "NO-GO",
      workerAccounting: { countsAsVotes: false },
      manifestGates: false,
      productOwnerReview: false,
      separateAdrChange: false,
      p0P1ExecutableClosure: false,
      ...promotion,
    },
  };
  const validation = validateManifest(manifest);
  if (!validation.valid) throw new Error(`captured manifest is invalid:\n${validation.errors.join("\n")}`);
  const manifestBytes = Buffer.from(`${deterministicJson(manifest)}\n`, "utf8");
  const manifestObject = await store.publish(manifestBytes);
  const manifestDirectory = join(store.root, "manifests", campaignId);
  await assertDirectoryChain(store.root, manifestDirectory);
  for (const entry of await readdir(manifestDirectory, { withFileTypes: true })) {
    if (!entry.name.startsWith(".") || !entry.name.endsWith(".tmp")) continue;
    const staleTemporary = join(manifestDirectory, entry.name);
    const metadata = await lstat(staleTemporary);
    if (metadata.isSymbolicLink() || !metadata.isFile()) throw new Error("manifest temporary must remain a regular file");
    if (temporaryOwnerIsAlive(entry.name)) continue;
    await rm(staleTemporary);
  }
  const manifestPath = join(manifestDirectory, `${manifestObject.sha256}.json`);
  const temporary = join(manifestDirectory, temporaryName(manifestObject.sha256));
  const handle = await open(temporary, "wx", 0o444);
  try {
    await handle.writeFile(manifestBytes);
    await handle.sync();
    await handle.close();
    try { await link(temporary, manifestPath); }
    catch (error) {
      if (error?.code !== "EEXIST") throw error;
      const existing = await secureRead(store.root, manifestPath);
      if (!existing.equals(manifestBytes)) throw new Error("manifest destination collision");
    }
    await syncDirectory(manifestDirectory);
    const publishedManifest = await secureRead(store.root, manifestPath);
    if (publishedManifest.length !== manifestBytes.length || sha256(publishedManifest) !== manifestObject.sha256) {
      throw new Error("manifest failed post-publication hash and size verification");
    }
  } finally {
    await handle.close().catch(() => undefined);
    await rm(temporary).catch(error => { if (error?.code !== "ENOENT") throw error; });
  }
  return { manifest, manifestPath, manifestSha256: manifestObject.sha256, store };
}

export async function loadManifest(path) {
  const safePath = assertSafeEvidencePath(path, "manifest input");
  const bytes = await secureRead(dirname(safePath), safePath);
  scanSecrets(bytes, path);
  return JSON.parse(bytes.toString("utf8"));
}

export async function readSafeJson(path, label = "JSON input") {
  const safePath = assertSafeEvidencePath(path, label);
  const bytes = await secureRead(dirname(safePath), safePath);
  scanSecrets(bytes, safePath);
  return JSON.parse(bytes.toString("utf8"));
}

export { GATES, REQUIRED_FILES };
