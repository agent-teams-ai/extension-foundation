/**
 * Qualification-only experiment, not an Extension Foundation public SPI or host.
 * Product authority supplies independently verified evidence and exact bindings.
 * This pure preflight performs no loading, installation, state changes or effects.
 */
export type ContributionKind = "tool" | "skill" | "ui" | "worker" | "state";

export interface CandidateContribution {
  readonly id: string;
  readonly kind: ContributionKind;
  readonly port: string;
  readonly permission: string;
  readonly schema?: { readonly lineage: string; readonly migrationDigest: string };
}
export interface CandidateBundle {
  readonly installationId: string;
  readonly artifactDigest: string;
  readonly scope: string;
  readonly contributions: readonly CandidateContribution[];
}
export interface HostAdmissionEvidence {
  /** Trusted product authority, never a field copied from the plugin manifest. */
  readonly scope: string;
  readonly installationId: string;
  readonly currentHeadRevision: number;
  readonly expectedHeadRevision: number;
  /** Verified artifact digest from a trusted resolver, not a manifest assertion. */
  readonly verifiedArtifactDigest: string | null;
  /** Explicit feature-owner binding: contribution identity -> selected port. */
  readonly boundPorts: Readonly<Record<string, string>>;
  /** Grants from product authorization and installed artifact consent. */
  readonly effectiveGrants: Readonly<Record<string, readonly string[]>>;
  /** Product-verified execution isolation for a specific worker/UI contribution. */
  readonly qualifiedPlacements: Readonly<Record<string, "isolated" | "trusted-ui">>;
  /** Separate tenant-owned custody approval; a state descriptor cannot grant it. */
  readonly custodyReceipts: Readonly<Record<string, { readonly lineage: string; readonly migrationDigest: string }>>;
}
export type Preflight =
  | { readonly ok: true; readonly selected: readonly CandidateContribution[] }
  | { readonly ok: false; readonly reason: string };

const kinds: ReadonlySet<string> = new Set<ContributionKind>(["tool", "skill", "ui", "worker", "state"]);
const idPattern = /^[a-z][a-z0-9]*(?:[._/-][a-z0-9]+)*$/u;

/** Reject a whole candidate, without partial activation, on the first failed invariant. */
export function preflightBundle(bundle: CandidateBundle, host: HostAdmissionEvidence): Preflight {
  if (bundle.scope !== host.scope) return { ok: false, reason: "wrong-authority-scope" };
  if (!Number.isSafeInteger(host.currentHeadRevision) || host.currentHeadRevision < 0 ||
      host.currentHeadRevision !== host.expectedHeadRevision) {
    return { ok: false, reason: "stale-active-head" };
  }
  if (!idPattern.test(bundle.installationId)) return { ok: false, reason: "invalid-installation-id" };
  if (bundle.installationId !== host.installationId) return { ok: false, reason: "wrong-installation" };
  if (!/^sha256:[a-f0-9]{64}$/u.test(bundle.artifactDigest) ||
      bundle.artifactDigest !== host.verifiedArtifactDigest) {
    return { ok: false, reason: "unverified-artifact" };
  }
  if (bundle.contributions.length === 0 || bundle.contributions.length > 64) {
    return { ok: false, reason: "invalid-contribution-count" };
  }
  const seen = new Set<string>();
  for (const c of bundle.contributions) {
    if (!c || !idPattern.test(c.id) || !idPattern.test(c.port) || !idPattern.test(c.permission) ||
        !kinds.has(c.kind)) return { ok: false, reason: "invalid-contribution" };
    if (seen.has(c.id)) return { ok: false, reason: "duplicate-contribution" };
    seen.add(c.id);
    if (host.boundPorts[c.id] !== c.kind + ":" + c.port) {
      return { ok: false, reason: "unbound-product-port" };
    }
    if (!host.effectiveGrants[c.id]?.includes(c.permission)) {
      return { ok: false, reason: "permission-not-granted" };
    }
    if (c.kind === "worker" && host.qualifiedPlacements[c.id] !== "isolated") {
      return { ok: false, reason: "worker-not-isolated" };
    }
    if (c.kind === "ui" && !["isolated", "trusted-ui"].includes(host.qualifiedPlacements[c.id] ?? "")) {
      return { ok: false, reason: "ui-placement-unqualified" };
    }
    if (c.kind === "state") {
      const approval = host.custodyReceipts[c.id];
      if (!c.schema || !idPattern.test(c.schema.lineage) ||
          !/^sha256:[a-f0-9]{64}$/u.test(c.schema.migrationDigest) ||
          !approval || approval.lineage !== c.schema.lineage ||
          approval.migrationDigest !== c.schema.migrationDigest) {
        return { ok: false, reason: "state-custody-not-authorized" };
      }
    } else if (c.schema !== undefined) {
      return { ok: false, reason: "unexpected-state-schema" };
    }
  }
  // Selection is not invocation permission and does not make the candidate active.
  const selected = bundle.contributions.map((c) => Object.freeze(
    c.schema ? { ...c, schema: Object.freeze({ ...c.schema }) } : { ...c },
  ));
  return { ok: true, selected: Object.freeze(selected) };
}
