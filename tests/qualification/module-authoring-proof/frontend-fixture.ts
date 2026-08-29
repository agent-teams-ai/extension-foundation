import type { LocatedDeclaration, StaticProfile } from "./model.ts";

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

export const FRONTEND_DECLARATIONS = Object.freeze([
  {
    declarationPath: "claude-recent-projects/module.declaration.json",
    declaration: {
      schemaVersion: 1,
      consumer: "frontend",
      moduleId: "recent-projects.claude-source",
      loaderKey: "recent-projects.claude-source",
      provides: ["recent-projects.source"],
      dependencies: { required: [], optional: [], many: [] },
      contribution: { kind: "recent-project-source" },
    },
  },
  {
    declarationPath: "codex-recent-projects/module.declaration.json",
    declaration: {
      schemaVersion: 1,
      consumer: "frontend",
      moduleId: "recent-projects.codex-source",
      loaderKey: "recent-projects.codex-source",
      provides: ["recent-projects.source"],
      dependencies: { required: [], optional: [], many: [] },
      contribution: { kind: "recent-project-source" },
    },
  },
  {
    declarationPath: "recent-projects/module.declaration.json",
    declaration: {
      schemaVersion: 1,
      consumer: "frontend",
      moduleId: "recent-projects.feature",
      loaderKey: "recent-projects.feature",
      provides: ["recent-projects.feature"],
      dependencies: {
        required: [],
        optional: [{ slot: "logger", capability: "recent-projects.logger" }],
        many: [{ slot: "sources", capability: "recent-projects.source" }],
      },
    },
  },
] satisfies readonly LocatedDeclaration[]);

export const FRONTEND_PROFILE: StaticProfile = Object.freeze({
  consumer: "frontend",
  roots: ["recent-projects.feature"],
  enabledModules: [
    "recent-projects.claude-source",
    "recent-projects.codex-source",
    "recent-projects.feature",
  ],
  bindings: {
    "recent-projects.feature.logger": null,
    "recent-projects.feature.sources": [
      "recent-projects.claude-source",
      "recent-projects.codex-source",
    ],
  },
  selectedLoaders: [
    "recent-projects.claude-source",
    "recent-projects.codex-source",
    "recent-projects.feature",
  ],
});

export function activateFrontendHybrid(
  sources: Readonly<Record<string, RecentProjectSource>>,
): RecentProjectsFeature {
  return createRecentProjectsFeature({
    sources: [sources["recent-projects.claude-source"]!, sources["recent-projects.codex-source"]!],
  });
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
      return activateFrontendHybrid(sources);
    },
  });
}
