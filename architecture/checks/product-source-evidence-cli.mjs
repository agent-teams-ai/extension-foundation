#!/usr/bin/env node

import { execFile } from "node:child_process";
import { readFile, realpath } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { promisify } from "node:util";

import { parse } from "yaml";

import { verifyProductSourceEvidence } from "./product-source-evidence.mjs";

const execFileAsync = promisify(execFile);
const DEFAULT_MIRRORS = Object.freeze({
  agentRuntime: "agent-runtime",
  frontend: "old-agent-teams-frontend",
  orchestrator: "agent-teams-orchestrator",
});

function usage() {
  return "usage: product-source-evidence-cli.mjs EVIDENCE.yaml [--repository product=/absolute/path]";
}

function parseArguments(argv) {
  if (argv.length === 0) throw new Error(usage());
  const evidencePath = resolve(argv[0]);
  const repositories = {};
  for (let index = 1; index < argv.length; index += 1) {
    if (argv[index] !== "--repository" || index + 1 >= argv.length) throw new Error(usage());
    const assignment = argv[index + 1];
    const separator = assignment.indexOf("=");
    if (separator <= 0 || separator === assignment.length - 1) throw new Error(usage());
    repositories[assignment.slice(0, separator)] = resolve(assignment.slice(separator + 1));
    index += 1;
  }
  return { evidencePath, repositories };
}

async function discoverOrganizationRoot() {
  const { stdout } = await execFileAsync("git", [
    "rev-parse",
    "--path-format=absolute",
    "--git-common-dir",
  ], { encoding: "utf8" });
  return dirname(dirname(await realpath(stdout.trim())));
}

async function main() {
  const { evidencePath, repositories } = parseArguments(process.argv.slice(2));
  const evidence = parse(await readFile(evidencePath, "utf8"));
  const organizationRoot = await discoverOrganizationRoot();
  for (const [product, directory] of Object.entries(DEFAULT_MIRRORS)) {
    repositories[product] ??= resolve(organizationRoot, directory);
  }
  const result = await verifyProductSourceEvidence(evidence, repositories);
  process.stdout.write(`${JSON.stringify({
    schemaVersion: result.schemaVersion,
    proofMode: result.proofMode,
    limits: result.limits,
    status: result.status,
    products: result.reports.map(report => ({
      product: report.product,
      repository: report.repository,
      commit: report.commit,
      tree: report.tree,
      files: report.files.length,
      negativeMatches: report.negativeSearch.matches,
      topology: report.topology,
    })),
  }, null, 2)}\n`);
}

main().catch(error => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
