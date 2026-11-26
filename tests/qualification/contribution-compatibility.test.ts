import assert from "node:assert/strict";
import test from "node:test";
import { matchContributions, type OwnerContract } from "./contribution-compatibility.ts";

interface TextPayload { readonly text: string }
interface RangePayload { readonly lower: number; readonly upper: number }
type Payload = TextPayload | RangePayload;
const object = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const textOwner: OwnerContract<TextPayload> = {
  id: "example/text", revision: 1,
  validate: (value): value is TextPayload => object(value) && Object.keys(value).length === 1 &&
    typeof value["text"] === "string" && value["text"].length > 0,
};
const rangeOwner: OwnerContract<RangePayload> = {
  id: "example/range", revision: 3,
  validate: (value): value is RangePayload => object(value) && Object.keys(value).length === 2 &&
    typeof value["lower"] === "number" && typeof value["upper"] === "number" && value["lower"] <= value["upper"],
};
const owners: readonly OwnerContract<Payload>[] = [textOwner, rangeOwner];
const textEntry = (id = "document/title") => ({
  id, contract: textOwner.id, revision: 1, required: true, payload: { text: "hello" },
});
const rangeEntry = () => ({
  id: "review/limits", contract: rangeOwner.id, revision: 3, required: true, payload: { lower: 2, upper: 8 },
});

test("owner-defined contracts preserve typed payloads and declared order without category dispatch", () => {
  const inputs = [rangeEntry(), textEntry()];
  const result = matchContributions(inputs, owners);
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.deepEqual(result.selected.map(entry => entry.id), ["review/limits", "document/title"]);
  const actual = result.selected.map(({ payload }) => "text" in payload ? payload.text.toUpperCase() : payload.upper - payload.lower);
  assert.deepEqual(actual, [6, "HELLO"]);
  assert.deepEqual(result.omitted, []);
  const selected = result.selected[0]!;
  // @ts-expect-error selected metadata cannot be rewritten by a consumer.
  if (false) selected.revision = 99;
  // @ts-expect-error a union of owner payloads is not an arbitrary TextPayload.
  const textOnly: TextPayload = selected.payload;
  void textOnly;
});

test("required unknown and mismatched contracts reject while optional omissions are explicit", () => {
  const unknown = { ...textEntry("unknown/feature"), contract: "another/feature" };
  const mismatched = { ...rangeEntry(), revision: 4 };
  assert.deepEqual(matchContributions([textEntry(), unknown], owners), { ok: false, reason: "unknown-required-contract" });
  assert.deepEqual(matchContributions([textEntry(), mismatched], owners), { ok: false, reason: "unsupported-required-revision" });
  let validatorCalls = 0;
  const watched: readonly OwnerContract<Payload>[] = owners.map(owner => ({ ...owner,
    validate: (payload): payload is Payload => { validatorCalls += 1; return owner.validate(payload); },
  }));
  const result = matchContributions([
    { ...unknown, required: false, payload: { arbitrary: ["unknown", 42] } },
    textEntry(),
    { ...mismatched, required: false },
  ], watched);
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(validatorCalls, 1, "unsupported optional payloads must not reach an owner validator");
  assert.deepEqual(result.selected.map(entry => entry.id), ["document/title"]);
  assert.deepEqual(result.omitted, [
    { id: "unknown/feature", contract: "another/feature", revision: 1, reason: "unknown-contract" },
    { id: "review/limits", contract: "example/range", revision: 4, reason: "unsupported-revision" },
  ]);
});

test("optional support never masks invalid envelopes, known payloads or duplicate identities", () => {
  const invalid = { ...textEntry(), required: false, payload: { text: 17 } };
  assert.deepEqual(matchContributions([invalid], owners), { ok: false, reason: "invalid-contribution-payload" });
  const unknown = { ...textEntry(), contract: "another/feature", required: false };
  assert.deepEqual(matchContributions([textEntry(), unknown], owners), { ok: false, reason: "duplicate-contribution-identity" });
  for (const patch of [{ required: "false" }, { revision: 0 }, { revision: 1.5 }, { contract: "unnamespaced" },
    { id: "../escape" }, { executable: "candidate.js" }, { validate: () => true }]) {
    assert.deepEqual(matchContributions([{ ...unknown, ...patch }], owners), { ok: false, reason: "invalid-contribution-carrier" });
  }
});

test("bounded inert carrier rejects accessors, executable values, cycles and oversized metadata", () => {
  let reads = 0;
  const payload = Object.defineProperty({}, "text", { enumerable: true, get() { reads += 1; return "executed"; } });
  const cycle: Record<string, unknown> = {};
  cycle["self"] = cycle;
  for (const value of [payload, cycle, new Date(), { text: () => "executable" }, { text: "x".repeat(65_537) },
    { text: Number.POSITIVE_INFINITY }, { text: new Array(2_049).fill(0) }]) {
    assert.deepEqual(matchContributions([{ ...textEntry(), payload: value }], owners),
      { ok: false, reason: "invalid-contribution-carrier" });
  }
  assert.equal(reads, 0, "snapshot must not invoke metadata accessors");
  const many = Array.from({ length: 65 }, (_, index) => textEntry(`item/${index}`));
  assert.deepEqual(matchContributions(many, owners), { ok: false, reason: "invalid-contribution-carrier" });
});

test("validated descriptors and the selected owner revision survive caller mutation", () => {
  const input = textEntry();
  const owner = { ...textOwner };
  const result = matchContributions([input], [owner]);
  assert.equal(result.ok, true);
  if (!result.ok) return;
  input.payload.text = "changed";
  input.contract = "another/feature";
  input.revision = 20;
  owner.id = "another/owner";
  owner.revision = 21;
  assert.deepEqual(result.selected[0], { id: "document/title", contract: "example/text", revision: 1,
    required: true, payload: { text: "hello" } });
  assert.equal(Object.isFrozen(result.selected[0]!.payload), true);
  assert.equal(Object.isFrozen(result.selected[0]), true);
  assert.equal(Reflect.set(result.selected[0]!.payload, "text", "late"), false);
});

test("all trusted owner bindings are captured before validators and malformed validators refuse", () => {
  const second = { ...rangeOwner };
  const first: OwnerContract<Payload> = { ...textOwner,
    validate: (payload): payload is Payload => { second.revision = 99; return textOwner.validate(payload); },
  };
  const result = matchContributions([textEntry(), rangeEntry()], [first, second]);
  assert.equal(result.ok, true, "an earlier validator cannot substitute the captured owner table");
  for (const validate of [() => { throw new Error("owner failed"); }, () => "yes", () => ({ ok: true }), () => undefined]) {
    const invalidOwner = { ...textOwner };
    Reflect.set(invalidOwner, "validate", validate);
    assert.deepEqual(matchContributions([textEntry()], [invalidOwner]), { ok: false, reason: "invalid-owner-validator" });
  }
  assert.deepEqual(matchContributions([textEntry()], [textOwner, textOwner]), { ok: false, reason: "invalid-owner-contracts" });
});

test("a late failure cannot expose an accepted prefix to candidate execution", () => {
  let evaluations = 0;
  const effects: string[] = [];
  function host(input: unknown): void {
    const admitted = matchContributions(input, owners);
    if (!admitted.ok) return;
    for (const { id } of admitted.selected) { evaluations += 1; effects.push(id); }
  }
  host([textEntry(), { ...rangeEntry(), payload: { lower: 20, upper: 8 } }]);
  assert.equal(evaluations, 0);
  assert.deepEqual(effects, []);
  host([textEntry(), rangeEntry()]);
  assert.equal(evaluations, 2);
  assert.deepEqual(effects, ["document/title", "review/limits"]);
});
