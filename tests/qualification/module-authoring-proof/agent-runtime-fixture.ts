import type { LocatedDeclaration, ModuleDeclaration, StaticProfile } from "./model.ts";

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

export const AGENT_RUNTIME_DECLARATIONS = Object.freeze([
  {
    declarationPath: "executable-observer/module.declaration.json",
    declaration: {
      schemaVersion: 1,
      consumer: "agent-runtime",
      moduleId: "runtime.executable-observer",
      loaderKey: "runtime.executable-observer",
      provides: ["runtime.executable-observation"],
      dependencies: { required: [], optional: [], many: [] },
    },
  },
  {
    declarationPath: "runtime-installation/module.declaration.json",
    declaration: {
      schemaVersion: 1,
      consumer: "agent-runtime",
      moduleId: "runtime.installation-discovery",
      loaderKey: "runtime.installation-discovery",
      provides: ["runtime.installation-discovery"],
      dependencies: {
        required: [{ slot: "executableFileObserver", capability: "runtime.executable-observation" }],
        optional: [],
        many: [],
      },
    },
  },
] satisfies readonly LocatedDeclaration[]);

export const AGENT_RUNTIME_PROFILE: StaticProfile = Object.freeze({
  consumer: "agent-runtime",
  roots: ["runtime.installation-discovery"],
  enabledModules: ["runtime.executable-observer", "runtime.installation-discovery"],
  bindings: {
    "runtime.installation-discovery.executableFileObserver": "runtime.executable-observer",
  },
  selectedLoaders: ["runtime.executable-observer", "runtime.installation-discovery"],
});

export function activateAgentRuntimeHybrid(
  observer: ExecutableObserver,
): Readonly<{ runtimeInstallation: RuntimeInstallationFeature }> {
  const providers = Object.freeze({ "runtime.executable-observer": observer });
  return Object.freeze({
    runtimeInstallation: createRuntimeInstallationFeature({
      executableFileObserver: providers["runtime.executable-observer"],
    }),
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
      return createRuntimeInstallationFeature({ executableFileObserver: observer });
    },
  });
}

export const declaration = <T extends ModuleDeclaration>(value: T): T => value;
