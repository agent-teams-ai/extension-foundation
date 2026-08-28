#!/usr/bin/env node
import { resolve } from "node:path";

import {
  assertSafeEvidencePath,
  captureEvidence,
  ObjectStore,
  readSafeJsonDocument,
  validateManifest,
  verifyManifest,
} from "./evidence-custody.mjs";

function usage() {
  return "usage: evidence-custody <capture CONFIG.json | verify MANIFEST.json OBJECT_ROOT EXPECTED_MANIFEST_SHA256>";
}

class InvalidJsonInputError extends Error {}

async function readJson(path) {
  try {
    return await readSafeJsonDocument(resolve(path));
  } catch (error) {
    if (!(error instanceof SyntaxError)) throw error;
    throw new InvalidJsonInputError();
  }
}

const [, , command, ...arguments_] = process.argv;
try {
  if (command === "capture" && arguments_.length === 1) {
    const result = await captureEvidence((await readJson(arguments_[0])).value);
    process.stdout.write(`${JSON.stringify({ manifestPath: result.manifestPath, manifestSha256: result.manifestSha256 })}\n`);
  } else if (command === "verify" && arguments_.length === 3) {
    const manifestDocument = await readJson(arguments_[0]);
    const validation = validateManifest(manifestDocument.value);
    const verification = await verifyManifest(manifestDocument.value, {
      store: new ObjectStore(assertSafeEvidencePath(resolve(arguments_[1]), "object root")),
      manifestBytes: manifestDocument.bytes,
      expectedManifestSha256: arguments_[2],
    });
    process.stdout.write(`${JSON.stringify({ validation, verification }, null, 2)}\n`);
    if (!verification.integrityValid) process.exitCode = 1;
  } else {
    process.stderr.write(`${usage()}\n`);
    process.exitCode = 2;
  }
} catch (error) {
  if (!(error instanceof InvalidJsonInputError)) throw error;
  process.stdout.write(`${JSON.stringify({ ok: false, error: { code: "INVALID_JSON", message: "input must be valid JSON" } })}\n`);
  process.exitCode = 1;
}
