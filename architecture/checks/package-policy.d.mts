import type { PackageCatalogEntry } from "./package-policy/catalog-policy.mjs";
export type { PackageCatalogEntry } from "./package-policy/catalog-policy.mjs";

export const CONFORMANCE_VERSION: RegExp;

/** Typed boundary for the existing repository-owned JavaScript policy loader. */
export interface PackagePolicy {
  readonly allowedRoles: ReadonlySet<string>;
  readonly catalog: unknown;
  readonly entries: readonly PackageCatalogEntry[];
  readonly entriesById: ReadonlyMap<string, PackageCatalogEntry>;
  readonly entriesByPath: ReadonlyMap<string, PackageCatalogEntry>;
  readonly errors: readonly string[];
  readonly admissionsById: ReadonlyMap<string, unknown>;
  readonly admissionRecordDigestsById: ReadonlyMap<string, string>;
}

export interface PackageOwnerPolicy {
  readonly packageId: string;
  readonly packageName: string;
  readonly packagePath: string;
  readonly semanticClassification: "ordinary-library" | "foundation-module-semantics";
  readonly features: readonly string[];
}

export const PACKAGE_ADMISSION_DIRECTORY: string;
export function loadPackagePolicy(root: string): Promise<PackagePolicy>;
export function requireValidPackagePolicy(root: string): Promise<PackagePolicy>;
export function packageAdmissionVerificationRequest(
  entry: PackageCatalogEntry,
  admission: unknown,
  admissionRecordDigest: string | undefined,
): {
  readonly packageId: string;
  readonly admissionRecordDigest: string;
  readonly requiredGateId: string;
};
export function admissionVerificationReceiptMatches(request: unknown, receipt: unknown): boolean;
export function createDocsOwnerResolver(root: string): (id: string) => Promise<unknown>;
export function packageOwnerPolicy(entry: PackageCatalogEntry, owner: unknown): PackageOwnerPolicy | undefined;
