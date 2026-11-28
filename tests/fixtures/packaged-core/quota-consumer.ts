import { matchContributions, type OwnerContract } from "@extension-foundation/core";

interface Quota {
  readonly capacity: number;
  readonly queues: readonly string[];
}
const object = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const contract: OwnerContract<Quota> = {
  id: "scheduler/quota", revision: 5,
  validate: (value): value is Quota => object(value) && Object.keys(value).length === 2 &&
    typeof value["capacity"] === "number" && Number.isInteger(value["capacity"]) && value["capacity"] > 0 &&
    Array.isArray(value["queues"]) && value["queues"].every(queue => typeof queue === "string"),
};
const contribution = {
  id: "account/review-budget", contract: "scheduler/quota", revision: 5, required: true,
  payload: { capacity: 8, queues: ["review", "export"] },
};

export function observe() {
  const matched = matchContributions([contribution], [contract]);
  if (!matched.ok) throw new Error(matched.reason);
  const selected = matched.selected[0];
  if (!selected) throw new Error("quota omitted");
  const admission = { queue: "review", occupied: 3 };
  const outcome = {
    allowed: selected.payload.queues.includes(admission.queue) && admission.occupied < selected.payload.capacity,
    free: selected.payload.capacity - admission.occupied,
  };
  const incompatible = { ...contribution, revision: 6 };
  const refused = matchContributions([incompatible], [contract]);
  const omitted = matchContributions([{ ...incompatible, required: false }], [contract]);
  let effects = 0;
  if (refused.ok) effects += 1;
  contribution.payload.queues.push("privileged");
  return {
    outcome,
    incompatible: refused.ok ? "unexpected-success" : refused.reason,
    optional: omitted.ok ? omitted.omitted : omitted.reason,
    effectsOnRefusal: effects,
    queues: selected.payload.queues,
    frozenQueues: Object.isFrozen(selected.payload.queues),
  };
}
