import { collectConformanceEvidence } from "./collect.ts";
import { createGitHubEvidenceProvider } from "./github-provider.ts";
import { qualificationJob, qualificationPackages, qualificationRepository, qualificationRepositoryId } from "./qualification-profile.ts";
import { array, assertSame, fail, positiveInteger, record } from "./validation.ts";

if (process.env["GITHUB_REPOSITORY"] !== qualificationRepository || process.env["GITHUB_EVENT_NAME"] !== "push" ||
    process.env["GITHUB_REPOSITORY_ID"] !== String(qualificationRepositoryId)) {
  throw new Error("Evidence collection requires the actual package-conformance push workflow.");
}
const provider = createGitHubEvidenceProvider({ token: process.env["GITHUB_TOKEN"] ?? "" });
const runId = positiveInteger(Number(process.env["GITHUB_RUN_ID"]), "run identity");
const attempt = positiveInteger(Number(process.env["GITHUB_RUN_ATTEMPT"]), "run attempt");
const result = record(await provider.getRunAttemptJobs(qualificationRepository, runId, attempt), "attempt jobs");
const jobs = array(result["jobs"], "attempt jobs", 1, 100).map(value => record(value, "job"));
assertSame(result["total_count"], jobs.length, "complete job inventory");
const selected = jobs.filter(job => job["name"] === qualificationJob);
if (selected.length !== 1) fail("E-JOB", "the actual attempt must have exactly one named conformance job");
const job = selected.at(0);
if (job === undefined) fail("E-JOB", "conformance job is absent");
assertSame(job["run_id"], runId, "collected job run");
assertSame(job["run_attempt"], attempt, "collected job attempt");
assertSame(job["head_sha"], process.env["GITHUB_SHA"], "collected job source");
for (const profile of qualificationPackages) {
  const collected = await collectConformanceEvidence(provider, qualificationRepository,
    positiveInteger(job["id"], "job identity"), profile.stepName);
  assertSame(collected.proof.packageId, profile.packageId, "collected package");
  assertSame(collected.proof.repositoryId, qualificationRepositoryId, "collected repository");
  assertSame(collected.proof.runId, runId, "collected run");
  assertSame(collected.proof.runAttempt, attempt, "collected attempt");
  assertSame(collected.proof.sourceRevision, process.env["GITHUB_SHA"], "collected source");
  console.log(`EF_COLLECTED_CONFORMANCE_V1 ${JSON.stringify(collected)}`);
}
