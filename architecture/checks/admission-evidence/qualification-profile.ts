import type { SourceInputSelection } from "./contracts.ts";

export const qualificationWorkflow = ".github/workflows/package-conformance.yml";
export const qualificationJob = "package-conformance";
export const qualificationRepository = "agent-teams-ai/extension-foundation";
export const qualificationRepositoryId = 1333298097;

/** Closed source roots include newly added files; generated outputs are separate artifacts. */
export const qualificationSourceInputs: SourceInputSelection = {
  roots: ["architecture/checks", "architecture/tooling", "architecture/scaffolding-plans",
    "packages/core/src", "packages/core/test", "packages/node-artifact/src", "packages/node-artifact/test",
    "packages/node-artifact/qualification", "tests", "fixtures/qualification-toy-package"],
  files: ["LICENSE", ".node-version", ".npmrc", qualificationWorkflow, "package.json", "pnpm-lock.yaml", "pnpm-workspace.yaml",
    "tsconfig.json", "tsconfig.node-adapter.json", "tsconfig.qualification.json", "tsconfig.tooling.json", "architecture/package-catalog.json",
    "architecture/foundation/source-dependencies.yaml", "architecture/foundation/scaffolding.yaml",
    "architecture/feature-module-standard-profile.json", "architecture/decisions/accepted-decisions.json",
    "docs/decisions/0016-provisional-contribution-and-verified-artifact-packages.md",
    "packages/core/package.json", "packages/core/tsconfig.json", "packages/core/README.md",
    "packages/node-artifact/package.json", "packages/node-artifact/tsconfig.json", "packages/node-artifact/README.md"],
};

export const qualificationPackages = [
  {
    packageId: "extension.core", packageRoot: "packages/core", consumerId: "qualification.headline-and-quota",
    implementationId: "extension.core.contributions", conformanceVersion: "0.1.0",
    artifactName: "extension-foundation-core-0.0.0.tgz", stepName: "Core conformance proof",
    conformanceInputs: { roots: ["tests/fixtures/packaged-core"], files: ["tests/packaged-core.test.ts"] },
  },
  {
    packageId: "extension.node-artifact", packageRoot: "packages/node-artifact", consumerId: "qualification.signed-artifact-host",
    implementationId: "extension.node-artifact.verified-artifact", conformanceVersion: "0.1.0",
    artifactName: "extension-foundation-node-artifact-0.0.0.tgz", stepName: "Artifact conformance proof",
    conformanceInputs: { roots: ["packages/node-artifact/qualification", "tests/qualification/artifact", "tests/fixtures/packaged-artifact"], files: [] },
  },
] as const;
