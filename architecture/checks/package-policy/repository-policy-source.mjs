import {
  CATALOG_PATH,
  PACKAGE_ID,
  allowedPackageRoles,
  catalogPolicy,
} from "./catalog-policy.mjs";
import {
  PACKAGE_ADMISSION_DIRECTORY,
  packageAdmissionPath,
  validateAdmission,
} from "./admission-policy.mjs";

export function createAdmissionDirectoryEntriesSource({ readDirectory }) {
  return async directoryPath => (await readDirectory(directoryPath, { withFileTypes: true }))
    .map(entry => ({ name: entry.name, isFile: entry.isFile() }))
    .sort((left, right) => left.name < right.name ? -1 : left.name > right.name ? 1 : 0);
}

export function createLoadAllowedPackageRoles({ loadPolicyDocument }) {
  return async root => allowedPackageRoles(await loadPolicyDocument(root));
}

export function createLoadPackagePolicy({
  loadCatalog,
  loadAllowedRoles,
  loadAdmissionDirectory,
}) {
  return async root => {
    const [catalog, allowedRoles, admissionDirectory] = await Promise.all([
      loadCatalog(root),
      loadAllowedRoles(root),
      loadAdmissionDirectory(root),
    ]);
    const { diagnosticGroups, rootValid, ...policy } = catalogPolicy(catalog, allowedRoles);
    const admissionsById = new Map();
    const admissionRecordDigestsById = new Map();
    if (!rootValid) {
      return { ...policy, admissionsById, admissionRecordDigestsById };
    }
    const errors = [...admissionDirectory.errors];
    const expectedAdmissionFiles = new Set();
    for (const { entry, entryErrors, relationErrors } of diagnosticGroups) {
      errors.push(...entryErrors);
      if (entry !== undefined && PACKAGE_ID.test(entry.id)) {
        expectedAdmissionFiles.add(
          packageAdmissionPath(entry).slice(PACKAGE_ADMISSION_DIRECTORY.length + 1),
        );
        try {
          if (!admissionDirectory.available) throw new Error("admission evidence directory is unavailable");
          const { admission, digest } = await admissionDirectory.load(entry);
          validateAdmission(entry, admission, errors);
          admissionsById.set(entry.id, admission);
          admissionRecordDigestsById.set(entry.id, digest);
        } catch (error) {
          errors.push(`${entry.id}: admission evidence is missing or invalid: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
      errors.push(...relationErrors);
    }
    if (admissionDirectory.available) {
      for (const entry of admissionDirectory.entries) {
        if (!entry.isFile || !expectedAdmissionFiles.has(entry.name)) {
          errors.push(`${PACKAGE_ADMISSION_DIRECTORY}/${entry.name}: orphan admission evidence is not declared by ${CATALOG_PATH}`);
        }
      }
    }
    return { ...policy, admissionsById, admissionRecordDigestsById, errors };
  };
}
