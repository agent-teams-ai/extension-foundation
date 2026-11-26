import { lstat } from "node:fs/promises";
import { join } from "node:path";
import {
  PACKAGE_ADMISSION_DIRECTORY,
  createDocsOwnerResolver,
  loadPackagePolicy,
  packageOwnerPolicy,
  requireValidPackagePolicy,
} from "./package-policy.mjs";
import type { PackageCatalogEntry, PackagePolicy } from "./package-policy.mjs";
import { catalogPolicy } from "./package-policy/catalog-policy.mjs";

/** This marker is preparation authority, never an admission or success receipt. */
export interface ScaffoldPreparation {
  readonly ownerDocument: "ADR-0016";
  readonly semanticClassification: "ordinary-library";
}

export interface ScaffoldPolicy extends PackagePolicy {
  readonly preparationsById?: ReadonlyMap<string, ScaffoldPreparation>;
}

interface ProvisionalBoundary extends PackageCatalogEntry {
  readonly feature: string;
}

const provisionalBoundaries: readonly ProvisionalBoundary[] = [
  {
    id: "extension.core", path: "packages/core", package_name: "@extension-foundation/core",
    role: "foundation-component", owner_document: "ADR-0016", feature: "contributions",
  },
  {
    id: "extension.node-artifact", path: "packages/node-artifact", package_name: "@extension-foundation/node-artifact",
    role: "integration-adapter", owner_document: "ADR-0016", feature: "verified-artifact",
  },
];

function matches(entry: PackageCatalogEntry, boundary: ProvisionalBoundary): boolean {
  return entry.id === boundary.id && entry.path === boundary.path &&
    entry.package_name === boundary.package_name && entry.role === boundary.role &&
    entry.owner_document === boundary.owner_document;
}

/** Existing paths, including files and dangling symlinks, must use full policy. */
async function admissionPathExists(root: string): Promise<boolean> {
  const parts = PACKAGE_ADMISSION_DIRECTORY.split("/");
  let current = root;
  for (const part of parts.slice(0, -1)) {
    current = join(current, part);
    const stat = await lstat(current);
    if (!stat.isDirectory() || stat.isSymbolicLink()) {
      throw new Error("scaffold preparation authority ancestors must be real directories");
    }
  }
  try {
    await lstat(join(root, PACKAGE_ADMISSION_DIRECTORY));
    return true;
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") return false;
    throw error;
  }
}

/**
 * Only ADR-0016's two exact ordinary libraries may prepare their qualification
 * subject before the first admission directory exists. Topology/publication
 * continue to call requireValidPackagePolicy and require genuine evidence.
 * The resolver is the existing trusted accepted-ADR port, injectable in tests.
 */
export async function requireValidScaffoldPolicy(
  root: string,
  resolveOwner: (id: string) => Promise<unknown> = createDocsOwnerResolver(root),
): Promise<ScaffoldPolicy> {
  if (await admissionPathExists(root)) return requireValidPackagePolicy(root);

  const loaded = await loadPackagePolicy(root);
  const catalog = catalogPolicy(loaded.catalog, loaded.allowedRoles);
  if (!catalog.rootValid || catalog.errors.length !== 0) {
    throw new Error(`package catalog is invalid: ${catalog.errors.join("; ")}`);
  }
  const preparationsById = new Map<string, ScaffoldPreparation>();
  for (const entry of catalog.entries) {
    const boundary = provisionalBoundaries.find(candidate => matches(entry, candidate));
    if (!boundary) throw new Error(`${entry.id}: scaffold preparation is not authorized by ADR-0016`);
    const owner = packageOwnerPolicy(entry, await resolveOwner(entry.owner_document));
    if (owner?.semanticClassification !== "ordinary-library" || owner.features.length !== 1 || owner.features[0] !== boundary.feature) {
      throw new Error(`${entry.id}: scaffold preparation requires the exact effective accepted ADR-0016 ownership`);
    }
    preparationsById.set(entry.id, Object.freeze({ ownerDocument: "ADR-0016", semanticClassification: "ordinary-library" }));
  }
  // A newly present directory (including invalid evidence) ends preparation.
  if (await admissionPathExists(root)) return requireValidPackagePolicy(root);
  return {
    ...loaded,
    entries: catalog.entries,
    entriesById: catalog.entriesById,
    entriesByPath: catalog.entriesByPath,
    errors: [],
    admissionsById: new Map(),
    admissionRecordDigestsById: new Map(),
    preparationsById,
  };
}
