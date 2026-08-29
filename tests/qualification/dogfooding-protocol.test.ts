/**
 * Disposable qualification evidence for the reduced dogfooding protocol.
 * This is intentionally test-only: it is neither a runtime nor a public SPI.
 */
import assert from "node:assert/strict";
import test from "node:test";

import fc from "fast-check";

import * as C from "./dogfooding-protocol-contract.ts";
import { foldOracleHistory } from "./dogfooding-protocol-oracle.ts";
import { foldQualificationHistory } from "./dogfooding-protocol-reducer.ts";

const id = {
  protocol: C.protocolRevisionId("protocol"), authority: C.custodyAuthorityId("authority"),
  family: C.sourceClaimFamilyId("family"), root: C.sourceFamilyRootId("root"),
  slot: C.sourceSlotId("slot"), authorization: C.authorizationId("authorization"),
  attempt: C.attemptId("attempt"), runtime: C.runtimeId("runtime"),
  checkpoint: C.checkpointId("checkpoint"), build: C.buildAttemptId("build"),
  owner: C.retirementOwnerId("owner"), otherOwner: C.retirementOwnerId("other-owner"),
  lineage: C.credentialLineageId("lineage"), otherLineage: C.credentialLineageId("other-lineage"),
  admission: C.admissionId("admission"), artifact: C.artifactDigest("sha256:artifact"),
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
  readonly body: Readonly<Record<string, unknown>>;
}
const event = (label: string, type: C.ProtocolEvent["type"],
  body: Readonly<Record<string, unknown>> = {}, minimumTick = 0): EventSpec =>
  ({ label, minimumTick, accepted: true, body: { type, ...body } });
const rejected = (spec: EventSpec): EventSpec => ({ ...spec, accepted: false });
const root = { sourceClaimFamilyId: id.family, sourceFamilyRootId: id.root };
const authorization = (binding: C.AuthorizationFenceBinding) => ({ ...root,
  authorizationId: id.authorization, sourceSlotId: id.slot, runtimeId: id.runtime,
  retirementOwnerId: id.owner, credentialLineageId: id.lineage, authorizationFence: binding,
});
const register = event("register", "RegisterProtocol", {
  sourceClaimFamilyId: id.family, sourceFamilyRootId: id.root, sourceSlotId: id.slot,
  attemptId: id.attempt, runtimeId: id.runtime, checkpointId: id.checkpoint,
  buildAttemptId: id.build, retirementOwnerId: id.owner, credentialLineageId: id.lineage,
  admissionId: id.admission, sourceFenceGeneration: g(1), campaignFenceGeneration: g(1),
  familyAllocationFenceGeneration: g(1), launchDeadline: tick(60), attemptDeadline: tick(60),
  stopDeadline: tick(60), buildDeadline: tick(60), buildConsistencyDeadline: tick(80),
});
const issue = (label: string, binding: C.AuthorizationFenceBinding = sourceFence) => event(label, "IssueAuthorization", {
  ...authorization(binding), expiresAt: tick(50),
});
const consume = (label: string, binding: C.AuthorizationFenceBinding = sourceFence) =>
  event(label, "ConsumeAuthorization", authorization(binding));
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
const advance = (label: string, selected: "source" | "campaign" = "campaign") =>
  event(label, "AdvanceFence", { ...root, fence: selected, expectedGeneration: g(1),
    nextGeneration: g(2), cause: "analytic-stop" });
const release = (label: string, binding: C.AuthorizationFenceBinding = campaignFence) => event(label, "ReleaseProcess", {
  ...authorization(binding), attemptId: id.attempt, launchReceiptId: receipt(label),
});
const releaseDenied = (label: string, binding: C.AuthorizationFenceBinding = campaignFence) => event(label, "RecordReleaseDenied", {
  ...authorization(binding), receiptId: receipt(label), proofId: proof(label), reason: "gate-closed",
});
const crash = (label: string, binding: C.AuthorizationFenceBinding = sourceFence) => event(label, "ObserveCrash", {
  ...root, authorizationId: id.authorization, runtimeId: id.runtime,
  expectedGeneration: binding.expectedGeneration,
});
const launchDeadline = (label: string, binding: C.AuthorizationFenceBinding = sourceFence) => event(label, "ReachLaunchDeadline", {
  ...authorization(binding), observationReceiptId: receipt(label), result: "start-unknown",
}, 60);
const restart = (label: string) => event(label, "RestartObserved", { ...root, runtimeId: id.runtime });
const reconcile = (label: string, observation: "live" | "terminated" | "unknown") =>
  event(label, "ReconcileRuntime", { ...root, runtimeId: id.runtime, observation, proofId: proof(label) });
const retirement = (label: string, owner = id.owner, lineage = id.lineage) =>
  event(label, "RequestRetirement", { ...root, retirementOwnerId: owner, credentialLineageId: lineage });
const cleanup = (label: string, owner = id.owner) => event(label, "RequestCleanup", { ...root,
  runtimeId: id.runtime, retirementOwnerId: owner, credentialLineageId: id.lineage,
  terminationProofId: proof(label),
});
const complete = (label: string, sourceReceipt: C.ReceiptId, admissionReceipt?: C.ReceiptId) =>
  event(label, "CompleteRetirement", { ...root, runtimeId: id.runtime, retirementOwnerId: id.owner,
    credentialLineageId: id.lineage, tombstoneId: C.tombstoneId(`tombstone:${label}`),
    cleanupProofId: proof(label), sourceTerminalReceiptId: sourceReceipt,
    retainedEvidence: [sourceReceipt, admissionReceipt].filter((value): value is C.ReceiptId => value !== undefined)
      .map(value => ({ type: "receipt" as const, receiptId: value })),
  });
const attemptReceipt = (label: string, result: C.AttemptReceiptResult) =>
  event(label, "RecordAttemptReceipt", { attemptId: id.attempt, runtimeId: id.runtime,
    receiptId: receipt(label), result });
const attemptDeadline = (label: string, result: "missing" | "unknown" = "missing") =>
  event(label, "ReachAttemptDeadline", { attemptId: id.attempt,
    observationReceiptId: receipt(label), result }, 60);
const checkpoint = (label: string) => event(label, "CheckpointEffective", {
  checkpointId: id.checkpoint, expectedGeneration: g(1),
});
const stop = (label: string, result: "continue" | "stop" = "stop") => event(label, "RecordStopReceipt", {
  checkpointId: id.checkpoint, receiptId: receipt(label), expectedGeneration: g(1), result,
});
const recoverStop = (label: string) => event(label, "RecoverStopFence", {
  checkpointId: id.checkpoint, expectedGeneration: g(1), nextGeneration: g(2),
});
const admission = (label: string, result: "accepted" | "failed") => event(label, "RecordAdmission", {
  ...root, admissionId: id.admission, receiptId: receipt(label), result,
});
const build = (label: string, result: "succeeded" | "failed" | "no-output") =>
  event(label, "RecordBuildResult", { ...root, sourceSlotId: id.slot, buildAttemptId: id.build,
    buildReceiptId: buildReceipt(label), result: result === "succeeded" ?
      { type: result, artifactDigest: id.artifact } : { type: result, proofId: proof(label) },
  });
const consistency = (label: string, result: C.BuildConsistencyInput,
  boundBuildReceipt = buildReceipt("build"), selectedReceipt = consistencyReceipt(label)) =>
  event(label, "RecordBuildConsistencyReceipt", { ...root, sourceSlotId: id.slot,
    buildAttemptId: id.build, buildReceiptId: boundBuildReceipt,
    consistencyReceiptId: selectedReceipt, result });

const materialize = (specs: readonly EventSpec[]): readonly C.ProtocolEvent[] => {
  const events: C.ProtocolEvent[] = [];
  let predecessor: C.EventId | null = null;
  let now = 0;
  for (const spec of specs) {
    now = Math.max(now + 1, spec.minimumTick ?? 0);
    const envelope: Envelope = { eventId: C.eventId(`event:${spec.label}`),
      protocolRevisionId: id.protocol, custodyAuthorityId: id.authority,
      authoritativeTick: tick(now), authenticatedPredecessorId: predecessor };
    const selected = { ...envelope, ...spec.body } as unknown as C.ProtocolEvent;
    if (events.length === 0) {
      assert.equal(selected.type, "RegisterProtocol");
      predecessor = selected.eventId;
    } else if (spec.accepted) predecessor = selected.eventId;
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
const failureMessages = (failures: readonly unknown[]): string => failures
  .map(failure => failure instanceof Error ? failure.message : String(failure)).join("\n");
const compareHistory = (specs: readonly EventSpec[], context: string): void => {
  const events = materialize(specs);
  const reducer = foldQualificationHistory(events, 32).results;
  const oracle = foldOracleHistory(events).results;
  assert.equal(reducer.length, oracle.length);
  const failures: unknown[] = [];
  reducer.forEach((result, index) => {
    try {
      const fixtureDecision = specs[index]!.accepted ? "accepted" : "rejected";
      assert.equal(result.decision, fixtureDecision, `${context} event ${index}: reducer fixture expectation`);
      assert.equal(oracle[index]!.decision, fixtureDecision,
        `${context} event ${index}: oracle fixture expectation`);
      compareResult(result, oracle[index]!, `${context} event ${index} (${events[index]!.type})`);
    } catch (error) {
      failures.push(error);
    }
  });
  if (failures.length > 0) assert.fail(`${context} transition mismatches:\n${failureMessages(failures)}`);
};

interface RaceFamily {
  readonly name: string;
  readonly variants: number;
  readonly history: (reverse: boolean, variant: number) => readonly EventSpec[];
}
const ordered = (reverse: boolean, left: EventSpec, right: EventSpec): readonly EventSpec[] =>
  reverse ? [right, left] : [left, right];
const closedPrefix = [register, close("close"), admission("admission", "accepted")] as const;
const raceFamilies: readonly RaceFamily[] = [
  { name: "1 consume vs stop/revoke/expiry", variants: 3, history: (reverse, variant) => {
    const binding = variant === 0 ? campaignFence : sourceFence;
    const adverse = variant === 0 ? advance("stop") : variant === 1 ? revoke("revoke") : expire("expiry");
    const consumption = consume("consume", binding);
    return [register, issue("issue", binding),
      ...(reverse ? [adverse, rejected(consumption)] : [consumption, adverse]),
      rejected(release("continuation-release", binding))];
  } },
  { name: "2 issuance vs source closure/abandonment", variants: 2, history: (reverse, variant) => [
    register, ...(reverse ? [variant === 0 ? close("terminal") : abandon("terminal"), rejected(issue("issue"))]
      : [issue("issue"), variant === 0 ? close("terminal") : abandon("terminal")]),
    rejected(consume("continuation-consume")),
  ] },
  { name: "3 closure vs abandonment", variants: 1, history: reverse => [register,
    ...(reverse ? [abandon("abandon"), rejected(close("close"))]
      : [close("close"), rejected(abandon("abandon"))]), rejected(issue("continuation-issue"))],
  },
  { name: "4 process release vs generation advance", variants: 1, history: reverse => [
    register, issue("issue", campaignFence), consume("consume", campaignFence),
    ...(reverse ? [advance("advance"), rejected(release("release"))]
      : [release("release"), advance("advance")]),
    ...(reverse ? [releaseDenied("continuation-denial")] : [rejected(releaseDenied("continuation-denial"))]),
  ] },
  { name: "5 crash after consume before start confirmation", variants: 1, history: reverse => [
    register, issue("issue"), consume("consume"), ...(reverse
      ? [release("release", sourceFence), rejected(crash("crash"))]
      : [crash("crash"), rejected(release("release", sourceFence))]),
    reconcile("continuation-reconcile", "unknown"),
    ...(reverse ? [rejected(launchDeadline("continuation-deadline"))]
      : [launchDeadline("continuation-deadline")]),
  ] },
  { name: "6 terminal receipt vs deadline", variants: 1, history: reverse => [register,
    ...(reverse ? [attemptDeadline("deadline"), attemptReceipt("receipt", "succeeded")]
      : [attemptReceipt("receipt", "succeeded"), rejected(attemptDeadline("deadline"))]),
    attemptReceipt("continuation-conflict", "failed")],
  },
  { name: "7 late/conflicting receipt after finality", variants: 1, history: reverse => [
    register, attemptReceipt("terminal", "succeeded"),
    ...ordered(reverse, attemptReceipt("late-same", "succeeded"), attemptReceipt("late-conflict", "failed")),
    rejected(attemptDeadline("continuation-deadline"))],
  },
  { name: "8 restart reconciliation vs cleanup/retirement", variants: 2,
    history: (reverse, variant) => {
      const prefix = [register, issue("issue", campaignFence), consume("consume", campaignFence),
        release("release"), close("close")];
      const raced = variant === 0 ? ordered(reverse, restart("restart"), retirement("retirement"))
        : reverse ? [rejected(cleanup("cleanup")), restart("restart")]
          : [restart("restart"), rejected(cleanup("cleanup"))];
      return [...prefix, ...(variant === 0 ? [] : [retirement("retirement")]), ...raced,
        reconcile("continuation-terminated", "terminated"), cleanup("continuation-cleanup"),
        complete("continuation-complete", receipt("close"))];
    },
  },
  { name: "9 durable analytic stop vs next launch", variants: 1, history: reverse => [
    register, issue("issue", campaignFence), consume("consume", campaignFence), checkpoint("checkpoint"),
    ...(reverse ? [rejected(release("release")), stop("stop")]
      : [stop("stop"), rejected(release("release"))]), recoverStop("continuation-recover"),
    rejected(issue("continuation-issue", campaignFence))],
  },
  { name: "10 build vs missing/replayed/mismatched consistency evidence", variants: 3,
    history: (reverse, variant) => { const result = variant === 0 ? "failed" : "no-output";
      const consistencyId = consistencyReceipt("consistency");
      const evidence = consistency("consistency", variant === 2 ? { type: "match", artifactDigest: id.artifact } :
        { type: "missing-build", proofId: proof("missing") },
      variant === 1 ? buildReceipt("wrong") : buildReceipt("build"), consistencyId);
      return [...closedPrefix, ...ordered(reverse, build("build", result), evidence),
        consistency("continuation-replay", { type: "missing-build", proofId: proof("replay") },
          buildReceipt("build"), consistencyId)];
    } },
  { name: "11 failed admission after closed source vs retirement", variants: 1, history: reverse => [
    register, close("close"), ...ordered(reverse, admission("failed-admission", "failed"), retirement("retirement")),
    cleanup("continuation-cleanup"), complete("continuation-complete", receipt("close"), receipt("failed-admission"))],
  },
  { name: "12 unknown runtime vs cleanup", variants: 1, history: reverse => [
    register, issue("issue"), consume("consume"), crash("crash"), close("close"), retirement("retirement"),
    ...(reverse ? [rejected(cleanup("cleanup")), reconcile("unknown", "unknown")]
      : [reconcile("unknown", "unknown"), rejected(cleanup("cleanup"))]),
    reconcile("continuation-terminated", "terminated"), cleanup("continuation-cleanup"),
    complete("continuation-complete", receipt("close"))],
  },
];
assert.equal(raceFamilies.length, 12, "the registry must contain exactly twelve race families");

for (const family of raceFamilies) for (const reverse of [false, true]) {
  test(`${family.name} / ${reverse ? "right-before-left" : "left-before-right"}`, () => {
    const failures: unknown[] = [];
    for (let variant = 0; variant < family.variants; variant += 1) {
      try {
        compareHistory(family.history(reverse, variant), `${family.name} variant ${variant}`);
      } catch (error) {
        failures.push(error);
      }
    }
    if (failures.length > 0) assert.fail(
      `${family.name} disagrees with the oracle:\n${failureMessages(failures)}`);
  });
}

test("bounded generated histories agree with the independent oracle", () => {
  fc.assert(fc.property(
    fc.integer({ min: 0, max: raceFamilies.length - 1 }), fc.boolean(), fc.integer({ min: 0, max: 2 }),
    (familyIndex, reverse, selector) => {
      const family = raceFamilies[familyIndex]!;
      const variant = selector % family.variants;
      const history = family.history(reverse, variant);
      assert.ok(history.length <= 16, "generated histories remain bounded");
      compareHistory(history, `generated family ${familyIndex + 1}/${variant}/${reverse}`);
    },
  ), { seed: 0x415139, numRuns: 500 });
});

type Mutant = "authorization-reuse" | "release-after-fence-advance" | "cleanup-unknown-runtime" |
  "late-receipt-rewrites-finality" | "closed-and-abandoned-simultaneously" |
  "build-mismatch-becomes-attrition" | "retirement-owner-changes-within-one-source-family-root";
const mutantNames: readonly Mutant[] = ["authorization-reuse", "release-after-fence-advance",
  "cleanup-unknown-runtime", "late-receipt-rewrites-finality", "closed-and-abandoned-simultaneously",
  "build-mismatch-becomes-attrition", "retirement-owner-changes-within-one-source-family-root"];

interface TestOnlyMutantResult extends C.TransitionResult {
  readonly sourceFacts?: { readonly closed: boolean; readonly abandoned: boolean };
}
const faultyTransition = (name: Mutant, strict: C.TransitionResult,
  eventValue: C.ProtocolEvent): TestOnlyMutantResult => {
  const projections = strict.terminalProjections;
  switch (name) {
    case "authorization-reuse": return { ...strict, decision: "accepted", effects: [] };
    case "release-after-fence-advance": return { decision: "accepted", effects: [{
      type: "process-release-requested", causalEventId: eventValue.eventId, authorizationId: id.authorization,
      runtimeId: id.runtime, authorizationFence: campaignFence,
    }], terminalProjections: { ...projections, runtime: "live",
      launch: { type: "started", receiptId: receipt("mutant-release") } } };
    case "cleanup-unknown-runtime": return { ...strict, decision: "accepted", effects: [{
      type: "resource-cleanup-requested", causalEventId: eventValue.eventId,
      sourceFamilyRootId: id.root, runtimeId: id.runtime, proofId: proof("mutant-cleanup"),
    }], terminalProjections: { ...projections, resourceRetirement: { type: "pending" } } };
    case "late-receipt-rewrites-finality": return { ...strict,
      terminalProjections: { ...projections, attempt: { type: "succeeded", receiptId: receipt("late") } } };
    case "closed-and-abandoned-simultaneously": return { ...strict, decision: "accepted", effects: [],
      sourceFacts: { closed: true, abandoned: true } };
    case "build-mismatch-becomes-attrition": return { ...strict,
      terminalProjections: { ...projections, buildConsistency: {
        type: "missing-build", consistencyReceiptId: consistencyReceipt("mismatch") }, claim: "eligible" } };
    case "retirement-owner-changes-within-one-source-family-root":
      return { ...strict, decision: "accepted", effects: [] };
  }
};
assert.equal(mutantNames.length, 7, "the suite must define exactly seven deliberate test-only mutants");

const lastResults = (specs: readonly EventSpec[]) => {
  const history = materialize(specs);
  return { event: history.at(-1)!, strict: foldQualificationHistory(history, 20).results.at(-1)!,
    oracle: foldOracleHistory(history).results.at(-1)! };
};
const kill = (name: Mutant, specs: readonly EventSpec[],
  invariant: (result: TestOnlyMutantResult) => void): void => {
  const { event: selected, strict, oracle } = lastResults(specs);
  invariant(strict);
  invariant(oracle);
  assert.throws(() => invariant(faultyTransition(name, strict, selected)),
    assert.AssertionError, `${name} must be killed by its targeted invariant`);
};

test("mutant kill: authorization reuse", () => kill("authorization-reuse",
  [register, issue("issue"), consume("first"), rejected(consume("second"))],
  result => assert.equal(result.decision, "rejected")));
test("mutant kill: release after fence advance", () => kill("release-after-fence-advance",
  [register, issue("issue", campaignFence), consume("consume", campaignFence), advance("advance"),
    rejected(release("release"))],
  result => { assert.equal(result.decision, "rejected"); assert.notEqual(result.terminalProjections.runtime, "live"); }));
test("mutant kill: cleanup of unknown runtime", () => kill("cleanup-unknown-runtime",
  [register, issue("issue"), consume("consume"), crash("crash"), rejected(cleanup("cleanup"))],
  result => { assert.equal(result.decision, "rejected");
    assert.equal(result.terminalProjections.runtime, "unknown");
    assert.notEqual(result.terminalProjections.resourceRetirement.type, "retired"); }));
test("mutant kill: late receipt rewrites finality", () => kill("late-receipt-rewrites-finality",
  [register, attemptDeadline("deadline"), attemptReceipt("late", "succeeded")],
  result => assert.deepEqual(result.terminalProjections.attempt,
    { type: "missing", receiptId: receipt("deadline") })));
test("mutant kill: closed and abandoned simultaneously", () => kill("closed-and-abandoned-simultaneously",
  [register, close("close"), rejected(abandon("abandon"))],
  result => { const source = result.terminalProjections.sourceEvidence;
    const facts = result.sourceFacts ?? { closed: source.type === "closed", abandoned: source.type === "abandoned" };
    assert.equal(facts.closed && facts.abandoned, false); }));
test("mutant kill: build mismatch becomes attrition/eligible", () => kill("build-mismatch-becomes-attrition",
  [...closedPrefix, build("build", "succeeded"),
    consistency("mismatch", { type: "match", artifactDigest: C.artifactDigest("sha256:wrong") })],
  result => { assert.equal(result.terminalProjections.buildConsistency?.type, "invalid");
    assert.equal(result.terminalProjections.claim, "invalid"); }));
test("mutant kill: retirement owner or credential lineage changes within one root", () => {
  for (const [owner, lineage] of [[id.otherOwner, id.lineage], [id.owner, id.otherLineage]] as const) {
    kill("retirement-owner-changes-within-one-source-family-root",
      [register, close("close"), rejected(retirement(`retirement-${owner}-${lineage}`, owner, lineage))],
      result => assert.equal(result.decision, "rejected"));
  }
});
