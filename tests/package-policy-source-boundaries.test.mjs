import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import test from "node:test";
import { createSourceBoundaryFixture } from "./source-boundary-fixture.ts";

const execFileAsync = promisify(execFile);
const repositoryRoot = fileURLToPath(new URL("..", import.meta.url));
const foundationCli = fileURLToPath(
  new URL("./cli.js", import.meta.resolve("@agent-teams/engineering-foundation")),
);
const skipExpensiveIntegration =
  process.env.PACKAGE_POLICY_TEST_MODE === "fast" ? "skipped in package-policy fast mode" : false;
const checkerFixture = () => createSourceBoundaryFixture(repositoryRoot);

async function runChecker(root) {
  try {
    const { stdout } = await execFileAsync(
      process.execPath,
      [foundationCli, "check", "architecture.source-dependencies", "--format", "json"],
      { cwd: root, maxBuffer: 16 * 1024 * 1024 },
    );
    return { ...JSON.parse(stdout), exitCode: 0 };
  } catch (error) {
    return { ...JSON.parse(error.stdout), exitCode: error.code };
  }
}

async function withMutation(path, source, expectedRule) {
  const root = await checkerFixture();
  try {
    await writeFile(join(root, path), source);
    const report = await runChecker(root);
    const diagnostics = report.capabilities.flatMap((capability) => capability.diagnostics);
    assert.ok(
      diagnostics.some((diagnostic) => diagnostic.ruleId === expectedRule),
      JSON.stringify(report),
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

test(
  "official checker accepts the stable package-policy boundary",
  { skip: skipExpensiveIntegration },
  async () => {
    const report = await runChecker(repositoryRoot);
    assert.equal(report.exitCode, 0, JSON.stringify(report));
    assert.equal(report.summary.errors, 0, JSON.stringify(report));
  },
);

test(
  "official checker rejects forbidden pure dependencies",
  { skip: skipExpensiveIntegration },
  async (t) => {
    for (const [name, dependency, rule] of [
      ["Node", "node:fs/promises", "architecture.source-dependencies.forbidden-builtin-dependency"],
      ["YAML", "yaml", "architecture.source-dependencies.forbidden-package-dependency"],
      [
        "Docs Protocol",
        "@agent-teams/docs-protocol",
        "architecture.source-dependencies.forbidden-package-dependency",
      ],
      [
        "source adapter",
        "./repository-policy-source.mjs",
        "architecture.source-dependencies.forbidden-boundary-dependency",
      ],
    ]) {
      await t.test(name, () =>
        withMutation(
          "architecture/checks/package-policy/catalog-policy.mjs",
          `import ${JSON.stringify(dependency)};\nexport const value = true;\n`,
          rule,
        ),
      );
    }
  },
);

test(
  "official checker rejects platform implementation and declaration edges in contribution compatibility",
  { skip: skipExpensiveIntegration },
  async () => {
    for (const source of [
      'import "node:fs"; export const candidate = true;\n',
      'import type { Stats } from "node:fs"; export type LeakedState = Stats;\n',
    ]) {
      await withMutation("tests/qualification/contribution-compatibility.ts", source,
        "architecture.source-dependencies.forbidden-builtin-dependency");
    }
  },
);

test(
  "source v3 rejects includeRootPackage as an unknown public field",
  { skip: skipExpensiveIntegration },
  async () => {
    const root = await checkerFixture();
    try {
      const policyPath = join(root, "architecture/foundation/source-dependencies.yaml");
      const policy = await readFile(policyPath, "utf8");
      await writeFile(
        policyPath,
        policy.replace(/rootPackage:\s*true\r?\n/, "includeRootPackage: true\n"),
      );
      const report = await runChecker(root);
      assert.notEqual(report.summary.outcome ?? report.outcome, "passed");
      const text = JSON.stringify(report);
      assert.match(text, /includeRootPackage|unknown property|invalid-input/iu);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  },
);

test(
  "official checker rejects consumer deep imports and production test imports",
  { skip: skipExpensiveIntegration },
  async () => {
    await withMutation(
      "architecture/checks/package-artifacts.mjs",
      'import "./package-policy/catalog-policy.mjs";\n',
      "architecture.source-dependencies.forbidden-boundary-dependency",
    );
    await withMutation(
      "architecture/checks/package-artifacts.mjs",
      'import "../../tests/package-policy-characterization.test.mjs";\n',
      "architecture.source-dependencies.forbidden-boundary-dependency",
    );
  },
);

test("installed source gate rejects unavailable declared inputs", async (t) => {
  for (const [name, mutate, expected] of [
    [
      "missing boundary source",
      (root) => rm(join(root, "architecture/checks/product-source-evidence.d.mts")),
      /product-source-evidence\.d\.mts/u,
    ],
    [
      "missing governed root",
      (root) => rm(join(root, "architecture/tooling"), { recursive: true }),
      /architecture\/tooling/u,
    ],
    [
      "missing policy",
      (root) => rm(join(root, "architecture/foundation/source-dependencies.yaml")),
      /source-dependencies\.yaml/u,
    ],
    [
      "nonregular policy",
      async (root) => {
        const path = join(root, "architecture/foundation/source-dependencies.yaml");
        await rm(path);
        await mkdir(path);
      },
      /source-dependencies\.yaml/u,
    ],
  ]) {
    await t.test(name, async () => {
      const root = await checkerFixture();
      try {
        await mutate(root);
        const report = await runChecker(root);
        assert.notEqual(report.exitCode, 0, JSON.stringify(report));
        assert.equal(report.outcome, "invalid-input", JSON.stringify(report));
        assert.ok(report.capabilities[0].problem, JSON.stringify(report));
        assert.match(JSON.stringify(report), expected);
      } finally {
        await rm(root, { recursive: true, force: true });
      }
    });
  }
});

test("installed source gate includes dist source explicitly governed by a boundary", async () => {
  const root = await checkerFixture();
  try {
    const path = "fixtures/qualification-toy-package/dist";
    await mkdir(join(root, path), { recursive: true });
    await writeFile(join(root, path, "hidden.js"), 'import "node:fs";\n');
    const policyPath = join(root, "architecture/foundation/source-dependencies.yaml");
    const policy = (await readFile(policyPath, "utf8")).replace(/\r\n/gu, "\n");
    const governedRoot = "    roots:\n      - fixtures/qualification-toy-package\n";
    assert.ok(policy.includes(governedRoot), "fixture declares the expected package root");
    await writeFile(
      policyPath,
      policy.replace(
        governedRoot,
        `    roots:\n      - fixtures/qualification-toy-package/index.js\n      - fixtures/qualification-toy-package/index.d.ts\n      - ${path}\n`,
      ),
    );
    const report = await runChecker(root);
    assert.notEqual(report.exitCode, 0, JSON.stringify(report));
    assert.ok(
      report.capabilities
        .flatMap((capability) => capability.diagnostics)
        .some(
          (diagnostic) =>
            diagnostic.ruleId === "architecture.source-dependencies.forbidden-builtin-dependency" &&
            diagnostic.location.path === `${path}/hidden.js`,
        ),
      JSON.stringify(report),
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("installed source gate keeps the shared qualification protocol portable", async () => {
  const root = await checkerFixture();
  const protocol = "tests/qualification/portable-protocol.mjs";
  const declaration = "tests/qualification/portable-protocol.d.mts";
  const adapter = "tests/qualification/fixtures/portable-worker.mjs";
  try {
    const append = async (path, text) => {
      const target = join(root, path);
      await writeFile(target, (await readFile(target, "utf8")) + "\n" + text + "\n");
    };

    // The Node adapter keeps its existing platform allowance. Only the shared
    // code and its declaration are selected for this dependency restriction.
    await append(adapter, 'import "node:fs";');
    const allowed = await runChecker(root);
    assert.equal(allowed.exitCode, 0, JSON.stringify(allowed));
    assert.equal(allowed.summary.errors, 0, JSON.stringify(allowed));

    await append(
      protocol,
      'import "node:fs"; const fixtureTarget = "node:fs"; void import(fixtureTarget);',
    );
    await append(declaration, 'export type FixtureLeak = import("node:fs").Stats;');
    const rejected = await runChecker(root);
    assert.notEqual(rejected.exitCode, 0, JSON.stringify(rejected));
    const diagnostics = rejected.capabilities.flatMap((capability) => capability.diagnostics);
    for (const [path, rule] of [
      [protocol, "forbidden-builtin-dependency"],
      [protocol, "unresolved-runtime-reference"],
      [declaration, "forbidden-builtin-dependency"],
    ]) {
      assert.ok(
        diagnostics.some(
          (diagnostic) =>
            diagnostic.location.path === path &&
            diagnostic.ruleId === `architecture.source-dependencies.${rule}`,
        ),
        JSON.stringify(rejected),
      );
    }
    assert.equal(
      diagnostics.some((diagnostic) => diagnostic.location.path === adapter),
      false,
      JSON.stringify(rejected),
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
