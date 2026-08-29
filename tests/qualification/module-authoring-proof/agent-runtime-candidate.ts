import {
  createRuntimeInstallationFeature,
  type ExecutableObserver,
  type RuntimeInstallationFeature,
} from "./agent-runtime-fixture.ts";
import { readFixtureData } from "./fixture-data.ts";

const fixtureData = readFixtureData(
  "agent-runtime",
  new URL("./fixtures/agent-runtime/", import.meta.url),
  ["executable-observer", "runtime-installation"],
);

export const AGENT_RUNTIME_DECLARATIONS = fixtureData.declarations;
export const AGENT_RUNTIME_PROFILE = fixtureData.profile;

// Candidate metadata remains a validation shadow. The target still uses Pure DI.
export const createAgentRuntimeCandidate = (
  observer: ExecutableObserver,
): Readonly<{ runtimeInstallation: RuntimeInstallationFeature }> => Object.freeze({
  // @proof-binding-site runtime.executable-observer
  runtimeInstallation: createRuntimeInstallationFeature({ executableFileObserver: observer }),
});
