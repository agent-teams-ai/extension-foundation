import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { docsFind } from "@agent-teams/docs-protocol";
import { parse as parseYaml } from "yaml";

export const CATALOG_PATH = "architecture/package-catalog.json";
export const DOCS_PROFILE_PATH = "architecture/foundation/docs-protocol.yaml";
export const SCAFFOLDING_POLICY_PATH = "architecture/foundation/scaffolding.yaml";
export const MATERIALIZATION_PLAN_DIRECTORY = "architecture/scaffolding-plans";
export const CATALOG_ROOT_KEYS = Object.freeze(["packages", "version"]);
export const CATALOG_ENTRY_KEYS = Object.freeze([
  "id",
  "owner_document",
  "package_name",
  "path",
  "role",
]);
export const PACKAGE_ID = /^[a-z0-9][a-z0-9.-]*$/;
export const PACKAGE_PATH = /^packages\/[a-z0-9][a-z0-9-]*(?:\/[a-z0-9][a-z0-9-]*)*$/;
export const PACKAGE_NAME = /^@agent-teams\/[a-z0-9][a-z0-9._-]*$/;
export const FEATURE_NAME = /^[a-z0-9][a-z0-9-]*$/;
export const OWNER_DOCUMENT = /^ADR-[0-9]{4}$/;

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

export function pathsOverlap(left, right) {
  return left === right || left.startsWith(`${right}/`) || right.startsWith(`${left}/`);
}

export function materializationPlanPath(entry) {
  const encodedId = [...entry.id].map(character => {
    if (character === ".") return "-dot-";
    if (character === "-") return "-dash-";
    return character;
  }).join("");
  return `${MATERIALIZATION_PLAN_DIRECTORY}/${encodedId}.json`;
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
