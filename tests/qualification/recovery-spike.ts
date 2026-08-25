export type RecoveryPhase = "prepared" | "started" | "ready" | "published" | "draining" | "retired";

export interface DurableLifecycleState {
  readonly operationId: string;
  readonly candidateGeneration: number;
  readonly expectedActiveGeneration: number;
  readonly activeGeneration: number;
  readonly phase: RecoveryPhase;
  readonly deadlineExpired: boolean;
  readonly externalOutcome: "none" | "confirmed" | "uncertain";
}

export interface ObservedHostState {
  readonly candidate: "absent" | "running" | "ready" | "terminated" | "unknown";
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
  if (state.externalOutcome === "uncertain" || observed.candidate === "unknown") {
    return "CONTROLLED_RECOVERY";
  }
  if (state.phase === "retired") return "RETURN_RETIRED_RESULT";
  if (state.phase === "published") return "RETURN_PUBLISHED_RESULT";
  if (state.phase === "draining") {
    return observed.oldGenerationInFlight ? "RESUME_DRAIN" : "RETURN_RETIRED_RESULT";
  }
  if (state.activeGeneration !== state.expectedActiveGeneration || state.deadlineExpired) {
    return observed.candidate === "absent" || observed.candidate === "terminated"
      ? "ABORT_CANDIDATE"
      : "INSPECT_CANDIDATE";
  }
  if (state.phase === "ready" && observed.candidate === "ready") return "PUBLISH_CANDIDATE";
  if (observed.candidate === "absent" && state.phase === "prepared") return "RETRY_IDEMPOTENT_PREPARE";
  return "INSPECT_CANDIDATE";
}
