export class ProductSourceEvidenceError extends Error {
  constructor(code: string, message: string);
  readonly code: string;
}

export const PRODUCT_SOURCE_PROOF_MODE: "exact-git-source-custody";
export const PRODUCT_SOURCE_CLAIM_KIND: "exact-git-source-custody";
export const PRODUCT_SOURCE_VERIFICATION_AUTHORITY: "local-git-object-custody-verifier";
export const PRODUCT_SOURCE_PROOF_LIMITS: readonly string[];

export interface ProductSourceVerificationReport {
  readonly proofMode: "exact-git-source-custody";
  readonly limits: readonly string[];
  readonly product: string;
  readonly repository: string;
  readonly repositoryRoot: string;
  readonly commit: string;
  readonly tree: string;
  readonly files: readonly { readonly path: string; readonly blob: string; readonly bytes: number }[];
  readonly totalBlobBytes: number;
}

export function verifyProductSourceRecord(
  product: string,
  record: unknown,
  repositoryRoot: string,
): Promise<ProductSourceVerificationReport>;

export function verifyProductSourceEvidence(
  evidence: unknown,
  repositoryRoots: Readonly<Record<string, string>>,
): Promise<{
  readonly schemaVersion: 3;
  readonly proofMode: "exact-git-source-custody";
  readonly claimKind: "exact-git-source-custody";
  readonly limits: readonly string[];
  readonly status: "candidate-source-records";
  readonly verificationAuthority: "local-git-object-custody-verifier";
  readonly promotionAuthority: false;
  readonly reports: readonly ProductSourceVerificationReport[];
}>;
