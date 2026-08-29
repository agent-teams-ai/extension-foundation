import {
  createRecentProjectsFeature,
  type RecentProjectSource,
  type RecentProjectsFeature,
} from "./frontend-fixture.ts";

export const createFrontendBaseline = (
  claude: RecentProjectSource,
  codex: RecentProjectSource,
): RecentProjectsFeature => {
  // @proof-binding-site recent-projects.sources
  return createRecentProjectsFeature({ sources: [claude, codex] });
};
