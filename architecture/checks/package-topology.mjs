import { readFile, readdir } from "node:fs/promises";
import { dirname, join, posix, relative } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { docsFind } from "@agent-teams/docs-protocol";
import { parse as parseYaml } from "yaml";

const CATALOG_PATH = "architecture/package-catalog.json";
const DOCS_PROFILE_PATH = "architecture/foundation/docs-protocol.yaml";
const SOURCE_DEPENDENCIES_PATH = "architecture/foundation/source-dependencies.yaml";
const CATALOG_ROOT_KEYS = ["packages", "version"];
const CATALOG_KEYS = ["id", "owner_document", "package_name", "path", "role"];
const ALLOWED_ROLES = new Set([
  "foundation-component",
  "integration-adapter",
  "testing-support",
]);
const ALLOWED_OWNER_TYPES = new Set(["adr"]);
const ALLOWED_OWNER_STATUSES = new Set(["accepted"]);
const PACKAGE_PATH = /^packages\/[a-z0-9][a-z0-9-]*(?:\/[a-z0-9][a-z0-9-]*)*$/;
const PACKAGE_NAME = /^@agent-teams\/[a-z0-9][a-z0-9._-]*$/;
const FEATURE_SOURCE = /^src\/features\/[a-z0-9][a-z0-9-]*\/.+/;
const FEATURE_IMPLEMENTATION = /^src\/features\/[a-z0-9][a-z0-9-]*\/(?!index\.(?:ts|tsx|mts|cts)$).+\.(?:ts|tsx|mts|cts)$/;
const IGNORED_PACKAGE_DIRECTORIES = new Set([".cache", "coverage", "dist", "node_modules"]);
const ALLOWED_PACKAGES_ROOT_FILES = new Set(["README.md"]);
const UNSUPPORTED_SOURCE_PATTERNS = Object.freeze([
  [/@jsxImportSource\b/u, "JSX import-source directives"],
  [/^\s*\/\/\/\s*<reference\b/mu, "triple-slash dependency directives"],
  [/\beval\s*\(/u, "eval-based module loading"],
  [/\b(?:new\s+)?Function\s*\(/u, "Function-constructor module loading"],
  [/\bprocess\s*(?:\.\s*getBuiltinModule|\[\s*["']getBuiltinModule["']\s*\])/u, "process.getBuiltinModule"],
  [/\brequire\s*\(/u, "CommonJS require"],
]);

function isIgnoredPackageDirectory(name) {
  return IGNORED_PACKAGE_DIRECTORIES.has(name) || name.startsWith(".foundation-retired-evidence-");
}

function compareBinary(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

async function walkFiles(root, current = root) {
  let entries;
  try {
    entries = await readdir(current, { withFileTypes: true });
  } catch (error) {
    if (error?.code === "ENOENT") return [];
    throw error;
  }

  const files = [];
  for (const entry of entries.sort((left, right) => compareBinary(left.name, right.name))) {
    const path = join(current, entry.name);
    if (entry.isDirectory() && isIgnoredPackageDirectory(entry.name)) continue;
    if (entry.isSymbolicLink() && isIgnoredPackageDirectory(entry.name)) continue;
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

function hasExactCatalogRootShape(catalog) {
  return isRecord(catalog)
    && Object.keys(catalog).sort(compareBinary).join("|") === CATALOG_ROOT_KEYS.join("|")
    && catalog.version === 1
    && Array.isArray(catalog.packages);
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

function isPathInside(path, parent) {
  return path === parent || path.startsWith(`${parent}/`);
}

function packageForFile(entriesByPath, filePath) {
  const repositoryPath = `packages/${filePath}`;
  return [...entriesByPath.values()]
    .filter(entry => isPathInside(repositoryPath, entry.path))
    .sort((left, right) => right.path.length - left.path.length || compareBinary(left.path, right.path))[0];
}

function exportedTargets(value) {
  if (typeof value === "string") return [value];
  if (!isRecord(value)) return [];
  return Object.values(value).flatMap(exportedTargets);
}

function hasSafeCuratedExports(manifest) {
  if (!isRecord(manifest.exports) || Object.keys(manifest.exports).length === 0) return false;
  const targets = exportedTargets(manifest.exports);
  return targets.length > 0 && targets.every(target => (
    typeof target === "string"
    && target.startsWith("./dist/")
    && !target.includes("\\")
    && !target.split("/").includes("..")
  ));
}

function unsupportedTsconfigDependencyFeature(config) {
  if (!isRecord(config)) return "tsconfig must be an object";
  if (Object.hasOwn(config, "references")) return "project references";
  const options = config.compilerOptions;
  if (!isRecord(options)) return undefined;
  for (const key of ["baseUrl", "jsxImportSource", "paths", "rootDirs"]) {
    if (Object.hasOwn(options, key)) return `compilerOptions.${key}`;
  }
  return undefined;
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
      type: String(documents[0].metadata.type ?? ""),
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

  if (!hasExactCatalogRootShape(catalog)) {
    return [`${CATALOG_PATH} must contain exactly version 1 and a packages array`];
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

  if (sourcePolicy.boundaries.some(boundary => boundary?.id === "repository.packages-closed")) {
    errors.push("repository.packages-closed is obsolete; cataloged package source roots must be governed explicitly");
  }

  const entriesByPath = new Map();
  const entriesById = new Map();
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
    entriesById.set(entry.id, entry);

    const sourceBoundary = sourcePolicy.boundaries.find(
      boundary => boundary?.id === `package.${entry.id}`,
    );
    const expectedRoot = `${entry.path}/src`;
    const expectedEntrypoint = `${expectedRoot}/index.ts`;
    if (!isRecord(sourceBoundary)
      || sourceBoundary.dependencyMode !== "runtime"
      || !Array.isArray(sourceBoundary.roots)
      || sourceBoundary.roots.length !== 1
      || sourceBoundary.roots[0] !== expectedRoot
      || !Array.isArray(sourceBoundary.entrypoints)
      || sourceBoundary.entrypoints.length !== 1
      || sourceBoundary.entrypoints[0] !== expectedEntrypoint) {
      errors.push(`${entry.id}: requires runtime source boundary package.${entry.id} rooted at ${expectedRoot}`);
    }

    if (!Array.isArray(sourcePolicy.governedRoots)
      || !sourcePolicy.governedRoots.includes(expectedRoot)) {
      errors.push(`${entry.id}: ${expectedRoot} must be an explicit governed source root`);
    }

    const owner = await resolveOwner(entry.owner_document);
    if (owner?.id !== entry.owner_document
      || !ALLOWED_OWNER_TYPES.has(owner.type)
      || !ALLOWED_OWNER_STATUSES.has(owner.status)) {
      errors.push(`${entry.id}: owner_document must resolve to one accepted ADR`);
    }
  }

  const packageBoundaries = sourcePolicy.boundaries.filter(
    boundary => typeof boundary?.id === "string" && boundary.id.startsWith("package."),
  );
  for (const boundary of packageBoundaries) {
    const entryId = boundary.id.slice("package.".length);
    if (!entriesById.has(entryId)) {
      errors.push(`${boundary.id}: package boundary has no matching catalog entry`);
    }
  }
  if (Array.isArray(sourcePolicy.governedRoots)) {
    for (const governedRoot of sourcePolicy.governedRoots.filter(rootPath => rootPath.startsWith("packages/"))) {
      if (![...entriesByPath.keys()].some(packagePath => governedRoot === `${packagePath}/src`)) {
        errors.push(`${governedRoot}: governed package root has no matching catalog entry`);
      }
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

  const unregisteredFiles = files.filter(path => (
    !ALLOWED_PACKAGES_ROOT_FILES.has(path) && packageForFile(entriesByPath, path) === undefined
  ));
  for (const path of unregisteredFiles) {
    errors.push(`packages/${path}: file is outside every cataloged package`);
  }

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
    if (manifest.private !== true) errors.push(`${packagePath}: package must remain private until release evidence exists`);
    if (manifest.type !== "module") errors.push(`${packagePath}: package must use ESM`);
    if (typeof manifest.scripts?.check !== "string" || manifest.scripts.check.trim().length === 0) {
      errors.push(`${packagePath}: package must expose a non-empty check script`);
    }
    if (!hasSafeCuratedExports(manifest)) {
      errors.push(`${packagePath}: package exports must be explicit and target only dist/`);
    }
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
    const implementationSources = await Promise.all(sourceFiles
      .filter(path => FEATURE_IMPLEMENTATION.test(path))
      .map(async path => readFile(join(root, packagePath, path), "utf8")));
    if (!implementationSources.some(source => source.trim().length > 0)) {
      errors.push(`${packagePath}: requires a non-empty feature-owned implementation slice`);
    }
    for (const path of sourceFiles) {
      if (!isAllowedSourcePath(path)) {
        errors.push(`${packagePath}/${path}: source must belong to a feature-owned slice`);
      }
      const source = await readFile(join(root, packagePath, path), "utf8");
      for (const [pattern, label] of UNSUPPORTED_SOURCE_PATTERNS) {
        if (pattern.test(source)) {
          errors.push(`${packagePath}/${path}: ${label} are prohibited until the shared source graph models them`);
        }
      }
    }

    try {
      const tsconfig = await readJson(join(root, packagePath, "tsconfig.json"));
      const expectedExtends = posix.relative(entry.path, "tsconfig.json");
      if (tsconfig.extends !== expectedExtends) {
        errors.push(`${packagePath}/tsconfig.json: extends must target the repository root tsconfig`);
      }
      const feature = unsupportedTsconfigDependencyFeature(tsconfig);
      if (feature !== undefined) {
        errors.push(`${packagePath}/tsconfig.json: ${feature} is prohibited until the shared source graph models it`);
      }
    } catch (error) {
      errors.push(`${packagePath}/tsconfig.json: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  try {
    const rootTsconfig = await readJson(join(root, "tsconfig.json"));
    const feature = unsupportedTsconfigDependencyFeature(rootTsconfig);
    if (feature !== undefined) {
      errors.push(`tsconfig.json: ${feature} is prohibited until the shared source graph models it`);
    }
  } catch (error) {
    errors.push(`tsconfig.json: ${error instanceof Error ? error.message : String(error)}`);
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
