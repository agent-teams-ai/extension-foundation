import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { access, mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { Worker } from "node:worker_threads";

import { Graph, alg } from "@dagrejs/graphlib";
import { Context } from "@deepseek-ai/cordis";
import fc from "fast-check";

import { compileGraph, type ModuleDescriptor } from "./graph-spike.ts";
import {
  GenerationLifecycle,
  inertHooks,
  type ActivationRequest,
  type ModuleHooks,
} from "./lifecycle-spike.ts";
import {
  decodeLengthPrefixedFrame,
  encodeLengthPrefixedFrame,
  handlePortableWorkerFrame,
  maxFrameBytes,
  type ProtocolEnvelope,
  validateAuthorizedEnvelope,
  validateEnvelope,
  validateResponseEnvelope,
} from "./protocol-spike.ts";
import {
  reconcileLifecycle,
  type DurableLifecycleState,
  type ObservedHostState,
} from "./recovery-spike.ts";

const fixtureRoot = fileURLToPath(new URL("./fixtures", import.meta.url));
const qualificationRoot = fileURLToPath(new URL("./", import.meta.url));
const testAuthorityScope = "tenant:test/project:test";
const protocolAuthority = Object.freeze({
  authorityScope: testAuthorityScope,
  extensionInstanceId: "extension-instance-1",
  graphGeneration: 1,
  moduleActivationGeneration: 7,
  hostIncarnation: "host-incarnation-1",
  authenticatedPeerId: "product-host",
  localSenderId: "extension-host",
  audience: "extension-host",
});
const responseAuthority = Object.freeze({
  ...protocolAuthority,
  authenticatedPeerId: "extension-host",
  localSenderId: "product-host",
  audience: "product-host",
});

function requirePlan(descriptors: readonly ModuleDescriptor[]) {
  const result = compileGraph(descriptors);
  if (!result.ok) assert.fail(JSON.stringify(result.diagnostics));
  return result.plan;
}

function frame(overrides: Partial<ProtocolEnvelope> = {}): ProtocolEnvelope {
  return {
    protocol: "agent-teams.extension-host/v1",
    requestId: "request-1",
    operationId: "operation-1",
    authorityScope: testAuthorityScope,
    extensionInstanceId: "extension-instance-1",
    graphGeneration: 1,
    moduleActivationGeneration: 7,
    hostIncarnation: "host-incarnation-1",
    senderId: "product-host",
    audience: "extension-host",
    absoluteDeadline: Date.now() + 5_000,
    kind: "hello",
    payload: {},
    ...overrides,
  };
}

function rejectAfter(milliseconds: number, errorFactory: () => Error): Promise<never> {
  return new Promise((_, reject) => {
    const timer = setTimeout(() => reject(errorFactory()), milliseconds);
    timer.unref();
  });
}

async function waitUntil(predicate: () => boolean, milliseconds: number, errorCode: string): Promise<void> {
  const deadline = Date.now() + milliseconds;
  while (!predicate()) {
    if (Date.now() >= deadline) throw new Error(errorCode);
    await delay(1);
  }
}

function activationRequest(
  lifecycle: GenerationLifecycle,
  operationId: string,
  plan: ReturnType<typeof requirePlan>,
  hooks: ReadonlyMap<string, ModuleHooks>,
  options: {
    readonly expectedActiveGeneration?: number;
    readonly deadlineMs?: number;
    readonly cleanupTimeoutMs?: number;
    readonly profileLockDigest?: string;
    readonly activationSourceDigest?: string;
    readonly authorityScope?: string;
    readonly productAuthorizationRevision?: string;
    readonly grantRevision?: string;
    readonly hostPolicyRevision?: string;
  } = {},
): ActivationRequest {
  return {
    identity: {
      operationId,
      activationSourceDigest: options.activationSourceDigest ?? "sha256:activation-source-1",
      expectedActiveGeneration: options.expectedActiveGeneration ?? lifecycle.activeGeneration,
      authorityScope: options.authorityScope ?? testAuthorityScope,
      profileLockDigest: options.profileLockDigest ?? "sha256:profile-lock-1",
      configurationFingerprint: "sha256:configuration-1",
      productAuthorizationRevision: options.productAuthorizationRevision ?? "product-authorization-revision-1",
      grantRevision: options.grantRevision ?? "grant-revision-1",
      hostPolicyRevision: options.hostPolicyRevision ?? "host-policy-revision-1",
    },
    plan,
    hooks,
    absoluteDeadline: lifecycle.deadlineAfter(options.deadlineMs ?? 1_000),
    ...(options.cleanupTimeoutMs === undefined ? {} : { cleanupTimeoutMs: options.cleanupTimeoutMs }),
  };
}

test("invalid ID-DAG inputs produce deterministic diagnostics without loading hooks", () => {
  const duplicateDefinitions = [
    { id: "consumer", requires: ["missing"] },
    { id: "consumer", requires: [] },
  ];
  const firstDuplicate = compileGraph(duplicateDefinitions);
  const secondDuplicate = compileGraph([...duplicateDefinitions].reverse());
  assert.equal(firstDuplicate.ok, false);
  assert.deepEqual(firstDuplicate, secondDuplicate);
  assert.deepEqual(firstDuplicate.diagnostics.map(diagnostic => diagnostic.code), ["DUPLICATE_MODULE"]);

  const missingDefinitions = [{ id: "consumer", requires: ["missing"] }];
  const firstMissing = compileGraph(missingDefinitions);
  const secondMissing = compileGraph([...missingDefinitions].reverse());
  assert.equal(firstMissing.ok, false);
  assert.deepEqual(firstMissing, secondMissing);
  assert.deepEqual(firstMissing.diagnostics.map(diagnostic => diagnostic.code), ["MISSING_PROVIDER"]);
});

test("graph plan uses stable batches and reverse dependency cleanup", () => {
  const plan = requirePlan([
    { id: "api", requires: ["database", "telemetry"] },
    { id: "database", requires: [] },
    { id: "telemetry", requires: [] },
  ]);
  assert.deepEqual(plan.startBatches, [["database", "telemetry"], ["api"]]);
  assert.deepEqual(plan.stopBatches, [["api"], ["database", "telemetry"]]);
});

test("compiled ID-DAG plan is deeply immutable and serializable", () => {
  const plan = requirePlan([
    { id: "provider", requires: [] },
    { id: "consumer", requires: ["provider"] },
  ]);
  assert.equal(Object.isFrozen(plan), true);
  assert.equal(Object.isFrozen(plan.nodes), true);
  assert.equal(Object.isFrozen(plan.nodes[1]?.requires), true);
  assert.equal(Object.isFrozen(plan.startBatches[0]), true);
  assert.throws(() => (plan.nodes as Array<unknown>).push({ id: "late", requires: [] }), TypeError);
  assert.deepEqual(structuredClone(plan).nodes, plan.nodes);
});

test("permutations produce the same graph plan and digest", () => {
  fc.assert(fc.property(
    fc.shuffledSubarray(["a", "b", "c", "d"], { minLength: 4, maxLength: 4 }),
    order => {
      const descriptors = new Map<string, ModuleDescriptor>([
        ["a", { id: "a", requires: [] }],
        ["b", { id: "b", requires: ["a"] }],
        ["c", { id: "c", requires: ["a"] }],
        ["d", { id: "d", requires: ["b", "c"] }],
      ]);
      const result = compileGraph(order.map(id => descriptors.get(id)!));
      if (!result.ok) assert.fail(JSON.stringify(result.diagnostics));
      assert.deepEqual(result.plan.startBatches, [["a"], ["b", "c"], ["d"]]);
      assert.equal(result.plan.digest, requirePlan([...descriptors.values()]).digest);
    },
  ), { numRuns: 200 });
});

test("native compiler agrees with Graphlib on generated directed-graph validity", () => {
  const arbitraryGraph = fc.array(fc.tuple(
    fc.integer({ min: 0, max: 7 }),
    fc.integer({ min: 0, max: 7 }),
  ), { maxLength: 40 });

  fc.assert(fc.property(arbitraryGraph, pairs => {
    const ids = Array.from({ length: 8 }, (_, index) => `n${index}`);
    const edges = [...new Set(pairs.map(([from, to]) => `${from}:${to}`))]
      .map(value => value.split(":").map(Number) as [number, number]);
    const dependencies = new Map(ids.map(id => [id, [] as string[]]));
    const oracle = new Graph({ directed: true });
    ids.forEach(id => oracle.setNode(id));
    for (const [provider, consumer] of edges) {
      dependencies.get(ids[consumer]!)?.push(ids[provider]!);
      oracle.setEdge(ids[provider]!, ids[consumer]!);
    }
    const result = compileGraph(ids.map(id => ({ id, requires: dependencies.get(id) ?? [] })));
    assert.equal(result.ok, alg.isAcyclic(oracle));
    if (!result.ok) return;
    const plan = result.plan;
    const oracleOrder = alg.topsort(oracle);
    const nativePosition = new Map(plan.startOrder.map((id, index) => [id, index]));
    const oraclePosition = new Map((oracleOrder as string[]).map((id: string, index: number) => [id, index]));
    for (const [provider, consumer] of edges) {
      assert.ok(nativePosition.get(ids[provider]!)! < nativePosition.get(ids[consumer]!)!);
      assert.ok(oraclePosition.get(ids[provider]!)! < oraclePosition.get(ids[consumer]!)!);
    }
  }), { numRuns: 500 });
});

test("graph compiler remains stack-safe for ten thousand modules", () => {
  const count = 10_000;
  const chain = Array.from({ length: count }, (_, index) => ({
    id: `module-${String(index).padStart(5, "0")}`,
    requires: index === 0 ? [] : [`module-${String(index - 1).padStart(5, "0")}`],
  }));
  const plan = requirePlan(chain);
  assert.equal(plan.startOrder.length, count);
  assert.equal(plan.startBatches.length, count);

  const cyclic = chain.map((descriptor, index) => index === 0
    ? { ...descriptor, requires: [`module-${String(count - 1).padStart(5, "0")}`] }
    : descriptor);
  const result = compileGraph(cyclic);
  assert.equal(result.ok, false);
  if (result.ok) assert.fail("expected a cycle");
  assert.equal(result.diagnostics[0]?.code, "HARD_CYCLE");
  assert.ok((result.diagnostics[0]?.dependencyPath.length ?? 0) > 1);
});

test("one hundred concurrent starts share one activation and one cutover", async () => {
  const plan = requirePlan([{ id: "module", requires: [] }]);
  const lifecycle = new GenerationLifecycle(testAuthorityScope);
  let starts = 0;
  const hooks = new Map<string, ModuleHooks>([["module", inertHooks({
    async start() {
      starts += 1;
      await delay(5);
    },
  })]]);
  const request = activationRequest(lifecycle, "activation-single-flight", plan, hooks);
  const calls = Array.from({ length: 100 }, () => lifecycle.activate(request));
  const results = await Promise.all(calls);
  assert.equal(starts, 1);
  assert.equal(lifecycle.cutovers, 1);
  assert.equal(new Set(results.map(result => result.generation)).size, 1);
});

test("a waiter deadline detaches without cancelling the shared activation", async () => {
  const lifecycle = new GenerationLifecycle(testAuthorityScope);
  const plan = requirePlan([{ id: "module", requires: [] }]);
  let starts = 0;
  const request = activationRequest(
    lifecycle,
    "waiter-detach",
    plan,
    new Map([["module", inertHooks({ start: async () => { starts += 1; await delay(20); } })]]),
  );
  const impatient = lifecycle.activate(request, lifecycle.deadlineAfter(3));
  const patient = lifecycle.activate(request, lifecycle.deadlineAfter(250));
  await assert.rejects(impatient, /WAITER_DEADLINE_EXCEEDED/);
  assert.equal((await patient).ok, true);
  assert.equal(starts, 1);
});

test("a waiter deadline remains fail-closed after event-loop blocking", async () => {
  const lifecycle = new GenerationLifecycle(testAuthorityScope);
  const plan = requirePlan([{ id: "module", requires: [] }]);
  let starts = 0;
  const request = activationRequest(
    lifecycle,
    "waiter-event-loop-block",
    plan,
    new Map([["module", inertHooks({
      start: () => {
        starts += 1;
        const blockedUntil = performance.now() + 50;
        while (performance.now() < blockedUntil) {
          // Synchronous module code can delay the timer queue beyond the waiter deadline.
        }
      },
    })]]),
  );

  const impatient = lifecycle.activate(request, lifecycle.deadlineAfter(5));
  const patient = lifecycle.activate(request, lifecycle.deadlineAfter(1_000));
  await assert.rejects(impatient, /WAITER_DEADLINE_EXCEEDED/);
  assert.equal((await patient).ok, true);
  assert.equal(starts, 1);
});

test("a cancelled waiter detaches without cancelling the shared activation", async () => {
  const lifecycle = new GenerationLifecycle(testAuthorityScope);
  const plan = requirePlan([{ id: "module", requires: [] }]);
  let starts = 0;
  const request = activationRequest(
    lifecycle,
    "waiter-cancel",
    plan,
    new Map([["module", inertHooks({ start: async () => { starts += 1; await delay(20); } })]]),
  );
  const controller = new AbortController();
  const cancelled = lifecycle.activate(request, { signal: controller.signal });
  const patient = lifecycle.activate(request);
  controller.abort();
  await assert.rejects(cancelled, /WAITER_CANCELLED/);
  assert.equal((await patient).ok, true);
  assert.equal(starts, 1);
});

test("same operation with changed authority inputs is an idempotency conflict", async () => {
  const lifecycle = new GenerationLifecycle(testAuthorityScope);
  const plan = requirePlan([{ id: "module", requires: [] }]);
  const hooks = new Map<string, ModuleHooks>([["module", inertHooks()]]);
  const first = activationRequest(lifecycle, "activation-conflict", plan, hooks);
  await lifecycle.activate(first);
  const changed = activationRequest(lifecycle, "activation-conflict", plan, hooks, {
    profileLockDigest: "sha256:different-profile-lock",
  });
  assert.throws(() => lifecycle.activate(changed), /ACTIVATION_IDEMPOTENCY_CONFLICT/);

  const changedSource = activationRequest(lifecycle, "activation-conflict", plan, hooks, {
    activationSourceDigest: "sha256:different-activation-source",
  });
  assert.throws(() => lifecycle.activate(changedSource), /ACTIVATION_IDEMPOTENCY_CONFLICT/);

  const changedProductAuthorization = activationRequest(lifecycle, "activation-conflict", plan, hooks, {
    productAuthorizationRevision: "product-authorization-revision-2",
  });
  assert.throws(() => lifecycle.activate(changedProductAuthorization), /ACTIVATION_IDEMPOTENCY_CONFLICT/);

  const changedGrant = activationRequest(lifecycle, "activation-conflict", plan, hooks, {
    grantRevision: "grant-revision-2",
  });
  assert.throws(() => lifecycle.activate(changedGrant), /ACTIVATION_IDEMPOTENCY_CONFLICT/);

  const changedHostPolicy = activationRequest(lifecycle, "activation-conflict", plan, hooks, {
    hostPolicyRevision: "host-policy-revision-2",
  });
  assert.throws(() => lifecycle.activate(changedHostPolicy), /ACTIVATION_IDEMPOTENCY_CONFLICT/);

  const changedCleanupPolicy = activationRequest(lifecycle, "activation-conflict", plan, hooks, {
    cleanupTimeoutMs: 250,
  });
  assert.throws(() => lifecycle.activate(changedCleanupPolicy), /ACTIVATION_IDEMPOTENCY_CONFLICT/);
});

test("lifecycle is bound to one authority scope and snapshots hook bindings", async () => {
  const lifecycle = new GenerationLifecycle(testAuthorityScope);
  const firstPlan = requirePlan([{ id: "first", requires: [] }]);
  const stopped: string[] = [];
  const mutableHooks = new Map<string, ModuleHooks>([[
    "first",
    inertHooks({ stop: () => { stopped.push("original"); } }),
  ]]);
  const first = activationRequest(lifecycle, "scope-first", firstPlan, mutableHooks);
  await lifecycle.activate(first);
  mutableHooks.set("first", inertHooks({ stop: () => { stopped.push("mutated"); } }));

  const wrongScope = activationRequest(lifecycle, "wrong-scope", firstPlan, mutableHooks, {
    authorityScope: "tenant:other/project:other",
  });
  assert.throws(() => lifecycle.activate(wrongScope), /AUTHORITY_SCOPE_MISMATCH/);

  const secondPlan = requirePlan([{ id: "second", requires: [] }]);
  await lifecycle.activate(activationRequest(
    lifecycle,
    "scope-second",
    secondPlan,
    new Map([["second", inertHooks()]]),
  ));
  assert.deepEqual(stopped, ["original"]);
});

test("invocation handles are scope-bound in-memory capabilities, not structural authority", async () => {
  const plan = requirePlan([{ id: "module", requires: [] }]);
  const first = new GenerationLifecycle("tenant:first/project:first");
  const second = new GenerationLifecycle("tenant:second/project:second");
  await first.activate(activationRequest(
    first,
    "first-scope",
    plan,
    new Map([["module", inertHooks()]]),
    { authorityScope: "tenant:first/project:first" },
  ));
  await second.activate(activationRequest(
    second,
    "second-scope",
    plan,
    new Map([["module", inertHooks()]]),
    { authorityScope: "tenant:second/project:second" },
  ));
  const firstHandle = first.acquireInvocation();
  const secondHandle = second.acquireInvocation();
  first.assertInMemoryFence(firstHandle);
  second.assertInMemoryFence(secondHandle);
  assert.throws(() => second.assertInMemoryFence(firstHandle), /STALE_GENERATION/);
  assert.throws(() => first.assertInMemoryFence({ ...firstHandle }), /STALE_GENERATION/);
  firstHandle.release();
  secondHandle.release();
});

test("same completed operation returns its retained result without a second start", async () => {
  let now = 0;
  const lifecycle = new GenerationLifecycle(testAuthorityScope, {
    now: () => now,
    sleep: async milliseconds => { now += milliseconds; },
  });
  const plan = requirePlan([{ id: "module", requires: [] }]);
  let starts = 0;
  const request = activationRequest(
    lifecycle,
    "activation-replay",
    plan,
    new Map([["module", inertHooks({ start: () => { starts += 1; } })]]),
  );
  const first = await lifecycle.activate(request);
  now = request.absoluteDeadline + 1_000;
  const replay = await lifecycle.activate(request);
  assert.equal(replay.generation, first.generation);
  assert.equal(starts, 1);
  assert.equal(Object.isFrozen(replay), true);
  assert.equal(Object.isFrozen(replay.traces), true);
  assert.equal(Object.isFrozen(replay.traces[0]), true);
  assert.throws(() => (replay.traces as Array<unknown>).push({}), TypeError);
  assert.deepEqual(await lifecycle.activate(request), first);

  const cancelled = new AbortController();
  cancelled.abort();
  await assert.rejects(
    lifecycle.activate(request, { signal: cancelled.signal }),
    /WAITER_CANCELLED/,
  );
  await assert.rejects(
    lifecycle.activate(request, { absoluteDeadline: lifecycle.deadlineAfter(0) }),
    /WAITER_DEADLINE_EXCEEDED/,
  );
  assert.equal(starts, 1);
});

test("different operation identities are separate candidates and only one publishes", async () => {
  const lifecycle = new GenerationLifecycle(testAuthorityScope);
  const plan = requirePlan([{ id: "candidate", requires: [] }]);
  let starts = 0;
  const hooks = new Map([["candidate", inertHooks({
    start: async () => {
      starts += 1;
      await delay(10);
    },
  })]]);
  const expectedActiveGeneration = lifecycle.activeGeneration;
  const first = activationRequest(
    lifecycle,
    "candidate-first",
    plan,
    hooks,
    { expectedActiveGeneration },
  );
  const second = activationRequest(
    lifecycle,
    "candidate-second",
    plan,
    hooks,
    { expectedActiveGeneration },
  );
  const results = await Promise.all([lifecycle.activate(first), lifecycle.activate(second)]);
  assert.equal(starts, 2, "distinct operation identities were incorrectly deduplicated");
  assert.equal(results.filter(result => result.ok).length, 1);
  assert.equal(results.filter(result => result.errors.some(error => error.message === "STALE_ACTIVE_GENERATION")).length, 1);
  assert.equal(lifecycle.cutovers, 1);
});

test("activation snapshots caller-owned identity before publication races", async () => {
  const lifecycle = new GenerationLifecycle(testAuthorityScope);
  const plan = requirePlan([{ id: "candidate", requires: [] }]);
  let releaseStart!: () => void;
  let reportStarted!: () => void;
  const startGate = new Promise<void>(resolve => { releaseStart = resolve; });
  const started = new Promise<void>(resolve => { reportStarted = resolve; });
  const mutableRequest = activationRequest(
    lifecycle,
    "mutable-candidate",
    plan,
    new Map([["candidate", inertHooks({ start: async () => { reportStarted(); await startGate; } })]]),
  );
  const first = lifecycle.activate(mutableRequest);
  await started;
  const winner = await lifecycle.activate(activationRequest(
    lifecycle,
    "race-winner",
    plan,
    new Map([["candidate", inertHooks()]]),
  ));
  (mutableRequest.identity as { expectedActiveGeneration: number }).expectedActiveGeneration = winner.generation;
  releaseStart();
  const stale = await first;
  assert.equal(stale.ok, false);
  assert.ok(stale.errors.some(error => error.message === "STALE_ACTIVE_GENERATION"));
  assert.equal(lifecycle.activeGeneration, winner.generation);
  assert.equal(lifecycle.cutovers, 1);
});

test("activation snapshots identity accessors once before validating them", async () => {
  const lifecycle = new GenerationLifecycle(testAuthorityScope);
  const plan = requirePlan([{ id: "candidate", requires: [] }]);
  const request = activationRequest(lifecycle, "identity-accessor", plan, new Map([["candidate", inertHooks()]]));
  let authorityReads = 0;
  Object.defineProperty(request.identity, "authorityScope", {
    enumerable: true,
    configurable: true,
    get: () => ++authorityReads === 1 ? testAuthorityScope : "tenant:other/project:other",
  });
  const result = await lifecycle.activate(request);
  assert.equal(result.ok, true);
  assert.equal(authorityReads, 1);
});

test("hook contexts are runtime-immutable across activation and cleanup", async () => {
  const lifecycle = new GenerationLifecycle(testAuthorityScope);
  const first = requirePlan([{ id: "first", requires: [] }]);
  const observed: Array<readonly [string, number, string]> = [];
  const assertFrozenContext = (phase: string) => (context: Parameters<NonNullable<ModuleHooks["start"]>>[0]): void => {
    observed.push([phase, context.generation, context.phase]);
    assert.equal(Object.isFrozen(context), true);
    assert.throws(() => {
      (context as { generation: number }).generation = 999;
    }, TypeError);
  };
  await lifecycle.activate(activationRequest(
    lifecycle,
    "immutable-context-first",
    first,
    new Map([["first", inertHooks({
      start: assertFrozenContext("start"),
      stop: assertFrozenContext("stop"),
    })]]),
  ));
  const second = requirePlan([{ id: "second", requires: [] }]);
  await lifecycle.activate(activationRequest(
    lifecycle,
    "immutable-context-second",
    second,
    new Map([["second", inertHooks()]]),
  ));
  assert.deepEqual(observed.map(item => item[0]), ["start", "stop"]);
  assert.equal(observed[0]?.[1], observed[1]?.[1]);
  assert.deepEqual(observed.map(item => item[2]), ["activation", "cleanup"]);
});

test("readiness blocks dependents and failed candidate leaves routing unchanged", async () => {
  const lifecycle = new GenerationLifecycle(testAuthorityScope);
  const base = requirePlan([{ id: "base", requires: [] }]);
  const baseResult = await lifecycle.activate(activationRequest(
    lifecycle,
    "base-activation",
    base,
    new Map([["base", inertHooks()]]),
  ));
  assert.equal(baseResult.ok, true);
  const previous = lifecycle.activeGeneration;

  const candidate = requirePlan([
    { id: "provider", requires: [] },
    { id: "consumer", requires: ["provider"] },
  ]);
  let consumerStarts = 0;
  const result = await lifecycle.activate(activationRequest(
    lifecycle,
    "candidate-not-ready",
    candidate,
    new Map<string, ModuleHooks>([
      ["provider", { readiness: "probe", ready: () => false }],
      ["consumer", inertHooks({ start: () => { consumerStarts += 1; } })],
    ]),
  ));
  assert.equal(result.ok, false);
  assert.equal(consumerStarts, 0);
  assert.equal(lifecycle.activeGeneration, previous);
});

test("readiness is fail-closed for unknown discriminators and non-boolean probe results", async () => {
  for (const [operationId, hooks] of [
    ["unknown-readiness", { readiness: "unknown" }],
    ["truthy-readiness", { readiness: "probe", ready: () => ({ notABoolean: true }) }],
  ] as const) {
    const lifecycle = new GenerationLifecycle(testAuthorityScope);
    const plan = requirePlan([{ id: "candidate", requires: [] }]);
    const result = await lifecycle.activate(activationRequest(
      lifecycle,
      operationId,
      plan,
      new Map([["candidate", hooks as unknown as ModuleHooks]]),
    ));
    assert.equal(result.ok, false);
    assert.equal(lifecycle.activeGeneration, 0);
    assert.ok(result.errors.some(error => /INVALID_READINESS|NOT_READY/.test(error.message)));
  }
});

test("readiness shape is validated before prepare or start effects", async () => {
  const lifecycle = new GenerationLifecycle(testAuthorityScope);
  const plan = requirePlan([{ id: "candidate", requires: [] }]);
  let effects = 0;
  const result = await lifecycle.activate(activationRequest(
    lifecycle,
    "invalid-readiness-preflight",
    plan,
    new Map([[
      "candidate",
      {
        readiness: "unknown",
        prepare: () => { effects += 1; },
        start: () => { effects += 1; },
      } as unknown as ModuleHooks,
    ]]),
  ));
  assert.equal(result.ok, false);
  assert.equal(effects, 0);
  assert.deepEqual(result.errors, [{
    message: "INVALID_READINESS:candidate",
    moduleId: "candidate",
    phase: "preflight",
  }]);
});

test("effectful module without stop evidence cannot claim proven termination", async () => {
  const lifecycle = new GenerationLifecycle(testAuthorityScope);
  const plan = requirePlan([{ id: "candidate", requires: [] }]);
  let lateEffects = 0;
  const result = await lifecycle.activate(activationRequest(
    lifecycle,
    "missing-stop-evidence",
    plan,
    new Map([["candidate", {
      readiness: "probe",
      start: () => { setTimeout(() => { lateEffects += 1; }, 25); },
      ready: () => false,
    }]]),
  ));
  assert.equal(result.ok, false);
  assert.equal(result.termination, "termination_unproven");
  assert.ok(result.errors.some(error => error.message === "MISSING_STOP_EVIDENCE:candidate"));
  await delay(35);
  assert.equal(lateEffects, 1);
});

test("readiness-only effects without stop evidence cannot claim proven replacement", async () => {
  const lifecycle = new GenerationLifecycle(testAuthorityScope);
  const oldPlan = requirePlan([{ id: "old", requires: [] }]);
  let lateEffects = 0;
  const initial = await lifecycle.activate(activationRequest(
    lifecycle,
    "readiness-only-old",
    oldPlan,
    new Map([[
      "old",
      {
        readiness: "probe",
        ready: () => {
          setTimeout(() => { lateEffects += 1; }, 25);
          return true;
        },
      },
    ]]),
  ));
  assert.equal(initial.ok, true);

  const replacementPlan = requirePlan([{ id: "replacement", requires: [] }]);
  const replacement = await lifecycle.activate(activationRequest(
    lifecycle,
    "readiness-only-replacement",
    replacementPlan,
    new Map([["replacement", inertHooks()]]),
  ));
  assert.equal(replacement.ok, true);
  assert.equal(replacement.termination, "termination_unproven");
  assert.ok(replacement.errors.some(error => error.message === "MISSING_STOP_EVIDENCE:old"));
  await delay(35);
  assert.equal(lateEffects, 1);
});

test("failed readiness-only effects without stop evidence cannot claim proven termination", async () => {
  const lifecycle = new GenerationLifecycle(testAuthorityScope);
  const plan = requirePlan([{ id: "candidate", requires: [] }]);
  let lateEffects = 0;
  const result = await lifecycle.activate(activationRequest(
    lifecycle,
    "readiness-only-failure",
    plan,
    new Map([[
      "candidate",
      {
        readiness: "probe",
        ready: () => {
          setTimeout(() => { lateEffects += 1; }, 25);
          return false;
        },
      },
    ]]),
  ));
  assert.equal(result.ok, false);
  assert.equal(result.termination, "termination_unproven");
  assert.ok(result.errors.some(error => error.message === "MISSING_STOP_EVIDENCE:candidate"));
  await delay(35);
  assert.equal(lateEffects, 1);
});

test("absolute deadline prevents late publication and cleanup is bounded", async () => {
  const lifecycle = new GenerationLifecycle(testAuthorityScope);
  const plan = requirePlan([{ id: "slow", requires: [] }]);
  const startedAt = Date.now();
  const result = await lifecycle.activate(activationRequest(
    lifecycle,
    "slow-timeout",
    plan,
    new Map([["slow", inertHooks({
      start: async () => delay(20),
      stop: async () => new Promise(() => undefined),
    })]]),
    { deadlineMs: 5, cleanupTimeoutMs: 20 },
  ));
  assert.equal(result.ok, false);
  assert.equal(result.termination, "termination_unproven");
  assert.equal(lifecycle.activeGeneration, 0);
  assert.ok(Date.now() - startedAt < 250);
  assert.ok(result.errors.some(error => error.message === "ABSOLUTE_DEADLINE_EXCEEDED"));
  assert.ok(result.errors.some(error => error.message === "CLEANUP_TIMEOUT:slow"));
});

test("absolute deadline wins when blocking module code throws after expiry", async () => {
  const lifecycle = new GenerationLifecycle(testAuthorityScope);
  const plan = requirePlan([{ id: "blocking", requires: [] }]);
  const result = await lifecycle.activate(activationRequest(
    lifecycle,
    "blocking-error-after-deadline",
    plan,
    new Map([["blocking", inertHooks({
      start: () => {
        const blockedUntil = performance.now() + 50;
        while (performance.now() < blockedUntil) {
          // Force promise settlement ahead of the overdue timer callback.
        }
        throw new Error("START_FAILED_AFTER_DEADLINE");
      },
      stop: () => undefined,
    })]]),
    { deadlineMs: 5, cleanupTimeoutMs: 20 },
  ));

  assert.equal(result.ok, false);
  assert.equal(lifecycle.activeGeneration, 0);
  assert.ok(result.errors.some(error => error.message === "ABSOLUTE_DEADLINE_EXCEEDED"));
  assert.ok(!result.errors.some(error => error.message === "START_FAILED_AFTER_DEADLINE"));
});

test("cleanup cap cannot refresh the operation absolute deadline", async () => {
  const lifecycle = new GenerationLifecycle(testAuthorityScope);
  const plan = requirePlan([{ id: "slow", requires: [] }]);
  const startedAt = performance.now();
  const result = await lifecycle.activate(activationRequest(
    lifecycle,
    "no-cleanup-refresh",
    plan,
    new Map([["slow", inertHooks({
      start: () => new Promise(() => undefined),
      stop: () => new Promise(() => undefined),
    })]]),
    { deadlineMs: 10, cleanupTimeoutMs: 80 },
  ));
  assert.equal(result.ok, false);
  assert.equal(result.termination, "termination_unproven");
  assert.ok(performance.now() - startedAt < 60);
});

test("deadlines beyond the Node timer limit are re-armed rather than clamped to one millisecond", async () => {
  const lifecycle = new GenerationLifecycle(testAuthorityScope);
  const plan = requirePlan([{ id: "candidate", requires: [] }]);
  const result = await lifecycle.activate(activationRequest(
    lifecycle,
    "long-deadline",
    plan,
    new Map([["candidate", inertHooks({ start: async () => delay(5) })]]),
    { deadlineMs: 2_147_483_647 + 1_000 },
  ));
  assert.equal(result.ok, true);
});

test("waiter clock failure leaves the retained terminal result replayable", async () => {
  let reads = 0;
  let starts = 0;
  const lifecycle = new GenerationLifecycle(testAuthorityScope, {
    now: () => {
      reads += 1;
      if (reads >= 4) throw new Error("CLOCK_FAILED");
      return performance.now();
    },
    sleep: milliseconds => delay(milliseconds),
  });
  const plan = requirePlan([{ id: "candidate", requires: [] }]);
  const request = activationRequest(
    lifecycle,
    "waiter-clock-failure",
    plan,
    new Map([["candidate", inertHooks({ start: async () => { starts += 1; await delay(5); } })]]),
  );
  await assert.rejects(lifecycle.activate(request), /WAITER_DEADLINE_EXCEEDED/);
  await delay(20);
  const replay = await lifecycle.activate(request);
  assert.equal(replay.generation, 1);
  assert.deepEqual(await lifecycle.activate(request), replay);
  assert.equal(starts, 0);
});

test("waiter deadline expiry during timer arming removes its abort listener", async () => {
  let expiryMode = false;
  let expiryReads = 0;
  const lifecycle = new GenerationLifecycle(testAuthorityScope, {
    now: () => {
      if (!expiryMode) return performance.now();
      expiryReads += 1;
      return expiryReads <= 2 ? 100 : 1_000;
    },
    sleep: milliseconds => delay(milliseconds),
  });
  const plan = requirePlan([{ id: "candidate", requires: [] }]);
  const request = activationRequest(
    lifecycle,
    "waiter-listener-cleanup",
    plan,
    new Map([["candidate", inertHooks()]]),
  );
  await lifecycle.activate(request);

  const listeners = new Set<EventListenerOrEventListenerObject>();
  const signal = {
    aborted: false,
    addEventListener: (_type: string, listener: EventListenerOrEventListenerObject) => {
      listeners.add(listener);
    },
    removeEventListener: (_type: string, listener: EventListenerOrEventListenerObject) => {
      listeners.delete(listener);
    },
  } as unknown as AbortSignal;
  expiryMode = true;
  await assert.rejects(
    lifecycle.activate(request, { absoluteDeadline: 500, signal }),
    /WAITER_DEADLINE_EXCEEDED/,
  );
  assert.equal(listeners.size, 0);
});

test("failed parallel batch settles siblings before reverse cleanup", async () => {
  const lifecycle = new GenerationLifecycle(testAuthorityScope);
  const plan = requirePlan([
    { id: "fails", requires: [] },
    { id: "slow-sibling", requires: [] },
  ]);
  let siblingFinished = false;
  let siblingStops = 0;
  const result = await lifecycle.activate(activationRequest(
    lifecycle,
    "parallel-failure",
    plan,
    new Map<string, ModuleHooks>([
    ["fails", inertHooks({ start: () => { throw new Error("START_FAILED"); } })],
    ["slow-sibling", inertHooks({
      start: async () => {
        await delay(20);
        siblingFinished = true;
      },
      stop: () => { siblingStops += 1; },
    })],
    ]),
  ));
  assert.equal(result.ok, false);
  assert.equal(siblingFinished, true);
  assert.equal(siblingStops, 1);
  assert.equal(lifecycle.activeGeneration, 0);
});

test("parallel activation reports every sibling failure", async () => {
  const lifecycle = new GenerationLifecycle(testAuthorityScope);
  const plan = requirePlan([
    { id: "fails-a", requires: [] },
    { id: "fails-b", requires: [] },
  ]);
  const result = await lifecycle.activate(activationRequest(
    lifecycle,
    "parallel-multiple-failures",
    plan,
    new Map<string, ModuleHooks>([
      ["fails-a", inertHooks({ start: () => { throw new Error("A_FAILED"); }, stop: () => undefined })],
      ["fails-b", inertHooks({ start: () => { throw new Error("B_FAILED"); }, stop: () => undefined })],
    ]),
  ));
  assert.equal(result.ok, false);
  assert.deepEqual(new Set(result.errors.map(error => error.message)), new Set(["A_FAILED", "B_FAILED"]));
  assert.deepEqual(
    new Set(result.errors.map(error => `${error.moduleId}:${error.phase}`)),
    new Set(["fails-a:start", "fails-b:start"]),
  );
});

test("hook bindings are complete before any module effect starts", async () => {
  const lifecycle = new GenerationLifecycle(testAuthorityScope);
  const plan = requirePlan([
    { id: "provider", requires: [] },
    { id: "consumer", requires: ["provider"] },
  ]);
  let effects = 0;
  const result = await lifecycle.activate(activationRequest(
    lifecycle,
    "missing-hook-preflight",
    plan,
    new Map([["provider", inertHooks({ prepare: () => { effects += 1; } })]]),
  ));
  assert.equal(result.ok, false);
  assert.equal(effects, 0);
  assert.deepEqual(result.errors, [{
    message: "MISSING_HOOKS:consumer",
    moduleId: "consumer",
    phase: "preflight",
  }]);
});

test("unplanned hook bindings fail preflight with module attribution", async () => {
  const lifecycle = new GenerationLifecycle(testAuthorityScope);
  const plan = requirePlan([{ id: "candidate", requires: [] }]);
  const result = await lifecycle.activate(activationRequest(
    lifecycle,
    "unplanned-hook-preflight",
    plan,
    new Map([
      ["candidate", inertHooks()],
      ["unplanned", inertHooks()],
    ]),
  ));
  assert.equal(result.ok, false);
  assert.deepEqual(result.errors, [{
    message: "UNPLANNED_HOOKS:unplanned",
    moduleId: "unplanned",
    phase: "preflight",
  }]);
});

test("hook preflight rejects accessors without invoking them", async () => {
  const lifecycle = new GenerationLifecycle(testAuthorityScope);
  const plan = requirePlan([{ id: "candidate", requires: [] }]);
  let getterEffects = 0;
  const hooks = { readiness: "inert" } as Record<string, unknown>;
  Object.defineProperty(hooks, "start", {
    enumerable: true,
    get: () => {
      getterEffects += 1;
      return () => undefined;
    },
  });
  const result = await lifecycle.activate(activationRequest(
    lifecycle,
    "accessor-hook-preflight",
    plan,
    new Map([["candidate", hooks as unknown as ModuleHooks]]),
  ));
  assert.equal(result.ok, false);
  assert.equal(getterEffects, 0);
  assert.deepEqual(result.errors, [{
    message: "ACCESSOR_HOOK_FIELD:candidate:start",
    moduleId: "candidate",
    phase: "preflight",
  }]);
});

test("hook preflight rejects prototype methods instead of silently dropping them", async () => {
  const lifecycle = new GenerationLifecycle(testAuthorityScope);
  const plan = requirePlan([{ id: "candidate", requires: [] }]);
  let effects = 0;
  class PrototypeHooks {
    readonly readiness = "inert" as const;

    start(): void {
      effects += 1;
    }

    stop(): void {
      effects += 1;
    }
  }
  const result = await lifecycle.activate(activationRequest(
    lifecycle,
    "prototype-hook-preflight",
    plan,
    new Map([["candidate", new PrototypeHooks()]]),
  ));
  assert.equal(result.ok, false);
  assert.equal(effects, 0);
  assert.deepEqual(result.errors, [{
    message: "NON_PLAIN_HOOKS:candidate",
    moduleId: "candidate",
    phase: "preflight",
  }]);
});

test("hook preflight rejects a Proxy that disguises prototype methods", async () => {
  const lifecycle = new GenerationLifecycle(testAuthorityScope);
  const plan = requirePlan([{ id: "candidate", requires: [] }]);
  let effects = 0;
  class PrototypeHooks {
    readonly readiness = "inert" as const;

    start(): void {
      effects += 1;
    }
  }
  const disguised = new Proxy(new PrototypeHooks(), {
    getPrototypeOf: () => Object.prototype,
  });
  const result = await lifecycle.activate(activationRequest(
    lifecycle,
    "proxy-hook-preflight",
    plan,
    new Map([["candidate", disguised]]),
  ));
  assert.equal(result.ok, false);
  assert.equal(effects, 0);
  assert.deepEqual(result.errors, [{
    message: "PROXY_HOOKS:candidate",
    moduleId: "candidate",
    phase: "preflight",
  }]);
});

test("a fast sibling failure promptly aborts cooperative siblings before cleanup", async () => {
  const lifecycle = new GenerationLifecycle(testAuthorityScope);
  const plan = requirePlan([
    { id: "fails", requires: [] },
    { id: "cooperative", requires: [] },
  ]);
  let cooperativeAborted = false;
  let stops = 0;
  const startedAt = performance.now();
  const result = await lifecycle.activate(activationRequest(
    lifecycle,
    "prompt-sibling-abort",
    plan,
    new Map<string, ModuleHooks>([
      ["fails", inertHooks({
        start: async () => {
          await delay(5);
          throw new Error("FAST_FAILURE");
        },
        stop: () => { stops += 1; },
      })],
      ["cooperative", inertHooks({
        start: ({ signal }) => new Promise<void>(resolve => {
          if (signal.aborted) {
            cooperativeAborted = true;
            resolve();
            return;
          }
          signal.addEventListener("abort", () => {
            cooperativeAborted = true;
            resolve();
          }, { once: true });
        }),
        stop: () => { stops += 1; },
      })],
    ]),
    { deadlineMs: 200, cleanupTimeoutMs: 80 },
  ));
  assert.equal(result.ok, false);
  assert.equal(cooperativeAborted, true);
  assert.equal(stops, 2);
  assert.ok(performance.now() - startedAt < 100, "cooperative sibling consumed the operation deadline");
  assert.deepEqual(result.errors.map(error => error.message), ["FAST_FAILURE"]);
});

test("a failed prepare prevents siblings from entering later activation phases", { timeout: 2_000 }, async () => {
  const lifecycle = new GenerationLifecycle(testAuthorityScope);
  const plan = requirePlan([
    { id: "fails", requires: [] },
    { id: "sibling", requires: [] },
  ]);
  const failingPrepareEntered = Promise.withResolvers<void>();
  const siblingPrepareFinished = Promise.withResolvers<void>();
  const releaseFailure = Promise.withResolvers<void>();
  let siblingStarts = 0;
  let siblingReadinessChecks = 0;
  const activation = lifecycle.activate(activationRequest(
    lifecycle,
    "prepare-sibling-abort",
    plan,
    new Map<string, ModuleHooks>([
      ["fails", inertHooks({
        prepare: async () => {
          failingPrepareEntered.resolve();
          await releaseFailure.promise;
          throw new Error("PREPARE_FAILURE");
        },
        stop: () => undefined,
      })],
      ["sibling", {
        readiness: "probe",
        prepare: () => { siblingPrepareFinished.resolve(); },
        start: () => { siblingStarts += 1; },
        ready: () => { siblingReadinessChecks += 1; return true; },
        stop: () => undefined,
      }],
    ]),
    { deadlineMs: 200, cleanupTimeoutMs: 80 },
  ));
  await Promise.all([failingPrepareEntered.promise, siblingPrepareFinished.promise]);
  releaseFailure.resolve();
  const result = await activation;
  assert.equal(result.ok, false);
  assert.equal(siblingStarts, 0);
  assert.equal(siblingReadinessChecks, 0);
  assert.deepEqual(result.errors.map(error => error.message), ["PREPARE_FAILURE"]);
  assert.equal(result.traces.some(trace => trace.moduleId === "sibling" && trace.phase === "start"), false);
  assert.equal(result.traces.some(trace => trace.moduleId === "sibling" && trace.phase === "ready"), false);
});

test("a failed start prevents siblings from entering readiness", { timeout: 2_000 }, async () => {
  const lifecycle = new GenerationLifecycle(testAuthorityScope);
  const plan = requirePlan([
    { id: "fails", requires: [] },
    { id: "sibling", requires: [] },
  ]);
  const failingStartEntered = Promise.withResolvers<void>();
  const siblingStartFinished = Promise.withResolvers<void>();
  const releaseFailure = Promise.withResolvers<void>();
  let siblingReadinessChecks = 0;
  const activation = lifecycle.activate(activationRequest(
    lifecycle,
    "start-sibling-abort",
    plan,
    new Map<string, ModuleHooks>([
      ["fails", inertHooks({
        start: async () => {
          failingStartEntered.resolve();
          await releaseFailure.promise;
          throw new Error("START_FAILURE");
        },
        stop: () => undefined,
      })],
      ["sibling", {
        readiness: "probe",
        start: () => { siblingStartFinished.resolve(); },
        ready: () => { siblingReadinessChecks += 1; return true; },
        stop: () => undefined,
      }],
    ]),
    { deadlineMs: 200, cleanupTimeoutMs: 80 },
  ));
  await Promise.all([failingStartEntered.promise, siblingStartFinished.promise]);
  releaseFailure.resolve();
  const result = await activation;
  assert.equal(result.ok, false);
  assert.equal(siblingReadinessChecks, 0);
  assert.deepEqual(result.errors.map(error => error.message), ["START_FAILURE"]);
  assert.equal(result.traces.some(trace => trace.moduleId === "sibling" && trace.phase === "start"), true);
  assert.equal(result.traces.some(trace => trace.moduleId === "sibling" && trace.phase === "ready"), false);
});

test("ignored activation cancellation is bounded without refreshing cleanup time", { timeout: 2_000 }, async () => {
  const lifecycle = new GenerationLifecycle(testAuthorityScope);
  const plan = requirePlan([{ id: "slow", requires: [] }]);
  const entered = Promise.withResolvers<void>();
  const release = Promise.withResolvers<void>();
  const finished = Promise.withResolvers<void>();
  let startRunning = false;
  let cleanupOverlapped = false;
  const activation = lifecycle.activate(activationRequest(
    lifecycle,
    "ignored-start-cancellation",
    plan,
    new Map([["slow", inertHooks({
      start: async () => {
        startRunning = true;
        entered.resolve();
        await release.promise;
        startRunning = false;
        finished.resolve();
      },
      stop: () => { cleanupOverlapped = startRunning; },
    })]]),
    { deadlineMs: 100, cleanupTimeoutMs: 20 },
  ));
  await entered.promise;
  const result = await activation;
  assert.equal(result.ok, false);
  assert.equal(result.termination, "termination_unproven");
  assert.equal(startRunning, true);
  assert.equal(cleanupOverlapped, false);
  release.resolve();
  await finished.promise;
  assert.equal(startRunning, false);
});

test("multi-level rollback keeps reverse levels, aggregates failures, and shares one cleanup deadline", async () => {
  const lifecycle = new GenerationLifecycle(testAuthorityScope);
  const plan = requirePlan([
    { id: "provider-a", requires: [] },
    { id: "provider-b", requires: [] },
    { id: "consumer", requires: ["provider-a", "provider-b"] },
    { id: "leaf", requires: ["consumer"] },
  ]);
  const stopped: string[] = [];
  const hooks = new Map<string, ModuleHooks>([
    ["provider-a", inertHooks({ stop: () => { stopped.push("provider-a"); throw new Error("STOP_A_FAILED"); } })],
    ["provider-b", inertHooks({ stop: async () => { stopped.push("provider-b"); await new Promise(() => undefined); } })],
    ["consumer", inertHooks({ stop: () => { stopped.push("consumer"); } })],
    ["leaf", inertHooks({
      start: () => { throw new Error("LEAF_START_FAILED"); },
      stop: () => { stopped.push("leaf"); },
    })],
  ]);
  const startedAt = Date.now();
  const result = await lifecycle.activate(activationRequest(
    lifecycle,
    "multi-level-rollback",
    plan,
    hooks,
    { cleanupTimeoutMs: 20 },
  ));
  assert.equal(result.ok, false);
  assert.equal(result.errors[0]?.message, "LEAF_START_FAILED");
  assert.deepEqual(stopped.slice(0, 2), ["leaf", "consumer"]);
  assert.deepEqual(new Set(stopped.slice(2)), new Set(["provider-a", "provider-b"]));
  assert.ok(result.errors.some(error => error.message === "STOP_A_FAILED"));
  assert.ok(result.errors.some(error => error.message === "CLEANUP_TIMEOUT:provider-b"));
  assert.equal(result.termination, "termination_unproven");
  assert.ok(Date.now() - startedAt < 250);
});

test("wall time preserves one absolute activation budget when an injected clock stalls", async () => {
  const lifecycle = new GenerationLifecycle(testAuthorityScope, {
    now: () => 0,
    sleep: milliseconds => delay(milliseconds),
  });
  const plan = requirePlan([
    { id: "a", requires: [] },
    { id: "b", requires: ["a"] },
    { id: "c", requires: ["b"] },
    { id: "d", requires: ["c"] },
  ]);
  const started: string[] = [];
  const hooks = new Map(plan.nodes.map(node => [node.id, inertHooks({
    start: async () => { started.push(node.id); await delay(30); },
  })]));
  const result = await lifecycle.activate(activationRequest(
    lifecycle,
    "stalled-clock-activation",
    plan,
    hooks,
    { deadlineMs: 50, cleanupTimeoutMs: 20 },
  ));
  assert.equal(result.ok, false);
  assert.equal(lifecycle.activeGeneration, 0);
  assert.ok(started.length < plan.nodes.length);
  assert.ok(result.errors.some(error => error.message === "ABSOLUTE_DEADLINE_EXCEEDED"));
});

test("wall time preserves one cleanup budget across reverse batches when an injected clock stalls", async () => {
  const lifecycle = new GenerationLifecycle(testAuthorityScope, {
    now: () => 0,
    sleep: milliseconds => delay(milliseconds),
  });
  const plan = requirePlan([
    { id: "a", requires: [] },
    { id: "b", requires: ["a"] },
    { id: "c", requires: ["b"] },
    { id: "d", requires: ["c"] },
  ]);
  const stopped: string[] = [];
  const hooks = new Map(plan.nodes.map(node => {
    const stop = async (): Promise<void> => { stopped.push(node.id); await delay(30); };
    const moduleHooks = node.id === "d"
      ? inertHooks({ start: () => { throw new Error("START_FAILED"); }, stop })
      : inertHooks({ stop });
    return [node.id, moduleHooks] as const;
  }));
  const result = await lifecycle.activate(activationRequest(
    lifecycle,
    "stalled-clock-cleanup",
    plan,
    hooks,
    { cleanupTimeoutMs: 50 },
  ));
  assert.equal(result.ok, false);
  assert.equal(result.termination, "termination_unproven");
  assert.ok(stopped.length < plan.nodes.length);
  assert.ok(result.errors.some(error => error.message.startsWith("CLEANUP_TIMEOUT:")));
});

test("invalid lifecycle deadlines fail before generation allocation or publication", () => {
  const lifecycle = new GenerationLifecycle(testAuthorityScope);
  const plan = requirePlan([{ id: "candidate", requires: [] }]);
  const request = activationRequest(lifecycle, "invalid-deadline", plan, new Map([["candidate", inertHooks()]]));
  assert.throws(() => lifecycle.activate({ ...request, absoluteDeadline: Number.NaN }), /INVALID_ABSOLUTE_DEADLINE/);
  for (const cleanupTimeoutMs of [Number.NaN, Number.POSITIVE_INFINITY, -1]) {
    assert.throws(() => lifecycle.activate({ ...request, cleanupTimeoutMs }), /INVALID_CLEANUP_TIMEOUT/);
  }
  assert.equal(lifecycle.activeGeneration, 0);
  assert.equal(lifecycle.cutovers, 0);
});

test("bounded drain emits in-memory debt evidence before fencing an old generation", async () => {
  const lifecycle = new GenerationLifecycle(testAuthorityScope);
  const first = requirePlan([{ id: "first", requires: [] }]);
  await lifecycle.activate(activationRequest(lifecycle, "drain-first", first, new Map([["first", inertHooks()]])));
  const oldGeneration = lifecycle.activeGeneration;
  const lease = lifecycle.acquireInvocation();

  const second = requirePlan([{ id: "second", requires: [] }]);
  const result = await lifecycle.activate(activationRequest(
    lifecycle,
    "drain-second",
    second,
    new Map([["second", inertHooks()]]),
    { cleanupTimeoutMs: 5 },
  ));
  assert.equal(result.ok, true);
  assert.equal(result.termination, "termination_unproven");
  assert.ok(result.errors.some(error => error.message === `DRAIN_TIMEOUT:${oldGeneration}`));
  assert.ok(result.traces.some(trace => trace.phase === "drain" && trace.outcome === "timed-out"));
  assert.throws(() => lifecycle.assertInMemoryFence(lease), /STALE_GENERATION/);
  lease.release();
});

test("successful cutover reports old-generation cleanup timeout as termination unproven", async () => {
  const lifecycle = new GenerationLifecycle(testAuthorityScope);
  const first = requirePlan([{ id: "first", requires: [] }]);
  await lifecycle.activate(activationRequest(
    lifecycle,
    "cleanup-timeout-first",
    first,
    new Map([["first", inertHooks({ stop: async () => new Promise(() => undefined) })]]),
  ));
  const second = requirePlan([{ id: "second", requires: [] }]);
  const result = await lifecycle.activate(activationRequest(
    lifecycle,
    "cleanup-timeout-second",
    second,
    new Map([["second", inertHooks()]]),
    { cleanupTimeoutMs: 5 },
  ));
  assert.equal(result.ok, true);
  assert.equal(result.termination, "termination_unproven");
  assert.ok(result.errors.some(error => error.message === "CLEANUP_TIMEOUT:first"));
});

test("post-publication drain failure becomes cleanup debt without aborting the active candidate", async () => {
  const clock = {
    now: () => 0,
    sleep: async () => { throw new Error("DRAIN_CLOCK_FAILED"); },
  };
  const lifecycle = new GenerationLifecycle(testAuthorityScope, clock);
  const first = requirePlan([{ id: "first", requires: [] }]);
  let firstStops = 0;
  await lifecycle.activate(activationRequest(
    lifecycle,
    "post-publication-first",
    first,
    new Map([["first", inertHooks({ stop: () => { firstStops += 1; } })]]),
  ));
  const oldLease = lifecycle.acquireInvocation();
  const second = requirePlan([{ id: "second", requires: [] }]);
  let secondStops = 0;
  const result = await lifecycle.activate(activationRequest(
    lifecycle,
    "post-publication-second",
    second,
    new Map([["second", inertHooks({ stop: () => { secondStops += 1; } })]]),
  ));
  assert.equal(result.ok, true);
  assert.equal(result.termination, "termination_unproven");
  assert.equal(lifecycle.activeGeneration, result.generation);
  assert.equal(firstStops, 1);
  assert.equal(secondStops, 0);
  assert.ok(result.errors.some(error => error.message === "DRAIN_CLOCK_FAILED"));
  assert.ok(result.traces.some(trace => trace.phase === "drain" && trace.outcome === "termination_unproven"));
  assert.throws(() => lifecycle.assertInMemoryFence(oldLease), /STALE_GENERATION/);
  const currentLease = lifecycle.acquireInvocation();
  assert.equal(currentLease.generation, result.generation);
  currentLease.release();
});

test("post-publication drain remains bounded when the injected clock sleep never settles", async () => {
  const clock = {
    now: () => 0,
    sleep: () => new Promise<void>(() => undefined),
  };
  const lifecycle = new GenerationLifecycle(testAuthorityScope, clock);
  const first = requirePlan([{ id: "first", requires: [] }]);
  await lifecycle.activate(activationRequest(
    lifecycle,
    "hung-drain-first",
    first,
    new Map([["first", inertHooks()]]),
  ));
  const oldLease = lifecycle.acquireInvocation();
  const second = requirePlan([{ id: "second", requires: [] }]);
  const startedAt = Date.now();
  const result = await lifecycle.activate(activationRequest(
    lifecycle,
    "hung-drain-second",
    second,
    new Map([["second", inertHooks()]]),
    { cleanupTimeoutMs: 10 },
  ));
  assert.ok(Date.now() - startedAt < 250);
  assert.equal(result.ok, true);
  assert.equal(result.termination, "termination_unproven");
  assert.ok(result.errors.some(error => error.message === `DRAIN_TIMEOUT:${oldLease.generation}`));
  assert.equal(lifecycle.activeGeneration, result.generation);
  assert.throws(() => lifecycle.assertInMemoryFence(oldLease), /STALE_GENERATION/);
  oldLease.release();
});

test("hostile error objects become bounded cleanup debt rather than escaping after publication", async () => {
  const hostile = new Error("hidden");
  Object.defineProperty(hostile, "message", { get: () => { throw new Error("MESSAGE_GETTER_FAILED"); } });
  const lifecycle = new GenerationLifecycle(testAuthorityScope, {
    now: () => 0,
    sleep: async () => { throw hostile; },
  });
  const first = requirePlan([{ id: "first", requires: [] }]);
  await lifecycle.activate(activationRequest(lifecycle, "hostile-error-first", first, new Map([["first", inertHooks()]])));
  const oldLease = lifecycle.acquireInvocation();
  const second = requirePlan([{ id: "second", requires: [] }]);
  const result = await lifecycle.activate(activationRequest(
    lifecycle,
    "hostile-error-second",
    second,
    new Map([["second", inertHooks()]]),
    { cleanupTimeoutMs: 10 },
  ));
  assert.equal(result.ok, true);
  assert.equal(result.termination, "termination_unproven");
  assert.ok(result.errors.some(error => error.message === "UNREADABLE_ERROR"));
  assert.equal(lifecycle.activeGeneration, result.generation);
  oldLease.release();
});

test("standalone lifecycle deadlines record async hangs and finite event-loop blocking", async t => {
  const children = new Set<ReturnType<typeof spawn>>();
  t.after(async () => {
    await Promise.all([...children].map(async child => {
      if (child.exitCode !== null || child.signalCode !== null) return;
      child.kill("SIGKILL");
      await once(child, "exit", { signal: AbortSignal.timeout(2_000) }).catch(() => undefined);
    }));
  });
  for (const phase of ["prepare", "start", "blocking-start", "stop"] as const) {
    const child = spawn(process.execPath, [join(fixtureRoot, "standalone-lifecycle-deadline.mjs"), phase], {
      stdio: ["ignore", "pipe", "pipe"],
    });
    children.add(child);
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", chunk => { stdout += chunk; });
    child.stderr.on("data", chunk => { stderr += chunk; });
    const [code] = await once(child, "close", { signal: AbortSignal.timeout(2_000) });
    children.delete(child);
    assert.equal(code, 0, `${phase}:${stderr}`);
    const result = JSON.parse(stdout) as {
      readonly ok: boolean;
      readonly termination: string;
      readonly errors: readonly { readonly message: string }[];
    };
    assert.equal(result.ok, phase === "stop", phase);
    assert.equal(result.termination, "termination_unproven", phase);
    assert.ok(result.errors.some(error => /(?:ABSOLUTE|CLEANUP)_TIMEOUT|DEADLINE_EXCEEDED/.test(error.message)), phase);
  }
});

test("future generations cannot be externally pre-sealed", async () => {
  const lifecycle = new GenerationLifecycle(testAuthorityScope);
  assert.equal("drain" in lifecycle, false);
  const plan = requirePlan([{ id: "candidate", requires: [] }]);
  const result = await lifecycle.activate(activationRequest(
    lifecycle,
    "not-pre-sealed",
    plan,
    new Map([["candidate", inertHooks()]]),
  ));
  assert.equal(result.ok, true);
  const lease = lifecycle.acquireInvocation();
  assert.equal(lease.generation, result.generation);
  lease.release();
});

test("replacement drains admitted work, cuts over once, and fences stale writes", async () => {
  const lifecycle = new GenerationLifecycle(testAuthorityScope);
  const first = requirePlan([{ id: "first", requires: [] }]);
  await lifecycle.activate(activationRequest(lifecycle, "replacement-first", first, new Map([["first", inertHooks()]])));
  const oldGeneration = lifecycle.activeGeneration;
  const lease = lifecycle.acquireInvocation();
  let oldWrite = 0;
  lifecycle.assertInMemoryFence(lease);
  oldWrite += 1;

  const second = requirePlan([{ id: "second", requires: [] }]);
  const replacement = lifecycle.activate(activationRequest(
    lifecycle,
    "replacement-second",
    second,
    new Map([["second", inertHooks()]]),
    { cleanupTimeoutMs: 100 },
  ));
  await delay(5);
  const newGeneration = lifecycle.activeGeneration;
  assert.notEqual(newGeneration, oldGeneration);
  const newLease = lifecycle.acquireInvocation();
  assert.equal(newLease.generation, newGeneration);
  lifecycle.assertInMemoryFence(lease);
  oldWrite += 1;
  newLease.release();
  lease.release();
  const result = await replacement;
  assert.equal(result.ok, true);
  assert.equal(lifecycle.cutovers, 2);
  assert.equal(oldWrite, 2);
  assert.throws(() => lifecycle.assertInMemoryFence(lease), /STALE_GENERATION/);
  assert.equal(oldWrite, 2);
});

test("crash recovery decisions are deterministic at durable boundaries", () => {
  const baseline: DurableLifecycleState = {
    operationId: "activation-1",
    intentDigest: "sha256:intent-1",
    authorityScope: "tenant:test/project:test",
    graphDigest: "sha256:graph-1",
    candidateGeneration: 2,
    candidateHostIncarnation: "host-incarnation-1",
    expectedActiveHostIncarnation: "host-incarnation-old",
    expectedActiveGeneration: 1,
    activeGeneration: 1,
    routeHeadGeneration: 1,
    expectedSinkFence: 41,
    candidateSinkFence: 42,
    sinkFence: 41,
    phase: "prepared",
    operationDeadlineExpired: false,
    drainDeadlineExpired: false,
    publicationEvidence: "none",
    externalOutcome: "none",
  };
  const published = {
    ...baseline,
    phase: "published" as const,
    activeGeneration: 2,
    routeHeadGeneration: 2,
    sinkFence: 42,
    publicationEvidence: "committed" as const,
  };
  const observed = (
    candidateState: "absent" | "running" | "ready" | "terminated" | "unknown",
    oldGenerationInFlight: boolean,
    overrides: Partial<{
      queryOperationId: string;
      queryIntentDigest: string;
      candidateGeneration: number;
      candidateOperationId: string;
      candidateIntentDigest: string;
      candidateHostIncarnation: string;
      candidateAuthorityScope: string;
      candidateGraphDigest: string;
      candidateSinkFence: number;
      queryAuthorityScope: string;
      queryGraphDigest: string;
      queryHostIncarnation: string;
      oldOperationId: string;
      oldIntentDigest: string;
      oldGeneration: number;
      oldHostIncarnation: string;
      oldAuthorityScope: string;
      oldSinkFence: number;
      oldTerminationEvidence: "running" | "stopped" | "unknown";
      oldCleanupEvidence: "pending" | "confirmed" | "uncertain";
    }> = {},
  ): ObservedHostState => ({
    queryOperationId: overrides.queryOperationId ?? "activation-1",
    queryIntentDigest: overrides.queryIntentDigest ?? "sha256:intent-1",
    queryAuthorityScope: overrides.queryAuthorityScope ?? testAuthorityScope,
    queryGraphDigest: overrides.queryGraphDigest ?? "sha256:graph-1",
    queryHostIncarnation: overrides.queryHostIncarnation ?? "host-incarnation-1",
    candidate: candidateState === "absent" ? { state: "absent" } : {
      state: candidateState,
      operationId: overrides.candidateOperationId ?? "activation-1",
      intentDigest: overrides.candidateIntentDigest ?? "sha256:intent-1",
      generation: overrides.candidateGeneration ?? 2,
      hostIncarnation: overrides.candidateHostIncarnation ?? "host-incarnation-1",
      authorityScope: overrides.candidateAuthorityScope ?? testAuthorityScope,
      graphDigest: overrides.candidateGraphDigest ?? "sha256:graph-1",
      sinkFence: overrides.candidateSinkFence ?? 42,
    },
    oldGeneration: {
      operationId: overrides.oldOperationId ?? "activation-1",
      intentDigest: overrides.oldIntentDigest ?? "sha256:intent-1",
      generation: overrides.oldGeneration ?? 1,
      hostIncarnation: overrides.oldHostIncarnation ?? "host-incarnation-old",
      authorityScope: overrides.oldAuthorityScope ?? testAuthorityScope,
      sinkFence: overrides.oldSinkFence ?? 41,
      inFlight: oldGenerationInFlight,
      terminationEvidence: overrides.oldTerminationEvidence ?? "running",
      cleanupEvidence: overrides.oldCleanupEvidence ?? "pending",
    },
  });
  const cases = [
    [baseline, observed("absent", false), "RETRY_IDEMPOTENT_PREPARE"],
    [{ ...baseline, phase: "started" }, observed("running", false), "INSPECT_CANDIDATE"],
    [{ ...baseline, phase: "ready" }, observed("ready", false), "PUBLISH_CANDIDATE"],
    [published, observed("ready", true), "RESUME_DRAIN"],
    [{ ...published, phase: "draining" }, observed("ready", true), "RESUME_DRAIN"],
    [published, observed("ready", false), "STOP_OLD_GENERATION"],
    [published, observed("ready", false, { oldTerminationEvidence: "stopped" }), "RECONCILE_OLD_CLEANUP"],
    [published, observed("ready", false, {
      oldTerminationEvidence: "stopped",
      oldCleanupEvidence: "confirmed",
    }), "RECORD_RETIREMENT"],
    [{ ...published, phase: "retired" }, observed("ready", false, {
      oldTerminationEvidence: "stopped",
      oldCleanupEvidence: "confirmed",
    }), "RETURN_RETIRED_RESULT"],
    [{ ...baseline, externalOutcome: "uncertain" }, observed("running", false), "CONTROLLED_RECOVERY"],
    [{ ...published, routeHeadGeneration: 1 }, observed("ready", false), "CONTROLLED_RECOVERY"],
    [{ ...published, phase: "draining", drainDeadlineExpired: true }, observed("ready", true), "CONTROLLED_RECOVERY"],
    [{ ...published, drainDeadlineExpired: true }, observed("ready", true), "CONTROLLED_RECOVERY"],
    [baseline, observed("ready", false, { candidateHostIncarnation: "stale-host" }), "CONTROLLED_RECOVERY"],
    [baseline, observed("ready", false, { candidateOperationId: "activation-other" }), "CONTROLLED_RECOVERY"],
    [baseline, observed("ready", false, { candidateIntentDigest: "sha256:intent-other" }), "CONTROLLED_RECOVERY"],
    [baseline, observed("ready", false, { candidateSinkFence: 43 }), "CONTROLLED_RECOVERY"],
    [baseline, observed("absent", false, { queryOperationId: "activation-other" }), "CONTROLLED_RECOVERY"],
    [baseline, observed("absent", false, { queryIntentDigest: "sha256:intent-other" }), "CONTROLLED_RECOVERY"],
    [baseline, observed("absent", false, { queryHostIncarnation: "stale-host" }), "CONTROLLED_RECOVERY"],
    [baseline, observed("absent", false, { queryAuthorityScope: "tenant:other/project:other" }), "CONTROLLED_RECOVERY"],
    [baseline, observed("absent", false, { queryGraphDigest: "sha256:wrong-graph" }), "CONTROLLED_RECOVERY"],
    [baseline, observed("absent", false, { oldGeneration: 9 }), "CONTROLLED_RECOVERY"],
    [baseline, observed("absent", false, { oldOperationId: "activation-other" }), "CONTROLLED_RECOVERY"],
    [baseline, observed("absent", false, { oldIntentDigest: "sha256:intent-other" }), "CONTROLLED_RECOVERY"],
    [baseline, observed("absent", false, { oldHostIncarnation: "host-incarnation-replayed" }), "CONTROLLED_RECOVERY"],
    [baseline, observed("absent", false, { oldSinkFence: 2 }), "CONTROLLED_RECOVERY"],
    [published, observed("ready", false, { oldTerminationEvidence: "unknown" }), "CONTROLLED_RECOVERY"],
    [published, observed("ready", false, { oldCleanupEvidence: "uncertain" }), "CONTROLLED_RECOVERY"],
  ] as const;
  for (const [state, observed, expected] of cases) {
    assert.equal(reconcileLifecycle(state, observed), expected);
    assert.equal(reconcileLifecycle(structuredClone(state), structuredClone(observed)), expected);
  }
  assert.equal(reconcileLifecycle(
    { ...baseline, candidateGeneration: Number.POSITIVE_INFINITY },
    observed("absent", false),
  ), "CONTROLLED_RECOVERY");
  assert.equal(reconcileLifecycle(
    { ...baseline, phase: "invalid" } as unknown as DurableLifecycleState,
    observed("absent", false),
  ), "CONTROLLED_RECOVERY");
  assert.equal(reconcileLifecycle(
    baseline,
    {
      ...observed("absent", false),
      oldGeneration: { ...observed("absent", false).oldGeneration, sinkFence: 1.5 },
    },
  ), "CONTROLLED_RECOVERY");
  for (const malformed of [null, {}, { candidate: null }, { oldGeneration: null }]) {
    assert.equal(reconcileLifecycle(
      baseline,
      malformed as unknown as ObservedHostState,
    ), "CONTROLLED_RECOVERY");
  }
  assert.equal(reconcileLifecycle(
    published,
    observed("ready", true, {
      oldTerminationEvidence: "stopped",
      oldCleanupEvidence: "confirmed",
    }),
  ), "CONTROLLED_RECOVERY");
  assert.equal(reconcileLifecycle(
    published,
    observed("ready", false, {
      oldTerminationEvidence: "running",
      oldCleanupEvidence: "confirmed",
    }),
  ), "CONTROLLED_RECOVERY");
  const throwingObservation = Object.defineProperty({}, "candidate", {
    enumerable: true,
    get: () => { throw new Error("OBSERVATION_GETTER_FAILED"); },
  });
  assert.equal(reconcileLifecycle(
    baseline,
    throwingObservation as unknown as ObservedHostState,
  ), "CONTROLLED_RECOVERY");

  const candidateStates = ["ready", "absent", "ready", "absent", "ready"];
  const hostileCandidate = Object.defineProperty({}, "state", {
    enumerable: true,
    get: () => candidateStates.shift(),
  });
  assert.equal(reconcileLifecycle(
    { ...baseline, phase: "ready" },
    { ...observed("ready", false), candidate: hostileCandidate } as unknown as ObservedHostState,
  ), "CONTROLLED_RECOVERY");
});

test("portable protocol rejects stale, expired, malformed, and oversized frames", () => {
  const authority = { ...protocolAuthority, now: Date.now() };
  const accepted = handlePortableWorkerFrame(frame(), authority);
  assert.throws(() => handlePortableWorkerFrame(frame({ kind: "result" }), authority), /INVALID_REQUEST_KIND/);
  assert.equal(accepted.kind, "result");
  assert.equal(accepted.senderId, "extension-host");
  assert.equal(accepted.audience, "product-host");
  assert.deepEqual(validateAuthorizedEnvelope(accepted, { ...responseAuthority, now: Date.now() }), accepted);
  assert.throws(() => handlePortableWorkerFrame(frame({ authorityScope: "tenant:other/project:other" }), authority), /AUTHORITY_SCOPE_MISMATCH/);
  assert.throws(() => handlePortableWorkerFrame(frame({ extensionInstanceId: "extension-instance-2" }), authority), /EXTENSION_INSTANCE_MISMATCH/);
  assert.throws(() => handlePortableWorkerFrame(frame({ graphGeneration: 2 }), authority), /STALE_GRAPH_GENERATION/);
  assert.throws(() => handlePortableWorkerFrame(frame({ moduleActivationGeneration: 6 }), authority), /STALE_MODULE_ACTIVATION_GENERATION/);
  assert.throws(() => handlePortableWorkerFrame(frame({ hostIncarnation: "stale-host" }), authority), /STALE_HOST_INCARNATION/);
  assert.throws(() => handlePortableWorkerFrame(frame({ senderId: "unauthenticated-peer" }), authority), /AUTHENTICATED_PEER_MISMATCH/);
  assert.throws(() => handlePortableWorkerFrame(frame({ audience: "different-host" }), authority), /AUDIENCE_MISMATCH/);
  assert.throws(() => handlePortableWorkerFrame(frame({ absoluteDeadline: authority.now - 1 }), authority), /DEADLINE_EXCEEDED/);
  assert.throws(() => handlePortableWorkerFrame(frame(), { ...authority, now: Number.NaN }), /INVALID_AUTHORITY_NOW/);
  for (const invalidId of ["\0", "request\nforged", " padded", "padded "]) {
    assert.throws(() => validateEnvelope(frame({ requestId: invalidId })), /INVALID_REQUESTID/);
  }
  assert.throws(() => validateEnvelope({}), /UNKNOWN_OR_MISSING_FIELD/);
  assert.throws(() => validateEnvelope({ ...frame(), extra: true }), /UNKNOWN_OR_MISSING_FIELD/);
  const cyclicPayload: Record<string, unknown> = {};
  cyclicPayload.self = cyclicPayload;
  assert.throws(() => validateEnvelope(frame({ payload: cyclicPayload })), /JSON_LIMIT_EXCEEDED/);
  assert.throws(() => validateEnvelope(frame({ payload: { text: "x".repeat(70_000) } })), /FRAME_TOO_LARGE/);
  assert.throws(() => validateEnvelope(frame({ payload: { value: Number.NaN } })), /INVALID_JSON_NUMBER/);
  assert.throws(() => validateEnvelope(frame({ payload: { value: -0 } })), /INVALID_JSON_NUMBER/);
  assert.throws(() => validateEnvelope(frame({ payload: { value: Number.MAX_SAFE_INTEGER + 1 } })), /INVALID_JSON_NUMBER/);
  assert.throws(() => validateEnvelope(frame({ payload: { value: "\ud800" } })), /INVALID_UNICODE_STRING/);
  assert.throws(() => validateEnvelope(frame({ payload: { ["\ud800"]: true } })), /INVALID_UNICODE_STRING/);
  assert.throws(() => validateEnvelope(frame({ payload: { value: undefined } })), /INVALID_JSON_VALUE/);
  assert.throws(() => validateEnvelope(frame({ payload: new Map() as unknown as Record<string, unknown> })), /INVALID_JSON_OBJECT/);
  const accessor = {} as Record<string, unknown>;
  Object.defineProperty(accessor, "value", { enumerable: true, get: () => "must-not-run" });
  assert.throws(() => validateEnvelope(frame({ payload: accessor })), /INVALID_JSON_OBJECT/);
  const sparse: unknown[] = [];
  sparse.length = 1;
  assert.throws(() => validateEnvelope(frame({ payload: { sparse } })), /INVALID_JSON_ARRAY/);
  const arrayAccessor: unknown[] = [];
  Object.defineProperty(arrayAccessor, "0", { enumerable: true, get: () => "must-not-run" });
  arrayAccessor.length = 1;
  assert.throws(() => validateEnvelope(frame({ payload: { arrayAccessor } })), /INVALID_JSON_ARRAY/);
  const extraArrayProperty: unknown[] & { extra?: string } = [];
  extraArrayProperty.extra = "unexpected";
  assert.throws(() => validateEnvelope(frame({ payload: { extraArrayProperty } })), /INVALID_JSON_ARRAY/);
  const proxyArray = new Proxy([1], {});
  assert.throws(() => validateEnvelope(frame({ payload: { proxyArray } })), /INVALID_JSON_VALUE/);
  const normalized = validateEnvelope(frame({ payload: { nested: { value: 1 } } }));
  assert.equal(Object.isFrozen(normalized.payload), true);
  assert.equal(Object.isFrozen(normalized.payload.nested), true);
  assert.deepEqual(decodeLengthPrefixedFrame(encodeLengthPrefixedFrame(normalized)), normalized);

  const rawFrame = (text: string): Uint8Array => {
    const payload = Buffer.from(text, "utf8");
    const packet = Buffer.alloc(payload.byteLength + 4);
    packet.writeUInt32BE(payload.byteLength, 0);
    payload.copy(packet, 4);
    return packet;
  };
  const duplicateOperation = JSON.stringify(frame()).replace(
    '"operationId":"operation-1"',
    '"operationId":"operation-1","operationId":"operation-2"',
  );
  assert.throws(() => decodeLengthPrefixedFrame(rawFrame(duplicateOperation)), /INVALID_JSON_FRAME/);
  const unsafeInteger = JSON.stringify(frame()).replace(
    '"payload":{}',
    '"payload":{"value":9007199254740993}',
  );
  assert.throws(() => decodeLengthPrefixedFrame(rawFrame(unsafeInteger)), /INVALID_JSON_NUMBER/);
  const aliasedGeneration = JSON.stringify(frame()).replace(
    '"graphGeneration":1',
    '"graphGeneration":1.00000000000000001',
  );
  assert.throws(() => decodeLengthPrefixedFrame(rawFrame(aliasedGeneration)), /INVALID_JSON_NUMBER/);
  const invalidUtf8 = Uint8Array.from([0, 0, 0, 2, 0xc3, 0x28]);
  assert.throws(() => decodeLengthPrefixedFrame(invalidUtf8), /INVALID_JSON_FRAME/);

  const request = frame({ kind: "prepare" });
  assert.throws(
    () => handlePortableWorkerFrame(frame({ kind: "ready" }), { ...protocolAuthority, now: Date.now() }),
    /INVALID_REQUEST_KIND/,
  );
  const response = handlePortableWorkerFrame(request, { ...protocolAuthority, now: Date.now() });
  assert.equal(validateResponseEnvelope(
    response,
    { ...responseAuthority, now: Date.now() },
    request,
    "result",
  ).payload.acceptedKind, "prepare");
  assert.throws(() => validateResponseEnvelope(
    { ...response, requestId: "wrong-request" },
    { ...responseAuthority, now: Date.now() },
    request,
    "result",
  ), /RESPONSE_REQUEST_MISMATCH/);
  assert.throws(() => validateResponseEnvelope(
    { ...response, absoluteDeadline: response.absoluteDeadline + 1 },
    { ...responseAuthority, now: Date.now() },
    request,
    "result",
  ), /RESPONSE_DEADLINE_MISMATCH/);
  assert.throws(() => validateResponseEnvelope(
    response,
    { ...responseAuthority, now: Date.now() },
    request,
    "stop" as never,
  ), /INVALID_EXPECTED_RESPONSE_KIND/);
});

test("process-host smoke acknowledges hello and readiness over bounded length-prefixed JSON", async t => {
  const child = spawn(process.execPath, [join(fixtureRoot, "process-child.mjs")], { stdio: ["pipe", "pipe", "pipe"] });
  t.after(() => child.kill("SIGKILL"));
  const responses: ProtocolEnvelope[] = [];
  let childFailure: Error | undefined;
  child.once("error", error => { childFailure = error; });
  let buffer = Buffer.alloc(0);
  child.stdout.on("data", chunk => {
    buffer = Buffer.concat([buffer, chunk]);
    for (;;) {
      if (buffer.byteLength < 4) break;
      const length = buffer.readUInt32BE(0);
      if (length > maxFrameBytes) {
        childFailure = new Error("PROCESS_FRAME_TOO_LARGE");
        child.kill("SIGKILL");
        break;
      }
      if (buffer.byteLength < length + 4) break;
      responses.push(decodeLengthPrefixedFrame(buffer.subarray(0, length + 4)));
      buffer = buffer.subarray(length + 4);
    }
  });
  const helloRequest = frame();
  const prepareRequest = frame({ requestId: "request-2", kind: "prepare" });
  const drainRequest = frame({ requestId: "request-3", kind: "drain" });
  child.stdin.write(encodeLengthPrefixedFrame(helloRequest));
  child.stdin.write(encodeLengthPrefixedFrame(prepareRequest));
  child.stdin.write(encodeLengthPrefixedFrame(drainRequest));
  await waitUntil(() => responses.length >= 3 || childFailure !== undefined, 2_000, "PROCESS_RESPONSE_TIMEOUT");
  if (childFailure) throw childFailure;
  assert.equal(validateResponseEnvelope(
    responses[0],
    { ...responseAuthority, now: Date.now() },
    helloRequest,
    "result",
  ).kind, "result");
  assert.equal(validateResponseEnvelope(
    responses[1],
    { ...responseAuthority, now: Date.now() },
    prepareRequest,
    "ready",
  ).kind, "ready");
  assert.equal(validateResponseEnvelope(
    responses[2],
    { ...responseAuthority, now: Date.now() },
    drainRequest,
    "result",
  ).payload.drained, true);
  const stopRequest = frame({ requestId: "request-4", kind: "stop" });
  const exit = once(child, "exit", { signal: AbortSignal.timeout(2_000) });
  child.stdin.write(encodeLengthPrefixedFrame(stopRequest));
  await waitUntil(() => responses.length >= 4 || childFailure !== undefined, 2_000, "PROCESS_STOP_RESPONSE_TIMEOUT");
  if (childFailure) throw childFailure;
  assert.equal(validateResponseEnvelope(
    responses[3],
    { ...responseAuthority, now: Date.now() },
    stopRequest,
    "result",
  ).payload.stopped, true);
  const [exitCode] = await exit;
  assert.equal(exitCode, 0);
});

test("process-host stop is a terminal receive barrier for already-buffered frames", async t => {
  const child = spawn(process.execPath, [join(fixtureRoot, "process-child.mjs")], { stdio: ["pipe", "pipe", "pipe"] });
  t.after(() => child.kill("SIGKILL"));
  const responses: ProtocolEnvelope[] = [];
  let buffer = Buffer.alloc(0);
  child.stdout.on("data", chunk => {
    buffer = Buffer.concat([buffer, chunk]);
    while (buffer.byteLength >= 4) {
      const length = buffer.readUInt32BE(0);
      if (length > maxFrameBytes || buffer.byteLength < length + 4) return;
      responses.push(decodeLengthPrefixedFrame(buffer.subarray(0, length + 4)));
      buffer = buffer.subarray(length + 4);
    }
  });
  const stopRequest = frame({ requestId: "terminal-stop", kind: "stop" });
  const prepareAfterStop = frame({ requestId: "after-stop", kind: "prepare" });
  child.stdin.write(Buffer.concat([
    encodeLengthPrefixedFrame(stopRequest),
    encodeLengthPrefixedFrame(prepareAfterStop),
  ]));
  const [exitCode] = await once(child, "close", { signal: AbortSignal.timeout(2_000) });
  assert.equal(exitCode, 0);
  assert.equal(responses.length, 1);
  assert.equal(validateResponseEnvelope(
    responses[0],
    { ...responseAuthority, now: Date.now() },
    stopRequest,
    "result",
  ).payload.stopped, true);
});

test("process-host fixture enforces deadline and authority before handling", async t => {
  const child = spawn(process.execPath, [join(fixtureRoot, "process-child.mjs")], { stdio: ["pipe", "pipe", "pipe"] });
  t.after(() => child.kill("SIGKILL"));
  child.stdin.write(encodeLengthPrefixedFrame(frame({ absoluteDeadline: Date.now() - 1 })));
  const [code] = await once(child, "exit", { signal: AbortSignal.timeout(2_000) });
  assert.notEqual(code, 0);
});

test("Worker structured-clone boundary preserves validation and stale rejection", async t => {
  const worker = new Worker(new URL("./fixtures/portable-worker.mjs", import.meta.url), {
    workerData: protocolAuthority,
  });
  t.after(async () => {
    await Promise.race([
      worker.terminate(),
      rejectAfter(2_000, () => new Error("WORKER_TERMINATION_TIMEOUT")),
    ]);
  });
  const responses: unknown[] = [];
  let workerFailure: Error | undefined;
  worker.on("message", message => responses.push(message));
  worker.once("error", error => { workerFailure = error; });
  worker.once("exit", code => {
    if (code !== 0) workerFailure = new Error(`WORKER_EXITED:${code}`);
  });
  const request = frame({ kind: "prepare" });
  worker.postMessage(structuredClone(request));
  await waitUntil(() => responses.length >= 1 || workerFailure !== undefined, 2_000, "WORKER_RESPONSE_TIMEOUT");
  if (workerFailure) throw workerFailure;
  const workerResponse = responses[0] as { readonly ok?: unknown; readonly frame?: unknown };
  assert.equal(workerResponse.ok, true);
  const validatedResponse = validateResponseEnvelope(
    workerResponse.frame,
    { ...responseAuthority, now: Date.now() },
    request,
    "result",
  );
  assert.deepEqual(validatedResponse, {
    ...request,
    senderId: "extension-host",
    audience: "product-host",
    kind: "result",
    payload: { acceptedKind: "prepare" },
  });
  worker.postMessage(frame({ moduleActivationGeneration: 6 }));
  await waitUntil(() => responses.length >= 2 || workerFailure !== undefined, 2_000, "WORKER_STALE_RESPONSE_TIMEOUT");
  if (workerFailure) throw workerFailure;
  assert.deepEqual(responses[1], { ok: false, error: "STALE_MODULE_ACTIVATION_GENERATION" });
});

test("browser Worker carries a portable generation-bound frame", { timeout: 40_000 }, async t => {
  const isCi = process.env.CI?.trim().toLowerCase() === "true";
  const candidates = process.platform === "darwin"
    ? [
        "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
        "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      ]
    : process.platform === "win32"
      ? [
          join(process.env.PROGRAMFILES ?? "C:\\Program Files", "Google", "Chrome", "Application", "chrome.exe"),
          join(process.env["PROGRAMFILES(X86)"] ?? "C:\\Program Files (x86)", "Google", "Chrome", "Application", "chrome.exe"),
          join(process.env.PROGRAMFILES ?? "C:\\Program Files", "Microsoft", "Edge", "Application", "msedge.exe"),
          join(process.env["PROGRAMFILES(X86)"] ?? "C:\\Program Files (x86)", "Microsoft", "Edge", "Application", "msedge.exe"),
        ]
      : ["/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser"];
  let browser: string | undefined;
  for (const candidate of candidates) {
    if (process.platform === "win32") {
      try {
        await access(candidate);
        browser = candidate;
        break;
      } catch {
        continue;
      }
    }
    const probe = spawn(candidate, ["--version"], { stdio: "ignore" });
    try {
      const [code] = await once(probe, "exit", { signal: AbortSignal.timeout(2_000) });
      if (code === 0) {
        browser = candidate;
        break;
      }
    } catch {
      // The cross-platform release matrix supplies a browser when this profile is mandatory.
    } finally {
      if (probe.exitCode === null && probe.signalCode === null) probe.kill("SIGKILL");
    }
  }
  if (!browser) {
    if (isCi) assert.fail("CI_BROWSER_NOT_AVAILABLE");
    t.skip("no supported Chromium browser is installed");
    return;
  }

  const allowedFiles = new Map([
    ["/fixtures/browser-worker.html", join(fixtureRoot, "browser-worker.html")],
    ["/fixtures/portable-browser-worker.mjs", join(fixtureRoot, "portable-browser-worker.mjs")],
    ["/portable-protocol.mjs", join(qualificationRoot, "portable-protocol.mjs")],
  ]);
  const server = createServer(async (request, response) => {
    const pathname = new URL(request.url ?? "/", "http://127.0.0.1").pathname;
    const file = allowedFiles.get(pathname);
    if (!file) {
      response.writeHead(404).end();
      return;
    }
    response.setHeader("Content-Type", pathname.endsWith(".html") ? "text/html" : "text/javascript");
    response.end(await readFile(file));
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(async () => {
    server.closeAllConnections();
    if (!server.listening) return;
    await new Promise<void>((resolve, reject) => {
      server.close(error => error ? reject(error) : resolve());
    });
  });
  const address = server.address() as AddressInfo;
  const page = `http://127.0.0.1:${address.port}/fixtures/browser-worker.html`;
  const profile = await mkdtemp(join(tmpdir(), "extension-browser-worker-"));
  const child = spawn(browser, [
    "--headless=new",
    "--disable-gpu",
    "--disable-background-timer-throttling",
    ...(isCi && process.platform === "linux" ? ["--disable-dev-shm-usage"] : []),
    "--no-first-run",
    "--no-default-browser-check",
    ...(isCi && process.platform === "linux" ? ["--no-sandbox"] : []),
    "--remote-debugging-port=0",
    `--user-data-dir=${profile}`,
    page,
  ], { stdio: ["ignore", "ignore", "pipe"] });
  let childFailure: Error | undefined;
  const childExit = new Promise<void>(resolve => {
    child.once("error", error => {
      childFailure = error;
      resolve();
    });
    child.once("exit", () => resolve());
  });
  t.after(async () => {
    if (child.exitCode === null && child.signalCode === null) child.kill("SIGKILL");
    try {
      await Promise.race([
        childExit,
        rejectAfter(2_000, () => new Error("BROWSER_PROCESS_TERMINATION_TIMEOUT")),
      ]);
    } finally {
      await rm(profile, { recursive: true, force: true, maxRetries: 20, retryDelay: 100 });
    }
  });
  child.stderr.setEncoding("utf8");
  let stderr = "";
  child.stderr.on("data", chunk => { stderr += chunk; });
  let debuggerUrl: string | undefined;
  const debuggerDeadline = performance.now() + 15_000;
  while (performance.now() < debuggerDeadline) {
    try {
      const [portLine, pathLine] = (await readFile(join(profile, "DevToolsActivePort"), "utf8")).trim().split(/\r?\n/, 2);
      const port = Number(portLine);
      if (Number.isInteger(port) && port > 0 && port <= 65_535 && pathLine?.startsWith("/devtools/browser/")) {
        debuggerUrl = `ws://127.0.0.1:${port}${pathLine}`;
        break;
      }
    } catch {
      // Chromium publishes DevToolsActivePort atomically after its debugger is ready.
    }
    if (childFailure) throw new Error(`BROWSER_START_FAILED:${childFailure.message}:${stderr}`);
    if (child.exitCode !== null || child.signalCode !== null) {
      throw new Error(`BROWSER_EXITED_EARLY:${String(child.exitCode ?? child.signalCode)}:${stderr}`);
    }
    await delay(25);
  }
  if (!debuggerUrl) throw new Error(`BROWSER_DEBUGGER_TIMEOUT:${stderr}`);
  const debuggerHttp = new URL(debuggerUrl);
  debuggerHttp.protocol = "http:";
  debuggerHttp.pathname = "/json/list";
  debuggerHttp.search = "";
  debuggerHttp.hash = "";
  let pageTarget: { readonly url?: string; readonly webSocketDebuggerUrl?: string } | undefined;
  let discoveryError: unknown;
  const discoveryDeadline = performance.now() + 8_000;
  while (performance.now() < discoveryDeadline) {
    try {
      const targets = await fetch(debuggerHttp, { signal: AbortSignal.timeout(500) }).then(response => response.json()) as readonly {
        readonly type?: string;
        readonly url?: string;
        readonly webSocketDebuggerUrl?: string;
      }[];
      pageTarget = targets.find(target => target.type === "page" && target.url === page);
      if (pageTarget?.webSocketDebuggerUrl) break;
    } catch (error) {
      discoveryError = error;
    }
    await delay(50);
  }
  assert.ok(
    pageTarget?.webSocketDebuggerUrl,
    `BROWSER_PAGE_TARGET_MISSING:${discoveryError instanceof Error ? discoveryError.message : String(discoveryError)}:${stderr}`,
  );
  const socket = new WebSocket(pageTarget.webSocketDebuggerUrl);
  await Promise.race([
    new Promise<void>((resolve, reject) => {
      socket.addEventListener("open", () => resolve(), { once: true });
      socket.addEventListener("error", () => reject(new Error("BROWSER_CDP_SOCKET_ERROR")), { once: true });
    }),
    rejectAfter(5_000, () => new Error("BROWSER_CDP_SOCKET_TIMEOUT")),
  ]);
  t.after(async () => {
    if (socket.readyState === WebSocket.CLOSED) return;
    const closed = new Promise<void>((resolve, reject) => {
      socket.addEventListener("close", () => resolve(), { once: true });
      socket.addEventListener("error", () => reject(new Error("BROWSER_CDP_SOCKET_CLOSE_FAILED")), { once: true });
    });
    socket.close();
    await Promise.race([
      closed,
      rejectAfter(2_000, () => new Error("BROWSER_CDP_SOCKET_CLOSE_TIMEOUT")),
    ]);
  });
  let nextCommandId = 1;
  const pendingCommands = new Map<number, {
    readonly resolve: (value: Record<string, unknown>) => void;
    readonly reject: (error: Error) => void;
    readonly timer: ReturnType<typeof setTimeout>;
  }>();
  const rejectPendingCommands = (error: Error): void => {
    for (const [id, pending] of pendingCommands) {
      clearTimeout(pending.timer);
      pending.reject(error);
      pendingCommands.delete(id);
    }
  };
  socket.addEventListener("close", () => rejectPendingCommands(new Error("BROWSER_CDP_SOCKET_CLOSED")));
  socket.addEventListener("error", () => rejectPendingCommands(new Error("BROWSER_CDP_SOCKET_ERROR")));
  socket.addEventListener("message", event => {
    const message = JSON.parse(String(event.data)) as {
      readonly id?: number;
      readonly result?: Record<string, unknown>;
      readonly error?: { readonly message?: string };
    };
    if (message.id === undefined) return;
    const pending = pendingCommands.get(message.id);
    if (!pending) return;
    pendingCommands.delete(message.id);
    clearTimeout(pending.timer);
    if (message.error) pending.reject(new Error(message.error.message ?? "BROWSER_CDP_ERROR"));
    else pending.resolve(message.result ?? {});
  });
  const evaluate = (expression: string): Promise<Record<string, unknown>> => new Promise((resolve, reject) => {
    const id = nextCommandId++;
    const timer = setTimeout(() => {
      pendingCommands.delete(id);
      reject(new Error("BROWSER_CDP_COMMAND_TIMEOUT"));
    }, 2_000);
    timer.unref();
    pendingCommands.set(id, { resolve, reject, timer });
    try {
      socket.send(JSON.stringify({ id, method: "Runtime.evaluate", params: { expression, returnByValue: true } }));
    } catch (error) {
      clearTimeout(timer);
      pendingCommands.delete(id);
      reject(error);
    }
  });
  let output = "pending";
  for (let attempt = 0; attempt < 200; attempt += 1) {
    const evaluation = await evaluate('document.querySelector("#result")?.textContent');
    const result = evaluation.result as { readonly value?: unknown } | undefined;
    if (typeof result?.value === "string") output = result.value;
    if (output !== "pending") break;
    await delay(25);
  }
  assert.notEqual(output, "pending", `BROWSER_WORKER_RESULT_TIMEOUT:${stderr}`);
  const parsed = JSON.parse(output) as { readonly ok?: unknown; readonly frame?: ProtocolEnvelope; readonly error?: unknown };
  assert.equal(parsed.ok, true, String(parsed.error ?? output));
  assert.equal(parsed.frame?.moduleActivationGeneration, 7);
  assert.equal(parsed.frame?.senderId, "extension-host");
  assert.equal(parsed.frame?.audience, "product-host");
  assert.equal(parsed.frame?.kind, "result");
});

test("packed toy package exercises an isolated consumer without Foundation, Cordis, or plugin dependencies", async t => {
  const root = await mkdtemp(join(tmpdir(), "extension-packed-consumer-"));
  const children = new Set<ReturnType<typeof spawn>>();
  t.after(async () => {
    await Promise.all([...children].map(async child => {
      if (child.exitCode !== null || child.signalCode !== null) return;
      child.kill("SIGKILL");
      await once(child, "exit", { signal: AbortSignal.timeout(2_000) }).catch(() => undefined);
    }));
    await rm(root, { recursive: true, force: true, maxRetries: 20, retryDelay: 100 });
  });
  const fixtureManifest = JSON.parse(await readFile(join(fixtureRoot, "toy-package", "package.json"), "utf8")) as {
    readonly private?: unknown;
  };
  assert.equal(fixtureManifest.private, true, "qualification fixture must not be publishable");
  const pack = spawn("npm", ["pack", join(fixtureRoot, "toy-package"), "--json", "--pack-destination", root], { stdio: ["ignore", "pipe", "pipe"] });
  children.add(pack);
  let stdout = "";
  pack.stdout.setEncoding("utf8");
  pack.stdout.on("data", chunk => { stdout += chunk; });
  const [packCode] = await once(pack, "exit", { signal: AbortSignal.timeout(30_000) });
  children.delete(pack);
  assert.equal(packCode, 0);
  const packed = JSON.parse(stdout) as Array<{ filename: string; files: Array<{ path: string }> }>;
  assert.deepEqual(packed[0]?.files.map(file => file.path).sort(), ["index.d.ts", "index.js", "package.json"]);

  const consumer = join(root, "consumer");
  await mkdir(consumer);
  await writeFile(join(consumer, "package.json"), JSON.stringify({ private: true, type: "module" }));
  const install = spawn("npm", ["install", "--ignore-scripts", "--package-lock=false", join(root, packed[0]!.filename)], { cwd: consumer, stdio: "ignore" });
  children.add(install);
  const [installCode] = await once(install, "exit", { signal: AbortSignal.timeout(30_000) });
  children.delete(install);
  assert.equal(installCode, 0);
  const list = spawn("npm", ["ls", "--all", "--json"], { cwd: consumer, stdio: ["ignore", "pipe", "pipe"] });
  children.add(list);
  let listOutput = "";
  let listError = "";
  list.stdout.setEncoding("utf8");
  list.stderr.setEncoding("utf8");
  list.stdout.on("data", chunk => { listOutput += chunk; });
  list.stderr.on("data", chunk => { listError += chunk; });
  const [listCode] = await once(list, "exit", { signal: AbortSignal.timeout(30_000) });
  children.delete(list);
  assert.equal(listCode, 0, listError);
  const dependencyNames = new Set<string>();
  const visitDependencies = (node: { readonly dependencies?: Record<string, unknown> }): void => {
    for (const [name, dependency] of Object.entries(node.dependencies ?? {})) {
      dependencyNames.add(name);
      if (typeof dependency === "object" && dependency !== null) {
        visitDependencies(dependency as { readonly dependencies?: Record<string, unknown> });
      }
    }
  };
  visitDependencies(JSON.parse(listOutput) as { readonly dependencies?: Record<string, unknown> });
  assert.deepEqual([...dependencyNames].sort(), ["@agent-teams/qualification-toy-package"]);
  const execute = spawn(process.execPath, [
    "--input-type=module",
    "--eval",
    'import { createCounter } from "@agent-teams/qualification-toy-package"; process.stdout.write(String(createCounter(3).next()));',
  ], { cwd: consumer, stdio: ["ignore", "pipe", "pipe"] });
  children.add(execute);
  let result = "";
  execute.stdout.setEncoding("utf8");
  execute.stdout.on("data", chunk => { result += chunk; });
  const [executeCode] = await once(execute, "exit", { signal: AbortSignal.timeout(10_000) });
  children.delete(execute);
  assert.equal(executeCode, 0);
  assert.equal(result, "4");
});

test("Cordis qualifies only as a private scoped-resource candidate", async () => {
  const events: string[] = [];
  const root = new Context();
  const plugin = (ctx: Context) => ctx.effect(() => {
    events.push("start");
    return () => { events.push("stop"); };
  }, "qualification-resource");
  const fiber = await root.plugin(plugin);
  assert.deepEqual(events, ["start"]);
  assert.equal("ready" in fiber, false);
  assert.equal("publish" in fiber, false);
  assert.equal("drain" in fiber, false);
  await fiber.dispose();
  assert.deepEqual(events, ["start", "stop"]);
});

test("Cordis hooks preserve the coordinator-owned trace shape in an applicability check", async () => {
  const first = requirePlan([
    { id: "provider", requires: [] },
    { id: "consumer", requires: ["provider"] },
  ]);
  const second = requirePlan([{ id: "replacement", requires: [] }]);
  const native = new GenerationLifecycle(testAuthorityScope);
  await native.activate(activationRequest(native, "native-first", first, new Map([
    ["provider", inertHooks()],
    ["consumer", inertHooks()],
  ])));
  const nativeResult = await native.activate(activationRequest(
    native,
    "native-replacement",
    second,
    new Map([["replacement", inertHooks()]]),
  ));

  const root = new Context();
  const disposers = new Map<string, () => Promise<void>>();
  const cordisHooks = (moduleId: string): ModuleHooks => inertHooks({
    async start() {
      const fiber = await root.plugin((ctx: Context) => ctx.effect(() => () => undefined, moduleId));
      disposers.set(moduleId, () => fiber.dispose());
    },
    async stop() {
      await disposers.get(moduleId)?.();
      disposers.delete(moduleId);
    },
  });
  const cordis = new GenerationLifecycle(testAuthorityScope);
  await cordis.activate(activationRequest(cordis, "cordis-first", first, new Map([
    ["provider", cordisHooks("provider")],
    ["consumer", cordisHooks("consumer")],
  ])));
  const cordisResult = await cordis.activate(activationRequest(
    cordis,
    "cordis-replacement",
    second,
    new Map([["replacement", cordisHooks("replacement")]]),
  ));

  const semanticTrace = (result: typeof nativeResult) => result.traces.map(trace => ({
    phase: trace.phase,
    moduleId: trace.moduleId,
    generation: trace.generation,
    outcome: trace.outcome,
  }));
  assert.deepEqual(semanticTrace(cordisResult), semanticTrace(nativeResult));
  await Promise.all([...disposers.values()].map(dispose => dispose()));
});

test("WASM boundary accepts an inert numeric component but grants no host capability", async () => {
  const bytes = Uint8Array.from([
    0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00,
    0x01, 0x07, 0x01, 0x60, 0x02, 0x7f, 0x7f, 0x01, 0x7f,
    0x03, 0x02, 0x01, 0x00,
    0x07, 0x07, 0x01, 0x03, 0x61, 0x64, 0x64, 0x00, 0x00,
    0x0a, 0x09, 0x01, 0x07, 0x00, 0x20, 0x00, 0x20, 0x01, 0x6a, 0x0b,
  ]);
  const instance = await WebAssembly.instantiate(bytes, {});
  const add = instance.instance.exports.add as (left: number, right: number) => number;
  assert.equal(add(20, 22), 42);
  assert.deepEqual(WebAssembly.Module.imports(instance.module), []);
});
