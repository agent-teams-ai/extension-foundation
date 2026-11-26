import assert from "node:assert/strict";
import { link, mkdir, mkdtemp, readFile, readdir, rename, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { arch, platform } from "node:process";
import test from "node:test";
import { ArtifactCleanupError, ArtifactError } from "../src/features/verified-artifact/contracts.ts";
import { assertStagingEntries, captureStaged, stageFile, withStaging } from "../src/features/verified-artifact/staging.ts";

assert.equal(platform, "linux", "Staging filesystem qualification selects Linux x64");
assert.equal(arch, "x64", "Staging filesystem qualification selects Linux x64");

test("capture owns a fresh tree, returns exact bytes and removes only that tree", async context => {
  const root = await mkdtemp(join(tmpdir(), "ef-stage-test-"));
  context.after(() => rm(root, { recursive: true, force: true }));
  await writeFile(join(root, "host-owned"), "keep");
  const result = await withStaging(root, async directory => {
    const bytes = Uint8Array.from([0, 127, 255, 10]);
    const file = await stageFile(directory, "payload/data.bin", bytes);
    await assertStagingEntries(directory, [file]);
    return captureStaged(file, bytes);
  });
  assert.deepEqual([...result], [0, 127, 255, 10]);
  assert.deepEqual(await readdir(root), ["host-owned"]);
  assert.equal(await readFile(join(root, "host-owned"), "utf8"), "keep");
});

test("changed bytes, hard links, symlinks and unexpected staging entries fail closed", async context => {
  const root = await mkdtemp(join(tmpdir(), "ef-stage-test-"));
  context.after(() => rm(root, { recursive: true, force: true }));
  const refuses = (error: unknown) => error instanceof ArtifactError && error.code === "artifact.staging";
  for (const action of ["tamper", "hardlink", "symlink", "unexpected", "directory"]) {
    await assert.rejects(withStaging(root, async directory => {
      const bytes = Buffer.from("verified");
      const file = await stageFile(directory, "entry.bin", bytes);
      if (action === "tamper") await writeFile(file, "replaced");
      if (action === "hardlink") await link(file, join(directory, "alias.bin"));
      if (action === "symlink") await symlink(file, join(directory, "alias.bin"));
      if (action === "unexpected") await writeFile(join(directory, "unlisted"), "content");
      if (action === "directory") await mkdir(join(directory, "unlisted"));
      await captureStaged(file, bytes);
      await assertStagingEntries(directory, [file]);
    }), refuses, action);
    assert.deepEqual(await readdir(root), []);
  }
});

test("symlinked staging roots and ancestor aliases are refused", async context => {
  const root = await mkdtemp(join(tmpdir(), "ef-stage-test-"));
  context.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(join(root, "real", "child"), { recursive: true });
  await symlink(join(root, "real"), join(root, "alias"), "dir");
  let called = 0;
  for (const directory of [join(root, "alias"), join(root, "alias", "child")]) {
    await assert.rejects(withStaging(directory, async () => { called++; }),
      (error: unknown) => error instanceof ArtifactError && error.code === "artifact.staging");
  }
  assert.equal(called, 0);
});

test("a verification error still releases its staging and cleanup debt preserves both failures", async context => {
  const root = await mkdtemp(join(tmpdir(), "ef-stage-test-"));
  context.after(() => rm(root, { recursive: true, force: true }));
  const failed = new Error("verification failed");
  await assert.rejects(withStaging(root, async () => { throw failed; }), error => error === failed);
  assert.deepEqual(await readdir(root), []);
  await assert.rejects(withStaging(root, async directory => {
    await rename(directory, join(root, "external-rename"));
    throw failed;
  }), (error: unknown) => error instanceof ArtifactCleanupError
    && error.code === "artifact.cleanup" && error.verificationError === failed
    && error.stagingDirectory.startsWith(join(root, "ef-artifact-")) && error.cause instanceof Error);
  assert.deepEqual(await readdir(root), ["external-rename"]);
});
