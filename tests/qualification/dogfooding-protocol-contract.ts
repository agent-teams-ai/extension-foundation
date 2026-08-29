declare const qualificationBrand: unique symbol;
type Branded<Value, Name extends string> = Value & { readonly [qualificationBrand]: Name };
export type EventId = Branded<string, "EventId">;
export type ProtocolRevisionId = Branded<string, "ProtocolRevisionId">;
export type CustodyAuthorityId = Branded<string, "CustodyAuthorityId">;
export type SourceClaimFamilyId = Branded<string, "SourceClaimFamilyId">;
export type SourceFamilyRootId = Branded<string, "SourceFamilyRootId">;
export type SourceSlotId = Branded<string, "SourceSlotId">;
export type AuthorizationId = Branded<string, "AuthorizationId">;
export type AttemptId = Branded<string, "AttemptId">;
export type RuntimeId = Branded<string, "RuntimeId">;
export type CheckpointId = Branded<string, "CheckpointId">;
export type ReceiptId = Branded<string, "ReceiptId">;
export type BuildAttemptId = Branded<string, "BuildAttemptId">;
export type BuildReceiptId = Branded<string, "BuildReceiptId">;
export type ConsistencyReceiptId = Branded<string, "ConsistencyReceiptId">;
export type RetirementOwnerId = Branded<string, "RetirementOwnerId">;
export type CredentialLineageId = Branded<string, "CredentialLineageId">;
export type AdmissionId = Branded<string, "AdmissionId">;
export type ArtifactDigest = Branded<string, "ArtifactDigest">;
export type ProofId = Branded<string, "ProofId">;
export type TombstoneId = Branded<string, "TombstoneId">;
export type AuthoritativeTick = Branded<number, "AuthoritativeTick">;
export type FenceGeneration = Branded<number, "FenceGeneration">;
function validatedBrand<Value extends string | number, Result extends Branded<Value, string>>(
  name: string, value: Value, valid: (candidate: Value) => boolean, expectation: string,
): Result {
  if (!valid(value)) {
    throw new TypeError(`Invalid ${name}: expected ${expectation}.`);
  }
  // The sole assertion in this contract is the boundary from validated primitives to opaque values.
  return value as unknown as Result;
}
const nonEmpty = (value: string): boolean => value.length > 0;
const ordinal = (value: number): boolean => Number.isSafeInteger(value) && value >= 0;
export const eventId = (value: string): EventId => validatedBrand("EventId", value, nonEmpty, "a non-empty string");
export const protocolRevisionId = (value: string): ProtocolRevisionId => validatedBrand("ProtocolRevisionId", value, nonEmpty, "a non-empty string");
export const custodyAuthorityId = (value: string): CustodyAuthorityId => validatedBrand("CustodyAuthorityId", value, nonEmpty, "a non-empty string");
export const sourceClaimFamilyId = (value: string): SourceClaimFamilyId => validatedBrand("SourceClaimFamilyId", value, nonEmpty, "a non-empty string");
export const sourceFamilyRootId = (value: string): SourceFamilyRootId => validatedBrand("SourceFamilyRootId", value, nonEmpty, "a non-empty string");
export const sourceSlotId = (value: string): SourceSlotId => validatedBrand("SourceSlotId", value, nonEmpty, "a non-empty string");
export const authorizationId = (value: string): AuthorizationId => validatedBrand("AuthorizationId", value, nonEmpty, "a non-empty string");
export const attemptId = (value: string): AttemptId => validatedBrand("AttemptId", value, nonEmpty, "a non-empty string");
export const runtimeId = (value: string): RuntimeId => validatedBrand("RuntimeId", value, nonEmpty, "a non-empty string");
export const checkpointId = (value: string): CheckpointId => validatedBrand("CheckpointId", value, nonEmpty, "a non-empty string");
export const receiptId = (value: string): ReceiptId => validatedBrand("ReceiptId", value, nonEmpty, "a non-empty string");
export const buildAttemptId = (value: string): BuildAttemptId => validatedBrand("BuildAttemptId", value, nonEmpty, "a non-empty string");
export const buildReceiptId = (value: string): BuildReceiptId => validatedBrand("BuildReceiptId", value, nonEmpty, "a non-empty string");
export const consistencyReceiptId = (value: string): ConsistencyReceiptId => validatedBrand("ConsistencyReceiptId", value, nonEmpty, "a non-empty string");
export const retirementOwnerId = (value: string): RetirementOwnerId => validatedBrand("RetirementOwnerId", value, nonEmpty, "a non-empty string");
export const credentialLineageId = (value: string): CredentialLineageId => validatedBrand("CredentialLineageId", value, nonEmpty, "a non-empty string");
export const admissionId = (value: string): AdmissionId => validatedBrand("AdmissionId", value, nonEmpty, "a non-empty string");
export const artifactDigest = (value: string): ArtifactDigest => validatedBrand("ArtifactDigest", value, nonEmpty, "a non-empty string");
export const proofId = (value: string): ProofId => validatedBrand("ProofId", value, nonEmpty, "a non-empty string");
export const tombstoneId = (value: string): TombstoneId => validatedBrand("TombstoneId", value, nonEmpty, "a non-empty string");
export const authoritativeTick = (value: number): AuthoritativeTick => validatedBrand("AuthoritativeTick", value, ordinal, "a non-negative safe integer");
export const fenceGeneration = (value: number): FenceGeneration => validatedBrand("FenceGeneration", value, ordinal, "a non-negative safe integer");
export interface EventEnvelope {
  readonly eventId: EventId;
  readonly protocolRevisionId: ProtocolRevisionId;
  readonly custodyAuthorityId: CustodyAuthorityId;
  readonly authoritativeTick: AuthoritativeTick;
  readonly authenticatedPredecessorId: EventId | null;
}
export interface RegisterProtocol extends EventEnvelope {
  readonly type: "RegisterProtocol";
  readonly sourceClaimFamilyId: SourceClaimFamilyId;
  readonly sourceFamilyRootId: SourceFamilyRootId;
  readonly sourceSlotId: SourceSlotId;
  readonly attemptId: AttemptId;
  readonly runtimeId: RuntimeId;
  readonly checkpointId: CheckpointId;
  readonly buildAttemptId: BuildAttemptId;
  readonly retirementOwnerId: RetirementOwnerId;
  readonly credentialLineageId: CredentialLineageId;
  readonly admissionId: AdmissionId;
  readonly sourceFenceGeneration: FenceGeneration;
  readonly campaignFenceGeneration: FenceGeneration;
  readonly familyAllocationFenceGeneration: FenceGeneration;
  readonly launchDeadline: AuthoritativeTick;
  readonly attemptDeadline: AuthoritativeTick;
  readonly stopDeadline: AuthoritativeTick;
  readonly buildDeadline: AuthoritativeTick;
  readonly buildConsistencyDeadline: AuthoritativeTick;
}
interface RootBound {
  readonly sourceClaimFamilyId: SourceClaimFamilyId;
  readonly sourceFamilyRootId: SourceFamilyRootId;
}
export type AuthorizationFenceBinding =
  | {
      readonly scope: "source";
      readonly expectedGeneration: FenceGeneration;
      readonly expectedFamilyAllocationGeneration: FenceGeneration;
    }
  | { readonly scope: "campaign"; readonly expectedGeneration: FenceGeneration };
export type LaunchPurpose = "source-authoring" | "build" | "evaluation";
interface AuthorizationBound extends RootBound {
  readonly authorizationId: AuthorizationId;
  readonly sourceSlotId: SourceSlotId;
  readonly runtimeId: RuntimeId;
  readonly retirementOwnerId: RetirementOwnerId;
  readonly credentialLineageId: CredentialLineageId;
  readonly authorizationFence: AuthorizationFenceBinding;
  readonly launchPurpose: LaunchPurpose;
}
export interface IssueAuthorization extends EventEnvelope, AuthorizationBound {
  readonly type: "IssueAuthorization";
  readonly expiresAt: AuthoritativeTick;
}
export interface ConsumeAuthorization extends EventEnvelope, AuthorizationBound {
  readonly type: "ConsumeAuthorization";
}
/**
 * Revocation is cause-sensitive. Abandonment or expiry revokes matching
 * unconsumed authority. Successful source or family closure freezes issuance
 * without inventing revocation of consumed authority. Campaign analytic stop
 * or expiry also blocks a consumed-but-unstarted release. An explicit
 * revocation remains bound to this exact authorization and fence.
 */
export interface RevokeAuthorization extends EventEnvelope, RootBound {
  readonly type: "RevokeAuthorization";
  readonly authorizationId: AuthorizationId;
  readonly authorizationFence: AuthorizationFenceBinding;
  readonly reason: "source-terminal" | "fence-advanced" | "analytic-stop" | "retirement";
}
export interface ExpireAuthorization extends EventEnvelope, RootBound {
  readonly type: "ExpireAuthorization";
  readonly authorizationId: AuthorizationId;
  readonly authorizationFence: AuthorizationFenceBinding;
}
export interface CloseSource extends EventEnvelope, RootBound {
  readonly type: "CloseSource";
  readonly expectedGeneration: FenceGeneration;
  readonly nextGeneration: FenceGeneration;
  readonly receiptId: ReceiptId;
  readonly sourceDigest: ArtifactDigest;
}
export interface AbandonSource extends EventEnvelope, RootBound {
  readonly type: "AbandonSource";
  readonly expectedGeneration: FenceGeneration;
  readonly nextGeneration: FenceGeneration;
  readonly receiptId: ReceiptId;
  readonly proofId: ProofId;
}
export interface AdvanceFence extends EventEnvelope {
  readonly type: "AdvanceFence";
  readonly fence: "source" | "campaign" | "family-allocation";
  readonly sourceClaimFamilyId: SourceClaimFamilyId;
  readonly sourceFamilyRootId: SourceFamilyRootId;
  readonly expectedGeneration: FenceGeneration;
  readonly nextGeneration: FenceGeneration;
  readonly cause: "expiry" | "analytic-stop";
}
export interface ReleaseProcess extends EventEnvelope, AuthorizationBound {
  readonly type: "ReleaseProcess";
  readonly attemptId: AttemptId;
  readonly launchReceiptId: ReceiptId;
}
export interface RecordReleaseDenied extends EventEnvelope, AuthorizationBound {
  readonly type: "RecordReleaseDenied";
  readonly receiptId: ReceiptId;
  readonly proofId: ProofId;
  readonly reason: DenialReason;
}
export interface ObserveCrash extends EventEnvelope, RootBound {
  readonly type: "ObserveCrash";
  readonly authorizationId: AuthorizationId;
  readonly runtimeId: RuntimeId;
  readonly expectedGeneration: FenceGeneration;
}
export interface ReachLaunchDeadline extends EventEnvelope, AuthorizationBound {
  readonly type: "ReachLaunchDeadline";
  readonly observationReceiptId: ReceiptId;
  readonly result: "start-unknown" | "never-started";
}
export interface RestartObserved extends EventEnvelope, RootBound {
  readonly type: "RestartObserved";
  readonly runtimeId: RuntimeId;
}
export interface ReconcileRuntime extends EventEnvelope, RootBound {
  readonly type: "ReconcileRuntime";
  readonly runtimeId: RuntimeId;
  readonly observation: "live" | "terminated" | "unknown";
  readonly proofId: ProofId;
}
export interface RequestRetirement extends EventEnvelope, RootBound {
  readonly type: "RequestRetirement";
  readonly retirementOwnerId: RetirementOwnerId;
  readonly credentialLineageId: CredentialLineageId;
}
export interface RequestCleanup extends EventEnvelope, RootBound {
  readonly type: "RequestCleanup";
  readonly runtimeId: RuntimeId;
  readonly retirementOwnerId: RetirementOwnerId;
  readonly credentialLineageId: CredentialLineageId;
  readonly terminationProofId: ProofId;
}
export interface CompleteRetirement extends EventEnvelope, RootBound {
  readonly type: "CompleteRetirement";
  readonly runtimeId: RuntimeId;
  readonly retirementOwnerId: RetirementOwnerId;
  readonly credentialLineageId: CredentialLineageId;
  readonly tombstoneId: TombstoneId;
  readonly cleanupProofId: ProofId;
  readonly sourceTerminalReceiptId: ReceiptId;
  readonly retainedEvidence: readonly EvidenceReference[];
}
export type AttemptReceiptResult = "succeeded" | "failed";
export interface RecordAttemptReceipt extends EventEnvelope {
  readonly type: "RecordAttemptReceipt";
  readonly attemptId: AttemptId;
  readonly runtimeId: RuntimeId;
  readonly receiptId: ReceiptId;
  readonly result: AttemptReceiptResult;
}
export interface ReachAttemptDeadline extends EventEnvelope {
  readonly type: "ReachAttemptDeadline";
  readonly attemptId: AttemptId;
  readonly observationReceiptId: ReceiptId;
  readonly result: "missing" | "unknown";
}
export interface CheckpointEffective extends EventEnvelope {
  readonly type: "CheckpointEffective";
  readonly checkpointId: CheckpointId;
  readonly expectedGeneration: FenceGeneration;
}
export interface RecordStopReceipt extends EventEnvelope {
  readonly type: "RecordStopReceipt";
  readonly checkpointId: CheckpointId;
  readonly receiptId: ReceiptId;
  readonly expectedGeneration: FenceGeneration;
  readonly result: "continue" | "stop";
}
export interface ReachStopDeadline extends EventEnvelope {
  readonly type: "ReachStopDeadline";
  readonly checkpointId: CheckpointId;
  readonly expectedGeneration: FenceGeneration;
  readonly observationReceiptId: ReceiptId;
  readonly result: "missing" | "unknown";
}
export interface RecoverStopFence extends EventEnvelope {
  readonly type: "RecoverStopFence";
  readonly checkpointId: CheckpointId;
  readonly expectedGeneration: FenceGeneration;
  readonly nextGeneration: FenceGeneration;
}
export type BuildResultInput =
  | { readonly type: "succeeded"; readonly artifactDigest: ArtifactDigest }
  | { readonly type: "failed"; readonly proofId: ProofId }
  | { readonly type: "no-output"; readonly proofId: ProofId };
export interface RecordBuildResult extends EventEnvelope, RootBound {
  readonly type: "RecordBuildResult";
  readonly sourceSlotId: SourceSlotId;
  readonly buildAttemptId: BuildAttemptId;
  readonly authorizationId: AuthorizationId;
  readonly buildReceiptId: BuildReceiptId;
  readonly result: BuildResultInput;
}
export interface ReachBuildDeadline extends EventEnvelope, RootBound {
  readonly type: "ReachBuildDeadline";
  readonly sourceSlotId: SourceSlotId;
  readonly buildAttemptId: BuildAttemptId;
  readonly observationReceiptId: ReceiptId;
  readonly result: "missing" | "unknown";
}
export type BuildConsistencyInput =
  | { readonly type: "match"; readonly artifactDigest: ArtifactDigest }
  | { readonly type: "non-artifact-match"; readonly buildResult: "failed" | "no-output";
      readonly proofId: ProofId }
  | { readonly type: "missing-build"; readonly proofId: ProofId }
  | { readonly type: "unknown-build"; readonly proofId: ProofId }
  | { readonly type: "invalid"; readonly proofId: ProofId };
export interface RecordBuildConsistencyReceipt extends EventEnvelope, RootBound {
  readonly type: "RecordBuildConsistencyReceipt";
  readonly sourceSlotId: SourceSlotId;
  readonly buildAttemptId: BuildAttemptId;
  readonly buildReceiptId: BuildReceiptId;
  readonly consistencyReceiptId: ConsistencyReceiptId;
  readonly result: BuildConsistencyInput;
}
export interface ReachBuildConsistencyDeadline extends EventEnvelope, RootBound {
  readonly type: "ReachBuildConsistencyDeadline";
  readonly sourceSlotId: SourceSlotId;
  readonly buildAttemptId: BuildAttemptId;
  readonly result: "missing-verifier" | "unknown-verifier";
  readonly observationReceiptId: ReceiptId;
}
export interface RecordAdmission extends EventEnvelope, RootBound {
  readonly type: "RecordAdmission";
  readonly admissionId: AdmissionId;
  readonly receiptId: ReceiptId;
  readonly result: "accepted" | "failed";
}
export type ProtocolEvent =
  | RegisterProtocol
  | IssueAuthorization
  | ConsumeAuthorization
  | RevokeAuthorization
  | ExpireAuthorization
  | CloseSource
  | AbandonSource
  | AdvanceFence
  | ReleaseProcess
  | RecordReleaseDenied
  | ObserveCrash
  | ReachLaunchDeadline
  | RestartObserved
  | ReconcileRuntime
  | RequestRetirement
  | RequestCleanup
  | CompleteRetirement
  | RecordAttemptReceipt
  | ReachAttemptDeadline
  | CheckpointEffective
  | RecordStopReceipt
  | ReachStopDeadline
  | RecoverStopFence
  | RecordBuildResult
  | ReachBuildDeadline
  | RecordBuildConsistencyReceipt
  | ReachBuildConsistencyDeadline
  | RecordAdmission;
export type SourceEvidenceProjection =
  | { readonly type: "open" }
  | { readonly type: "closed"; readonly receiptId: ReceiptId; readonly sourceDigest: ArtifactDigest }
  | { readonly type: "abandoned"; readonly receiptId: ReceiptId; readonly proofId: ProofId };
export type RuntimeProjection = "not-started" | "live" | "unknown" | "terminated";
export type LaunchTerminalResult = "started" | "release-denied" | "start-unknown" | "never-started";
export type LaunchTerminalProjection = {
  readonly type: LaunchTerminalResult;
  readonly receiptId: ReceiptId;
};
export type AttemptTerminalResult = "succeeded" | "failed" | "missing" | "unknown";
export type AttemptTerminalProjection = {
  readonly type: AttemptTerminalResult;
  readonly receiptId: ReceiptId;
};
export type StopTerminalResult = "continue" | "stop" | "missing" | "unknown";
export type StopTerminalProjection = {
  readonly type: StopTerminalResult;
  readonly receiptId: ReceiptId;
};
export type BuildTerminalProjection =
  | { readonly type: "succeeded" | "failed" | "no-output"; readonly buildReceiptId: BuildReceiptId }
  | { readonly type: "missing" | "unknown"; readonly observationReceiptId: ReceiptId };
export type BuildConsistencyTerminalResult =
  | "match"
  | "non-artifact-match"
  | "missing-build"
  | "unknown-build"
  | "missing-verifier"
  | "unknown-verifier"
  | "invalid";
export type BuildConsistencyTerminalProjection =
  | {
      readonly type: "match" | "non-artifact-match" | "missing-build" | "unknown-build" | "invalid";
      readonly consistencyReceiptId: ConsistencyReceiptId;
    }
  | {
      readonly type: "missing-verifier" | "unknown-verifier";
      readonly observationReceiptId: ReceiptId;
    };
export type AdmissionProjection =
  | { readonly type: "pending" }
  | { readonly type: "accepted" | "failed"; readonly receiptId: ReceiptId };
export type ClaimProjection = "eligible" | "non-promotional" | "invalid";
export interface RetirementTombstoneProjection {
  readonly tombstoneId: TombstoneId;
  readonly sourceTerminal: Exclude<SourceEvidenceProjection, { readonly type: "open" }>;
  readonly retirementOwnerId: RetirementOwnerId;
  readonly cleanupProofId: ProofId;
  readonly retainedEvidence: readonly EvidenceReference[];
}
export type ResourceRetirementProjection =
  | { readonly type: "active" }
  | { readonly type: "pending" }
  | { readonly type: "quarantined" }
  | { readonly type: "retired"; readonly tombstone: RetirementTombstoneProjection };
export interface TerminalProjections {
  readonly sourceEvidence: SourceEvidenceProjection;
  readonly resourceRetirement: ResourceRetirementProjection;
  readonly runtime: RuntimeProjection;
  readonly launch: LaunchTerminalProjection | null;
  readonly attempt: AttemptTerminalProjection | null;
  readonly stopCheckpoint: StopTerminalProjection | null;
  readonly build: BuildTerminalProjection | null;
  readonly buildConsistency: BuildConsistencyTerminalProjection | null;
  readonly admission: AdmissionProjection;
  readonly claim: ClaimProjection;
}
/**
 * When several rejection conditions hold, diagnostics use this semantic
 * precedence: binding/identity, unresolved runtime, immutable finality, source
 * terminal state, authorization expiry, explicit revocation, stale generation
 * or closed gate, campaign build eligibility, then consumed or unavailable
 * authority. This is a deterministic qualification diagnostic rule, not
 * product authorization policy.
 */
export type DenialReason =
  | "not-registered"
  | "wrong-binding"
  | "authorization-unavailable"
  | "authorization-consumed"
  | "authorization-revoked"
  | "authorization-expired"
  | "stale-generation"
  | "gate-closed"
  | "source-terminal"
  | "deadline-not-reached"
  | "terminal-already-recorded"
  | "runtime-unresolved"
  | "retirement-owner-mismatch"
  | "credential-lineage-mismatch"
  | "build-not-executable"
  | "receipt-replay";
export type EvidenceReference =
  | { readonly type: "proof"; readonly proofId: ProofId }
  | { readonly type: "receipt"; readonly receiptId: ReceiptId }
  | { readonly type: "build-receipt"; readonly buildReceiptId: BuildReceiptId }
  | { readonly type: "consistency-receipt"; readonly consistencyReceiptId: ConsistencyReceiptId }
  | { readonly type: "event"; readonly eventId: EventId };
interface EffectEnvelope {
  readonly causalEventId: EventId;
}
export interface AuthorizationIssuedEffect extends EffectEnvelope {
  readonly type: "authorization-issued";
  readonly authorizationId: AuthorizationId;
  readonly sourceFamilyRootId: SourceFamilyRootId;
  readonly authorizationFence: AuthorizationFenceBinding;
}
export type DenialSubject =
  | { readonly type: "authorization"; readonly authorizationId: AuthorizationId }
  | {
      readonly type: "process-release";
      readonly authorizationId: AuthorizationId;
      readonly attemptId: AttemptId;
      readonly runtimeId: RuntimeId;
    }
  | { readonly type: "attempt"; readonly attemptId: AttemptId }
  | { readonly type: "runtime"; readonly runtimeId: RuntimeId }
  | { readonly type: "checkpoint"; readonly checkpointId: CheckpointId }
  | { readonly type: "source-root"; readonly sourceFamilyRootId: SourceFamilyRootId }
  | { readonly type: "build-attempt"; readonly buildAttemptId: BuildAttemptId }
  | { readonly type: "admission"; readonly admissionId: AdmissionId };
export interface DenialRecordedEffect extends EffectEnvelope {
  readonly type: "denial-recorded";
  readonly reason: DenialReason;
  readonly subject: DenialSubject;
}
export interface GateClosedEffect extends EffectEnvelope {
  readonly type: "gate-closed";
  readonly fence: "source" | "campaign" | "family-allocation";
  readonly generation: FenceGeneration;
}
export interface AuthorizationRevokedEffect extends EffectEnvelope {
  readonly type: "authorization-revoked";
  readonly authorizationId: AuthorizationId;
  readonly authorizationFence: AuthorizationFenceBinding;
}
export interface ProcessReleaseRequestedEffect extends EffectEnvelope {
  readonly type: "process-release-requested";
  readonly authorizationId: AuthorizationId;
  readonly runtimeId: RuntimeId;
  readonly authorizationFence: AuthorizationFenceBinding;
}
export type TerminalReference =
  | {
      readonly type: "source";
      readonly projection: Exclude<SourceEvidenceProjection, { readonly type: "open" }>;
    }
  | { readonly type: "launch"; readonly projection: LaunchTerminalProjection }
  | { readonly type: "attempt"; readonly projection: AttemptTerminalProjection }
  | { readonly type: "stop"; readonly projection: StopTerminalProjection }
  | { readonly type: "build"; readonly projection: BuildTerminalProjection }
  | { readonly type: "build-consistency"; readonly projection: BuildConsistencyTerminalProjection }
  | { readonly type: "admission"; readonly projection: Exclude<AdmissionProjection, { readonly type: "pending" }> };
export interface TerminalAppendedEffect extends EffectEnvelope {
  readonly type: "terminal-appended";
  readonly terminal: TerminalReference;
}
export type LateEvidenceReference =
  | { readonly type: "launch"; readonly authorizationId: AuthorizationId; readonly receiptId: ReceiptId;
      readonly result: "started" | "release-denied" }
  | {
      readonly type: "attempt";
      readonly attemptId: AttemptId;
      readonly receiptId: ReceiptId;
      readonly result: AttemptReceiptResult;
    }
  | {
      readonly type: "stop";
      readonly checkpointId: CheckpointId;
      readonly receiptId: ReceiptId;
      readonly result: "continue" | "stop";
    }
  | {
      readonly type: "build";
      readonly buildAttemptId: BuildAttemptId;
      readonly buildReceiptId: BuildReceiptId;
      readonly result: BuildResultInput;
    }
  | {
      readonly type: "build-consistency";
      readonly buildAttemptId: BuildAttemptId;
      readonly consistencyReceiptId: ConsistencyReceiptId;
      readonly result: BuildConsistencyInput;
    };
export interface LateReceiptRetainedEffect extends EffectEnvelope {
  readonly type: "late-receipt-retained";
  readonly evidence: LateEvidenceReference;
}
export interface RuntimeReconciliationRequestedEffect extends EffectEnvelope {
  readonly type: "runtime-reconciliation-requested";
  readonly runtimeId: RuntimeId;
}
export interface RuntimeTerminationRequestedEffect extends EffectEnvelope {
  readonly type: "runtime-termination-requested";
  readonly runtimeId: RuntimeId;
}
export interface ResourceQuarantinedEffect extends EffectEnvelope {
  readonly type: "resource-quarantined";
  readonly sourceFamilyRootId: SourceFamilyRootId;
  readonly runtimeId: RuntimeId;
}
export interface ResourceCleanupRequestedEffect extends EffectEnvelope {
  readonly type: "resource-cleanup-requested";
  readonly sourceFamilyRootId: SourceFamilyRootId;
  readonly runtimeId: RuntimeId;
  readonly proofId: ProofId;
}
export interface ExecutionGateSetEffect extends EffectEnvelope {
  readonly type: "execution-gate-set";
  readonly buildAttemptId: BuildAttemptId;
  readonly value: "allowed" | "denied";
}
export interface ClaimDispositionSetEffect extends EffectEnvelope {
  readonly type: "claim-disposition-set";
  readonly value: ClaimProjection;
  readonly evidence: EvidenceReference;
}
export interface RetirementTombstoneAppendedEffect extends EffectEnvelope {
  readonly type: "retirement-tombstone-appended";
  readonly sourceFamilyRootId: SourceFamilyRootId;
  readonly tombstoneId: TombstoneId;
  readonly retirementOwnerId: RetirementOwnerId;
  readonly cleanupProofId: ProofId;
}
/**
 * Effects of one accepted transition are an exact unordered multiset. Array
 * position carries no semantic ordering; multiplicity remains significant.
 */
export type DeclaredEffect =
  | AuthorizationIssuedEffect
  | DenialRecordedEffect
  | GateClosedEffect
  | AuthorizationRevokedEffect
  | ProcessReleaseRequestedEffect
  | TerminalAppendedEffect
  | LateReceiptRetainedEffect
  | RuntimeReconciliationRequestedEffect
  | RuntimeTerminationRequestedEffect
  | ResourceQuarantinedEffect
  | ResourceCleanupRequestedEffect
  | ExecutionGateSetEffect
  | ClaimDispositionSetEffect
  | RetirementTombstoneAppendedEffect;
export type Decision = "accepted" | "rejected";
export interface TransitionResult {
  readonly decision: Decision;
  readonly effects: readonly DeclaredEffect[];
  readonly terminalProjections: TerminalProjections;
}
