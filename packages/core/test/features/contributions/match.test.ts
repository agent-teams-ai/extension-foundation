import { deepEqual, equal, fail, throws } from "node:assert/strict";
import test from "node:test";
import { matchContributions, type OwnerContract } from "../../../src/features/contributions/index.ts";

interface Title { readonly text: string }
interface WorkLimit { readonly maxParallel: number; readonly labels: readonly string[] }
type Payload = Title | WorkLimit;
const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const title: OwnerContract<Title> = {
  id: "editor/title", revision: 2,
  validate: (value): value is Title => record(value) && Object.keys(value).length === 1 &&
    typeof value.text === "string" && value.text.length > 0,
};
const limit: OwnerContract<WorkLimit> = {
  id: "runner/work-limit", revision: 7,
  validate: (value): value is WorkLimit => record(value) && Object.keys(value).length === 2 &&
    typeof value.maxParallel === "number" && Number.isInteger(value.maxParallel) &&
    value.maxParallel > 0 && Array.isArray(value.labels) &&
    value.labels.every(label => typeof label === "string"),
};
const contracts: readonly OwnerContract<Payload>[] = [title, limit];
const titleEntry = (id = "document/title") => ({
  id, contract: "editor/title", revision: 2, required: true, payload: { text: "hello" },
});
const limitEntry = () => ({
  id: "batch/capacity", contract: "runner/work-limit", revision: 7, required: true,
  payload: { maxParallel: 4, labels: ["review", "publish"] },
});

test("independent owner schemas produce useful typed behavior in declared order", () => {
  const result = matchContributions([limitEntry(), titleEntry()], contracts);
  equal(result.ok, true);
  if (!result.ok) return;
  deepEqual(result.selected.map(entry => entry.id), ["batch/capacity", "document/title"]);
  const effects = result.selected.map(({ payload }) => "text" in payload
    ? `Heading: ${payload.text.toUpperCase()}`
    : { remaining: payload.maxParallel - 1, permitted: payload.labels.includes("review") });
  deepEqual(effects, [{ remaining: 3, permitted: true }, "Heading: HELLO"]);
  deepEqual(result.omitted, []);
  const selected = result.selected.at(0)!;
  // @ts-expect-error metadata belongs to the captured decision.
  if (false) selected.revision = 9;
  // @ts-expect-error the caller must narrow the union of owner payloads.
  const wrong: Title = selected.payload;
  void wrong;
});

test("exact required revisions refuse and optional unsupported entries are explicit omissions", () => {
  const unknown = { ...titleEntry("optional/unknown"), contract: "another/point" };
  const different = { ...limitEntry(), revision: 8 };
  deepEqual(matchContributions([titleEntry(), unknown], contracts),
    { ok: false, reason: "unknown-required-contract" });
  deepEqual(matchContributions([titleEntry(), different], contracts),
    { ok: false, reason: "unsupported-required-revision" });
  let validationCount = 0;
  const observed: readonly OwnerContract<Payload>[] = contracts.map(contract => ({ ...contract,
    validate: (payload): payload is Payload => { validationCount += 1; return contract.validate(payload); },
  }));
  const result = matchContributions([
    { ...unknown, required: false, payload: { future: true } },
    titleEntry(),
    { ...different, required: false },
  ], observed);
  equal(result.ok, true);
  if (!result.ok) return;
  equal(validationCount, 1);
  deepEqual(result.selected.map(entry => entry.id), ["document/title"]);
  deepEqual(result.omitted, [
    { id: "optional/unknown", contract: "another/point", revision: 2, reason: "unknown-contract" },
    { id: "batch/capacity", contract: "runner/work-limit", revision: 8, reason: "unsupported-revision" },
  ]);
  equal(Object.isFrozen(result.omitted.at(0)), true);
});

test("optional known payloads and duplicate identities fail the entire carrier", () => {
  deepEqual(matchContributions([{ ...titleEntry(), required: false, payload: { text: 7 } }], contracts),
    { ok: false, reason: "invalid-contribution-payload" });
  deepEqual(matchContributions([titleEntry(), { ...limitEntry(), id: "document/title" }], contracts),
    { ok: false, reason: "duplicate-contribution-identity" });
  const allOptional = matchContributions([{ ...titleEntry(), required: false }], []);
  equal(allOptional.ok, true);
  if (allOptional.ok) deepEqual(allOptional.selected, []);
});

test("a rejected suffix exposes no accepted prefix or candidate effect", () => {
  const calls: string[] = [];
  const execute = (input: unknown): void => {
    const decision = matchContributions(input, contracts);
    if (!decision.ok) return;
    for (const selected of decision.selected) calls.push(selected.id);
  };
  execute([titleEntry(), { ...limitEntry(), payload: { maxParallel: -1, labels: [] } }]);
  deepEqual(calls, []);
  execute([titleEntry(), limitEntry()]);
  deepEqual(calls, ["document/title", "batch/capacity"]);
});

test("snapshots detach and freeze nested payloads before validators execute", () => {
  const input = limitEntry();
  const changed = { ...limit };
  const first: OwnerContract<Payload> = { ...title, validate: (payload): payload is Payload => {
    input.payload.labels.splice(0, 1, "mutated during validation");
    input.revision = 100;
    changed.revision = 99;
    return title.validate(payload);
  } };
  const result = matchContributions([titleEntry(), input], [first, changed]);
  equal(result.ok, true);
  if (!result.ok) return;
  deepEqual(result.selected.at(1), { id: "batch/capacity", contract: "runner/work-limit", revision: 7,
    required: true, payload: { maxParallel: 4, labels: ["review", "publish"] } });
  const payload = result.selected.at(1)!.payload;
  if (!("labels" in payload)) fail("expected the captured work limit");
  equal(Object.isFrozen(payload), true);
  equal(Object.isFrozen(payload.labels), true);
  throws(() => Object.assign(payload.labels, { 0: "late mutation" }), TypeError);
  equal(Object.isFrozen(result), true);
  equal(Object.isFrozen(result.selected), true);
});

test("owner table is captured and malformed or throwing trusted validators refuse", () => {
  deepEqual(matchContributions([titleEntry()], [title, title]),
    { ok: false, reason: "invalid-owner-contracts" });
  for (const validate of [() => { throw new Error("owner failed"); }, () => "yes", () => ({ ok: true }), () => undefined]) {
    const changed = { ...title };
    Object.defineProperty(changed, "validate", { value: validate });
    const result = matchContributions([titleEntry()], [changed]);
    deepEqual(result, { ok: false, reason: "invalid-owner-validator" });
    equal(Object.isFrozen(result), true);
  }
  const hostileMutation: OwnerContract<Title> = { ...title, validate: (payload): payload is Title => {
    if (record(payload)) payload.text = "rewritten";
    return title.validate(payload);
  } };
  deepEqual(matchContributions([titleEntry()], [hostileMutation]),
    { ok: false, reason: "invalid-owner-validator" });
});
