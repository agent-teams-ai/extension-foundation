import { readFixtureData } from "./fixture-data.ts";
import type { StaticPlan } from "./model.ts";

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

export const createFrontendBaseline = (
  claude: RecentProjectSource,
  codex: RecentProjectSource,
): RecentProjectsFeature => createRecentProjectsFeature({ sources: [claude, codex] });

const fixtureData = readFixtureData("frontend", new URL("./fixtures/frontend/", import.meta.url));
export const FRONTEND_DECLARATIONS = fixtureData.declarations;
export const FRONTEND_PROFILE = fixtureData.profile;

export function activateFrontendHybrid(
  plan: StaticPlan,
  loaders: Readonly<Record<string, () => unknown>>,
): RecentProjectsFeature {
  const root = plan.factoryArguments.find(argument => argument.moduleId === "recent-projects.feature");
  const sourceIds = root?.dependencies.sources;
  if (root === undefined || !Array.isArray(sourceIds)) throw new Error("INVALID_FRONTEND_STATIC_PLAN");
  const sources = sourceIds.map(sourceId => {
    const loader = loaders[sourceId];
    if (loader === undefined) throw new Error("MISSING_FRONTEND_SOURCE_LOADER");
    return loader() as RecentProjectSource;
  });
  const loadFactory = loaders[root.loaderKey];
  if (loadFactory === undefined) throw new Error("MISSING_FRONTEND_FACTORY_LOADER");
  const factory = loadFactory();
  if (typeof factory !== "function") throw new Error("INVALID_FRONTEND_ACTIVATION_FACTORY");
  return (factory as typeof createRecentProjectsFeature)({ sources });
}

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
