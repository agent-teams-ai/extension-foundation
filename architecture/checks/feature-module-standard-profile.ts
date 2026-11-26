import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { isDeepStrictEqual } from "node:util";
import { parse as parseYaml } from "yaml";

import { parseStrictJson } from "./strict-json.mjs";

export const PROFILE_PATH = "architecture/feature-module-standard-profile.json";
export const PROFILE_DOCUMENT = "docs/architecture/feature-module-standard-profile.md";

// Reviewed authority identity, not a second copy of the standard. Updates require
// an explicit upstream delta review together with this consumer's profile.
const STANDARD = {
  id: "agent-teams.feature-module-standard",
  version: "v1",
  repository: "agent-teams-ai/.github",
  revision: "41ed61bfad895d7f46041532538de64202a1ec68",
  path: "docs/architecture/feature-module-standard/v1.md",
  gitBlob: "d0bfff2033faf544fe65268c1dcdfd524d093015",
  sha256: "851653f96643cf0466b67ab22963661976b00de44840fa3144a48a8c054f95fa",
};
const SCOPE = {
  productionRoots: ["packages"],
  moduleRoots: ["packages/*"],
  applicationRoots: [],
  excludedRoots: ["architecture", "docs", "tests", "fixtures"],
};
const MAPPING = {
  sourceRoot: "src",
  featureRoot: "src/features/<feature>",
  moduleComposition: "src/index.ts",
  publicEntrypoint: "src/index.ts",
  testRoot: "test/features/<feature>",
};
const AUTHORITIES = [
  "docs/architecture/overview.md",
  "docs/decisions/0015-authorize-get-modular-semantic-extraction.md",
  "docs/decisions/0016-provisional-contribution-and-verified-artifact-packages.md",
  "docs/open-decisions/OD-003-module-runtime-and-public-spi-choices.md",
];
const LOCAL_EXTENSIONS = {
  language: "typescript",
  packaging: "closed-package-catalog-with-owned-features",
  transport: "none-adopted",
  composition: "static-library-module-entrypoint",
  applicationComposition: "not-applicable",
};
const ENFORCEMENT = {
  profile: "architecture:feature-module-profile",
  profileTests: "architecture:feature-module-profile:test",
  topology: "architecture:topology:check",
  dependencies: "architecture:source-dependencies:check",
  productionSources: "architecture:package-source:test",
};
const OBLIGATIONS = [
  "valid-feature-per-adopted-role",
  "role-specific-layer-direction",
  "cross-feature-deep-import-rejection",
  "undeclared-edge-and-cycle-rejection",
  "empty-layer-rejection",
  "owned-module-exception-rejection",
];
const LEAVES = {
  "architecture:feature-module-profile":
    "node architecture/checks/feature-module-standard-profile.ts",
  "architecture:feature-module-profile:test":
    "node --test tests/feature-module-standard-profile.test.ts",
  "architecture:topology:check": "node architecture/checks/package-topology.mjs",
  "architecture:package-source:test": "node --test tests/packaged-feature-boundaries.test.ts",
  "architecture:source-dependencies:check":
    "agent-teams-foundation check architecture.source-dependencies",
  // Bind the complete selected entry list: the installed runner protects identities
  // only in selected files, so dropping a file must fail this consumer gate.
  "evidence:custody:test":
    "agent-teams-node-test --contract architecture/foundation/required-node-tests.json -- tests/evidence-custody.test.mjs",
};

const PACKAGES = [
  { id: "extension.core", role: "foundation-component", path: "packages/core", packageName: "@extension-foundation/core", features: ["contributions"] },
  { id: "extension.node-artifact", role: "integration-adapter", path: "packages/node-artifact", packageName: "@extension-foundation/node-artifact", features: ["verified-artifact"] },
];

interface ProfileInput {
  readonly profile: unknown;
  readonly manifest: unknown;
  readonly catalog: unknown;
  readonly document: string;
  readonly index: string;
  readonly navigation: string;
  readonly sourcePolicy: unknown;
  readonly workflow: unknown;
}

function requireCondition(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`FMS profile: ${message}`);
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
function object(value: unknown, name: string): Record<string, unknown> {
  requireCondition(isObject(value), `${name} must be an object`);
  return value;
}

function list(value: unknown, name: string): readonly unknown[] {
  requireCondition(Array.isArray(value), `${name} must be an array`);
  return value;
}

function requireEqual(actual: unknown, expected: unknown, name: string): void {
  requireCondition(isDeepStrictEqual(actual, expected), `${name} differs from reviewed adoption`);
}

function requireChain(script: unknown, required: readonly string[], name: string): void {
  // These fail-fast commands must actually execute; echo, fallbacks and substrings do not count.
  requireCondition(typeof script === "string", `${name} is missing`);
  const commands = script.split("&&").map(command => command.trim());
  requireCondition(commands.every(command =>
    /^(?:pnpm [a-z][\w:-]*|node --import="data:text\/javascript,process\.env\.PACKAGE_POLICY_TEST_MODE='(?:fast|full)'" --test --test-concurrency=1 (?:tests\/[\w.-]+\.test\.(?:mjs|ts) ?)+)$/u.test(command)),
  `${name} must be an explicit fail-fast command chain`);
  requireCondition(required.every(command => commands.includes(`pnpm ${command}`)), `${name} omits a required command`);
}

function governedProduction(sourcePolicy: Record<string, unknown>): void {
  const boundaries = list(sourcePolicy.boundaries, "source boundaries").map(value => object(value, "source boundary"));
  const roots = list(sourcePolicy.governedRoots, "governed roots");
  const packageRoots = list(sourcePolicy.packageRoots, "package roots");
  for (const entry of PACKAGES) {
    requireCondition(packageRoots.includes(entry.path), `${entry.path} must remain a classified package`);
    for (const root of [`${entry.path}/src`, `${entry.path}/test`]) {
      requireCondition(roots.includes(root), `${root} must remain governed`);
    }
    for (const id of [`package.${entry.id}`, ...entry.features.map(feature => `package.${entry.id}.feature.${feature}`)]) {
      requireCondition(boundaries.filter(boundary => boundary.id === id).length === 1, `${id} must have one production boundary`);
    }
  }
  // Technical orchestration lives outside both pure policies. These are concrete
  // inward dependency rules, not a requirement for ceremonial layers everywhere.
  for (const id of ["package.extension.core.feature.contributions", "package.extension.node-artifact.feature.verified-artifact.kernel"]) {
    const boundary = boundaries.find(candidate => candidate.id === id);
    requireCondition(boundary !== undefined, `${id} must have a pure policy boundary`);
    const allowed = object(boundary.allow, `${id} allowance`);
    requireEqual(allowed, { boundaries: [], builtins: [], packages: [], runtimeReferences: [] }, `${id} pure policy dependencies`);
  }
}

export function validateFeatureModuleProfile(input: ProfileInput): void {
  const { document, index, navigation } = input;
  const profile = object(input.profile, "profile");
  const manifest = object(input.manifest, "manifest");
  const scripts = object(manifest.scripts, "scripts");
  const sourcePolicy = object(input.sourcePolicy, "source policy");
  requireEqual(Object.keys(profile).sort(), ["schemaVersion", "standard", "owner", "status", "profileDocument", "scope", "mapping", "localExtensions", "authorities", "deviations", "conformance", "enforcement", "productionEvidence"].sort(), "profile fields");
  requireEqual(profile.schemaVersion, 1, "schema version");
  requireEqual(profile.standard, STANDARD, "standard identity");
  requireEqual(profile.owner, "architecture", "owner");
  requireEqual(profile.status, "provisional-packages", "status");
  requireEqual(profile.profileDocument, PROFILE_DOCUMENT, "document path");
  requireEqual(profile.scope, SCOPE, "scope");
  requireEqual(profile.mapping, MAPPING, "mapping");
  requireEqual(profile.localExtensions, LOCAL_EXTENSIONS, "local extensions");
  requireEqual(profile.authorities, AUTHORITIES, "authorities");
  requireEqual(profile.deviations, [], "deviations");
  requireEqual(profile.conformance, { structural: "scoped", runtime: "not-claimed" }, "conformance");
  requireEqual(profile.enforcement, ENFORCEMENT, "enforcement");
  requireEqual(profile.productionEvidence, { packages: PACKAGES, obligations: OBLIGATIONS }, "production evidence");
  requireEqual(input.catalog, { version: 1, packages: PACKAGES.map(entry => ({ id: entry.id, role: entry.role, path: entry.path, package_name: entry.packageName, owner_document: "ADR-0016" })) }, "owned package catalog");
  for (const [name, command] of Object.entries(LEAVES)) requireEqual(scripts[name], command, `script ${name}`);
  requireChain(scripts.check, ["architecture:check"], "check");
  requireChain(scripts["check:fast"], ["architecture:check:fast"], "check:fast");
  for (const gate of ["architecture:check", "architecture:check:fast"]) {
    const required = Object.values(ENFORCEMENT).filter(command =>
      gate === "architecture:check" || command !== ENFORCEMENT.productionSources);
    requireChain(scripts[gate], [...required, "evidence:custody:test"], gate);
  }
  const jobs = object(object(input.workflow, "workflow").jobs, "CI jobs");
  const ci = object(jobs.check, "CI check job");
  requireCondition(ci.if === undefined && ci["continue-on-error"] === undefined && list(ci.steps, "CI steps").some(value => {
    const step = object(value, "CI step");
    return step.run === "pnpm check" && step.if === undefined && step["continue-on-error"] === undefined;
  }), "CI check job must run the blocking full gate");
  const metadata = /^---\r?\n([\s\S]*?)\r?\n---/u.exec(document)?.[1];
  const parsedHeader: unknown = metadata === undefined ? undefined : parseYaml(metadata);
  const header = object(parsedHeader, "document metadata");
  requireCondition(header.id === "architecture.feature-module-standard" && header.type === "architecture" && header.status === "accepted" && header.owner === "architecture", "document metadata is not the adopted profile");
  for (const value of [STANDARD.sha256, PROFILE_PATH, "provisional-packages", "not-claimed"]) {
    requireCondition(document.includes(value), `document omits ${value}`);
  }
  requireCondition(index.includes("(architecture/feature-module-standard-profile.md)"), "docs index must link the profile");
  requireCondition(navigation.includes(`(${PROFILE_DOCUMENT})`), "agent navigation must link the profile");
  const boundaries = list(sourcePolicy.boundaries, "boundaries").map(value => object(value, "boundary"));
  for (const path of ["architecture/checks/feature-module-standard-profile.ts", "tests/feature-module-standard-profile.test.ts"]) {
    const matches = boundaries.filter(boundary => list(boundary.roots, "boundary roots").includes(path));
    const match = matches.at(0);
    requireCondition(matches.length === 1 && match !== undefined && match.dependencyMode === "development" && list(match.entrypoints, "entrypoints").includes(path), `${path} must remain a governed development entrypoint`);
  }
  governedProduction(sourcePolicy);
}

export async function checkFeatureModuleProfile(root: string): Promise<void> {
  const read = (path: string) => readFile(join(root, path), "utf8");
  const [profile, manifest, catalog, document, index, navigation, sourcePolicy, workflow] =
    await Promise.all([
      read(PROFILE_PATH),
      read("package.json"),
      read("architecture/package-catalog.json"),
      read(PROFILE_DOCUMENT),
      read("docs/README.md"),
      read("AGENTS.md"),
      read("architecture/foundation/source-dependencies.yaml"),
      read(".github/workflows/ci.yml"),
    ]);
  validateFeatureModuleProfile({
    profile: parseStrictJson(profile),
    manifest: parseStrictJson(manifest),
    catalog: parseStrictJson(catalog),
    document,
    index,
    navigation,
    sourcePolicy: parseYaml(sourcePolicy),
    workflow: parseYaml(workflow),
  });
  await Promise.all(AUTHORITIES.map(read));
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    await checkFeatureModuleProfile(fileURLToPath(new URL("../..", import.meta.url)));
    console.log(
      "Feature Module Standard profile passed (two provisional packages; structural scope only).",
    );
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
