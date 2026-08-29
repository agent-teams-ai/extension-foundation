import { lstat, open, opendir, readFile, realpath, writeFile } from "node:fs/promises";
import { join } from "node:path";

import {
  binaryCompare,
  DECLARATION_NAME,
  type Diagnostic,
  type LocatedDeclaration,
  type ModuleDeclaration,
  sortDiagnostics,
  validateDeclaration,
} from "./model.ts";

export interface DiscoveryResult {
  readonly declarations: readonly LocatedDeclaration[];
  readonly diagnostics: readonly Diagnostic[];
  readonly reads: readonly string[];
}

async function boundedDirectories(root: string, remaining: number): Promise<readonly string[]> {
  const directories: string[] = [];
  const handle = await opendir(root);
  for await (const entry of handle) {
    if (!entry.isDirectory()) continue;
    if (directories.length >= remaining) throw new Error("DISCOVERY_CANDIDATE_LIMIT");
    directories.push(entry.name);
  }
  return Object.freeze(directories.sort(binaryCompare));
}

async function readBoundedDeclaration(path: string, displayPath: string, maxBytes: number): Promise<string | undefined> {
  let pathStats;
  try {
    pathStats = await lstat(path);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw error;
  }
  if (!pathStats.isFile() || pathStats.isSymbolicLink()) throw new Error(`DISCOVERY_DECLARATION_NOT_REGULAR:${displayPath}`);

  const handle = await open(path, "r");
  try {
    const openedStats = await handle.stat();
    if (!openedStats.isFile()) throw new Error(`DISCOVERY_DECLARATION_NOT_REGULAR:${displayPath}`);
    if (openedStats.size > maxBytes) throw new Error(`DISCOVERY_DECLARATION_BYTE_LIMIT:${displayPath}`);
    const buffer = Buffer.alloc(maxBytes + 1);
    const { bytesRead } = await handle.read(buffer, 0, buffer.byteLength, 0);
    if (bytesRead > maxBytes) throw new Error(`DISCOVERY_DECLARATION_BYTE_LIMIT:${displayPath}`);
    return buffer.subarray(0, bytesRead).toString("utf8");
  } finally {
    await handle.close();
  }
}

export async function discoverDeclarations(
  consumer: string,
  roots: readonly string[],
  limits: Readonly<{ maxRoots: number; maxCandidates: number; maxDeclarationBytes?: number }> = {
    maxRoots: 4,
    maxCandidates: 32,
    maxDeclarationBytes: 16_384,
  },
): Promise<DiscoveryResult> {
  if (!Number.isSafeInteger(limits.maxRoots) || limits.maxRoots < 1 ||
    !Number.isSafeInteger(limits.maxCandidates) || limits.maxCandidates < 1 ||
    !Number.isSafeInteger(limits.maxDeclarationBytes ?? 16_384) || (limits.maxDeclarationBytes ?? 16_384) < 1) {
    throw new Error("DISCOVERY_INVALID_LIMIT");
  }
  if (roots.length > limits.maxRoots) throw new Error("DISCOVERY_ROOT_LIMIT");
  if (new Set(roots).size !== roots.length) throw new Error("DISCOVERY_DUPLICATE_ROOT");
  const canonicalRoots = await Promise.all(roots.map(async root => ({ input: root, canonical: await realpath(root) })));
  canonicalRoots.sort((left, right) => binaryCompare(left.canonical, right.canonical));
  if (new Set(canonicalRoots.map(root => root.canonical)).size !== canonicalRoots.length) throw new Error("DISCOVERY_DUPLICATE_ROOT");
  const declarations: LocatedDeclaration[] = [];
  const diagnostics: Diagnostic[] = [];
  const reads: string[] = [];
  let candidates = 0;
  for (const [rootIndex, root] of canonicalRoots.entries()) {
    const entries = await boundedDirectories(root.canonical, limits.maxCandidates - candidates);
    candidates += entries.length;
    for (const entry of entries) {
      const declarationPath = join(root.canonical, entry, DECLARATION_NAME);
      const displayPath = canonicalRoots.length === 1
        ? `${entry}/${DECLARATION_NAME}`
        : `root-${String(rootIndex + 1).padStart(4, "0")}/${entry}/${DECLARATION_NAME}`;
      const source = await readBoundedDeclaration(declarationPath, displayPath, limits.maxDeclarationBytes ?? 16_384);
      if (source === undefined) continue;
      reads.push(displayPath);
      let raw: unknown;
      try {
        raw = JSON.parse(source);
      } catch {
        raw = undefined;
      }
      const validated = validateDeclaration(raw, displayPath, consumer);
      diagnostics.push(...validated.diagnostics);
      if (validated.declaration !== undefined) declarations.push({ declaration: validated.declaration, declarationPath: displayPath });
    }
  }
  return Object.freeze({
    declarations: Object.freeze(declarations),
    diagnostics: sortDiagnostics(diagnostics),
    reads: Object.freeze(reads),
  });
}

function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (typeof value === "object" && value !== null) {
    return `{${Object.entries(value).sort(([a], [b]) => binaryCompare(a, b)).map(([key, child]) => `${JSON.stringify(key)}:${stable(child)}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

const handleName = (moduleId: string): string => moduleId.split(/[.-]/u).map(part => `${part[0]?.toUpperCase() ?? ""}${part.slice(1)}`).join("");

export function generatedOutputs(declarations: readonly LocatedDeclaration[]): Readonly<Record<string, string>> {
  const ordered = [...declarations].sort((left, right) => binaryCompare(left.declaration.moduleId, right.declaration.moduleId));
  const handlesByName = new Map<string, string>();
  for (const { declaration } of ordered) {
    const handle = handleName(declaration.moduleId);
    const prior = handlesByName.get(handle);
    if (prior !== undefined) throw new Error(`GENERATED_HANDLE_COLLISION:${handle}:${[prior, declaration.moduleId].sort(binaryCompare).join(",")}`);
    handlesByName.set(handle, declaration.moduleId);
  }
  const inventory = ordered.map(({ declaration, declarationPath }) => ({
    consumer: declaration.consumer,
    declarationPath,
    loaderKey: declaration.loaderKey,
    moduleId: declaration.moduleId,
    provides: [...declaration.provides].sort(binaryCompare),
  }));
  const handles = [
    "// Generated qualification projection. Disposable; do not edit.",
    "declare const moduleIdBrand: unique symbol;",
    "export type ModuleId<Value extends string> = Value & { readonly [moduleIdBrand]: true };",
    ...ordered.map(({ declaration }) => `export const ${handleName(declaration.moduleId)} = ${JSON.stringify(declaration.moduleId)} as ModuleId<${JSON.stringify(declaration.moduleId)}>;`),
    "",
  ].join("\n");
  const runtimeHandles = [
    "// Generated qualification projection. Disposable; do not edit.",
    ...ordered.map(({ declaration }) => `export const ${handleName(declaration.moduleId)} = ${JSON.stringify(declaration.moduleId)};`),
    "",
  ].join("\n");
  return Object.freeze({
    "module-handles.js": runtimeHandles,
    "module-handles.ts": handles,
    "module-inventory.json": `${stable(inventory)}\n`,
  });
}

export async function emitGenerated(outputDir: string, declarations: readonly LocatedDeclaration[]): Promise<Readonly<Record<string, string>>> {
  const outputs = generatedOutputs(declarations);
  await Promise.all(Object.entries(outputs).map(([name, source]) => writeFile(join(outputDir, name), source, "utf8")));
  return outputs;
}

export async function staleGenerated(outputDir: string, declarations: readonly LocatedDeclaration[]): Promise<readonly string[]> {
  const outputs = generatedOutputs(declarations);
  const stale: string[] = [];
  for (const [name, expected] of Object.entries(outputs)) {
    try {
      if (await readFile(join(outputDir, name), "utf8") !== expected) stale.push(name);
    } catch {
      stale.push(name);
    }
  }
  return Object.freeze(stale.sort(binaryCompare));
}

export async function writeDeclaration(root: string, directory: string, declaration: ModuleDeclaration | unknown): Promise<void> {
  await writeFile(join(root, directory, DECLARATION_NAME), `${JSON.stringify(declaration, null, 2)}\n`, "utf8");
}
