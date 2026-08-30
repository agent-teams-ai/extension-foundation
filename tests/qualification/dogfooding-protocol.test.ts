import assert from "node:assert/strict"; import test from "node:test"; import fc from "fast-check";
import * as C from "./dogfooding-protocol-contract.ts";
import { foldOracleHistory } from "./dogfooding-protocol-oracle.ts"; import { foldQualificationHistory } from "./dogfooding-protocol-reducer.ts";
const id = { protocol: C.protocolRevisionId("protocol"), authority: C.custodyAuthorityId("authority"),
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
const g = (value: number): C.FenceGeneration => C.fenceGeneration(value); const tick = (value: number): C.AuthoritativeTick => C.authoritativeTick(value);
const receipt = (label: string): C.ReceiptId => C.receiptId(`receipt:${label}`); const buildReceipt = (label: string): C.BuildReceiptId => C.buildReceiptId(`build-receipt:${label}`);
const consistencyReceipt = (label: string): C.ConsistencyReceiptId =>
  C.consistencyReceiptId(`consistency-receipt:${label}`);
const proof = (label: string): C.ProofId => C.proofId(`proof:${label}`); const sourceFence: C.AuthorizationFenceBinding = {
  scope: "source", expectedGeneration: g(1), expectedFamilyAllocationGeneration: g(1),
}; const campaignFence: C.AuthorizationFenceBinding = { scope: "campaign", expectedGeneration: g(1) };
interface Envelope {
  readonly eventId: C.EventId; readonly protocolRevisionId: C.ProtocolRevisionId;
  readonly custodyAuthorityId: C.CustodyAuthorityId; readonly authoritativeTick: C.AuthoritativeTick;
  readonly authenticatedPredecessorId: C.EventId | null;
}
interface EventSpec {
  readonly label: string; readonly minimumTick?: number;
  readonly accepted: boolean; readonly extendsLineage: boolean;
  readonly retainedAfterRejection?: boolean;
  readonly body: Readonly<Record<string, unknown>>;
}
const event = (label: string, type: C.ProtocolEvent["type"],
  body: Readonly<Record<string, unknown>> = {}, minimumTick = 0): EventSpec =>
  ({ label, minimumTick, accepted: true, extendsLineage: true, body: { type, ...body } });
const rejected = (spec: EventSpec): EventSpec => ({ ...spec, accepted: false }); const detached = (spec: EventSpec): EventSpec => ({ ...spec, extendsLineage: false });
const retained = (spec: EventSpec): EventSpec => ({ ...spec, retainedAfterRejection: true });
const root = { sourceClaimFamilyId: id.family, sourceFamilyRootId: id.root }; const authorization = (binding: C.AuthorizationFenceBinding,
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
const longIssue = (label: string, binding: C.AuthorizationFenceBinding = sourceFence,
  purpose?: C.LaunchPurpose) => event(label, "IssueAuthorization", {
  ...authorization(binding, purpose), expiresAt: tick(100),
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
const reconcile = (label: string, observation: "live" | "terminated" | "unknown",
  runtimeSafetyWatermarkLabel: string, selectedProofLabel = label) =>
  event(label, "ReconcileRuntime", { ...root, runtimeId: id.runtime, observation,
    runtimeSafetyWatermarkEventId: C.eventId(`event:${runtimeSafetyWatermarkLabel}`),
    proofId: proof(selectedProofLabel) });
const retirement = (label: string, owner = id.owner, lineage = id.lineage) =>
  event(label, "RequestRetirement", { ...root, retirementOwnerId: owner, credentialLineageId: lineage });
const cleanup = (label: string, terminationProofLabel = label, owner = id.owner) => event(label, "RequestCleanup", { ...root,
  runtimeId: id.runtime, retirementOwnerId: owner, credentialLineageId: id.lineage,
  terminationProofId: proof(terminationProofLabel),
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
  const references = history.filter(spec => spec.accepted || spec.retainedAfterRejection === true).flatMap(spec => [
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
      if (spec.extendsLineage) predecessor = selected.eventId;
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
  reconcile("source-terminated", "terminated", "source-release")] as const;
const closedPrefix = [...sourceClosedPrefix, admission("admission", "accepted")] as const;
const buildAuthorizedPrefix = [...closedPrefix,
  issueWithId("build-issue", id.buildAuthorization, campaignFence, "build"),
  event("build-consume", "ConsumeAuthorization", {
    ...authorization(campaignFence, "build"), authorizationId: id.buildAuthorization }),
  release("build-release", campaignFence, "build", id.buildAuthorization)] as const;
const campaignBuildPrefix = [...buildAuthorizedPrefix,
  build("build", "succeeded"), consistency("consistency", { type: "match", artifactDigest: id.artifact }),
  reconcile("build-terminated", "terminated", "build-release"), issue("issue", campaignFence)] as const;
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
      : [releaseDenied("continuation-denial")]),
  ] },
  { name: "5 crash after consume before start confirmation", variants: 1, history: reverse => [
    ...campaignBuildPrefix, consume("consume", campaignFence), ...(reverse
      ? [release("release"), rejected(detached(crash("crash", campaignFence)))]
      : [crash("crash", campaignFence), rejected(detached(release("release")))]),
    reconcile("continuation-reconcile", "unknown", reverse ? "release" : "crash"),
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
        reconcile("continuation-terminated", "terminated",
          variant === 0 ? reverse ? "restart" : "retirement" : "restart"),
        attemptDeadline("continuation-attempt"), cleanup("continuation-cleanup", "continuation-terminated")];
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
        rejected(detached(consistency("continuation-replay", { type: "missing-build", proofId: proof("replay") },
          buildReceipt("build"), consistencyId)))];
    } },
  { name: "11 failed admission after closed source vs retirement", variants: 1, history: reverse => [
    ...(() => { const beforeComplete = [...sourceClosedPrefix,
      ...ordered(reverse, admission("failed-admission", "failed"), retirement("retirement")),
      cleanup("continuation-cleanup", "source-terminated")]; return [...beforeComplete,
        complete("continuation-complete", beforeComplete, receipt("close"))]; })()],
  },
  { name: "12 unknown runtime vs cleanup", variants: 1, history: reverse => [
    ...(() => { const beforeComplete = [register, issue("issue"), consume("consume"), crash("crash"),
      abandon("abandon"), retirement("retirement"),
      ...(reverse ? [rejected(detached(cleanup("cleanup"))), reconcile("unknown", "unknown", "retirement")]
        : [reconcile("unknown", "unknown", "retirement"), rejected(detached(cleanup("cleanup")))]),
      launchDeadline("continuation-deadline"),
      reconcile("continuation-terminated", "terminated", "continuation-deadline"),
      cleanup("continuation-cleanup", "continuation-terminated")];
    return [...beforeComplete, complete("continuation-complete", beforeComplete, receipt("abandon"))]; })()],
  },
];
assert.equal(raceFamilies.length, 12, "the registry must contain exactly twelve race families");
const retiredBeforeComplete = [...sourceClosedPrefix, retirement("retirement"),
  cleanup("cleanup", "source-terminated")] as const;
const retainedClosurePrefix = [...buildAuthorizedPrefix, build("retained-build", "failed"),
  consistency("retained-consistency", { type: "non-artifact-match", buildResult: "failed",
    proofId: proof("retained-consistency") }, buildReceipt("retained-build")),
  reconcile("retained-terminated", "terminated", "build-release"), retirement("retained-retirement"),
  cleanup("retained-cleanup", "retained-terminated")] as const;
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
    rejected(detached(reconcile("post-retirement", "unknown", "source-release")))],
  [...sourceClosedPrefix, retirement("retirement"), cleanup("cleanup", "source-terminated"),
    rejected(detached(cleanup("duplicate-cleanup", "source-terminated")))],
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
    reconcile("build-terminated", "terminated", "build-release"),
    issue("evaluation-issue", campaignFence), consume("evaluation-consume", campaignFence),
    release("evaluation-release"), attemptReceipt("attempt", "succeeded")],
  [register, issue("issue"), expire("expiry"), abandon("abandon-after-expiry")],
  [register, issue("issue"), expire("expiry"), rejected(detached(revoke("revoke-expired")))],
  [register, issue("issue"), advance("advance-expiry", "source", "expiry"),
    abandonAfterAdvance("abandon-after-advance")],
  [...evaluationStartedPrefix, reconcile("live", "live", "release")],
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
    rejected(detached(build("cross-namespace-receipt", "succeeded", C.buildReceiptId("receipt:close"))))],
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
test("supported fence-advance causes apply the same fail-closed scope revocation", () => { advanceCauseHistories.forEach(history => {
  const last = foldQualificationHistory(materialize(history), 64, trusted).results.at(-1)!; assert.ok(last.effects.some(
    effect => effect.type === "authorization-revoked")); }); });
test("a second protocol registration preserves binding precedence and reports immutable finality", () => {
  const duplicate = rejected(event("duplicate-register", "RegisterProtocol", register.body));
  const duplicateResults = compareEvents(materialize([register, duplicate]), "duplicate protocol registration");
  const result = duplicateResults.at(-1)!;
  assert.equal(result.effects.find(effect => effect.type === "denial-recorded")?.reason,
    "terminal-already-recorded");
  assert.deepEqual(result.terminalProjections, duplicateResults[0]!.terminalProjections);
  const foreign = rejected(event("foreign-register", "RegisterProtocol", { ...register.body,
    custodyAuthorityId: C.custodyAuthorityId("foreign-authority") }));
  const foreignResults = compareEvents(materialize([register, foreign]), "foreign protocol registration");
  const denied = foreignResults.at(-1)!;
  assert.equal(denied.effects.find(effect => effect.type === "denial-recorded")?.reason,
    "wrong-binding");
  assert.deepEqual(denied.terminalProjections, foreignResults[0]!.terminalProjections);
});
test("a rejected bootstrap does not advance lineage and a trusted registration can retry", () => {
  const specs = [rejected(detached({ ...register, label: "rejected-bootstrap" })),
    { ...register, label: "trusted-bootstrap-retry" }] as const;
  const events = materialize(specs), rejectedBootstrap = { ...events[0]!,
    custodyAuthorityId: C.custodyAuthorityId("substituted-authority") } as C.ProtocolEvent;
  const results = compareEvents([rejectedBootstrap, events[1]!], "trusted bootstrap retry");
  assert.deepEqual(results.map(item => item.decision), ["rejected", "accepted"]);
  assert.equal(events[1]!.authenticatedPredecessorId, null);
  assert.equal(results[1]!.terminalProjections.claim, "eligible");
});
test("direct start-unknown requests containment and reconciliation", () => { const result = foldQualificationHistory(materialize([register, issue("issue"), consume("consume"),
    launchDeadline("deadline")]), 8, trusted).results.at(-1)!;
  assert.deepEqual(result.effects.filter(effect => effect.type.endsWith("requested") || effect.type === "resource-quarantined").map(effect => effect.type).sort(),
  ["resource-quarantined", "runtime-reconciliation-requested", "runtime-termination-requested"]); });
const assertReplayContainment = (result: C.TransitionResult): void => {
  assert.equal(result.decision, "rejected");
  assert.equal(result.effects.find(effect => effect.type === "denial-recorded")?.reason,
    "receipt-replay");
  for (const expected of ["claim-disposition-set", "resource-quarantined",
    "runtime-reconciliation-requested", "runtime-termination-requested"] as const)
    assert.ok(result.effects.some(effect => effect.type === expected), `missing ${expected}`);
};
test("replayed process-start evidence is rejected but still contained", () => {
  const denied = releaseDenied("prior-denial", sourceFence);
  const candidate = at(release("replayed-start", sourceFence), 61);
  const replayed = rejected(detached({ ...candidate, body: { ...candidate.body,
    launchReceiptId: receipt("prior-denial") } }));
  const history = [register, longIssue("issue"), consume("consume"), denied, replayed] as const;
  compareHistory(history, "replayed process start containment");
  const result = foldQualificationHistory(materialize(history), 8, trusted).results.at(-1)!;
  assertReplayContainment(result);
  assert.ok(result.effects.some(effect => effect.type === "late-receipt-retained" &&
    effect.evidence.type === "launch" && effect.evidence.result === "started"));
  assert.deepEqual([result.terminalProjections.claim, result.terminalProjections.runtime,
    result.terminalProjections.resourceRetirement.type], ["invalid", "unknown", "quarantined"]);
});
test("replayed start-unknown evidence is rejected but still contained", () => {
  const denied = releaseDenied("prior-denial", sourceFence);
  const candidate = launchDeadline("replayed-unknown", sourceFence);
  const replayed = rejected(detached({ ...candidate, body: { ...candidate.body,
    observationReceiptId: receipt("prior-denial") } }));
  const history = [register, longIssue("issue"), consume("consume"), denied, replayed] as const;
  compareHistory(history, "replayed start unknown containment");
  const result = foldQualificationHistory(materialize(history), 8, trusted).results.at(-1)!;
  assertReplayContainment(result);
  assert.deepEqual([result.terminalProjections.claim, result.terminalProjections.runtime,
    result.terminalProjections.resourceRetirement.type], ["invalid", "unknown", "quarantined"]);
});
test("replay containment requires a trusted runtime binding and remains idempotent", () => {
  const denied = releaseDenied("prior-denial", sourceFence);
  const candidate = at(release("replayed-start", sourceFence), 61);
  const replayed = rejected(detached({ ...candidate, body: { ...candidate.body,
    launchReceiptId: receipt("prior-denial") } }));
  const prefix = [register, longIssue("issue"), consume("consume"), denied] as const;
  const events = materialize([...prefix, replayed]);
  const exactReplay = compareEvents([...events, events.at(-1)!],
    "idempotent replayed process start");
  assert.deepEqual(exactReplay.at(-1), exactReplay.at(-2));
  const foreign = rejected(detached({ ...replayed, label: "foreign-replayed-start",
    body: { ...replayed.body, runtimeId: C.runtimeId("foreign-runtime") } }));
  const result = compareEvents(materialize([...prefix, foreign]),
    "foreign replay cannot trigger containment").at(-1)!;
  assert.equal(result.effects.find(effect => effect.type === "denial-recorded")?.reason,
    "wrong-binding");
  assert.equal(result.effects.some(effect => effect.type === "resource-quarantined"), false);
  assert.equal(result.effects.some(effect => effect.type === "runtime-termination-requested"), false);
});
test("replay containment rejects reconciliation observed before its safety watermark", () => {
  const denied = releaseDenied("prior-denial", sourceFence);
  const candidate = at(release("replayed-start", sourceFence), 61);
  const replayed = rejected(detached({ ...candidate, body: { ...candidate.body,
    launchReceiptId: receipt("prior-denial") } }));
  const specs = [register, longIssue("issue"), consume("consume"), denied, replayed,
    rejected(detached(reconcile("stale-reconciliation", "terminated", "replayed-start")))] as const;
  const events = materialize(specs).map(selected => selected.eventId === C.eventId("event:stale-reconciliation") ?
    { ...selected, authoritativeTick: tick(60) } as C.ProtocolEvent : selected);
  const result = compareEvents(events, "replay containment safety watermark").at(-1)!;
  assert.equal(result.effects.find(effect => effect.type === "denial-recorded")?.reason,
    "wrong-binding");
  assert.deepEqual([result.terminalProjections.runtime,
    result.terminalProjections.resourceRetirement.type], ["unknown", "quarantined"]);
});
test("reconciliation and cleanup require the latest safety event and a fresh proof", () => {
  const unsafe = [...sourceClosedPrefix, restart("new-safety-watermark")] as const;
  const invalidReconciliations = [
    reconcile("stale-watermark", "terminated", "source-release"),
    reconcile("reused-proof", "terminated", "new-safety-watermark", "source-terminated"),
  ] as const;
  for (const candidate of invalidReconciliations) {
    const result = compareEvents(materialize([...unsafe, rejected(detached(candidate))]),
      candidate.label).at(-1)!;
    assert.equal(result.effects.find(effect => effect.type === "denial-recorded")?.reason,
      "wrong-binding");
  }
  const staleCleanup = [...unsafe,
    reconcile("fresh-termination", "terminated", "new-safety-watermark"),
    retirement("watermarked-retirement"),
    rejected(detached(cleanup("stale-cleanup-proof", "source-terminated")))] as const;
  const cleanupResult = compareEvents(materialize(staleCleanup), "stale cleanup proof").at(-1)!;
  assert.equal(cleanupResult.effects.find(effect => effect.type === "denial-recorded")?.reason,
    "wrong-binding");
});
test("receipt primitive identity is unique across protocol receipt families", () => { const history = [...evaluationStartedPrefix,
    rejected(detached(attemptReceipt("cross-namespace-receipt", "succeeded", receipt("close"))))] as const;
  const result = foldQualificationHistory(materialize(history), 64, trusted).results.at(-1)!; assert.equal(result.decision, "rejected"); assert.equal(result.terminalProjections.claim, "invalid");
  assert.ok(result.effects.some(effect => effect.type === "denial-recorded" && effect.reason === "receipt-replay")); });
test("receipt replay remains visible after a terminal and closes into retirement evidence", () => {
  const replayedClose = retained(rejected(detached({ ...close("replayed-close"),
    body: { ...close("replayed-close").body, receiptId: receipt("close") } })));
  const beforeComplete = [...sourceClosedPrefix, replayedClose,
    retirement("replay-retirement"), cleanup("replay-cleanup", "source-terminated")] as const;
  const candidate = complete("replay-retirement-complete", beforeComplete, receipt("close"));
  compareHistory([...beforeComplete, candidate], "replayed source terminal retirement closure");
  const replayResult = foldQualificationHistory(materialize(beforeComplete), 64, trusted)
    .results[sourceClosedPrefix.length]!;
  assert.equal(replayResult.decision, "rejected");
  assert.equal(replayResult.effects.find(effect => effect.type === "denial-recorded")?.reason,
    "receipt-replay");
  const retainedEvidence = candidate.body.retainedEvidence as readonly C.EvidenceReference[];
  const replayReference = { type: "event" as const, eventId: C.eventId("event:replayed-close") };
  assert.ok(retainedEvidence.some(reference => JSON.stringify(reference) === JSON.stringify(replayReference)));
  const omitted = rejected({ ...candidate, body: { ...candidate.body,
    retainedEvidence: retainedEvidence.filter(reference =>
      JSON.stringify(reference) !== JSON.stringify(replayReference)) } });
  compareHistory([...beforeComplete, omitted], "replayed source terminal omitted from closure");
});
test("replay-invalid claims block both new and already-issued build authority", () => {
  const replayedClose = rejected(detached({ ...close("build-replay"),
    body: { ...close("build-replay").body, receiptId: receipt("close") } }));
  const newAuthority = rejected(detached(issueWithId("blocked-build-issue",
    id.buildAuthorization, campaignFence, "build")));
  compareHistory([...closedPrefix, replayedClose, newAuthority], "replay blocks new build authority");
  const issuedPrefix = [...closedPrefix,
    issueWithId("issued-build", id.buildAuthorization, campaignFence, "build")] as const;
  const consumeIssued = rejected(detached(event("blocked-build-consume", "ConsumeAuthorization", {
    ...authorization(campaignFence, "build"), authorizationId: id.buildAuthorization,
  })));
  const results = compareEvents(materialize([...issuedPrefix, replayedClose, consumeIssued]),
    "replay blocks issued build authority");
  for (const result of results.slice(-2)) assert.equal(result.terminalProjections.claim, "invalid");
  assert.equal(results.at(-1)!.effects.find(effect => effect.type === "denial-recorded")?.reason,
    "build-not-executable");
});
test("late starts without live authority are retained, invalidated, and contained", () => {
  const cases = [
    { name: "missing", reason: "authorization-unavailable", history: [register,
      at(release("missing-start", sourceFence, "source-authoring", id.otherAuthorization), 61)] },
    { name: "unconsumed", reason: "authorization-unavailable", history: [register,
      longIssue("unconsumed-issue"), at(release("unconsumed-start", sourceFence), 61)] },
    { name: "revoked", reason: "authorization-revoked", history: [register,
      longIssue("revoked-issue"), consume("revoked-consume"), revoke("revoked-authority"),
      at(release("revoked-start", sourceFence), 61)] },
    { name: "expired", reason: "authorization-expired", history: [register,
      issue("expired-issue"), consume("expired-consume"), expire("expired-authority"),
      at(release("expired-start", sourceFence), 61)] },
  ] as const;
  for (const selected of cases) {
    compareHistory(selected.history, `late start ${selected.name}`);
    const result = foldQualificationHistory(materialize(selected.history), 16, trusted).results.at(-1)!;
    assert.equal(result.decision, "accepted");
    assert.deepEqual([result.terminalProjections.claim, result.terminalProjections.runtime,
      result.terminalProjections.resourceRetirement.type], ["invalid", "unknown", "quarantined"]);
    assert.equal(result.effects.find(effect => effect.type === "denial-recorded")?.reason,
      selected.reason);
    for (const effect of ["late-receipt-retained", "resource-quarantined",
      "runtime-reconciliation-requested", "runtime-termination-requested"] as const)
      assert.ok(result.effects.some(candidate => candidate.type === effect));
  }
});
test("a contained late evaluation retains its attempt receipt and can close retirement", () => {
  const beforeComplete = [...campaignBuildPrefix.slice(0, -1),
    longIssue("late-evaluation-issue", campaignFence), consume("late-evaluation-consume", campaignFence),
    at(release("late-evaluation-start"), 61), at(attemptReceipt("late-evaluation-attempt", "succeeded"), 62),
    launchDeadline("late-evaluation-launch-deadline", campaignFence),
    attemptDeadline("late-evaluation-attempt-deadline"),
    reconcile("late-evaluation-terminated", "terminated", "late-evaluation-launch-deadline"),
    retirement("late-evaluation-retirement"),
    cleanup("late-evaluation-cleanup", "late-evaluation-terminated")] as const;
  const events = materialize([...beforeComplete,
    complete("late-evaluation-complete", beforeComplete, receipt("close"))]);
  const results = compareEvents(events, "late evaluation closure");
  const receiptIndex = events.findIndex(candidate => candidate.type === "RecordAttemptReceipt");
  assert.ok(results[receiptIndex]!.effects.some(effect =>
    effect.type === "late-receipt-retained" && effect.evidence.type === "attempt"));
  assert.equal(results.at(-1)!.terminalProjections.resourceRetirement.type, "retired");
});
test("cross-namespace build replay remains in the typed retirement evidence closure", () => { const replayReceipt = C.buildReceiptId("receipt:close");
  const beforeComplete = [...buildAuthorizedPrefix, build("build", "succeeded"),
    retained(rejected(detached(build("cross-namespace-replay", "succeeded", replayReceipt)))),
    consistency("consistency", { type: "match", artifactDigest: id.artifact }),
    reconcile("build-terminated", "terminated", "build-release"), retirement("retirement"),
    cleanup("cleanup", "build-terminated")] as const;
  compareHistory([...beforeComplete, complete("complete-full", beforeComplete, receipt("close"))], "cross-namespace replay complete closure");
  const candidate = complete("complete-omitted", beforeComplete, receipt("close"));
  const retainedEvidence = (candidate.body.retainedEvidence as readonly C.EvidenceReference[])
    .filter(reference => reference.type !== "build-receipt" || reference.buildReceiptId !== replayReceipt);
  const omitted = rejected({ ...candidate, body: { ...candidate.body, retainedEvidence } }); compareHistory([...beforeComplete, omitted], "cross-namespace replay omitted typed receipt"); });
test("retirement freezes state mutations but retains explicit late forensic evidence", () => { const longIssue = event("source-issue-long", "IssueAuthorization", {
    ...authorization(sourceFence), authorizationId: id.otherAuthorization, expiresAt: tick(100) }); const beforeComplete = [register, longIssue,
    event("source-consume", "ConsumeAuthorization", { ...authorization(sourceFence), authorizationId: id.otherAuthorization }),
    release("source-release", sourceFence, "source-authoring", id.otherAuthorization), close("close"),
    reconcile("source-terminated", "terminated", "source-release"), retirement("retirement"),
    cleanup("cleanup", "source-terminated")] as const;
  const tombstone = complete("complete", beforeComplete, receipt("close")), postRetirement = [
    rejected(detached(admission("post-retirement-admission", "accepted"))), rejected(detached(advance("post-retirement-advance"))),
    rejected(detached(attemptDeadline("post-retirement-attempt"))), rejected(detached(checkpoint("post-retirement-checkpoint"))),
    at(release("post-retirement-late-start", sourceFence, "source-authoring", id.otherAuthorization), 61)] as const;
  const history = [...beforeComplete, tombstone, ...postRetirement] as const; compareHistory(history, "post-retirement finality");
  const results = foldQualificationHistory(materialize(history), 64, trusted).results; const finalized = results[beforeComplete.length]!.terminalProjections, late = results.at(-1)!;
  results.slice(beforeComplete.length + 1).forEach(result => assert.deepEqual(result.terminalProjections, finalized)); assert.equal(late.decision, "accepted");
  assert.ok(late.effects.some(effect => effect.type === "late-receipt-retained")); });
test("late starts are contained", () => { const long = event("l", "IssueAuthorization", {
  ...authorization(sourceFence), expiresAt: tick(100) }); const terminal = [register, long, consume("consume"), launchDeadline("deadline")] as const;
  const histories = [[...terminal, at(release("late", sourceFence), 61)], [...terminal, at(releaseDenied("denied", sourceFence), 61)],
    [register, issue("i"), consume("c"), at(release("fresh", sourceFence), 61)]] as const;
  histories.forEach((history, index) => { compareHistory(history, `late ${index}`); const results = foldQualificationHistory(materialize(history), 64, trusted).results,
      last = results.at(-1)!, p = last.terminalProjections, types = last.effects.map(effect => effect.type); assert.ok(types.includes("late-receipt-retained"));
    if (index < 2) assert.deepEqual(p, results.at(-2)!.terminalProjections); else { assert.deepEqual([p.claim, p.runtime, p.resourceRetirement.type], ["invalid", "unknown", "quarantined"]);
      assert.ok(types.includes("runtime-reconciliation-requested") && types.includes("runtime-termination-requested")); } }); });
test("opposite late launch terminals invalidate and contain both orderings through retirement", () => {
  const assertContained = (item: C.TransitionResult, seen: C.ReceiptId, kind: "started" | "release-denied") => {
    assert.equal(item.decision, "accepted"); const effectTypes = item.effects.map(effect => effect.type);
    for (const expected of ["claim-disposition-set", "late-receipt-retained", "resource-quarantined",
      "runtime-reconciliation-requested", "runtime-termination-requested"] as const)
      assert.ok(effectTypes.includes(expected), `missing ${expected}`);
    assert.ok(item.effects.some(effect => effect.type === "late-receipt-retained" && effect.evidence.type === "launch" && effect.evidence.receiptId === seen && effect.evidence.result === kind));
    assert.ok(item.effects.some(effect => effect.type === "claim-disposition-set" && effect.value === "invalid" && effect.evidence.type === "receipt" && effect.evidence.receiptId === seen));
    assert.ok(item.effects.some(effect => effect.type === "resource-quarantined" && effect.sourceFamilyRootId === id.root)); };
  const cases = [{ name: "started-denied", before: [...evaluationStartedPrefix, attemptReceipt("attempt", "succeeded"), retirement("retirement")],
    late: at(releaseDenied("late-denied"), 61), lateReceipt: receipt("late-denied"), post: at(releaseDenied("post-denied"), 65), postReceipt: receipt("post-denied"),
    result: "release-denied", launch: { type: "started", receiptId: receipt("release") } }, { name: "denied-started",
    before: [...campaignBuildPrefix, consume("consume", campaignFence), releaseDenied("denied"), retirement("retirement")], late: at(release("late"), 61),
    launch: { type: "release-denied", receiptId: receipt("denied") }, lateReceipt: receipt("late"), post: at(release("post"), 65), postReceipt: receipt("post"), result: "started" }] as const;
  for (const selected of cases) { const terminalAfterLate = selected.result === "started" ?
      [attemptDeadline(`${selected.name}-attempt`)] : [];
    const beforeComplete = [...selected.before, selected.late, ...terminalAfterLate,
      reconcile(`${selected.name}-terminated`, "terminated", selected.late.label),
      cleanup(`${selected.name}-cleanup`, `${selected.name}-terminated`)];
    const repeated = rejected({ ...selected.post, label: `${selected.name}-receipt-replay` }), history = [...beforeComplete,
      complete(`${selected.name}-complete`, beforeComplete, receipt("close")), selected.post, repeated] as const; compareHistory(history, selected.name);
    const results = foldQualificationHistory(materialize(history), 64, trusted).results, before = results[selected.before.length - 1]!,
      conflict = results[selected.before.length]!, retired = results.at(-3)!, post = results.at(-2)!, replayed = results.at(-1)!;
    assert.equal(before.terminalProjections.claim, "eligible"); assertContained(conflict, selected.lateReceipt, selected.result);
    assert.deepEqual([before, conflict, retired, post].map(item => item.terminalProjections.launch), [selected.launch, selected.launch, selected.launch, selected.launch]);
    assert.deepEqual([conflict.terminalProjections.claim, conflict.terminalProjections.runtime, conflict.terminalProjections.resourceRetirement.type], ["invalid", "unknown", "quarantined"]);
    assert.equal(retired.terminalProjections.resourceRetirement.type, "retired"); assert.deepEqual([post.terminalProjections, replayed.terminalProjections],
      [retired.terminalProjections, retired.terminalProjections]); assertContained(post, selected.postReceipt, selected.result);
    assert.equal(replayed.effects.find(effect => effect.type === "denial-recorded")?.reason, "receipt-replay"); } });
test("same-result late launch evidence remains forensic-only while authority is valid", () => {
  const longEvaluation = [...campaignBuildPrefix.slice(0, -1), longIssue("long-evaluation", campaignFence),
    consume("long-evaluation-consume", campaignFence), release("long-evaluation-release")];
  const longDenial = [...campaignBuildPrefix.slice(0, -1), longIssue("long-denial", campaignFence),
    consume("long-denial-consume", campaignFence), releaseDenied("same-denied")];
  const cases = [[...longEvaluation, at(release("late-started-same"), 61)],
    [...longDenial, at(releaseDenied("same-late-denied"), 61)]] as const; cases.forEach((history, index) => {
    compareHistory(history, `same-result late launch ${index + 1}`); const results = foldQualificationHistory(materialize(history), 64, trusted).results, last = results.at(-1)!;
    assert.deepEqual(last.effects.map(effect => effect.type), ["late-receipt-retained"]); assert.deepEqual(last.terminalProjections, results.at(-2)!.terminalProjections); }); });
test("a contradictory release denial invalidates and contains before the launch deadline", () => {
  const result = compareEvents(materialize([...evaluationStartedPrefix,
    releaseDenied("immediate-contradiction")]), "immediate launch contradiction").at(-1)!;
  assert.equal(result.decision, "accepted");
  assert.deepEqual([result.terminalProjections.claim, result.terminalProjections.runtime,
    result.terminalProjections.resourceRetirement.type], ["invalid", "unknown", "quarantined"]);
  assert.ok(result.effects.some(effect => effect.type === "runtime-termination-requested"));
});
test("launch deadline validates binding before reporting a premature deadline", () => { const candidate = launchDeadline("early-wrong-binding", sourceFence, "start-unknown", 59);
  const wrongBinding = rejected({ ...candidate, body: { ...candidate.body, sourceFamilyRootId: C.sourceFamilyRootId("wrong-root") } });
  const history = [register, issue("issue"), consume("consume"), wrongBinding] as const; compareHistory(history, "binding before launch deadline");
  const result = foldQualificationHistory(materialize(history), 8, trusted).results.at(-1)!; assert.ok(result.effects.some(
    effect => effect.type === "denial-recorded" && effect.reason === "wrong-binding")); });
test("trusted bootstrap rejects substituted custody authority", () => { const [registration] = materialize([register]);
  const substituted = { ...registration!, custodyAuthorityId: C.custodyAuthorityId("substituted-authority") };
  const [result] = compareEvents([substituted], "substituted bootstrap"); assert.equal(result!.decision, "rejected"); });
test("retirement tombstones occupy the shared replay namespace", () => { const retired = [...retiredBeforeComplete, complete("complete", retiredBeforeComplete, receipt("close"))] as const;
  const reused = event("reused-tombstone", "RecordAdmission", { ...root, admissionId: id.admission, receiptId: C.receiptId("tombstone:complete"), result: "accepted" });
  const history = [...retired, rejected(detached(reused))] as const; compareHistory(history, "tombstone replay");
  const result = foldQualificationHistory(materialize(history), 64, trusted).results.at(-1)!;
  assert.ok(result.effects.some(effect => effect.type === "denial-recorded" && effect.reason === "receipt-replay")); });
test("retirement requires the complete retained evidence closure", () => { const candidate = complete("retained-complete", retainedClosurePrefix, receipt("close"));
  const retained = candidate.body.retainedEvidence as readonly C.EvidenceReference[]; const sourceKeys = new Set([JSON.stringify({ type: "event", eventId: C.eventId("event:close") }),
    JSON.stringify({ type: "receipt", receiptId: receipt("close") })]); assert.ok([...sourceKeys].every(key => retained.some(reference => JSON.stringify(reference) === key)));
  const removable = retained.map((reference, index) => ({ reference, index }))
    .filter(({ reference }) => !sourceKeys.has(JSON.stringify(reference))); assert.deepEqual([...new Set(removable.map(({ reference }) => reference.type))].sort(),
    ["build-receipt", "consistency-receipt", "event", "proof", "receipt"]);
  const accepted = compareEvents(materialize([...retainedClosurePrefix, candidate]), "complete retirement evidence"); assert.equal(accepted.at(-1)!.decision, "accepted");
  for (const { reference, index } of removable) { const incomplete = rejected({ ...candidate, body: { ...candidate.body,
      retainedEvidence: retained.filter((_item, retainedIndex) => retainedIndex !== index) } }); const results = compareEvents(materialize([...retainedClosurePrefix, incomplete]),
      `retirement evidence missing ${JSON.stringify(reference)}`); const result = results.at(-1)!; assert.equal(result.decision, "rejected");
    assert.deepEqual(result.effects.filter(effect => effect.type === "denial-recorded").map(effect => effect.reason), ["wrong-binding"]); } });
test("retirement tombstone cannot reuse an earlier receipt primitive", () => { const candidate = complete("collision", retiredBeforeComplete, receipt("close"));
  const collision = retained(rejected(detached({ ...candidate,
    body: { ...candidate.body, tombstoneId: C.tombstoneId("receipt:close") } })));
  const afterCollision = [...retiredBeforeComplete, collision] as const;
  compareHistory(afterCollision, "tombstone collision");
  const result = foldQualificationHistory(materialize(afterCollision), 64, trusted)
    .results.at(-1)!;
  assert.equal(result.effects.find(effect => effect.type === "denial-recorded")?.reason,
    "receipt-replay");
  compareHistory([...afterCollision,
    complete("after-tombstone-collision", afterCollision, receipt("close"))],
  "valid tombstone after replay collision");
});
test("retirement requires an explicit request and terminal observations for started work", () => {
  const noRequest = [register, issue("no-request-issue"), consume("no-request-consume"),
    crash("no-request-crash"), abandon("no-request-abandon"),
    reconcile("no-request-terminated", "terminated", "no-request-crash"),
    rejected(detached(cleanup("no-request-cleanup")))] as const;
  compareHistory(noRequest, "cleanup without retirement request");
  const unfinishedBuild = [...buildAuthorizedPrefix,
    reconcile("unfinished-build-terminated", "terminated", "build-release"),
    retirement("unfinished-build-retirement"),
    cleanup("unfinished-build-cleanup", "unfinished-build-terminated")] as const;
  const unfinishedEvaluation = [...evaluationStartedPrefix,
    reconcile("unfinished-evaluation-terminated", "terminated", "release"),
    retirement("unfinished-evaluation-retirement"),
    cleanup("unfinished-evaluation-cleanup", "unfinished-evaluation-terminated")] as const;
  for (const [name, prefix] of [["build", unfinishedBuild],
    ["evaluation", unfinishedEvaluation]] as const) {
    const candidate = rejected(complete(`unfinished-${name}-complete`, prefix, receipt("close")));
    compareHistory([...prefix, candidate], `unfinished ${name} retirement`);
    const result = foldQualificationHistory(materialize([...prefix, candidate]), 64, trusted)
      .results.at(-1)!;
    assert.equal(result.effects.find(effect => effect.type === "denial-recorded")?.reason,
      "gate-closed");
  }
});
const postRetirementReplayPrefix = [...retainedClosurePrefix, complete("replay-complete", retainedClosurePrefix, receipt("close"))] as const;
const retiredReplayCases = [{ name: "build", event: rejected(detached(build("retired-build", "failed", buildReceipt("retained-build")))), evidence: {
  type: "build-receipt", buildReceiptId: buildReceipt("retained-build") } }, { name: "consistency", event: rejected(detached(consistency("retired-consistency",
  { type: "invalid", proofId: proof("replay") }, buildReceipt("retained-build"), consistencyReceipt("retained-consistency")))), evidence: {
  type: "consistency-receipt", consistencyReceiptId: consistencyReceipt("retained-consistency") } }] as const;
for (const selected of retiredReplayCases) test(`post-retirement ${selected.name} replay preserves typed fail-closed effects`, () => {
  const history = [...postRetirementReplayPrefix, selected.event] as const; compareHistory(history, `post-retirement ${selected.name} replay`);
  const results = foldQualificationHistory(materialize(history), 64, trusted).results, prior = results.at(-2)!, next = results.at(-1)!, fx = next.effects;
  assert.deepEqual(next.terminalProjections, prior.terminalProjections); assert.deepEqual(fx.map(item => item.type).sort(), ["claim-disposition-set", "denial-recorded", "execution-gate-set"]);
  assert.ok(fx.some(item => item.type === "denial-recorded" && item.reason === "receipt-replay")); assert.ok(fx.some(item => item.type === "execution-gate-set" && item.value === "denied"));
  assert.ok(fx.some(item => item.type === "claim-disposition-set" && item.value === "invalid" && JSON.stringify(item.evidence) === JSON.stringify(selected.evidence))); });
test("post-retirement replay still validates build binding", () => { const candidate = build("wrong-build", "failed", buildReceipt("retained-build")), wrong = rejected({ ...candidate,
    body: { ...candidate.body, sourceFamilyRootId: C.sourceFamilyRootId("wrong-root") } });
  const results = compareEvents(materialize([...postRetirementReplayPrefix, wrong]), "post-retirement wrong-binding replay"), frozen = results.at(-2)!, denied = results.at(-1)!;
  assert.deepEqual(denied.terminalProjections, frozen.terminalProjections); assert.equal(denied.effects.find(effect => effect.type === "denial-recorded")?.reason, "wrong-binding"); });
test("post-retirement consistency with a foreign build receipt stays visible and invalid", () => {
  const wrong = consistency("foreign-retired-consistency", { type: "non-artifact-match",
    buildResult: "failed", proofId: proof("retained-consistency") }, buildReceipt("foreign"));
  const results = compareEvents(materialize([...postRetirementReplayPrefix, wrong]),
    "post-retirement foreign build receipt"), frozen = results.at(-2)!, invalid = results.at(-1)!;
  assert.deepEqual(invalid.terminalProjections, frozen.terminalProjections);
  assert.ok(invalid.effects.some(effect => effect.type === "late-receipt-retained"));
  assert.ok(invalid.effects.some(effect => effect.type === "claim-disposition-set" && effect.value === "invalid"));
});
test("post-retirement unsafe starts retain containment until reconciliation proves termination", () => {
  const beforeComplete = [register, longIssue("retired-source-issue"),
    consume("retired-source-consume"), release("retired-source-release", sourceFence),
    close("retired-source-close"),
    reconcile("retired-source-terminated", "terminated", "retired-source-release"),
    retirement("retired-source-retirement"),
    cleanup("retired-source-cleanup", "retired-source-terminated")] as const;
  const finalized = complete("retired-source-complete", beforeComplete, receipt("retired-source-close"));
  const history = [...beforeComplete, finalized,
    at(release("post-retirement-unsafe-start", sourceFence), 61),
    reconcile("post-retirement-unknown", "unknown", "post-retirement-unsafe-start"),
    reconcile("post-retirement-live", "live", "post-retirement-unknown"),
    reconcile("post-retirement-terminated", "terminated", "post-retirement-live")] as const;
  compareHistory(history, "post-retirement containment reconciliation");
  const results = foldQualificationHistory(materialize(history), 64, trusted).results;
  const frozen = results[beforeComplete.length]!.terminalProjections;
  results.slice(beforeComplete.length + 1).forEach(result =>
    assert.deepEqual(result.terminalProjections, frozen));
  const unsafe = results[beforeComplete.length + 1]!;
  assert.ok(unsafe.effects.some(effect => effect.type === "runtime-reconciliation-requested"));
  assert.ok(unsafe.effects.some(effect => effect.type === "runtime-termination-requested"));
  assert.ok(results.at(-2)!.effects.some(effect => effect.type === "runtime-termination-requested"));
  assert.deepEqual(results.at(-1)!.effects, []);
});
test("post-retirement starts are contained even before the original launch deadline", () => {
  const beforeComplete = [register, longIssue("early-retired-issue"), consume("early-retired-consume"),
    release("early-retired-release", sourceFence), close("early-retired-close"),
    reconcile("early-retired-terminated", "terminated", "early-retired-release"),
    retirement("early-retired-retirement"),
    cleanup("early-retired-cleanup", "early-retired-terminated")] as const;
  const finalized = complete("early-retired-complete", beforeComplete, receipt("early-retired-close"));
  const results = compareEvents(materialize([...beforeComplete, finalized,
    release("early-post-retirement-start", sourceFence)]), "early post-retirement start");
  const unsafe = results.at(-1)!;
  assert.equal(unsafe.decision, "accepted");
  for (const expected of ["claim-disposition-set", "resource-quarantined",
    "runtime-reconciliation-requested", "runtime-termination-requested"] as const)
    assert.ok(unsafe.effects.some(effect => effect.type === expected), `missing ${expected}`);
  assert.deepEqual(unsafe.terminalProjections, results.at(-2)!.terminalProjections);
});
test("fresh start-unknown after retirement opens private containment and keeps the tombstone frozen", () => {
  const finalized = complete("unknown-after-retirement-complete", retiredBeforeComplete, receipt("close"));
  const unknown = launchDeadline("unknown-after-retirement", sourceFence);
  const boundUnknown = { ...unknown, body: { ...unknown.body,
    authorizationId: id.otherAuthorization } } as EventSpec;
  const history = [...retiredBeforeComplete, finalized, boundUnknown,
    reconcile("unknown-after-retirement-terminated", "terminated", boundUnknown.label)] as const;
  const results = compareEvents(materialize(history), "post-retirement start unknown"), frozen = results.at(-3)!;
  const contained = results.at(-2)!;
  assert.equal(contained.decision, "accepted");
  assert.ok(contained.effects.some(effect => effect.type === "late-receipt-retained" &&
    effect.evidence.type === "launch" && effect.evidence.result === "start-unknown"));
  assert.ok(contained.effects.some(effect => effect.type === "runtime-termination-requested"));
  assert.deepEqual([contained.terminalProjections, results.at(-1)!.terminalProjections],
    [frozen.terminalProjections, frozen.terminalProjections]);
});
test("typed receipt replays deny execution without advancing authenticated lineage", () => {
  const replay = rejected(detached(build("typed-replay", "succeeded", C.buildReceiptId("receipt:close"))));
  const results = compareEvents(materialize([...buildAuthorizedPrefix, replay,
    reconcile("typed-replay-terminated", "terminated", "build-release")]), "typed replay lineage");
  const denied = results.at(-2)!;
  assert.equal(denied.decision, "rejected");
  assert.ok(denied.effects.some(effect => effect.type === "execution-gate-set" && effect.value === "denied"));
  assert.equal(results.at(-1)!.decision, "accepted");
});
test("post-retirement replayed starts keep the tombstone frozen and open private containment", () => {
  const beforeComplete = [register, longIssue("retired-replay-issue"),
    consume("retired-replay-consume"), release("retired-replay-release", sourceFence),
    close("retired-replay-close"),
    reconcile("retired-replay-terminated", "terminated", "retired-replay-release"),
    retirement("retired-replay-retirement"),
    cleanup("retired-replay-cleanup", "retired-replay-terminated")] as const;
  const finalized = complete("retired-replay-complete", beforeComplete,
    receipt("retired-replay-close"));
  const start = at(release("post-retirement-replayed-start", sourceFence), 61);
  const unknown = at(launchDeadline("post-retirement-replayed-unknown", sourceFence), 61);
  const cases = [{ name: "started", replayed: rejected(detached({ ...start,
    body: { ...start.body, launchReceiptId: receipt("retired-replay-release") } })) },
  { name: "start-unknown", replayed: rejected(detached({ ...unknown,
    body: { ...unknown.body, observationReceiptId: receipt("retired-replay-release") } })) }] as const;
  for (const selected of cases) {
    const stale = rejected(detached(reconcile(`${selected.name}-replayed-stale`, "terminated",
      selected.replayed.label)));
    const history = [...beforeComplete, finalized, selected.replayed, stale,
      reconcile(`${selected.name}-replayed-live`, "live", selected.replayed.label),
      reconcile(`${selected.name}-replayed-terminated`, "terminated",
        `${selected.name}-replayed-live`)] as const;
    const events = materialize(history).map(candidate =>
      candidate.eventId === C.eventId(`event:${selected.name}-replayed-stale`) ?
        { ...candidate, authoritativeTick: tick(60) } as C.ProtocolEvent : candidate);
    const results = compareEvents(events, `post-retirement ${selected.name} replay containment`);
    const frozen = results[beforeComplete.length]!.terminalProjections;
    results.slice(beforeComplete.length + 1).forEach(result =>
      assert.deepEqual(result.terminalProjections, frozen));
    assertReplayContainment(results[beforeComplete.length + 1]!);
    assert.equal(results[beforeComplete.length + 2]!.effects.find(effect =>
      effect.type === "denial-recorded")?.reason, "wrong-binding");
    assert.ok(results.at(-2)!.effects.some(effect =>
      effect.type === "runtime-termination-requested"));
    assert.deepEqual(results.at(-1)!.effects, []);
  }
});
test("exact replay after retirement is idempotent after finality rewriting", () => {
  const retired = [...retiredBeforeComplete,
    complete("idempotent-complete", retiredBeforeComplete, receipt("close"))] as const;
  const reused = rejected(detached(event("idempotent-replay", "RecordAdmission", {
    ...root, admissionId: id.admission, receiptId: C.receiptId("tombstone:idempotent-complete"),
    result: "accepted",
  })));
  const firstPass = materialize([...retired, reused]);
  const replayedEvent = firstPass.at(-1)!;
  const results = compareEvents([...firstPass, replayedEvent], "exact post-retirement replay");
  assert.deepEqual(results.at(-1), results.at(-2));
  assert.deepEqual(results.at(-1)!.terminalProjections,
    results[firstPass.length - 2]!.terminalProjections);
});
test("alternating late launch evidence uses the full history across deadline interleavings", () => {
  const prefix = [register, longIssue("alternating-issue"), consume("alternating-consume")] as const;
  const histories = [
    [...prefix, launchDeadline("alternating-deadline"),
      at(release("alternating-start-one", sourceFence), 61),
      at(releaseDenied("alternating-denied", sourceFence), 62),
      at(release("alternating-start-two", sourceFence), 63)],
    [...prefix, at(release("interleaved-start-one", sourceFence), 61),
      launchDeadline("interleaved-deadline", sourceFence, "start-unknown", 62),
      at(releaseDenied("interleaved-denied", sourceFence), 63),
      at(release("interleaved-start-two", sourceFence), 64)],
  ] as const;
  histories.forEach((history, index) => {
    compareHistory(history, `alternating late launch ${index + 1}`);
    const results = foldQualificationHistory(materialize(history), 16, trusted).results;
    for (const result of results.slice(-2)) {
      assert.equal(result.terminalProjections.claim, "invalid");
      assert.ok(result.effects.some(effect => effect.type === "claim-disposition-set" &&
        effect.value === "invalid"));
      assert.ok(result.effects.some(effect => effect.type === "runtime-reconciliation-requested"));
    }
  });
});
const mutationOperators = ["custody-authority", "protocol-revision", "predecessor", "tick",
  "source-root", "authorization-fence", "receipt-rewrite"] as const;
type MutationOperator = typeof mutationOperators[number];
const receiptFields = ["receiptId", "launchReceiptId", "observationReceiptId", "buildReceiptId", "consistencyReceiptId", "sourceTerminalReceiptId", "tombstoneId"] as const;
type ReceiptField = typeof receiptFields[number];
interface PerturbationTarget { readonly operator: MutationOperator; readonly scenario: number; readonly index: number; readonly field?: ReceiptField; readonly replacement?: string }
const ownedReceipt = (event: C.ProtocolEvent): string | null => {
  switch (event.type) {
    case "CloseSource": case "AbandonSource": case "RecordReleaseDenied": case "RecordAttemptReceipt":
    case "RecordStopReceipt": case "RecordAdmission": return event.receiptId;
    case "ReleaseProcess": return event.launchReceiptId;
    case "ReachLaunchDeadline": case "ReachAttemptDeadline": case "ReachStopDeadline":
    case "ReachBuildDeadline": case "ReachBuildConsistencyDeadline": return event.observationReceiptId;
    case "RecordBuildResult": return event.buildReceiptId;
    case "RecordBuildConsistencyReceipt": return event.consistencyReceiptId;
    case "CompleteRetirement": return event.tombstoneId; default: return null; } };
const perturbationTargets: readonly PerturbationTarget[] = scenarioHistories.flatMap((history, scenario) => {
  const events = materialize(history), targets: PerturbationTarget[] = [];
  events.forEach((selected, index) => {
    for (const operator of mutationOperators.slice(0, 4)) targets.push({ operator, scenario, index });
    if ("sourceFamilyRootId" in selected) targets.push({ operator: "source-root", scenario, index });
    if ("authorizationFence" in selected) targets.push({ operator: "authorization-fence", scenario, index });
    if (history[index]!.accepted) for (const field of receiptFields) if (field in selected) {
      const current = (selected as unknown as Record<string, string>)[field];
      const prior = events.slice(0, index).flatMap((event, priorIndex) =>
        history[priorIndex]!.accepted && ownedReceipt(event) !== null ? [ownedReceipt(event)!] : []);
      for (const replacement of new Set(prior)) if (replacement !== current)
        targets.push({ operator: "receipt-rewrite", scenario, index, field, replacement }); } });
  return targets; });
const targetTypes = (target: PerturbationTarget): readonly C.ProtocolEvent["type"][] => {
  const events = materialize(scenarioHistories[target.scenario]!);
  return [events[target.index]!.type]; };
const requiredTargets = new Map<string, PerturbationTarget>();
const requireTarget = (target: PerturbationTarget | undefined): void => { assert.ok(target !== undefined);
  requiredTargets.set(JSON.stringify(target), target); };
for (const operator of mutationOperators)
  requireTarget(perturbationTargets.find(target => target.operator === operator));
const commonEnvelopeOperators: ReadonlySet<MutationOperator> = new Set([
  "custody-authority", "protocol-revision", "predecessor",
]);
for (const type of protocolEventTypes) if (![...requiredTargets.values()].filter(target =>
  !commonEnvelopeOperators.has(target.operator)).flatMap(targetTypes).includes(type))
  requireTarget(perturbationTargets.find(target => !commonEnvelopeOperators.has(target.operator) &&
    targetTypes(target).includes(type)));
for (const field of receiptFields)
  requireTarget(perturbationTargets.find(target => target.operator === "receipt-rewrite" && target.field === field));
const applyPerturbation = (target: PerturbationTarget, salt: number, tickStep: number) => {
  const specs = scenarioHistories[target.scenario]!, baseline = materialize(specs, tickStep);
  const events = [...baseline], selected = events[target.index]!, changed: Record<string, unknown> = { ...selected };
  if (target.operator === "custody-authority") changed.custodyAuthorityId = C.custodyAuthorityId(`generated-authority:${salt}`);
  else if (target.operator === "protocol-revision") changed.protocolRevisionId = C.protocolRevisionId(`generated-protocol:${salt}`);
  else if (target.operator === "predecessor") changed.authenticatedPredecessorId = C.eventId(`generated-predecessor:${salt}`);
  else if (target.operator === "tick") changed.authoritativeTick = tick(Number(selected.authoritativeTick) + salt + 1);
  else if (target.operator === "source-root") changed.sourceFamilyRootId = C.sourceFamilyRootId(`generated-root:${salt}`);
  else if (target.operator === "authorization-fence") changed.authorizationFence = {
    ...(selected as Extract<C.ProtocolEvent, { readonly authorizationFence: unknown }>).authorizationFence,
    expectedGeneration: g(100 + salt) };
  else if (target.operator === "receipt-rewrite") changed[target.field!] = target.replacement;
  events[target.index] = changed as unknown as C.ProtocolEvent;
  assert.notDeepEqual(events[target.index], baseline[target.index], "record mutation");
  assert.notDeepEqual(events, baseline, "history mutation");
  return { baseline, events, types: targetTypes(target) }; };
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
test("500 bounded perturbations agree with the oracle", () => {
  const entropy = fc.record({ selector: fc.nat(), salt: fc.nat(31), tickStep: fc.integer({ min: 1, max: 2 }) });
  fc.assert(fc.property(fc.array(entropy, { minLength: 500, maxLength: 500 }), batch => {
    const operators = new Set<MutationOperator>(), types = new Set<C.ProtocolEvent["type"]>();
    const fields = new Set<ReceiptField>(), required = [...requiredTargets.values()];
    batch.forEach(({ selector, salt, tickStep }, index) => {
      const target = required[index] ?? perturbationTargets[selector % perturbationTargets.length]!;
      const mutation = applyPerturbation(target, salt, tickStep);
      assert.ok(mutation.events.length <= 32);
      compareEvents(mutation.events, `generated ${JSON.stringify(target)}`);
      operators.add(target.operator);
      mutation.types.forEach(type => types.add(type));
      if (target.field !== undefined) fields.add(target.field);
    });
    assert.equal(batch.length, 500);
    assert.deepEqual([...operators].sort(), [...mutationOperators].sort());
    assert.deepEqual([...types].sort(), [...protocolEventTypes].sort());
    assert.deepEqual([...fields].sort(), [...receiptFields].sort());
  }), { seed: 0x415139, numRuns: 1 });
});
