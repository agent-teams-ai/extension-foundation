import assert from "node:assert/strict";
import test from "node:test";

import { runDocsProtocolQualification } from "@agent-teams/docs-protocol/qualification";

const fixtureRoot = new URL("./fixtures/docs-protocol-qualification", import.meta.url).pathname;

test("shared runner qualifies Extension adoption in its owned disposable copy", async () => {
  const receipt = await runDocsProtocolQualification({
    fixtureRoot,
    scenario: {
      find: { query: { type: "adr" }, expectedIds: [] },
      newDocument: {
        intent: {
          type: "open-decision",
          id: "OD-099",
          title: "Disposable Extension Choice",
          owner: "architecture/tooling",
          summary: "Qualifies Extension authoring, crash recovery, and reachability.",
        },
        codeAnchors: [{ enforcement: "required", pattern: "package.json" }],
      },
    },
  });

  assert.equal(receipt.projectId, "extension-foundation-qualification");
  assert.equal(receipt.appliedDocumentPath, "docs/open-decisions/generated/OD-099-disposable-extension-choice.md");
  assert.deepEqual(receipt.checks, [
    "info", "find", "preview", "crash", "doctor", "recover", "receipt",
    "parent", "apply", "index", "check", "source-unchanged",
  ]);
});
