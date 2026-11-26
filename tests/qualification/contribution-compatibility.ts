/** TEST-only exact-revision qualification; not a published extension SPI. */
export interface OwnerContract<Payload> {
  readonly id: string;
  readonly revision: number;
  /** Trusted, synchronous owner code; never obtained from candidate metadata. */
  readonly validate: (payload: unknown) => payload is Payload;
}

export interface SelectedContribution<Payload> {
  readonly id: string;
  readonly contract: string;
  readonly revision: number;
  readonly required: boolean;
  readonly payload: Payload;
}

export interface OmittedContribution {
  readonly id: string;
  readonly contract: string;
  readonly revision: number;
  readonly reason: "unknown-contract" | "unsupported-revision";
}

export type CompatibilityFailure =
  | "invalid-owner-contracts"
  | "invalid-contribution-carrier"
  | "duplicate-contribution-identity"
  | "unknown-required-contract"
  | "unsupported-required-revision"
  | "invalid-contribution-payload"
  | "invalid-owner-validator";

export type CompatibilityResult<Payload> =
  | { readonly ok: true; readonly selected: readonly SelectedContribution<Payload>[];
    readonly omitted: readonly OmittedContribution[] }
  | { readonly ok: false; readonly reason: CompatibilityFailure };

type JsonValue = null | boolean | number | string | readonly JsonValue[] | JsonRecord;
interface JsonRecord { readonly [key: string]: JsonValue }
interface Envelope {
  readonly id: string;
  readonly contract: string;
  readonly revision: number;
  readonly required: boolean;
  readonly payload: JsonValue;
}

const identity = /^[a-z][a-z0-9]*(?:[._/-][a-z0-9]+)*$/u;
const namespacedIdentity = /^[a-z][a-z0-9]*(?:[._/-][a-z0-9]+)+$/u;
const validId = (value: unknown, namespaced = false): value is string =>
  typeof value === "string" && value.length <= 128 &&
  (namespaced ? namespacedIdentity : identity).test(value);
const validRevision = (value: unknown): value is number =>
  typeof value === "number" && Number.isSafeInteger(value) && value > 0;
const record = (value: unknown): value is JsonRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * Snapshot JSON metadata before trusted validators run. Accessors, executable
 * values, exotic objects, cycles and oversized carriers are not metadata.
 * The Host supplies decoded inert data; this is not hostile JS containment.
 */
function snapshot(value: unknown): JsonValue {
  const ancestors = new Set<object>();
  let nodes = 2_048;
  let textUnits = 64 * 1_024;
  const accountText = (text: string): string => {
    textUnits -= text.length;
    if (textUnits < 0) throw new Error("metadata text limit");
    return text;
  };
  function visit(input: unknown, depth: number): JsonValue {
    if (--nodes < 0 || depth > 16) throw new Error("metadata shape limit");
    if (input === null || typeof input === "boolean") return input;
    if (typeof input === "string") return accountText(input);
    if (typeof input === "number" && Number.isFinite(input)) return input;
    if (typeof input !== "object" || ancestors.has(input)) throw new Error("non-JSON metadata");
    const array = Array.isArray(input);
    const prototype: unknown = Object.getPrototypeOf(input);
    if (prototype !== (array ? Array.prototype : Object.prototype) && (array || prototype !== null)) {
      throw new Error("non-JSON prototype");
    }
    if (Object.getOwnPropertySymbols(input).length !== 0) throw new Error("symbol metadata");
    const descriptors = Object.getOwnPropertyDescriptors(input);
    ancestors.add(input);
    let result: JsonValue;
    if (array) {
      const length: unknown = descriptors["length"]?.value;
      if (typeof length !== "number" || length > nodes || Object.keys(descriptors).length !== length + 1) {
        throw new Error("non-JSON array");
      }
      const items: JsonValue[] = [];
      for (let i = 0; i < length; i += 1) {
        const item = descriptors[String(i)];
        if (!item?.enumerable || !("value" in item)) throw new Error("non-JSON array item");
        items.push(visit(item.value, depth + 1));
      }
      result = Object.freeze(items);
    } else {
      result = Object.freeze(Object.fromEntries(Object.entries(descriptors).map(([key, descriptor]) => {
        if (!descriptor.enumerable || !("value" in descriptor)) throw new Error("non-JSON property");
        return [accountText(key), visit(descriptor.value, depth + 1)] as const;
      })));
    }
    ancestors.delete(input);
    return result;
  }
  return visit(value, 0);
}

function envelopes(input: unknown): readonly Envelope[] {
  const detached = snapshot(input);
  if (!Array.isArray(detached) || detached.length === 0 || detached.length > 64) {
    throw new Error("invalid contribution count");
  }
  return detached.map((value: JsonValue) => {
    if (!record(value) || Object.keys(value).sort().join(",") !== "contract,id,payload,required,revision") {
      throw new Error("invalid contribution envelope");
    }
    const { id, contract, revision, required, payload } = value;
    if (!validId(id) || !validId(contract, true) || !validRevision(revision) ||
        typeof required !== "boolean" || payload === undefined) throw new Error("invalid contribution envelope");
    return { id, contract, revision, required, payload };
  });
}

/** Selection never loads candidate code, grants authority or invokes a contribution. */
export function matchContributions<Payload>(
  input: unknown,
  contracts: readonly OwnerContract<Payload>[],
): CompatibilityResult<Payload> {
  const owners = new Map<string, OwnerContract<Payload>>();
  try {
    if (!Array.isArray(contracts) || contracts.length > 64) throw new Error("invalid owner count");
    for (const contract of contracts) {
      const { id, revision, validate } = contract;
      if (!validId(id, true) || !validRevision(revision) || typeof validate !== "function" || owners.has(id)) {
        throw new Error("invalid owner contract");
      }
      // Bind the complete trusted table before a validator can mutate its input.
      owners.set(id, Object.freeze({ id, revision, validate }));
    }
  } catch { return { ok: false, reason: "invalid-owner-contracts" }; }
  let entries: readonly Envelope[];
  try { entries = envelopes(input); }
  catch { return { ok: false, reason: "invalid-contribution-carrier" }; }
  if (new Set(entries.map(entry => entry.id)).size !== entries.length) {
    return { ok: false, reason: "duplicate-contribution-identity" };
  }
  const selected: SelectedContribution<Payload>[] = [];
  const omitted: OmittedContribution[] = [];
  for (const entry of entries) {
    const owner = owners.get(entry.contract);
    if (!owner || owner.revision !== entry.revision) {
      if (entry.required) return { ok: false, reason: owner ? "unsupported-required-revision" : "unknown-required-contract" };
      omitted.push(Object.freeze({ id: entry.id, contract: entry.contract, revision: entry.revision,
        reason: owner ? "unsupported-revision" : "unknown-contract" }));
      continue;
    }
    const payload: unknown = entry.payload;
    try {
      const accepted = owner.validate(payload);
      if (accepted === true) {
        // The predicate narrows the same frozen payload that the owner validated.
        selected.push(Object.freeze({ ...entry, payload }));
      } else {
        return { ok: false, reason: accepted === false ? "invalid-contribution-payload" : "invalid-owner-validator" };
      }
    } catch { return { ok: false, reason: "invalid-owner-validator" }; }
  }
  return Object.freeze({ ok: true, selected: Object.freeze(selected), omitted: Object.freeze(omitted) });
}
