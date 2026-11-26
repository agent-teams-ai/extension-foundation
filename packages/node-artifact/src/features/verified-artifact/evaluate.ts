import { Buffer } from "node:buffer";
import { randomUUID } from "node:crypto";
import {
  ArtifactError, type ArtifactBinding, type EvaluatedArtifact,
  type VerifiedArtifactFacts, type VerifiedNodeArtifact,
} from "./contracts.ts";

/** Internal capability: only the verifier supplies captured, verified source. */
export function createVerifiedArtifact(
  facts: VerifiedArtifactFacts, source: string, assets: ReadonlyMap<string, Uint8Array>,
): VerifiedNodeArtifact {
  return Object.freeze({
    facts,
    readAsset: (path: string): Uint8Array => {
      const value = assets.get(path);
      if (value === undefined) throw new ArtifactError("artifact.input", "Unknown inert asset");
      return Uint8Array.from(value);
    },
    evaluate: async <Value>(binding: ArtifactBinding<Value>): Promise<EvaluatedArtifact<Value>> => {
      // Snapshot the selected known ABI before calling any consumer callback.
      const { contract, revision, loader, authorize, validate } = binding;
      if (contract !== facts.contract || revision !== facts.revision || loader !== facts.loader
          || typeof authorize !== "function" || typeof validate !== "function") {
        throw new ArtifactError("artifact.binding", "The typed loader binding does not match the verified artifact");
      }
      const evaluationId = randomUUID();
      let authorized: boolean;
      try { authorized = authorize(facts); }
      catch { throw new ArtifactError("artifact.denied", "Current Host authority check did not complete"); }
      if (authorized !== true) throw new ArtifactError("artifact.denied", "Current Host authority refused evaluation");
      // The exact captured bytes are the request, with a fresh module-cache identity.
      // There is no filesystem re-open, dependency resolver or caller loader here.
      const value: unknown = await import(`data:text/javascript;base64,${Buffer.from(source, "utf8").toString("base64")}#${evaluationId}`);
      try {
        if (validate(value) !== true) throw new ArtifactError("artifact.exports", "Evaluated exports do not implement the trusted owner's contract");
        return Object.freeze({ value, evaluationId, facts });
      } catch { throw new ArtifactError("artifact.exports", "Evaluated exports did not pass the trusted owner's contract"); }
    },
  });
}
