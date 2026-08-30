import assert from "node:assert/strict"; import { readFileSync, realpathSync, statSync } from "node:fs";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path"; import test from "node:test"; import { fileURLToPath } from "node:url"; import fc from "fast-check";
import { parseSync, Visitor } from "oxc-parser"; import * as C from "./dogfooding-protocol-contract.ts";
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
  readonly body: Readonly<Record<string, unknown>>;
}
const event = (label: string, type: C.ProtocolEvent["type"],
  body: Readonly<Record<string, unknown>> = {}, minimumTick = 0): EventSpec =>
  ({ label, minimumTick, accepted: true, extendsLineage: true, body: { type, ...body } });
const rejected = (spec: EventSpec): EventSpec => ({ ...spec, accepted: false }); const detached = (spec: EventSpec): EventSpec => ({ ...spec, extendsLineage: false });
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
const retainedClosurePrefix = [...buildAuthorizedPrefix, build("retained-build", "failed"),
  consistency("retained-consistency", { type: "non-artifact-match", buildResult: "failed",
    proofId: proof("retained-consistency") }, buildReceipt("retained-build")),
  reconcile("retained-terminated", "terminated"), retirement("retained-retirement"),
  cleanup("retained-cleanup")] as const;
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
const modelEntry = realpathSync(fileURLToPath(import.meta.url)); const repositoryRoot = realpathSync(resolve(dirname(modelEntry), "..", ".."));
const inside = (path: string, parent: string): boolean => { const relation = relative(parent, path);
  return relation === "" || (!isAbsolute(relation) && relation !== ".." && !relation.startsWith(`..${sep}`)); };
const dependencySpecifiers = (path: string, source: string): readonly string[] => { const parsed = parseSync(path, source), specifiers: string[] = [];
  assert.equal(parsed.errors.length, 0, parsed.errors.map(error => error.message).join("\n"));
  const literal = (node: { readonly type: string; readonly value?: unknown } | null | undefined): void => { assert.ok(node?.type === "Literal" && typeof node.value === "string",
      `${relative(repositoryRoot, path)} has a non-literal module loader`); specifiers.push(node.value); };
  const named = (node: { readonly type: string; readonly name?: unknown }, name: string): boolean =>
    node.type === "Identifier" && node.name === name; new Visitor({ ImportDeclaration: node => literal(node.source), ExportAllDeclaration: node => literal(node.source),
    ExportNamedDeclaration: node => { if (node.source !== null) literal(node.source); }, ImportExpression: node => literal(node.source), TSImportType: node => literal(node.source),
    CallExpression: node => { const { callee } = node; const member = callee.type === "MemberExpression" && !callee.computed ? callee : null;
      const loader = named(callee, "require") || member !== null && (
        named(member.object, "require") && named(member.property, "resolve") ||
        named(member.object, "module") && named(member.property, "require") ||
        member.object.type === "MetaProperty" && named(member.object.meta, "import") &&
          named(member.object.property, "meta") && named(member.property, "resolve")); if (loader) literal(node.arguments[0]); },
  }).visit(parsed.program); return [...new Set(specifiers)]; }; type LocalAliases = Readonly<Record<string, readonly string[]>>;
const qualificationAliases = { "#qualification/*": ["tests/qualification/*"] } as const satisfies LocalAliases;
const aliasTargets = (specifier: string, aliases: LocalAliases): readonly string[] =>
  Object.entries(aliases).flatMap(([pattern, targets]) => { const wildcard = pattern.indexOf("*"), prefix = pattern.slice(0, wildcard < 0 ? pattern.length : wildcard);
    const suffix = wildcard < 0 ? "" : pattern.slice(wildcard + 1); const match = wildcard < 0 ? pattern === specifier ? "" : null :
      specifier.startsWith(prefix) && specifier.endsWith(suffix) ?
        specifier.slice(prefix.length, specifier.length - suffix.length) : null; return match === null ? [] : targets.map(target => target.replace("*", match)); });
const resolveSourceDependency = (specifier: string, containingFile: string, aliases: LocalAliases): string | null => {
  if (specifier.startsWith("node:")) return null; const targets = aliasTargets(specifier, aliases);
  const local = /^(?:\.{1,2}(?:[/\\]|$)|[/\\]|file:)/u.test(specifier) || specifier.startsWith("#") || targets.length > 0; if (!local) return null; let candidates: readonly string[];
  try { candidates = specifier.startsWith("file:") ? [fileURLToPath(specifier)] : targets.length > 0 ?
    targets.map(target => resolve(repositoryRoot, target)) :
    [isAbsolute(specifier) ? specifier : resolve(dirname(containingFile), specifier)]; }
  catch { assert.fail(`${relative(repositoryRoot, containingFile)} has unresolvable local import ${specifier}`); }
  for (const candidate of candidates) try { const canonical = realpathSync(candidate); assert.ok(inside(canonical, repositoryRoot) && !canonical.split(sep).includes("node_modules"),
      `${relative(repositoryRoot, containingFile)} local import ${specifier} escapes the repository`); if (statSync(canonical).isFile()) return canonical;
  } catch (error) { if (error instanceof assert.AssertionError) throw error; } assert.fail(`${relative(repositoryRoot, containingFile)} has unresolvable local import ${specifier}`); };
interface CappedSource { readonly text: string } const sourceClosure = (entry: string, aliases: LocalAliases): ReadonlyMap<string, CappedSource> => {
  const pending = [entry], sources = new Map<string, CappedSource>(); while (pending.length > 0) { const path = pending.pop()!; if (sources.has(path)) continue;
    const bytes = readFileSync(path), text = new TextDecoder("utf-8", { fatal: true }).decode(bytes); sources.set(path, { text }); if (!/\.(?:[cm]?[jt]sx?)$/u.test(path)) continue;
    for (const specifier of dependencySpecifiers(path, text)) { const dependency = resolveSourceDependency(specifier, path, aliases); if (dependency !== null) pending.push(dependency); }
  } return sources; }; test("qualification source closure recognizes static and dynamic loading forms", () => {
  const source = `import value from "./static.ts"; import "./side-effect.ts"; export * from "../export.ts";\n` +
    `type Imported = import("#type-alias").Imported; void import("./dynamic.ts");\n` +
    `require("./required.ts"); import.meta.resolve("#qualification/resolved.ts"); void value;`; assert.deepEqual([...dependencySpecifiers("fixture.ts", source)].sort(),
    ["#qualification/resolved.ts", "#type-alias", "../export.ts", "./dynamic.ts", "./required.ts", "./side-effect.ts", "./static.ts"].sort());
  assert.throws(() => dependencySpecifiers("fixture.ts", "void import(dynamicPath)"), /non-literal module loader/u); }); test("qualification model remains disposable and bounded", () => {
  assert.equal(resolveSourceDependency("#qualification/dogfooding-protocol-contract.ts", modelEntry,
    qualificationAliases), realpathSync(resolve(dirname(modelEntry), "dogfooding-protocol-contract.ts")));
  assert.throws(() => resolveSourceDependency("../missing-local.ts", modelEntry, qualificationAliases), /unresolvable local import/u);
  assert.throws(() => resolveSourceDependency("#qualification/missing-local.ts", modelEntry, qualificationAliases),
    /unresolvable local import/u); const sources = sourceClosure(modelEntry, qualificationAliases);
  assert.deepEqual([...sources.keys()].map(path => relative(dirname(modelEntry), path)).sort(), [
    "dogfooding-protocol-contract.ts", "dogfooding-protocol-oracle.ts", "dogfooding-protocol-reducer.ts", "dogfooding-protocol.test.ts"]);
  const physicalLines = (text: string): number => text.length === 0 ? 0 :
    (text.match(/\n/gu)?.length ?? 0) + (text.endsWith("\n") ? 0 : 1); const lineCount = [...sources.values()].reduce((sum, source) => sum + physicalLines(source.text), 0);
  const canonicalText = (text: string): string => text.replace(/\r\n?/gu, "\n");
  const byteCount = [...sources.values()].reduce((sum, source) => sum + Buffer.byteLength(canonicalText(source.text), "utf8"), 0);
  const longestLine = Math.max(...[...sources.values()].flatMap(source => source.text.split("\n")
    .map(line => [...line.replace(/\r$/u, "")].length))); assert.ok(lineCount <= 3_000, `qualification model has ${lineCount} physical lines`);
  assert.ok(byteCount <= 225_000, `qualification model has ${byteCount} canonical UTF-8 bytes`); assert.ok(longestLine <= 200, `qualification model has a ${longestLine}-character line`); });
test("supported fence-advance causes apply the same fail-closed scope revocation", () => { advanceCauseHistories.forEach(history => {
  const last = foldQualificationHistory(materialize(history), 64, trusted).results.at(-1)!; assert.ok(last.effects.some(
    effect => effect.type === "authorization-revoked")); }); });
test("direct start-unknown requests containment and reconciliation", () => { const result = foldQualificationHistory(materialize([register, issue("issue"), consume("consume"),
    launchDeadline("deadline")]), 8, trusted).results.at(-1)!;
  assert.deepEqual(result.effects.filter(effect => effect.type.endsWith("requested") || effect.type === "resource-quarantined").map(effect => effect.type).sort(),
  ["resource-quarantined", "runtime-reconciliation-requested", "runtime-termination-requested"]); });
test("receipt primitive identity is unique across protocol receipt families", () => { const history = [...evaluationStartedPrefix,
    rejected(detached(attemptReceipt("cross-namespace-receipt", "succeeded", receipt("close"))))] as const;
  const result = foldQualificationHistory(materialize(history), 64, trusted).results.at(-1)!; assert.equal(result.decision, "rejected"); assert.equal(result.terminalProjections.claim, "invalid");
  assert.ok(result.effects.some(effect => effect.type === "denial-recorded" && effect.reason === "receipt-replay")); });
test("cross-namespace build replay remains in the typed retirement evidence closure", () => { const replayReceipt = C.buildReceiptId("receipt:close");
  const beforeComplete = [...buildAuthorizedPrefix, build("build", "succeeded"), build("cross-namespace-replay", "succeeded", replayReceipt),
    consistency("consistency", { type: "match", artifactDigest: id.artifact }), reconcile("build-terminated", "terminated"), retirement("retirement"), cleanup("cleanup")] as const;
  compareHistory([...beforeComplete, complete("complete-full", beforeComplete, receipt("close"))], "cross-namespace replay complete closure");
  const candidate = complete("complete-omitted", beforeComplete, receipt("close"));
  const retainedEvidence = (candidate.body.retainedEvidence as readonly C.EvidenceReference[])
    .filter(reference => reference.type !== "build-receipt" || reference.buildReceiptId !== replayReceipt);
  const omitted = rejected({ ...candidate, body: { ...candidate.body, retainedEvidence } }); compareHistory([...beforeComplete, omitted], "cross-namespace replay omitted typed receipt"); });
test("retirement freezes state mutations but retains explicit late forensic evidence", () => { const longIssue = event("source-issue-long", "IssueAuthorization", {
    ...authorization(sourceFence), authorizationId: id.otherAuthorization, expiresAt: tick(100) }); const beforeComplete = [register, longIssue,
    event("source-consume", "ConsumeAuthorization", { ...authorization(sourceFence), authorizationId: id.otherAuthorization }),
    release("source-release", sourceFence, "source-authoring", id.otherAuthorization), close("close"),
    reconcile("source-terminated", "terminated"), retirement("retirement"), cleanup("cleanup")] as const;
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
    if (index < 2) assert.deepEqual(p, results.at(-2)!.terminalProjections); else { assert.deepEqual([p.claim, p.runtime, p.resourceRetirement.type], ["non-promotional", "unknown", "quarantined"]);
      assert.ok(types.includes("runtime-reconciliation-requested") && types.includes("runtime-termination-requested")); } }); });
test("opposite late launch terminals invalidate and contain both orderings through retirement", () => {
  const assertContained = (item: C.TransitionResult, seen: C.ReceiptId, kind: "started" | "release-denied") => {
    assert.equal(item.decision, "accepted"); assert.deepEqual(item.effects.map(effect => effect.type).sort(), ["claim-disposition-set",
      "late-receipt-retained", "resource-quarantined", "runtime-reconciliation-requested", "runtime-termination-requested"]);
    assert.ok(item.effects.some(effect => effect.type === "late-receipt-retained" && effect.evidence.type === "launch" && effect.evidence.receiptId === seen && effect.evidence.result === kind));
    assert.ok(item.effects.some(effect => effect.type === "claim-disposition-set" && effect.value === "invalid" && effect.evidence.type === "receipt" && effect.evidence.receiptId === seen));
    assert.ok(item.effects.some(effect => effect.type === "resource-quarantined" && effect.sourceFamilyRootId === id.root)); };
  const cases = [{ name: "started-denied", before: [...evaluationStartedPrefix, attemptReceipt("attempt", "succeeded"), retirement("retirement")],
    late: at(releaseDenied("late-denied"), 61), lateReceipt: receipt("late-denied"), post: at(releaseDenied("post-denied"), 65), postReceipt: receipt("post-denied"),
    result: "release-denied", launch: { type: "started", receiptId: receipt("release") } }, { name: "denied-started",
    before: [...campaignBuildPrefix, consume("consume", campaignFence), releaseDenied("denied"), retirement("retirement")], late: at(release("late"), 61),
    launch: { type: "release-denied", receiptId: receipt("denied") }, lateReceipt: receipt("late"), post: at(release("post"), 65), postReceipt: receipt("post"), result: "started" }] as const;
  for (const selected of cases) { const beforeComplete = [...selected.before, selected.late, reconcile(`${selected.name}-terminated`, "terminated"), cleanup(`${selected.name}-cleanup`)];
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
test("same-result late launch evidence remains forensic-only", () => { const cases = [[...evaluationStartedPrefix, at(release("late-started-same"), 61)],
  [...campaignBuildPrefix, consume("same-consume", campaignFence), releaseDenied("same-denied"), at(releaseDenied("same-late-denied"), 61)]] as const; cases.forEach((history, index) => {
    compareHistory(history, `same-result late launch ${index + 1}`); const results = foldQualificationHistory(materialize(history), 64, trusted).results, last = results.at(-1)!;
    assert.deepEqual(last.effects.map(effect => effect.type), ["late-receipt-retained"]); assert.deepEqual(last.terminalProjections, results.at(-2)!.terminalProjections); }); });
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
  const collision = rejected({ ...candidate, body: { ...candidate.body, tombstoneId: C.tombstoneId("receipt:close") } });
  compareHistory([...retiredBeforeComplete, collision], "tombstone collision"); });
const postRetirementReplayPrefix = [...retainedClosurePrefix, complete("replay-complete", retainedClosurePrefix, receipt("close"))] as const;
const retiredReplayCases = [{ name: "build", event: build("retired-build", "failed", buildReceipt("retained-build")), evidence: {
  type: "build-receipt", buildReceiptId: buildReceipt("retained-build") } }, { name: "consistency", event: consistency("retired-consistency",
  { type: "invalid", proofId: proof("replay") }, buildReceipt("retained-build"), consistencyReceipt("retained-consistency")), evidence: {
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
const mutationOperators = ["custody-authority", "protocol-revision", "predecessor", "tick", "source-root", "authorization-fence", "receipt-rewrite", "order-swap"] as const;
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
  for (let index = 1; index + 1 < history.length; index += 1) {
    const left = history[index]!, right = history[index + 1]!;
    if (left.accepted && right.accepted && left.extendsLineage && right.extendsLineage && left.label !== right.label)
      targets.push({ operator: "order-swap", scenario, index }); } return targets; });
const targetTypes = (target: PerturbationTarget): readonly C.ProtocolEvent["type"][] => {
  const events = materialize(scenarioHistories[target.scenario]!);
  return target.operator === "order-swap" ? [events[target.index]!.type, events[target.index + 1]!.type]
    : [events[target.index]!.type]; };
const requiredTargets = new Map<string, PerturbationTarget>();
const requireTarget = (target: PerturbationTarget | undefined): void => { assert.ok(target !== undefined);
  requiredTargets.set(JSON.stringify(target), target); };
for (const operator of mutationOperators)
  requireTarget(perturbationTargets.find(target => target.operator === operator));
for (const type of protocolEventTypes) if (![...requiredTargets.values()].flatMap(targetTypes).includes(type))
  requireTarget(perturbationTargets.find(target => targetTypes(target).includes(type)));
for (const field of receiptFields)
  requireTarget(perturbationTargets.find(target => target.operator === "receipt-rewrite" && target.field === field));
const applyPerturbation = (target: PerturbationTarget, salt: number, tickStep: number) => {
  const specs = scenarioHistories[target.scenario]!, baseline = materialize(specs, tickStep);
  if (target.operator === "order-swap") {
    const orderedSpecs = [...specs], records = [...baseline];
    [orderedSpecs[target.index], orderedSpecs[target.index + 1]] = [orderedSpecs[target.index + 1]!, orderedSpecs[target.index]!];
    [records[target.index], records[target.index + 1]] = [records[target.index + 1]!, records[target.index]!];
    let predecessor: C.EventId | null = null;
    const events = records.map((record, index) => {
      const next = { ...record, authoritativeTick: baseline[index]!.authoritativeTick,
        authenticatedPredecessorId: predecessor } as C.ProtocolEvent;
      if (index === 0 || orderedSpecs[index]!.extendsLineage) predecessor = next.eventId; return next; });
    assert.equal(events[target.index]!.authenticatedPredecessorId,
      baseline[target.index]!.authenticatedPredecessorId);
    assert.equal(events[target.index + 1]!.authenticatedPredecessorId, events[target.index]!.eventId);
    assert.ok(events[target.index]!.authoritativeTick <= events[target.index + 1]!.authoritativeTick);
    assert.notDeepEqual(events, baseline, "order mutation");
    return { baseline, events, types: targetTypes(target) }; }
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
      const results = compareEvents(mutation.events, `generated ${JSON.stringify(target)}`);
      if (target.operator === "order-swap") assert.ok(!results[target.index]!.effects.some(effect =>
        effect.type === "denial-recorded" && effect.reason === "wrong-binding"),
      "order swap semantics");
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
