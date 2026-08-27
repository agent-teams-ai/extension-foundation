import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("managed integration owns a data-only v2 qualification contract and external gate", async () => {
  const [integration, qualification, rollout, stagedProfile] = await Promise.all([
    readFile(new URL("../architecture/foundation/docs-consumer-integration.json", import.meta.url), "utf8").then(JSON.parse),
    readFile(new URL("../architecture/foundation/docs-protocol-qualification.json", import.meta.url), "utf8").then(JSON.parse),
    readFile(new URL("../architecture/foundation/docs-protocol-rollout.yaml", import.meta.url), "utf8"),
    readFile(new URL("../architecture/foundation/rollouts/docs-protocol-v2/document-authoring.yaml", import.meta.url), "utf8"),
  ]);
  assert.equal(integration.schemaVersion, 1);
  assert.match(rollout, /^status: stable3-current-v2-staged$/mu);
  assert.match(rollout, /^  integrationSchemaVersion: 2$/mu);
  assert.match(rollout, /^  qualificationContractSchemaVersion: 2$/mu);
  assert.equal(qualification.schemaVersion, 2);
  assert.deepEqual(Object.keys(qualification).sort(), ["scenarios", "schemaVersion"]);
  assert.deepEqual(qualification.scenarios.map(({ type }) => type).sort(), [
    "adr", "architecture", "open-decision",
  ]);
  assert.deepEqual(
    [...stagedProfile.matchAll(/^    - type: ([a-z-]+)$/gmu)].map(([, type]) => type).sort(),
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
