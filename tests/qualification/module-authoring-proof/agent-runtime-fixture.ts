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
