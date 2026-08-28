import {
  OWNER_DOCUMENT,
  PACKAGE_ID,
  encodedPackageId,
  hasExactKeys,
} from "./catalog-policy.mjs";

export const FOUNDATION_REPOSITORY = "agent-teams-ai/extension-foundation";
export const PACKAGE_ADMISSION_DIRECTORY = "architecture/package-admissions";
export const ADMISSION_KEYS = Object.freeze([
  "admission_basis",
  "schema_version",
  "conformance_version",
  "consumer_evidence",
  "extraction_decision",
  "neutrality_claim",
  "owner_repository",
  "package_id",
  "release_policy",
  "semantic_classification",
  "semantic_extraction_decision",
]);
export const CONSUMER_EVIDENCE_KEYS = Object.freeze([
  "conformance_result",
  "consumer_id",
  "consumer_repository",
  "evidence_kind",
  "evidence_reference",
  "implementation_id",
  "source_revision",
]);
export const REQUIRED_EVIDENCE_KINDS = Object.freeze([
  "product-slice",
  "independent-conformance",
]);
export const ADMISSION_BASES = Object.freeze([
  "independent-deployment-or-isolation",
  "independent-replacement-or-release-lifecycle",
  "public-spi",
  "second-real-consumer",
]);
export const SEMANTIC_CLASSIFICATIONS = Object.freeze([
  "ordinary-library",
  "foundation-module-semantics",
]);
export const REPOSITORY_ID = /^[a-z0-9][a-z0-9_.-]*\/[a-z0-9][a-z0-9_.-]*$/;
export const SOURCE_REVISION = /^[0-9a-f]{40}$/;
export const CONFORMANCE_VERSION = /^(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)(?:-(?:(?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*)(?:\.(?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*))*))?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$(?![\s\S])/;
export const EVIDENCE_DIGEST = /^sha256=[0-9a-f]{64}$/;

export function packageAdmissionPath(entry) {
  return `${PACKAGE_ADMISSION_DIRECTORY}/${encodedPackageId(entry)}.json`;
}

function canonicalRepositoryId(value) {
  return typeof value === "string" ? value.toLowerCase() : "";
}

function isCanonicalRepositoryId(value) {
  if (typeof value !== "string" || /[\u0000-\u001f\u007f]/u.test(value) || !REPOSITORY_ID.test(value)) return false;
  return value.split("/").every(segment => !segment.endsWith(".") && !segment.endsWith(".git"));
}

function canonicalEvidenceReference(value) {
  if (typeof value !== "string") return undefined;
  const fragmentIndex = value.indexOf("#");
  if (fragmentIndex !== value.lastIndexOf("#")) return undefined;
  const digest = value.slice(fragmentIndex + 1);
  if (fragmentIndex <= 0 || !EVIDENCE_DIGEST.test(digest)) return undefined;
  const location = value.slice(0, fragmentIndex);
  if (/[\u0000-\u001f\u007f]/u.test(location)) return undefined;
  if (location.startsWith("docs/")) {
    const segments = location.split("/");
    const valid = segments.length > 1
      && segments.every(segment => segment.length > 0 && segment !== "." && segment !== "..")
      && !location.includes("\\")
      && !location.includes("%")
      && !location.includes("?");
    return valid ? { reference: value, location, digest } : undefined;
  }
  try {
    const url = new URL(location);
    if (url.protocol !== "https:" || url.username !== "" || url.password !== "" || url.hash !== "") return undefined;
    return { reference: `${url.href}#${digest}`, location: url.href, digest };
  } catch {
    return undefined;
  }
}

export function validateAdmission(entry, admission, errors) {
  if (!hasExactKeys(admission, ADMISSION_KEYS)) {
    errors.push(`${entry.id}: admission must contain exactly ${ADMISSION_KEYS.join(", ")}`);
    return;
  }
  if (admission.schema_version !== 4) {
    errors.push(`${entry.id}: admission.schema_version must equal 4`);
  }
  for (const key of ADMISSION_KEYS.filter(key => !["consumer_evidence", "schema_version"].includes(key))) {
    if (typeof admission[key] !== "string" || admission[key].length === 0) {
      errors.push(`${entry.id}: admission.${key} must be a non-empty string`);
    }
  }
  if (!isCanonicalRepositoryId(admission.owner_repository)) {
    errors.push(`${entry.id}: admission.owner_repository must be a canonical lowercase owner/repository identity`);
  } else if (admission.owner_repository !== FOUNDATION_REPOSITORY) {
    errors.push(`${entry.id}: admission.owner_repository must identify ${FOUNDATION_REPOSITORY}`);
  }
  if (admission.package_id !== entry.id) {
    errors.push(`${entry.id}: admission.package_id must equal the catalog package id`);
  }
  if (admission.extraction_decision !== entry.owner_document) {
    errors.push(`${entry.id}: admission.extraction_decision must equal the accepted owner_document`);
  }
  if (!SEMANTIC_CLASSIFICATIONS.includes(admission.semantic_classification)) {
    errors.push(`${entry.id}: admission.semantic_classification must identify ordinary-library or foundation-module-semantics`);
  } else if (admission.semantic_classification === "ordinary-library") {
    if (admission.semantic_extraction_decision !== "not-applicable") {
      errors.push(`${entry.id}: ordinary-library admission must mark semantic extraction not-applicable`);
    }
  } else if (!OWNER_DOCUMENT.test(admission.semantic_extraction_decision)) {
    errors.push(`${entry.id}: foundation-module-semantics admission must bind an ADR semantic extraction decision`);
  } else if (admission.semantic_extraction_decision === entry.owner_document) {
    errors.push(`${entry.id}: semantic extraction decision must be separate from the package owner decision`);
  }
  if (!CONFORMANCE_VERSION.test(admission.conformance_version ?? "")) {
    errors.push(`${entry.id}: admission.conformance_version must be an exact SemVer`);
  }
  if (!ADMISSION_BASES.includes(admission.admission_basis)) {
    errors.push(`${entry.id}: admission.admission_basis must identify one ADR-0013 package-admission basis`);
  }
  if (!Array.isArray(admission.consumer_evidence)) {
    errors.push(`${entry.id}: admission.consumer_evidence must be an array`);
    return;
  }
  const requiresTwoRecords = admission.admission_basis === "second-real-consumer"
    || admission.admission_basis === "public-spi";
  if (admission.consumer_evidence.length < (requiresTwoRecords ? 2 : 1)) {
    errors.push(requiresTwoRecords
      ? `${entry.id}: ${admission.admission_basis} admission requires at least two evidence records`
      : `${entry.id}: ${admission.admission_basis} admission requires at least one evidence record`);
    return;
  }
  const consumerIdentities = new Set();
  const implementationIdentities = new Set();
  const evidenceKinds = new Set();
  const evidenceReferences = new Set();
  const evidenceLocations = new Set();
  const evidenceDigests = new Set();
  for (const [index, evidence] of admission.consumer_evidence.entries()) {
    if (!hasExactKeys(evidence, CONSUMER_EVIDENCE_KEYS)) {
      errors.push(`${entry.id}: consumer_evidence[${index}] must contain exactly ${CONSUMER_EVIDENCE_KEYS.join(", ")}`);
      continue;
    }
    if (CONSUMER_EVIDENCE_KEYS.some(key => typeof evidence[key] !== "string" || evidence[key].length === 0)) {
      errors.push(`${entry.id}: consumer_evidence[${index}] fields must be non-empty strings`);
      continue;
    }
    if (!PACKAGE_ID.test(evidence.consumer_id)) {
      errors.push(`${entry.id}: consumer_evidence[${index}].consumer_id is invalid`);
    }
    if (!PACKAGE_ID.test(evidence.implementation_id)) {
      errors.push(`${entry.id}: consumer_evidence[${index}].implementation_id is invalid`);
    }
    if (!isCanonicalRepositoryId(evidence.consumer_repository)) {
      errors.push(`${entry.id}: consumer_evidence[${index}].consumer_repository must be a canonical lowercase owner/repository identity`);
    }
    if (!SOURCE_REVISION.test(evidence.source_revision)) {
      errors.push(`${entry.id}: consumer_evidence[${index}].source_revision must be an exact commit`);
    }
    if (evidence.conformance_result !== "passed") {
      errors.push(`${entry.id}: consumer_evidence[${index}].conformance_result must be passed`);
    }
    if (!REQUIRED_EVIDENCE_KINDS.includes(evidence.evidence_kind)) {
      errors.push(`${entry.id}: consumer_evidence[${index}].evidence_kind must identify product-slice or independent-conformance`);
    } else {
      evidenceKinds.add(evidence.evidence_kind);
    }
    const canonicalEvidence = canonicalEvidenceReference(evidence.evidence_reference);
    if (!canonicalEvidence) {
      errors.push(`${entry.id}: consumer_evidence[${index}].evidence_reference must use a contained docs path or HTTPS URL with a sha256 fragment`);
      evidenceReferences.add(`invalid-reference:${index}`);
      evidenceLocations.add(`invalid-location:${index}`);
      evidenceDigests.add(`invalid-digest:${index}`);
    } else {
      evidenceReferences.add(canonicalEvidence.reference);
      evidenceLocations.add(canonicalEvidence.location);
      evidenceDigests.add(canonicalEvidence.digest);
    }
    const repository = canonicalRepositoryId(evidence.consumer_repository);
    consumerIdentities.add(`${repository}\0${evidence.consumer_id}`);
    implementationIdentities.add(`${repository}\0${evidence.implementation_id}`);
  }
  if (evidenceReferences.size !== admission.consumer_evidence.length
    || evidenceLocations.size !== admission.consumer_evidence.length
    || evidenceDigests.size !== admission.consumer_evidence.length) {
    errors.push(`${entry.id}: evidence must use distinct immutable references`);
  }
  if (admission.admission_basis === "public-spi"
    && REQUIRED_EVIDENCE_KINDS.some(kind => !evidenceKinds.has(kind))) {
    errors.push(`${entry.id}: admission requires product-slice and independent-conformance evidence roles`);
  }
  if (admission.admission_basis === "second-real-consumer"
    && (consumerIdentities.size < 2 || consumerIdentities.size !== admission.consumer_evidence.length)) {
    errors.push(`${entry.id}: second-real-consumer admission requires two distinct consumer identities`);
  }
  if (admission.admission_basis === "public-spi"
    && (implementationIdentities.size < 2 || implementationIdentities.size !== admission.consumer_evidence.length)) {
    errors.push(`${entry.id}: public-spi admission requires two independently authored implementation identities`);
  }
  if (admission.semantic_classification === "foundation-module-semantics") {
    if (consumerIdentities.size < 2 || consumerIdentities.size !== admission.consumer_evidence.length) {
      errors.push(`${entry.id}: foundation-module-semantics admission requires two distinct consumer identities`);
    }
    if (implementationIdentities.size < 2 || implementationIdentities.size !== admission.consumer_evidence.length) {
      errors.push(`${entry.id}: foundation-module-semantics admission requires two independently authored implementation identities`);
    }
    if (REQUIRED_EVIDENCE_KINDS.some(kind => !evidenceKinds.has(kind))) {
      errors.push(`${entry.id}: foundation-module-semantics admission requires product-slice and independent-conformance evidence roles`);
    }
  }
}

export function packageAdmissionGateId(admission) {
  return admission?.semantic_classification === "foundation-module-semantics"
    ? "phase-3-module-semantic-package-admission"
    : "phase-3-package-admission";
}

export function packagePublicationGateId(admission) {
  return admission?.semantic_classification === "foundation-module-semantics"
    ? "phase-3-module-semantic-package-publication"
    : "phase-3-package-publication";
}

export function packageAdmissionVerificationRequest(entry, admission, admissionRecordDigest) {
  if (!entry || admission?.package_id !== entry.id || !/^sha256:[0-9a-f]{64}$/.test(admissionRecordDigest ?? "")) {
    throw new Error(`${entry?.id ?? "unknown-package"}: cannot construct a bound admission verification request`);
  }
  return Object.freeze({
    packageId: entry.id,
    admissionRecordDigest,
    requiredGateId: packageAdmissionGateId(admission),
  });
}

export function admissionVerificationReceiptMatches(request, receipt) {
  return hasExactKeys(receipt, ["admissionRecordDigest", "outcome", "packageId", "requiredGateId"])
    && receipt.packageId === request.packageId
    && receipt.admissionRecordDigest === request.admissionRecordDigest
    && receipt.requiredGateId === request.requiredGateId
    && receipt.outcome === "satisfied";
}
