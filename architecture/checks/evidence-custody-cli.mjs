#!/usr/bin/env node
import { resolve } from "node:path";

import {
  assertSafeEvidencePath,
  captureEvidence,
  ObjectStore,
  readSafeJson,
  validateManifest,
  verifyManifest,
} from "./evidence-custody.mjs";

function usage() {
  return "usage: evidence-custody <capture CONFIG.json | verify MANIFEST.json OBJECT_ROOT>";
}

async function readJson(path) {
  return readSafeJson(resolve(path));
}

const [, , command, ...arguments_] = process.argv;
if (command === "capture" && arguments_.length === 1) {
  const result = await captureEvidence(await readJson(arguments_[0]));
  process.stdout.write(`${JSON.stringify({ manifestPath: result.manifestPath, manifestSha256: result.manifestSha256 })}\n`);
} else if (command === "verify" && arguments_.length === 2) {
  const manifest = await readJson(arguments_[0]);
  const validation = validateManifest(manifest);
  const verification = await verifyManifest(manifest, {
    store: new ObjectStore(assertSafeEvidencePath(resolve(arguments_[1]), "object root")),
  });
  process.stdout.write(`${JSON.stringify({ validation, verification }, null, 2)}\n`);
  if (!validation.valid || !verification.promotionAllowed) process.exitCode = 1;
} else {
  process.stderr.write(`${usage()}\n`);
  process.exitCode = 2;
}
