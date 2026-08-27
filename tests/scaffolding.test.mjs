import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { cp, mkdir, mkdtemp, readFile, readdir, rm, stat, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import test from "node:test";

import {
  applyFilesystemScaffold,
  planScaffoldFromFile,
  recoverFilesystemScaffold,
} from "@agent-teams/engineering-foundation/scaffolding";
import {
  applyScaffoldPlan,
  assertScaffoldOperationPaths,
  publishScaffoldPlan,
  runScaffoldCli,
} from "../architecture/checks/scaffold.mjs";
import { validateBuiltPackageArtifacts } from "../architecture/checks/package-artifacts.mjs";
import { validatePackageTopology as validateRepositoryPackageTopology } from "../architecture/checks/package-topology.mjs";

const execFileAsync = promisify(execFile);
const repositoryRoot = fileURLToPath(new URL("..", import.meta.url));
const foundationScaffoldingUrl = import.meta.resolve("@agent-teams/engineering-foundation/scaffolding");
const scaffoldAdapterUrl = new URL("../architecture/checks/scaffold.mjs", import.meta.url).href;
const foundationScaffoldingInternalUrl = new URL(
  "./adapters/node/filesystem-authority-workspace.js",
  foundationScaffoldingUrl,
).href;
const foundationCli = fileURLToPath(new URL("./cli.js", import.meta.resolve("@agent-teams/engineering-foundation")));
const typescriptCli = fileURLToPath(new URL("./bin/tsc", import.meta.resolve("typescript/package.json")));

const acceptedOwner = async id => ({
  id,
  type: "adr",
  status: "accepted",
  supersededBy: [],
  packageOwnership: [{
    packageId: "module.example",
    packageName: "@agent-teams/example",
    packagePath: "packages/example",
    semanticClassification: "ordinary-library",
    features: ["example"],
  }],
});
const acceptedOwners = async () => [await acceptedOwner("ADR-0099")];
const noTrackedPackagePaths = async () => [];

function validatePackageTopology(options) {
  return validateRepositoryPackageTopology({
    ...options,
    loadMaterializationPlan: options.loadMaterializationPlan ?? (async root => planScaffoldFromFile({
      consumerRoot: root,
      intentPath: "architecture/scaffolding-intents/example.yaml",
    })),
    listEffectiveOwners: options.listEffectiveOwners ?? acceptedOwners,
    readTrackedPackagePaths: options.readTrackedPackagePaths ?? noTrackedPackagePaths,
    verifyAdmissionEvidence: options.verifyAdmissionEvidence ?? (async ({ request }) => ({
      ...request,
      outcome: "satisfied",
    })),
  });
}

async function writeFixture(root, path, contents) {
  const target = join(root, path);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, contents);
}

function packageAdmission(packageId = "module.example", extractionDecision = "ADR-0099") {
  return {
    schema_version: 4,
    admission_basis: "public-spi",
    package_id: packageId,
    owner_repository: "agent-teams-ai/extension-foundation",
    extraction_decision: extractionDecision,
    neutrality_claim: "The capability contains no product-owned language or runtime authority.",
    release_policy: "Exact SemVer with immutable packed-artifact evidence.",
    semantic_classification: "ordinary-library",
    semantic_extraction_decision: "not-applicable",
    conformance_version: "1.0.0",
    consumer_evidence: [
      {
        consumer_id: "consumer.alpha",
        implementation_id: "implementation.alpha",
        consumer_repository: "agent-teams-ai/consumer-alpha",
        evidence_kind: "product-slice",
        source_revision: "1111111111111111111111111111111111111111",
        conformance_result: "passed",
        evidence_reference: `docs/evidence/consumer-alpha.json#sha256=${"a".repeat(64)}`,
      },
      {
        consumer_id: "consumer.beta",
        implementation_id: "implementation.beta",
        consumer_repository: "agent-teams-ai/consumer-beta",
        evidence_kind: "independent-conformance",
        source_revision: "2222222222222222222222222222222222222222",
        conformance_result: "passed",
        evidence_reference: `docs/evidence/consumer-beta.json#sha256=${"b".repeat(64)}`,
      },
    ],
  };
}

async function createConsumer() {
  const root = await mkdtemp(join(tmpdir(), "extension-scaffolding-"));
  const catalog = {
    version: 1,
    packages: [{
      id: "module.example",
      role: "foundation-component",
      path: "packages/example",
      package_name: "@agent-teams/example",
      owner_document: "ADR-0099",
    }],
  };

  await writeFixture(root, "architecture/package-catalog.json", `${JSON.stringify(catalog)}\n`);
  await writeFixture(
    root,
    "architecture/package-admissions/module-dot-example.json",
    `${JSON.stringify(packageAdmission())}\n`,
  );
  await writeFixture(root, "architecture/foundation/scaffolding.yaml", `schemaVersion: 1
projectId: extension-foundation-fixture
targetCatalogPath: architecture/package-catalog.json
compositions:
  - id: extension-foundation-library-boundary
    scaffoldProfile:
      ref:
        id: foundation.node-typescript-pnpm-esm
        contractVersion: 1
      parameters:
        tsconfigBase: tsconfig.json
    recipe:
      ref:
        id: foundation.node-typescript-library-boundary
        contractVersion: 1
    targetRoles:
      - foundation-component
    authorityVerifiers:
      - id: foundation.markdown-yaml-owner
        contractVersion: 1
        parameters:
          allowedStatuses:
            - accepted
          documentRoots:
            - docs/decisions
    policies: []
`);
  await writeFixture(root, "architecture/scaffolding-intents/example.yaml", `schemaVersion: 1
compositionId: extension-foundation-library-boundary
targetRef: module.example
`);
  await writeFixture(root, "package.json", '{"name":"fixture","private":true,"type":"module"}\n');
  await writeFixture(root, "pnpm-workspace.yaml", 'packages:\n  - "packages/**"\n');
  await writeFixture(root, "docs/decisions/0099-example-package.md", `---
id: ADR-0099
type: adr
status: accepted
owner: architecture
summary: Owns the disposable package used by scaffolding qualification.
approved_by: product-owner
accepted_at: 2026-08-23
package_ownership:
  - package_id: module.example
    package_name: "@agent-teams/example"
    package_path: packages/example
    semantic_classification: ordinary-library
    features: [example]
---

# ADR-0099: Example Package
`);
  await writeFixture(root, "docs/decisions/README.md", `---
id: decisions.index
type: index
status: active
owner: architecture
summary: Canonical index of fixture decisions.
---

# Architecture Decision Records

## Proposed decisions

## Accepted decisions

- [ADR-0099: Example Package](0099-example-package.md)

## Superseded decisions
`);
  await writeFixture(root, "architecture/foundation/governance-architecture-decisions.yaml", `schemaVersion: 1
adrRoots:
  - docs/decisions
index:
  path: docs/decisions/README.md
  sections:
    proposed: Proposed decisions
    accepted: Accepted decisions
    superseded: Superseded decisions
acceptedBaselinePath: architecture/decisions/accepted-decisions.json
`);
  await writeFixture(root, "foundation.config.yaml", `schemaVersion: 1
project:
  id: extension-scaffolding-fixture
capabilities:
  governance.architecture-decisions:
    configPath: architecture/foundation/governance-architecture-decisions.yaml
`);
  await execFileAsync(process.execPath, [
    foundationCli,
    "architecture-decisions-promote-baseline",
    "--consumer",
    root,
    "--json",
  ], { cwd: root });
  for (const path of [
    "architecture/foundation/docs-protocol.yaml",
    "architecture/foundation/document-authoring.yaml",
    "docs/metadata.schema.json",
    "docs/owners.yaml",
    "docs/templates/adr.md",
    "docs/templates/architecture.md",
    "docs/templates/open-decision.md",
    ".agents/skills/docs-authoring/SKILL.md",
  ]) {
    await writeFixture(root, path, await readFile(join(repositoryRoot, path), "utf8"));
  }
  await writeFixture(root, "node_modules/@agent-teams/engineering-foundation/presets/typescript/node.json", '{"compilerOptions":{"module":"nodenext","moduleResolution":"nodenext","target":"es2024","strict":true}}\n');
  await writeFixture(root, "tsconfig.json", '{"extends":"@agent-teams/engineering-foundation/presets/typescript/node.json","compilerOptions":{"composite":true,"noEmit":true},"files":[]}\n');
  return root;
}

async function exists(path) {
  try {
    await stat(path);
    return true;
  } catch (error) {
    if (error?.code === "ENOENT") return false;
    throw error;
  }
}

test("repository adapter publishes create-only, applies, and confirms clean recovery", async () => {
  const root = await createConsumer();
  try {
    const { plan, planDigest } = await publishScaffoldPlan({
      root,
      intentPath: "architecture/scaffolding-intents/example.yaml",
      planPath: "architecture/scaffolding-plans/module-dot-example.json",
    });
    assert.deepEqual(
      JSON.parse(await readFile(join(root, "architecture/scaffolding-plans/module-dot-example.json"), "utf8")),
      plan,
    );

    const receipt = await applyScaffoldPlan({
      root,
      planPath: "architecture/scaffolding-plans/module-dot-example.json",
      expectedPlanDigest: planDigest,
    });
    assert.equal(receipt.outcome, "applied");

    assert.equal(await recoverFilesystemScaffold(root), undefined);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("plan publication cannot overwrite, traverse, or follow a plan-directory symlink", async () => {
  const root = await createConsumer();
  try {
    const input = {
      root,
      intentPath: "architecture/scaffolding-intents/example.yaml",
      planPath: "architecture/scaffolding-plans/module-dot-example.json",
    };
    const first = await publishScaffoldPlan(input);
    const original = await readFile(join(root, input.planPath), "utf8");
    const repeated = await publishScaffoldPlan(input);
    assert.equal(repeated.planDigest, first.planDigest);
    assert.equal(await readFile(join(root, input.planPath), "utf8"), original);
    await assert.rejects(publishScaffoldPlan({
      ...input,
      planPath: "../escaped.json",
    }), /plan path must be architecture\/scaffolding-plans\/module-dot-example\.json/u);

    const linkedRoot = await createConsumer();
    try {
      await mkdir(join(linkedRoot, "outside"));
      await symlink(join(linkedRoot, "outside"), join(linkedRoot, "architecture/scaffolding-plans"));
      await assert.rejects(publishScaffoldPlan({
        ...input,
        root: linkedRoot,
      }), /symbolic link/u);
    } finally {
      await rm(linkedRoot, { recursive: true, force: true });
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("plan publication converges after process loss before and after create-only linking", async t => {
  for (const phase of ["after-plan-temporary-synced", "after-plan-hard-link"]) {
    await t.test(phase, async () => {
      const root = await createConsumer();
      try {
        const publisher = `
          import { publishScaffoldPlan } from ${JSON.stringify(scaffoldAdapterUrl)};
          await publishScaffoldPlan({
            root: process.argv[1],
            intentPath: "architecture/scaffolding-intents/example.yaml",
            planPath: "architecture/scaffolding-plans/module-dot-example.json",
            onPublicationFault: async point => {
              if (point.phase === process.argv[2]) process.exit(73);
            },
          });
        `;
        await assert.rejects(
          execFileAsync(process.execPath, ["--input-type=module", "--eval", publisher, root, phase]),
          error => error?.code === 73,
        );

        const planPath = "architecture/scaffolding-plans/module-dot-example.json";
        const retries = await Promise.all(Array.from({ length: 8 }, () => publishScaffoldPlan({
          root,
          intentPath: "architecture/scaffolding-intents/example.yaml",
          planPath,
        })));
        const { planDigest } = retries[0];
        assert.equal(retries.every(retry => retry.planDigest === planDigest), true);
        const publishedBytes = await readFile(join(root, planPath), "utf8");
        assert.doesNotThrow(() => JSON.parse(publishedBytes));
        assert.equal(
          (await readdir(join(root, "architecture/scaffolding-plans")))
            .some(name => name.includes(".publication-") && name.endsWith(".tmp")),
          false,
        );
        assert.equal((await applyScaffoldPlan({
          root,
          planPath,
          expectedPlanDigest: planDigest,
        })).outcome, "applied");
      } finally {
        await rm(root, { recursive: true, force: true });
      }
    });
  }
});

test("plan publication removes process-loss temporaries from superseded digests", async () => {
  const root = await createConsumer();
  const orphan = join(
    root,
    "architecture/scaffolding-plans/.module-dot-example.json.publication-deadbeef.abandoned.tmp",
  );
  try {
    await writeFixture(
      root,
      "architecture/scaffolding-plans/.module-dot-example.json.publication-deadbeef.abandoned.tmp",
      "abandoned publication bytes\n",
    );
    assert.equal(await exists(orphan), true);
    await publishScaffoldPlan({
      root,
      intentPath: "architecture/scaffolding-intents/example.yaml",
      planPath: "architecture/scaffolding-plans/module-dot-example.json",
    });
    assert.equal(await exists(orphan), false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("scaffolding plans, applies, proves idempotency, and never overwrites drift", async () => {
  const root = await createConsumer();
  try {
    const plan = await planScaffoldFromFile({
      consumerRoot: root,
      intentPath: "architecture/scaffolding-intents/example.yaml",
    });
    assert.equal(plan.target.id, "module.example");
    assert.equal(plan.operations.length, 3);

    const applied = await applyFilesystemScaffold(root, plan);
    assert.equal(applied.outcome, "applied");
    assert.equal(await exists(join(root, "packages/example/package.json")), true);

    const repeated = await applyFilesystemScaffold(root, plan);
    assert.equal(repeated.outcome, "already-applied");

    const changed = "export const userOwned = true;\n";
    await writeFile(join(root, "packages/example/src/index.ts"), changed);
    const rejected = await applyFilesystemScaffold(root, plan);
    assert.equal(rejected.outcome, "rejected");
    assert.equal(await readFile(join(root, "packages/example/src/index.ts"), "utf8"), changed);
    assert.equal(await recoverFilesystemScaffold(root), undefined);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("scaffolding rejects stale owner authority before publishing files", async () => {
  const root = await createConsumer();
  try {
    const plan = await planScaffoldFromFile({
      consumerRoot: root,
      intentPath: "architecture/scaffolding-intents/example.yaml",
    });
    const ownerPath = join(root, "docs/decisions/0099-example-package.md");
    const owner = await readFile(ownerPath, "utf8");
    await writeFile(ownerPath, owner.replace("disposable package", "changed disposable package"));

    const receipt = await applyFilesystemScaffold(root, plan);
    assert.equal(receipt.outcome, "authority-stale");
    assert.equal(await exists(join(root, "packages/example")), false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("production owner resolution ignores injected resolvers and rejects changed ADR authority", async () => {
  for (const mutation of [
    ledger => { ledger.decisions[0].path = "docs/decisions/relocated-owner.md"; },
    ledger => { ledger.decisions[0].immutableDigest = `sha256:${"a".repeat(64)}`; },
  ]) {
    const root = await createConsumer();
    try {
      const baselinePath = join(root, "architecture/decisions/accepted-decisions.json");
      const baseline = JSON.parse(await readFile(baselinePath, "utf8"));
      mutation(baseline);
      await writeFile(baselinePath, `${JSON.stringify(baseline)}\n`);
      await assert.rejects(
        publishScaffoldPlan({
          root,
          intentPath: "architecture/scaffolding-intents/example.yaml",
          planPath: "architecture/scaffolding-plans/module-dot-example.json",
          resolveOwner: acceptedOwner,
        }),
        /Accepted ADR governance rejected package ownership authority/u,
      );
      assert.equal(await exists(join(root, "packages/example")), false);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  }
});

test("default owner resolution rejects duplicate decision lifecycle sections", async () => {
  const root = await createConsumer();
  try {
    const indexPath = join(root, "docs/decisions/README.md");
    const index = await readFile(indexPath, "utf8");
    await writeFile(indexPath, index.replace("## Superseded decisions", "## Accepted decisions"));
    await assert.rejects(
      publishScaffoldPlan({
        root,
        intentPath: "architecture/scaffolding-intents/example.yaml",
        planPath: "architecture/scaffolding-plans/module-dot-example.json",
      }),
      /requires exactly one proposed, accepted, and superseded section/u,
    );
    assert.equal(await exists(join(root, "packages/example")), false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("scaffold output reaches a valid package only after the owner adds its real slice and boundary", async () => {
  const root = await createConsumer();
  try {
    const { plan, planDigest } = await publishScaffoldPlan({
      root,
      intentPath: "architecture/scaffolding-intents/example.yaml",
      planPath: "architecture/scaffolding-plans/module-dot-example.json",
    });
    assert.equal((await applyScaffoldPlan({
      root,
      planPath: "architecture/scaffolding-plans/module-dot-example.json",
      expectedPlanDigest: planDigest,
    })).outcome, "applied");
    await writeFixture(root, "packages/example/src/index.ts", 'export { capability } from "./features/example/index.js";\n');
    await writeFixture(root, "packages/example/src/features/example/capability.ts", "export const capability = true;\n");
    await writeFixture(root, "packages/example/src/features/example/index.ts", 'export { capability } from "./capability.js";\n');
    await writeFixture(root, "packages/example/test/features/example/capability.test.ts", 'import assert from "node:assert/strict";\nimport test from "node:test";\nimport { capability } from "../../../src/features/example/index.ts";\ntest("capability", () => { assert.equal(capability, true); });\n');
    await writeFixture(root, "architecture/foundation/source-dependencies.yaml", `schemaVersion: 1
workspace: {kind: pnpm, manifest: pnpm-workspace.yaml}
governedRoots: [packages/example/src, packages/example/test]
boundaries:
  - id: package.module.example
    dependencyMode: runtime
    roots: [packages/example/src]
    entrypoints: [packages/example/src/index.ts]
    allow: {boundaries: [package.module.example.feature.example], packages: [], builtins: [], runtimeReferences: []}
  - id: package.module.example.feature.example
    dependencyMode: runtime
    roots: [packages/example/src/features/example]
    entrypoints: [packages/example/src/features/example/index.ts]
    allow: {boundaries: [], packages: [], builtins: [], runtimeReferences: []}
  - id: package.module.example.feature.example.test
    dependencyMode: development
    roots: [packages/example/test/features/example]
    entrypoints: []
    allow: {boundaries: [package.module.example.feature.example], packages: [], builtins: [node:assert/strict, node:test], runtimeReferences: []}
`);
    assert.equal(plan.target.ownerDocument.id, "ADR-0099");
    assert.deepEqual(await validatePackageTopology({ root, resolveOwner: acceptedOwner }), []);
    await writeFixture(root, "foundation.config.yaml", `schemaVersion: 1
project: {id: extension-scaffolding-fixture}
capabilities:
  architecture.source-dependencies:
    configPath: architecture/foundation/source-dependencies.yaml
`);
    const testPath = "packages/example/test/features/example/capability.test.ts";
    await writeFixture(root, testPath, 'import test from "node:test";\nimport { capability } from "../../../src/features/example/capability.ts";\ntest("capability", () => { void capability; });\n');
    await assert.rejects(
      execFileAsync(process.execPath, [foundationCli, "check", "architecture.source-dependencies"], {
        cwd: root,
      }),
      error => `${error?.stdout ?? ""}\n${error?.stderr ?? ""}`.includes("not a declared entrypoint"),
    );
    await writeFixture(root, testPath, 'import assert from "node:assert/strict";\nimport test from "node:test";\nimport { capability } from "../../../src/features/example/index.ts";\ntest("capability", () => { assert.equal(capability, true); });\n');
    await execFileAsync(process.execPath, [foundationCli, "check", "architecture.source-dependencies"], {
      cwd: root,
    });
    await execFileAsync(process.execPath, [typescriptCli, "--project", "tsconfig.json", "--pretty", "false"], {
      cwd: join(root, "packages/example"),
    });
    await execFileAsync(process.execPath, ["--test", "--test-concurrency=1"], {
      cwd: join(root, "packages/example"),
    });
    assert.deepEqual(await validateBuiltPackageArtifacts({ root }), []);
    const consumer = join(root, "consumer");
    await mkdir(join(consumer, "node_modules/@agent-teams"), { recursive: true });
    await cp(join(root, "packages/example"), join(consumer, "node_modules/@agent-teams/example"), {
      recursive: true,
    });
    const { stdout } = await execFileAsync(process.execPath, [
      "--input-type=module",
      "--eval",
      'import { capability } from "@agent-teams/example"; console.log(capability);',
    ], { cwd: consumer });
    assert.equal(stdout.trim(), "true");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("apply rejects a plan after its catalog identity changes", async () => {
  const root = await createConsumer();
  try {
    const { planDigest } = await publishScaffoldPlan({
      root,
      intentPath: "architecture/scaffolding-intents/example.yaml",
      planPath: "architecture/scaffolding-plans/module-dot-example.json",
    });
    const catalogPath = join(root, "architecture/package-catalog.json");
    const catalog = JSON.parse(await readFile(catalogPath, "utf8"));
    catalog.packages[0].path = "packages/renamed";
    await writeFile(catalogPath, `${JSON.stringify(catalog)}\n`);
    await assert.rejects(applyScaffoldPlan({
      root,
      planPath: "architecture/scaffolding-plans/module-dot-example.json",
      expectedPlanDigest: planDigest,
    }), /differs from the repository-owned package policy/u);
    assert.equal(await exists(join(root, "packages/example")), false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("apply rejects a symbolic-link plan file", async () => {
  const root = await createConsumer();
  try {
    await mkdir(join(root, "architecture/scaffolding-plans"));
    await writeFixture(root, "outside.json", "{}\n");
    await symlink(join(root, "outside.json"), join(root, "architecture/scaffolding-plans/module-dot-example.json"));
    await assert.rejects(applyScaffoldPlan({
      root,
      planPath: "architecture/scaffolding-plans/module-dot-example.json",
      expectedPlanDigest: "sha256:missing",
    }), /symbolic link/u);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("apply binds the reviewed plan digest and rejects edited plan bytes", async () => {
  const root = await createConsumer();
  try {
    const { planDigest } = await publishScaffoldPlan({
      root,
      intentPath: "architecture/scaffolding-intents/example.yaml",
      planPath: "architecture/scaffolding-plans/module-dot-example.json",
    });
    const path = join(root, "architecture/scaffolding-plans/module-dot-example.json");
    const plan = JSON.parse(await readFile(path, "utf8"));
    plan.operations[0].after.contentBase64 = Buffer.from("changed\n").toString("base64");
    await writeFile(path, `${JSON.stringify(plan, null, 2)}\n`);
    await assert.rejects(applyScaffoldPlan({
      root,
      planPath: "architecture/scaffolding-plans/module-dot-example.json",
      expectedPlanDigest: planDigest,
    }), /digest/u);
    assert.equal(await exists(join(root, "packages/example")), false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("CLI returns nonzero for rejected apply and unresolved recovery", async () => {
  const root = await createConsumer();
  try {
    const { planDigest } = await publishScaffoldPlan({
      root,
      intentPath: "architecture/scaffolding-intents/example.yaml",
      planPath: "architecture/scaffolding-plans/module-dot-example.json",
    });
    await writeFixture(root, "packages/example/src/index.ts", "export const drift = true;\n");
    assert.equal(await runScaffoldCli({
      root,
      args: ["apply", "architecture/scaffolding-plans/module-dot-example.json", planDigest],
      write: () => undefined,
    }), 2);
    assert.equal(await runScaffoldCli({
      root,
      args: ["recover"],
      recover: async () => ({ outcome: "recovery-required" }),
      write: () => undefined,
    }), 2);
    assert.equal(await runScaffoldCli({
      root,
      args: ["recover"],
      recover: async () => ({ outcome: "failed-recovered" }),
      write: () => undefined,
    }), 2);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("operation paths reject Windows separator escapes before apply", async () => {
  const root = await createConsumer();
  try {
    assert.throws(() => assertScaffoldOperationPaths(root, "packages/example", [{
      path: "packages/example/..\\other/file.ts",
    }]), /inside the cataloged package root/u);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("CLI uses the real Docs owner resolver and rejects changed authority", async () => {
  const root = await createConsumer();
  try {
    const output = [];
    assert.equal(await runScaffoldCli({
      root,
      args: [
        "plan",
        "architecture/scaffolding-intents/example.yaml",
        "architecture/scaffolding-plans/module-dot-example.json",
      ],
      write: value => output.push(value),
    }), 0);
    const { planDigest } = JSON.parse(output.at(-1));
    const ownerPath = join(root, "docs/decisions/0099-example-package.md");
    const owner = await readFile(ownerPath, "utf8");
    await writeFile(ownerPath, owner.replace("disposable package", "changed disposable package"));
    await assert.rejects(
      runScaffoldCli({
        root,
        args: ["apply", "architecture/scaffolding-plans/module-dot-example.json", planDigest],
        write: () => undefined,
      }),
      /Accepted ADR governance rejected package ownership authority/u,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("scaffold rejects nested catalog roots before any operation", async () => {
  const root = await createConsumer();
  try {
    const catalogPath = join(root, "architecture/package-catalog.json");
    const catalog = JSON.parse(await readFile(catalogPath, "utf8"));
    catalog.packages.push({
      id: "module.child",
      role: "foundation-component",
      path: "packages/example/internal",
      package_name: "@agent-teams/example-child",
      owner_document: "ADR-0099",
    });
    await writeFile(catalogPath, `${JSON.stringify(catalog)}\n`);
    await writeFixture(
      root,
      "architecture/package-admissions/module-dot-child.json",
      `${JSON.stringify(packageAdmission("module.child"))}\n`,
    );
    await assert.rejects(publishScaffoldPlan({
      root,
      intentPath: "architecture/scaffolding-intents/example.yaml",
      planPath: "architecture/scaffolding-plans/module-dot-example.json",
    }), /package path overlaps/u);
    assert.equal(await exists(join(root, "packages/example")), false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("every scaffold fault point converges or fails closed without overwriting evidence", async t => {
  const phases = [
    "after-journal-temporary-synced",
    "after-journal-prepared",
    "before-operation-authority-recheck",
    "after-journal-operation-publishing",
    "after-temporary-synced",
    "after-hard-link",
    "after-journal-operation-published",
    "before-final-authority-recheck",
    "after-final-verification",
    "before-journal-quarantine",
    "after-journal-unlinked",
  ];
  const errorRecoveryPhases = new Set(["after-journal-temporary-synced"]);
  const boundedManualRecoveryPhases = new Set(["after-temporary-synced", "after-hard-link"]);
  for (const phase of phases) {
    await t.test(phase, async () => {
      const root = await createConsumer();
      try {
        const plan = await planScaffoldFromFile({
          consumerRoot: root,
          intentPath: "architecture/scaffolding-intents/example.yaml",
        });
        const writer = `
          import { planScaffoldFromFile } from ${JSON.stringify(foundationScaffoldingUrl)};
          import { applyAuthorityFilesystemScaffoldWithFaultInjection } from ${JSON.stringify(foundationScaffoldingInternalUrl)};
          const root = process.argv[1];
          const phase = process.argv[2];
          const plan = await planScaffoldFromFile({
            consumerRoot: root,
            intentPath: "architecture/scaffolding-intents/example.yaml",
          });
          await applyAuthorityFilesystemScaffoldWithFaultInjection(root, plan, async point => {
            if (point.phase === phase) process.exit(73);
          });
        `;
        await assert.rejects(
          execFileAsync(process.execPath, ["--input-type=module", "--eval", writer, root, phase]),
          error => error?.code === 73,
        );
        const recoverer = `
          import { recoverFilesystemScaffold } from ${JSON.stringify(foundationScaffoldingUrl)};
          console.log(JSON.stringify((await recoverFilesystemScaffold(process.argv[1])) ?? null));
        `;
        let stdout;
        try {
          ({ stdout } = await execFileAsync(
            process.execPath,
            ["--input-type=module", "--eval", recoverer, root],
          ));
        } catch (error) {
          assert.equal(errorRecoveryPhases.has(phase), true);
          assert.match(`${error?.stderr ?? ""}`, /orphan Foundation transaction temporary/u);
          assert.equal(await exists(join(root, "packages/example")), false);
          return;
        }
        const recovery = JSON.parse(stdout);
        if (recovery !== null) {
          if (recovery.outcome === "recovery-required") {
            assert.equal(boundedManualRecoveryPhases.has(phase), true);
            const repeated = await recoverFilesystemScaffold(root);
            assert.equal(repeated?.outcome, "recovery-required");
            for (const operation of plan.operations) {
              if (await exists(join(root, operation.path))) {
                assert.deepEqual(
                  await readFile(join(root, operation.path)),
                  Buffer.from(operation.after.contentBase64, "base64"),
                );
              }
            }
            return;
          }
          assert.ok(["applied", "failed-recovered"].includes(recovery.outcome));
        }
        for (const operation of plan.operations) {
          assert.deepEqual(
            await readFile(join(root, operation.path)),
            Buffer.from(operation.after.contentBase64, "base64"),
          );
        }
        assert.equal((await applyFilesystemScaffold(root, plan)).outcome, "already-applied");

        const driftPath = join(root, plan.operations[0].path);
        await writeFile(driftPath, "user-owned drift\n");
        assert.equal((await applyFilesystemScaffold(root, plan)).outcome, "rejected");
        assert.equal(await readFile(driftPath, "utf8"), "user-owned drift\n");
        assert.equal(await recoverFilesystemScaffold(root), undefined);
      } finally {
        await rm(root, { recursive: true, force: true });
      }
    });
  }
});
