import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { lstat, mkdir, mkdtemp, readFile, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { isDeepStrictEqual, promisify } from "node:util";

// Temporary collection adapter. Central trusted PR validation owns qualification.
const CONTROLLER_REVISION = "755c8515a5d106402a7e9e2cff621fb1fdc855cf";
const REGISTRY = "https://registry.npmjs.org/";
const PRODUCER = "agent-teams-ai/engineering-foundation";
const PRODUCER_ID = 1316243988;
const CONSUMER = "agent-teams-ai/extension-foundation";
const CONSUMER_ID = 1333298097;
const POLICY_SOURCE_PATH = "architecture/foundation/docs-protocol-current-policy-v3.json";
const QUALIFICATION_RUNTIME = {
  nodeVersion: "26.11.1", pnpmVersion: "11.20.0", platform: "linux", architecture: "x64",
} as const;
const BRANCH = "refs/heads/test/ef-cohort-publication-20261126";
const CONSUMER_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const OUTPUT_ROOT = join(CONSUMER_ROOT, ".qualification-output/cohort-candidate");
const REUSABLE_WORKFLOW = {
  repository: "agent-teams-ai/.github",
  repository_id: 1316243981,
  path: ".github/workflows/docs-protocol-check.yml",
  revision: CONTROLLER_REVISION,
  blob_sha: "4097e816cf8725035c49c94e27308a6c66a0119b",
} as const;

interface Coordinate {
  readonly name: string;
  readonly role: "direct" | "transitive";
  readonly version: string;
}

interface ObservedCoordinate extends Coordinate {
  readonly integrity: string;
  readonly registry: string;
  readonly published_at: string;
}

interface PublicationPin extends Coordinate {
  readonly sourceRevision: string;
  readonly sourceWorkflow: string;
  readonly runId: number;
  readonly runAttempt: number;
}

interface PublishedCoordinate extends ObservedCoordinate {
  readonly provenance: JsonObject;
}

const REQUIRED_COORDINATES: readonly Pick<Coordinate, "name" | "role">[] = [
  { name: "@agent-teams/repository-mutation", role: "transitive" },
  { name: "@agent-teams/document-authoring", role: "transitive" },
  { name: "@agent-teams/docs-protocol", role: "direct" },
  { name: "@agent-teams/docs-protocol-agent-teams", role: "direct" },
  { name: "@agent-teams/engineering-foundation", role: "direct" },
];
// Exact fresh publications verified against the successful publisher and signed origins.
// No guessed version, source commit, workflow run or attempt is a usable default.
const PUBLICATION_PINS: readonly PublicationPin[] = [
  { name: "@agent-teams/repository-mutation", role: "transitive", version: "0.5.2", sourceRevision: "da1868240b96113582b508b0c15341c477d6334b", sourceWorkflow: ".github/workflows/release.yml", runId: 45816094753, runAttempt: 1 },
  { name: "@agent-teams/document-authoring", role: "transitive", version: "0.3.9", sourceRevision: "da1868240b96113582b508b0c15341c477d6334b", sourceWorkflow: ".github/workflows/release.yml", runId: 45816094753, runAttempt: 1 },
  { name: "@agent-teams/docs-protocol", role: "direct", version: "0.6.9", sourceRevision: "da1868240b96113582b508b0c15341c477d6334b", sourceWorkflow: ".github/workflows/release.yml", runId: 45816094753, runAttempt: 1 },
  { name: "@agent-teams/docs-protocol-agent-teams", role: "direct", version: "0.7.1", sourceRevision: "da1868240b96113582b508b0c15341c477d6334b", sourceWorkflow: ".github/workflows/release.yml", runId: 45816094753, runAttempt: 1 },
  { name: "@agent-teams/engineering-foundation", role: "direct", version: "4.0.2", sourceRevision: "da1868240b96113582b508b0c15341c477d6334b", sourceWorkflow: ".github/workflows/release.yml", runId: 45816094753, runAttempt: 1 },
];

type JsonObject = Record<string, unknown>;
type LegacyFunction = (...args: readonly unknown[]) => unknown;
type Run = (program: string, args: readonly string[], cwd?: string) => Promise<Buffer>;

class CollectorError extends Error {}

function requireValue(condition: unknown, label: string): asserts condition {
  if (!condition) throw new CollectorError(label);
}

function object(value: unknown, label: string): JsonObject {
  requireValue(typeof value === "object" && value !== null && !Array.isArray(value), label);
  return value as JsonObject;
}

function text(value: unknown, label: string, maximum = 4096): string {
  requireValue(typeof value === "string" && value.length > 0 && value.length <= maximum, label);
  return value;
}

function parse(bytes: Buffer, label: string): unknown {
  try {
    const value: unknown = JSON.parse(bytes.toString("utf8"));
    return value;
  } catch {
    throw new CollectorError(label);
  }
}

function exportedFunction(module: unknown, name: string): LegacyFunction {
  const candidate = object(module, "Central module must expose exports.")[name];
  requireValue(typeof candidate === "function", `Central export ${name} is absent.`);
  return (...args) => Reflect.apply(candidate, undefined, args);
}

const sha256 = (bytes: string | Buffer): string =>
  `sha256:${createHash("sha256").update(bytes).digest("hex")}`;

function outputPath(path: string): string {
  const target = resolve(OUTPUT_ROOT, path);
  const within = relative(OUTPUT_ROOT, target);
  requireValue(within !== "" && !isAbsolute(within) && within !== ".." && !within.startsWith("../"),
    "Evidence path must stay inside its output directory.");
  return target;
}

async function save(path: string, bytes: string | Buffer): Promise<void> {
  const target = outputPath(path);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, bytes, { flag: "wx" });
}

const saveJson = (path: string, value: unknown): Promise<void> =>
  save(path, `${JSON.stringify(value, null, 2)}\n`);

function selectedPublications(): readonly PublicationPin[] {
  requireValue(PUBLICATION_PINS.length === REQUIRED_COORDINATES.length,
    "The five actual fresh publication pins have not been selected.");
  for (const [index, pin] of PUBLICATION_PINS.entries()) {
    const required = REQUIRED_COORDINATES[index]!;
    requireValue(pin.name === required.name && pin.role === required.role &&
      /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-(?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*)(?:\.(?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*))*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/u.test(pin.version) &&
      /^(?!0{40}$)[0-9a-f]{40}$/u.test(pin.sourceRevision) &&
      /^\.github\/workflows\/[A-Za-z0-9_-]+\.ya?ml$/u.test(pin.sourceWorkflow) &&
      Number.isSafeInteger(pin.runId) && pin.runId > 0 &&
      Number.isSafeInteger(pin.runAttempt) && pin.runAttempt > 0,
    "Publication pins must bind the exact ordered coordinates, source and run attempts.");
  }
  return PUBLICATION_PINS;
}

function array(value: unknown, label: string): readonly unknown[] {
  requireValue(Array.isArray(value), label);
  return value;
}

async function publicGitHubBytes(path: string, raw = false): Promise<Buffer> {
  const controller = new AbortController();
  const deadline = setTimeout(() => controller.abort(), 20_000);
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
  try {
    const response = await fetch("https://api.github.com/repos/" + path, {
      redirect: "error", credentials: "omit", signal: controller.signal,
      headers: {
        Accept: raw ? "application/vnd.github.raw+json" : "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "agent-teams-ef-cohort-collector",
      },
    });
    requireValue(response.status === 200 && response.body !== null,
      "Public GitHub evidence must return one successful body.");
    const declared = response.headers.get("content-length");
    requireValue(declared === null || (/^[0-9]+$/u.test(declared) && Number(declared) <= 1024 * 1024),
      "Public GitHub evidence exceeds its bound.");
    reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let length = 0;
    for (;;) {
      const chunk = await reader.read();
      if (chunk.done) break;
      length += chunk.value.length;
      requireValue(length <= 1024 * 1024, "Public GitHub evidence exceeds its bound.");
      chunks.push(chunk.value);
    }
    return Buffer.concat(chunks, length);
  } finally {
    clearTimeout(deadline);
    controller.abort();
    if (reader !== undefined) {
      void reader.cancel().catch(() => undefined);
      reader.releaseLock();
    }
  }
}

async function observeProvenance(packages: readonly ObservedCoordinate[],
  pins: readonly PublicationPin[], verified: readonly unknown[]): Promise<{
    readonly packages: readonly PublishedCoordinate[];
    readonly evidenceDigests: Readonly<Record<string, string>>;
  }> {
  const repositoryBytes = await publicGitHubBytes(CONSUMER);
  const repository = object(parse(repositoryBytes, "Consumer repository evidence must be JSON."),
    "Consumer repository evidence must be an object.");
  requireValue(repository["id"] === CONSUMER_ID && repository["full_name"] === CONSUMER &&
    repository["fork"] === false && repository["default_branch"] === "main",
  "Live consumer repository identity differs.");
  await save("provenance/consumer-repository.json", repositoryBytes);
  const evidenceDigests: Record<string, string> = { "provenance/consumer-repository.json": sha256(repositoryBytes) };
  const published: PublishedCoordinate[] = [];
  for (const [index, coordinate] of packages.entries()) {
    const pin = pins[index]!;
    const matches = verified.map((entry) => object(entry, "Verified signature entry must be an object."))
      .filter((entry) => entry["name"] === coordinate.name && entry["version"] === coordinate.version);
    requireValue(matches.length === 1, "One exact verified signature entry is required.");
    const entry = matches[0]!;
    const attestationUrl = REGISTRY + "-/npm/v1/attestations/" +
      coordinate.name.replace("/", "%2f") + "@" + coordinate.version;
    requireValue(entry["registry"] === REGISTRY &&
      object(entry["attestations"], "Verified attestation metadata is absent.")["url"] === attestationUrl,
    "Verified attestation URL differs from the selected coordinate.");
    const allBundles = array(entry["attestationBundles"], "Verified attestation bundles are absent.")
      .map((value) => object(value, "Verified attestation bundle must be an object."));
    const bundles = allBundles.filter((value) => value["predicateType"] === "https://slsa.dev/provenance/v1");
    requireValue(bundles.length === 1 &&
      allBundles.filter((value) => value["predicateType"] ===
        "https://github.com/npm/attestation/tree/main/specs/publish/v0.1").length === 1 &&
      object(object(entry["attestations"], "Verified attestation metadata is absent.")["provenance"],
        "Verified provenance metadata is absent.")["predicateType"] === "https://slsa.dev/provenance/v1",
    "One verified SLSA and publication bundle is required.");
    const bundle = object(bundles[0]!["bundle"], "Verified provenance bundle is absent.");
    const envelope = object(bundle["dsseEnvelope"], "Verified DSSE envelope is absent.");
    requireValue(envelope["payloadType"] === "application/vnd.in-toto+json", "Verified DSSE payload type differs.");
    const payload = text(envelope["payload"], "Verified provenance payload is absent.", 256 * 1024);
    const decoded = Buffer.from(payload, "base64");
    requireValue(decoded.toString("base64") === payload, "Verified provenance payload must be canonical base64.");
    const statement = object(parse(decoded, "Verified provenance statement must be JSON."),
      "Verified provenance statement must be an object.");
    requireValue(statement["_type"] === "https://in-toto.io/Statement/v1" &&
      statement["predicateType"] === "https://slsa.dev/provenance/v1", "Verified statement identity differs.");
    const subjects = array(statement["subject"], "Verified provenance subjects are absent.")
      .map((value) => object(value, "Verified provenance subject must be an object."));
    requireValue(subjects.length === 1 &&
      subjects[0]!["name"] === "pkg:npm/%40" + coordinate.name.slice(1) + "@" + coordinate.version &&
      isDeepStrictEqual(subjects[0]!["digest"], {
        sha512: Buffer.from(coordinate.integrity.slice("sha512-".length), "base64").toString("hex"),
      }), "Verified provenance subject does not bind the exact package and sole SHA512 digest.");
    const predicate = object(statement["predicate"], "Verified provenance predicate is absent.");
    const build = object(predicate["buildDefinition"], "Verified build definition is absent.");
    const workflow = object(object(build["externalParameters"], "Verified build parameters are absent.")["workflow"],
      "Verified source workflow is absent.");
    const revisions = array(build["resolvedDependencies"], "Verified source dependencies are absent.")
      .map((value) => object(value, "Verified source dependency must be an object."));
    const metadata = object(object(predicate["runDetails"], "Verified run details are absent.")["metadata"],
      "Verified run metadata is absent.");
    const runUrl = "https://github.com/" + PRODUCER + "/actions/runs/" + pin.runId;
    requireValue(workflow["repository"] === "https://github.com/" + PRODUCER &&
      workflow["path"] === pin.sourceWorkflow && workflow["ref"] === "refs/heads/main" && revisions.length === 1 &&
      revisions[0]!["uri"] === "git+https://github.com/" + PRODUCER + "@refs/heads/main" &&
      isDeepStrictEqual(revisions[0]!["digest"], { gitCommit: pin.sourceRevision }) &&
      metadata["invocationId"] === runUrl + "/attempts/" + pin.runAttempt,
    "Verified publication source or invocation differs from the selected immutable pins.");
    const runBytes = await publicGitHubBytes(PRODUCER + "/actions/runs/" + pin.runId + "/attempts/" + pin.runAttempt);
    const run = object(parse(runBytes, "Release attempt evidence must be JSON."), "Release attempt must be an object.");
    const runRepository = object(run["repository"], "Release repository identity is absent.");
    requireValue(run["id"] === pin.runId && run["run_attempt"] === pin.runAttempt &&
      run["head_sha"] === pin.sourceRevision && run["head_branch"] === "main" && run["event"] === "push" &&
      run["status"] === "completed" && run["conclusion"] === "success" &&
      run["path"] === pin.sourceWorkflow && run["html_url"] === runUrl &&
      runRepository["id"] === PRODUCER_ID && runRepository["full_name"] === PRODUCER,
    "The attested release attempt must bind exact source, workflow and success.");
    const runPath = "provenance/" + coordinate.name.slice("@agent-teams/".length) + "-run.json";
    await save(runPath, runBytes);
    evidenceDigests[runPath] = sha256(runBytes);
    published.push({ ...coordinate, provenance: {
      source_repository: PRODUCER, source_repository_id: PRODUCER_ID,
      source_workflow: pin.sourceWorkflow, source_commit: pin.sourceRevision,
      workflow_run_id: pin.runId, workflow_run_attempt: pin.runAttempt,
      registry_attestation_url: attestationUrl, workflow_run_url: runUrl, signature_verified: true,
    } });
  }
  await saveJson("publication-packages.json", published);
  return { packages: published, evidenceDigests };
}

async function observePackedRuntimePolicy(files: ReadonlyMap<string, Buffer>, adapter: PublicationPin) {
  const bytes = files.get("assets/runtime-policy.v1.json");
  const schemaBytes = files.get("schemas/managed-runtime-policy/v1.schema.json");
  requireValue(bytes !== undefined && schemaBytes !== undefined, "Packed runtime policy evidence is absent.");
  const policy = object(parse(bytes, "Packed runtime policy must be JSON."), "Packed runtime policy must be an object.");
  const schema = object(parse(schemaBytes, "Packed runtime policy schema must be JSON."),
    "Packed runtime policy schema must be an object.");
  const managed = object(policy["managedRuntime"], "Packed managed runtime is absent.");
  const lanes = object(managed["lanes"], "Packed managed lanes are absent.");
  const lane = object(lanes["node-26-managed-qualified"], "Packed current lane is absent.");
  const compatibility = object(lanes["node-24-production-default"], "Packed retained lane is absent.");
  requireValue(policy["schemaVersion"] === 1 && policy["policyId"] === "agent-teams.docs-protocol-current-policy" &&
    policy["policyVersion"] === "3.0.0" && isDeepStrictEqual(schema["const"], policy) &&
    managed["pnpm"] === ">=11.17.0 <12" && lane["node"] === ">=26.0.0 <27" &&
    lane["default"] === true && compatibility["default"] === false &&
    isDeepStrictEqual(lane["qualificationRuntime"], QUALIFICATION_RUNTIME) &&
    isDeepStrictEqual(policy["managedCandidate"], {
      selected: false, cohortSchema: 3, consumerIntegrationProfile: 4, managedState: 3,
      qualificationReceipt: 1, runtimeLane: "node-26-managed-qualified", status: "candidate-unqualified",
    }), "Packed runtime policy differs from the unselected current Gen3 identity.");
  const source = await publicGitHubBytes(PRODUCER + "/contents/" + POLICY_SOURCE_PATH + "?ref=" + adapter.sourceRevision, true);
  requireValue(policy["sourceDigest"] === sha256(source),
    "Packed runtime policy digest differs from its actual immutable generator source.");
  await save("provenance/adapter-policy-source.json", source);
  return {
    identity: { id: "agent-teams.docs-protocol-current-policy", version: "3.0.0", digest: sha256(source) },
    source: { repository: PRODUCER, revision: adapter.sourceRevision, path: POLICY_SOURCE_PATH, digest: sha256(source) },
    runtime: { selected_lane: "node-26-managed-qualified", node: ">=26.0.0 <27", pnpm: ">=11.17.0 <12",
      qualification_runtime: { node_version: QUALIFICATION_RUNTIME.nodeVersion, pnpm_version: QUALIFICATION_RUNTIME.pnpmVersion,
        platform: QUALIFICATION_RUNTIME.platform, architecture: QUALIFICATION_RUNTIME.architecture } },
  };
}

async function observePackages(run: Run, coordinates: readonly Coordinate[]): Promise<ObservedCoordinate[]> {
  const packages: ObservedCoordinate[] = [];
  for (const { name, role, version } of coordinates) {
    const coordinate = { name, role, version };
    const specifier = `${coordinate.name}@${coordinate.version}`;
    const metadata = object(parse(await run("npm", ["view", specifier, `--registry=${REGISTRY}`, "--json"]),
      "Registry metadata must be JSON."), "Registry metadata must be an object.");
    requireValue(metadata["name"] === coordinate.name && metadata["version"] === coordinate.version,
      "Registry metadata does not identify the selected coordinate.");
    const dist = object(metadata["dist"], "Registry distribution metadata is absent.");
    const integrity = text(dist["integrity"], "Registry integrity is absent.");
    requireValue(object(dist["attestations"], "Registry attestation metadata is absent.")["url"] ===
      REGISTRY + "-/npm/v1/attestations/" + coordinate.name.replace("/", "%2f") + "@" + coordinate.version,
    "Registry attestation URL differs from the selected coordinate.");
    requireValue(/^sha512-[A-Za-z0-9+/]{86}==$/u.test(integrity), "Registry SRI must be SHA-512.");
    const times = object(parse(await run("npm", ["view", coordinate.name, "time", `--registry=${REGISTRY}`, "--json"]),
      "Registry publication times must be JSON."), "Registry times must be an object.");
    const publishedAt = text(times[coordinate.version], "Exact publication time is absent.");
    requireValue(Number.isFinite(Date.parse(publishedAt)), "Registry publication time is invalid.");
    const stem = coordinate.name.slice("@agent-teams/".length);
    await saveJson(`registry/${stem}.json`, { coordinate, metadata, times });
    packages.push({ ...coordinate, integrity, registry: REGISTRY, published_at: publishedAt });
  }
  await saveJson("packages.json", packages);
  return packages;
}

async function captureAssets(packages: readonly ObservedCoordinate[], run: Run,
  workRoot: string, renderCaller: LegacyFunction, pin: PublicationPin) {
  const adapter = packages.find(({ name }) => name === "@agent-teams/docs-protocol-agent-teams");
  requireValue(adapter !== undefined, "Managed adapter coordinate is absent.");
  const packed: unknown = parse(await run("npm", ["pack", `${adapter.name}@${adapter.version}`,
    "--ignore-scripts", `--registry=${REGISTRY}`, "--json"]), "npm pack output must be JSON.");
  requireValue(Array.isArray(packed) && packed.length === 1, "npm pack must return one archive.");
  const item = object(packed[0], "npm pack archive metadata is absent.");
  const filename = text(item["filename"], "npm pack archive filename is absent.", 200);
  requireValue(/^[A-Za-z0-9][A-Za-z0-9._-]*\.tgz$/u.test(filename), "npm pack filename must be local.");
  requireValue(item["integrity"] === adapter.integrity, "Packed adapter integrity differs from registry SRI.");
  const archive = join(workRoot, filename);
  const stat = await lstat(archive);
  requireValue(stat.isFile() && !stat.isSymbolicLink() && stat.size > 0 && stat.size <= 32 * 1024 * 1024,
    "Packed adapter must be one bounded regular file.");
  const archiveIntegrity = `sha512-${createHash("sha512").update(await readFile(archive)).digest("base64")}`;
  requireValue(archiveIntegrity === adapter.integrity,
    "Packed adapter bytes differ from registry SRI.");
  await saveJson("adapter-pack.json", packed);
  const paths = ["package.json", "skills/docs/SKILL.md", "assets/docs-protocol.yml",
    "assets/catalog.json", "assets/transition-catalog.json", "assets/runtime-policy.v1.json",
    "schemas/managed-runtime-policy/v1.schema.json"] as const;
  const assets: Record<string, unknown> = {};
  const files = new Map<string, Buffer>();
  for (const path of paths) {
    // Read only named members to stdout; never extract archive paths to the filesystem.
    const bytes = await run("tar", ["-xOf", archive, `package/${path}`]);
    requireValue(bytes.length > 0 && bytes.length <= 4 * 1024 * 1024, "Published asset is empty or too large.");
    await save(`published-assets/${path}`, bytes);
    files.set(path, bytes);
    assets[path] = { package: adapter.name, path, bytes: bytes.length, digest: sha256(bytes) };
    if (path === "assets/docs-protocol.yml") {
      const rendered: unknown = renderCaller(bytes, REUSABLE_WORKFLOW);
      requireValue(Buffer.isBuffer(rendered), "Central renderer must return caller bytes.");
      await save("published-assets/rendered-docs-protocol.yml", rendered);
      assets["renderedCallerWorkflow"] = { ...REUSABLE_WORKFLOW, digest: sha256(rendered) };
    }
  }
  await saveJson("asset-digests.json", assets);
  return { digests: assets, policy: await observePackedRuntimePolicy(files, pin) };
}

let stage = "initialize";

async function collect(): Promise<void> {
  requireValue(process.env["GITHUB_ACTIONS"] === "true" && process.env["GITHUB_EVENT_NAME"] === "push" &&
    process.env["GITHUB_REPOSITORY"] === CONSUMER && process.env["GITHUB_REPOSITORY_ID"] === String(CONSUMER_ID) &&
    process.env["GITHUB_REF"] === BRANCH, "Collector requires its exact branch-only hosted invocation.");
  requireValue(process.versions.node === QUALIFICATION_RUNTIME.nodeVersion && process.platform === "linux" && process.arch === "x64",
    "Collector requires actual Node 26.11.1 on Linux x64.");
  const sourceRevision = text(process.env["GITHUB_SHA"], "Hosted source revision is absent.");
  requireValue(/^[0-9a-f]{40}$/u.test(sourceRevision), "Hosted source revision is invalid.");
  const runId = text(process.env["GITHUB_RUN_ID"], "Hosted run ID is absent.");
  const runAttempt = text(process.env["GITHUB_RUN_ATTEMPT"], "Hosted run attempt is absent.");
  requireValue(/^[1-9][0-9]*$/u.test(runId) && /^[1-9][0-9]*$/u.test(runAttempt),
    "Hosted execution identity is invalid.");
  stage = "publication-inputs";
  const pins = selectedPublications();
  await mkdir(OUTPUT_ROOT, { recursive: true });
  const workRoot = await mkdtemp(join(tmpdir(), "ef-docs-cohort-"));
  const previousDirectory = process.cwd();
  try {
    const userConfig = join(workRoot, "user.npmrc");
    const globalConfig = join(workRoot, "global.npmrc");
    await writeFile(userConfig, "", { flag: "wx" });
    await writeFile(globalConfig, "", { flag: "wx" });
    const environment: NodeJS.ProcessEnv = {
      ...Object.fromEntries(Object.entries(process.env).filter(([name]) => !name.toLowerCase().startsWith("npm_config_"))),
      NPM_CONFIG_USERCONFIG: userConfig,
      NPM_CONFIG_GLOBALCONFIG: globalConfig,
    };
    const execute = promisify(execFile);
    const run: Run = async (program, args, cwd = workRoot) => {
      const result = await execute(program, [...args], {
        cwd, env: environment, encoding: "buffer", timeout: 60_000, maxBuffer: 16 * 1024 * 1024,
      });
      return result.stdout;
    };
    const controllerRoot = await realpath(join(CONSUMER_ROOT, ".cohort-controller"));
    requireValue((await run("git", ["rev-parse", "HEAD"], CONSUMER_ROOT)).toString("utf8").trim() === sourceRevision,
      "Consumer checkout differs from the hosted source revision.");
    requireValue((await run("git", ["rev-parse", "HEAD"], controllerRoot)).toString("utf8").trim() === CONTROLLER_REVISION,
      "Controller checkout differs from its reviewed revision.");
    const pnpmBinary = text(process.env["DOCS_COHORT_PNPM_V2_BIN"], "Qualified pnpm binary is absent.");
    requireValue(isAbsolute(pnpmBinary), "Qualified pnpm binary must be absolute.");
    const pnpmVersion = (await run(pnpmBinary, ["--version"])).toString("utf8").trim();
    requireValue(pnpmVersion === "11.20.0", "Closure resolver requires pnpm 11.20.0.");
    await saveJson("invocation.json", {
      evidenceClass: "preparatory-published-cohort-candidate", qualified: false,
      repository: CONSUMER, repositoryId: CONSUMER_ID, sourceRevision, branch: BRANCH,
      cohortGeneration: 3, publicationPins: pins,
      controllerRevision: CONTROLLER_REVISION, reusableWorkflow: REUSABLE_WORKFLOW,
      runId, runAttempt, runUrl: `https://github.com/agent-teams-ai/extension-foundation/actions/runs/${runId}/attempts/${runAttempt}`,
      startedAt: new Date().toISOString(), node: process.versions.node, pnpm: pnpmVersion,
      npm: (await run("npm", ["--version"])).toString("utf8").trim(),
      platform: process.platform, architecture: process.arch,
      collectorDigest: sha256(await readFile(fileURLToPath(import.meta.url))),
      workflowDigest: sha256(await readFile(join(CONSUMER_ROOT, ".github/workflows/prepare-ef-docs-cohort.yml"))),
    });
    stage = "load-reviewed-central-functions";
    // Central imports read repository-owned files relative to cwd.
    process.chdir(controllerRoot);
    const module: unknown = await import(pathToFileURL(join(controllerRoot, "scripts/verify-docs-cohort-evidence.mjs")).href);
    const verifySignatures = exportedFunction(module, "verifyInstalledPackageSignatures");
    const resolveClosure = exportedFunction(module, "resolvePublishedRuntimeClosure");
    const renderCaller = exportedFunction(module, "renderCallerWorkflowTemplate");
    stage = "registry-metadata";
    const packages = await observePackages(run, pins);
    stage = "cryptographic-signatures";
    const verified: unknown = await verifySignatures(packages);
    requireValue(Array.isArray(verified), "Central signature verifier must return verified entries.");
    await saveJson("verified-signatures.json", verified);
    stage = "publication-provenance";
    const publications = await observeProvenance(packages, pins, verified);
    stage = "published-runtime-closure";
    const closure = object(await resolveClosure(packages, { cohortGeneration: 3, pnpmBinary }),
      "Central closure resolver must return evidence.");
    const source = text(closure["source"], "Canonical closure source is absent.", 2 * 1024 * 1024);
    const authority = object(closure["authority"], "Canonical closure authority is absent.");
    const evidence = object(closure["evidence"], "Canonical closure evidence is absent.");
    object(evidence["pnpmLock"], "Canonical closure lock is absent.");
    const projectionPath = text(authority["projection_path"], "Closure projection path is absent.", 200);
    requireValue(/^governance\/docs-runtime-closures\/sha256-[0-9a-f]{64}\.json$/u.test(projectionPath),
      "Closure projection path must be bounded and content-addressed.");
    requireValue(authority["digest"] === sha256(source) &&
      projectionPath === `governance/docs-runtime-closures/${sha256(source).replace(":", "-")}.json`,
    "Canonical closure source does not match its authority.");
    await save(projectionPath, source);
    await saveJson("runtime-closure-authority.json", authority);
    await saveJson("runtime-closure-evidence.json", evidence);
    stage = "published-adapter-assets";
    const assets = await captureAssets(packages, run, workRoot, renderCaller, pins[3]!);
    const packet = {
      evidenceClass: "preparatory-published-cohort-candidate", qualified: false, cohortGeneration: 3,
      publicationPins: pins, packages: publications.packages, providerEvidenceDigests: publications.evidenceDigests,
      controllerRevision: CONTROLLER_REVISION,
      reusableWorkflow: REUSABLE_WORKFLOW, policyIdentity: assets.policy.identity,
      policySource: assets.policy.source, runtime: assets.policy.runtime,
      runtimeClosure: authority, assetDigests: assets.digests,
      verifiedSignaturesDigest: sha256(await readFile(outputPath("verified-signatures.json"))),
      canaryRepositories: [{ repository_id: CONSUMER_ID, repository: CONSUMER }],
    };
    const packetBytes = JSON.stringify(packet, null, 2) + "\n";
    await save("candidate-input.json", packetBytes);
    await saveJson("candidate-input-digest.json", { candidateInputDigest: sha256(packetBytes), qualified: false });
    stage = "complete";
    await saveJson("result.json", { outcome: "collected", stage, qualified: false, completedAt: new Date().toISOString() });
    console.log("Published candidate evidence collected; central trusted qualification remains required.");
  } finally {
    process.chdir(previousDirectory);
    await rm(workRoot, { recursive: true, force: true });
  }
}

try {
  await collect();
} catch (error: unknown) {
  // Preserve the failed stage without serializing subprocess output, environment or causes.
  const reason = error instanceof CollectorError ? error.message : "The owning tool or IO operation failed.";
  await saveJson("failure.json", { outcome: "failed", stage, qualified: false, reason }).catch(() => undefined);
  console.error(`Candidate collection failed during ${stage}: ${reason}`);
  process.exitCode = 1;
}
