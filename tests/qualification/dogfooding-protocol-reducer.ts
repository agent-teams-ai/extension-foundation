/** Disposable qualification evidence; not a runtime implementation or public contract. */
import type * as C from "./dogfooding-protocol-contract.ts";
export interface QualificationReducerState { readonly kind: "qualification-reducer-state" }
export interface QualificationTransition {
  readonly state: QualificationReducerState; readonly result: C.TransitionResult;
}
export interface QualificationFold {
  readonly state: QualificationReducerState; readonly results: readonly C.TransitionResult[];
}
interface Registration {
  readonly protocolRevisionId: C.ProtocolRevisionId;
  readonly custodyAuthorityId: C.CustodyAuthorityId;
  readonly sourceClaimFamilyId: C.SourceClaimFamilyId;
  readonly sourceFamilyRootId: C.SourceFamilyRootId;
  readonly sourceSlotId: C.SourceSlotId;
  readonly attemptId: C.AttemptId;
  readonly runtimeId: C.RuntimeId;
  readonly checkpointId: C.CheckpointId;
  readonly buildAttemptId: C.BuildAttemptId;
  readonly retirementOwnerId: C.RetirementOwnerId;
  readonly credentialLineageId: C.CredentialLineageId;
  readonly admissionId: C.AdmissionId;
  readonly launchDeadline: C.AuthoritativeTick;
  readonly attemptDeadline: C.AuthoritativeTick;
  readonly stopDeadline: C.AuthoritativeTick;
  readonly buildDeadline: C.AuthoritativeTick;
  readonly buildConsistencyDeadline: C.AuthoritativeTick;
}
interface Authorization {
  readonly sourceClaimFamilyId: C.SourceClaimFamilyId;
  readonly sourceFamilyRootId: C.SourceFamilyRootId;
  readonly sourceSlotId: C.SourceSlotId;
  readonly authorizationId: C.AuthorizationId;
  readonly runtimeId: C.RuntimeId;
  readonly retirementOwnerId: C.RetirementOwnerId;
  readonly credentialLineageId: C.CredentialLineageId;
  readonly authorizationFence: C.AuthorizationFenceBinding;
  readonly expiresAt: C.AuthoritativeTick;
  readonly consumedAt: C.EventId | null;
  readonly revokedAt: C.EventId | null;
  readonly expiredAt: C.EventId | null;
}
interface Fence { readonly generation: C.FenceGeneration; readonly open: boolean }
interface BuildFact {
  readonly projection: C.BuildTerminalProjection; readonly artifactDigest: C.ArtifactDigest | null;
}
interface Observation {
  readonly event: C.ProtocolEvent; readonly result: C.TransitionResult;
}
interface State extends QualificationReducerState {
  readonly registration: Registration | null;
  readonly sourceFence: Fence | null;
  readonly campaignFence: Fence | null;
  readonly familyFence: Fence | null;
  readonly authorizations: ReadonlyMap<C.AuthorizationId, Authorization>;
  readonly events: ReadonlyMap<C.EventId, Observation>;
  readonly receipts: ReadonlySet<C.ReceiptId>;
  readonly buildReceipts: ReadonlySet<C.BuildReceiptId>;
  readonly consistencyReceipts: ReadonlySet<C.ConsistencyReceiptId>;
  readonly lastEventId: C.EventId | null;
  readonly lastTick: C.AuthoritativeTick | null;
  readonly projections: C.TerminalProjections;
  readonly checkpointEffective: boolean;
  readonly stopBarrier: boolean;
  readonly cleanupRequested: boolean;
  readonly buildFact: BuildFact | null;
}
const emptyProjections = (): C.TerminalProjections => ({
  sourceEvidence: { type: "open" }, resourceRetirement: { type: "active" },
  runtime: "not-started", launch: null, attempt: null, stopCheckpoint: null,
  build: null, buildConsistency: null, admission: { type: "pending" },
  claim: "non-promotional",
});
const stateOf = (value: QualificationReducerState): State => value as State;
const withSet = <T>(set: ReadonlySet<T>, value: T): ReadonlySet<T> =>
  new Set([...set, value]);
const withMap = <K, V>(map: ReadonlyMap<K, V>, key: K, value: V): ReadonlyMap<K, V> =>
  new Map([...map, [key, value] as const]);
const same = (left: unknown, right: unknown): boolean => {
  if (left === right) return true;
  if (typeof left !== "object" || left === null || typeof right !== "object" || right === null)
    return false;
  if (Array.isArray(left) || Array.isArray(right))
    return Array.isArray(left) && Array.isArray(right) && left.length === right.length &&
      left.every((value, index) => same(value, right[index]));
  const a = Object.keys(left), b = Object.keys(right);
  return a.length === b.length && a.every((key) =>
    Object.prototype.hasOwnProperty.call(right, key) &&
    same((left as Record<string, unknown>)[key], (right as Record<string, unknown>)[key]));
};
export const initializeQualificationReducer = (): QualificationReducerState => {
  const state: State = { kind: "qualification-reducer-state", registration: null,
    sourceFence: null, campaignFence: null, familyFence: null, authorizations: new Map(),
    events: new Map(), receipts: new Set(), buildReceipts: new Set(),
    consistencyReceipts: new Set(), lastEventId: null, lastTick: null, projections: emptyProjections(),
    checkpointEffective: false, stopBarrier: false, cleanupRequested: false, buildFact: null };
  return state;
};
export const projectQualificationTerminals = (
  state: QualificationReducerState): C.TerminalProjections => stateOf(state).projections;
const subject = (event: C.ProtocolEvent): C.DenialSubject => {
  if (event.type === "ReleaseProcess") return {
    type: "process-release", authorizationId: event.authorizationId,
    attemptId: event.attemptId, runtimeId: event.runtimeId,
  };
  if (event.type === "ObserveCrash") return { type: "runtime", runtimeId: event.runtimeId };
  if ("authorizationId" in event) return { type: "authorization", authorizationId: event.authorizationId };
  if ("attemptId" in event && event.type !== "RegisterProtocol")
    return { type: "attempt", attemptId: event.attemptId };
  if ("runtimeId" in event && event.type !== "RegisterProtocol")
    return { type: "runtime", runtimeId: event.runtimeId };
  if ("checkpointId" in event && event.type !== "RegisterProtocol")
    return { type: "checkpoint", checkpointId: event.checkpointId };
  if ("buildAttemptId" in event && event.type !== "RegisterProtocol")
    return { type: "build-attempt", buildAttemptId: event.buildAttemptId };
  if (event.type === "RecordAdmission") return { type: "admission", admissionId: event.admissionId };
  return { type: "source-root", sourceFamilyRootId: event.sourceFamilyRootId };
};
const reject = (state: State, event: C.ProtocolEvent, reason: C.DenialReason): QualificationTransition => {
  const result: C.TransitionResult = { decision: "rejected", effects: [{
    type: "denial-recorded", causalEventId: event.eventId, reason, subject: subject(event),
  }], terminalProjections: state.projections };
  return { state: { ...state, events: withMap(state.events, event.eventId, { event, result }) } as State, result };
};
const accept = (state: State, event: C.ProtocolEvent, changes: Partial<State>,
  effects: readonly C.DeclaredEffect[]): QualificationTransition => {
  const changed: State = { ...state, ...changes, lastEventId: event.eventId,
    lastTick: event.authoritativeTick };
  const result: C.TransitionResult = { decision: "accepted", effects,
    terminalProjections: changed.projections };
  const next: State = { ...changed,
    events: withMap(state.events, event.eventId, { event, result }) };
  return { state: next, result };
};
const terminal = (event: C.ProtocolEvent, value: C.TerminalReference): C.TerminalAppendedEffect => ({ type: "terminal-appended", causalEventId: event.eventId, terminal: value });
const invalid = (event: C.ProtocolEvent, evidence: C.EvidenceReference): C.ClaimDispositionSetEffect => ({ type: "claim-disposition-set", causalEventId: event.eventId, value: "invalid", evidence });
const rootMatches = (r: Registration, e: { readonly sourceClaimFamilyId: C.SourceClaimFamilyId;
  readonly sourceFamilyRootId: C.SourceFamilyRootId }): boolean =>
  e.sourceClaimFamilyId === r.sourceClaimFamilyId && e.sourceFamilyRootId === r.sourceFamilyRootId;
const ownerMismatch = (r: Registration, e: { readonly retirementOwnerId: C.RetirementOwnerId;
  readonly credentialLineageId: C.CredentialLineageId }): C.DenialReason | null =>
  e.retirementOwnerId !== r.retirementOwnerId ? "retirement-owner-mismatch" :
    e.credentialLineageId !== r.credentialLineageId ? "credential-lineage-mismatch" : null;
const fence = (s: State, binding: C.AuthorizationFenceBinding): Fence =>
  (binding.scope === "source" ? s.sourceFence : s.campaignFence)!;
const fenceReason = (s: State, binding: C.AuthorizationFenceBinding): C.DenialReason | null => {
  const selected = fence(s, binding);
  if (!selected.open) return "gate-closed";
  if (selected.generation !== binding.expectedGeneration) return "stale-generation";
  if (binding.scope === "source") {
    if (!s.familyFence!.open) return "gate-closed";
    if (s.familyFence!.generation !== binding.expectedFamilyAllocationGeneration) return "stale-generation";
  }
  return null;
};
const launchBarrier = (s: State): boolean =>
  s.stopBarrier || s.checkpointEffective && s.projections.stopCheckpoint === null;
const bindingMatches = (a: Authorization, e: C.ConsumeAuthorization | C.ReleaseProcess |
  C.RecordReleaseDenied | C.ReachLaunchDeadline): boolean =>
  a.sourceClaimFamilyId === e.sourceClaimFamilyId && a.sourceFamilyRootId === e.sourceFamilyRootId &&
  a.sourceSlotId === e.sourceSlotId && a.authorizationId === e.authorizationId &&
  a.runtimeId === e.runtimeId && a.retirementOwnerId === e.retirementOwnerId &&
  a.credentialLineageId === e.credentialLineageId && same(a.authorizationFence, e.authorizationFence);
const usable = (s: State, a: Authorization, e: C.ConsumeAuthorization | C.ReleaseProcess): C.DenialReason | null =>
  !bindingMatches(a, e) ? "wrong-binding" : a.revokedAt !== null ? "authorization-revoked" :
    a.expiredAt !== null || e.authoritativeTick >= a.expiresAt ? "authorization-expired" : fenceReason(s, a.authorizationFence);
const revoke = (s: State, event: C.ProtocolEvent, predicate: (a: Authorization) => boolean) => {
  let authorizations = s.authorizations;
  const effects: C.AuthorizationRevokedEffect[] = [];
  for (const [id, record] of s.authorizations) if (predicate(record) && record.revokedAt === null) {
    authorizations = withMap(authorizations, id, { ...record, revokedAt: event.eventId });
    effects.push({ type: "authorization-revoked", causalEventId: event.eventId,
      authorizationId: id, authorizationFence: record.authorizationFence });
  }
  return { authorizations, effects };
};
const register = (s: State, e: C.RegisterProtocol): QualificationTransition => {
  if (s.registration !== null) return reject(s, e, "terminal-already-recorded");
  if (e.authenticatedPredecessorId !== null) return reject(s, e, "wrong-binding");
  const registration: Registration = { ...e };
  return accept(s, e, { registration,
    sourceFence: { generation: e.sourceFenceGeneration, open: true },
    campaignFence: { generation: e.campaignFenceGeneration, open: true },
    familyFence: { generation: e.familyAllocationFenceGeneration, open: true },
    projections: { ...s.projections, claim: "eligible" } }, []);
};
const issue = (s: State, e: C.IssueAuthorization): QualificationTransition => {
  const r = s.registration!;
  if (!rootMatches(r, e) || e.sourceSlotId !== r.sourceSlotId || e.runtimeId !== r.runtimeId)
    return reject(s, e, "wrong-binding");
  const mismatch = ownerMismatch(r, e); if (mismatch) return reject(s, e, mismatch);
  if (s.projections.sourceEvidence.type !== "open") return reject(s, e, "source-terminal");
  if (s.authorizations.has(e.authorizationId)) return reject(s, e, "authorization-unavailable");
  if (e.authorizationFence.scope === "campaign" && launchBarrier(s)) return reject(s, e, "gate-closed");
  const denied = fenceReason(s, e.authorizationFence); if (denied) return reject(s, e, denied);
  if (e.authoritativeTick >= e.expiresAt) return reject(s, e, "authorization-expired");
  const record: Authorization = { ...e, authorizationFence: { ...e.authorizationFence },
    consumedAt: null, revokedAt: null, expiredAt: null };
  return accept(s, e, { authorizations: withMap(s.authorizations, e.authorizationId, record) }, [{
    type: "authorization-issued", causalEventId: e.eventId, authorizationId: e.authorizationId,
    sourceFamilyRootId: e.sourceFamilyRootId, authorizationFence: e.authorizationFence,
  }]);
};
const consume = (s: State, e: C.ConsumeAuthorization): QualificationTransition => {
  const a = s.authorizations.get(e.authorizationId);
  if (!a) return reject(s, e, "authorization-unavailable");
  const denied = usable(s, a, e); if (denied) return reject(s, e, denied);
  if (a.authorizationFence.scope === "campaign" && launchBarrier(s)) return reject(s, e, "gate-closed");
  if (a.consumedAt !== null) return reject(s, e, "authorization-consumed");
  return accept(s, e, { authorizations: withMap(s.authorizations, e.authorizationId,
    { ...a, consumedAt: e.eventId }) }, []);
};
const revokeOne = (s: State, e: C.RevokeAuthorization): QualificationTransition => {
  if (!rootMatches(s.registration!, e)) return reject(s, e, "wrong-binding");
  const a = s.authorizations.get(e.authorizationId);
  if (!a) return reject(s, e, "authorization-unavailable");
  if (!same(a.authorizationFence, e.authorizationFence)) return reject(s, e, "wrong-binding");
  if (a.revokedAt !== null) return reject(s, e, "authorization-revoked");
  return accept(s, e, { authorizations: withMap(s.authorizations, e.authorizationId,
    { ...a, revokedAt: e.eventId }) }, [{ type: "authorization-revoked", causalEventId: e.eventId,
      authorizationId: e.authorizationId, authorizationFence: a.authorizationFence }]);
};
const expire = (s: State, e: C.ExpireAuthorization): QualificationTransition => {
  if (!rootMatches(s.registration!, e)) return reject(s, e, "wrong-binding");
  const a = s.authorizations.get(e.authorizationId);
  if (!a) return reject(s, e, "authorization-unavailable");
  if (!same(a.authorizationFence, e.authorizationFence)) return reject(s, e, "wrong-binding");
  if (a.expiredAt !== null) return reject(s, e, "authorization-expired");
  if (e.authoritativeTick < a.expiresAt) return reject(s, e, "deadline-not-reached");
  const selected = fence(s, a.authorizationFence);
  const changes: Partial<State> = a.authorizationFence.scope === "source" ? {
    authorizations: withMap(s.authorizations, e.authorizationId, { ...a, expiredAt: e.eventId }),
    sourceFence: { ...selected, open: false },
  } : { authorizations: withMap(s.authorizations, e.authorizationId, { ...a, expiredAt: e.eventId }),
    campaignFence: { ...selected, open: false } };
  return accept(s, e, changes, [{ type: "gate-closed", causalEventId: e.eventId,
    fence: a.authorizationFence.scope, generation: selected.generation }]);
};
const sourceTerminal = (s: State, e: C.CloseSource | C.AbandonSource): QualificationTransition => {
  if (!rootMatches(s.registration!, e)) return reject(s, e, "wrong-binding");
  if (s.projections.sourceEvidence.type !== "open") return reject(s, e, "terminal-already-recorded");
  if (!s.sourceFence!.open) return reject(s, e, "gate-closed");
  if (e.expectedGeneration !== s.sourceFence!.generation || e.nextGeneration <= e.expectedGeneration)
    return reject(s, e, "stale-generation");
  if (s.receipts.has(e.receiptId)) return reject(s, e, "receipt-replay");
  const projection: Exclude<C.SourceEvidenceProjection, { readonly type: "open" }> =
    e.type === "CloseSource" ? { type: "closed", receiptId: e.receiptId, sourceDigest: e.sourceDigest } :
      { type: "abandoned", receiptId: e.receiptId, proofId: e.proofId };
  const revoked = revoke(s, e, (a) => a.authorizationFence.scope === "source" && a.consumedAt === null);
  const effects: C.DeclaredEffect[] = [terminal(e, { type: "source", projection }),
    { type: "gate-closed", causalEventId: e.eventId, fence: "source", generation: e.nextGeneration },
    ...revoked.effects];
  if (e.type === "CloseSource") effects.push({ type: "gate-closed", causalEventId: e.eventId,
    fence: "family-allocation", generation: s.familyFence!.generation });
  return accept(s, e, { sourceFence: { generation: e.nextGeneration, open: false },
    familyFence: e.type === "CloseSource" ? { ...s.familyFence!, open: false } : s.familyFence,
    authorizations: revoked.authorizations, receipts: withSet(s.receipts, e.receiptId),
    projections: { ...s.projections, sourceEvidence: projection } }, effects);
};
const advance = (s: State, e: C.AdvanceFence): QualificationTransition => {
  if (!rootMatches(s.registration!, e)) return reject(s, e, "wrong-binding");
  const current = e.fence === "source" ? s.sourceFence! : e.fence === "campaign" ? s.campaignFence! : s.familyFence!;
  if (!current.open) return reject(s, e, "gate-closed");
  if (current.generation !== e.expectedGeneration || e.nextGeneration <= e.expectedGeneration)
    return reject(s, e, "stale-generation");
  const revoked = revoke(s, e, (a) => e.fence === "family-allocation" ? a.authorizationFence.scope === "source" :
    a.authorizationFence.scope === e.fence);
  const closed = { generation: e.nextGeneration, open: false } as const;
  const changes: Partial<State> = e.fence === "source" ?
    { authorizations: revoked.authorizations, sourceFence: closed } : e.fence === "campaign" ?
    { authorizations: revoked.authorizations, campaignFence: closed } :
    { authorizations: revoked.authorizations, familyFence: closed };
  return accept(s, e, changes, [{ type: "gate-closed", causalEventId: e.eventId,
    fence: e.fence, generation: e.nextGeneration }, ...revoked.effects]);
};
const release = (s: State, e: C.ReleaseProcess): QualificationTransition => {
  if (e.attemptId !== s.registration!.attemptId) return reject(s, e, "wrong-binding");
  const a = s.authorizations.get(e.authorizationId);
  if (!a) return reject(s, e, "authorization-unavailable");
  const denied = usable(s, a, e); if (denied) return reject(s, e, denied);
  if (a.consumedAt === null) return reject(s, e, "authorization-unavailable");
  if (s.projections.launch !== null) return reject(s, e, "terminal-already-recorded");
  if (launchBarrier(s)) return reject(s, e, "gate-closed");
  if (s.projections.runtime !== "not-started") return reject(s, e, "runtime-unresolved");
  if (s.receipts.has(e.launchReceiptId)) return reject(s, e, "receipt-replay");
  const launch: C.LaunchTerminalProjection = { type: "started", receiptId: e.launchReceiptId };
  return accept(s, e, { receipts: withSet(s.receipts, e.launchReceiptId),
    projections: { ...s.projections, launch, runtime: "live" } }, [{
      type: "process-release-requested", causalEventId: e.eventId, authorizationId: e.authorizationId,
      runtimeId: e.runtimeId, authorizationFence: e.authorizationFence,
    }]);
};
const releaseDenied = (s: State, e: C.RecordReleaseDenied): QualificationTransition => {
  const a = s.authorizations.get(e.authorizationId);
  if (!a) return reject(s, e, "authorization-unavailable");
  if (!bindingMatches(a, e)) return reject(s, e, "wrong-binding");
  if (a.consumedAt === null) return reject(s, e, "authorization-unavailable");
  if (s.projections.launch !== null) return reject(s, e, "terminal-already-recorded");
  if (s.projections.runtime !== "not-started") return reject(s, e, "runtime-unresolved");
  if (s.receipts.has(e.receiptId)) return reject(s, e, "receipt-replay");
  const launch: C.LaunchTerminalProjection = { type: "release-denied", receiptId: e.receiptId };
  return accept(s, e, { receipts: withSet(s.receipts, e.receiptId),
    projections: { ...s.projections, launch, runtime: "not-started" } },
  [terminal(e, { type: "launch", projection: launch })]);
};
const crash = (s: State, e: C.ObserveCrash): QualificationTransition => {
  if (!rootMatches(s.registration!, e) || e.runtimeId !== s.registration!.runtimeId)
    return reject(s, e, "wrong-binding");
  const a = s.authorizations.get(e.authorizationId);
  if (!a || a.consumedAt === null) return reject(s, e, "authorization-unavailable");
  if (a.authorizationFence.expectedGeneration !== e.expectedGeneration) return reject(s, e, "stale-generation");
  if (s.projections.launch !== null) return reject(s, e, "terminal-already-recorded");
  return accept(s, e, { projections: { ...s.projections, runtime: "unknown",
    resourceRetirement: { type: "quarantined" } } }, [
    { type: "resource-quarantined", causalEventId: e.eventId,
      sourceFamilyRootId: e.sourceFamilyRootId, runtimeId: e.runtimeId },
    { type: "runtime-reconciliation-requested", causalEventId: e.eventId, runtimeId: e.runtimeId },
  ]);
};
const launchDeadline = (s: State, e: C.ReachLaunchDeadline): QualificationTransition => {
  if (e.authoritativeTick < s.registration!.launchDeadline) return reject(s, e, "deadline-not-reached");
  const a = s.authorizations.get(e.authorizationId);
  if (!a || !bindingMatches(a, e)) return reject(s, e, a ? "wrong-binding" : "authorization-unavailable");
  if (s.projections.launch !== null) return reject(s, e, "terminal-already-recorded");
  if (e.result === "start-unknown" && (a.consumedAt === null || s.projections.runtime !== "unknown"))
    return reject(s, e, "runtime-unresolved");
  if (e.result === "never-started" && (a.consumedAt !== null || s.projections.runtime !== "not-started"))
    return reject(s, e, "wrong-binding");
  if (s.receipts.has(e.observationReceiptId)) return reject(s, e, "receipt-replay");
  const launch: C.LaunchTerminalProjection = { type: e.result, receiptId: e.observationReceiptId };
  return accept(s, e, { receipts: withSet(s.receipts, e.observationReceiptId),
    projections: { ...s.projections, launch } }, [terminal(e, { type: "launch", projection: launch })]);
};
const restart = (s: State, e: C.RestartObserved): QualificationTransition => {
  if (!rootMatches(s.registration!, e) || e.runtimeId !== s.registration!.runtimeId)
    return reject(s, e, "wrong-binding");
  if (s.projections.resourceRetirement.type === "retired") return reject(s, e, "terminal-already-recorded");
  if (s.projections.runtime === "not-started" && ![...s.authorizations.values()].some((a) => a.consumedAt))
    return reject(s, e, "runtime-unresolved");
  return accept(s, e, { projections: { ...s.projections, runtime: "unknown",
    resourceRetirement: { type: "quarantined" } } }, [
    { type: "runtime-reconciliation-requested", causalEventId: e.eventId, runtimeId: e.runtimeId },
    { type: "resource-quarantined", causalEventId: e.eventId,
      sourceFamilyRootId: e.sourceFamilyRootId, runtimeId: e.runtimeId },
  ]);
};
const reconcile = (s: State, e: C.ReconcileRuntime): QualificationTransition => {
  if (!rootMatches(s.registration!, e) || e.runtimeId !== s.registration!.runtimeId)
    return reject(s, e, "wrong-binding");
  if (s.projections.runtime === "not-started" || s.projections.resourceRetirement.type === "retired")
    return reject(s, e, "runtime-unresolved");
  const resourceRetirement: C.ResourceRetirementProjection = e.observation === "terminated" ?
    (s.projections.resourceRetirement.type === "active" ? { type: "active" } : { type: "pending" }) :
    { type: "quarantined" };
  const effects: C.DeclaredEffect[] = e.observation === "unknown" ? [
    { type: "resource-quarantined", causalEventId: e.eventId,
      sourceFamilyRootId: e.sourceFamilyRootId, runtimeId: e.runtimeId },
    { type: "runtime-reconciliation-requested", causalEventId: e.eventId, runtimeId: e.runtimeId },
  ] : e.observation === "live" ? [
    { type: "runtime-termination-requested", causalEventId: e.eventId, runtimeId: e.runtimeId },
  ] : [];
  return accept(s, e, { projections: { ...s.projections, runtime: e.observation, resourceRetirement } }, effects);
};
const retirement = (s: State, e: C.RequestRetirement): QualificationTransition => {
  if (!rootMatches(s.registration!, e)) return reject(s, e, "wrong-binding");
  const mismatch = ownerMismatch(s.registration!, e); if (mismatch) return reject(s, e, mismatch);
  if (s.projections.sourceEvidence.type === "open") return reject(s, e, "source-terminal");
  if (s.projections.resourceRetirement.type === "retired") return reject(s, e, "terminal-already-recorded");
  const quarantine = s.projections.runtime === "unknown" || s.projections.runtime === "live";
  const revoked = revoke(s, e, () => true);
  const effects: C.DeclaredEffect[] = [...revoked.effects];
  if (quarantine) effects.push(
    { type: "resource-quarantined", causalEventId: e.eventId,
      sourceFamilyRootId: e.sourceFamilyRootId, runtimeId: s.registration!.runtimeId },
    { type: "runtime-reconciliation-requested", causalEventId: e.eventId, runtimeId: s.registration!.runtimeId });
  return accept(s, e, { authorizations: revoked.authorizations,
    projections: { ...s.projections, resourceRetirement: { type: quarantine ? "quarantined" : "pending" } } }, effects);
};
const cleanup = (s: State, e: C.RequestCleanup): QualificationTransition => {
  if (!rootMatches(s.registration!, e) || e.runtimeId !== s.registration!.runtimeId)
    return reject(s, e, "wrong-binding");
  const mismatch = ownerMismatch(s.registration!, e); if (mismatch) return reject(s, e, mismatch);
  if (s.projections.sourceEvidence.type === "open") return reject(s, e, "source-terminal");
  if (s.projections.runtime !== "terminated" && s.projections.runtime !== "not-started")
    return reject(s, e, "runtime-unresolved");
  if (s.projections.resourceRetirement.type === "active" || s.projections.resourceRetirement.type === "retired")
    return reject(s, e, "gate-closed");
  if (s.cleanupRequested) return reject(s, e, "terminal-already-recorded");
  return accept(s, e, { cleanupRequested: true,
    projections: { ...s.projections, resourceRetirement: { type: "pending" } } }, [{
      type: "resource-cleanup-requested", causalEventId: e.eventId,
      sourceFamilyRootId: e.sourceFamilyRootId, runtimeId: e.runtimeId, proofId: e.terminationProofId,
    }]);
};
const hasEvidence = (items: readonly C.EvidenceReference[], expected: C.EvidenceReference): boolean =>
  items.some((item) => same(item, expected));
const complete = (s: State, e: C.CompleteRetirement): QualificationTransition => {
  if (!rootMatches(s.registration!, e) || e.runtimeId !== s.registration!.runtimeId)
    return reject(s, e, "wrong-binding");
  const mismatch = ownerMismatch(s.registration!, e); if (mismatch) return reject(s, e, mismatch);
  if (s.projections.resourceRetirement.type === "retired") return reject(s, e, "terminal-already-recorded");
  if (s.projections.runtime !== "terminated" && s.projections.runtime !== "not-started")
    return reject(s, e, "runtime-unresolved");
  if (!s.cleanupRequested || s.projections.sourceEvidence.type === "open") return reject(s, e, "gate-closed");
  if (s.projections.sourceEvidence.receiptId !== e.sourceTerminalReceiptId ||
      !hasEvidence(e.retainedEvidence, { type: "receipt", receiptId: e.sourceTerminalReceiptId }))
    return reject(s, e, "wrong-binding");
  if (s.projections.admission.type !== "pending" &&
      !hasEvidence(e.retainedEvidence, { type: "receipt", receiptId: s.projections.admission.receiptId }))
    return reject(s, e, "wrong-binding");
  const tombstone: C.RetirementTombstoneProjection = { tombstoneId: e.tombstoneId,
    sourceTerminal: s.projections.sourceEvidence, retirementOwnerId: e.retirementOwnerId,
    cleanupProofId: e.cleanupProofId, retainedEvidence: [...e.retainedEvidence] };
  return accept(s, e, { projections: { ...s.projections,
    resourceRetirement: { type: "retired", tombstone } } }, [{
      type: "retirement-tombstone-appended", causalEventId: e.eventId,
      sourceFamilyRootId: e.sourceFamilyRootId, tombstoneId: e.tombstoneId,
      retirementOwnerId: e.retirementOwnerId, cleanupProofId: e.cleanupProofId,
    }]);
};
const attemptReceipt = (s: State, e: C.RecordAttemptReceipt): QualificationTransition => {
  if (e.attemptId !== s.registration!.attemptId || e.runtimeId !== s.registration!.runtimeId)
    return reject(s, e, "wrong-binding");
  if (s.receipts.has(e.receiptId)) return reject(s, e, "receipt-replay");
  if (s.projections.attempt !== null) {
    const conflict = s.projections.attempt.type !== e.result;
    const effects: C.DeclaredEffect[] = [{ type: "late-receipt-retained", causalEventId: e.eventId,
      evidence: { type: "attempt", attemptId: e.attemptId, receiptId: e.receiptId, result: e.result } }];
    if (conflict) effects.push(invalid(e, { type: "receipt", receiptId: e.receiptId }));
    return accept(s, e, { receipts: withSet(s.receipts, e.receiptId),
      projections: conflict ? { ...s.projections, claim: "invalid" } : s.projections }, effects);
  }
  const attempt: C.AttemptTerminalProjection = { type: e.result, receiptId: e.receiptId };
  return accept(s, e, { receipts: withSet(s.receipts, e.receiptId),
    projections: { ...s.projections, attempt } }, [terminal(e, { type: "attempt", projection: attempt })]);
};
const attemptDeadline = (s: State, e: C.ReachAttemptDeadline): QualificationTransition => {
  if (e.attemptId !== s.registration!.attemptId) return reject(s, e, "wrong-binding");
  if (e.authoritativeTick < s.registration!.attemptDeadline) return reject(s, e, "deadline-not-reached");
  if (s.projections.attempt !== null) return reject(s, e, "terminal-already-recorded");
  if (s.receipts.has(e.observationReceiptId)) return reject(s, e, "receipt-replay");
  const attempt: C.AttemptTerminalProjection = { type: e.result, receiptId: e.observationReceiptId };
  return accept(s, e, { receipts: withSet(s.receipts, e.observationReceiptId),
    projections: { ...s.projections, attempt } }, [terminal(e, { type: "attempt", projection: attempt })]);
};
const checkpoint = (s: State, e: C.CheckpointEffective): QualificationTransition => {
  if (e.checkpointId !== s.registration!.checkpointId) return reject(s, e, "wrong-binding");
  if (!s.campaignFence!.open) return reject(s, e, "gate-closed");
  if (e.expectedGeneration !== s.campaignFence!.generation) return reject(s, e, "stale-generation");
  if (s.checkpointEffective) return reject(s, e, "terminal-already-recorded");
  return accept(s, e, { checkpointEffective: true }, []);
};
const stopReceipt = (s: State, e: C.RecordStopReceipt): QualificationTransition => {
  if (e.checkpointId !== s.registration!.checkpointId) return reject(s, e, "wrong-binding");
  if (!s.checkpointEffective) return reject(s, e, "gate-closed");
  if (e.expectedGeneration !== s.campaignFence!.generation) return reject(s, e, "stale-generation");
  if (s.receipts.has(e.receiptId)) return reject(s, e, "receipt-replay");
  if (s.projections.stopCheckpoint !== null) {
    const conflict = s.projections.stopCheckpoint.type !== e.result;
    const effects: C.DeclaredEffect[] = [{ type: "late-receipt-retained", causalEventId: e.eventId,
      evidence: { type: "stop", checkpointId: e.checkpointId, receiptId: e.receiptId, result: e.result } }];
    if (conflict) effects.push(invalid(e, { type: "receipt", receiptId: e.receiptId }));
    return accept(s, e, { receipts: withSet(s.receipts, e.receiptId),
      projections: conflict ? { ...s.projections, claim: "invalid" } : s.projections }, effects);
  }
  const stopCheckpoint: C.StopTerminalProjection = { type: e.result, receiptId: e.receiptId };
  return accept(s, e, { receipts: withSet(s.receipts, e.receiptId), stopBarrier: e.result === "stop",
    projections: { ...s.projections, stopCheckpoint } }, [terminal(e, { type: "stop", projection: stopCheckpoint })]);
};
const stopDeadline = (s: State, e: C.ReachStopDeadline): QualificationTransition => {
  if (e.checkpointId !== s.registration!.checkpointId) return reject(s, e, "wrong-binding");
  if (!s.checkpointEffective) return reject(s, e, "gate-closed");
  if (e.expectedGeneration !== s.campaignFence!.generation) return reject(s, e, "stale-generation");
  if (e.authoritativeTick < s.registration!.stopDeadline) return reject(s, e, "deadline-not-reached");
  if (s.projections.stopCheckpoint !== null) return reject(s, e, "terminal-already-recorded");
  if (s.receipts.has(e.observationReceiptId)) return reject(s, e, "receipt-replay");
  const stopCheckpoint: C.StopTerminalProjection = { type: e.result, receiptId: e.observationReceiptId };
  return accept(s, e, { receipts: withSet(s.receipts, e.observationReceiptId), stopBarrier: true,
    projections: { ...s.projections, stopCheckpoint,
      claim: s.projections.claim === "invalid" ? "invalid" : "non-promotional" } },
  [terminal(e, { type: "stop", projection: stopCheckpoint })]);
};
const recoverStop = (s: State, e: C.RecoverStopFence): QualificationTransition => {
  if (e.checkpointId !== s.registration!.checkpointId) return reject(s, e, "wrong-binding");
  if (!s.stopBarrier) return reject(s, e, "gate-closed");
  if (e.expectedGeneration !== s.campaignFence!.generation || e.nextGeneration <= e.expectedGeneration)
    return reject(s, e, "stale-generation");
  const revoked = revoke(s, e, (a) => a.authorizationFence.scope === "campaign");
  return accept(s, e, { campaignFence: { generation: e.nextGeneration, open: false },
    stopBarrier: false, authorizations: revoked.authorizations }, [{ type: "gate-closed",
      causalEventId: e.eventId, fence: "campaign", generation: e.nextGeneration }, ...revoked.effects]);
};
const buildMatches = (r: Registration, e: { readonly sourceClaimFamilyId: C.SourceClaimFamilyId;
  readonly sourceFamilyRootId: C.SourceFamilyRootId; readonly sourceSlotId: C.SourceSlotId;
  readonly buildAttemptId: C.BuildAttemptId }): boolean => rootMatches(r, e) &&
  e.sourceSlotId === r.sourceSlotId && e.buildAttemptId === r.buildAttemptId;
const buildResult = (s: State, e: C.RecordBuildResult): QualificationTransition => {
  if (s.buildReceipts.has(e.buildReceiptId)) return accept(s, e,
    { projections: { ...s.projections, claim: "invalid" } }, [{ type: "denial-recorded",
    causalEventId: e.eventId, reason: "receipt-replay",
    subject: { type: "build-attempt", buildAttemptId: e.buildAttemptId } },
  { type: "execution-gate-set", causalEventId: e.eventId,
    buildAttemptId: e.buildAttemptId, value: "denied" },
  invalid(e, { type: "build-receipt", buildReceiptId: e.buildReceiptId })]);
  if (!buildMatches(s.registration!, e)) return reject(s, e, "wrong-binding");
  if (s.projections.sourceEvidence.type !== "closed" || s.projections.admission.type !== "accepted")
    return reject(s, e, "gate-closed");
  if (s.projections.build !== null) {
    const effects: C.DeclaredEffect[] = [{ type: "late-receipt-retained", causalEventId: e.eventId,
      evidence: { type: "build", buildAttemptId: e.buildAttemptId,
        buildReceiptId: e.buildReceiptId, result: e.result } },
      invalid(e, { type: "build-receipt", buildReceiptId: e.buildReceiptId })];
    return accept(s, e, { buildReceipts: withSet(s.buildReceipts, e.buildReceiptId),
      projections: { ...s.projections, claim: "invalid" } }, effects);
  }
  const build: C.BuildTerminalProjection = { type: e.result.type, buildReceiptId: e.buildReceiptId };
  return accept(s, e, { buildReceipts: withSet(s.buildReceipts, e.buildReceiptId),
    buildFact: { projection: build, artifactDigest: e.result.type === "succeeded" ? e.result.artifactDigest : null },
    projections: { ...s.projections, build } }, [terminal(e, { type: "build", projection: build }),
      { type: "execution-gate-set", causalEventId: e.eventId,
        buildAttemptId: e.buildAttemptId, value: "denied" }]);
};
const buildDeadline = (s: State, e: C.ReachBuildDeadline): QualificationTransition => {
  if (!buildMatches(s.registration!, e)) return reject(s, e, "wrong-binding");
  if (s.projections.sourceEvidence.type !== "closed" || s.projections.admission.type !== "accepted")
    return reject(s, e, "gate-closed");
  if (e.authoritativeTick < s.registration!.buildDeadline) return reject(s, e, "deadline-not-reached");
  if (s.projections.build !== null) return reject(s, e, "terminal-already-recorded");
  if (s.receipts.has(e.observationReceiptId)) return reject(s, e, "receipt-replay");
  const build: C.BuildTerminalProjection = { type: e.result, observationReceiptId: e.observationReceiptId };
  return accept(s, e, { receipts: withSet(s.receipts, e.observationReceiptId),
    buildFact: { projection: build, artifactDigest: null }, projections: { ...s.projections, build } },
  [terminal(e, { type: "build", projection: build }), { type: "execution-gate-set",
    causalEventId: e.eventId, buildAttemptId: e.buildAttemptId, value: "denied" }]);
};
const consistency = (s: State, e: C.RecordBuildConsistencyReceipt): QualificationTransition => {
  const replay = s.consistencyReceipts.has(e.consistencyReceiptId);
  const wrong = !buildMatches(s.registration!, e);
  if (replay || wrong) {
    const effects: C.DeclaredEffect[] = [];
    if (replay) effects.push({ type: "denial-recorded", causalEventId: e.eventId,
      reason: "receipt-replay", subject: { type: "build-attempt", buildAttemptId: e.buildAttemptId } });
    effects.push({ type: "execution-gate-set", causalEventId: e.eventId,
      buildAttemptId: e.buildAttemptId, value: "denied" },
    invalid(e, { type: "consistency-receipt", consistencyReceiptId: e.consistencyReceiptId }));
    return accept(s, e, { consistencyReceipts: withSet(s.consistencyReceipts, e.consistencyReceiptId),
      projections: { ...s.projections, claim: "invalid" } }, effects);
  }
  if (s.projections.sourceEvidence.type !== "closed" || s.projections.admission.type !== "accepted")
    return reject(s, e, "gate-closed");
  if (s.projections.buildConsistency !== null) {
    return accept(s, e, { consistencyReceipts: withSet(s.consistencyReceipts, e.consistencyReceiptId),
      projections: { ...s.projections, claim: "invalid" } }, [{ type: "late-receipt-retained",
        causalEventId: e.eventId, evidence: { type: "build-consistency", buildAttemptId: e.buildAttemptId,
          consistencyReceiptId: e.consistencyReceiptId, result: e.result } },
      invalid(e, { type: "consistency-receipt", consistencyReceiptId: e.consistencyReceiptId })]);
  }
  const receiptBound = s.buildFact?.projection !== undefined && "buildReceiptId" in s.buildFact.projection &&
    s.buildFact.projection.buildReceiptId === e.buildReceiptId;
  const validMatch = e.result.type === "match" && s.buildFact?.projection.type === "succeeded" &&
    receiptBound && s.buildFact.artifactDigest === e.result.artifactDigest;
  const invalidInput = e.result.type === "invalid" || e.result.type === "match" && !validMatch ||
    s.buildFact?.projection !== undefined && "buildReceiptId" in s.buildFact.projection && !receiptBound;
  const projection: C.BuildConsistencyTerminalProjection = invalidInput ?
    { type: "invalid", consistencyReceiptId: e.consistencyReceiptId } :
    { type: e.result.type, consistencyReceiptId: e.consistencyReceiptId };
  const allowed = projection.type === "match";
  const effects: C.DeclaredEffect[] = [terminal(e, { type: "build-consistency", projection }),
    { type: "execution-gate-set", causalEventId: e.eventId,
      buildAttemptId: e.buildAttemptId, value: allowed ? "allowed" : "denied" }];
  if (invalidInput) effects.push(invalid(e, { type: "consistency-receipt", consistencyReceiptId: e.consistencyReceiptId }));
  return accept(s, e, { consistencyReceipts: withSet(s.consistencyReceipts, e.consistencyReceiptId),
    projections: { ...s.projections, buildConsistency: projection,
      claim: invalidInput ? "invalid" : s.projections.claim } }, effects);
};
const consistencyDeadline = (s: State, e: C.ReachBuildConsistencyDeadline): QualificationTransition => {
  if (!buildMatches(s.registration!, e)) return reject(s, e, "wrong-binding");
  if (s.projections.sourceEvidence.type !== "closed" || s.projections.admission.type !== "accepted" ||
      s.projections.build === null) return reject(s, e, "gate-closed");
  if (e.authoritativeTick < s.registration!.buildConsistencyDeadline) return reject(s, e, "deadline-not-reached");
  if (s.projections.buildConsistency !== null) return reject(s, e, "terminal-already-recorded");
  if (s.receipts.has(e.observationReceiptId)) return reject(s, e, "receipt-replay");
  const projection: C.BuildConsistencyTerminalProjection = { type: e.result,
    observationReceiptId: e.observationReceiptId };
  return accept(s, e, { receipts: withSet(s.receipts, e.observationReceiptId),
    projections: { ...s.projections, buildConsistency: projection,
      claim: s.projections.claim === "invalid" ? "invalid" : "non-promotional" } },
  [terminal(e, { type: "build-consistency", projection }), { type: "execution-gate-set",
    causalEventId: e.eventId, buildAttemptId: e.buildAttemptId, value: "denied" }]);
};
const admission = (s: State, e: C.RecordAdmission): QualificationTransition => {
  if (!rootMatches(s.registration!, e) || e.admissionId !== s.registration!.admissionId)
    return reject(s, e, "wrong-binding");
  if (s.projections.sourceEvidence.type !== "closed") return reject(s, e, "source-terminal");
  if (s.projections.admission.type !== "pending") return reject(s, e, "terminal-already-recorded");
  if (s.receipts.has(e.receiptId)) return reject(s, e, "receipt-replay");
  const projection: Exclude<C.AdmissionProjection, { readonly type: "pending" }> =
    { type: e.result, receiptId: e.receiptId };
  const revoked = e.result === "failed" ? revoke(s, e, () => true) : { authorizations: s.authorizations, effects: [] };
  return accept(s, e, { receipts: withSet(s.receipts, e.receiptId), authorizations: revoked.authorizations,
    projections: { ...s.projections, admission: projection,
      claim: e.result === "failed" && s.projections.claim !== "invalid" ?
        "non-promotional" : s.projections.claim } },
  [terminal(e, { type: "admission", projection }), ...revoked.effects]);
};
const dispatch = (s: State, e: C.ProtocolEvent): QualificationTransition => {
  switch (e.type) {
    case "RegisterProtocol": return register(s, e); case "IssueAuthorization": return issue(s, e);
    case "ConsumeAuthorization": return consume(s, e); case "RevokeAuthorization": return revokeOne(s, e);
    case "ExpireAuthorization": return expire(s, e); case "CloseSource": case "AbandonSource": return sourceTerminal(s, e);
    case "AdvanceFence": return advance(s, e); case "ReleaseProcess": return release(s, e);
    case "RecordReleaseDenied": return releaseDenied(s, e); case "ObserveCrash": return crash(s, e);
    case "ReachLaunchDeadline": return launchDeadline(s, e); case "RestartObserved": return restart(s, e);
    case "ReconcileRuntime": return reconcile(s, e); case "RequestRetirement": return retirement(s, e);
    case "RequestCleanup": return cleanup(s, e); case "CompleteRetirement": return complete(s, e);
    case "RecordAttemptReceipt": return attemptReceipt(s, e); case "ReachAttemptDeadline": return attemptDeadline(s, e);
    case "CheckpointEffective": return checkpoint(s, e); case "RecordStopReceipt": return stopReceipt(s, e);
    case "ReachStopDeadline": return stopDeadline(s, e); case "RecoverStopFence": return recoverStop(s, e);
    case "RecordBuildResult": return buildResult(s, e); case "ReachBuildDeadline": return buildDeadline(s, e);
    case "RecordBuildConsistencyReceipt": return consistency(s, e);
    case "ReachBuildConsistencyDeadline": return consistencyDeadline(s, e); case "RecordAdmission": return admission(s, e);
  }
};
export const transitionQualificationEvent = (
  reducerState: QualificationReducerState, event: C.ProtocolEvent,
): QualificationTransition => {
  const s = stateOf(reducerState), prior = s.events.get(event.eventId);
  if (prior) return same(prior.event, event) ? { state: s, result: prior.result } :
    { state: s, result: { decision: "rejected", effects: [{ type: "denial-recorded",
      causalEventId: event.eventId, reason: "wrong-binding", subject: subject(event) }],
    terminalProjections: s.projections } };
  if (s.registration === null && event.type !== "RegisterProtocol") return reject(s, event, "not-registered");
  if (s.registration !== null && (event.protocolRevisionId !== s.registration.protocolRevisionId ||
    event.custodyAuthorityId !== s.registration.custodyAuthorityId ||
    event.authenticatedPredecessorId !== s.lastEventId ||
    s.lastTick !== null && event.authoritativeTick < s.lastTick)) return reject(s, event, "wrong-binding");
  return dispatch(s, event);
};
export const foldQualificationHistory = (
  events: readonly C.ProtocolEvent[], maximumEvents: number,
): QualificationFold => {
  if (!Number.isSafeInteger(maximumEvents) || maximumEvents < 0)
    throw new TypeError("maximumEvents must be a non-negative safe integer.");
  if (events.length > maximumEvents) throw new RangeError("Qualification history exceeds maximumEvents.");
  let state = initializeQualificationReducer();
  const results: C.TransitionResult[] = [];
  for (const event of events) { const next = transitionQualificationEvent(state, event);
    state = next.state; results.push(next.result); }
  return { state, results };
};
