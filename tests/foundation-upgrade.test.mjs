import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const packageUrl = import.meta.resolve("@agent-teams/engineering-foundation/package.json");
const manifest = JSON.parse(await readFile(new URL(packageUrl), "utf8"));
const cli = fileURLToPath(new URL(manifest.bin["agent-teams-node-test"], packageUrl));

async function run(root) {
  // Preserve the real parent runner environment at the public installed boundary.
  try {
    const { stdout, stderr } = await execFileAsync(process.execPath,
      [cli, "--contract", "required.json", "--", "critical.test.mjs"], { cwd: root, timeout: 30_000, maxBuffer: 1024 * 1024 });
    return { exit: 0, text: stdout + stderr };
  } catch (error) {
    if (!Number.isInteger(error.code)) throw error;
    return { exit: error.code, text: error.stdout + error.stderr };
  }
}

const header = 'import test from "node:test";\nimport assert from "node:assert/strict";\n';
const identity = { file: "critical.test.mjs", names: ["critical completion"], kind: "test" };

// These disposable entry files qualify the public installed execution contract.
// The separate evidence:custody:test gate executes the real custody assertions.
test("installed mandatory Node runner requires observed completion", async t => {
  const root = await mkdtemp(join(tmpdir(), "ext-fo-required-execution-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const contract = { schemaVersion: 1, required: [identity], exceptions: [] };
  await writeFile(join(root, "required.json"), JSON.stringify(contract));
  for (const [name, source, expected] of [
    ["completed", 'test("critical completion", () => assert.equal(2 + 2, 4));', null],
    ["omitted", 'test("ordinary completion", () => assert.equal(2 + 2, 4));', /required execution failed:.*omitted/u],
    ["skipped", 'test.skip("critical completion", () => assert.fail("must execute"));', /required execution failed:.*skipped/u],
    ["unfinished", 'test("critical completion", { timeout: 50 }, async () => new Promise(() => {}));', /failed (?:test execution|entry file)|registered identity lacks completion/u],
    ["todo", 'test.todo("critical completion");', /required execution failed:.*todo/u],
    ["failed", 'test("critical completion", () => assert.fail("observable failure"));', /failed (?:test execution|entry file)/u],
  ]) {
    await t.test(name, async () => {
      await writeFile(join(root, identity.file), header + source);
      const result = await run(root);
      if (expected === null) {
        assert.equal(result.exit, 0, result.text);
        assert.match(result.text, /1 required identities completed or exactly excepted/u);
      } else {
        assert.notEqual(result.exit, 0, result.text);
        assert.match(result.text, expected);
      }
    });
  }
});

test("installed mandatory runner admits only an exact OS exception", async t => {
  const root = await mkdtemp(join(tmpdir(), "ext-fo-required-os-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  // Mirrors the actual custody gate's Windows verifier/POSIX capture split.
  const posix = process.platform !== "win32";
  const item = { ...identity, names: [posix ? "Windows verifier policy" : "POSIX capture policy"] };
  const platforms = posix ? ["linux", "darwin"] : ["win32"];
  const exception = {
    ...item, status: "skipped",
    reason: posix ? "Windows verifier-only rejection is inapplicable on POSIX." : "Strict evidence capture is unsupported on Windows.",
    applicability: { platforms },
  };
  await writeFile(join(root, item.file), header + `test(${JSON.stringify(item.names[0])}, { skip: true }, () => assert.fail("unsupported OS operation"));`);
  for (const [name, selectedException, passes] of [
    ["reviewed exact OS", exception, true],
    ["wrong OS", { ...exception, applicability: { platforms: posix ? ["win32"] : ["linux", "darwin"] } }, false],
    ["wrong status", { ...exception, status: "omitted" }, false],
    ["wrong identity", { ...exception, names: ["different test"] }, false],
    ["blanket OS", { ...exception, applicability: { platforms: ["linux", "darwin", "win32"] } }, false],
  ]) {
    await t.test(name, async () => {
      await writeFile(join(root, "required.json"), JSON.stringify({ schemaVersion: 1, required: [item], exceptions: [selectedException] }));
      const result = await run(root);
      assert.equal(result.exit === 0, passes, result.text);
      if (!passes) assert.match(result.text, /Node test execution contract:/u);
    });
  }
});

test("installed mandatory runner binds full ancestry and test kind", async t => {
  const root = await mkdtemp(join(tmpdir(), "ext-fo-required-identity-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  await writeFile(join(root, identity.file), header + 'test("outer", async t => { await t.test("critical completion", () => assert.equal(2 + 2, 4)); });');
  for (const [names, kind, passes] of [
    [["outer", "critical completion"], "test", true],
    [["critical completion"], "test", false],
    [["outer", "critical completion"], "suite", false],
  ]) {
    await writeFile(join(root, "required.json"), JSON.stringify({ schemaVersion: 1, required: [{ ...identity, names, kind }], exceptions: [] }));
    const result = await run(root);
    assert.equal(result.exit === 0, passes, result.text);
    if (!passes) assert.match(result.text, /required execution failed:.*(?:omitted|wrong-kind)/u);
  }
});
