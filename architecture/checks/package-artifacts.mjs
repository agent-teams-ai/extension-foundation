import { execFile } from "node:child_process";
import { lstat, readFile, realpath } from "node:fs/promises";
import { isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { promisify } from "node:util";

import {
  hasCanonicalPackageRootExports,
  loadPackagePolicy,
  packageExportTargets,
} from "./package-policy.mjs";

const execFileAsync = promisify(execFile);

function contained(root, candidate) {
  const relation = relative(root, candidate);
  return relation === "" || (!isAbsolute(relation) && relation !== ".." && !relation.startsWith(`..${sep}`));
}

export async function validateBuiltPackageArtifacts({ root }) {
  const policy = await loadPackagePolicy(root);
  if (policy.errors.length !== 0) return policy.errors;
  const errors = [];
  for (const entry of policy.entries) {
    const errorCountBeforeEntry = errors.length;
    let manifest;
    try {
      manifest = JSON.parse(await readFile(join(root, entry.path, "package.json"), "utf8"));
    } catch (error) {
      errors.push(`${entry.path}/package.json: ${error instanceof Error ? error.message : String(error)}`);
      continue;
    }
    if (!hasCanonicalPackageRootExports(manifest)) {
      errors.push(`${entry.path}: package exports must be the canonical root import and types targets`);
      continue;
    }
    const targets = packageExportTargets(manifest.exports);
    if (targets === undefined || targets.length === 0) {
      errors.push(`${entry.path}: package exports cannot be verified`);
      continue;
    }
    const packageRoot = await realpath(resolve(root, entry.path));
    const distRoot = resolve(packageRoot, "dist");
    for (const target of new Set(targets)) {
      if (!target.startsWith("./dist/") || target.includes("\\")) {
        errors.push(`${entry.path}: export target is outside dist: ${target}`);
        continue;
      }
      const artifactPath = resolve(packageRoot, target);
      if (!contained(distRoot, artifactPath)) {
        errors.push(`${entry.path}: export target is outside dist: ${target}`);
        continue;
      }
      try {
        const metadata = await lstat(artifactPath);
        const canonicalArtifact = await realpath(artifactPath);
        if (metadata.isSymbolicLink() || !metadata.isFile() || !contained(distRoot, canonicalArtifact)) {
          errors.push(`${entry.path}: export target is not one regular package artifact: ${target}`);
        }
      } catch (error) {
        errors.push(`${entry.path}: built export target is missing: ${target} (${error?.code ?? "unknown"})`);
      }
    }
    const runtimeTarget = manifest.exports?.["."]?.import;
    if (errors.length === errorCountBeforeEntry && typeof runtimeTarget === "string") {
      const expectedUrl = pathToFileURL(resolve(packageRoot, runtimeTarget)).href;
      const verification = `
        const specifier = process.argv[1];
        const expected = process.argv[2];
        const resolved = import.meta.resolve(specifier);
        if (resolved !== expected) {
          throw new Error(\`resolved export differs: \${resolved}\`);
        }
        const namespace = await import(specifier);
        if (Object.keys(namespace).length === 0) {
          throw new Error("root runtime export is empty");
        }
      `;
      try {
        await execFileAsync(process.execPath, [
          "--input-type=module",
          "--eval",
          verification,
          entry.package_name,
          expectedUrl,
        ], {
          cwd: packageRoot,
          encoding: "utf8",
          maxBuffer: 4 * 1024 * 1024,
        });
      } catch (error) {
        errors.push(`${entry.path}: built package root cannot be consumed through declared exports (${error?.stderr?.trim() || error?.message || "unknown"})`);
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
