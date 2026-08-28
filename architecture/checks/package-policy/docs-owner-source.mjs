import { normalizeOwnerEvidence } from "./ownership-policy.mjs";

function ownerEvidence(document) {
  return {
    id: document.id,
    type: String(document.metadata.type ?? ""),
    status: String(document.metadata.status ?? ""),
    supersededBy: document.metadata.superseded_by,
    supersedes: document.metadata.supersedes,
    packageOwnership: document.metadata.package_ownership,
  };
}

export function ownerEvidenceFromDocsExecution(execution) {
  if (execution.envelope.outcome !== "success") {
    throw new Error("Docs Protocol could not enumerate package ownership documents");
  }
  return execution.envelope.result.documents.map(ownerEvidence);
}

export function createDocsOwnerCatalog({ loadDocuments }) {
  let documentsExecution;
  const documents = async () => {
    documentsExecution ??= loadDocuments();
    return documentsExecution;
  };
  return {
    resolve: async ownerDocumentId => {
      const allDocuments = await documents();
      const matches = allDocuments.filter(document => document.id === ownerDocumentId);
      if (matches.length !== 1) return undefined;
      return normalizeOwnerEvidence(allDocuments, matches[0]);
    },
    listEffective: async () => {
      const allDocuments = await documents();
      return allDocuments
        .map(document => normalizeOwnerEvidence(allDocuments, document))
        .filter(document => document.type === "adr"
          && document.status === "accepted"
          && document.supersededBy.length === 0);
    },
  };
}
