import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { digestSourceInputs, readSourceInputs, sha256 } from "../architecture/checks/admission-evidence/index.ts";

test("closed source inventory includes real files and detects additions/content changes while excluding receipt-only docs", async () => {
  const root = await mkdtemp(join(tmpdir(), "ef-admission-inputs-"));
  try {
    await mkdir(join(root, "packages/core/src"), { recursive: true });
    await mkdir(join(root, "docs"));
    await writeFile(join(root, "packages/core/src/index.ts"), "export const answer = 42;\n");
    await writeFile(join(root, "pnpm-lock.yaml"), "lockfileVersion: '9.0'\n");
    const selection = { roots: ["packages/core/src"], files: ["pnpm-lock.yaml"] };
    const before = await readSourceInputs(root, selection);
    assert.deepEqual(before, [
      { path: "packages/core/src/index.ts", sha256: sha256("export const answer = 42;\n") },
      { path: "pnpm-lock.yaml", sha256: sha256("lockfileVersion: '9.0'\n") },
    ]);
    await writeFile(join(root, "docs/receipt.json"), '{"observedRun":107}');
    assert.equal(digestSourceInputs(await readSourceInputs(root, selection)), digestSourceInputs(before));
    await writeFile(join(root, "packages/core/src/extra.ts"), "export const extra = 1;\n");
    const added = await readSourceInputs(root, selection);
    assert.equal(added.length, 3);
    assert.notEqual(digestSourceInputs(added), digestSourceInputs(before));
    await writeFile(join(root, "pnpm-lock.yaml"), "changed toolchain closure\n");
    assert.notEqual(digestSourceInputs(await readSourceInputs(root, selection)), digestSourceInputs(added));
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("inventory refuses traversal, absent sources, overlap and source symlinks", async () => {
  const root = await mkdtemp(join(tmpdir(), "ef-admission-inputs-"));
  const outside = await mkdtemp(join(tmpdir(), "ef-admission-outside-"));
  try {
    await mkdir(join(root, "src"));
    await writeFile(join(root, "src/index.ts"), "inside");
    await writeFile(join(outside, "private.ts"), "outside");
    await assert.rejects(() => readSourceInputs(root, { roots: [], files: ["../private.ts"] }), /E-PATH/u);
    await assert.rejects(() => readSourceInputs(root, { roots: [], files: ["missing.ts"] }), /ENOENT/u);
    await assert.rejects(() => readSourceInputs(root, { roots: ["src"], files: ["src/index.ts"] }), /overlap/u);
    await symlink(outside, join(root, "linked"), process.platform === "win32" ? "junction" : "dir");
    await assert.rejects(() => readSourceInputs(root, { roots: [], files: ["linked/private.ts"] }), /symlink/u);
    await assert.rejects(() => readSourceInputs(root, { roots: ["linked"], files: [] }), /symlink/u);
  } finally {
    await rm(root, { recursive: true, force: true });
    await rm(outside, { recursive: true, force: true });
  }
});
