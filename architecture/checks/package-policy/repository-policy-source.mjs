import { allowedPackageRoles, catalogPolicy } from "./catalog-policy.mjs";

export function createLoadAllowedPackageRoles({ loadPolicyDocument }) {
  return async root => allowedPackageRoles(await loadPolicyDocument(root));
}

export function createLoadPackagePolicy({ loadCatalog, loadAllowedRoles }) {
  return async root => {
    const [catalog, allowedRoles] = await Promise.all([loadCatalog(root), loadAllowedRoles(root)]);
    return catalogPolicy(catalog, allowedRoles);
  };
}
