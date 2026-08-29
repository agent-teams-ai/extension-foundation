import { execFile } from "node:child_process";
import { posix } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const SCHEMA_VERSION = 3;
const MAX_GIT_OUTPUT_BYTES = 1024 * 1024;
const MAX_PRODUCTS = 8;
const MAX_FILES_PER_PRODUCT = 64;
const MAX_BLOB_BYTES = 2 * 1024 * 1024;
const MAX_TOTAL_BLOB_BYTES = 16 * 1024 * 1024;
const MAX_PATH_BYTES = 1024;
const MAX_COMPONENT_BYTES = 255;
const GIT_TIMEOUT_MS = 10_000;

export const PRODUCT_SOURCE_PROOF_MODE = "exact-git-source-custody";
export const PRODUCT_SOURCE_CLAIM_KIND = "exact-git-source-custody";
export const PRODUCT_SOURCE_VERIFICATION_AUTHORITY = "local-git-object-custody-verifier";
export const PRODUCT_SOURCE_PROOF_LIMITS = Object.freeze([
  "verifies only exact local Git origin, commit, tree, and declared regular-file blob identities",
  "does not interpret source text or prove symbols, topology, semantics, dataflow, or runtime behavior",
  "does not prove remote publication, repository independence, product approval, or promotion readiness",
]);

const GIT_OBJECT = /^[a-f0-9]{40}$/u;
const REPOSITORY = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/u;
const PORTABLE_COMPONENT = /^[A-Za-z0-9._@+ -]+$/u;
const WINDOWS_RESERVED = /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\..*)?$/iu;
const REGULAR_FILE_MODES = new Set(["100644", "100755"]);
const GITHUB_PROTOCOLS = new Set(["https:", "ssh:"]);

export class ProductSourceEvidenceError extends Error {
  constructor(code, message) {
    super(`${code}: ${message}`);
    this.name = "ProductSourceEvidenceError";
    this.code = code;
  }
}

function fail(code, message) {
  throw new ProductSourceEvidenceError(code, message);
}

function requireRecord(value, label) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    fail("E-SCHEMA", `${label} must be an object`);
  }
  return value;
}

function requireExactKeys(value, allowed, label) {
  const record = requireRecord(value, label);
  const actual = Object.keys(record).sort();
  const expected = [...allowed].sort();
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
    fail("E-SCHEMA", `${label} fields must be exactly: ${expected.join(", ")}`);
  }
  return record;
}

function requireString(value, label) {
  if (typeof value !== "string" || value.length === 0) fail("E-SCHEMA", `${label} must be a non-empty string`);
  return value;
}

function requireGitObject(value, label) {
  const object = requireString(value, label);
  if (!GIT_OBJECT.test(object)) fail("E-SCHEMA", `${label} must be a full lowercase Git object ID`);
  return object;
}

function requireRepositoryPath(value, label) {
  const path = requireString(value, label);
  if (Buffer.byteLength(path) > MAX_PATH_BYTES || path.startsWith("/") || path.includes("\\")) {
    fail("E-PATH", `${label} must be a portable repository-relative path`);
  }
  if (posix.normalize(path) !== path || path === "." || path.startsWith("../")) {
    fail("E-PATH", `${label} must be canonical and remain inside the repository`);
  }
  for (const component of path.split("/")) {
    if (Buffer.byteLength(component) > MAX_COMPONENT_BYTES
      || !PORTABLE_COMPONENT.test(component)
      || component.endsWith(".")
      || component.endsWith(" ")
      || WINDOWS_RESERVED.test(component)) {
      fail("E-PATH", `${label} contains a non-portable path component`);
    }
  }
  return path;
}

async function runGit(repositoryRoot, args) {
  const environment = {
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
    GIT_NO_LAZY_FETCH: "1",
    GIT_NO_REPLACE_OBJECTS: "1",
    GIT_OPTIONAL_LOCKS: "0",
    GIT_TERMINAL_PROMPT: "0",
    LC_ALL: "C",
  };
  try {
    const result = await execFileAsync("git", ["--no-replace-objects", ...args], {
      cwd: repositoryRoot,
      encoding: "utf8",
      maxBuffer: MAX_GIT_OUTPUT_BYTES,
      timeout: GIT_TIMEOUT_MS,
      killSignal: "SIGKILL",
      windowsHide: true,
      env: Object.fromEntries(Object.entries(environment).filter(([, entry]) => entry !== undefined)),
    });
    return result.stdout;
  } catch (error) {
    const code = error?.killed === true ? "E-TIMEOUT" : "E-GIT";
    fail(code, `git ${args[0] ?? "command"} failed`);
  }
}

function normalizeGitHubRepository(remote) {
  const value = remote.trim().replace(/\.git$/u, "");
  const scp = /^([^@]+)@([^:]+):([^/]+\/[^/]+)$/u.exec(value);
  if (scp !== null) {
    return scp[1] === "git" && scp[2].toLowerCase() === "github.com"
      ? scp[3]
      : undefined;
  }
  try {
    const url = new URL(value);
    if (!GITHUB_PROTOCOLS.has(url.protocol)
      || url.hostname.toLowerCase() !== "github.com"
      || url.port.length > 0
      || url.search.length > 0
      || url.hash.length > 0
      || (url.protocol === "https:" && (url.username.length > 0 || url.password.length > 0))
      || (url.protocol === "ssh:" && (url.username !== "git" || url.password.length > 0))) {
      return undefined;
    }
    return url.pathname.replace(/^\//u, "");
  } catch {
    return undefined;
  }
}

async function exactRegularBlob(repositoryRoot, commit, path, expectedBlob, product) {
  const output = await runGit(repositoryRoot, ["ls-tree", "-z", "--full-tree", commit, "--", `:(literal)${path}`]);
  const entries = output.split("\0").filter(Boolean);
  if (entries.length !== 1) fail("E-BLOB", `${product}:${path} must identify exactly one Git tree entry`);
  const match = /^(\d{6}) ([a-z]+) ([a-f0-9]{40})\t([^\0]+)$/u.exec(entries[0]);
  if (match === null || match[4] !== path) fail("E-BLOB", `${product}:${path} returned an invalid Git tree entry`);
  if (!REGULAR_FILE_MODES.has(match[1]) || match[2] !== "blob") {
    fail("E-MODE", `${product}:${path} must be a regular Git blob, observed ${match[1]} ${match[2]}`);
  }
  if (match[3] !== expectedBlob) fail("E-BLOB", `${product}:${path} blob is ${match[3]}, expected ${expectedBlob}`);
  const objectType = (await runGit(repositoryRoot, ["cat-file", "-t", match[3]])).trim();
  if (objectType !== "blob") {
    fail("E-MODE", `${product}:${path} must reference a blob object, observed ${objectType}`);
  }
  const sizeText = (await runGit(repositoryRoot, ["cat-file", "-s", match[3]])).trim();
  const bytes = Number(sizeText);
  if (!Number.isSafeInteger(bytes) || bytes < 0) fail("E-GIT", `${product}:${path} returned invalid blob size ${sizeText}`);
  if (bytes > MAX_BLOB_BYTES) fail("E-BOUNDS", `${product}:${path} exceeds the per-blob byte bound`);
  return bytes;
}

export async function verifyProductSourceRecord(product, recordValue, repositoryRoot) {
  const record = requireExactKeys(recordValue, ["repository", "commit", "tree", "files"], product);
  const repository = requireString(record.repository, `${product}.repository`);
  if (!REPOSITORY.test(repository)) fail("E-SCHEMA", `${product}.repository must be owner/name`);
  const commit = requireGitObject(record.commit, `${product}.commit`);
  const expectedTree = requireGitObject(record.tree, `${product}.tree`);
  if (!Array.isArray(record.files) || record.files.length === 0 || record.files.length > MAX_FILES_PER_PRODUCT) {
    fail("E-SCHEMA", `${product}.files must contain 1-${MAX_FILES_PER_PRODUCT} files`);
  }

  const topLevel = (await runGit(repositoryRoot, ["rev-parse", "--show-toplevel"])).trim();
  const remote = (await runGit(topLevel, ["remote", "get-url", "origin"])).trim();
  const observedRepository = normalizeGitHubRepository(remote);
  if (observedRepository?.toLowerCase() !== repository.toLowerCase()) {
    fail("E-REPOSITORY", `${product} origin does not identify expected GitHub repository ${repository}`);
  }
  const resolvedCommit = (await runGit(topLevel, ["rev-parse", "--verify", `${commit}^{commit}`])).trim();
  if (resolvedCommit !== commit) fail("E-COMMIT", `${product} resolved ${resolvedCommit}, expected ${commit}`);
  const observedTree = (await runGit(topLevel, ["show", "-s", "--format=%T", commit])).trim();
  if (observedTree !== expectedTree) fail("E-TREE", `${product} tree is ${observedTree}, expected ${expectedTree}`);

  const files = [];
  const portableKeys = new Set();
  let totalBlobBytes = 0;
  for (const [index, raw] of record.files.entries()) {
    const file = requireExactKeys(raw, ["path", "blob"], `${product}.files[${index}]`);
    const path = requireRepositoryPath(file.path, `${product}.files[${index}].path`);
    const portableKey = path.toLowerCase();
    if (portableKeys.has(portableKey)) fail("E-PATH", `${product} repeats a case-insensitively equivalent evidence path`);
    portableKeys.add(portableKey);
    const blob = requireGitObject(file.blob, `${product}.files[${index}].blob`);
    const bytes = await exactRegularBlob(topLevel, commit, path, blob, product);
    totalBlobBytes += bytes;
    if (totalBlobBytes > MAX_TOTAL_BLOB_BYTES) fail("E-BOUNDS", `${product} exceeds the aggregate blob byte bound`);
    files.push(Object.freeze({ path, blob, bytes }));
  }
  return Object.freeze({
    proofMode: PRODUCT_SOURCE_PROOF_MODE,
    limits: PRODUCT_SOURCE_PROOF_LIMITS,
    product,
    repository,
    repositoryRoot: topLevel,
    commit,
    tree: observedTree,
    files: Object.freeze(files),
    totalBlobBytes,
  });
}

export async function verifyProductSourceEvidence(evidenceValue, repositoryRoots) {
  const evidence = requireExactKeys(evidenceValue, ["schemaVersion", "proofMode", "capturedAt", "status", "claim", "verification", "products", "limitations"], "evidence");
  if (evidence.schemaVersion !== SCHEMA_VERSION) fail("E-SCHEMA", `evidence.schemaVersion must be ${SCHEMA_VERSION}`);
  if (evidence.proofMode !== PRODUCT_SOURCE_PROOF_MODE) fail("E-PROOF-MODE", `evidence.proofMode must be ${PRODUCT_SOURCE_PROOF_MODE}`);
  if (evidence.status !== "candidate-source-records") fail("E-STATUS", "source evidence must remain candidate-source-records");
  requireString(evidence.capturedAt, "evidence.capturedAt");
  const claim = requireExactKeys(evidence.claim, ["kind"], "evidence.claim");
  if (claim.kind !== PRODUCT_SOURCE_CLAIM_KIND) fail("E-CLAIM", `evidence.claim.kind must be ${PRODUCT_SOURCE_CLAIM_KIND}`);
  const verification = requireExactKeys(evidence.verification, ["authority", "promotionAuthority"], "evidence.verification");
  if (verification.authority !== PRODUCT_SOURCE_VERIFICATION_AUTHORITY) {
    fail("E-AUTHORITY", `evidence.verification.authority must be ${PRODUCT_SOURCE_VERIFICATION_AUTHORITY}`);
  }
  if (verification.promotionAuthority !== false) fail("E-STATUS", "source verification cannot be promotion authority");
  if (!Array.isArray(evidence.limitations)
    || evidence.limitations.length !== PRODUCT_SOURCE_PROOF_LIMITS.length
    || evidence.limitations.some((limit, index) => limit !== PRODUCT_SOURCE_PROOF_LIMITS[index])) {
    fail("E-LIMITATIONS", "evidence.limitations must exactly equal the canonical proof limitations");
  }
  const products = requireRecord(evidence.products, "evidence.products");
  const productNames = Object.keys(products).sort();
  if (productNames.length === 0 || productNames.length > MAX_PRODUCTS) {
    fail("E-SCHEMA", `evidence.products must contain 1-${MAX_PRODUCTS} products`);
  }
  const mappingNames = Object.keys(requireRecord(repositoryRoots, "repositoryRoots")).sort();
  if (mappingNames.length !== productNames.length || mappingNames.some((name, index) => name !== productNames[index])) {
    fail("E-REPOSITORY", "repository mappings must exactly match the canonical product keys");
  }
  const reports = [];
  const repositories = new Set();
  for (const product of productNames) {
    const repositoryRoot = requireString(repositoryRoots[product], `repositoryRoots.${product}`);
    const report = await verifyProductSourceRecord(product, products[product], repositoryRoot);
    const repositoryIdentity = report.repository.toLowerCase();
    if (repositories.has(repositoryIdentity)) fail("E-INDEPENDENCE", `multiple product keys cannot reuse repository ${report.repository}`);
    repositories.add(repositoryIdentity);
    reports.push(report);
  }
  return Object.freeze({
    schemaVersion: SCHEMA_VERSION,
    proofMode: PRODUCT_SOURCE_PROOF_MODE,
    claimKind: PRODUCT_SOURCE_CLAIM_KIND,
    limits: PRODUCT_SOURCE_PROOF_LIMITS,
    status: evidence.status,
    verificationAuthority: PRODUCT_SOURCE_VERIFICATION_AUTHORITY,
    promotionAuthority: false,
    reports: Object.freeze(reports),
  });
}
