---
id: qualification.universal-module-extension-system.nightly.principles-matrix
type: qualification
status: qualified
owner: architecture
summary: Maps retained W11 principles to the first rehearsal and later reversal gates.
related:
  - ADR-0001
  - ADR-0012
  - ADR-0013
---

# Principles Matrix

| Principle | NOW rule | Why it survives W11 | Reversal gate |
| --- | --- | --- | --- |
| Product authority stays local | Product owns state, policy, transaction, and result validation | An extension seam cannot replace product invariants | Accepted ownership decision and conformance for any extracted neutral contract |
| Static imports and Pure DI | Direct constructors or factories at one composition root | Minimum reversible seam; no ambient lookup or framework leakage | Measured runtime selection or independent lifecycle need |
| Explicit selection | Persist a closed choice before execution | Prevents registration-order and activation-time drift | Closed-profile unique inference may propose, but must materialize, the binding |
| Private runtime graph | Do not build one for the rehearsal | No authorized or demonstrated graph need | Real trigger plus accepted ownership path and bounded diagnostics |
| Restart-first | Restart the smallest authority realm | Cleanup, cancellation, and termination are distinct and incompletely proved | Numeric interruption SLO plus coexistence, fencing, state, rollback, and capacity proof |
| Bounded waiting is not cleanup | Report `termination_unproven` or cleanup debt honestly | A deadline can expire while work or cleanup continues | Terminal, joinable stop and external termination receipts |
| No global atomicity | Name L0, D1, D2, or T1 per deployment | Route visibility cannot atomically fence every effect sink | One real transaction authority, or explicit sink-local fences and admission gates |
| Codec is not security | Serialization supplies no authentication or replay protection | Receiver authority and channel identity remain separate | Authenticated bootstrap, nonces, replay policy, and receiver-side checks |
| Pinning is not freshness | Manual exact-digest import makes no currentness claim | A remote pin or revocation record can be replayed | TUF semantics from first remotely managed mutable metadata |
| Role identities stay distinct | Library, DesignModule, SourceModule, RuntimeComponent, Contribution, PluginArtifact, and DeploymentUnit are not aliases | They have different ownership, lifecycle, and distribution meaning | No reversal; adapters may map them without collapsing semantics |
| Extract after proof | First-consumer semantics stay product-local | Reuse is observed, not predicted | Second independent consumer plus neutral intersection and black-box conformance |
| Public SPI is a separate gate | No public package promise now | Two consumers do not prove independent implementation or compatibility | Two independently authored implementations, release evidence, governance, and support |
| Worker counts are not votes | Weight evidence, not report count | Shared prompts, model, sources, and aliases correlate findings | Independent publisher and reproduction evidence per claim |

This matrix is non-operative. [ADR-0012](../../../decisions/0012-reusable-library-module-and-plugin-boundaries.md)
remains effective, while
[ADR-0013](../../../decisions/0013-first-consumer-module-semantics-before-foundation-extraction.md)
remains proposed. Return to the [executive report](01-executive-report.md).
