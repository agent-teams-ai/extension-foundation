import { readdir, readFile } from "node:fs/promises";
import { isAbsolute, relative, sep } from "node:path";

export const CONTEXT_REVISIONS = Object.freeze({
  foundationBase: "4738aa329196f9d0c50a14edfcbe454d2cca0b98",
  agentRuntime: "7be998237a4c262bee9c4198d554b43cd2757ac6",
  frontend: "85c0850e2fc312b995ba3116f8d4aa46dcb0b1dd",
  orchestrator: "4c5f55366ed8c83f97374b66c8e9f84059c47382",
});

export interface BindingProbe {
  readonly path: string;
  readonly token: string;
}

export interface MeasurementInput {
  readonly proofRoot: string;
  readonly admissionDocumentPath: string;
  readonly classifiedPaths: readonly ClassifiedProofPath[];
  readonly baselineBindingProbes: readonly BindingProbe[];
  readonly candidateBindingProbes: readonly BindingProbe[];
}

export interface ClassifiedProofPath {
  readonly path: string;
  readonly bucket:
    | "baseline"
    | "candidate-product"
    | "generic-proof"
    | "shared-fixture"
    | "measurement-harness"
    | "support-type";
}

export interface Measurement {
  readonly label: "qualification-only-synthetic-measurement";
  readonly contextualSourceLocks: typeof CONTEXT_REVISIONS;
  readonly consumers: Readonly<{
    agentRuntime: "consumer-named-synthetic-fixture";
    frontend: "consumer-named-synthetic-fixture";
    orchestrator: "governed-admission-read-separately";
  }>;
  readonly baselineWiringLoc: number;
  readonly candidateProductLoc: number;
  readonly genericProofGlueLoc: number;
  readonly candidateWithGenericLoc: number;
  readonly genericProofGlueRatio: number;
  readonly adrProductionGlueRatio: "not-applicable-production-loc-zero";
  readonly fileCounts: Readonly<{ baseline: number; candidateProduct: number; genericProof: number }>;
  readonly syntacticBindingMarkerSites: Readonly<{ baseline: number; candidate: number }>;
  readonly syntacticBindingMarkerFiles: Readonly<{ baseline: number; candidate: number }>;
  readonly disposableExecutablePercent: number;
  readonly governedAdmission: Readonly<{
    agentRuntimeL1: "NO-GO-MEASUREMENT-CANDIDATE";
    frontendL1: "NO-GO-MEASUREMENT-CANDIDATE";
    sharedL5: "NO-GO";
  }>;
  readonly verdict: "NO-GO";
  readonly l1NoGoReasons: readonly string[];
  readonly l1ReconsiderWhen: "owning-product-benchmark-exists";
  readonly l5NoGoReasons: readonly string[];
  readonly l5ReconsiderWhen: "second-real-consumer-and-executable-conformance-exist";
  readonly syntheticNegativeSignals: readonly string[];
  readonly maintenanceDisposition: "delete-executable-proof-before-merge";
}

const physicalLoc = (source: string): number => source.split("\n").filter(line => line.trim().length > 0).length;

async function uniqueSources(paths: readonly string[]): Promise<ReadonlyMap<string, string>> {
  if (new Set(paths).size !== paths.length) throw new Error("MEASUREMENT_DUPLICATE_PATH");
  return new Map(await Promise.all(paths.map(async path => [path, await readFile(path, "utf8")] as const)));
}

const portableRelative = (root: string, path: string): string => relative(root, path).split(sep).join("/");
const contained = (root: string, path: string): boolean => {
  const child = relative(root, path);
  return child !== "" && child !== ".." && !child.startsWith(`..${sep}`) && !isAbsolute(child);
};

async function proofFiles(root: string, current = root): Promise<readonly string[]> {
  const files: string[] = [];
  for (const entry of await readdir(current, { withFileTypes: true })) {
    const path = `${current}${sep}${entry.name}`;
    if (entry.isDirectory()) files.push(...await proofFiles(root, path));
    else if (entry.isFile()) files.push(portableRelative(root, path));
    else throw new Error(`MEASUREMENT_UNSUPPORTED_PATH:${portableRelative(root, path)}`);
  }
  return files.sort();
}

async function assertExhaustiveClassification(root: string, classifiedPaths: readonly ClassifiedProofPath[]): Promise<void> {
  const expected = classifiedPaths.filter(item => contained(root, item.path)).map(item => portableRelative(root, item.path)).sort();
  const actual = await proofFiles(root);
  if (JSON.stringify(expected) !== JSON.stringify(actual)) {
    throw new Error(`MEASUREMENT_PATH_CLASSIFICATION_MISMATCH:${JSON.stringify({ actual, expected })}`);
  }
}

async function governedAdmission(path: string): Promise<Measurement["governedAdmission"]> {
  const document = await readFile(path, "utf8");
  const rows = document.split(/\r?\n/u);
  const agentRuntime = rows.find(line => line.startsWith("| Agent Runtime |"));
  const frontend = rows.find(line => line.startsWith("| Frontend |"));
  const exactL1 = (row: string | undefined, revision: string): boolean =>
    row?.includes(`\`${revision}\``) === true && row.includes("`L1_NO_GO_MEASUREMENT_CANDIDATE`");
  if (!exactL1(agentRuntime, CONTEXT_REVISIONS.agentRuntime)
    || !exactL1(frontend, CONTEXT_REVISIONS.frontend)
    || !document.includes("Shared extraction, a runtime package, and public SPI remain closed.")) {
    throw new Error("MEASUREMENT_GOVERNED_ADMISSION_MISSING");
  }
  return Object.freeze({
    agentRuntimeL1: "NO-GO-MEASUREMENT-CANDIDATE",
    frontendL1: "NO-GO-MEASUREMENT-CANDIDATE",
    sharedL5: "NO-GO",
  });
}

function countBindingProbes(sources: ReadonlyMap<string, string>, probes: readonly BindingProbe[]): Readonly<{ sites: number; files: number }> {
  const files = new Set<string>();
  let sites = 0;
  for (const probe of probes) {
    const source = sources.get(probe.path);
    if (source === undefined) throw new Error(`MEASUREMENT_PROBE_OUTSIDE_INVENTORY:${probe.path}`);
    const occurrences = source.split(probe.token).length - 1;
    if (occurrences !== 1) throw new Error(`MEASUREMENT_PROBE_NOT_UNIQUE:${probe.path}`);
    sites += occurrences;
    files.add(probe.path);
  }
  return Object.freeze({ sites, files: files.size });
}

export async function measureProof(input: MeasurementInput): Promise<Measurement> {
  if (new Set(input.classifiedPaths.map(item => item.path)).size !== input.classifiedPaths.length) {
    throw new Error("MEASUREMENT_DUPLICATE_PATH");
  }
  await assertExhaustiveClassification(input.proofRoot, input.classifiedPaths);
  const allPaths = input.classifiedPaths.map(item => item.path);
  const sources = await uniqueSources(allPaths);
  const paths = (bucket: ClassifiedProofPath["bucket"]): readonly string[] =>
    input.classifiedPaths.filter(item => item.bucket === bucket).map(item => item.path);
  const baselinePaths = paths("baseline");
  const candidateProductPaths = paths("candidate-product");
  const genericProofPaths = paths("generic-proof");
  const loc = (paths: readonly string[]): number => paths.reduce((total, path) => total + physicalLoc(sources.get(path)!), 0);
  const baselineWiringLoc = loc(baselinePaths);
  const candidateProductLoc = loc(candidateProductPaths);
  const genericProofGlueLoc = loc(genericProofPaths);
  const baselineBindings = countBindingProbes(sources, input.baselineBindingProbes);
  const candidateBindings = countBindingProbes(sources, input.candidateBindingProbes);
  const ratio = Number((genericProofGlueLoc / candidateProductLoc).toFixed(6));
  const admission = await governedAdmission(input.admissionDocumentPath);
  const executablePaths = input.classifiedPaths.filter(item => /\.(?:[cm]?[jt]s)$/u.test(item.path) && !item.path.endsWith(".d.mts"));
  const qualificationRoot = `${input.proofRoot}${sep}..`;
  const disposableExecutablePercent = Math.round(100 * executablePaths.filter(item => contained(qualificationRoot, item.path)).length / executablePaths.length);
  const syntheticNegativeSignals = [
    ratio > 0.3 ? "synthetic-generic-proof-glue-ratio-above-0.3" : undefined,
    candidateBindings.files >= baselineBindings.files ? "candidate-does-not-reduce-binding-change-files" : undefined,
  ].filter((reason): reason is string => reason !== undefined);

  return Object.freeze({
    label: "qualification-only-synthetic-measurement",
    contextualSourceLocks: CONTEXT_REVISIONS,
    consumers: {
      agentRuntime: "consumer-named-synthetic-fixture",
      frontend: "consumer-named-synthetic-fixture",
      orchestrator: "governed-admission-read-separately",
    },
    baselineWiringLoc,
    candidateProductLoc,
    genericProofGlueLoc,
    candidateWithGenericLoc: candidateProductLoc + genericProofGlueLoc,
    genericProofGlueRatio: ratio,
    adrProductionGlueRatio: "not-applicable-production-loc-zero",
    fileCounts: {
      baseline: baselinePaths.length,
      candidateProduct: candidateProductPaths.length,
      genericProof: genericProofPaths.length,
    },
    syntacticBindingMarkerSites: { baseline: baselineBindings.sites, candidate: candidateBindings.sites },
    syntacticBindingMarkerFiles: { baseline: baselineBindings.files, candidate: candidateBindings.files },
    disposableExecutablePercent,
    governedAdmission: admission,
    verdict: "NO-GO",
    l1NoGoReasons: Object.freeze(["canonical-consumer-admission-l1-no-go"]),
    l1ReconsiderWhen: "owning-product-benchmark-exists",
    l5NoGoReasons: Object.freeze(["canonical-consumer-admission-l5-no-go"]),
    l5ReconsiderWhen: "second-real-consumer-and-executable-conformance-exist",
    syntheticNegativeSignals: Object.freeze(syntheticNegativeSignals),
    maintenanceDisposition: "delete-executable-proof-before-merge",
  } as const satisfies Measurement);
}
