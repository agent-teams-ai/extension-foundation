import { performance } from "node:perf_hooks";
import { setTimeout as delay } from "node:timers/promises";

import type { CompiledGraph } from "./graph-spike.ts";

export type LifecyclePhase = "prepare" | "start" | "ready" | "publish" | "drain" | "stop" | "abort";
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
}

export interface WaiterOptions {
  readonly absoluteDeadline?: number;
  readonly signal?: AbortSignal;
}

export interface MonotonicClock {
  now(): number;
  sleep(milliseconds: number): Promise<void>;
}

interface InvocationLease {
  readonly generation: number;
  readonly id: number;
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

const defaultClock: MonotonicClock = {
  now: () => performance.now(),
  sleep: milliseconds => delay(milliseconds),
};

function asError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
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
    identity.grantRevision,
    identity.hostPolicyRevision,
    absoluteDeadline,
    cleanupTimeoutMs ?? 50,
  ]);
}

function snapshotHooks(hooks: ReadonlyMap<string, ModuleHooks>): ReadonlyMap<string, ModuleHooks> {
  return new Map([...hooks].map(([moduleId, moduleHooks]) => [
    moduleId,
    Object.freeze({ ...moduleHooks }) as ModuleHooks,
  ]));
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
    errors: Object.freeze(errors.map(error => Object.freeze({ message: error.message }))),
  });
}

function runBeforeDeadline<T>(
  operation: () => T | Promise<T>,
  absoluteDeadline: number,
  clock: MonotonicClock,
  onTimeout: () => void,
  timeoutCode = "ABSOLUTE_DEADLINE_EXCEEDED",
): Promise<T> {
  const remaining = absoluteDeadline - clock.now();
  if (remaining <= 0) {
    onTimeout();
    return Promise.reject(new Error(timeoutCode));
  }

  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      onTimeout();
      reject(new Error(timeoutCode));
    }, remaining);
    timer.unref();
    Promise.resolve()
      .then(operation)
      .then(
        value => {
          clearTimeout(timer);
          resolve(value);
        },
        error => {
          clearTimeout(timer);
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
    return this.#clock.now() + milliseconds;
  }

  activate(
    request: ActivationRequest,
    waiter: WaiterOptions | number = {},
  ): Promise<ActivationResult> {
    if (request.identity.operationId.length === 0) throw new Error("INVALID_OPERATION_ID");
    if (request.identity.authorityScope !== this.#authorityScope) throw new Error("AUTHORITY_SCOPE_MISMATCH");
    if (request.identity.activationSourceDigest.length === 0) throw new Error("INVALID_ACTIVATION_SOURCE_DIGEST");
    const normalizedRequest: ActivationRequest = Object.freeze({
      ...request,
      hooks: snapshotHooks(request.hooks),
      cleanupTimeoutMs: request.cleanupTimeoutMs ?? 50,
    });
    const waiterOptions = typeof waiter === "number" ? { absoluteDeadline: waiter } : waiter;
    const waiterDeadline = waiterOptions.absoluteDeadline
      ?? request.absoluteDeadline + (request.cleanupTimeoutMs ?? 50) + 100;
    const key = fingerprint(normalizedRequest);
    const previousKey = this.#operationFingerprints.get(request.identity.operationId);
    if (previousKey !== undefined && previousKey !== key) throw new Error("ACTIVATION_IDEMPOTENCY_CONFLICT");
    this.#operationFingerprints.set(request.identity.operationId, key);

    const existing = this.#flights.get(request.identity.operationId);
    if (existing) return this.#waitForFlight(existing.result, waiterDeadline, waiterOptions.signal);
    const completed = this.#operationResults.get(request.identity.operationId);
    if (completed) return Promise.resolve(completed);

    const generation = this.#nextGeneration++;
    const result = this.#activate(generation, normalizedRequest)
      .then(value => {
        this.#operationResults.set(request.identity.operationId, value);
        return value;
      })
      .finally(() => this.#flights.delete(request.identity.operationId));
    this.#flights.set(request.identity.operationId, { result });
    return this.#waitForFlight(result, waiterDeadline, waiterOptions.signal);
  }

  acquireInvocation(): { readonly generation: number; readonly id: number; release(): void } {
    if (this.#activeGeneration === 0 || this.#sealedGenerations.has(this.#activeGeneration)) {
      throw new Error("NO_ACTIVE_GENERATION");
    }
    const lease: InvocationLease = { generation: this.#activeGeneration, id: this.#nextLeaseId++, released: false };
    this.#leases.add(lease);
    return {
      generation: lease.generation,
      id: lease.id,
      release: () => {
        if (lease.released) return;
        lease.released = true;
        this.#leases.delete(lease);
      },
    };
  }

  assertInMemoryFence(lease: { readonly generation: number; readonly id: number }): void {
    const admitted = [...this.#leases].some(candidate =>
      candidate.generation === lease.generation && candidate.id === lease.id && !candidate.released,
    );
    if (!admitted) throw new Error("STALE_GENERATION");
  }

  async drain(generation: number, absoluteDeadline: number): Promise<boolean> {
    this.#sealedGenerations.add(generation);
    while ([...this.#leases].some(lease => lease.generation === generation)) {
      if (this.#clock.now() >= absoluteDeadline) break;
      await this.#clock.sleep(1);
    }
    const drained = ![...this.#leases].some(lease => lease.generation === generation);
    return drained;
  }

  async #waitForFlight(
    result: Promise<ActivationResult>,
    waiterDeadline: number,
    signal?: AbortSignal,
  ): Promise<ActivationResult> {
    const boundedWait = runBeforeDeadline(
      () => result,
      waiterDeadline,
      this.#clock,
      () => undefined,
      "WAITER_DEADLINE_EXCEEDED",
    );
    if (!signal) return boundedWait;
    if (signal.aborted) throw new Error("WAITER_CANCELLED");
    return new Promise<ActivationResult>((resolve, reject) => {
      const onAbort = (): void => reject(new Error("WAITER_CANCELLED"));
      signal.addEventListener("abort", onAbort, { once: true });
      boundedWait.then(
        value => {
          signal.removeEventListener("abort", onAbort);
          resolve(value);
        },
        error => {
          signal.removeEventListener("abort", onAbort);
          reject(error);
        },
      );
    });
  }

  async #activate(generation: number, request: ActivationRequest): Promise<ActivationResult> {
    const { identity, plan, hooks, absoluteDeadline } = request;
    const cleanupTimeoutMs = request.cleanupTimeoutMs ?? 50;
    const traces: LifecycleTrace[] = [];
    const errors: Error[] = [];
    const cleanupCandidates = new Set<string>();
    const activationController = new AbortController();
    let activationTimedOut = false;
    const activationContext: ActivationContext = { generation, phase: "activation", signal: activationController.signal };
    const markActivationTimeout = (): void => {
      activationTimedOut = true;
      activationController.abort("ABSOLUTE_DEADLINE_EXCEEDED");
    };
    const checkDeadline = (): void => {
      if (this.#clock.now() >= absoluteDeadline) {
        markActivationTimeout();
        throw new Error("ABSOLUTE_DEADLINE_EXCEEDED");
      }
    };

    try {
      if (this.#activeGeneration !== identity.expectedActiveGeneration) {
        traces.push({ phase: "publish", generation, outcome: "stale" });
        throw new Error("STALE_ACTIVE_GENERATION");
      }

      for (const batch of plan.startBatches) {
        const outcomes = await Promise.all(batch.map(async moduleId => {
          const localTraces: LifecycleTrace[] = [];
          try {
            checkDeadline();
            const module = hooks.get(moduleId);
            if (!module) throw new Error(`MISSING_HOOKS:${moduleId}`);
            cleanupCandidates.add(moduleId);
            localTraces.push({ phase: "prepare", moduleId, generation, outcome: "started" });
            await runBeforeDeadline(
              () => module.prepare?.(activationContext),
              absoluteDeadline,
              this.#clock,
              markActivationTimeout,
            );
            checkDeadline();
            localTraces.push({ phase: "start", moduleId, generation, outcome: "started" });
            await runBeforeDeadline(
              () => module.start?.(activationContext),
              absoluteDeadline,
              this.#clock,
              markActivationTimeout,
            );
            checkDeadline();
            if (module.readiness === "probe") {
              const ready = await runBeforeDeadline(
                () => module.ready(activationContext),
                absoluteDeadline,
                this.#clock,
                markActivationTimeout,
              );
              if (!ready) throw new Error(`NOT_READY:${moduleId}`);
            }
            checkDeadline();
            localTraces.push({ phase: "ready", moduleId, generation, outcome: "confirmed" });
            return { localTraces };
          } catch (error) {
            return { localTraces, error: asError(error) };
          }
        }));
        for (const outcome of outcomes) traces.push(...outcome.localTraces);
        const failed = outcomes.find(outcome => outcome.error !== undefined);
        if (failed?.error) throw failed.error;
      }

      checkDeadline();
      if (this.#activeGeneration !== identity.expectedActiveGeneration) {
        traces.push({ phase: "publish", generation, outcome: "stale" });
        throw new Error("STALE_ACTIVE_GENERATION");
      }
      const previous = this.#active;
      this.#activeGeneration = generation;
      this.#active = { generation, plan, hooks };
      this.#cutovers += 1;
      traces.push({ phase: "publish", generation, outcome: "confirmed" });

      let terminationProven = true;
      if (previous) {
        const cleanupDeadline = this.#clock.now() + cleanupTimeoutMs;
        const cleanupController = new AbortController();
        const cleanupContext: ActivationContext = {
          generation: previous.generation,
          phase: "cleanup",
          signal: cleanupController.signal,
        };
        const drained = await this.drain(previous.generation, cleanupDeadline);
        traces.push({ phase: "drain", generation: previous.generation, outcome: drained ? "confirmed" : "timed-out" });
        if (!drained) errors.push(new Error(`DRAIN_TIMEOUT:${previous.generation}`));
        if (!drained) terminationProven = false;
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
      }
      return freezeResult(
        true,
        generation,
        terminationProven ? "proven" : "termination_unproven",
        traces,
        errors,
      );
    } catch (error) {
      activationController.abort(error);
      const failure = asError(error);
      errors.push(failure);
      const cleanupDeadline = this.#clock.now() + cleanupTimeoutMs;
      const cleanupController = new AbortController();
      const cleanupContext: ActivationContext = { generation, phase: "cleanup", signal: cleanupController.signal };
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
      const termination = activationTimedOut || !cleanupProven ? "termination_unproven" : "proven";
      const outcome: LifecycleOutcome = termination === "termination_unproven"
        ? "termination_unproven"
        : failure.message === "STALE_ACTIVE_GENERATION" ? "stale" : "failed";
      traces.push({ phase: "abort", generation, outcome });
      return freezeResult(false, generation, termination, traces, errors);
    }
  }

  async #stopBatches(
    plan: CompiledGraph,
    hooks: ReadonlyMap<string, ModuleHooks>,
    context: ActivationContext,
    cleanupDeadline: number,
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
          await runBeforeDeadline(
            () => hooks.get(moduleId)?.stop?.(context),
            cleanupDeadline,
            this.#clock,
            () => controller.abort(`CLEANUP_TIMEOUT:${moduleId}`),
            `CLEANUP_TIMEOUT:${moduleId}`,
          );
          return { moduleId, outcome: "confirmed" as const };
        } catch (cleanupError) {
          const error = asError(cleanupError);
          return {
            moduleId,
            outcome: error.message.startsWith("CLEANUP_TIMEOUT:")
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
