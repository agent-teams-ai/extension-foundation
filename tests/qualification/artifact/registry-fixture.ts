import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createPublicKey } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import { join } from "node:path";
import { arch, platform } from "node:process";
import { setTimeout as delay } from "node:timers/promises";
import { releases, runFile, selectedTools, sha256 } from "./native-tools.ts";

type Tools = Awaited<ReturnType<typeof selectedTools>>;
const object = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);

export interface SignedFixture {
  readonly repository: string;
  readonly digest: `sha256:${string}`;
  readonly transport: "loopback-http";
  readonly registryConfig: string;
  readonly signatureBytes: readonly number[];
  readonly trustedPublisher: {
    readonly id: string;
    readonly publicKeyPem: string;
    readonly keyDigest: `sha256:${string}`;
  };
  readonly expected: { readonly target: string; readonly scope: string; readonly contract: string; readonly revision: number; readonly loader: string };
}

async function freePort(): Promise<number> {
  const server = createServer();
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const port = address.port;
  await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  return port;
}

export async function createRegistryFixture(directory: string, tools: Tools) {
  const storage = join(directory, "registry");
  const config = join(directory, "registry.yaml");
  const registryConfig = join(directory, "registry-auth.json");
  const port = await freePort();
  const repository = `127.0.0.1:${port}/publication`;
  await mkdir(storage);
  await writeFile(registryConfig, JSON.stringify({ auths: {} }), { mode: 0o600 });
  await writeFile(config, `version: 0.1\nlog:\n  level: error\nstorage:\n  filesystem:\n    rootdirectory: ${JSON.stringify(storage)}\nhttp:\n  addr: 127.0.0.1:${port}\n`);
  const registry = spawn(tools.registry.path, ["serve", config], { stdio: ["ignore", "pipe", "pipe"] });
  let ended = false;
  let spawnError: Error | undefined;
  let output = "";
  registry.stdout.on("data", (data: Buffer) => { output = (output + data.toString("utf8")).slice(-4_096); });
  registry.stderr.on("data", (data: Buffer) => { output = (output + data.toString("utf8")).slice(-4_096); });
  const closed = new Promise<void>(resolve => {
    registry.once("error", error => { spawnError = error; });
    registry.once("close", () => { ended = true; resolve(); });
  });
  const close = async (): Promise<void> => {
    if (ended) return;
    registry.kill("SIGTERM");
    const stopped = await Promise.race([closed.then(() => true), delay(3_000, undefined, { ref: false }).then(() => false)]);
    if (!stopped) { registry.kill("SIGKILL"); await closed; }
    assert.ok(ended, "Registry fixture must physically terminate before cleanup");
  };
  try {
    let ready = false;
    for (let attempt = 0; attempt < 100; attempt++) {
      assert.ok(!ended && !spawnError, `Registry did not start: ${spawnError?.message ?? output}`);
      ready = await fetch(`http://127.0.0.1:${port}/v2/`, { signal: AbortSignal.timeout(1_000) })
        .then(response => response.status === 200, () => false);
      if (ready) break;
      await delay(50);
    }
    assert.ok(ready, `Registry readiness deadline exceeded: ${output}`);
    const keyPrefix = join(directory, "publisher");
    const signing = join(directory, "signing.json");
    await runFile(tools.cosign.path, ["generate-key-pair", "--output-key-prefix", keyPrefix], {
      timeout: 30_000, maxBuffer: 1024 * 1024, env: { ...process.env, COSIGN_PASSWORD: "" },
    });
    await runFile(tools.cosign.path, ["signing-config", "create", "--out", signing], { timeout: 30_000 });
    const publicKeyPem = await readFile(`${keyPrefix}.pub`, "utf8");
    const trustedPublisher = { id: "publisher/fixture", publicKeyPem,
      keyDigest: sha256(createPublicKey(publicKeyPem).export({ type: "spki", format: "der" })) };
    const expected = { target: `node/${platform}/${arch}`, scope: "example/publishing", contract: "document/export", revision: 3, loader: "document-export-v3" };
    const flags = ["--plain-http", "--registry-config", registryConfig];
    const blobPath = (digest: string): string => {
      assert.match(digest, /^sha256:[a-f0-9]{64}$/);
      const hex = digest.slice(7);
      return join(storage, "docker", "registry", "v2", "blobs", "sha256", hex.slice(0, 2), hex, "data");
    };
    const publish = async (name: string, source: string, annotations: Readonly<Record<string, string>> = {},
      rewriteManifest?: (source: string) => string): Promise<SignedFixture> => {
      const candidate = join(directory, name);
      await mkdir(join(candidate, "data"), { recursive: true });
      await writeFile(join(candidate, "entry.mjs"), source);
      await writeFile(join(candidate, "data", "labels.json"), '{"prefix":"Published"}');
      const metadata = {
        "dev.extension-foundation.target": expected.target,
        "dev.extension-foundation.scope": expected.scope,
        "dev.extension-foundation.contract": expected.contract,
        "dev.extension-foundation.revision": String(expected.revision),
        "dev.extension-foundation.loader": expected.loader,
        "dev.extension-foundation.publisher": trustedPublisher.id,
        "dev.extension-foundation.entry": "entry.mjs",
        ...annotations,
      };
      await runFile(tools.oras.path, ["push", ...flags, "--artifact-type", "application/vnd.extension-foundation.esm-bundle.v1",
        ...Object.entries(metadata).flatMap(([key, value]) => ["--annotation", `${key}=${value}`]),
        `${repository}:${name}`, "entry.mjs:text/javascript", "data/labels.json:application/octet-stream"],
      { cwd: candidate, timeout: 30_000, maxBuffer: 1024 * 1024 });
      const manifest = join(candidate, "manifest.json");
      if (rewriteManifest !== undefined) {
        const initial = await runFile(tools.oras.path, ["manifest", "fetch", ...flags, `${repository}:${name}`], { timeout: 30_000 });
        await writeFile(manifest, rewriteManifest(initial.stdout));
        await runFile(tools.oras.path, ["manifest", "push", ...flags, "--media-type", "application/vnd.oci.image.manifest.v1+json", `${repository}:${name}`, manifest],
          { timeout: 30_000, maxBuffer: 1024 * 1024 });
      }
      const resolved = await runFile(tools.oras.path, ["resolve", ...flags, `${repository}:${name}`], { timeout: 30_000 });
      const identity = resolved.stdout.trim();
      assert.match(identity, /^sha256:[a-f0-9]{64}$/);
      const fetched = await runFile(tools.oras.path, ["manifest", "fetch", ...flags, `${repository}@${identity}`], { timeout: 30_000, encoding: "buffer" });
      const digest = sha256(fetched.stdout);
      assert.equal(digest, identity);
      const bundle = join(candidate, "signature.json");
      await writeFile(manifest, fetched.stdout);
      await runFile(tools.cosign.path, ["sign-blob", "--yes", "--key", `${keyPrefix}.key`, "--signing-config", signing,
        "--bundle", bundle, manifest], { timeout: 30_000, maxBuffer: 1024 * 1024, env: { ...process.env, COSIGN_PASSWORD: "" } });
      return { repository, digest, transport: "loopback-http", registryConfig,
        signatureBytes: [...await readFile(bundle)], trustedPublisher, expected };
    };
    const moduleBlob = async (request: SignedFixture): Promise<string> => {
      const parsed: unknown = JSON.parse(await readFile(blobPath(request.digest), "utf8"));
      assert.ok(object(parsed) && Array.isArray(parsed.layers));
      const first: unknown = parsed.layers.at(0);
      assert.ok(object(first) && typeof first.digest === "string");
      return blobPath(first.digest);
    };
    return { publish, blobPath, moduleBlob, close, tools: releases };
  } catch (error) { await close(); throw error; }
}
