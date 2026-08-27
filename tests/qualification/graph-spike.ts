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

export type QualificationBindingCardinality =
  | "optional"
  | "ordered-many"
  | "required";

export interface QualificationCapabilityOffer {
  readonly contractVersion: string;
  readonly slot: string;
}

export interface QualificationCapabilityDemand {
  readonly compatibleContractVersions: readonly string[];
  readonly cardinality: QualificationBindingCardinality;
  readonly slot: string;
}

export interface QualificationBindingModule {
  readonly id: string;
  readonly consumes: readonly QualificationCapabilityDemand[];
  readonly provides: readonly QualificationCapabilityOffer[];
}

export interface QualificationExplicitBinding {
  readonly consumerId: string;
  readonly providerIds: readonly string[];
  readonly slot: string;
}

export interface QualificationResolvedBinding {
  readonly cardinality: QualificationBindingCardinality;
  readonly consumerId: string;
  readonly providers: readonly Readonly<{
    readonly contractVersion: string;
    readonly moduleId: string;
  }>[];
  readonly slot: string;
}

export interface QualificationBindingDiagnostic {
  readonly code:
    | "AMBIGUOUS_BINDING"
    | "CARDINALITY_MISMATCH"
    | "DUPLICATE_DEMAND"
    | "DUPLICATE_MODULE"
    | "HARD_CYCLE"
    | "INCOMPATIBLE_PROVIDER"
    | "MISSING_BINDING"
    | "MISSING_PROVIDER"
    | "UNDECLARED_BINDING";
  readonly consumerId: string;
  readonly slot: string;
}

export type QualificationBindingResult =
  | {
      readonly ok: true;
      readonly plan: Readonly<{
        readonly digest: `sha256:${string}`;
        readonly graph: CompiledGraph;
        readonly resolved: readonly QualificationResolvedBinding[];
      }>;
    }
  | {
      readonly diagnostics: readonly QualificationBindingDiagnostic[];
      readonly ok: false;
    };

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

export function compileQualificationBindings(
  modulesInput: readonly QualificationBindingModule[],
  bindingsInput: readonly QualificationExplicitBinding[],
): QualificationBindingResult {
  const diagnostics: QualificationBindingDiagnostic[] = [];
  const modules = new Map<string, QualificationBindingModule>();
  const moduleCounts = new Map<string, number>();
  for (const module of [...modulesInput].sort((left, right) => compareIds(left.id, right.id))) {
    moduleCounts.set(module.id, (moduleCounts.get(module.id) ?? 0) + 1);
    if (!modules.has(module.id)) {
      modules.set(module.id, module);
    }
  }
  for (const [moduleId, count] of moduleCounts) {
    if (count > 1) {
      diagnostics.push({ code: "DUPLICATE_MODULE", consumerId: moduleId, slot: "module" });
    }
  }
  if (diagnostics.length > 0) {
    return {
      diagnostics: Object.freeze(diagnostics.sort((left, right) =>
        compareIds(
          `${left.code}:${left.consumerId}:${left.slot}`,
          `${right.code}:${right.consumerId}:${right.slot}`,
        ),
      )),
      ok: false,
    };
  }

  const bindingByDemand = new Map<string, QualificationExplicitBinding>();
  const bindingCounts = new Map<string, number>();
  for (const binding of [...bindingsInput].sort((left, right) =>
    compareIds(`${left.consumerId}:${left.slot}`, `${right.consumerId}:${right.slot}`),
  )) {
    const key = `${binding.consumerId}\0${binding.slot}`;
    bindingCounts.set(key, (bindingCounts.get(key) ?? 0) + 1);
    if (!bindingByDemand.has(key)) {
      bindingByDemand.set(key, binding);
    }
  }
  const duplicateBindingKeys = new Set<string>();
  for (const [key, count] of bindingCounts) {
    if (count > 1) {
      duplicateBindingKeys.add(key);
      const [consumerId = "", slot = ""] = key.split("\0");
      diagnostics.push({
        code: "AMBIGUOUS_BINDING",
        consumerId,
        slot,
      });
    }
  }

  const resolved: QualificationResolvedBinding[] = [];
  const declaredDemands = new Set<string>();
  const duplicateDemandKeys = new Set<string>();
  const graphNodes: ModuleDescriptor[] = [];
  for (const module of modules.values()) {
    const demandCounts = new Map<string, number>();
    for (const demand of module.consumes) {
      const key = `${module.id}\0${demand.slot}`;
      declaredDemands.add(key);
      demandCounts.set(key, (demandCounts.get(key) ?? 0) + 1);
    }
    for (const [key, count] of demandCounts) {
      if (count > 1) {
        duplicateDemandKeys.add(key);
        diagnostics.push({
          code: "DUPLICATE_DEMAND",
          consumerId: module.id,
          slot: key.slice(key.indexOf("\0") + 1),
        });
      }
    }
  }
  if (diagnostics.length > 0) {
    return {
      diagnostics: Object.freeze(diagnostics.sort((left, right) =>
        compareIds(
          `${left.code}:${left.consumerId}:${left.slot}`,
          `${right.code}:${right.consumerId}:${right.slot}`,
        ),
      )),
      ok: false,
    };
  }

  for (const module of modules.values()) {
    const dependencies: string[] = [];
    const demands = [...module.consumes].sort((left, right) => compareIds(left.slot, right.slot));
    for (const demand of demands) {
      const key = `${module.id}\0${demand.slot}`;
      if (duplicateDemandKeys.has(key) || duplicateBindingKeys.has(key)) continue;
      const binding = bindingByDemand.get(key);
      const providerIds = binding === undefined ? [] : [...binding.providerIds];
      const uniqueProviderIds = [...new Set(providerIds)];
      if (uniqueProviderIds.length !== providerIds.length) {
        diagnostics.push({ code: "AMBIGUOUS_BINDING", consumerId: module.id, slot: demand.slot });
        continue;
      }
      const cardinalityValid =
        (demand.cardinality === "required" && providerIds.length === 1) ||
        (demand.cardinality === "optional" && providerIds.length <= 1) ||
        demand.cardinality === "ordered-many";
      if (!cardinalityValid) {
        diagnostics.push({
          code:
            providerIds.length === 0 && demand.cardinality === "required"
              ? "MISSING_BINDING"
              : "CARDINALITY_MISMATCH",
          consumerId: module.id,
          slot: demand.slot,
        });
        continue;
      }

      const providers: Array<{ contractVersion: string; moduleId: string }> = [];
      for (const providerId of providerIds) {
        const provider = modules.get(providerId);
        if (provider === undefined) {
          diagnostics.push({ code: "MISSING_PROVIDER", consumerId: module.id, slot: demand.slot });
          continue;
        }
        const offers = provider.provides.filter(
          offer =>
            offer.slot === demand.slot &&
            demand.compatibleContractVersions.includes(offer.contractVersion),
        );
        if (offers.length !== 1) {
          diagnostics.push({
            code: offers.length > 1 ? "AMBIGUOUS_BINDING" : "INCOMPATIBLE_PROVIDER",
            consumerId: module.id,
            slot: demand.slot,
          });
          continue;
        }
        providers.push({
          contractVersion: offers[0]!.contractVersion,
          moduleId: providerId,
        });
        dependencies.push(providerId);
      }
      resolved.push(Object.freeze({
        cardinality: demand.cardinality,
        consumerId: module.id,
        providers: Object.freeze(providers.map(provider => Object.freeze(provider))),
        slot: demand.slot,
      }));
    }
    graphNodes.push({ id: module.id, requires: [...new Set(dependencies)] });
  }

  for (const binding of bindingsInput) {
    if (!declaredDemands.has(`${binding.consumerId}\0${binding.slot}`)) {
      diagnostics.push({
        code: "UNDECLARED_BINDING",
        consumerId: binding.consumerId,
        slot: binding.slot,
      });
    }
  }
  if (diagnostics.length > 0) {
    return {
      diagnostics: Object.freeze(diagnostics.sort((left, right) =>
        compareIds(
          `${left.code}:${left.consumerId}:${left.slot}`,
          `${right.code}:${right.consumerId}:${right.slot}`,
        ),
      )),
      ok: false,
    };
  }

  const graph = compileGraph(graphNodes);
  if (!graph.ok) {
    return {
      diagnostics: Object.freeze(graph.diagnostics.map(diagnostic => {
        const code: QualificationBindingDiagnostic["code"] =
          diagnostic.code === "DUPLICATE_MODULE"
            ? "DUPLICATE_MODULE"
            : diagnostic.code === "HARD_CYCLE"
              ? "HARD_CYCLE"
              : "MISSING_PROVIDER";
        return { code, consumerId: diagnostic.moduleId, slot: "graph" };
      })),
      ok: false,
    };
  }
  const immutableResolved = Object.freeze([...resolved].sort((left, right) =>
    compareIds(`${left.consumerId}:${left.slot}`, `${right.consumerId}:${right.slot}`),
  ));
  const digest = `sha256:${createHash("sha256")
    .update(canonicalJson({ graphDigest: graph.plan.digest, resolved: immutableResolved }))
    .digest("hex")}` as const;
  return {
    ok: true,
    plan: Object.freeze({ digest, graph: graph.plan, resolved: immutableResolved }),
  };
}
