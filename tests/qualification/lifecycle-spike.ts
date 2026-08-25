import { performance } from "node:perf_hooks";
import { setTimeout as delay } from "node:timers/promises";
import { types as nodeTypes } from "node:util";

import type { CompiledGraph } from "./graph-spike.ts";

export type LifecyclePhase = "preflight" | "prepare" | "start" | "ready" | "publish" | "drain" | "stop" | "abort";
export type LifecycleOutcome = "started" | "confirmed" | "failed" | "timed-out" | "stale" | "termination_unproven";

export interface LifecycleTrace {
  readonly phase: LifecyclePhase;
  readonly moduleId?: string;
  readonly generation: number;
  readonly outcome: LifecycleOutcome;
}

export interface ActivationContext {
  readonly generation: number;
  readonly phase: "activation" | "cleanup";
  readonly signal: AbortSignal;
}

interface CommonModuleHooks {
  prepare?(context: ActivationContext): void | Promise<void>;
  start?(context: ActivationContext): void | Promise<void>;
  stop?(context: ActivationContext): void | Promise<void>;
}

export type ModuleHooks = CommonModuleHooks & (
  | { readonly readiness: "inert"; readonly ready?: never }
  | { readonly readiness: "probe"; ready(context: ActivationContext): boolean | Promise<boolean> }
);

export interface ActivationIdentity {
  readonly operationId: string;
  readonly activationSourceDigest: string;
  readonly expectedActiveGeneration: number;
  readonly authorityScope: string;
  readonly profileLockDigest: string;
  readonly configurationFingerprint: string;
  readonly productAuthorizationRevision: string;
  readonly grantRevision: string;
  readonly hostPolicyRevision: string;
}

export interface ActivationRequest {
  readonly identity: ActivationIdentity;
  readonly plan: CompiledGraph;
  readonly hooks: ReadonlyMap<string, ModuleHooks>;
  readonly absoluteDeadline: number;
  readonly cleanupTimeoutMs?: number;
}

export interface ActivationResult {
  readonly ok: boolean;
  readonly generation: number;
  readonly termination: "proven" | "termination_unproven";
  readonly traces: readonly LifecycleTrace[];
  readonly errors: readonly LifecycleError[];
}

export interface LifecycleError {
  readonly message: string;
  readonly moduleId?: string;
  readonly phase?: LifecyclePhase;
}

export interface WaiterOptions {
  readonly absoluteDeadline?: number;
  readonly signal?: AbortSignal;
}

export interface MonotonicClock {
  now(): number;
  sleep(milliseconds: number): Promise<void>;
}

export interface InvocationHandle {
  readonly generation: number;
  readonly id: number;
  readonly authorityScope: string;
  release(): void;
}

interface InvocationLease {
  readonly generation: number;
  readonly id: number;
  readonly authorityScope: string;
  readonly lifecycleToken: symbol;
  released: boolean;
}

interface ActiveGraph {
  readonly generation: number;
  readonly plan: CompiledGraph;
  readonly hooks: ReadonlyMap<string, ModuleHooks>;
}

interface Flight {
  readonly result: Promise<ActivationResult>;
}

interface DeadlineBudget {
  readonly clockDeadline?: number;
  readonly wallDeadline: number;
}

const maxTimerMilliseconds = 2_147_483_647;

const defaultClock: MonotonicClock = {
  now: () => performance.now(),
  sleep: milliseconds => delay(milliseconds),
};

function errorMessage(error: unknown): string {
  try {
    if (error instanceof Error && typeof error.message === "string") return error.message;
  } catch {
    return "UNREADABLE_ERROR";
  }
  try {
    return String(error);
  } catch {
    return "UNREADABLE_ERROR";
  }
}

class AttributedLifecycleError extends Error {
  readonly moduleId: string | undefined;
  readonly phase: LifecyclePhase | undefined;

  constructor(
    message: string,
    moduleId?: string,
    phase?: LifecyclePhase,
  ) {
    super(message);
    this.moduleId = moduleId;
    this.phase = phase;
  }
}

function asError(error: unknown): Error {
  return error instanceof AttributedLifecycleError
    ? new AttributedLifecycleError(errorMessage(error), error.moduleId, error.phase)
    : new Error(errorMessage(error));
}

function attributedError(error: unknown, moduleId: string, phase: LifecyclePhase): Error {
  return new AttributedLifecycleError(errorMessage(error), moduleId, phase);
}

function aggregateErrors(error: unknown): readonly Error[] {
  if (!(error instanceof AggregateError)) return [asError(error)];
  try {
    return Array.from(error.errors as Iterable<unknown>, asError);
  } catch {
    return [asError(error)];
  }
}

function fingerprint(request: ActivationRequest): string {
  const { identity, plan, absoluteDeadline, cleanupTimeoutMs } = request;
  return JSON.stringify([
    identity.operationId,
    identity.activationSourceDigest,
    plan.digest,
    identity.expectedActiveGeneration,
    identity.authorityScope,
    identity.profileLockDigest,
    identity.configurationFingerprint,
    identity.productAuthorizationRevision,
    identity.grantRevision,
    identity.hostPolicyRevision,
    absoluteDeadline,
    cleanupTimeoutMs ?? 50,
  ]);
}

function snapshotHooks(hooks: ReadonlyMap<string, ModuleHooks>): ReadonlyMap<string, ModuleHooks> {
  const snapshots = new Map<string, ModuleHooks>();
  const allowedFields = new Set(["readiness", "prepare", "start", "ready", "stop"]);
  for (const [moduleId, moduleHooks] of hooks) {
    if (typeof moduleHooks !== "object" || moduleHooks === null) {
      throw new AttributedLifecycleError(`INVALID_HOOKS:${moduleId}`, moduleId, "preflight");
    }
    if (nodeTypes.isProxy(moduleHooks)) {
      throw new AttributedLifecycleError(`PROXY_HOOKS:${moduleId}`, moduleId, "preflight");
    }
    const prototype = Object.getPrototypeOf(moduleHooks);
    if (prototype !== Object.prototype && prototype !== null) {
      throw new AttributedLifecycleError(`NON_PLAIN_HOOKS:${moduleId}`, moduleId, "preflight");
    }
    const descriptors = Object.getOwnPropertyDescriptors(moduleHooks);
    for (const [field, descriptor] of Object.entries(descriptors)) {
      if (!allowedFields.has(field)) {
        throw new AttributedLifecycleError(`UNKNOWN_HOOK_FIELD:${moduleId}:${field}`, moduleId, "preflight");
      }
      if (descriptor.get !== undefined || descriptor.set !== undefined) {
        throw new AttributedLifecycleError(`ACCESSOR_HOOK_FIELD:${moduleId}:${field}`, moduleId, "preflight");
      }
    }
    const readiness = descriptors.readiness?.value;
    if (readiness !== "inert" && readiness !== "probe") {
      throw new AttributedLifecycleError(`INVALID_READINESS:${moduleId}`, moduleId, "preflight");
    }
    const prepare = descriptors.prepare?.value;
    const start = descriptors.start?.value;
    const stop = descriptors.stop?.value;
    const ready = descriptors.ready?.value;
    for (const [field, hook] of [["prepare", prepare], ["start", start], ["stop", stop]] as const) {
      if (hook !== undefined && typeof hook !== "function") {
        throw new AttributedLifecycleError(`INVALID_HOOK_FIELD:${moduleId}:${field}`, moduleId, "preflight");
      }
    }
    if (readiness === "probe" && typeof ready !== "function") {
      throw new AttributedLifecycleError(`INVALID_HOOK_FIELD:${moduleId}:ready`, moduleId, "preflight");
    }
    if (readiness === "inert" && ready !== undefined) {
      throw new AttributedLifecycleError(`INVALID_HOOK_FIELD:${moduleId}:ready`, moduleId, "preflight");
    }
    snapshots.set(moduleId, Object.freeze({
      readiness,
      ...(prepare === undefined ? {} : { prepare }),
      ...(start === undefined ? {} : { start }),
      ...(ready === undefined ? {} : { ready }),
      ...(stop === undefined ? {} : { stop }),
    }) as ModuleHooks);
  }
  return snapshots;
}

function freezeResult(
  ok: boolean,
  generation: number,
  termination: ActivationResult["termination"],
  traces: readonly LifecycleTrace[],
  errors: readonly Error[],
): ActivationResult {
  return Object.freeze({
    ok,
    generation,
    termination,
    traces: Object.freeze(traces.map(trace => Object.freeze({ ...trace }))),
    errors: Object.freeze(errors.map(error => Object.freeze({
      message: errorMessage(error),
      ...(error instanceof AttributedLifecycleError && error.moduleId !== undefined
        ? { moduleId: error.moduleId }
        : {}),
      ...(error instanceof AttributedLifecycleError && error.phase !== undefined
        ? { phase: error.phase }
        : {}),
    }))),
  });
}

function absoluteDeadlineBudget(absoluteDeadline: number, clock: MonotonicClock): DeadlineBudget {
  const now = clock.now();
  if (!Number.isFinite(now)) throw new Error("INVALID_CLOCK_NOW");
  return Object.freeze({
    clockDeadline: absoluteDeadline,
    wallDeadline: performance.now() + Math.max(0, absoluteDeadline - now),
  });
}

function relativeDeadlineBudget(milliseconds: number, clock: MonotonicClock): DeadlineBudget {
  let clockDeadline: number | undefined;
  try {
    const now = clock.now();
    if (Number.isFinite(now)) clockDeadline = now + milliseconds;
  } catch {
    // The independent wall deadline still bounds cleanup after clock failure.
  }
  return Object.freeze({
    ...(clockDeadline === undefined ? {} : { clockDeadline }),
    wallDeadline: performance.now() + milliseconds,
  });
}

function boundedDeadlineBudget(
  parent: DeadlineBudget,
  milliseconds: number,
  clock: MonotonicClock,
): DeadlineBudget {
  const relative = relativeDeadlineBudget(milliseconds, clock);
  const clockDeadline = parent.clockDeadline === undefined
    ? relative.clockDeadline
    : relative.clockDeadline === undefined
      ? parent.clockDeadline
      : Math.min(parent.clockDeadline, relative.clockDeadline);
  return Object.freeze({
    ...(clockDeadline === undefined ? {} : { clockDeadline }),
    wallDeadline: Math.min(parent.wallDeadline, relative.wallDeadline),
  });
}

function remainingBeforeDeadline(deadline: DeadlineBudget, clock: MonotonicClock): number {
  let remaining = deadline.wallDeadline - performance.now();
  if (deadline.clockDeadline !== undefined) {
    try {
      const now = clock.now();
      if (!Number.isFinite(now)) return 0;
      remaining = Math.min(remaining, deadline.clockDeadline - now);
    } catch {
      return 0;
    }
  }
  return Math.max(0, remaining);
}

function deadlineExpired(deadline: DeadlineBudget, clock: MonotonicClock): boolean {
  if (performance.now() >= deadline.wallDeadline) return true;
  if (deadline.clockDeadline === undefined) return false;
  try {
    const now = clock.now();
    return !Number.isFinite(now) || now >= deadline.clockDeadline;
  } catch {
    return true;
  }
}

function runBeforeDeadline<T>(
  operation: () => T | Promise<T>,
  deadline: DeadlineBudget,
  clock: MonotonicClock,
  onTimeout: () => void,
  timeoutCode = "ABSOLUTE_DEADLINE_EXCEEDED",
): Promise<T> {
  const remaining = remainingBeforeDeadline(deadline, clock);
  if (remaining <= 0) {
    onTimeout();
    return Promise.reject(new Error(timeoutCode));
  }

  return new Promise<T>((resolve, reject) => {
    let timer: NodeJS.Timeout | undefined;
    let expired = false;
    const armTimeout = (): void => {
      const currentRemaining = remainingBeforeDeadline(deadline, clock);
      if (currentRemaining <= 0) {
        expired = true;
        onTimeout();
        reject(new Error(timeoutCode));
        return;
      }
      timer = setTimeout(armTimeout, Math.min(currentRemaining, maxTimerMilliseconds));
    };
    armTimeout();
    if (expired) return;
    Promise.resolve()
      .then(operation)
      .then(
        value => {
          if (timer) clearTimeout(timer);
          if (deadlineExpired(deadline, clock)) {
            onTimeout();
            reject(new Error(timeoutCode));
            return;
          }
          resolve(value);
        },
        error => {
          if (timer) clearTimeout(timer);
          if (deadlineExpired(deadline, clock)) {
            onTimeout();
            reject(new Error(timeoutCode));
            return;
          }
          reject(error);
        },
      );
  });
}

export function inertHooks(hooks: CommonModuleHooks = {}): ModuleHooks {
  return { readiness: "inert", ...hooks };
}

export class GenerationLifecycle {
  readonly #authorityScope: string;
  readonly #clock: MonotonicClock;
  readonly #flights = new Map<string, Flight>();
  readonly #operationFingerprints = new Map<string, string>();
  readonly #operationResults = new Map<string, ActivationResult>();
  readonly #leases = new Set<InvocationLease>();
  readonly #leaseByHandle = new WeakMap<object, InvocationLease>();
  readonly #lifecycleToken = Symbol("generation-lifecycle");
  readonly #sealedGenerations = new Set<number>();
  #nextLeaseId = 1;
  #nextGeneration = 1;
  #activeGeneration = 0;
  #active: ActiveGraph | undefined;
  #cutovers = 0;

  constructor(authorityScope: string, clock: MonotonicClock = defaultClock) {
    if (authorityScope.length === 0) throw new Error("INVALID_AUTHORITY_SCOPE");
    this.#authorityScope = authorityScope;
    this.#clock = clock;
  }

  get activeGeneration(): number {
    return this.#activeGeneration;
  }

  get cutovers(): number {
    return this.#cutovers;
  }

  deadlineAfter(milliseconds: number): number {
    if (!Number.isFinite(milliseconds) || milliseconds < 0) throw new Error("INVALID_DEADLINE_DURATION");
    const now = this.#clock.now();
    if (!Number.isFinite(now)) throw new Error("INVALID_CLOCK_NOW");
    return now + milliseconds;
  }

  activate(
    request: ActivationRequest,
    waiter: WaiterOptions | number = {},
  ): Promise<ActivationResult> {
    const absoluteDeadline = request.absoluteDeadline;
    const cleanupTimeoutMs = request.cleanupTimeoutMs ?? 50;
    const requestIdentity = request.identity;
    const identity: ActivationIdentity = Object.freeze({
      operationId: requestIdentity.operationId,
      activationSourceDigest: requestIdentity.activationSourceDigest,
      expectedActiveGeneration: requestIdentity.expectedActiveGeneration,
      authorityScope: requestIdentity.authorityScope,
      profileLockDigest: requestIdentity.profileLockDigest,
      configurationFingerprint: requestIdentity.configurationFingerprint,
      productAuthorizationRevision: requestIdentity.productAuthorizationRevision,
      grantRevision: requestIdentity.grantRevision,
      hostPolicyRevision: requestIdentity.hostPolicyRevision,
    });
    if (!Number.isFinite(absoluteDeadline)) throw new Error("INVALID_ABSOLUTE_DEADLINE");
    if (!Number.isFinite(cleanupTimeoutMs) || cleanupTimeoutMs < 0) throw new Error("INVALID_CLEANUP_TIMEOUT");
    if (!Number.isSafeInteger(identity.expectedActiveGeneration)
      || identity.expectedActiveGeneration < 0) throw new Error("INVALID_EXPECTED_ACTIVE_GENERATION");
    for (const [field, value] of Object.entries(identity)) {
      if (field === "expectedActiveGeneration") continue;
      if (typeof value !== "string" || value.length === 0) throw new Error(`INVALID_ACTIVATION_IDENTITY:${field}`);
    }
    if (identity.authorityScope !== this.#authorityScope) throw new Error("AUTHORITY_SCOPE_MISMATCH");
    const normalizedRequest: ActivationRequest = Object.freeze({
      identity,
      plan: request.plan,
      hooks: request.hooks,
      absoluteDeadline,
      cleanupTimeoutMs,
    });
    const waiterOptions = typeof waiter === "number" ? { absoluteDeadline: waiter } : waiter;
    const explicitWaiterDeadline = waiterOptions.absoluteDeadline;
    if (explicitWaiterDeadline !== undefined && !Number.isFinite(explicitWaiterDeadline)) {
      throw new Error("INVALID_WAITER_DEADLINE");
    }
    const operationId = identity.operationId;
    const key = fingerprint(normalizedRequest);
    const previousKey = this.#operationFingerprints.get(operationId);
    if (previousKey !== undefined && previousKey !== key) throw new Error("ACTIVATION_IDEMPOTENCY_CONFLICT");
    this.#operationFingerprints.set(operationId, key);

    const existing = this.#flights.get(operationId);
    if (existing) {
      return this.#waitForFlight(
        existing.result,
        explicitWaiterDeadline ?? absoluteDeadline + 100,
        waiterOptions.signal,
      );
    }
    const completed = this.#operationResults.get(operationId);
    if (completed) {
      if (explicitWaiterDeadline !== undefined) {
        return this.#waitForFlight(
          Promise.resolve(completed),
          explicitWaiterDeadline,
          waiterOptions.signal,
        );
      }
      if (waiterOptions.signal?.aborted) return Promise.reject(new Error("WAITER_CANCELLED"));
      return Promise.resolve(completed);
    }

    const activationDeadline = absoluteDeadlineBudget(absoluteDeadline, this.#clock);
    const generation = this.#nextGeneration++;
    const result = this.#activate(generation, normalizedRequest, activationDeadline)
      .then(value => {
        this.#operationResults.set(operationId, value);
        return value;
      })
      .finally(() => this.#flights.delete(operationId));
    this.#flights.set(operationId, { result });
    return this.#waitForFlight(
      result,
      explicitWaiterDeadline ?? absoluteDeadline + 100,
      waiterOptions.signal,
    );
  }

  acquireInvocation(): InvocationHandle {
    if (this.#activeGeneration === 0 || this.#sealedGenerations.has(this.#activeGeneration)) {
      throw new Error("NO_ACTIVE_GENERATION");
    }
    const lease: InvocationLease = {
      generation: this.#activeGeneration,
      id: this.#nextLeaseId++,
      authorityScope: this.#authorityScope,
      lifecycleToken: this.#lifecycleToken,
      released: false,
    };
    this.#leases.add(lease);
    const handle: InvocationHandle = Object.freeze({
      generation: lease.generation,
      id: lease.id,
      authorityScope: lease.authorityScope,
      release: () => {
        if (lease.released) return;
        lease.released = true;
        this.#leases.delete(lease);
      },
    });
    this.#leaseByHandle.set(handle, lease);
    return handle;
  }

  assertInMemoryFence(handle: InvocationHandle): void {
    const lease = this.#leaseByHandle.get(handle);
    if (lease === undefined
      || lease.lifecycleToken !== this.#lifecycleToken
      || lease.authorityScope !== this.#authorityScope
      || handle.authorityScope !== lease.authorityScope
      || handle.generation !== lease.generation
      || handle.id !== lease.id
      || lease.released
      || !this.#leases.has(lease)) {
      throw new Error("STALE_GENERATION");
    }
  }

  async #drainGeneration(generation: number, deadline: DeadlineBudget): Promise<boolean> {
    this.#sealedGenerations.add(generation);
    const timeoutCode = `DRAIN_TIMEOUT:${generation}`;
    try {
      return await runBeforeDeadline(async () => {
        while ([...this.#leases].some(lease => lease.generation === generation)) {
          if (deadlineExpired(deadline, this.#clock)) return false;
          await this.#clock.sleep(1);
        }
        return true;
      }, deadline, this.#clock, () => undefined, timeoutCode);
    } catch (error) {
      if (errorMessage(error) === timeoutCode) return false;
      throw error;
    }
  }

  async #waitForFlight(
    result: Promise<ActivationResult>,
    waiterDeadline: number,
    signal?: AbortSignal,
  ): Promise<ActivationResult> {
    if (signal?.aborted) throw new Error("WAITER_CANCELLED");
    let waiterBudget: DeadlineBudget;
    try {
      waiterBudget = absoluteDeadlineBudget(waiterDeadline, this.#clock);
    } catch {
      throw new Error("WAITER_DEADLINE_EXCEEDED");
    }
    const remaining = remainingBeforeDeadline(waiterBudget, this.#clock);
    if (remaining <= 0) throw new Error("WAITER_DEADLINE_EXCEEDED");
    return new Promise<ActivationResult>((resolve, reject) => {
      let settled = false;
      let timer: NodeJS.Timeout | undefined;
      const finish = (callback: () => void): void => {
        if (settled) return;
        settled = true;
        if (timer) clearTimeout(timer);
        signal?.removeEventListener("abort", onAbort);
        callback();
      };
      const onAbort = (): void => finish(() => reject(new Error("WAITER_CANCELLED")));
      const finishFromFlight = (callback: () => void): void => {
        if (signal?.aborted) {
          finish(() => reject(new Error("WAITER_CANCELLED")));
          return;
        }
        if (deadlineExpired(waiterBudget, this.#clock)) {
          finish(() => reject(new Error("WAITER_DEADLINE_EXCEEDED")));
          return;
        }
        finish(callback);
      };
      const armTimeout = (): void => {
        const currentRemaining = remainingBeforeDeadline(waiterBudget, this.#clock);
        if (currentRemaining <= 0) {
          finish(() => reject(new Error("WAITER_DEADLINE_EXCEEDED")));
          return;
        }
        timer = setTimeout(armTimeout, Math.min(currentRemaining, maxTimerMilliseconds));
      };
      signal?.addEventListener("abort", onAbort, { once: true });
      if (signal?.aborted) {
        onAbort();
        return;
      }
      armTimeout();
      result.then(
        value => finishFromFlight(() => resolve(value)),
        error => finishFromFlight(() => reject(error)),
      );
    });
  }

  async #activate(
    generation: number,
    request: ActivationRequest,
    activationDeadline: DeadlineBudget,
  ): Promise<ActivationResult> {
    const { identity, plan } = request;
    let hooks = request.hooks;
    const cleanupTimeoutMs = request.cleanupTimeoutMs ?? 50;
    const traces: LifecycleTrace[] = [];
    const errors: Error[] = [];
    const cleanupCandidates = new Set<string>();
    const activationController = new AbortController();
    const activationContext: ActivationContext = Object.freeze({
      generation,
      phase: "activation",
      signal: activationController.signal,
    });
    let previous: ActiveGraph | undefined;
    const markActivationTimeout = (): void => {
      activationController.abort("ABSOLUTE_DEADLINE_EXCEEDED");
    };
    const checkDeadline = (): void => {
      if (deadlineExpired(activationDeadline, this.#clock)) {
        markActivationTimeout();
        throw new Error("ABSOLUTE_DEADLINE_EXCEEDED");
      }
    };

    try {
      const planModuleIds = new Set(plan.nodes.map(node => node.id));
      for (const moduleId of planModuleIds) {
        if (!hooks.has(moduleId)) {
          throw new AttributedLifecycleError(`MISSING_HOOKS:${moduleId}`, moduleId, "preflight");
        }
      }
      for (const moduleId of hooks.keys()) {
        if (!planModuleIds.has(moduleId)) {
          throw new AttributedLifecycleError(`UNPLANNED_HOOKS:${moduleId}`, moduleId, "preflight");
        }
      }
      if (this.#activeGeneration !== identity.expectedActiveGeneration) {
        traces.push({ phase: "publish", generation, outcome: "stale" });
        throw new Error("STALE_ACTIVE_GENERATION");
      }
      hooks = snapshotHooks(hooks);

      for (const batch of plan.startBatches) {
        const outcomes = await Promise.all(batch.map(async moduleId => {
          const localTraces: LifecycleTrace[] = [];
          let phase: LifecyclePhase = "prepare";
          try {
            checkDeadline();
            if (activationController.signal.aborted) return { localTraces };
            const module = hooks.get(moduleId);
            if (!module) throw new Error(`MISSING_HOOKS:${moduleId}`);
            cleanupCandidates.add(moduleId);
            localTraces.push({ phase: "prepare", moduleId, generation, outcome: "started" });
            await runBeforeDeadline(
              () => module.prepare?.(activationContext),
              activationDeadline,
              this.#clock,
              markActivationTimeout,
            );
            checkDeadline();
            if (activationController.signal.aborted) return { localTraces };
            phase = "start";
            localTraces.push({ phase: "start", moduleId, generation, outcome: "started" });
            await runBeforeDeadline(
              () => module.start?.(activationContext),
              activationDeadline,
              this.#clock,
              markActivationTimeout,
            );
            checkDeadline();
            if (activationController.signal.aborted) return { localTraces };
            phase = "ready";
            if (module.readiness !== "inert" && module.readiness !== "probe") {
              throw new Error(`INVALID_READINESS:${moduleId}`);
            }
            if (module.readiness === "probe") {
              const ready = await runBeforeDeadline(
                () => module.ready(activationContext),
                activationDeadline,
                this.#clock,
                markActivationTimeout,
              );
              if (ready !== true) throw new Error(`NOT_READY:${moduleId}`);
            }
            checkDeadline();
            if (activationController.signal.aborted) return { localTraces };
            localTraces.push({ phase: "ready", moduleId, generation, outcome: "confirmed" });
            return { localTraces };
          } catch (error) {
            activationController.abort(error);
            return { localTraces, error: attributedError(error, moduleId, phase) };
          }
        }));
        for (const outcome of outcomes) traces.push(...outcome.localTraces);
        const failures = outcomes.flatMap(outcome => outcome.error === undefined ? [] : [outcome.error]);
        if (failures.length > 0) {
          throw new AggregateError(failures, `START_BATCH_FAILED:${failures.map(errorMessage).join("|")}`);
        }
      }

      checkDeadline();
      if (this.#activeGeneration !== identity.expectedActiveGeneration) {
        traces.push({ phase: "publish", generation, outcome: "stale" });
        throw new Error("STALE_ACTIVE_GENERATION");
      }
      previous = this.#active;
      this.#activeGeneration = generation;
      this.#active = { generation, plan, hooks };
      this.#cutovers += 1;
      traces.push({ phase: "publish", generation, outcome: "confirmed" });
    } catch (error) {
      activationController.abort(error);
      const failure = asError(error);
      const failures = aggregateErrors(error);
      errors.push(...failures);
      const cleanupDeadline = boundedDeadlineBudget(activationDeadline, cleanupTimeoutMs, this.#clock);
      const cleanupController = new AbortController();
      const cleanupContext: ActivationContext = Object.freeze({
        generation,
        phase: "cleanup",
        signal: cleanupController.signal,
      });
      const cleanupProven = await this.#stopBatches(
        plan,
        hooks,
        cleanupContext,
        cleanupDeadline,
        traces,
        errors,
        "abort",
        cleanupController,
        cleanupCandidates,
      );
      const termination = !cleanupProven ? "termination_unproven" : "proven";
      const outcome: LifecycleOutcome = termination === "termination_unproven"
        ? "termination_unproven"
        : failure.message === "STALE_ACTIVE_GENERATION" ? "stale" : "failed";
      traces.push({ phase: "abort", generation, outcome });
      return freezeResult(false, generation, termination, traces, errors);
    }

    let terminationProven = true;
    if (previous) {
      try {
        const cleanupDeadline = boundedDeadlineBudget(activationDeadline, cleanupTimeoutMs, this.#clock);
        const cleanupController = new AbortController();
        const cleanupContext: ActivationContext = Object.freeze({
          generation: previous.generation,
          phase: "cleanup",
          signal: cleanupController.signal,
        });
        try {
          const drained = await this.#drainGeneration(previous.generation, cleanupDeadline);
          traces.push({ phase: "drain", generation: previous.generation, outcome: drained ? "confirmed" : "timed-out" });
          if (!drained) {
            errors.push(new Error(`DRAIN_TIMEOUT:${previous.generation}`));
            terminationProven = false;
          }
        } catch (drainError) {
          errors.push(asError(drainError));
          traces.push({ phase: "drain", generation: previous.generation, outcome: "termination_unproven" });
          terminationProven = false;
        }
        this.#fenceGeneration(previous.generation);
        const cleanupProven = await this.#stopBatches(
          previous.plan,
          previous.hooks,
          cleanupContext,
          cleanupDeadline,
          traces,
          errors,
          "stop",
          cleanupController,
        );
        terminationProven &&= cleanupProven;
      } catch (cleanupError) {
        errors.push(asError(cleanupError));
        traces.push({ phase: "stop", generation: previous.generation, outcome: "termination_unproven" });
        this.#fenceGeneration(previous.generation);
        terminationProven = false;
      }
    }
    return freezeResult(
      true,
      generation,
      terminationProven ? "proven" : "termination_unproven",
      traces,
      errors,
    );
  }

  async #stopBatches(
    plan: CompiledGraph,
    hooks: ReadonlyMap<string, ModuleHooks>,
    context: ActivationContext,
    cleanupDeadline: DeadlineBudget,
    traces: LifecycleTrace[],
    errors: Error[],
    phase: "stop" | "abort",
    controller: AbortController,
    candidates?: ReadonlySet<string>,
  ): Promise<boolean> {
    let terminationProven = true;
    for (const batch of plan.stopBatches) {
      const outcomes = await Promise.all(batch.filter(id => candidates?.has(id) ?? true).map(async moduleId => {
        try {
          const moduleHooks = hooks.get(moduleId);
          if (!moduleHooks) throw new Error(`MISSING_HOOKS:${moduleId}`);
          if (moduleHooks.stop === undefined
            && (moduleHooks.prepare !== undefined
              || moduleHooks.start !== undefined
              || moduleHooks.ready !== undefined)) {
            throw new Error(`MISSING_STOP_EVIDENCE:${moduleId}`);
          }
          await runBeforeDeadline(
            () => moduleHooks.stop?.(context),
            cleanupDeadline,
            this.#clock,
            () => controller.abort(`CLEANUP_TIMEOUT:${moduleId}`),
            `CLEANUP_TIMEOUT:${moduleId}`,
          );
          return { moduleId, outcome: "confirmed" as const };
        } catch (cleanupError) {
          const error = attributedError(cleanupError, moduleId, phase);
          return {
            moduleId,
            outcome: error.message.startsWith("CLEANUP_TIMEOUT:")
              || error.message.startsWith("MISSING_STOP_EVIDENCE:")
              ? "termination_unproven" as const
              : "failed" as const,
            error,
          };
        }
      }));
      for (const outcome of outcomes) {
        if (outcome.error) {
          errors.push(outcome.error);
          terminationProven = false;
        }
        traces.push({ phase, moduleId: outcome.moduleId, generation: context.generation, outcome: outcome.outcome });
      }
    }
    return terminationProven;
  }

  #fenceGeneration(generation: number): void {
    this.#sealedGenerations.add(generation);
    for (const lease of this.#leases) {
      if (lease.generation === generation) this.#leases.delete(lease);
    }
  }
}
