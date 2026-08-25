export type RecoveryPhase = "prepared" | "started" | "ready" | "published" | "draining" | "retired";

export interface DurableLifecycleState {
  readonly operationId: string;
  readonly intentDigest: string;
  readonly authorityScope: string;
  readonly graphDigest: string;
  readonly candidateGeneration: number;
  readonly candidateHostIncarnation: string;
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
  readonly generation: number;
  readonly hostIncarnation: string;
  readonly authorityScope: string;
  readonly graphDigest: string;
}

export type ObservedCandidate =
  | { readonly state: "absent" }
  | ({ readonly state: "running" | "ready" | "terminated" | "unknown" } & ObservedCandidateIdentity);

export interface ObservedOldGeneration {
  readonly generation: number;
  readonly authorityScope: string;
  readonly sinkFence: number;
  readonly inFlight: boolean;
  readonly terminationEvidence: "running" | "stopped" | "unknown";
  readonly cleanupEvidence: "pending" | "confirmed" | "uncertain";
}

export interface ObservedHostState {
  readonly queryAuthorityScope: string;
  readonly queryGraphDigest: string;
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

function hasValidRuntimeShape(state: DurableLifecycleState, observed: ObservedHostState): boolean {
  const candidate = observed.candidate;
  return nonEmptyString(state.operationId)
    && nonEmptyString(state.intentDigest)
    && nonEmptyString(state.authorityScope)
    && nonEmptyString(state.graphDigest)
    && nonEmptyString(state.candidateHostIncarnation)
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
    && nonEmptyString(observed.queryAuthorityScope)
    && nonEmptyString(observed.queryGraphDigest)
    && nonEmptyString(observed.oldGeneration.authorityScope)
    && (candidate.state === "absent" || (
      nonNegativeInteger(candidate.generation)
      && nonEmptyString(candidate.hostIncarnation)
      && nonEmptyString(candidate.authorityScope)
      && nonEmptyString(candidate.graphDigest)
    ));
}

export function reconcileLifecycle(
  state: DurableLifecycleState,
  observed: ObservedHostState,
): RecoveryAction {
  if (
    !hasValidRuntimeShape(state, observed)
    || state.candidateGeneration <= state.expectedActiveGeneration
    || state.candidateSinkFence <= state.expectedSinkFence
    || state.externalOutcome === "uncertain"
    || state.publicationEvidence === "uncertain"
    || observed.candidate.state === "unknown"
    || observed.queryAuthorityScope !== state.authorityScope
    || observed.queryGraphDigest !== state.graphDigest
    || observed.oldGeneration.generation !== state.expectedActiveGeneration
    || observed.oldGeneration.authorityScope !== state.authorityScope
    || observed.oldGeneration.sinkFence !== state.expectedSinkFence
  ) {
    return "CONTROLLED_RECOVERY";
  }

  if (
    observed.candidate.state !== "absent"
    && (
      observed.candidate.generation !== state.candidateGeneration
      || observed.candidate.hostIncarnation !== state.candidateHostIncarnation
      || observed.candidate.authorityScope !== state.authorityScope
      || observed.candidate.graphDigest !== state.graphDigest
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
