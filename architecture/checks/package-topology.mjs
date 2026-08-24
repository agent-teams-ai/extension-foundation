import { execFile } from "node:child_process";
import { readFile, readdir } from "node:fs/promises";
import { dirname, isAbsolute, join, posix, relative, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { isDeepStrictEqual, promisify } from "node:util";

import { readScaffoldPlanFile } from "@agent-teams/engineering-foundation/scaffolding";
import { parse as parseYaml } from "yaml";

import {
  createDocsOwnerCatalog,
  hasCanonicalPackageRootExports,
  isRecord,
  loadPackagePolicy,
  materializationPlanPath,
  packageOwnerFeatures,
} from "./package-policy.mjs";
import { analyzeSource } from "./source-safety.mjs";

export { createDocsOwnerResolver } from "./package-policy.mjs";

const SOURCE_DEPENDENCIES_PATH = "architecture/foundation/source-dependencies.yaml";
const FEATURE_SOURCE = /^src\/features\/([a-z0-9][a-z0-9-]*)\/(.+)$/;
const FEATURE_TEST_SOURCE = /^test\/features\/([a-z0-9][a-z0-9-]*)\/(.+\.(?:spec|test)\.(?:ts|tsx|mts|cts))$/;
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

function isAllowedSourcePath(path) {
  return SOURCE_CODE.test(path) && (
    path === "src/index.ts"
    || (FEATURE_SOURCE.test(path) && !FEATURE_TEST.test(path))
  );
}

function isAllowedTestPath(path) {
  return FEATURE_TEST_SOURCE.test(path);
}

function isPathInside(path, parent) {
  return path === parent || path.startsWith(`${parent}/`);
}

export function isFilesystemPathInside(path, parent, pathApi = { isAbsolute, relative, sep }) {
  const relation = pathApi.relative(parent, path);
  return relation === "" || (
    !pathApi.isAbsolute(relation)
    && relation !== ".."
    && !relation.startsWith(`..${pathApi.sep}`)
  );
}

function packageForFile(entriesByPath, filePath) {
  const repositoryPath = `packages/${filePath}`;
  return [...entriesByPath.values()]
    .filter(entry => isPathInside(repositoryPath, entry.path))
    .sort((left, right) => right.path.length - left.path.length || compareBinary(left.path, right.path))[0];
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
  const { stdout } = await execFileAsync(process.execPath, [
    TSC_PATH,
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

function exactKeys(value, expected) {
  return isRecord(value)
    && exactStringArray(Object.keys(value).sort(compareBinary), [...expected].sort(compareBinary));
}

function hasBoundaryEnvelope(boundary, {
  dependencyMode,
  roots,
  entrypoints,
}) {
  return isRecord(boundary)
    && boundary.dependencyMode === dependencyMode
    && exactStringArray(boundary.roots, roots)
    && exactStringArray(boundary.entrypoints, entrypoints)
    && isRecord(boundary.allow)
    && ["boundaries", "packages", "builtins", "runtimeReferences"]
      .every(key => Array.isArray(boundary.allow[key]));
}

function ignoredDirectoryInTrackedPath(path) {
  return path.split("/").slice(1).some(isIgnoredPackageDirectory);
}

export function createGitTrackedPackagePathReader(root) {
  return async () => {
    const { stdout } = await execFileAsync(
      "git",
      ["-C", root, "ls-files", "--stage", "-z", "--", "packages"],
      { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 },
    );
    return stdout.split("\0").filter(Boolean).map(record => {
      const separator = record.indexOf("\t");
      const metadata = record.slice(0, separator).split(" ");
      if (separator < 0 || metadata.length !== 3 || !/^[0-7]{6}$/u.test(metadata[0])) {
        throw new Error("git returned an invalid tracked package record");
      }
      return { mode: metadata[0], path: record.slice(separator + 1) };
    });
  };
}

function normalizeTrackedPackageRecord(record) {
  if (typeof record === "string") return { mode: "100644", path: record };
  if (isRecord(record) && typeof record.mode === "string" && typeof record.path === "string") {
    return record;
  }
  throw new Error("tracked package evidence must contain mode and path");
}

function trackedPackageRecordError(record) {
  if (record.mode === "120000") {
    return `${record.path}: tracked symbolic links are not allowed in governed packages`;
  }
  if (record.mode === "160000") {
    return `${record.path}: gitlinks and submodules are not allowed in governed packages`;
  }
  if (ignoredDirectoryInTrackedPath(record.path)) {
    return `${record.path}: tracked files cannot hide inside ignored package directories`;
  }
  return undefined;
}

function exactCompilerOutputPath(configPath, value, expected) {
  if (typeof value !== "string") return false;
  return resolve(dirname(configPath), value) === expected;
}

function hasNoCompilerInputs(config) {
  return config.files === undefined || exactStringArray(config.files, []);
}

function rawRootTsconfigIsGoverned(config) {
  return exactKeys(config, ["compilerOptions", "extends", "files"])
    && config.extends === ROOT_TSCONFIG_PRESET
    && exactStringArray(config.files, [])
    && exactKeys(config.compilerOptions, ["composite", "noEmit"])
    && config.compilerOptions.composite === true
    && config.compilerOptions.noEmit === true;
}

function effectivePackageOutputsAreGoverned(configPath, config, packageRoot) {
  const options = config.compilerOptions;
  return isRecord(options)
    && !Object.hasOwn(options, "declarationDir")
    && exactCompilerOutputPath(configPath, options.outDir, join(packageRoot, "dist"))
    && exactCompilerOutputPath(configPath, options.rootDir, join(packageRoot, "src"))
    && exactCompilerOutputPath(
      configPath,
      options.tsBuildInfoFile,
      join(packageRoot, ".cache/tsconfig.tsbuildinfo"),
    );
}

function packageEnvelopeError(packagePath, repositoryFilePath) {
  const localPath = repositoryFilePath.slice(`${packagePath}/`.length);
  if (localPath.startsWith("src/")
    || localPath.startsWith("test/")
    || ALLOWED_PACKAGE_ENVELOPE_FILES.has(localPath)) return undefined;
  return `${repositoryFilePath}: file is outside the package source and approved envelope`;
}

async function readFoundationMaterializationPlan(root, entry) {
  return readScaffoldPlanFile(root, materializationPlanPath(entry));
}

function plannedJson(plan, path) {
  const operations = plan.operations.filter(operation => operation.path === path);
  if (operations.length !== 1 || operations[0].kind !== "materialize-file") {
    throw new Error(`materialization plan must create exactly one ${path}`);
  }
  return JSON.parse(Buffer.from(operations[0].after.contentBase64, "base64").toString("utf8"));
}

function materializationEnvelope(plan, entry) {
  if (plan.compiler?.id !== "@agent-teams/engineering-foundation"
    || plan.target?.id !== entry.id
    || plan.target?.path !== entry.path
    || plan.target?.packageName !== entry.package_name
    || plan.target?.role !== entry.role
    || plan.target?.ownerDocument?.id !== entry.owner_document) {
    throw new Error("materialization plan target differs from the package catalog");
  }
  return {
    manifest: plannedJson(plan, `${entry.path}/package.json`),
    tsconfig: plannedJson(plan, `${entry.path}/tsconfig.json`),
  };
}

function sourceDependencyCandidates(fromPath, specifier) {
  if (!specifier.startsWith(".")) return [];
  const normalized = posix.normalize(posix.join(posix.dirname(fromPath), specifier));
  if (normalized === ".." || normalized.startsWith("../") || normalized.startsWith("/")) return [];
  const extension = posix.extname(normalized);
  if (extension === ".js") return [`${normalized.slice(0, -3)}.ts`, `${normalized.slice(0, -3)}.tsx`];
  if (extension === ".mjs") return [`${normalized.slice(0, -4)}.mts`];
  if (extension === ".cjs") return [`${normalized.slice(0, -4)}.cts`];
  if (SOURCE_CODE.test(normalized)) return [normalized];
  return [
    `${normalized}.ts`,
    `${normalized}.tsx`,
    `${normalized}.mts`,
    `${normalized}.cts`,
    `${normalized}/index.ts`,
    `${normalized}/index.tsx`,
    `${normalized}/index.mts`,
    `${normalized}/index.cts`,
  ];
}

function resolveSourceDependency(fromPath, specifier, sourcePaths) {
  const matches = sourceDependencyCandidates(fromPath, specifier)
    .filter(candidate => sourcePaths.has(candidate));
  return matches.length === 1 ? matches[0] : undefined;
}

function exportReachable(fromPath, targetPath, analyses, sourcePaths) {
  const pending = [fromPath];
  const visited = new Set();
  while (pending.length > 0) {
    const current = pending.shift();
    if (current === targetPath) return true;
    if (visited.has(current)) continue;
    visited.add(current);
    const analysis = analyses.get(current);
    if (analysis === undefined) continue;
    for (const dependency of analysis.staticModuleDependencies) {
      if (dependency.kind !== "export") continue;
      const resolved = resolveSourceDependency(current, dependency.specifier, sourcePaths);
      if (resolved !== undefined && !visited.has(resolved)) pending.push(resolved);
    }
  }
  return false;
}

function exportedImplementationReachable(
  fromPath,
  requiredPath,
  analyses,
  sourcePaths,
  isImplementationPath,
) {
  const namesByPath = new Map();
  for (const [path, analysis] of analyses) {
    const names = new Set(analysis.localRuntimeExportNames ?? []);
    for (const dependency of analysis.staticModuleDependencies) {
      if (dependency.kind === "export" && dependency.exportedName !== undefined) {
        names.add(dependency.exportedName);
      }
    }
    namesByPath.set(path, names);
  }

  let changed = true;
  while (changed) {
    changed = false;
    for (const [path, analysis] of analyses) {
      const names = namesByPath.get(path);
      for (const dependency of analysis.staticModuleDependencies) {
        if (dependency.kind !== "export"
          || dependency.exportAll !== true
          || dependency.exportedName !== undefined) continue;
        const resolved = resolveSourceDependency(path, dependency.specifier, sourcePaths);
        if (resolved === undefined) continue;
        for (const name of namesByPath.get(resolved) ?? []) {
          if (name === "default" || names.has(name)) continue;
          names.add(name);
          changed = true;
        }
      }
    }
  }

  const memo = new Map();
  const resolving = new Set();
  const absent = { present: false, implementation: false, binding: undefined };
  const resolveExport = (path, name, throughRequired) => {
    const reachesRequired = throughRequired || path === requiredPath;
    const key = `${path}\0${name}\0${reachesRequired ? "through" : "outside"}`;
    if (memo.has(key)) return memo.get(key);
    if (resolving.has(key)) return absent;
    resolving.add(key);

    const analysis = analyses.get(path);
    if (analysis === undefined) {
      resolving.delete(key);
      return absent;
    }
    const localNames = new Set(analysis.localRuntimeExportNames ?? []);
    const implementations = new Set(analysis.exportedRuntimeImplementationNames ?? []);
    const explicit = analysis.staticModuleDependencies.filter(dependency => (
      dependency.kind === "export" && dependency.exportedName === name
    ));

    let result;
    if (localNames.has(name) || explicit.length > 0) {
      if ((localNames.has(name) ? 1 : 0) + explicit.length !== 1) {
        result = { present: true, implementation: false, binding: undefined };
      } else if (localNames.has(name)) {
        result = {
          present: true,
          implementation: reachesRequired
            && isImplementationPath(path)
            && implementations.has(name),
          binding: `${path}\0${name}`,
        };
      } else {
        const dependency = explicit[0];
        const resolved = resolveSourceDependency(path, dependency.specifier, sourcePaths);
        if (resolved === undefined) {
          result = absent;
        } else if (dependency.exportAll === true) {
          const candidates = [...(namesByPath.get(resolved) ?? [])]
            .map(candidate => resolveExport(resolved, candidate, reachesRequired))
            .filter(candidate => candidate.implementation);
          result = {
            present: true,
            implementation: candidates.length > 0,
            binding: `namespace\0${resolved}`,
          };
        } else {
          result = resolveExport(resolved, dependency.importedName, reachesRequired);
        }
      }
    } else if (name === "default") {
      result = absent;
    } else {
      const candidates = [];
      for (const dependency of analysis.staticModuleDependencies) {
        if (dependency.kind !== "export"
          || dependency.exportAll !== true
          || dependency.exportedName !== undefined) continue;
        const resolved = resolveSourceDependency(path, dependency.specifier, sourcePaths);
        if (resolved === undefined) continue;
        const candidate = resolveExport(resolved, name, reachesRequired);
        if (candidate.present) candidates.push(candidate);
      }
      const bindings = new Set(candidates.map(candidate => candidate.binding));
      if (candidates.length === 0) {
        result = absent;
      } else if (bindings.size === 1 && !bindings.has(undefined)) {
        result = {
          ...candidates[0],
          implementation: candidates.some(candidate => candidate.implementation),
        };
      } else {
        result = { present: false, implementation: false, binding: undefined };
      }
    }

    resolving.delete(key);
    memo.set(key, result);
    return result;
  };

  return [...(namesByPath.get(fromPath) ?? [])]
    .some(name => resolveExport(fromPath, name, false).implementation);
}

export async function validatePackageTopology({
  root,
  resolveOwner,
  listEffectiveOwners,
  loadMaterializationPlan = readFoundationMaterializationPlan,
  readTrackedPackagePaths = createGitTrackedPackagePathReader(root),
}) {
  const errors = [];
  if (resolveOwner === undefined || listEffectiveOwners === undefined) {
    const ownerCatalog = createDocsOwnerCatalog(root);
    resolveOwner ??= ownerCatalog.resolve;
    listEffectiveOwners ??= ownerCatalog.listEffective;
  }
  let packagePolicy;
  try {
    packagePolicy = await loadPackagePolicy(root);
  } catch (error) {
    return [`package policy: ${error instanceof Error ? error.message : String(error)}`];
  }
  if (packagePolicy.errors.length !== 0) return packagePolicy.errors;

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

  const { entriesByPath } = packagePolicy;
  const featuresByEntryId = new Map();
  for (const entry of packagePolicy.entries) {
    const features = packageOwnerFeatures(entry, await resolveOwner(entry.owner_document));
    if (features === undefined) {
      errors.push(`${entry.id}: owner_document must be one effective accepted ADR bound to this exact package and its features`);
    } else {
      featuresByEntryId.set(entry.id, new Set(features));
    }
  }
  try {
    const ownershipIdentities = new Set();
    for (const owner of await listEffectiveOwners()) {
      for (const issue of owner.packageOwnershipErrors ?? []) {
        errors.push(`${owner.id}: ${issue}`);
      }
      for (const ownership of owner.packageOwnership ?? []) {
        const identity = `${owner.id}\0${ownership.packageId}\0${ownership.packageName}\0${ownership.packagePath}`;
        if (ownershipIdentities.has(identity)) {
          errors.push(`${owner.id}: duplicate package ownership declaration for ${ownership.packageId}`);
          continue;
        }
        ownershipIdentities.add(identity);
        const entry = packagePolicy.entriesById.get(ownership.packageId);
        if (entry === undefined
          || entry.owner_document !== owner.id
          || entry.package_name !== ownership.packageName
          || entry.path !== ownership.packagePath) {
          errors.push(`${owner.id}: package ownership ${ownership.packageId} requires one exact package catalog entry`);
        }
      }
    }
  } catch (error) {
    errors.push(`package ownership documents: ${error instanceof Error ? error.message : String(error)}`);
  }

  const expectedPackageBoundaryIds = new Set();
  for (const entry of packagePolicy.entries) {
    const ownedFeatures = featuresByEntryId.get(entry.id);
    if (ownedFeatures === undefined) continue;
    const features = [...ownedFeatures].sort(compareBinary);
    const runtimeRoot = `${entry.path}/src`;
    const testRoot = `${entry.path}/test`;
    const publicBoundaryId = `package.${entry.id}`;
    const featureBoundaryIds = features.map(feature => `package.${entry.id}.feature.${feature}`);
    const publicBoundary = sourcePolicy.boundaries.find(boundary => boundary?.id === publicBoundaryId);
    expectedPackageBoundaryIds.add(publicBoundaryId);
    if (!hasBoundaryEnvelope(publicBoundary, {
      dependencyMode: "runtime",
      roots: [runtimeRoot],
      entrypoints: [`${runtimeRoot}/index.ts`],
    }) || !exactStringArray(publicBoundary.allow.boundaries, featureBoundaryIds)
      || !exactStringArray(publicBoundary.allow.packages, [])
      || !exactStringArray(publicBoundary.allow.builtins, [])
      || !exactStringArray(publicBoundary.allow.runtimeReferences, [])) {
      errors.push(`${entry.id}: requires a closed public boundary ${publicBoundaryId} over ${runtimeRoot}`);
    }
    for (const [index, feature] of features.entries()) {
      const featureBoundaryId = featureBoundaryIds[index];
      const featureRoot = `${runtimeRoot}/features/${feature}`;
      const testBoundaryId = `${featureBoundaryId}.test`;
      const featureBoundary = sourcePolicy.boundaries.find(boundary => boundary?.id === featureBoundaryId);
      const testBoundary = sourcePolicy.boundaries.find(boundary => boundary?.id === testBoundaryId);
      expectedPackageBoundaryIds.add(featureBoundaryId);
      expectedPackageBoundaryIds.add(testBoundaryId);
      if (!hasBoundaryEnvelope(featureBoundary, {
        dependencyMode: "runtime",
        roots: [featureRoot],
        entrypoints: [`${featureRoot}/index.ts`],
      }) || featureBoundary.allow.boundaries.some(target => !featureBoundaryIds.includes(target))) {
        errors.push(`${entry.id}: feature ${feature} requires runtime boundary ${featureBoundaryId}`);
      }
      if (!hasBoundaryEnvelope(testBoundary, {
        dependencyMode: "development",
        roots: [`${testRoot}/features/${feature}`],
        entrypoints: [],
      }) || !exactStringArray(testBoundary.allow.boundaries, [featureBoundaryId])
        || !testBoundary.allow.builtins.includes("node:test")) {
        errors.push(`${entry.id}: feature ${feature} requires development boundary ${testBoundaryId}`);
      }
    }
    if (!Array.isArray(sourcePolicy.governedRoots)
      || !sourcePolicy.governedRoots.includes(runtimeRoot)
      || !sourcePolicy.governedRoots.includes(testRoot)) {
      errors.push(`${entry.id}: ${runtimeRoot} and ${testRoot} must be explicit governed roots`);
    }
  }

  for (const boundary of sourcePolicy.boundaries.filter(
    candidate => typeof candidate?.id === "string" && candidate.id.startsWith("package."),
  )) {
    const belongsToValidCatalogEntry = packagePolicy.entries.some(entry => (
      featuresByEntryId.has(entry.id)
      && (boundary.id === `package.${entry.id}` || boundary.id.startsWith(`package.${entry.id}.`))
    ));
    if (!expectedPackageBoundaryIds.has(boundary.id)
      && (belongsToValidCatalogEntry || !packagePolicy.entries.some(entry => (
        boundary.id === `package.${entry.id}` || boundary.id.startsWith(`package.${entry.id}.`)
      )))) {
      errors.push(`${boundary.id}: package boundary has no matching catalog feature role`);
    }
  }
  if (Array.isArray(sourcePolicy.governedRoots)) {
    const expectedPackageRoots = new Set(
      packagePolicy.entries.flatMap(entry => [`${entry.path}/src`, `${entry.path}/test`]),
    );
    for (const governedRoot of sourcePolicy.governedRoots.filter(rootPath => rootPath.startsWith("packages/"))) {
      if (!expectedPackageRoots.has(governedRoot)) {
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
  for (const rawRecord of trackedPackagePaths) {
    const record = normalizeTrackedPackageRecord(rawRecord);
    const error = trackedPackageRecordError(record);
    if (error !== undefined) errors.push(error);
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

    let plannedEnvelope;
    try {
      plannedEnvelope = materializationEnvelope(
        await loadMaterializationPlan(root, entry),
        entry,
      );
    } catch (error) {
      errors.push(`${packagePath}: ${error instanceof Error ? error.message : String(error)}`);
    }

    let manifest;
    try {
      manifest = await readJson(join(root, packagePath, "package.json"));
    } catch (error) {
      errors.push(`${packagePath}/package.json: ${error instanceof Error ? error.message : String(error)}`);
      continue;
    }
    if (manifest.name !== entry.package_name) errors.push(`${packagePath}: package name differs from catalog`);
    if (manifest.version !== "0.0.0") errors.push(`${packagePath}: initial private package version must remain 0.0.0`);
    if (manifest.private !== true) errors.push(`${packagePath}: package must remain private until public SPI evidence exists`);
    if (manifest.type !== "module") errors.push(`${packagePath}: package must use ESM`);
    if (plannedEnvelope !== undefined
      && !isDeepStrictEqual(manifest.scripts, plannedEnvelope.manifest.scripts)) {
      errors.push(`${packagePath}: package scripts differ from the reviewed Foundation materialization plan`);
    }
    if (plannedEnvelope !== undefined
      && !isDeepStrictEqual(manifest.exports, plannedEnvelope.manifest.exports)) {
      errors.push(`${packagePath}: package exports differ from the reviewed Foundation materialization plan`);
    }
    if (!exactStringArray(manifest.files, ["dist"])) errors.push(`${packagePath}: package files must contain only dist`);
    if (!hasCanonicalPackageRootExports(manifest)) {
      errors.push(`${packagePath}: package exports must be explicit and target only dist/`);
    }
    if (manifest.agentTeamsArchitecture?.role !== entry.role) {
      errors.push(`${packagePath}: manifest role differs from catalog`);
    }
    if (manifest.agentTeamsArchitecture?.ownerDocument !== entry.owner_document) {
      errors.push(`${packagePath}: manifest owner differs from catalog`);
    }

    const prefix = `${packagePath.slice("packages/".length)}/`;
    const packageCodeFiles = files
      .filter(path => path.startsWith(`${prefix}src/`) || path.startsWith(`${prefix}test/`))
      .map(path => path.slice(prefix.length));
    const declaredFeatures = featuresByEntryId.get(entry.id);
    const evidenceByFeature = new Map(
      [...(declaredFeatures ?? [])].map(feature => [feature, {
        entrypoint: false,
        implementation: false,
        test: false,
      }]),
    );
    const analysesByPath = new Map();
    const sourcePaths = new Set(packageCodeFiles.filter(path => path.startsWith("src/")));
    for (const path of packageCodeFiles) {
      const isRuntimeSource = path.startsWith("src/");
      if ((isRuntimeSource && !isAllowedSourcePath(path))
        || (!isRuntimeSource && !isAllowedTestPath(path))) {
        errors.push(`${packagePath}/${path}: code must be runtime TypeScript under src/features or test evidence under test/features`);
        continue;
      }
      const source = await readFile(join(root, packagePath, path), "utf8");
      const analysis = analyzeSource(path, source);
      analysesByPath.set(path, analysis);
      for (const label of analysis.errors) {
        errors.push(`${packagePath}/${path}: ${label} is prohibited until the shared source graph models it`);
      }
      const featureMatch = path.match(isRuntimeSource ? FEATURE_SOURCE : FEATURE_TEST_SOURCE);
      if (featureMatch === null || declaredFeatures === undefined) continue;
      const feature = featureMatch[1];
      if (!declaredFeatures.has(feature)) {
        errors.push(`${packagePath}/${path}: feature ${feature} is not declared by the package owner ADR`);
        continue;
      }
      const evidence = evidenceByFeature.get(feature);
      if (isRuntimeSource && path === `src/features/${feature}/index.ts`) {
        evidence.entrypoint = true;
      }
    }
    for (const [feature, evidence] of evidenceByFeature) {
      const packageEntrypoint = "src/index.ts";
      const featureEntrypoint = `src/features/${feature}/index.ts`;
      const featureRoot = `src/features/${feature}/`;
      evidence.entrypoint &&= exportReachable(
        packageEntrypoint,
        featureEntrypoint,
        analysesByPath,
        sourcePaths,
      );
      evidence.implementation = exportedImplementationReachable(
        packageEntrypoint,
        featureEntrypoint,
        analysesByPath,
        sourcePaths,
        path => (
          path.startsWith(featureRoot)
          && path !== featureEntrypoint
          && !path.endsWith(".d.ts")
        ),
      );
      evidence.test = [...analysesByPath].some(([path, analysis]) => (
        path.startsWith(`test/features/${feature}/`)
        && analysis.hasTestRegistration
        && analysis.observedRuntimeImportSources.some(specifier => (
          resolveSourceDependency(path, specifier, sourcePaths) === featureEntrypoint
        ))
      ));
      if (!evidence.entrypoint) {
        errors.push(`${packagePath}: public package export must reach feature ${feature} through its index.ts entrypoint`);
      }
      if (!evidence.implementation) {
        errors.push(`${packagePath}: feature ${feature} entrypoint must publicly reach a value-level runtime implementation`);
      }
      if (!evidence.test) {
        errors.push(`${packagePath}: feature ${feature} requires an executable assertion over a value imported from its feature entrypoint`);
      }
    }

    try {
      const tsconfigPath = join(root, packagePath, "tsconfig.json");
      const [rawTsconfig, effective] = await Promise.all([
        readJson(tsconfigPath),
        effectiveTsconfig(tsconfigPath),
      ]);
      if (plannedEnvelope !== undefined
        && !isDeepStrictEqual(rawTsconfig, plannedEnvelope.tsconfig)) {
        errors.push(`${packagePath}/tsconfig.json: config differs from the reviewed Foundation materialization plan`);
      }
      const feature = unsupportedTsconfigDependencyFeature(effective);
      if (feature !== undefined) {
        errors.push(`${packagePath}/tsconfig.json: ${feature} is prohibited until the shared source graph models it`);
      }
      const sourceRoot = resolve(root, packagePath, "src");
      if (!effectivePackageOutputsAreGoverned(
        tsconfigPath,
        effective,
        resolve(root, packagePath),
      )) {
        errors.push(`${packagePath}/tsconfig.json: effective compiler outputs must stay in governed package directories`);
      }
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
    if (!rawRootTsconfigIsGoverned(rawRootTsconfig)) {
      errors.push(`tsconfig.json: root config must exactly extend the pinned Foundation preset without compiler inputs`);
    }
    const feature = unsupportedTsconfigDependencyFeature(effectiveRootTsconfig);
    if (feature !== undefined) {
      errors.push(`tsconfig.json: ${feature} is prohibited until the shared source graph models it`);
    }
    if (!hasNoCompilerInputs(effectiveRootTsconfig)) {
      errors.push("tsconfig.json: effective root compiler inputs must remain empty");
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
