import { normalizeOwnerEvidence } from "./ownership-policy.mjs";
import { statusCrossChecksWithAcceptedLedger } from "./accepted-decision-policy.mjs";

function ownerEvidence(document) {
  return {
    id: document.id,
    type: String(document.metadata.type ?? ""),
    status: String(document.metadata.status ?? ""),
    supersededBy: document.metadata.superseded_by,
    supersedes: document.metadata.supersedes,
    packageOwnership: document.metadata.package_ownership,
    repositoryPath: document.repositoryPath,
  };
}

export function ownerEvidenceFromDocsExecution(execution) {
  if (execution.envelope.outcome !== "success") {
    throw new Error("Docs Protocol could not enumerate package ownership documents");
  }
  return execution.envelope.result.documents.map(ownerEvidence);
}

export function createDocsOwnerCatalog({ loadDocuments, loadAcceptedDecisionAuthority }) {
  let authoritySnapshotExecution;
  const authoritySnapshot = async () => {
    authoritySnapshotExecution ??= (async () => {
      const [documents, authority] = await Promise.allSettled([
        loadDocuments(),
        loadAcceptedDecisionAuthority?.(),
      ]);
      if (authority.status === "rejected") throw authority.reason;
      if (documents.status === "rejected") throw documents.reason;
      return { documents: documents.value, authority: authority.value };
    })();
    return authoritySnapshotExecution;
  };
  return {
    resolve: async ownerDocumentId => {
      const { documents: allDocuments, authority } = await authoritySnapshot();
      const matches = allDocuments.filter(document => document.id === ownerDocumentId);
      if (matches.length !== 1
        || (authority !== undefined && !statusCrossChecksWithAcceptedLedger(
          matches[0],
          authority.acceptedEntries,
          authority.authoritativeStatuses,
        ))) return undefined;
      return normalizeOwnerEvidence(allDocuments, matches[0]);
    },
    listEffective: async () => {
      const { documents: allDocuments, authority } = await authoritySnapshot();
      return allDocuments
        .filter(document => authority === undefined || statusCrossChecksWithAcceptedLedger(
          document,
          authority.acceptedEntries,
          authority.authoritativeStatuses,
        ))
        .map(document => normalizeOwnerEvidence(allDocuments, document))
        .filter(document => document.type === "adr"
          && document.status === "accepted"
          && document.supersededBy.length === 0);
    },
  };
}
