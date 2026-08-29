import {
  createRuntimeInstallationFeature,
  type ExecutableObserver,
} from "./agent-runtime-fixture.ts";

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
