import { setTimeout as delay } from "node:timers/promises";

import type { CompiledGraph } from "./graph-spike.ts";

export type LifecyclePhase = "prepare" | "start" | "ready" | "publish" | "drain" | "stop" | "abort";

export interface LifecycleTrace {
  readonly phase: LifecyclePhase;
  readonly moduleId?: string;
  readonly generation: number;
  readonly outcome: "started" | "confirmed" | "failed" | "timed-out" | "stale";
}

export interface ActivationContext {
  readonly generation: number;
  readonly signal: AbortSignal;
}

export interface ModuleHooks {
  prepare?(context: ActivationContext): void | Promise<void>;
  start?(context: ActivationContext): void | Promise<void>;
  ready?(context: ActivationContext): boolean | Promise<boolean>;
  stop?(context: ActivationContext): void | Promise<void>;
}

export interface ActivationResult {
  readonly ok: boolean;
  readonly generation: number;
  readonly traces: readonly LifecycleTrace[];
  readonly errors: readonly Error[];
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

function asError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}

function runBeforeDeadline<T>(
  operation: () => T | Promise<T>,
  absoluteDeadline: number,
  onTimeout: () => void,
  timeoutCode = "ABSOLUTE_DEADLINE_EXCEEDED",
): Promise<T> {
  const remaining = absoluteDeadline - Date.now();
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

export class GenerationLifecycle {
  readonly #flights = new Map<string, Promise<ActivationResult>>();
  readonly #leases = new Set<InvocationLease>();
  readonly #sealedGenerations = new Set<number>();
  #nextLeaseId = 1;
  #nextGeneration = 1;
  #activeGeneration = 0;
  #active: ActiveGraph | undefined;
  #cutovers = 0;

  get activeGeneration(): number {
    return this.#activeGeneration;
  }

  get cutovers(): number {
    return this.#cutovers;
  }

  activate(
    plan: CompiledGraph,
    hooks: ReadonlyMap<string, ModuleHooks>,
    absoluteDeadline: number,
    cleanupTimeoutMs = 50,
  ): Promise<ActivationResult> {
    const existing = this.#flights.get(plan.digest);
    if (existing) return existing;
    const generation = this.#nextGeneration++;
    const flight = this.#activate(generation, plan, hooks, absoluteDeadline, cleanupTimeoutMs)
      .finally(() => this.#flights.delete(plan.digest));
    this.#flights.set(plan.digest, flight);
    return flight;
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

  commitDurableWrite(generation: number, effect: () => void, lease?: { readonly generation: number; readonly id: number }): void {
    const admittedBeforeSeal = lease?.generation === generation && [...this.#leases].some(candidate =>
      candidate.generation === generation && candidate.id === lease.id && !candidate.released,
    );
    if ((generation !== this.#activeGeneration && !admittedBeforeSeal)
      || (this.#sealedGenerations.has(generation) && !admittedBeforeSeal)) {
      throw new Error("STALE_GENERATION");
    }
    effect();
  }

  async drain(generation: number, absoluteDeadline: number): Promise<boolean> {
    this.#sealedGenerations.add(generation);
    while ([...this.#leases].some(lease => lease.generation === generation)) {
      if (Date.now() >= absoluteDeadline) break;
      await delay(1);
    }
    const drained = ![...this.#leases].some(lease => lease.generation === generation);
    for (const lease of this.#leases) {
      if (lease.generation === generation) this.#leases.delete(lease);
    }
    return drained;
  }

  async #activate(
    generation: number,
    plan: CompiledGraph,
    hooks: ReadonlyMap<string, ModuleHooks>,
    absoluteDeadline: number,
    cleanupTimeoutMs: number,
  ): Promise<ActivationResult> {
    const traces: LifecycleTrace[] = [];
    const errors: Error[] = [];
    const cleanupCandidates = new Set<string>();
    const controller = new AbortController();
    const context = { generation, signal: controller.signal };

    const checkDeadline = (): void => {
      if (Date.now() >= absoluteDeadline) throw new Error("ABSOLUTE_DEADLINE_EXCEEDED");
    };

    try {
      for (const batch of plan.startBatches) {
        const outcomes = await Promise.allSettled(batch.map(async moduleId => {
          checkDeadline();
          const module = hooks.get(moduleId);
          if (!module) throw new Error(`MISSING_HOOKS:${moduleId}`);
          cleanupCandidates.add(moduleId);
          traces.push({ phase: "prepare", moduleId, generation, outcome: "started" });
          await runBeforeDeadline(() => module.prepare?.(context), absoluteDeadline, () => controller.abort("ABSOLUTE_DEADLINE_EXCEEDED"));
          checkDeadline();
          traces.push({ phase: "start", moduleId, generation, outcome: "started" });
          await runBeforeDeadline(() => module.start?.(context), absoluteDeadline, () => controller.abort("ABSOLUTE_DEADLINE_EXCEEDED"));
          checkDeadline();
          const ready = await runBeforeDeadline(() => module.ready?.(context) ?? true, absoluteDeadline, () => controller.abort("ABSOLUTE_DEADLINE_EXCEEDED"));
          if (!ready) throw new Error(`NOT_READY:${moduleId}`);
          checkDeadline();
          traces.push({ phase: "ready", moduleId, generation, outcome: "confirmed" });
        }));
        const failed = outcomes.find((outcome): outcome is PromiseRejectedResult => outcome.status === "rejected");
        if (failed) throw failed.reason;
      }

      checkDeadline();
      const previous = this.#active;
      this.#activeGeneration = generation;
      this.#active = { generation, plan, hooks };
      this.#cutovers += 1;
      traces.push({ phase: "publish", generation, outcome: "confirmed" });

      if (previous) {
        const drained = await this.drain(previous.generation, Math.min(absoluteDeadline, Date.now() + cleanupTimeoutMs));
        traces.push({ phase: "drain", generation: previous.generation, outcome: drained ? "confirmed" : "timed-out" });
        if (!drained) errors.push(new Error(`DRAIN_TIMEOUT:${previous.generation}`));
        for (const batch of previous.plan.stopBatches) {
          await Promise.all(batch.map(async moduleId => {
            try {
              await runBeforeDeadline(
                () => previous.hooks.get(moduleId)?.stop?.({ generation: previous.generation, signal: AbortSignal.timeout(cleanupTimeoutMs) }),
                Date.now() + cleanupTimeoutMs,
                () => undefined,
                `CLEANUP_TIMEOUT:${moduleId}`,
              );
              traces.push({ phase: "stop", moduleId, generation: previous.generation, outcome: "confirmed" });
            } catch (cleanupError) {
              errors.push(asError(cleanupError));
              traces.push({ phase: "stop", moduleId, generation: previous.generation, outcome: "failed" });
            }
          }));
        }
      }
      return { ok: true, generation, traces: Object.freeze(traces), errors: Object.freeze(errors) };
    } catch (error) {
      controller.abort(error);
      errors.push(asError(error));
      const timedOut = asError(error).message === "ABSOLUTE_DEADLINE_EXCEEDED";
      for (const batch of plan.stopBatches) {
        await Promise.all(batch.filter(id => cleanupCandidates.has(id)).map(async moduleId => {
          const module = hooks.get(moduleId);
          try {
            await runBeforeDeadline(
              () => module?.stop?.(context),
              Date.now() + cleanupTimeoutMs,
              () => undefined,
              `CLEANUP_TIMEOUT:${moduleId}`,
            );
            traces.push({ phase: "abort", moduleId, generation, outcome: "confirmed" });
          } catch (cleanupError) {
            errors.push(asError(cleanupError));
            traces.push({ phase: "abort", moduleId, generation, outcome: "failed" });
          }
        }));
      }
      traces.push({ phase: "abort", generation, outcome: timedOut ? "timed-out" : "failed" });
      return { ok: false, generation, traces: Object.freeze(traces), errors: Object.freeze(errors) };
    }
  }
}
