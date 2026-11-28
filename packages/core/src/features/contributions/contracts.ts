/** The extension-point owner supplies this trusted synchronous predicate. */
export interface OwnerContract<Payload> {
  readonly id: string;
  readonly revision: number;
  readonly validate: (payload: unknown) => payload is Payload;
}

/** The payload is the detached, recursively frozen value the owner validated. */
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
  | {
    readonly ok: true;
    readonly selected: readonly SelectedContribution<Payload>[];
    readonly omitted: readonly OmittedContribution[];
  }
  | { readonly ok: false; readonly reason: CompatibilityFailure };

/** Bounds apply to the entire decoded contribution list, including envelope keys. */
export const contributionLimits = Object.freeze({
  contributions: 64,
  ownerContracts: 64,
  nodes: 2_048,
  depth: 16,
  textUnits: 65_536,
  identityUnits: 128,
});
