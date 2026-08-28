export class ProductSourceEvidenceError extends Error {
  readonly code: string;
}

export type ProductSourceCompositionVerificationReport =
  | {
    readonly kind: "ordered-contributions";
    readonly root: string;
    readonly factory: string;
    readonly port: string;
    readonly consumer: string;
    readonly dependency: string;
    readonly orderedProviders: readonly string[];
  }
  | {
    readonly kind: "product-capability-root";
    readonly root: string;
    readonly rootFactory: string;
    readonly hostFactory: string;
    readonly contract: string;
    readonly capabilities: readonly string[];
    readonly featureFactories: readonly string[];
  };

export interface ProductSourceVerificationReport {
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
  readonly composition?: ProductSourceCompositionVerificationReport;
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
  readonly status: string;
  readonly reports: readonly ProductSourceVerificationReport[];
}>;
