import {
  createRecentProjectsFeature,
  type RecentProjectSource,
} from "./frontend-fixture.ts";

export function createFrontendLoaderTable(
  sources: Readonly<Record<string, RecentProjectSource>>,
  trace: string[],
): Readonly<Record<string, () => unknown>> {
  return Object.freeze({
    "recent-projects.claude-source": () => {
      trace.push("recent-projects.claude-source");
      return sources["recent-projects.claude-source"];
    },
    "recent-projects.codex-source": () => {
      trace.push("recent-projects.codex-source");
      return sources["recent-projects.codex-source"];
    },
    "recent-projects.feature": () => {
      trace.push("recent-projects.feature");
      return createRecentProjectsFeature;
    },
  });
}
