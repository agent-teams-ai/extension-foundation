import {
  createRuntimeInstallationFeature,
  type ExecutableObserver,
  type RuntimeInstallationFeature,
} from "./agent-runtime-fixture.ts";

export const createAgentRuntimeBaseline = (
  observer: ExecutableObserver,
): Readonly<{ runtimeInstallation: RuntimeInstallationFeature }> => Object.freeze({
  // @proof-binding-site runtime.executable-observer
  runtimeInstallation: createRuntimeInstallationFeature({ executableFileObserver: observer }),
});
