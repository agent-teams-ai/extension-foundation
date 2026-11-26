import { constants } from "node:fs";
import { lstat, open, readdir, realpath } from "node:fs/promises";
import { join, relative, resolve, sep } from "node:path";
import type { SourceInput, SourceInputSelection } from "./contracts.ts";
import { decodeSourceInputSelection } from "./policy.ts";
import { sha256 } from "./proof.ts";
import { fail, relativePath } from "./validation.ts";

const MAX_FILES = 8192;
const MAX_FILE_BYTES = 4 * 1024 * 1024;
const MAX_TOTAL_BYTES = 32 * 1024 * 1024;

/**
 * Closed inventory in the repository's existing trusted single-writer workspace.
 * Symlinks and special files are refused. This is not a hostile-filesystem lock.
 */
export async function readSourceInputs(root: string, rawSelection: SourceInputSelection): Promise<readonly SourceInput[]> {
  const selection = decodeSourceInputSelection(rawSelection);
  const rootPath = await realpath(root);
  const files = new Set<string>();
  async function checkedPath(path: string): Promise<string> {
    relativePath(path);
    let current = rootPath;
    for (const part of path.split("/")) {
      current = join(current, part);
      if ((await lstat(current)).isSymbolicLink()) fail("E-INPUTS", "source input symlinks are unsupported");
    }
    const physical = await realpath(current);
    const within = relative(rootPath, physical);
    if (within === "" || within.startsWith(`..${sep}`) || within === ".." || resolve(rootPath, within) !== physical) {
      fail("E-INPUTS", "source input escapes the repository");
    }
    return current;
  }
  function add(path: string): void {
    if (files.has(path) || files.size >= MAX_FILES) fail("E-INPUTS", "source inventory is duplicate or too large");
    files.add(path);
  }
  async function visit(path: string): Promise<void> {
    const absolute = await checkedPath(path);
    const stat = await lstat(absolute);
    if (stat.isFile()) { add(path); return; }
    if (!stat.isDirectory()) fail("E-INPUTS", "source inventory contains a special file");
    const children = await readdir(absolute);
    if (children.length > MAX_FILES) fail("E-INPUTS", "source directory is too large");
    for (const name of children.sort()) await visit(`${path}/${name}`);
  }
  for (const path of selection.roots) {
    if (!(await lstat(await checkedPath(path))).isDirectory()) fail("E-INPUTS", "a declared source root is not a directory");
    await visit(path);
  }
  for (const path of selection.files) {
    if (!(await lstat(await checkedPath(path))).isFile()) fail("E-INPUTS", "a declared source input is not a regular file");
    add(path);
  }
  let total = 0;
  const inputs: SourceInput[] = [];
  for (const path of [...files].sort()) {
    const handle = await open(await checkedPath(path), constants.O_RDONLY | constants.O_NOFOLLOW);
    try {
      const before = await handle.stat({ bigint: true });
      if (!before.isFile() || before.size > BigInt(MAX_FILE_BYTES)) fail("E-INPUTS", "source input is not a bounded regular file");
      const chunks: Buffer[] = [];
      let size = 0;
      const stream = handle.createReadStream({ autoClose: false });
      for await (const chunk of stream) {
        if (!(chunk instanceof Buffer)) fail("E-INPUTS", "source stream did not return bytes");
        size += chunk.byteLength;
        total += chunk.byteLength;
        if (size > MAX_FILE_BYTES || total > MAX_TOTAL_BYTES) fail("E-INPUTS", "source byte budget exceeded");
        chunks.push(chunk);
      }
      const after = await handle.stat({ bigint: true });
      if (before.size !== after.size || before.mtimeNs !== after.mtimeNs || before.ctimeNs !== after.ctimeNs || BigInt(size) !== after.size) {
        fail("E-INPUTS", "source input changed while reading");
      }
      inputs.push(Object.freeze({ path, sha256: sha256(Buffer.concat(chunks, size)) }));
    } finally { await handle.close(); }
  }
  if (inputs.length === 0) fail("E-INPUTS", "source inventory is empty");
  return Object.freeze(inputs);
}
