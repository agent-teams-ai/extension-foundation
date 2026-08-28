import { FEATURE_NAME, PACKAGE_ID, PACKAGE_NAME, PACKAGE_PATH, isRecord } from "./catalog-policy.mjs";
import { SEMANTIC_CLASSIFICATIONS } from "./admission-policy.mjs";

function compareBinary(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
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
      || typeof entry.semantic_classification !== "string"
      || !Array.isArray(entry.features)
      || entry.features.some(feature => typeof feature !== "string")) {
      errors.push(`package_ownership[${index}] has an invalid shape`);
      continue;
    }
    const features = [...entry.features].sort(compareBinary);
    if (!PACKAGE_ID.test(entry.package_id)
      || !PACKAGE_NAME.test(entry.package_name)
      || !PACKAGE_PATH.test(entry.package_path)
      || !SEMANTIC_CLASSIFICATIONS.includes(entry.semantic_classification)
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
      semanticClassification: entry.semantic_classification,
      features,
    });
  }
  return { entries, errors };
}

function supersededBy(documents, document) {
  const successors = new Set(Array.isArray(document.supersededBy) ? document.supersededBy : []);
  for (const candidate of documents) {
    if (["accepted", "superseded"].includes(candidate.status)
      && Array.isArray(candidate.supersedes)
      && candidate.supersedes.includes(document.id)) {
      successors.add(candidate.id);
    }
  }
  return [...successors].sort(compareBinary);
}

export function normalizeOwnerEvidence(documents, document) {
  const ownership = normalizePackageOwnership(document.packageOwnership);
  return {
    id: document.id,
    type: document.type,
    status: document.status,
    supersededBy: supersededBy(documents, document),
    packageOwnership: ownership.entries,
    packageOwnershipErrors: ownership.errors,
  };
}

export function packageOwnerPolicy(entry, owner) {
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
    || matches[0].features.some(feature => !FEATURE_NAME.test(feature))
    || !SEMANTIC_CLASSIFICATIONS.includes(matches[0].semanticClassification)) {
    return undefined;
  }
  return matches[0];
}

export function packageOwnerFeatures(entry, owner) {
  return packageOwnerPolicy(entry, owner)?.features;
}

export function packageOwnerSemanticClassification(entry, owner) {
  return packageOwnerPolicy(entry, owner)?.semanticClassification;
}
