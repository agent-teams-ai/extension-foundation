import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { lstat, mkdir, mkdtemp, readFile, readdir, realpath, rm, stat, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { delimiter, dirname, isAbsolute, join, relative, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { promisify } from "node:util";
import test from "node:test";

const execFileAsync = promisify(execFile);
const repositoryRoot = fileURLToPath(new URL("..", import.meta.url));
const nodeShebang = /^#!\/(?:usr\/bin\/env[ \t]+node|usr\/bin\/node|bin\/node)(?:[ \t]|\r?\n)/u;

async function pnpmCliPath() {
  const repositoryManifest = JSON.parse(await readFile(join(repositoryRoot, "package.json"), "utf8"));
  assert.equal(repositoryManifest.packageManager, "pnpm@11.18.0");
  const directories = [
    ...(process.env.npm_execpath ? [dirname(process.env.npm_execpath)] : []),
    ...(process.env.PATH ?? "").split(delimiter),
  ];
  const candidates = [
    ...(process.env.npm_execpath ? [process.env.npm_execpath] : []),
    ...directories.flatMap(directory => [
      join(directory, "pnpm"),
      join(directory, "pnpm.mjs"),
      join(directory, "pnpm.cjs"),
      // action-setup can put the pnpm package root itself on PATH.
      join(directory, "bin", "pnpm"),
      // pnpm/action-setup exposes .cmd shims on Windows beside node_modules/pnpm.
      join(directory, "..", "pnpm", "bin", "pnpm.mjs"),
      join(directory, "..", "pnpm", "bin", "pnpm.cjs"),
    ]),
  ];

  for (const candidate of candidates) {
    let resolved;
    try {
      resolved = await realpath(candidate);
    } catch (error) {
      // A PATH entry can itself be a pnpm shim file, not a directory.
      if (error.code === "ENOENT" || error.code === "ENOTDIR") continue;
      throw error;
    }
    if (!/\.([cm]?js)$/u.test(resolved)) {
      if (candidate !== join(dirname(dirname(candidate)), "bin", "pnpm")) continue;
      let source;
      try {
        source = await readFile(resolved, "utf8");
      } catch (error) {
        if (error.code === "ENOENT" || error.code === "ENOTDIR" || error.code === "EISDIR") continue;
        throw error;
      }
      if (!nodeShebang.test(source)) continue;
    }

    let pnpmManifest;
    try {
      pnpmManifest = JSON.parse(await readFile(join(dirname(dirname(resolved)), "package.json"), "utf8"));
    } catch (error) {
      if (error.code === "ENOENT" || error.code === "ENOTDIR") continue;
      throw error;
    }
    // Corepack's own JS shim is not the pinned pnpm CLI.
    if (pnpmManifest.name !== "pnpm" || repositoryManifest.packageManager !== `pnpm@${pnpmManifest.version}`) continue;
    return resolved;
  }

  // pnpm/action-setup's self-update replaces PNPM_HOME/bin/pnpm with a shell
  // shim. Its pinned JavaScript CLI lives one level below global/v11 instead.
  if (process.env.PNPM_HOME) {
    let home;
    let versionRoot;
    let versions;
    const withinHome = path => {
      const remainder = relative(home, path);
      return remainder !== ".." && !remainder.startsWith(`..${sep}`) && !isAbsolute(remainder);
    };
    try {
      home = await realpath(process.env.PNPM_HOME);
      versionRoot = await realpath(join(home, "global", "v11"));
      if (withinHome(versionRoot)) versions = await readdir(versionRoot);
    } catch (error) {
      if (error.code !== "ENOENT" && error.code !== "ENOTDIR") throw error;
    }
    if (versions) {
      // The self-update uses one hash directory. Cap the scan to avoid treating
      // an arbitrary PNPM_HOME tree as an unbounded CLI search path.
      for (const versionDirectory of versions.sort().slice(0, 128)) {
        const packageRoot = join(versionRoot, versionDirectory, "node_modules", "pnpm");
        const cli = join(packageRoot, "bin", "pnpm.mjs");
        const modulesFile = join(versionRoot, versionDirectory, "node_modules", ".modules.yaml");
        let resolvedPackageRoot;
        let resolvedCli;
        let resolvedManifest;
        try {
          resolvedPackageRoot = await realpath(packageRoot);
          resolvedCli = await realpath(cli);
          resolvedManifest = await realpath(join(packageRoot, "package.json"));
        } catch (error) {
          if (error.code === "ENOENT" || error.code === "ENOTDIR") continue;
          throw error;
        }
        if (!withinHome(resolvedPackageRoot)) {
          // pnpm 11 can link a self-updated global package into its content
          // store. Only the package at the recorded store path is eligible.
          let metadata;
          let storeRoot;
          try {
            if (!withinHome(await realpath(modulesFile))) continue;
            if ((await stat(modulesFile)).size > 65536) continue;
            metadata = JSON.parse(await readFile(modulesFile, "utf8"));
            if (typeof metadata?.storeDir !== "string" || !isAbsolute(metadata.storeDir) ||
              typeof metadata.packageManager !== "string" || !/^pnpm@11\.\d+\.\d+$/u.test(metadata.packageManager)) continue;
            storeRoot = await realpath(metadata.storeDir);
          } catch (error) {
            if (error.code === "ENOENT" || error.code === "ENOTDIR" || error instanceof SyntaxError) continue;
            throw error;
          }
          const storePackage = relative(storeRoot, resolvedPackageRoot).split(sep);
          if (storePackage.length !== 7 || storePackage[0] !== "links" || storePackage[1] !== "@" ||
            storePackage[2] !== "pnpm" || storePackage[3] !== "11.18.0" ||
            !/^[a-zA-Z0-9_-]+$/u.test(storePackage[4]) ||
            storePackage[5] !== "node_modules" || storePackage[6] !== "pnpm") continue;
        }
        if (resolvedCli !== join(resolvedPackageRoot, "bin", "pnpm.mjs") ||
          resolvedManifest !== join(resolvedPackageRoot, "package.json")) continue;
        let manifest;
        let source;
        try {
          manifest = JSON.parse(await readFile(resolvedManifest, "utf8"));
          source = await readFile(resolvedCli, "utf8");
        } catch (error) {
          if (error.code === "ENOENT" || error.code === "ENOTDIR" || error.code === "EISDIR") continue;
          throw error;
        }
        if (manifest.name !== "pnpm" || repositoryManifest.packageManager !== `pnpm@${manifest.version}`) continue;
        if (!nodeShebang.test(source)) continue;
        return resolvedCli;
      }
    }
  }
  throw new Error("Cannot resolve the pinned pnpm JavaScript CLI from npm_execpath or PATH");
}

test("pnpm CLI discovery skips file shims and resolves the pinned package", async t => {
  const root = await mkdtemp(join(tmpdir(), "extension-pnpm-discovery-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const oldPath = process.env.PATH;
  const oldExecPath = process.env.npm_execpath;
  const oldPnpmHome = process.env.PNPM_HOME;
  t.after(() => {
    if (oldPath === undefined) delete process.env.PATH;
    else process.env.PATH = oldPath;
    if (oldExecPath === undefined) delete process.env.npm_execpath;
    else process.env.npm_execpath = oldExecPath;
    if (oldPnpmHome === undefined) delete process.env.PNPM_HOME;
    else process.env.PNPM_HOME = oldPnpmHome;
  });
  delete process.env.PNPM_HOME;

  const binDirectory = join(root, "node_modules", ".bin");
  const packageDirectory = join(root, "node_modules", "pnpm");
  const cli = join(packageDirectory, "bin", "pnpm.cjs");
  const shim = join(binDirectory, "pnpm");
  await mkdir(binDirectory, { recursive: true });
  await mkdir(dirname(cli), { recursive: true });
  await writeFile(shim, "#!/bin/sh\n");
  await writeFile(cli, "// pinned pnpm fixture\n");
  await writeFile(join(packageDirectory, "package.json"), JSON.stringify({ name: "pnpm", version: "11.18.0" }));

  // Corepack can supply npm_execpath while action-setup supplies a file shim on PATH.
  const corepackCli = join(root, "corepack", "dist", "pnpm.js");
  await mkdir(dirname(corepackCli), { recursive: true });
  await writeFile(corepackCli, "// Corepack shim fixture\n");
  await writeFile(join(root, "corepack", "package.json"), JSON.stringify({ name: "corepack", version: "0.1.0" }));
  process.env.npm_execpath = corepackCli;
  process.env.PATH = [shim, binDirectory].join(delimiter);

  assert.equal(await pnpmCliPath(), await realpath(cli));
});

test("pnpm CLI discovery resolves action-setup's package-root bin layout", async t => {
  const root = await mkdtemp(join(tmpdir(), "extension-pnpm-action-setup-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const oldPath = process.env.PATH;
  const oldExecPath = process.env.npm_execpath;
  const oldPnpmHome = process.env.PNPM_HOME;
  t.after(() => {
    if (oldPath === undefined) delete process.env.PATH;
    else process.env.PATH = oldPath;
    if (oldExecPath === undefined) delete process.env.npm_execpath;
    else process.env.npm_execpath = oldExecPath;
    if (oldPnpmHome === undefined) delete process.env.PNPM_HOME;
    else process.env.PNPM_HOME = oldPnpmHome;
  });
  delete process.env.PNPM_HOME;

  const binDirectory = join(root, "setup-pnpm", "node_modules", ".bin");
  const cli = join(binDirectory, "bin", "pnpm");
  const shim = join(binDirectory, "pnpm");
  await mkdir(dirname(cli), { recursive: true });
  await writeFile(shim, "#!/bin/sh\n");
  await writeFile(cli, "#!/usr/bin/env node\n// pinned pnpm fixture\n");
  await writeFile(join(binDirectory, "package.json"), JSON.stringify({ name: "pnpm", version: "11.18.0" }));

  const corepackCli = join(root, "corepack", "dist", "pnpm.js");
  await mkdir(dirname(corepackCli), { recursive: true });
  await writeFile(corepackCli, "// Corepack shim fixture\n");
  await writeFile(join(root, "corepack", "package.json"), JSON.stringify({ name: "corepack", version: "0.1.0" }));
  process.env.npm_execpath = corepackCli;
  process.env.PATH = [shim, binDirectory].join(delimiter);
  assert.equal(await pnpmCliPath(), await realpath(cli));

  await writeFile(cli, "#!/bin/sh\n");
  await assert.rejects(pnpmCliPath(), /Cannot resolve the pinned pnpm JavaScript CLI/u);
  await writeFile(cli, "#!/usr/bin/env node\n// pinned pnpm fixture\n");
  await writeFile(join(binDirectory, "package.json"), JSON.stringify({ name: "corepack", version: "11.18.0" }));
  await assert.rejects(pnpmCliPath(), /Cannot resolve the pinned pnpm JavaScript CLI/u);
  await writeFile(join(binDirectory, "package.json"), JSON.stringify({ name: "pnpm", version: "11.17.0" }));
  await assert.rejects(pnpmCliPath(), /Cannot resolve the pinned pnpm JavaScript CLI/u);
});

test("pnpm CLI discovery resolves action-setup's self-updated global/v11 CLI", async t => {
  const root = await mkdtemp(join(tmpdir(), "extension-pnpm-self-update-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const previous = Object.fromEntries(["PATH", "npm_execpath", "PNPM_HOME"].map(key => [key, process.env[key]]));
  t.after(() => {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  const home = join(root, "node_modules", ".bin");
  const packageRoot = join(home, "global", "v11", "pinned-hash", "node_modules", "pnpm");
  const modulesFile = join(dirname(packageRoot), ".modules.yaml");
  const storeRoot = join(root, ".pnpm-store", "v11");
  const storePackageRoot = join(storeRoot, "links", "@", "pnpm", "11.18.0", "store-hash", "node_modules", "pnpm");
  const cli = join(packageRoot, "bin", "pnpm.mjs");
  const manifest = join(packageRoot, "package.json");
  const shim = join(home, "bin", "pnpm");
  const corepackCli = join(root, "corepack", "dist", "pnpm.js");
  await mkdir(dirname(packageRoot), { recursive: true });
  await mkdir(join(storePackageRoot, "bin"), { recursive: true });
  await symlink(storePackageRoot, packageRoot, "dir");
  await writeFile(modulesFile, JSON.stringify({ storeDir: storeRoot, packageManager: "pnpm@11.7.0" }));
  await mkdir(dirname(shim), { recursive: true });
  await mkdir(dirname(corepackCli), { recursive: true });
  await writeFile(cli, "#!/usr/bin/env node\n// pinned pnpm fixture\n");
  await writeFile(manifest, JSON.stringify({ name: "pnpm", version: "11.18.0" }));
  await writeFile(shim, `#!/bin/sh\n# cmd-shim-target=${cli}\n`);
  await writeFile(corepackCli, "// Corepack fixture\n");
  await writeFile(join(root, "corepack", "package.json"), JSON.stringify({ name: "corepack", version: "0.1.0" }));
  process.env.PNPM_HOME = home;
  process.env.npm_execpath = corepackCli;
  process.env.PATH = [shim, join(home, "bin")].join(delimiter);

  assert.equal(await pnpmCliPath(), await realpath(cli));

  await writeFile(manifest, JSON.stringify({ name: "pnpm", version: "11.17.0" }));
  await assert.rejects(pnpmCliPath(), /Cannot resolve the pinned pnpm JavaScript CLI/u);
  await writeFile(manifest, JSON.stringify({ name: "corepack", version: "11.18.0" }));
  await assert.rejects(pnpmCliPath(), /Cannot resolve the pinned pnpm JavaScript CLI/u);
  await writeFile(manifest, JSON.stringify({ name: "pnpm", version: "11.18.0" }));
  await writeFile(cli, "#!/bin/sh # node\n# shell shim\n");
  await assert.rejects(pnpmCliPath(), /Cannot resolve the pinned pnpm JavaScript CLI/u);
  await writeFile(cli, "#!/usr/bin/env node\n// pinned pnpm fixture\n");

  await writeFile(modulesFile, JSON.stringify({ storeDir: join(root, "other-store"), packageManager: "pnpm@11.7.0" }));
  await assert.rejects(pnpmCliPath(), /Cannot resolve the pinned pnpm JavaScript CLI/u);
  await writeFile(modulesFile, JSON.stringify({ storeDir: storeRoot, packageManager: "pnpm@11.7.0" }));

  const unrelatedPackage = join(root, "outside", "pnpm-package");
  await mkdir(join(unrelatedPackage, "bin"), { recursive: true });
  await writeFile(join(unrelatedPackage, "bin", "pnpm.mjs"), "#!/usr/bin/env node\n");
  await writeFile(join(unrelatedPackage, "package.json"), JSON.stringify({ name: "pnpm", version: "11.18.0" }));
  await rm(packageRoot);
  await symlink(unrelatedPackage, packageRoot, "dir");
  await assert.rejects(pnpmCliPath(), /Cannot resolve the pinned pnpm JavaScript CLI/u);
  await rm(packageRoot);
  await symlink(storePackageRoot, packageRoot, "dir");

  const outside = join(root, "outside", "pnpm.mjs");
  await mkdir(dirname(outside), { recursive: true });
  await writeFile(outside, "#!/usr/bin/env node\n");
  await rm(cli);
  await symlink(outside, cli);
  await assert.rejects(pnpmCliPath(), /Cannot resolve the pinned pnpm JavaScript CLI/u);
  await rm(cli);
  await writeFile(cli, "#!/usr/bin/env node\n// pinned pnpm fixture\n");
  const outsideManifest = join(root, "outside", "package.json");
  await writeFile(outsideManifest, JSON.stringify({ name: "pnpm", version: "11.18.0" }));
  await rm(manifest);
  await symlink(outsideManifest, manifest);
  await assert.rejects(pnpmCliPath(), /Cannot resolve the pinned pnpm JavaScript CLI/u);
});

async function runPnpm(cwd, args) {
  return execFileAsync(process.execPath, [await pnpmCliPath(), ...args], {
    cwd,
    encoding: "utf8",
    maxBuffer: 1024 * 1024,
  });
}

test("runtime policy keeps Node 24 default and skips Node 25", async () => {
  const [defaultVersion, manifestText] = await Promise.all([
    readFile(join(repositoryRoot, ".node-version"), "utf8"),
    readFile(join(repositoryRoot, "package.json"), "utf8"),
  ]);
  const manifest = JSON.parse(manifestText);

  assert.equal(defaultVersion.trim(), "24.18.0");
  assert.equal(manifest.engines.node, ">=24.18.0 <25");
});

test("pnpm 11 workspace engine policy rejects an incompatible local dependency", async t => {
  const root = await mkdtemp(join(tmpdir(), "extension-engine-policy-"));
  t.after(() => rm(root, { recursive: true, force: true }));

  const dependencyRoot = join(root, "incompatible");
  await mkdir(dependencyRoot);
  await writeFile(join(root, "pnpm-workspace.yaml"), await readFile(join(repositoryRoot, "pnpm-workspace.yaml")));
  await writeFile(join(root, "package.json"), `${JSON.stringify({
    name: "@agent-teams/engine-policy-fixture",
    version: "1.0.0",
    private: true,
    packageManager: "pnpm@11.18.0",
    devDependencies: { "@agent-teams/incompatible-engine-fixture": "file:./incompatible" },
  })}\n`);
  await writeFile(join(dependencyRoot, "package.json"), `${JSON.stringify({
    name: "@agent-teams/incompatible-engine-fixture",
    version: "1.0.0",
    engines: { node: ">=99" },
  })}\n`);

  await assert.rejects(
    runPnpm(root, ["install", "--offline", "--ignore-scripts"]),
    error => {
      assert.match(`${error.stdout}\n${error.stderr}`, /ERR_PNPM_UNSUPPORTED_ENGINE/u);
      assert.match(`${error.stdout}\n${error.stderr}`, /file:incompatible/u);
      return true;
    },
  );
});

test("pnpm 11 workspace peer policy rejects an incompatible local dependency", async t => {
  const root = await mkdtemp(join(tmpdir(), "extension-peer-policy-"));
  t.after(() => rm(root, { recursive: true, force: true }));

  await mkdir(join(root, "host"));
  await mkdir(join(root, "consumer"));
  await writeFile(join(root, "pnpm-workspace.yaml"), await readFile(join(repositoryRoot, "pnpm-workspace.yaml")));
  await writeFile(join(root, "package.json"), `${JSON.stringify({
    name: "@agent-teams/peer-policy-fixture",
    version: "1.0.0",
    private: true,
    packageManager: "pnpm@11.18.0",
    dependencies: { host: "file:./host", consumer: "file:./consumer" },
  })}\n`);
  await writeFile(join(root, "host", "package.json"), `${JSON.stringify({ name: "host", version: "1.0.0" })}\n`);
  await writeFile(join(root, "consumer", "package.json"), `${JSON.stringify({
    name: "consumer",
    version: "1.0.0",
    peerDependencies: { host: "^2.0.0" },
  })}\n`);

  await assert.rejects(
    runPnpm(root, ["install", "--offline", "--ignore-scripts"]),
    error => {
      assert.match(`${error.stdout}\n${error.stderr}`, /ERR_PNPM_PEER_DEP_ISSUES/u);
      assert.match(`${error.stdout}\n${error.stderr}`, /unmet peer host/u);
      return true;
    },
  );
});

test("strict frozen install is followed by rejecting locked peer graph validation", async t => {
  const root = await mkdtemp(join(tmpdir(), "extension-frozen-peer-policy-"));
  t.after(() => rm(root, { recursive: true, force: true }));

  const hostRoot = join(root, "host");
  const consumerRoot = join(root, "consumer");
  await mkdir(hostRoot);
  await mkdir(consumerRoot);
  await writeFile(join(root, "pnpm-workspace.yaml"), await readFile(join(repositoryRoot, "pnpm-workspace.yaml")));
  await writeFile(join(hostRoot, "package.json"), `${JSON.stringify({ name: "host", version: "1.0.0" })}\n`);
  await writeFile(join(consumerRoot, "package.json"), `${JSON.stringify({
    name: "consumer", version: "1.0.0", peerDependencies: { host: "^2.0.0" },
  })}\n`);

  await runPnpm(hostRoot, ["pack", "--pack-destination", root]);
  await runPnpm(consumerRoot, ["pack", "--pack-destination", root]);
  await writeFile(join(root, "package.json"), `${JSON.stringify({
    name: "@agent-teams/frozen-peer-policy-fixture",
    version: "1.0.0",
    private: true,
    packageManager: "pnpm@11.18.0",
    dependencies: { host: "file:./host-1.0.0.tgz", consumer: "file:./consumer-1.0.0.tgz" },
  })}\n`);

  await runPnpm(root, ["install", "--lockfile-only", "--offline", "--ignore-scripts", "--strict-peer-dependencies=false"]);
  await runPnpm(root, ["install", "--frozen-lockfile", "--offline", "--ignore-scripts", "--engine-strict", "--strict-peer-dependencies"]);
  await assert.rejects(
    runPnpm(root, ["peers", "check", "--lockfile-only"]),
    error => {
      assert.match(`${error.stdout}\n${error.stderr}`, /unmet peer host/u);
      assert.match(`${error.stdout}\n${error.stderr}`, /Installed: 1\.0\.0/u);
      assert.match(`${error.stdout}\n${error.stderr}`, /\^2\.0\.0/u);
      return true;
    },
  );
});

test("synthetic package export resolution preserves artifact bytes", async t => {
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
