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

**Status: proposed options awaiting the owner's choice.** This section records
research and independent criticism; it accepts no alternative, changes no ADR,
authorizes no production Host or public SPI, and makes no release claim.
The confirmed baseline above remains in force.

Freshly checked sources are EF draft PR55 at
`33c50b92b005b6e3da56cc1905aad51ce68352e1`, GM main at
`5fb83478dd7b95216be92c4d3077eddf2774eef8`, Orchestrator main at
`a34587b313e656eeb43d755b4a4f08c40dff2116`, and Agent Runtime main at
`f990acc26e1b8071ae22d0b87a2ddd3672be8e2e`. Maintained navigation follows
[Orchestrator ADR-0116][current-o116] and [ADR-0117][current-o117].
ADR-0116 is now on merged main: full native Temporal with PostgreSQL is selected
for Fully Local. The engine choice is closed; deployment qualification and the
optional use of Temporal for a particular plugin rollout remain separate.

Three GPT-6.1 Sol xhigh investigators independently checked authority, product
value and mechanism estimates, then cross-reviewed the same shortlist. Their
[reports and dispositions](../research/evidence/plugin-decisions-20261106.tar.gz)
and [member manifest](../research/evidence/plugin-decisions-20261106.json)
retain the reasoning and rejected alternatives. No new experiment or production
implementation was performed for this decision brief.

### Estimation and rating scope

Production means new or changed handwritten contract/adapter behavior;
integration means owning-product composition and operation wiring; tests means
focused conformance, package, integration and rejecting fixtures. The three
columns do not overlap. Existing or mechanically moved source, generated vendor
schemas, documentation and upstream dependencies are not new implementation.
Ranges are planning hypotheses, potentially changing by a factor of two after
the exact user variation and missing owners are specified.

Reliability rates the achievable named guarantee after qualification, not
measured availability. Confidence rates this recommendation and sizing evidence.
Complexity includes implementation and operational burden; 10 is harder.
Scores are out of 10. Different capability scopes are not a reliability ranking.

**These are customization increments, not complete production-release quotes.**
Missing baseline execution, transport, custody, real deployment-owner work,
native delivery and release qualification must be estimated separately. A missing
prerequisite cannot be hidden in these ranges. The code inventory and retained
critics explain each exclusion.

### Choice 1: the first useful customization journey

| Option | Concrete outcome | Production LOC | Integration LOC | Tests LOC | Reliability | Confidence | Complexity |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 1A: trusted variation of one existing Agent Runtime provider family | A real contained-turn consumer selects an independently delivered adapter for one owner-requested behavior at startup, without editing application/kernel/custody code | 900–1,800 | 450–900 | 1,400–2,800 | 8 | 6 | 5 |
| 1B: one owner-named new Agent Runtime provider | The same owned operation supports a genuinely needed new provider with truthful capabilities and exact execution evidence | 2,000–5,000 | 900–1,800 | 3,000–6,000 | 7 | 5 | 7 |
| 1C: protected local Host discovery | A real connector selects a supported discovery-source implementation and completes the owning authenticated handshake | 700–1,500 | 500–1,100 | 1,200–2,500 | 8 | 6 | 5 |

**Conditional recommendation: 1A** if there is a useful requested variation within
the existing provider family. The owner must name that behavior; independently
packaging identical code or adding a wrapper with identical results is boundary
evidence, not the no-fork user outcome. Choose 1B when a named missing provider
prevents actual work. Choose 1C when deployment/bootstrap customization is the
present priority; it is protected infrastructure rather than an ordinary
community plugin.

Agent Runtime already has a private
[provider execution port][ar-port] and concrete
[product composition][ar-composition]. It does not already expose a generic user
plugin SPI. Selection is currently the exact `codex | claude` union with
owner-created dependencies. A curated product-owned adapter contract and its
explicit admission decision are required; no private deep imports, arbitrary
factory injection or plugin-supplied custody, security, state or receipt owner
is permitted. Product-specific contracts belong to Agent Runtime, not EF or GM.

The [current qualification registry][ar-registry] identifies the Linux Codex
route as **implementation-only**. It explicitly records no installed kernel
route, live provider turn, real Docker container/network, rendered credential
or provider-origin contact, and missing production owners for identity,
resolution and evidence broker sessions. It cannot be treated as a qualified
deployment. Claude is separately refused with
`claude-broker-seam-absent`; adding a registry row would not supply that boundary.
The [feature's cancellation and output limitations][ar-feature] also remain.

For 1A, reuse the owned operation, Provider Access, security and execution-custody
boundaries; expose only the genuinely substitutable part of the provider
adapter. The estimate includes a curated contract/translation, explicit startup
selection, exact compatibility rejection and a second independently authored,
behavior-bearing adapter exercised by the real consumer. The inspected Codex
directory has 29 TypeScript files and 292,831 source bytes including generated
schema; moving those bytes is not 900 new lines. Exact protocol/binary changes
require their applicable qualification and cannot inherit it by assertion.

1B includes the seam work in 1A; do not add both rows. Its conditional range
assumes the chosen protocol supports bounded turns and observable cancellation
and completion through existing owned infrastructure. A missing broker,
incompatible sandbox, new credential route, resume/session semantics or native
enforcement lies outside it. A complete delivery estimate is unavailable until
the provider and those requirements are named.

1C reuses the real `HostDiscoverySource` contract, but the existing
[packed consumer experiment](../research/packed-extension-consumer-e2e-2026-11-05.md)
has no operational connector/handshake integration. The range excludes the
unimplemented Local Supervisor/connector prerequisites and complete native
deployment. A discovery candidate is not an authenticated, ready Host.

### Choice 2: ordinary update policy before Host disposal

This dependent product choice applies to a selected provider slice. It concerns
when an update may start disposal, not how disposal works. Emergency security
revocation, failure containment and accepted owner deadlines retain their
existing policy; ordinary-update preference cannot postpone them.

| Option | User-visible promise | Production LOC | Integration LOC | Tests LOC | Reliability | Confidence | Complexity |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 2A: wait and defer | Seal new work in the affected scope, let accepted bounded turns finish naturally, and keep the update pending if their disposition remains unresolved | 0 | 150–350 | 500–1,100 | 8 | 7 | 4 |
| 2B: grace then authorized cancellation | Seal new work, allow the chosen grace, request the existing authorized cancellation/cutoff, and await exact closure or reconciliation before restart | 0 | 250–550 | 800–1,600 | 8 | 6 | 5 |

**Conditional recommendation: 2A for ordinary updates.** It avoids interrupting
accepted user work merely to install an update. 2B is appropriate if the owner
explicitly wants updates to request cancellation after grace. Neither option
promises an unconditional update deadline: uncertain work remains pending or
`reconcile_required`, and a timeout never proves cleanup.

Accepted [Agent Runtime ADR-0009][ar-shutdown] already mandates that actual Host
disposal closes admission, requests durable cutoff for every in-scope operation
that is not yet terminal, performs configured containment, drains observations and
releases resources only under custody/receipt rules. 2A waits **before** that
disposal begins; it cannot replace disposal with a wait-only shutdown.
Cancellation, process exit and closure are distinct observations. Both options
use the existing operation owner and preserve its unknown-outcome truth.

These are alternative residual integration estimates, conditional on usable
owned admission, cancellation and closure/readback ports. They overlap the
ordinary restart allowance in the
[earlier validation record](../research/static-composition-and-controlled-restart-validation.md#implementation-boundary-and-planning-estimates);
they must not be added mechanically to its restart/loader figures or to Choice
1's overlapping integration work. They create no shared runtime, second
scheduler, custody owner or generic lifecycle state machine.

### Open but not independent immediate votes

- **Public extension SPI:** exact manifest, compatibility, contributions and
  publication remain open below. Choosing a first slice is not accepting its
  public contract or passing independent-implementation/conformance gates.
- **Host trust and placement:** the first-slice estimates assume explicitly
  trusted adapter code and existing execution custody. A marketplace for
  untrusted authors needs a separately scoped isolation and effect contract;
  Worker/process separation alone is not that evidence.
- **Private state and migration:** no new plugin-private durable state is
  included in the recommended first slice. Product canonical state remains
  owned as before. A real state need triggers the explicit custody/migration
  choice below; retained state is not silently discarded.
- **Repository and language:** GM composition and optional local-kernel ownership, EF's
  neutral artifact/trust/protocol role and product operational ownership are
  fixed. GM's lifecycle kernel remains a private candidate. Another library or
  repository needs a demonstrated residual shared concern; static provider
  composition does not require one. Preserve existing native custody; choose
  another native component only for a named demonstrated benefit.
- **Temporal and availability:** the optional rollout adapter remains permitted
  above the same owned operation when qualified infrastructure and durable waits
  justify it. No engine re-selection, new per-call workflow, overlapping
  generation requirement or portable-history promise follows.
- **Scale:** catalogue size, selected graph size, simultaneously active work,
  isolated processes and version churn are different dimensions. Choose an
  actual profile and capacity target for the selected slice before sizing its
  deployment. Graph-growth and packed-fixture results are not thousand-active-
  plugin qualification.

The owner can answer `1A / 1B / 1C`, name the actual desired variation or new
provider, and select `2A / 2B` when applicable. The next delivery records that
selected scope in the owning product and designs only its required contract.
No option becomes accepted because it was recommended or scored here.

[current-o116]: https://github.com/agent-teams-ai/agent-teams-orchestrator/blob/main/docs/decisions/0116-native-temporal-for-fully-local-durable-workflows.md
[current-o117]: https://github.com/agent-teams-ai/agent-teams-orchestrator/blob/main/docs/decisions/0117-reconcile-mandatory-module-composition.md
[ar-port]: https://github.com/agent-teams-ai/agent-runtime/blob/f990acc26e1b8071ae22d0b87a2ddd3672be8e2e/packages/contexts/agent-execution/src/features/contained-agent-turn/application/ports/outbound/contained-turn-execution-ports.ts
[ar-composition]: https://github.com/agent-teams-ai/agent-runtime/blob/f990acc26e1b8071ae22d0b87a2ddd3672be8e2e/packages/apps/embedded-runtime/src/composition/contained-turn-feature-composition.ts
[ar-registry]: https://github.com/agent-teams-ai/agent-runtime/blob/f990acc26e1b8071ae22d0b87a2ddd3672be8e2e/docs/architecture/qualification-registry.json
[ar-feature]: https://github.com/agent-teams-ai/agent-runtime/blob/f990acc26e1b8071ae22d0b87a2ddd3672be8e2e/packages/contexts/agent-execution/src/features/contained-agent-turn/README.md
[ar-shutdown]: https://github.com/agent-teams-ai/agent-runtime/blob/f990acc26e1b8071ae22d0b87a2ddd3672be8e2e/docs/decisions/0009-contained-turn-private-access-and-host-shutdown-boundary.md

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

The next actual owner choice is the first real capability and its availability,
trust, deployment and replacement-lifetime promise. The bounded trusted request
cohort remains a candidate; it does not qualify arbitrary streams, UI sessions,
exclusive resources, hostile plugins or state migration. The research does not
resolve this open decision.

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
