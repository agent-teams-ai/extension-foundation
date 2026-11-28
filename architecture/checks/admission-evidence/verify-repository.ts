import { fileURLToPath } from "node:url";
import {
  admissionVerificationReceiptMatches,
  packageAdmissionVerificationRequest,
  requireValidPackagePolicy,
} from "../package-policy.mjs";
import { qualificationPackages } from "./qualification-profile.ts";
import { repositoryAdmissionVerifier } from "./repository-verifier.ts";
import { assertSame, fail } from "./validation.ts";

// Verify the existing admission port independently of the separate accepted-owner,
// scaffold, source and managed-toolchain gates. This command does not satisfy them.
const root = fileURLToPath(new URL("../../..", import.meta.url));
const token = process.env["GITHUB_TOKEN"];
if (token === undefined || token.length === 0) {
  fail("E-PROVIDER", "Online admission verification requires GITHUB_TOKEN with Actions read access.");
}
const policy = await requireValidPackagePolicy(root);
assertSame(policy.entries.length, qualificationPackages.length, "complete admitted package catalog");
const verify = await repositoryAdmissionVerifier(root, token);
if (verify === undefined) fail("E-POLICY", "Online admission verification requires the qualified packages.");

const receipts = [];
for (const entry of policy.entries) {
  const admission = policy.admissionsById.get(entry.id);
  const request = packageAdmissionVerificationRequest(entry, admission,
    policy.admissionRecordDigestsById.get(entry.id));
  const receipt = await verify({ root, entry, admission, request });
  if (!admissionVerificationReceiptMatches(request, receipt)) {
    fail("E-RECEIPT", "Online admission verifier returned an unbound or unsatisfied receipt.");
  }
  receipts.push(receipt);
}
console.log(JSON.stringify({ schemaVersion: 1, verification: "online-package-admission", receipts }));
