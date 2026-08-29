import {
  createRecentProjectsFeature,
  type RecentProjectSource,
  type RecentProjectsFeature,
} from "./frontend-fixture.ts";
import { readFixtureData } from "./fixture-data.ts";

const fixtureData = readFixtureData(
  "frontend",
  new URL("./fixtures/frontend/", import.meta.url),
  ["claude-recent-projects", "codex-recent-projects", "recent-projects"],
);

export const FRONTEND_DECLARATIONS = fixtureData.declarations;
export const FRONTEND_PROFILE = fixtureData.profile;

// Candidate metadata remains a validation shadow. The target still uses Pure DI.
export const createFrontendCandidate = (
  claude: RecentProjectSource,
  codex: RecentProjectSource,
): RecentProjectsFeature => {
  // @proof-binding-site recent-projects.sources
  return createRecentProjectsFeature({ sources: [claude, codex] });
};
