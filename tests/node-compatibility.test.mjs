import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { lstat, mkdir, mkdtemp, readFile, realpath, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { promisify } from "node:util";
import test from "node:test";

const execFileAsync = promisify(execFile);
const repositoryRoot = fileURLToPath(new URL("..", import.meta.url));

test("runtime policy keeps Node 24 default and skips Node 25", async () => {
  const [defaultVersion, manifestText] = await Promise.all([
    readFile(join(repositoryRoot, ".node-version"), "utf8"),
    readFile(join(repositoryRoot, "package.json"), "utf8"),
  ]);
  const manifest = JSON.parse(manifestText);

  assert.equal(defaultVersion.trim(), "24.18.0");
  assert.equal(manifest.engines.node, ">=24.18.0 <25 || >=26.10.0 <27");
});

test("package export resolution remains stable across supported Node runtimes", async t => {
  const root = await mkdtemp(join(tmpdir(), "extension-node-compatibility-"));
  t.after(() => rm(root, { recursive: true, force: true }));

  const packageRoot = join(root, "consumer");
  const distRoot = join(packageRoot, "dist");
  const artifactPath = join(distRoot, "index.js");
  const aliasPath = join(packageRoot, "artifact-link.js");
  const packageName = "@agent-teams/node-compatibility-fixture";
  const source = "export const compatibilityValue = 42;\n";

  await mkdir(distRoot, { recursive: true });
  await writeFile(join(packageRoot, "package.json"), `${JSON.stringify({
    name: packageName,
    type: "module",
    exports: {
      ".": {
        import: "./dist/index.js",
      },
    },
  })}\n`);
  await writeFile(artifactPath, source);
  await symlink(artifactPath, aliasPath, "file");

  const metadata = await lstat(aliasPath);
  const canonicalAlias = await realpath(aliasPath);
  const canonicalArtifact = await realpath(artifactPath);
  const digest = createHash("sha256").update(await readFile(aliasPath)).digest("hex");

  assert.equal(metadata.isSymbolicLink(), true);
  assert.equal(canonicalAlias, canonicalArtifact);
  assert.equal(createHash("sha256").update(await readFile(canonicalAlias)).digest("hex"), digest);

  const verification = `
    const specifier = process.argv[1];
    const expected = process.argv[2];
    const expectedDigest = process.argv[3];
    const resolved = import.meta.resolve(specifier);
    if (resolved !== expected) {
      throw new Error(\`resolved export differs: \${resolved}\`);
    }
    const namespace = await import(specifier);
    if (namespace.compatibilityValue !== 42) {
      throw new Error("root runtime export changed");
    }
    const { createHash } = await import("node:crypto");
    const { readFile } = await import("node:fs/promises");
    const bytes = await readFile(new URL(resolved));
    const digest = createHash("sha256").update(bytes).digest("hex");
    if (digest !== expectedDigest) {
      throw new Error("resolved artifact digest changed");
    }
  `;

  await execFileAsync(process.execPath, [
    "--input-type=module",
    "--eval",
    verification,
    packageName,
    pathToFileURL(artifactPath).href,
    digest,
  ], {
    cwd: packageRoot,
    encoding: "utf8",
    maxBuffer: 1024 * 1024,
  });
});
