import { createHash } from "node:crypto";

import { createPlugin } from "@extism/extism";

const artifactUrl = "https://github.com/extism/plugins/releases/download/v1.1.1/count_vowels.wasm";
const expectedDigest = "72dfe2c69d8e5ac50886b7961664af6cccbbdcabeb45ce48270db2242778ce25";
const allowedHosts = new Set(["github.com", "objects.githubusercontent.com", "release-assets.githubusercontent.com"]);
const maxArtifactBytes = 2 * 1024 * 1024;
let resolvedUrl = new URL(artifactUrl);
let response;
for (let redirect = 0; redirect <= 3; redirect += 1) {
  if (!allowedHosts.has(resolvedUrl.hostname)) throw new Error("EXTISM_ARTIFACT_REDIRECT_DENIED");
  response = await fetch(resolvedUrl, { redirect: "manual", signal: AbortSignal.timeout(30_000) });
  if (![301, 302, 303, 307, 308].includes(response.status)) break;
  const location = response.headers.get("location");
  if (!location) throw new Error("EXTISM_ARTIFACT_REDIRECT_MISSING_LOCATION");
  resolvedUrl = new URL(location, resolvedUrl);
}
if (!response) throw new Error("EXTISM_ARTIFACT_FETCH_FAILED");
if (!response.ok) throw new Error(`EXTISM_ARTIFACT_FETCH_FAILED:${response.status}`);
const contentLength = response.headers.get("content-length");
if (contentLength !== null && !/^\d+$/.test(contentLength)) throw new Error("EXTISM_ARTIFACT_INVALID_LENGTH");
const declaredLength = Number(contentLength ?? 0);
if (declaredLength > maxArtifactBytes) throw new Error("EXTISM_ARTIFACT_TOO_LARGE");
if (!response.body) throw new Error("EXTISM_ARTIFACT_BODY_MISSING");
const chunks = [];
const hash = createHash("sha256");
let byteLength = 0;
for await (const chunk of response.body) {
  byteLength += chunk.byteLength;
  if (byteLength > maxArtifactBytes) throw new Error("EXTISM_ARTIFACT_TOO_LARGE");
  hash.update(chunk);
  chunks.push(chunk);
}
const bytes = new Uint8Array(byteLength);
let offset = 0;
for (const chunk of chunks) {
  bytes.set(chunk, offset);
  offset += chunk.byteLength;
}
const digest = hash.digest("hex");
if (digest !== expectedDigest) throw new Error("EXTISM_ARTIFACT_DIGEST_MISMATCH");

const plugin = await createPlugin(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), { useWasi: true });
try {
  const output = await plugin.call("count_vowels", "Agent Teams");
  const result = output.json();
  if (result.count !== 4) throw new Error("EXTISM_UNEXPECTED_RESULT");
  process.stdout.write(`${JSON.stringify({ artifactUrl, digest, result })}\n`);
} finally {
  await plugin.close();
}
