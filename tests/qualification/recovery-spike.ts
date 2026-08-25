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
  readonly sinkFenceGeneration: number;
  readonly phase: RecoveryPhase;
  readonly operationDeadlineExpired: boolean;
  readonly drainDeadlineExpired: boolean;
  readonly publicationEvidence: "none" | "committed" | "uncertain";
  readonly externalOutcome: "none" | "confirmed" | "uncertain";
}

export interface ObservedHostState {
  readonly candidate: "absent" | "running" | "ready" | "terminated" | "unknown";
  readonly candidateGeneration: number;
  readonly candidateHostIncarnation: string;
  readonly authorityScope: string;
  readonly graphDigest: string;
  readonly oldGenerationInFlight: boolean;
}

export type RecoveryAction =
  | "RETRY_IDEMPOTENT_PREPARE"
  | "INSPECT_CANDIDATE"
  | "ABORT_CANDIDATE"
  | "PUBLISH_CANDIDATE"
  | "RETURN_PUBLISHED_RESULT"
  | "RESUME_DRAIN"
  | "RETURN_RETIRED_RESULT"
  | "CONTROLLED_RECOVERY";

export function reconcileLifecycle(
  state: DurableLifecycleState,
  observed: ObservedHostState,
): RecoveryAction {
  if (
    state.operationId.length === 0
    || state.intentDigest.length === 0
    || state.authorityScope.length === 0
    || state.graphDigest.length === 0
    || state.candidateHostIncarnation.length === 0
    || state.candidateGeneration <= state.expectedActiveGeneration
    || state.externalOutcome === "uncertain"
    || state.publicationEvidence === "uncertain"
    || observed.candidate === "unknown"
  ) {
    return "CONTROLLED_RECOVERY";
  }

  if (
    observed.candidate !== "absent"
    && (
      observed.candidateGeneration !== state.candidateGeneration
      || observed.candidateHostIncarnation !== state.candidateHostIncarnation
      || observed.authorityScope !== state.authorityScope
      || observed.graphDigest !== state.graphDigest
    )
  ) {
    return "CONTROLLED_RECOVERY";
  }

  const beforePublication = state.phase === "prepared" || state.phase === "started" || state.phase === "ready";
  const expectedPrePublicationState = state.activeGeneration === state.expectedActiveGeneration
    && state.routeHeadGeneration === state.expectedActiveGeneration
    && state.sinkFenceGeneration === state.expectedActiveGeneration
    && state.publicationEvidence === "none";
  const expectedPublishedState = state.activeGeneration === state.candidateGeneration
    && state.routeHeadGeneration === state.candidateGeneration
    && state.sinkFenceGeneration === state.candidateGeneration
    && state.publicationEvidence === "committed";
  if ((beforePublication && !expectedPrePublicationState) || (!beforePublication && !expectedPublishedState)) {
    return "CONTROLLED_RECOVERY";
  }

  if (state.phase === "retired") {
    if (observed.oldGenerationInFlight || observed.candidate === "absent" || observed.candidate === "terminated") {
      return "CONTROLLED_RECOVERY";
    }
    return "RETURN_RETIRED_RESULT";
  }
  if (state.phase === "published") {
    if (observed.candidate !== "ready" && observed.candidate !== "running") return "CONTROLLED_RECOVERY";
    return observed.oldGenerationInFlight ? "RESUME_DRAIN" : "RETURN_PUBLISHED_RESULT";
  }
  if (state.phase === "draining") {
    if (observed.candidate !== "ready" && observed.candidate !== "running") return "CONTROLLED_RECOVERY";
    if (observed.oldGenerationInFlight && state.drainDeadlineExpired) return "CONTROLLED_RECOVERY";
    return observed.oldGenerationInFlight ? "RESUME_DRAIN" : "RETURN_RETIRED_RESULT";
  }
  if (state.operationDeadlineExpired) {
    return observed.candidate === "absent" || observed.candidate === "terminated"
      ? "ABORT_CANDIDATE"
      : "INSPECT_CANDIDATE";
  }
  if (state.phase === "ready" && observed.candidate === "ready") return "PUBLISH_CANDIDATE";
  if (observed.candidate === "absent" && state.phase === "prepared") return "RETRY_IDEMPOTENT_PREPARE";
  return "INSPECT_CANDIDATE";
}
