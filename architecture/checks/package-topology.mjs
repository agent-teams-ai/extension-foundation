import { execFile } from "node:child_process";
import { readFile, readdir } from "node:fs/promises";
import { dirname, join, posix, relative, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { promisify } from "node:util";

import { parse as parseYaml } from "yaml";

import {
  CATALOG_PATH,
  PACKAGE_NAME,
  PACKAGE_PATH,
  createDocsOwnerResolver,
  isRecord,
  loadAllowedPackageRoles,
  packageOwnerFeatures,
} from "./package-policy.mjs";
import { analyzeSource } from "./source-safety.mjs";

export { createDocsOwnerResolver } from "./package-policy.mjs";

const SOURCE_DEPENDENCIES_PATH = "architecture/foundation/source-dependencies.yaml";
const CATALOG_ROOT_KEYS = ["packages", "version"];
const CATALOG_KEYS = ["id", "owner_document", "package_name", "path", "role"];
const FEATURE_SOURCE = /^src\/features\/([a-z0-9][a-z0-9-]*)\/(.+)$/;
const SOURCE_CODE = /\.(?:ts|tsx|mts|cts)$/;
const FEATURE_TEST = /\.(?:spec|test)\.(?:ts|tsx|mts|cts)$/;
const IGNORED_PACKAGE_DIRECTORIES = new Set([".cache", "coverage", "dist", "node_modules"]);
const ALLOWED_PACKAGES_ROOT_FILES = new Set(["README.md"]);
const ALLOWED_PACKAGE_ENVELOPE_FILES = new Set([
  "CHANGELOG.md",
  "LICENSE",
  "README.md",
  "package.json",
  "tsconfig.json",
]);
const EXPECTED_PACKAGE_CHECK = "pnpm run clean && pnpm run typecheck && pnpm run build && pnpm run test";
const EXPECTED_PACKAGE_TYPECHECK = "tsc --project tsconfig.json --noEmit --pretty false";
const EXPECTED_PACKAGE_TEST = "node --test --test-concurrency=1";
const EXPECTED_PACKAGE_INCLUDE = [
  "src/**/*.ts",
  "src/**/*.tsx",
  "src/**/*.mts",
  "src/**/*.cts",
];
const ROOT_TSCONFIG_PRESET = "@agent-teams/engineering-foundation/presets/typescript/node.json";
const TYPESCRIPT_ROOT = dirname(fileURLToPath(import.meta.resolve("typescript/package.json")));
const TSC_PATH = join(TYPESCRIPT_ROOT, "bin", "tsc");
const execFileAsync = promisify(execFile);

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
    if (entry.isSymbolicLink()) {
      throw new Error(`symbolic links are not allowed in governed package topology: ${relative(root, path)}`);
    }
    if (entry.isDirectory() && isIgnoredPackageDirectory(entry.name)) continue;
    if (entry.isDirectory()) files.push(...await walkFiles(root, path));
    if (entry.isFile()) files.push(relative(root, path).replaceAll("\\", "/"));
  }
  return files;
}

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

function hasExactCatalogShape(entry) {
  return isRecord(entry)
    && Object.keys(entry).sort(compareBinary).join("|") === CATALOG_KEYS.join("|")
    && CATALOG_KEYS.every(key => typeof entry[key] === "string" && entry[key].length > 0);
}

function hasExactCatalogRootShape(catalog) {
  return isRecord(catalog)
    && Object.keys(catalog).sort(compareBinary).join("|") === CATALOG_ROOT_KEYS.join("|")
    && catalog.version === 1
    && Array.isArray(catalog.packages);
}

function isAllowedSourcePath(path) {
  return SOURCE_CODE.test(path) && (
    path === "src/index.ts"
    || path.startsWith("src/composition/")
    || path.startsWith("src/generated/")
    || FEATURE_SOURCE.test(path)
  );
}

function isPathInside(path, parent) {
  return path === parent || path.startsWith(`${parent}/`);
}

function isFilesystemPathInside(path, parent) {
  const relation = relative(parent, path);
  return relation === "" || (relation !== ".." && !relation.startsWith(`..${sep}`));
}

function packageForFile(entriesByPath, filePath) {
  const repositoryPath = `packages/${filePath}`;
  return [...entriesByPath.values()]
    .filter(entry => isPathInside(repositoryPath, entry.path))
    .sort((left, right) => right.path.length - left.path.length || compareBinary(left.path, right.path))[0];
}

function exportedTargets(value) {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) {
    const nested = value.map(exportedTargets);
    return nested.some(entry => entry === undefined) ? undefined : nested.flat();
  }
  if (!isRecord(value)) return undefined;
  const nested = Object.values(value).map(exportedTargets);
  return nested.some(entry => entry === undefined) ? undefined : nested.flat();
}

function hasSafeCuratedExports(manifest) {
  if (!isRecord(manifest.exports) || Object.keys(manifest.exports).length === 0) return false;
  const targets = exportedTargets(manifest.exports);
  return targets !== undefined && targets.length > 0 && targets.every(target => (
    target.startsWith("./dist/")
    && !target.includes("\\")
    && !target.split("/").includes("..")
  ));
}

function unsupportedTsconfigDependencyFeature(config) {
  if (!isRecord(config)) return "tsconfig must be an object";
  if (Object.hasOwn(config, "references")) return "project references";
  const options = config.compilerOptions;
  if (!isRecord(options)) return undefined;
  for (const key of ["baseUrl", "jsxImportSource", "paths", "rootDirs", "typeRoots", "types"]) {
    if (Object.hasOwn(options, key)) return `compilerOptions.${key}`;
  }
  return undefined;
}

async function effectiveTsconfig(path) {
  const { stdout } = await execFileAsync(TSC_PATH, [
    "--project",
    path,
    "--showConfig",
    "--pretty",
    "false",
  ], { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
  return JSON.parse(stdout);
}

function exactStringArray(value, expected) {
  return Array.isArray(value)
    && value.length === expected.length
    && value.every((entry, index) => entry === expected[index]);
}

function ignoredDirectoryInTrackedPath(path) {
  return path.split("/").slice(1).some(isIgnoredPackageDirectory);
}

export function createGitTrackedPackagePathReader(root) {
  return async () => {
    try {
      const { stdout } = await execFileAsync("git", ["-C", root, "ls-files", "-z", "--", "packages"], {
        encoding: "utf8",
        maxBuffer: 16 * 1024 * 1024,
      });
      return stdout.split("\0").filter(Boolean);
    } catch (error) {
      if (error?.code === "ENOENT" || error?.code === 128) return [];
      throw error;
    }
  };
}

function packageEnvelopeError(packagePath, repositoryFilePath) {
  const localPath = repositoryFilePath.slice(`${packagePath}/`.length);
  if (localPath.startsWith("src/") || ALLOWED_PACKAGE_ENVELOPE_FILES.has(localPath)) return undefined;
  return `${repositoryFilePath}: file is outside the package source and approved envelope`;
}

export async function validatePackageTopology({
  root,
  resolveOwner = createDocsOwnerResolver(root),
  readTrackedPackagePaths = createGitTrackedPackagePathReader(root),
}) {
  const errors = [];
  let catalog;
  let allowedRoles;
  try {
    [catalog, allowedRoles] = await Promise.all([
      readJson(join(root, CATALOG_PATH)),
      loadAllowedPackageRoles(root),
    ]);
  } catch (error) {
    return [`package policy: ${error instanceof Error ? error.message : String(error)}`];
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
  const featuresByEntryId = new Map();
  const seen = { id: new Set(), path: new Set(), package_name: new Set() };
  for (const entry of catalog.packages) {
    if (!hasExactCatalogShape(entry)) {
      errors.push(`${CATALOG_PATH}: every entry must contain exactly ${CATALOG_KEYS.join(", ")}`);
      continue;
    }
    if (!allowedRoles.has(entry.role)) errors.push(`${entry.id}: unknown role ${entry.role}`);
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
    for (const existing of entriesByPath.values()) {
      if (isPathInside(entry.path, existing.path) || isPathInside(existing.path, entry.path)) {
        errors.push(`${entry.id}: package path overlaps ${existing.id}`);
      }
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

    const features = packageOwnerFeatures(entry, await resolveOwner(entry.owner_document));
    if (features === undefined) {
      errors.push(`${entry.id}: owner_document must be one effective accepted ADR bound to this exact package and its features`);
    } else {
      featuresByEntryId.set(entry.id, new Set(features));
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
  let trackedPackagePaths;
  try {
    [files, trackedPackagePaths] = await Promise.all([
      walkFiles(join(root, "packages")),
      readTrackedPackagePaths(),
    ]);
  } catch (error) {
    return [...errors, `packages: ${error instanceof Error ? error.message : String(error)}`];
  }
  for (const path of trackedPackagePaths.filter(ignoredDirectoryInTrackedPath)) {
    errors.push(`${path}: tracked files and links cannot hide inside ignored package directories`);
  }

  const manifestPaths = files.filter(path => path.endsWith("package.json"));
  const materializedPaths = new Set(
    manifestPaths.map(path => `packages/${dirname(path)}`.replace(/\/$/, "")),
  );
  for (const path of files) {
    const entry = packageForFile(entriesByPath, path);
    if (entry === undefined) {
      if (!ALLOWED_PACKAGES_ROOT_FILES.has(path)) {
        errors.push(`packages/${path}: file is outside every cataloged package`);
      }
      continue;
    }
    const envelopeError = packageEnvelopeError(entry.path, `packages/${path}`);
    if (envelopeError !== undefined) errors.push(envelopeError);
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
    if (manifest.private !== true) errors.push(`${packagePath}: package must remain private until public SPI evidence exists`);
    if (manifest.type !== "module") errors.push(`${packagePath}: package must use ESM`);
    if (manifest.scripts?.check !== EXPECTED_PACKAGE_CHECK
      || manifest.scripts?.typecheck !== EXPECTED_PACKAGE_TYPECHECK
      || manifest.scripts?.test !== EXPECTED_PACKAGE_TEST) {
      errors.push(`${packagePath}: package must retain the governed check, typecheck, and test scripts`);
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

    const prefix = `${packagePath.slice("packages/".length)}/`;
    const sourceFiles = files
      .filter(path => path.startsWith(`${prefix}src/`))
      .map(path => path.slice(prefix.length));
    const declaredFeatures = featuresByEntryId.get(entry.id);
    const evidenceByFeature = new Map(
      [...(declaredFeatures ?? [])].map(feature => [feature, { implementation: false, test: false }]),
    );
    for (const path of sourceFiles) {
      if (!isAllowedSourcePath(path)) {
        errors.push(`${packagePath}/${path}: source must be TypeScript inside an approved feature, composition, or generated path`);
        continue;
      }
      const source = await readFile(join(root, packagePath, path), "utf8");
      const analysis = analyzeSource(path, source);
      for (const label of analysis.errors) {
        errors.push(`${packagePath}/${path}: ${label} is prohibited until the shared source graph models it`);
      }
      const featureMatch = path.match(FEATURE_SOURCE);
      if (featureMatch === null || declaredFeatures === undefined) continue;
      const feature = featureMatch[1];
      if (!declaredFeatures.has(feature)) {
        errors.push(`${packagePath}/${path}: feature ${feature} is not declared by the package owner ADR`);
        continue;
      }
      const evidence = evidenceByFeature.get(feature);
      if (FEATURE_TEST.test(path)) {
        evidence.test ||= analysis.hasTestRegistration;
      } else if (!path.endsWith(".d.ts") && !/\/index\.(?:ts|tsx|mts|cts)$/u.test(path)) {
        evidence.implementation ||= analysis.hasRuntimeImplementation;
      }
    }
    for (const [feature, evidence] of evidenceByFeature) {
      if (!evidence.implementation) {
        errors.push(`${packagePath}: feature ${feature} requires a value-level runtime implementation`);
      }
      if (!evidence.test) {
        errors.push(`${packagePath}: feature ${feature} requires executable package-specific test evidence`);
      }
    }

    try {
      const tsconfigPath = join(root, packagePath, "tsconfig.json");
      const [rawTsconfig, effective] = await Promise.all([
        readJson(tsconfigPath),
        effectiveTsconfig(tsconfigPath),
      ]);
      const expectedExtends = posix.relative(entry.path, "tsconfig.json");
      if (rawTsconfig.extends !== expectedExtends) {
        errors.push(`${packagePath}/tsconfig.json: extends must target the repository root tsconfig`);
      }
      if (!exactStringArray(rawTsconfig.include, EXPECTED_PACKAGE_INCLUDE) || Object.hasOwn(rawTsconfig, "files")) {
        errors.push(`${packagePath}/tsconfig.json: compiler inputs must use the governed src-only include set`);
      }
      const feature = unsupportedTsconfigDependencyFeature(effective);
      if (feature !== undefined) {
        errors.push(`${packagePath}/tsconfig.json: ${feature} is prohibited until the shared source graph models it`);
      }
      const sourceRoot = resolve(root, packagePath, "src");
      for (const file of effective.files ?? []) {
        if (!isFilesystemPathInside(resolve(dirname(tsconfigPath), file), sourceRoot)) {
          errors.push(`${packagePath}/tsconfig.json: effective compiler input escapes the governed package source root`);
          break;
        }
      }
    } catch (error) {
      errors.push(`${packagePath}/tsconfig.json: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  try {
    const rootTsconfigPath = join(root, "tsconfig.json");
    const [rawRootTsconfig, effectiveRootTsconfig] = await Promise.all([
      readJson(rootTsconfigPath),
      effectiveTsconfig(rootTsconfigPath),
    ]);
    if (rawRootTsconfig.extends !== ROOT_TSCONFIG_PRESET || !exactStringArray(rawRootTsconfig.files, [])) {
      errors.push(`tsconfig.json: root config must extend the pinned Foundation preset with an empty files list`);
    }
    const feature = unsupportedTsconfigDependencyFeature(effectiveRootTsconfig);
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
