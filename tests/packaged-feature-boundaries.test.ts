import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";

const root = fileURLToPath(new URL("..", import.meta.url));
const sourcePolicyPath = "architecture/foundation/source-dependencies.yaml";
const cli = fileURLToPath(new URL("./cli.js", import.meta.resolve("@agent-teams/engineering-foundation")));
const execute = promisify(execFile);
const packagePaths = ["packages/core", "packages/node-artifact"];
const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
function object(value: unknown): Record<string, unknown> {
  assert.ok(isObject(value), "source gate must return structured records");
  return value;
}
function array(value: unknown): readonly unknown[] {
  assert.ok(Array.isArray(value), "source gate must return an array");
  return value;
}

interface CheckResult { readonly exitCode: number; readonly report: Record<string, unknown> }
async function runChecker(directory: string): Promise<CheckResult> {
  try {
    const result = await execute(process.execPath, [cli, "check", "architecture.source-dependencies", "--format", "json"], {
      cwd: directory, timeout: 120_000, maxBuffer: 8 * 1024 * 1024,
    });
    return { exitCode: 0, report: object(JSON.parse(result.stdout)) };
  } catch (error) {
    assert.ok(error instanceof Error && "stdout" in error && typeof error.stdout === "string", "expected an executed structured Foundation diagnostic");
    assert.ok("code" in error && typeof error.code === "number", "process signals/timeouts do not count as rejecting source evidence");
    return { exitCode: error.code, report: object(JSON.parse(error.stdout)) };
  }
}

function ruleIds(result: CheckResult): readonly string[] {
  return array(result.report.capabilities).flatMap(value => array(object(value).diagnostics)).map(value => {
    const rule = object(value).ruleId;
    assert.equal(typeof rule, "string");
    return String(rule);
  });
}

async function fixture(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), "extension-feature-boundaries-"));
  try {
    const policy = object(parseYaml(await readFile(join(root, sourcePolicyPath), "utf8")));
    const boundaries = array(policy.boundaries).filter(value => {
      const id = object(value).id;
      return typeof id === "string" && id.startsWith("package.");
    });
    assert.ok(boundaries.length >= 7, "the actual two production roles and their internal layers must be present");
    const governedRoots = packagePaths.flatMap(path => [`${path}/src`, `${path}/test`]);
    for (const path of governedRoots) {
      await mkdir(dirname(join(directory, path)), { recursive: true });
      await cp(join(root, path), join(directory, path), { recursive: true });
    }
    for (const path of ["package.json", "pnpm-workspace.yaml", ...packagePaths.map(path => `${path}/package.json`)]) {
      await mkdir(dirname(join(directory, path)), { recursive: true });
      await cp(join(root, path), join(directory, path));
    }
    await mkdir(dirname(join(directory, sourcePolicyPath)), { recursive: true });
    // Use the reviewed production boundaries verbatim. Development repository
    // tooling is a different scope, still checked by the existing complete gate.
    delete policy.rootPackage; // v3 omits root participation when only library packages are selected.
    await writeFile(join(directory, sourcePolicyPath), stringifyYaml({
      ...policy, packageRoots: packagePaths, governedRoots, boundaries,
    }));
    await writeFile(join(directory, "foundation.config.yaml"), stringifyYaml({
      schemaVersion: 1, project: { id: "extension-feature-boundary-qualification" },
      capabilities: { "architecture.source-dependencies": { configPath: sourcePolicyPath } },
    }));
    return directory;
  } catch (error) {
    await rm(directory, { recursive: true, force: true });
    throw error;
  }
}

async function append(directory: string, path: string, source: string): Promise<void> {
  const target = join(directory, path);
  await writeFile(target, `${await readFile(target, "utf8")}\n${source}\n`);
}

const core = "packages/core/src/features/contributions/contracts.ts";
const kernel = "packages/node-artifact/src/features/verified-artifact/contracts.ts";

test("actual package sources satisfy their concrete role and layer boundaries", { timeout: 120_000 }, async context => {
  const directory = await fixture();
  context.after(() => rm(directory, { recursive: true, force: true }));
  const result = await runChecker(directory);
  assert.equal(result.exitCode, 0, JSON.stringify(result));
  assert.equal(object(result.report.summary).errors, 0, JSON.stringify(result));
});

test("installed Foundation rejects platform leaks, deep imports, undeclared edges and cycles", { timeout: 240_000 }, async context => {
  const mutations: readonly (readonly [string, string, string, string])[] = [
    ["core runtime builtin", core, 'import "node:fs";', "forbidden-builtin-dependency"],
    ["core declaration builtin", core, 'export type LeakedFile = import("node:fs").Stats;', "forbidden-builtin-dependency"],
    ["kernel outward adapter dependency", kernel, 'import "./native.ts";', "forbidden-boundary-dependency"],
    ["foreign package source", core, 'import "../../../../node-artifact/src/features/verified-artifact/manifest.ts";', "cross-package-relative-import"],
    ["module deep feature import", "packages/core/src/index.ts", 'import "./features/contributions/match-contributions.ts";', "cross-boundary-local-import-not-entrypoint"],
    ["undeclared external dependency", core, 'import "not-a-declared-extension-dependency";', "undeclared-external-dependency"],
    ["policy/adapter cycle", kernel, 'import "./index.ts";', "boundary-runtime-cycle"],
    ["unqualified dynamic import", core, 'const modulePath = "node:fs"; void import(modulePath);', "unresolved-runtime-reference"],
  ];
  for (const [name, path, source, rule] of mutations) await context.test(name, async child => {
    const directory = await fixture();
    child.after(() => rm(directory, { recursive: true, force: true }));
    await append(directory, path, source);
    const result = await runChecker(directory);
    assert.notEqual(result.exitCode, 0, JSON.stringify(result));
    assert.ok(ruleIds(result).includes(`architecture.source-dependencies.${rule}`), JSON.stringify(result));
  });
});

test("a declared internal layer cannot disappear from the actual governed sources", { timeout: 120_000 }, async context => {
  const directory = await fixture();
  context.after(() => rm(directory, { recursive: true, force: true }));
  await rm(join(directory, "packages/node-artifact/src/features/verified-artifact/manifest.ts"));
  const result = await runChecker(directory);
  assert.notEqual(result.exitCode, 0, JSON.stringify(result));
  assert.match(JSON.stringify(result), /manifest\.ts/u);
});
