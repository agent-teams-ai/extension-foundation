import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { docsFind } from "@agent-teams/docs-protocol";
import { parse as parseYaml } from "yaml";

export const CATALOG_PATH = "architecture/package-catalog.json";
export const DOCS_PROFILE_PATH = "architecture/foundation/docs-protocol.yaml";
export const SCAFFOLDING_POLICY_PATH = "architecture/foundation/scaffolding.yaml";
export const PACKAGE_PATH = /^packages\/[a-z0-9][a-z0-9-]*(?:\/[a-z0-9][a-z0-9-]*)*$/;
export const PACKAGE_NAME = /^@agent-teams\/[a-z0-9][a-z0-9._-]*$/;
export const FEATURE_NAME = /^[a-z0-9][a-z0-9-]*$/;

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

function normalizePackageOwnership(value) {
  if (!Array.isArray(value)) return [];
  return value.flatMap(entry => {
    if (!isRecord(entry)
      || typeof entry.package_id !== "string"
      || typeof entry.package_name !== "string"
      || typeof entry.package_path !== "string"
      || !Array.isArray(entry.features)
      || entry.features.some(feature => typeof feature !== "string")) {
      return [];
    }
    return [{
      packageId: entry.package_id,
      packageName: entry.package_name,
      packagePath: entry.package_path,
      features: [...new Set(entry.features)].sort(),
    }];
  });
}

export function createDocsOwnerResolver(root) {
  let documentsExecution;
  return async ownerDocumentId => {
    documentsExecution ??= docsFind({
      consumerRoot: root,
      profilePath: DOCS_PROFILE_PATH,
      query: {},
    });
    const execution = await documentsExecution;
    if (execution.envelope.outcome !== "success") return undefined;
    const documents = execution.envelope.result.documents;
    const matches = documents.filter(document => document.id === ownerDocumentId);
    if (matches.length !== 1) return undefined;
    const document = matches[0];
    const supersededBy = new Set(
      Array.isArray(document.metadata.superseded_by) ? document.metadata.superseded_by : [],
    );
    for (const candidate of documents) {
      if (["accepted", "superseded"].includes(String(candidate.metadata.status))
        && Array.isArray(candidate.metadata.supersedes)
        && candidate.metadata.supersedes.includes(ownerDocumentId)) {
        supersededBy.add(candidate.id);
      }
    }
    return {
      id: document.id,
      type: String(document.metadata.type ?? ""),
      status: String(document.metadata.status ?? ""),
      supersededBy: [...supersededBy].sort(),
      packageOwnership: normalizePackageOwnership(document.metadata.package_ownership),
    };
  };
}

export function packageOwnerFeatures(entry, owner) {
  if (owner?.id !== entry.owner_document
    || owner.type !== "adr"
    || owner.status !== "accepted"
    || owner.supersededBy?.length !== 0) {
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
