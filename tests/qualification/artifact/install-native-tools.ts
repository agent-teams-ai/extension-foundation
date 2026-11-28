import assert from "node:assert/strict";
import { constants } from "node:fs";
import { chmod, copyFile, lstat, mkdir, mkdtemp, readFile, realpath, rm, writeFile } from "node:fs/promises";
import { isAbsolute, join, resolve } from "node:path";
import { arch, argv, env, platform } from "node:process";
import { releases, runFile, selectedTools, sha256 } from "./native-tools.ts";

async function download(url: string): Promise<Buffer> {
  const response = await fetch(url, { signal: AbortSignal.timeout(120_000) });
  assert.ok(response.ok && response.body, `Native release download failed (${response.status})`);
  const chunks: Uint8Array[] = [];
  let size = 0;
  for await (const chunk of response.body) {
    size += chunk.byteLength;
    assert.ok(size <= 160 * 1024 * 1024, "Native release exceeded its bounded download budget");
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

export async function installNativeTools(directory: string): Promise<void> {
  assert.equal(platform, "linux", "This qualification selects Linux x64 native releases");
  assert.equal(arch, "x64", "This qualification selects Linux x64 native releases");
  assert.ok(isAbsolute(directory), "An absolute native tool directory is required");
  await mkdir(directory, { recursive: true });
  assert.equal(await realpath(directory), resolve(directory), "Native tool directory must not contain symlink aliases");
  const stage = await mkdtemp(join(directory, ".download-"));
  try {
    for (const [name, release] of Object.entries(releases)) {
      const destination = join(directory, name);
      const current = await lstat(destination).catch((error: unknown) => {
        if (error instanceof Error && "code" in error && error.code === "ENOENT") return undefined;
        throw error;
      });
      if (current !== undefined) {
        assert.ok(current.isFile() && !current.isSymbolicLink(), `Existing ${name} is not a regular executable`);
        assert.equal(sha256(await readFile(destination)), release.executableDigest, `Existing ${name} has different bytes; refusing replacement`);
        continue;
      }
      const bytes = await download(release.url);
      assert.equal(sha256(bytes), release.archiveDigest, `Official ${name} archive checksum mismatch`);
      const archive = join(stage, `${name}.download`);
      await writeFile(archive, bytes, { flag: "wx", mode: 0o600 });
      let executable = archive;
      if (release.member !== null) {
        await runFile("tar", ["-xzf", archive, "-C", stage, release.member], { timeout: 30_000, maxBuffer: 1024 * 1024 });
        executable = join(stage, release.member);
      }
      assert.equal(sha256(await readFile(executable)), release.executableDigest, `Extracted ${name} checksum mismatch`);
      await copyFile(executable, destination, constants.COPYFILE_EXCL);
      await chmod(destination, 0o700);
    }
    await selectedTools(directory);
  } finally { await rm(stage, { recursive: true, force: true }); }
}

if (import.meta.main) {
  const directory = argv.at(2) ?? env.EF_ARTIFACT_TOOLS_DIR;
  assert.ok(directory, "Pass a native tool directory or set EF_ARTIFACT_TOOLS_DIR");
  await installNativeTools(directory);
  console.log("Verified ORAS 1.4.0, Cosign 3.1.6 and Distribution 3.1.2 native releases (Linux x64).");
}
