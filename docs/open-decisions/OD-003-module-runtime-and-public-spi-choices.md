---
id: OD-003
type: open-decision
status: open
owner: architecture
summary: Tracks unresolved extension host, public SPI, invocation protocol, and extension-state migration choices without reopening Get Modular composition ownership.
related:
  - ADR-0001
  - ADR-0011
  - ADR-0013
  - ADR-0014
  - ADR-0015
---

# OD-003: Extension Host, Public SPI, And State Migration Choices

## Decision Required

Choose any production extension host or runtime adapter, public extension SPI,
invocation protocol, and extension-state migration semantics only after
product-local static composition supplies the retained triggers and evidence
from ADR-0013 as preserved by ADR-0015.

This open decision does not select or redefine neutral module identities,
declarations, dependency cardinalities, bindings, graph compilation, canonical
plans, or plan digests. Those semantics belong to the independent
[`get-modular`](https://github.com/agent-teams-ai/get-modular) repository and
its own decisions. OD-003 therefore does not block Get Modular `0.x` work that
passes Get Modular's local production gates.

The already approved guardrails are resolved by
[ADR-0014](../decisions/0014-product-local-module-authoring-composition-and-generation-guardrails.md).
They are not open alternatives here. This open decision cannot authorize a
Foundation package, production graph runtime, or public SPI by implication.

## Fixed Constraints

- ADR-0011's cumulative ownership, authority, identity, transaction,
  trust-tier, graph, lifecycle, and state safety floor remains fixed.
- ADR-0015 preserves ADR-0013's product-local feature, static Pure DI, and
  private-graph trigger rules while authorizing the independent Get Modular
  pre-1.0 composition repository.
- A public Extension Foundation SPI requires independently authored
  implementations, executable conformance, and a separate accepted publication
  decision. Get Modular adoption evidence alone does not authorize an extension
  SPI or production extension host.
- Product-specific SPIs remain in the consuming product. Foundation cannot
  import product domain or host-framework models.
- Public contracts cannot expose container, loader, configuration, graph
  library, or host-framework types.
- A built-in module is not a plugin artifact. Artifact installation,
  contribution authorization, graph activation, and runtime generation remain
  distinct.
- Every production host remains subject to the accepted production-host safety
  closure and its own authority and termination evidence.

## Owner-confirmed baseline, 2026-10-25

The owner selected **static composition with controlled restart** as the
baseline, with an **optional Temporal adapter for the same product-authorized
operation** where qualified infrastructure and durable coordination justify it.
The [validation record](../research/static-composition-and-controlled-restart-validation.md)
separates this confirmed direction, current PostgreSQL/Temporal authority,
executed scenarios and remaining production qualifications. This resolves the
baseline-versus-immediate-overlap question; it does not select a public SPI,
create a second Host authority, publish a package or qualify state migration.

## Owner decision brief, 2026-11-06

**Corrected research status: no new option adopted.** The deeper
[authority review, industry comparison and strict source diagnostic](../research/plugin-choice-deepening-2026-11-06.md)
withdraw the earlier contained-provider-first recommendation and the incomplete
seal/wait/defer wording. Accepted ADR bodies remain unchanged. The owner-confirmed
static composition/controlled restart baseline above remains in force.

### Already accepted provider direction

[Agent Runtime ADR-0091][current-ar91] already selects the interactive
Claude/session slice, a runtime-owned type-only driver SPI, external provider
implementation and product-owned composition. It freezes contained-turn and
forbids widening the ordinary Codex profile for that slice. It was present at
`f990acc26e1b8071ae22d0b87a2ddd3672be8e2e`, the same source cited by the earlier
brief. The omission was in that research, not a new upstream change.

Therefore the owner does not need to choose the old `1A / 1B / 1C` shortlist to
continue this already admitted provider work. This correction resolves the
provider-direction question; it does not decide all future no-fork capabilities,
publish an EF SPI or qualify a hostile-plugin ecosystem. Product-specific
contracts remain with their consuming product, not EF or GM.

The ADR-named experimental B donor is present at the same source pin. Its
factory shape, handoff literal, capability/checkpoint boundary and failed-open
cleanup still need alignment with the canonical runtime contract. This is known
source to adapt, not a ready production artifact. The remaining concrete
investigation establishes the external delivery revision, independent packing
and real owning-consumer evidence.
An accessible legacy Desktop provider PR is a different authority; its observed
type mismatch with current AR is exploratory reuse evidence, not a supported
integration failure. The accepted ADR's contracts-package contingency still
requires actual packing evidence and retains runtime contract ownership.

### Ordinary update timing remains a dependent product policy

Existing shutdown seals are irreversible and can fence delegated preparation of
already accepted work. They are not a demonstrated reversible fresh-admission
pause. Permanent sealing plus indefinite deferral can keep a service unavailable
indefinitely. The earlier `2A` wording and `P0 / I150–350` allowance must not be
used as a complete current implementation plan.

The smallest candidate is safe candidate preparation while current service
remains active, deferring before shutdown until the actual owner can atomically
establish genuine quiescence and stop admission. Updates can starve under
continuous load or open sessions. A bounded reversible pause is a separate,
more complex contract. Maintenance grace followed by existing authorized
cutoff/close is another policy, with explicit interruption consequences and
no unconditional completion deadline under unknown physical/effect closure.

Interactive sessions make the distinction material: idle turn does not mean
closed session; existing close rejects undispatched queued inputs, remains
irreversible and retains cleanup debt. Explicit restore does not undo effects
or restore old callback authority. Do not adopt automatic session continuity
from a checkpoint API. Emergency revocation, containment and accepted deadlines
retain their existing policy.

Retirement eligibility follows the selected owner's physical, authority,
compatibility and recovery obligations. Durable `reconcile_required` truth
must remain owned and cannot authorize replay; it is not automatically proof
of live old custody. Current ordinary Codex disposal illustrates that
distinction, while interactive sessions retain ADR-0091's own close, queue,
handoff and restore rules. No blanket cross-profile restart permission follows.
Durable pending-update recovery and atomic admission are still unqualified
prerequisites, not promises established by a finite receiver experiment.

The [deeper comparison](../research/plugin-choice-deepening-2026-11-06.md#ordinary-update-policies-after-the-correction)
keeps these alternatives and their missing owner capabilities explicit.
Maintenance choice need not block the admitted source-contract and packaging
investigation. Research does not automatically select a pause or cancellation
policy on the owner's behalf.

### Cost, evidence and current authority

The [retained reports](../research/evidence/plugin-deepening-20261106.tar.gz)
include independent plan/result criticism, exact source ledgers, the eleven-line
strict TypeScript 7.0.2 diagnostic, original outputs and scoped cost/rating
analysis. Its setup control passed; both cross-contract directions were rejected
semantically. No packed integration, Host/provider runtime or new update
experiment was executed in this follow-up.

Earlier source, estimates and recommendations remain available in the
[historical brief at its exact commit][historical-brief] and
[earlier investigator bundle](../research/evidence/plugin-decisions-20261106.tar.gz).
They are unselected historical hypotheses, not current delivery quotes. New
supplemental ranges apply only to expressly bounded local mechanics with
unestablished prerequisites; complete product/session-delivery cost is unknown.
Scores describe judgments about named guarantees, not measured availability.

The [recovery audits](../research/evidence/plugin-deepening-recovery-20261106.tar.gz)
also preserve the identified B donor, the operation/custody distinction and the
known systemd v258 reload-timeout counterexample with its subsequent fix.
They correct supporting evidence without selecting a new update policy.

Orchestrator main `a34587b313e656eeb43d755b4a4f08c40dff2116` contains accepted
[ADR-0116][current-o116] and [ADR-0117][current-o117]. PostgreSQL and full native
Temporal for Fully Local remain selected; deployment qualification and optional
Temporal use for a plugin rollout remain separate. No workflow-engine vote is
reopened. Public EF SPI, actual host trust/placement, state migration and any
residual shared mechanism remain under the open choices below.

[current-ar91]: https://github.com/agent-teams-ai/agent-runtime/blob/main/docs/decisions/0091-interactive-agent-session-synthetic-vertical-slice.md
[historical-brief]: https://github.com/agent-teams-ai/extension-foundation/blob/99a5b9157ee5dfdfeb2a14ed99d559fb0135fb7d/docs/open-decisions/OD-003-module-runtime-and-public-spi-choices.md
[current-o116]: https://github.com/agent-teams-ai/agent-teams-orchestrator/blob/main/docs/decisions/0116-native-temporal-for-fully-local-durable-workflows.md
[current-o117]: https://github.com/agent-teams-ai/agent-teams-orchestrator/blob/main/docs/decisions/0117-reconcile-mandatory-module-composition.md

## Open Choices

### Public Extension SPI And Compatibility

If independent consumers justify publication, decide the exact extension
manifest, contribution descriptor, host invocation contract, compatibility
grammar, unknown-field and deprecation rules, version negotiation, publication
surface, and conformance evidence. The public extension SPI exposes only
Extension Foundation identity and protocol vocabulary. A product-owned adapter
may translate admitted contributions into Get Modular declarations and plans,
but this decision cannot prescribe or redefine that adapter's Get Modular API.

ADR-0011's conditional minimum publication floor still applies after an owning
product admits the applicable production-host profile: a real product slice,
stable ownership, two independently authored conforming implementations,
compatibility fixtures, negative tests, and an executable conformance suite.
Get Modular adoption or promotion evidence does not satisfy this publication
floor.

### Private Extension Host Runtime Implementation

After an owning product records the required trigger decision, choose whether a
private extension host uses minimal native mechanics or a qualified private
adapter around a commodity container or resource-management library. Get
Modular may supply an already compiled composition plan, but neither Get
Modular nor the selected tool can own product readiness, routing,
authorization, fencing, durable recovery, state custody, or isolation. Reject
a candidate that requires a second overlapping lifecycle state machine.

The decision must define deterministic diagnostics, lifecycle traces, health
gates, handover order, bounded drain or cancellation, recovery, candidate
cleanup, and restart-required behavior. It must remain compatible with
ADR-0014's distinct plan-content, candidate-generation, and active-head
identities.

### Owner Discussion TODO: Shared Host Mechanics

TODO: discuss the shared implementation boundary with the product owner before
selecting the first cross-product Host mechanism. Keep this choice open while
the Agent Runtime Host architecture is being designed.

Product ownership of authorization and lifecycle does not require a separate
copy of every technical implementation. Evaluate common protocol validation,
request correlation, cancellation transport and conformance fixtures first.
Consider shared mechanical grant or lifecycle checks only when the same
invariant is demonstrated across materially different uses. Product permission
decisions, canonical state and operational authority retain their accepted
owners. One product-authorized operation may use neutral reusable driver code;
shared implementation is not a second authority. It must not create an
independently advancing second coordinator, duplicate authoritative kernel or
canonical records, or a global registry.

The discussion should choose the first real uses, the common contract and its
owner, per-instance state and dependency direction, platform-specific adapters,
failure guarantees, conformance evidence and bounded implementation estimate.
Distinguish a narrow reusable contract or test kit from a general Host runtime.
Do not treat this TODO as approval of a package, public SPI, transport, storage
engine or production runtime, or as a new blocker for existing static modules.

The **2026-10-22 research follow-up** narrows this discussion:

- Preserve the already accepted independent `@get-modular/lifecycle-kernel`
  candidate and its release gates. Do not move, rename or reimplement it as an
  incidental part of choosing a Host adapter.
- Subtract fitting commodity task/pool/RPC mechanisms first. The
  [reuse analysis](../research/reusable-generation-mechanisms-and-ownership.md)
  and [executed adapter experiment](../research/worker-adapter-replacement-experiment.md)
  distinguish actual closure observations from a generic success result.
- Design a demonstrated shared concern as a purpose-neutral ordinary library
  from its first real consumer plus external conformance delivery. Whether a
  residual mechanism warrants another package or independent repository remains
  open; a separate repository is not required for package independence.
- [Package admission](../architecture/overview.md#package-admission), stable
  public extension SPI publication and Orchestrator's production-adoption gate
  are separate claims with their own evidence. Do not demand the strongest gate
  for every ordinary-library experiment or treat weaker evidence as all gates.
- Evaluate [Temporal](../research/temporal-and-rollout-orchestration.md) as an
  optional scheduling adapter only for the admitted deployment, outside ordinary
  invocation. Selective [native implementation](../research/critical-components-and-language-boundaries.md)
  must improve a named boundary and retain its existing owner.

For an additional capability or a shared Host mechanism beyond the already
admitted AR ADR-0091 provider slice, the owner must identify its real uses and
availability, trust, deployment and replacement-lifetime promise. This does not
reopen that accepted interactive direction. The bounded trusted request cohort
remains a separate candidate; it does not qualify arbitrary streams, UI sessions,
exclusive resources, hostile plugins or state migration. Research does not
resolve this broader open decision.

### Production Hosts And Invocation Protocols

Decide trusted in-process resource adapters separately from isolated Worker,
process, WASM, Electron, and browser-realm hosts. For every admitted placement,
define framing, schema limits, authentication, negotiation, backpressure,
idempotency, timeouts, cancellation, terminal receipts, and stale-generation
fencing. No transport or host provides a universal security or physical-unload
claim.

Cross-target placement and distributed cutover remain product deployment
choices. An atomic active-head decision does not imply simultaneous observation
by every router or effect store.

### State Migration And Custody

Define plugin-private state compatibility, checkpoint, migration, rollback,
export, retention, deletion, and recovery protocols. Every operation remains
subject to the independent state-custody authorization and exact attachment
identity required by ADR-0011. Product migrations and canonical product state
do not move into Foundation.

## Required Evidence

The maintained [plugin research reference](../research/plugin-system-research-reference.md)
collects industry evidence and counterexamples. The
[hot-reload proposal](../research/hot-reload-and-generation-replacement.md)
defines a bounded candidate qualification target, failure matrix, alternatives
and estimated scope. The [independent review record](../research/plugin-research-review-and-decision-record.md)
records corrections and preserves consumer adoption provenance. These are
research inputs to this open decision, not a resolving decision or authority to
implement a production Host. Exclusive resources, state migration and emergency
revocation require their own explicit guarantees.

A resolving decision must name the exact product trigger, owner, implementation
or public surface, applicable host placements, compatibility and migration
rules, negative cases, immutable evidence, and conformance results. Runtime,
host, public-SPI, and state-migration choices may be resolved separately; none
silently grants another.
