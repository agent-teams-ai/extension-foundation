export type RecoveryPhase = "prepared" | "started" | "ready" | "published" | "draining" | "retired";

export interface DurableLifecycleState {
  readonly operationId: string;
  readonly intentDigest: string;
  readonly authorityScope: string;
  readonly graphDigest: string;
  readonly candidateGeneration: number;
  readonly candidateHostIncarnation: string;
  readonly expectedActiveHostIncarnation: string;
  readonly expectedActiveGeneration: number;
  readonly activeGeneration: number;
  readonly routeHeadGeneration: number;
  readonly expectedSinkFence: number;
  readonly candidateSinkFence: number;
  readonly sinkFence: number;
  readonly phase: RecoveryPhase;
  readonly operationDeadlineExpired: boolean;
  readonly drainDeadlineExpired: boolean;
  readonly publicationEvidence: "none" | "committed" | "uncertain";
  readonly externalOutcome: "none" | "confirmed" | "uncertain";
}

interface ObservedCandidateIdentity {
  readonly operationId: string;
  readonly intentDigest: string;
  readonly generation: number;
  readonly hostIncarnation: string;
  readonly authorityScope: string;
  readonly graphDigest: string;
  readonly sinkFence: number;
}

export type ObservedCandidate =
  | { readonly state: "absent" }
  | ({ readonly state: "running" | "ready" | "terminated" | "unknown" } & ObservedCandidateIdentity);

export interface ObservedOldGeneration {
  readonly operationId: string;
  readonly intentDigest: string;
  readonly generation: number;
  readonly hostIncarnation: string;
  readonly authorityScope: string;
  readonly sinkFence: number;
  readonly inFlight: boolean;
  readonly terminationEvidence: "running" | "stopped" | "unknown";
  readonly cleanupEvidence: "pending" | "confirmed" | "uncertain";
}

export interface ObservedHostState {
  readonly queryOperationId: string;
  readonly queryIntentDigest: string;
  readonly queryAuthorityScope: string;
  readonly queryGraphDigest: string;
  readonly queryHostIncarnation: string;
  readonly candidate: ObservedCandidate;
  readonly oldGeneration: ObservedOldGeneration;
}

export type RecoveryAction =
  | "RETRY_IDEMPOTENT_PREPARE"
  | "INSPECT_CANDIDATE"
  | "ABORT_CANDIDATE"
  | "PUBLISH_CANDIDATE"
  | "RESUME_DRAIN"
  | "STOP_OLD_GENERATION"
  | "RECONCILE_OLD_CLEANUP"
  | "RECORD_RETIREMENT"
  | "RETURN_RETIRED_RESULT"
  | "CONTROLLED_RECOVERY";

const recoveryCheckpointSchema = "qualification.recovery-checkpoint/v1";

const lifecyclePhases = new Set<unknown>(["prepared", "started", "ready", "published", "draining", "retired"]);
const publicationEvidenceStates = new Set<unknown>(["none", "committed", "uncertain"]);
const externalOutcomeStates = new Set<unknown>(["none", "confirmed", "uncertain"]);
const candidateStates = new Set<unknown>(["absent", "running", "ready", "terminated", "unknown"]);
const terminationEvidenceStates = new Set<unknown>(["running", "stopped", "unknown"]);
const cleanupEvidenceStates = new Set<unknown>(["pending", "confirmed", "uncertain"]);

function nonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function nonNegativeInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) >= 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function snapshotState(state: DurableLifecycleState): DurableLifecycleState {
  return Object.freeze({
    operationId: state.operationId,
    intentDigest: state.intentDigest,
    authorityScope: state.authorityScope,
    graphDigest: state.graphDigest,
    candidateGeneration: state.candidateGeneration,
    candidateHostIncarnation: state.candidateHostIncarnation,
    expectedActiveHostIncarnation: state.expectedActiveHostIncarnation,
    expectedActiveGeneration: state.expectedActiveGeneration,
    activeGeneration: state.activeGeneration,
    routeHeadGeneration: state.routeHeadGeneration,
    expectedSinkFence: state.expectedSinkFence,
    candidateSinkFence: state.candidateSinkFence,
    sinkFence: state.sinkFence,
    phase: state.phase,
    operationDeadlineExpired: state.operationDeadlineExpired,
    drainDeadlineExpired: state.drainDeadlineExpired,
    publicationEvidence: state.publicationEvidence,
    externalOutcome: state.externalOutcome,
  });
}

function snapshotObserved(observed: ObservedHostState): ObservedHostState {
  const sourceCandidate = observed.candidate;
  const candidateState = sourceCandidate.state;
  const candidate: ObservedCandidate = candidateState === "absent"
    ? Object.freeze({ state: "absent" })
    : Object.freeze({
      state: candidateState,
      operationId: sourceCandidate.operationId,
      intentDigest: sourceCandidate.intentDigest,
      generation: sourceCandidate.generation,
      hostIncarnation: sourceCandidate.hostIncarnation,
      authorityScope: sourceCandidate.authorityScope,
      graphDigest: sourceCandidate.graphDigest,
      sinkFence: sourceCandidate.sinkFence,
    });
  const sourceOld = observed.oldGeneration;
  return Object.freeze({
    queryOperationId: observed.queryOperationId,
    queryIntentDigest: observed.queryIntentDigest,
    queryAuthorityScope: observed.queryAuthorityScope,
    queryGraphDigest: observed.queryGraphDigest,
    queryHostIncarnation: observed.queryHostIncarnation,
    candidate,
    oldGeneration: Object.freeze({
      operationId: sourceOld.operationId,
      intentDigest: sourceOld.intentDigest,
      generation: sourceOld.generation,
      hostIncarnation: sourceOld.hostIncarnation,
      authorityScope: sourceOld.authorityScope,
      sinkFence: sourceOld.sinkFence,
      inFlight: sourceOld.inFlight,
      terminationEvidence: sourceOld.terminationEvidence,
      cleanupEvidence: sourceOld.cleanupEvidence,
    }),
  });
}

function hasValidRuntimeShape(state: DurableLifecycleState, observed: ObservedHostState): boolean {
  if (!isRecord(state) || !isRecord(observed) || !isRecord(observed.candidate) || !isRecord(observed.oldGeneration)) {
    return false;
  }
  const candidate = observed.candidate;
  const identifiedCandidate = candidate as ObservedCandidate & Partial<ObservedCandidateIdentity>;
  return nonEmptyString(state.operationId)
    && nonEmptyString(state.intentDigest)
    && nonEmptyString(state.authorityScope)
    && nonEmptyString(state.graphDigest)
    && nonEmptyString(state.candidateHostIncarnation)
    && nonEmptyString(state.expectedActiveHostIncarnation)
    && [
      state.candidateGeneration,
      state.expectedActiveGeneration,
      state.activeGeneration,
      state.routeHeadGeneration,
      state.expectedSinkFence,
      state.candidateSinkFence,
      state.sinkFence,
      observed.oldGeneration.generation,
      observed.oldGeneration.sinkFence,
    ].every(nonNegativeInteger)
    && typeof state.operationDeadlineExpired === "boolean"
    && typeof state.drainDeadlineExpired === "boolean"
    && typeof observed.oldGeneration.inFlight === "boolean"
    && lifecyclePhases.has(state.phase)
    && publicationEvidenceStates.has(state.publicationEvidence)
    && externalOutcomeStates.has(state.externalOutcome)
    && candidateStates.has(candidate.state)
    && terminationEvidenceStates.has(observed.oldGeneration.terminationEvidence)
    && cleanupEvidenceStates.has(observed.oldGeneration.cleanupEvidence)
    && nonEmptyString(observed.queryOperationId)
    && nonEmptyString(observed.queryIntentDigest)
    && nonEmptyString(observed.queryAuthorityScope)
    && nonEmptyString(observed.queryGraphDigest)
    && nonEmptyString(observed.queryHostIncarnation)
    && nonEmptyString(observed.oldGeneration.operationId)
    && nonEmptyString(observed.oldGeneration.intentDigest)
    && nonEmptyString(observed.oldGeneration.hostIncarnation)
    && nonEmptyString(observed.oldGeneration.authorityScope)
    && (candidate.state === "absent" || (
      nonEmptyString(identifiedCandidate.operationId)
      && nonEmptyString(identifiedCandidate.intentDigest)
      && nonNegativeInteger(identifiedCandidate.generation)
      && nonEmptyString(identifiedCandidate.hostIncarnation)
      && nonEmptyString(identifiedCandidate.authorityScope)
      && nonEmptyString(identifiedCandidate.graphDigest)
      && nonNegativeInteger(identifiedCandidate.sinkFence)
    ));
}

function reconcileLifecycleUnsafe(
  state: DurableLifecycleState,
  observed: ObservedHostState,
): RecoveryAction {
  if (!hasValidRuntimeShape(state, observed)) return "CONTROLLED_RECOVERY";

  if (
    state.candidateGeneration <= state.expectedActiveGeneration
    || state.candidateSinkFence <= state.expectedSinkFence
    || state.externalOutcome === "uncertain"
    || state.publicationEvidence === "uncertain"
    || observed.candidate.state === "unknown"
    || observed.queryOperationId !== state.operationId
    || observed.queryIntentDigest !== state.intentDigest
    || observed.queryAuthorityScope !== state.authorityScope
    || observed.queryGraphDigest !== state.graphDigest
    || observed.queryHostIncarnation !== state.candidateHostIncarnation
    || observed.oldGeneration.operationId !== state.operationId
    || observed.oldGeneration.intentDigest !== state.intentDigest
    || observed.oldGeneration.generation !== state.expectedActiveGeneration
    || observed.oldGeneration.hostIncarnation !== state.expectedActiveHostIncarnation
    || observed.oldGeneration.authorityScope !== state.authorityScope
    || observed.oldGeneration.sinkFence !== state.expectedSinkFence
  ) {
    return "CONTROLLED_RECOVERY";
  }

  if (
    (observed.oldGeneration.inFlight && observed.oldGeneration.terminationEvidence === "stopped")
    || (observed.oldGeneration.cleanupEvidence === "confirmed"
      && (observed.oldGeneration.inFlight || observed.oldGeneration.terminationEvidence !== "stopped"))
  ) {
    return "CONTROLLED_RECOVERY";
  }

  if (
    observed.candidate.state !== "absent"
    && (
      observed.candidate.operationId !== state.operationId
      || observed.candidate.intentDigest !== state.intentDigest
      || observed.candidate.generation !== state.candidateGeneration
      || observed.candidate.hostIncarnation !== state.candidateHostIncarnation
      || observed.candidate.authorityScope !== state.authorityScope
      || observed.candidate.graphDigest !== state.graphDigest
      || observed.candidate.sinkFence !== state.candidateSinkFence
    )
  ) {
    return "CONTROLLED_RECOVERY";
  }

  const beforePublication = state.phase === "prepared" || state.phase === "started" || state.phase === "ready";
  const expectedPrePublicationState = state.activeGeneration === state.expectedActiveGeneration
    && state.routeHeadGeneration === state.expectedActiveGeneration
    && state.sinkFence === state.expectedSinkFence
    && state.publicationEvidence === "none";
  const expectedPublishedState = state.activeGeneration === state.candidateGeneration
    && state.routeHeadGeneration === state.candidateGeneration
    && state.sinkFence === state.candidateSinkFence
    && state.publicationEvidence === "committed";
  if ((beforePublication && !expectedPrePublicationState) || (!beforePublication && !expectedPublishedState)) {
    return "CONTROLLED_RECOVERY";
  }

  if (state.phase === "retired") {
    if (observed.oldGeneration.inFlight
      || observed.oldGeneration.terminationEvidence !== "stopped"
      || observed.oldGeneration.cleanupEvidence !== "confirmed"
      || observed.candidate.state === "absent"
      || observed.candidate.state === "terminated") {
      return "CONTROLLED_RECOVERY";
    }
    return "RETURN_RETIRED_RESULT";
  }
  if (state.phase === "published" || state.phase === "draining") {
    if (observed.candidate.state !== "ready" && observed.candidate.state !== "running") {
      return "CONTROLLED_RECOVERY";
    }
    if (observed.oldGeneration.terminationEvidence === "unknown"
      || observed.oldGeneration.cleanupEvidence === "uncertain") return "CONTROLLED_RECOVERY";
    if (observed.oldGeneration.inFlight && state.drainDeadlineExpired) return "CONTROLLED_RECOVERY";
    if (observed.oldGeneration.inFlight) return "RESUME_DRAIN";
    if (observed.oldGeneration.terminationEvidence === "running") return "STOP_OLD_GENERATION";
    if (observed.oldGeneration.cleanupEvidence === "pending") return "RECONCILE_OLD_CLEANUP";
    return "RECORD_RETIREMENT";
  }
  if (state.operationDeadlineExpired) {
    return observed.candidate.state === "absent" || observed.candidate.state === "terminated"
      ? "ABORT_CANDIDATE"
      : "INSPECT_CANDIDATE";
  }
  if (state.phase === "ready" && observed.candidate.state === "ready") return "PUBLISH_CANDIDATE";
  if (observed.candidate.state === "absent" && state.phase === "prepared") return "RETRY_IDEMPOTENT_PREPARE";
  return "INSPECT_CANDIDATE";
}

export function reconcileLifecycle(
  state: DurableLifecycleState,
  observed: ObservedHostState,
): RecoveryAction {
  try {
    return reconcileLifecycleUnsafe(snapshotState(state), snapshotObserved(observed));
  } catch {
    return "CONTROLLED_RECOVERY";
  }
}

export interface RecoveryCoordinator {
  checkpoint(): string;
  reconcile(observed: ObservedHostState): RecoveryAction;
}

export function createRecoveryCoordinator(
  state: DurableLifecycleState,
): RecoveryCoordinator {
  const durableState = snapshotState(state);
  return Object.freeze({
    checkpoint: () => JSON.stringify({ schema: recoveryCheckpointSchema, state: durableState }),
    reconcile: (observed: ObservedHostState) => reconcileLifecycle(durableState, observed),
  });
}

export function restoreRecoveryCoordinator(checkpoint: string): RecoveryCoordinator {
  let restored: unknown;
  try {
    const envelope = JSON.parse(checkpoint) as unknown;
    restored = isRecord(envelope) && envelope.schema === recoveryCheckpointSchema
      ? envelope.state
      : undefined;
  } catch {
    restored = undefined;
  }
  const durableState = restored as DurableLifecycleState;
  return Object.freeze({
    checkpoint: () => checkpoint,
    reconcile: (observed: ObservedHostState) => reconcileLifecycle(durableState, observed),
  });
}
