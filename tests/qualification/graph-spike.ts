import { createHash } from "node:crypto";

export interface ModuleDescriptor {
  readonly id: string;
  readonly requires: readonly string[];
}

export interface GraphDiagnostic {
  readonly code: "DUPLICATE_MODULE" | "MISSING_PROVIDER" | "HARD_CYCLE";
  readonly moduleId: string;
  readonly dependencyPath: readonly string[];
}

export interface CompiledGraph {
  readonly digest: `sha256:${string}`;
  readonly nodes: readonly Readonly<{
    readonly id: string;
    readonly requires: readonly string[];
  }>[];
  readonly startBatches: readonly (readonly string[])[];
  readonly startOrder: readonly string[];
  readonly stopBatches: readonly (readonly string[])[];
  readonly stopOrder: readonly string[];
}

export type GraphResult =
  | { readonly ok: true; readonly plan: CompiledGraph }
  | { readonly ok: false; readonly diagnostics: readonly GraphDiagnostic[] };

const compareIds = (left: string, right: string): number =>
  left === right ? 0 : left < right ? -1 : 1;

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    const record = value as Readonly<Record<string, unknown>>;
    return `{${Object.keys(record).sort(compareIds).map(key => `${JSON.stringify(key)}:${canonicalJson(record[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function cycleWitness(
  nodes: readonly string[],
  dependencies: ReadonlyMap<string, readonly string[]>,
): readonly string[] {
  const remaining = new Set(nodes);
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const path: string[] = [];

  for (const root of [...nodes].sort(compareIds)) {
    if (visited.has(root)) continue;
    const stack = [{ node: root, index: 0, edges: (dependencies.get(root) ?? []).filter(node => remaining.has(node)) }];
    visiting.add(root);
    path.push(root);
    while (stack.length > 0) {
      const current = stack[stack.length - 1]!;
      const dependency = current.edges[current.index++];
      if (dependency === undefined) {
        stack.pop();
        path.pop();
        visiting.delete(current.node);
        visited.add(current.node);
        continue;
      }
      if (visiting.has(dependency)) {
        const start = path.indexOf(dependency);
        return [...path.slice(start), dependency];
      }
      if (!visited.has(dependency)) {
        visiting.add(dependency);
        path.push(dependency);
        stack.push({ node: dependency, index: 0, edges: (dependencies.get(dependency) ?? []).filter(node => remaining.has(node)) });
      }
    }
  }
  return [];
}

export function compileGraph(input: readonly ModuleDescriptor[]): GraphResult {
  const diagnostics: GraphDiagnostic[] = [];
  const byId = new Map<string, ModuleDescriptor>();

  for (const descriptor of [...input].sort((a, b) => compareIds(a.id, b.id))) {
    if (byId.has(descriptor.id)) {
      diagnostics.push({ code: "DUPLICATE_MODULE", moduleId: descriptor.id, dependencyPath: [descriptor.id] });
    } else {
      byId.set(descriptor.id, descriptor);
    }
  }

  if (diagnostics.length > 0) {
    return { ok: false, diagnostics: Object.freeze(diagnostics.sort((a, b) => compareIds(`${a.code}:${a.moduleId}`, `${b.code}:${b.moduleId}`))) };
  }

  const dependencies = new Map<string, readonly string[]>();
  for (const [id, descriptor] of byId) {
    const required = [...new Set(descriptor.requires)].sort(compareIds);
    dependencies.set(id, Object.freeze(required));
    for (const dependency of required) {
      if (!byId.has(dependency)) {
        diagnostics.push({ code: "MISSING_PROVIDER", moduleId: id, dependencyPath: [id, dependency] });
      }
    }
  }

  if (diagnostics.length > 0) {
    return { ok: false, diagnostics: Object.freeze(diagnostics.sort((a, b) => compareIds(`${a.code}:${a.moduleId}`, `${b.code}:${b.moduleId}`))) };
  }

  const consumers = new Map<string, string[]>();
  const indegree = new Map<string, number>();
  for (const id of byId.keys()) {
    consumers.set(id, []);
    indegree.set(id, dependencies.get(id)?.length ?? 0);
  }
  for (const [consumer, required] of dependencies) {
    for (const provider of required) consumers.get(provider)?.push(consumer);
  }
  for (const targets of consumers.values()) targets.sort(compareIds);

  const ready = [...byId.keys()].filter(id => indegree.get(id) === 0).sort(compareIds);
  const startBatches: string[][] = [];
  const emitted: string[] = [];
  while (ready.length > 0) {
    const batch = ready.splice(0).sort(compareIds);
    startBatches.push(batch);
    emitted.push(...batch);
    const next: string[] = [];
    for (const provider of batch) {
      for (const consumer of consumers.get(provider) ?? []) {
        const degree = (indegree.get(consumer) ?? 0) - 1;
        indegree.set(consumer, degree);
        if (degree === 0) next.push(consumer);
      }
    }
    ready.push(...next.sort(compareIds));
  }

  if (emitted.length !== byId.size) {
    const emittedSet = new Set(emitted);
    const residual = [...byId.keys()].filter(id => !emittedSet.has(id)).sort(compareIds);
    const witness = cycleWitness(residual, dependencies);
    return { ok: false, diagnostics: [{ code: "HARD_CYCLE", moduleId: witness[0] ?? residual[0] ?? "unknown", dependencyPath: witness }] };
  }

  const nodes = Object.freeze([...byId.keys()].sort(compareIds).map(id => Object.freeze({
    id,
    requires: dependencies.get(id) ?? Object.freeze([]),
  })));
  const immutableStartBatches = Object.freeze(startBatches.map(batch => Object.freeze([...batch])));
  const serializable = {
    schema: "qualification.module-graph/v1",
    nodes,
    startBatches: immutableStartBatches,
  };
  const digest = `sha256:${createHash("sha256").update(canonicalJson(serializable)).digest("hex")}` as const;
  const stopBatches = Object.freeze([...immutableStartBatches].reverse().map(batch => Object.freeze([...batch])));

  return {
    ok: true,
    plan: Object.freeze({
      digest,
      nodes,
      startBatches: immutableStartBatches,
      startOrder: Object.freeze([...emitted]),
      stopBatches,
      stopOrder: Object.freeze(stopBatches.flat()),
    }),
  };
}
