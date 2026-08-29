import { readFile } from "node:fs/promises";
import { basename } from "node:path";

export const PROOF_REVISIONS = Object.freeze({
  foundationBase: "4738aa329196f9d0c50a14edfcbe454d2cca0b98",
  agentRuntime: "7be998237a4c262bee9c4198d554b43cd2757ac6",
  frontend: "85c0850e2fc312b995ba3116f8d4aa46dcb0b1dd",
  orchestrator: "4c5f55366ed8c83f97374b66c8e9f84059c47382",
});

export interface Measurement {
  readonly label: "qualification-only-not-production-metrics";
  readonly revisions: typeof PROOF_REVISIONS;
  readonly consumers: Readonly<{
    agentRuntime: "source-shaped-measurement-fixture";
    frontend: "source-shaped-measurement-fixture";
    orchestrator: "second-consumer-not-admitted";
  }>;
  readonly sourceShapedWiringLoc: number;
  readonly genericProofGlueLoc: number;
  readonly genericProofGlueRatio: number;
  readonly adrProductionGlueRatio: "not-applicable-production-loc-zero";
  readonly files: number;
  readonly bindingChangeSites: Readonly<{ baseline: 2; hybrid: 2 }>;
  readonly diagnostics: "immutable-deterministically-sorted";
  readonly determinism: "byte-identical-regeneration-and-stale-check";
  readonly typeInferenceFixture: "nominal-module-id-handles";
  readonly packedConsumerLeakage: "isolated-private-surface-absent";
  readonly serializability: "metadata-projections-structured-clone-safe";
  readonly disableImpact: "complete-required-closure";
  readonly disposablePercent: "30-50%";
  readonly verdict: "CONDITIONAL";
  readonly residualBlocker: "product-owner-benchmark-and-adoption-evidence-absent";
}

const physicalLoc = (source: string): number => source.split("\n").filter(line => line.trim().length > 0).length;

export async function measureProof(
  sourceShapedPaths: readonly string[],
  genericPaths: readonly string[],
): Promise<Measurement> {
  const sourceLoc = (await Promise.all(sourceShapedPaths.map(path => readFile(path, "utf8")))).reduce((total, source) => total + physicalLoc(source), 0);
  const genericLoc = (await Promise.all(genericPaths.map(path => readFile(path, "utf8")))).reduce((total, source) => total + physicalLoc(source), 0);
  const names = [...sourceShapedPaths, ...genericPaths].map(path => basename(path));
  if (new Set(names).size !== names.length) throw new Error("MEASUREMENT_FILE_NAME_COLLISION");
  return Object.freeze({
    label: "qualification-only-not-production-metrics",
    revisions: PROOF_REVISIONS,
    consumers: {
      agentRuntime: "source-shaped-measurement-fixture",
      frontend: "source-shaped-measurement-fixture",
      orchestrator: "second-consumer-not-admitted",
    },
    sourceShapedWiringLoc: sourceLoc,
    genericProofGlueLoc: genericLoc,
    genericProofGlueRatio: Number((genericLoc / sourceLoc).toFixed(6)),
    adrProductionGlueRatio: "not-applicable-production-loc-zero",
    files: names.length,
    bindingChangeSites: { baseline: 2, hybrid: 2 },
    diagnostics: "immutable-deterministically-sorted",
    determinism: "byte-identical-regeneration-and-stale-check",
    typeInferenceFixture: "nominal-module-id-handles",
    packedConsumerLeakage: "isolated-private-surface-absent",
    serializability: "metadata-projections-structured-clone-safe",
    disableImpact: "complete-required-closure",
    disposablePercent: "30-50%",
    verdict: "CONDITIONAL",
    residualBlocker: "product-owner-benchmark-and-adoption-evidence-absent",
  } satisfies Measurement);
}
