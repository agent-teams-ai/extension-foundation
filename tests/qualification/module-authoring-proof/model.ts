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
  readonly contribution?: Readonly<{ kind: "recent-project-source" }>;
}

export interface LocatedDeclaration {
  readonly declaration: ModuleDeclaration;
  readonly declarationPath: string;
}

export interface StaticProfile {
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

export interface StaticFactoryArgument {
  readonly moduleId: string;
  readonly loaderKey: string;
  readonly dependencies: Readonly<Record<string, string | readonly string[] | null>>;
}

export interface StaticPlan {
  readonly consumer: Consumer;
  readonly roots: readonly string[];
  readonly factoryArguments: readonly StaticFactoryArgument[];
  readonly selectedLoaders: readonly string[];
}

export interface Compilation {
  readonly diagnostics: readonly Diagnostic[];
  readonly plan?: StaticPlan;
}

const ID = /^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)*$/u;
const SLOT = /^[a-z][A-Za-z0-9]*$/u;

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

function diagnostic(
  code: string,
  consumer: string,
  declarationPath: string,
  fieldPath: string,
  moduleId?: string,
  relatedPaths: readonly string[] = [],
): Diagnostic {
  const result: Diagnostic = {
    code,
    consumer,
    declarationPath,
    fieldPath,
    ...(moduleId === undefined ? {} : { moduleId }),
    relatedPaths: [...relatedPaths].sort(),
  };
  return immutable(result);
}

const diagnosticKey = (item: Diagnostic): string =>
  [
    item.code,
    item.consumer,
    item.declarationPath,
    item.fieldPath,
    item.moduleId ?? "",
    item.relatedPaths.join("\u0000"),
  ].join("\u0001");

export function sortDiagnostics(items: readonly Diagnostic[]): readonly Diagnostic[] {
  return immutable([...items].sort((left, right) => diagnosticKey(left).localeCompare(diagnosticKey(right))));
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
    if (!isRecord(item) || typeof item.slot !== "string" || !SLOT.test(item.slot) ||
      typeof item.capability !== "string" || !ID.test(item.capability)) {
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
  if (!isRecord(raw)) {
    return { diagnostics: sortDiagnostics([diagnostic("DECLARATION_SHAPE", consumerHint, declarationPath, "$")]) };
  }
  const consumer = raw.consumer === "agent-runtime" || raw.consumer === "frontend" ? raw.consumer : consumerHint;
  const moduleId = typeof raw.moduleId === "string" && ID.test(raw.moduleId) ? raw.moduleId : undefined;
  if (raw.schemaVersion !== 1) diagnostics.push(diagnostic("DECLARATION_FIELD", consumer, declarationPath, "schemaVersion", moduleId));
  if (raw.consumer !== "agent-runtime" && raw.consumer !== "frontend") diagnostics.push(diagnostic("DECLARATION_FIELD", consumer, declarationPath, "consumer", moduleId));
  if (moduleId === undefined) diagnostics.push(diagnostic("DECLARATION_FIELD", consumer, declarationPath, "moduleId"));
  if (typeof raw.loaderKey !== "string" || !ID.test(raw.loaderKey)) diagnostics.push(diagnostic("DECLARATION_FIELD", consumer, declarationPath, "loaderKey", moduleId));
  const provides = Array.isArray(raw.provides) && raw.provides.every(value => typeof value === "string" && ID.test(value))
    ? [...raw.provides] as string[]
    : [];
  if (!Array.isArray(raw.provides) || provides.length !== raw.provides.length) diagnostics.push(diagnostic("DECLARATION_FIELD", consumer, declarationPath, "provides", moduleId));
  const dependencies = isRecord(raw.dependencies) ? raw.dependencies : {};
  if (!isRecord(raw.dependencies)) diagnostics.push(diagnostic("DECLARATION_FIELD", consumer, declarationPath, "dependencies", moduleId));
  const required = parseSlots(dependencies.required, "required", consumer, declarationPath, moduleId, diagnostics);
  const optional = parseSlots(dependencies.optional, "optional", consumer, declarationPath, moduleId, diagnostics);
  const many = parseSlots(dependencies.many, "many", consumer, declarationPath, moduleId, diagnostics);
  const slotNames = [...required, ...optional, ...many].map(slot => slot.slot);
  if (new Set(slotNames).size !== slotNames.length) diagnostics.push(diagnostic("DUPLICATE_SLOT", consumer, declarationPath, "dependencies", moduleId));
  let contribution: ModuleDeclaration["contribution"];
  if (raw.contribution !== undefined) {
    if (!isRecord(raw.contribution) || raw.contribution.kind !== "recent-project-source") {
      diagnostics.push(diagnostic("DECLARATION_FIELD", consumer, declarationPath, "contribution", moduleId));
    } else contribution = { kind: "recent-project-source" };
  }
  if (diagnostics.length > 0 || moduleId === undefined || typeof raw.loaderKey !== "string") {
    return { diagnostics: sortDiagnostics(diagnostics) };
  }
  const declaration: ModuleDeclaration = {
    schemaVersion: 1,
    consumer: consumer as Consumer,
    moduleId,
    loaderKey: raw.loaderKey,
    provides,
    dependencies: { required, optional, many },
    ...(contribution === undefined ? {} : { contribution }),
  };
  return { declaration: immutable(declaration), diagnostics: sortDiagnostics([]) };
}

function providersByCapability(declarations: readonly LocatedDeclaration[]): Map<string, string[]> {
  const result = new Map<string, string[]>();
  for (const { declaration } of declarations) {
    for (const capability of declaration.provides) {
      const providers = result.get(capability) ?? [];
      providers.push(declaration.moduleId);
      result.set(capability, providers);
    }
  }
  return result;
}

export function compileStaticProfile(
  declarations: readonly LocatedDeclaration[],
  profile: StaticProfile,
): Compilation {
  const diagnostics: Diagnostic[] = [];
  const byId = new Map<string, LocatedDeclaration>();
  for (const item of [...declarations].sort((a, b) => a.declarationPath.localeCompare(b.declarationPath))) {
    const prior = byId.get(item.declaration.moduleId);
    if (prior !== undefined) {
      diagnostics.push(diagnostic("DUPLICATE_MODULE", profile.consumer, item.declarationPath, "moduleId", item.declaration.moduleId, [prior.declarationPath]));
    } else byId.set(item.declaration.moduleId, item);
  }
  const enabled = new Set(profile.enabledModules);
  for (const root of profile.roots) {
    if (!enabled.has(root)) diagnostics.push(diagnostic("DISABLED_ROOT", profile.consumer, byId.get(root)?.declarationPath ?? "profile.json", "roots", root));
  }
  const capabilityProviders = providersByCapability(declarations);
  const argumentsByModule = new Map<string, StaticFactoryArgument>();
  for (const moduleId of profile.enabledModules) {
    const item = byId.get(moduleId);
    if (item === undefined || item.declaration.consumer !== profile.consumer) continue;
    const dependencies: Record<string, string | readonly string[] | null> = {};
    for (const kind of ["required", "optional", "many"] as const) {
      for (const slot of item.declaration.dependencies[kind]) {
        const binding = profile.bindings[`${moduleId}.${slot.slot}`];
        const fieldPath = `bindings.${moduleId}.${slot.slot}`;
        if (kind === "required" && typeof binding !== "string") {
          diagnostics.push(diagnostic("MISSING_REQUIRED", profile.consumer, "profile.json", fieldPath, moduleId, [item.declarationPath]));
          continue;
        }
        if (kind === "optional" && binding === undefined) {
          diagnostics.push(diagnostic("OPTIONAL_NOT_EXPLICIT", profile.consumer, "profile.json", fieldPath, moduleId, [item.declarationPath]));
          continue;
        }
        if (kind === "many" && !Array.isArray(binding)) {
          diagnostics.push(diagnostic("MANY_NOT_ORDERED", profile.consumer, "profile.json", fieldPath, moduleId, [item.declarationPath]));
          continue;
        }
        const selected = Array.isArray(binding) ? binding : binding === null || binding === undefined ? [] : [binding];
        for (const providerId of selected) {
          const provider = byId.get(providerId);
          if (!enabled.has(providerId)) {
            diagnostics.push(diagnostic(kind === "required" ? "DISABLED_REQUIRED" : kind === "optional" ? "DISABLED_OPTIONAL" : "DISABLED_MANY", profile.consumer, "profile.json", fieldPath, moduleId, provider === undefined ? [] : [provider.declarationPath]));
          } else if (!provider?.declaration.provides.includes(slot.capability)) {
            diagnostics.push(diagnostic("CAPABILITY_MISMATCH", profile.consumer, "profile.json", fieldPath, moduleId, provider === undefined ? [] : [provider.declarationPath]));
          }
        }
        dependencies[slot.slot] = kind === "many" ? [...selected] : binding ?? null;
        if ((capabilityProviders.get(slot.capability) ?? []).length === 0 && kind === "required") {
          diagnostics.push(diagnostic("NO_CAPABILITY_PROVIDER", profile.consumer, item.declarationPath, `dependencies.${kind}.${slot.slot}`, moduleId));
        }
      }
    }
    argumentsByModule.set(moduleId, {
      moduleId,
      loaderKey: item.declaration.loaderKey,
      dependencies: immutable(dependencies),
    });
  }
  const selectedLoaderSet = new Set(profile.selectedLoaders);
  const expectedLoaderSet = new Set([...argumentsByModule.values()].map(item => item.loaderKey));
  if (selectedLoaderSet.size !== profile.selectedLoaders.length ||
    selectedLoaderSet.size !== expectedLoaderSet.size ||
    [...selectedLoaderSet].some(key => !expectedLoaderSet.has(key))) {
    diagnostics.push(diagnostic("LOADER_KEY_BIJECTION", profile.consumer, "profile.json", "selectedLoaders"));
  }
  const sorted = sortDiagnostics(diagnostics);
  if (sorted.length > 0) return { diagnostics: sorted };
  return immutable({
    diagnostics: sorted,
    plan: {
      consumer: profile.consumer,
      roots: [...profile.roots],
      factoryArguments: profile.enabledModules.flatMap(id => {
        const argument = argumentsByModule.get(id);
        return argument === undefined ? [] : [argument];
      }),
      selectedLoaders: [...profile.selectedLoaders],
    },
  });
}

export function requiredDisableImpact(
  declarations: readonly LocatedDeclaration[],
  profile: StaticProfile,
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
  return immutable([...disabled].sort());
}
