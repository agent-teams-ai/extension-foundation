import { constants, type Stats } from "node:fs";
import { lstat, mkdtemp, open, opendir, readFile, realpath, rename, rm, writeFile } from "node:fs/promises";
import { basename, dirname, join } from "node:path";

import { parseStrictJson } from "../../../architecture/checks/strict-json.mjs";

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

export interface DiscoveryRoot {
  readonly rootId: string;
  readonly path: string;
}

async function boundedDirectories(root: string, remaining: number): Promise<Readonly<{ directories: readonly string[]; entriesSeen: number }>> {
  const directories: string[] = [];
  let entriesSeen = 0;
  const handle = await opendir(root);
  for await (const entry of handle) {
    if (entriesSeen >= remaining) throw new Error("DISCOVERY_ENTRY_LIMIT");
    entriesSeen += 1;
    if (!entry.isDirectory()) continue;
    directories.push(entry.name);
  }
  return Object.freeze({ directories: Object.freeze(directories.sort(binaryCompare)), entriesSeen });
}

const sameFile = (left: Stats, right: Stats): boolean => left.dev === right.dev && left.ino === right.ino;

async function readBoundedDeclaration(root: string, directory: string, displayPath: string, maxBytes: number): Promise<string | undefined> {
  const parentPath = join(root, directory);
  const path = join(parentPath, DECLARATION_NAME);
  const parentStats = await lstat(parentPath);
  if (!parentStats.isDirectory() || parentStats.isSymbolicLink() || await realpath(parentPath) !== parentPath) {
    throw new Error(`DISCOVERY_CANDIDATE_NOT_REGULAR:${displayPath}`);
  }
  let pathStats;
  try {
    pathStats = await lstat(path);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw error;
  }
  if (!pathStats.isFile() || pathStats.isSymbolicLink()) throw new Error(`DISCOVERY_DECLARATION_NOT_REGULAR:${displayPath}`);

  const flags = constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0) | (constants.O_NONBLOCK ?? 0);
  let handle;
  try {
    handle = await open(path, flags);
  } catch (error) {
    if (["ELOOP", "EFTYPE", "ENXIO"].includes((error as NodeJS.ErrnoException).code ?? "")) {
      throw new Error(`DISCOVERY_DECLARATION_NOT_REGULAR:${displayPath}`);
    }
    throw error;
  }
  try {
    const openedStats = await handle.stat();
    const openedPath = await realpath(path);
    const openedPathStats = await lstat(openedPath);
    if (!openedStats.isFile() || !sameFile(pathStats, openedStats)
      || openedPath !== path || openedPathStats.isSymbolicLink()
      || !openedPathStats.isFile() || !sameFile(openedStats, openedPathStats)) {
      throw new Error(`DISCOVERY_DECLARATION_CHANGED:${displayPath}`);
    }
    if (openedStats.size > maxBytes) throw new Error(`DISCOVERY_DECLARATION_BYTE_LIMIT:${displayPath}`);
    const chunks: Buffer[] = [];
    let totalBytes = 0;
    while (totalBytes <= maxBytes) {
      const chunk = Buffer.allocUnsafe(Math.min(64 * 1024, maxBytes + 1 - totalBytes));
      const { bytesRead } = await handle.read(chunk, 0, chunk.length, totalBytes);
      if (bytesRead === 0) break;
      chunks.push(chunk.subarray(0, bytesRead));
      totalBytes += bytesRead;
    }
    if (totalBytes > maxBytes) throw new Error(`DISCOVERY_DECLARATION_BYTE_LIMIT:${displayPath}`);
    const finalStats = await handle.stat();
    const finalPath = await realpath(path);
    const finalPathStats = await lstat(finalPath);
    if (!sameFile(openedStats, finalStats) || openedStats.size !== finalStats.size
      || openedStats.mtimeMs !== finalStats.mtimeMs || openedStats.ctimeMs !== finalStats.ctimeMs
      || finalPath !== openedPath || !sameFile(finalStats, finalPathStats)) {
      throw new Error(`DISCOVERY_DECLARATION_CHANGED:${displayPath}`);
    }
    return Buffer.concat(chunks, totalBytes).toString("utf8");
  } finally {
    await handle.close();
  }
}

export async function discoverDeclarations(
  consumer: string,
  roots: readonly (string | DiscoveryRoot)[],
  limits: Readonly<{ maxRoots: number; maxEntries: number; maxDeclarationBytes?: number }> = {
    maxRoots: 4,
    maxEntries: 32,
    maxDeclarationBytes: 16_384,
  },
): Promise<DiscoveryResult> {
  if (!Number.isSafeInteger(limits.maxRoots) || limits.maxRoots < 1 ||
    !Number.isSafeInteger(limits.maxEntries) || limits.maxEntries < 1 ||
    !Number.isSafeInteger(limits.maxDeclarationBytes ?? 16_384) || (limits.maxDeclarationBytes ?? 16_384) < 1) {
    throw new Error("DISCOVERY_INVALID_LIMIT");
  }
  if (roots.length > limits.maxRoots) throw new Error("DISCOVERY_ROOT_LIMIT");
  const normalizedRoots = roots.map(root => typeof root === "string"
    ? { rootId: undefined, path: root }
    : { rootId: root.rootId, path: root.path });
  const canonicalRoots = await Promise.all(normalizedRoots.map(async root => ({
    canonical: await realpath(root.path),
    rootId: root.rootId,
  })));
  if (new Set(canonicalRoots.map(root => root.canonical)).size !== canonicalRoots.length) throw new Error("DISCOVERY_DUPLICATE_ROOT");
  if (canonicalRoots.length > 1 && canonicalRoots.some(root => root.rootId === undefined)) {
    throw new Error("DISCOVERY_ROOT_ID_REQUIRED");
  }
  for (const root of canonicalRoots) {
    if (root.rootId !== undefined && !/^[a-z][a-z0-9-]{0,63}$/u.test(root.rootId)) {
      throw new Error(`DISCOVERY_ROOT_ID_INVALID:${root.rootId}`);
    }
  }
  const rootIds = canonicalRoots.flatMap(root => root.rootId === undefined ? [] : [root.rootId]);
  if (new Set(rootIds).size !== rootIds.length) throw new Error("DISCOVERY_DUPLICATE_ROOT_ID");
  canonicalRoots.sort((left, right) => binaryCompare(left.rootId ?? "", right.rootId ?? ""));
  const declarations: LocatedDeclaration[] = [];
  const diagnostics: Diagnostic[] = [];
  const reads: string[] = [];
  let entriesSeen = 0;
  for (const root of canonicalRoots) {
    const entries = await boundedDirectories(root.canonical, limits.maxEntries - entriesSeen);
    entriesSeen += entries.entriesSeen;
    for (const entry of entries.directories) {
      const displayPath = canonicalRoots.length === 1
        ? `${entry}/${DECLARATION_NAME}`
        : `${root.rootId}/${entry}/${DECLARATION_NAME}`;
      const source = await readBoundedDeclaration(root.canonical, entry, displayPath, limits.maxDeclarationBytes ?? 16_384);
      if (source === undefined) continue;
      reads.push(displayPath);
      let raw: unknown;
      try {
        raw = parseStrictJson(source);
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
  const parent = dirname(outputDir);
  const stem = basename(outputDir);
  const staging = await mkdtemp(join(parent, `.${stem}.staging-`));
  const backup = await mkdtemp(join(parent, `.${stem}.backup-`));
  await rm(backup, { recursive: true, force: true });
  let previousMoved = false;
  try {
    await Promise.all(Object.entries(outputs).map(([name, source]) => writeFile(join(staging, name), source, { encoding: "utf8", flag: "wx" })));
    try {
      await rename(outputDir, backup);
      previousMoved = true;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
    await rename(staging, outputDir);
  } catch (error) {
    await rm(staging, { recursive: true, force: true });
    if (previousMoved) {
      await rm(outputDir, { recursive: true, force: true });
      await rename(backup, outputDir);
    }
    throw error;
  }
  if (previousMoved) {
    try {
      await rm(backup, { recursive: true, force: true });
    } catch {
      // The new generation is already committed; a stale backup is safer than rollback to partial data.
    }
  }
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
