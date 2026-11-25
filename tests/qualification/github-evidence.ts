import { createHash } from "node:crypto";
import type { AdmissionVerificationRequest } from "../../architecture/checks/package-policy.mjs";

export type RefusalCode =
  | "input" | "repository" | "run" | "jobs" | "job" | "steps"
  | "workflow-bytes" | "log-bytes" | "log-markers" | "http"
  | "redirect" | "size" | "deadline" | "malformed" | "unavailable";

export class EvidenceRefusal extends Error {
  readonly code: RefusalCode;
  constructor(code: RefusalCode) {
    super("Provider evidence refused: " + code);
    this.code = code;
    this.name = "EvidenceRefusal";
  }
}

export function refusalCode(error: unknown): RefusalCode {
  return error instanceof EvidenceRefusal ? error.code : "unavailable";
}

export interface Witness {
  readonly repository: string;
  readonly repositoryId: number;
  readonly sourceRevision: string;
  readonly runId: number;
  readonly attempt: number;
  readonly workflowId: number;
  readonly workflowPath: string;
  readonly jobId: number;
  readonly jobName: string;
  readonly checkoutStep: string;
  readonly checkStep: string;
  readonly workflowSha256: string;
  readonly logSha256: string;
  readonly logMarkers: readonly string[];
}

export interface ProviderEvidence {
  readonly repository: unknown;
  readonly run: unknown;
  readonly jobs: unknown;
  readonly workflow: Uint8Array;
  readonly log: Uint8Array;
}

export interface ResearchObservation {
  readonly kind: "github-provider-observation/v1";
  readonly outcome: "observed";
  readonly request: AdmissionVerificationRequest;
  readonly witness: {
    readonly repository: string;
    readonly repositoryId: number;
    readonly sourceRevision: string;
    readonly runId: number;
    readonly attempt: number;
    readonly jobId: number;
    readonly workflowSha256: string;
    readonly logSha256: string;
  };
  readonly claim: "reviewed-workflow-and-job-lineage";
  readonly packageAdmission: false;
  readonly independentImplementations: false;
}

export function sha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function record(value: unknown, code: RefusalCode): Record<string, unknown> {
  if (!isRecord(value)) throw new EvidenceRefusal(code);
  return value;
}

function same(actual: unknown, expected: unknown, code: RefusalCode): void {
  if (actual !== expected) throw new EvidenceRefusal(code);
}

export function validateWitness(witness: Witness): void {
  if (!/^[a-z0-9][a-z0-9_.-]*\/[a-z0-9][a-z0-9_.-]*$/.test(witness.repository) ||
      witness.repository.split("/").some((part) => part.endsWith(".git") || part.endsWith(".")) ||
      !/^[0-9a-f]{40}$/.test(witness.sourceRevision) ||
      !/^\.github\/workflows\/[a-z0-9-]+\.ya?ml$/.test(witness.workflowPath) ||
      ![witness.repositoryId, witness.runId, witness.attempt, witness.workflowId, witness.jobId]
        .every((value) => Number.isSafeInteger(value) && value > 0) ||
      ![witness.workflowSha256, witness.logSha256].every((value) => /^[0-9a-f]{64}$/.test(value)) ||
      ![witness.jobName, witness.checkoutStep, witness.checkStep].every((value) => value.length > 0 && value.length < 256) ||
      witness.logMarkers.length === 0 || witness.logMarkers.length > 10 ||
      !witness.logMarkers.every((value) => value.length > 0 && value.length <= 256)) {
    throw new EvidenceRefusal("input");
  }
}

function repositoryIdentity(value: unknown, witness: Witness, code: RefusalCode): void {
  const repository = record(value, code);
  same(repository.id, witness.repositoryId, code);
  same(repository.full_name, witness.repository, code);
  same(repository.fork, false, code);
}

function success(value: Record<string, unknown>, code: RefusalCode): void {
  same(value.status, "completed", code);
  same(value.conclusion, "success", code);
}

function selectedJob(value: unknown, witness: Witness): Record<string, unknown> {
  const collection = record(value, "jobs");
  if (!Array.isArray(collection.jobs) || !Number.isSafeInteger(collection.total_count) ||
      collection.jobs.length > 50 || collection.jobs.length !== collection.total_count) {
    throw new EvidenceRefusal("jobs");
  }
  const jobs = collection.jobs.map((job: unknown) => record(job, "jobs"));
  if (new Set(jobs.map((job) => job.id)).size !== jobs.length ||
      jobs.some((job) => typeof job.id !== "number" || !Number.isSafeInteger(job.id) || job.id <= 0)) {
    throw new EvidenceRefusal("jobs");
  }
  const selected = jobs.filter((job) => job.id === witness.jobId || job.name === witness.jobName);
  if (selected.length !== 1 || selected[0] === undefined) throw new EvidenceRefusal("job");
  const job = selected[0];
  same(job.id, witness.jobId, "job");
  same(job.name, witness.jobName, "job");
  same(job.run_id, witness.runId, "job");
  same(job.run_attempt, witness.attempt, "job");
  same(job.head_sha, witness.sourceRevision, "job");
  success(job, "job");
  if (!Array.isArray(job.steps)) throw new EvidenceRefusal("steps");
  const steps = job.steps.map((step: unknown) => record(step, "steps"));
  for (const name of [witness.checkoutStep, witness.checkStep]) {
    const matches = steps.filter((step) => step.name === name);
    if (matches.length !== 1 || matches[0] === undefined) throw new EvidenceRefusal("steps");
    success(matches[0], "steps");
  }
  return job;
}

export function observeEvidence(
  request: AdmissionVerificationRequest,
  witness: Witness,
  evidence: ProviderEvidence,
): ResearchObservation {
  validateWitness(witness);
  repositoryIdentity(evidence.repository, witness, "repository");
  const run = record(evidence.run, "run");
  same(run.id, witness.runId, "run");
  same(run.run_attempt, witness.attempt, "run");
  same(run.head_sha, witness.sourceRevision, "run");
  same(run.workflow_id, witness.workflowId, "run");
  same(run.path, witness.workflowPath, "run");
  same(run.event, "push", "run");
  success(run, "run");
  repositoryIdentity(run.repository, witness, "run");
  repositoryIdentity(run.head_repository, witness, "run");
  selectedJob(evidence.jobs, witness);
  same(sha256(evidence.workflow), witness.workflowSha256, "workflow-bytes");
  same(sha256(evidence.log), witness.logSha256, "log-bytes");
  let log: string;
  try {
    log = new TextDecoder("utf-8", { fatal: true }).decode(evidence.log);
  } catch {
    throw new EvidenceRefusal("malformed");
  }
  if (!witness.logMarkers.every((marker) => log.includes(marker))) {
    throw new EvidenceRefusal("log-markers");
  }
  return Object.freeze({
    kind: "github-provider-observation/v1",
    outcome: "observed",
    request: Object.freeze({ ...request }),
    witness: Object.freeze({
      repository: witness.repository,
      repositoryId: witness.repositoryId,
      sourceRevision: witness.sourceRevision,
      runId: witness.runId,
      attempt: witness.attempt,
      jobId: witness.jobId,
      workflowSha256: witness.workflowSha256,
      logSha256: witness.logSha256,
    }),
    claim: "reviewed-workflow-and-job-lineage",
    packageAdmission: false,
    independentImplementations: false,
  });
}
