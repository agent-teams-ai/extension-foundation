export interface RecentProjectSource {
  readonly sourceId: string;
  list(): readonly string[];
}

export interface RecentProjectsFeature {
  listDashboardRecentProjects(): readonly string[];
}

export const createRecentProjectsFeature = (
  dependencies: Readonly<{
    sources: readonly RecentProjectSource[];
    logger?: Readonly<{ info(message: string): void }>;
  }>,
): RecentProjectsFeature => Object.freeze({
  listDashboardRecentProjects: () => {
    const projects = dependencies.sources.flatMap(source => source.list());
    dependencies.logger?.info(`recent:${projects.length}`);
    return Object.freeze(projects);
  },
});

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
