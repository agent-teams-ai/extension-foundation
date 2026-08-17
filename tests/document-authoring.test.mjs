import assert from "node:assert/strict";
import { cp, mkdir, mkdtemp, readFile, rm, stat, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(import.meta.dirname, "..");
const cli = join(repositoryRoot, "node_modules", ".bin", "agent-teams-docs");
const profile = "architecture/foundation/docs-protocol.yaml";
const docsPackageRoot = dirname(fileURLToPath(import.meta.resolve("@agent-teams/docs-protocol/package.json")));
const foundationPackageRoot = dirname(fileURLToPath(import.meta.resolve("@agent-teams/engineering-foundation/package.json")));

async function exists(path) {
  try {
    await stat(path);
    return true;
  } catch (error) {
    if (error.code === "ENOENT") return false;
    throw error;
  }
}

function execute(consumerRoot, ...args) {
  return spawnSync(cli, [...args, "--consumer", consumerRoot, "--profile", profile, "--json"], {
    cwd: consumerRoot,
    encoding: "utf8",
    timeout: 120_000,
  });
}

function run(consumerRoot, ...args) {
  const result = execute(consumerRoot, ...args);
  assert.equal(result.status, 0, result.error?.message || result.stderr || result.stdout);
  const envelope = JSON.parse(result.stdout);
  assert.deepEqual(envelope.protocol, { id: "agent-teams.docs-protocol", version: 1 });
  assert.equal(envelope.outcome, "success");
  return envelope;
}

async function disposableRepository() {
  const fixture = await mkdtemp(join(tmpdir(), "atd-e-"));
  await cp(join(repositoryRoot, "architecture"), join(fixture, "architecture"), { recursive: true });
  await cp(join(repositoryRoot, "docs"), join(fixture, "docs"), { recursive: true });
  await cp(join(repositoryRoot, ".agents"), join(fixture, ".agents"), { recursive: true });
  await cp(join(repositoryRoot, "AGENTS.md"), join(fixture, "AGENTS.md"));
  await cp(join(repositoryRoot, "package.json"), join(fixture, "package.json"));
  const packageScope = join(fixture, "node_modules", "@agent-teams");
  await mkdir(packageScope, { recursive: true });
  await symlink(docsPackageRoot, join(packageScope, "docs-protocol"), process.platform === "win32" ? "junction" : "dir");
  await symlink(foundationPackageRoot, join(packageScope, "engineering-foundation"), process.platform === "win32" ? "junction" : "dir");
  return fixture;
}

test("unified info and check expose the qualified Extension authority", () => {
  const info = run(repositoryRoot, "info");
  assert.equal(info.command, "docs.info");
  assert.equal(info.result.projectId, "extension-foundation");
  assert.deepEqual(info.result.types.map(({ type }) => type).sort(), ["adr", "open-decision"]);
  assert.deepEqual(info.result.ownerIds, ["architecture", "architecture/security", "architecture/tooling"]);
  assert.equal(info.result.agentWorkflow.skillPath, ".agents/skills/docs-authoring/SKILL.md");

  const check = run(repositoryRoot, "check");
  assert.equal(check.command, "docs.check");
  assert.equal(check.result.valid, true);
  assert.equal(check.result.catalogStatus, "complete");
});

test("find combines catalog and relation filters and treats zero matches as success", () => {
  const related = run(repositoryRoot, "find", "--type", "open-decision", "--status", "open", "--owner", "architecture", "--related", "ADR-0003");
  assert.deepEqual(related.result.documents.map(({ id }) => id), ["OD-002"]);

  const missing = run(repositoryRoot, "find", "--id", "ADR-9999", "--related", "ADR-0001");
  assert.equal(missing.result.matches, 0);
  assert.deepEqual(missing.result.documents, []);

  const forwarded = spawnSync("pnpm", ["docs:find", "--", "--id", "OD-001", "--json"], {
    cwd: repositoryRoot,
    encoding: "utf8",
    timeout: 120_000,
  });
  assert.equal(forwarded.status, 0, forwarded.error?.message || forwarded.stderr || forwarded.stdout);
  const forwardedEnvelope = JSON.parse(forwarded.stdout.slice(forwarded.stdout.indexOf("{")));
  assert.deepEqual(forwardedEnvelope.result.documents.map(({ id }) => id), ["OD-001"]);
});

test("new previews and applies both supported types only inside a disposable repository", async () => {
  const fixture = await disposableRepository();
  try {
    const adrTarget = join(fixture, "docs/decisions/0099-disposable-contract-proof.md");
    const indexPath = join(fixture, "docs/decisions/README.md");
    const indexBefore = await readFile(indexPath, "utf8");
    const adrArgs = [
      "new", "--type", "adr", "--id", "ADR-0099",
      "--title", "Disposable Contract Proof", "--owner", "architecture/tooling",
      "--summary", "Proves unified authoring in an isolated fixture.",
      "--related", "ADR-0001", "--blocked-by", "OD-002",
      "--code-anchor", '{"enforcement":"advisory","pattern":"package.json"}',
    ];

    const preview = run(fixture, ...adrArgs, "--dry-run");
    assert.equal(preview.result.writeState, "preview");
    assert.equal(preview.result.reservation, "none");
    assert.equal(preview.result.reachability.indexPath, "docs/decisions/README.md");
    assert.equal(await exists(adrTarget), false);

    const applied = run(fixture, ...adrArgs, "--apply");
    assert.equal(applied.result.writeState, "applied");
    assert.equal(await exists(adrTarget), true);
    assert.equal(await readFile(indexPath, "utf8"), indexBefore);

    const repeated = run(fixture, ...adrArgs, "--apply");
    assert.equal(repeated.result.writeState, "already-applied");

    const openDecisionArgs = [
      "new", "--type", "open-decision", "--id", "OD-099",
      "--title", "Disposable Open Choice", "--owner", "architecture",
      "--summary", "Proves open decision placement in an isolated fixture.",
    ];
    const openDecision = run(
      fixture,
      ...openDecisionArgs, "--dry-run",
    );
    assert.equal(openDecision.result.documentPath, "docs/open-decisions/OD-099-disposable-open-choice.md");
    assert.equal(openDecision.result.reachability.indexPath, "docs/open-decisions/README.md");
    const appliedOpenDecision = run(fixture, ...openDecisionArgs, "--apply");
    assert.equal(appliedOpenDecision.result.writeState, "applied");
    assert.equal(await exists(join(fixture, appliedOpenDecision.result.documentPath)), true);

    const doctor = run(fixture, "doctor");
    assert.equal(doctor.result.transaction.state, "idle");
    const recover = run(fixture, "recover");
    assert.equal(recover.result.transactionState, "no-pending-transaction");
  } finally {
    await rm(fixture, { recursive: true, force: true });
  }
});

test("required code anchors pass when reachable and fail closed when stale", async () => {
  const fixture = await disposableRepository();
  try {
    const valid = run(fixture, "check");
    assert.equal(valid.result.valid, true);

    const indexPath = join(fixture, "docs/README.md");
    const index = await readFile(indexPath, "utf8");
    await writeFile(
      indexPath,
      index.replace("architecture/foundation/docs-protocol.yaml", "packages/missing-required-anchor.ts"),
      "utf8",
    );
    const stale = execute(fixture, "check");
    assert.notEqual(stale.status, 0);
    const envelope = JSON.parse(stale.stdout);
    assert.equal(envelope.outcome, "violation");
    assert.ok(envelope.diagnostics.some(({ ruleId }) => ruleId.includes("anchor")));
  } finally {
    await rm(fixture, { recursive: true, force: true });
  }
});

test("invalid owner, metadata, and duplicate identity fail without mutation", async () => {
  const fixture = await disposableRepository();
  try {
    const target = join(fixture, "docs/decisions/0098-invalid-proof.md");
    const common = [
      "new", "--type", "adr", "--id", "ADR-0098", "--title", "Invalid Proof",
      "--summary", "Must fail without publishing a document.", "--dry-run",
    ];

    const owner = execute(fixture, ...common, "--owner", "unknown-owner");
    assert.notEqual(owner.status, 0);
    assert.equal(await exists(target), false);

    const metadata = execute(fixture, ...common, "--owner", "architecture", "--metadata", "unknown=true");
    assert.notEqual(metadata.status, 0);
    assert.equal(await exists(target), false);

    const duplicate = execute(
      fixture,
      "new", "--type", "adr", "--id", "ADR-0001", "--title", "Duplicate",
      "--owner", "architecture", "--summary", "Must reject duplicate identity.", "--dry-run",
    );
    assert.notEqual(duplicate.status, 0);
    assert.equal(await exists(target), false);
  } finally {
    await rm(fixture, { recursive: true, force: true });
  }
});
