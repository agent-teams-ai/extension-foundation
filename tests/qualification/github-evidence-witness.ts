import type { Witness } from "./github-evidence.ts";

// Independently reviewed historical provider witness; no automatic renewal.
export const providerWitness: Witness = Object.freeze({
  "repository": "agent-teams-ai/extension-foundation",
  "repositoryId": 1333298097,
  "sourceRevision": "bf050098f4ef87c67d09f96d8b4d146159939574",
  "runId": 45516144384,
  "attempt": 1,
  "workflowId": 333712065,
  "workflowPath": ".github/workflows/ci.yml",
  "jobId": 138875952992,
  "jobName": "check",
  "checkoutStep": "Run actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1",
  "checkStep": "Run pnpm check",
  "workflowSha256": "b6a12439afb49ddd2ec0d108615d501606069946365dbbf2b4a9f45b540b9fe1",
  "logSha256": "bdbe23c972772ea312650983ef6290c4a7c77b0c8b0c8f899166a8d7d80a2157",
  "logMarkers": [
    "bf050098f4ef87c67d09f96d8b4d146159939574",
    "ℹ tests 239",
    "ℹ pass 239",
    "ℹ fail 0",
    "ℹ cancelled 0",
    "ℹ skipped 0"
  ]
});
