import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { docsFind } from "@agent-teams/docs-protocol";
import { parse as parseYaml } from "yaml";

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
export { packageOwnerFeatures } from "./package-policy/ownership-policy.mjs";
export const DOCS_PROFILE_PATH = "architecture/foundation/docs-protocol.yaml";

const loadText = (root, path) => readFile(join(root, path), "utf8");
const defaultLoadAllowedRoles = createLoadAllowedPackageRoles({
  loadPolicyDocument: root => loadText(root, SCAFFOLDING_POLICY_PATH).then(parseYaml),
});
const defaultLoadPackagePolicy = createLoadPackagePolicy({
  loadCatalog: root => loadText(root, CATALOG_PATH).then(JSON.parse),
  loadAllowedRoles: defaultLoadAllowedRoles,
});

export function loadAllowedPackageRoles(root) {
  return defaultLoadAllowedRoles(root);
}

export function loadPackagePolicy(root) {
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
  return createOwnerCatalog({
    loadDocuments: async () => ownerEvidenceFromDocsExecution(await docsFind({
        consumerRoot: root,
        profilePath: DOCS_PROFILE_PATH,
        query: {},
      })),
  });
}

export function createDocsOwnerResolver(root) {
  return createDocsOwnerCatalog(root).resolve;
}
