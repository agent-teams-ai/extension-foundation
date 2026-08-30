import * as C from "./dogfooding-protocol-contract.ts";
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
  readonly sourceFenceGeneration: C.FenceGeneration;
  readonly campaignFenceGeneration: C.FenceGeneration;
  readonly familyAllocationFenceGeneration: C.FenceGeneration;
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
  readonly launchPurpose: C.LaunchPurpose;
  readonly expiresAt: C.AuthoritativeTick;
  readonly consumedAt: C.EventId | null;
  readonly revokedAt: C.EventId | null;
  readonly expiredAt: C.EventId | null;
  readonly launch: C.LaunchTerminalProjection | null;
}
interface Fence { readonly generation: C.FenceGeneration; readonly open: boolean }
interface BuildFact {
  readonly projection: C.BuildTerminalProjection; readonly result: C.BuildResultInput | null;
  readonly artifactDigest: C.ArtifactDigest | null;
}
interface Observation {
  readonly event: C.ProtocolEvent; readonly result: C.TransitionResult;
}
interface State extends QualificationReducerState {
  readonly trusted: C.TrustedProtocolCoordinates;
  readonly registration: Registration | null;
  readonly sourceFence: Fence | null;
  readonly campaignFence: Fence | null;
  readonly familyFence: Fence | null;
  readonly authorizations: ReadonlyMap<C.AuthorizationId, Authorization>;
  readonly events: ReadonlyMap<C.EventId, Observation>;
  readonly receipts: ReadonlySet<C.ReceiptId>;
  readonly buildReceipts: ReadonlySet<C.BuildReceiptId>;
  readonly consistencyReceipts: ReadonlySet<C.ConsistencyReceiptId>;
  readonly tombstones: ReadonlySet<C.TombstoneId>;
  readonly lateFacts: ReadonlyMap<string, unknown>;
  readonly lastEventId: C.EventId | null;
  readonly lastTick: C.AuthoritativeTick | null;
  readonly projections: C.TerminalProjections;
  readonly checkpointEffective: boolean;
  readonly stopBarrier: boolean;
  readonly retirementRequested: boolean;
  readonly cleanupRequested: boolean;
  readonly postRetirementRuntime: Exclude<C.RuntimeProjection, "not-started"> | null;
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
const receiptUsed = (s: State, value: string): boolean => [...s.receipts, ...s.buildReceipts,
  ...s.consistencyReceipts, ...s.tombstones].some(candidate => candidate === value);
const eventReceipt = (event: C.ProtocolEvent): string | null => {
  switch (event.type) {
    case "CloseSource": case "AbandonSource": case "RecordReleaseDenied":
    case "RecordAttemptReceipt": case "RecordStopReceipt": case "RecordAdmission":
      return event.receiptId;
    case "ReleaseProcess": return event.launchReceiptId;
    case "ReachLaunchDeadline": case "ReachAttemptDeadline": case "ReachStopDeadline":
    case "ReachBuildDeadline": case "ReachBuildConsistencyDeadline": return event.observationReceiptId;
    case "RecordBuildResult": return event.buildReceiptId;
    case "RecordBuildConsistencyReceipt": return event.consistencyReceiptId;
    case "CompleteRetirement": return event.tombstoneId;
    default: return null;
  }
};
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
const acceptedEvent = (s: State, predicate: (event: C.ProtocolEvent) => boolean): boolean =>
  [...s.events.values()].some(observation => observation.result.decision === "accepted" &&
    predicate(observation.event));
const acceptedEvents = (s: State): readonly C.ProtocolEvent[] => [...s.events.values()]
  .filter(observation => observation.result.decision === "accepted")
  .map(observation => observation.event);
const lateConflict = (s: State, key: string, value: unknown): boolean => {
  const previous = s.lateFacts.get(key);
  return previous !== undefined && !same(previous, value);
};
const registrationMatches = (registered: Registration, candidate: C.RegisterProtocol): boolean =>
  registered.protocolRevisionId === candidate.protocolRevisionId &&
  registered.custodyAuthorityId === candidate.custodyAuthorityId &&
  registered.sourceClaimFamilyId === candidate.sourceClaimFamilyId &&
  registered.sourceFamilyRootId === candidate.sourceFamilyRootId &&
  registered.sourceSlotId === candidate.sourceSlotId && registered.attemptId === candidate.attemptId &&
  registered.runtimeId === candidate.runtimeId && registered.checkpointId === candidate.checkpointId &&
  registered.buildAttemptId === candidate.buildAttemptId &&
  registered.retirementOwnerId === candidate.retirementOwnerId &&
  registered.credentialLineageId === candidate.credentialLineageId &&
  registered.admissionId === candidate.admissionId &&
  registered.sourceFenceGeneration === candidate.sourceFenceGeneration &&
  registered.campaignFenceGeneration === candidate.campaignFenceGeneration &&
  registered.familyAllocationFenceGeneration === candidate.familyAllocationFenceGeneration &&
  registered.launchDeadline === candidate.launchDeadline &&
  registered.attemptDeadline === candidate.attemptDeadline && registered.stopDeadline === candidate.stopDeadline &&
  registered.buildDeadline === candidate.buildDeadline &&
  registered.buildConsistencyDeadline === candidate.buildConsistencyDeadline;
export const initializeQualificationReducer = (
  trusted: C.TrustedProtocolCoordinates,
): QualificationReducerState => {
  const state: State = { kind: "qualification-reducer-state", trusted, registration: null,
    sourceFence: null, campaignFence: null, familyFence: null, authorizations: new Map(),
    events: new Map(), receipts: new Set(), buildReceipts: new Set(),
    consistencyReceipts: new Set(), tombstones: new Set(), lateFacts: new Map(),
    lastEventId: null, lastTick: null, projections: emptyProjections(),
    checkpointEffective: false, stopBarrier: false, retirementRequested: false,
    cleanupRequested: false, postRetirementRuntime: null, buildFact: null };
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
  if ("buildAttemptId" in event && event.type !== "RegisterProtocol")
    return { type: "build-attempt", buildAttemptId: event.buildAttemptId };
  if ("authorizationId" in event) return { type: "authorization", authorizationId: event.authorizationId };
  if ("attemptId" in event && event.type !== "RegisterProtocol")
    return { type: "attempt", attemptId: event.attemptId };
  if ("runtimeId" in event && event.type !== "RegisterProtocol")
    return { type: "runtime", runtimeId: event.runtimeId };
  if ("checkpointId" in event && event.type !== "RegisterProtocol")
    return { type: "checkpoint", checkpointId: event.checkpointId };
  if (event.type === "RecordAdmission") return { type: "admission", admissionId: event.admissionId };
  return { type: "source-root", sourceFamilyRootId: event.sourceFamilyRootId };
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
const reject = (state: State, event: C.ProtocolEvent, reason: C.DenialReason): QualificationTransition => {
  const denied: C.DeclaredEffect = { type: "denial-recorded", causalEventId: event.eventId, reason, subject: subject(event) };
  const replay = reason === "receipt-replay", projections = replay ? { ...state.projections, claim: "invalid" as const } : state.projections;
  const result: C.TransitionResult = { decision: "rejected", effects: replay ? [denied,
    invalid(event, { type: "event", eventId: event.eventId })] : [denied], terminalProjections: projections };
  return { state: { ...state, projections, events: withMap(state.events, event.eventId, { event, result }) } as State, result };
};
const rejectTypedReplay = (state: State,
  event: C.RecordBuildResult | C.RecordBuildConsistencyReceipt,
  evidence: C.EvidenceReference): QualificationTransition => {
  const denied = reject(state, event, "receipt-replay");
  const result: C.TransitionResult = { ...denied.result, effects: [
    denied.result.effects[0]!, { type: "execution-gate-set", causalEventId: event.eventId,
      buildAttemptId: event.buildAttemptId, value: "denied" }, invalid(event, evidence)] };
  const candidate = stateOf(denied.state);
  const next: State = { ...candidate,
    events: withMap(state.events, event.eventId, { event, result }) };
  return { state: next, result };
};
const terminal = (event: C.ProtocolEvent, value: C.TerminalReference): C.TerminalAppendedEffect => ({ type: "terminal-appended", causalEventId: event.eventId, terminal: value });
const invalid = (event: C.ProtocolEvent, evidence: C.EvidenceReference): C.ClaimDispositionSetEffect => ({ type: "claim-disposition-set", causalEventId: event.eventId, value: "invalid", evidence });
const nonPromotional = (event: C.ProtocolEvent, evidence: C.EvidenceReference): C.ClaimDispositionSetEffect =>
  ({ type: "claim-disposition-set", causalEventId: event.eventId, value: "non-promotional", evidence });
type RuntimeSafetyEvidence = Pick<C.ReleaseProcess | C.RecordReleaseDenied | C.ReachLaunchDeadline,
  "eventId" | "sourceFamilyRootId" | "runtimeId">;
const contain = (e: RuntimeSafetyEvidence): C.DeclaredEffect[] => [
  { type: "resource-quarantined", causalEventId: e.eventId, sourceFamilyRootId: e.sourceFamilyRootId, runtimeId: e.runtimeId },
  { type: "runtime-reconciliation-requested", causalEventId: e.eventId, runtimeId: e.runtimeId }, { type: "runtime-termination-requested", causalEventId: e.eventId, runtimeId: e.runtimeId }];
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
const campaignExecutable = (s: State): boolean => s.projections.admission.type === "accepted" &&
  s.projections.build?.type === "succeeded" && s.projections.buildConsistency?.type === "match" &&
  s.projections.claim === "eligible";
const purposeMatchesFence = (purpose: C.LaunchPurpose, binding: C.AuthorizationFenceBinding): boolean =>
  purpose === "source-authoring" ? binding.scope === "source" : binding.scope === "campaign";
const purposeGate = (s: State, purpose: C.LaunchPurpose): C.DenialReason | null => {
  if (s.projections.claim === "invalid")
    return purpose === "source-authoring" ? "gate-closed" : "build-not-executable";
  if (purpose === "source-authoring")
    return s.projections.sourceEvidence.type === "open" ? null : "source-terminal";
  if (s.projections.sourceEvidence.type !== "closed" || s.projections.admission.type !== "accepted")
    return "gate-closed";
  if (purpose === "build") return s.projections.build === null ? null : "terminal-already-recorded";
  return campaignExecutable(s) ? null : "build-not-executable";
};
const bindingMatches = (a: Authorization, e: C.ConsumeAuthorization | C.ReleaseProcess |
  C.RecordReleaseDenied | C.ReachLaunchDeadline): boolean =>
  a.sourceClaimFamilyId === e.sourceClaimFamilyId && a.sourceFamilyRootId === e.sourceFamilyRootId &&
  a.sourceSlotId === e.sourceSlotId && a.authorizationId === e.authorizationId &&
  a.runtimeId === e.runtimeId && a.retirementOwnerId === e.retirementOwnerId &&
  a.credentialLineageId === e.credentialLineageId && a.launchPurpose === e.launchPurpose &&
  same(a.authorizationFence, e.authorizationFence);
const authorizationIdentity = (r: Registration, e: C.ConsumeAuthorization | C.ReleaseProcess |
  C.RecordReleaseDenied | C.ReachLaunchDeadline): C.DenialReason | null =>
  !rootMatches(r, e) || e.sourceSlotId !== r.sourceSlotId || e.runtimeId !== r.runtimeId ? "wrong-binding" :
    ownerMismatch(r, e);
const usable = (s: State, a: Authorization, e: C.ConsumeAuthorization | C.ReleaseProcess): C.DenialReason | null =>
  !bindingMatches(a, e) ? "wrong-binding" :
    a.expiredAt !== null || e.authoritativeTick >= a.expiresAt ? "authorization-expired" :
    a.revokedAt !== null ? "authorization-revoked" : fenceReason(s, a.authorizationFence);
const revoke = (s: State, event: C.ProtocolEvent, predicate: (a: Authorization) => boolean) => {
  let authorizations = s.authorizations;
  const effects: C.AuthorizationRevokedEffect[] = [];
  for (const [id, record] of s.authorizations)
    if (predicate(record) && record.revokedAt === null && record.expiredAt === null) {
    authorizations = withMap(authorizations, id, { ...record, revokedAt: event.eventId });
    effects.push({ type: "authorization-revoked", causalEventId: event.eventId,
      authorizationId: id, authorizationFence: record.authorizationFence });
  }
  return { authorizations, effects };
};
const register = (s: State, e: C.RegisterProtocol): QualificationTransition => {
  if (s.registration !== null) return reject(s, e,
    registrationMatches(s.registration, e) ? "terminal-already-recorded" : "wrong-binding");
  if (e.authenticatedPredecessorId !== null ||
      e.protocolRevisionId !== s.trusted.protocolRevisionId ||
      e.custodyAuthorityId !== s.trusted.custodyAuthorityId)
    return reject(s, e, "wrong-binding");
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
  if (!purposeMatchesFence(e.launchPurpose, e.authorizationFence)) return reject(s, e, "wrong-binding");
  const purposeDenied = purposeGate(s, e.launchPurpose); if (purposeDenied) return reject(s, e, purposeDenied);
  if (s.projections.admission.type === "failed" || s.projections.resourceRetirement.type !== "active")
    return reject(s, e, "gate-closed");
  if (e.launchPurpose === "evaluation" && launchBarrier(s)) return reject(s, e, "gate-closed");
  const denied = fenceReason(s, e.authorizationFence); if (denied) return reject(s, e, denied);
  if (e.authoritativeTick >= e.expiresAt) return reject(s, e, "authorization-expired");
  if (s.authorizations.has(e.authorizationId)) return reject(s, e, "authorization-unavailable");
  if ([...s.authorizations.values()].some(a => a.sourceSlotId === e.sourceSlotId &&
      a.runtimeId === e.runtimeId && a.launchPurpose === e.launchPurpose))
    return reject(s, e, "authorization-unavailable");
  const record: Authorization = { ...e, authorizationFence: { ...e.authorizationFence },
    consumedAt: null, revokedAt: null, expiredAt: null, launch: null };
  return accept(s, e, { authorizations: withMap(s.authorizations, e.authorizationId, record) }, [{
    type: "authorization-issued", causalEventId: e.eventId, authorizationId: e.authorizationId,
    sourceFamilyRootId: e.sourceFamilyRootId, authorizationFence: e.authorizationFence,
  }]);
};
const consume = (s: State, e: C.ConsumeAuthorization): QualificationTransition => {
  const mismatch = authorizationIdentity(s.registration!, e); if (mismatch) return reject(s, e, mismatch);
  if (!purposeMatchesFence(e.launchPurpose, e.authorizationFence)) return reject(s, e, "wrong-binding");
  const purposeDenied = purposeGate(s, e.launchPurpose); if (purposeDenied) return reject(s, e, purposeDenied);
  const a = s.authorizations.get(e.authorizationId);
  if (!a) return reject(s, e, "authorization-unavailable");
  if (a.launch !== null) return reject(s, e, "terminal-already-recorded");
  const denied = usable(s, a, e); if (denied) return reject(s, e, denied);
  if (e.launchPurpose === "evaluation" && launchBarrier(s)) return reject(s, e, "gate-closed");
  if (a.consumedAt !== null) return reject(s, e, "authorization-consumed");
  return accept(s, e, { authorizations: withMap(s.authorizations, e.authorizationId,
    { ...a, consumedAt: e.eventId }) }, []);
};
const revokeOne = (s: State, e: C.RevokeAuthorization): QualificationTransition => {
  if (!rootMatches(s.registration!, e)) return reject(s, e, "wrong-binding");
  const a = s.authorizations.get(e.authorizationId);
  if (!a) return reject(s, e, "authorization-unavailable");
  if (!same(a.authorizationFence, e.authorizationFence)) return reject(s, e, "wrong-binding");
  if (a.expiredAt !== null) return reject(s, e, "authorization-expired");
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
  if (a.revokedAt !== null) return reject(s, e, "authorization-revoked");
  if (e.authoritativeTick < a.expiresAt) return reject(s, e, "deadline-not-reached");
  const selected = fence(s, a.authorizationFence);
  const revoked = revoke(s, e, (candidate) => candidate.authorizationFence.scope === a.authorizationFence.scope &&
    (a.authorizationFence.scope === "campaign" ? candidate.launch === null : candidate.consumedAt === null));
  const expired = withMap(revoked.authorizations, e.authorizationId,
    { ...revoked.authorizations.get(e.authorizationId)!, expiredAt: e.eventId });
  const changes: Partial<State> = a.authorizationFence.scope === "source" ? {
    authorizations: expired,
    sourceFence: { ...selected, open: false },
  } : { authorizations: expired,
    campaignFence: { ...selected, open: false } };
  return accept(s, e, changes, [{ type: "gate-closed", causalEventId: e.eventId,
    fence: a.authorizationFence.scope, generation: selected.generation }, ...revoked.effects]);
};
const sourceTerminal = (s: State, e: C.CloseSource | C.AbandonSource): QualificationTransition => {
  if (!rootMatches(s.registration!, e)) return reject(s, e, "wrong-binding");
  if (s.projections.sourceEvidence.type !== "open") return reject(s, e, "terminal-already-recorded");
  const expiredSource = e.type === "AbandonSource" && !s.sourceFence!.open && [...s.authorizations.values()]
    .some(a => a.authorizationFence.scope === "source" && a.expiredAt !== null) ||
    e.type === "AbandonSource" && !s.sourceFence!.open && acceptedEvent(s, event =>
      event.type === "AdvanceFence" && event.fence === "source" && event.cause === "expiry");
  if (!s.sourceFence!.open && !expiredSource) return reject(s, e, "gate-closed");
  if (e.type === "CloseSource" && ![...s.authorizations.values()].some(a =>
      a.launchPurpose === "source-authoring" && a.consumedAt !== null && a.launch?.type === "started"))
    return reject(s, e, "gate-closed");
  if (e.expectedGeneration !== s.sourceFence!.generation || e.nextGeneration <= e.expectedGeneration)
    return reject(s, e, "stale-generation");
  if (receiptUsed(s, e.receiptId)) return reject(s, e, "receipt-replay");
  const projection: Exclude<C.SourceEvidenceProjection, { readonly type: "open" }> =
    e.type === "CloseSource" ? { type: "closed", receiptId: e.receiptId, sourceDigest: e.sourceDigest } :
      { type: "abandoned", receiptId: e.receiptId, proofId: e.proofId };
  const revoked = e.type === "AbandonSource" ?
    revoke(s, e, (a) => a.authorizationFence.scope === "source" && a.consumedAt === null) :
    { authorizations: s.authorizations, effects: [] };
  const effects: C.DeclaredEffect[] = [terminal(e, { type: "source", projection }),
    { type: "gate-closed", causalEventId: e.eventId, fence: "source", generation: e.nextGeneration },
    ...revoked.effects];
  if (e.type === "CloseSource") effects.push({ type: "gate-closed", causalEventId: e.eventId,
    fence: "family-allocation", generation: s.familyFence!.generation });
  else effects.push(nonPromotional(e, { type: "receipt", receiptId: e.receiptId }));
  return accept(s, e, { sourceFence: { generation: e.nextGeneration, open: false },
    familyFence: e.type === "CloseSource" ? { ...s.familyFence!, open: false } : s.familyFence,
    authorizations: revoked.authorizations, receipts: withSet(s.receipts, e.receiptId),
    projections: { ...s.projections, sourceEvidence: projection,
      claim: e.type === "AbandonSource" && s.projections.claim !== "invalid" ?
        "non-promotional" : s.projections.claim } }, effects);
};
const advance = (s: State, e: C.AdvanceFence): QualificationTransition => {
  if (!rootMatches(s.registration!, e)) return reject(s, e, "wrong-binding");
  if (e.cause === "analytic-stop" && e.fence !== "campaign") return reject(s, e, "wrong-binding");
  const current = e.fence === "source" ? s.sourceFence! : e.fence === "campaign" ? s.campaignFence! : s.familyFence!;
  if (!current.open) return reject(s, e, "gate-closed");
  if (current.generation !== e.expectedGeneration || e.nextGeneration <= e.expectedGeneration)
    return reject(s, e, "stale-generation");
  const revoked = revoke(s, e, (a) => (e.fence === "family-allocation" ? a.authorizationFence.scope === "source" :
    a.authorizationFence.scope === e.fence) && (a.consumedAt === null ||
      e.fence === "campaign" && a.launchPurpose === "evaluation" && a.launch === null));
  const closed = { generation: e.nextGeneration, open: false } as const;
  const changes: Partial<State> = e.fence === "source" ?
    { authorizations: revoked.authorizations, sourceFence: closed } : e.fence === "campaign" ?
    { authorizations: revoked.authorizations, campaignFence: closed } :
    { authorizations: revoked.authorizations, familyFence: closed };
  return accept(s, e, changes, [{ type: "gate-closed", causalEventId: e.eventId,
    fence: e.fence, generation: e.nextGeneration }, ...revoked.effects]);
};
const oppositeLaunchObserved = (s: State, authorizationId: C.AuthorizationId,
  result: "started" | "release-denied"): boolean => acceptedEvents(s).some(event =>
    (event.type === "ReleaseProcess" || event.type === "RecordReleaseDenied") &&
    event.authorizationId === authorizationId &&
    (event.type === "ReleaseProcess" ? "started" : "release-denied") !== result);
const retainLateLaunch = (s: State, e: C.ReleaseProcess | C.RecordReleaseDenied,
  launch: C.LaunchTerminalProjection): QualificationTransition => {
  const result = e.type === "ReleaseProcess" ? "started" : "release-denied";
  const receiptId = e.type === "ReleaseProcess" ? e.launchReceiptId : e.receiptId;
  const conflict = oppositeLaunchObserved(s, e.authorizationId, result) ||
    launch.type === "never-started" && result === "started";
  const effects: C.DeclaredEffect[] = [{ type: "late-receipt-retained",
    causalEventId: e.eventId, evidence: { type: "launch",
      authorizationId: e.authorizationId, receiptId, result } }];
  if (conflict) effects.push(invalid(e, { type: "receipt", receiptId }), ...contain(e));
  return accept(s, e, { receipts: withSet(s.receipts, receiptId), projections: conflict ? { ...s.projections,
    runtime: "unknown", resourceRetirement: { type: "quarantined" }, claim: "invalid" } : s.projections }, effects);
};
const retainUnauthorizedLateStart = (s: State, e: C.ReleaseProcess,
  reason: "authorization-unavailable" | "authorization-revoked" | "authorization-expired"): QualificationTransition => {
  const denied: C.DenialRecordedEffect = { type: "denial-recorded", causalEventId: e.eventId,
    reason, subject: subject(e) };
  return accept(s, e, { receipts: withSet(s.receipts, e.launchReceiptId),
    projections: { ...s.projections, runtime: "unknown", resourceRetirement: { type: "quarantined" },
      claim: "invalid" } }, [{ type: "late-receipt-retained", causalEventId: e.eventId,
        evidence: { type: "launch", authorizationId: e.authorizationId,
          receiptId: e.launchReceiptId, result: "started" } }, denied,
      invalid(e, { type: "receipt", receiptId: e.launchReceiptId }), ...contain(e)]);
};
const retainPostRetirementUnsafeLaunch = (s: State, e: C.ReleaseProcess | C.ReachLaunchDeadline,
  receiptId: C.ReceiptId, result: "started" | "start-unknown"): QualificationTransition =>
  accept(s, e, { receipts: withSet(s.receipts, receiptId), postRetirementRuntime: "unknown",
    projections: { ...s.projections,
    runtime: "unknown", resourceRetirement: { type: "quarantined" }, claim: "invalid" } }, [
    { type: "late-receipt-retained", causalEventId: e.eventId, evidence: { type: "launch",
      authorizationId: e.authorizationId, receiptId, result } },
    { type: "denial-recorded", causalEventId: e.eventId, reason: "gate-closed", subject: subject(e) },
    invalid(e, { type: "receipt", receiptId }), ...contain(e)]);
const release = (s: State, e: C.ReleaseProcess): QualificationTransition => {
  const mismatch = authorizationIdentity(s.registration!, e);
  if (mismatch || e.attemptId !== s.registration!.attemptId) return reject(s, e, mismatch ?? "wrong-binding");
  const a = s.authorizations.get(e.authorizationId);
  if (!a) {
    if (s.projections.resourceRetirement.type === "retired" &&
        purposeMatchesFence(e.launchPurpose, e.authorizationFence) && !receiptUsed(s, e.launchReceiptId))
      return retainPostRetirementUnsafeLaunch(s, e, e.launchReceiptId, "started");
    if (e.authoritativeTick >= s.registration!.launchDeadline &&
        purposeMatchesFence(e.launchPurpose, e.authorizationFence) && !receiptUsed(s, e.launchReceiptId))
      return retainUnauthorizedLateStart(s, e, "authorization-unavailable");
    return reject(s, e, "authorization-unavailable");
  }
  if (!bindingMatches(a, e)) return reject(s, e, "wrong-binding");
  if (s.projections.resourceRetirement.type === "retired") {
    if (receiptUsed(s, e.launchReceiptId)) return reject(s, e, "receipt-replay");
    return retainPostRetirementUnsafeLaunch(s, e, e.launchReceiptId, "started");
  }
  if (receiptUsed(s, e.launchReceiptId)) return reject(s, e, "receipt-replay");
  if (a.launch !== null) return retainLateLaunch(s, e, a.launch);
  if (e.authoritativeTick >= s.registration!.launchDeadline) {
    if (a.consumedAt === null) return retainUnauthorizedLateStart(s, e, "authorization-unavailable");
    if (a.expiredAt !== null || e.authoritativeTick >= a.expiresAt)
      return retainUnauthorizedLateStart(s, e, "authorization-expired");
    if (a.revokedAt !== null) return retainUnauthorizedLateStart(s, e, "authorization-revoked");
  }
  if (a.consumedAt !== null && e.authoritativeTick >= s.registration!.launchDeadline) {
    const key = `launch:${e.authorizationId}`, conflict = oppositeLaunchObserved(s, e.authorizationId, "started");
    const effects: C.DeclaredEffect[] = [{ type: "late-receipt-retained", causalEventId: e.eventId, evidence: { type: "launch",
      authorizationId: e.authorizationId, receiptId: e.launchReceiptId, result: "started" } },
      nonPromotional(e, { type: "receipt", receiptId: e.launchReceiptId }), ...contain(e)];
    if (conflict) effects.push(invalid(e, { type: "receipt", receiptId: e.launchReceiptId }));
    return accept(s, e, { receipts: withSet(s.receipts, e.launchReceiptId), lateFacts: withMap(s.lateFacts, key, "started"),
      projections: { ...s.projections, runtime: "unknown", resourceRetirement: { type: "quarantined" },
        claim: conflict ? "invalid" : s.projections.claim === "invalid" ? "invalid" : "non-promotional" } }, effects);
  }
  if (s.projections.resourceRetirement.type !== "active") return reject(s, e, "gate-closed");
  if (s.projections.runtime !== "not-started" && s.projections.runtime !== "terminated")
    return reject(s, e, "runtime-unresolved");
  if (a.authorizationFence.scope === "source" && s.projections.sourceEvidence.type !== "open")
    return reject(s, e, "source-terminal");
  if (a.expiredAt !== null || e.authoritativeTick >= a.expiresAt) return reject(s, e, "authorization-expired");
  if (a.revokedAt !== null) return reject(s, e, "authorization-revoked");
  const purposeDenied = purposeGate(s, a.launchPurpose); if (purposeDenied) return reject(s, e, purposeDenied);
  const denied = fenceReason(s, a.authorizationFence);
  if (denied || a.authorizationFence.scope === "campaign" && launchBarrier(s))
    return reject(s, e, denied ?? "gate-closed");
  if (a.launchPurpose === "evaluation" && (s.projections.build?.type !== "succeeded" ||
      s.projections.buildConsistency?.type !== "match" || s.projections.claim !== "eligible"))
    return reject(s, e, "build-not-executable");
  if (a.consumedAt === null) return reject(s, e, "authorization-unavailable");
  const launch: C.LaunchTerminalProjection = { type: "started", receiptId: e.launchReceiptId };
  const authorizations = withMap(s.authorizations, e.authorizationId, { ...a, launch });
  return accept(s, e, { authorizations, receipts: withSet(s.receipts, e.launchReceiptId),
    projections: { ...s.projections, ...(a.launchPurpose === "evaluation" ? { launch } : {}), runtime: "live" } }, [{
      type: "process-release-requested", causalEventId: e.eventId, authorizationId: e.authorizationId,
      runtimeId: e.runtimeId, authorizationFence: e.authorizationFence,
    }]);
};
const releaseDenied = (s: State, e: C.RecordReleaseDenied): QualificationTransition => {
  const mismatch = authorizationIdentity(s.registration!, e); if (mismatch) return reject(s, e, mismatch);
  const a = s.authorizations.get(e.authorizationId);
  if (!a) return reject(s, e, "authorization-unavailable");
  if (!bindingMatches(a, e)) return reject(s, e, "wrong-binding");
  if (a.consumedAt === null) return reject(s, e, "authorization-unavailable");
  if (receiptUsed(s, e.receiptId)) return reject(s, e, "receipt-replay");
  if (a.launch !== null) return retainLateLaunch(s, e, a.launch);
  if (s.projections.resourceRetirement.type === "retired") return reject(s, e, "terminal-already-recorded");
  if (e.authoritativeTick >= s.registration!.launchDeadline) {
    const key = `launch:${e.authorizationId}`, conflict = oppositeLaunchObserved(s, e.authorizationId, "release-denied");
    const effects: C.DeclaredEffect[] = [
      { type: "late-receipt-retained", causalEventId: e.eventId, evidence: { type: "launch",
        authorizationId: e.authorizationId, receiptId: e.receiptId, result: "release-denied" } },
      nonPromotional(e, { type: "receipt", receiptId: e.receiptId })];
    if (conflict) effects.push(invalid(e, { type: "receipt", receiptId: e.receiptId }));
    return accept(s, e, { receipts: withSet(s.receipts, e.receiptId),
      lateFacts: withMap(s.lateFacts, key, "release-denied"), projections: { ...s.projections,
        claim: conflict ? "invalid" : s.projections.claim === "invalid" ? "invalid" : "non-promotional" } }, effects);
  }
  const launch: C.LaunchTerminalProjection = { type: "release-denied", receiptId: e.receiptId };
  return accept(s, e, { authorizations: withMap(s.authorizations, e.authorizationId, { ...a, launch }),
    receipts: withSet(s.receipts, e.receiptId), projections: a.launchPurpose === "evaluation" ?
      { ...s.projections, launch } : s.projections },
  [terminal(e, { type: "launch", projection: launch })]);
};
const crash = (s: State, e: C.ObserveCrash): QualificationTransition => {
  if (!rootMatches(s.registration!, e) || e.runtimeId !== s.registration!.runtimeId)
    return reject(s, e, "wrong-binding");
  const a = s.authorizations.get(e.authorizationId);
  if (!a) return reject(s, e, "authorization-unavailable");
  const containment: C.DeclaredEffect[] = [
    { type: "resource-quarantined", causalEventId: e.eventId,
      sourceFamilyRootId: e.sourceFamilyRootId, runtimeId: e.runtimeId },
    { type: "runtime-reconciliation-requested", causalEventId: e.eventId, runtimeId: e.runtimeId },
    { type: "runtime-termination-requested", causalEventId: e.eventId, runtimeId: e.runtimeId },
  ];
  if (s.projections.resourceRetirement.type === "retired") {
    if (a.authorizationFence.expectedGeneration !== e.expectedGeneration) return reject(s, e, "stale-generation");
    if (a.consumedAt === null) return reject(s, e, "authorization-unavailable");
    return accept(s, e, { postRetirementRuntime: "unknown" }, containment);
  }
  if (s.projections.runtime !== "not-started" && s.projections.runtime !== "terminated")
    return reject(s, e, "runtime-unresolved");
  if (a.launch !== null) return reject(s, e, "terminal-already-recorded");
  if (a.authorizationFence.expectedGeneration !== e.expectedGeneration) return reject(s, e, "stale-generation");
  if (a.consumedAt === null) return reject(s, e, "authorization-unavailable");
  return accept(s, e, { projections: { ...s.projections, runtime: "unknown",
    resourceRetirement: { type: "quarantined" } } }, containment);
};
const launchDeadline = (s: State, e: C.ReachLaunchDeadline): QualificationTransition => {
  const mismatch = authorizationIdentity(s.registration!, e); if (mismatch) return reject(s, e, mismatch);
  const a = s.authorizations.get(e.authorizationId);
  if (!a || !bindingMatches(a, e)) return reject(s, e, a ? "wrong-binding" : "authorization-unavailable");
  if (e.authoritativeTick < s.registration!.launchDeadline) return reject(s, e, "deadline-not-reached");
  if (receiptUsed(s, e.observationReceiptId)) return reject(s, e, "receipt-replay");
  if (s.projections.resourceRetirement.type === "retired")
    return e.result === "start-unknown" && a.consumedAt !== null ?
      retainPostRetirementUnsafeLaunch(s, e, e.observationReceiptId, e.result) :
      reject(s, e, "terminal-already-recorded");
  if (a.launch !== null) return reject(s, e, "terminal-already-recorded");
  if (e.result === "start-unknown" && a.consumedAt === null) return reject(s, e, "wrong-binding");
  if (e.result === "never-started" && (a.consumedAt !== null ||
      s.projections.runtime !== "not-started" && s.projections.runtime !== "terminated"))
    return reject(s, e, "wrong-binding");
  const launch: C.LaunchTerminalProjection = { type: e.result, receiptId: e.observationReceiptId };
  const containment: C.DeclaredEffect[] = e.result === "start-unknown" ? [
    { type: "resource-quarantined", causalEventId: e.eventId,
      sourceFamilyRootId: e.sourceFamilyRootId, runtimeId: e.runtimeId },
    { type: "runtime-reconciliation-requested", causalEventId: e.eventId, runtimeId: e.runtimeId },
    { type: "runtime-termination-requested", causalEventId: e.eventId, runtimeId: e.runtimeId }] : [];
  return accept(s, e, { authorizations: withMap(s.authorizations, e.authorizationId, { ...a, launch }),
    receipts: withSet(s.receipts, e.observationReceiptId), projections: {
      ...s.projections, ...(a.launchPurpose === "evaluation" ? { launch } : {}),
      runtime: e.result === "start-unknown" ? "unknown" : s.projections.runtime,
      resourceRetirement: e.result === "start-unknown" ? { type: "quarantined" } :
        s.projections.resourceRetirement,
      claim: s.projections.claim === "invalid" ? "invalid" : "non-promotional" } }, [
        terminal(e, { type: "launch", projection: launch }),
        nonPromotional(e, { type: "receipt", receiptId: e.observationReceiptId }),
        ...containment,
      ]);
};
const restart = (s: State, e: C.RestartObserved): QualificationTransition => {
  if (!rootMatches(s.registration!, e) || e.runtimeId !== s.registration!.runtimeId)
    return reject(s, e, "wrong-binding");
  if (s.projections.runtime === "not-started" && ![...s.authorizations.values()].some((a) => a.consumedAt))
    return reject(s, e, "runtime-unresolved");
  const effects: C.DeclaredEffect[] = [
    { type: "runtime-reconciliation-requested", causalEventId: e.eventId, runtimeId: e.runtimeId },
    { type: "resource-quarantined", causalEventId: e.eventId,
      sourceFamilyRootId: e.sourceFamilyRootId, runtimeId: e.runtimeId },
    { type: "runtime-termination-requested", causalEventId: e.eventId, runtimeId: e.runtimeId },
  ];
  return s.projections.resourceRetirement.type === "retired" ?
    accept(s, e, { postRetirementRuntime: "unknown" }, effects) :
    accept(s, e, { projections: { ...s.projections, runtime: "unknown",
      resourceRetirement: { type: "quarantined" } } }, effects);
};
interface RuntimeSafetyWatermark {
  readonly eventId: C.EventId;
  readonly authoritativeTick: C.AuthoritativeTick;
}
const runtimeSafetyWatermark = (s: State, runtimeId: C.RuntimeId): RuntimeSafetyWatermark | null => {
  let watermark: RuntimeSafetyWatermark | null = null;
  for (const observation of s.events.values()) {
    const candidate = observation.event;
    const safetyEvidence = observation.result.effects.some(effect =>
      (effect.type === "process-release-requested" ||
       effect.type === "runtime-reconciliation-requested" ||
       effect.type === "runtime-termination-requested") && effect.runtimeId === runtimeId);
    if (safetyEvidence && (watermark === null || candidate.authoritativeTick >= watermark.authoritativeTick))
      watermark = { eventId: candidate.eventId, authoritativeTick: candidate.authoritativeTick };
  }
  return watermark;
};
const reconcile = (s: State, e: C.ReconcileRuntime): QualificationTransition => {
  if (!rootMatches(s.registration!, e) || e.runtimeId !== s.registration!.runtimeId)
    return reject(s, e, "wrong-binding");
  const watermark = runtimeSafetyWatermark(s, e.runtimeId);
  if (watermark === null || watermark.eventId !== e.runtimeSafetyWatermarkEventId ||
      e.authoritativeTick < watermark.authoritativeTick || acceptedEvent(s, candidate =>
        candidate.type === "ReconcileRuntime" && candidate.proofId === e.proofId))
    return reject(s, e, "wrong-binding");
  const retired = s.projections.resourceRetirement.type === "retired";
  const runtime = retired ? s.postRetirementRuntime : s.projections.runtime;
  if (runtime === null || runtime === "not-started")
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
  return retired ? accept(s, e, { postRetirementRuntime: e.observation }, effects) :
    accept(s, e, { projections: { ...s.projections, runtime: e.observation, resourceRetirement } }, effects);
};
const retirement = (s: State, e: C.RequestRetirement): QualificationTransition => {
  if (!rootMatches(s.registration!, e)) return reject(s, e, "wrong-binding");
  const mismatch = ownerMismatch(s.registration!, e); if (mismatch) return reject(s, e, mismatch);
  if (s.projections.sourceEvidence.type === "open") return reject(s, e, "source-terminal");
  if (s.projections.resourceRetirement.type === "retired") return reject(s, e, "terminal-already-recorded");
  if (s.retirementRequested) return reject(s, e, "terminal-already-recorded");
  const quarantine = s.projections.runtime === "unknown";
  const revoked = revoke(s, e, a => a.runtimeId === s.registration!.runtimeId);
  const effects: C.DeclaredEffect[] = [...revoked.effects];
  if (quarantine) effects.push(
    { type: "resource-quarantined", causalEventId: e.eventId,
      sourceFamilyRootId: e.sourceFamilyRootId, runtimeId: s.registration!.runtimeId },
    { type: "runtime-reconciliation-requested", causalEventId: e.eventId, runtimeId: s.registration!.runtimeId });
  else if (s.projections.runtime === "live") effects.push(
    { type: "runtime-termination-requested", causalEventId: e.eventId, runtimeId: s.registration!.runtimeId });
  return accept(s, e, { authorizations: revoked.authorizations, retirementRequested: true,
    projections: { ...s.projections, resourceRetirement: { type: quarantine ? "quarantined" : "pending" } } }, effects);
};
const cleanup = (s: State, e: C.RequestCleanup): QualificationTransition => {
  if (!rootMatches(s.registration!, e) || e.runtimeId !== s.registration!.runtimeId)
    return reject(s, e, "wrong-binding");
  const mismatch = ownerMismatch(s.registration!, e); if (mismatch) return reject(s, e, mismatch);
  if (s.projections.sourceEvidence.type === "open") return reject(s, e, "source-terminal");
  if (s.projections.runtime !== "terminated" && s.projections.runtime !== "not-started")
    return reject(s, e, "runtime-unresolved");
  if (!s.retirementRequested) return reject(s, e, "gate-closed");
  if (s.projections.resourceRetirement.type === "active" || s.projections.resourceRetirement.type === "retired")
    return reject(s, e, "gate-closed");
  if (s.cleanupRequested) return reject(s, e, "terminal-already-recorded");
  const watermark = runtimeSafetyWatermark(s, e.runtimeId);
  const termination = acceptedEvents(s).filter((candidate): candidate is C.ReconcileRuntime =>
    candidate.type === "ReconcileRuntime" && candidate.runtimeId === e.runtimeId &&
    candidate.observation === "terminated").at(-1);
  const noRuntimeWasReleased = s.projections.runtime === "not-started" && watermark === null;
  if (!noRuntimeWasReleased && (watermark === null || termination === undefined ||
      termination.proofId !== e.terminationProofId ||
      termination.runtimeSafetyWatermarkEventId !== watermark.eventId))
    return reject(s, e, "wrong-binding");
  return accept(s, e, { cleanupRequested: true,
    projections: { ...s.projections, resourceRetirement: { type: "pending" } } }, [{
      type: "resource-cleanup-requested", causalEventId: e.eventId,
      sourceFamilyRootId: e.sourceFamilyRootId, runtimeId: e.runtimeId, proofId: e.terminationProofId,
    }]);
};
const hasEvidence = (items: readonly C.EvidenceReference[], expected: C.EvidenceReference): boolean =>
  items.some((item) => same(item, expected));
const proofReferences = (value: unknown): readonly C.EvidenceReference[] => {
  if (value === null || typeof value !== "object") return [];
  const references: C.EvidenceReference[] = [];
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    if ((key === "proofId" || key === "terminationProofId" || key === "cleanupProofId") &&
        typeof item === "string") references.push({ type: "proof", proofId: C.proofId(item) });
    else references.push(...proofReferences(item));
  }
  return references;
};
const replayReceiptReference = (event: C.ProtocolEvent): C.EvidenceReference | null => {
  if (event.type === "RecordBuildResult")
    return { type: "build-receipt", buildReceiptId: event.buildReceiptId };
  if (event.type === "RecordBuildConsistencyReceipt")
    return { type: "consistency-receipt", consistencyReceiptId: event.consistencyReceiptId };
  const receiptId = eventReceipt(event);
  return receiptId === null || event.type === "CompleteRetirement" ? null :
    { type: "receipt", receiptId: C.receiptId(receiptId) };
};
const expectedRetainedEvidence = (s: State, cleanupProofId: C.ProofId): readonly C.EvidenceReference[] => {
  const expected: C.EvidenceReference[] = [{ type: "proof", proofId: cleanupProofId }];
  for (const observation of s.events.values()) if (observation.result.decision === "accepted" ||
      observation.result.effects.some(effect => effect.type === "denial-recorded" &&
        effect.reason === "receipt-replay")) {
    expected.push({ type: "event", eventId: observation.event.eventId }, ...proofReferences(observation.event));
    if (observation.result.decision === "rejected") {
      const replayReceipt = replayReceiptReference(observation.event);
      if (replayReceipt !== null) expected.push(replayReceipt);
    }
  }
  expected.push(...[...s.receipts].map(receiptId => ({ type: "receipt" as const, receiptId })),
    ...[...s.buildReceipts].map(buildReceiptId => ({ type: "build-receipt" as const, buildReceiptId })),
    ...[...s.consistencyReceipts].map(consistencyReceiptId =>
      ({ type: "consistency-receipt" as const, consistencyReceiptId })));
  return expected;
};
const retirementEvidenceClosed = (s: State): boolean => {
  for (const authorization of s.authorizations.values()) {
    if (authorization.revokedAt === null && authorization.expiredAt === null) return false;
    if (authorization.consumedAt !== null && authorization.launch === null) return false;
    if (authorization.launch?.type === "started" && authorization.launchPurpose === "build" &&
        (s.projections.build === null || s.projections.buildConsistency === null)) return false;
    if (authorization.launch?.type === "started" && authorization.launchPurpose === "evaluation" &&
        s.projections.attempt === null) return false;
  }
  for (const start of acceptedEvents(s).filter((event): event is C.ReleaseProcess =>
    event.type === "ReleaseProcess")) {
    if (start.launchPurpose === "build" &&
        (s.projections.build === null || s.projections.buildConsistency === null)) return false;
    if (start.launchPurpose === "evaluation" && s.projections.attempt === null) return false;
  }
  return !s.checkpointEffective || s.projections.stopCheckpoint !== null;
};
const complete = (s: State, e: C.CompleteRetirement): QualificationTransition => {
  if (!rootMatches(s.registration!, e) || e.runtimeId !== s.registration!.runtimeId)
    return reject(s, e, "wrong-binding");
  const mismatch = ownerMismatch(s.registration!, e); if (mismatch) return reject(s, e, mismatch);
  if (receiptUsed(s, e.tombstoneId)) return reject(s, e, "receipt-replay");
  if (s.projections.resourceRetirement.type === "retired") return reject(s, e, "terminal-already-recorded");
  if (s.projections.runtime !== "terminated" && s.projections.runtime !== "not-started")
    return reject(s, e, "runtime-unresolved");
  if (!s.retirementRequested || !s.cleanupRequested || s.projections.sourceEvidence.type === "open")
    return reject(s, e, "gate-closed");
  if (!retirementEvidenceClosed(s)) return reject(s, e, "gate-closed");
  if (s.projections.sourceEvidence.receiptId !== e.sourceTerminalReceiptId ||
      !hasEvidence(e.retainedEvidence, { type: "receipt", receiptId: e.sourceTerminalReceiptId }))
    return reject(s, e, "wrong-binding");
  if (s.projections.admission.type !== "pending" &&
      !hasEvidence(e.retainedEvidence, { type: "receipt", receiptId: s.projections.admission.receiptId }))
    return reject(s, e, "wrong-binding");
  if (!expectedRetainedEvidence(s, e.cleanupProofId).every(reference => hasEvidence(e.retainedEvidence, reference)))
    return reject(s, e, "wrong-binding");
  const tombstone: C.RetirementTombstoneProjection = { tombstoneId: e.tombstoneId,
    sourceTerminal: s.projections.sourceEvidence, retirementOwnerId: e.retirementOwnerId,
    cleanupProofId: e.cleanupProofId, retainedEvidence: [...e.retainedEvidence] };
  return accept(s, e, { tombstones: withSet(s.tombstones, e.tombstoneId), projections: { ...s.projections,
    resourceRetirement: { type: "retired", tombstone } } }, [{
      type: "retirement-tombstone-appended", causalEventId: e.eventId,
      sourceFamilyRootId: e.sourceFamilyRootId, tombstoneId: e.tombstoneId,
      retirementOwnerId: e.retirementOwnerId, cleanupProofId: e.cleanupProofId,
    }]);
};
const attemptReceipt = (s: State, e: C.RecordAttemptReceipt): QualificationTransition => {
  if (e.attemptId !== s.registration!.attemptId || e.runtimeId !== s.registration!.runtimeId)
    return reject(s, e, "wrong-binding");
  const retainedStart = [...s.events.values()].some(observation =>
    observation.event.type === "ReleaseProcess" && observation.event.launchPurpose === "evaluation" &&
    observation.event.attemptId === e.attemptId && observation.event.runtimeId === e.runtimeId &&
    observation.result.effects.some(effect => effect.type === "late-receipt-retained" &&
      effect.evidence.type === "launch" && effect.evidence.result === "started"));
  if (s.projections.launch?.type !== "started" && !retainedStart) return reject(s, e, "gate-closed");
  if (receiptUsed(s, e.receiptId)) return reject(s, e, "receipt-replay");
  if (s.projections.attempt !== null) {
    const conflict = s.projections.attempt.type !== e.result;
    const effects: C.DeclaredEffect[] = [{ type: "late-receipt-retained", causalEventId: e.eventId,
      evidence: { type: "attempt", attemptId: e.attemptId, receiptId: e.receiptId, result: e.result } }];
    if (conflict) effects.push(invalid(e, { type: "receipt", receiptId: e.receiptId }));
    return accept(s, e, { receipts: withSet(s.receipts, e.receiptId),
      projections: conflict ? { ...s.projections, claim: "invalid" } : s.projections }, effects);
  }
  if (e.authoritativeTick >= s.registration!.attemptDeadline) {
    const key = `attempt:${e.attemptId}`, conflict = lateConflict(s, key, e.result);
    const effects: C.DeclaredEffect[] = [
      { type: "late-receipt-retained", causalEventId: e.eventId,
        evidence: { type: "attempt", attemptId: e.attemptId, receiptId: e.receiptId, result: e.result } },
      nonPromotional(e, { type: "receipt", receiptId: e.receiptId })];
    if (conflict) effects.push(invalid(e, { type: "receipt", receiptId: e.receiptId }));
    return accept(s, e, { receipts: withSet(s.receipts, e.receiptId),
      lateFacts: withMap(s.lateFacts, key, e.result), projections: { ...s.projections,
        claim: conflict ? "invalid" : s.projections.claim === "invalid" ? "invalid" : "non-promotional" } }, effects);
  }
  const attempt: C.AttemptTerminalProjection = { type: e.result, receiptId: e.receiptId };
  return accept(s, e, { receipts: withSet(s.receipts, e.receiptId),
    projections: { ...s.projections, attempt } }, [terminal(e, { type: "attempt", projection: attempt })]);
};
const attemptDeadline = (s: State, e: C.ReachAttemptDeadline): QualificationTransition => {
  if (e.attemptId !== s.registration!.attemptId) return reject(s, e, "wrong-binding");
  if (e.authoritativeTick < s.registration!.attemptDeadline) return reject(s, e, "deadline-not-reached");
  if (s.projections.attempt !== null) return reject(s, e, "terminal-already-recorded");
  if (receiptUsed(s, e.observationReceiptId)) return reject(s, e, "receipt-replay");
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
  if (receiptUsed(s, e.receiptId)) return reject(s, e, "receipt-replay");
  if (s.projections.stopCheckpoint !== null) {
    const conflict = s.projections.stopCheckpoint.type !== e.result;
    const effects: C.DeclaredEffect[] = [{ type: "late-receipt-retained", causalEventId: e.eventId,
      evidence: { type: "stop", checkpointId: e.checkpointId, receiptId: e.receiptId, result: e.result } }];
    if (conflict) effects.push(invalid(e, { type: "receipt", receiptId: e.receiptId }));
    return accept(s, e, { receipts: withSet(s.receipts, e.receiptId),
      projections: conflict ? { ...s.projections, claim: "invalid" } : s.projections }, effects);
  }
  if (e.authoritativeTick >= s.registration!.stopDeadline) {
    const key = `stop:${e.checkpointId}`, conflict = lateConflict(s, key, e.result);
    const effects: C.DeclaredEffect[] = [
      { type: "late-receipt-retained", causalEventId: e.eventId,
        evidence: { type: "stop", checkpointId: e.checkpointId, receiptId: e.receiptId, result: e.result } },
      nonPromotional(e, { type: "receipt", receiptId: e.receiptId })];
    if (conflict) effects.push(invalid(e, { type: "receipt", receiptId: e.receiptId }));
    return accept(s, e, { receipts: withSet(s.receipts, e.receiptId), stopBarrier: true,
      lateFacts: withMap(s.lateFacts, key, e.result), projections: { ...s.projections,
        claim: conflict ? "invalid" : s.projections.claim === "invalid" ? "invalid" : "non-promotional" } }, effects);
  }
  if (e.expectedGeneration !== s.campaignFence!.generation) return reject(s, e, "stale-generation");
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
  if (receiptUsed(s, e.observationReceiptId)) return reject(s, e, "receipt-replay");
  const stopCheckpoint: C.StopTerminalProjection = { type: e.result, receiptId: e.observationReceiptId };
  return accept(s, e, { receipts: withSet(s.receipts, e.observationReceiptId), stopBarrier: true,
    projections: { ...s.projections, stopCheckpoint,
      claim: s.projections.claim === "invalid" ? "invalid" : "non-promotional" } },
  [terminal(e, { type: "stop", projection: stopCheckpoint }),
    nonPromotional(e, { type: "receipt", receiptId: e.observationReceiptId })]);
};
const recoverStop = (s: State, e: C.RecoverStopFence): QualificationTransition => {
  if (e.checkpointId !== s.registration!.checkpointId) return reject(s, e, "wrong-binding");
  if (!s.stopBarrier) return reject(s, e, "gate-closed");
  if (s.projections.stopCheckpoint === null || s.projections.stopCheckpoint.type === "continue")
    return reject(s, e, "gate-closed");
  if (!s.campaignFence!.open) return reject(s, e, "gate-closed");
  if (e.expectedGeneration !== s.campaignFence!.generation || e.nextGeneration <= e.expectedGeneration)
    return reject(s, e, "stale-generation");
  const revoked = revoke(s, e, (a) => a.authorizationFence.scope === "campaign" &&
    (a.consumedAt === null || a.launchPurpose === "evaluation" && a.launch === null));
  return accept(s, e, { campaignFence: { generation: e.nextGeneration, open: false },
    stopBarrier: false, authorizations: revoked.authorizations }, [{ type: "gate-closed",
      causalEventId: e.eventId, fence: "campaign", generation: e.nextGeneration }, ...revoked.effects]);
};
const buildMatches = (r: Registration, e: { readonly sourceClaimFamilyId: C.SourceClaimFamilyId;
  readonly sourceFamilyRootId: C.SourceFamilyRootId; readonly sourceSlotId: C.SourceSlotId;
  readonly buildAttemptId: C.BuildAttemptId }): boolean => rootMatches(r, e) &&
  e.sourceSlotId === r.sourceSlotId && e.buildAttemptId === r.buildAttemptId;
const buildResult = (s: State, e: C.RecordBuildResult): QualificationTransition => {
  if (!buildMatches(s.registration!, e)) return reject(s, e, "wrong-binding");
  if (s.projections.sourceEvidence.type !== "closed" || s.projections.admission.type !== "accepted")
    return reject(s, e, "gate-closed");
  const authority = s.authorizations.get(e.authorizationId);
  if (!authority || authority.launchPurpose !== "build" || authority.authorizationFence.scope !== "campaign" ||
      authority.consumedAt === null || authority.launch?.type !== "started" || authority.sourceSlotId !== e.sourceSlotId ||
      authority.runtimeId !== s.registration!.runtimeId)
    return reject(s, e, authority ? "wrong-binding" : "authorization-unavailable");
  if (receiptUsed(s, e.buildReceiptId)) return rejectTypedReplay(s, e,
    { type: "build-receipt", buildReceiptId: e.buildReceiptId });
  if (s.projections.build !== null) {
    const conflict = s.buildFact?.result === null || !same(s.buildFact?.result, e.result);
    const effects: C.DeclaredEffect[] = [{ type: "late-receipt-retained", causalEventId: e.eventId,
      evidence: { type: "build", buildAttemptId: e.buildAttemptId,
        buildReceiptId: e.buildReceiptId, result: e.result } }];
    if (conflict) effects.push(invalid(e, { type: "build-receipt", buildReceiptId: e.buildReceiptId }));
    return accept(s, e, { buildReceipts: withSet(s.buildReceipts, e.buildReceiptId),
      projections: conflict ? { ...s.projections, claim: "invalid" } : s.projections }, effects);
  }
  if (e.authoritativeTick >= s.registration!.buildDeadline) {
    const key = `build:${e.buildAttemptId}`, conflict = lateConflict(s, key, e.result);
    const effects: C.DeclaredEffect[] = [
      { type: "late-receipt-retained", causalEventId: e.eventId, evidence: { type: "build",
        buildAttemptId: e.buildAttemptId, buildReceiptId: e.buildReceiptId, result: e.result } },
      { type: "execution-gate-set", causalEventId: e.eventId,
        buildAttemptId: e.buildAttemptId, value: "denied" },
      nonPromotional(e, { type: "build-receipt", buildReceiptId: e.buildReceiptId })];
    if (conflict) effects.push(invalid(e, { type: "build-receipt", buildReceiptId: e.buildReceiptId }));
    return accept(s, e, { buildReceipts: withSet(s.buildReceipts, e.buildReceiptId),
      lateFacts: withMap(s.lateFacts, key, e.result), projections: { ...s.projections,
        claim: conflict ? "invalid" : s.projections.claim === "invalid" ? "invalid" : "non-promotional" } }, effects);
  }
  const build: C.BuildTerminalProjection = { type: e.result.type, buildReceiptId: e.buildReceiptId };
  return accept(s, e, { buildReceipts: withSet(s.buildReceipts, e.buildReceiptId),
    buildFact: { projection: build, result: e.result,
      artifactDigest: e.result.type === "succeeded" ? e.result.artifactDigest : null },
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
  if (receiptUsed(s, e.observationReceiptId)) return reject(s, e, "receipt-replay");
  const build: C.BuildTerminalProjection = { type: e.result, observationReceiptId: e.observationReceiptId };
  return accept(s, e, { receipts: withSet(s.receipts, e.observationReceiptId),
    buildFact: { projection: build, result: null, artifactDigest: null }, projections: { ...s.projections, build } },
  [terminal(e, { type: "build", projection: build }), { type: "execution-gate-set",
    causalEventId: e.eventId, buildAttemptId: e.buildAttemptId, value: "denied" }]);
};
const consistencyInputInvalid = (s: State, e: C.RecordBuildConsistencyReceipt): boolean => {
  const receiptBound = s.buildFact !== null && "buildReceiptId" in s.buildFact.projection &&
    s.buildFact.projection.buildReceiptId === e.buildReceiptId;
  const validMatch = e.result.type === "match" && s.buildFact?.projection.type === "succeeded" &&
    receiptBound && s.buildFact.artifactDigest === e.result.artifactDigest;
  const validNonArtifact = e.result.type === "non-artifact-match" && receiptBound &&
    (s.buildFact?.result?.type === "failed" || s.buildFact?.result?.type === "no-output") &&
    s.buildFact.result.type === e.result.buildResult;
  return s.buildFact === null || e.result.type === "invalid" ||
    e.result.type === "match" && !validMatch ||
    e.result.type === "non-artifact-match" && !validNonArtifact ||
    (e.result.type === "missing-build" || e.result.type === "unknown-build") && s.buildFact.result !== null ||
    "buildReceiptId" in s.buildFact.projection && !receiptBound;
};
const consistency = (s: State, e: C.RecordBuildConsistencyReceipt): QualificationTransition => {
  const replay = receiptUsed(s, e.consistencyReceiptId);
  if (!buildMatches(s.registration!, e)) return reject(s, e, "wrong-binding");
  if (replay) return rejectTypedReplay(s, e,
    { type: "consistency-receipt", consistencyReceiptId: e.consistencyReceiptId });
  if (s.projections.buildConsistency !== null) {
    const original = acceptedEvents(s).find((event): event is C.RecordBuildConsistencyReceipt =>
      event.type === "RecordBuildConsistencyReceipt" &&
      event.authoritativeTick < s.registration!.buildConsistencyDeadline);
    const conflict = original === undefined || original.buildReceiptId !== e.buildReceiptId ||
      !same(original.result, e.result);
    const effects: C.DeclaredEffect[] = [{ type: "late-receipt-retained",
        causalEventId: e.eventId, evidence: { type: "build-consistency", buildAttemptId: e.buildAttemptId,
          consistencyReceiptId: e.consistencyReceiptId, result: e.result } }];
    if (conflict) effects.push(invalid(e,
      { type: "consistency-receipt", consistencyReceiptId: e.consistencyReceiptId }));
    return accept(s, e, { consistencyReceipts: withSet(s.consistencyReceipts, e.consistencyReceiptId),
      projections: conflict ? { ...s.projections, claim: "invalid" } : s.projections }, effects);
  }
  if (e.authoritativeTick >= s.registration!.buildConsistencyDeadline) {
    const key = `consistency:${e.buildAttemptId}`;
    const lateValue = { buildReceiptId: e.buildReceiptId, result: e.result };
    const conflict = lateConflict(s, key, lateValue) || consistencyInputInvalid(s, e);
    const effects: C.DeclaredEffect[] = [
      { type: "late-receipt-retained", causalEventId: e.eventId, evidence: { type: "build-consistency",
        buildAttemptId: e.buildAttemptId, consistencyReceiptId: e.consistencyReceiptId, result: e.result } },
      { type: "execution-gate-set", causalEventId: e.eventId,
        buildAttemptId: e.buildAttemptId, value: "denied" },
      nonPromotional(e, { type: "consistency-receipt", consistencyReceiptId: e.consistencyReceiptId })];
    if (conflict) effects.push(invalid(e,
      { type: "consistency-receipt", consistencyReceiptId: e.consistencyReceiptId }));
    return accept(s, e, { consistencyReceipts: withSet(s.consistencyReceipts, e.consistencyReceiptId),
      lateFacts: withMap(s.lateFacts, key, lateValue), projections: { ...s.projections,
        claim: conflict ? "invalid" : s.projections.claim === "invalid" ? "invalid" : "non-promotional" } }, effects);
  }
  const invalidInput = consistencyInputInvalid(s, e);
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
  if (receiptUsed(s, e.observationReceiptId)) return reject(s, e, "receipt-replay");
  const projection: C.BuildConsistencyTerminalProjection = { type: e.result,
    observationReceiptId: e.observationReceiptId };
  return accept(s, e, { receipts: withSet(s.receipts, e.observationReceiptId),
    projections: { ...s.projections, buildConsistency: projection,
      claim: s.projections.claim === "invalid" ? "invalid" : "non-promotional" } },
  [terminal(e, { type: "build-consistency", projection }), { type: "execution-gate-set",
    causalEventId: e.eventId, buildAttemptId: e.buildAttemptId, value: "denied" },
  nonPromotional(e, { type: "receipt", receiptId: e.observationReceiptId })]);
};
const admission = (s: State, e: C.RecordAdmission): QualificationTransition => {
  if (!rootMatches(s.registration!, e) || e.admissionId !== s.registration!.admissionId)
    return reject(s, e, "wrong-binding");
  if (s.projections.sourceEvidence.type !== "closed") return reject(s, e, "source-terminal");
  if (s.projections.admission.type !== "pending") return reject(s, e, "terminal-already-recorded");
  if (receiptUsed(s, e.receiptId)) return reject(s, e, "receipt-replay");
  const projection: Exclude<C.AdmissionProjection, { readonly type: "pending" }> =
    { type: e.result, receiptId: e.receiptId };
  const revoked = e.result === "failed" ? revoke(s, e, () => true) : { authorizations: s.authorizations, effects: [] };
  return accept(s, e, { receipts: withSet(s.receipts, e.receiptId), authorizations: revoked.authorizations,
    projections: { ...s.projections, admission: projection,
      claim: e.result === "failed" && s.projections.claim !== "invalid" ?
        "non-promotional" : s.projections.claim } },
  [terminal(e, { type: "admission", projection }), ...revoked.effects,
    ...(e.result === "failed" ? [nonPromotional(e, { type: "receipt", receiptId: e.receiptId })] : [])]);
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
const tombstonePreservedDenials: ReadonlySet<C.DenialReason> = new Set([
  "wrong-binding", "retirement-owner-mismatch", "credential-lineage-mismatch",
  "runtime-unresolved", "receipt-replay", "terminal-already-recorded",
]);
const beforeTombstoneFinality = (reason: C.DenialReason | undefined): boolean =>
  reason !== undefined && tombstonePreservedDenials.has(reason);
const preserveReplayedRuntimeSafety = (s: State, e: C.ProtocolEvent,
  transition: QualificationTransition): QualificationTransition => {
  const replay = transition.result.effects.some(effect =>
    effect.type === "denial-recorded" && effect.reason === "receipt-replay");
  const unsafeStart = e.type === "ReleaseProcess";
  const uncertainStart = e.type === "ReachLaunchDeadline" && e.result === "start-unknown";
  if (!replay || !unsafeStart && !uncertainStart) return transition;
  const effects: C.DeclaredEffect[] = [...transition.result.effects];
  if (unsafeStart) effects.push({ type: "late-receipt-retained", causalEventId: e.eventId,
    evidence: { type: "launch", authorizationId: e.authorizationId,
      receiptId: e.launchReceiptId, result: "started" } });
  effects.push(...contain(e));
  const publicProjections = s.projections.resourceRetirement.type === "retired" ? s.projections : {
    ...transition.result.terminalProjections, runtime: "unknown" as const,
    resourceRetirement: { type: "quarantined" as const }, claim: "invalid" as const,
  };
  const result: C.TransitionResult = { ...transition.result, effects,
    terminalProjections: publicProjections };
  const candidate = stateOf(transition.state);
  const state: State = { ...candidate, projections: publicProjections,
    postRetirementRuntime: s.projections.resourceRetirement.type === "retired" ?
      "unknown" : candidate.postRetirementRuntime,
    events: withMap(candidate.events, e.eventId, { event: e, result }) };
  return { state, result };
};
const enforceTombstoneFinality = (s: State, e: C.ProtocolEvent, transition: QualificationTransition): QualificationTransition => {
  if (transition.result.decision === "rejected") {
    const reason = transition.result.effects.find(effect =>
      effect.type === "denial-recorded")?.reason;
    if (reason === "receipt-replay") {
      const result = { ...transition.result, terminalProjections: s.projections };
      const candidate = stateOf(transition.state);
      const events = withMap(s.events, e.eventId, { event: e, result });
      return { state: { ...s, postRetirementRuntime: candidate.postRetirementRuntime,
        events } as State, result };
    }
    return beforeTombstoneFinality(reason) ? transition :
      reject(s, e, "terminal-already-recorded");
  }
  const fx = transition.result.effects;
  const candidate = stateOf(transition.state);
  const runtimeSafety = fx.some(effect => effect.type === "resource-quarantined" ||
    effect.type === "runtime-reconciliation-requested" || effect.type === "runtime-termination-requested");
  if (runtimeSafety || e.type === "ReconcileRuntime" && candidate.postRetirementRuntime !== null)
    return accept(s, e, { receipts: candidate.receipts,
      postRetirementRuntime: candidate.postRetirementRuntime ?? "unknown" }, fx);
  const forensicEffects = fx.filter(effect => effect.type === "late-receipt-retained" ||
    effect.type === "claim-disposition-set" && effect.value === "invalid" ||
    effect.type === "execution-gate-set" && effect.value === "denied");
  if (!forensicEffects.some(effect => effect.type === "late-receipt-retained"))
    return reject(s, e, "terminal-already-recorded");
  return accept(s, e, { receipts: candidate.receipts, buildReceipts: candidate.buildReceipts,
    consistencyReceipts: candidate.consistencyReceipts, lateFacts: candidate.lateFacts }, forensicEffects);
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
  let transition = dispatch(s, event);
  const receipt = eventReceipt(event);
  const denial = transition.result.effects.find(effect => effect.type === "denial-recorded");
  const replayAlreadyRecorded = denial?.reason === "receipt-replay";
  const identityFailure = denial?.reason === "wrong-binding" ||
    denial?.reason === "retirement-owner-mismatch" || denial?.reason === "credential-lineage-mismatch";
  if (receipt !== null && receiptUsed(s, receipt) && !replayAlreadyRecorded && !identityFailure)
    transition = reject(s, event, "receipt-replay");
  transition = preserveReplayedRuntimeSafety(s, event, transition);
  return s.projections.resourceRetirement.type === "retired" ?
    enforceTombstoneFinality(s, event, transition) : transition;
};
export const foldQualificationHistory = (
  events: readonly C.ProtocolEvent[], maximumEvents: number, trusted: C.TrustedProtocolCoordinates,
): QualificationFold => {
  if (!Number.isSafeInteger(maximumEvents) || maximumEvents < 0)
    throw new TypeError("maximumEvents must be a non-negative safe integer.");
  if (events.length > maximumEvents) throw new RangeError("Qualification history exceeds maximumEvents.");
  let state = initializeQualificationReducer(trusted);
  const results: C.TransitionResult[] = [];
  for (const event of events) { const next = transitionQualificationEvent(state, event);
    state = next.state; results.push(next.result); }
  return { state, results };
};
