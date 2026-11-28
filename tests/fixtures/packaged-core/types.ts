import type { CompatibilityResult, OwnerContract, SelectedContribution } from "@extension-foundation/core";

interface Label { readonly text: string }
interface Budget { readonly amount: number }

export function checkSelected(value: SelectedContribution<Label | Budget>): void {
  // @ts-expect-error selected contribution metadata is readonly.
  value.revision = 2;
  // @ts-expect-error an owner union does not narrow by an arbitrary string id.
  const label: Label = value.payload;
  void label;
}

export function checkResult(result: CompatibilityResult<Label>): void {
  // @ts-expect-error failed decisions expose no selected prefix.
  result.selected;
  if (result.ok) {
    // @ts-expect-error successful contribution lists are readonly.
    result.selected.push({ id: "x", contract: "owner/label", revision: 1, required: true, payload: { text: "x" } });
  }
}

export const invalid: OwnerContract<Label> = {
  id: "owner/label", revision: 1,
  // @ts-expect-error owner predicates are synchronous and cannot return promises.
  validate: async (_value: unknown) => true,
};
