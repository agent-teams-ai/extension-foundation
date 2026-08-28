import { OWNER_DOCUMENT, hasExactKeys } from "./catalog-policy.mjs";

export const ACCEPTED_DECISION_LEDGER_PATH = "architecture/decisions/accepted-decisions.json";
export const DECISION_INDEX_PATH = "docs/decisions/README.md";

export function acceptedDecisionEntries(ledger) {
  if (!hasExactKeys(ledger, ["algorithm", "decisions", "schemaVersion"])
    || ledger.schemaVersion !== 1
    || ledger.algorithm !== "sha256"
    || !Array.isArray(ledger.decisions)) {
    throw new Error(`${ACCEPTED_DECISION_LEDGER_PATH}: invalid accepted-decision ledger`);
  }
  const entries = new Map();
  for (const decision of ledger.decisions) {
    if (!hasExactKeys(decision, ["id", "immutableDigest", "path"])
      || !OWNER_DOCUMENT.test(decision.id ?? "")
      || typeof decision.path !== "string"
      || typeof decision.immutableDigest !== "string"
      || !/^sha256:[0-9a-f]{64}$/.test(decision.immutableDigest)
      || entries.has(decision.id)) {
      throw new Error(`${ACCEPTED_DECISION_LEDGER_PATH}: invalid or duplicate decision entry`);
    }
    entries.set(decision.id, Object.freeze({
      immutableDigest: decision.immutableDigest,
      path: decision.path,
    }));
  }
  return entries;
}

export function authoritativeDecisionStatuses(contents) {
  const normalized = contents.replace(/\r\n?/g, "\n");
  const statuses = new Map();
  const sections = [...normalized.matchAll(/^## (Proposed|Accepted|Superseded) decisions\s*$([\s\S]*?)(?=^## |(?![\s\S]))/gmi)];
  const lifecycleSectionCounts = new Map([
    ["proposed", 0],
    ["accepted", 0],
    ["superseded", 0],
  ]);
  for (const section of sections) {
    const status = section[1].toLowerCase();
    lifecycleSectionCounts.set(status, (lifecycleSectionCounts.get(status) ?? 0) + 1);
  }
  if (sections.length !== 3
    || [...lifecycleSectionCounts.values()].some(count => count !== 1)) {
    throw new Error(`${DECISION_INDEX_PATH}: requires exactly one proposed, accepted, and superseded section`);
  }
  for (const section of sections) {
    const status = section[1].toLowerCase();
    for (const match of section[2].matchAll(/^- \[(ADR-[0-9]{4}):[^\]]+\]\([^)]+\)$/gm)) {
      if (statuses.has(match[1])) throw new Error(`${DECISION_INDEX_PATH}: duplicate decision ${match[1]}`);
      statuses.set(match[1], status);
    }
  }
  return statuses;
}

export function statusCrossChecksWithAcceptedLedger(document, acceptedDecisions, authoritativeStatuses) {
  const metadata = document.metadata ?? document;
  if (metadata.type !== "adr") return true;
  const status = String(metadata.status ?? "");
  const recordedAsAccepted = acceptedDecisions.has(document.id);
  const acceptedEntry = acceptedDecisions instanceof Map
    ? acceptedDecisions.get(document.id)
    : undefined;
  const immutablePathMatches = acceptedEntry === undefined
    || acceptedEntry.path === document.repositoryPath;
  const acceptedHistoryMatches = ["accepted", "superseded"].includes(status)
    ? recordedAsAccepted
    : status === "proposed" && !recordedAsAccepted;
  return immutablePathMatches
    && acceptedHistoryMatches
    && (authoritativeStatuses === undefined || authoritativeStatuses.get(document.id) === status);
}

export function isEffectiveAcceptedDecision(document, expectedId) {
  return document?.id === expectedId
    && document.type === "adr"
    && document.status === "accepted"
    && document.supersededBy?.length === 0;
}
