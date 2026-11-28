import { constants } from "node:fs";
import { lstat, mkdir, mkdtemp, open, readdir, realpath, rm, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, join, resolve, sep } from "node:path";
import { ArtifactCleanupError, ArtifactError } from "./contracts.ts";

/** Own only a fresh child; preserve the caller's root and unrelated files. */
export async function withStaging<Value>(root: string, work: (directory: string) => Promise<Value>): Promise<Value> {
  if (!isAbsolute(root)) throw new ArtifactError("artifact.input", "Staging root must be absolute");
  const stat = await lstat(root);
  if (!stat.isDirectory() || stat.isSymbolicLink() || await realpath(root) !== resolve(root)) {
    throw new ArtifactError("artifact.staging", "Staging root must be a real directory without symlink components");
  }
  const directory = await mkdtemp(join(root, "ef-artifact-"));
  let verificationError: unknown;
  try {
    return await work(directory);
  } catch (error) {
    verificationError = error;
    throw error;
  } finally {
    try { await rm(directory, { recursive: true, force: false }); }
    catch (error) { throw new ArtifactCleanupError(directory, error, verificationError); }
  }
}

export async function stageFile(directory: string, path: string, bytes: Uint8Array): Promise<string> {
  const fullPath = join(directory, path);
  await mkdir(dirname(fullPath), { recursive: true, mode: 0o700 });
  await writeFile(fullPath, bytes, { flag: "wx", mode: 0o600 });
  return fullPath;
}

/** Read a regular owned inode without following links, and verify the captured bytes. */
export async function captureStaged(path: string, expected: Uint8Array): Promise<Buffer> {
  const handle = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const before = await handle.stat();
    if (!before.isFile() || before.nlink !== 1 || before.size !== expected.length) {
      throw new ArtifactError("artifact.staging", "Staged artifact is not the expected owned regular file");
    }
    const captured = await handle.readFile();
    const after = await lstat(path);
    if (!after.isFile() || after.isSymbolicLink() || after.dev !== before.dev || after.ino !== before.ino
        || captured.length !== expected.length || !captured.equals(expected)) {
      throw new ArtifactError("artifact.staging", "Staged artifact changed before capture");
    }
    return captured;
  } finally { await handle.close(); }
}

/** The owned staging tree has no archive extraction or unlisted filesystem entries. */
export async function assertStagingEntries(directory: string, files: readonly string[]): Promise<void> {
  const expected = new Set(files);
  const directories = new Set<string>();
  for (const file of files) {
    let parent = dirname(file);
    while (parent !== directory) {
      if (!parent.startsWith(directory + sep)) throw new ArtifactError("artifact.staging", "Staged entry escaped its custody directory");
      directories.add(parent);
      parent = dirname(parent);
    }
  }
  const inspect = async (path: string): Promise<void> => {
    for (const name of await readdir(path)) {
      const child = join(path, name);
      const info = await lstat(child);
      if (info.isSymbolicLink()) throw new ArtifactError("artifact.staging", "Symbolic links are not supported in artifact staging");
      if (info.isDirectory() && directories.has(child)) await inspect(child);
      else if (!info.isFile() || info.nlink !== 1 || !expected.has(child)) {
        throw new ArtifactError("artifact.staging", "Unexpected or aliased artifact staging entry");
      }
      else expected.delete(child);
    }
  };
  await inspect(directory);
  if (expected.size !== 0) throw new ArtifactError("artifact.staging", "A staged entry disappeared before verification completed");
}
