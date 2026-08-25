import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { access, mkdtemp, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
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
  type ProtocolEnvelope,
  validateEnvelope,
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
  audience: "extension-host",
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
      grantRevision: "grant-revision-1",
      hostPolicyRevision: "host-policy-revision-1",
    },
    plan,
    hooks,
    absoluteDeadline: lifecycle.deadlineAfter(options.deadlineMs ?? 1_000),
    ...(options.cleanupTimeoutMs === undefined ? {} : { cleanupTimeoutMs: options.cleanupTimeoutMs }),
  };
}

test("invalid ID-DAG input produces deterministic diagnostics without loading hooks", () => {
  const definitions = [
    { id: "consumer", requires: ["missing"] },
    { id: "consumer", requires: [] },
  ];
  const first = compileGraph(definitions);
  const second = compileGraph([...definitions].reverse());
  assert.equal(first.ok, false);
  assert.deepEqual(first, second);
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

test("same completed operation returns its retained result without a second start", async () => {
  const lifecycle = new GenerationLifecycle(testAuthorityScope);
  const plan = requirePlan([{ id: "module", requires: [] }]);
  let starts = 0;
  const request = activationRequest(
    lifecycle,
    "activation-replay",
    plan,
    new Map([["module", inertHooks({ start: () => { starts += 1; } })]]),
  );
  const first = await lifecycle.activate(request);
  const replay = await lifecycle.activate(request);
  assert.equal(replay.generation, first.generation);
  assert.equal(starts, 1);
  assert.equal(Object.isFrozen(replay), true);
  assert.equal(Object.isFrozen(replay.traces), true);
  assert.equal(Object.isFrozen(replay.traces[0]), true);
  assert.throws(() => (replay.traces as Array<unknown>).push({}), TypeError);
  assert.deepEqual(await lifecycle.activate(request), first);
});

test("different candidates race through expected-active CAS and only one publishes", async () => {
  const lifecycle = new GenerationLifecycle(testAuthorityScope);
  const firstPlan = requirePlan([{ id: "first", requires: [] }]);
  const secondPlan = requirePlan([{ id: "second", requires: [] }]);
  const expectedActiveGeneration = lifecycle.activeGeneration;
  const first = activationRequest(
    lifecycle,
    "candidate-first",
    firstPlan,
    new Map([["first", inertHooks({ start: async () => delay(10) })]]),
    { expectedActiveGeneration },
  );
  const second = activationRequest(
    lifecycle,
    "candidate-second",
    secondPlan,
    new Map([["second", inertHooks()]]),
    { expectedActiveGeneration },
  );
  const results = await Promise.all([lifecycle.activate(first), lifecycle.activate(second)]);
  assert.equal(results.filter(result => result.ok).length, 1);
  assert.equal(results.filter(result => result.errors.some(error => error.message === "STALE_ACTIVE_GENERATION")).length, 1);
  assert.equal(lifecycle.cutovers, 1);
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

test("ignored activation cancellation is fenced and reported as termination unproven", async () => {
  const lifecycle = new GenerationLifecycle(testAuthorityScope);
  const plan = requirePlan([{ id: "slow", requires: [] }]);
  let startRunning = false;
  let cleanupOverlapped = false;
  const result = await lifecycle.activate(activationRequest(
    lifecycle,
    "ignored-start-cancellation",
    plan,
    new Map([["slow", inertHooks({
      start: async () => {
        startRunning = true;
        await delay(30);
        startRunning = false;
      },
      stop: () => { cleanupOverlapped = startRunning; },
    })]]),
    { deadlineMs: 5, cleanupTimeoutMs: 20 },
  ));
  assert.equal(result.ok, false);
  assert.equal(result.termination, "termination_unproven");
  assert.equal(cleanupOverlapped, true);
  await delay(35);
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
      candidateGeneration: number;
      candidateHostIncarnation: string;
      candidateAuthorityScope: string;
      candidateGraphDigest: string;
      queryAuthorityScope: string;
      queryGraphDigest: string;
      oldGeneration: number;
      oldAuthorityScope: string;
      oldSinkFence: number;
    }> = {},
  ): ObservedHostState => ({
    queryAuthorityScope: overrides.queryAuthorityScope ?? testAuthorityScope,
    queryGraphDigest: overrides.queryGraphDigest ?? "sha256:graph-1",
    candidate: candidateState === "absent" ? { state: "absent" } : {
      state: candidateState,
      generation: overrides.candidateGeneration ?? 2,
      hostIncarnation: overrides.candidateHostIncarnation ?? "host-incarnation-1",
      authorityScope: overrides.candidateAuthorityScope ?? testAuthorityScope,
      graphDigest: overrides.candidateGraphDigest ?? "sha256:graph-1",
    },
    oldGeneration: {
      generation: overrides.oldGeneration ?? 1,
      authorityScope: overrides.oldAuthorityScope ?? testAuthorityScope,
      sinkFence: overrides.oldSinkFence ?? 41,
      inFlight: oldGenerationInFlight,
    },
  });
  const cases = [
    [baseline, observed("absent", false), "RETRY_IDEMPOTENT_PREPARE"],
    [{ ...baseline, phase: "started" }, observed("running", false), "INSPECT_CANDIDATE"],
    [{ ...baseline, phase: "ready" }, observed("ready", false), "PUBLISH_CANDIDATE"],
    [published, observed("ready", true), "RESUME_DRAIN"],
    [{ ...published, phase: "draining" }, observed("ready", true), "RESUME_DRAIN"],
    [{ ...baseline, externalOutcome: "uncertain" }, observed("running", false), "CONTROLLED_RECOVERY"],
    [{ ...published, routeHeadGeneration: 1 }, observed("ready", false), "CONTROLLED_RECOVERY"],
    [{ ...published, phase: "draining", drainDeadlineExpired: true }, observed("ready", true), "CONTROLLED_RECOVERY"],
    [{ ...published, drainDeadlineExpired: true }, observed("ready", true), "CONTROLLED_RECOVERY"],
    [baseline, observed("ready", false, { candidateHostIncarnation: "stale-host" }), "CONTROLLED_RECOVERY"],
    [baseline, observed("absent", false, { queryAuthorityScope: "tenant:other/project:other" }), "CONTROLLED_RECOVERY"],
    [baseline, observed("absent", false, { queryGraphDigest: "sha256:wrong-graph" }), "CONTROLLED_RECOVERY"],
    [baseline, observed("absent", false, { oldGeneration: 9 }), "CONTROLLED_RECOVERY"],
    [baseline, observed("absent", false, { oldSinkFence: 2 }), "CONTROLLED_RECOVERY"],
  ] as const;
  for (const [state, observed, expected] of cases) {
    assert.equal(reconcileLifecycle(state, observed), expected);
    assert.equal(reconcileLifecycle(structuredClone(state), structuredClone(observed)), expected);
  }
});

test("portable protocol rejects stale, expired, malformed, and oversized frames", () => {
  const authority = { ...protocolAuthority, now: Date.now() };
  assert.equal(handlePortableWorkerFrame(frame(), authority).kind, "result");
  assert.throws(() => handlePortableWorkerFrame(frame({ authorityScope: "tenant:other/project:other" }), authority), /AUTHORITY_SCOPE_MISMATCH/);
  assert.throws(() => handlePortableWorkerFrame(frame({ extensionInstanceId: "extension-instance-2" }), authority), /EXTENSION_INSTANCE_MISMATCH/);
  assert.throws(() => handlePortableWorkerFrame(frame({ graphGeneration: 2 }), authority), /STALE_GRAPH_GENERATION/);
  assert.throws(() => handlePortableWorkerFrame(frame({ moduleActivationGeneration: 6 }), authority), /STALE_MODULE_ACTIVATION_GENERATION/);
  assert.throws(() => handlePortableWorkerFrame(frame({ hostIncarnation: "stale-host" }), authority), /STALE_HOST_INCARNATION/);
  assert.throws(() => handlePortableWorkerFrame(frame({ senderId: "unauthenticated-peer" }), authority), /AUTHENTICATED_PEER_MISMATCH/);
  assert.throws(() => handlePortableWorkerFrame(frame({ audience: "different-host" }), authority), /AUDIENCE_MISMATCH/);
  assert.throws(() => handlePortableWorkerFrame(frame({ absoluteDeadline: Date.now() - 1 }), authority), /DEADLINE_EXCEEDED/);
  assert.throws(() => validateEnvelope({}), /UNKNOWN_OR_MISSING_FIELD/);
  assert.throws(() => validateEnvelope({ ...frame(), extra: true }), /UNKNOWN_OR_MISSING_FIELD/);
  const cyclicPayload: Record<string, unknown> = {};
  cyclicPayload.self = cyclicPayload;
  assert.throws(() => validateEnvelope(frame({ payload: cyclicPayload })), /JSON_LIMIT_EXCEEDED/);
  assert.throws(() => validateEnvelope(frame({ payload: { text: "x".repeat(70_000) } })), /FRAME_TOO_LARGE/);
  assert.throws(() => validateEnvelope(frame({ payload: { value: Number.NaN } })), /INVALID_JSON_NUMBER/);
  assert.throws(() => validateEnvelope(frame({ payload: { value: -0 } })), /INVALID_JSON_NUMBER/);
  assert.throws(() => validateEnvelope(frame({ payload: { value: "\ud800" } })), /INVALID_UNICODE_STRING/);
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
  const invalidUtf8 = Uint8Array.from([0, 0, 0, 2, 0xc3, 0x28]);
  assert.throws(() => decodeLengthPrefixedFrame(invalidUtf8), /INVALID_JSON_FRAME/);
});

test("process-host smoke acknowledges hello and readiness over bounded length-prefixed JSON", async t => {
  const child = spawn(process.execPath, [join(fixtureRoot, "process-child.mjs")], { stdio: ["pipe", "pipe", "pipe"] });
  t.after(() => child.kill("SIGKILL"));
  const responses: ProtocolEnvelope[] = [];
  let buffer = Buffer.alloc(0);
  child.stdout.on("data", chunk => {
    buffer = Buffer.concat([buffer, chunk]);
    for (;;) {
      if (buffer.byteLength < 4) break;
      const length = buffer.readUInt32BE(0);
      if (buffer.byteLength < length + 4) break;
      responses.push(decodeLengthPrefixedFrame(buffer.subarray(0, length + 4)));
      buffer = buffer.subarray(length + 4);
    }
  });
  child.stdin.write(encodeLengthPrefixedFrame(frame()));
  child.stdin.write(encodeLengthPrefixedFrame(frame({ requestId: "request-2", kind: "prepare" })));
  await Promise.race([
    (async () => { while (responses.length < 2) await delay(1); })(),
    once(child, "error").then(([error]) => { throw error; }),
    once(child, "exit").then(([code]) => { throw new Error(`PROCESS_EXITED_EARLY:${String(code)}`); }),
    delay(2_000).then(() => { throw new Error("PROCESS_RESPONSE_TIMEOUT"); }),
  ]);
  assert.deepEqual(responses.map(value => validateEnvelope(value).kind), ["result", "ready"]);
  child.stdin.write(encodeLengthPrefixedFrame(frame({ requestId: "request-3", kind: "stop" })));
  await once(child, "exit");
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
  t.after(() => worker.terminate());
  const response = new Promise<unknown>(resolve => worker.once("message", resolve));
  const request = frame({ kind: "prepare" });
  worker.postMessage(structuredClone(request));
  assert.deepEqual(await response, { ok: true, frame: { ...request, kind: "result", payload: { acceptedKind: "prepare" } } });
  const stale = new Promise<unknown>(resolve => worker.once("message", resolve));
  worker.postMessage(frame({ moduleActivationGeneration: 6 }));
  assert.deepEqual(await stale, { ok: false, error: "STALE_MODULE_ACTIVATION_GENERATION" });
});

test("browser Worker carries a portable generation-bound frame", async t => {
  const candidates = process.platform === "darwin"
    ? [
        "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
        "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      ]
    : ["/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser"];
  let browser: string | undefined;
  for (const candidate of candidates) {
    try {
      await access(candidate);
      browser = candidate;
      break;
    } catch {
      // The cross-platform release matrix supplies a browser when this profile is mandatory.
    }
  }
  if (!browser) {
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
  t.after(() => server.close());
  const address = server.address() as AddressInfo;
  const page = `http://127.0.0.1:${address.port}/fixtures/browser-worker.html`;
  let output = "";
  let code: number | null = null;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    output = "";
    const child = spawn(browser, [
      "--headless=new",
      "--disable-gpu",
      "--disable-background-timer-throttling",
      "--no-first-run",
      "--no-default-browser-check",
      "--virtual-time-budget=5000",
      "--dump-dom",
      page,
    ], { stdio: ["ignore", "pipe", "pipe"], signal: AbortSignal.timeout(15_000) });
    child.stdout.setEncoding("utf8");
    child.stdout.on("data", chunk => { output += chunk; });
    [code] = await once(child, "exit");
    if (code === 0 && /"ok":true/.test(output)) break;
    await delay(25);
  }
  assert.equal(code, 0);
  assert.match(output, /"ok":true/);
  assert.match(output, /"moduleActivationGeneration":7/);
  assert.match(output, /"kind":"result"/);
});

test("packed toy package exercises an isolated consumer without Foundation, Cordis, or plugin dependencies", async () => {
  const root = await mkdtemp(join(tmpdir(), "extension-packed-consumer-"));
  const pack = spawn("npm", ["pack", join(fixtureRoot, "toy-package"), "--json", "--pack-destination", root], { stdio: ["ignore", "pipe", "pipe"] });
  let stdout = "";
  pack.stdout.setEncoding("utf8");
  pack.stdout.on("data", chunk => { stdout += chunk; });
  const [packCode] = await once(pack, "exit");
  assert.equal(packCode, 0);
  const packed = JSON.parse(stdout) as Array<{ filename: string; files: Array<{ path: string }> }>;
  assert.deepEqual(packed[0]?.files.map(file => file.path).sort(), ["index.d.ts", "index.js", "package.json"]);

  const consumer = join(root, "consumer");
  await mkdir(consumer);
  await writeFile(join(consumer, "package.json"), JSON.stringify({ private: true, type: "module" }));
  const install = spawn("npm", ["install", "--ignore-scripts", "--package-lock=false", join(root, packed[0]!.filename)], { cwd: consumer, stdio: "ignore" });
  const [installCode] = await once(install, "exit");
  assert.equal(installCode, 0);
  const packageEntries = await readdir(join(consumer, "node_modules", "@agent-teams", "qualification-toy-package"));
  assert.ok(!packageEntries.some(entry => entry.includes("module") || entry.includes("plugin")));
  const execute = spawn(process.execPath, [
    "--input-type=module",
    "--eval",
    'import { createCounter } from "@agent-teams/qualification-toy-package"; process.stdout.write(String(createCounter(3).next()));',
  ], { cwd: consumer, stdio: ["ignore", "pipe", "pipe"] });
  let result = "";
  execute.stdout.setEncoding("utf8");
  execute.stdout.on("data", chunk => { result += chunk; });
  const [executeCode] = await once(execute, "exit");
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

test("native and Cordis-backed hooks emit the same applicable lifecycle trace", async () => {
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
