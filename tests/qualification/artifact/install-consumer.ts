import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { parse } from "yaml";

function fields(value: unknown): ReadonlyMap<string, unknown> {
  assert.ok(value !== null && typeof value === "object" && !Array.isArray(value));
  return new Map(Object.entries(value));
}

/** Resolve cold metadata normally, then admit only the already reviewed package bytes. */
export async function installConsumer(
  repository: string,
  directory: string,
  archive: string,
  typesVersion: string,
  cacheDirectory: string,
  pnpm: (args: readonly string[], cwd: string) => Promise<void>,
): Promise<void> {
  const approved = fields(parse(await readFile(join(repository, "pnpm-lock.yaml"), "utf8")));
  const approvedPackages = fields(approved.get("packages"));
  const approvedSnapshots = fields(approved.get("snapshots"));
  const artifactImporter = fields(fields(approved.get("importers")).get("packages/node-artifact"));
  const lexer = fields(fields(artifactImporter.get("dependencies")).get("es-module-lexer")).get("version");
  const nodeKey = `@types/node@${typesVersion}`;
  const undici = fields(fields(approvedSnapshots.get(nodeKey)).get("dependencies")).get("undici-types");
  assert.ok(typeof lexer === "string" && /^\d+\.\d+\.\d+$/u.test(lexer));
  assert.ok(typeof undici === "string" && /^\d+\.\d+\.\d+$/u.test(undici));
  const registryKeys = [nodeKey, `undici-types@${undici}`, `es-module-lexer@${lexer}`];
  await writeFile(join(directory, "package.json"), JSON.stringify({
    name: "independent-artifact-consumer", private: true, type: "module",
    dependencies: { "@extension-foundation/node-artifact": `file:${archive}` },
    // Pin the reviewed transitive type dependency instead of resolving its range afresh.
    devDependencies: { "@types/node": typesVersion, "undici-types": undici },
  }, null, 2));
  await mkdir(cacheDirectory);
  assert.deepEqual(await readdir(cacheDirectory), [], "The consumer must start without registry metadata");
  const common = ["--cache-dir", cacheDirectory, "--ignore-scripts", "--ignore-pnpmfile", "--strict-peer-dependencies"];
  await pnpm(["install", "--lockfile-only", ...common], directory);
  const lock = fields(parse(await readFile(join(directory, "pnpm-lock.yaml"), "utf8")));
  const packages = fields(lock.get("packages"));
  const snapshots = fields(lock.get("snapshots"));
  const localKeys = [...packages.keys()].filter(key => key.startsWith("@extension-foundation/node-artifact@file:"));
  assert.equal(localKeys.length, 1, "Exactly the tested local package accompanies the closed registry graph");
  const localKey = localKeys.at(0);
  assert.ok(localKey);
  assert.deepEqual([...packages.keys()].sort(), [...registryKeys, localKey].sort());
  assert.deepEqual([...snapshots.keys()].sort(), [...registryKeys, localKey].sort());
  for (const key of registryKeys) {
    const actual = fields(fields(packages.get(key)).get("resolution"));
    const expected = fields(fields(approvedPackages.get(key)).get("resolution"));
    assert.equal(typeof expected.get("integrity"), "string");
    assert.equal(actual.get("integrity"), expected.get("integrity"), `Unreviewed registry integrity: ${key}`);
    assert.deepEqual(snapshots.get(key), approvedSnapshots.get(key), `Unreviewed dependency graph: ${key}`);
  }
  assert.equal(fields(fields(packages.get(localKey)).get("resolution")).get("integrity"),
    `sha512-${createHash("sha512").update(await readFile(archive)).digest("base64")}`);
  assert.deepEqual(snapshots.get(localKey), { dependencies: { "es-module-lexer": lexer } });
  await pnpm(["install", "--frozen-lockfile", "--offline", ...common], directory);
}
