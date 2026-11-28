import type { AdmissionEvidencePolicy, PackageEvidencePolicy, SourceInputSelection } from "./contracts.ts";
import { array, digest, exactRecord, fail, positiveInteger, relativePath, repositoryName, string } from "./validation.ts";

const policyFields = ["packageId", "repository", "repositoryId", "workflowPath", "workflowSha256", "jobName", "stepName", "allowedEvents", "conformanceVersion", "consumerId", "implementationId", "conformanceSha256", "artifactName", "artifactSha256", "sourceInputs"];

export function decodeSourceInputSelection(input: unknown): SourceInputSelection {
  const value = exactRecord(input, ["roots", "files"], "source input selection");
  const roots = array(value["roots"], "source roots", 0, 64).map(relativePath);
  const files = array(value["files"], "source files", 0, 256).map(relativePath);
  const all = [...roots, ...files];
  if (all.length === 0 || new Set(all).size !== all.length) fail("E-SCHEMA", "source selection must be nonempty and unique");
  for (const root of roots) {
    if (all.some(path => path !== root && path.startsWith(`${root}/`))) {
      fail("E-SCHEMA", "source roots and files must not overlap");
    }
  }
  return Object.freeze({ roots: Object.freeze(roots), files: Object.freeze(files) });
}

export function decodeAdmissionEvidencePolicy(input: unknown): AdmissionEvidencePolicy {
  const value = exactRecord(input, ["schemaVersion", "packages"], "admission evidence policy");
  if (value["schemaVersion"] !== 1) fail("E-SCHEMA", "unsupported admission evidence policy version");
  const packages = array(value["packages"], "packages", 0, 32).map((item): PackageEvidencePolicy => {
    const entry = exactRecord(item, policyFields, "package evidence policy");
    const workflowPath = relativePath(entry["workflowPath"]);
    if (!/^\.github\/workflows\/[A-Za-z0-9_-]+\.ya?ml$/u.test(workflowPath)) {
      fail("E-SCHEMA", "workflow path must name one repository workflow");
    }
    const events = array(entry["allowedEvents"], "allowed events", 1, 1);
    if (events[0] !== "push") fail("E-SCHEMA", "the initial admission profile supports push evidence only");
    const packageId = string(entry["packageId"], "package identity");
    if (!/^[a-z0-9][a-z0-9.-]*$/u.test(packageId)) fail("E-SCHEMA", "invalid package identity");
    const artifactName = string(entry["artifactName"], "artifact name");
    if (!/^[A-Za-z0-9][A-Za-z0-9._-]*\.tgz$/u.test(artifactName)) fail("E-SCHEMA", "artifact name must be a tarball basename");
    const allowedEvents: readonly ["push"] = ["push"];
    const sourceInputs = decodeSourceInputSelection(entry["sourceInputs"]);
    if (!sourceInputs.files.includes(workflowPath) && !sourceInputs.roots.some(root => workflowPath.startsWith(`${root}/`))) {
      fail("E-SCHEMA", "the trusted workflow must be in the source-input subject");
    }
    return Object.freeze({
      packageId,
      repository: repositoryName(entry["repository"]),
      repositoryId: positiveInteger(entry["repositoryId"], "repository identity"),
      workflowPath,
      workflowSha256: digest(entry["workflowSha256"], "workflow digest"),
      jobName: string(entry["jobName"], "job name"),
      stepName: string(entry["stepName"], "step name"),
      allowedEvents: Object.freeze(allowedEvents),
      conformanceVersion: string(entry["conformanceVersion"], "conformance version"),
      consumerId: string(entry["consumerId"], "consumer identity"),
      implementationId: string(entry["implementationId"], "implementation identity"),
      conformanceSha256: digest(entry["conformanceSha256"], "conformance digest"),
      artifactName,
      artifactSha256: digest(entry["artifactSha256"], "artifact digest"),
      sourceInputs,
    });
  });
  if (new Set(packages.map(item => item.packageId)).size !== packages.length) fail("E-SCHEMA", "duplicate package evidence policy");
  return Object.freeze({ schemaVersion: 1, packages: Object.freeze(packages) });
}
