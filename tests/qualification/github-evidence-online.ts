import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

import {
  admissionVerificationReceiptMatches, packageAdmissionVerificationRequest,
} from "../../architecture/checks/package-policy.mjs";
import { EvidenceRefusal, observeEvidence, refusalCode, sha256 } from "./github-evidence.ts";
import { retrieveEvidence } from "./github-evidence-http.ts";
import { providerWitness } from "./github-evidence-witness.ts";

const probeSource = process.env.E1_PROBE_SOURCE ?? "";
const reportPath = process.env.E1_REPORT_PATH ?? "";
let result: unknown;
try {
  if (!/^[0-9a-f]{40}$/.test(probeSource) || reportPath.length === 0) {
    throw new EvidenceRefusal("input");
  }
  const request = packageAdmissionVerificationRequest(
    { id: "research.provider-evidence" },
    { package_id: "research.provider-evidence", semantic_classification: "ordinary-library" },
    "sha256:" + sha256(new TextEncoder().encode(JSON.stringify(providerWitness))),
  );
  const observation = observeEvidence(request, providerWitness, await retrieveEvidence(providerWitness, {
    token: process.env.GITHUB_TOKEN ?? "",
  }));
  if (admissionVerificationReceiptMatches(request, observation)) {
    throw new EvidenceRefusal("input");
  }
  result = {
    probeSource, observedAt: new Date().toISOString(),
    observation, admissionReceiptAccepted: false,
  };
} catch (error) {
  process.exitCode = 1;
  result = {
    probeSource: /^[0-9a-f]{40}$/.test(probeSource) ? probeSource : null,
    outcome: "refused", code: refusalCode(error),
  };
}
const encoded = JSON.stringify(result, null, 2) + "\n";
console.log(encoded);
if (reportPath.length > 0) {
  try {
    await mkdir(dirname(reportPath), { recursive: true });
    await writeFile(reportPath, encoded, "utf8");
  } catch {
    process.exitCode = 1;
    console.error("Evidence report unavailable");
  }
}
