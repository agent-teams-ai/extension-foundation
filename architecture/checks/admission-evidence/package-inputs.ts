import { lstat, readdir, realpath } from "node:fs/promises";
import { join } from "node:path";
import { qualificationPackages, qualificationSourceInputs } from "./qualification-profile.ts";
import { fail } from "./validation.ts";

const generatedDirectories = new Set(["dist", ".cache", "node_modules"]);

/**
 * Keep npm's implicit top-level inputs inside the reviewed source subject.
 * Source directories are hashed recursively; build and dependency directories
 * are separate outputs in this trusted single-writer qualification workspace.
 */
export async function assertQualificationPackageInputs(root: string): Promise<void> {
  const canonicalRoot = await realpath(root);
  for (const name of [".pnpmfile.mjs", ".pnpmfile.cjs"]) {
    try { await lstat(join(canonicalRoot, name)); }
    catch (error) {
      if (error instanceof Error && "code" in error && error.code === "ENOENT") continue;
      throw error;
    }
    fail("E-INPUTS", `${name} is outside the reviewed package input envelope`);
  }
  for (const profile of qualificationPackages) {
    let directory = canonicalRoot;
    for (const part of profile.packageRoot.split("/")) {
      directory = join(directory, part);
      const metadata = await lstat(directory);
      if (!metadata.isDirectory() || metadata.isSymbolicLink()) {
        fail("E-INPUTS", "qualification package ancestors must be real directories");
      }
    }
    const prefix = `${profile.packageRoot}/`;
    const declaredFiles = new Set(qualificationSourceInputs.files
      .filter(path => path.startsWith(prefix) && !path.slice(prefix.length).includes("/"))
      .map(path => path.slice(prefix.length)));
    const declaredDirectories = new Set(qualificationSourceInputs.roots
      .filter(path => path.startsWith(prefix) && !path.slice(prefix.length).includes("/"))
      .map(path => path.slice(prefix.length)));
    for (const name of await readdir(directory)) {
      const metadata = await lstat(join(directory, name));
      if (metadata.isSymbolicLink() ||
          !(metadata.isFile() && declaredFiles.has(name) ||
            metadata.isDirectory() && (declaredDirectories.has(name) || generatedDirectories.has(name)))) {
        fail("E-INPUTS", `${prefix}${name} is outside the reviewed package input envelope`);
      }
    }
  }
}
