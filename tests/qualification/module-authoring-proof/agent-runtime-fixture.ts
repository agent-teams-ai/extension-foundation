import { readFixtureData } from "./fixture-data.ts";
import type { StaticPlan } from "./model.ts";

export interface ExecutableObserver {
  readonly observed: readonly string[];
}

export interface RuntimeInstallationFeature {
  discoverClaudeCodeInstallations(): string;
  discoverCodexInstallations(): string;
}

export const createRuntimeInstallationFeature = (
  dependencies: Readonly<{ executableFileObserver: ExecutableObserver }>,
): RuntimeInstallationFeature => Object.freeze({
  discoverClaudeCodeInstallations: () => `claude:${dependencies.executableFileObserver.observed.join(",")}`,
  discoverCodexInstallations: () => `codex:${dependencies.executableFileObserver.observed.join(",")}`,
});

export const createAgentRuntimeBaseline = (
  observer: ExecutableObserver,
): Readonly<{ runtimeInstallation: RuntimeInstallationFeature }> => Object.freeze({
  runtimeInstallation: createRuntimeInstallationFeature({ executableFileObserver: observer }),
});

const fixtureData = readFixtureData("agent-runtime", new URL("./fixtures/agent-runtime/", import.meta.url));
export const AGENT_RUNTIME_DECLARATIONS = fixtureData.declarations;
export const AGENT_RUNTIME_PROFILE = fixtureData.profile;

export function activateAgentRuntimeHybrid(
  plan: StaticPlan,
  loaders: Readonly<Record<string, () => unknown>>,
): Readonly<{ runtimeInstallation: RuntimeInstallationFeature }> {
  const root = plan.factoryArguments.find(argument => argument.moduleId === "runtime.installation-discovery");
  const observerId = root?.dependencies.executableFileObserver;
  if (root === undefined || typeof observerId !== "string") throw new Error("INVALID_AGENT_RUNTIME_STATIC_PLAN");
  const loadObserver = loaders[observerId];
  const loadFactory = loaders[root.loaderKey];
  if (loadObserver === undefined || loadFactory === undefined) throw new Error("MISSING_AGENT_RUNTIME_LITERAL_LOADER");
  const observer = loadObserver() as ExecutableObserver;
  const factory = loadFactory();
  if (typeof factory !== "function") throw new Error("INVALID_AGENT_RUNTIME_ACTIVATION_FACTORY");
  return Object.freeze({
    runtimeInstallation: (factory as typeof createRuntimeInstallationFeature)({ executableFileObserver: observer }),
  });
}

export function createAgentRuntimeLoaderTable(
  observer: ExecutableObserver,
  trace: string[],
): Readonly<Record<string, () => unknown>> {
  return Object.freeze({
    "runtime.executable-observer": () => {
      trace.push("runtime.executable-observer");
      return observer;
    },
    "runtime.installation-discovery": () => {
      trace.push("runtime.installation-discovery");
      return createRuntimeInstallationFeature;
    },
  });
}
