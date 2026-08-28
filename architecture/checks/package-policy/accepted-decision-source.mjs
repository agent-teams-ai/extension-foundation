import {
  acceptedDecisionEntries,
  authoritativeDecisionStatuses,
} from "./accepted-decision-policy.mjs";

export function createAcceptedDecisionSource({
  loadLedger,
  loadDecisionIndex,
  assertGovernance,
}) {
  const authorityExecutions = new Map();
  const loadEntries = async root => acceptedDecisionEntries(await loadLedger(root));
  const loadStatuses = async root => authoritativeDecisionStatuses(await loadDecisionIndex(root));
  return {
    loadEntries,
    loadIds: async root => new Set((await loadEntries(root)).keys()),
    loadAuthority: root => {
      if (!authorityExecutions.has(root)) authorityExecutions.set(root, (async () => {
        const results = await Promise.allSettled([
          loadStatuses(root),
          assertGovernance(root),
          loadEntries(root),
        ]);
        for (const result of results) {
          if (result.status === "rejected") throw result.reason;
        }
        return {
          authoritativeStatuses: results[0].value,
          acceptedEntries: results[2].value,
        };
      })());
      return authorityExecutions.get(root);
    },
  };
}
