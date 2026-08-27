import { lstat, readFile, readdir } from "node:fs/promises";
import { join } from "node:path";

import { docsFind } from "@agent-teams/docs-protocol";
import { parse as parseYaml } from "yaml";

import { parseStrictJson } from "./strict-json.mjs";
import { STRICT_SEMVER } from "./strict-semver.mjs";

export const CATALOG_PATH = "architecture/package-catalog.json";
export const FOUNDATION_REPOSITORY = "agent-teams-ai/extension-foundation";
export const DOCS_PROFILE_PATH = "architecture/foundation/docs-protocol.yaml";
export const SCAFFOLDING_POLICY_PATH = "architecture/foundation/scaffolding.yaml";
export const MATERIALIZATION_PLAN_DIRECTORY = "architecture/scaffolding-plans";
export const PACKAGE_ADMISSION_DIRECTORY = "architecture/package-admissions";
export const ACCEPTED_DECISION_LEDGER_PATH = "architecture/decisions/accepted-decisions.json";
export const DECISION_INDEX_PATH = "docs/decisions/README.md";
export const CATALOG_ROOT_KEYS = Object.freeze(["packages", "version"]);
export const CATALOG_ENTRY_KEYS = Object.freeze([
  "id",
  "owner_document",
  "package_name",
  "path",
  "role",
]);
export const ADMISSION_KEYS = Object.freeze([
  "admission_basis",
  "schema_version",
  "conformance_version",
  "consumer_evidence",
  "extraction_decision",
  "neutrality_claim",
  "owner_repository",
  "package_id",
  "release_policy",
]);
export const CONSUMER_EVIDENCE_KEYS = Object.freeze([
  "conformance_result",
  "consumer_id",
  "consumer_repository",
  "evidence_kind",
  "evidence_reference",
  "implementation_id",
  "source_revision",
]);
export const REQUIRED_EVIDENCE_KINDS = Object.freeze([
  "product-slice",
  "independent-conformance",
]);
export const ADMISSION_BASES = Object.freeze([
  "independent-deployment-or-isolation",
  "independent-replacement-or-release-lifecycle",
  "public-spi",
  "second-real-consumer",
]);
export const PACKAGE_ID = /^[a-z0-9][a-z0-9.-]*$/;
export const PACKAGE_PATH = /^packages\/[a-z0-9][a-z0-9-]*(?:\/[a-z0-9][a-z0-9-]*)*$/;
export const PACKAGE_NAME = /^@agent-teams\/[a-z0-9][a-z0-9._-]*$/;
export const FEATURE_NAME = /^[a-z0-9][a-z0-9-]*$/;
export const OWNER_DOCUMENT = /^ADR-[0-9]{4}$/;
export const REPOSITORY_ID = /^[a-z0-9][a-z0-9_.-]*\/[a-z0-9][a-z0-9_.-]*$/;
export const SOURCE_REVISION = /^[0-9a-f]{40}$/;
export const CONFORMANCE_VERSION = STRICT_SEMVER;
export const EVIDENCE_DIGEST = /^sha256=[0-9a-f]{64}$/;

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

export function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function loadAllowedPackageRoles(root) {
  const policy = parseYaml(await readFile(join(root, SCAFFOLDING_POLICY_PATH), "utf8"));
  if (!isRecord(policy) || !Array.isArray(policy.compositions) || policy.compositions.length === 0) {
    throw new Error(`${SCAFFOLDING_POLICY_PATH} must declare at least one composition`);
  }
  const roles = new Set();
  for (const composition of policy.compositions) {
    if (!isRecord(composition) || !Array.isArray(composition.targetRoles)) {
      throw new Error(`${SCAFFOLDING_POLICY_PATH} compositions require targetRoles`);
    }
    for (const role of composition.targetRoles) {
      if (typeof role !== "string" || role.length === 0) {
        throw new Error(`${SCAFFOLDING_POLICY_PATH} target roles must be non-empty strings`);
      }
      roles.add(role);
    }
  }
  return roles;
}

function compareBinary(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function hasExactKeys(value, expected) {
  return isRecord(value)
    && Object.keys(value).sort(compareBinary).join("|") === [...expected].sort(compareBinary).join("|");
}

export function hasCanonicalPackageRootExports(manifest) {
  const rootExport = manifest?.exports?.["."];
  return hasExactKeys(manifest?.exports, ["."])
    && hasExactKeys(rootExport, ["import", "types"])
    && rootExport.import === "./dist/index.js"
    && rootExport.types === "./dist/index.d.ts";
}

export function pathsOverlap(left, right) {
  return left === right || left.startsWith(`${right}/`) || right.startsWith(`${left}/`);
}

function encodedPackageId(entry) {
  return [...entry.id].map(character => {
    if (character === ".") return "-dot-";
    if (character === "-") return "-dash-";
    return character;
  }).join("");
}

export function materializationPlanPath(entry) {
  return `${MATERIALIZATION_PLAN_DIRECTORY}/${encodedPackageId(entry)}.json`;
}

export function packageAdmissionPath(entry) {
  return `${PACKAGE_ADMISSION_DIRECTORY}/${encodedPackageId(entry)}.json`;
}

function canonicalRepositoryId(value) {
  return typeof value === "string" ? value.toLowerCase() : "";
}

function isCanonicalRepositoryId(value) {
  if (typeof value !== "string" || /[\u0000-\u001f\u007f]/u.test(value) || !REPOSITORY_ID.test(value)) return false;
  return value.split("/").every(segment => !segment.endsWith(".") && !segment.endsWith(".git"));
}

function canonicalEvidenceReference(value) {
  if (typeof value !== "string") return undefined;
  const fragmentIndex = value.indexOf("#");
  if (fragmentIndex !== value.lastIndexOf("#")) return undefined;
  const digest = value.slice(fragmentIndex + 1);
  if (fragmentIndex <= 0 || !EVIDENCE_DIGEST.test(digest)) return undefined;
  const location = value.slice(0, fragmentIndex);
  if (/[\u0000-\u001f\u007f]/u.test(location)) return undefined;
  if (location.startsWith("docs/")) {
    const segments = location.split("/");
    const valid = segments.length > 1
      && segments.every(segment => segment.length > 0 && segment !== "." && segment !== "..")
      && !location.includes("\\")
      && !location.includes("%")
      && !location.includes("?");
    return valid ? { reference: value, location, digest } : undefined;
  }
  try {
    const url = new URL(location);
    if (url.protocol !== "https:" || url.username !== "" || url.password !== "" || url.hash !== "") return undefined;
    return { reference: `${url.href}#${digest}`, location: url.href, digest };
  } catch {
    return undefined;
  }
}

function validateAdmission(entry, admission, errors) {
  if (!hasExactKeys(admission, ADMISSION_KEYS)) {
    errors.push(`${entry.id}: admission must contain exactly ${ADMISSION_KEYS.join(", ")}`);
    return;
  }
  if (admission.schema_version !== 3) {
    errors.push(`${entry.id}: admission.schema_version must equal 3`);
  }
  for (const key of ADMISSION_KEYS.filter(key => !["consumer_evidence", "schema_version"].includes(key))) {
    if (typeof admission[key] !== "string" || admission[key].length === 0) {
      errors.push(`${entry.id}: admission.${key} must be a non-empty string`);
    }
  }
  if (!isCanonicalRepositoryId(admission.owner_repository)) {
    errors.push(`${entry.id}: admission.owner_repository must be a canonical lowercase owner/repository identity`);
  } else if (admission.owner_repository !== FOUNDATION_REPOSITORY) {
    errors.push(`${entry.id}: admission.owner_repository must identify ${FOUNDATION_REPOSITORY}`);
  }
  if (admission.package_id !== entry.id) {
    errors.push(`${entry.id}: admission.package_id must equal the catalog package id`);
  }
  if (admission.extraction_decision !== entry.owner_document) {
    errors.push(`${entry.id}: admission.extraction_decision must equal the accepted owner_document`);
  }
  if (!CONFORMANCE_VERSION.test(admission.conformance_version ?? "")) {
    errors.push(`${entry.id}: admission.conformance_version must be an exact SemVer`);
  }
  if (!ADMISSION_BASES.includes(admission.admission_basis)) {
    errors.push(`${entry.id}: admission.admission_basis must identify one ADR-0013 package-admission basis`);
  }
  if (!Array.isArray(admission.consumer_evidence)) {
    errors.push(`${entry.id}: admission.consumer_evidence must be an array`);
    return;
  }
  const requiresTwoRecords = admission.admission_basis === "second-real-consumer"
    || admission.admission_basis === "public-spi";
  if (admission.consumer_evidence.length < (requiresTwoRecords ? 2 : 1)) {
    errors.push(requiresTwoRecords
      ? `${entry.id}: ${admission.admission_basis} admission requires at least two evidence records`
      : `${entry.id}: ${admission.admission_basis} admission requires at least one evidence record`);
    return;
  }
  const consumerIdentities = new Set();
  const implementationIdentities = new Set();
  const evidenceKinds = new Set();
  const evidenceReferences = new Set();
  const evidenceLocations = new Set();
  const evidenceDigests = new Set();
  for (const [index, evidence] of admission.consumer_evidence.entries()) {
    if (!hasExactKeys(evidence, CONSUMER_EVIDENCE_KEYS)) {
      errors.push(`${entry.id}: consumer_evidence[${index}] must contain exactly ${CONSUMER_EVIDENCE_KEYS.join(", ")}`);
      continue;
    }
    if (CONSUMER_EVIDENCE_KEYS.some(key => typeof evidence[key] !== "string" || evidence[key].length === 0)) {
      errors.push(`${entry.id}: consumer_evidence[${index}] fields must be non-empty strings`);
      continue;
    }
    if (!PACKAGE_ID.test(evidence.consumer_id)) {
      errors.push(`${entry.id}: consumer_evidence[${index}].consumer_id is invalid`);
    }
    if (!PACKAGE_ID.test(evidence.implementation_id)) {
      errors.push(`${entry.id}: consumer_evidence[${index}].implementation_id is invalid`);
    }
    if (!isCanonicalRepositoryId(evidence.consumer_repository)) {
      errors.push(`${entry.id}: consumer_evidence[${index}].consumer_repository must be a canonical lowercase owner/repository identity`);
    }
    if (!SOURCE_REVISION.test(evidence.source_revision)) {
      errors.push(`${entry.id}: consumer_evidence[${index}].source_revision must be an exact commit`);
    }
    if (evidence.conformance_result !== "passed") {
      errors.push(`${entry.id}: consumer_evidence[${index}].conformance_result must be passed`);
    }
    if (!REQUIRED_EVIDENCE_KINDS.includes(evidence.evidence_kind)) {
      errors.push(`${entry.id}: consumer_evidence[${index}].evidence_kind must identify product-slice or independent-conformance`);
    } else {
      evidenceKinds.add(evidence.evidence_kind);
    }
    const canonicalEvidence = canonicalEvidenceReference(evidence.evidence_reference);
    if (!canonicalEvidence) {
      errors.push(`${entry.id}: consumer_evidence[${index}].evidence_reference must use a contained docs path or HTTPS URL with a sha256 fragment`);
      evidenceReferences.add(`invalid-reference:${index}`);
      evidenceLocations.add(`invalid-location:${index}`);
      evidenceDigests.add(`invalid-digest:${index}`);
    } else {
      evidenceReferences.add(canonicalEvidence.reference);
      evidenceLocations.add(canonicalEvidence.location);
      evidenceDigests.add(canonicalEvidence.digest);
    }
    const repository = canonicalRepositoryId(evidence.consumer_repository);
    consumerIdentities.add(`${repository}\0${evidence.consumer_id}`);
    implementationIdentities.add(`${repository}\0${evidence.implementation_id}`);
  }
  if (evidenceReferences.size !== admission.consumer_evidence.length
    || evidenceLocations.size !== admission.consumer_evidence.length
    || evidenceDigests.size !== admission.consumer_evidence.length) {
    errors.push(`${entry.id}: evidence must use distinct immutable references`);
  }
  if (admission.admission_basis === "public-spi"
    && REQUIRED_EVIDENCE_KINDS.some(kind => !evidenceKinds.has(kind))) {
    errors.push(`${entry.id}: admission requires product-slice and independent-conformance evidence roles`);
  }
  if (admission.admission_basis === "second-real-consumer"
    && (consumerIdentities.size < 2 || consumerIdentities.size !== admission.consumer_evidence.length)) {
    errors.push(`${entry.id}: second-real-consumer admission requires two distinct consumer identities`);
  }
  if (admission.admission_basis === "public-spi"
    && (implementationIdentities.size < 2 || implementationIdentities.size !== admission.consumer_evidence.length)) {
    errors.push(`${entry.id}: public-spi admission requires two independently authored implementation identities`);
  }
}

export async function loadPackagePolicy(root) {
  const catalogPath = join(root, CATALOG_PATH);
  await assertRealParentDirectories(root, CATALOG_PATH);
  const catalogFile = await lstat(catalogPath);
  if (!catalogFile.isFile() || catalogFile.isSymbolicLink()) {
    throw new Error(`${CATALOG_PATH}: package catalog must be a real regular file, not a symbolic link`);
  }
  const [catalog, allowedRoles] = await Promise.all([
    readFile(catalogPath, "utf8").then(parseStrictJson),
    loadAllowedPackageRoles(root),
  ]);
  const errors = [];
  const entries = [];
  const entriesById = new Map();
  const entriesByPath = new Map();
  const admissionDirectoryPath = join(root, PACKAGE_ADMISSION_DIRECTORY);
  let admissionDirectoryAvailable = false;

  try {
    await assertRealParentDirectories(root, PACKAGE_ADMISSION_DIRECTORY);
    const admissionDirectory = await lstat(admissionDirectoryPath);
    if (!admissionDirectory.isDirectory() || admissionDirectory.isSymbolicLink()) {
      errors.push(`${PACKAGE_ADMISSION_DIRECTORY}: admission evidence directory must be a real directory, not a symbolic link`);
    } else {
      admissionDirectoryAvailable = true;
    }
  } catch (error) {
    if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) throw error;
  }

  if (!hasExactKeys(catalog, CATALOG_ROOT_KEYS)
    || catalog.version !== 1
    || !Array.isArray(catalog.packages)) {
    return {
      allowedRoles,
      catalog,
      entries,
      entriesById,
      entriesByPath,
      errors: [`${CATALOG_PATH} must contain exactly version 1 and a packages array`],
    };
  }

  const seen = { id: new Set(), path: new Set(), package_name: new Set() };
  const expectedAdmissionFiles = new Set();
  for (const entry of catalog.packages) {
    if (!hasExactKeys(entry, CATALOG_ENTRY_KEYS)
      || CATALOG_ENTRY_KEYS.some(key => typeof entry[key] !== "string" || entry[key].length === 0)) {
      errors.push(`${CATALOG_PATH}: every entry must contain exactly ${CATALOG_ENTRY_KEYS.join(", ")}`);
      continue;
    }
    const packageIdIsValid = PACKAGE_ID.test(entry.id);
    if (!packageIdIsValid) errors.push(`${entry.id}: package id is invalid`);
    if (!allowedRoles.has(entry.role)) errors.push(`${entry.id}: unknown role ${entry.role}`);
    if (!PACKAGE_PATH.test(entry.path)) {
      errors.push(`${entry.id}: path must be a normalized directory under packages/`);
    }
    if (!PACKAGE_NAME.test(entry.package_name)) {
      errors.push(`${entry.id}: package_name must use the @agent-teams scope`);
    }
    if (!OWNER_DOCUMENT.test(entry.owner_document)) {
      errors.push(`${entry.id}: owner_document must be an ADR identity`);
    }
    if (packageIdIsValid) {
      expectedAdmissionFiles.add(packageAdmissionPath(entry).slice(PACKAGE_ADMISSION_DIRECTORY.length + 1));
      try {
        if (!admissionDirectoryAvailable) throw new Error("admission evidence directory is unavailable");
        const admissionRelativePath = packageAdmissionPath(entry);
        await assertRealParentDirectories(root, admissionRelativePath);
        const admissionPath = join(root, admissionRelativePath);
        const admissionFile = await lstat(admissionPath);
        if (!admissionFile.isFile() || admissionFile.isSymbolicLink()) {
          throw new Error("admission evidence must be a regular file, not a symbolic link");
        }
        const admission = parseStrictJson(await readFile(admissionPath, "utf8"));
        validateAdmission(entry, admission, errors);
      } catch (error) {
        errors.push(`${entry.id}: admission evidence is missing or invalid: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    for (const field of Object.keys(seen)) {
      if (seen[field].has(entry[field])) errors.push(`${entry.id}: duplicate ${field} ${entry[field]}`);
      seen[field].add(entry[field]);
    }
    for (const existing of entries) {
      if (pathsOverlap(entry.path, existing.path)) {
        errors.push(`${entry.id}: package path overlaps ${existing.id}`);
      }
    }
    entries.push(entry);
    entriesById.set(entry.id, entry);
    entriesByPath.set(entry.path, entry);
  }

  if (admissionDirectoryAvailable) {
    const admissionEntries = await readdir(admissionDirectoryPath, { withFileTypes: true });
    for (const admissionEntry of admissionEntries) {
      if (!admissionEntry.isFile() || !expectedAdmissionFiles.has(admissionEntry.name)) {
        errors.push(`${PACKAGE_ADMISSION_DIRECTORY}/${admissionEntry.name}: orphan admission evidence is not declared by ${CATALOG_PATH}`);
      }
    }
  }

  return {
    allowedRoles,
    catalog,
    entries,
    entriesById,
    entriesByPath,
    errors,
  };
}

export async function requireValidPackagePolicy(root) {
  const policy = await loadPackagePolicy(root);
  if (policy.errors.length !== 0) {
    throw new Error(`package catalog is invalid: ${policy.errors.join("; ")}`);
  }
  return policy;
}

export function packageExportTargets(value) {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) {
    const nested = value.map(packageExportTargets);
    return nested.some(entry => entry === undefined) ? undefined : nested.flat();
  }
  if (!isRecord(value)) return undefined;
  const nested = Object.values(value).map(packageExportTargets);
  return nested.some(entry => entry === undefined) ? undefined : nested.flat();
}

function normalizePackageOwnership(value) {
  if (value === undefined) return { entries: [], errors: [] };
  if (!Array.isArray(value)) return { entries: [], errors: ["package_ownership must be an array"] };
  const entries = [];
  const errors = [];
  for (const [index, entry] of value.entries()) {
    if (!isRecord(entry)
      || typeof entry.package_id !== "string"
      || typeof entry.package_name !== "string"
      || typeof entry.package_path !== "string"
      || !Array.isArray(entry.features)
      || entry.features.some(feature => typeof feature !== "string")) {
      errors.push(`package_ownership[${index}] has an invalid shape`);
      continue;
    }
    const features = [...entry.features].sort(compareBinary);
    if (!PACKAGE_ID.test(entry.package_id)
      || !PACKAGE_NAME.test(entry.package_name)
      || !PACKAGE_PATH.test(entry.package_path)
      || features.length === 0
      || features.some(feature => !FEATURE_NAME.test(feature))
      || new Set(features).size !== features.length) {
      errors.push(`package_ownership[${index}] has an invalid identity or feature set`);
      continue;
    }
    entries.push({
      packageId: entry.package_id,
      packageName: entry.package_name,
      packagePath: entry.package_path,
      features,
    });
  }
  return { entries, errors };
}

function supersededBy(documents, document) {
  const successors = new Set(
    Array.isArray(document.metadata.superseded_by) ? document.metadata.superseded_by : [],
  );
  for (const candidate of documents) {
    if (["accepted", "superseded"].includes(String(candidate.metadata.status))
      && Array.isArray(candidate.metadata.supersedes)
      && candidate.metadata.supersedes.includes(document.id)) {
      successors.add(candidate.id);
    }
  }
  return [...successors].sort(compareBinary);
}

function normalizeOwnerDocument(documents, document) {
  const ownership = normalizePackageOwnership(document.metadata.package_ownership);
  return {
    id: document.id,
    type: String(document.metadata.type ?? ""),
    status: String(document.metadata.status ?? ""),
    supersededBy: supersededBy(documents, document),
    packageOwnership: ownership.entries,
    packageOwnershipErrors: ownership.errors,
  };
}

export async function loadAcceptedDecisionIds(root) {
  await assertRealParentDirectories(root, ACCEPTED_DECISION_LEDGER_PATH);
  const ledgerPath = join(root, ACCEPTED_DECISION_LEDGER_PATH);
  const ledgerFile = await lstat(ledgerPath);
  if (!ledgerFile.isFile() || ledgerFile.isSymbolicLink()) {
    throw new Error(`${ACCEPTED_DECISION_LEDGER_PATH}: accepted-decision ledger must be a real regular file`);
  }
  const ledger = parseStrictJson(await readFile(ledgerPath, "utf8"));
  if (!hasExactKeys(ledger, ["algorithm", "decisions", "schemaVersion"])
    || ledger.schemaVersion !== 1
    || ledger.algorithm !== "sha256"
    || !Array.isArray(ledger.decisions)) {
    throw new Error(`${ACCEPTED_DECISION_LEDGER_PATH}: invalid accepted-decision ledger`);
  }
  const ids = new Set();
  for (const decision of ledger.decisions) {
    if (!hasExactKeys(decision, ["id", "immutableDigest", "path"])
      || !OWNER_DOCUMENT.test(decision.id ?? "")
      || typeof decision.path !== "string"
      || typeof decision.immutableDigest !== "string"
      || !/^sha256:[0-9a-f]{64}$/.test(decision.immutableDigest)
      || ids.has(decision.id)) {
      throw new Error(`${ACCEPTED_DECISION_LEDGER_PATH}: invalid or duplicate decision entry`);
    }
    ids.add(decision.id);
  }
  return ids;
}

async function loadAuthoritativeDecisionStatuses(root) {
  await assertRealParentDirectories(root, DECISION_INDEX_PATH);
  const indexPath = join(root, DECISION_INDEX_PATH);
  const indexFile = await lstat(indexPath);
  if (!indexFile.isFile() || indexFile.isSymbolicLink()) {
    throw new Error(`${DECISION_INDEX_PATH}: decision index must be a real regular file`);
  }
  const contents = (await readFile(indexPath, "utf8")).replace(/\r\n?/g, "\n");
  const statuses = new Map();
  const sections = [...contents.matchAll(/^## (Proposed|Accepted|Superseded) decisions\s*$([\s\S]*?)(?=^## |(?![\s\S]))/gmi)];
  if (sections.length !== 3) throw new Error(`${DECISION_INDEX_PATH}: decision lifecycle sections are incomplete`);
  for (const section of sections) {
    const status = section[1].toLowerCase();
    for (const match of section[2].matchAll(/^- \[(ADR-[0-9]{4}):[^\]]+\]\([^)]+\)$/gm)) {
      if (statuses.has(match[1])) throw new Error(`${DECISION_INDEX_PATH}: duplicate decision ${match[1]}`);
      statuses.set(match[1], status);
    }
  }
  return statuses;
}

export function statusCrossChecksWithAcceptedLedger(document, acceptedDecisionIds, authoritativeStatuses) {
  if (document.metadata.type !== "adr") return true;
  const status = String(document.metadata.status ?? "");
  const recordedAsAccepted = acceptedDecisionIds.has(document.id);
  const acceptedHistoryMatches = ["accepted", "superseded"].includes(status)
    ? recordedAsAccepted
    : status === "proposed" && !recordedAsAccepted;
  return acceptedHistoryMatches
    && (authoritativeStatuses === undefined || authoritativeStatuses.get(document.id) === status);
}

export function createDocsOwnerCatalog(root) {
  let documentsExecution;
  let acceptedDecisionIdsExecution;
  let authoritativeDecisionStatusesExecution;
  const documents = async () => {
    documentsExecution ??= docsFind({
      consumerRoot: root,
      profilePath: DOCS_PROFILE_PATH,
      query: {},
    });
    const execution = await documentsExecution;
    if (execution.envelope.outcome !== "success") {
      throw new Error("Docs Protocol could not enumerate package ownership documents");
    }
    return execution.envelope.result.documents;
  };
  const acceptedDecisionIds = async () => (
    acceptedDecisionIdsExecution ??= loadAcceptedDecisionIds(root)
  );
  const authoritativeDecisionStatuses = async () => (
    authoritativeDecisionStatusesExecution ??= loadAuthoritativeDecisionStatuses(root)
  );
  return {
    resolve: async ownerDocumentId => {
      const [allDocuments, acceptedIds, authoritativeStatuses] = await Promise.all([
        documents(),
        acceptedDecisionIds(),
        authoritativeDecisionStatuses(),
      ]);
      const matches = allDocuments.filter(document => document.id === ownerDocumentId);
      if (matches.length !== 1
        || !statusCrossChecksWithAcceptedLedger(matches[0], acceptedIds, authoritativeStatuses)) return undefined;
      return normalizeOwnerDocument(allDocuments, matches[0]);
    },
    listEffective: async () => {
      const [allDocuments, acceptedIds, authoritativeStatuses] = await Promise.all([
        documents(),
        acceptedDecisionIds(),
        authoritativeDecisionStatuses(),
      ]);
      return allDocuments
        .filter(document => statusCrossChecksWithAcceptedLedger(document, acceptedIds, authoritativeStatuses))
        .map(document => normalizeOwnerDocument(allDocuments, document))
        .filter(document => (
          document.type === "adr"
          && document.status === "accepted"
          && document.supersededBy.length === 0
        ));
    },
  };
}

export function createDocsOwnerResolver(root) {
  const catalog = createDocsOwnerCatalog(root);
  return catalog.resolve;
}

export function packageOwnerFeatures(entry, owner) {
  if (owner?.id !== entry.owner_document
    || owner.type !== "adr"
    || owner.status !== "accepted"
    || owner.supersededBy?.length !== 0
    || (owner.packageOwnershipErrors?.length ?? 0) !== 0) {
    return undefined;
  }
  const matches = owner.packageOwnership?.filter(ownership => (
    ownership.packageId === entry.id
    && ownership.packageName === entry.package_name
    && ownership.packagePath === entry.path
  )) ?? [];
  if (matches.length !== 1
    || matches[0].features.length === 0
    || matches[0].features.some(feature => !FEATURE_NAME.test(feature))) {
    return undefined;
  }
  return matches[0].features;
}
