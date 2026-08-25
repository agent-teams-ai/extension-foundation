import { createHash } from "node:crypto";

import { createPlugin } from "@extism/extism";

const artifactUrl = "https://github.com/extism/plugins/releases/download/v1.1.1/count_vowels.wasm";
const expectedDigest = "72dfe2c69d8e5ac50886b7961664af6cccbbdcabeb45ce48270db2242778ce25";
const response = await fetch(artifactUrl);
if (!response.ok) throw new Error(`EXTISM_ARTIFACT_FETCH_FAILED:${response.status}`);
const bytes = new Uint8Array(await response.arrayBuffer());
const digest = createHash("sha256").update(bytes).digest("hex");
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
