import { readFile, readdir } from "node:fs/promises";
import { dirname, join, posix, relative } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { docsFind } from "@agent-teams/docs-protocol";
import { parse as parseYaml } from "yaml";

const CATALOG_PATH = "architecture/package-catalog.json";
const DOCS_PROFILE_PATH = "architecture/foundation/docs-protocol.yaml";
const SOURCE_DEPENDENCIES_PATH = "architecture/foundation/source-dependencies.yaml";
const CATALOG_KEYS = ["id", "owner_document", "package_name", "path", "role"];
const ALLOWED_ROLES = new Set([
  "foundation-component",
  "integration-adapter",
  "testing-support",
]);
const ALLOWED_OWNER_STATUSES = new Set(["accepted", "active"]);
const PACKAGE_PATH = /^packages\/[a-z0-9][a-z0-9-]*(?:\/[a-z0-9][a-z0-9-]*)*$/;
const PACKAGE_NAME = /^@agent-teams\/[a-z0-9][a-z0-9._-]*$/;
const FEATURE_SOURCE = /^src\/features\/[a-z0-9][a-z0-9-]*\/.+/;
const FEATURE_IMPLEMENTATION = /^src\/features\/[a-z0-9][a-z0-9-]*\/(?!index\.(?:ts|tsx|mts|cts)$).+\.(?:ts|tsx|mts|cts)$/;

async function walkFiles(root, current = root) {
  let entries;
  try {
    entries = await readdir(current, { withFileTypes: true });
  } catch (error) {
    if (error?.code === "ENOENT") return [];
    throw error;
  }

  const files = [];
  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    const path = join(current, entry.name);
    if (entry.isSymbolicLink()) {
      throw new Error(`symbolic links are not allowed in governed package topology: ${relative(root, path)}`);
    }
    if (entry.isDirectory()) files.push(...await walkFiles(root, path));
    if (entry.isFile()) files.push(relative(root, path).replaceAll("\\", "/"));
  }
  return files;
}

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactCatalogShape(entry) {
  return isRecord(entry)
    && Object.keys(entry).sort().join("|") === CATALOG_KEYS.join("|")
    && CATALOG_KEYS.every(key => typeof entry[key] === "string" && entry[key].length > 0);
}

function isAllowedSourcePath(path) {
  return path === "src/index.ts"
    || path.startsWith("src/composition/")
    || path.startsWith("src/generated/")
    || FEATURE_SOURCE.test(path);
}

function packageRelativePath(packagePath) {
  return relative("packages", packagePath).replaceAll("\\", "/");
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
    const documents = execution.envelope.result.documents.filter(
      document => document.id === ownerDocumentId,
    );
    if (documents.length !== 1) return undefined;
    return {
      id: documents[0].id,
      status: String(documents[0].metadata.status ?? ""),
    };
  };
}

export async function validatePackageTopology({
  root,
  resolveOwner = createDocsOwnerResolver(root),
}) {
  const errors = [];
  let catalog;
  try {
    catalog = await readJson(join(root, CATALOG_PATH));
  } catch (error) {
    return [`${CATALOG_PATH}: ${error instanceof Error ? error.message : String(error)}`];
  }

  if (!isRecord(catalog) || catalog.version !== 1 || !Array.isArray(catalog.packages)) {
    return [`${CATALOG_PATH} must use version 1 with a packages array`];
  }

  let sourcePolicy;
  try {
    sourcePolicy = parseYaml(await readFile(join(root, SOURCE_DEPENDENCIES_PATH), "utf8"));
  } catch (error) {
    return [`${SOURCE_DEPENDENCIES_PATH}: ${error instanceof Error ? error.message : String(error)}`];
  }
  if (!isRecord(sourcePolicy) || !Array.isArray(sourcePolicy.boundaries)) {
    return [`${SOURCE_DEPENDENCIES_PATH} must declare architecture boundaries`];
  }

  const closedBoundary = sourcePolicy.boundaries.find(
    boundary => boundary?.id === "repository.packages-closed",
  );
  if (!isRecord(closedBoundary)
    || closedBoundary.dependencyMode !== "runtime"
    || !Array.isArray(closedBoundary.roots)
    || !closedBoundary.roots.includes("packages")
    || !Array.isArray(closedBoundary.entrypoints)
    || closedBoundary.entrypoints.length !== 0
    || !isRecord(closedBoundary.allow)
    || !["boundaries", "packages", "builtins", "runtimeReferences"].every(
      key => Array.isArray(closedBoundary.allow[key]) && closedBoundary.allow[key].length === 0,
    )) {
    errors.push("repository.packages-closed must remain a deny-all fallback boundary");
  }

  const entriesByPath = new Map();
  const seen = { id: new Set(), path: new Set(), package_name: new Set() };
  for (const entry of catalog.packages) {
    if (!hasExactCatalogShape(entry)) {
      errors.push(`${CATALOG_PATH}: every entry must contain exactly ${CATALOG_KEYS.join(", ")}`);
      continue;
    }
    if (!ALLOWED_ROLES.has(entry.role)) errors.push(`${entry.id}: unknown role ${entry.role}`);
    if (!PACKAGE_PATH.test(entry.path) || posix.normalize(entry.path) !== entry.path) {
      errors.push(`${entry.id}: path must be a normalized directory under packages/`);
    }
    if (!PACKAGE_NAME.test(entry.package_name)) {
      errors.push(`${entry.id}: package_name must use the @agent-teams scope`);
    }
    for (const field of Object.keys(seen)) {
      if (seen[field].has(entry[field])) errors.push(`${entry.id}: duplicate ${field} ${entry[field]}`);
      seen[field].add(entry[field]);
    }
    entriesByPath.set(entry.path, entry);

    const sourceBoundary = sourcePolicy.boundaries.find(
      boundary => boundary?.id === `package.${entry.id}`,
    );
    const expectedRoot = `${entry.path}/src`;
    const expectedEntrypoint = `${expectedRoot}/index.ts`;
    if (!isRecord(sourceBoundary)
      || sourceBoundary.dependencyMode !== "runtime"
      || !Array.isArray(sourceBoundary.roots)
      || !sourceBoundary.roots.includes(expectedRoot)
      || !Array.isArray(sourceBoundary.entrypoints)
      || !sourceBoundary.entrypoints.includes(expectedEntrypoint)) {
      errors.push(`${entry.id}: requires runtime source boundary package.${entry.id} rooted at ${expectedRoot}`);
    }

    const owner = await resolveOwner(entry.owner_document);
    if (owner?.id !== entry.owner_document || !ALLOWED_OWNER_STATUSES.has(owner.status)) {
      errors.push(`${entry.id}: owner_document must resolve to one accepted or active document`);
    }
  }

  let files;
  try {
    files = await walkFiles(join(root, "packages"));
  } catch (error) {
    return [...errors, `packages: ${error instanceof Error ? error.message : String(error)}`];
  }
  const manifestPaths = files.filter(path => path.endsWith("package.json"));
  const materializedPaths = new Set(
    manifestPaths.map(path => `packages/${dirname(path)}`.replace(/\/$/, "")),
  );

  for (const entry of entriesByPath.values()) {
    if (!materializedPaths.has(entry.path)) {
      errors.push(`${entry.path}: catalog entry must be materialized with its real feature slice in the same change`);
    }
  }

  for (const manifestPath of manifestPaths) {
    const packagePath = `packages/${dirname(manifestPath)}`.replace(/\/$/, "");
    const entry = entriesByPath.get(packagePath);
    if (entry === undefined) {
      errors.push(`${packagePath}: materialized package is absent from the package catalog`);
      continue;
    }

    let manifest;
    try {
      manifest = await readJson(join(root, packagePath, "package.json"));
    } catch (error) {
      errors.push(`${packagePath}/package.json: ${error instanceof Error ? error.message : String(error)}`);
      continue;
    }
    if (manifest.name !== entry.package_name) errors.push(`${packagePath}: package name differs from catalog`);
    if (manifest.type !== "module") errors.push(`${packagePath}: package must use ESM`);
    if (manifest.agentTeamsArchitecture?.role !== entry.role) {
      errors.push(`${packagePath}: manifest role differs from catalog`);
    }
    if (manifest.agentTeamsArchitecture?.ownerDocument !== entry.owner_document) {
      errors.push(`${packagePath}: manifest owner differs from catalog`);
    }

    const prefix = `${packageRelativePath(packagePath)}/`;
    const sourceFiles = files
      .filter(path => path.startsWith(`${prefix}src/`))
      .map(path => path.slice(prefix.length));
    if (!sourceFiles.some(path => FEATURE_IMPLEMENTATION.test(path))) {
      errors.push(`${packagePath}: requires a non-empty feature-owned implementation slice`);
    }
    for (const path of sourceFiles) {
      if (!isAllowedSourcePath(path)) {
        errors.push(`${packagePath}/${path}: source must belong to a feature-owned slice`);
      }
    }
  }

  return errors;
}

async function runCli() {
  const root = fileURLToPath(new URL("../..", import.meta.url));
  const errors = await validatePackageTopology({ root });
  if (errors.length === 0) {
    console.log("Package topology check passed.");
    return;
  }
  for (const error of errors) console.error(`ERROR ${error}`);
  process.exitCode = 1;
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await runCli();
}
