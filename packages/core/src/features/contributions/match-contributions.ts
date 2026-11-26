import {
  contributionLimits,
  type CompatibilityFailure,
  type CompatibilityResult,
  type OmittedContribution,
  type OwnerContract,
  type SelectedContribution,
} from "./contracts.ts";
import { metadataRecord, snapshotMetadata, type MetadataValue } from "./inert-metadata.ts";

interface Envelope {
  readonly id: string;
  readonly contract: string;
  readonly revision: number;
  readonly required: boolean;
  readonly payload: MetadataValue;
}

const identity = /^[a-z][a-z0-9]*(?:[._/-][a-z0-9]+)*$/u;
const ownerIdentity = /^[a-z][a-z0-9]*(?:[._/-][a-z0-9]+)+$/u;
const validId = (value: unknown, owner = false): value is string =>
  typeof value === "string" && value.length <= contributionLimits.identityUnits &&
  (owner ? ownerIdentity : identity).test(value);
const validRevision = (value: unknown): value is number =>
  typeof value === "number" && Number.isSafeInteger(value) && value > 0;
const refusal = (reason: CompatibilityFailure): CompatibilityResult<never> => Object.freeze({ ok: false, reason });

function captureOwners<Payload>(contracts: readonly OwnerContract<Payload>[]): ReadonlyMap<string, OwnerContract<Payload>> {
  if (!Array.isArray(contracts) || contracts.length > contributionLimits.ownerContracts) {
    throw new Error("invalid owner count");
  }
  const count = contracts.length;
  const owners = new Map<string, OwnerContract<Payload>>();
  for (let index = 0; index < count; index += 1) {
    const contract: OwnerContract<Payload> | undefined = contracts.at(index);
    if (!contract) throw new Error("invalid owner contract");
    const { id, revision, validate } = contract;
    if (!validId(id, true) || !validRevision(revision) || typeof validate !== "function" || owners.has(id)) {
      throw new Error("invalid owner contract");
    }
    owners.set(id, Object.freeze({ id, revision, validate }));
  }
  return owners;
}

function captureContributions(input: unknown): readonly Envelope[] {
  const metadata = snapshotMetadata(input);
  if (!Array.isArray(metadata) || metadata.length === 0 || metadata.length > contributionLimits.contributions) {
    throw new Error("invalid contribution count");
  }
  return metadata.map((value: MetadataValue) => {
    if (!metadataRecord(value) || Object.keys(value).sort().join(",") !== "contract,id,payload,required,revision") {
      throw new Error("invalid contribution envelope");
    }
    const { id, contract, revision, required, payload } = value;
    if (!validId(id) || !validId(contract, true) || !validRevision(revision) ||
        typeof required !== "boolean" || payload === undefined) throw new Error("invalid contribution envelope");
    return Object.freeze({ id, contract, revision, required, payload });
  });
}

/**
 * Decide the whole list before exposing any selected contribution. Only trusted
 * owner validators run; this operation never loads or invokes candidate code.
 * Compatibility establishes no artifact trust, installation, grant or effect.
 */
export function matchContributions<Payload>(
  input: unknown,
  contracts: readonly OwnerContract<Payload>[],
): CompatibilityResult<Payload> {
  let owners: ReadonlyMap<string, OwnerContract<Payload>>;
  try { owners = captureOwners(contracts); }
  catch { return refusal("invalid-owner-contracts"); }
  let entries: readonly Envelope[];
  try { entries = captureContributions(input); }
  catch { return refusal("invalid-contribution-carrier"); }
  if (new Set(entries.map(entry => entry.id)).size !== entries.length) {
    return refusal("duplicate-contribution-identity");
  }

  const selected: SelectedContribution<Payload>[] = [];
  const omitted: OmittedContribution[] = [];
  for (const entry of entries) {
    const owner = owners.get(entry.contract);
    if (!owner || owner.revision !== entry.revision) {
      if (entry.required) return refusal(owner ? "unsupported-required-revision" : "unknown-required-contract");
      omitted.push(Object.freeze({ id: entry.id, contract: entry.contract, revision: entry.revision,
        reason: owner ? "unsupported-revision" : "unknown-contract" }));
      continue;
    }
    const payload: unknown = entry.payload;
    try {
      const accepted = owner.validate(payload);
      if (accepted !== true) return refusal(accepted === false ? "invalid-contribution-payload" : "invalid-owner-validator");
      selected.push(Object.freeze({ ...entry, payload }));
    } catch { return refusal("invalid-owner-validator"); }
  }
  return Object.freeze({ ok: true, selected: Object.freeze(selected), omitted: Object.freeze(omitted) });
}
