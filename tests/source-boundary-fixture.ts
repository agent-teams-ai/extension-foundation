import { copyFile, lstat, mkdir, mkdtemp, readFile, readdir, realpath, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, isAbsolute, join } from "node:path";
import { parse as parseYaml } from "yaml";

const sourcePolicyPath = "architecture/foundation/source-dependencies.yaml";
const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

function object(value: unknown, label: string): Record<string, unknown> {
  if (!isObject(value)) {
    throw new Error(`${label} must be a record`);
  }
  return value;
}

function relativePath(value: unknown, label: string): string {
  if (typeof value !== "string" || !/^[A-Za-z0-9_.-]+(?:\/[A-Za-z0-9_.-]+)*$/u.test(value) ||
      value.split("/").some(part => part === "." || part === "..")) {
    throw new Error(`${label} must be a closed repository-relative path`);
  }
  return value;
}

function paths(value: unknown, label: string): readonly string[] {
  if (!Array.isArray(value) || value.length === 0) throw new Error(`${label} must contain paths`);
  return value.map((path: unknown) => relativePath(path, label));
}

async function copySelected(
  repositoryRoot: string,
  destinationRoot: string,
  path: string,
  copied: Set<string>,
): Promise<void> {
  if (copied.has(path)) return;
  relativePath(path, "selected source");
  const parts = path.split("/");
  for (let length = 1; length < parts.length; length += 1) {
    const ancestor = await lstat(join(repositoryRoot, ...parts.slice(0, length)));
    if (!ancestor.isDirectory() || ancestor.isSymbolicLink()) {
      throw new Error(`selected source has a non-directory or symlink ancestor: ${path}`);
    }
  }
  const source = join(repositoryRoot, path);
  const destination = join(destinationRoot, path);
  const details = await lstat(source);
  if (details.isSymbolicLink() || (!details.isFile() && !details.isDirectory())) {
    throw new Error(`selected source is not a regular file or directory: ${path}`);
  }
  if (details.isDirectory()) {
    await mkdir(destination, { recursive: true });
    copied.add(path);
    for (const child of (await readdir(source)).sort()) {
      await copySelected(repositoryRoot, destinationRoot, `${path}/${child}`, copied);
    }
  } else {
    await mkdir(dirname(destination), { recursive: true });
    await copyFile(source, destination);
    copied.add(path);
  }
}

/** Copy the actual governed inputs; the source policy remains the only source roster. */
export async function createSourceBoundaryFixture(repositoryRoot: string): Promise<string> {
  if (!isAbsolute(repositoryRoot)) throw new Error("source repository must be absolute");
  const root = await realpath(repositoryRoot);
  const policy = object(parseYaml(await readFile(join(root, sourcePolicyPath), "utf8")), "source policy");
  if (policy.schemaVersion !== 3) throw new Error("source fixture requires the adopted v3 policy");
  const workspace = object(policy.workspace, "source workspace");
  if (workspace.kind !== "pnpm") throw new Error("source fixture requires the declared pnpm workspace");
  const inputs = [
    sourcePolicyPath,
    "foundation.config.yaml",
    "package.json",
    relativePath(workspace.manifest, "workspace manifest"),
    ...paths(policy.governedRoots, "governed roots"),
    ...paths(policy.packageRoots, "package roots").map(path => `${path}/package.json`),
  ];
  const destination = await mkdtemp(join(tmpdir(), "extension-policy-boundary-"));
  try {
    const copied = new Set<string>();
    // Every selected file is retained, including explicitly governed dist files.
    for (const path of inputs) await copySelected(root, destination, path, copied);
    return destination;
  } catch (error) {
    await rm(destination, { recursive: true, force: true });
    throw error;
  }
}
