import type {
  AdmissionVerificationInput, AdmissionVerificationReceipt, GitHubEvidenceProvider,
  PackageEvidencePolicy, ReadSourceInputs,
} from "./contracts.ts";
import { decodeAdmissionEvidencePolicy } from "./policy.ts";
import { digestSourceInputs, parseEvidenceReference, readPackageConformanceProof, sha256 } from "./proof.ts";
import { array, assertSame, digest, exactRecord, fail, positiveInteger, record, sourceRevision, string } from "./validation.ts";

export interface VerificationDependencies {
  readonly policy: unknown;
  readonly provider: GitHubEvidenceProvider;
  readonly readSourceInputs: ReadSourceInputs;
}

function completed(value: Record<string, unknown>, label: string): void {
  assertSame(value["status"], "completed", `${label} status`);
  assertSame(value["conclusion"], "success", `${label} conclusion`);
}

function repository(value: unknown, policy: PackageEvidencePolicy, label: string): void {
  const repo = record(value, label);
  assertSame(repo["id"], policy.repositoryId, `${label} stable identity`);
  assertSame(repo["full_name"], policy.repository, `${label} canonical name`);
}

/**
 * Adapter for the existing package-topology verifier port. The existing schema,
 * accepted-owner, selected-basis and receipt matcher remain the owning gate.
 * This first route admits only ordinary-library / independent-release evidence.
 */
export function createGitHubAdmissionEvidenceVerifier(dependencies: VerificationDependencies): (
  input: AdmissionVerificationInput,
) => Promise<AdmissionVerificationReceipt> {
  const policy = decodeAdmissionEvidencePolicy(dependencies.policy);
  return async ({ root, entry: rawEntry, admission: rawAdmission, request: rawRequest }) => {
    const entry = record(rawEntry, "catalog entry");
    const admission = record(rawAdmission, "admission record");
    const request = exactRecord(rawRequest, ["packageId", "admissionRecordDigest", "requiredGateId"], "verification request");
    const packageId = string(entry["id"], "package identity");
    const selected = policy.packages.find(item => item.packageId === packageId);
    if (!selected) fail("E-POLICY", "the package has no reviewed evidence policy");
    assertSame(request["packageId"], packageId, "request package");
    const admissionRecordDigest = digest(request["admissionRecordDigest"], "admission record digest");
    assertSame(request["requiredGateId"], "phase-3-package-admission", "admission gate");
    assertSame(admission["schema_version"], 4, "admission schema");
    assertSame(admission["package_id"], packageId, "admission package");
    assertSame(admission["owner_repository"], "agent-teams-ai/extension-foundation", "admission owner");
    assertSame(admission["conformance_version"], selected.conformanceVersion, "admission conformance version");
    if (admission["semantic_classification"] !== "ordinary-library" ||
        admission["semantic_extraction_decision"] !== "not-applicable" ||
        admission["admission_basis"] !== "independent-replacement-or-release-lifecycle") {
      fail("E-BASIS", "this verifier does not qualify public SPI, independent consumers or semantic extraction");
    }
    const entries = array(admission["consumer_evidence"], "consumer evidence", 1, 1);
    const evidence = record(entries[0], "consumer evidence");
    assertSame(evidence["consumer_repository"], selected.repository, "consumer repository");
    assertSame(evidence["consumer_id"], selected.consumerId, "consumer identity");
    assertSame(evidence["implementation_id"], selected.implementationId, "implementation identity");
    assertSame(evidence["conformance_result"], "passed", "claimed conformance result");
    assertSame(evidence["evidence_kind"], "independent-conformance", "evidence role");
    const source = sourceRevision(evidence["source_revision"]);
    const reference = parseEvidenceReference(evidence["evidence_reference"]);
    assertSame(reference.repository, selected.repository, "evidence repository");

    const [repositoryValue, jobValue, log] = await Promise.all([
      dependencies.provider.getRepository(selected.repository),
      dependencies.provider.getJob(selected.repository, reference.jobId),
      dependencies.provider.getStepLogs(selected.repository, reference.jobId, reference.stepNumber),
    ]);
    repository(repositoryValue, selected, "repository");
    assertSame(record(repositoryValue, "repository")["fork"], false, "first-profile repository fork status");
    assertSame(sha256(log), reference.sha256, "evidence bytes");
    const proof = readPackageConformanceProof(log);
    const job = record(jobValue, "workflow job");
    assertSame(job["id"], reference.jobId, "job identity");
    assertSame(job["name"], selected.jobName, "job name");
    assertSame(job["head_sha"], source, "job source");
    completed(job, "job");
    const runId = positiveInteger(job["run_id"], "job run identity");
    const runAttempt = positiveInteger(job["run_attempt"], "job run attempt");
    const matchingSteps = array(job["steps"], "job steps", 1, 256).map(item => record(item, "job step"))
      .filter(step => step["name"] === selected.stepName || step["number"] === reference.stepNumber);
    if (matchingSteps.length !== 1) fail("E-STEP", "the evidence step must have one exact name/number binding");
    const step = matchingSteps[0];
    if (!step) fail("E-STEP", "the evidence step is absent");
    assertSame(step["name"], selected.stepName, "proof step name");
    assertSame(step["number"], reference.stepNumber, "proof step number");
    completed(step, "proof step");

    const [runValue, workflow] = await Promise.all([
      dependencies.provider.getRunAttempt(selected.repository, runId, runAttempt),
      dependencies.provider.getWorkflow(selected.repository, source, selected.workflowPath),
    ]);
    const run = record(runValue, "workflow run");
    assertSame(run["id"], runId, "run identity");
    assertSame(run["run_attempt"], runAttempt, "run attempt");
    assertSame(run["head_sha"], source, "run source");
    assertSame(run["event"], "push", "run event");
    completed(run, "run");
    repository(run["repository"], selected, "run repository");
    repository(run["head_repository"], selected, "run source repository");
    const workflowPath = string(run["path"], "run workflow path", 1024).split("@")[0];
    assertSame(workflowPath, selected.workflowPath, "run workflow");
    assertSame(sha256(workflow), selected.workflowSha256, "reviewed workflow bytes");

    assertSame(proof.packageId, selected.packageId, "proof package");
    assertSame(proof.repositoryId, selected.repositoryId, "proof repository");
    assertSame(proof.sourceRevision, source, "proof source");
    assertSame(proof.runId, runId, "proof run");
    assertSame(proof.runAttempt, runAttempt, "proof attempt");
    assertSame(proof.consumerId, selected.consumerId, "proof consumer");
    assertSame(proof.implementationId, selected.implementationId, "proof implementation");
    assertSame(proof.conformanceVersion, selected.conformanceVersion, "proof conformance version");
    assertSame(proof.conformanceSha256, selected.conformanceSha256, "proof conformance fingerprint");
    assertSame(proof.artifactName, selected.artifactName, "proof artifact name");
    assertSame(proof.artifactSha256, selected.artifactSha256, "proof artifact bytes");
    const currentInputs = await dependencies.readSourceInputs(root, selected.sourceInputs);
    assertSame(digestSourceInputs(currentInputs), proof.sourceInputsSha256, "current source/build inputs");
    return Object.freeze({ packageId, admissionRecordDigest, requiredGateId: "phase-3-package-admission", outcome: "satisfied" });
  };
}
