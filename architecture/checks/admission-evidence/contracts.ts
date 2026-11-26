/** Repository admission evidence, never runtime extension authority. */
export interface SourceInputSelection {
  readonly roots: readonly string[];
  readonly files: readonly string[];
}

export interface SourceInput {
  readonly path: string;
  readonly sha256: string;
}

export interface PackageEvidencePolicy {
  readonly packageId: string;
  readonly repository: string;
  readonly repositoryId: number;
  readonly workflowPath: string;
  readonly workflowSha256: string;
  readonly jobName: string;
  readonly stepName: string;
  readonly allowedEvents: readonly ["push"];
  readonly conformanceVersion: string;
  readonly consumerId: string;
  readonly implementationId: string;
  readonly conformanceSha256: string;
  readonly artifactName: string;
  readonly artifactSha256: string;
  readonly sourceInputs: SourceInputSelection;
}

export interface AdmissionEvidencePolicy {
  readonly schemaVersion: 1;
  readonly packages: readonly PackageEvidencePolicy[];
}

export interface PackageConformanceProof {
  readonly schemaVersion: 1;
  readonly packageId: string;
  readonly repositoryId: number;
  readonly sourceRevision: string;
  readonly runId: number;
  readonly runAttempt: number;
  readonly consumerId: string;
  readonly implementationId: string;
  readonly conformanceVersion: string;
  readonly conformanceSha256: string;
  readonly sourceInputsSha256: string;
  readonly artifactName: string;
  readonly artifactSha256: string;
}

export interface EvidenceReference {
  readonly repository: string;
  readonly jobId: number;
  readonly stepNumber: number;
  readonly sha256: string;
}

/** Values come from authenticated GitHub REST reads; each is decoded by the verifier. */
export interface GitHubEvidenceProvider {
  getRepository(repository: string): Promise<unknown>;
  getJob(repository: string, jobId: number): Promise<unknown>;
  getRunAttempt(repository: string, runId: number, attempt: number): Promise<unknown>;
  getWorkflow(repository: string, sourceRevision: string, workflowPath: string): Promise<Uint8Array>;
  getStepLogs(repository: string, jobId: number, stepNumber: number): Promise<Uint8Array>;
}

export interface AdmissionVerificationInput {
  readonly root: string;
  readonly entry: unknown;
  readonly admission: unknown;
  readonly request: unknown;
}

export interface AdmissionVerificationReceipt {
  readonly packageId: string;
  readonly admissionRecordDigest: string;
  readonly requiredGateId: "phase-3-package-admission";
  readonly outcome: "satisfied";
}

export type ReadSourceInputs = (
  root: string,
  selection: SourceInputSelection,
) => Promise<readonly SourceInput[]>;

export class AdmissionEvidenceError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(`${code}: ${message}`);
    this.name = "AdmissionEvidenceError";
    this.code = code;
  }
}
