import { isDeepStrictEqual } from "node:util";
import type { ImportExpression } from "oxc-parser";
import type { PackageCatalogEntry } from "./package-policy.mjs";

interface LayerBoundary {
  readonly id: string;
  readonly dependencyMode: "runtime";
  readonly roots: readonly string[];
  readonly entrypoints: readonly string[];
  readonly allow: {
    readonly boundaries: readonly string[];
    readonly packages: readonly string[];
    readonly builtins: readonly string[];
    readonly runtimeReferences: readonly string[];
  };
}

const artifactFeature = "package.extension.node-artifact.feature.verified-artifact";
const artifactSource = "packages/node-artifact/src/features/verified-artifact";

/** ADR-0016 admits these three internal layers, not arbitrary package exemptions. */
export function ownedPackageLayers(entry: PackageCatalogEntry, feature: string): readonly LayerBoundary[] {
  if (entry.id !== "extension.node-artifact" || entry.path !== "packages/node-artifact" ||
      entry.package_name !== "@extension-foundation/node-artifact" ||
      entry.role !== "integration-adapter" || entry.owner_document !== "ADR-0016" ||
      feature !== "verified-artifact") return [];
  const kernel = `${artifactFeature}.kernel`;
  const layer = (name: string, files: readonly string[], boundaries: readonly string[],
    builtins: readonly string[], runtimeReferences: readonly string[] = []): LayerBoundary => ({
    id: `${artifactFeature}.${name}`, dependencyMode: "runtime",
    roots: files.map(file => `${artifactSource}/${file}`),
    entrypoints: files.map(file => `${artifactSource}/${file}`),
    allow: { boundaries, packages: [], builtins, runtimeReferences },
  });
  return [
    layer("kernel", ["contracts.ts", "manifest.ts"], [], []),
    layer("io", ["native.ts", "staging.ts"], [kernel], ["node:child_process", "node:crypto", "node:fs", "node:fs/promises", "node:path"]),
    layer("evaluation", ["evaluate.ts"], [kernel], ["node:buffer", "node:crypto"], ["dynamic"]),
  ];
}

export function validateOwnedPackageLayers(entry: PackageCatalogEntry, feature: string,
  actualBoundaries: readonly unknown[]): readonly string[] {
  const errors: string[] = [];
  for (const expected of ownedPackageLayers(entry, feature)) {
    const actual = actualBoundaries.filter(value => typeof value === "object" && value !== null &&
      "id" in value && value.id === expected.id);
    if (actual.length !== 1 || !isDeepStrictEqual(actual.at(0), expected)) {
      errors.push(`${expected.id}: requires the exact ADR-0016 internal layer and dependency permissions`);
    }
  }
  return errors;
}

/** The shared analyzer requires disjoint source roots, even for internal layers. */
export function featureBoundaryRoots(entry: PackageCatalogEntry, feature: string): readonly string[] {
  const root = `${entry.path}/src/features/${feature}`;
  return ownedPackageLayers(entry, feature).length === 0 ? [root] : [`${root}/index.ts`, `${root}/verify.ts`];
}

export function hasOwnedNodeCompilerBase(entry: PackageCatalogEntry, input: unknown): boolean {
  return ownedPackageLayers(entry, "verified-artifact").length !== 0 && isDeepStrictEqual(input, {
    extends: "./tsconfig.json", compilerOptions: { types: ["node"] },
  });
}

/** Native unit controls stay with their package, outside portable test discovery. */
export function ownedPackageQualificationRoots(entry: PackageCatalogEntry): readonly string[] {
  return ownedPackageLayers(entry, "verified-artifact").length === 0 ? [] : [`${entry.path}/qualification`];
}

function literal(node: unknown, value: string): boolean {
  return typeof node === "object" && node !== null && "type" in node && node.type === "Literal" &&
    "value" in node && node.value === value;
}

function member(node: unknown, property: string): node is {
  readonly type: "MemberExpression"; readonly object: unknown;
} {
  return typeof node === "object" && node !== null && "type" in node && node.type === "MemberExpression" &&
    "computed" in node && node.computed === false && "optional" in node && node.optional === false &&
    "object" in node && "property" in node && typeof node.property === "object" && node.property !== null &&
    "type" in node.property && node.property.type === "Identifier" && "name" in node.property &&
    node.property.name === property;
}

function call(node: unknown): node is { readonly callee: unknown; readonly arguments: readonly unknown[] } {
  return typeof node === "object" && node !== null && "type" in node && node.type === "CallExpression" &&
    "optional" in node && node.optional === false && "callee" in node && "arguments" in node &&
    Array.isArray(node.arguments);
}

function identifier(node: unknown, name: string): boolean {
  return typeof node === "object" && node !== null && "type" in node && node.type === "Identifier" &&
    "name" in node && node.name === name;
}

/**
 * Model one explicit captured-data evaluation edge using the existing Oxc facts.
 * Signature, closure and current-authority semantics are exercised by the packed
 * qualification; this structural guard is not a hostile-code security boundary.
 */
export function permitsCapturedArtifactEvaluation(entry: PackageCatalogEntry, path: string,
  imports: readonly ImportExpression[]): boolean {
  if (ownedPackageLayers(entry, "verified-artifact").length === 0 ||
      path !== "src/features/verified-artifact/evaluate.ts" || imports.length !== 1) return false;
  const expression = imports.at(0);
  if (expression === undefined || expression.options !== null || expression.source.type !== "TemplateLiteral") return false;
  const { quasis, expressions } = expression.source;
  if (quasis.length !== 3 || expressions.length !== 2 ||
      quasis.at(0)?.value.cooked !== "data:text/javascript;base64," ||
      quasis.at(1)?.value.cooked !== "#" || quasis.at(2)?.value.cooked !== "" ||
      !identifier(expressions.at(1), "evaluationId")) return false;
  const encoding = expressions.at(0);
  if (!call(encoding) || encoding.arguments.length !== 1 || !literal(encoding.arguments.at(0), "base64") ||
      !member(encoding.callee, "toString")) return false;
  const capture = encoding.callee.object;
  return call(capture) && capture.arguments.length === 2 &&
    identifier(capture.arguments.at(0), "source") && literal(capture.arguments.at(1), "utf8") &&
    member(capture.callee, "from") && identifier(capture.callee.object, "Buffer");
}
