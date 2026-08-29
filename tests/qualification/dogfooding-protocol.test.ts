import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import test from "node:test";
import fc from "fast-check";
import * as C from "./dogfooding-protocol-contract.ts";
import { foldOracleHistory } from "./dogfooding-protocol-oracle.ts";
import { foldQualificationHistory } from "./dogfooding-protocol-reducer.ts";
const id = {
  protocol: C.protocolRevisionId("protocol"), authority: C.custodyAuthorityId("authority"),
  family: C.sourceClaimFamilyId("family"), root: C.sourceFamilyRootId("root"),
  slot: C.sourceSlotId("slot"), authorization: C.authorizationId("authorization"),
  buildAuthorization: C.authorizationId("build-authorization"),
  otherAuthorization: C.authorizationId("other-authorization"),
  attempt: C.attemptId("attempt"), runtime: C.runtimeId("runtime"),
  checkpoint: C.checkpointId("checkpoint"), build: C.buildAttemptId("build"),
  owner: C.retirementOwnerId("owner"), otherOwner: C.retirementOwnerId("other-owner"),
  lineage: C.credentialLineageId("lineage"), otherLineage: C.credentialLineageId("other-lineage"),
  admission: C.admissionId("admission"), artifact: C.artifactDigest("sha256:artifact"),
};
const trusted: C.TrustedProtocolCoordinates = {
  protocolRevisionId: id.protocol, custodyAuthorityId: id.authority,
};
const g = (value: number): C.FenceGeneration => C.fenceGeneration(value);
const tick = (value: number): C.AuthoritativeTick => C.authoritativeTick(value);
const receipt = (label: string): C.ReceiptId => C.receiptId(`receipt:${label}`);
const buildReceipt = (label: string): C.BuildReceiptId => C.buildReceiptId(`build-receipt:${label}`);
const consistencyReceipt = (label: string): C.ConsistencyReceiptId =>
  C.consistencyReceiptId(`consistency-receipt:${label}`);
const proof = (label: string): C.ProofId => C.proofId(`proof:${label}`);
const sourceFence: C.AuthorizationFenceBinding = {
  scope: "source", expectedGeneration: g(1), expectedFamilyAllocationGeneration: g(1),
};
const campaignFence: C.AuthorizationFenceBinding = { scope: "campaign", expectedGeneration: g(1) };
interface Envelope {
  readonly eventId: C.EventId;
  readonly protocolRevisionId: C.ProtocolRevisionId;
  readonly custodyAuthorityId: C.CustodyAuthorityId;
  readonly authoritativeTick: C.AuthoritativeTick;
  readonly authenticatedPredecessorId: C.EventId | null;
}
interface EventSpec {
  readonly label: string;
  readonly minimumTick?: number;
  readonly accepted: boolean;
  readonly extendsLineage: boolean;
  readonly body: Readonly<Record<string, unknown>>;
}
const event = (label: string, type: C.ProtocolEvent["type"],
  body: Readonly<Record<string, unknown>> = {}, minimumTick = 0): EventSpec =>
  ({ label, minimumTick, accepted: true, extendsLineage: true, body: { type, ...body } });
const rejected = (spec: EventSpec): EventSpec => ({ ...spec, accepted: false });
const detached = (spec: EventSpec): EventSpec => ({ ...spec, extendsLineage: false });
const root = { sourceClaimFamilyId: id.family, sourceFamilyRootId: id.root };
const authorization = (binding: C.AuthorizationFenceBinding,
  launchPurpose: C.LaunchPurpose = binding.scope === "source" ? "source-authoring" : "evaluation") => ({ ...root,
  authorizationId: id.authorization, sourceSlotId: id.slot, runtimeId: id.runtime,
  retirementOwnerId: id.owner, credentialLineageId: id.lineage, authorizationFence: binding,
  launchPurpose,
});
const register = event("register", "RegisterProtocol", {
  sourceClaimFamilyId: id.family, sourceFamilyRootId: id.root, sourceSlotId: id.slot,
  attemptId: id.attempt, runtimeId: id.runtime, checkpointId: id.checkpoint,
  buildAttemptId: id.build, retirementOwnerId: id.owner, credentialLineageId: id.lineage,
  admissionId: id.admission, sourceFenceGeneration: g(1), campaignFenceGeneration: g(1),
  familyAllocationFenceGeneration: g(1), launchDeadline: tick(60), attemptDeadline: tick(60),
  stopDeadline: tick(60), buildDeadline: tick(60), buildConsistencyDeadline: tick(80),
});
const issue = (label: string, binding: C.AuthorizationFenceBinding = sourceFence,
  purpose?: C.LaunchPurpose) => event(label, "IssueAuthorization", {
  ...authorization(binding, purpose), expiresAt: tick(50),
});
const issueWithId = (label: string, selectedId: C.AuthorizationId,
  binding: C.AuthorizationFenceBinding = sourceFence, purpose?: C.LaunchPurpose) =>
  event(label, "IssueAuthorization", {
  ...authorization(binding, purpose), authorizationId: selectedId, expiresAt: tick(50),
});
const consume = (label: string, binding: C.AuthorizationFenceBinding = sourceFence,
  purpose?: C.LaunchPurpose) => event(label, "ConsumeAuthorization", authorization(binding, purpose));
const revoke = (label: string, binding: C.AuthorizationFenceBinding = sourceFence) => event(label, "RevokeAuthorization", {
  ...root, authorizationId: id.authorization, authorizationFence: binding, reason: "analytic-stop",
});
const expire = (label: string, binding: C.AuthorizationFenceBinding = sourceFence) => event(label, "ExpireAuthorization", {
  ...root, authorizationId: id.authorization, authorizationFence: binding,
}, 50);
const close = (label: string) => event(label, "CloseSource", { ...root,
  expectedGeneration: g(1), nextGeneration: g(2), receiptId: receipt(label),
  sourceDigest: C.artifactDigest("sha256:source"),
});
const abandon = (label: string) => event(label, "AbandonSource", { ...root,
  expectedGeneration: g(1), nextGeneration: g(2), receiptId: receipt(label), proofId: proof(label),
});
const abandonAfterAdvance = (label: string) => event(label, "AbandonSource", { ...root,
  expectedGeneration: g(2), nextGeneration: g(3), receiptId: receipt(label), proofId: proof(label),
});
const advance = (label: string, selected: "source" | "campaign" = "campaign",
  cause: C.AdvanceFence["cause"] = "analytic-stop") =>
  event(label, "AdvanceFence", { ...root, fence: selected, expectedGeneration: g(1),
    nextGeneration: g(2), cause });
const release = (label: string, binding: C.AuthorizationFenceBinding = campaignFence,
  purpose?: C.LaunchPurpose, selectedId = id.authorization) => event(label, "ReleaseProcess", {
  ...authorization(binding, purpose), authorizationId: selectedId,
  attemptId: id.attempt, launchReceiptId: receipt(label),
});
const releaseDenied = (label: string, binding: C.AuthorizationFenceBinding = campaignFence) => event(label, "RecordReleaseDenied", {
  ...authorization(binding), receiptId: receipt(label), proofId: proof(label), reason: "gate-closed",
});
const crash = (label: string, binding: C.AuthorizationFenceBinding = sourceFence) => event(label, "ObserveCrash", {
  ...root, authorizationId: id.authorization, runtimeId: id.runtime,
  expectedGeneration: binding.expectedGeneration,
});
const launchDeadline = (label: string, binding: C.AuthorizationFenceBinding = sourceFence,
  result: "start-unknown" | "never-started" = "start-unknown", minimumTick = 60) => event(label, "ReachLaunchDeadline", {
  ...authorization(binding), observationReceiptId: receipt(label), result,
}, minimumTick);
const restart = (label: string) => event(label, "RestartObserved", { ...root, runtimeId: id.runtime });
const reconcile = (label: string, observation: "live" | "terminated" | "unknown") =>
  event(label, "ReconcileRuntime", { ...root, runtimeId: id.runtime, observation, proofId: proof(label) });
const retirement = (label: string, owner = id.owner, lineage = id.lineage) =>
  event(label, "RequestRetirement", { ...root, retirementOwnerId: owner, credentialLineageId: lineage });
const cleanup = (label: string, owner = id.owner) => event(label, "RequestCleanup", { ...root,
  runtimeId: id.runtime, retirementOwnerId: owner, credentialLineageId: id.lineage,
  terminationProofId: proof(label),
});
const bodyEvidence = (value: unknown): readonly C.EvidenceReference[] => {
  if (value === null || typeof value !== "object") return [];
  const result: C.EvidenceReference[] = [];
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    if (typeof item === "string") {
      if (key === "receiptId" || key === "launchReceiptId" || key === "observationReceiptId")
        result.push({ type: "receipt", receiptId: C.receiptId(item) });
      else if (key === "buildReceiptId") result.push({ type: "build-receipt", buildReceiptId: C.buildReceiptId(item) });
      else if (key === "consistencyReceiptId")
        result.push({ type: "consistency-receipt", consistencyReceiptId: C.consistencyReceiptId(item) });
      else if (key === "proofId" || key === "terminationProofId" || key === "cleanupProofId")
        result.push({ type: "proof", proofId: C.proofId(item) });
    }
    if (typeof item === "object" && item !== null) result.push(...bodyEvidence(item));
  }
  return result;
};
const retainedEvidenceFor = (history: readonly EventSpec[], cleanupProof: C.ProofId): readonly C.EvidenceReference[] => {
  const references = history.filter(spec => spec.accepted).flatMap(spec => [
    { type: "event" as const, eventId: C.eventId(`event:${spec.label}`) }, ...bodyEvidence(spec.body)]);
  references.push({ type: "proof", proofId: cleanupProof });
  return references.filter((reference, index) => references.findIndex(candidate =>
    JSON.stringify(candidate) === JSON.stringify(reference)) === index);
};
const complete = (label: string, history: readonly EventSpec[], sourceReceipt: C.ReceiptId) =>
  event(label, "CompleteRetirement", { ...root, runtimeId: id.runtime, retirementOwnerId: id.owner,
    credentialLineageId: id.lineage, tombstoneId: C.tombstoneId(`tombstone:${label}`),
    cleanupProofId: proof(label), sourceTerminalReceiptId: sourceReceipt,
    retainedEvidence: retainedEvidenceFor(history, proof(label)),
  });
const attemptReceipt = (label: string, result: C.AttemptReceiptResult, selectedReceipt = receipt(label)) =>
  event(label, "RecordAttemptReceipt", { attemptId: id.attempt, runtimeId: id.runtime,
    receiptId: selectedReceipt, result });
const attemptDeadline = (label: string, result: "missing" | "unknown" = "missing", minimumTick = 60) =>
  event(label, "ReachAttemptDeadline", { attemptId: id.attempt,
    observationReceiptId: receipt(label), result }, minimumTick);
const checkpoint = (label: string) => event(label, "CheckpointEffective", {
  checkpointId: id.checkpoint, expectedGeneration: g(1),
});
const stop = (label: string, result: "continue" | "stop" = "stop") => event(label, "RecordStopReceipt", {
  checkpointId: id.checkpoint, receiptId: receipt(label), expectedGeneration: g(1), result,
});
const stopDeadline = (label: string, result: "missing" | "unknown" = "missing", minimumTick = 60) =>
  event(label, "ReachStopDeadline", { checkpointId: id.checkpoint, expectedGeneration: g(1),
    observationReceiptId: receipt(label), result }, minimumTick);
const recoverStop = (label: string, expected = 1, next = 2) => event(label, "RecoverStopFence", {
  checkpointId: id.checkpoint, expectedGeneration: g(expected), nextGeneration: g(next),
});
const admission = (label: string, result: "accepted" | "failed") => event(label, "RecordAdmission", {
  ...root, admissionId: id.admission, receiptId: receipt(label), result,
});
const build = (label: string, result: "succeeded" | "failed" | "no-output",
  selectedReceipt = buildReceipt(label)) =>
  event(label, "RecordBuildResult", { ...root, sourceSlotId: id.slot, buildAttemptId: id.build,
    authorizationId: id.buildAuthorization,
    buildReceiptId: selectedReceipt, result: result === "succeeded" ?
      { type: result, artifactDigest: id.artifact } : { type: result, proofId: proof(label) },
  });
const buildDeadline = (label: string, result: "missing" | "unknown" = "missing", minimumTick = 60) =>
  event(label, "ReachBuildDeadline", { ...root, sourceSlotId: id.slot, buildAttemptId: id.build,
    observationReceiptId: receipt(label), result }, minimumTick);
const consistency = (label: string, result: C.BuildConsistencyInput,
  boundBuildReceipt = buildReceipt("build"), selectedReceipt = consistencyReceipt(label)) =>
  event(label, "RecordBuildConsistencyReceipt", { ...root, sourceSlotId: id.slot,
    buildAttemptId: id.build, buildReceiptId: boundBuildReceipt,
    consistencyReceiptId: selectedReceipt, result });
const consistencyDeadline = (label: string,
  result: "missing-verifier" | "unknown-verifier" = "missing-verifier", minimumTick = 80) =>
  event(label, "ReachBuildConsistencyDeadline", { ...root, sourceSlotId: id.slot,
    buildAttemptId: id.build, observationReceiptId: receipt(label), result }, minimumTick);
const materialize = (specs: readonly EventSpec[], tickStep = 1): readonly C.ProtocolEvent[] => {
  const events: C.ProtocolEvent[] = [];
  let predecessor: C.EventId | null = null;
  let now = 0;
  for (const spec of specs) {
    now = Math.max(now + tickStep, spec.minimumTick ?? 0);
    const envelope: Envelope = { eventId: C.eventId(`event:${spec.label}`),
      protocolRevisionId: id.protocol, custodyAuthorityId: id.authority,
      authoritativeTick: tick(now), authenticatedPredecessorId: predecessor };
    const selected = { ...envelope, ...spec.body } as unknown as C.ProtocolEvent;
    if (events.length === 0) {
      assert.equal(selected.type, "RegisterProtocol");
      predecessor = selected.eventId;
    } else if (spec.extendsLineage) predecessor = selected.eventId;
    events.push(selected);
  }
  return events;
};
const canonical = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(canonical);
  if (value === null || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value as Record<string, unknown>)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, item]) => [key, canonical(item)]));
};
const effectBag = (effects: readonly C.DeclaredEffect[]): readonly string[] =>
  effects.map(effect => JSON.stringify(canonical(effect))).sort();
const compareResult = (actual: C.TransitionResult, expected: C.TransitionResult, context: string): void => {
  assert.equal(actual.decision, expected.decision, `${context}: decision`);
  assert.deepEqual(effectBag(actual.effects), effectBag(expected.effects), `${context}: exact effect bag`);
  assert.deepEqual(canonical(actual.terminalProjections), canonical(expected.terminalProjections),
    `${context}: terminal projections`);
};
const compareEvents = (events: readonly C.ProtocolEvent[], context: string): readonly C.TransitionResult[] => {
  const reducer = foldQualificationHistory(events, 64, trusted).results;
  const oracle = foldOracleHistory(events, trusted).results;
  assert.equal(reducer.length, oracle.length);
  reducer.forEach((result, index) => compareResult(result, oracle[index]!,
    `${context} event ${index} (${events[index]!.type})`));
  return reducer;
};
const compareHistory = (specs: readonly EventSpec[], context: string, tickStep = 1): void => {
  const events = materialize(specs, tickStep);
  const reducer = foldQualificationHistory(events, 64, trusted).results;
  const oracle = foldOracleHistory(events, trusted).results;
  assert.equal(reducer.length, oracle.length);
  reducer.forEach((result, index) => {
    const fixtureDecision = specs[index]!.accepted ? "accepted" : "rejected";
    assert.equal(result.decision, fixtureDecision, `${context} event ${index}: reducer fixture expectation`);
    assert.equal(oracle[index]!.decision, fixtureDecision,
      `${context} event ${index}: oracle fixture expectation`);
  });
  reducer.forEach((result, index) => {
    compareResult(result, oracle[index]!, `${context} event ${index} (${events[index]!.type})`);
  });
};
interface RaceFamily {
  readonly name: string;
  readonly variants: number;
  readonly history: (reverse: boolean, variant: number) => readonly EventSpec[];
}
const ordered = (reverse: boolean, left: EventSpec, right: EventSpec): readonly EventSpec[] =>
  reverse ? [right, left] : [left, right];
const at = (spec: EventSpec, minimumTick: number): EventSpec => ({ ...spec, minimumTick });
const sourcePreparedPrefix = [register, issueWithId("source-issue", id.otherAuthorization, sourceFence),
  event("source-consume", "ConsumeAuthorization", { ...authorization(sourceFence), authorizationId: id.otherAuthorization }),
  release("source-release", sourceFence, "source-authoring", id.otherAuthorization)] as const;
const sourceClosedPrefix = [...sourcePreparedPrefix, close("close"),
  reconcile("source-terminated", "terminated")] as const;
const closedPrefix = [...sourceClosedPrefix, admission("admission", "accepted")] as const;
const buildAuthorizedPrefix = [...closedPrefix,
  issueWithId("build-issue", id.buildAuthorization, campaignFence, "build"),
  event("build-consume", "ConsumeAuthorization", {
    ...authorization(campaignFence, "build"), authorizationId: id.buildAuthorization }),
  release("build-release", campaignFence, "build", id.buildAuthorization)] as const;
const campaignBuildPrefix = [...buildAuthorizedPrefix,
  build("build", "succeeded"), consistency("consistency", { type: "match", artifactDigest: id.artifact }),
  reconcile("build-terminated", "terminated"), issue("issue", campaignFence)] as const;
const evaluationStartedPrefix = [...campaignBuildPrefix, consume("consume", campaignFence), release("release")] as const;
const raceFamilies: readonly RaceFamily[] = [
  { name: "1 consume vs stop/revoke/expiry", variants: 3, history: (reverse, variant) => {
    const binding = variant === 0 ? campaignFence : sourceFence;
    const adverse = variant === 0 ? advance("stop") : variant === 1 ? revoke("revoke") : expire("expiry");
    const consumption = consume("consume", binding);
    const prefix = variant === 0 ? campaignBuildPrefix : [register, issue("issue", binding)];
    return [...prefix, ...(reverse ? [adverse, rejected(detached(consumption))] : [consumption, adverse]),
      rejected(detached(release("continuation-release", binding)))];
  } },
  { name: "2 issuance vs source abandonment", variants: 1, history: reverse => [register,
    ...(reverse ? [abandon("terminal"), rejected(detached(issue("issue")))]
      : [issue("issue"), abandon("terminal")]), rejected(detached(consume("continuation-consume")))] },
  { name: "3 closure vs abandonment", variants: 1, history: reverse => [...sourcePreparedPrefix,
    ...(reverse ? [abandon("abandon"), rejected(detached(close("close")))]
      : [close("close"), rejected(detached(abandon("abandon")))]),
    rejected(detached(issue("continuation-issue")))],
  },
  { name: "4 process release vs generation advance", variants: 1, history: reverse => [
    ...campaignBuildPrefix, consume("consume", campaignFence),
    ...(reverse ? [advance("advance"), rejected(detached(release("release")))]
      : [release("release"), advance("advance")]),
    ...(reverse ? [releaseDenied("continuation-denial")]
      : [rejected(detached(releaseDenied("continuation-denial")))]),
  ] },
  { name: "5 crash after consume before start confirmation", variants: 1, history: reverse => [
    ...campaignBuildPrefix, consume("consume", campaignFence), ...(reverse
      ? [release("release"), rejected(detached(crash("crash", campaignFence)))]
      : [crash("crash", campaignFence), rejected(detached(release("release")))]),
    reconcile("continuation-reconcile", "unknown"),
    ...(reverse ? [rejected(detached(launchDeadline("continuation-deadline")))]
      : [launchDeadline("continuation-deadline", campaignFence)]),
  ] },
  { name: "6 terminal receipt vs deadline", variants: 1, history: reverse => [register,
    ...evaluationStartedPrefix.slice(1), ...(reverse ? [attemptDeadline("deadline"), attemptReceipt("receipt", "succeeded")]
      : [attemptReceipt("receipt", "succeeded"), rejected(detached(attemptDeadline("deadline")))]),
    attemptReceipt("continuation-conflict", "failed")],
  },
  { name: "7 late/conflicting receipt after finality", variants: 1, history: reverse => [
    ...evaluationStartedPrefix, attemptReceipt("terminal", "succeeded"),
    ...ordered(reverse, attemptReceipt("late-same", "succeeded"), attemptReceipt("late-conflict", "failed")),
    rejected(detached(attemptDeadline("continuation-deadline")))],
  },
  { name: "8 restart reconciliation vs cleanup/retirement", variants: 2,
    history: (reverse, variant) => {
      const prefix = [...campaignBuildPrefix, consume("consume", campaignFence), release("release")];
      const raced = variant === 0 ? ordered(reverse, restart("restart"), retirement("retirement"))
        : reverse ? [rejected(detached(cleanup("cleanup"))), restart("restart")]
          : [restart("restart"), rejected(detached(cleanup("cleanup")))];
      const beforeComplete = [...prefix, ...(variant === 0 ? [] : [retirement("retirement")]), ...raced,
        reconcile("continuation-terminated", "terminated"), attemptDeadline("continuation-attempt"),
        cleanup("continuation-cleanup")];
      return [...beforeComplete, complete("continuation-complete", beforeComplete, receipt("close"))];
    },
  },
  { name: "9 durable analytic stop vs next launch", variants: 1, history: reverse => [
    ...campaignBuildPrefix, consume("consume", campaignFence), checkpoint("checkpoint"),
    ...(reverse ? [rejected(detached(release("release"))), stop("stop")]
      : [stop("stop"), rejected(detached(release("release")))]), recoverStop("continuation-recover"),
    rejected(detached(issue("continuation-issue", campaignFence)))],
  },
  { name: "10 build vs missing/replayed/mismatched consistency evidence", variants: 3,
    history: (reverse, variant) => { const result = variant === 0 ? "failed" : "no-output";
      const consistencyId = consistencyReceipt("consistency");
      const evidence = consistency("consistency", variant === 2 ? { type: "match", artifactDigest: id.artifact } :
        { type: "non-artifact-match", buildResult: result, proofId: proof("non-artifact") },
      variant === 1 ? buildReceipt("wrong") : buildReceipt("build"), consistencyId);
      return [...buildAuthorizedPrefix, ...ordered(reverse, build("build", result), evidence),
        consistency("continuation-replay", { type: "missing-build", proofId: proof("replay") },
          buildReceipt("build"), consistencyId)];
    } },
  { name: "11 failed admission after closed source vs retirement", variants: 1, history: reverse => [
    ...(() => { const beforeComplete = [...sourceClosedPrefix,
      ...ordered(reverse, admission("failed-admission", "failed"), retirement("retirement")),
      cleanup("continuation-cleanup")]; return [...beforeComplete,
        complete("continuation-complete", beforeComplete, receipt("close"))]; })()],
  },
  { name: "12 unknown runtime vs cleanup", variants: 1, history: reverse => [
    ...(() => { const beforeComplete = [register, issue("issue"), consume("consume"), crash("crash"),
      abandon("abandon"), retirement("retirement"),
      ...(reverse ? [rejected(detached(cleanup("cleanup"))), reconcile("unknown", "unknown")]
        : [reconcile("unknown", "unknown"), rejected(detached(cleanup("cleanup")))]),
      launchDeadline("continuation-deadline"), reconcile("continuation-terminated", "terminated"),
      cleanup("continuation-cleanup")];
    return [...beforeComplete, complete("continuation-complete", beforeComplete, receipt("abandon"))]; })()],
  },
];
assert.equal(raceFamilies.length, 12, "the registry must contain exactly twelve race families");
const retiredBeforeComplete = [...sourceClosedPrefix, retirement("retirement"), cleanup("cleanup")] as const;
const retiredCrashHistory = [...retiredBeforeComplete,
  complete("complete", retiredBeforeComplete, receipt("close")),
  rejected(detached(crash("post-retirement-crash")))] as const;
const failedAdmissionAfterConsumedHistory = [...sourceClosedPrefix, admission("failed", "failed")] as const;
const advanceCauseHistories = [[register, issue("issue-expiry"), advance("advance-expiry", "source", "expiry")],
  [...campaignBuildPrefix, advance("advance-analytic", "campaign", "analytic-stop")]] as const;
const regressionHistories: readonly (readonly EventSpec[])[] = [
  [...sourcePreparedPrefix, close("unreconciled-close"), retirement("unreconciled-retirement"),
    rejected(detached(cleanup("unreconciled-cleanup")))],
  [...sourceClosedPrefix, admission("failed", "failed"),
    rejected(detached(issue("post-failure-issue", campaignFence)))],
  [...retiredBeforeComplete, complete("complete", retiredBeforeComplete, receipt("close")),
    rejected(detached(reconcile("post-retirement", "unknown")))],
  [...sourceClosedPrefix, retirement("retirement"), cleanup("cleanup"),
    rejected(detached(cleanup("duplicate-cleanup")))],
  [register, issue("issue"), consume("consume"),
    rejected(detached(launchDeadline("never-started", sourceFence, "never-started")))],
  [...campaignBuildPrefix, consume("consume", campaignFence), checkpoint("checkpoint"), stop("stop"),
    advance("advance"), rejected(detached(recoverStop("recover-closed", 2, 3)))],
  [...buildAuthorizedPrefix, build("build", "succeeded"), build("same-late-build", "succeeded")],
  [register, checkpoint("checkpoint"), stopDeadline("stop-deadline")],
  [...closedPrefix, buildDeadline("build-deadline")],
  [...buildAuthorizedPrefix, build("build", "succeeded"), consistencyDeadline("consistency-deadline")],
  retiredCrashHistory,
  failedAdmissionAfterConsumedHistory,
  [...evaluationStartedPrefix, attemptReceipt("attempt", "succeeded"),
    rejected(detached(attemptReceipt("attempt-replay", "succeeded", receipt("attempt"))))],
  [register, issue("issue"), rejected(detached(issueWithId("duplicate-slot-authority", id.otherAuthorization)))],
  [register, issue("issue"), launchDeadline("never-started", sourceFence, "never-started"),
    rejected(detached(consume("post-terminal-consume")))],
  [register, issue("issue"), consume("consume"), launchDeadline("direct-start-unknown")],
  [...evaluationStartedPrefix, at(attemptReceipt("late-attempt", "succeeded"), 60), attemptDeadline("attempt-deadline")],
  [register, checkpoint("checkpoint"), at(stop("late-stop"), 60), stopDeadline("stop-deadline")],
  [...buildAuthorizedPrefix, at(build("late-build", "succeeded"), 60), buildDeadline("build-deadline")],
  [...buildAuthorizedPrefix, build("build", "failed"),
    consistency("non-artifact", { type: "non-artifact-match", buildResult: "failed", proofId: proof("failed") })],
  [...buildAuthorizedPrefix, build("build", "no-output"),
    consistency("bad-non-artifact", { type: "non-artifact-match", buildResult: "failed", proofId: proof("bad") })],
  [...buildAuthorizedPrefix, build("build", "succeeded"),
    at(consistency("late-consistency", { type: "match", artifactDigest: id.artifact }), 80),
    consistencyDeadline("consistency-deadline")],
  [...sourceClosedPrefix, admission("admission", "accepted"),
    issueWithId("build-issue", id.buildAuthorization, campaignFence, "build"),
    event("build-consume", "ConsumeAuthorization", { ...authorization(campaignFence, "build"), authorizationId: id.buildAuthorization }),
    release("build-release", campaignFence, "build", id.buildAuthorization), build("build", "succeeded"),
    consistency("consistency", { type: "match", artifactDigest: id.artifact }),
    reconcile("build-terminated", "terminated"),
    issue("evaluation-issue", campaignFence), consume("evaluation-consume", campaignFence),
    release("evaluation-release"), attemptReceipt("attempt", "succeeded")],
  [register, issue("issue"), expire("expiry"), abandon("abandon-after-expiry")],
  [register, issue("issue"), expire("expiry"), rejected(detached(revoke("revoke-expired")))],
  [register, issue("issue"), advance("advance-expiry", "source", "expiry"),
    abandonAfterAdvance("abandon-after-advance")],
  [...evaluationStartedPrefix, reconcile("live", "live")],
  [register, rejected(close("close-without-source-authority"))],
  [register, event("long-issue", "IssueAuthorization", { ...authorization(sourceFence), expiresAt: tick(100) }),
    consume("consume"), at(release("late-release", sourceFence), 60), launchDeadline("launch-deadline")],
  [register, event("long-issue", "IssueAuthorization", { ...authorization(sourceFence), expiresAt: tick(100) }),
    consume("consume"), at(releaseDenied("late-denial", sourceFence), 60), launchDeadline("launch-deadline")],
  [...campaignBuildPrefix, consume("consume", campaignFence), retirement("source-retirement"),
    rejected(detached(release("release")))],
  [register, checkpoint("checkpoint"), at(stop("late-stop"), 60), rejected(detached(recoverStop("early-recovery"))),
    stopDeadline("stop-deadline"), recoverStop("recovery")],
  [register, checkpoint("checkpoint"), stopDeadline("stop-deadline"), recoverStop("recovery"),
    stop("late-stop-after-recovery")],
  [...buildAuthorizedPrefix, buildDeadline("build-deadline"), at(build("late-build", "failed"), 61),
    consistency("late-non-artifact", { type: "non-artifact-match", buildResult: "failed", proofId: proof("late") })],
  [...closedPrefix, issueWithId("build-issue", id.buildAuthorization, campaignFence, "build"),
    event("build-consume", "ConsumeAuthorization", { ...authorization(campaignFence, "build"),
      authorizationId: id.buildAuthorization }), event("build-expiry", "ExpireAuthorization", { ...root,
      authorizationId: id.buildAuthorization, authorizationFence: campaignFence }, 50)],
  [...buildAuthorizedPrefix,
    build("cross-namespace-receipt", "succeeded", C.buildReceiptId("receipt:close"))],
  [...buildAuthorizedPrefix, build("build", "succeeded"),
    consistency("consistency-first", { type: "match", artifactDigest: id.artifact }),
    consistency("consistency-same", { type: "match", artifactDigest: id.artifact },
      buildReceipt("build"), consistencyReceipt("consistency-same"))],
  [...evaluationStartedPrefix, at(attemptReceipt("late-first", "succeeded"), 60),
    at(attemptReceipt("late-conflict", "failed"), 61), attemptDeadline("late-deadline")],
  [register, rejected(build("negative-build", "failed"))],
  ...advanceCauseHistories, [register, rejected(advance("source-analytic", "source", "analytic-stop"))],
];
const prematureDeadlineHistories: readonly (readonly EventSpec[])[] = [
  [register, issue("issue"), rejected(detached(launchDeadline("early-launch", sourceFence, "start-unknown", 59)))],
  [register, rejected(detached(attemptDeadline("early-attempt", "missing", 59)))],
  [register, checkpoint("checkpoint"), rejected(detached(stopDeadline("early-stop", "missing", 59)))],
  [...closedPrefix, rejected(detached(buildDeadline("early-build", "missing", 59)))],
  [...buildAuthorizedPrefix, build("build", "succeeded"),
    rejected(detached(consistencyDeadline("early-consistency", "missing-verifier", 79)))],
];
const scenarioHistories: readonly (readonly EventSpec[])[] = [
  ...raceFamilies.flatMap(family => [false, true].flatMap(reverse =>
    Array.from({ length: family.variants }, (_, variant) => family.history(reverse, variant)))),
  ...regressionHistories,
  ...prematureDeadlineHistories,
];
const protocolEventTypes: readonly C.ProtocolEvent["type"][] = ["RegisterProtocol", "IssueAuthorization",
  "ConsumeAuthorization", "RevokeAuthorization", "ExpireAuthorization", "CloseSource", "AbandonSource",
  "AdvanceFence", "ReleaseProcess", "RecordReleaseDenied", "ObserveCrash", "ReachLaunchDeadline",
  "RestartObserved", "ReconcileRuntime", "RequestRetirement", "RequestCleanup", "CompleteRetirement",
  "RecordAttemptReceipt", "ReachAttemptDeadline", "CheckpointEffective", "RecordStopReceipt",
  "ReachStopDeadline", "RecoverStopFence", "RecordBuildResult", "ReachBuildDeadline",
  "RecordBuildConsistencyReceipt", "ReachBuildConsistencyDeadline", "RecordAdmission"];
test("registered qualification scenarios cover every protocol transition kind", () => {
  const covered = new Set(scenarioHistories.flatMap(history =>
    history.map(spec => spec.body.type as C.ProtocolEvent["type"])));
  assert.deepEqual([...covered].sort(), [...protocolEventTypes].sort());
  regressionHistories.forEach((history, index) => compareHistory(history, `regression ${index + 1}`));
});
test("deadline transitions reject every supported deadline one tick early", () => {
  prematureDeadlineHistories.forEach((history, index) => {
    compareHistory(history, `premature deadline ${index + 1}`);
    const last = foldQualificationHistory(materialize(history), 64, trusted).results.at(-1)!;
    assert.equal(last.decision, "rejected");
    assert.ok(last.effects.some(effect => effect.type === "denial-recorded" &&
      effect.reason === "deadline-not-reached"));
  });
});
test("retirement tombstone is final and failed admission revokes consumed authority", () => {
  const retired = foldQualificationHistory(materialize(retiredCrashHistory), 64, trusted).results;
  assert.equal(retired.at(-1)!.decision, "rejected");
  assert.deepEqual(retired.at(-1)!.terminalProjections.resourceRetirement,
    retired.at(-2)!.terminalProjections.resourceRetirement);
  const failed = foldQualificationHistory(materialize(failedAdmissionAfterConsumedHistory), 64, trusted).results.at(-1)!;
  assert.ok(failed.effects.some(effect => effect.type === "authorization-revoked" &&
    effect.authorizationId === id.otherAuthorization));
});
test("qualification model remains disposable and bounded", () => {
  const files = readdirSync(new URL(".", import.meta.url)).filter(file => /^dogfooding-protocol.*\.ts$/u.test(file)).sort();
  assert.deepEqual(files, ["dogfooding-protocol-contract.ts", "dogfooding-protocol-oracle.ts",
    "dogfooding-protocol-reducer.ts", "dogfooding-protocol.test.ts"]);
  const sources = files.map(file => readFileSync(new URL(file, import.meta.url), "utf8"));
  const lineCount = sources.reduce((sum, source) => sum + source.split(/\r?\n/u).length - 1, 0);
  const byteCount = sources.reduce((sum, source) => sum + Buffer.byteLength(source, "utf8"), 0);
  const longestLine = Math.max(...sources.flatMap(source => source.split(/\r?\n/u).map(line => line.length)));
  assert.ok(lineCount <= 3_000, `qualification model has ${lineCount} physical lines`);
  assert.ok(byteCount <= 225_000, `qualification model has ${byteCount} UTF-8 bytes`);
  assert.ok(longestLine <= 200, `qualification model has a ${longestLine}-character line`);
  for (const source of sources) {
    const localImports = [...source.matchAll(/from\s+["']\.\/([^"']+)["']/gu)].map(match => match[1]!);
    assert.ok(localImports.every(file => files.includes(file)), "qualification imports stay inside the capped closure");
    assert.doesNotMatch(source, /import\s*\(\s*["']\.\//u, "dynamic local imports are forbidden");
  }
});
test("supported fence-advance causes apply the same fail-closed scope revocation", () => {
  advanceCauseHistories.forEach(history => {
    const last = foldQualificationHistory(materialize(history), 64, trusted).results.at(-1)!;
    assert.ok(last.effects.some(effect => effect.type === "authorization-revoked"));
  });
});
test("direct start-unknown requests containment and reconciliation", () => {
  const result = foldQualificationHistory(materialize([register, issue("issue"), consume("consume"),
    launchDeadline("deadline")]), 8, trusted).results.at(-1)!;
  assert.deepEqual(result.effects.filter(effect => effect.type.endsWith("requested") ||
    effect.type === "resource-quarantined").map(effect => effect.type).sort(),
  ["resource-quarantined", "runtime-reconciliation-requested", "runtime-termination-requested"]);
});
test("receipt primitive identity is unique across protocol receipt families", () => {
  const history = [...buildAuthorizedPrefix,
    build("cross-namespace-receipt", "succeeded", C.buildReceiptId("receipt:close"))] as const;
  const result = foldQualificationHistory(materialize(history), 64, trusted).results.at(-1)!;
  assert.equal(result.decision, "accepted");
  assert.equal(result.terminalProjections.claim, "invalid");
  assert.ok(result.effects.some(effect => effect.type === "denial-recorded" &&
    effect.reason === "receipt-replay"));
});
test("trusted bootstrap rejects substituted custody authority", () => {
  const [registration] = materialize([register]);
  const substituted = { ...registration!, custodyAuthorityId: C.custodyAuthorityId("substituted-authority") };
  const [result] = compareEvents([substituted], "substituted bootstrap");
  assert.equal(result!.decision, "rejected");
});
test("retirement tombstones occupy the shared replay namespace", () => {
  const retired = [...retiredBeforeComplete, complete("complete", retiredBeforeComplete, receipt("close"))] as const;
  const reused = event("reused-tombstone", "RecordAdmission", { ...root, admissionId: id.admission,
    receiptId: C.receiptId("tombstone:complete"), result: "accepted" });
  const history = [...retired, rejected(detached(reused))] as const;
  compareHistory(history, "tombstone replay");
  const result = foldQualificationHistory(materialize(history), 64, trusted).results.at(-1)!;
  assert.ok(result.effects.some(effect => effect.type === "denial-recorded" && effect.reason === "receipt-replay"));
});
test("retirement requires the complete retained evidence closure", () => {
  const candidate = complete("incomplete", retiredBeforeComplete, receipt("close"));
  const incomplete = rejected({ ...candidate, body: { ...candidate.body, retainedEvidence: [] } });
  const history = [...retiredBeforeComplete, incomplete] as const;
  compareHistory(history, "incomplete retirement evidence");
  const result = foldQualificationHistory(materialize(history), 64, trusted).results.at(-1)!;
  assert.equal(result.decision, "rejected");
});
test("retirement tombstone cannot reuse an earlier receipt primitive", () => {
  const candidate = complete("collision", retiredBeforeComplete, receipt("close"));
  const collision = rejected({ ...candidate, body: { ...candidate.body,
    tombstoneId: C.tombstoneId("receipt:close") } });
  compareHistory([...retiredBeforeComplete, collision], "tombstone collision");
});
const perturbEvents = (source: readonly C.ProtocolEvent[], selectedIndex: number,
  mutation: number, salt: number): readonly C.ProtocolEvent[] => {
  const events = [...source], index = selectedIndex % events.length, selected = events[index]!;
  if (mutation === 7 && index > 0 && index + 1 < events.length) {
    [events[index], events[index + 1]] = [events[index + 1]!, events[index]!]; return events;
  }
  const changed: Record<string, unknown> = { ...selected };
  if (mutation === 0) changed.custodyAuthorityId = C.custodyAuthorityId(`generated-authority:${salt}`);
  else if (mutation === 1) changed.protocolRevisionId = C.protocolRevisionId(`generated-protocol:${salt}`);
  else if (mutation === 2) changed.authenticatedPredecessorId = C.eventId(`generated-predecessor:${salt}`);
  else if (mutation === 3) changed.authoritativeTick = tick(Math.max(0, Number(selected.authoritativeTick) - salt - 1));
  else if (mutation === 4 && "sourceFamilyRootId" in selected)
    changed.sourceFamilyRootId = C.sourceFamilyRootId(`generated-root:${salt}`);
  else if (mutation === 5 && "authorizationFence" in selected) changed.authorizationFence = {
    ...selected.authorizationFence, expectedGeneration: g(100 + salt),
  };
  else if (mutation === 6) {
    if ("receiptId" in selected) changed.receiptId = C.receiptId("receipt:close");
    else if ("launchReceiptId" in selected) changed.launchReceiptId = C.receiptId("receipt:close");
    else if ("observationReceiptId" in selected) changed.observationReceiptId = C.receiptId("receipt:close");
    else if ("buildReceiptId" in selected) changed.buildReceiptId = C.buildReceiptId("receipt:close");
    else if ("consistencyReceiptId" in selected)
      changed.consistencyReceiptId = C.consistencyReceiptId("receipt:close");
    else changed.custodyAuthorityId = C.custodyAuthorityId(`generated-authority:${salt}`);
  } else changed.custodyAuthorityId = C.custodyAuthorityId(`generated-authority:${salt}`);
  events[index] = changed as unknown as C.ProtocolEvent;
  return events;
};
for (const family of raceFamilies) for (const reverse of [false, true]) {
  test(`${family.name} / ${reverse ? "right-before-left" : "left-before-right"}`, () => {
    for (let variant = 0; variant < family.variants; variant += 1) {
      compareHistory(family.history(reverse, variant), `${family.name} variant ${variant}`);
    }
  });
}
test("every registered race family exercises distinct event orders", () => {
  for (const family of raceFamilies) for (let variant = 0; variant < family.variants; variant += 1) {
    const left = family.history(false, variant).map(spec => spec.label);
    const right = family.history(true, variant).map(spec => spec.label);
    assert.notDeepEqual(left, right, `${family.name} variant ${variant + 1}`);
  }
});
test("bounded randomized scenario perturbations agree with the independent oracle", () => {
  fc.assert(fc.property(
    fc.integer({ min: 0, max: scenarioHistories.length - 1 }), fc.nat(31),
    fc.integer({ min: 0, max: 7 }), fc.nat(31), fc.integer({ min: 1, max: 2 }),
    (scenarioIndex, selectedIndex, mutation, salt, tickStep) => {
      const baseline = materialize(scenarioHistories[scenarioIndex]!, tickStep);
      const events = perturbEvents(baseline, selectedIndex, mutation, salt);
      assert.ok(events.length <= 32, "generated histories remain bounded");
      compareEvents(events, `generated scenario ${scenarioIndex + 1} mutation ${mutation}`);
    },
  ), { seed: 0x415139, numRuns: 500 });
});
