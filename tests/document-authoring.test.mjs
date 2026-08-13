import assert from "node:assert/strict";
import { cp, mkdtemp, mkdir, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

const repositoryRoot = resolve(import.meta.dirname, "..");
const cli = join(repositoryRoot, "node_modules", ".bin", "agent-teams-foundation");

async function exists(path) {
  try {
    await stat(path);
    return true;
  } catch (error) {
    if (error.code === "ENOENT") return false;
    throw error;
  }
}

function run(consumerRoot, ...args) {
  const result = spawnSync(cli, [...args, "--consumer", consumerRoot, "--json"], {
    cwd: consumerRoot,
    encoding: "utf8",
    timeout: 120_000,
  });
  assert.equal(result.status, 0, result.error?.message || result.stderr || result.stdout);
  return JSON.parse(result.stdout);
}

test("document writer previews, creates, and reports healthy recovery state", async () => {
  const fixture = await mkdtemp(join(tmpdir(), "extension-foundation-docs-"));
  try {
    for (const path of [
      "docs/document-authoring.yaml",
      "docs/metadata.schema.json",
      "docs/owners.yaml",
      "docs/templates/adr.md",
      "docs/decisions/README.md",
      "docs/open-decisions/README.md",
    ]) {
      await mkdir(dirname(join(fixture, path)), { recursive: true });
      await cp(join(repositoryRoot, path), join(fixture, path));
    }

    const target = join(fixture, "docs/decisions/0099-disposable-contract-proof.md");
    const newArgs = [
      "docs", "new", "--profile", "docs/document-authoring.yaml",
      "--type", "adr", "--id", "ADR-0099",
      "--title", "Disposable Contract Proof", "--owner", "architecture",
      "--summary", "Proves document writer behavior in an isolated fixture.",
    ];

    const beforeIndex = await readFile(join(fixture, "docs/decisions/README.md"), "utf8");
    const preview = run(fixture, ...newArgs, "--dry-run");
    assert.equal(preview.result.writeState, "preview");
    assert.equal(await exists(target), false);

    const created = run(fixture, ...newArgs);
    assert.equal(created.result.writeState, "applied");
    assert.equal(created.result.reachability.state, "manual-required");
    assert.equal(await exists(target), true);
    assert.equal(await readFile(join(fixture, "docs/decisions/README.md"), "utf8"), beforeIndex);

    const repeated = run(fixture, ...newArgs);
    assert.equal(repeated.result.writeState, "already-applied");

    const doctor = run(fixture, "docs", "doctor");
    assert.equal(doctor.outcome, "success");
    assert.equal(doctor.result.transactionState, "none");
    const recover = run(fixture, "docs", "recover");
    assert.equal(recover.result.writeState, "unchanged");
  } finally {
    await rm(fixture, { recursive: true, force: true });
  }
});
