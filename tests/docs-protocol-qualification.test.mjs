import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { runDocsProtocolQualification } from "@agent-teams/docs-protocol/qualification";

const fixtureRoot = new URL("./fixtures/docs-protocol-qualification", import.meta.url).pathname;

test("qualification manifest binds the exact protocol gate and registry packages", async () => {
  const [qualification, manifest] = await Promise.all([
    readFile(new URL("../architecture/foundation/docs-protocol-qualification.json", import.meta.url), "utf8").then(JSON.parse),
    readFile(new URL("../package.json", import.meta.url), "utf8").then(JSON.parse),
  ]);
  assert.equal(qualification.gateCommand, "pnpm docs:protocol:check");
  assert.deepEqual(qualification.packages, {
    "@agent-teams/docs-protocol": manifest.devDependencies["@agent-teams/docs-protocol"],
    "@agent-teams/engineering-foundation": manifest.devDependencies["@agent-teams/engineering-foundation"],
  });
  assert.deepEqual(qualification.qualificationTests, [
    "tests/docs-protocol-qualification.test.mjs",
    "tests/document-authoring.test.mjs",
  ]);
});

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
