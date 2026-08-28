#!/usr/bin/env node

import { open } from "node:fs/promises";
import { isAbsolute, resolve } from "node:path";

import { parse } from "yaml";

import { verifyProductSourceEvidence } from "./product-source-evidence.mjs";

const MAX_EVIDENCE_BYTES = 1024 * 1024;

function usage() {
  return "usage: product-source-evidence-cli.mjs EVIDENCE.yaml --repository product=/absolute/path [--repository ...]";
}

function parseArguments(argv) {
  const normalized = argv[1] === "--" ? [argv[0], ...argv.slice(2)] : argv;
  if (normalized.length < 3) throw new Error(usage());
  const evidencePath = resolve(normalized[0]);
  const repositories = {};
  for (let index = 1; index < normalized.length; index += 2) {
    if (normalized[index] !== "--repository" || index + 1 >= normalized.length) throw new Error(usage());
    const assignment = normalized[index + 1];
    const separator = assignment.indexOf("=");
    if (separator <= 0 || separator === assignment.length - 1) throw new Error(usage());
    const product = assignment.slice(0, separator);
    const repository = assignment.slice(separator + 1);
    if (Object.hasOwn(repositories, product)) throw new Error(`duplicate repository mapping for ${product}`);
    if (!isAbsolute(repository)) throw new Error(`repository mapping for ${product} must be an absolute path`);
    repositories[product] = repository;
  }
  if (Object.keys(repositories).length === 0) throw new Error(usage());
  return { evidencePath, repositories };
}

async function main() {
  const { evidencePath, repositories } = parseArguments(process.argv.slice(2));
  const handle = await open(evidencePath, "r");
  let source = "";
  try {
    const metadata = await handle.stat();
    if (!metadata.isFile() || metadata.size > MAX_EVIDENCE_BYTES) {
      throw new Error(`evidence file must be a regular file no larger than ${MAX_EVIDENCE_BYTES} bytes`);
    }
    const buffer = Buffer.allocUnsafe(MAX_EVIDENCE_BYTES + 1);
    const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0);
    if (bytesRead > MAX_EVIDENCE_BYTES) {
      throw new Error(`evidence file must be a regular file no larger than ${MAX_EVIDENCE_BYTES} bytes`);
    }
    source = buffer.subarray(0, bytesRead).toString("utf8");
  } finally {
    await handle.close();
  }
  const evidence = parse(source, { maxAliasCount: 0, strict: true });
  const result = await verifyProductSourceEvidence(evidence, repositories);
  process.stdout.write(`${JSON.stringify({
    schemaVersion: result.schemaVersion,
    proofMode: result.proofMode,
    claimKind: result.claimKind,
    limits: result.limits,
    status: result.status,
    verificationAuthority: result.verificationAuthority,
    promotionAuthority: result.promotionAuthority,
    products: result.reports.map(report => ({
      product: report.product,
      repository: report.repository,
      commit: report.commit,
      tree: report.tree,
      files: report.files.length,
      totalBlobBytes: report.totalBlobBytes,
    })),
  }, null, 2)}\n`);
}

main().catch(error => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
