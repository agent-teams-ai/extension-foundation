import { constants } from "node:fs";
import { link, lstat, mkdir, open, readdir, realpath, rm } from "node:fs/promises";
import { basename, dirname, isAbsolute, join, posix, relative, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  applyFilesystemScaffold,
  assertScaffoldPlanDigest,
  planScaffoldFromFile,
  recoverFilesystemScaffold,
} from "@agent-teams/engineering-foundation/scaffolding";

import {
  createDocsOwnerResolver,
  isRecord,
  materializationPlanPath,
  packageOwnerFeatures,
  requireValidPackagePolicy,
} from "./package-policy.mjs";

const PLAN_DIRECTORY = "architecture/scaffolding-plans";
const PLAN_PATH = /^architecture\/scaffolding-plans\/[a-z0-9][a-z0-9-]*\.json$/;
const MAX_PLAN_BYTES = 4 * 1024 * 1024;
const SUCCESS_RECEIPT_OUTCOMES = new Set(["already-applied", "applied"]);
let publicationSequence = 0;

function publicationNonce() {
  publicationSequence += 1;
  return `${process.pid}-${process.hrtime.bigint()}-${publicationSequence}`;
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

async function syncDirectory(path) {
  let handle;
  try {
    handle = await open(path, constants.O_RDONLY);
    await handle.sync();
  } catch (error) {
    if (process.platform !== "win32"
      || !["EACCES", "EINVAL", "EISDIR", "EPERM"].includes(error?.code)) throw error;
  } finally {
    await handle?.close().catch(() => undefined);
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
  const flags = constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0);
  const handle = await open(path, flags);
  try {
    const metadata = await handle.stat();
    if (!metadata.isFile()
      || metadata.size > MAX_PLAN_BYTES
      || metadata.dev !== metadataBeforeOpen.dev
      || metadata.ino !== metadataBeforeOpen.ino) {
      throw new Error("JSON input must remain one bounded regular file");
    }
    return JSON.parse(await handle.readFile("utf8"));
  } finally {
    await handle.close();
  }
}

function publicationTemporaryPrefix(destination, planDigest) {
  return `.${basename(destination)}.publication-${planDigest.replace(/^sha256:/u, "")}.`;
}

async function cleanupPublicationTemporaries(destination, planDigest) {
  const directory = dirname(destination);
  const prefix = publicationTemporaryPrefix(destination, planDigest);
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (!entry.name.startsWith(prefix) || !entry.name.endsWith(".tmp")) continue;
    const path = join(directory, entry.name);
    let metadata;
    try {
      metadata = await lstat(path);
    } catch (error) {
      if (error?.code === "ENOENT") continue;
      throw error;
    }
    if (metadata.isSymbolicLink() || !metadata.isFile()) {
      throw new Error("scaffold plan publication temporary must remain one regular file");
    }
    await rm(path).catch(error => {
      if (error?.code !== "ENOENT") throw error;
    });
  }
}

async function matchingExistingPlan(root, destination, plan, resolveOwner) {
  let existing;
  try {
    existing = await readBoundedJson(root, destination);
  } catch (error) {
    if (error?.code === "ENOENT") return undefined;
    throw error;
  }
  assertScaffoldPlanDigest(existing);
  if (existing.planDigest !== plan.planDigest) {
    throw new Error("scaffold plan destination already contains different reviewed evidence");
  }
  await validatePlanAgainstCatalog(root, existing, resolveOwner);
  return existing;
}

export function assertScaffoldOperationPaths(root, packagePath, operations) {
  const packageRoot = resolve(root, packagePath);
  const operationPaths = new Set();
  for (const operation of operations) {
    if (!isRecord(operation)
      || typeof operation.path !== "string"
      || operation.path.includes("\\")
      || posix.normalize(operation.path) !== operation.path
      || !operation.path.startsWith(`${packagePath}/`)
      || !contained(packageRoot, resolve(root, operation.path))) {
      throw new Error("every scaffold operation must stay inside the cataloged package root");
    }
    if (operationPaths.has(operation.path)) throw new Error(`duplicate scaffold operation: ${operation.path}`);
    operationPaths.add(operation.path);
  }
}

export async function validatePlanAgainstCatalog(root, plan, resolveOwner) {
  if (!isRecord(plan) || !isRecord(plan.target) || !Array.isArray(plan.operations)) {
    throw new Error("scaffold plan has an invalid shape");
  }
  assertScaffoldPlanDigest(plan);
  const policy = await requireValidPackagePolicy(root);
  const entry = policy.entriesById.get(plan.target.id);
  if (entry === undefined
    || plan.target.path !== entry.path
    || plan.target.packageName !== entry.package_name
    || plan.target.role !== entry.role
    || plan.target.ownerDocument?.id !== entry.owner_document) {
    throw new Error("scaffold target differs from the repository-owned package policy");
  }
  if (packageOwnerFeatures(entry, await resolveOwner(entry.owner_document)) === undefined) {
    throw new Error("scaffold owner must be one effective accepted ADR bound to the exact package and features");
  }
  if (plan.operations.length === 0) throw new Error("scaffold plan must contain materialization operations");
  assertScaffoldOperationPaths(root, entry.path, plan.operations);
  return plan;
}

export async function publishScaffoldPlan({
  root,
  intentPath,
  planPath,
  resolveOwner = createDocsOwnerResolver(root),
  onPublicationFault = async () => undefined,
}) {
  const plan = await validatePlanAgainstCatalog(root, await planScaffoldFromFile({
    consumerRoot: root,
    intentPath,
  }), resolveOwner);
  const policy = await requireValidPackagePolicy(root);
  const entry = policy.entriesById.get(plan.target.id);
  if (entry === undefined || planPath !== materializationPlanPath(entry)) {
    throw new Error(`plan path must be ${entry === undefined ? "the catalog-owned materialization path" : materializationPlanPath(entry)}`);
  }
  const destination = safePlanPath(root, planPath);
  await ensurePlanDirectory(root);
  const existing = await matchingExistingPlan(root, destination, plan, resolveOwner);
  if (existing !== undefined) {
    await cleanupPublicationTemporaries(destination, plan.planDigest);
    return { plan: existing, planDigest: existing.planDigest };
  }

  const planBytes = Buffer.from(`${JSON.stringify(plan, null, 2)}\n`, "utf8");
  const temporaryPrefix = publicationTemporaryPrefix(destination, plan.planDigest);
  const temporary = join(
    dirname(destination),
    `${temporaryPrefix}${publicationNonce()}.tmp`,
  );
  const handle = await open(temporary, "wx", 0o644);
  let destinationLinked = false;
  let publishedPlan = plan;
  let primaryError;
  let cleanupError;
  try {
    await handle.writeFile(planBytes);
    await handle.sync();
    await onPublicationFault({ phase: "after-plan-temporary-synced", path: temporary });
    try {
      await link(temporary, destination);
      destinationLinked = true;
    } catch (error) {
      if (!["EEXIST", "ENOENT"].includes(error?.code)) throw error;
      const racedPlan = await matchingExistingPlan(root, destination, plan, resolveOwner);
      if (racedPlan === undefined) throw error;
      publishedPlan = racedPlan;
    }
    if (destinationLinked) {
      await onPublicationFault({ phase: "after-plan-hard-link", path: destination });
      const [temporaryMetadata, destinationMetadata] = await Promise.all([
        handle.stat(),
        lstat(destination),
      ]);
      if (!destinationMetadata.isFile()
        || destinationMetadata.isSymbolicLink()
        || destinationMetadata.dev !== temporaryMetadata.dev
        || destinationMetadata.ino !== temporaryMetadata.ino
        || destinationMetadata.size !== planBytes.length) {
        throw new Error("published scaffold plan is not the synced create-only temporary");
      }
      await syncDirectory(dirname(destination));
    }
  } catch (error) {
    primaryError = error;
  } finally {
    await handle.close().catch(error => {
      cleanupError ??= error;
    });
    try {
      await rm(temporary, { force: true });
    } catch (error) {
      cleanupError ??= error;
    }
  }
  if (primaryError !== undefined && destinationLinked) {
    primaryError = new AggregateError(
      [primaryError],
      "scaffold plan publication reached a complete create-only destination but final verification failed",
    );
  }
  if (primaryError !== undefined && cleanupError !== undefined) {
    throw new AggregateError([primaryError, cleanupError], "plan publication and cleanup both failed");
  }
  if (primaryError !== undefined) throw primaryError;
  if (cleanupError !== undefined) throw cleanupError;
  await cleanupPublicationTemporaries(destination, plan.planDigest);
  return { plan: publishedPlan, planDigest: publishedPlan.planDigest };
}

export async function applyScaffoldPlan({
  root,
  planPath,
  expectedPlanDigest,
  resolveOwner = createDocsOwnerResolver(root),
}) {
  if (typeof expectedPlanDigest !== "string" || !expectedPlanDigest.startsWith("sha256:")) {
    throw new Error("apply requires the reviewed plan digest printed by the plan command");
  }
  const plan = await readBoundedJson(root, safePlanPath(root, planPath));
  assertScaffoldPlanDigest(plan);
  if (plan.planDigest !== expectedPlanDigest) {
    throw new Error("scaffold plan differs from the reviewed plan digest");
  }
  const validated = await validatePlanAgainstCatalog(root, plan, resolveOwner);
  const policy = await requireValidPackagePolicy(root);
  const entry = policy.entriesById.get(validated.target.id);
  if (entry === undefined || planPath !== materializationPlanPath(entry)) {
    throw new Error(`plan path must be ${entry === undefined ? "the catalog-owned materialization path" : materializationPlanPath(entry)}`);
  }
  return applyFilesystemScaffold(root, validated);
}

function receiptExitCode(receipt) {
  return SUCCESS_RECEIPT_OUTCOMES.has(receipt.outcome) ? 0 : 2;
}

export async function runScaffoldCli({
  root,
  args,
  write = value => console.log(value),
  resolveOwner = createDocsOwnerResolver(root),
  recover = recoverFilesystemScaffold,
}) {
  const [command, first, second, ...rest] = args;
  if (rest.length > 0) throw new Error("unexpected scaffold arguments");
  if (command === "plan" && first !== undefined && second !== undefined) {
    const { plan, planDigest } = await publishScaffoldPlan({
      root,
      intentPath: first,
      planPath: second,
      resolveOwner,
    });
    write(JSON.stringify({ outcome: "planned", planPath: second, intentDigest: plan.intentDigest, planDigest }));
    return 0;
  }
  if (command === "apply" && first !== undefined && second !== undefined) {
    const receipt = await applyScaffoldPlan({
      root,
      planPath: first,
      expectedPlanDigest: second,
      resolveOwner,
    });
    write(JSON.stringify(receipt));
    return receiptExitCode(receipt);
  }
  if (command === "recover" && first === undefined && second === undefined) {
    const recovery = await recover(root);
    const receipt = recovery ?? { outcome: "no-pending-transaction" };
    write(JSON.stringify(receipt));
    return recovery === undefined ? 0 : receiptExitCode(receipt);
  }
  throw new Error("usage: scaffold.mjs plan <intent> <plan> | apply <plan> <plan-digest> | recover");
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    process.exitCode = await runScaffoldCli({
      root: fileURLToPath(new URL("../..", import.meta.url)),
      args: process.argv.slice(2),
    });
  } catch (error) {
    console.error(`SCAFFOLD_POLICY_REJECTED: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 2;
  }
}
