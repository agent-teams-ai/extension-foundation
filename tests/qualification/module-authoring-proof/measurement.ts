import { readFile } from "node:fs/promises";

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
  readonly baselinePaths: readonly string[];
  readonly candidateProductPaths: readonly string[];
  readonly genericProofPaths: readonly string[];
  readonly baselineBindingProbes: readonly BindingProbe[];
  readonly candidateBindingProbes: readonly BindingProbe[];
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
  readonly bindingChangeSites: Readonly<{ baseline: number; candidate: number }>;
  readonly bindingChangeFiles: Readonly<{ baseline: number; candidate: number }>;
  readonly disposableExecutablePercent: 100;
  readonly verdict: "NO-GO";
  readonly reasons: readonly string[];
  readonly reconsiderWhen: "owning-product-benchmark-and-second-real-consumer-exist";
}

const physicalLoc = (source: string): number => source.split("\n").filter(line => line.trim().length > 0).length;

async function uniqueSources(paths: readonly string[]): Promise<ReadonlyMap<string, string>> {
  if (new Set(paths).size !== paths.length) throw new Error("MEASUREMENT_DUPLICATE_PATH");
  return new Map(await Promise.all(paths.map(async path => [path, await readFile(path, "utf8")] as const)));
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
  const allPaths = [...input.baselinePaths, ...input.candidateProductPaths, ...input.genericProofPaths];
  const sources = await uniqueSources(allPaths);
  const loc = (paths: readonly string[]): number => paths.reduce((total, path) => total + physicalLoc(sources.get(path)!), 0);
  const baselineWiringLoc = loc(input.baselinePaths);
  const candidateProductLoc = loc(input.candidateProductPaths);
  const genericProofGlueLoc = loc(input.genericProofPaths);
  const baselineBindings = countBindingProbes(sources, input.baselineBindingProbes);
  const candidateBindings = countBindingProbes(sources, input.candidateBindingProbes);
  const ratio = Number((genericProofGlueLoc / candidateProductLoc).toFixed(6));
  const reasons = [
    ratio > 0.3 ? "generic-proof-glue-exceeds-adr-0013-threshold" : undefined,
    candidateBindings.files >= baselineBindings.files ? "candidate-does-not-reduce-binding-change-files" : undefined,
    "no-owning-product-benchmark",
    "no-second-real-consumer",
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
      baseline: input.baselinePaths.length,
      candidateProduct: input.candidateProductPaths.length,
      genericProof: input.genericProofPaths.length,
    },
    bindingChangeSites: { baseline: baselineBindings.sites, candidate: candidateBindings.sites },
    bindingChangeFiles: { baseline: baselineBindings.files, candidate: candidateBindings.files },
    disposableExecutablePercent: 100,
    verdict: "NO-GO",
    reasons: Object.freeze(reasons),
    reconsiderWhen: "owning-product-benchmark-and-second-real-consumer-exist",
  } as const satisfies Measurement);
}
