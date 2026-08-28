import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { cp, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import test from "node:test";

const execFileAsync = promisify(execFile);
const repositoryRoot = fileURLToPath(new URL("..", import.meta.url));
const foundationCli = fileURLToPath(new URL("./cli.js", import.meta.resolve("@agent-teams/engineering-foundation")));
const skipExpensiveIntegration = process.env.PACKAGE_POLICY_TEST_MODE === "fast"
  ? "skipped in package-policy fast mode"
  : false;
const governedFiles = [
  "architecture/checks/package-artifacts.mjs",
  "architecture/checks/package-policy.mjs",
  "architecture/checks/package-policy/catalog-policy.mjs",
  "architecture/checks/package-policy/docs-owner-source.mjs",
  "architecture/checks/package-policy/ownership-policy.mjs",
  "architecture/checks/package-policy/repository-policy-source.mjs",
  "architecture/checks/package-topology.mjs",
  "architecture/checks/scaffold.mjs",
  "architecture/checks/source-safety.mjs",
  "tests/architecture-topology.test.mjs",
  "tests/docs-protocol-qualification.test.mjs",
  "tests/document-authoring.test.mjs",
  "tests/package-policy-characterization.test.mjs",
  "tests/package-policy-source-boundaries.test.mjs",
  "tests/scaffolding.test.mjs",
];

async function checkerFixture() {
  const root = await mkdtemp(join(tmpdir(), "extension-policy-boundary-"));
  for (const path of governedFiles) {
    await mkdir(dirname(join(root, path)), { recursive: true });
    await cp(join(repositoryRoot, path), join(root, path), { recursive: true });
  }
  for (const path of [
    "architecture/foundation/source-dependencies.yaml",
    "foundation.config.yaml",
    "package.json",
    "pnpm-workspace.yaml",
  ]) {
    await mkdir(dirname(join(root, path)), { recursive: true });
    await cp(join(repositoryRoot, path), join(root, path), { recursive: true });
  }
  return root;
}

async function runChecker(root) {
  try {
    const { stdout } = await execFileAsync(process.execPath, [
      foundationCli,
      "check",
      "architecture.source-dependencies",
      "--format",
      "json",
    ], { cwd: root, maxBuffer: 16 * 1024 * 1024 });
    return JSON.parse(stdout);
  } catch (error) {
    return JSON.parse(error.stdout);
  }
}

async function withMutation(path, source, expectedRule) {
  const root = await checkerFixture();
  try {
    await writeFile(join(root, path), source);
    const report = await runChecker(root);
    const diagnostics = report.capabilities.flatMap(capability => capability.diagnostics);
    assert.ok(diagnostics.some(diagnostic => diagnostic.ruleId === expectedRule), JSON.stringify(report));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

test("official checker accepts the stable package-policy boundary", { skip: skipExpensiveIntegration }, async () => {
  const report = await runChecker(repositoryRoot);
  assert.equal(report.summary.errors, 0, JSON.stringify(report));
});

test("official checker rejects forbidden pure dependencies", { skip: skipExpensiveIntegration }, async t => {
  for (const [name, dependency, rule] of [
    ["Node", "node:fs/promises", "architecture.source-dependencies.forbidden-builtin-dependency"],
    ["YAML", "yaml", "architecture.source-dependencies.forbidden-package-dependency"],
    ["Docs Protocol", "@agent-teams/docs-protocol", "architecture.source-dependencies.forbidden-package-dependency"],
    ["source adapter", "./repository-policy-source.mjs", "architecture.source-dependencies.forbidden-boundary-dependency"],
  ]) {
    await t.test(name, () => withMutation(
      "architecture/checks/package-policy/catalog-policy.mjs",
      `import ${JSON.stringify(dependency)};\nexport const value = true;\n`,
      rule,
    ));
  }
});

test("official checker rejects consumer deep imports and production test imports", { skip: skipExpensiveIntegration }, async () => {
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
});
