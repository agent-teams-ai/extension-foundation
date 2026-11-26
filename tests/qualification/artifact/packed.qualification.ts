import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import { constants } from "node:fs";
import { copyFile, mkdir, mkdtemp, readFile, readdir, realpath, rm, symlink, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, join, sep } from "node:path";
import { arch, env, execPath, platform } from "node:process";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { createRegistryFixture, type SignedFixture } from "./registry-fixture.ts";
import { releases, runFile, selectedTools, sha256 } from "./native-tools.ts";

const repository = fileURLToPath(new URL("../../../", import.meta.url));
const compiler = join(repository, "node_modules", "typescript", "bin", "tsc");
const object = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === "object" && !Array.isArray(value);
const source = `globalThis.efArtifactWitness.evaluations++;
export function publish(title) {
  globalThis.efArtifactWitness.effects++;
  return { title, slug: title.toLowerCase().replaceAll(" ", "-") };
}
`;

async function pnpm(args: readonly string[], cwd: string): Promise<void> {
  const executable = env.npm_execpath;
  assert.ok(executable && isAbsolute(executable), "Run qualification through the repository's pinned pnpm");
  await runFile(execPath, [executable, ...args], { cwd, timeout: 120_000, maxBuffer: 4 * 1024 * 1024 });
}

test("packed Node artifact consumer verifies a real signed OCI closure before typed authorized evaluation", { timeout: 300_000 }, async context => {
  assert.equal(platform, "linux", "Native qualification selects Linux x64; this campaign must not silently skip");
  assert.equal(arch, "x64", "Native qualification selects Linux x64; this campaign must not silently skip");
  assert.ok(env.EF_ARTIFACT_TOOLS_DIR, "Install the selected native releases and set EF_ARTIFACT_TOOLS_DIR");
  const tools = await selectedTools(env.EF_ARTIFACT_TOOLS_DIR);
  const metadata: unknown = JSON.parse(await readFile(join(repository, "node_modules", "typescript", "package.json"), "utf8"));
  assert.ok(object(metadata) && typeof metadata.version === "string");
  const version = metadata.version.split(".").map(Number);
  assert.ok((version.at(0) ?? 0) > 7 || version.at(0) === 7 && ((version.at(1) ?? 0) > 0 || (version.at(2) ?? 0) >= 2),
    "External declarations must be checked with TypeScript 7.0.2 or newer");
  const types: unknown = JSON.parse(await readFile(join(repository, "node_modules", "@types", "node", "package.json"), "utf8"));
  assert.ok(object(types) && typeof types.version === "string");
  // An external sibling cannot join this workspace, but shares the filesystem
  // whose verified pnpm content store contains the pinned runtime dependency.
  const temporary = await mkdtemp(join(dirname(repository), "ef-artifact-consumer-"));
  let closeRegistry: (() => Promise<void>) | undefined;
  context.after(async () => {
    try { await closeRegistry?.(); }
    finally { await rm(temporary, { recursive: true, force: true }); }
  });
  const archives = join(temporary, "archives");
  await mkdir(archives);
  await pnpm(["--dir", "packages/node-artifact", "pack", "--pack-destination", archives], repository);
  const names = (await readdir(archives)).filter(name => name.endsWith(".tgz"));
  assert.equal(names.length, 1);
  const name = names.at(0);
  assert.ok(name);
  const archive = join(archives, name);
  const archiveDigest = sha256(await readFile(archive));
  const registryDirectory = join(temporary, "publisher");
  await mkdir(registryDirectory);
  const registry = await createRegistryFixture(registryDirectory, tools);
  closeRegistry = registry.close;
  const good = await registry.publish("good", source);
  const failures: { name: string; request: SignedFixture; code: string; tamper?: { path: string; bytes: readonly number[] } }[] = [];
  for (const [name, annotation, value] of [
    ["wrong-target", "target", "node/wrong/target"],
    ["wrong-scope", "scope", "example/other"],
    ["wrong-publisher", "publisher", "publisher/other"],
  ]) {
    assert.ok(name && annotation && value);
    failures.push({ name, request: await registry.publish(name, source, { [`dev.extension-foundation.${annotation}`]: value }), code: "artifact.identity" });
  }
  for (const [name, expected] of [
    ["wrong-contract", { ...good.expected, contract: "document/other" }],
    ["wrong-revision", { ...good.expected, revision: 4 }],
    ["wrong-loader", { ...good.expected, loader: "other-loader" }],
  ] satisfies readonly (readonly [string, SignedFixture["expected"]])[]) {
    failures.push({ name, request: { ...good, expected }, code: "artifact.identity" });
  }
  const bundle: unknown = JSON.parse(Buffer.from(good.signatureBytes).toString("utf8"));
  assert.ok(object(bundle) && object(bundle.messageSignature) && typeof bundle.messageSignature.signature === "string");
  const signature = bundle.messageSignature.signature;
  const changedBundle = { ...bundle, messageSignature: { ...bundle.messageSignature,
    signature: (signature.startsWith("A") ? "B" : "A") + signature.slice(1) } };
  failures.push({ name: "tampered-signature", request: { ...good, signatureBytes: [...Buffer.from(JSON.stringify(changedBundle))] }, code: "artifact.signature" });
  failures.push({ name: "wrong-key-pin", request: { ...good, trustedPublisher: { ...good.trustedPublisher, keyDigest: `sha256:${"0".repeat(64)}` } }, code: "artifact.signature" });
  const differentKey = generateKeyPairSync("ec", { namedCurve: "prime256v1" }).publicKey;
  failures.push({ name: "wrong-trusted-key", request: { ...good, trustedPublisher: { ...good.trustedPublisher,
    publicKeyPem: differentKey.export({ format: "pem", type: "spki" }).toString(),
    keyDigest: sha256(differentKey.export({ format: "der", type: "spki" })) } }, code: "artifact.signature" });
  failures.push({ name: "unavailable-artifact", request: { ...good, digest: `sha256:${"0".repeat(64)}` }, code: "artifact.transport" });
  failures.push({ name: "signed-duplicate-key", request: await registry.publish("duplicate-key", source, {},
    value => value.replace('"schemaVersion":2', '"schemaVersion":2,"schemaVersion":2')), code: "artifact.manifest" });
  failures.push({ name: "signed-traversal", request: await registry.publish("traversal", source,
    { "dev.extension-foundation.entry": "../entry.mjs" }), code: "artifact.manifest" });

  for (const [name, suffix] of [
    ["static-import", 'import "node:fs";'],
    ["dynamic-import", 'export const later = () => import("node:fs");'],
    ["import-meta", "export const identity = import.meta.url;"],
    ["then-export", "export function then(resolve) { resolve({ disguised: true }); }"],
    ["escaped-then-export", "export const th\\u0065n = resolve => resolve({ disguised: true });"],
    ["escaped-braced-then-export", "export const t\\u{0068}en = resolve => resolve({ disguised: true });"],
    ["reexport", 'export * from "node:fs";'],
  ]) {
    assert.ok(name && suffix);
    failures.push({ name, request: await registry.publish(name, source + suffix), code: "artifact.closure" });
  }
  const tamperedBytes = await registry.publish("tampered-bytes", source + "// unique original payload\n");
  const modulePath = await registry.moduleBlob(tamperedBytes);
  const moduleBytes = await readFile(modulePath);
  const changedModule = Buffer.from(moduleBytes.toString("utf8").replace("unique original payload", "tamper original payload"));
  assert.equal(changedModule.length, moduleBytes.length);
  assert.notEqual(sha256(changedModule), sha256(moduleBytes));
  // Real ORAS refuses these same-length substitutions with "mismatched digest"
  // before returning a successful fetch to the adapter: a transport refusal.
  failures.push({ name: "tampered-executable", request: tamperedBytes, code: "artifact.transport",
    tamper: { path: modulePath, bytes: [...changedModule] } });
  const tamperedManifest = await registry.publish("tampered-manifest", source, { "org.opencontainers.image.description": "manifest-original" });
  const manifestPath = registry.blobPath(tamperedManifest.digest);
  const manifestBytes = await readFile(manifestPath);
  const changedManifest = Buffer.from(manifestBytes.toString("utf8").replace("manifest-original", "manifest-tampered"));
  assert.equal(changedManifest.length, manifestBytes.length);
  assert.notEqual(sha256(changedManifest), sha256(manifestBytes));
  failures.push({ name: "tampered-manifest", request: tamperedManifest, code: "artifact.transport",
    tamper: { path: manifestPath, bytes: [...changedManifest] } });

  const directory = join(temporary, "consumer");
  const stagingRoot = join(temporary, "staging");
  const symlinkStagingRoot = join(temporary, "staging-alias");
  await mkdir(directory);
  await mkdir(stagingRoot);
  await symlink(stagingRoot, symlinkStagingRoot, "dir");
  await writeFile(join(directory, "package.json"), JSON.stringify({
    name: "independent-artifact-consumer", private: true, type: "module",
    dependencies: { "@extension-foundation/node-artifact": `file:${archive}` },
    devDependencies: { "@types/node": types.version },
  }, null, 2));
  await copyFile(join(repository, "tests", "fixtures", "packaged-artifact", "consumer.ts"), join(directory, "consumer.ts"));
  const inputs = { tools: { oras: tools.oras, cosign: tools.cosign }, stagingRoot, symlinkStagingRoot,
    originalModuleBlob: await registry.moduleBlob(good), good, failures };
  await writeFile(join(directory, "inputs.ts"), 'import type { FixtureInputs } from "./consumer.js";\nexport const inputs = '
    + JSON.stringify(inputs, null, 2) + " satisfies FixtureInputs;\n");
  await writeFile(join(directory, "tsconfig.json"), JSON.stringify({
    compilerOptions: {
      target: "ES2024", module: "NodeNext", moduleResolution: "NodeNext", lib: ["ES2024"], types: ["node"],
      strict: true, noUncheckedIndexedAccess: true, exactOptionalPropertyTypes: true,
      skipLibCheck: false, noEmitOnError: true, declaration: true, outDir: "output",
    }, files: ["consumer.ts", "inputs.ts"],
  }, null, 2));
  await pnpm(["install", "--lockfile-only", "--offline", "--ignore-scripts", "--ignore-pnpmfile", "--strict-peer-dependencies"], directory);
  await pnpm(["install", "--frozen-lockfile", "--offline", "--ignore-scripts", "--ignore-pnpmfile", "--strict-peer-dependencies"], directory);
  const compile = await runFile(execPath, [compiler, "--project", "tsconfig.json", "--listFiles", "--pretty", "false"],
    { cwd: directory, timeout: 60_000, maxBuffer: 4 * 1024 * 1024 });
  const files = compile.stdout.trim().split(/\r?\n/u);
  assert.ok(files.some(file => file.includes("@extension-foundation") && file.endsWith("index.d.ts")), "Installed declarations must be actual compiler inputs");
  assert.ok(files.every(file => !file.includes(`${sep}packages${sep}node-artifact${sep}src${sep}`)), "No provider checkout source may satisfy the external consumer");
  const execution = await runFile(execPath, ["--input-type=module", "-e",
    'import { observe } from "./output/consumer.js"; import { inputs } from "./output/inputs.js"; console.log(JSON.stringify(await observe(inputs)));'],
  { cwd: directory, timeout: 120_000, maxBuffer: 1024 * 1024 });
  const observed: unknown = JSON.parse(execution.stdout);
  assert.ok(object(observed) && typeof observed.resolved === "string");
  assert.deepEqual(observed.result, [{ title: "Early Work", slug: "early-work" }, { title: "Second Edition", slug: "second-edition" }]);
  assert.deepEqual(observed.failures, failures.map(({ name, code }) => ({ name, code })));
  assert.equal(observed.admissionRefusalEvaluations, 0);
  assert.equal(observed.admissionRefusalEffects, 0);
  assert.equal(observed.exportRefusalEvaluations, 1);
  assert.equal(observed.totalEvaluations, 3);
  assert.equal(observed.totalEffects, 2);
  assert.equal(observed.distinctAttemptIdentities, true);
  assert.equal(observed.capturedBytesSurvivedSubstitution, true);
  assert.equal(observed.authorityCalls, 3);
  const entry = await realpath(fileURLToPath(observed.resolved));
  assert.ok(entry.startsWith(join(directory, "node_modules") + sep));
  const packageRoot = dirname(dirname(entry));
  const packedFiles = (await readdir(join(packageRoot, "dist"), { withFileTypes: true, recursive: true })).filter(item => item.isFile());
  assert.ok(packedFiles.length > 0 && packedFiles.every(item => /\.(?:js|d\.ts|d\.ts\.map)$/u.test(item.name)), "Packed runtime contains compiled code and declarations only");
  for (const path of ["dist/features/verified-artifact/verify.js", "dist/features/verified-artifact/evaluate.js"]) {
    await assert.rejects(runFile(execPath, ["--input-type=module", "-e", `await import("@extension-foundation/node-artifact/${path}");`],
      { cwd: directory, timeout: 30_000, maxBuffer: 1024 * 1024 }),
    (error: unknown) => error instanceof Error && "stderr" in error && typeof error.stderr === "string" && error.stderr.includes("ERR_PACKAGE_PATH_NOT_EXPORTED"));
  }
  await registry.close();
  closeRegistry = undefined;
  if (env.EF_QUALIFICATION_ARTIFACT_DIR !== undefined) {
    assert.ok(isAbsolute(env.EF_QUALIFICATION_ARTIFACT_DIR));
    await mkdir(env.EF_QUALIFICATION_ARTIFACT_DIR, { recursive: true });
    await copyFile(archive, join(env.EF_QUALIFICATION_ARTIFACT_DIR, "extension-foundation-node-artifact-0.0.0.tgz"), constants.COPYFILE_EXCL);
  }
  context.diagnostic(`node-artifact archive ${archiveDigest}; TypeScript ${metadata.version}; ORAS ${releases.oras.version}; Cosign ${releases.cosign.version}; Distribution ${releases.registry.version}; ${failures.length} genuine signed/transport rejection cases passed`);
});
