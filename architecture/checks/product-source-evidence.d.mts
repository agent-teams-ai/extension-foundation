export class ProductSourceEvidenceError extends Error {
  readonly code: string;
}

export const PRODUCT_SOURCE_PROOF_MODE: "source-custody-named-topology";
export const PRODUCT_SOURCE_PROOF_LIMITS: readonly string[];

export type ProductSourceTopologyVerificationReport =
  | {
    readonly kind: "frontend-literal-provider-list";
    readonly root: string;
    readonly factory: string;
    readonly port: string;
    readonly consumer: string;
    readonly dependency: string;
    readonly orderedProviders: readonly string[];
    readonly facadeMember: string;
  }
  | {
    readonly kind: "agent-runtime-named-calls";
    readonly root: string;
    readonly rootFactory: string;
    readonly hostFactory: string;
    readonly capabilities: readonly string[];
    readonly capabilityMembers: Readonly<Record<string, readonly string[]>>;
    readonly hostDependencies: Readonly<Record<string, readonly string[]>>;
    readonly featureFactories: readonly string[];
  }
  | {
    readonly kind: "custody-negative-search-only";
  };

export interface ProductSourceVerificationReport {
  readonly proofMode: "source-custody-named-topology";
  readonly limits: readonly string[];
  readonly product: string;
  readonly repository: string;
  readonly repositoryRoot: string;
  readonly commit: string;
  readonly tree: string;
  readonly files: readonly {
    readonly path: string;
    readonly blob: string;
    readonly symbols: readonly string[];
  }[];
  readonly negativeSearch: {
    readonly pattern: string;
    readonly paths: readonly string[];
    readonly matches: number;
  };
  readonly topology: ProductSourceTopologyVerificationReport;
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
  readonly schemaVersion: 2;
  readonly proofMode: "source-custody-named-topology";
  readonly limits: readonly string[];
  readonly status: "candidate-source-records";
  readonly declaredLimitations: readonly string[];
  readonly reports: readonly ProductSourceVerificationReport[];
}>;
