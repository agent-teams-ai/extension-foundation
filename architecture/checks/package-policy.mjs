import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { lstat, readFile, readdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { docsFind } from "@agent-teams/docs-protocol";
import { parse as parseYaml } from "yaml";

import { parseStrictJson } from "./strict-json.mjs";
import {
  ACCEPTED_DECISION_LEDGER_PATH,
  DECISION_INDEX_PATH,
} from "./package-policy/accepted-decision-policy.mjs";
import { createAcceptedDecisionSource } from "./package-policy/accepted-decision-source.mjs";
import {
  PACKAGE_ADMISSION_DIRECTORY,
  packageAdmissionPath,
} from "./package-policy/admission-policy.mjs";
import {
  CATALOG_PATH,
  SCAFFOLDING_POLICY_PATH,
} from "./package-policy/catalog-policy.mjs";
import {
  createDocsOwnerCatalog as createOwnerCatalog,
  ownerEvidenceFromDocsExecution,
} from "./package-policy/docs-owner-source.mjs";
import {
  createLoadAllowedPackageRoles,
  createLoadPackagePolicy,
} from "./package-policy/repository-policy-source.mjs";

export {
  ACCEPTED_DECISION_LEDGER_PATH,
  DECISION_INDEX_PATH,
  isEffectiveAcceptedDecision,
  statusCrossChecksWithAcceptedLedger,
} from "./package-policy/accepted-decision-policy.mjs";
export {
  ADMISSION_BASES,
  ADMISSION_KEYS,
  CONFORMANCE_VERSION,
  CONSUMER_EVIDENCE_KEYS,
  EVIDENCE_DIGEST,
  FOUNDATION_REPOSITORY,
  PACKAGE_ADMISSION_DIRECTORY,
  REPOSITORY_ID,
  REQUIRED_EVIDENCE_KINDS,
  SEMANTIC_CLASSIFICATIONS,
  SOURCE_REVISION,
  admissionVerificationReceiptMatches,
  packageAdmissionGateId,
  packageAdmissionPath,
  packageAdmissionVerificationRequest,
  packagePublicationGateId,
} from "./package-policy/admission-policy.mjs";
export {
  CATALOG_ENTRY_KEYS,
  CATALOG_PATH,
  CATALOG_ROOT_KEYS,
  FEATURE_NAME,
  MATERIALIZATION_PLAN_DIRECTORY,
  OWNER_DOCUMENT,
  PACKAGE_ID,
  PACKAGE_NAME,
  PACKAGE_PATH,
  SCAFFOLDING_POLICY_PATH,
  hasCanonicalPackageRootExports,
  isRecord,
  materializationPlanPath,
  packageExportTargets,
  pathsOverlap,
} from "./package-policy/catalog-policy.mjs";
export {
  packageOwnerFeatures,
  packageOwnerPolicy,
  packageOwnerSemanticClassification,
} from "./package-policy/ownership-policy.mjs";

export const DOCS_PROFILE_PATH = "architecture/foundation/docs-protocol.yaml";

const execFileAsync = promisify(execFile);
const FOUNDATION_PACKAGE_MANIFEST_PATH = fileURLToPath(
  import.meta.resolve("@agent-teams/engineering-foundation/package.json"),
);
let foundationCliPathExecution;

async function assertRealParentDirectories(root, relativePath) {
  const segments = relativePath.split("/");
  let current = root;
  for (const segment of segments.slice(0, -1)) {
    current = join(current, segment);
    const metadata = await lstat(current);
    if (!metadata.isDirectory() || metadata.isSymbolicLink()) {
      throw new Error(`${relativePath}: authority path ancestors must be real directories, not symbolic links`);
    }
  }
}

async function readRegularAuthorityFile(root, relativePath, regularFileError) {
  await assertRealParentDirectories(root, relativePath);
  const path = join(root, relativePath);
  const metadata = await lstat(path);
  if (!metadata.isFile() || metadata.isSymbolicLink()) throw new Error(regularFileError);
  return readFile(path);
}

async function foundationCliPath() {
  foundationCliPathExecution ??= (async () => {
    const manifest = parseStrictJson(await readFile(FOUNDATION_PACKAGE_MANIFEST_PATH, "utf8"));
    const binPath = manifest?.bin?.["agent-teams-foundation"];
    if (typeof binPath !== "string"
      || !/^\.\/[a-zA-Z0-9._/-]+$/.test(binPath)
      || binPath.split("/").includes("..")) {
      throw new Error("@agent-teams/engineering-foundation: invalid CLI package contract");
    }
    const resolved = join(dirname(FOUNDATION_PACKAGE_MANIFEST_PATH), binPath);
    const metadata = await lstat(resolved);
    if (!metadata.isFile() || metadata.isSymbolicLink()) {
      throw new Error("@agent-teams/engineering-foundation: CLI must be a real regular file");
    }
    return resolved;
  })();
  return foundationCliPathExecution;
}

async function assertAcceptedDecisionGovernance(root) {
  try {
    await execFileAsync(process.execPath, [
      await foundationCliPath(),
      "check",
      "governance.architecture-decisions",
      "--consumer",
      root,
      "--format",
      "json",
    ], {
      cwd: root,
      encoding: "utf8",
      maxBuffer: 1024 * 1024,
      timeout: 30_000,
    });
  } catch (error) {
    const detail = `${error?.stdout ?? ""}\n${error?.stderr ?? ""}`.trim();
    throw new Error(
      `Accepted ADR governance rejected package ownership authority${detail.length === 0 ? "" : `: ${detail.slice(0, 600)}`}`,
      { cause: error },
    );
  }
}

function acceptedDecisionSource() {
  return createAcceptedDecisionSource({
    loadLedger: async root => parseStrictJson((await readRegularAuthorityFile(
      root,
      ACCEPTED_DECISION_LEDGER_PATH,
      `${ACCEPTED_DECISION_LEDGER_PATH}: accepted-decision ledger must be a real regular file`,
    )).toString("utf8")),
    loadDecisionIndex: async root => (await readRegularAuthorityFile(
      root,
      DECISION_INDEX_PATH,
      `${DECISION_INDEX_PATH}: decision index must be a real regular file`,
    )).toString("utf8"),
    assertGovernance: assertAcceptedDecisionGovernance,
  });
}

export async function loadAcceptedDecisionEntries(root) {
  return acceptedDecisionSource().loadEntries(root);
}

export async function loadAcceptedDecisionIds(root) {
  return acceptedDecisionSource().loadIds(root);
}

const defaultLoadAllowedRoles = createLoadAllowedPackageRoles({
  loadPolicyDocument: root => readFile(join(root, SCAFFOLDING_POLICY_PATH), "utf8").then(parseYaml),
});

async function loadAdmissionDirectory(root) {
  const errors = [];
  const directoryPath = join(root, PACKAGE_ADMISSION_DIRECTORY);
  try {
    await assertRealParentDirectories(root, PACKAGE_ADMISSION_DIRECTORY);
    const metadata = await lstat(directoryPath);
    if (!metadata.isDirectory() || metadata.isSymbolicLink()) {
      errors.push(`${PACKAGE_ADMISSION_DIRECTORY}: admission evidence directory must be a real directory, not a symbolic link`);
      return { available: false, entries: [], errors };
    }
  } catch (error) {
    if (error?.code === "ENOENT") return { available: false, entries: [], errors };
    throw error;
  }
  const entries = (await readdir(directoryPath, { withFileTypes: true }))
    .map(entry => ({ name: entry.name, isFile: entry.isFile() }));
  return {
    available: true,
    entries,
    errors,
    load: async entry => {
      const relativePath = packageAdmissionPath(entry);
      const bytes = await readRegularAuthorityFile(
        root,
        relativePath,
        "admission evidence must be a regular file, not a symbolic link",
      );
      return {
        admission: parseStrictJson(bytes.toString("utf8")),
        digest: `sha256:${createHash("sha256").update(bytes).digest("hex")}`,
      };
    },
  };
}

const defaultLoadPackagePolicy = createLoadPackagePolicy({
  loadCatalog: async root => parseStrictJson((await readRegularAuthorityFile(
    root,
    CATALOG_PATH,
    `${CATALOG_PATH}: package catalog must be a real regular file, not a symbolic link`,
  )).toString("utf8")),
  loadAllowedRoles: defaultLoadAllowedRoles,
  loadAdmissionDirectory,
});

export async function loadAllowedPackageRoles(root) {
  return defaultLoadAllowedRoles(root);
}

export async function loadPackagePolicy(root) {
  return defaultLoadPackagePolicy(root);
}

export async function requireValidPackagePolicy(root) {
  const policy = await loadPackagePolicy(root);
  if (policy.errors.length !== 0) {
    throw new Error(`package catalog is invalid: ${policy.errors.join("; ")}`);
  }
  return policy;
}

export function createDocsOwnerCatalog(root) {
  const decisions = acceptedDecisionSource();
  return createOwnerCatalog({
    loadDocuments: async () => ownerEvidenceFromDocsExecution(await docsFind({
      consumerRoot: root,
      profilePath: DOCS_PROFILE_PATH,
      query: {},
    })),
    loadAcceptedDecisionAuthority: () => decisions.loadAuthority(root),
  });
}

export function createDocsOwnerResolver(root) {
  return createDocsOwnerCatalog(root).resolve;
}
