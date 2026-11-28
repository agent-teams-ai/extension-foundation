/** The first profile is trusted, finite Node code, not a hostile-code sandbox. */
export type Sha256 = `sha256:${string}`;

export interface NativeExecutable {
  /** Caller-protected executable location; concurrent host replacement is unsupported. */
  readonly path: string;
  /** SHA-256 of the executable itself, verified against the selected release. */
  readonly digest: Sha256;
}

export interface NodeArtifactTools {
  readonly oras: NativeExecutable;
  readonly cosign: NativeExecutable;
}

export interface NodeArtifactOptions {
  readonly tools: NodeArtifactTools;
  /** Existing caller-owned directory. Each attempt owns a private child. */
  readonly stagingRoot: string;
  readonly commandTimeoutMs?: number;
}

export interface ArtifactRequest {
  /** Registry/repository only: no scheme, credentials, tag, digest or query. */
  readonly repository: string;
  readonly digest: Sha256;
  readonly transport: "https" | "loopback-http";
  readonly registryConfig?: string;
  /** A detached Sigstore bundle signing the exact OCI manifest bytes. */
  readonly signatureBundle: Uint8Array;
  readonly trustedPublisher: {
    readonly id: string;
    readonly publicKeyPem: string;
    /** SHA-256 of canonical DER SubjectPublicKeyInfo, not PEM formatting. */
    readonly keyDigest: Sha256;
  };
  readonly expected: {
    readonly target: string;
    readonly scope: string;
    readonly contract: string;
    readonly revision: number;
    readonly loader: string;
  };
}

export interface ArtifactFile {
  readonly path: string;
  readonly digest: Sha256;
  readonly size: number;
  readonly kind: "module" | "asset";
}

export interface VerifiedArtifactFacts {
  readonly repository: string;
  readonly digest: Sha256;
  readonly publisher: string;
  readonly publisherKeyDigest: Sha256;
  readonly target: string;
  readonly scope: string;
  readonly contract: string;
  readonly revision: number;
  readonly loader: string;
  readonly entry: string;
  readonly files: readonly ArtifactFile[];
  readonly signatureProfile: "cosign-direct-key";
  readonly executableProfile: "self-contained-esm-v1";
}

/** The consumer owns the known export contract and current admission decision. */
export interface ArtifactBinding<Value> {
  readonly contract: string;
  readonly revision: number;
  readonly loader: string;
  /** Synchronous admission at evaluation request, not a permanent effect grant. */
  readonly authorize: (facts: VerifiedArtifactFacts) => boolean;
  readonly validate: (exports: unknown) => exports is Value;
}

export interface EvaluatedArtifact<Value> {
  readonly value: Value;
  /** A fresh evaluation identity; distinct from artifact or runtime generation. */
  readonly evaluationId: string;
  readonly facts: VerifiedArtifactFacts;
}

export interface VerifiedNodeArtifact {
  readonly facts: VerifiedArtifactFacts;
  /** Returns a copy. Assets are inert bytes, never executable module requests. */
  readonly readAsset: (path: string) => Uint8Array;
  /** Evaluates captured bytes, never reopens a staging path. No unload claim. */
  readonly evaluate: <Value>(binding: ArtifactBinding<Value>) => Promise<EvaluatedArtifact<Value>>;
}

export interface NodeArtifactVerifier {
  readonly verify: (request: ArtifactRequest) => Promise<VerifiedNodeArtifact>;
}

export type ArtifactErrorCode =
  | "artifact.input" | "artifact.tool" | "artifact.transport" | "artifact.signature"
  | "artifact.manifest" | "artifact.identity" | "artifact.closure" | "artifact.staging"
  | "artifact.cleanup" | "artifact.binding" | "artifact.denied" | "artifact.exports";

export class ArtifactError extends Error {
  readonly code: ArtifactErrorCode;

  constructor(code: ArtifactErrorCode, message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "ArtifactError";
    this.code = code;
  }
}

/** Failed cleanup leaves an explicit caller-owned recovery location. */
export class ArtifactCleanupError extends ArtifactError {
  readonly stagingDirectory: string;
  readonly verificationError: unknown;

  constructor(directory: string, cleanupError: unknown, verificationError: unknown) {
    super("artifact.cleanup", "Artifact staging cleanup did not complete", { cause: cleanupError });
    this.stagingDirectory = directory;
    this.verificationError = verificationError;
  }
}
