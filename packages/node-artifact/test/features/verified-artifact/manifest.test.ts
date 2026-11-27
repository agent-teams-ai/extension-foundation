import { deepEqual, equal, ok, throws } from "node:assert/strict";
import test from "node:test";
import { ArtifactError } from "../../../src/features/verified-artifact/contracts.ts";
import { decodeManifest, inspectManifest, isArtifactPath } from "../../../src/features/verified-artifact/manifest.ts";

const expected = { target: "node/linux/x64", scope: "example/publishing", contract: "document/export", revision: 3, loader: "document-export-v3" };
const digest = `sha256:${"a".repeat(64)}`;
const moduleLayer = () => ({
  mediaType: "text/javascript", digest, size: 40,
  annotations: { "org.opencontainers.image.title": "entry.mjs" },
});
function manifest() {
  return {
    schemaVersion: 2, mediaType: "application/vnd.oci.image.manifest.v1+json",
    artifactType: "application/vnd.extension-foundation.esm-bundle.v1",
    config: { mediaType: "application/vnd.oci.empty.v1+json", digest, size: 2, data: "e30=" },
    layers: [moduleLayer()],
    annotations: {
      "dev.extension-foundation.target": "node/linux/x64",
      "dev.extension-foundation.scope": "example/publishing",
      "dev.extension-foundation.contract": "document/export",
      "dev.extension-foundation.revision": "3",
      "dev.extension-foundation.loader": "document-export-v3",
      "dev.extension-foundation.publisher": "publisher/example",
      "dev.extension-foundation.entry": "entry.mjs",
    },
  };
}

function refuses(value: unknown, code = "artifact.manifest"): void {
  throws(() => inspectManifest(value, expected, "publisher/example"),
    (error: unknown) => error instanceof ArtifactError && error.code === code);
}

test("the selected JSON representation refuses duplicate keys and alternate numeric or lexical spellings", () => {
  const input = manifest();
  deepEqual(decodeManifest(JSON.stringify(input)), input);
  for (const source of ['{"size":1,"size":2}', '{"size":2,"size":2}', '{"size":2.0}', '{"size":2e0}',
    '{"size":-0}', '{ "size":2}', '{"size":2}\n', '{"path":"\\u0061"}', '{"size":']) {
    throws(() => decodeManifest(source), (error: unknown) => error instanceof ArtifactError && error.code === "artifact.manifest");
  }
});

test("deep unsupported JSON receives a manifest refusal on either Node serializer implementation", () => {
  const source = "[".repeat(20_000) + "0" + "]".repeat(20_000);
  // Node 24 can reject this during stringify; Node 26 can serialize it, then
  // the manifest decoder refuses its unsupported top-level array structure.
  throws(() => inspectManifest(decodeManifest(source), expected, "publisher/example"),
    (error: unknown) => error instanceof ArtifactError && error.code === "artifact.manifest");
});

test("the closed manifest returns ordered immutable layer facts, not caller-owned metadata", () => {
  const input = manifest();
  input.layers.push({ mediaType: "application/octet-stream", digest, size: 8,
    annotations: { "org.opencontainers.image.title": "data/style.json" } });
  const actual = inspectManifest(input, expected, "publisher/example");
  deepEqual(actual, {
    entry: "entry.mjs", config: { mediaType: "application/vnd.oci.empty.v1+json", digest, size: 2 },
    files: [{ path: "entry.mjs", digest, size: 40, kind: "module" },
      { path: "data/style.json", digest, size: 8, kind: "asset" }],
  });
  input.layers.splice(0, 1);
  equal(actual.files.length, 2);
  ok(Object.isFrozen(actual.files));
  ok(actual.files.every(Object.isFrozen));
});

test("all target, scope, publisher and owner ABI identities agree before loading", () => {
  for (const key of ["target", "scope", "contract", "loader", "publisher", "revision"]) {
    const input = manifest();
    const annotations = Object.fromEntries([...Object.entries(input.annotations), [`dev.extension-foundation.${key}`, "wrong"]]);
    refuses({ ...input, annotations }, "artifact.identity");
  }
});

test("paths reject traversal, absolute paths, separators, hidden names and aliases", () => {
  for (const path of ["../entry.mjs", "/entry.mjs", "a//entry.mjs", "a/./entry.mjs", "a/../entry.mjs",
    "a\\entry.mjs", "C:entry.mjs", ".entry.mjs", "a/.secret", "entry.mjs?x", "entry.mjs#x", "a%2fentry.mjs", "a/", ""]) {
    equal(isArtifactPath(path), false, path);
    const input = manifest();
    refuses({ ...input, layers: [{ ...moduleLayer(), annotations: { "org.opencontainers.image.title": path } }] });
  }
  equal(isArtifactPath("assets/report-2026_11.json"), true);
});

test("a manifest has one entry, no external descriptor URLs, subject or executable data assets", () => {
  const input = manifest();
  for (const layer of [
    { ...moduleLayer(), urls: ["https://untrusted.invalid/entry.mjs"] },
    { ...moduleLayer(), data: "YQ==" },
    { ...moduleLayer(), mediaType: "application/octet-stream" },
    { ...moduleLayer(), digest: "sha256:wrong" },
    { ...moduleLayer(), size: -1 },
    { ...moduleLayer(), size: 1.5 },
    { ...moduleLayer(), size: 4 * 1024 * 1024 + 1 },
    { ...moduleLayer(), annotations: {} },
  ]) refuses({ ...input, layers: [layer] });
  refuses({ ...input, subject: { digest } });
  refuses({ ...input, layers: [] });
  refuses({ ...input, layers: [moduleLayer(), moduleLayer()] });
  for (const path of ["more.js", "more.mjs", "more.cjs", "more.wasm", "more.node", "entry.mjs/child.json"]) {
    refuses({ ...input, layers: [moduleLayer(), { ...moduleLayer(), mediaType: "application/octet-stream",
      annotations: { "org.opencontainers.image.title": path } }] });
  }
});

test("alternate config and unsupported OCI structures cannot acquire executable meaning", () => {
  const input = manifest();
  for (const value of [null, [], {}, { ...input, schemaVersion: 1 }, { ...input, artifactType: "arbitrary" },
    { ...input, mediaType: "application/vnd.oci.image.index.v1+json" }, { ...input, config: null },
    { ...input, config: { ...input.config, size: 3 } },
    { ...input, config: { ...input.config, data: "AA==" } },
    { ...input, config: { ...input.config, mediaType: "application/json" } },
    { ...input, config: { ...input.config, urls: [] } },
    { ...input, annotations: { ...input.annotations, "dev.extension-foundation.entry": "absent.mjs" } }]) refuses(value);
});

test("the layer count and aggregate size are bounded independently", () => {
  const input = manifest();
  const asset = (index: number, size: number) => ({
    mediaType: "application/octet-stream", digest, size,
    annotations: { "org.opencontainers.image.title": `assets/data-${index}.json` },
  });
  refuses({ ...input, layers: [moduleLayer(), ...Array.from({ length: 16 }, (_, index) => asset(index, 1))] });
  refuses({ ...input, layers: [moduleLayer(), asset(1, 4 * 1024 * 1024), asset(2, 4 * 1024 * 1024)] });
});
