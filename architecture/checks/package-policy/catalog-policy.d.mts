export interface PackageCatalogEntry {
  readonly id: string;
  readonly path: string;
  readonly package_name: string;
  readonly role: string;
  readonly owner_document: string;
}

/** Actual output of the legacy closed-catalog validator; unknown input is validated. */
export function catalogPolicy(catalog: unknown, allowedRoles: ReadonlySet<string>): {
  readonly rootValid: boolean;
  readonly errors: readonly string[];
  readonly entries: readonly PackageCatalogEntry[];
  readonly entriesById: ReadonlyMap<string, PackageCatalogEntry>;
  readonly entriesByPath: ReadonlyMap<string, PackageCatalogEntry>;
};
