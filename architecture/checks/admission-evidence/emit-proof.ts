import { lstat, readFile } from "node:fs/promises";
import { isAbsolute, join } from "node:path";
import { fileURLToPath } from "node:url";
import { digestSourceInputs, formatPackageConformanceProof, sha256 } from "./proof.ts";
import { readSourceInputs } from "./source-inputs.ts";
import { assertQualificationPackageInputs } from "./package-inputs.ts";
import { qualificationPackages, qualificationRepository, qualificationRepositoryId, qualificationSourceInputs } from "./qualification-profile.ts";

const root = fileURLToPath(new URL("../../..", import.meta.url));
const selected = qualificationPackages.find(item => item.packageId === process.argv.at(2));
const artifactDirectory = process.env["EF_QUALIFICATION_ARTIFACT_DIR"];
if (selected === undefined || artifactDirectory === undefined || !isAbsolute(artifactDirectory) ||
    process.env["GITHUB_REPOSITORY"] !== qualificationRepository || process.env["GITHUB_EVENT_NAME"] !== "push" ||
    process.env["GITHUB_REPOSITORY_ID"] !== String(qualificationRepositoryId)) {
  throw new Error("Proof emission requires the selected real push campaign and its retained tested artifact.");
}
const artifact = join(artifactDirectory, selected.artifactName);
await assertQualificationPackageInputs(root);
const metadata = await lstat(artifact);
if (!metadata.isFile() || metadata.isSymbolicLink() || metadata.size > 4 * 1024 * 1024) {
  throw new Error("The tested package archive must be one bounded regular file.");
}
console.log(formatPackageConformanceProof({
  schemaVersion: 1, packageId: selected.packageId, repositoryId: qualificationRepositoryId,
  sourceRevision: process.env["GITHUB_SHA"] ?? "", runId: Number(process.env["GITHUB_RUN_ID"]),
  runAttempt: Number(process.env["GITHUB_RUN_ATTEMPT"]), consumerId: selected.consumerId,
  implementationId: selected.implementationId, conformanceVersion: selected.conformanceVersion,
  conformanceSha256: digestSourceInputs(await readSourceInputs(root, selected.conformanceInputs)),
  sourceInputsSha256: digestSourceInputs(await readSourceInputs(root, qualificationSourceInputs)),
  artifactName: selected.artifactName, artifactSha256: sha256(await readFile(artifact)),
}));
