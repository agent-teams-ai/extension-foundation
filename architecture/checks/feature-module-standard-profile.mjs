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
  productionRoots: ["packages"], moduleRoots: ["packages/*"],
  applicationRoots: [], excludedRoots: ["architecture", "docs", "tests", "fixtures"],
};
const MAPPING = {
  sourceRoot: "src", featureRoot: "src/features/<feature>",
  moduleComposition: "src/index.ts", publicEntrypoint: "src/index.ts",
  testRoot: "test/features/<feature>",
};
const AUTHORITIES = [
  "docs/architecture/overview.md",
  "docs/decisions/0015-authorize-get-modular-semantic-extraction.md",
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
};
const PENDING = [
  "valid-feature-per-adopted-role", "role-specific-layer-direction",
  "cross-feature-deep-import-rejection", "undeclared-edge-and-cycle-rejection",
  "empty-layer-rejection", "owned-module-exception-rejection",
];
const LEAVES = {
  "architecture:feature-module-profile": "node architecture/checks/feature-module-standard-profile.mjs",
  "architecture:feature-module-profile:test": "node --test tests/feature-module-standard-profile.test.mjs",
  "architecture:topology:check": "node architecture/checks/package-topology.mjs",
  "architecture:source-dependencies:check": "agent-teams-foundation check architecture.source-dependencies",
};

function requireCondition(condition, message) {
  if (!condition) throw new Error(`FMS profile: ${message}`);
}

function requireEqual(actual, expected, name) {
  requireCondition(isDeepStrictEqual(actual, expected), `${name} differs from reviewed adoption`);
}

function requireChain(script, required, name) {
  // This repository uses fail-fast && chains. Do not mistake echo, comments,
  // OR fallbacks or a substring for execution of a blocking command.
  requireCondition(typeof script === "string", `${name} is missing`);
  const commands = script.split("&&").map(command => command.trim());
  requireCondition(commands.every(command => /^(?:pnpm [a-z][\w:-]*|node --import="data:text\/javascript,process\.env\.PACKAGE_POLICY_TEST_MODE='(?:fast|full)'" --test --test-concurrency=1 (?:tests\/[\w.-]+\.test\.mjs ?)+)$/u.test(command)),
    `${name} must be an explicit fail-fast command chain`);
  requireCondition(required.every(command => commands.includes(`pnpm ${command}`)),
    `${name} omits a required command`);
}

export function validateFeatureModuleProfile({ profile, manifest, catalog, document, index, navigation, sourcePolicy, workflow }) {
  requireEqual(Object.keys(profile).sort(), [
    "schemaVersion", "standard", "owner", "status", "profileDocument", "scope", "mapping",
    "localExtensions", "authorities", "deviations", "conformance", "enforcement", "pendingProductionEvidence",
  ].sort(), "profile fields");
  requireEqual(profile.schemaVersion, 1, "schema version");
  requireEqual(profile.standard, STANDARD, "standard identity");
  requireEqual(profile.owner, "architecture", "owner");
  requireEqual(profile.status, "pre-production", "status");
  requireEqual(profile.profileDocument, PROFILE_DOCUMENT, "document path");
  requireEqual(profile.scope, SCOPE, "scope");
  requireEqual(profile.mapping, MAPPING, "mapping");
  requireEqual(profile.localExtensions, LOCAL_EXTENSIONS, "local extensions");
  requireEqual(profile.authorities, AUTHORITIES, "authorities");
  requireEqual(profile.deviations, [], "deviations");
  requireEqual(profile.conformance, { structural: "not-claimed", runtime: "not-claimed" }, "conformance");
  requireEqual(profile.enforcement, ENFORCEMENT, "enforcement");
  requireEqual(profile.pendingProductionEvidence, PENDING, "pending production evidence");
  requireEqual(catalog, { version: 1, packages: [] }, "pre-production catalog");
  for (const [name, command] of Object.entries(LEAVES)) {
    requireEqual(manifest.scripts?.[name], command, `script ${name}`);
  }
  requireChain(manifest.scripts?.check, ["architecture:check"], "check");
  requireChain(manifest.scripts?.["check:fast"], ["architecture:check:fast"], "check:fast");
  for (const gate of ["architecture:check", "architecture:check:fast"]) {
    requireChain(manifest.scripts?.[gate], Object.values(ENFORCEMENT), gate);
  }
  const ci = workflow?.jobs?.check;
  requireCondition(ci?.if === undefined && ci?.["continue-on-error"] === undefined
    && ci?.steps?.some(step => step.run === "pnpm check" && step.if === undefined
      && step["continue-on-error"] === undefined), "CI check job must run the blocking full gate");
  const metadata = /^---\r?\n([\s\S]*?)\r?\n---/u.exec(document)?.[1];
  const header = metadata === undefined ? undefined : parseYaml(metadata);
  requireCondition(header?.id === "architecture.feature-module-standard"
    && header?.type === "architecture" && header?.status === "accepted"
    && header?.owner === "architecture", "document metadata is not the adopted profile");
  for (const value of [STANDARD.sha256, PROFILE_PATH, "pre-production", "not-claimed"]) {
    requireCondition(document.includes(value), `document omits ${value}`);
  }
  requireCondition(index.includes("(architecture/feature-module-standard-profile.md)"), "docs index must link the profile");
  requireCondition(navigation.includes(`(${PROFILE_DOCUMENT})`), "agent navigation must link the profile");
  for (const path of ["architecture/checks/feature-module-standard-profile.mjs", "tests/feature-module-standard-profile.test.mjs"]) {
    const matches = sourcePolicy.boundaries.filter(boundary => boundary.roots.includes(path));
    requireCondition(matches.length === 1 && matches[0].dependencyMode === "development"
      && matches[0].entrypoints.includes(path), `${path} must remain a governed development entrypoint`);
  }
}

export async function checkFeatureModuleProfile(root) {
  const read = path => readFile(join(root, path), "utf8");
  const [profile, manifest, catalog, document, index, navigation, sourcePolicy, workflow] = await Promise.all([
    read(PROFILE_PATH), read("package.json"), read("architecture/package-catalog.json"),
    read(PROFILE_DOCUMENT), read("docs/README.md"), read("AGENTS.md"),
    read("architecture/foundation/source-dependencies.yaml"),
    read(".github/workflows/ci.yml"),
  ]);
  validateFeatureModuleProfile({
    profile: parseStrictJson(profile), manifest: parseStrictJson(manifest),
    catalog: parseStrictJson(catalog), document, index, navigation,
    sourcePolicy: parseYaml(sourcePolicy),
    workflow: parseYaml(workflow),
  });
  await Promise.all(AUTHORITIES.map(read));
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    await checkFeatureModuleProfile(fileURLToPath(new URL("../..", import.meta.url)));
    console.log("Feature Module Standard profile passed (pre-production; conformance not claimed).");
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
