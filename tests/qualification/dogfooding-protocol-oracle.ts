import type { AdmissionProjection, AuthorizationFenceBinding, AuthorizationId, BuildConsistencyTerminalProjection,
BuildReceiptId, BuildTerminalProjection, ClaimProjection, DeclaredEffect, DenialReason, DenialSubject, EventId,
EvidenceReference, FenceGeneration, ProtocolEvent, RegisterProtocol, ResourceRetirementProjection, RuntimeProjection,
SourceEvidenceProjection, TerminalProjections, TransitionResult, TrustedProtocolCoordinates, } from "./dogfooding-protocol-contract.ts";
interface LedgerRow { readonly event: ProtocolEvent; readonly result: TransitionResult; readonly accepted: boolean; }
export interface OracleHistory {
readonly trusted: TrustedProtocolCoordinates; readonly registration: RegisterProtocol;
readonly registrationAccepted: boolean; readonly rows: readonly LedgerRow[];
}
export interface OracleStep { readonly history: OracleHistory; readonly result: TransitionResult; }
export interface OracleFold { readonly history: OracleHistory; readonly results: readonly TransitionResult[]; }
type FenceName = "source" | "campaign" | "family-allocation"; interface FenceView {
readonly generation: FenceGeneration; readonly open: boolean; } interface AuthorizationView {
readonly issue: Extract<ProtocolEvent, { readonly type: "IssueAuthorization" }>; readonly consumed: boolean;
readonly revoked: boolean; readonly expired: boolean; readonly released: boolean; readonly launchTerminal: boolean; }
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
const registrationMatches = (registered: RegisterProtocol, candidate: RegisterProtocol): boolean =>
same(registered.protocolRevisionId, candidate.protocolRevisionId) &&
same(registered.custodyAuthorityId, candidate.custodyAuthorityId) &&
same(registered.sourceClaimFamilyId, candidate.sourceClaimFamilyId) &&
same(registered.sourceFamilyRootId, candidate.sourceFamilyRootId) &&
same(registered.sourceSlotId, candidate.sourceSlotId) && same(registered.attemptId, candidate.attemptId) &&
same(registered.runtimeId, candidate.runtimeId) && same(registered.checkpointId, candidate.checkpointId) &&
same(registered.buildAttemptId, candidate.buildAttemptId) &&
same(registered.retirementOwnerId, candidate.retirementOwnerId) &&
same(registered.credentialLineageId, candidate.credentialLineageId) &&
same(registered.admissionId, candidate.admissionId) &&
same(registered.sourceFenceGeneration, candidate.sourceFenceGeneration) &&
same(registered.campaignFenceGeneration, candidate.campaignFenceGeneration) &&
same(registered.familyAllocationFenceGeneration, candidate.familyAllocationFenceGeneration) &&
same(registered.launchDeadline, candidate.launchDeadline) &&
same(registered.attemptDeadline, candidate.attemptDeadline) &&
same(registered.stopDeadline, candidate.stopDeadline) && same(registered.buildDeadline, candidate.buildDeadline) &&
same(registered.buildConsistencyDeadline, candidate.buildConsistencyDeadline);
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
released: later.some(event => event.type === "ReleaseProcess" && same(event.authorizationId, id) &&
event.authoritativeTick < history.registration.launchDeadline),
    launchTerminal: later.some(event => (event.type === "ReachLaunchDeadline" ||
    event.type === "ReleaseProcess" || event.type === "RecordReleaseDenied") &&
    same(event.authorizationId, id) && (event.type === "ReachLaunchDeadline" ||
    event.authoritativeTick < history.registration.launchDeadline)), }; };
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
const purposeMatchesFence = (purpose: string, binding: AuthorizationFenceBinding): boolean =>
purpose === "source-authoring" ? binding.scope === "source" : binding.scope === "campaign";
const purposeGate = (before: TerminalProjections, purpose: string): DenialReason | null => {
if (before.claim === "invalid") return purpose === "source-authoring" ? "gate-closed" : "build-not-executable";
if (purpose === "source-authoring") return before.sourceEvidence.type === "open" ? null : "source-terminal";
if (before.sourceEvidence.type !== "closed" || before.admission.type !== "accepted") return "gate-closed";
if (purpose === "build") return before.build === null ? null : "terminal-already-recorded";
return before.build?.type === "succeeded" && before.buildConsistency?.type === "match" &&
before.claim === "eligible" ? null : "build-not-executable"; };
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
}; const releaseRuntimeUnresolved = (history: OracleHistory): boolean => {
const runtime = currentProjection(history).runtime; return runtime === "unknown" || runtime === "live"; };
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
includeConsumed: boolean, onlyId?: AuthorizationId, includeReleased = false, ): readonly DeclaredEffect[] =>
acceptedOf(history, "IssueAuthorization").filter(issue => {
const view = authorization(history, issue.authorizationId); return issue.authorizationFence.scope === scope &&
(onlyId === undefined || same(issue.authorizationId, onlyId)) && view !== null && !view.revoked && !view.expired &&
(includeReleased || !view.released) && (!view.consumed || includeConsumed); })
.map(issue => ({ type: "authorization-revoked" as const, causalEventId, authorizationId: issue.authorizationId,
authorizationFence: issue.authorizationFence, })); const invalidClaimEffects = ( event: ProtocolEvent,
evidence: DeclaredEffect extends infer _Unused ? | { readonly type: "event"; readonly eventId: EventId }
| { readonly type: "receipt"; readonly receiptId: Extract<ProtocolEvent, { readonly type: "RecordAttemptReceipt" }>["receiptId"] }
| { readonly type: "build-receipt"; readonly buildReceiptId: BuildReceiptId }
| { readonly type: "consistency-receipt"; readonly consistencyReceiptId: Extract<ProtocolEvent, { readonly type: "RecordBuildConsistencyReceipt" }>["consistencyReceiptId"] }
: never, ): readonly DeclaredEffect[] => [
{ type: "claim-disposition-set", causalEventId: event.eventId, value: "invalid", evidence }, ];
const nonPromotional = ( event: ProtocolEvent, evidence: EvidenceReference,
): DeclaredEffect => ({ type: "claim-disposition-set", causalEventId: event.eventId, value: "non-promotional",
evidence, }); const contain = (e: Pick<Extract<ProtocolEvent, {
readonly type: "ReleaseProcess" | "RecordReleaseDenied" | "ReachLaunchDeadline";
}>, "eventId" | "sourceFamilyRootId" | "runtimeId">): readonly DeclaredEffect[] => [
{ type: "resource-quarantined", causalEventId: e.eventId, sourceFamilyRootId: e.sourceFamilyRootId, runtimeId: e.runtimeId },
{ type: "runtime-reconciliation-requested", causalEventId: e.eventId, runtimeId: e.runtimeId }, { type: "runtime-termination-requested", causalEventId: e.eventId, runtimeId: e.runtimeId }];
const oppositeLaunchObserved = (
history: OracleHistory,
authorizationId: AuthorizationId,
result: "started" | "release-denied",
): boolean => acceptedEvents(history).some(candidate =>
(candidate.type === "ReleaseProcess" || candidate.type === "RecordReleaseDenied") &&
same(candidate.authorizationId, authorizationId) &&
(candidate.type === "ReleaseProcess" ? "started" : "release-denied") !== result);
const retainUnauthorizedLateStart = (
history: OracleHistory,
event: Extract<ProtocolEvent, { readonly type: "ReleaseProcess" }>,
reason: "authorization-unavailable" | "authorization-revoked" | "authorization-expired",
): TransitionResult => {
const before = currentProjection(history);
return accept(withProjection(before, {
claim: "invalid", runtime: "unknown", resourceRetirement: { type: "quarantined" },
}), [
{ type: "late-receipt-retained", causalEventId: event.eventId, evidence: {
type: "launch", authorizationId: event.authorizationId,
receiptId: event.launchReceiptId, result: "started",
} },
{ type: "denial-recorded", causalEventId: event.eventId, reason, subject: denialSubject(event) },
...invalidClaimEffects(event, { type: "receipt", receiptId: event.launchReceiptId }),
...contain(event),
]);
};
const retainPostRetirementStart = (
history: OracleHistory,
event: Extract<ProtocolEvent, { readonly type: "ReleaseProcess" }>,
): TransitionResult => accept(withProjection(currentProjection(history), {
claim: "invalid", runtime: "unknown", resourceRetirement: { type: "quarantined" },
}), [
{ type: "late-receipt-retained", causalEventId: event.eventId, evidence: {
type: "launch", authorizationId: event.authorizationId,
receiptId: event.launchReceiptId, result: "started",
} },
{ type: "denial-recorded", causalEventId: event.eventId, reason: "gate-closed",
subject: denialSubject(event) },
...invalidClaimEffects(event, { type: "receipt", receiptId: event.launchReceiptId }),
...contain(event),
]);
const commonEnvelopeFailure = (history: OracleHistory, event: ProtocolEvent): DenialReason | null => {
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
const hasEvidence = (items: readonly EvidenceReference[], expected: EvidenceReference): boolean =>
items.some(item => samePayload(item, expected));
const eventEvidence = (event: ProtocolEvent): readonly EvidenceReference[] => { const result: EvidenceReference[] = [
{ type: "event", eventId: event.eventId }]; switch (event.type) {
case "RecordReleaseDenied": case "ReconcileRuntime":
result.push({ type: "proof", proofId: event.proofId }); break;
case "AbandonSource": result.push({ type: "proof", proofId: event.proofId }); break;
case "RequestCleanup": result.push({ type: "proof", proofId: event.terminationProofId }); break;
case "CompleteRetirement": result.push({ type: "proof", proofId: event.cleanupProofId }); break;
case "RecordBuildResult": if (event.result.type !== "succeeded")
result.push({ type: "proof", proofId: event.result.proofId }); break;
case "RecordBuildConsistencyReceipt": if (event.result.type !== "match")
result.push({ type: "proof", proofId: event.result.proofId }); break;
default: break; }
switch (event.type) {
case "CloseSource": case "AbandonSource": case "RecordReleaseDenied": case "RecordAttemptReceipt":
case "RecordStopReceipt": case "RecordAdmission": result.push({ type: "receipt", receiptId: event.receiptId }); break;
case "ReleaseProcess": result.push({ type: "receipt", receiptId: event.launchReceiptId }); break;
case "ReachLaunchDeadline": case "ReachAttemptDeadline": case "ReachStopDeadline": case "ReachBuildDeadline":
case "ReachBuildConsistencyDeadline": result.push({ type: "receipt", receiptId: event.observationReceiptId }); break;
case "RecordBuildResult": result.push({ type: "build-receipt", buildReceiptId: event.buildReceiptId }); break;
case "RecordBuildConsistencyReceipt": result.push({ type: "consistency-receipt",
consistencyReceiptId: event.consistencyReceiptId }); break;
default: break; } return result; };
const expectedRetainedEvidence = (
history: OracleHistory,
cleanupProofId: Extract<ProtocolEvent, { readonly type: "CompleteRetirement" }>["cleanupProofId"],
): readonly EvidenceReference[] => {
const retainedRows = history.rows.filter(row => row.accepted || row.result.effects.some(effect =>
effect.type === "denial-recorded" && effect.reason === "receipt-replay"));
return [{ type: "proof", proofId: cleanupProofId },
...retainedRows.flatMap(row => eventEvidence(row.event))];
};
const retirementEvidenceClosed = (history: OracleHistory): boolean => {
const projection = currentProjection(history);
for (const issue of acceptedOf(history, "IssueAuthorization")) {
const view = authorization(history, issue.authorizationId);
if (view !== null && !view.revoked && !view.expired) return false;
if (view?.consumed === true && !view.launchTerminal) return false;
if (view?.released === true && issue.launchPurpose === "build" &&
(projection.build === null || projection.buildConsistency === null)) return false;
if (view?.released === true && issue.launchPurpose === "evaluation" && projection.attempt === null) return false;
}
for (const start of acceptedOf(history, "ReleaseProcess")) {
if (start.launchPurpose === "build" && (projection.build === null || projection.buildConsistency === null)) return false;
if (start.launchPurpose === "evaluation" && projection.attempt === null) return false;
}
return acceptedOf(history, "CheckpointEffective").length === 0 || projection.stopCheckpoint !== null;
};
const appendSourceTerminal = ( history: OracleHistory,
event: Extract<ProtocolEvent, { readonly type: "CloseSource" | "AbandonSource" }>, ): TransitionResult => {
const before = currentProjection(history);
if (!rootMatches(history.registration, event)) return denial(event, before, "wrong-binding");
if (before.sourceEvidence.type !== "open") return denial(event, before, "terminal-already-recorded");
const sourceFence = fence(history, "source"); const expiredSource = event.type === "AbandonSource" && !sourceFence.open &&
acceptedOf(history, "ExpireAuthorization").some(expiry => authorization(history, expiry.authorizationId)?.issue.authorizationFence.scope === "source") ||
event.type === "AbandonSource" && !sourceFence.open && acceptedOf(history, "AdvanceFence").some(advance =>
advance.fence === "source" && advance.cause === "expiry");
if (!sourceFence.open && !expiredSource) return denial(event, before, "gate-closed");
if (event.type === "CloseSource" && !acceptedOf(history, "IssueAuthorization").some(issue => {
const view = authorization(history, issue.authorizationId); return issue.launchPurpose === "source-authoring" &&
view?.consumed === true && view.released; })) return denial(event, before, "gate-closed");
if (!same(event.expectedGeneration, sourceFence.generation) || event.nextGeneration <= event.expectedGeneration) {
return denial(event, before, "stale-generation"); }
if (usedReceipt(history, event.receiptId)) return replay(event, history);
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
const replay = (event: ProtocolEvent, history: OracleHistory): TransitionResult => {
const before = currentProjection(history);
const typed = event.type === "RecordBuildResult" || event.type === "RecordBuildConsistencyReceipt";
let evidence: Parameters<typeof invalidClaimEffects>[1] = { type: "event", eventId: event.eventId };
if (event.type === "RecordBuildResult") evidence = { type: "build-receipt", buildReceiptId: event.buildReceiptId };
else if (event.type === "RecordBuildConsistencyReceipt") {
evidence = { type: "consistency-receipt", consistencyReceiptId: event.consistencyReceiptId };
}
const effects: DeclaredEffect[] = [
{ type: "denial-recorded", causalEventId: event.eventId, reason: "receipt-replay", subject: denialSubject(event) },
...invalidClaimEffects(event, evidence), ];
const unsafeStart = event.type === "ReleaseProcess";
const uncertainStart = event.type === "ReachLaunchDeadline" && event.result === "start-unknown";
if (unsafeStart) effects.push({ type: "late-receipt-retained", causalEventId: event.eventId,
evidence: { type: "launch", authorizationId: event.authorizationId,
receiptId: event.launchReceiptId, result: "started" } });
if (unsafeStart || uncertainStart) effects.push(...contain(event));
if (typed) effects.push({ type: "execution-gate-set", causalEventId: event.eventId,
buildAttemptId: event.buildAttemptId, value: "denied" });
return { decision: "rejected", effects,
terminalProjections: withProjection(before, { claim: "invalid",
...(unsafeStart || uncertainStart ? { runtime: "unknown" as const,
resourceRetirement: { type: "quarantined" as const } } : {}) }) }; };
const retirementDenials: ReadonlySet<DenialReason> = new Set([
"wrong-binding", "retirement-owner-mismatch", "credential-lineage-mismatch",
"runtime-unresolved", "receipt-replay", "terminal-already-recorded",
]);
const denialSurvivesRetirement = (reason: DenialReason | undefined): boolean =>
reason !== undefined && retirementDenials.has(reason);
const postRetirementRuntime = (history: OracleHistory): Exclude<RuntimeProjection, "not-started"> | null => {
const retiredAt = history.rows.findIndex(row => row.accepted && row.event.type === "CompleteRetirement");
if (retiredAt < 0) return null;
let runtime: Exclude<RuntimeProjection, "not-started"> | null = null;
for (const row of history.rows.slice(retiredAt + 1)) {
if (row.accepted && row.event.type === "ReconcileRuntime" && runtime !== null) {
runtime = row.event.observation;
continue;
}
const safetyEvidence = row.result.effects.some(effect => effect.type === "resource-quarantined" ||
effect.type === "runtime-reconciliation-requested" || effect.type === "runtime-termination-requested");
if (safetyEvidence) runtime = "unknown";
}
return runtime;
};
interface RuntimeSafetyWatermark { readonly eventId: EventId;
readonly authoritativeTick: ProtocolEvent["authoritativeTick"]; }
const runtimeSafetyWatermark = (history: OracleHistory,
runtimeId: Extract<ProtocolEvent, { readonly type: "ReconcileRuntime" }>["runtimeId"]):
RuntimeSafetyWatermark | null => {
let watermark: RuntimeSafetyWatermark | null = null;
for (const row of history.rows) {
const candidate = row.event;
const safetyEvidence = row.result.effects.some(effect =>
(effect.type === "process-release-requested" ||
effect.type === "runtime-reconciliation-requested" ||
effect.type === "runtime-termination-requested") && same(effect.runtimeId, runtimeId));
if (safetyEvidence && (watermark === null || candidate.authoritativeTick >= watermark.authoritativeTick))
watermark = { eventId: candidate.eventId, authoritativeTick: candidate.authoritativeTick };
}
return watermark;
};
const postRetirementReconciliation = (
history: OracleHistory,
event: Extract<ProtocolEvent, { readonly type: "ReconcileRuntime" }>,
): TransitionResult => {
const before = currentProjection(history);
const effects: DeclaredEffect[] = event.observation === "unknown" ? [
{ type: "resource-quarantined", causalEventId: event.eventId,
sourceFamilyRootId: event.sourceFamilyRootId, runtimeId: event.runtimeId },
{ type: "runtime-reconciliation-requested", causalEventId: event.eventId, runtimeId: event.runtimeId },
] : event.observation === "live" ? [
{ type: "runtime-termination-requested", causalEventId: event.eventId, runtimeId: event.runtimeId },
] : [];
return accept(before, effects);
};
const enforceRetiredHistoryFinality = (
history: OracleHistory,
event: ProtocolEvent,
result: TransitionResult,
): TransitionResult => {
const before = currentProjection(history);
if (before.resourceRetirement.type !== "retired") return result;
const fx = result.effects;
if (result.decision === "rejected") {
const reason = fx.find(effect => effect.type === "denial-recorded")?.reason;
if (event.type === "ReconcileRuntime" && postRetirementRuntime(history) !== null &&
reason === "runtime-unresolved") return postRetirementReconciliation(history, event);
if (reason === "receipt-replay") return { ...result, terminalProjections: before };
return denialSurvivesRetirement(reason) ? result :
denial(event, before, "terminal-already-recorded");
}
const runtimeSafety = fx.some(effect => effect.type === "resource-quarantined" ||
effect.type === "runtime-reconciliation-requested" || effect.type === "runtime-termination-requested");
if (runtimeSafety || event.type === "ReconcileRuntime" && postRetirementRuntime(history) !== null)
return accept(before, fx);
const retained = fx.filter(effect => effect.type === "late-receipt-retained" ||
effect.type === "claim-disposition-set" && effect.value === "invalid" ||
effect.type === "execution-gate-set" && effect.value === "denied");
return retained.some(effect => effect.type === "late-receipt-retained") ? accept(before, retained) :
denial(event, before, "terminal-already-recorded");
};
const terminalConflict = ( currentType: string, nextType: string,
): boolean => currentType !== nextType; const handleAuthorization = ( history: OracleHistory,
event: Extract<ProtocolEvent, {
readonly type: "IssueAuthorization" | "ConsumeAuthorization" | "RevokeAuthorization" | "ExpireAuthorization"; }>,
): TransitionResult => { const before = currentProjection(history); const registration = history.registration;
if (event.type === "IssueAuthorization") { const mismatch = authorizationBindingMatches(registration, event);
if (mismatch !== null) return denial(event, before, mismatch);
if (!purposeMatchesFence(event.launchPurpose, event.authorizationFence)) return denial(event, before, "wrong-binding");
const purposeFailure = purposeGate(before, event.launchPurpose);
if (purposeFailure !== null) return denial(event, before, purposeFailure);
if (event.authoritativeTick >= event.expiresAt) return denial(event, before, "authorization-expired");
if (before.admission.type === "failed" || before.resourceRetirement.type !== "active") {
return denial(event, before, "gate-closed"); }
const fenceFailure = bindingIsCurrent(history, event.authorizationFence);
if (fenceFailure !== null) return denial(event, before, fenceFailure);
if (event.launchPurpose === "evaluation" && stopBarrier(history)) {
return denial(event, before, "gate-closed"); }
if (authorization(history, event.authorizationId) !== null || acceptedOf(history, "IssueAuthorization").some(issue =>
same(issue.sourceSlotId, event.sourceSlotId) && same(issue.runtimeId, event.runtimeId) &&
issue.launchPurpose === event.launchPurpose)) {
return denial(event, before, "authorization-unavailable"); }
return accept(before, [{ type: "authorization-issued", causalEventId: event.eventId,
authorizationId: event.authorizationId, sourceFamilyRootId: event.sourceFamilyRootId,
authorizationFence: event.authorizationFence, }]); }
if (!rootMatches(registration, event)) return denial(event, before, "wrong-binding");
const view = authorization(history, event.authorizationId);
if (view !== null && !sameFenceBinding(view.issue.authorizationFence, event.authorizationFence)) {
return denial(event, before, "wrong-binding"); } if (event.type === "ConsumeAuthorization") {
const mismatch = authorizationBindingMatches(registration, event); if (mismatch !== null) return denial(event, before, mismatch);
if (!purposeMatchesFence(event.launchPurpose, event.authorizationFence)) return denial(event, before, "wrong-binding");
const purposeFailure = purposeGate(before, event.launchPurpose);
if (purposeFailure !== null) return denial(event, before, purposeFailure);
if (view === null) return denial(event, before, "authorization-unavailable");
if (view.issue.launchPurpose !== event.launchPurpose) return denial(event, before, "wrong-binding");
if (view.launchTerminal) return denial(event, before, "terminal-already-recorded");
if (view.expired || event.authoritativeTick >= view.issue.expiresAt) {
return denial(event, before, "authorization-expired"); }
if (view.revoked) return denial(event, before, "authorization-revoked");
const fenceFailure = bindingIsCurrent(history, event.authorizationFence);
if (fenceFailure !== null) return denial(event, before, fenceFailure);
if (event.launchPurpose === "evaluation" && stopBarrier(history)) {
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
if (event.cause === "analytic-stop" && event.fence !== "campaign") return denial(event, before, "wrong-binding");
const view = fence(history, event.fence); if (!view.open) return denial(event, before, "gate-closed");
if (!same(view.generation, event.expectedGeneration) || event.nextGeneration <= event.expectedGeneration) {
return denial(event, before, "stale-generation"); } const effects: DeclaredEffect[] = [
{ type: "gate-closed", causalEventId: event.eventId, fence: event.fence, generation: event.nextGeneration },
...revocations(history, event.eventId, event.fence === "campaign" ? "campaign" : "source",
event.fence === "campaign"), ];
return accept(before, effects); };
const handleRelease = ( history: OracleHistory, event: Extract<ProtocolEvent, {
readonly type: "ReleaseProcess" | "RecordReleaseDenied" | "ObserveCrash" | "ReachLaunchDeadline"; }>,
): TransitionResult => { const before = currentProjection(history); const registration = history.registration;
if (event.type === "ObserveCrash") {
if (!rootMatches(registration, event) || !same(event.runtimeId, registration.runtimeId)) {
return denial(event, before, "wrong-binding"); } const view = authorization(history, event.authorizationId);
if (before.resourceRetirement.type === "retired") {
if (view === null || !view.consumed) return denial(event, before, "authorization-unavailable");
if (!same(view.issue.authorizationFence.expectedGeneration, event.expectedGeneration))
return denial(event, before, "stale-generation");
return accept(before, [
{ type: "resource-quarantined", causalEventId: event.eventId,
sourceFamilyRootId: event.sourceFamilyRootId, runtimeId: event.runtimeId },
{ type: "runtime-reconciliation-requested", causalEventId: event.eventId, runtimeId: event.runtimeId },
{ type: "runtime-termination-requested", causalEventId: event.eventId, runtimeId: event.runtimeId }, ]); }
if (before.runtime !== "not-started" && before.runtime !== "terminated") return denial(event, before, "runtime-unresolved");
if (view === null || !view.consumed || view.launchTerminal) return denial(event, before, "authorization-unavailable");
if (!same(view.issue.authorizationFence.expectedGeneration, event.expectedGeneration)) {
return denial(event, before, "stale-generation"); } return accept(
withProjection(before, { runtime: "unknown", resourceRetirement: { type: "quarantined" } }), [
{ type: "resource-quarantined", causalEventId: event.eventId, sourceFamilyRootId: event.sourceFamilyRootId, runtimeId: event.runtimeId },
{ type: "runtime-reconciliation-requested", causalEventId: event.eventId, runtimeId: event.runtimeId },
{ type: "runtime-termination-requested", causalEventId: event.eventId, runtimeId: event.runtimeId }, ], ); }
const mismatch = authorizationBindingMatches(registration, event); if (mismatch !== null) return denial(event, before, mismatch);
const view = authorization(history, event.authorizationId);
if (view !== null && (!sameFenceBinding(view.issue.authorizationFence, event.authorizationFence) ||
view.issue.launchPurpose !== event.launchPurpose)) {
return denial(event, before, "wrong-binding"); } if (event.type === "ReachLaunchDeadline") {
if (view === null) return denial(event, before, "authorization-unavailable");
if (before.resourceRetirement.type === "retired") return denial(event, before, "terminal-already-recorded");
if (view.launchTerminal) return denial(event, before, "terminal-already-recorded");
if (event.authoritativeTick < registration.launchDeadline) return denial(event, before, "deadline-not-reached");
if (usedReceipt(history, event.observationReceiptId)) return replay(event, history);
if (event.result === "start-unknown" && !view.consumed) return denial(event, before, "wrong-binding");
if (event.result === "never-started" && (view.consumed ||
before.runtime !== "not-started" && before.runtime !== "terminated")) {
return denial(event, before, "wrong-binding"); }
const launch = { type: event.result, receiptId: event.observationReceiptId } as const; return accept(
withProjection(before, { ...(event.launchPurpose === "evaluation" ? { launch } : {}),
runtime: event.result === "start-unknown" ? "unknown" : before.runtime,
resourceRetirement: event.result === "start-unknown" ? { type: "quarantined" } : before.resourceRetirement,
claim: claimAfter(before.claim, "non-promotional"), }), [
{ type: "terminal-appended", causalEventId: event.eventId, terminal: { type: "launch", projection: launch } },
nonPromotional(event, { type: "receipt", receiptId: event.observationReceiptId }),
...(event.result === "start-unknown" ? [
{ type: "resource-quarantined" as const, causalEventId: event.eventId,
sourceFamilyRootId: event.sourceFamilyRootId, runtimeId: event.runtimeId },
{ type: "runtime-reconciliation-requested" as const, causalEventId: event.eventId, runtimeId: event.runtimeId },
{ type: "runtime-termination-requested" as const, causalEventId: event.eventId, runtimeId: event.runtimeId }] : []), ], ); }
if (event.type === "ReleaseProcess" && !same(event.attemptId, registration.attemptId)) return denial(event, before, "wrong-binding");
if (event.type === "ReleaseProcess" && before.resourceRetirement.type === "retired") {
if (!purposeMatchesFence(event.launchPurpose, event.authorizationFence)) return denial(event, before, "wrong-binding");
if (usedReceipt(history, event.launchReceiptId)) return replay(event, history);
return retainPostRetirementStart(history, event); }
if (view?.launchTerminal === true) {
if (!view.consumed) return denial(event, before, "authorization-unavailable");
const receiptId = event.type === "ReleaseProcess" ? event.launchReceiptId : event.receiptId;
if (usedReceipt(history, receiptId)) return replay(event, history);
const result = event.type === "ReleaseProcess" ? "started" as const : "release-denied" as const;
const conflict = oppositeLaunchObserved(history, event.authorizationId, result) ||
event.type === "ReleaseProcess" && acceptedOf(history, "ReachLaunchDeadline").some(candidate =>
same(candidate.authorizationId, event.authorizationId) && candidate.result === "never-started");
const effects: DeclaredEffect[] = [{ type: "late-receipt-retained", causalEventId: event.eventId,
evidence: { type: "launch", authorizationId: event.authorizationId, receiptId, result } }];
if (conflict) effects.push(...invalidClaimEffects(event, { type: "receipt", receiptId }), ...contain(event));
return accept(conflict ? withProjection(before, { claim: "invalid", runtime: "unknown",
resourceRetirement: { type: "quarantined" } }) : before, effects); }
if (event.type === "ReleaseProcess" && event.authoritativeTick >= registration.launchDeadline) {
if (!purposeMatchesFence(event.launchPurpose, event.authorizationFence)) return denial(event, before, "wrong-binding");
if (view === null || !view.consumed) return retainUnauthorizedLateStart(history, event, "authorization-unavailable");
if (view.expired || event.authoritativeTick >= view.issue.expiresAt)
return retainUnauthorizedLateStart(history, event, "authorization-expired");
if (view.revoked) return retainUnauthorizedLateStart(history, event, "authorization-revoked");
}
if (event.type === "ReleaseProcess" && view?.consumed === true && event.authoritativeTick >= registration.launchDeadline) {
if (usedReceipt(history, event.launchReceiptId)) return replay(event, history);
const conflict = oppositeLaunchObserved(history, event.authorizationId, "started"); const effects: DeclaredEffect[] = [
{ type: "late-receipt-retained", causalEventId: event.eventId, evidence: { type: "launch", authorizationId: event.authorizationId,
receiptId: event.launchReceiptId, result: "started" } }, nonPromotional(event, { type: "receipt", receiptId: event.launchReceiptId }), ...contain(event)];
if (conflict) effects.push(...invalidClaimEffects(event, { type: "receipt", receiptId: event.launchReceiptId }));
return accept(withProjection(before, { claim: conflict ? "invalid" : claimAfter(before.claim, "non-promotional"), runtime: "unknown",
resourceRetirement: { type: "quarantined" } }), effects); }
if (event.type === "ReleaseProcess" && before.resourceRetirement.type !== "active") return denial(event, before, "gate-closed");
if (event.type === "ReleaseProcess" && releaseRuntimeUnresolved(history)) return denial(event, before, "runtime-unresolved");
if (event.type === "RecordReleaseDenied" && before.resourceRetirement.type === "retired") return denial(event, before, "terminal-already-recorded");
if (event.type === "RecordReleaseDenied") {
if (view === null || !view.consumed) return denial(event, before, "authorization-unavailable");
if (usedReceipt(history, event.receiptId)) return replay(event, history);
if (event.authoritativeTick >= registration.launchDeadline) {
const conflict = oppositeLaunchObserved(history, event.authorizationId, "release-denied"); const effects: DeclaredEffect[] = [
{ type: "late-receipt-retained", causalEventId: event.eventId, evidence: { type: "launch",
authorizationId: event.authorizationId, receiptId: event.receiptId, result: "release-denied" } },
nonPromotional(event, { type: "receipt", receiptId: event.receiptId })];
if (conflict) effects.push(...invalidClaimEffects(event, { type: "receipt", receiptId: event.receiptId }));
return accept(withProjection(before, { claim: conflict ? "invalid" : claimAfter(before.claim, "non-promotional") }), effects); }
const launch = { type: "release-denied" as const, receiptId: event.receiptId };
return accept(event.launchPurpose === "evaluation" ? withProjection(before, { launch }) : before, [
{ type: "terminal-appended", causalEventId: event.eventId, terminal: { type: "launch", projection: launch } }, ]); }
if (usedReceipt(history, event.launchReceiptId)) return replay(event, history);
if (event.authorizationFence.scope === "source" && before.sourceEvidence.type !== "open") return denial(event, before, "source-terminal");
if (view !== null && (view.expired || event.authoritativeTick >= view.issue.expiresAt)) return denial(event, before, "authorization-expired");
if (view?.revoked === true) return denial(event, before, "authorization-revoked");
const fenceFailure = bindingIsCurrent(history, event.authorizationFence);
if (fenceFailure !== null) return denial(event, before, fenceFailure);
const purposeFailure = purposeGate(before, event.launchPurpose);
if (purposeFailure !== null) return denial(event, before, purposeFailure);
if (event.launchPurpose === "evaluation" && stopBarrier(history)) return denial(event, before, "gate-closed");
if (event.launchPurpose === "evaluation" && (before.build?.type !== "succeeded" ||
before.buildConsistency?.type !== "match" || before.claim !== "eligible")) {
return denial(event, before, "build-not-executable"); }
if (view === null || !view.consumed) return denial(event, before, "authorization-unavailable");
const launch = { type: "started" as const, receiptId: event.launchReceiptId }; return accept(
withProjection(before, { ...(event.launchPurpose === "evaluation" ? { launch } : {}), runtime: "live" }),
[ { type: "process-release-requested",
causalEventId: event.eventId, authorizationId: event.authorizationId, runtimeId: event.runtimeId,
authorizationFence: event.authorizationFence, }, ], );
}; const handleRuntime = ( history: OracleHistory, event: Extract<ProtocolEvent, {
readonly type: "RestartObserved" | "ReconcileRuntime" | "RequestRetirement" | "RequestCleanup" | "CompleteRetirement";
}>, ): TransitionResult => { const before = currentProjection(history); const registration = history.registration;
if (!rootMatches(registration, event)) return denial(event, before, "wrong-binding");
if (event.type === "RestartObserved" || event.type === "ReconcileRuntime") {
if (!same(event.runtimeId, registration.runtimeId)) return denial(event, before, "wrong-binding");
if (event.type === "ReconcileRuntime") {
const watermark = runtimeSafetyWatermark(history, event.runtimeId);
const proofReused = acceptedOf(history, "ReconcileRuntime").some(candidate =>
same(candidate.proofId, event.proofId));
if (watermark === null || !same(watermark.eventId, event.runtimeSafetyWatermarkEventId) ||
event.authoritativeTick < watermark.authoritativeTick || proofReused)
return denial(event, before, "wrong-binding");
}
if (event.type === "RestartObserved") {
const hasProspectiveRuntime = acceptedOf(history, "ConsumeAuthorization").length > 0 || before.runtime !== "not-started";
if (!hasProspectiveRuntime) return denial(event, before, "runtime-unresolved"); return accept(
withProjection(before, { runtime: "unknown", resourceRetirement: { type: "quarantined" } }), [
{ type: "resource-quarantined", causalEventId: event.eventId, sourceFamilyRootId: event.sourceFamilyRootId, runtimeId: event.runtimeId },
{ type: "runtime-reconciliation-requested", causalEventId: event.eventId, runtimeId: event.runtimeId },
{ type: "runtime-termination-requested", causalEventId: event.eventId, runtimeId: event.runtimeId }, ], ); }
if (before.resourceRetirement.type === "retired" || before.runtime === "not-started") {
return denial(event, before, "runtime-unresolved"); }
if (event.observation === "unknown") { return accept(
withProjection(before, { runtime: "unknown", resourceRetirement: { type: "quarantined" } }), [
{ type: "resource-quarantined", causalEventId: event.eventId, sourceFamilyRootId: event.sourceFamilyRootId, runtimeId: event.runtimeId },
{ type: "runtime-reconciliation-requested", causalEventId: event.eventId, runtimeId: event.runtimeId }, ], ); }
const runtime: RuntimeProjection = event.observation; const retirement = event.observation === "terminated" &&
before.resourceRetirement.type === "quarantined" ? { type: "pending" as const } :
event.observation === "live" ? { type: "quarantined" as const } : before.resourceRetirement;
return accept(withProjection(before, { runtime, resourceRetirement: retirement }),
event.observation === "live"
? [{ type: "runtime-termination-requested", causalEventId: event.eventId, runtimeId: event.runtimeId }] : []); }
const mismatch = ownerMatches(registration, event); if (mismatch !== null) return denial(event, before, mismatch);
if (event.type === "RequestRetirement") {
if (before.resourceRetirement.type === "retired") return denial(event, before, "terminal-already-recorded");
if (sourceTerminal(history) === null) return denial(event, before, "source-terminal");
if (acceptedOf(history, "RequestRetirement").length > 0)
return denial(event, before, "terminal-already-recorded");
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
if (event.type === "CompleteRetirement" && usedReceipt(history, event.tombstoneId)) return replay(event, history);
if (before.resourceRetirement.type !== "pending" && before.resourceRetirement.type !== "quarantined") {
return denial(event, before, "gate-closed"); }
if (before.runtime === "unknown" || before.runtime === "live") return denial(event, before, "runtime-unresolved");
if (event.type === "RequestCleanup") {
if (sourceTerminal(history) === null) return denial(event, before, "source-terminal");
if (acceptedOf(history, "RequestRetirement").length === 0) return denial(event, before, "gate-closed");
if (acceptedOf(history, "RequestCleanup").length > 0) {
return denial(event, before, "terminal-already-recorded"); }
const watermark = runtimeSafetyWatermark(history, event.runtimeId);
const termination = acceptedOf(history, "ReconcileRuntime").filter(candidate =>
candidate.observation === "terminated" && same(candidate.runtimeId, event.runtimeId)).at(-1);
const noRuntimeWasReleased = before.runtime === "not-started" && watermark === null;
if (!noRuntimeWasReleased && (watermark === null || termination === undefined ||
!same(termination.proofId, event.terminationProofId) ||
!same(termination.runtimeSafetyWatermarkEventId, watermark.eventId)))
return denial(event, before, "wrong-binding");
return accept(before, [{
type: "resource-cleanup-requested", causalEventId: event.eventId, sourceFamilyRootId: event.sourceFamilyRootId,
runtimeId: event.runtimeId, proofId: event.terminationProofId, }]); } const source = sourceTerminal(history);
if (acceptedOf(history, "RequestRetirement").length === 0) return denial(event, before, "gate-closed");
if (source === null || !same(source.receiptId, event.sourceTerminalReceiptId)) {
return denial(event, before, "wrong-binding"); } const cleanup = acceptedOf(history, "RequestCleanup").at(-1);
if (cleanup === undefined) return denial(event, before, "gate-closed");
if (!retirementEvidenceClosed(history)) return denial(event, before, "gate-closed");
if (!retainsReceipt(event.retainedEvidence, source.receiptId) ||
(before.admission.type !== "pending" && !retainsReceipt(event.retainedEvidence, before.admission.receiptId))) {
return denial(event, before, "wrong-binding"); }
if (!expectedRetainedEvidence(history, event.cleanupProofId).every(reference =>
hasEvidence(event.retainedEvidence, reference))) return denial(event, before, "wrong-binding");
const tombstone = {
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
if (event.type === "RecordAttemptReceipt" && !same(event.runtimeId, registration.runtimeId)) {
return denial(event, before, "wrong-binding"); }
const receipt = event.type === "RecordAttemptReceipt" ? event.receiptId : event.observationReceiptId;
if (usedReceipt(history, receipt)) return replay(event, history);
if (event.type === "ReachAttemptDeadline" && event.authoritativeTick < registration.attemptDeadline) {
return denial(event, before, "deadline-not-reached"); }
const retainedStart = history.rows.some(row => row.event.type === "ReleaseProcess" &&
row.event.launchPurpose === "evaluation" && same(row.event.attemptId, event.attemptId) &&
same(row.event.runtimeId, registration.runtimeId) && row.result.effects.some(effect =>
effect.type === "late-receipt-retained" && effect.evidence.type === "launch" &&
effect.evidence.result === "started"));
if (event.type === "RecordAttemptReceipt" && before.launch?.type !== "started" && !retainedStart)
return denial(event, before, "gate-closed"); const nextType = event.result; if (before.attempt !== null) {
if (event.type === "ReachAttemptDeadline") return denial(event, before, "terminal-already-recorded");
const conflict = terminalConflict(before.attempt.type, nextType); const effects: DeclaredEffect[] = [{
type: "late-receipt-retained", causalEventId: event.eventId,
evidence: { type: "attempt", attemptId: event.attemptId, receiptId: event.receiptId, result: event.result }, }];
if (conflict) effects.push(...invalidClaimEffects(event, { type: "receipt", receiptId: event.receiptId }));
return accept( conflict ? withProjection(before, { claim: "invalid" }) : before, effects, ); }
if (event.type === "RecordAttemptReceipt" && event.authoritativeTick >= registration.attemptDeadline) {
const prior = acceptedOf(history, "RecordAttemptReceipt").find(candidate =>
same(candidate.attemptId, event.attemptId) && candidate.authoritativeTick >= registration.attemptDeadline);
const conflict = prior !== undefined && prior.result !== event.result; const effects: DeclaredEffect[] = [
{ type: "late-receipt-retained", causalEventId: event.eventId,
evidence: { type: "attempt", attemptId: event.attemptId, receiptId: event.receiptId, result: event.result } },
nonPromotional(event, { type: "receipt", receiptId: event.receiptId })];
if (conflict) effects.push(...invalidClaimEffects(event, { type: "receipt", receiptId: event.receiptId }));
return accept(withProjection(before, { claim: conflict ? "invalid" : claimAfter(before.claim, "non-promotional") }), effects); }
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
if (event.type === "CheckpointEffective") {
if (!same(event.expectedGeneration, campaign.generation)) return denial(event, before, "stale-generation");
if (!campaign.open || acceptedOf(history, "CheckpointEffective").length > 0) {
return denial(event, before, "gate-closed"); } return accept(before); }
if (acceptedOf(history, "CheckpointEffective").length === 0) return denial(event, before, "gate-closed");
const receipt = event.type === "RecordStopReceipt" ? event.receiptId : event.observationReceiptId;
if (usedReceipt(history, receipt)) return replay(event, history);
if (event.type === "ReachStopDeadline" && event.authoritativeTick < registration.stopDeadline) {
return denial(event, before, "deadline-not-reached"); } if (before.stopCheckpoint !== null) {
if (event.type === "ReachStopDeadline") return denial(event, before, "terminal-already-recorded");
const conflict = terminalConflict(before.stopCheckpoint.type, event.result); const effects: DeclaredEffect[] = [{
type: "late-receipt-retained", causalEventId: event.eventId,
evidence: { type: "stop", checkpointId: event.checkpointId, receiptId: event.receiptId, result: event.result }, }];
if (conflict) effects.push(...invalidClaimEffects(event, { type: "receipt", receiptId: event.receiptId }));
return accept(conflict ? withProjection(before, { claim: "invalid" }) : before, effects); }
if (event.type === "RecordStopReceipt" && event.authoritativeTick >= registration.stopDeadline) {
const prior = acceptedOf(history, "RecordStopReceipt").find(candidate =>
same(candidate.checkpointId, event.checkpointId) && candidate.authoritativeTick >= registration.stopDeadline);
const conflict = prior !== undefined && prior.result !== event.result; const effects: DeclaredEffect[] = [
{ type: "late-receipt-retained", causalEventId: event.eventId,
evidence: { type: "stop", checkpointId: event.checkpointId, receiptId: event.receiptId, result: event.result } },
nonPromotional(event, { type: "receipt", receiptId: event.receiptId })];
if (conflict) effects.push(...invalidClaimEffects(event, { type: "receipt", receiptId: event.receiptId }));
return accept(withProjection(before, { claim: conflict ? "invalid" : claimAfter(before.claim, "non-promotional") }), effects); }
if (!same(event.expectedGeneration, campaign.generation)) return denial(event, before, "stale-generation");
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
if (event.type === "RecordBuildResult") { const authority = authorization(history, event.authorizationId);
if (authority === null) return denial(event, before, "authorization-unavailable");
if (!authority.consumed || !authority.released || authority.issue.launchPurpose !== "build" ||
authority.issue.authorizationFence.scope !== "campaign" ||
!same(authority.issue.sourceSlotId, event.sourceSlotId) || !same(authority.issue.runtimeId, registration.runtimeId)) {
return denial(event, before, "wrong-binding"); } }
const receipt = event.type === "RecordBuildResult" ? event.buildReceiptId : event.observationReceiptId;
if (usedReceipt(history, receipt)) return replay(event, history);
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
if (event.type === "RecordBuildResult" && event.authoritativeTick >= registration.buildDeadline) {
const prior = acceptedOf(history, "RecordBuildResult").find(candidate =>
same(candidate.buildAttemptId, event.buildAttemptId) && candidate.authoritativeTick >= registration.buildDeadline);
const conflict = prior !== undefined && !samePayload(prior.result, event.result); const effects: DeclaredEffect[] = [
{ type: "late-receipt-retained", causalEventId: event.eventId, evidence: { type: "build",
buildAttemptId: event.buildAttemptId, buildReceiptId: event.buildReceiptId, result: event.result } },
{ type: "execution-gate-set", causalEventId: event.eventId, buildAttemptId: event.buildAttemptId, value: "denied" },
nonPromotional(event, { type: "build-receipt", buildReceiptId: event.buildReceiptId })];
if (conflict) effects.push(...invalidClaimEffects(event, { type: "build-receipt", buildReceiptId: event.buildReceiptId }));
return accept(withProjection(before, { claim: conflict ? "invalid" : claimAfter(before.claim, "non-promotional") }), effects); }
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
}; const consistencyInputInvalid = (history: OracleHistory,
event: Extract<ProtocolEvent, { readonly type: "RecordBuildConsistencyReceipt" }>): boolean => {
const before = currentProjection(history); const observedBuild = before.build;
if (observedBuild === null) return true;
const recordedBuild = acceptedOf(history, "RecordBuildResult").find(item =>
item.authoritativeTick < history.registration.buildDeadline && "buildReceiptId" in observedBuild &&
same(item.buildReceiptId, observedBuild.buildReceiptId));
const bindingMismatch = recordedBuild !== undefined && !same(recordedBuild.buildReceiptId, event.buildReceiptId);
const matchMismatch = event.result.type === "match" && (observedBuild.type !== "succeeded" ||
recordedBuild?.result.type !== "succeeded" || !same(recordedBuild.result.artifactDigest, event.result.artifactDigest));
const nonArtifactMismatch = event.result.type === "non-artifact-match" &&
(recordedBuild?.result.type !== "failed" && recordedBuild?.result.type !== "no-output" ||
recordedBuild.result.type !== event.result.buildResult);
const impossibleMissing = (event.result.type === "missing-build" || event.result.type === "unknown-build") &&
recordedBuild !== undefined;
return bindingMismatch || matchMismatch || nonArtifactMismatch || impossibleMissing || event.result.type === "invalid";
}; const handleConsistency = ( history: OracleHistory, event: Extract<ProtocolEvent, {
readonly type: "RecordBuildConsistencyReceipt" | "ReachBuildConsistencyDeadline"; }>, ): TransitionResult => {
const before = currentProjection(history); const registration = history.registration;
if (event.type === "RecordBuildConsistencyReceipt") {
if (!buildBindingMatches(registration, event)) return denial(event, before, "wrong-binding");
if (usedReceipt(history, event.consistencyReceiptId)) return replay(event, history);
if (before.buildConsistency !== null) {
const effects: DeclaredEffect[] = [{ type: "late-receipt-retained", causalEventId: event.eventId, evidence: {
type: "build-consistency", buildAttemptId: event.buildAttemptId, consistencyReceiptId: event.consistencyReceiptId,
result: event.result, }, }]; const terminalReceipt = acceptedOf(history, "RecordBuildConsistencyReceipt").at(0);
const conflict = terminalReceipt === undefined ? terminalConflict(before.buildConsistency.type, event.result.type) :
!same(terminalReceipt.buildReceiptId, event.buildReceiptId) ||
!samePayload(terminalReceipt.result, event.result);
if (conflict) {
effects.push(...invalidClaimEffects(event, { type: "consistency-receipt", consistencyReceiptId: event.consistencyReceiptId }));
return accept(withProjection(before, { claim: "invalid" }), effects); } return accept(before, effects); }
if (event.authoritativeTick >= registration.buildConsistencyDeadline) {
const prior = acceptedOf(history, "RecordBuildConsistencyReceipt").find(candidate =>
same(candidate.buildAttemptId, event.buildAttemptId) &&
candidate.authoritativeTick >= registration.buildConsistencyDeadline);
const conflict = prior !== undefined && (!same(prior.buildReceiptId, event.buildReceiptId) ||
!samePayload(prior.result, event.result)) || consistencyInputInvalid(history, event); const effects: DeclaredEffect[] = [
{ type: "late-receipt-retained", causalEventId: event.eventId, evidence: { type: "build-consistency",
buildAttemptId: event.buildAttemptId, consistencyReceiptId: event.consistencyReceiptId, result: event.result } },
{ type: "execution-gate-set", causalEventId: event.eventId, buildAttemptId: event.buildAttemptId, value: "denied" },
nonPromotional(event, { type: "consistency-receipt", consistencyReceiptId: event.consistencyReceiptId })];
if (conflict) effects.push(...invalidClaimEffects(event,
{ type: "consistency-receipt", consistencyReceiptId: event.consistencyReceiptId }));
return accept(withProjection(before, { claim: conflict ? "invalid" : claimAfter(before.claim, "non-promotional") }), effects); }
if (consistencyInputInvalid(history, event)) return consistencyInvalid(history, event);
const projection: BuildConsistencyTerminalProjection = {
type: event.result.type, consistencyReceiptId: event.consistencyReceiptId, };
const allowed = projection.type === "match" && before.build?.type === "succeeded"; const effects: DeclaredEffect[] = [
{ type: "terminal-appended", causalEventId: event.eventId, terminal: { type: "build-consistency", projection } },
{ type: "execution-gate-set", causalEventId: event.eventId, buildAttemptId: event.buildAttemptId, value: allowed ? "allowed" : "denied" },
]; return accept(withProjection(before, { buildConsistency: projection }), effects); }
if (!buildBindingMatches(registration, event)) return denial(event, before, "wrong-binding");
if (before.sourceEvidence.type !== "closed" || before.admission.type !== "accepted" || before.build === null) {
return denial(event, before, "gate-closed"); }
if (before.buildConsistency !== null) return denial(event, before, "terminal-already-recorded");
if (event.authoritativeTick < registration.buildConsistencyDeadline) {
return denial(event, before, "deadline-not-reached"); }
if (usedReceipt(history, event.observationReceiptId)) return replay(event, history);
const projection: BuildConsistencyTerminalProjection = { type: event.result,
observationReceiptId: event.observationReceiptId, }; return accept(withProjection(before, {
buildConsistency: projection, claim: claimAfter(before.claim, "non-promotional") }), [
{ type: "terminal-appended", causalEventId: event.eventId, terminal: { type: "build-consistency", projection } },
{ type: "execution-gate-set", causalEventId: event.eventId, buildAttemptId: event.buildAttemptId, value: "denied" },
nonPromotional(event, { type: "receipt", receiptId: event.observationReceiptId }),
]); }; const handleAdmission = (
history: OracleHistory, event: Extract<ProtocolEvent, { readonly type: "RecordAdmission" }>, ): TransitionResult => {
const before = currentProjection(history); const registration = history.registration;
if (!rootMatches(registration, event) || !same(event.admissionId, registration.admissionId)) {
return denial(event, before, "wrong-binding"); }
if (before.sourceEvidence.type !== "closed") return denial(event, before, "source-terminal");
if (before.admission.type !== "pending") return denial(event, before, "terminal-already-recorded");
if (usedReceipt(history, event.receiptId)) return replay(event, history);
const admission: Exclude<AdmissionProjection, { readonly type: "pending" }> = { type: event.result,
receiptId: event.receiptId, }; const effects: DeclaredEffect[] = [
{ type: "terminal-appended", causalEventId: event.eventId, terminal: { type: "admission", projection: admission } },
]; if (event.result === "failed") {
effects.push(...revocations(history, event.eventId, "source", true, undefined, true));
effects.push(nonPromotional(event, { type: "receipt", receiptId: event.receiptId })); }
return accept(withProjection(before, { admission,
claim: event.result === "failed" ? claimAfter(before.claim, "non-promotional") : before.claim, }), effects); };
const transitionTable: { readonly [Kind in Exclude<ProtocolEvent["type"], "RegisterProtocol">]: (
history: OracleHistory, event: Extract<ProtocolEvent, { readonly type: Kind }>, ) => TransitionResult; } = {
IssueAuthorization: handleAuthorization, ConsumeAuthorization: handleAuthorization,
  RevokeAuthorization: handleAuthorization,
  ExpireAuthorization: handleAuthorization,
  CloseSource: appendSourceTerminal,
  AbandonSource: appendSourceTerminal,
  AdvanceFence: handleFence,
  ReleaseProcess: handleRelease,
  RecordReleaseDenied: handleRelease,
  ObserveCrash: handleRelease,
  ReachLaunchDeadline: handleRelease,
  RestartObserved: handleRuntime,
  ReconcileRuntime: handleRuntime,
  RequestRetirement: handleRuntime,
  RequestCleanup: handleRuntime,
  CompleteRetirement: handleRuntime,
  RecordAttemptReceipt: handleAttempt,
  ReachAttemptDeadline: handleAttempt,
  CheckpointEffective: handleStop,
  RecordStopReceipt: handleStop,
  ReachStopDeadline: handleStop,
  RecoverStopFence: handleStop,
  RecordBuildResult: handleBuild,
  ReachBuildDeadline: handleBuild,
  RecordBuildConsistencyReceipt: handleConsistency,
  ReachBuildConsistencyDeadline: handleConsistency,
  RecordAdmission: handleAdmission,
};

export const initializeOracleHistory = (
  registration: RegisterProtocol,
  trusted: TrustedProtocolCoordinates,
): OracleHistory => {
  const projection = initialProjection();
  const result = registration.authenticatedPredecessorId === null &&
    same(registration.protocolRevisionId, trusted.protocolRevisionId) &&
    same(registration.custodyAuthorityId, trusted.custodyAuthorityId) ?
      accept(projection) :
      denial(
        registration,
        withProjection(projection, { claim: "non-promotional" }),
        "wrong-binding",
      );

  return {
    trusted,
    registration,
    registrationAccepted: result.decision === "accepted",
    rows: [{ event: registration, result, accepted: result.decision === "accepted" }],
  };
};

export const appendOracleEvent = (
  history: OracleHistory,
  event: ProtocolEvent,
): OracleStep => {
  const sameId = history.rows.filter(row => same(row.event.eventId, event.eventId));
  const exact = sameId.find(row => samePayload(row.event, event));
  if (exact !== undefined) return { history, result: exact.result };

  let result: TransitionResult;
  let registration = history.registration;
  let registrationAccepted = history.registrationAccepted;
  if (!history.registrationAccepted) {
    if (event.type !== "RegisterProtocol") {
      result = denial(event, currentProjection(history), "not-registered");
    } else if (event.authenticatedPredecessorId !== null ||
        !same(event.protocolRevisionId, history.trusted.protocolRevisionId) ||
        !same(event.custodyAuthorityId, history.trusted.custodyAuthorityId)) {
      result = denial(event, currentProjection(history), "wrong-binding");
    } else {
      result = accept(initialProjection());
      registration = event;
      registrationAccepted = true;
    }
  } else if (sameId.length > 0) {
    result = denial(event, currentProjection(history), "wrong-binding");
  } else {
    const envelopeFailure = commonEnvelopeFailure(history, event);
    if (envelopeFailure !== null) {
      result = denial(event, currentProjection(history), envelopeFailure);
    } else if (event.type === "RegisterProtocol") {
      result = denial(event, currentProjection(history),
        registrationMatches(history.registration, event) ? "terminal-already-recorded" : "wrong-binding");
    } else {
      const handler = transitionTable[event.type] as (
        selected: OracleHistory,
        selectedEvent: typeof event,
      ) => TransitionResult;
      let candidate = handler(history, event);
      const receipt = ownedReceipt(event);
      const reason = candidate.effects.find(effect =>
        effect.type === "denial-recorded")?.reason;
      const identityFailure = reason === "wrong-binding" ||
        reason === "retirement-owner-mismatch" ||
        reason === "credential-lineage-mismatch";

      if (
        receipt !== undefined &&
        usedReceipt(history, receipt) &&
        reason !== "receipt-replay" &&
        !identityFailure
      ) {
        candidate = replay(event, history);
      }
      result = enforceRetiredHistoryFinality(history, event, candidate);
    }
  }

  const row: LedgerRow = {
    event,
    result,
    accepted: result.decision === "accepted",
  };
  return {
    history: { trusted: history.trusted, registration, registrationAccepted,
      rows: [...history.rows, row] },
    result,
  };
};

export const foldOracleHistory = (
  events: readonly ProtocolEvent[],
  trusted: TrustedProtocolCoordinates,
): OracleFold => {
  const [first, ...rest] = events;
  if (first?.type !== "RegisterProtocol") {
    throw new TypeError("Oracle history must begin with RegisterProtocol.");
  }

  let history = initializeOracleHistory(first, trusted);
  const results: TransitionResult[] = [history.rows[0]!.result];
  for (const event of rest) {
    const step = appendOracleEvent(history, event);
    history = step.history;
    results.push(step.result);
  }
  return { history, results };
};

export const getOracleTerminalProjections = (
  history: OracleHistory,
): TerminalProjections => currentProjection(history);
