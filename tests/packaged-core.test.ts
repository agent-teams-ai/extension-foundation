import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { constants } from "node:fs";
import { copyFile, mkdtemp, mkdir, readFile, readdir, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, isAbsolute, join, relative, sep } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const runFile = promisify(execFile);
const repository = fileURLToPath(new URL("../", import.meta.url));
const fixtures = join(repository, "tests", "fixtures", "packaged-core");
const compiler = join(repository, "node_modules", "typescript", "bin", "tsc");
const object = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

async function pnpm(args: readonly string[], cwd: string): Promise<void> {
  const executable = process.env["npm_execpath"];
  assert.ok(executable && isAbsolute(executable), "Run this test through the repository's pinned pnpm");
  await runFile(process.execPath, [executable, ...args], { cwd, timeout: 120_000, maxBuffer: 4 * 1024 * 1024 });
}

async function consumer(directory: string, archive: string, fixture: string) {
  await mkdir(directory);
  await writeFile(join(directory, "package.json"), JSON.stringify({
    name: "external-core-consumer", private: true, type: "module",
    dependencies: { "@extension-foundation/core": `file:${archive}` },
  }, null, 2));
  await copyFile(join(fixtures, fixture), join(directory, "consumer.ts"));
  await copyFile(join(fixtures, "types.ts"), join(directory, "types.ts"));
  await writeFile(join(directory, "tsconfig.json"), JSON.stringify({
    compilerOptions: {
      target: "ES2024", module: "NodeNext", moduleResolution: "NodeNext", lib: ["ES2024"], types: [],
      strict: true, noUncheckedIndexedAccess: true, exactOptionalPropertyTypes: true,
      skipLibCheck: false, noEmitOnError: true, declaration: true, outDir: "output",
    }, files: ["consumer.ts", "types.ts"],
  }, null, 2));
  await pnpm(["install", "--lockfile-only", "--offline", "--ignore-scripts", "--ignore-pnpmfile"], directory);
  await pnpm(["install", "--frozen-lockfile", "--offline", "--ignore-scripts", "--ignore-pnpmfile"], directory);
  const compile = await runFile(process.execPath, [compiler, "--project", "tsconfig.json", "--listFiles", "--pretty", "false"], {
    cwd: directory, timeout: 60_000, maxBuffer: 4 * 1024 * 1024,
  });
  const inputs = compile.stdout.trim().split(/\r?\n/u);
  assert.ok(inputs.some(path => path.includes("@extension-foundation") && path.endsWith("index.d.ts")),
    "the real installed declarations must be compiler inputs");
  assert.ok(inputs.every(path => !path.includes(`${sep}packages${sep}core${sep}src${sep}`)),
    "the consumer must not compile provider checkout source");
  const execution = await runFile(process.execPath, ["--input-type=module", "-e",
    'import { observe } from "./output/consumer.js"; console.log(JSON.stringify({ result: observe(), resolved: import.meta.resolve("@extension-foundation/core") }));'], {
    cwd: directory, timeout: 30_000, maxBuffer: 1024 * 1024,
  });
  const observed: unknown = JSON.parse(execution.stdout);
  assert.ok(object(observed) && typeof observed["resolved"] === "string");
  const entry = await realpath(fileURLToPath(observed["resolved"]));
  assert.ok(entry.startsWith(join(directory, "node_modules") + sep), "public root must resolve inside the isolated installation");
  const packageRoot = dirname(dirname(entry));
  const inventory = (await readdir(join(packageRoot, "dist"), { recursive: true, withFileTypes: true }))
    .filter(item => item.isFile()).map(item => relative(join(packageRoot, "dist"), join(item.parentPath, item.name)).split(sep).join("/"));
  assert.deepEqual(inventory.sort(), ["index", "features/contributions/index", "features/contributions/contracts",
    "features/contributions/inert-metadata", "features/contributions/match-contributions"]
    .flatMap(name => [`${name}.js`, `${name}.d.ts`, `${name}.d.ts.map`]).sort());
  await assert.rejects(runFile(process.execPath, ["--input-type=module", "-e",
    'await import("@extension-foundation/core/dist/features/contributions/match-contributions.js");'], {
    cwd: directory, timeout: 30_000, maxBuffer: 1024 * 1024,
  }), (error: unknown) => error instanceof Error && "stderr" in error &&
    typeof error.stderr === "string" && error.stderr.includes("ERR_PACKAGE_PATH_NOT_EXPORTED"));
  return observed["result"];
}

test("one exact core archive supports independent strict installed consumers and closed package exports", { timeout: 180_000 }, async context => {
  const metadata: unknown = JSON.parse(await readFile(join(repository, "node_modules", "typescript", "package.json"), "utf8"));
  assert.ok(object(metadata) && typeof metadata["version"] === "string");
  const compilerVersion = metadata["version"].split(".").map(Number);
  assert.ok((compilerVersion[0] ?? 0) > 7 || compilerVersion[0] === 7 &&
    ((compilerVersion[1] ?? 0) > 0 || (compilerVersion[2] ?? 0) >= 2), "TypeScript 7.0.2+ is required");
  const temporary = await mkdtemp(join(tmpdir(), "extension-core-consumers-"));
  context.after(() => rm(temporary, { recursive: true, force: true }));
  await pnpm(["--dir", "packages/core", "build"], repository);
  const archives = join(temporary, "archives");
  await mkdir(archives);
  await pnpm(["--dir", "packages/core", "pack", "--pack-destination", archives], repository);
  const names = (await readdir(archives)).filter(name => name.endsWith(".tgz"));
  assert.equal(names.length, 1);
  const archive = join(archives, names[0]!);
  const digest = createHash("sha256").update(await readFile(archive)).digest("hex");
  const heading = await consumer(join(temporary, "heading"), archive, "headline-consumer.ts");
  const quota = await consumer(join(temporary, "quota"), archive, "quota-consumer.ts");
  assert.deepEqual(heading, {
    rendered: ["Title: EARLY WORK"],
    omitted: [{ id: "future/panel", contract: "presentation/panel", revision: 1, reason: "unknown-contract" }],
    requiredFailure: "unknown-required-contract", malformedFailure: "invalid-contribution-payload",
    validatorFailure: "invalid-owner-validator", evaluatedOnRefusal: 0, retainedText: "early work", mutationRefused: true,
  });
  assert.deepEqual(quota, {
    outcome: { allowed: true, free: 5 }, incompatible: "unsupported-required-revision",
    optional: [{ id: "account/review-budget", contract: "scheduler/quota", revision: 6, reason: "unsupported-revision" }],
    effectsOnRefusal: 0, queues: ["review", "export"], frozenQueues: true,
  });
  const retainedDirectory = process.env["EF_QUALIFICATION_ARTIFACT_DIR"];
  if (retainedDirectory !== undefined) {
    assert.ok(isAbsolute(retainedDirectory), "Qualification artifact directory must be absolute");
    await mkdir(retainedDirectory, { recursive: true });
    await copyFile(archive, join(retainedDirectory, "extension-foundation-core-0.0.0.tgz"), constants.COPYFILE_EXCL);
  }
  context.diagnostic(`core archive sha256:${digest}; TypeScript ${metadata["version"]}; two distinct installed consumers passed`);
});
