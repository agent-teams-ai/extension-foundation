import assert from "node:assert/strict";
import { readdir, writeFile } from "node:fs/promises";
import {
  ArtifactError, createNodeArtifactVerifier,
  type ArtifactBinding, type ArtifactErrorCode, type ArtifactRequest, type NodeArtifactTools, type Sha256,
} from "@extension-foundation/node-artifact";

export interface SignedInput extends Omit<ArtifactRequest, "signatureBundle"> {
  readonly signatureBytes: readonly number[];
}

export interface FixtureInputs {
  readonly tools: NodeArtifactTools;
  readonly stagingRoot: string;
  readonly symlinkStagingRoot: string;
  readonly originalModuleBlob: string;
  readonly good: SignedInput;
  readonly failures: readonly {
    readonly name: string; readonly request: SignedInput; readonly code: ArtifactErrorCode;
    readonly tamper?: { readonly path: string; readonly bytes: readonly number[] };
  }[];
}

interface Publication {
  readonly publish: (title: string) => { readonly title: string; readonly slug: string };
}

const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const publication = (value: unknown): value is Publication => record(value) && typeof value.publish === "function";
const request = ({ signatureBytes, ...input }: SignedInput): ArtifactRequest =>
  ({ ...input, signatureBundle: Uint8Array.from(signatureBytes) });

/** A separately compiled ordinary Host, importing only the installed public API. */
export async function observe(input: FixtureInputs) {
  const witness = { evaluations: 0, effects: 0 };
  Object.assign(globalThis, { efArtifactWitness: witness });
  const verifier = createNodeArtifactVerifier({ tools: input.tools, stagingRoot: input.stagingRoot });
  const good = request(input.good);
  const verified = await verifier.verify(good);
  const mutable = { ...good, signatureBundle: Uint8Array.from(good.signatureBundle),
    expected: { ...good.expected }, trustedPublisher: { ...good.trustedPublisher } };
  const pendingSnapshot = verifier.verify(mutable);
  mutable.signatureBundle.fill(0);
  Object.assign(mutable.expected, { revision: 999, scope: "changed/after-request" });
  Object.assign(mutable.trustedPublisher, { id: "changed/after-request" });
  const snapshot = await pendingSnapshot;
  assert.equal(snapshot.facts.revision, 3);
  assert.equal(snapshot.facts.scope, "example/publishing");
  assert.equal(snapshot.facts.publisher, good.trustedPublisher.id);
  const failures: { name: string; code: string }[] = [];
  for (const item of input.failures) {
    if (item.tamper !== undefined) {
      // Establish acceptance before this one controlled byte substitution.
      await verifier.verify(request(item.request));
      await writeFile(item.tamper.path, Uint8Array.from(item.tamper.bytes));
    }
    await assert.rejects(verifier.verify(request(item.request)), (error: unknown) => {
      if (!(error instanceof ArtifactError) || error.code !== item.code) return false;
      failures.push({ name: item.name, code: error.code });
      return true;
    }, item.name);
  }
  const wrongToolDigest: Sha256 = `sha256:${"0".repeat(64)}`;
  await assert.rejects(createNodeArtifactVerifier({ tools: { ...input.tools,
    oras: { ...input.tools.oras, digest: wrongToolDigest } }, stagingRoot: input.stagingRoot }).verify(good),
  (error: unknown) => error instanceof ArtifactError && error.code === "artifact.tool");
  await assert.rejects(createNodeArtifactVerifier({ tools: { ...input.tools,
    oras: { ...input.tools.oras, path: input.tools.oras.path + "/missing" } }, stagingRoot: input.stagingRoot }).verify(good),
  (error: unknown) => error instanceof ArtifactError && error.code === "artifact.tool");
  await assert.rejects(createNodeArtifactVerifier({ tools: input.tools, stagingRoot: input.symlinkStagingRoot }).verify(good),
    (error: unknown) => error instanceof ArtifactError && error.code === "artifact.staging");
  assert.deepEqual(witness, { evaluations: 0, effects: 0 }, "Verification refusals must never evaluate plugin code");
  assert.deepEqual(await readdir(input.stagingRoot), [], "Every native verification released its own staging");
  assert.equal(verified.facts.digest, good.digest);
  assert.equal(verified.facts.publisherKeyDigest, good.trustedPublisher.keyDigest);
  assert.equal(verified.facts.signatureProfile, "cosign-direct-key");
  assert.equal(verified.facts.executableProfile, "self-contained-esm-v1");
  assert.ok(Object.isFrozen(verified.facts) && Object.isFrozen(verified.facts.files));
  const asset = verified.readAsset("data/labels.json");
  assert.equal(Buffer.from(asset).toString("utf8"), '{"prefix":"Published"}');
  asset.fill(0);
  assert.equal(Buffer.from(verified.readAsset("data/labels.json")).toString("utf8"), '{"prefix":"Published"}');
  assert.throws(() => verified.readAsset("../entry.mjs"), (error: unknown) => error instanceof ArtifactError && error.code === "artifact.input");
  let authorityCalls = 0;
  const binding: ArtifactBinding<Publication> = {
    contract: "document/export", revision: 3, loader: "document-export-v3",
    authorize: facts => { authorityCalls++; return facts.scope === "example/publishing"; },
    validate: publication,
  };
  await assert.rejects(verified.evaluate({ ...binding, loader: "other-loader" }),
    (error: unknown) => error instanceof ArtifactError && error.code === "artifact.binding");
  assert.equal(authorityCalls, 0, "An incompatible binding never requests current authority");
  await assert.rejects(verified.evaluate({ ...binding, authorize: () => false }),
    (error: unknown) => error instanceof ArtifactError && error.code === "artifact.denied");
  await assert.rejects(verified.evaluate({ ...binding, authorize: () => { throw new Error("authority unavailable"); } }),
    (error: unknown) => error instanceof ArtifactError && error.code === "artifact.denied");
  assert.deepEqual(witness, { evaluations: 0, effects: 0 });

  // The original registry blob can change after capture. Evaluation must still
  // use the verified bytes and cannot re-open that source or its removed stage.
  await writeFile(input.originalModuleBlob, 'throw new Error("post-verification substitution");');
  await assert.rejects(verified.evaluate({ ...binding, validate: (_value): _value is Publication => false }),
    (error: unknown) => error instanceof ArtifactError && error.code === "artifact.exports");
  assert.deepEqual(witness, { evaluations: 1, effects: 0 }, "Export validation occurs after trusted code evaluation, before Host use");
  const first = await verified.evaluate(binding);
  const second = await verified.evaluate(binding);
  assert.notEqual(first.evaluationId, second.evaluationId, "Separate attempts must not reuse Node's module namespace cache");
  assert.notEqual(first.value, second.value);
  const result = [first.value.publish("Early Work"), second.value.publish("Second Edition")];
  assert.deepEqual(result, [{ title: "Early Work", slug: "early-work" }, { title: "Second Edition", slug: "second-edition" }]);
  assert.deepEqual(witness, { evaluations: 3, effects: 2 });
  return { result, failures, admissionRefusalEvaluations: 0, admissionRefusalEffects: 0,
    exportRefusalEvaluations: 1, totalEvaluations: witness.evaluations, totalEffects: witness.effects,
    distinctAttemptIdentities: first.evaluationId !== second.evaluationId,
    capturedBytesSurvivedSubstitution: true, authorityCalls,
    resolved: import.meta.resolve("@extension-foundation/node-artifact") };
}
