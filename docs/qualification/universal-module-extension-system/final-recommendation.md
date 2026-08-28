---
id: qualification.universal-module-extension-system.final-recommendation
type: qualification
status: qualified
owner: architecture
summary: Preserves the historical W11 product-local rehearsal recommendation; current productization qualification does not authorize it.
related:
  - ADR-0001
  - ADR-0010
  - ADR-0013
  - ADR-0014
  - OD-001
  - OD-002
  - OD-003
---

# Historical W11 Recommendation

## Former Recommendation

Start with one product-owned, trusted `T0` feature seam composed through static
imports and Pure DI. The feature exports a pure `FeatureModuleFactory`; the
application composition root chooses the implementation, configuration, and
lifetime and passes only explicit dependencies. Do not introduce a runtime
graph, global container, service locator, plugin loader, or Foundation package
for the first rehearsal.

```mermaid
flowchart LR
    Port["Feature-owned port"] --> Factory["Pure FeatureModuleFactory"]
    BuiltInA["Fixed built-in A"] --> Root["Application composition root"]
    BuiltInB["Fixed built-in B"] --> Root
    Config["Materialized selection and config"] --> Root
    Root --> Factory
    Factory --> UseCase["Owning product use case"]
    UseCase --> Authority["Product authorization, invariants and transaction"]
```

The factory is pure feature composition, not a runtime module definition. It
does not read an ambient container, discover implementations, own application
configuration, or decide process lifetime. The composition root may call the
factory more than once when the application explicitly needs distinct
instances, but lifetime remains an application decision rather than a product
identity or module-scope convention.

This was the W11 implementation recommendation and is now historical input to
the later [current productization roadmap](../module-system-v1-productization/current-roadmap.yaml).
The earlier graph-first roadmap remains useful qualification research: its DAG,
lifecycle, fencing, host, and packaging evidence constrains later work if a
real trigger appears. It is an earlier qualification input to the latest
non-authoritative recommendation,
not implementation authority, and does not authorize
a Foundation runtime.

## Boundaries That Apply Now

- Product-specific ports, models, authorization, state, invariants,
  transactions, result revalidation, and recovery remain with the owning
  product feature.
- A reusable library core does not depend on module or plugin runtime code.
- Selection is a closed literal, enum, or equally reviewable value materialized
  before execution. Registration order and ambient discovery are not semantics.
- Extension/provider work does not run inside a product Unit of Work. The
  owning use case revalidates the result before canonical mutation.
- Manifest permissions are requests, signatures are evidence rather than
  sandboxes, and graph validity is never authorization.
- `FeatureModuleFactory`, `ExtensionModuleDefinition`, and `PluginArtifact`
  describe different roles. The first rehearsal uses only the first role.
- No global registry, universal plugin interface, parent-container fallback,
  framework type in a product port, or service locator is introduced.

## Evidence Status

The qualification established useful but bounded evidence:

- The W11 corpus recommends only a product-local static trusted rehearsal.
  Its reported archive, manifest digest, counts, alias bindings, and integrity
  result are unproven because no committed semantic verifier binds them to
  committed bytes. The corpus supplies no promotion authority.
- Synthetic graph spikes demonstrated deterministic DAG compilation, invalid
  graph rejection, stable diagnostics, and 10,000-node chain stack safety with
  non-gating timing samples. They did not
  demonstrate that a real product needs a graph.
- Lifecycle spikes exposed bounded-waiting, cleanup, cancellation, fencing,
  and crash-recovery constraints. They do not qualify a production lifecycle
  coordinator or justify one for statically constructed `T0` built-ins.
- Cordis 4.0.1 reproduced selected trace shapes only. It did not prove complete
  lifecycle equivalence or delete enough owned code in a real consumer.
- Process, Worker, browser, Electron, Wasm, artifact, and packed-consumer spikes
  remain placement or harness evidence, not admitted production packages,
  public contracts, authenticated protocols, or hostile-code containment.

The exact source revisions and worker-result hashes remain in
[current state](current-state.md), the
[W11 executive report](nightly/01-executive-report.md), and the
[bounded claim ledger](nightly/claim-ledger.yaml). Neither this documentation
change nor its Git SHA is production qualification, package admission, or SPI
promotion.

## Implementation Roadmap

### Phase 0: Governance Alignment

Accept the cumulative ownership decision and the owning product's feature
decision before implementation. The product decision names the bounded context,
accountable owner, candidate capability, two fixed audited `T0` built-ins,
authority exclusions, explicit selection, success measures, deletion criteria,
and LOC accounting. It also states that runtime graph and lifecycle semantics
remain out of scope until Phase 2 triggers.

Keep OD-002, OD-003, and UMEQ choices open unless the phase actually reaches
their scope. Governance alignment does not admit a Foundation package or a new
product SPI.

Estimated change: 100-300 documentation and test-policy LOC, 1-3 working days.

### Phase 1: Product-Owned Two-Module Static Rehearsal

Implement one product feature with a private handwritten TypeScript port, two
fixed trusted built-ins, static imports, direct constructors or pure factories,
and one application composition root. The feature exports a pure
`FeatureModuleFactory`; the application root selects implementation,
configuration, and lifetime. Persist or otherwise materialize the closed
selection before execution, and test ownership navigation, configuration,
negative results, stale-result rejection, and authority revalidation.

This phase has no runtime graph, module descriptor grammar, global container,
service locator, plugin loading, artifact identity, dynamic discovery,
Foundation package, public SPI, generic lifecycle coordinator, or hot unload.
For update or recovery in this static rehearsal, reconstruct the smallest
application-owned authority realm; this does not project a universal restart or
physical-unload rule onto accepted UMEQ-016. Stop or simplify if the seam does
not improve the named product measure. ADR-0013 requires stop or rollback when
generic framework glue exceeds 30% of changed production code across the first
two slices, unless explicit safety evidence justifies the cost. The owning
decision must define the production-code numerator and denominator before the
measurement; generated, configuration, and test LOC are reported separately.

Exit evidence: both built-ins run through the same product-owned port; selection
is explicit and deterministic; no provider runs in a Unit of Work; product
authority tests pass; production, tests, configuration, documentation, and glue
LOC are reported separately.

Estimated change: 1,500-4,500 LOC including product tests, 1-3 weeks.

### Phase 2: Measure Need; Add A Private Product Graph Only If Triggered

Measure the rehearsal before designing runtime machinery. Continue direct
composition unless the product demonstrates at least one of these needs:

- the implementation set must change at runtime without a product rebuild and
  static selection cannot meet a named product outcome;
- multiple independently managed resource lifecycles need dependency-aware
  start, readiness, failure cleanup, or stop.

If no trigger is met, Phase 2 ends with the static design unchanged. If a
trigger is met, approve the product-local scope and build the smallest private
product graph that addresses the measured need. Keep descriptors, graph
semantics, diagnostics, and lifecycle policy in the owning product. Use explicit
bindings and closed dependency objects; expose no resolver or global container.
Compare against the static baseline and delete the graph if it fails the named
measure. Record framework glue separately using a predeclared counting method.

Estimated measurement: 100-300 LOC/instrumentation, 2-5 working days. Triggered
private graph prototype: 2,000-5,000 LOC including differential and failure
tests, 2-4 weeks.

### Phase 3: Second Real Consumer And Semantic Reconciliation

Seek a second real consumer only after its own product need exists. It must
author its expectations independently; copying the first consumer's code or
reusing a non-executable descriptor is not independent semantic evidence.
Reconcile identity, selection, configuration, lifetime, diagnostics, failure,
and ownership differences across the two consumers, and retain product-local
variants where the semantics do not actually coincide.

One-way imports bound the candidate movement but do not make extraction
automatic or purely mechanical. File movement is followed by reviewed semantic
reconciliation, API and schema versioning, compatibility policy, repository and
support ownership, release policy, and migration planning.

Estimated change: 1,500-4,500 product LOC plus conformance, 1-3 weeks for the
second slice; 1-2 weeks for reconciliation before any extraction proposal.

### Separate Gate: Foundation Extraction

Extraction requires a separate accepted decision naming the proven neutral
intersection, both real consumers, independent expectations, executable
cross-consumer conformance, owner repository, compatibility/version policy,
release policy, and migration obligations. Product ports, DTOs, authorization,
configuration, adapters, and consumer-specific lifecycle policy stay local.

Extraction is not publication. Internal Foundation admission remains closed
until its artifact-specific admission evidence and repository checks pass.

Estimated change after approval: 4,000-8,000 LOC including fixtures and
migrations, 2-4 weeks.

### Separate Gate: Publication

Every stable/public package requires the evidence selected by its accepted
ADR-0013 admission basis, independently authored implementation evidence where
that basis requires it, packed-artifact consumer tests, public API and
compatibility review, immutable package admission evidence, explicit SemVer and
support ownership, release-promotion verification, and an artifact-specific
publication decision. A package classified as `foundation-module-semantics`
additionally requires two real independently authored conforming consumers of
the exact publication candidate. Repository count, internal extraction, or one
shared implementation does not satisfy that stronger semantic gate. Extraction
and generic package-admission evidence do not substitute for its separate
two-consumer publication proof.

Estimated change: 6,000-11,000 incremental LOC and 3-8 weeks, plus ongoing
release and support cost.

### Later Gated Phases

| Capability | Earliest explicit trigger and gate | Estimate |
| --- | --- | --- |
| Process host | Named executable consumer, accepted production-host decision, UMEQ-009/012 closure, authenticated protocol, custody and termination, plus durable independently observable evidence from the named production host | 8,000-13,000 LOC, 4-8 weeks |
| Browser/Electron host | Separate Frontend ownership decision, independent loading value, capability broker, Web/Electron containment and compatibility, plus durable independently observable evidence from the named production host | 10,000-22,000 LOC, 6-12 weeks |
| Wasm/Extism host | Funded non-TypeScript or isolation need plus ABI, provenance, broker, quota, lifecycle, cross-platform containment qualification, and durable independently observable evidence from the named production host | Re-estimate after trigger |
| Plugin artifact distribution | Independent install/update value, admitted host, digest/signature/provenance policy, grants, custody, rollback and uninstall model | 10,000-18,000 LOC, 5-10 weeks |
| Catalog and managed channels | Independent distribution exists; one PostgreSQL canonical writer; explicit federation route; TUF from first remotely refreshed mutable metadata | Additional 3,500-11,000 LOC plus operations |
| Distributed or side-by-side lifecycle | Restart misses a numeric SLO; named topology proves fencing, state, capacity, cleanup, rollback, recovery and sink semantics | 10,000-35,000 LOC, multiple months |

These phases do not become inevitable because Phase 1 succeeds. A cross-product
plugin platform remains roughly 40,000-75,000 LOC before product-specific
behavior and requires multiple quarters plus continuing operations and support.

## Main Risks And Controls

| Risk | Control |
| --- | --- |
| Static feature factory becomes an ambient container | Pure factory inputs; application root owns selection/config/lifetime; source checks reject lookup APIs |
| Historical graph research is mistaken for an accepted roadmap | Keep this evidence historical and require an owning-product decision before execution |
| Foundation becomes a product shared kernel | Product-local first; separate extraction decision; no product models in Foundation |
| A graph is built because a spike exists | Require a measured Phase 2 trigger and comparison against the static baseline |
| Extraction is treated as file movement | Review semantic reconciliation, ownership, compatibility, versioning, migration, and release policy |
| Public API freezes before evidence | Separate extraction, admission, and publication gates |
| Plugin distribution is mistaken for runtime composition | Map contributions through product adapters to product ports; add runtime modules only for measured graph/lifecycle need |

## Historical Decision

The W11 recommendation proposed Phase 0 and a later product-local static Pure
DI rehearsal. It is preserved as historical evidence only. The later
[`current-roadmap.yaml`](../module-system-v1-productization/current-roadmap.yaml)
is a non-authoritative qualification projection that starts with measurement;
only an accepted owning-product decision can authorize execution. No package or
Git SHA is promoted by either qualification record.
