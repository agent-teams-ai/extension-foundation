import { deepEqual, equal, ok } from "node:assert/strict";
import test from "node:test";
import { contributionLimits, matchContributions, type OwnerContract } from "../../../src/features/contributions/index.ts";

const anything: OwnerContract<unknown> = { id: "test/value", revision: 1, validate: (_value): _value is unknown => true };
const entry = (payload: unknown, id = "test/entry") => ({
  id, contract: "test/value", revision: 1, required: true, payload,
});
const invalid = { ok: false, reason: "invalid-contribution-carrier" };

test("metadata getters and toJSON hooks are not executed", () => {
  let calls = 0;
  const getter = Object.defineProperty({}, "text", { enumerable: true, get() { calls += 1; return "executable"; } });
  const toJSON = { toJSON() { calls += 1; return "disguised"; } };
  for (const value of [getter, toJSON, Object.assign([], { extra: true }), new Date(), new Map(), /x/u]) {
    deepEqual(matchContributions([entry(value)], [anything]), invalid);
  }
  equal(calls, 0);
});

test("non-JSON values, sparse arrays, symbols and hidden properties are rejected", () => {
  const symbol = Object.fromEntries([[Symbol("hidden"), 1]]);
  const hidden = Object.defineProperty({ text: "visible" }, "secret", { value: 1, enumerable: false });
  const cycle: Record<string, unknown> = {};
  cycle.self = cycle;
  for (const value of [undefined, () => true, 1n, NaN, Infinity, symbol, hidden, cycle, new Array(2)]) {
    deepEqual(matchContributions([entry(value)], [anything]), invalid);
  }
  const input = [entry(true)];
  Object.defineProperty(input, "0", { enumerable: true, get() { throw new Error("must not execute"); } });
  deepEqual(matchContributions(input, [anything]), invalid);
});

test("the public carrier limits are exact and immutable", () => {
  deepEqual(contributionLimits, {
    contributions: 64, ownerContracts: 64, nodes: 2_048, depth: 16, textUnits: 65_536, identityUnits: 128,
  });
  equal(Object.isFrozen(contributionLimits), true);
});

test("carrier bounds cover entries, depth, total nodes, property names and text", () => {
  const sixtyFour = Array.from({ length: 64 }, (_, index) => entry(null, `test/item-${index}`));
  equal(matchContributions(sixtyFour, [anything]).ok, true);
  deepEqual(matchContributions([...sixtyFour, entry(null, "test/extra")], [anything]), invalid);
  equal(matchContributions([entry("x".repeat(60_000))], [anything]).ok, true);
  deepEqual(matchContributions([entry("x".repeat(65_536))], [anything]), invalid);
  deepEqual(matchContributions([entry(Object.fromEntries([["x".repeat(65_536), false]]))], [anything]), invalid);
  equal(matchContributions([entry(Array.from({ length: 1_000 }, () => false))], [anything]).ok, true);
  deepEqual(matchContributions([entry(Array.from({ length: 2_048 }, () => false))], [anything]), invalid);
  let nested: unknown = null;
  for (let index = 0; index < 16; index += 1) nested = [nested];
  deepEqual(matchContributions([entry(nested)], [anything]), invalid);
});

test("envelope shape and exact positive safe-integer revisions cannot be bypassed by optional", () => {
  for (const patch of [
    { id: "../escape" }, { id: "x".repeat(129) }, { contract: "unnamespaced" },
    { revision: 0 }, { revision: 1.5 }, { revision: Number.MAX_SAFE_INTEGER + 1 },
    { required: "false" }, { executable: "candidate.js" }, { validate: () => true },
  ]) deepEqual(matchContributions([{ ...entry(null), required: false, ...patch }], [anything]), invalid);
  for (const input of [null, {}, [], "[]"]) deepEqual(matchContributions(input, [anything]), invalid);
  const highest = { ...anything, revision: Number.MAX_SAFE_INTEGER };
  equal(matchContributions([{ ...entry(true), revision: Number.MAX_SAFE_INTEGER }], [highest]).ok, true);
});

test("data property names and shared subtrees stay inert and detached", () => {
  const shared = { value: "safe" };
  const value = Object.fromEntries([["__proto__", shared], ["constructor", shared], ["prototype", shared]]);
  const result = matchContributions([entry(value)], [anything]);
  equal(result.ok, true);
  if (!result.ok) return;
  deepEqual(result.selected.at(0)!.payload, Object.fromEntries(
    ["__proto__", "constructor", "prototype"].map(key => [key, { value: "safe" }]),
  ));
  shared.value = "changed";
  const payload = result.selected.at(0)!.payload;
  ok(typeof payload === "object" && payload !== null);
  equal(Object.getPrototypeOf(payload), Object.getPrototypeOf({}));
  equal(Object.hasOwn(payload, "__proto__"), true);
  const nullPrototype: unknown = Object.assign(Object.create(null), { safe: true });
  equal(matchContributions([entry(nullPrototype)], [anything]).ok, true);
});
