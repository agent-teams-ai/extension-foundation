/**
 * Qualification-only, independently authored history oracle.
 * Disposable evidence modeled as an append-only ledger queried through
 * explicit tables, rather than as the reducer's mutable aggregate.
 */
import type { AdmissionProjection, AuthorizationFenceBinding, AuthorizationId, BuildConsistencyTerminalProjection,
BuildReceiptId, BuildTerminalProjection, ClaimProjection, DeclaredEffect, DenialReason, DenialSubject, EventId,
FenceGeneration, ProtocolEvent, RegisterProtocol, ResourceRetirementProjection, RuntimeProjection,
SourceEvidenceProjection, TerminalProjections, TransitionResult, } from "./dogfooding-protocol-contract.ts";
interface LedgerRow { readonly event: ProtocolEvent; readonly result: TransitionResult; readonly accepted: boolean; }
export interface OracleHistory { readonly registration: RegisterProtocol; readonly rows: readonly LedgerRow[]; }
export interface OracleStep { readonly history: OracleHistory; readonly result: TransitionResult; }
export interface OracleFold { readonly history: OracleHistory; readonly results: readonly TransitionResult[]; }
type FenceName = "source" | "campaign" | "family-allocation"; interface FenceView {
readonly generation: FenceGeneration; readonly open: boolean; } interface AuthorizationView {
readonly issue: Extract<ProtocolEvent, { readonly type: "IssueAuthorization" }>; readonly consumed: boolean;
readonly revoked: boolean; readonly expired: boolean; readonly released: boolean; }
const initialProjection = (): TerminalProjections => ({ sourceEvidence: { type: "open" },
resourceRetirement: { type: "active" }, runtime: "not-started", launch: null, attempt: null, stopCheckpoint: null,
build: null, buildConsistency: null, admission: { type: "pending" }, claim: "eligible", });
const currentProjection = (history: OracleHistory): TerminalProjections =>
history.rows.at(-1)?.result.terminalProjections ?? initialProjection();
const acceptedEvents = (history: OracleHistory): readonly ProtocolEvent[] =>
history.rows.filter(row => row.accepted).map(row => row.event);
const same = (left: unknown, right: unknown): boolean => left === right;
const samePayload = (left: unknown, right: unknown): boolean => {
if (same(left, right)) return true;
if (typeof left !== "object" || left === null || typeof right !== "object" || right === null) return false;
if (Array.isArray(left) || Array.isArray(right)) return Array.isArray(left) && Array.isArray(right) &&
left.length === right.length && left.every((value, index) => samePayload(value, right[index]));
const leftRecord = left as Readonly<Record<string, unknown>>;
const rightRecord = right as Readonly<Record<string, unknown>>;
const leftKeys = Object.keys(leftRecord); const rightKeys = Object.keys(rightRecord);
return leftKeys.length === rightKeys.length && leftKeys.every(key =>
Object.prototype.hasOwnProperty.call(rightRecord, key) && samePayload(leftRecord[key], rightRecord[key])); };
const withProjection = (
before: TerminalProjections, patch: Partial<TerminalProjections>, ): TerminalProjections => ({ ...before, ...patch });
const claimAfter = (current: ClaimProjection, proposed: ClaimProjection): ClaimProjection =>
current === "invalid" || proposed === "invalid" ? "invalid"
: current === "non-promotional" || proposed === "non-promotional" ? "non-promotional" : "eligible"; const accept = (
projection: TerminalProjections, effects: readonly DeclaredEffect[] = [],
): TransitionResult => ({ decision: "accepted", effects, terminalProjections: projection });
const denialSubject = (event: ProtocolEvent): DenialSubject => { switch (event.type) { case "ReleaseProcess":
return { type: "process-release", authorizationId: event.authorizationId, attemptId: event.attemptId, runtimeId: event.runtimeId };
case "IssueAuthorization": case "ConsumeAuthorization": case "RevokeAuthorization": case "ExpireAuthorization": case "RecordReleaseDenied": case "ReachLaunchDeadline":
return { type: "authorization", authorizationId: event.authorizationId };
case "RecordAttemptReceipt": case "ReachAttemptDeadline": return { type: "attempt", attemptId: event.attemptId };
case "ObserveCrash": case "RestartObserved": case "ReconcileRuntime": case "RequestCleanup": case "CompleteRetirement":
return { type: "runtime", runtimeId: event.runtimeId };
case "CheckpointEffective": case "RecordStopReceipt": case "ReachStopDeadline": case "RecoverStopFence":
return { type: "checkpoint", checkpointId: event.checkpointId };
case "RecordBuildResult": case "ReachBuildDeadline": case "RecordBuildConsistencyReceipt": case "ReachBuildConsistencyDeadline":
return { type: "build-attempt", buildAttemptId: event.buildAttemptId };
case "RecordAdmission": return { type: "admission", admissionId: event.admissionId };
default: return { type: "source-root", sourceFamilyRootId: event.sourceFamilyRootId }; } }; const denial = (
event: ProtocolEvent, projection: TerminalProjections, reason: DenialReason, ): TransitionResult => { return {
decision: "rejected",
effects: [{ type: "denial-recorded", causalEventId: event.eventId, reason, subject: denialSubject(event) }],
terminalProjections: projection, }; }; const acceptedOf = <Kind extends ProtocolEvent["type"]>(
history: OracleHistory, type: Kind, ): readonly Extract<ProtocolEvent, { readonly type: Kind }>[] =>
acceptedEvents(history).filter(
(event): event is Extract<ProtocolEvent, { readonly type: Kind }> => event.type === type, );
const fence = (history: OracleHistory, name: FenceName): FenceView => { const registration = history.registration;
let generation = name === "source" ? registration.sourceFenceGeneration : name === "campaign"
? registration.campaignFenceGeneration : registration.familyAllocationFenceGeneration; let open = true;
for (const event of acceptedEvents(history)) { if (event.type === "AdvanceFence" && event.fence === name) {
generation = event.nextGeneration; open = false; } else if ( name === "source" &&
(event.type === "CloseSource" || event.type === "AbandonSource") ) { generation = event.nextGeneration; open = false;
} else if ( name === "campaign" && event.type === "RecoverStopFence" ) { generation = event.nextGeneration;
open = false; } else if (event.type === "ExpireAuthorization") {
const issue = acceptedOf(history, "IssueAuthorization").find(candidate =>
same(candidate.authorizationId, event.authorizationId));
if (issue?.authorizationFence.scope === name) open = false;
} else if (name === "family-allocation" && event.type === "CloseSource") open = false;
} return { generation, open }; }; const authorization = ( history: OracleHistory, id: AuthorizationId,
): AuthorizationView | null => {
const issue = acceptedOf(history, "IssueAuthorization").find(event => same(event.authorizationId, id));
if (issue === undefined) return null; const issueIndex = history.rows.findIndex(row => row.accepted &&
same(row.event.eventId, issue.eventId)); const laterRows = history.rows.slice(issueIndex + 1).filter(row => row.accepted);
const later = laterRows.map(row => row.event);
return { issue,
consumed: later.some(event => event.type === "ConsumeAuthorization" && same(event.authorizationId, id)),
revoked: laterRows.some(row => row.result.effects.some(effect => effect.type === "authorization-revoked" &&
same(effect.authorizationId, id))),
expired: later.some(event => event.type === "ExpireAuthorization" && same(event.authorizationId, id)),
released: later.some(event => event.type === "ReleaseProcess" && same(event.authorizationId, id)), }; };
const rootMatches = ( registration: RegisterProtocol,
event: { readonly sourceClaimFamilyId: unknown; readonly sourceFamilyRootId: unknown }, ): boolean =>
same(event.sourceClaimFamilyId, registration.sourceClaimFamilyId) &&
same(event.sourceFamilyRootId, registration.sourceFamilyRootId); const ownerMatches = (
registration: RegisterProtocol, event: { readonly retirementOwnerId: unknown; readonly credentialLineageId: unknown },
): DenialReason | null => !same(event.retirementOwnerId, registration.retirementOwnerId) ? "retirement-owner-mismatch"
: !same(event.credentialLineageId, registration.credentialLineageId) ? "credential-lineage-mismatch" : null;
const authorizationBindingMatches = ( registration: RegisterProtocol, event: { readonly sourceClaimFamilyId: unknown;
readonly sourceFamilyRootId: unknown; readonly sourceSlotId: unknown; readonly runtimeId: unknown;
readonly retirementOwnerId: unknown; readonly credentialLineageId: unknown; }, ): DenialReason | null =>
!rootMatches(registration, event) || !same(event.sourceSlotId, registration.sourceSlotId) ||
!same(event.runtimeId, registration.runtimeId) ? "wrong-binding" : ownerMatches(registration, event);
const sameFenceBinding = ( left: AuthorizationFenceBinding, right: AuthorizationFenceBinding, ): boolean =>
left.scope === right.scope && same(left.expectedGeneration, right.expectedGeneration) && (left.scope !== "source" ||
(right.scope === "source" &&
same(left.expectedFamilyAllocationGeneration, right.expectedFamilyAllocationGeneration))); const bindingIsCurrent = (
history: OracleHistory, binding: AuthorizationFenceBinding, ): DenialReason | null => {
const selected = fence(history, binding.scope); if (!selected.open) return "gate-closed";
if (!same(binding.expectedGeneration, selected.generation)) return "stale-generation";
if (binding.scope === "source") { const family = fence(history, "family-allocation");
if (!family.open) return "gate-closed"; if (!same(binding.expectedFamilyAllocationGeneration, family.generation)) {
return "stale-generation"; }
} return null; }; const stopBarrier = (history: OracleHistory): boolean => {
const checkpoint = acceptedOf(history, "CheckpointEffective").at(-1); if (checkpoint === undefined) return false;
const terminal = currentProjection(history).stopCheckpoint; return terminal === null || terminal.type !== "continue";
}; const releaseRuntimeUnresolved = (history: OracleHistory): boolean => currentProjection(history).runtime === "unknown" ||
acceptedEvents(history).some(event => event.type === "ObserveCrash" || event.type === "RestartObserved" ||
(event.type === "ReconcileRuntime" && event.observation === "unknown") ||
(event.type === "ReachLaunchDeadline" && event.result === "start-unknown"));
const ownedReceipt = (event: ProtocolEvent): unknown => { switch (event.type) {
case "CloseSource": case "AbandonSource": case "RecordReleaseDenied": case "RecordAttemptReceipt":
case "RecordStopReceipt": case "RecordAdmission": return event.receiptId;
case "ReleaseProcess": return event.launchReceiptId;
case "ReachLaunchDeadline": case "ReachAttemptDeadline": case "ReachStopDeadline": case "ReachBuildDeadline":
case "ReachBuildConsistencyDeadline": return event.observationReceiptId;
case "RecordBuildResult": return event.buildReceiptId;
case "RecordBuildConsistencyReceipt": return event.consistencyReceiptId;
case "CompleteRetirement": return event.tombstoneId;
default: return undefined; } }; const usedReceipt = (history: OracleHistory, candidate: unknown): boolean =>
history.rows.some(row => row.accepted && same(ownedReceipt(row.event), candidate));
const revocations = ( history: OracleHistory, causalEventId: EventId, scope: "source" | "campaign",
includeConsumed: boolean, onlyId?: AuthorizationId, ): readonly DeclaredEffect[] =>
acceptedOf(history, "IssueAuthorization").filter(issue => {
const view = authorization(history, issue.authorizationId); return issue.authorizationFence.scope === scope &&
(onlyId === undefined || same(issue.authorizationId, onlyId)) && view !== null && !view.revoked && !view.expired &&
!view.released && (includeConsumed || !view.consumed); })
.map(issue => ({ type: "authorization-revoked" as const, causalEventId, authorizationId: issue.authorizationId,
authorizationFence: issue.authorizationFence, })); const invalidClaimEffects = ( event: ProtocolEvent,
evidence: DeclaredEffect extends infer _Unused ? | { readonly type: "event"; readonly eventId: EventId }
| { readonly type: "receipt"; readonly receiptId: Extract<ProtocolEvent, { readonly type: "RecordAttemptReceipt" }>["receiptId"] }
| { readonly type: "build-receipt"; readonly buildReceiptId: BuildReceiptId }
| { readonly type: "consistency-receipt"; readonly consistencyReceiptId: Extract<ProtocolEvent, { readonly type: "RecordBuildConsistencyReceipt" }>["consistencyReceiptId"] }
: never, ): readonly DeclaredEffect[] => [
{ type: "claim-disposition-set", causalEventId: event.eventId, value: "invalid", evidence }, ];
const nonPromotional = ( event: ProtocolEvent, evidence: | { readonly type: "event"; readonly eventId: EventId }
| { readonly type: "receipt"; readonly receiptId: Extract<ProtocolEvent, { readonly type: "RecordAdmission" }>["receiptId"] },
): DeclaredEffect => ({ type: "claim-disposition-set", causalEventId: event.eventId, value: "non-promotional",
evidence, }); const commonEnvelopeFailure = (history: OracleHistory, event: ProtocolEvent): DenialReason | null => {
const registration = history.registration; if ( !same(event.protocolRevisionId, registration.protocolRevisionId) ||
!same(event.custodyAuthorityId, registration.custodyAuthorityId) ) { return "wrong-binding"; }
const predecessor = acceptedEvents(history).at(-1); if (predecessor === undefined) return "not-registered";
if (!same(event.authenticatedPredecessorId, predecessor.eventId)) return "wrong-binding";
return event.authoritativeTick < predecessor.authoritativeTick ? "wrong-binding" : null; }; const sourceTerminal = (
history: OracleHistory, ): Exclude<SourceEvidenceProjection, { readonly type: "open" }> | null => {
const source = currentProjection(history).sourceEvidence; return source.type === "open" ? null : source; };
const retainsReceipt = (references: Extract<ProtocolEvent, { readonly type: "CompleteRetirement" }>["retainedEvidence"],
receiptId: unknown): boolean => references.some(reference => reference.type === "receipt" &&
same(reference.receiptId, receiptId));
const appendSourceTerminal = ( history: OracleHistory,
event: Extract<ProtocolEvent, { readonly type: "CloseSource" | "AbandonSource" }>, ): TransitionResult => {
const before = currentProjection(history);
if (!rootMatches(history.registration, event)) return denial(event, before, "wrong-binding");
if (before.sourceEvidence.type !== "open") return denial(event, before, "terminal-already-recorded");
const sourceFence = fence(history, "source"); if (!sourceFence.open) return denial(event, before, "gate-closed");
if (!same(event.expectedGeneration, sourceFence.generation) || event.nextGeneration <= event.expectedGeneration) {
return denial(event, before, "stale-generation"); }
if (usedReceipt(history, event.receiptId)) return replay(event, history, event.receiptId);
const projection: Exclude<SourceEvidenceProjection, { readonly type: "open" }> = event.type === "CloseSource"
? { type: "closed", receiptId: event.receiptId, sourceDigest: event.sourceDigest }
: { type: "abandoned", receiptId: event.receiptId, proofId: event.proofId }; const effects: DeclaredEffect[] = [
{ type: "terminal-appended", causalEventId: event.eventId, terminal: { type: "source", projection } },
{ type: "gate-closed", causalEventId: event.eventId, fence: "source", generation: event.nextGeneration },
...(event.type === "AbandonSource" ? revocations(history, event.eventId, "source", false) : []), ];
if (event.type === "CloseSource") effects.push({ type: "gate-closed", causalEventId: event.eventId,
fence: "family-allocation", generation: fence(history, "family-allocation").generation });
if (event.type === "AbandonSource") {
effects.push(nonPromotional(event, { type: "receipt", receiptId: event.receiptId })); } return accept(
withProjection(before, { sourceEvidence: projection, claim:
event.type === "AbandonSource" ? claimAfter(before.claim, "non-promotional") : before.claim, }), effects, ); };
const replay = (event: ProtocolEvent, history: OracleHistory, receipt: unknown): TransitionResult => {
const before = currentProjection(history);
let evidence: Parameters<typeof invalidClaimEffects>[1] = { type: "event", eventId: event.eventId };
if (event.type === "RecordBuildResult") evidence = { type: "build-receipt", buildReceiptId: event.buildReceiptId };
else if (event.type === "RecordBuildConsistencyReceipt") {
evidence = { type: "consistency-receipt", consistencyReceiptId: event.consistencyReceiptId };
} else if (event.type === "RecordAttemptReceipt") evidence = { type: "receipt", receiptId: event.receiptId };
const effects: DeclaredEffect[] = [
{ type: "denial-recorded", causalEventId: event.eventId, reason: "receipt-replay", subject: denialSubject(event) },
...invalidClaimEffects(event, evidence), ]; if (event.type === "RecordBuildResult" ||
event.type === "RecordBuildConsistencyReceipt") effects.push({ type: "execution-gate-set",
causalEventId: event.eventId, buildAttemptId: event.buildAttemptId, value: "denied" });
void receipt; return accept(withProjection(before, { claim: "invalid" }), effects); }; const terminalConflict = ( currentType: string, nextType: string,
): boolean => currentType !== nextType; const handleAuthorization = ( history: OracleHistory,
event: Extract<ProtocolEvent, {
readonly type: "IssueAuthorization" | "ConsumeAuthorization" | "RevokeAuthorization" | "ExpireAuthorization"; }>,
): TransitionResult => { const before = currentProjection(history); const registration = history.registration;
if (event.type === "IssueAuthorization") { const mismatch = authorizationBindingMatches(registration, event);
if (mismatch !== null) return denial(event, before, mismatch);
if (event.authorizationFence.scope === "source" && before.sourceEvidence.type !== "open") {
return denial(event, before, "source-terminal"); }
if (event.authoritativeTick >= event.expiresAt) return denial(event, before, "authorization-expired");
if (before.admission.type === "failed" || before.resourceRetirement.type !== "active") {
return denial(event, before, "gate-closed"); }
const fenceFailure = bindingIsCurrent(history, event.authorizationFence);
if (fenceFailure !== null) return denial(event, before, fenceFailure);
if (event.authorizationFence.scope === "campaign" && stopBarrier(history)) {
return denial(event, before, "gate-closed"); }
if (authorization(history, event.authorizationId) !== null) return denial(event, before, "authorization-unavailable");
return accept(before, [{ type: "authorization-issued", causalEventId: event.eventId,
authorizationId: event.authorizationId, sourceFamilyRootId: event.sourceFamilyRootId,
authorizationFence: event.authorizationFence, }]); }
if (!rootMatches(registration, event)) return denial(event, before, "wrong-binding");
const view = authorization(history, event.authorizationId);
if (view !== null && !sameFenceBinding(view.issue.authorizationFence, event.authorizationFence)) {
return denial(event, before, "wrong-binding"); } if (event.type === "ConsumeAuthorization") {
const mismatch = authorizationBindingMatches(registration, event);
if (mismatch !== null) return denial(event, before, mismatch);
if (event.authorizationFence.scope === "source" && before.sourceEvidence.type !== "open") {
return denial(event, before, "source-terminal"); }
if (view === null) return denial(event, before, "authorization-unavailable");
if (view.expired || event.authoritativeTick >= view.issue.expiresAt) {
return denial(event, before, "authorization-expired"); }
if (view.revoked) return denial(event, before, "authorization-revoked");
const fenceFailure = bindingIsCurrent(history, event.authorizationFence);
if (fenceFailure !== null) return denial(event, before, fenceFailure);
if (event.authorizationFence.scope === "campaign" && stopBarrier(history)) {
return denial(event, before, "gate-closed"); }
if (view.consumed) return denial(event, before, "authorization-consumed"); return accept(before); }
if (view === null) return denial(event, before, "authorization-unavailable");
if (view.expired) return denial(event, before, "authorization-expired");
if (view.revoked) return denial(event, before, "authorization-revoked");
if (event.type === "ExpireAuthorization" && event.authoritativeTick < view.issue.expiresAt) {
return denial(event, before, "deadline-not-reached"); }
const effects: DeclaredEffect[] = event.type === "RevokeAuthorization" ? [{ type: "authorization-revoked",
causalEventId: event.eventId, authorizationId: event.authorizationId, authorizationFence: event.authorizationFence, }]
: [...revocations(history, event.eventId, event.authorizationFence.scope,
event.authorizationFence.scope === "campaign", event.authorizationFence.scope === "source"
? event.authorizationId : undefined), { type: "gate-closed", causalEventId: event.eventId,
fence: event.authorizationFence.scope, generation: event.authorizationFence.expectedGeneration }];
return accept(before, effects); }; const handleFence = (
history: OracleHistory, event: Extract<ProtocolEvent, { readonly type: "AdvanceFence" }>, ): TransitionResult => {
const before = currentProjection(history);
if (!rootMatches(history.registration, event)) return denial(event, before, "wrong-binding");
const view = fence(history, event.fence); if (!view.open) return denial(event, before, "gate-closed");
if (!same(view.generation, event.expectedGeneration) || event.nextGeneration <= event.expectedGeneration) {
return denial(event, before, "stale-generation"); } const effects: DeclaredEffect[] = [
{ type: "gate-closed", causalEventId: event.eventId, fence: event.fence, generation: event.nextGeneration },
...((event.cause === "expiry" || event.cause === "analytic-stop") ? revocations(history, event.eventId,
event.fence === "campaign" ? "campaign" : "source", event.fence === "campaign") : []), ];
return accept(before, effects); };
const handleRelease = ( history: OracleHistory, event: Extract<ProtocolEvent, {
readonly type: "ReleaseProcess" | "RecordReleaseDenied" | "ObserveCrash" | "ReachLaunchDeadline"; }>,
): TransitionResult => { const before = currentProjection(history); const registration = history.registration;
if (event.type === "ObserveCrash") {
if (!rootMatches(registration, event) || !same(event.runtimeId, registration.runtimeId)) {
return denial(event, before, "wrong-binding"); } const view = authorization(history, event.authorizationId);
if (before.runtime !== "not-started") return denial(event, before, "runtime-unresolved");
if (before.launch !== null) return denial(event, before, "terminal-already-recorded");
if (view === null || !view.consumed || view.released) return denial(event, before, "authorization-unavailable");
if (!same(view.issue.authorizationFence.expectedGeneration, event.expectedGeneration)) {
return denial(event, before, "stale-generation"); } return accept(
withProjection(before, { runtime: "unknown", resourceRetirement: { type: "quarantined" } }), [
{ type: "resource-quarantined", causalEventId: event.eventId, sourceFamilyRootId: event.sourceFamilyRootId, runtimeId: event.runtimeId },
{ type: "runtime-reconciliation-requested", causalEventId: event.eventId, runtimeId: event.runtimeId },
{ type: "runtime-termination-requested", causalEventId: event.eventId, runtimeId: event.runtimeId }, ], ); }
const mismatch = authorizationBindingMatches(registration, event);
if (mismatch !== null) return denial(event, before, mismatch);
const view = authorization(history, event.authorizationId);
if (view !== null && !sameFenceBinding(view.issue.authorizationFence, event.authorizationFence)) {
return denial(event, before, "wrong-binding"); } if (event.type === "ReachLaunchDeadline") {
if (view === null) return denial(event, before, "authorization-unavailable");
if (before.launch !== null) return denial(event, before, "terminal-already-recorded");
if (event.authoritativeTick < registration.launchDeadline) return denial(event, before, "deadline-not-reached");
if (usedReceipt(history, event.observationReceiptId)) return replay(event, history, event.observationReceiptId);
if (event.result === "start-unknown" && !view.consumed) return denial(event, before, "wrong-binding");
if (event.result === "never-started" && view.released) return denial(event, before, "wrong-binding");
const launch = { type: event.result, receiptId: event.observationReceiptId } as const; return accept(
withProjection(before, { launch, runtime: event.result === "start-unknown" ? "unknown" : "not-started",
resourceRetirement: event.result === "start-unknown" ? { type: "quarantined" } : before.resourceRetirement,
claim: claimAfter(before.claim, "non-promotional"), }), [
{ type: "terminal-appended", causalEventId: event.eventId, terminal: { type: "launch", projection: launch } },
nonPromotional(event, { type: "receipt", receiptId: event.observationReceiptId }), ], ); }
if (event.type === "ReleaseProcess" && !same(event.attemptId, registration.attemptId)) {
return denial(event, before, "wrong-binding"); }
if ((event.type === "ReleaseProcess" && releaseRuntimeUnresolved(history)) ||
(event.type === "RecordReleaseDenied" && before.runtime === "unknown")) {
return denial(event, before, "runtime-unresolved"); }
if (before.launch !== null) return denial(event, before, "terminal-already-recorded");
if (event.type === "RecordReleaseDenied") {
if (view === null || !view.consumed) return denial(event, before, "authorization-unavailable");
if (usedReceipt(history, event.receiptId)) return replay(event, history, event.receiptId);
const launch = { type: "release-denied" as const, receiptId: event.receiptId };
return accept(withProjection(before, { launch }), [
{ type: "terminal-appended", causalEventId: event.eventId, terminal: { type: "launch", projection: launch } }, ]); }
if (usedReceipt(history, event.launchReceiptId)) return replay(event, history, event.launchReceiptId);
if (event.authorizationFence.scope === "source" && before.sourceEvidence.type !== "open") {
return denial(event, before, "source-terminal"); }
if (view !== null && (view.expired || event.authoritativeTick >= view.issue.expiresAt)) {
return denial(event, before, "authorization-expired"); }
if (view?.revoked === true) return denial(event, before, "authorization-revoked");
const fenceFailure = bindingIsCurrent(history, event.authorizationFence);
if (fenceFailure !== null) return denial(event, before, fenceFailure);
if (event.authorizationFence.scope === "campaign" && stopBarrier(history)) {
return denial(event, before, "gate-closed"); }
if (event.authorizationFence.scope === "campaign" && (before.build?.type !== "succeeded" ||
before.buildConsistency?.type !== "match" || before.claim !== "eligible")) {
return denial(event, before, "build-not-executable"); }
if (view === null || !view.consumed) return denial(event, before, "authorization-unavailable");
const launch = { type: "started" as const, receiptId: event.launchReceiptId }; return accept(
withProjection(before, { launch, runtime: "live" }), [ { type: "process-release-requested",
causalEventId: event.eventId, authorizationId: event.authorizationId, runtimeId: event.runtimeId,
authorizationFence: event.authorizationFence, }, ], );
}; const handleRuntime = ( history: OracleHistory, event: Extract<ProtocolEvent, {
readonly type: "RestartObserved" | "ReconcileRuntime" | "RequestRetirement" | "RequestCleanup" | "CompleteRetirement";
}>, ): TransitionResult => { const before = currentProjection(history); const registration = history.registration;
if (!rootMatches(registration, event)) return denial(event, before, "wrong-binding");
if (event.type === "RestartObserved" || event.type === "ReconcileRuntime") {
if (!same(event.runtimeId, registration.runtimeId)) return denial(event, before, "wrong-binding");
if (event.type === "RestartObserved") {
const hasProspectiveRuntime = acceptedOf(history, "ConsumeAuthorization").length > 0 || before.runtime !== "not-started";
if (!hasProspectiveRuntime) return denial(event, before, "runtime-unresolved"); return accept(
withProjection(before, { runtime: "unknown", resourceRetirement: { type: "quarantined" } }), [
{ type: "resource-quarantined", causalEventId: event.eventId, sourceFamilyRootId: event.sourceFamilyRootId, runtimeId: event.runtimeId },
{ type: "runtime-reconciliation-requested", causalEventId: event.eventId, runtimeId: event.runtimeId }, ], ); }
if (event.observation === "unknown") { return accept(
withProjection(before, { runtime: "unknown", resourceRetirement: { type: "quarantined" } }), [
{ type: "resource-quarantined", causalEventId: event.eventId, sourceFamilyRootId: event.sourceFamilyRootId, runtimeId: event.runtimeId },
{ type: "runtime-reconciliation-requested", causalEventId: event.eventId, runtimeId: event.runtimeId }, ], ); }
const runtime: RuntimeProjection = event.observation; const retirement = event.observation === "terminated" &&
before.resourceRetirement.type === "quarantined" ? { type: "pending" as const } : before.resourceRetirement;
return accept(withProjection(before, { runtime, resourceRetirement: retirement }),
event.observation === "live"
? [{ type: "runtime-termination-requested", causalEventId: event.eventId, runtimeId: event.runtimeId }] : []); }
const mismatch = ownerMatches(registration, event); if (mismatch !== null) return denial(event, before, mismatch);
if (event.type === "RequestRetirement") {
if (before.resourceRetirement.type === "retired") return denial(event, before, "terminal-already-recorded");
if (sourceTerminal(history) === null) return denial(event, before, "source-terminal");
const effects: DeclaredEffect[] = []; for (const issue of acceptedOf(history, "IssueAuthorization")) {
const view = authorization(history, issue.authorizationId);
if (view !== null && !view.revoked && !view.expired) { effects.push({ type: "authorization-revoked",
causalEventId: event.eventId, authorizationId: issue.authorizationId, authorizationFence: issue.authorizationFence,
}); } } if (before.runtime === "unknown") { effects.push(
{ type: "resource-quarantined", causalEventId: event.eventId, sourceFamilyRootId: event.sourceFamilyRootId, runtimeId: registration.runtimeId },
{ type: "runtime-reconciliation-requested", causalEventId: event.eventId, runtimeId: registration.runtimeId }, );
} else if (before.runtime === "live") {
effects.push({ type: "runtime-termination-requested", causalEventId: event.eventId, runtimeId: registration.runtimeId });
} return accept(withProjection(before, {
resourceRetirement: before.runtime === "unknown" ? { type: "quarantined" } : { type: "pending" }, }), effects); }
if (!same(event.runtimeId, registration.runtimeId)) return denial(event, before, "wrong-binding");
if (before.resourceRetirement.type !== "pending" && before.resourceRetirement.type !== "quarantined") {
return denial(event, before, "gate-closed"); }
if (before.runtime === "unknown" || before.runtime === "live") return denial(event, before, "runtime-unresolved");
if (event.type === "RequestCleanup") {
if (sourceTerminal(history) === null) return denial(event, before, "source-terminal"); return accept(before, [{
type: "resource-cleanup-requested", causalEventId: event.eventId, sourceFamilyRootId: event.sourceFamilyRootId,
runtimeId: event.runtimeId, proofId: event.terminationProofId, }]); } const source = sourceTerminal(history);
if (source === null || !same(source.receiptId, event.sourceTerminalReceiptId)) {
return denial(event, before, "wrong-binding"); } const cleanup = acceptedOf(history, "RequestCleanup").at(-1);
if (cleanup === undefined) return denial(event, before, "gate-closed");
if (!retainsReceipt(event.retainedEvidence, source.receiptId) ||
(before.admission.type !== "pending" && !retainsReceipt(event.retainedEvidence, before.admission.receiptId))) {
return denial(event, before, "wrong-binding"); }
if (usedReceipt(history, event.tombstoneId)) return replay(event, history, event.tombstoneId); const tombstone = {
tombstoneId: event.tombstoneId, sourceTerminal: source, retirementOwnerId: event.retirementOwnerId,
cleanupProofId: event.cleanupProofId, retainedEvidence: event.retainedEvidence, };
const retirement: ResourceRetirementProjection = { type: "retired", tombstone };
return accept(withProjection(before, { resourceRetirement: retirement }), [ { type: "retirement-tombstone-appended",
causalEventId: event.eventId, sourceFamilyRootId: event.sourceFamilyRootId, tombstoneId: event.tombstoneId,
retirementOwnerId: event.retirementOwnerId, cleanupProofId: event.cleanupProofId, }, ]); }; const handleAttempt = (
history: OracleHistory,
event: Extract<ProtocolEvent, { readonly type: "RecordAttemptReceipt" | "ReachAttemptDeadline" }>,
): TransitionResult => { const before = currentProjection(history); const registration = history.registration;
if (!same(event.attemptId, registration.attemptId)) return denial(event, before, "wrong-binding");
const receipt = event.type === "RecordAttemptReceipt" ? event.receiptId : event.observationReceiptId;
if (usedReceipt(history, receipt)) return replay(event, history, receipt);
if (event.type === "ReachAttemptDeadline" && event.authoritativeTick < registration.attemptDeadline) {
return denial(event, before, "deadline-not-reached"); }
if (event.type === "RecordAttemptReceipt" && !same(event.runtimeId, registration.runtimeId)) {
return denial(event, before, "wrong-binding"); } const nextType = event.result; if (before.attempt !== null) {
if (event.type === "ReachAttemptDeadline") return denial(event, before, "terminal-already-recorded");
const conflict = terminalConflict(before.attempt.type, nextType); const effects: DeclaredEffect[] = [{
type: "late-receipt-retained", causalEventId: event.eventId,
evidence: { type: "attempt", attemptId: event.attemptId, receiptId: event.receiptId, result: event.result }, }];
if (conflict) effects.push(...invalidClaimEffects(event, { type: "receipt", receiptId: event.receiptId }));
return accept( conflict ? withProjection(before, { claim: "invalid" }) : before, effects, ); }
const attempt = { type: nextType, receiptId: receipt }; const effects: DeclaredEffect[] = [
{ type: "terminal-appended", causalEventId: event.eventId, terminal: { type: "attempt", projection: attempt } }, ];
return accept(withProjection(before, { attempt }), effects); }; const handleStop = ( history: OracleHistory, event: Extract<ProtocolEvent, {
readonly type: "CheckpointEffective" | "RecordStopReceipt" | "ReachStopDeadline" | "RecoverStopFence"; }>,
): TransitionResult => { const before = currentProjection(history); const registration = history.registration;
if (!same(event.checkpointId, registration.checkpointId)) return denial(event, before, "wrong-binding");
if (event.type === "RecoverStopFence") {
if (before.stopCheckpoint === null || before.stopCheckpoint.type === "continue") {
return denial(event, before, "gate-closed"); } const campaign = fence(history, "campaign");
if (!campaign.open) return denial(event, before, "gate-closed");
if (!same(event.expectedGeneration, campaign.generation) || event.nextGeneration <= event.expectedGeneration) {
return denial(event, before, "stale-generation"); } return accept(before, [
{ type: "gate-closed", causalEventId: event.eventId, fence: "campaign", generation: event.nextGeneration },
...revocations(history, event.eventId, "campaign", true), ]); }
const campaign = fence(history, "campaign");
if (!same(event.expectedGeneration, campaign.generation)) return denial(event, before, "stale-generation");
if (event.type === "CheckpointEffective") {
if (!campaign.open || acceptedOf(history, "CheckpointEffective").length > 0) {
return denial(event, before, "gate-closed"); } return accept(before); }
if (acceptedOf(history, "CheckpointEffective").length === 0) return denial(event, before, "gate-closed");
const receipt = event.type === "RecordStopReceipt" ? event.receiptId : event.observationReceiptId;
if (usedReceipt(history, receipt)) return replay(event, history, receipt);
if (event.type === "ReachStopDeadline" && event.authoritativeTick < registration.stopDeadline) {
return denial(event, before, "deadline-not-reached"); } if (before.stopCheckpoint !== null) {
if (event.type === "ReachStopDeadline") return denial(event, before, "terminal-already-recorded");
const conflict = terminalConflict(before.stopCheckpoint.type, event.result); const effects: DeclaredEffect[] = [{
type: "late-receipt-retained", causalEventId: event.eventId,
evidence: { type: "stop", checkpointId: event.checkpointId, receiptId: event.receiptId, result: event.result }, }];
if (conflict) effects.push(...invalidClaimEffects(event, { type: "receipt", receiptId: event.receiptId }));
return accept(conflict ? withProjection(before, { claim: "invalid" }) : before, effects); }
const stopCheckpoint = { type: event.result, receiptId: receipt }; const effects: DeclaredEffect[] = [
{ type: "terminal-appended", causalEventId: event.eventId, terminal: { type: "stop", projection: stopCheckpoint } },
]; if (event.type === "ReachStopDeadline") {
effects.push(nonPromotional(event, { type: "receipt", receiptId: event.observationReceiptId })); }
return accept(withProjection(before, { stopCheckpoint,
claim: event.type === "ReachStopDeadline" ? claimAfter(before.claim, "non-promotional") : before.claim, }), effects);
}; const buildBindingMatches = ( registration: RegisterProtocol, event: { readonly sourceClaimFamilyId: unknown;
readonly sourceFamilyRootId: unknown; readonly sourceSlotId: unknown; readonly buildAttemptId: unknown; },
): boolean => rootMatches(registration, event) && same(event.sourceSlotId, registration.sourceSlotId) &&
same(event.buildAttemptId, registration.buildAttemptId); const handleBuild = ( history: OracleHistory,
event: Extract<ProtocolEvent, { readonly type: "RecordBuildResult" | "ReachBuildDeadline" }>, ): TransitionResult => {
const before = currentProjection(history); const registration = history.registration;
if (!buildBindingMatches(registration, event)) return denial(event, before, "wrong-binding");
if (before.sourceEvidence.type !== "closed" || before.admission.type !== "accepted") {
return denial(event, before, "gate-closed"); }
const receipt = event.type === "RecordBuildResult" ? event.buildReceiptId : event.observationReceiptId;
if (usedReceipt(history, receipt)) return replay(event, history, receipt);
if (event.type === "ReachBuildDeadline" && event.authoritativeTick < registration.buildDeadline) {
return denial(event, before, "deadline-not-reached"); } if (before.build !== null) {
if (event.type === "ReachBuildDeadline") return denial(event, before, "terminal-already-recorded");
const recordedTerminal = acceptedOf(history, "RecordBuildResult").at(0);
const conflict = terminalConflict(before.build.type, event.result.type) ||
(recordedTerminal !== undefined && !samePayload(recordedTerminal.result, event.result));
const effects: DeclaredEffect[] = [{ type: "late-receipt-retained", causalEventId: event.eventId, evidence: {
type: "build", buildAttemptId: event.buildAttemptId, buildReceiptId: event.buildReceiptId, result: event.result, },
}];
if (conflict) effects.push(...invalidClaimEffects(event, { type: "build-receipt", buildReceiptId: event.buildReceiptId }));
return accept(conflict ? withProjection(before, { claim: "invalid" }) : before, effects); }
const build: BuildTerminalProjection = event.type === "RecordBuildResult"
? { type: event.result.type, buildReceiptId: event.buildReceiptId }
: { type: event.result, observationReceiptId: event.observationReceiptId };
const effects: DeclaredEffect[] = [
{ type: "terminal-appended", causalEventId: event.eventId, terminal: { type: "build", projection: build } },
{ type: "execution-gate-set", causalEventId: event.eventId, buildAttemptId: event.buildAttemptId, value: "denied" },
]; return accept(withProjection(before, { build }), effects);
}; const consistencyInvalid = ( history: OracleHistory,
event: Extract<ProtocolEvent, { readonly type: "RecordBuildConsistencyReceipt" }>, ): TransitionResult => {
const before = currentProjection(history); const projection: BuildConsistencyTerminalProjection = { type: "invalid",
consistencyReceiptId: event.consistencyReceiptId, };
return accept(withProjection(before, { buildConsistency: projection, claim: "invalid" }), [
{ type: "terminal-appended", causalEventId: event.eventId, terminal: { type: "build-consistency", projection } },
{ type: "execution-gate-set", causalEventId: event.eventId, buildAttemptId: event.buildAttemptId, value: "denied" },
...invalidClaimEffects(event, { type: "consistency-receipt", consistencyReceiptId: event.consistencyReceiptId }), ]);
}; const handleConsistency = ( history: OracleHistory, event: Extract<ProtocolEvent, {
readonly type: "RecordBuildConsistencyReceipt" | "ReachBuildConsistencyDeadline"; }>, ): TransitionResult => {
const before = currentProjection(history); const registration = history.registration;
if (event.type === "RecordBuildConsistencyReceipt") {
if (!buildBindingMatches(registration, event)) return denial(event, before, "wrong-binding");
if (usedReceipt(history, event.consistencyReceiptId)) return replay(event, history, event.consistencyReceiptId);
if (before.buildConsistency !== null) {
const effects: DeclaredEffect[] = [{ type: "late-receipt-retained", causalEventId: event.eventId, evidence: {
type: "build-consistency", buildAttemptId: event.buildAttemptId, consistencyReceiptId: event.consistencyReceiptId,
result: event.result, }, }]; const terminalReceipt = acceptedOf(history, "RecordBuildConsistencyReceipt").at(0);
const conflict = terminalConflict(before.buildConsistency.type, event.result.type) || (terminalReceipt !== undefined &&
(!same(terminalReceipt.buildReceiptId, event.buildReceiptId) ||
!samePayload(terminalReceipt.result, event.result)));
if (conflict) {
effects.push(...invalidClaimEffects(event, { type: "consistency-receipt", consistencyReceiptId: event.consistencyReceiptId }));
return accept(withProjection(before, { claim: "invalid" }), effects); } return accept(before, effects); }
if (before.build === null) { return consistencyInvalid(history, event); }
const recordedBuild = acceptedOf(history, "RecordBuildResult").at(-1); const bindingMismatch =
recordedBuild !== undefined && !same(recordedBuild.buildReceiptId, event.buildReceiptId);
const matchMismatch = event.result.type === "match" && ( before.build.type !== "succeeded" ||
recordedBuild?.result.type !== "succeeded" || !same(recordedBuild.result.artifactDigest, event.result.artifactDigest)
); if (bindingMismatch || matchMismatch || event.result.type === "invalid") {
return consistencyInvalid(history, event); } const projection: BuildConsistencyTerminalProjection = {
type: event.result.type, consistencyReceiptId: event.consistencyReceiptId, };
const allowed = projection.type === "match" && before.build.type === "succeeded"; const effects: DeclaredEffect[] = [
{ type: "terminal-appended", causalEventId: event.eventId, terminal: { type: "build-consistency", projection } },
{ type: "execution-gate-set", causalEventId: event.eventId, buildAttemptId: event.buildAttemptId, value: allowed ? "allowed" : "denied" },
]; return accept(withProjection(before, { buildConsistency: projection }), effects); }
if (!buildBindingMatches(registration, event)) return denial(event, before, "wrong-binding");
if (before.build === null) return denial(event, before, "gate-closed");
if (before.buildConsistency !== null) return denial(event, before, "terminal-already-recorded");
if (event.authoritativeTick < registration.buildConsistencyDeadline) {
return denial(event, before, "deadline-not-reached"); }
if (usedReceipt(history, event.observationReceiptId)) return replay(event, history, event.observationReceiptId);
const projection: BuildConsistencyTerminalProjection = { type: event.result,
observationReceiptId: event.observationReceiptId, }; return accept(withProjection(before, {
buildConsistency: projection }), [
{ type: "terminal-appended", causalEventId: event.eventId, terminal: { type: "build-consistency", projection } },
{ type: "execution-gate-set", causalEventId: event.eventId, buildAttemptId: event.buildAttemptId, value: "denied" },
]); }; const handleAdmission = (
history: OracleHistory, event: Extract<ProtocolEvent, { readonly type: "RecordAdmission" }>, ): TransitionResult => {
const before = currentProjection(history); const registration = history.registration;
if (!rootMatches(registration, event) || !same(event.admissionId, registration.admissionId)) {
return denial(event, before, "wrong-binding"); }
if (before.sourceEvidence.type !== "closed") return denial(event, before, "source-terminal");
if (before.admission.type !== "pending") return denial(event, before, "terminal-already-recorded");
if (usedReceipt(history, event.receiptId)) return replay(event, history, event.receiptId);
const admission: Exclude<AdmissionProjection, { readonly type: "pending" }> = { type: event.result,
receiptId: event.receiptId, }; const effects: DeclaredEffect[] = [
{ type: "terminal-appended", causalEventId: event.eventId, terminal: { type: "admission", projection: admission } },
]; if (event.result === "failed") {
effects.push(...revocations(history, event.eventId, "source", false));
effects.push(nonPromotional(event, { type: "receipt", receiptId: event.receiptId })); }
return accept(withProjection(before, { admission,
claim: event.result === "failed" ? claimAfter(before.claim, "non-promotional") : before.claim, }), effects); };
const transitionTable: { readonly [Kind in Exclude<ProtocolEvent["type"], "RegisterProtocol">]: (
history: OracleHistory, event: Extract<ProtocolEvent, { readonly type: Kind }>, ) => TransitionResult; } = {
IssueAuthorization: handleAuthorization, ConsumeAuthorization: handleAuthorization,
RevokeAuthorization: handleAuthorization, ExpireAuthorization: handleAuthorization, CloseSource: appendSourceTerminal,
AbandonSource: appendSourceTerminal, AdvanceFence: handleFence, ReleaseProcess: handleRelease,
RecordReleaseDenied: handleRelease, ObserveCrash: handleRelease, ReachLaunchDeadline: handleRelease,
RestartObserved: handleRuntime, ReconcileRuntime: handleRuntime, RequestRetirement: handleRuntime,
RequestCleanup: handleRuntime, CompleteRetirement: handleRuntime, RecordAttemptReceipt: handleAttempt,
ReachAttemptDeadline: handleAttempt, CheckpointEffective: handleStop, RecordStopReceipt: handleStop,
ReachStopDeadline: handleStop, RecoverStopFence: handleStop, RecordBuildResult: handleBuild,
ReachBuildDeadline: handleBuild, RecordBuildConsistencyReceipt: handleConsistency,
ReachBuildConsistencyDeadline: handleConsistency, RecordAdmission: handleAdmission, };
export const initializeOracleHistory = (registration: RegisterProtocol): OracleHistory => { const projection = initialProjection();
const result = registration.authenticatedPredecessorId === null ? accept(projection)
: denial(registration, projection, "wrong-binding");
return { registration, rows: [{ event: registration, result, accepted: result.decision === "accepted" }] }; };
export const appendOracleEvent = (history: OracleHistory, event: ProtocolEvent): OracleStep => {
const sameId = history.rows.filter(row => same(row.event.eventId, event.eventId));
const exact = sameId.find(row => samePayload(row.event, event));
if (exact !== undefined) return { history, result: exact.result };
let result: TransitionResult; if (sameId.length > 0) {
result = denial(event, currentProjection(history), "wrong-binding");
} else
if (event.type === "RegisterProtocol") { result = denial(event, currentProjection(history), "not-registered");
} else { const envelopeFailure = commonEnvelopeFailure(history, event); if (envelopeFailure !== null) {
result = denial(event, currentProjection(history), envelopeFailure); } else {
const handler = transitionTable[event.type] as ( selected: OracleHistory, selectedEvent: typeof event,
) => TransitionResult; result = handler(history, event); } }
const row: LedgerRow = { event, result, accepted: result.decision === "accepted" };
return { history: { registration: history.registration, rows: [...history.rows, row] }, result }; };
export const foldOracleHistory = (events: readonly ProtocolEvent[]): OracleFold => { const [first, ...rest] = events;
if (first?.type !== "RegisterProtocol") { throw new TypeError("Oracle history must begin with RegisterProtocol."); }
let history = initializeOracleHistory(first); const results: TransitionResult[] = [history.rows[0]!.result];
for (const event of rest) { const step = appendOracleEvent(history, event); history = step.history;
results.push(step.result); } return { history, results }; };
export const getOracleTerminalProjections = (history: OracleHistory): TerminalProjections =>
currentProjection(history);
