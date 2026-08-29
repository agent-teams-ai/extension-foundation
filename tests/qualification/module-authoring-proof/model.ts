export const DECLARATION_NAME = "module.declaration.json";

export type Consumer = "agent-runtime" | "frontend";
export type SlotKind = "required" | "optional" | "many";

export interface DependencySlot {
  readonly capability: string;
  readonly slot: string;
}

export interface ModuleDeclaration {
  readonly schemaVersion: 1;
  readonly consumer: Consumer;
  readonly moduleId: string;
  readonly loaderKey: string;
  readonly provides: readonly string[];
  readonly dependencies: Readonly<Record<SlotKind, readonly DependencySlot[]>>;
}

export interface LocatedDeclaration {
  readonly declaration: ModuleDeclaration;
  readonly declarationPath: string;
}

export interface SyntheticCandidateProfile {
  readonly consumer: Consumer;
  readonly roots: readonly string[];
  readonly enabledModules: readonly string[];
  readonly bindings: Readonly<Record<string, string | readonly string[] | null>>;
  readonly selectedLoaders: readonly string[];
}

export interface Diagnostic {
  readonly code: string;
  readonly consumer: string;
  readonly declarationPath: string;
  readonly fieldPath: string;
  readonly moduleId?: string;
  readonly relatedPaths: readonly string[];
}

export interface SyntheticFactoryArgument {
  readonly moduleId: string;
  readonly loaderKey: string;
  readonly dependencies: Readonly<Record<string, string | readonly string[] | null>>;
}

export interface SyntheticCandidatePlan {
  readonly consumer: Consumer;
  readonly roots: readonly string[];
  readonly factoryArguments: readonly SyntheticFactoryArgument[];
  readonly selectedLoaders: readonly string[];
}

export interface SyntheticCandidateResult {
  readonly diagnostics: readonly Diagnostic[];
  readonly plan?: SyntheticCandidatePlan;
}

const MODULE_ID = /^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)*$/u;
const CAPABILITY_ID = /^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)*\/v[1-9][0-9]*$/u;
const SLOT = /^[a-z][A-Za-z0-9]*$/u;
const DECLARATION_FIELDS = new Set(["schemaVersion", "consumer", "moduleId", "loaderKey", "provides", "dependencies"]);
const DEPENDENCY_FIELDS = new Set<SlotKind>(["required", "optional", "many"]);
const SLOT_FIELDS = new Set(["slot", "capability"]);
const PROFILE_FIELDS = new Set(["consumer", "roots", "enabledModules", "bindings", "selectedLoaders"]);

export function binaryCompare(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function immutable<T>(value: T): T {
  if (typeof value === "object" && value !== null && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) immutable(child);
  }
  return value;
}

function safePath(value: string): string {
  const normalized = value.replaceAll("\\", "/");
  const parts = normalized.split("/");
  return normalized.startsWith("/") || /^[A-Za-z]:\//u.test(normalized) || parts.some(part => part === ".." || part === "")
    ? "unsafe-path"
    : normalized;
}

function diagnostic(
  code: string,
  consumer: string,
  declarationPath: string,
  fieldPath: string,
  moduleId?: string,
  relatedPaths: readonly string[] = [],
): Diagnostic {
  return immutable({
    code,
    consumer,
    declarationPath: safePath(declarationPath),
    fieldPath,
    ...(moduleId === undefined ? {} : { moduleId }),
    relatedPaths: [...relatedPaths].map(safePath).sort(binaryCompare),
  });
}

const diagnosticKey = (item: Diagnostic): string => [
  item.code,
  item.consumer,
  item.declarationPath,
  item.fieldPath,
  item.moduleId ?? "",
  item.relatedPaths.join("\u0000"),
].join("\u0001");

export function sortDiagnostics(items: readonly Diagnostic[]): readonly Diagnostic[] {
  return immutable([...items].sort((left, right) => binaryCompare(diagnosticKey(left), diagnosticKey(right))));
}

function unknownFields(
  raw: Record<string, unknown>,
  admitted: ReadonlySet<string>,
  consumer: string,
  path: string,
  fieldPath: string,
  moduleId: string | undefined,
  diagnostics: Diagnostic[],
): void {
  for (const key of Object.keys(raw).sort(binaryCompare)) {
    if (!admitted.has(key)) diagnostics.push(diagnostic("UNKNOWN_FIELD", consumer, path, `${fieldPath}.${key}`, moduleId));
  }
}

function parseSlots(
  raw: unknown,
  kind: SlotKind,
  consumer: string,
  path: string,
  moduleId: string | undefined,
  diagnostics: Diagnostic[],
): DependencySlot[] {
  if (!Array.isArray(raw)) {
    diagnostics.push(diagnostic("DECLARATION_FIELD", consumer, path, `dependencies.${kind}`, moduleId));
    return [];
  }
  const slots: DependencySlot[] = [];
  raw.forEach((item, index) => {
    if (!isRecord(item)) {
      diagnostics.push(diagnostic("DECLARATION_FIELD", consumer, path, `dependencies.${kind}.${index}`, moduleId));
      return;
    }
    unknownFields(item, SLOT_FIELDS, consumer, path, `dependencies.${kind}.${index}`, moduleId, diagnostics);
    if (typeof item.slot !== "string" || !SLOT.test(item.slot) || typeof item.capability !== "string" || !CAPABILITY_ID.test(item.capability)) {
      diagnostics.push(diagnostic("DECLARATION_FIELD", consumer, path, `dependencies.${kind}.${index}`, moduleId));
      return;
    }
    slots.push({ slot: item.slot, capability: item.capability });
  });
  return slots;
}

export function validateDeclaration(
  raw: unknown,
  declarationPath: string,
  consumerHint = "unknown",
): { readonly declaration?: ModuleDeclaration; readonly diagnostics: readonly Diagnostic[] } {
  const diagnostics: Diagnostic[] = [];
  if (!isRecord(raw)) return { diagnostics: sortDiagnostics([diagnostic("DECLARATION_SHAPE", consumerHint, declarationPath, "$")]) };
  const consumer = raw.consumer === "agent-runtime" || raw.consumer === "frontend" ? raw.consumer : consumerHint;
  const moduleId = typeof raw.moduleId === "string" && MODULE_ID.test(raw.moduleId) ? raw.moduleId : undefined;
  unknownFields(raw, DECLARATION_FIELDS, consumer, declarationPath, "$", moduleId, diagnostics);
  if (raw.schemaVersion !== 1) diagnostics.push(diagnostic("DECLARATION_FIELD", consumer, declarationPath, "schemaVersion", moduleId));
  if (raw.consumer !== "agent-runtime" && raw.consumer !== "frontend") diagnostics.push(diagnostic("DECLARATION_FIELD", consumer, declarationPath, "consumer", moduleId));
  if (raw.consumer !== consumerHint && consumerHint !== "unknown") diagnostics.push(diagnostic("OWNER_CONSUMER_MISMATCH", consumerHint, declarationPath, "consumer", moduleId));
  if (moduleId === undefined) diagnostics.push(diagnostic("DECLARATION_FIELD", consumer, declarationPath, "moduleId"));
  if (typeof raw.loaderKey !== "string" || !MODULE_ID.test(raw.loaderKey)) diagnostics.push(diagnostic("DECLARATION_FIELD", consumer, declarationPath, "loaderKey", moduleId));
  const provides = Array.isArray(raw.provides) && raw.provides.every(value => typeof value === "string" && CAPABILITY_ID.test(value))
    ? [...raw.provides] as string[]
    : [];
  if (!Array.isArray(raw.provides) || provides.length !== raw.provides.length) diagnostics.push(diagnostic("DECLARATION_FIELD", consumer, declarationPath, "provides", moduleId));
  if (new Set(provides).size !== provides.length) diagnostics.push(diagnostic("DUPLICATE_PROVIDES", consumer, declarationPath, "provides", moduleId));
  const dependencies = isRecord(raw.dependencies) ? raw.dependencies : {};
  if (!isRecord(raw.dependencies)) diagnostics.push(diagnostic("DECLARATION_FIELD", consumer, declarationPath, "dependencies", moduleId));
  else unknownFields(dependencies, DEPENDENCY_FIELDS, consumer, declarationPath, "dependencies", moduleId, diagnostics);
  const required = parseSlots(dependencies.required, "required", consumer, declarationPath, moduleId, diagnostics);
  const optional = parseSlots(dependencies.optional, "optional", consumer, declarationPath, moduleId, diagnostics);
  const many = parseSlots(dependencies.many, "many", consumer, declarationPath, moduleId, diagnostics);
  const slotNames = [...required, ...optional, ...many].map(slot => slot.slot);
  if (new Set(slotNames).size !== slotNames.length) diagnostics.push(diagnostic("DUPLICATE_SLOT", consumer, declarationPath, "dependencies", moduleId));
  if (diagnostics.length > 0 || moduleId === undefined || typeof raw.loaderKey !== "string") return { diagnostics: sortDiagnostics(diagnostics) };
  return {
    declaration: immutable({
      schemaVersion: 1,
      consumer: consumer as Consumer,
      moduleId,
      loaderKey: raw.loaderKey,
      provides,
      dependencies: { required, optional, many },
    }),
    diagnostics: sortDiagnostics([]),
  };
}

export function validateSyntheticCandidateProfile(raw: unknown): { readonly profile?: SyntheticCandidateProfile; readonly diagnostics: readonly Diagnostic[] } {
  const diagnostics: Diagnostic[] = [];
  if (!isRecord(raw)) return { diagnostics: sortDiagnostics([diagnostic("PROFILE_SHAPE", "unknown", "profile.json", "$")]) };
  const consumer = raw.consumer === "agent-runtime" || raw.consumer === "frontend" ? raw.consumer : "unknown";
  unknownFields(raw, PROFILE_FIELDS, consumer, "profile.json", "$", undefined, diagnostics);
  if (consumer === "unknown") diagnostics.push(diagnostic("PROFILE_FIELD", consumer, "profile.json", "consumer"));
  const arrayField = (name: "roots" | "enabledModules" | "selectedLoaders"): string[] => {
    const value = raw[name];
    if (!Array.isArray(value) || !value.every(item => typeof item === "string")) {
      diagnostics.push(diagnostic("PROFILE_FIELD", consumer, "profile.json", name));
      return [];
    }
    const result = value as string[];
    if (new Set(result).size !== result.length) diagnostics.push(diagnostic(`DUPLICATE_PROFILE_${name === "enabledModules" ? "MODULE" : name === "selectedLoaders" ? "LOADER" : "ROOT"}`, consumer, "profile.json", name));
    return [...result];
  };
  const roots = arrayField("roots");
  const enabledModules = arrayField("enabledModules");
  const selectedLoaders = arrayField("selectedLoaders");
  const bindings: Record<string, string | readonly string[] | null> = Object.create(null) as Record<string, string | readonly string[] | null>;
  if (Array.isArray(raw.bindings)) {
    const seen = new Set<string>();
    raw.bindings.forEach((entry, index) => {
      if (!isRecord(entry) || Object.keys(entry).some(key => key !== "slot" && key !== "value") || typeof entry.slot !== "string" ||
        !(typeof entry.value === "string" || entry.value === null || (Array.isArray(entry.value) && entry.value.every(item => typeof item === "string")))) {
        diagnostics.push(diagnostic("PROFILE_FIELD", consumer, "profile.json", `bindings.${index}`));
      } else if (seen.has(entry.slot)) {
        diagnostics.push(diagnostic("DUPLICATE_PROFILE_BINDING", consumer, "profile.json", `bindings.${entry.slot}`));
      } else {
        seen.add(entry.slot);
        bindings[entry.slot] = entry.value as string | string[] | null;
      }
    });
  } else if (!isRecord(raw.bindings)) diagnostics.push(diagnostic("PROFILE_FIELD", consumer, "profile.json", "bindings"));
  else {
    for (const key of Object.keys(raw.bindings).sort(binaryCompare)) {
      const value = raw.bindings[key];
      if (typeof value === "string" || value === null || (Array.isArray(value) && value.every(item => typeof item === "string"))) bindings[key] = value as string | string[] | null;
      else diagnostics.push(diagnostic("PROFILE_FIELD", consumer, "profile.json", `bindings.${key}`));
    }
  }
  if (diagnostics.length > 0 || consumer === "unknown") return { diagnostics: sortDiagnostics(diagnostics) };
  return { profile: immutable({ consumer, roots, enabledModules, bindings: { ...bindings }, selectedLoaders }), diagnostics: sortDiagnostics([]) };
}

const capabilityFamily = (capability: string): string => capability.replace(/\/v[1-9][0-9]*$/u, "");

function cycleDiagnostics(
  edges: ReadonlyMap<string, readonly string[]>,
  byId: ReadonlyMap<string, LocatedDeclaration>,
  consumer: string,
): Diagnostic[] {
  const colors = new Map<string, 0 | 1 | 2>();
  const stack: string[] = [];
  const seen = new Set<string>();
  const result: Diagnostic[] = [];
  const visit = (moduleId: string): void => {
    colors.set(moduleId, 1);
    stack.push(moduleId);
    for (const providerId of [...(edges.get(moduleId) ?? [])].sort(binaryCompare)) {
      if ((colors.get(providerId) ?? 0) === 0) visit(providerId);
      else if (colors.get(providerId) === 1) {
        const cycle = stack.slice(stack.indexOf(providerId));
        const key = [...cycle].sort(binaryCompare).join("\u0000");
        if (!seen.has(key)) {
          seen.add(key);
          const owner = [...cycle].sort(binaryCompare)[0]!;
          result.push(diagnostic("STATIC_PROFILE_CYCLE", consumer, "profile.json", "bindings", owner, cycle.map(id => byId.get(id)?.declarationPath ?? "profile.json")));
        }
      }
    }
    stack.pop();
    colors.set(moduleId, 2);
  };
  for (const moduleId of [...edges.keys()].sort(binaryCompare)) if ((colors.get(moduleId) ?? 0) === 0) visit(moduleId);
  return result;
}

// Qualification-only oracle. It is deliberately not exported by a package and
// does not authorize a Foundation or product runtime contract.
export function simulateCandidateProfile(
  declarations: readonly LocatedDeclaration[],
  rawProfile: SyntheticCandidateProfile | unknown,
): SyntheticCandidateResult {
  const checkedProfile = validateSyntheticCandidateProfile(rawProfile);
  if (checkedProfile.profile === undefined) return { diagnostics: checkedProfile.diagnostics };
  const profile = checkedProfile.profile;
  const diagnostics: Diagnostic[] = [...checkedProfile.diagnostics];
  const byId = new Map<string, LocatedDeclaration>();
  const byLoaderKey = new Map<string, LocatedDeclaration>();
  for (const item of [...declarations].sort((a, b) => binaryCompare(a.declarationPath, b.declarationPath))) {
    if (item.declaration.consumer !== profile.consumer) {
      diagnostics.push(diagnostic("OWNER_CONSUMER_MISMATCH", profile.consumer, item.declarationPath, "consumer", item.declaration.moduleId));
      continue;
    }
    if (new Set(item.declaration.provides).size !== item.declaration.provides.length) diagnostics.push(diagnostic("DUPLICATE_PROVIDES", profile.consumer, item.declarationPath, "provides", item.declaration.moduleId));
    const prior = byId.get(item.declaration.moduleId);
    if (prior !== undefined) diagnostics.push(diagnostic("DUPLICATE_MODULE", profile.consumer, item.declarationPath, "moduleId", item.declaration.moduleId, [prior.declarationPath]));
    else byId.set(item.declaration.moduleId, item);
    const priorLoader = byLoaderKey.get(item.declaration.loaderKey);
    if (priorLoader === undefined) byLoaderKey.set(item.declaration.loaderKey, item);
    else if (priorLoader.declaration.moduleId !== item.declaration.moduleId) {
      diagnostics.push(diagnostic("DUPLICATE_LOADER_KEY", profile.consumer, item.declarationPath, "loaderKey", item.declaration.moduleId, [priorLoader.declarationPath]));
    }
  }
  const enabled = new Set(profile.enabledModules);
  for (const moduleId of profile.enabledModules) if (!byId.has(moduleId)) diagnostics.push(diagnostic("UNKNOWN_ENABLED_MODULE", profile.consumer, "profile.json", "enabledModules", moduleId));
  for (const root of profile.roots) {
    if (!byId.has(root)) diagnostics.push(diagnostic("UNKNOWN_ROOT", profile.consumer, "profile.json", "roots", root));
    else if (!enabled.has(root)) diagnostics.push(diagnostic("DISABLED_ROOT", profile.consumer, "profile.json", "roots", root, [byId.get(root)!.declarationPath]));
  }
  const expectedBindings = new Set<string>();
  for (const moduleId of profile.enabledModules) {
    const item = byId.get(moduleId);
    if (item === undefined) continue;
    for (const kind of ["required", "optional", "many"] as const) for (const slot of item.declaration.dependencies[kind]) expectedBindings.add(`${moduleId}.${slot.slot}`);
  }
  for (const key of Object.keys(profile.bindings).sort(binaryCompare)) if (!expectedBindings.has(key)) diagnostics.push(diagnostic("UNKNOWN_BINDING", profile.consumer, "profile.json", `bindings.${key}`));

  const argumentsByModule = new Map<string, SyntheticFactoryArgument>();
  const edges = new Map<string, string[]>();
  for (const moduleId of [...profile.enabledModules].sort(binaryCompare)) {
    const item = byId.get(moduleId);
    if (item === undefined) continue;
    const dependencies: Record<string, string | readonly string[] | null> = {};
    for (const kind of ["required", "optional", "many"] as const) {
      for (const slot of [...item.declaration.dependencies[kind]].sort((a, b) => binaryCompare(a.slot, b.slot))) {
        const key = `${moduleId}.${slot.slot}`;
        const binding = profile.bindings[key];
        const fieldPath = `bindings.${key}`;
        if (kind === "required" && typeof binding !== "string") {
          diagnostics.push(diagnostic("MISSING_REQUIRED", profile.consumer, "profile.json", fieldPath, moduleId, [item.declarationPath]));
          continue;
        }
        if (kind === "optional" && binding === undefined) {
          diagnostics.push(diagnostic("OPTIONAL_NOT_EXPLICIT", profile.consumer, "profile.json", fieldPath, moduleId, [item.declarationPath]));
          continue;
        }
        if (kind === "optional" && binding !== null && typeof binding !== "string") {
          diagnostics.push(diagnostic("OPTIONAL_NOT_SINGLE", profile.consumer, "profile.json", fieldPath, moduleId, [item.declarationPath]));
          continue;
        }
        if (kind === "many" && !Array.isArray(binding)) {
          diagnostics.push(diagnostic("MANY_NOT_ORDERED", profile.consumer, "profile.json", fieldPath, moduleId, [item.declarationPath]));
          continue;
        }
        const selected = Array.isArray(binding) ? binding : binding === null || binding === undefined ? [] : [binding];
        if (kind === "many" && new Set(selected).size !== selected.length) diagnostics.push(diagnostic("DUPLICATE_MANY_PROVIDER", profile.consumer, "profile.json", fieldPath, moduleId));
        for (const providerId of selected) {
          const provider = byId.get(providerId);
          if (provider === undefined) diagnostics.push(diagnostic("UNKNOWN_BOUND_MODULE", profile.consumer, "profile.json", fieldPath, moduleId));
          else if (!enabled.has(providerId)) diagnostics.push(diagnostic(kind === "required" ? "DISABLED_REQUIRED" : kind === "optional" ? "DISABLED_OPTIONAL" : "DISABLED_MANY", profile.consumer, "profile.json", fieldPath, moduleId, [provider.declarationPath]));
          else if (!provider.declaration.provides.includes(slot.capability)) {
            const sameFamily = provider.declaration.provides.some(capability => capabilityFamily(capability) === capabilityFamily(slot.capability));
            diagnostics.push(diagnostic(sameFamily ? "INCOMPATIBLE_CAPABILITY_VERSION" : "CAPABILITY_MISMATCH", profile.consumer, "profile.json", fieldPath, moduleId, [provider.declarationPath]));
          } else {
            const targets = edges.get(moduleId) ?? [];
            targets.push(providerId);
            edges.set(moduleId, targets);
          }
        }
        dependencies[slot.slot] = kind === "many" ? [...selected] : binding ?? null;
      }
    }
    argumentsByModule.set(moduleId, immutable({ moduleId, loaderKey: item.declaration.loaderKey, dependencies }));
  }
  diagnostics.push(...cycleDiagnostics(edges, byId, profile.consumer));

  const expectedLoaders = new Set([...argumentsByModule.values()].map(item => item.loaderKey));
  for (const loader of profile.selectedLoaders) if (!expectedLoaders.has(loader)) diagnostics.push(diagnostic("UNKNOWN_LOADER", profile.consumer, "profile.json", "selectedLoaders"));
  if (new Set(profile.selectedLoaders).size !== expectedLoaders.size || [...expectedLoaders].some(key => !profile.selectedLoaders.includes(key))) {
    diagnostics.push(diagnostic("LOADER_KEY_BIJECTION", profile.consumer, "profile.json", "selectedLoaders"));
  }
  const sorted = sortDiagnostics(diagnostics);
  if (sorted.length > 0) return { diagnostics: sorted };
  return immutable({
    diagnostics: sorted,
    plan: {
      consumer: profile.consumer,
      roots: [...profile.roots].sort(binaryCompare),
      factoryArguments: [...argumentsByModule.values()].sort((a, b) => binaryCompare(a.moduleId, b.moduleId)),
      selectedLoaders: [...profile.selectedLoaders].sort(binaryCompare),
    },
  });
}

export function requiredDisableImpact(
  declarations: readonly LocatedDeclaration[],
  profile: SyntheticCandidateProfile,
  disabledModuleId: string,
): readonly string[] {
  const disabled = new Set([disabledModuleId]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const { declaration } of declarations) {
      if (disabled.has(declaration.moduleId) || !profile.enabledModules.includes(declaration.moduleId)) continue;
      for (const slot of declaration.dependencies.required) {
        const bound = profile.bindings[`${declaration.moduleId}.${slot.slot}`];
        if (typeof bound === "string" && disabled.has(bound)) {
          disabled.add(declaration.moduleId);
          changed = true;
        }
      }
    }
  }
  return immutable([...disabled].sort(binaryCompare));
}
