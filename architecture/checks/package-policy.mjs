import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { docsFind } from "@agent-teams/docs-protocol";
import { parse as parseYaml } from "yaml";

export const CATALOG_PATH = "architecture/package-catalog.json";
export const FOUNDATION_REPOSITORY = "agent-teams-ai/extension-foundation";
export const DOCS_PROFILE_PATH = "architecture/foundation/docs-protocol.yaml";
export const SCAFFOLDING_POLICY_PATH = "architecture/foundation/scaffolding.yaml";
export const MATERIALIZATION_PLAN_DIRECTORY = "architecture/scaffolding-plans";
export const PACKAGE_ADMISSION_DIRECTORY = "architecture/package-admissions";
export const CATALOG_ROOT_KEYS = Object.freeze(["packages", "version"]);
export const CATALOG_ENTRY_KEYS = Object.freeze([
  "id",
  "owner_document",
  "package_name",
  "path",
  "role",
]);
export const ADMISSION_KEYS = Object.freeze([
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
  "evidence_reference",
  "source_revision",
]);
export const PACKAGE_ID = /^[a-z0-9][a-z0-9.-]*$/;
export const PACKAGE_PATH = /^packages\/[a-z0-9][a-z0-9-]*(?:\/[a-z0-9][a-z0-9-]*)*$/;
export const PACKAGE_NAME = /^@agent-teams\/[a-z0-9][a-z0-9._-]*$/;
export const FEATURE_NAME = /^[a-z0-9][a-z0-9-]*$/;
export const OWNER_DOCUMENT = /^ADR-[0-9]{4}$/;
export const REPOSITORY_ID = /^[a-z0-9][a-z0-9_.-]*\/[a-z0-9][a-z0-9_.-]*$/;
export const SOURCE_REVISION = /^[0-9a-f]{40}$/;
export const CONFORMANCE_VERSION = /^(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)(?:-(?:(?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*)(?:\.(?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*))*))?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$(?![\s\S])/;
export const EVIDENCE_DIGEST = /^sha256=[0-9a-f]{64}$/;

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
  if (admission.schema_version !== 1) {
    errors.push(`${entry.id}: admission.schema_version must equal 1`);
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
  if (!Array.isArray(admission.consumer_evidence) || admission.consumer_evidence.length < 2) {
    errors.push(`${entry.id}: admission requires at least two independent consumer evidence records`);
    return;
  }
  const consumerIds = new Set();
  const consumerRepositories = new Set();
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
    if (!isCanonicalRepositoryId(evidence.consumer_repository)) {
      errors.push(`${entry.id}: consumer_evidence[${index}].consumer_repository must be a canonical lowercase owner/repository identity`);
    }
    if (!SOURCE_REVISION.test(evidence.source_revision)) {
      errors.push(`${entry.id}: consumer_evidence[${index}].source_revision must be an exact commit`);
    }
    if (evidence.conformance_result !== "passed") {
      errors.push(`${entry.id}: consumer_evidence[${index}].conformance_result must be passed`);
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
    consumerIds.add(evidence.consumer_id);
    consumerRepositories.add(canonicalRepositoryId(evidence.consumer_repository));
  }
  if (consumerIds.size !== admission.consumer_evidence.length
    || consumerRepositories.size !== admission.consumer_evidence.length
    || evidenceReferences.size !== admission.consumer_evidence.length
    || evidenceLocations.size !== admission.consumer_evidence.length
    || evidenceDigests.size !== admission.consumer_evidence.length) {
    errors.push(`${entry.id}: consumer evidence must use distinct identities, repositories, and immutable references`);
  }
  if (consumerRepositories.has(canonicalRepositoryId(admission.owner_repository))) {
    errors.push(`${entry.id}: consumer evidence must be independent from the Foundation owner repository`);
  }
}

export async function loadPackagePolicy(root) {
  const [catalog, allowedRoles] = await Promise.all([
    readFile(join(root, CATALOG_PATH), "utf8").then(JSON.parse),
    loadAllowedPackageRoles(root),
  ]);
  const errors = [];
  const entries = [];
  const entriesById = new Map();
  const entriesByPath = new Map();

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
  for (const entry of catalog.packages) {
    if (!hasExactKeys(entry, CATALOG_ENTRY_KEYS)
      || CATALOG_ENTRY_KEYS.some(key => typeof entry[key] !== "string" || entry[key].length === 0)) {
      errors.push(`${CATALOG_PATH}: every entry must contain exactly ${CATALOG_ENTRY_KEYS.join(", ")}`);
      continue;
    }
    if (!PACKAGE_ID.test(entry.id)) errors.push(`${entry.id}: package id is invalid`);
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
    try {
      const admission = JSON.parse(await readFile(join(root, packageAdmissionPath(entry)), "utf8"));
      validateAdmission(entry, admission, errors);
    } catch (error) {
      errors.push(`${entry.id}: admission evidence is missing or invalid: ${error instanceof Error ? error.message : String(error)}`);
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

export function createDocsOwnerCatalog(root) {
  let documentsExecution;
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
  return {
    resolve: async ownerDocumentId => {
      const allDocuments = await documents();
      const matches = allDocuments.filter(document => document.id === ownerDocumentId);
      if (matches.length !== 1) return undefined;
      return normalizeOwnerDocument(allDocuments, matches[0]);
    },
    listEffective: async () => {
      const allDocuments = await documents();
      return allDocuments
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
