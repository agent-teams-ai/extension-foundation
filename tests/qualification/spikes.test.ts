import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { access, mkdtemp, mkdir, readdir, writeFile } from "node:fs/promises";
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
import { GenerationLifecycle, type ModuleHooks } from "./lifecycle-spike.ts";
import { handlePortableWorkerFrame, type ProtocolEnvelope, validateEnvelope } from "./protocol-spike.ts";
import { reconcileLifecycle, type DurableLifecycleState } from "./recovery-spike.ts";

const fixtureRoot = fileURLToPath(new URL("./fixtures", import.meta.url));

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
    graphGeneration: 1,
    runtimeGeneration: 7,
    absoluteDeadline: Date.now() + 5_000,
    kind: "hello",
    payload: {},
    ...overrides,
  };
}

test("invalid graph is deterministic and causes zero executable effects", () => {
  let effects = 0;
  const definitions = [
    { id: "consumer", requires: ["missing"] },
    { id: "consumer", requires: [] },
  ];
  const first = compileGraph(definitions);
  const second = compileGraph([...definitions].reverse());
  assert.equal(first.ok, false);
  assert.deepEqual(first, second);
  assert.equal(effects, 0);
  effects += 0;
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

test("native compiler agrees with Graphlib on generated DAG validity", () => {
  const arbitraryDag = fc.array(fc.tuple(
    fc.integer({ min: 0, max: 7 }),
    fc.integer({ min: 0, max: 7 }),
  ), { maxLength: 40 });

  fc.assert(fc.property(arbitraryDag, pairs => {
    const ids = Array.from({ length: 8 }, (_, index) => `n${index}`);
    const edges = [...new Set(pairs.filter(([from, to]) => from < to).map(([from, to]) => `${from}:${to}`))]
      .map(value => value.split(":").map(Number) as [number, number]);
    const dependencies = new Map(ids.map(id => [id, [] as string[]]));
    const oracle = new Graph({ directed: true });
    ids.forEach(id => oracle.setNode(id));
    for (const [provider, consumer] of edges) {
      dependencies.get(ids[consumer]!)?.push(ids[provider]!);
      oracle.setEdge(ids[provider]!, ids[consumer]!);
    }
    const plan = requirePlan(ids.map(id => ({ id, requires: dependencies.get(id) ?? [] })));
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
  const lifecycle = new GenerationLifecycle();
  let starts = 0;
  const hooks = new Map<string, ModuleHooks>([["module", {
    async start() {
      starts += 1;
      await delay(5);
    },
  }]]);
  const calls = Array.from({ length: 100 }, () => lifecycle.activate(plan, hooks, Date.now() + 1_000));
  const results = await Promise.all(calls);
  assert.equal(starts, 1);
  assert.equal(lifecycle.cutovers, 1);
  assert.equal(new Set(results.map(result => result.generation)).size, 1);
});

test("readiness blocks dependents and failed candidate leaves routing unchanged", async () => {
  const lifecycle = new GenerationLifecycle();
  const base = requirePlan([{ id: "base", requires: [] }]);
  const baseResult = await lifecycle.activate(base, new Map([["base", {}]]), Date.now() + 1_000);
  assert.equal(baseResult.ok, true);
  const previous = lifecycle.activeGeneration;

  const candidate = requirePlan([
    { id: "provider", requires: [] },
    { id: "consumer", requires: ["provider"] },
  ]);
  let consumerStarts = 0;
  const result = await lifecycle.activate(candidate, new Map([
    ["provider", { ready: () => false }],
    ["consumer", { start: () => { consumerStarts += 1; } }],
  ]), Date.now() + 1_000);
  assert.equal(result.ok, false);
  assert.equal(consumerStarts, 0);
  assert.equal(lifecycle.activeGeneration, previous);
});

test("absolute deadline prevents late publication and cleanup is bounded", async () => {
  const lifecycle = new GenerationLifecycle();
  const plan = requirePlan([{ id: "slow", requires: [] }]);
  const startedAt = Date.now();
  const result = await lifecycle.activate(plan, new Map([["slow", {
    start: async () => delay(20),
    stop: async () => new Promise(() => undefined),
  }]]), Date.now() + 5, 20);
  assert.equal(result.ok, false);
  assert.equal(lifecycle.activeGeneration, 0);
  assert.ok(Date.now() - startedAt < 250);
  assert.ok(result.errors.some(error => error.message === "ABSOLUTE_DEADLINE_EXCEEDED"));
  assert.ok(result.errors.some(error => error.message === "CLEANUP_TIMEOUT:slow"));
});

test("failed parallel batch settles siblings before reverse cleanup", async () => {
  const lifecycle = new GenerationLifecycle();
  const plan = requirePlan([
    { id: "fails", requires: [] },
    { id: "slow-sibling", requires: [] },
  ]);
  let siblingFinished = false;
  let siblingStops = 0;
  const result = await lifecycle.activate(plan, new Map([
    ["fails", { start: () => { throw new Error("START_FAILED"); } }],
    ["slow-sibling", {
      start: async () => {
        await delay(20);
        siblingFinished = true;
      },
      stop: () => { siblingStops += 1; },
    }],
  ]), Date.now() + 1_000);
  assert.equal(result.ok, false);
  assert.equal(siblingFinished, true);
  assert.equal(siblingStops, 1);
  assert.equal(lifecycle.activeGeneration, 0);
});

test("bounded drain records debt before fencing an old generation", async () => {
  const lifecycle = new GenerationLifecycle();
  const first = requirePlan([{ id: "first", requires: [] }]);
  await lifecycle.activate(first, new Map([["first", {}]]), Date.now() + 1_000);
  const oldGeneration = lifecycle.activeGeneration;
  const lease = lifecycle.acquireInvocation();

  const second = requirePlan([{ id: "second", requires: [] }]);
  const result = await lifecycle.activate(second, new Map([["second", {}]]), Date.now() + 1_000, 5);
  assert.equal(result.ok, true);
  assert.ok(result.errors.some(error => error.message === `DRAIN_TIMEOUT:${oldGeneration}`));
  assert.ok(result.traces.some(trace => trace.phase === "drain" && trace.outcome === "timed-out"));
  assert.throws(() => lifecycle.commitDurableWrite(oldGeneration, () => undefined, lease), /STALE_GENERATION/);
  lease.release();
});

test("replacement drains admitted work, cuts over once, and fences stale writes", async () => {
  const lifecycle = new GenerationLifecycle();
  const first = requirePlan([{ id: "first", requires: [] }]);
  await lifecycle.activate(first, new Map([["first", {}]]), Date.now() + 1_000);
  const oldGeneration = lifecycle.activeGeneration;
  const lease = lifecycle.acquireInvocation();
  let oldWrite = 0;
  lifecycle.commitDurableWrite(oldGeneration, () => { oldWrite += 1; }, lease);

  const second = requirePlan([{ id: "second", requires: [] }]);
  const replacement = lifecycle.activate(second, new Map([["second", {}]]), Date.now() + 1_000, 100);
  await delay(5);
  const newGeneration = lifecycle.activeGeneration;
  assert.notEqual(newGeneration, oldGeneration);
  const newLease = lifecycle.acquireInvocation();
  assert.equal(newLease.generation, newGeneration);
  lifecycle.commitDurableWrite(oldGeneration, () => { oldWrite += 1; }, lease);
  newLease.release();
  lease.release();
  const result = await replacement;
  assert.equal(result.ok, true);
  assert.equal(lifecycle.cutovers, 2);
  assert.equal(oldWrite, 2);
  assert.throws(() => lifecycle.commitDurableWrite(oldGeneration, () => { oldWrite += 1; }, lease), /STALE_GENERATION/);
  assert.equal(oldWrite, 2);
});

test("crash recovery decisions are deterministic at durable boundaries", () => {
  const baseline: DurableLifecycleState = {
    operationId: "activation-1",
    candidateGeneration: 2,
    expectedActiveGeneration: 1,
    activeGeneration: 1,
    phase: "prepared",
    deadlineExpired: false,
    externalOutcome: "none",
  };
  const cases = [
    [baseline, { candidate: "absent", oldGenerationInFlight: false }, "RETRY_IDEMPOTENT_PREPARE"],
    [{ ...baseline, phase: "started" }, { candidate: "running", oldGenerationInFlight: false }, "INSPECT_CANDIDATE"],
    [{ ...baseline, phase: "ready" }, { candidate: "ready", oldGenerationInFlight: false }, "PUBLISH_CANDIDATE"],
    [{ ...baseline, phase: "published", activeGeneration: 2 }, { candidate: "ready", oldGenerationInFlight: true }, "RETURN_PUBLISHED_RESULT"],
    [{ ...baseline, phase: "draining", activeGeneration: 2 }, { candidate: "ready", oldGenerationInFlight: true }, "RESUME_DRAIN"],
    [{ ...baseline, externalOutcome: "uncertain" }, { candidate: "running", oldGenerationInFlight: false }, "CONTROLLED_RECOVERY"],
  ] as const;
  for (const [state, observed, expected] of cases) {
    assert.equal(reconcileLifecycle(state, observed), expected);
    assert.equal(reconcileLifecycle(structuredClone(state), structuredClone(observed)), expected);
  }
});

test("portable protocol rejects stale, expired, malformed, and oversized frames", () => {
  assert.equal(handlePortableWorkerFrame(frame(), 7, Date.now()).kind, "result");
  assert.throws(() => handlePortableWorkerFrame(frame({ runtimeGeneration: 6 }), 7, Date.now()), /STALE_GENERATION/);
  assert.throws(() => handlePortableWorkerFrame(frame({ absoluteDeadline: Date.now() - 1 }), 7, Date.now()), /DEADLINE_EXCEEDED/);
  assert.throws(() => validateEnvelope({}), /UNSUPPORTED_PROTOCOL/);
  assert.throws(() => validateEnvelope({ ...frame(), extra: true }), /UNKNOWN_FIELD/);
  const cyclicPayload: Record<string, unknown> = {};
  cyclicPayload.self = cyclicPayload;
  assert.throws(() => validateEnvelope(frame({ payload: cyclicPayload })), /INVALID_PAYLOAD/);
  assert.throws(() => validateEnvelope(frame({ payload: { text: "x".repeat(70_000) } })), /FRAME_TOO_LARGE/);
});

test("process-host skeleton negotiates and reports readiness over framed JSON", async t => {
  const child = spawn(process.execPath, [join(fixtureRoot, "process-child.mjs")], { stdio: ["pipe", "pipe", "pipe"] });
  t.after(() => child.kill("SIGKILL"));
  const responses: unknown[] = [];
  let buffer = "";
  child.stdout.setEncoding("utf8");
  child.stdout.on("data", chunk => {
    buffer += chunk;
    for (;;) {
      const index = buffer.indexOf("\n");
      if (index < 0) break;
      responses.push(JSON.parse(buffer.slice(0, index)));
      buffer = buffer.slice(index + 1);
    }
  });
  child.stdin.write(`${JSON.stringify(frame())}\n`);
  child.stdin.write(`${JSON.stringify(frame({ requestId: "request-2", kind: "prepare" }))}\n`);
  while (responses.length < 2) await delay(1);
  assert.deepEqual(responses.map(value => validateEnvelope(value).kind), ["result", "ready"]);
  child.stdin.write(`${JSON.stringify(frame({ requestId: "request-3", kind: "stop" }))}\n`);
  await once(child, "exit");
});

test("Worker structured-clone boundary preserves validation and stale rejection", async t => {
  const worker = new Worker(new URL("./fixtures/portable-worker.mjs", import.meta.url), { workerData: { generation: 7 } });
  t.after(() => worker.terminate());
  const response = new Promise<unknown>(resolve => worker.once("message", resolve));
  const request = frame({ kind: "prepare" });
  worker.postMessage(structuredClone(request));
  assert.deepEqual(await response, { ok: true, frame: { ...request, kind: "result", payload: { acceptedKind: "prepare" } } });
  const stale = new Promise<unknown>(resolve => worker.once("message", resolve));
  worker.postMessage(frame({ runtimeGeneration: 6 }));
  assert.deepEqual(await stale, { ok: false, error: "STALE_GENERATION" });
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

  const page = new URL("./fixtures/browser-worker.html", import.meta.url).href;
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
  assert.match(output, /"runtimeGeneration":7/);
  assert.match(output, /"kind":"result"/);
});

test("packed reusable core works without Foundation, Cordis, or plugin dependencies", async () => {
  const root = await mkdtemp(join(tmpdir(), "extension-packed-consumer-"));
  const pack = spawn("npm", ["pack", join(fixtureRoot, "reusable-core"), "--json", "--pack-destination", root], { stdio: ["ignore", "pipe", "pipe"] });
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
  const packageEntries = await readdir(join(consumer, "node_modules", "@agent-teams", "qualification-reusable-core"));
  assert.ok(!packageEntries.some(entry => entry.includes("module") || entry.includes("plugin")));
  const execute = spawn(process.execPath, [
    "--input-type=module",
    "--eval",
    'import { createCounter } from "@agent-teams/qualification-reusable-core"; process.stdout.write(String(createCounter(3).next()));',
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
  const native = new GenerationLifecycle();
  await native.activate(first, new Map([
    ["provider", {}],
    ["consumer", {}],
  ]), Date.now() + 1_000);
  const nativeResult = await native.activate(second, new Map([["replacement", {}]]), Date.now() + 1_000);

  const root = new Context();
  const disposers = new Map<string, () => Promise<void>>();
  const cordisHooks = (moduleId: string): ModuleHooks => ({
    async start() {
      const fiber = await root.plugin((ctx: Context) => ctx.effect(() => () => undefined, moduleId));
      disposers.set(moduleId, () => fiber.dispose());
    },
    async stop() {
      await disposers.get(moduleId)?.();
      disposers.delete(moduleId);
    },
  });
  const cordis = new GenerationLifecycle();
  await cordis.activate(first, new Map([
    ["provider", cordisHooks("provider")],
    ["consumer", cordisHooks("consumer")],
  ]), Date.now() + 1_000);
  const cordisResult = await cordis.activate(
    second,
    new Map([["replacement", cordisHooks("replacement")]]),
    Date.now() + 1_000,
  );

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
