import { constants } from "node:fs";
import { lstat, open, realpath } from "node:fs/promises";
import { join } from "node:path";
import { loadPackagePolicy } from "../package-policy.mjs";
import { parseStrictJson } from "../strict-json.mjs";
import type { AdmissionEvidencePolicy, SourceInputSelection } from "./contracts.ts";
import { createGitHubEvidenceProvider } from "./github-provider.ts";
import { decodeAdmissionEvidencePolicy } from "./policy.ts";
import { assertQualificationPackageInputs } from "./package-inputs.ts";
import { qualificationJob, qualificationPackages, qualificationRepository, qualificationRepositoryId, qualificationSourceInputs, qualificationWorkflow } from "./qualification-profile.ts";
import { readSourceInputs } from "./source-inputs.ts";
import { assertSame, fail } from "./validation.ts";
import { createGitHubAdmissionEvidenceVerifier } from "./verify.ts";

export { assertQualificationPackageInputs };

const POLICY_PATH = "architecture/package-evidence-policy.json";
const MAX_POLICY_BYTES = 128 * 1024;

function sameSelection(actual: SourceInputSelection, expected: SourceInputSelection): boolean {
  return JSON.stringify([...actual.roots].sort()) === JSON.stringify([...expected.roots].sort()) &&
    JSON.stringify([...actual.files].sort()) === JSON.stringify([...expected.files].sort());
}

/** Result coordinates may change; the executable qualification subject may not. */
export function decodeRepositoryAdmissionPolicy(input: unknown): AdmissionEvidencePolicy {
  const policy = decodeAdmissionEvidencePolicy(input);
  assertSame(policy.packages.length, qualificationPackages.length, "complete repository qualification policy");
  for (const entry of policy.packages) {
    const selected = qualificationPackages.find(item => item.packageId === entry.packageId);
    if (selected === undefined) fail("E-POLICY", "the repository does not qualify this package");
    assertSame(entry.repository, qualificationRepository, "repository policy owner");
    assertSame(entry.repositoryId, qualificationRepositoryId, "repository policy stable identity");
    assertSame(entry.workflowPath, qualificationWorkflow, "repository qualification workflow");
    assertSame(entry.jobName, qualificationJob, "repository qualification job");
    assertSame(entry.stepName, selected.stepName, "repository qualification step");
    assertSame(entry.consumerId, selected.consumerId, "repository qualification consumer");
    assertSame(entry.implementationId, selected.implementationId, "repository qualification implementation");
    assertSame(entry.conformanceVersion, selected.conformanceVersion, "repository conformance version");
    assertSame(entry.artifactName, selected.artifactName, "repository qualification artifact");
    if (!sameSelection(entry.sourceInputs, qualificationSourceInputs)) {
      fail("E-POLICY", "source inputs must equal the executable closed qualification profile");
    }
  }
  return policy;
}

/** A repository authority file must be bounded, regular, stable and strict JSON. */
export async function readRepositoryAdmissionPolicy(root: string): Promise<AdmissionEvidencePolicy> {
  const directory = join(await realpath(root), "architecture");
  const parent = await lstat(directory);
  if (!parent.isDirectory() || parent.isSymbolicLink()) fail("E-POLICY", "policy ancestors must be real directories");
  const path = join(directory, "package-evidence-policy.json");
  const selected = await lstat(path, { bigint: true });
  if (!selected.isFile() || selected.isSymbolicLink() || selected.nlink !== 1n || selected.size < 1n || selected.size > BigInt(MAX_POLICY_BYTES)) {
    fail("E-POLICY", `${POLICY_PATH} must be one bounded regular authority file`);
  }
  const handle = await open(path, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0) | constants.O_NONBLOCK);
  try {
    const before = await handle.stat({ bigint: true });
    if (!before.isFile() || before.dev !== selected.dev || before.ino !== selected.ino || before.size !== selected.size) {
      fail("E-POLICY", "policy file changed before opening");
    }
    const bytes = new Uint8Array(Number(before.size) + 1);
    let offset = 0;
    while (offset < bytes.length) {
      const result = await handle.read(bytes, offset, bytes.length - offset, offset);
      if (result.bytesRead === 0) break;
      offset += result.bytesRead;
    }
    const [after, current] = await Promise.all([handle.stat({ bigint: true }), lstat(path, { bigint: true })]);
    if (offset !== Number(before.size) || before.size !== after.size || before.mtimeNs !== after.mtimeNs || before.ctimeNs !== after.ctimeNs ||
        current.isSymbolicLink() || current.dev !== before.dev || current.ino !== before.ino || current.nlink !== 1n) {
      fail("E-POLICY", "policy file changed while reading");
    }
    const value: unknown = parseStrictJson(new TextDecoder("utf-8", { fatal: true }).decode(bytes.subarray(0, offset)));
    return decodeRepositoryAdmissionPolicy(value);
  } finally { await handle.close(); }
}

/** Only the outer repository CLI handles credentials; neither package receives them. */
export async function repositoryAdmissionVerifier(root: string, token: string | undefined) {
  const catalog = await loadPackagePolicy(root);
  if (catalog.entries.length === 0) return undefined;
  if (token === undefined || token.length === 0) {
    throw new Error("Package admission requires GITHUB_TOKEN with read access to this repository's Actions evidence.");
  }
  const policy = await readRepositoryAdmissionPolicy(root);
  return createGitHubAdmissionEvidenceVerifier({
    policy, provider: createGitHubEvidenceProvider({ token }),
    readSourceInputs: async (inputRoot, selection) => {
      await assertQualificationPackageInputs(inputRoot);
      return readSourceInputs(inputRoot, selection);
    },
  });
}
