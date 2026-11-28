import { matchContributions, type OwnerContract } from "@extension-foundation/core";

interface Heading { readonly text: string; readonly style: "plain" | "upper" }
const object = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const contract: OwnerContract<Heading> = {
  id: "editor/heading", revision: 3,
  validate: (value): value is Heading => object(value) && Object.keys(value).length === 2 &&
    typeof value["text"] === "string" && (value["style"] === "plain" || value["style"] === "upper"),
};
const contribution = {
  id: "document/heading", contract: "editor/heading", revision: 3, required: true,
  payload: { text: "early work", style: "upper" },
};

export function observe() {
  const optional = { id: "future/panel", contract: "presentation/panel", revision: 1,
    required: false, payload: { title: "Optional view" } };
  const matched = matchContributions([optional, contribution], [contract]);
  if (!matched.ok) throw new Error(matched.reason);
  const rendered = matched.selected.map(({ payload }) =>
    `Title: ${payload.style === "upper" ? payload.text.toUpperCase() : payload.text}`);

  let evaluated = 0;
  const rejected = matchContributions([contribution, { ...optional, required: true }], [contract]);
  if (rejected.ok) for (const _entry of rejected.selected) evaluated += 1;
  const malformed = matchContributions([{ ...contribution, required: false, payload: { text: 5, style: "upper" } }], [contract]);
  const throwing: OwnerContract<Heading> = { ...contract, validate: (_payload): _payload is Heading => {
    throw new Error("trusted owner validator failed");
  } };
  const validatorFailure = matchContributions([contribution], [throwing]);
  const retained = matched.selected[0];
  if (!retained) throw new Error("heading omitted");
  contribution.payload.text = "changed after matching";
  const mutationRefused = !Reflect.set(retained.payload, "text", "changed after validation");
  return {
    rendered,
    omitted: matched.omitted,
    requiredFailure: rejected.ok ? "unexpected-success" : rejected.reason,
    malformedFailure: malformed.ok ? "unexpected-success" : malformed.reason,
    validatorFailure: validatorFailure.ok ? "unexpected-success" : validatorFailure.reason,
    evaluatedOnRefusal: evaluated,
    retainedText: retained.payload.text,
    mutationRefused,
  };
}
