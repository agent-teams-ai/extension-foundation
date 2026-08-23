import { lstat, mkdir, open, readFile, realpath, rm } from "node:fs/promises";
import { dirname, isAbsolute, join, posix, relative, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  applyFilesystemScaffold,
  planScaffoldFromFile,
  recoverFilesystemScaffold,
} from "@agent-teams/engineering-foundation/scaffolding";

const CATALOG_PATH = "architecture/package-catalog.json";
const PLAN_DIRECTORY = "architecture/scaffolding-plans";
const PLAN_PATH = /^architecture\/scaffolding-plans\/[a-z0-9][a-z0-9-]*\.json$/;
const PACKAGE_PATH = /^packages\/[a-z0-9][a-z0-9-]*(?:\/[a-z0-9][a-z0-9-]*)*$/;
const ALLOWED_ROLES = new Set([
  "foundation-component",
  "integration-adapter",
  "testing-support",
]);
const MAX_PLAN_BYTES = 4 * 1024 * 1024;

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function contained(root, candidate) {
  const relation = relative(root, candidate);
  return relation === "" || (!isAbsolute(relation) && relation !== ".." && !relation.startsWith(`..${sep}`));
}

function safePlanPath(root, path) {
  if (!PLAN_PATH.test(path) || posix.normalize(path) !== path || path.includes("\\")) {
    throw new Error(`plan path must match ${PLAN_DIRECTORY}/<name>.json`);
  }
  const candidate = resolve(root, path);
  if (!contained(root, candidate)) throw new Error("plan path escapes the repository");
  return candidate;
}

async function assertRegularDirectory(path, label) {
  const metadata = await lstat(path);
  if (metadata.isSymbolicLink() || !metadata.isDirectory()) {
    throw new Error(`${label} must be a real directory, not a symbolic link`);
  }
}

async function ensurePlanDirectory(root) {
  const architecture = join(root, "architecture");
  await assertRegularDirectory(architecture, "architecture");
  const directory = join(root, PLAN_DIRECTORY);
  await mkdir(directory).catch(error => {
    if (error?.code !== "EEXIST") throw error;
  });
  await assertRegularDirectory(directory, PLAN_DIRECTORY);
  const [canonicalRoot, canonicalDirectory] = await Promise.all([realpath(root), realpath(directory)]);
  if (!contained(canonicalRoot, canonicalDirectory)) {
    throw new Error("scaffolding plan directory escapes the repository");
  }
}

async function readBoundedJson(root, path) {
  await ensurePlanDirectory(root);
  const metadataBeforeOpen = await lstat(path);
  if (metadataBeforeOpen.isSymbolicLink() || !metadataBeforeOpen.isFile()) {
    throw new Error("scaffold plan must be a real regular file, not a symbolic link");
  }
  const [canonicalRoot, canonicalPath] = await Promise.all([realpath(root), realpath(path)]);
  if (!contained(canonicalRoot, canonicalPath)) throw new Error("scaffold plan escapes the repository");
  const handle = await open(path, "r");
  try {
    const metadata = await handle.stat();
    if (!metadata.isFile() || metadata.size > MAX_PLAN_BYTES) {
      throw new Error("JSON input must be one bounded regular file");
    }
    return JSON.parse(await handle.readFile("utf8"));
  } finally {
    await handle.close();
  }
}

async function validatePlanAgainstCatalog(root, plan) {
  if (!isRecord(plan) || !isRecord(plan.target) || !Array.isArray(plan.operations)) {
    throw new Error("scaffold plan has an invalid shape");
  }
  const catalog = JSON.parse(await readFile(join(root, CATALOG_PATH), "utf8"));
  if (!isRecord(catalog) || !Array.isArray(catalog.packages)) {
    throw new Error("package catalog is invalid");
  }
  const matches = catalog.packages.filter(entry => entry?.id === plan.target.id);
  if (matches.length !== 1) throw new Error("scaffold target must resolve to exactly one catalog entry");
  const entry = matches[0];
  if (!isRecord(entry)
    || !PACKAGE_PATH.test(entry.path)
    || !ALLOWED_ROLES.has(entry.role)
    || plan.target.path !== entry.path
    || plan.target.packageName !== entry.package_name
    || plan.target.role !== entry.role
    || plan.target.ownerDocument?.id !== entry.owner_document) {
    throw new Error("scaffold target differs from the repository-owned package policy");
  }
  if (plan.operations.length === 0) throw new Error("scaffold plan must contain materialization operations");
  const operationPaths = new Set();
  for (const operation of plan.operations) {
    if (!isRecord(operation)
      || typeof operation.path !== "string"
      || posix.normalize(operation.path) !== operation.path
      || !operation.path.startsWith(`${entry.path}/`)) {
      throw new Error("every scaffold operation must stay inside the cataloged package root");
    }
    if (operationPaths.has(operation.path)) throw new Error(`duplicate scaffold operation: ${operation.path}`);
    operationPaths.add(operation.path);
  }
  return plan;
}

export async function publishScaffoldPlan({ root, intentPath, planPath }) {
  const destination = safePlanPath(root, planPath);
  await ensurePlanDirectory(root);
  const plan = await validatePlanAgainstCatalog(root, await planScaffoldFromFile({
    consumerRoot: root,
    intentPath,
  }));
  const handle = await open(destination, "wx", 0o644);
  let complete = false;
  try {
    await handle.writeFile(`${JSON.stringify(plan, null, 2)}\n`, "utf8");
    await handle.sync();
    complete = true;
  } finally {
    await handle.close();
    if (!complete) await rm(destination, { force: true });
  }
  return plan;
}

export async function applyScaffoldPlan({ root, planPath }) {
  const plan = await validatePlanAgainstCatalog(root, await readBoundedJson(root, safePlanPath(root, planPath)));
  return applyFilesystemScaffold(root, plan);
}

async function runCli() {
  const root = fileURLToPath(new URL("../..", import.meta.url));
  const [command, first, second, ...rest] = process.argv.slice(2);
  if (rest.length > 0) throw new Error("unexpected scaffold arguments");
  if (command === "plan" && first !== undefined && second !== undefined) {
    const plan = await publishScaffoldPlan({ root, intentPath: first, planPath: second });
    console.log(JSON.stringify({ outcome: "planned", planPath: second, intentDigest: plan.intentDigest }));
    return;
  }
  if (command === "apply" && first !== undefined && second === undefined) {
    console.log(JSON.stringify(await applyScaffoldPlan({ root, planPath: first })));
    return;
  }
  if (command === "recover" && first === undefined && second === undefined) {
    const recovery = await recoverFilesystemScaffold(root);
    console.log(JSON.stringify(recovery ?? { outcome: "no-pending-transaction" }));
    return;
  }
  throw new Error("usage: scaffold.mjs plan <intent> <plan> | apply <plan> | recover");
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    await runCli();
  } catch (error) {
    console.error(`SCAFFOLD_POLICY_REJECTED: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 2;
  }
}
