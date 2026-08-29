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
