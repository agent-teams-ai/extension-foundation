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
