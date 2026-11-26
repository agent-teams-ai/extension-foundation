import { createHash } from "node:crypto";
import type { EvidenceReference, PackageConformanceProof, SourceInput } from "./contracts.ts";
import { digest, exactRecord, fail, positiveInteger, relativePath, repositoryName, sourceRevision, string } from "./validation.ts";

export const PACKAGE_CONFORMANCE_MARKER = "EF_PACKAGE_CONFORMANCE_V1 ";
export const MAX_EVIDENCE_LOG_BYTES = 2 * 1024 * 1024;

export function sha256(bytes: Uint8Array | string): string {
  return `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
}

/** Digest of the closed sorted path/byte-digest inventory, with one LF terminator. */
export function digestSourceInputs(input: readonly SourceInput[]): string {
  if (input.length === 0 || input.length > 8192) fail("E-INPUTS", "invalid source inventory size");
  const values = input.map(item => ({ path: relativePath(item.path), sha256: digest(item.sha256, "source digest") }));
  values.sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0);
  if (new Set(values.map(item => item.path)).size !== values.length) fail("E-INPUTS", "duplicate source inventory path");
  return sha256(`${JSON.stringify(values)}\n`);
}

const proofFields = ["schemaVersion", "packageId", "repositoryId", "sourceRevision", "runId", "runAttempt", "consumerId", "implementationId", "conformanceVersion", "conformanceSha256", "sourceInputsSha256", "artifactName", "artifactSha256"];

export function decodePackageConformanceProof(input: unknown): PackageConformanceProof {
  const value = exactRecord(input, proofFields, "package conformance proof");
  if (value["schemaVersion"] !== 1) fail("E-SCHEMA", "unsupported package conformance proof version");
  return Object.freeze({
    schemaVersion: 1,
    packageId: string(value["packageId"], "package identity"),
    repositoryId: positiveInteger(value["repositoryId"], "repository identity"),
    sourceRevision: sourceRevision(value["sourceRevision"]),
    runId: positiveInteger(value["runId"], "run identity"),
    runAttempt: positiveInteger(value["runAttempt"], "run attempt"),
    consumerId: string(value["consumerId"], "consumer identity"),
    implementationId: string(value["implementationId"], "implementation identity"),
    conformanceVersion: string(value["conformanceVersion"], "conformance version"),
    conformanceSha256: digest(value["conformanceSha256"], "conformance digest"),
    sourceInputsSha256: digest(value["sourceInputsSha256"], "source input digest"),
    artifactName: string(value["artifactName"], "artifact name"),
    artifactSha256: digest(value["artifactSha256"], "artifact digest"),
  });
}

/** Called by the reviewed proof-emission step, after its real conformance step. */
export function formatPackageConformanceProof(input: PackageConformanceProof): string {
  return `${PACKAGE_CONFORMANCE_MARKER}${JSON.stringify(decodePackageConformanceProof(input))}`;
}

export function readPackageConformanceProof(log: Uint8Array): PackageConformanceProof {
  if (log.byteLength === 0 || log.byteLength > MAX_EVIDENCE_LOG_BYTES) fail("E-LOG", "evidence log is empty or too large");
  let text: string;
  try { text = new TextDecoder("utf-8", { fatal: true }).decode(log); }
  catch { return fail("E-LOG", "evidence log is not UTF-8"); }
  const payloads: string[] = [];
  for (const line of text.split(/\r?\n/u)) {
    const content = line.replace(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+Z /u, "");
    if (content.startsWith(PACKAGE_CONFORMANCE_MARKER)) payloads.push(content.slice(PACKAGE_CONFORMANCE_MARKER.length));
  }
  if (payloads.length !== 1) fail("E-LOG", "the trusted proof step must emit exactly one conformance proof");
  const payload = payloads[0];
  if (payload === undefined || payload.length > 8192) fail("E-LOG", "conformance proof is too large");
  let parsed: unknown;
  try { parsed = JSON.parse(payload); }
  catch { return fail("E-LOG", "conformance proof is not JSON"); }
  // The producer emits compact JSON. This also rejects duplicate keys and
  // alternate lexical representations instead of silently choosing a value.
  if (JSON.stringify(parsed) !== payload) fail("E-LOG", "conformance proof must use canonical compact JSON");
  return decodePackageConformanceProof(parsed);
}

export function parseEvidenceReference(input: unknown): EvidenceReference {
  const value = string(input, "evidence reference", 1024);
  const match = /^https:\/\/api\.github\.com\/repos\/([^/]+\/[^/]+)\/actions\/jobs\/([1-9]\d*)\/steps\/([1-9]\d*)\/logs#sha256=([a-f0-9]{64})$/u.exec(value);
  if (!match) fail("E-REFERENCE", "evidence must name immutable GitHub job-step logs with a SHA-256 fragment");
  return Object.freeze({
    repository: repositoryName(match[1]),
    jobId: positiveInteger(Number(match[2]), "job identity"),
    stepNumber: positiveInteger(Number(match[3]), "step number"),
    sha256: digest(`sha256:${match[4]}`, "evidence digest"),
  });
}

export function evidenceReference(repository: string, jobId: number, stepNumber: number, log: Uint8Array): string {
  const url = `https://api.github.com/repos/${repositoryName(repository)}/actions/jobs/${positiveInteger(jobId, "job identity")}/steps/${positiveInteger(stepNumber, "step number")}/logs#sha256=${sha256(log).slice(7)}`;
  parseEvidenceReference(url);
  return url;
}
