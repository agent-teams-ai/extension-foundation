import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { lstat, mkdir, mkdtemp, readFile, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { promisify } from "node:util";

// Temporary collection adapter. Central trusted PR validation owns qualification.
const CONTROLLER_REVISION = "6a33853123378ef8ea69868da8ecb550cd53c906";
const REGISTRY = "https://registry.npmjs.org/";
const BRANCH = "refs/heads/test/e1-provider-evidence-20261125";
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

const COORDINATES: readonly Coordinate[] = [
  { name: "@agent-teams/repository-mutation", role: "transitive", version: "0.4.2" },
  { name: "@agent-teams/document-authoring", role: "transitive", version: "0.3.6" },
  { name: "@agent-teams/docs-protocol", role: "direct", version: "0.6.6" },
  { name: "@agent-teams/docs-protocol-agent-teams", role: "direct", version: "0.6.1" },
  { name: "@agent-teams/engineering-foundation", role: "direct", version: "3.1.0" },
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

async function observePackages(run: Run): Promise<ObservedCoordinate[]> {
  const packages: ObservedCoordinate[] = [];
  for (const coordinate of COORDINATES) {
    const specifier = `${coordinate.name}@${coordinate.version}`;
    const metadata = object(parse(await run("npm", ["view", specifier, `--registry=${REGISTRY}`, "--json"]),
      "Registry metadata must be JSON."), "Registry metadata must be an object.");
    requireValue(metadata["name"] === coordinate.name && metadata["version"] === coordinate.version,
      "Registry metadata does not identify the selected coordinate.");
    const dist = object(metadata["dist"], "Registry distribution metadata is absent.");
    const integrity = text(dist["integrity"], "Registry integrity is absent.");
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
  workRoot: string, renderCaller: LegacyFunction): Promise<void> {
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
    "assets/catalog.json", "assets/transition-catalog.json"] as const;
  const assets: Record<string, unknown> = {};
  for (const path of paths) {
    // Read only named members to stdout; never extract archive paths to the filesystem.
    const bytes = await run("tar", ["-xOf", archive, `package/${path}`]);
    requireValue(bytes.length > 0 && bytes.length <= 4 * 1024 * 1024, "Published asset is empty or too large.");
    await save(`published-assets/${path}`, bytes);
    assets[path] = { package: adapter.name, path, bytes: bytes.length, digest: sha256(bytes) };
    if (path === "assets/docs-protocol.yml") {
      const rendered: unknown = renderCaller(bytes, REUSABLE_WORKFLOW);
      requireValue(Buffer.isBuffer(rendered), "Central renderer must return caller bytes.");
      await save("published-assets/rendered-docs-protocol.yml", rendered);
      assets["renderedCallerWorkflow"] = { ...REUSABLE_WORKFLOW, digest: sha256(rendered) };
    }
  }
  await saveJson("asset-digests.json", assets);
}

let stage = "initialize";

async function collect(): Promise<void> {
  requireValue(process.env["GITHUB_ACTIONS"] === "true" && process.env["GITHUB_EVENT_NAME"] === "push" &&
    process.env["GITHUB_REPOSITORY"] === "agent-teams-ai/extension-foundation" &&
    process.env["GITHUB_REF"] === BRANCH, "Collector requires its exact branch-only hosted invocation.");
  requireValue(process.versions.node === "24.21.0", "Collector requires qualified Node 24.21.0.");
  const sourceRevision = text(process.env["GITHUB_SHA"], "Hosted source revision is absent.");
  requireValue(/^[0-9a-f]{40}$/u.test(sourceRevision), "Hosted source revision is invalid.");
  const runId = text(process.env["GITHUB_RUN_ID"], "Hosted run ID is absent.");
  const runAttempt = text(process.env["GITHUB_RUN_ATTEMPT"], "Hosted run attempt is absent.");
  requireValue(/^[1-9][0-9]*$/u.test(runId) && /^[1-9][0-9]*$/u.test(runAttempt),
    "Hosted execution identity is invalid.");
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
      repository: "agent-teams-ai/extension-foundation", sourceRevision, branch: BRANCH,
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
    const packages = await observePackages(run);
    stage = "cryptographic-signatures";
    const verified: unknown = await verifySignatures(packages);
    requireValue(Array.isArray(verified), "Central signature verifier must return verified entries.");
    await saveJson("verified-signatures.json", verified);
    stage = "published-runtime-closure";
    const closure = object(await resolveClosure(packages, { cohortGeneration: 2, pnpmBinary }),
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
    await captureAssets(packages, run, workRoot, renderCaller);
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
