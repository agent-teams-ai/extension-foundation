import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { constants } from "node:fs";
import {
  chmod,
  link,
  lstat,
  mkdir,
  open,
  opendir,
  readdir,
  realpath,
  rm,
} from "node:fs/promises";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { promisify } from "node:util";

import { parseStrictJson } from "./strict-json.mjs";

const SHA256 = /^[a-f0-9]{64}$/u;
const GIT_OBJECT_ID = /^[a-f0-9]{40}$/u;
const REPOSITORY_ID = /^[a-z0-9][a-z0-9-]*(?:\/[a-z0-9][a-z0-9._-]*)$/u;
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
const POSITIVE_CLAIM_CLASSIFICATIONS = new Set(["observed", "inference", "decision-authority"]);
const PRIMARY_SOURCE_EVIDENCE_KINDS = new Set(["decision-record", "primary-source"]);
const EXECUTABLE_EVIDENCE_KINDS = new Set(["executable-test-result", "reproduction-result"]);
const MANIFEST_FIELDS = new Set(["schemaVersion", "campaignId", "baseline", "objects", "jobs", "attempts", "continuations", "claims", "exceptions", "promotion"]);
const BASELINE_FIELDS = new Set([
  "derivation",
  "repository",
  "commit",
  "tree",
  "lockfileSha256",
  "clean",
  "platform",
  "nodeVersion",
  "pnpmVersion",
  "capturedAt",
]);
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
const DEFAULT_RESOURCE_LIMITS = Object.freeze({
  maxFileBytes: 8 * 1024 * 1024,
  maxTotalBytes: 64 * 1024 * 1024,
  maxFiles: 512,
  maxDirectories: 256,
  maxDirectoryEntries: 2_048,
  maxDirectoryDepth: 12,
  maxJsonDepth: 64,
  maxJsonNodes: 200_000,
  maxJsonStringLength: 65_536,
  maxManifestObjects: 1_024,
  maxManifestJobs: 256,
  maxManifestAttempts: 1_024,
  maxManifestContinuations: 1_024,
  maxManifestClaims: 512,
  maxManifestExceptions: 1_024,
  maxReferencesPerEntry: 1_024,
});
const execFileAsync = promisify(execFile);

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

function assertJsonLimits(value, {
  maxJsonDepth,
  maxJsonNodes,
  maxJsonStringLength,
} = DEFAULT_RESOURCE_LIMITS) {
  const pending = [{ value, depth: 0 }];
  let nodes = 0;
  while (pending.length > 0) {
    const current = pending.pop();
    nodes += 1;
    const stringTooLong = typeof current.value === "string" && current.value.length > maxJsonStringLength;
    if (nodes > maxJsonNodes || current.depth > maxJsonDepth || stringTooLong) {
      const message = nodes > maxJsonNodes
        ? "JSON node limit exceeded"
        : current.depth > maxJsonDepth
          ? "JSON depth limit exceeded"
          : "JSON string limit exceeded";
      const error = new SyntaxError(message);
      error.code = "JSON_RESOURCE_LIMIT";
      throw error;
    }
    if (current.value === null || typeof current.value !== "object") continue;
    if (Array.isArray(current.value)) {
      for (const child of current.value) pending.push({ value: child, depth: current.depth + 1 });
      continue;
    }
    for (const [key, child] of Object.entries(current.value)) {
      if (key.length > maxJsonStringLength) {
        const error = new SyntaxError("JSON string limit exceeded");
        error.code = "JSON_RESOURCE_LIMIT";
        throw error;
      }
      pending.push({ value: child, depth: current.depth + 1 });
    }
  }
}

function parseCustodyJson(text, limits = DEFAULT_RESOURCE_LIMITS) {
  try {
    const value = parseStrictJson(text, {
      maxDepth: limits.maxJsonDepth,
      maxNodes: limits.maxJsonNodes,
      maxStringLength: limits.maxJsonStringLength,
    });
    assertJsonLimits(value, limits);
    return value;
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

function journalContinuationAttemptId(jobId, entry, journalLabel) {
  const continuationOf = entry.continuationOf;
  if (continuationOf === undefined || continuationOf === null) return null;
  if (Number.isSafeInteger(continuationOf) && continuationOf > 0) {
    return `${jobId}:attempt:${continuationOf}`;
  }
  if (typeof continuationOf === "string" && continuationOf.match(new RegExp(`^${jobId}:attempt:[1-9][0-9]*$`, "u"))) {
    return continuationOf;
  }
  throw new Error(`attempt journal ${journalLabel} contains invalid continuation lineage`);
}

function proveWrapperBinding(bytes, { jobId, attemptNumber, status }, limits = DEFAULT_RESOURCE_LIMITS) {
  let wrapper;
  try {
    wrapper = parseCustodyJson(bytes.toString("utf8"), limits);
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

function normalizeResourceLimits(overrides = {}) {
  if (!record(overrides)) throw new Error("resourceLimits must be an object");
  const limits = { ...DEFAULT_RESOURCE_LIMITS };
  for (const [key, value] of Object.entries(overrides)) {
    if (!Object.hasOwn(DEFAULT_RESOURCE_LIMITS, key)) throw new Error(`unknown resource limit: ${key}`);
    if (!Number.isSafeInteger(value) || value < 1 || value > DEFAULT_RESOURCE_LIMITS[key]) {
      throw new Error(`${key} must be a positive safe integer no greater than ${DEFAULT_RESOURCE_LIMITS[key]}`);
    }
    limits[key] = value;
  }
  return Object.freeze(limits);
}

function accountResource(budget, bytes, label, limits) {
  budget.files += 1;
  budget.bytes += bytes.length;
  if (budget.files > limits.maxFiles) throw new Error(`capture file-count limit exceeded at ${label}`);
  if (bytes.length > limits.maxFileBytes) throw new Error(`capture file-size limit exceeded at ${label}`);
  if (budget.bytes > limits.maxTotalBytes) throw new Error(`capture aggregate byte limit exceeded at ${label}`);
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

async function canonicalCandidate(path) {
  let existing = resolve(path);
  const missing = [];
  while (true) {
    try {
      const canonical = await realpath(existing);
      return resolve(canonical, ...missing.reverse());
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
      const parent = dirname(existing);
      if (parent === existing) throw error;
      missing.push(existing.slice(parent.length + (parent.endsWith(sep) ? 0 : 1)));
      existing = parent;
    }
  }
}

async function assertCanonicalPermittedRoot(path, label) {
  const normalized = assertPermittedRoot(path, label);
  const canonical = await canonicalCandidate(normalized);
  assertPermittedRoot(canonical, label);
  const configuredCodexHome = process.env.CODEX_HOME;
  if (configuredCodexHome !== undefined) {
    const canonicalCodexHome = await canonicalCandidate(configuredCodexHome);
    if (contained(canonicalCodexHome, canonical)) {
      throw new Error(`${label} must not target an auth root or CODEX_HOME`);
    }
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
      await mkdir(current, { mode: 0o700 }).catch(createError => {
        if (createError?.code !== "EEXIST") throw createError;
      });
      metadata = await lstat(current);
    }
    if (metadata.isSymbolicLink() || !metadata.isDirectory()) throw new Error(`unsafe directory component: ${current}`);
    if (process.platform !== "win32") await chmod(current, 0o700);
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

async function secureRead(root, path, {
  maxFileBytes = DEFAULT_RESOURCE_LIMITS.maxFileBytes,
  requireStableCtime = true,
} = {}) {
  const absoluteRoot = await assertCanonicalPermittedRoot(root, "source root");
  const absolutePath = resolve(path);
  if (!contained(absoluteRoot, absolutePath)) throw new Error(`source path escapes configured root: ${path}`);
  const rootMetadata = await lstat(absoluteRoot);
  if (rootMetadata.isSymbolicLink() || !rootMetadata.isDirectory()) throw new Error("source root must be a real directory");
  const parent = dirname(absolutePath);
  const [canonicalRoot, canonicalParent] = await Promise.all([realpath(absoluteRoot), realpath(parent)]);
  if (!contained(canonicalRoot, canonicalParent)) throw new Error(`source path traverses a symbolic link: ${path}`);
  const before = await lstat(absolutePath);
  if (before.isSymbolicLink() || !before.isFile()) throw new Error(`source must be a regular non-symlink file: ${path}`);
  if (before.size > maxFileBytes) throw new Error(`source exceeds byte limit: ${path}`);
  const handle = await open(absolutePath, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
  try {
    const after = await handle.stat();
    if (!after.isFile() || before.dev !== after.dev || before.ino !== after.ino || before.size !== after.size) {
      throw new Error(`source changed while opening: ${path}`);
    }
    const chunks = [];
    let totalBytes = 0;
    while (totalBytes <= maxFileBytes) {
      const remaining = maxFileBytes + 1 - totalBytes;
      const chunk = Buffer.allocUnsafe(Math.min(64 * 1024, remaining));
      const { bytesRead } = await handle.read(chunk, 0, chunk.length, totalBytes);
      if (bytesRead === 0) break;
      chunks.push(chunk.subarray(0, bytesRead));
      totalBytes += bytesRead;
    }
    if (totalBytes > maxFileBytes) throw new Error(`source exceeds byte limit: ${path}`);
    const final = await handle.stat();
    if (after.dev !== final.dev || after.ino !== final.ino || after.size !== final.size
      || after.mtimeMs !== final.mtimeMs || (requireStableCtime && after.ctimeMs !== final.ctimeMs)) {
      throw new Error(`source changed while reading: ${path}`);
    }
    return Buffer.concat(chunks, totalBytes);
  } finally {
    await handle.close();
  }
}

async function boundedObservation(executable, arguments_, label, limits, cwd, environment) {
  try {
    const { stdout } = await execFileAsync(executable, arguments_, {
      cwd,
      encoding: "utf8",
      maxBuffer: limits.maxFileBytes,
      windowsHide: true,
      ...(environment === undefined ? {} : { env: environment }),
    });
    if (Buffer.byteLength(stdout, "utf8") > limits.maxFileBytes) {
      throw new Error(`${label} observation exceeds byte limit`);
    }
    return stdout;
  } catch (error) {
    if (String(error?.message).includes("maxBuffer")) {
      throw new Error(`${label} observation exceeds byte limit`);
    }
    throw new Error(`${label} observation failed`, { cause: error });
  }
}

async function gitObservation(repositoryRoot, arguments_, label, limits) {
  const environment = Object.fromEntries(Object.entries({
    PATH: process.env.PATH,
    SystemRoot: process.env.SystemRoot,
    WINDIR: process.env.WINDIR,
    COMSPEC: process.env.COMSPEC,
    PATHEXT: process.env.PATHEXT,
    TMPDIR: process.env.TMPDIR,
    TMP: process.env.TMP,
    TEMP: process.env.TEMP,
    HOME: process.env.HOME,
    GIT_CONFIG_NOSYSTEM: "1",
    GIT_CONFIG_GLOBAL: process.platform === "win32" ? "NUL" : "/dev/null",
    GIT_NO_REPLACE_OBJECTS: "1",
    GIT_OPTIONAL_LOCKS: "0",
    GIT_TERMINAL_PROMPT: "0",
    LC_ALL: "C",
  }).filter(([, value]) => value !== undefined));
  return boundedObservation(
    "git",
    ["--no-replace-objects", "-c", "core.fsmonitor=false", "-C", repositoryRoot, ...arguments_],
    label,
    limits,
    repositoryRoot,
    environment,
  );
}

function repositoryIdentity(packageManifest) {
  const repository = typeof packageManifest?.repository === "string"
    ? packageManifest.repository
    : packageManifest?.repository?.url;
  if (typeof repository !== "string") throw new Error("repository package manifest must declare its GitHub repository URL");
  const normalized = repository.replace(/\/$/u, "").replace(/\.git$/u, "");
  const match = normalized.match(/github\.com[/:]([^/]+\/[^/]+)$/u);
  if (match === null || !REPOSITORY_ID.test(match[1])) {
    throw new Error("repository package manifest must identify a lowercase owner/repository");
  }
  return match[1];
}

async function pnpmPackageVersion(entrypoint, limits) {
  try {
    const executable = await realpath(entrypoint);
    const packageManifestPath = resolve(dirname(executable), "..", "package.json");
    const packageBytes = await secureRead(dirname(packageManifestPath), packageManifestPath, limits);
    const packageManifest = parseCustodyJson(packageBytes.toString("utf8"), limits);
    if (!record(packageManifest) || packageManifest.name !== "pnpm") return undefined;
    if (typeof packageManifest.version !== "string" || packageManifest.version.length === 0) {
      throw new Error("installed pnpm package must declare its version");
    }
    return packageManifest.version;
  } catch (error) {
    if (error?.code === "ENOENT") return undefined;
    throw error;
  }
}

async function observedPnpmVersion(limits, repositoryRoot) {
  const entrypoints = [
    process.env.npm_execpath,
    join(dirname(process.execPath), process.platform === "win32" ? "pnpm.cmd" : "pnpm"),
  ].filter(value => typeof value === "string" && value.length > 0);
  for (const entrypoint of entrypoints) {
    const version = await pnpmPackageVersion(entrypoint, limits);
    if (version !== undefined) return version;
  }
  const environment = Object.fromEntries(Object.entries({
    PATH: process.env.PATH,
    SystemRoot: process.env.SystemRoot,
    WINDIR: process.env.WINDIR,
    COMSPEC: process.env.COMSPEC,
    PATHEXT: process.env.PATHEXT,
    TMPDIR: process.env.TMPDIR,
    TMP: process.env.TMP,
    TEMP: process.env.TEMP,
    HOME: process.env.HOME,
    COREPACK_HOME: process.env.COREPACK_HOME,
  }).filter(([, value]) => value !== undefined));
  const version = (await boundedObservation(
    process.platform === "win32" ? "pnpm.cmd" : "pnpm",
    ["--version"],
    "pnpm version",
    limits,
    repositoryRoot,
    environment,
  )).trim();
  if (!/^[0-9]+\.[0-9]+\.[0-9]+(?:[-+][0-9A-Za-z.-]+)?$/u.test(version)) {
    throw new Error("active pnpm must report one exact version");
  }
  return version;
}

async function deriveBaseline(repositoryRoot, capturedAt, limits, budget) {
  const configuredRoot = await assertCanonicalPermittedRoot(repositoryRoot, "repository root");
  const canonicalRoot = await realpath(configuredRoot);
  const metadata = await lstat(canonicalRoot);
  if (metadata.isSymbolicLink() || !metadata.isDirectory()) throw new Error("repository root must be a real directory");
  const observedTopLevel = (await gitObservation(canonicalRoot, ["rev-parse", "--show-toplevel"], "Git top-level", limits)).trim();
  if (await realpath(observedTopLevel) !== canonicalRoot) {
    throw new Error("repositoryRoot must be the canonical Git worktree root");
  }
  await gitObservation(canonicalRoot, ["ls-files", "--error-unmatch", "--", "package.json", "pnpm-lock.yaml"], "tracked baseline files", limits);
  const packageBytes = await secureRead(canonicalRoot, join(canonicalRoot, "package.json"), limits);
  const lockfileBytes = await secureRead(canonicalRoot, join(canonicalRoot, "pnpm-lock.yaml"), limits);
  if (budget !== undefined) {
    accountResource(budget, packageBytes, "repository package.json", limits);
    accountResource(budget, lockfileBytes, "repository pnpm-lock.yaml", limits);
  }
  const packageManifest = parseCustodyJson(packageBytes.toString("utf8"), limits);
  if (!record(packageManifest)) throw new Error("repository package.json must contain a JSON object");
  const packageManager = packageManifest.packageManager;
  const packageManagerMatch = typeof packageManager === "string" ? packageManager.match(/^pnpm@(.+)$/u) : null;
  if (packageManagerMatch === null || packageManagerMatch[1].length === 0) {
    throw new Error("repository package.json must pin pnpm in packageManager");
  }
  const [commit, tree, status, pnpmVersion] = await Promise.all([
    gitObservation(canonicalRoot, ["rev-parse", "--verify", "HEAD^{commit}"], "Git commit", limits),
    gitObservation(canonicalRoot, ["rev-parse", "--verify", "HEAD^{tree}"], "Git tree", limits),
    gitObservation(canonicalRoot, ["status", "--porcelain=v1", "--untracked-files=all", "--ignore-submodules=none"], "Git status", limits),
    observedPnpmVersion(limits, canonicalRoot),
  ]);
  if (status.length !== 0) throw new Error("repository root must be clean at capture");
  const pinnedPnpmVersion = packageManagerMatch[1].split("+", 1)[0];
  if (pnpmVersion !== pinnedPnpmVersion) {
    throw new Error(`active pnpm ${pnpmVersion} does not match repository pin ${pinnedPnpmVersion}`);
  }
  const baseline = {
    derivation: "canonical-repository-observation-v1",
    repository: repositoryIdentity(packageManifest),
    commit: commit.trim(),
    tree: tree.trim(),
    lockfileSha256: sha256(lockfileBytes),
    clean: true,
    platform: `${process.platform}/${process.arch}`,
    nodeVersion: process.versions.node,
    pnpmVersion,
    capturedAt,
  };
  if (!GIT_OBJECT_ID.test(baseline.commit) || !GIT_OBJECT_ID.test(baseline.tree)) {
    throw new Error("repository must use 40-character Git object IDs for custody V2");
  }
  return { baseline, repositoryRoot: canonicalRoot };
}

async function assertBaselineRemainsCurrent(repositoryRoot, baseline, limits) {
  const current = await deriveBaseline(repositoryRoot, baseline.capturedAt, limits);
  if (deterministicJson(current.baseline) !== deterministicJson(baseline)) {
    throw new Error("repository baseline changed during capture");
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
    await assertCanonicalPermittedRoot(this.root, "object store");
    await mkdir(this.root, { recursive: true, mode: 0o700 });
    if (process.platform !== "win32") await chmod(this.root, 0o700);
    await assertCanonicalPermittedRoot(this.root, "object store");
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
    // Removing a concurrent publisher's temporary hard link may change ctime
    // for this inode. The digest and exact-byte comparison below are the
    // content-addressed object's integrity authority.
    const stored = await secureRead(this.root, path, { requireStableCtime: false });
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
    const handle = await open(temporary, "wx", 0o400);
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

function validateUniqueArray(value, path, errors, validateEntry, maxItems = DEFAULT_RESOURCE_LIMITS.maxReferencesPerEntry) {
  requiredArray(value, path, errors);
  if (!Array.isArray(value)) return;
  if (value.length > maxItems) {
    errors.push(`${path} exceeds the ${maxItems}-item limit`);
    return;
  }
  const seen = new Set();
  for (const entry of value) {
    validateEntry?.(entry);
    if (seen.has(entry)) errors.push(`${path} must contain unique items`);
    seen.add(entry);
  }
}

function manifestCollectionLimitErrors(manifest, limits) {
  const errors = [];
  const topLevel = [
    ["objects", Math.min(limits.maxManifestObjects, limits.maxFiles)],
    ["jobs", limits.maxManifestJobs],
    ["attempts", limits.maxManifestAttempts],
    ["continuations", limits.maxManifestContinuations],
    ["claims", limits.maxManifestClaims],
    ["exceptions", limits.maxManifestExceptions],
  ];
  for (const [field, maximum] of topLevel) {
    const value = manifest?.[field];
    if (Array.isArray(value) && value.length > maximum) errors.push(`${field} exceeds the ${maximum}-item limit`);
  }
  let totalObjectBytes = 0;
  for (const object of arrayOrEmpty(manifest?.objects)) {
    if (!Number.isSafeInteger(object?.bytes) || object.bytes < 0) continue;
    if (object.bytes > limits.maxFileBytes) errors.push(`objects contains an entry exceeding the ${limits.maxFileBytes}-byte file limit`);
    totalObjectBytes += object.bytes;
    if (!Number.isSafeInteger(totalObjectBytes) || totalObjectBytes > limits.maxTotalBytes) {
      errors.push(`objects exceeds the ${limits.maxTotalBytes}-byte aggregate limit`);
      break;
    }
  }
  if (errors.length > 0) return errors;
  for (const [index, job] of arrayOrEmpty(manifest?.jobs).entries()) {
    for (const field of ["attemptIds", "capturedObjects"]) {
      if (Array.isArray(job?.[field]) && job[field].length > limits.maxReferencesPerEntry) {
        errors.push(`jobs[${index}].${field} exceeds the ${limits.maxReferencesPerEntry}-item limit`);
      }
    }
  }
  for (const [index, attempt] of arrayOrEmpty(manifest?.attempts).entries()) {
    if (Array.isArray(attempt?.transcriptObjects) && attempt.transcriptObjects.length > limits.maxReferencesPerEntry) {
      errors.push(`attempts[${index}].transcriptObjects exceeds the ${limits.maxReferencesPerEntry}-item limit`);
    }
  }
  for (const [index, claim] of arrayOrEmpty(manifest?.claims).entries()) {
    for (const field of [
      "primarySourceObjects",
      "executableEvidenceObjects",
      "publisherIndependence",
      "executableEvidenceAttestations",
    ]) {
      if (Array.isArray(claim?.[field]) && claim[field].length > limits.maxReferencesPerEntry) {
        errors.push(`claims[${index}].${field} exceeds the ${limits.maxReferencesPerEntry}-item limit`);
      }
    }
  }
  return errors;
}

export function validateManifest(manifest, resourceLimits = {}) {
  const limits = normalizeResourceLimits(resourceLimits);
  const errors = [];
  if (!record(manifest)) return { valid: false, errors: ["manifest must be an object"] };
  try {
    assertJsonLimits(manifest, limits);
  } catch (error) {
    return { valid: false, errors: [error.message] };
  }
  const collectionErrors = manifestCollectionLimitErrors(manifest, limits);
  if (collectionErrors.length > 0) return { valid: false, errors: collectionErrors };
  rejectAdditionalProperties(manifest, MANIFEST_FIELDS, "manifest", errors);
  if (manifest.schemaVersion === 1) errors.push("schemaVersion 1 is unsupported; schemaVersion 2 is required");
  else if (manifest.schemaVersion !== 2) errors.push("schemaVersion must be 2");
  requiredString(manifest.campaignId, "campaignId", errors);
  if (!CAMPAIGN_ID.test(manifest.campaignId ?? "")) errors.push("campaignId must be a safe lowercase path component");
  if (!record(manifest.baseline)) errors.push("baseline must be an object");
  else {
    rejectAdditionalProperties(manifest.baseline, BASELINE_FIELDS, "baseline", errors);
    for (const field of ["derivation", "repository", "commit", "tree", "lockfileSha256", "platform", "nodeVersion", "pnpmVersion", "capturedAt"]) {
      requiredString(manifest.baseline[field], `baseline.${field}`, errors);
    }
    if (manifest.baseline.derivation !== "canonical-repository-observation-v1") {
      errors.push("baseline.derivation must identify the V2 canonical repository observation");
    }
    if (!REPOSITORY_ID.test(manifest.baseline.repository ?? "")) errors.push("baseline.repository must be an owner/repository identifier");
    for (const field of ["commit", "tree"]) {
      if (!GIT_OBJECT_ID.test(manifest.baseline[field] ?? "")) errors.push(`baseline.${field} must be a lowercase 40-character Git object ID`);
    }
    if (!SHA256.test(manifest.baseline.lockfileSha256 ?? "")) errors.push("baseline.lockfileSha256 must be lowercase SHA-256");
    if (manifest.baseline.clean !== true) errors.push("baseline.clean must be true");
  }
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
    validateUniqueArray(job.attemptIds, `${path}.attemptIds`, errors, attemptId => requiredString(attemptId, `${path}.attemptIds[]`, errors), limits.maxReferencesPerEntry);
    if (!JOB_ID.test(job.jobId ?? "")) errors.push(`${path}.jobId is invalid`);
    if (!WAVE.test(job.wave ?? "")) errors.push(`${path}.wave is invalid`);
    if (job.jobConfigObject !== null && !SHA256.test(job.jobConfigObject ?? "")) errors.push(`${path}.jobConfigObject must be lowercase SHA-256 or null`);
    if (job.currentAlias !== null && !SHA256.test(job.currentAlias ?? "")) errors.push(`${path}.currentAlias must be lowercase SHA-256 or null`);
    validateUniqueArray(job.capturedObjects, `${path}.capturedObjects`, errors, digest => {
      if (!SHA256.test(digest ?? "")) errors.push(`${path}.capturedObjects must contain lowercase SHA-256`);
    }, limits.maxReferencesPerEntry);
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
  const attemptsByJob = new Map();
  for (const [index, attempt] of arrayOrEmpty(manifest.attempts).entries()) {
    const path = `attempts[${index}]`;
    if (!record(attempt)) { errors.push(`${path} must be an object`); continue; }
    rejectAdditionalProperties(attempt, ATTEMPT_FIELDS, path, errors);
    for (const field of ["attemptId", "jobId", "status", "startedAt", "finishedAt"]) requiredString(attempt[field], `${path}.${field}`, errors);
    if (!JOB_ID.test(attempt.jobId ?? "")) errors.push(`${path}.jobId is invalid`);
    for (const field of ["outputSummaryObject", "wrapperObject"]) if (attempt[field] !== null && !SHA256.test(attempt[field] ?? "")) errors.push(`${path}.${field} must be lowercase SHA-256 or null`);
    validateUniqueArray(attempt.transcriptObjects, `${path}.transcriptObjects`, errors, digest => {
      if (!SHA256.test(digest ?? "")) errors.push(`${path}.transcriptObjects must contain lowercase SHA-256`);
    }, limits.maxReferencesPerEntry);
    if (Array.isArray(attempt.transcriptObjects) && attempt.transcriptObjects.length !== 1) {
      errors.push(`${path}.transcriptObjects must contain exactly one backing attempt journal`);
    }
    if (!Number.isSafeInteger(attempt.attemptNumber) || attempt.attemptNumber < 1) errors.push(`${path}.attemptNumber must be a positive safe integer`);
    if (typeof attempt.jobId === "string" && Number.isSafeInteger(attempt.attemptNumber)
      && attempt.attemptId !== `${attempt.jobId}:attempt:${attempt.attemptNumber}`) {
      errors.push(`${path}.attemptId must be derived from jobId and attemptNumber`);
    }
    if (!TERMINAL.has(attempt.status)) errors.push(`${path}.status must be terminal`);
    if (attempt.predecessorAttemptId !== null && typeof attempt.predecessorAttemptId !== "string") errors.push(`${path}.predecessorAttemptId must be a string or null`);
    if (attempt.continuationOf !== null && typeof attempt.continuationOf !== "string") errors.push(`${path}.continuationOf must be a string or null`);
    if (attempts.has(attempt.attemptId)) errors.push(`${path}.attemptId is duplicated`);
    attempts.set(attempt.attemptId, attempt);
    if (typeof attempt.jobId === "string") {
      const jobAttempts = attemptsByJob.get(attempt.jobId) ?? [];
      jobAttempts.push(attempt);
      attemptsByJob.set(attempt.jobId, jobAttempts);
    }
  }
  const attemptPositions = new Map();
  for (const jobAttempts of attemptsByJob.values()) {
    jobAttempts.sort((left, right) => left.attemptNumber - right.attemptNumber);
    for (const [position, attempt] of jobAttempts.entries()) attemptPositions.set(attempt.attemptId, position);
  }
  const objectRoles = new Map();
  function bindObjectRole(digest, expectedKind, expectedPath, role, path) {
    if (digest === null || digest === undefined) return;
    const object = objects.get(digest);
    if (object === undefined) return;
    if (object.kind !== expectedKind) errors.push(`${path} must reference ${expectedKind} bytes`);
    const pathMatches = expectedPath instanceof RegExp
      ? expectedPath.test(object.sourcePath)
      : object.sourcePath === expectedPath;
    if (!pathMatches) errors.push(`${path} has incompatible sourcePath provenance`);
    const prior = objectRoles.get(digest);
    if (prior !== undefined && prior !== role) errors.push(`${path} reuses one object across incompatible custody roles`);
    objectRoles.set(digest, role);
  }
  for (const [index, job] of arrayOrEmpty(manifest.jobs).entries()) {
    if (!record(job) || typeof job.jobId !== "string") continue;
    bindObjectRole(job.jobConfigObject, "jobConfig", `job-config/${job.jobId}/job.json`, `job:${job.jobId}:config`, `jobs[${index}].jobConfigObject`);
    bindObjectRole(job.currentAlias, "worker-report", `runtime/${job.jobId}/${job.jobId}.latest-result.json`, `job:${job.jobId}:alias`, `jobs[${index}].currentAlias`);
  }
  for (const [index, attempt] of arrayOrEmpty(manifest.attempts).entries()) {
    if (!record(attempt) || typeof attempt.jobId !== "string") continue;
    bindObjectRole(attempt.wrapperObject, "worker-report", `runtime/${attempt.jobId}/${attempt.jobId}.latest-result.json`, `job:${attempt.jobId}:alias`, `attempts[${index}].wrapperObject`);
    bindObjectRole(
      attempt.outputSummaryObject,
      "decoded-output-summary",
      new RegExp(`^runtime/${attempt.jobId}/state/attempt-journal/.+#attempts/${attempt.attemptNumber}/lastOutputSummary$`, "u"),
      `attempt:${attempt.attemptId}:summary`,
      `attempts[${index}].outputSummaryObject`,
    );
    for (const digest of arrayOrEmpty(attempt.transcriptObjects)) {
      bindObjectRole(
        digest,
        "attempt-journal",
        new RegExp(`^runtime/${attempt.jobId}/state/attempt-journal/`, "u"),
        `job:${attempt.jobId}:journal`,
        `attempts[${index}].transcriptObjects`,
      );
    }
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
    const jobAttempts = attemptsByJob.get(attempt.jobId) ?? [];
    const position = attemptPositions.get(attempt.attemptId) ?? -1;
    const latestAttempt = jobAttempts.at(-1);
    const owningJob = jobs.get(attempt.jobId);
    if (attempt.wrapperObject !== null && latestAttempt?.attemptId !== attempt.attemptId) {
      errors.push(`attempts[${index}].wrapperObject is allowed only for the latest attempt`);
    }
    if (attempt.wrapperObject !== null && owningJob?.currentAlias !== attempt.wrapperObject) {
      errors.push(`attempts[${index}].wrapperObject must equal its job currentAlias`);
    }
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
  const checkedContinuationAttempts = new Set();
  for (const attempt of arrayOrEmpty(manifest.attempts)) {
    if (!record(attempt)) continue;
    const path = [];
    const pathPositions = new Map();
    let current = attempt;
    while (current !== undefined && !checkedContinuationAttempts.has(current.attemptId)) {
      const cycleStart = pathPositions.get(current.attemptId);
      if (cycleStart !== undefined) {
        errors.push(`${attempt.attemptId} has cyclic continuation lineage`);
        break;
      }
      pathPositions.set(current.attemptId, path.length);
      path.push(current.attemptId);
      current = current.continuationOf === null ? undefined : attempts.get(current.continuationOf);
    }
    for (const attemptId of path) checkedContinuationAttempts.add(attemptId);
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
      }, limits.maxReferencesPerEntry);
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

async function defaultLiveSourceVerifier(sourceRoot, object, limits) {
  const [filesystemPath, fragment] = object.sourcePath.split("#", 2);
  if (fragment !== undefined) return false;
  try {
    const bytes = await secureRead(sourceRoot, join(sourceRoot, filesystemPath), limits);
    return bytes.length === object.bytes && sha256(bytes) === object.sha256;
  } catch (error) {
    if (error?.code === "ENOENT") return false;
    throw error;
  }
}

function manifestIdentityFailures(manifest, manifestBytes, expectedManifestSha256, limits) {
  const failures = [];
  if (!Buffer.isBuffer(manifestBytes) || !SHA256.test(expectedManifestSha256 ?? "")) {
    return ["manifest verification requires exact bytes and a trusted expected SHA-256"];
  }
  if (manifestBytes.length > limits.maxFileBytes) return ["manifest bytes exceed the verification byte limit"];
  const actual = sha256(manifestBytes);
  if (actual !== expectedManifestSha256) failures.push("manifest bytes do not match the trusted expected SHA-256");
  try {
    const parsed = parseCustodyJson(manifestBytes.toString("utf8"), limits);
    if (deterministicJson(parsed) !== deterministicJson(manifest)) {
      failures.push("verified manifest bytes do not encode the supplied manifest value");
    }
  } catch {
    failures.push("verified manifest bytes are not valid bounded custody JSON");
  }
  return failures;
}

function attemptJournalEntry(jobId, entry, journalLabel) {
  if (!record(entry) || !Number.isSafeInteger(entry.attemptNumber) || entry.attemptNumber < 1) {
    throw new Error(`attempt journal ${journalLabel} contains an invalid attempt number`);
  }
  if (!TERMINAL.has(entry.status)) throw new Error(`attempt journal ${journalLabel} contains a non-terminal attempt status`);
  if (typeof entry.startedAt !== "string" || entry.startedAt.length === 0
    || typeof entry.finishedAt !== "string" || entry.finishedAt.length === 0) {
    throw new Error(`attempt journal ${journalLabel} contains invalid attempt timestamps`);
  }
  if (entry.lastOutputSummary !== undefined && typeof entry.lastOutputSummary !== "string") {
    throw new Error(`attempt journal ${journalLabel} contains a non-string output summary`);
  }
  return {
    attemptId: `${jobId}:attempt:${entry.attemptNumber}`,
    attemptNumber: entry.attemptNumber,
    status: entry.status,
    startedAt: entry.startedAt,
    finishedAt: entry.finishedAt,
    continuationOf: journalContinuationAttemptId(jobId, entry, journalLabel),
    outputSummary: entry.lastOutputSummary,
  };
}

async function attemptJournalFailures(manifest, objectMap, storedObjectBytes, limits) {
  const failures = [];
  const journalEntries = new Map();
  for (const object of manifest.objects) {
    if (object.kind !== "attempt-journal") continue;
    const jobId = provenanceJobId(object.sourcePath);
    if (jobId === undefined) {
      failures.push(`attempt journal ${object.sha256} has no job-scoped provenance`);
      continue;
    }
    const bytes = storedObjectBytes.get(object.sha256);
    if (bytes === undefined) continue;
    let journal;
    try {
      journal = parseCustodyJson(bytes.toString("utf8"), limits);
    } catch (error) {
      failures.push(`attempt journal ${object.sha256} is not valid bounded JSON: ${error.message}`);
      continue;
    }
    if (!record(journal) || !Array.isArray(journal.attempts)) {
      failures.push(`attempt journal ${object.sha256} must contain an attempts array`);
      continue;
    }
    if (journal.attempts.length > limits.maxManifestAttempts) {
      failures.push(`attempt journal ${object.sha256} exceeds the attempt limit`);
      continue;
    }
    for (const entry of journal.attempts) {
      let normalized;
      try {
        normalized = attemptJournalEntry(jobId, entry, object.sourcePath);
      } catch (error) {
        failures.push(error.message);
        continue;
      }
      if (journalEntries.has(normalized.attemptId)) {
        failures.push(`${normalized.attemptId} appears in multiple stored journal entries`);
        continue;
      }
      journalEntries.set(normalized.attemptId, { ...normalized, journalObject: object });
      if (journalEntries.size > limits.maxManifestAttempts) {
        failures.push("stored attempt journals exceed the manifest attempt limit");
        return failures;
      }
    }
  }

  const attempts = new Map(manifest.attempts.map(attempt => [attempt.attemptId, attempt]));
  for (const attemptId of journalEntries.keys()) {
    if (!attempts.has(attemptId)) failures.push(`${attemptId} is present in stored journal bytes but absent from the manifest`);
  }
  for (const attempt of manifest.attempts) {
    const backing = journalEntries.get(attempt.attemptId);
    if (backing === undefined) {
      failures.push(`${attempt.attemptId} has no unique stored attempt-journal entry`);
      continue;
    }
    for (const field of ["attemptNumber", "status", "startedAt", "finishedAt", "continuationOf"]) {
      if (attempt[field] !== backing[field]) failures.push(`${attempt.attemptId}.${field} does not match stored attempt-journal bytes`);
    }
    if (attempt.transcriptObjects.length !== 1 || attempt.transcriptObjects[0] !== backing.journalObject.sha256) {
      failures.push(`${attempt.attemptId}.transcriptObjects does not identify its unique backing journal`);
    }
    if (backing.outputSummary === undefined) {
      if (attempt.outputSummaryObject !== null) failures.push(`${attempt.attemptId}.outputSummaryObject is not backed by its journal`);
      continue;
    }
    const expectedSummaryDigest = sha256(Buffer.from(backing.outputSummary, "utf8"));
    if (attempt.outputSummaryObject !== expectedSummaryDigest) {
      failures.push(`${attempt.attemptId}.outputSummaryObject does not match stored attempt-journal bytes`);
      continue;
    }
    const summaryObject = objectMap.get(attempt.outputSummaryObject);
    const expectedSourcePath = `${backing.journalObject.sourcePath}#attempts/${attempt.attemptNumber}/lastOutputSummary`;
    if (summaryObject?.sourcePath !== expectedSourcePath) {
      failures.push(`${attempt.attemptId}.outputSummaryObject does not identify its backing journal fragment`);
    }
  }
  return failures;
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
  return "custody execution records are unauthenticated; a separately verified runner attestation is required";
}

export async function verifyManifest(manifest, {
  store,
  auditLiveSources = false,
  sourceRoot,
  manifestBytes,
  expectedManifestSha256,
  resourceLimits = {},
} = {}) {
  const limits = normalizeResourceLimits(resourceLimits);
  const validation = validateManifest(manifest, limits);
  const failures = Object.fromEntries(GATES.map(id => [id, []]));
  failures["G-CUSTODY"].push(...manifestIdentityFailures(manifest, manifestBytes, expectedManifestSha256, limits));
  if (store === undefined) {
    failures["G-CUSTODY"].push("object store is required to verify referenced bytes");
    failures["G-ALIAS"].push("object store is required to verify alias bytes");
  }
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
  const storedObjectBytes = new Map();
  const referenced = referencedDigests(manifest);
  for (const digest of referenced) {
    if (!objectMap.has(digest)) failures["G-CUSTODY"].push(`missing object record ${digest}`);
  }
  for (const object of manifest.objects) {
    const digest = object.sha256;
    if (store !== undefined) {
      try {
        const bytes = await secureRead(store.root, store.objectPath(digest), limits);
        if (bytes.length !== object.bytes || sha256(bytes) !== digest) failures["G-CUSTODY"].push(`corrupt object ${digest}`);
        else storedObjectBytes.set(digest, bytes);
      } catch (error) {
        failures["G-CUSTODY"].push(`unreadable object ${digest}: ${error.message}`);
      }
    }
  }
  if (store !== undefined) {
    const journalFailures = await attemptJournalFailures(manifest, objectMap, storedObjectBytes, limits);
    failures["G-CUSTODY"].push(...journalFailures);
    failures["G-TERMINAL"].push(...journalFailures);
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
        const currentBytes = storedObjectBytes.get(job.currentAlias);
        if (currentBytes === undefined) throw new Error("stored alias bytes did not pass custody verification");
        if (sha256(currentBytes) !== job.currentAlias) failures["G-ALIAS"].push(`${job.jobId} alias bytes changed after capture`);
        if (latest !== undefined) {
          const binding = proveWrapperBinding(currentBytes, latest, limits);
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
      else {
        try {
          if (!(await defaultLiveSourceVerifier(sourceRoot, object, limits))) failures["G-PATH"].push(object.sourcePath);
        } catch {
          failures["G-PATH"].push(`live source verification failed for ${object.sourcePath}`);
        }
      }
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
        const attestationBytes = storedObjectBytes.get(attestation.attestationObject);
        if (attestationBytes === undefined) throw new Error("stored attestation bytes did not pass custody verification");
        const document = parseCustodyJson(attestationBytes.toString("utf8"), limits);
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
    if (POSITIVE_CLAIM_CLASSIFICATIONS.has(claim.classification)) {
      failures["G-SOURCE"].push(`${claim.claimId} is a positive claim without an authenticated source receipt`);
    }
    if (claim.promotionEligible && (!sourceSatisfied || !executableSatisfied)) failures["G-SOURCE"].push(`${claim.claimId} requires both authenticated independent primary sources and successfully authenticated executable evidence`);
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
  failures["G-PROMOTION"].push("V2 custody manifests are negative-only; promotion requires a separate authenticated receipt schema");
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

async function regularFilesBelow(root, relativeDirectory, limits, budget) {
  const directory = join(root, relativeDirectory);
  try {
    const metadata = await lstat(directory);
    if (metadata.isSymbolicLink() || !metadata.isDirectory()) throw new Error("capture directory must be a real directory");
  } catch (error) {
    if (error?.code === "ENOENT") return [];
    throw error;
  }
  const results = [];
  budget.directories += 1;
  if (budget.directories > limits.maxDirectories) throw new Error(`capture directory-count limit exceeded at ${directory}`);
  const pending = [{ directory, depth: 0 }];
  while (pending.length > 0) {
    const current = pending.pop();
    if (current.depth > limits.maxDirectoryDepth) throw new Error(`capture directory-depth limit exceeded at ${current.directory}`);
    const stream = await opendir(current.directory);
    for await (const entry of stream) {
      budget.directoryEntries += 1;
      if (budget.directoryEntries > limits.maxDirectoryEntries) {
        throw new Error(`capture directory-entry limit exceeded at ${current.directory}`);
      }
      const path = join(current.directory, entry.name);
      const metadata = await lstat(path);
      if (metadata.isSymbolicLink()) throw new Error(`capture source must not contain symlinks: ${path}`);
      if (metadata.isDirectory()) {
        budget.directories += 1;
        if (budget.directories > limits.maxDirectories) throw new Error(`capture directory-count limit exceeded at ${path}`);
        pending.push({ directory: path, depth: current.depth + 1 });
        continue;
      }
      if (!metadata.isFile()) continue;
      const bytes = await secureRead(root, path, limits);
      accountResource(budget, bytes, path, limits);
      results.push({ path, bytes });
    }
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
  baseline: declaredBaseline,
  repositoryRoot,
  jobIds,
  runtimeRoot,
  jobConfigRoot,
  outputRoot,
  capturedAt = new Date().toISOString(),
  claims = [],
  continuations: declaredContinuations,
  promotion = {},
  resourceLimits = {},
}) {
  if (typeof campaignId !== "string" || !CAMPAIGN_ID.test(campaignId)) throw new Error("campaignId must be a safe lowercase path component");
  if (declaredBaseline !== undefined) {
    throw new Error("caller-declared V1 baselines are unsupported; provide repositoryRoot for a V2 derived baseline");
  }
  if (declaredContinuations !== undefined) {
    throw new Error("caller-declared continuations are unsupported; V2 lineage must be attempt-journal-backed");
  }
  if (typeof repositoryRoot !== "string" || repositoryRoot.length === 0) throw new Error("repositoryRoot is required for V2 baseline derivation");
  if (typeof capturedAt !== "string" || capturedAt.length === 0) throw new Error("capturedAt must be a non-empty string");
  const limits = normalizeResourceLimits(resourceLimits);
  const budget = { files: 0, bytes: 0, directories: 0, directoryEntries: 0 };
  const derived = await deriveBaseline(repositoryRoot, capturedAt, limits, budget);
  const baseline = derived.baseline;
  const allowlist = assertExplicitJobIds(jobIds);
  const safeRuntimeRoot = await assertCanonicalPermittedRoot(runtimeRoot, "runtime root");
  const safeConfigRoot = await assertCanonicalPermittedRoot(jobConfigRoot, "job config root");
  await assertCanonicalPermittedRoot(outputRoot, "output root");
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
        capturedBytes[kind] = await secureRead(
          kind === "jobConfig" ? safeConfigRoot : safeRuntimeRoot,
          path,
          limits,
        );
        accountResource(budget, capturedBytes[kind], path, limits);
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
    const journalFiles = await regularFilesBelow(jobRoot, "state/attempt-journal", limits, budget);
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
      try { journal = parseCustodyJson(journalFile.bytes.toString("utf8"), limits); }
      catch (error) {
        if (error?.code === "DUPLICATE_JSON_KEY") throw error;
        throw new Error(`attempt journal ${journalLabel} must be valid bounded JSON`, { cause: error });
      }
      if (!record(journal) || !Array.isArray(journal.attempts)) throw new Error(`attempt journal ${journalLabel} must contain an attempts array`);
      if (journal.attempts.length > limits.maxManifestAttempts) throw new Error(`attempt journal ${journalLabel} exceeds the attempt limit`);
      for (const entry of journal.attempts) {
        if (!record(entry) || !Number.isSafeInteger(entry.attemptNumber) || entry.attemptNumber < 1) {
          throw new Error(`attempt journal ${journalLabel} contains an invalid attempt number`);
        }
        if (!TERMINAL.has(entry.status)) throw new Error(`attempt journal ${journalLabel} contains a non-terminal attempt status`);
        if (typeof entry.startedAt !== "string" || entry.startedAt.length === 0
          || typeof entry.finishedAt !== "string" || entry.finishedAt.length === 0) {
          throw new Error(`attempt journal ${journalLabel} contains invalid attempt timestamps`);
        }
        if (entry.lastOutputSummary !== undefined && typeof entry.lastOutputSummary !== "string") {
          throw new Error(`attempt journal ${journalLabel} contains a non-string output summary`);
        }
        if (attemptNumbers.has(entry.attemptNumber)) {
          throw new Error(`ambiguous attempt ${entry.attemptNumber} for ${jobId} appears in multiple journal entries`);
        }
        if (attemptNumbers.size >= limits.maxManifestAttempts) {
          throw new Error(`attempt journals for ${jobId} exceed the attempt limit`);
        }
        attemptNumbers.add(entry.attemptNumber);
        journalEntries.push({
          entry,
          continuationOf: journalContinuationAttemptId(jobId, entry, journalLabel),
          journalDigest,
          journalLabel,
        });
      }
    }
    journalEntries.sort((left, right) => left.entry.attemptNumber - right.entry.attemptNumber);
    const currentEntry = journalEntries.at(-1)?.entry;
    const currentAttemptNumber = currentEntry?.attemptNumber;
    let wrapperBindingProven = false;
    if (capturedBytes.wrapper !== undefined && currentEntry !== undefined) {
      const binding = proveWrapperBinding(capturedBytes.wrapper, { jobId, attemptNumber: currentEntry.attemptNumber, status: currentEntry.status }, limits);
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
    for (const { entry, continuationOf, journalDigest, journalLabel } of journalEntries) {
        const attemptId = `${jobId}:attempt:${entry.attemptNumber}`;
        const summary = typeof entry.lastOutputSummary === "string" ? Buffer.from(entry.lastOutputSummary, "utf8") : undefined;
        let summaryDigest = null;
        if (summary === undefined) {
          exceptions.push({ exceptionId: `${attemptId}:summary:missing`, kind: "missing-historical-bytes", detail: "lastOutputSummary was absent; no output was fabricated" });
        } else {
          accountResource(budget, summary, `${attemptId}:lastOutputSummary`, limits);
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
        if (attempts.length >= limits.maxManifestAttempts) throw new Error("captured attempts exceed the manifest attempt limit");
        attempts.push({
          attemptId,
          jobId,
          attemptNumber: entry.attemptNumber,
          status: entry.status,
          predecessorAttemptId: priorAttemptId,
          continuationOf,
          startedAt: entry.startedAt,
          finishedAt: entry.finishedAt,
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
  const continuations = attempts
    .filter(attempt => attempt.continuationOf !== null)
    .map(attempt => ({ attemptId: attempt.attemptId, continuationOf: attempt.continuationOf }));
  await assertBaselineRemainsCurrent(derived.repositoryRoot, baseline, limits);
  const manifest = {
    schemaVersion: 2,
    campaignId,
    baseline,
    objects: objects.sort((left, right) => left.sha256.localeCompare(right.sha256)),
    jobs,
    attempts,
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
  const validation = validateManifest(manifest, limits);
  if (!validation.valid) throw new Error(`captured manifest is invalid:\n${validation.errors.join("\n")}`);
  const manifestBytes = Buffer.from(`${deterministicJson(manifest)}\n`, "utf8");
  if (manifestBytes.length > limits.maxFileBytes) throw new Error("captured manifest exceeds the file-size limit");
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
  const handle = await open(temporary, "wx", 0o400);
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
  await assertBaselineRemainsCurrent(derived.repositoryRoot, baseline, limits);
  return { manifest, manifestPath, manifestSha256: manifestObject.sha256, store };
}

export async function loadManifest(path) {
  return (await readSafeJsonDocument(path, "manifest input")).value;
}

export async function readSafeJsonDocument(path, label = "JSON input") {
  const safePath = assertSafeEvidencePath(path, label);
  const bytes = await secureRead(dirname(safePath), safePath);
  scanSecrets(bytes, safePath);
  return Object.freeze({
    value: parseCustodyJson(bytes.toString("utf8")),
    bytes,
    sha256: sha256(bytes),
  });
}

export async function readSafeJson(path, label = "JSON input") {
  return (await readSafeJsonDocument(path, label)).value;
}

export { GATES, REQUIRED_FILES };
