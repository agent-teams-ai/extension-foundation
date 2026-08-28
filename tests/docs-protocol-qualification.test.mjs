import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("managed integration owns a data-only v2 qualification contract and external gate", async () => {
  const [integration, qualification, activeProfile] = await Promise.all([
    readFile(new URL("../architecture/foundation/docs-consumer-integration.json", import.meta.url), "utf8").then(JSON.parse),
    readFile(new URL("../architecture/foundation/docs-protocol-qualification.json", import.meta.url), "utf8").then(JSON.parse),
    readFile(new URL("../architecture/foundation/document-authoring.yaml", import.meta.url), "utf8"),
  ]);
  assert.equal(integration.schemaVersion, 2);
  assert.equal(integration.cohort.cohortId, "docs-2026-08-28-stable8");
  assert.deepEqual(integration.qualification, {
    contractPath: "architecture/foundation/docs-protocol-qualification.json",
    gateCommand: "pnpm docs:protocol:check",
  });
  assert.equal(qualification.schemaVersion, 2);
  assert.deepEqual(Object.keys(qualification).sort(), ["scenarios", "schemaVersion"]);
  assert.deepEqual(qualification.scenarios.map(({ type }) => type).sort(), [
    "adr", "architecture", "open-decision",
  ]);
  assert.deepEqual(
    [...activeProfile.matchAll(/^    - type: ([a-z-]+)$/gmu)].map(([, type]) => type).sort(),
    qualification.scenarios.map(({ type }) => type).sort(),
  );
  assert.equal(new Set(qualification.scenarios.map(({ id }) => id)).size, qualification.scenarios.length);
  for (const { expected, intent } of qualification.scenarios) {
    assert.deepEqual(Object.keys(intent).filter(key => ["id", "owner", "summary", "title"].includes(key)).sort(), [
      "id", "owner", "summary", "title",
    ]);
    assert.equal(expected.metadataStorage, "frontmatter");
    assert.equal(expected.reachability.state, "manual-required");
    assert.ok(expected.documentPath.endsWith(".md"));
  }
});
