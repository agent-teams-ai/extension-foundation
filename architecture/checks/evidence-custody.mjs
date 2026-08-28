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

import { parseStrictJson } from "./strict-json.mjs";

const SHA256 = /^[a-f0-9]{64}$/u;
const JOB_ID = /^modres-w(?:[1-9]|10|11)-[a-z0-9][a-z0-9-]*-\d{8}-r\d+$/u;
const CAMPAIGN_ID = /^[a-z0-9][a-z0-9.-]{0,127}$/u;
const WAVE = /^W(?:[1-9]|10|11)$/u;
const TERMINAL = new Set(["abandoned", "blocked", "cancelled", "completed", "done", "failed"]);
const CLASSIFICATIONS = new Set([
  "observed",
  "inference",
  "hypothesis",
  "decision-authority",
  "unsupported",
  "contradicted",
]);
const PRIMARY_SOURCE_EVIDENCE_KINDS = new Set(["decision-record", "primary-source"]);
const EXECUTABLE_EVIDENCE_KINDS = new Set(["executable-test-result", "reproduction-result"]);
const MANIFEST_FIELDS = new Set(["schemaVersion", "campaignId", "baseline", "objects", "jobs", "attempts", "continuations", "claims", "exceptions", "promotion"]);
const OBJECT_FIELDS = new Set(["sha256", "bytes", "mediaType", "kind", "sourcePath", "capturedAt"]);
const JOB_FIELDS = new Set(["jobId", "wave", "jobConfigObject", "attemptIds", "currentAlias", "capturedObjects"]);
const ATTEMPT_FIELDS = new Set(["attemptId", "jobId", "attemptNumber", "status", "predecessorAttemptId", "continuationOf", "startedAt", "finishedAt", "outputSummaryObject", "wrapperObject", "transcriptObjects"]);
const CONTINUATION_FIELDS = new Set(["attemptId", "continuationOf"]);
const CLAIM_FIELDS = new Set([
  "claimId",
  "text",
  "classification",
  "applicability",
  "primarySourceObjects",
  "executableEvidenceObjects",
  "publisherIndependence",
  "executableEvidenceAttestations",
  "hypothesis",
  "promotionEligible",
]);
const PUBLISHER_BINDING_FIELDS = new Set(["sourceObject", "publisher"]);
const EXECUTABLE_ATTESTATION_FIELDS = new Set(["evidenceObject", "attestationObject", "publisher", "status"]);
const EXCEPTION_FIELDS = new Set(["exceptionId", "kind", "detail"]);
const PROMOTION_FIELDS = new Set(["draftScope", "synthesisVerdict", "workerAccounting", "manifestGates", "productOwnerReview", "separateAdrChange", "p0P1ExecutableClosure"]);
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

function rejectAdditionalProperties(value, allowed, path, errors) {
  if (!record(value)) return;
  for (const field of Object.keys(value)) if (!allowed.has(field)) errors.push(`${path}.${field} is not allowed`);
}

function portableSourcePath(value) {
  if (typeof value !== "string" || value.length === 0 || value.includes("\0") || value.includes("\\")) return false;
  const components = value.split("#");
  if (components.length > 2) return false;
  const [filesystemPath, fragment] = components;
  if (isAbsolute(filesystemPath) || filesystemPath.startsWith("/") || /^[A-Za-z]:\//u.test(filesystemPath)) return false;
  const safeSegments = candidate => candidate.length > 0 && !candidate.split("/").some(part => part === "" || part === "." || part === "..");
  return safeSegments(filesystemPath) && (fragment === undefined || safeSegments(fragment));
}

function parseCustodyJson(text) {
  try {
    return parseStrictJson(text);
  } catch (error) {
    if (!String(error?.message).startsWith("DUPLICATE_JSON_KEY:")) throw error;
    const duplicate = new SyntaxError("input must not contain duplicate JSON keys");
    duplicate.code = "DUPLICATE_JSON_KEY";
    throw duplicate;
  }
}

function wrapperStatusMatches(wrapperStatus, attemptStatus) {
  if (new Set(["completed", "done"]).has(wrapperStatus) && new Set(["completed", "done"]).has(attemptStatus)) return true;
  return wrapperStatus === attemptStatus;
}

function proveWrapperBinding(bytes, { jobId, attemptNumber, status }) {
  let wrapper;
  try {
    wrapper = parseCustodyJson(bytes.toString("utf8"));
  } catch (error) {
    if (error?.code === "DUPLICATE_JSON_KEY") throw error;
    return { proven: false, reason: "the mutable wrapper is not valid unambiguous JSON" };
  }
  if (!record(wrapper) || wrapper.schemaVersion !== 1) {
    return { proven: false, reason: "the mutable wrapper has no recognized versioned identity schema" };
  }
  if (wrapper.taskId !== jobId || wrapper.runId !== jobId) {
    return { proven: false, reason: "the mutable wrapper does not identify the captured job" };
  }
  const attemptClaims = Array.isArray(wrapper.evidence)
    ? wrapper.evidence.filter(entry => typeof entry === "string" && entry.startsWith("attempt_count:"))
    : [];
  if (attemptClaims.length !== 1 || attemptClaims[0] !== `attempt_count:${attemptNumber}`) {
    return { proven: false, reason: "the mutable wrapper does not identify the latest captured attempt" };
  }
  if (!TERMINAL.has(wrapper.status) || !wrapperStatusMatches(wrapper.status, status)) {
    return { proven: false, reason: "the mutable wrapper does not attest the latest attempt terminal status" };
  }
  return { proven: true };
}

function provenanceJobId(sourcePath) {
  if (typeof sourcePath !== "string") return undefined;
  const [scope, jobId, ...remainder] = sourcePath.split("#", 1)[0].split("/");
  return (scope === "job-config" || scope === "runtime") && remainder.length > 0 ? jobId : undefined;
}

function normalizedPublisher(value) {
  return value.normalize("NFKC").trim().toLocaleLowerCase("en-US");
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

async function directoryIdentity(path, label) {
  const metadata = await lstat(path);
  if (metadata.isSymbolicLink() || !metadata.isDirectory()) throw new Error(`${label} must remain a real directory`);
  return { dev: metadata.dev, ino: metadata.ino };
}

function sameIdentity(left, right) {
  return left.dev === right.dev && left.ino === right.ino;
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
  constructor(root, { beforePublication } = {}) {
    this.root = assertPermittedRoot(root, "object store");
    this.beforePublication = beforePublication;
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
      const rootIdentity = await directoryIdentity(this.root, "object store root");
      const parentIdentity = await directoryIdentity(directory, "object publication parent");
      await this.beforePublication?.({ destination, directory });
      if (!sameIdentity(rootIdentity, await directoryIdentity(this.root, "object store root")) ||
          !sameIdentity(parentIdentity, await directoryIdentity(directory, "object publication parent"))) {
        throw new Error("object store root or publication parent changed during publication");
      }
      try {
        await link(temporary, destination);
        linked = true;
        if (!sameIdentity(rootIdentity, await directoryIdentity(this.root, "object store root")) ||
            !sameIdentity(parentIdentity, await directoryIdentity(directory, "object publication parent"))) {
          throw new Error("object store root or publication parent changed during publication");
        }
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

function arrayOrEmpty(value) {
  return Array.isArray(value) ? value : [];
}

function validateUniqueArray(value, path, errors, validateEntry) {
  requiredArray(value, path, errors);
  if (!Array.isArray(value)) return;
  const seen = new Set();
  for (const entry of value) {
    validateEntry?.(entry);
    if (seen.has(entry)) errors.push(`${path} must contain unique items`);
    seen.add(entry);
  }
}

export function validateManifest(manifest) {
  const errors = [];
  if (!record(manifest)) return { valid: false, errors: ["manifest must be an object"] };
  rejectAdditionalProperties(manifest, MANIFEST_FIELDS, "manifest", errors);
  if (manifest.schemaVersion !== 1) errors.push("schemaVersion must be 1");
  requiredString(manifest.campaignId, "campaignId", errors);
  if (!CAMPAIGN_ID.test(manifest.campaignId ?? "")) errors.push("campaignId must be a safe lowercase path component");
  if (!record(manifest.baseline)) errors.push("baseline must be an object");
  for (const field of ["objects", "jobs", "attempts", "continuations", "claims", "exceptions"]) {
    requiredArray(manifest[field], field, errors);
  }
  if (!record(manifest.promotion)) errors.push("promotion must be an object");

  const objects = new Map();
  for (const [index, object] of arrayOrEmpty(manifest.objects).entries()) {
    const path = `objects[${index}]`;
    if (!record(object)) { errors.push(`${path} must be an object`); continue; }
    rejectAdditionalProperties(object, OBJECT_FIELDS, path, errors);
    for (const field of ["sha256", "mediaType", "kind", "sourcePath", "capturedAt"]) requiredString(object[field], `${path}.${field}`, errors);
    if (!SHA256.test(object.sha256 ?? "")) errors.push(`${path}.sha256 must be lowercase SHA-256`);
    if (!Number.isSafeInteger(object.bytes) || object.bytes < 0) errors.push(`${path}.bytes must be a non-negative safe integer`);
    if (!portableSourcePath(object.sourcePath)) errors.push(`${path}.sourcePath must be portable relative metadata`);
    if (objects.has(object.sha256)) errors.push(`${path}.sha256 is duplicated`);
    objects.set(object.sha256, object);
  }

  const jobs = new Map();
  for (const [index, job] of arrayOrEmpty(manifest.jobs).entries()) {
    const path = `jobs[${index}]`;
    if (!record(job)) { errors.push(`${path} must be an object`); continue; }
    rejectAdditionalProperties(job, JOB_FIELDS, path, errors);
    for (const field of ["jobId", "wave"]) requiredString(job[field], `${path}.${field}`, errors);
    validateUniqueArray(job.attemptIds, `${path}.attemptIds`, errors, attemptId => requiredString(attemptId, `${path}.attemptIds[]`, errors));
    if (!JOB_ID.test(job.jobId ?? "")) errors.push(`${path}.jobId is invalid`);
    if (!WAVE.test(job.wave ?? "")) errors.push(`${path}.wave is invalid`);
    if (job.jobConfigObject !== null && !SHA256.test(job.jobConfigObject ?? "")) errors.push(`${path}.jobConfigObject must be lowercase SHA-256 or null`);
    if (job.currentAlias !== null && !SHA256.test(job.currentAlias ?? "")) errors.push(`${path}.currentAlias must be lowercase SHA-256 or null`);
    validateUniqueArray(job.capturedObjects, `${path}.capturedObjects`, errors, digest => {
      if (!SHA256.test(digest ?? "")) errors.push(`${path}.capturedObjects must contain lowercase SHA-256`);
    });
    if (jobs.has(job.jobId)) errors.push(`${path}.jobId is duplicated`);
    jobs.set(job.jobId, job);
  }
  for (const [index, job] of arrayOrEmpty(manifest.jobs).entries()) {
    if (!record(job) || typeof job.jobId !== "string" || !Array.isArray(job.capturedObjects)) continue;
    const expected = arrayOrEmpty(manifest.objects)
      .filter(object => record(object) && provenanceJobId(object.sourcePath) === job.jobId)
      .map(object => object.sha256)
      .sort();
    const actual = [...job.capturedObjects];
    if (actual.some(digest => provenanceJobId(objects.get(digest)?.sourcePath) !== job.jobId)) {
      errors.push(`jobs[${index}].capturedObjects contains foreign or missing object custody`);
    }
    if (actual.length !== expected.length || actual.some((digest, position) => digest !== expected[position])) {
      errors.push(`jobs[${index}].capturedObjects must exactly match job provenance in deterministic order`);
    }
  }

  const attempts = new Map();
  for (const [index, attempt] of arrayOrEmpty(manifest.attempts).entries()) {
    const path = `attempts[${index}]`;
    if (!record(attempt)) { errors.push(`${path} must be an object`); continue; }
    rejectAdditionalProperties(attempt, ATTEMPT_FIELDS, path, errors);
    for (const field of ["attemptId", "jobId", "status", "startedAt", "finishedAt"]) requiredString(attempt[field], `${path}.${field}`, errors);
    for (const field of ["outputSummaryObject", "wrapperObject"]) if (attempt[field] !== null && !SHA256.test(attempt[field] ?? "")) errors.push(`${path}.${field} must be lowercase SHA-256 or null`);
    validateUniqueArray(attempt.transcriptObjects, `${path}.transcriptObjects`, errors, digest => {
      if (!SHA256.test(digest ?? "")) errors.push(`${path}.transcriptObjects must contain lowercase SHA-256`);
    });
    if (!Number.isSafeInteger(attempt.attemptNumber) || attempt.attemptNumber < 1) errors.push(`${path}.attemptNumber must be a positive safe integer`);
    if (!TERMINAL.has(attempt.status)) errors.push(`${path}.status must be terminal`);
    if (attempt.predecessorAttemptId !== null && typeof attempt.predecessorAttemptId !== "string") errors.push(`${path}.predecessorAttemptId must be a string or null`);
    if (attempt.continuationOf !== null && typeof attempt.continuationOf !== "string") errors.push(`${path}.continuationOf must be a string or null`);
    if (attempts.has(attempt.attemptId)) errors.push(`${path}.attemptId is duplicated`);
    attempts.set(attempt.attemptId, attempt);
  }
  const attemptNumbersByJob = new Set();
  for (const [index, attempt] of arrayOrEmpty(manifest.attempts).entries()) {
    if (!record(attempt)) continue;
    const key = `${attempt.jobId}\0${attempt.attemptNumber}`;
    if (attemptNumbersByJob.has(key)) errors.push(`attempts[${index}].attemptNumber is duplicated for its job`);
    attemptNumbersByJob.add(key);
  }
  const memberships = new Map();
  for (const [index, job] of arrayOrEmpty(manifest.jobs).entries()) {
    if (!record(job)) continue;
    for (const attemptId of arrayOrEmpty(job.attemptIds)) {
      const attempt = attempts.get(attemptId);
      if (attempt === undefined || attempt.jobId !== job.jobId) errors.push(`jobs[${index}].attemptIds contains invalid lineage`);
      memberships.set(attemptId, (memberships.get(attemptId) ?? 0) + 1);
    }
    if (new Set(arrayOrEmpty(job.attemptIds)).size !== arrayOrEmpty(job.attemptIds).length) errors.push(`jobs[${index}].attemptIds contains duplicates`);
  }
  for (const [index, attempt] of arrayOrEmpty(manifest.attempts).entries()) {
    if (!record(attempt)) continue;
    if (memberships.get(attempt.attemptId) !== 1) errors.push(`attempts[${index}] must belong to exactly one matching job`);
    const jobAttempts = arrayOrEmpty(manifest.attempts).filter(candidate => record(candidate) && candidate.jobId === attempt.jobId).sort((a, b) => a.attemptNumber - b.attemptNumber);
    const position = jobAttempts.findIndex(candidate => candidate.attemptId === attempt.attemptId);
    const expectedPredecessor = position > 0 ? jobAttempts[position - 1].attemptId : null;
    if (attempt.predecessorAttemptId !== expectedPredecessor) errors.push(`attempts[${index}].predecessorAttemptId must identify the adjacent prior attempt`);
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
    const continuationTarget = attempts.get(attempt.continuationOf);
    if (continuationTarget !== undefined && (continuationTarget.jobId !== attempt.jobId || continuationTarget.attemptNumber >= attempt.attemptNumber)) {
      errors.push(`attempts[${index}].continuationOf must identify an earlier attempt for the same job`);
    }
  }
  const continuationAttempts = new Set();
  for (const [index, continuation] of arrayOrEmpty(manifest.continuations).entries()) {
    if (!record(continuation)) { errors.push(`continuations[${index}] must be an object`); continue; }
    rejectAdditionalProperties(continuation, CONTINUATION_FIELDS, `continuations[${index}]`, errors);
    requiredString(continuation.attemptId, `continuations[${index}].attemptId`, errors);
    requiredString(continuation.continuationOf, `continuations[${index}].continuationOf`, errors);
    if (!attempts.has(continuation.attemptId) || !attempts.has(continuation.continuationOf)) {
      errors.push(`continuations[${index}] lineage does not resolve`);
    }
    if (continuation.attemptId === continuation.continuationOf) errors.push(`continuations[${index}] must not be self-referential`);
    if (continuationAttempts.has(continuation.attemptId)) errors.push(`continuations[${index}].attemptId is duplicated`);
    continuationAttempts.add(continuation.attemptId);
    if (attempts.get(continuation.attemptId)?.continuationOf !== continuation.continuationOf) {
      errors.push(`continuations[${index}] must match the attempt continuationOf field`);
    }
  }
  for (const attempt of arrayOrEmpty(manifest.attempts)) {
    if (!record(attempt)) continue;
    const seen = new Set();
    let current = attempt;
    while (current?.continuationOf !== null) {
      if (seen.has(current.attemptId)) { errors.push(`${attempt.attemptId} has cyclic continuation lineage`); break; }
      seen.add(current.attemptId);
      current = attempts.get(current.continuationOf);
      if (current === undefined) break;
    }
    if (attempt.continuationOf !== null && !continuationAttempts.has(attempt.attemptId)) errors.push(`${attempt.attemptId} continuation is missing its index record`);
  }
  for (const [index, claim] of arrayOrEmpty(manifest.claims).entries()) {
    const path = `claims[${index}]`;
    if (!record(claim)) { errors.push(`${path} must be an object`); continue; }
    rejectAdditionalProperties(claim, CLAIM_FIELDS, path, errors);
    for (const field of ["claimId", "text", "classification", "applicability"]) requiredString(claim[field], `${path}.${field}`, errors);
    for (const field of ["primarySourceObjects", "executableEvidenceObjects"]) {
      validateUniqueArray(claim[field], `${path}.${field}`, errors, digest => {
        if (!SHA256.test(digest ?? "")) errors.push(`${path}.${field} must contain lowercase SHA-256`);
      });
    }
    requiredArray(claim.publisherIndependence, `${path}.publisherIndependence`, errors);
    const boundSources = new Set();
    const boundPublishers = new Set();
    for (const [bindingIndex, binding] of arrayOrEmpty(claim.publisherIndependence).entries()) {
      const bindingPath = `${path}.publisherIndependence[${bindingIndex}]`;
      if (!record(binding)) { errors.push(`${bindingPath} must be an object`); continue; }
      rejectAdditionalProperties(binding, PUBLISHER_BINDING_FIELDS, bindingPath, errors);
      if (!SHA256.test(binding.sourceObject ?? "")) errors.push(`${bindingPath}.sourceObject must be lowercase SHA-256`);
      requiredString(binding.publisher, `${bindingPath}.publisher`, errors);
      if (boundSources.has(binding.sourceObject)) errors.push(`${path}.publisherIndependence must bind each source exactly once`);
      boundSources.add(binding.sourceObject);
      if (typeof binding.publisher === "string") {
        const publisher = normalizedPublisher(binding.publisher);
        if (publisher.length === 0) errors.push(`${bindingPath}.publisher must identify a publisher after normalization`);
        if (boundPublishers.has(publisher)) errors.push(`${path}.publisherIndependence must contain distinct publishers`);
        boundPublishers.add(publisher);
      }
    }
    const primarySources = new Set(arrayOrEmpty(claim.primarySourceObjects));
    if (primarySources.size !== boundSources.size || [...primarySources].some(digest => !boundSources.has(digest))) {
      errors.push(`${path}.publisherIndependence must exactly bind every primary source object`);
    }
    requiredArray(claim.executableEvidenceAttestations, `${path}.executableEvidenceAttestations`, errors);
    const attestedEvidence = new Set();
    for (const [attestationIndex, attestation] of arrayOrEmpty(claim.executableEvidenceAttestations).entries()) {
      const attestationPath = `${path}.executableEvidenceAttestations[${attestationIndex}]`;
      if (!record(attestation)) { errors.push(`${attestationPath} must be an object`); continue; }
      rejectAdditionalProperties(attestation, EXECUTABLE_ATTESTATION_FIELDS, attestationPath, errors);
      for (const field of ["evidenceObject", "attestationObject"]) {
        if (!SHA256.test(attestation[field] ?? "")) errors.push(`${attestationPath}.${field} must be lowercase SHA-256`);
      }
      requiredString(attestation.publisher, `${attestationPath}.publisher`, errors);
      if (typeof attestation.publisher === "string" && normalizedPublisher(attestation.publisher).length === 0) {
        errors.push(`${attestationPath}.publisher must identify a publisher after normalization`);
      }
      if (attestation.status !== "passed") errors.push(`${attestationPath}.status must be passed`);
      if (attestation.evidenceObject === attestation.attestationObject) errors.push(`${attestationPath} must use a distinct attestation object`);
      if (attestedEvidence.has(attestation.evidenceObject)) errors.push(`${path}.executableEvidenceAttestations must attest each result exactly once`);
      attestedEvidence.add(attestation.evidenceObject);
    }
    const executableEvidence = new Set(arrayOrEmpty(claim.executableEvidenceObjects));
    if (executableEvidence.size !== attestedEvidence.size || [...executableEvidence].some(digest => !attestedEvidence.has(digest))) {
      errors.push(`${path}.executableEvidenceAttestations must exactly attest every executable evidence object`);
    }
    if (!CLASSIFICATIONS.has(claim.classification)) errors.push(`${path}.classification is invalid`);
    if (typeof claim.hypothesis !== "boolean" || typeof claim.promotionEligible !== "boolean") errors.push(`${path} boolean labels are required`);
    if (claim.hypothesis && claim.promotionEligible) errors.push(`${path} hypotheses cannot be promotion eligible`);
  }
  for (const [index, exception] of arrayOrEmpty(manifest.exceptions).entries()) {
    if (!record(exception)) { errors.push(`exceptions[${index}] must be an object`); continue; }
    rejectAdditionalProperties(exception, EXCEPTION_FIELDS, `exceptions[${index}]`, errors);
    requiredString(exception.exceptionId, `exceptions[${index}].exceptionId`, errors);
    requiredString(exception.kind, `exceptions[${index}].kind`, errors);
    requiredString(exception.detail, `exceptions[${index}].detail`, errors);
  }
  if (record(manifest.promotion)) {
    rejectAdditionalProperties(manifest.promotion, PROMOTION_FIELDS, "promotion", errors);
    if (manifest.promotion.draftScope !== "evidence-tooling-only") errors.push("promotion.draftScope must be evidence-tooling-only");
    if (manifest.promotion.synthesisVerdict !== "NO-GO") errors.push("promotion.synthesisVerdict must be NO-GO");
    if (!record(manifest.promotion.workerAccounting) || manifest.promotion.workerAccounting.countsAsVotes !== false) {
      errors.push("promotion.workerAccounting.countsAsVotes must be false");
    }
    rejectAdditionalProperties(manifest.promotion.workerAccounting, new Set(["countsAsVotes"]), "promotion.workerAccounting", errors);
    for (const field of ["manifestGates", "productOwnerReview", "separateAdrChange", "p0P1ExecutableClosure"]) {
      if (manifest.promotion[field] !== false) errors.push(`promotion.${field} must remain false without a separate attestation operation`);
    }
  }
  return { valid: errors.length === 0, errors };
}

function referencedDigests(manifest) {
  const values = new Set();
  for (const job of manifest.jobs) {
    if (job.jobConfigObject !== null) values.add(job.jobConfigObject);
    if (job.currentAlias !== null) values.add(job.currentAlias);
    for (const digest of job.capturedObjects) values.add(digest);
  }
  for (const attempt of manifest.attempts) {
    if (attempt.outputSummaryObject !== null) values.add(attempt.outputSummaryObject);
    if (attempt.wrapperObject !== null) values.add(attempt.wrapperObject);
    for (const digest of attempt.transcriptObjects) values.add(digest);
  }
  for (const claim of manifest.claims) {
    for (const digest of [...claim.primarySourceObjects, ...claim.executableEvidenceObjects]) values.add(digest);
    for (const attestation of claim.executableEvidenceAttestations) values.add(attestation.attestationObject);
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

function executionAttestationFailure(document, evidenceObject, publisher) {
  if (!record(document)) return "attestation must be a JSON object";
  const fields = Object.keys(document).sort();
  if (fields.length !== 4 || fields.join(",") !== "evidenceObject,publisher,schemaVersion,status") {
    return "attestation must contain only evidenceObject, publisher, schemaVersion, and status";
  }
  if (document.schemaVersion !== 1) return "attestation schemaVersion must be 1";
  if (document.evidenceObject !== evidenceObject) return "attestation does not bind the executable evidence object";
  if (typeof document.publisher !== "string" || normalizedPublisher(document.publisher) !== normalizedPublisher(publisher)) {
    return "attestation does not bind the declared publisher";
  }
  if (document.status !== "passed") return "attestation does not record a successful result";
  return undefined;
}

export async function verifyManifest(manifest, { store, auditLiveSources = false, sourceRoot, pathExists = defaultPathExists } = {}) {
  const validation = validateManifest(manifest);
  const failures = Object.fromEntries(GATES.map(id => [id, []]));
  if (!validation.valid) {
    failures["G-CUSTODY"].push(...validation.errors);
    for (const id of GATES.filter(id => id !== "G-CUSTODY")) failures[id].push("manifest validation failed");
    return {
      valid: false,
      gates: Object.fromEntries(GATES.map(id => [id, { pass: false, failures: failures[id] }])),
      integrityValid: false,
      promotionAllowed: false,
    };
  }
  const objectMap = new Map(manifest.objects.map(object => [object.sha256, object]));
  const referenced = referencedDigests(manifest);
  for (const digest of referenced) {
    if (!objectMap.has(digest)) failures["G-CUSTODY"].push(`missing object record ${digest}`);
  }
  for (const object of manifest.objects) {
    const digest = object.sha256;
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
    const aliasObject = objectMap.get(job.currentAlias);
    const latest = job.attemptIds.map(id => attemptsById.get(id)).filter(Boolean).sort((a, b) => a.attemptNumber - b.attemptNumber).at(-1);
    if (latest === undefined || job.currentAlias === null || job.currentAlias !== latest.wrapperObject) failures["G-ALIAS"].push(`${job.jobId} alias does not bind the latest attempt wrapper`);
    if (store !== undefined && aliasObject !== undefined) {
      try {
        const currentBytes = await secureRead(store.root, store.objectPath(job.currentAlias));
        if (sha256(currentBytes) !== job.currentAlias) failures["G-ALIAS"].push(`${job.jobId} alias bytes changed after capture`);
        if (latest !== undefined) {
          const binding = proveWrapperBinding(currentBytes, latest);
          if (!binding.proven) failures["G-ALIAS"].push(`${job.jobId} alias binding is unproven: ${binding.reason}`);
        }
      } catch (error) {
        failures["G-ALIAS"].push(`${job.jobId} alias is unreadable: ${error.message}`);
      }
    }
  }
  for (const object of manifest.objects ?? []) {
    if (!portableSourcePath(object.sourcePath)) failures["G-PATH"].push(object.sourcePath);
    if (auditLiveSources) {
      if (sourceRoot === undefined) failures["G-PATH"].push("live-source audit requires sourceRoot");
      else if (!(await pathExists(join(sourceRoot, object.sourcePath.split("#", 1)[0]), object))) failures["G-PATH"].push(object.sourcePath);
    }
  }
  for (const claim of manifest.claims ?? []) {
    const sourceDigests = new Set(claim.primarySourceObjects);
    const publishers = new Set(claim.publisherIndependence.map(binding => normalizedPublisher(binding.publisher)));
    const boundSourceDigests = new Set(claim.publisherIndependence.map(binding => binding.sourceObject));
    const sourceKindsAllowed = [...sourceDigests].every(digest => PRIMARY_SOURCE_EVIDENCE_KINDS.has(objectMap.get(digest)?.kind));
    const sourceSatisfied = sourceDigests.size >= 2 &&
      publishers.size >= 2 &&
      boundSourceDigests.size === sourceDigests.size &&
      [...sourceDigests].every(digest => boundSourceDigests.has(digest) && objectMap.has(digest)) &&
      sourceKindsAllowed;
    let attestationsSatisfied = claim.executableEvidenceAttestations.length === claim.executableEvidenceObjects.length;
    for (const attestation of claim.executableEvidenceAttestations) {
      const attestationRecord = objectMap.get(attestation.attestationObject);
      if (attestation.status !== "passed" || attestationRecord?.kind !== "execution-attestation") {
        attestationsSatisfied = false;
        failures["G-SOURCE"].push(`${claim.claimId} lacks a successful execution attestation for ${attestation.evidenceObject}`);
        continue;
      }
      if (store === undefined) {
        attestationsSatisfied = false;
        failures["G-SOURCE"].push(`${claim.claimId} execution attestation ${attestation.attestationObject} is unproven without object bytes`);
        continue;
      }
      try {
        const attestationBytes = await secureRead(store.root, store.objectPath(attestation.attestationObject));
        const document = parseCustodyJson(attestationBytes.toString("utf8"));
        const failure = executionAttestationFailure(document, attestation.evidenceObject, attestation.publisher);
        if (failure !== undefined) {
          attestationsSatisfied = false;
          failures["G-SOURCE"].push(`${claim.claimId} execution attestation ${attestation.attestationObject}: ${failure}`);
        }
      } catch (error) {
        attestationsSatisfied = false;
        failures["G-SOURCE"].push(`${claim.claimId} execution attestation ${attestation.attestationObject} is invalid: ${error.message}`);
      }
    }
    const executableKindsAllowed = claim.executableEvidenceObjects.every(digest => EXECUTABLE_EVIDENCE_KINDS.has(objectMap.get(digest)?.kind));
    const executableSatisfied = claim.executableEvidenceObjects.length > 0 && executableKindsAllowed && attestationsSatisfied;
    for (const digest of [...claim.primarySourceObjects, ...claim.executableEvidenceObjects]) if (!objectMap.has(digest)) failures["G-SOURCE"].push(`${claim.claimId} references missing evidence ${digest}`);
    if (claim.promotionEligible && (!sourceSatisfied || !executableSatisfied)) failures["G-SOURCE"].push(`${claim.claimId} requires both bound independent primary sources and successfully attested executable evidence`);
    if (!executableSatisfied && !claim.hypothesis && ["inference", "hypothesis"].includes(claim.classification)) failures["G-HYPOTHESIS"].push(claim.claimId);
    if (claim.primarySourceObjects.some(digest => objectMap.get(digest)?.kind === "worker-report")) failures["G-SOURCE"].push(`${claim.claimId} treats a worker report as primary`);
    if (!sourceKindsAllowed && claim.primarySourceObjects.length > 0) failures["G-SOURCE"].push(`${claim.claimId} has an ineligible primary-source evidence kind`);
    if (!executableKindsAllowed) failures["G-SOURCE"].push(`${claim.claimId} has non-executable evidence kind`);
    if (claim.primarySourceObjects.length !== sourceDigests.size || claim.publisherIndependence.length !== publishers.size) failures["G-SOURCE"].push(`${claim.claimId} lacks distinct sources or publishers`);
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
    integrityValid: validation.valid && GATES.filter(id => id !== "G-PROMOTION").every(id => failures[id].length === 0),
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

function sourceLabel(root, path, prefix) {
  const label = relative(root, path).split(sep).join("/");
  return `${prefix}/${label}`;
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
    else if (prior.kind !== object.kind || prior.sourcePath !== object.sourcePath || prior.mediaType !== object.mediaType) {
      throw new Error(`conflicting provenance for captured object ${object.sha256}`);
    }
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
    const capturedBytes = {};
    const jobCapturedObjects = new Set();
    for (const [kind, path] of Object.entries(expected)) {
      try {
        capturedBytes[kind] = await secureRead(kind === "jobConfig" ? safeConfigRoot : safeRuntimeRoot, path);
        captured[kind] = await add(capturedBytes[kind], {
          kind: kind === "wrapper" ? "worker-report" : kind,
          sourcePath: sourceLabel(kind === "jobConfig" ? safeConfigRoot : safeRuntimeRoot, path, kind === "jobConfig" ? "job-config" : "runtime"),
        });
        jobCapturedObjects.add(captured[kind]);
      } catch (error) {
        if (error?.code !== "ENOENT") throw error;
        const label = sourceLabel(kind === "jobConfig" ? safeConfigRoot : safeRuntimeRoot, path, kind === "jobConfig" ? "job-config" : "runtime");
        exceptions.push({ exceptionId: `${jobId}:${kind}:missing`, kind: "missing-historical-bytes", detail: `${label} was unavailable; no bytes were fabricated` });
      }
    }
    const journalFiles = await regularFilesBelow(jobRoot, "state/attempt-journal");
    if (journalFiles.length === 0) exceptions.push({ exceptionId: `${jobId}:attempt-journal:missing`, kind: "missing-historical-bytes", detail: "No attempt journal was available; no lineage was inferred" });
    let priorAttemptId = null;
    const attemptIds = [];
    const journalEntries = [];
    const attemptNumbers = new Set();
    for (const journalFile of journalFiles) {
      const journalLabel = sourceLabel(safeRuntimeRoot, journalFile.path, "runtime");
      const journalDigest = await add(journalFile.bytes, { kind: "attempt-journal", sourcePath: journalLabel });
      jobCapturedObjects.add(journalDigest);
      let journal;
      try { journal = parseCustodyJson(journalFile.bytes.toString("utf8")); }
      catch (error) {
        if (error?.code === "DUPLICATE_JSON_KEY") throw error;
        exceptions.push({ exceptionId: `${jobId}:journal:${journalDigest}:invalid`, kind: "unknown-historical-bytes", detail: "Attempt journal is not valid JSON and was preserved only as raw bytes" });
        continue;
      }
      if (!Array.isArray(journal.attempts)) throw new Error(`attempt journal ${journalLabel} must contain an attempts array`);
      for (const entry of journal.attempts) {
        if (!record(entry) || !Number.isSafeInteger(entry.attemptNumber) || entry.attemptNumber < 1) {
          throw new Error(`attempt journal ${journalLabel} contains an invalid attempt number`);
        }
        if (attemptNumbers.has(entry.attemptNumber)) {
          throw new Error(`ambiguous attempt ${entry.attemptNumber} for ${jobId} appears in multiple journal entries`);
        }
        attemptNumbers.add(entry.attemptNumber);
        journalEntries.push({ entry, journalDigest, journalLabel });
      }
    }
    journalEntries.sort((left, right) => left.entry.attemptNumber - right.entry.attemptNumber);
    const currentEntry = journalEntries.at(-1)?.entry;
    const currentAttemptNumber = currentEntry?.attemptNumber;
    let wrapperBindingProven = false;
    if (capturedBytes.wrapper !== undefined && currentEntry !== undefined) {
      const binding = proveWrapperBinding(capturedBytes.wrapper, { jobId, attemptNumber: currentEntry.attemptNumber, status: currentEntry.status });
      wrapperBindingProven = binding.proven;
      if (!binding.proven) {
        exceptions.push({
          exceptionId: `${jobId}:alias-binding:unproven`,
          kind: "unproven-historical-identity",
          detail: `${binding.reason}; the mutable wrapper bytes were preserved but not assigned to an attempt`,
        });
      }
    } else if (capturedBytes.wrapper !== undefined) {
      exceptions.push({
        exceptionId: `${jobId}:alias-binding:unproven`,
        kind: "unproven-historical-identity",
        detail: "No captured attempt can prove the mutable wrapper identity; the bytes were preserved but not assigned to an attempt",
      });
    }
    for (const { entry, journalDigest, journalLabel } of journalEntries) {
        const attemptId = `${jobId}:attempt:${entry.attemptNumber}`;
        const summary = typeof entry.lastOutputSummary === "string" ? Buffer.from(entry.lastOutputSummary, "utf8") : undefined;
        let summaryDigest = null;
        if (summary === undefined) {
          exceptions.push({ exceptionId: `${attemptId}:summary:missing`, kind: "missing-historical-bytes", detail: "lastOutputSummary was absent; no output was fabricated" });
        } else {
          summaryDigest = await add(summary, { kind: "decoded-output-summary", sourcePath: `${journalLabel}#attempts/${entry.attemptNumber}/lastOutputSummary` });
          jobCapturedObjects.add(summaryDigest);
        }
        const isCurrentAttempt = entry.attemptNumber === currentAttemptNumber;
        if (!isCurrentAttempt || captured.wrapper === undefined || !wrapperBindingProven) {
          exceptions.push({
            exceptionId: `${attemptId}:wrapper:missing`,
            kind: "missing-historical-bytes",
            detail: isCurrentAttempt && captured.wrapper !== undefined
              ? "The mutable wrapper identity was unproven; no attempt wrapper was inferred"
              : "Only the current mutable wrapper was available; an earlier wrapper was not inferred",
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
          wrapperObject: isCurrentAttempt && wrapperBindingProven ? captured.wrapper : null,
          transcriptObjects: [journalDigest],
        });
        attemptIds.push(attemptId);
        priorAttemptId = attemptId;
    }
    jobs.push({
      jobId,
      wave: waveFor(jobId),
      jobConfigObject: captured.jobConfig ?? null,
      attemptIds,
      currentAlias: captured.wrapper ?? null,
      capturedObjects: [...jobCapturedObjects].sort(),
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
      ...Object.fromEntries(Object.entries(promotion).filter(([key]) => !["manifestGates", "productOwnerReview", "separateAdrChange", "p0P1ExecutableClosure"].includes(key))),
      manifestGates: false,
      productOwnerReview: false,
      separateAdrChange: false,
      p0P1ExecutableClosure: false,
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
    const rootIdentity = await directoryIdentity(store.root, "object store root");
    const parentIdentity = await directoryIdentity(manifestDirectory, "manifest publication parent");
    if (!sameIdentity(rootIdentity, await directoryIdentity(store.root, "object store root")) ||
        !sameIdentity(parentIdentity, await directoryIdentity(manifestDirectory, "manifest publication parent"))) {
      throw new Error("object store root or manifest publication parent changed during publication");
    }
    try { await link(temporary, manifestPath); }
    catch (error) {
      if (error?.code !== "EEXIST") throw error;
      const existing = await secureRead(store.root, manifestPath);
      if (!existing.equals(manifestBytes)) throw new Error("manifest destination collision");
    }
    if (!sameIdentity(rootIdentity, await directoryIdentity(store.root, "object store root")) ||
        !sameIdentity(parentIdentity, await directoryIdentity(manifestDirectory, "manifest publication parent"))) {
      throw new Error("object store root or manifest publication parent changed during publication");
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
  return parseCustodyJson(bytes.toString("utf8"));
}

export async function readSafeJson(path, label = "JSON input") {
  const safePath = assertSafeEvidencePath(path, label);
  const bytes = await secureRead(dirname(safePath), safePath);
  scanSecrets(bytes, safePath);
  return parseCustodyJson(bytes.toString("utf8"));
}

export { GATES, REQUIRED_FILES };
