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
    if (observed.oldGeneration.inFlight && state.drainDeadlineExpired) return "CONTROLLED_RECOVERY";
    if (observed.oldGeneration.inFlight) return "RESUME_DRAIN";
    return state.phase === "published" ? "RETURN_PUBLISHED_RESULT" : "RETURN_RETIRED_RESULT";
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
