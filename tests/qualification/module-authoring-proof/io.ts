import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

import {
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

export async function discoverDeclarations(
  consumer: string,
  roots: readonly string[],
  limits: Readonly<{ maxRoots: number; maxCandidates: number }> = { maxRoots: 4, maxCandidates: 32 },
): Promise<DiscoveryResult> {
  if (roots.length > limits.maxRoots) throw new Error("DISCOVERY_ROOT_LIMIT");
  const declarations: LocatedDeclaration[] = [];
  const diagnostics: Diagnostic[] = [];
  const reads: string[] = [];
  for (const root of roots) {
    const entries = (await readdir(root, { withFileTypes: true }))
      .filter(entry => entry.isDirectory())
      .sort((left, right) => left.name.localeCompare(right.name));
    if (entries.length + declarations.length > limits.maxCandidates) throw new Error("DISCOVERY_CANDIDATE_LIMIT");
    for (const entry of entries) {
      const declarationPath = join(root, entry.name, DECLARATION_NAME);
      let source: string;
      try {
        source = await readFile(declarationPath, "utf8");
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") continue;
        throw error;
      }
      const displayPath = `${entry.name}/${DECLARATION_NAME}`;
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
    return `{${Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, child]) => `${JSON.stringify(key)}:${stable(child)}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

const handleName = (moduleId: string): string => moduleId.split(/[.-]/u).map(part => `${part[0]?.toUpperCase() ?? ""}${part.slice(1)}`).join("");

export function generatedOutputs(declarations: readonly LocatedDeclaration[]): Readonly<Record<string, string>> {
  const ordered = [...declarations].sort((left, right) => left.declaration.moduleId.localeCompare(right.declaration.moduleId));
  const inventory = ordered.map(({ declaration, declarationPath }) => ({
    consumer: declaration.consumer,
    declarationPath,
    loaderKey: declaration.loaderKey,
    moduleId: declaration.moduleId,
    provides: [...declaration.provides].sort(),
  }));
  const handles = [
    "// Generated qualification projection. Disposable; do not edit.",
    "declare const moduleIdBrand: unique symbol;",
    "export type ModuleId<Value extends string> = Value & { readonly [moduleIdBrand]: true };",
    ...ordered.map(({ declaration }) => `export const ${handleName(declaration.moduleId)} = ${JSON.stringify(declaration.moduleId)} as ModuleId<${JSON.stringify(declaration.moduleId)}>;`),
    "",
  ].join("\n");
  return Object.freeze({
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
  return Object.freeze(stale.sort());
}

export async function writeDeclaration(root: string, directory: string, declaration: ModuleDeclaration | unknown): Promise<void> {
  await writeFile(join(root, directory, DECLARATION_NAME), `${JSON.stringify(declaration, null, 2)}\n`, "utf8");
}
