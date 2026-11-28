import type { GitHubEvidenceProvider, PackageConformanceProof } from "./contracts.ts";
import { evidenceReference, readPackageConformanceProof } from "./proof.ts";
import { array, assertSame, fail, positiveInteger, record, repositoryName, sourceRevision, string } from "./validation.ts";

export interface CollectedConformanceEvidence {
  readonly evidence_reference: string;
  readonly source_revision: string;
  readonly proof: PackageConformanceProof;
}

/**
 * Collects provider coordinates after the proof job finishes. This is not an
 * admission receipt: the verifier still checks the completed workflow and policy.
 */
export async function collectConformanceEvidence(
  provider: GitHubEvidenceProvider,
  repository: string,
  jobId: number,
  stepName: string,
): Promise<CollectedConformanceEvidence> {
  const name = repositoryName(repository);
  const identity = positiveInteger(jobId, "job identity");
  const expectedStep = string(stepName, "proof step name");
  const job = record(await provider.getJob(name, identity), "workflow job");
  assertSame(job["id"], identity, "job identity");
  assertSame(job["status"], "completed", "job status");
  assertSame(job["conclusion"], "success", "job conclusion");
  const steps = array(job["steps"], "job steps").map(item => record(item, "job step")).filter(step => step["name"] === expectedStep);
  if (steps.length !== 1) fail("E-STEP", "the proof job must contain one named proof step");
  const step = steps[0];
  if (!step) fail("E-STEP", "proof step is absent");
  assertSame(step["status"], "completed", "step status");
  assertSame(step["conclusion"], "success", "step conclusion");
  const stepNumber = positiveInteger(step["number"], "step number");
  const bytes = await provider.getStepLogs(name, identity, stepNumber);
  const proof = readPackageConformanceProof(bytes);
  const source = sourceRevision(job["head_sha"]);
  assertSame(proof.sourceRevision, source, "proof source");
  assertSame(proof.runId, job["run_id"], "proof run");
  assertSame(proof.runAttempt, job["run_attempt"], "proof attempt");
  return Object.freeze({ evidence_reference: evidenceReference(name, identity, stepNumber, bytes), source_revision: source, proof });
}
