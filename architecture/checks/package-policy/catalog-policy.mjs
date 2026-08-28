export const CATALOG_PATH = "architecture/package-catalog.json";
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

function compareBinary(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function hasExactKeys(value, expected) {
  return isRecord(value)
    && Object.keys(value).sort(compareBinary).join("|") === [...expected].sort(compareBinary).join("|");
}

export function allowedPackageRoles(policy) {
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

export function materializationPlanPath(entry) {
  const encodedId = [...entry.id].map(character => {
    if (character === ".") return "-dot-";
    if (character === "-") return "-dash-";
    return character;
  }).join("");
  return `${MATERIALIZATION_PLAN_DIRECTORY}/${encodedId}.json`;
}

export function catalogPolicy(catalog, allowedRoles) {
  const errors = [];
  const entries = [];
  const entriesById = new Map();
  const entriesByPath = new Map();
  const result = { allowedRoles, catalog, entries, entriesById, entriesByPath, errors };

  if (!hasExactKeys(catalog, CATALOG_ROOT_KEYS)
    || catalog.version !== 1
    || !Array.isArray(catalog.packages)) {
    errors.push(`${CATALOG_PATH} must contain exactly version 1 and a packages array`);
    return result;
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
    if (!PACKAGE_PATH.test(entry.path)) errors.push(`${entry.id}: path must be a normalized directory under packages/`);
    if (!PACKAGE_NAME.test(entry.package_name)) errors.push(`${entry.id}: package_name must use the @agent-teams scope`);
    if (!OWNER_DOCUMENT.test(entry.owner_document)) errors.push(`${entry.id}: owner_document must be an ADR identity`);
    for (const field of Object.keys(seen)) {
      if (seen[field].has(entry[field])) errors.push(`${entry.id}: duplicate ${field} ${entry[field]}`);
      seen[field].add(entry[field]);
    }
    for (const existing of entries) {
      if (pathsOverlap(entry.path, existing.path)) errors.push(`${entry.id}: package path overlaps ${existing.id}`);
    }
    entries.push(entry);
    entriesById.set(entry.id, entry);
    entriesByPath.set(entry.path, entry);
  }
  return result;
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
