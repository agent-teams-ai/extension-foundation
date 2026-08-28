import { execFile } from "node:child_process";
import { posix } from "node:path";
import { promisify } from "node:util";

import { parseSync } from "oxc-parser";

const execFileAsync = promisify(execFile);
const SCHEMA_VERSION = 2;
export const PRODUCT_SOURCE_PROOF_MODE = "source-custody-named-topology";
export const PRODUCT_SOURCE_PROOF_LIMITS = Object.freeze([
  "exact Git custody and the declared named-call topology only",
  "no semantic dataflow or proof that a reference carries a value",
  "no runtime behavior, authorization, lifecycle, fail-fast, output-correctness, or provider-execution proof",
  "no publication, promotion, product approval, or independent-ownership authority",
]);

const GIT_OBJECT = /^[a-f0-9]{40}$/u;
const REPOSITORY = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/u;
const IDENTIFIER = /^[A-Za-z_$][\w$]*$/u;
const WORKSPACE_DEPENDENCY = /^workspace:[*^~]$/u;
const REGULAR_FILE_MODES = new Set(["100644", "100755"]);
const MAX_GIT_OUTPUT_BYTES = 8 * 1024 * 1024;
const MAX_PRODUCTS = 8;
const MAX_FILES_PER_PRODUCT = 64;
const MAX_SOURCE_BYTES = 2 * 1024 * 1024;
const MAX_TOTAL_SOURCE_BYTES = 16 * 1024 * 1024;
const MAX_PATH_LENGTH = 1024;
const MAX_PATTERN_LENGTH = 4096;

export class ProductSourceEvidenceError extends Error {
  constructor(code, message) {
    super(`${code}: ${message}`);
    this.name = "ProductSourceEvidenceError";
    this.code = code;
  }
}

function fail(code, message) {
  throw new ProductSourceEvidenceError(code, message);
}

function requireRecord(value, label) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    fail("E-SCHEMA", `${label} must be an object`);
  }
  return value;
}

function requireExactKeys(value, allowed, label) {
  const record = requireRecord(value, label);
  const unknown = Object.keys(record).filter(key => !allowed.includes(key));
  if (unknown.length > 0) fail("E-SCHEMA", `${label} has unsupported fields: ${unknown.join(", ")}`);
  return record;
}

function requireString(value, label) {
  if (typeof value !== "string" || value.length === 0) {
    fail("E-SCHEMA", `${label} must be a non-empty string`);
  }
  return value;
}

function requireIdentifier(value, label) {
  const name = requireString(value, label);
  if (!IDENTIFIER.test(name)) fail("E-SCHEMA", `${label} must be an identifier`);
  return name;
}

function requireGitObject(value, label) {
  const object = requireString(value, label);
  if (!GIT_OBJECT.test(object)) fail("E-SCHEMA", `${label} must be a full lowercase Git object ID`);
  return object;
}

function requireRepositoryPath(value, label) {
  const path = requireString(value, label);
  if (path.length > MAX_PATH_LENGTH
    || path.startsWith("/")
    || path.includes("\\")
    || /[\0\n\r:]/u.test(path)) {
    fail("E-SCHEMA", `${label} must be a portable repository-relative path`);
  }
  if (posix.normalize(path) !== path || path === "." || path.startsWith("../")) {
    fail("E-SCHEMA", `${label} must be canonical and remain inside the repository`);
  }
  return path;
}

function requireStringArray(value, label, { identifiers = false, nonempty = true } = {}) {
  if (!Array.isArray(value) || (nonempty && value.length === 0)) {
    fail("E-SCHEMA", `${label} must be ${nonempty ? "a non-empty" : "an"} array`);
  }
  const result = value.map((entry, index) => identifiers
    ? requireIdentifier(entry, `${label}[${index}]`)
    : requireString(entry, `${label}[${index}]`));
  if (new Set(result).size !== result.length) fail("E-SCHEMA", `${label} must not contain duplicates`);
  return result;
}

async function runGit(repositoryRoot, args, { allowNoMatches = false } = {}) {
  const environment = {
    PATH: process.env.PATH,
    SystemRoot: process.env.SystemRoot,
    WINDIR: process.env.WINDIR,
    COMSPEC: process.env.COMSPEC,
    PATHEXT: process.env.PATHEXT,
    TMPDIR: process.env.TMPDIR,
    TMP: process.env.TMP,
    TEMP: process.env.TEMP,
    HOME: process.env.HOME,
    GIT_CONFIG_NOSYSTEM: "1",
    GIT_CONFIG_GLOBAL: process.platform === "win32" ? "NUL" : "/dev/null",
    GIT_NO_REPLACE_OBJECTS: "1",
    GIT_OPTIONAL_LOCKS: "0",
    LC_ALL: "C",
  };
  try {
    const result = await execFileAsync("git", ["--no-replace-objects", ...args], {
      cwd: repositoryRoot,
      encoding: "utf8",
      maxBuffer: MAX_GIT_OUTPUT_BYTES,
      env: Object.fromEntries(Object.entries(environment).filter(([, entry]) => entry !== undefined)),
    });
    return { exitCode: 0, stdout: result.stdout, stderr: result.stderr };
  } catch (error) {
    if (allowNoMatches && error?.code === 1) {
      return {
        exitCode: 1,
        stdout: typeof error.stdout === "string" ? error.stdout : "",
        stderr: typeof error.stderr === "string" ? error.stderr : "",
      };
    }
    const detail = typeof error?.stderr === "string" && error.stderr.trim().length > 0
      ? error.stderr.trim()
      : error instanceof Error ? error.message : String(error);
    fail("E-GIT", `git ${args[0] ?? "command"} failed in ${repositoryRoot}: ${detail}`);
  }
}

function normalizeGitHubRepository(remote) {
  const value = remote.trim().replace(/\.git$/u, "");
  const scp = /^git@github\.com:([^/]+\/[^/]+)$/u.exec(value);
  if (scp !== null) return scp[1];
  try {
    const url = new URL(value);
    return url.hostname === "github.com" ? url.pathname.replace(/^\//u, "") : undefined;
  } catch {
    return undefined;
  }
}

function parseProgram(filename, source) {
  let result;
  try {
    result = parseSync(filename, source, { sourceType: "module" });
  } catch (error) {
    fail("E-AST", `${filename} cannot be parsed by Oxc: ${error instanceof Error ? error.message : String(error)}`);
  }
  const errors = result.errors.filter(error => error.severity === "Error");
  if (errors.length > 0) fail("E-AST", `${filename} cannot be parsed by Oxc: ${errors[0].message}`);
  return result.program;
}

function syntaxName(node) {
  if (typeof node?.name === "string") return node.name;
  if (typeof node?.value === "string") return node.value;
  return undefined;
}

function bindingNames(pattern) {
  if (pattern?.type === "Identifier") return [pattern.name];
  if (pattern?.type === "ObjectPattern") {
    return pattern.properties.flatMap(property => bindingNames(property.value ?? property.argument));
  }
  if (pattern?.type === "ArrayPattern") return pattern.elements.flatMap(bindingNames);
  if (pattern?.type === "AssignmentPattern") return bindingNames(pattern.left);
  if (pattern?.type === "RestElement") return bindingNames(pattern.argument);
  return [];
}

function declarationNames(declaration) {
  if (declaration?.type === "VariableDeclaration") {
    return declaration.declarations.flatMap(entry => bindingNames(entry.id));
  }
  return typeof declaration?.id?.name === "string" ? [declaration.id.name] : [];
}

function exportedNames(program) {
  const names = new Set();
  for (const node of program.body) {
    if (node.type === "ExportDefaultDeclaration") names.add("default");
    if (node.type !== "ExportNamedDeclaration") continue;
    for (const name of declarationNames(node.declaration)) names.add(name);
    for (const specifier of node.specifiers ?? []) {
      const name = syntaxName(specifier.exported);
      if (name !== undefined) names.add(name);
    }
  }
  return names;
}

function walk(value, visit, seen = new Set()) {
  if (value === null || typeof value !== "object" || seen.has(value)) return;
  seen.add(value);
  visit(value);
  for (const [key, child] of Object.entries(value)) {
    if (["parent", "start", "end", "loc", "range", "span"].includes(key)) continue;
    if (Array.isArray(child)) child.forEach(entry => walk(entry, visit, seen));
    else walk(child, visit, seen);
  }
}

function isCallableNode(node) {
  return node?.type === "FunctionDeclaration"
    || node?.type === "FunctionExpression"
    || node?.type === "ArrowFunctionExpression";
}

function lexicalWalk(rootCallable, visit) {
  function descend(value, isRoot = false) {
    if (value === null || typeof value !== "object") return;
    if (!isRoot && (isCallableNode(value) || value.type === "ClassDeclaration" || value.type === "ClassExpression")) return;
    visit(value);
    for (const [key, child] of Object.entries(value)) {
      if (["parent", "start", "end", "loc", "range", "span"].includes(key)) continue;
      if (Array.isArray(child)) child.forEach(entry => descend(entry));
      else descend(child);
    }
  }
  descend(rootCallable, true);
}

function exportedDeclaration(program, name) {
  const matches = [];
  for (const node of program.body) {
    if (node.type !== "ExportNamedDeclaration" || node.declaration === null) continue;
    if (declarationNames(node.declaration).includes(name)) matches.push(node.declaration);
  }
  if (matches.length !== 1) return undefined;
  return matches[0];
}

function exportedCallable(program, name, product) {
  const declaration = exportedDeclaration(program, name);
  let callable;
  if (declaration?.type === "FunctionDeclaration") callable = declaration;
  if (declaration?.type === "VariableDeclaration") {
    const entries = declaration.declarations.filter(entry => entry.id?.type === "Identifier" && entry.id.name === name);
    if (entries.length === 1 && isCallableNode(entries[0].init)) callable = entries[0].init;
  }
  if (callable === undefined) fail("E-WIRING", `${product} must directly export callable ${name}`);
  return callable;
}

function parseJsonRecord(sourcePath, source, label) {
  try {
    return requireRecord(JSON.parse(source), label);
  } catch (error) {
    if (error instanceof ProductSourceEvidenceError) throw error;
    fail("E-WIRING", `${sourcePath} must be strict JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function canonicalRelativeTarget(value, label) {
  const target = requireString(value, label);
  if (!target.startsWith("./") || target.includes("\\") || /[\0\n\r:]/u.test(target)) {
    fail("E-RESOLUTION", `${label} must be a canonical relative target beginning ./`);
  }
  const body = target.slice(2);
  if (body === "" || posix.normalize(body) !== body || body.startsWith("../")) {
    fail("E-RESOLUTION", `${label} must be canonical and remain relative`);
  }
  return target;
}

function parseModuleResolutionConfig(sourcePath, source, product) {
  const config = parseJsonRecord(sourcePath, source, `${product} module resolution config`);
  if (Object.hasOwn(config, "extends")) fail("E-RESOLUTION", `${product} restricted resolution rejects extends`);
  const options = requireRecord(config.compilerOptions, `${product} compilerOptions`);
  for (const unsupported of [
    "rootDirs",
    "moduleSuffixes",
    "customConditions",
    "resolvePackageJsonExports",
    "resolvePackageJsonImports",
  ]) {
    if (Object.hasOwn(options, unsupported)) {
      fail("E-RESOLUTION", `${product} restricted resolution rejects compilerOptions.${unsupported}`);
    }
  }
  if (options.moduleResolution !== undefined && options.moduleResolution !== "bundler") {
    fail("E-RESOLUTION", `${product} restricted resolution supports only moduleResolution bundler`);
  }
  if (options.baseUrl !== undefined && options.baseUrl !== ".") {
    fail("E-RESOLUTION", `${product} restricted resolution supports only baseUrl .`);
  }
  const paths = options.paths === undefined ? {} : requireRecord(options.paths, `${product} compilerOptions.paths`);
  const mappings = [];
  for (const [pattern, targets] of Object.entries(paths)) {
    if (!Array.isArray(targets) || targets.length !== 1) {
      fail("E-RESOLUTION", `${product} path mapping ${pattern} must have exactly one target`);
    }
    const target = canonicalRelativeTarget(targets[0], `${product} path mapping ${pattern}`);
    const patternStars = [...pattern.matchAll(/\*/gu)].length;
    const targetStars = [...target.matchAll(/\*/gu)].length;
    if (patternStars > 1 || targetStars !== patternStars || pattern.startsWith("/") || pattern.includes("\\")) {
      fail("E-RESOLUTION", `${product} path mapping ${pattern} is outside the restricted canonical form`);
    }
    mappings.push({ pattern, target });
  }
  return Object.freeze({ mappings });
}

function candidateSourcePaths(base) {
  if (/\.(?:c|m)?js$/u.test(base)) return [base.replace(/\.(?:c|m)?js$/u, ".ts")];
  if (/\.tsx?$/u.test(base)) return [base];
  return [`${base}.ts`, `${base}/index.ts`];
}

function resolveImportPath(importerPath, specifier, resolution, sourcesByPath, product) {
  let base;
  if (specifier.startsWith(".")) {
    const raw = posix.join(posix.dirname(importerPath), specifier);
    if (raw.startsWith("../") || raw === ".." || raw.startsWith("/")) {
      fail("E-RESOLUTION", `${product} import ${specifier} escapes the repository`);
    }
    base = posix.normalize(raw);
  } else {
    const matches = [];
    for (const mapping of resolution.mappings) {
      if (!mapping.pattern.includes("*")) {
        if (specifier === mapping.pattern) matches.push(mapping.target.slice(2));
        continue;
      }
      const [prefix, suffix] = mapping.pattern.split("*");
      if (!specifier.startsWith(prefix) || !specifier.endsWith(suffix)) continue;
      const captured = specifier.slice(prefix.length, specifier.length - suffix.length);
      matches.push(mapping.target.slice(2).replace("*", captured));
    }
    if (matches.length !== 1) {
      fail("E-RESOLUTION", `${product} import ${specifier} must match exactly one restricted path target`);
    }
    [base] = matches;
  }
  const candidates = candidateSourcePaths(base).filter(path => sourcesByPath.has(path));
  if (candidates.length === 0) return undefined;
  if (candidates.length !== 1) fail("E-RESOLUTION", `${product} import ${specifier} resolves to multiple listed sources`);
  return candidates[0];
}

function exactImport(program, importerPath, targetPath, symbol, resolution, sourcesByPath, product, kind) {
  const matches = [];
  for (const node of program.body) {
    if (node.type !== "ImportDeclaration" || typeof node.source?.value !== "string") continue;
    let resolved;
    try {
      resolved = resolveImportPath(importerPath, node.source.value, resolution, sourcesByPath, product);
    } catch (error) {
      if (node.source.value.startsWith(".") || resolution.mappings.some(mapping => {
        const prefix = mapping.pattern.split("*")[0];
        return node.source.value.startsWith(prefix);
      })) throw error;
      continue;
    }
    if (resolved === undefined) continue;
    if (resolved !== targetPath) continue;
    for (const specifier of node.specifiers ?? []) {
      if (specifier.type !== "ImportSpecifier") continue;
      if (syntaxName(specifier.imported) !== symbol || specifier.local?.name !== symbol) continue;
      const typeOnly = node.importKind === "type" || specifier.importKind === "type";
      if ((kind === "value" && !typeOnly) || (kind === "type" && typeOnly)) matches.push(specifier);
    }
  }
  if (matches.length !== 1) {
    fail("E-WIRING", `${product}:${importerPath} must have one exact unaliased ${kind} import of ${symbol} from ${targetPath}`);
  }
}

function exactStaticProperties(expression, label, product) {
  if (expression?.type !== "ObjectExpression") fail("E-WIRING", `${product} ${label} must be an object literal`);
  const result = new Map();
  for (const property of expression.properties) {
    if (property.type !== "Property" || property.computed || property.kind !== "init" || property.method) {
      fail("E-WIRING", `${product} ${label} must contain only static data properties`);
    }
    const name = syntaxName(property.key);
    if (name === undefined || result.has(name)) fail("E-WIRING", `${product} ${label} has an invalid or duplicate property`);
    result.set(name, property.value);
  }
  return result;
}

function assertExactNames(actual, expected, label, product) {
  const observed = [...actual].sort();
  const wanted = [...expected].sort();
  if (observed.length !== wanted.length || observed.some((name, index) => name !== wanted[index])) {
    fail("E-WIRING", `${product} ${label} names are ${observed.join(", ")}; expected ${wanted.join(", ")}`);
  }
}

function localInterfaces(program) {
  const interfaces = new Map();
  for (const statement of program.body) {
    const declaration = statement.type === "ExportNamedDeclaration" ? statement.declaration : statement;
    if (declaration?.type === "TSInterfaceDeclaration") interfaces.set(declaration.id.name, declaration);
  }
  return interfaces;
}

function interfaceMembers(interfaces, name, product, stack = new Set()) {
  if (stack.has(name)) fail("E-WIRING", `${product} interface ${name} has cyclic heritage`);
  const declaration = interfaces.get(name);
  if (declaration === undefined) fail("E-WIRING", `${product} interface ${name} must be declared in the contract source`);
  const next = new Set(stack).add(name);
  const members = new Map();
  for (const heritage of declaration.extends ?? []) {
    if (heritage.expression?.type !== "Identifier" || heritage.typeArguments != null) {
      fail("E-WIRING", `${product} interface ${name} uses unsupported heritage syntax`);
    }
    for (const [member, entry] of interfaceMembers(interfaces, heritage.expression.name, product, next)) {
      if (members.has(member)) fail("E-WIRING", `${product} interface ${name} repeats inherited member ${member}`);
      members.set(member, entry);
    }
  }
  for (const entry of declaration.body.body) {
    if (entry.computed || (entry.type !== "TSPropertySignature" && entry.type !== "TSMethodSignature")) {
      fail("E-WIRING", `${product} interface ${name} uses unsupported member syntax`);
    }
    const member = syntaxName(entry.key);
    if (member === undefined || members.has(member)) fail("E-WIRING", `${product} interface ${name} repeats a member`);
    members.set(member, entry);
  }
  return members;
}

function typeReferenceIdentifier(property, product, label) {
  const annotation = property.typeAnnotation?.typeAnnotation;
  if (annotation?.type !== "TSTypeReference" || annotation.typeName?.type !== "Identifier") {
    fail("E-WIRING", `${product} ${label} must use a direct named interface type`);
  }
  return annotation.typeName.name;
}

function requireTopologyHeader(value, label, kind) {
  const topology = requireRecord(value, label);
  if (topology.kind !== kind) fail("E-SCHEMA", `${label}.kind must be ${kind}`);
  return topology;
}

function verifyPackagePublication(entry, sourcesByPath, consumerDependencies, product) {
  const barrelSource = sourcesByPath.get(entry.barrel);
  const manifestSource = sourcesByPath.get(entry.manifest);
  if (barrelSource === undefined || manifestSource === undefined) {
    fail("E-WIRING", `${product} package publication sources must all be listed files`);
  }
  const barrelProgram = parseProgram(entry.barrel, barrelSource);
  const exports = [];
  for (const statement of barrelProgram.body) {
    if (statement.type !== "ExportNamedDeclaration" || typeof statement.source?.value !== "string") continue;
    for (const specifier of statement.specifiers ?? []) {
      if (syntaxName(specifier.exported) === entry.symbol) exports.push({ statement, specifier });
    }
  }
  const expectedSpecifier = posix.relative(posix.dirname(entry.barrel), entry.source).replace(/\.ts$/u, ".js");
  const normalizedSpecifier = expectedSpecifier.startsWith(".") ? expectedSpecifier : `./${expectedSpecifier}`;
  if (exports.length !== 1
    || syntaxName(exports[0].specifier.local) !== entry.symbol
    || exports[0].statement.exportKind === "type"
    || exports[0].specifier.exportKind === "type"
    || exports[0].statement.source.value !== normalizedSpecifier) {
    fail("E-EXPORTS", `${product}:${entry.barrel} must exactly value-re-export ${entry.symbol} from ${entry.source}`);
  }

  const manifest = parseJsonRecord(entry.manifest, manifestSource, `${product} package manifest`);
  const packageName = requireString(manifest.name, `${product} package manifest.name`);
  if (!entry.moduleSpecifier.startsWith(`${packageName}/`)) {
    fail("E-EXPORTS", `${product} ${entry.moduleSpecifier} must be a subpath of ${packageName}`);
  }
  if (!WORKSPACE_DEPENDENCY.test(consumerDependencies[packageName] ?? "")) {
    fail("E-EXPORTS", `${product} consumer must use an exact supported workspace dependency on ${packageName}`);
  }
  const subpath = `.${entry.moduleSpecifier.slice(packageName.length)}`;
  const exportsMap = requireRecord(manifest.exports, `${product} package exports`);
  const target = requireRecord(exportsMap[subpath], `${product} export ${subpath}`);
  const keys = Object.keys(target);
  if (keys.length !== 2 || keys[0] !== "types" || keys[1] !== "import") {
    fail("E-EXPORTS", `${product} export ${subpath} must contain exactly ordered types and import conditions`);
  }
  const sourceDirectory = posix.join(posix.dirname(entry.manifest), "src");
  const sourceRelative = posix.relative(sourceDirectory, entry.barrel);
  if (sourceRelative.startsWith("../") || sourceRelative === ".." || !sourceRelative.endsWith(".ts")) {
    fail("E-EXPORTS", `${product}:${entry.barrel} must be under the package src directory`);
  }
  const stem = sourceRelative.slice(0, -3);
  const expectedTypes = `./dist/${stem}.d.ts`;
  const expectedImport = `./dist/${stem}.js`;
  if (canonicalRelativeTarget(target.types, `${product} export types`) !== expectedTypes
    || canonicalRelativeTarget(target.import, `${product} export import`) !== expectedImport) {
    fail("E-EXPORTS", `${product} export ${subpath} does not identify the inspected barrel`);
  }
}

function parseCapabilityMap(value, label) {
  const record = requireRecord(value, label);
  const capabilities = Object.keys(record);
  if (capabilities.length === 0) fail("E-SCHEMA", `${label} must not be empty`);
  const result = new Map();
  for (const capability of capabilities) {
    requireIdentifier(capability, `${label} capability`);
    result.set(capability, requireStringArray(record[capability], `${label}.${capability}`, { identifiers: true }));
  }
  return result;
}

function verifyAgentRuntimeTopology(value, sourcesByPath, product) {
  const topology = requireExactKeys(value, [
    "kind", "root", "rootFactory", "hostFactory", "consumerManifest", "contract", "featureFactories", "hostDependencies",
  ], `${product}.topology`);
  requireTopologyHeader(topology, `${product}.topology`, "agent-runtime-named-calls");
  const root = requireRepositoryPath(topology.root, `${product}.topology.root`);
  const rootFactory = requireIdentifier(topology.rootFactory, `${product}.topology.rootFactory`);
  const hostFactory = requireIdentifier(topology.hostFactory, `${product}.topology.hostFactory`);
  const consumerManifest = requireRepositoryPath(topology.consumerManifest, `${product}.topology.consumerManifest`);
  const rootSource = sourcesByPath.get(root);
  const manifestSource = sourcesByPath.get(consumerManifest);
  if (rootSource === undefined || manifestSource === undefined) fail("E-WIRING", `${product} topology sources must be listed files`);
  const rootProgram = parseProgram(root, rootSource);
  const callable = exportedCallable(rootProgram, rootFactory, product);
  exportedCallable(rootProgram, hostFactory, product);

  const contract = requireExactKeys(topology.contract, ["source", "interface", "capabilityMembers"], `${product}.topology.contract`);
  const contractSource = requireRepositoryPath(contract.source, `${product}.topology.contract.source`);
  const contractInterface = requireIdentifier(contract.interface, `${product}.topology.contract.interface`);
  const capabilityMembers = parseCapabilityMap(contract.capabilityMembers, `${product}.topology.contract.capabilityMembers`);
  const contractText = sourcesByPath.get(contractSource);
  if (contractText === undefined) fail("E-WIRING", `${product} contract source must be a listed file`);
  const interfaces = localInterfaces(parseProgram(contractSource, contractText));
  const handleMembers = interfaceMembers(interfaces, contractInterface, product);
  assertExactNames(handleMembers.keys(), capabilityMembers.keys(), `${contractInterface} capabilities`, product);
  for (const [capability, expectedMembers] of capabilityMembers) {
    const target = typeReferenceIdentifier(handleMembers.get(capability), product, `${contractInterface}.${capability}`);
    assertExactNames(interfaceMembers(interfaces, target, product).keys(), expectedMembers, `${target} members`, product);
  }

  const hostDependencies = parseCapabilityMap(topology.hostDependencies, `${product}.topology.hostDependencies`);
  assertExactNames(hostDependencies.keys(), capabilityMembers.keys(), "host dependency capabilities", product);
  if (!Array.isArray(topology.featureFactories) || topology.featureFactories.length === 0) {
    fail("E-SCHEMA", `${product}.topology.featureFactories must be a non-empty array`);
  }
  const consumerPackage = parseJsonRecord(consumerManifest, manifestSource, `${product} consumer manifest`);
  const consumerDependencies = {
    ...requireRecord(consumerPackage.dependencies ?? {}, `${product} consumer dependencies`),
    ...requireRecord(consumerPackage.devDependencies ?? {}, `${product} consumer devDependencies`),
  };
  const seenFactories = new Set();
  const featureFactories = topology.featureFactories.map((raw, index) => {
    const entry = requireExactKeys(raw, ["symbol", "source", "barrel", "manifest", "moduleSpecifier"], `${product}.topology.featureFactories[${index}]`);
    const parsed = {
      symbol: requireIdentifier(entry.symbol, `${product} feature symbol`),
      source: requireRepositoryPath(entry.source, `${product} feature source`),
      barrel: requireRepositoryPath(entry.barrel, `${product} feature barrel`),
      manifest: requireRepositoryPath(entry.manifest, `${product} feature manifest`),
      moduleSpecifier: requireString(entry.moduleSpecifier, `${product} feature moduleSpecifier`),
    };
    if (seenFactories.has(parsed.symbol)) fail("E-SCHEMA", `${product} repeats feature factory ${parsed.symbol}`);
    seenFactories.add(parsed.symbol);
    if (!sourcesByPath.has(parsed.source)) fail("E-WIRING", `${product} feature source must be a listed file`);
    exportedCallable(parseProgram(parsed.source, sourcesByPath.get(parsed.source)), parsed.symbol, product);
    verifyPackagePublication(parsed, sourcesByPath, consumerDependencies, product);
    const imports = rootProgram.body.filter(statement => statement.type === "ImportDeclaration"
      && statement.source?.value === parsed.moduleSpecifier
      && statement.specifiers?.some(specifier => specifier.type === "ImportSpecifier"
        && syntaxName(specifier.imported) === parsed.symbol
        && specifier.local?.name === parsed.symbol
        && statement.importKind !== "type"
        && specifier.importKind !== "type"));
    if (imports.length !== 1) {
      fail("E-WIRING", `${product}:${root} must exactly import ${parsed.symbol} from ${parsed.moduleSpecifier}`);
    }
    return parsed;
  });

  const calls = [];
  const returns = [];
  lexicalWalk(callable, node => {
    if (node.type === "CallExpression" && node.callee?.type === "Identifier") calls.push(node);
    if (node.type === "ReturnStatement") returns.push(node);
  });
  for (const entry of featureFactories) {
    const matches = calls.filter(call => call.callee.name === entry.symbol);
    if (matches.length !== 1) fail("E-WIRING", `${product} default root must contain one direct lexical call to ${entry.symbol}`);
  }
  const hostReturns = returns.filter(statement => statement.argument?.type === "CallExpression"
    && statement.argument.callee?.type === "Identifier"
    && statement.argument.callee.name === hostFactory);
  const hostCalls = calls.filter(call => call.callee.name === hostFactory);
  if (returns.length !== 1 || hostReturns.length !== 1 || hostCalls.length !== 1) {
    fail("E-WIRING", `${product} default root must contain one direct lexical ${hostFactory} return`);
  }
  const hostCall = hostReturns[0].argument;
  if (hostCall.arguments.length !== 1) fail("E-WIRING", `${product} ${hostFactory} return must have one dependency object`);
  const dependencies = exactStaticProperties(hostCall.arguments[0], `${hostFactory} dependencies`, product);
  assertExactNames(dependencies.keys(), hostDependencies.keys(), "host dependency capabilities", product);
  for (const [capability, expectedMembers] of hostDependencies) {
    const members = exactStaticProperties(dependencies.get(capability), `${hostFactory}.${capability}`, product);
    assertExactNames(members.keys(), expectedMembers, `${hostFactory}.${capability} dependency members`, product);
  }
  const hostPosition = hostCall.start ?? Number.MAX_SAFE_INTEGER;
  if (featureFactories.some(entry => {
    const call = calls.find(candidate => candidate.callee.name === entry.symbol);
    return (call?.start ?? Number.MAX_SAFE_INTEGER) >= hostPosition;
  })) fail("E-WIRING", `${product} feature-factory calls must lexically precede the host-factory return`);

  return Object.freeze({
    kind: "agent-runtime-named-calls",
    root,
    rootFactory,
    hostFactory,
    capabilities: Object.freeze([...capabilityMembers.keys()]),
    capabilityMembers: Object.freeze(Object.fromEntries(capabilityMembers)),
    hostDependencies: Object.freeze(Object.fromEntries(hostDependencies)),
    featureFactories: Object.freeze(featureFactories.map(entry => entry.symbol)),
  });
}

function classDeclaration(program, name, product) {
  const declaration = exportedDeclaration(program, name);
  if (declaration?.type !== "ClassDeclaration") fail("E-WIRING", `${product} must directly export class ${name}`);
  return declaration;
}

function assertImplements(classNode, port, product) {
  const matches = (classNode.implements ?? []).filter(entry => entry.expression?.type === "Identifier" && entry.expression.name === port);
  if (matches.length !== 1 || (classNode.implements ?? []).length !== 1) {
    fail("E-WIRING", `${product} ${classNode.id.name} must directly implement only ${port}`);
  }
}

function verifyFrontendTopology(value, sourcesByPath, product) {
  const topology = requireExactKeys(value, ["kind", "root", "factory", "moduleResolution", "port", "consumer", "orderedProviders", "facadeMember"], `${product}.topology`);
  requireTopologyHeader(topology, `${product}.topology`, "frontend-literal-provider-list");
  const root = requireRepositoryPath(topology.root, `${product}.topology.root`);
  const factory = requireIdentifier(topology.factory, `${product}.topology.factory`);
  const facadeMember = requireIdentifier(topology.facadeMember, `${product}.topology.facadeMember`);
  const moduleResolution = requireExactKeys(topology.moduleResolution, ["source"], `${product}.topology.moduleResolution`);
  const configPath = requireRepositoryPath(moduleResolution.source, `${product}.topology.moduleResolution.source`);
  const configSource = sourcesByPath.get(configPath);
  if (configSource === undefined) fail("E-RESOLUTION", `${product} module resolution source must be listed`);
  const resolution = parseModuleResolutionConfig(configPath, configSource, product);

  const port = requireExactKeys(topology.port, ["symbol", "source"], `${product}.topology.port`);
  const portSymbol = requireIdentifier(port.symbol, `${product}.topology.port.symbol`);
  const portSource = requireRepositoryPath(port.source, `${product}.topology.port.source`);
  const consumer = requireExactKeys(topology.consumer, ["symbol", "source", "dependency"], `${product}.topology.consumer`);
  const consumerSymbol = requireIdentifier(consumer.symbol, `${product}.topology.consumer.symbol`);
  const consumerSource = requireRepositoryPath(consumer.source, `${product}.topology.consumer.source`);
  const dependency = requireIdentifier(consumer.dependency, `${product}.topology.consumer.dependency`);
  for (const path of [root, portSource, consumerSource]) {
    if (!sourcesByPath.has(path)) fail("E-WIRING", `${product}:${path} must be a listed source`);
  }
  const portProgram = parseProgram(portSource, sourcesByPath.get(portSource));
  const portDeclaration = exportedDeclaration(portProgram, portSymbol);
  if (portDeclaration?.type !== "TSInterfaceDeclaration") fail("E-WIRING", `${product} must directly export interface ${portSymbol}`);
  const consumerProgram = parseProgram(consumerSource, sourcesByPath.get(consumerSource));
  classDeclaration(consumerProgram, consumerSymbol, product);
  exactImport(consumerProgram, consumerSource, portSource, portSymbol, resolution, sourcesByPath, product, "type");

  if (!Array.isArray(topology.orderedProviders) || topology.orderedProviders.length === 0) {
    fail("E-SCHEMA", `${product}.topology.orderedProviders must be a non-empty array`);
  }
  const providers = topology.orderedProviders.map((raw, index) => {
    const provider = requireExactKeys(raw, ["symbol", "source"], `${product}.topology.orderedProviders[${index}]`);
    const parsed = {
      symbol: requireIdentifier(provider.symbol, `${product} provider symbol`),
      source: requireRepositoryPath(provider.source, `${product} provider source`),
    };
    if (!sourcesByPath.has(parsed.source)) fail("E-WIRING", `${product}:${parsed.source} must be a listed source`);
    const program = parseProgram(parsed.source, sourcesByPath.get(parsed.source));
    assertImplements(classDeclaration(program, parsed.symbol, product), portSymbol, product);
    exactImport(program, parsed.source, portSource, portSymbol, resolution, sourcesByPath, product, "type");
    return parsed;
  });
  if (new Set(providers.map(provider => provider.symbol)).size !== providers.length) {
    fail("E-SCHEMA", `${product} ordered providers must be distinct`);
  }

  const rootProgram = parseProgram(root, sourcesByPath.get(root));
  const callable = exportedCallable(rootProgram, factory, product);
  exactImport(rootProgram, root, consumerSource, consumerSymbol, resolution, sourcesByPath, product, "value");
  for (const provider of providers) {
    exactImport(rootProgram, root, provider.source, provider.symbol, resolution, sourcesByPath, product, "value");
  }
  const declarations = [];
  const consumerConstructions = [];
  const returns = [];
  lexicalWalk(callable, node => {
    if (node.type === "VariableDeclarator") declarations.push(node);
    if (node.type === "NewExpression" && node.callee?.type === "Identifier" && node.callee.name === consumerSymbol) consumerConstructions.push(node);
    if (node.type === "ReturnStatement") returns.push(node);
  });
  const lists = declarations.filter(entry => entry.id?.type === "Identifier"
    && entry.init?.type === "ArrayExpression"
    && entry.init.elements.length === providers.length
    && entry.init.elements.every((element, index) => element?.type === "NewExpression"
      && element.callee?.type === "Identifier"
      && element.callee.name === providers[index].symbol));
  if (lists.length !== 1) fail("E-WIRING", `${product} root must construct one literal ordered provider list`);
  const listName = lists[0].id.name;
  const providerNews = [];
  lexicalWalk(callable, node => {
    if (node.type === "NewExpression" && node.callee?.type === "Identifier"
      && providers.some(provider => provider.symbol === node.callee.name)) providerNews.push(node);
  });
  if (providerNews.length !== providers.length) fail("E-WIRING", `${product} providers must be constructed only in the literal provider list`);
  if (consumerConstructions.length !== 1 || consumerConstructions[0].arguments.length !== 1) {
    fail("E-WIRING", `${product} root must contain one ${consumerSymbol} construction`);
  }
  const consumerDependencies = exactStaticProperties(consumerConstructions[0].arguments[0], `${consumerSymbol} dependencies`, product);
  const sourceArgument = consumerDependencies.get(dependency);
  if (sourceArgument?.type !== "Identifier" || sourceArgument.name !== listName) {
    fail("E-WIRING", `${product} ${consumerSymbol}.${dependency} must name the literal provider list`);
  }
  if (returns.length !== 1) fail("E-WIRING", `${product} root must contain one facade publication`);
  const facade = exactStaticProperties(returns[0].argument, "facade publication", product);
  assertExactNames(facade.keys(), [facadeMember], "facade publication", product);
  const publication = facade.get(facadeMember);
  if (!isCallableNode(publication)) fail("E-WIRING", `${product} facade ${facadeMember} must be a literal closure`);

  return Object.freeze({
    kind: "frontend-literal-provider-list",
    root,
    factory,
    port: portSymbol,
    consumer: consumerSymbol,
    dependency,
    orderedProviders: Object.freeze(providers.map(provider => provider.symbol)),
    facadeMember,
  });
}

function verifyCustodyOnlyTopology(value, product) {
  const topology = requireExactKeys(value, ["kind"], `${product}.topology`);
  requireTopologyHeader(topology, `${product}.topology`, "custody-negative-search-only");
  return Object.freeze({ kind: "custody-negative-search-only" });
}

function verifyTopology(value, sourcesByPath, product) {
  const topology = requireRecord(value, `${product}.topology`);
  if (topology.kind === "agent-runtime-named-calls") return verifyAgentRuntimeTopology(topology, sourcesByPath, product);
  if (topology.kind === "frontend-literal-provider-list") return verifyFrontendTopology(topology, sourcesByPath, product);
  if (topology.kind === "custody-negative-search-only") return verifyCustodyOnlyTopology(topology, product);
  fail("E-SCHEMA", `${product}.topology.kind is unsupported`);
}

async function exactTreeEntry(repositoryRoot, commit, path, product) {
  const result = await runGit(repositoryRoot, ["ls-tree", "-z", "--full-tree", commit, "--", `:(literal)${path}`]);
  const entries = result.stdout.split("\0").filter(Boolean);
  if (entries.length !== 1) fail("E-BLOB", `${product}:${path} must identify exactly one Git tree entry`);
  const separator = entries[0].indexOf("\t");
  const header = separator === -1 ? "" : entries[0].slice(0, separator);
  const observedPath = separator === -1 ? "" : entries[0].slice(separator + 1);
  const match = /^(\d{6}) ([a-z]+) ([a-f0-9]{40})$/u.exec(header);
  if (match === null || observedPath !== path) fail("E-BLOB", `${product}:${path} returned an invalid Git tree entry`);
  return { mode: match[1], type: match[2], object: match[3] };
}

async function readGitSource(repositoryRoot, commit, path, expectedBlob, product) {
  const entry = await exactTreeEntry(repositoryRoot, commit, path, product);
  if (!REGULAR_FILE_MODES.has(entry.mode)) fail("E-MODE", `${product}:${path} has unsupported Git mode ${entry.mode}`);
  if (entry.type !== "blob") fail("E-BLOB", `${product}:${path} resolves to ${entry.type}, expected blob`);
  if (entry.object !== expectedBlob) fail("E-BLOB", `${product}:${path} blob is ${entry.object}, expected ${expectedBlob}`);
  const source = (await runGit(repositoryRoot, ["cat-file", "blob", entry.object])).stdout;
  return { blob: entry.object, source };
}

async function verifyNegativeSearch(repositoryRoot, commit, value, product) {
  const search = requireExactKeys(value, ["pattern", "paths", "matches"], `${product}.negativeSearch`);
  const pattern = requireString(search.pattern, `${product}.negativeSearch.pattern`);
  if (pattern.length > MAX_PATTERN_LENGTH) fail("E-SCHEMA", `${product}.negativeSearch.pattern is too long`);
  if (!Array.isArray(search.paths) || search.paths.length === 0 || search.paths.length > MAX_FILES_PER_PRODUCT) {
    fail("E-SCHEMA", `${product}.negativeSearch.paths must contain 1-${MAX_FILES_PER_PRODUCT} paths`);
  }
  const paths = search.paths.map((path, index) => requireRepositoryPath(path, `${product}.negativeSearch.paths[${index}]`));
  if (new Set(paths).size !== paths.length) fail("E-SCHEMA", `${product}.negativeSearch.paths must be distinct`);
  if (!Number.isSafeInteger(search.matches) || search.matches < 0) {
    fail("E-SCHEMA", `${product}.negativeSearch.matches must be a non-negative integer`);
  }
  for (const path of paths) await exactTreeEntry(repositoryRoot, commit, path, product);
  const result = await runGit(repositoryRoot, ["grep", "-E", "-c", "--no-color", "-e", pattern, commit, "--", ...paths], { allowNoMatches: true });
  const actual = result.exitCode === 1
    ? 0
    : result.stdout.trim().split("\n").filter(Boolean).reduce((total, line) => {
      const match = /:(\d+)$/u.exec(line);
      if (match === null) fail("E-GIT", `${product} returned an unparseable git grep count`);
      return total + Number(match[1]);
    }, 0);
  if (actual !== search.matches) fail("E-SEARCH", `${product} negative search found ${actual}, expected ${search.matches}`);
  return Object.freeze({ pattern, paths: Object.freeze(paths), matches: actual });
}

export async function verifyProductSourceRecord(product, recordValue, repositoryRoot) {
  const record = requireExactKeys(recordValue, ["repository", "commit", "tree", "claim", "files", "negativeSearch", "topology"], product);
  const repository = requireString(record.repository, `${product}.repository`);
  if (!REPOSITORY.test(repository)) fail("E-SCHEMA", `${product}.repository must be owner/name`);
  const commit = requireGitObject(record.commit, `${product}.commit`);
  const expectedTree = requireGitObject(record.tree, `${product}.tree`);
  requireString(record.claim, `${product}.claim`);
  requireRecord(record.topology, `${product}.topology`);

  const topLevel = (await runGit(repositoryRoot, ["rev-parse", "--show-toplevel"])).stdout.trim();
  const remote = (await runGit(topLevel, ["remote", "get-url", "origin"])).stdout.trim();
  const observedRepository = normalizeGitHubRepository(remote);
  if (observedRepository !== repository) {
    fail("E-REPOSITORY", `${product} origin identifies ${observedRepository ?? remote}, expected ${repository}`);
  }
  const resolvedCommit = (await runGit(topLevel, ["rev-parse", "--verify", `${commit}^{commit}`])).stdout.trim();
  if (resolvedCommit !== commit) fail("E-COMMIT", `${product} resolved ${resolvedCommit}, expected ${commit}`);
  const observedTree = (await runGit(topLevel, ["show", "-s", "--format=%T", commit])).stdout.trim();
  if (observedTree !== expectedTree) fail("E-TREE", `${product} tree is ${observedTree}, expected ${expectedTree}`);

  if (!Array.isArray(record.files) || record.files.length === 0 || record.files.length > MAX_FILES_PER_PRODUCT) {
    fail("E-SCHEMA", `${product}.files must contain 1-${MAX_FILES_PER_PRODUCT} files`);
  }
  const sourcesByPath = new Map();
  const files = [];
  let totalBytes = 0;
  for (const [index, raw] of record.files.entries()) {
    const file = requireExactKeys(raw, ["path", "blob", "symbols"], `${product}.files[${index}]`);
    const path = requireRepositoryPath(file.path, `${product}.files[${index}].path`);
    if (sourcesByPath.has(path)) fail("E-SCHEMA", `${product} repeats evidence path ${path}`);
    const blob = requireGitObject(file.blob, `${product}.files[${index}].blob`);
    const { source } = await readGitSource(topLevel, commit, path, blob, product);
    const bytes = Buffer.byteLength(source);
    totalBytes += bytes;
    if (bytes > MAX_SOURCE_BYTES || totalBytes > MAX_TOTAL_SOURCE_BYTES) {
      fail("E-BOUNDS", `${product}:${path} exceeds qualification source bounds`);
    }
    sourcesByPath.set(path, source);
    const symbols = requireStringArray(file.symbols, `${product}:${path}.symbols`, { identifiers: true, nonempty: false });
    if (symbols.length > 0) {
      const exported = exportedNames(parseProgram(path, source));
      const missing = symbols.filter(symbol => !exported.has(symbol));
      if (missing.length > 0) fail("E-EXPORT", `${product}:${path} does not export ${missing.join(", ")}`);
    }
    files.push(Object.freeze({ path, blob, symbols: Object.freeze(symbols) }));
  }
  const negativeSearch = await verifyNegativeSearch(topLevel, commit, record.negativeSearch, product);
  const topology = verifyTopology(record.topology, sourcesByPath, product);
  return Object.freeze({
    proofMode: PRODUCT_SOURCE_PROOF_MODE,
    limits: PRODUCT_SOURCE_PROOF_LIMITS,
    product,
    repository,
    repositoryRoot: topLevel,
    commit,
    tree: observedTree,
    files: Object.freeze(files),
    negativeSearch,
    topology,
  });
}

export async function verifyProductSourceEvidence(evidenceValue, repositoryRoots) {
  const evidence = requireExactKeys(evidenceValue, ["schemaVersion", "proofMode", "capturedAt", "status", "verification", "products", "limitations"], "evidence");
  if (evidence.schemaVersion !== SCHEMA_VERSION) fail("E-SCHEMA", `evidence.schemaVersion must be ${SCHEMA_VERSION}`);
  if (evidence.proofMode !== PRODUCT_SOURCE_PROOF_MODE) fail("E-PROOF-MODE", `evidence.proofMode must be ${PRODUCT_SOURCE_PROOF_MODE}`);
  if (evidence.status !== "candidate-source-records") {
    fail("E-STATUS", "source evidence must remain candidate-source-records until separately authenticated");
  }
  requireString(evidence.capturedAt, "evidence.capturedAt");
  const verification = requireExactKeys(evidence.verification, ["command", "authority", "promotionAuthority"], "evidence.verification");
  requireString(verification.command, "evidence.verification.command");
  requireString(verification.authority, "evidence.verification.authority");
  if (verification.promotionAuthority !== false) fail("E-STATUS", "source verification cannot be promotion authority");
  const limitations = requireStringArray(evidence.limitations, "evidence.limitations");
  const products = requireRecord(evidence.products, "evidence.products");
  const productNames = Object.keys(products).sort();
  if (productNames.length === 0 || productNames.length > MAX_PRODUCTS) {
    fail("E-SCHEMA", `evidence.products must contain 1-${MAX_PRODUCTS} products`);
  }
  const reports = [];
  const repositories = new Set();
  for (const product of productNames) {
    const repositoryRoot = repositoryRoots[product];
    if (typeof repositoryRoot !== "string" || repositoryRoot.length === 0) {
      fail("E-REPOSITORY", `repository root is missing for ${product}`);
    }
    const report = await verifyProductSourceRecord(product, products[product], repositoryRoot);
    if (repositories.has(report.repository)) fail("E-INDEPENDENCE", `multiple product keys cannot reuse repository ${report.repository}`);
    repositories.add(report.repository);
    reports.push(report);
  }
  return Object.freeze({
    schemaVersion: SCHEMA_VERSION,
    proofMode: PRODUCT_SOURCE_PROOF_MODE,
    limits: PRODUCT_SOURCE_PROOF_LIMITS,
    status: evidence.status,
    declaredLimitations: Object.freeze(limitations),
    reports: Object.freeze(reports),
  });
}
