import { lstat, readFile, realpath } from "node:fs/promises";
import { isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  loadPackagePolicy,
  packageExportTargets,
} from "./package-policy.mjs";

function contained(root, candidate) {
  const relation = relative(root, candidate);
  return relation === "" || (!isAbsolute(relation) && relation !== ".." && !relation.startsWith(`..${sep}`));
}

export async function validateBuiltPackageArtifacts({ root }) {
  const policy = await loadPackagePolicy(root);
  if (policy.errors.length !== 0) return policy.errors;
  const errors = [];
  for (const entry of policy.entries) {
    let manifest;
    try {
      manifest = JSON.parse(await readFile(join(root, entry.path, "package.json"), "utf8"));
    } catch (error) {
      errors.push(`${entry.path}/package.json: ${error instanceof Error ? error.message : String(error)}`);
      continue;
    }
    const targets = packageExportTargets(manifest.exports);
    if (targets === undefined || targets.length === 0) {
      errors.push(`${entry.path}: package exports cannot be verified`);
      continue;
    }
    const packageRoot = await realpath(resolve(root, entry.path));
    for (const target of new Set(targets)) {
      if (!target.startsWith("./dist/") || target.includes("\\")) {
        errors.push(`${entry.path}: export target is outside dist: ${target}`);
        continue;
      }
      const artifactPath = resolve(packageRoot, target);
      if (!contained(packageRoot, artifactPath)) {
        errors.push(`${entry.path}: export target escapes the package: ${target}`);
        continue;
      }
      try {
        const metadata = await lstat(artifactPath);
        const canonicalArtifact = await realpath(artifactPath);
        if (metadata.isSymbolicLink() || !metadata.isFile() || !contained(packageRoot, canonicalArtifact)) {
          errors.push(`${entry.path}: export target is not one regular package artifact: ${target}`);
        }
      } catch (error) {
        errors.push(`${entry.path}: built export target is missing: ${target} (${error?.code ?? "unknown"})`);
      }
    }
  }
  return errors;
}

async function runCli() {
  const root = fileURLToPath(new URL("../..", import.meta.url));
  const errors = await validateBuiltPackageArtifacts({ root });
  if (errors.length === 0) {
    console.log("Built package artifact check passed.");
    return;
  }
  for (const error of errors) console.error(`ERROR ${error}`);
  process.exitCode = 1;
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await runCli();
}
