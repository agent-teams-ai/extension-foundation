---
id: OD-003
type: open-decision
status: open
owner: architecture
summary: Records the prioritized live application and portable plugin vision, including durable user changes, with unresolved host, SPI, interruption and state migration choices.
related:
  - ADR-0001
  - ADR-0011
  - ADR-0013
  - ADR-0014
  - ADR-0015
---

# OD-003: Extension Host, Public SPI, And State Migration Choices

## Current delivery route, 2026-11-24

The separate [Live Module Updates repository](https://github.com/agent-teams-ai/live-module-updates)
is available. Its [shared foundation plan](https://github.com/agent-teams-ai/live-module-updates/blob/fddfd82290a751e0890bce570bd3c4506743676d/docs/plans/foundation-delivery-plan.md)
and [headless plugin/UI design](https://github.com/agent-teams-ai/live-module-updates/blob/fddfd82290a751e0890bce570bd3c4506743676d/docs/architecture/headless-plugins-and-ui.md)
were published as proposals in [PR #1](https://github.com/agent-teams-ai/live-module-updates/pull/1).
The [EF Plugin Delivery Plan](../architecture/plugin-delivery-plan.md) retains
artifact/trust/installation and product host-adoption responsibilities here.
The actual first complete-operation consumer and its concrete contract are
still open. This route does not resolve the owner choices below, adopt a public
SPI, or make full live replacement a prerequisite for an already admitted
static application feature. Existing consumer pins and local gates still apply.

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

## Owner-requested documentation audit and stack comparison, 2026-11-23

<!-- cspell:words Piral OpenComponents -->

The owner requests repeated review of all available module, plugin and live-update
documentation and evidence, preservation of omitted conclusions, and a structured
current entry point outside the research chronology. The
[system map](../architecture/live-extension-system-map.md) routes current
direction and ownership; the
[audit](../research/live-extension-documentation-audit-2026-11-23.md) records
the finite corpus, corrections, readiness rubric and independent rechecks.
Commit and immediately push useful checkpoints.

Explicitly classify Piral, Module Federation, Native Federation and OpenComponents:
which layer each supplies, how it intersects plugin lifecycle, whether a proposed
adapter would reuse it, and what is actually selected or qualified. Mention in
competitor research is not an adapter commitment. Compare complete ready stacks
against the same practical consumer scenario and identify useful differentiation
without assuming uniqueness. Assess vision, documentation and implementation-plan
readiness separately. The seven disputed questions below remain OPEN.

## Owner-requested Module Federation and unresolved alternatives, 2026-11-22

The owner requests another deeper, parallel investigation of Module Federation,
live module delivery and industry update mechanisms. Update research with
verified facts, concrete failure boundaries and architecture implications.
**Do not independently settle contested decisions.** Present a small prioritized
set of questions with two or three alternatives, the best-supported preference
and the remaining uncertainty at the end of the investigation.

The [Module Federation and update-boundaries study](../research/module-federation-update-boundaries-and-architecture-options-2026-11-22.md)
separates source facts, executed evidence, mandatory existing invariants,
recommendations and owner decisions. Sharing/isolation, update-unit granularity,
ordinary interruption, delivery/retention and state/reset policies remain open.
Preserve findings as useful checkpoints, commit and immediately push each one.
Prepare concrete architectural seams without claiming that all future
refactoring can be eliminated or introducing a speculative public SPI.

The current [owner decision matrix](../research/module-federation-update-boundaries-and-architecture-options-2026-11-22.md#owner-decision-matrix)
has seven unresolved questions. Q1–Q3 determine the first trust, update-group and
state-continuity boundary; Q4–Q7 determine product promises about visible adoption,
admitted work, rollback and old-client support. Each gives two or three options,
a conditional preference and evidence that could change it. **No owner answer
or default is recorded by this research.** The matrix does not reopen the accepted
TypeScript-first direction, complete reusable library operation, Get Modular
composition or canonical product-state ownership.

The complete operation belongs in one reusable library implementation. Product
authority/state primitives and existing lifecycle/resource custody keep their
owners; this is not a return to consumer-assembled orchestration. Ordinary
library qualification, production-host admission and a public extension SPI have
distinct applicable gates. Unsupported/private lifecycle integration remains an
explicit dependency rather than copied internal code.

## Owner-confirmed architecture and deeper qualification, 2026-11-22

The owner accepts the recommended starting architecture: a **TypeScript control
library with ordinary TypeScript plugins**, with Wasm/Extism and native Effect
as separate optional execution profiles. The reusable library supplies the
complete update operation: planning, switching, cleanup coordination and
observable outcomes. External consumers connect narrow authorization and state
primitives; they should not reconstruct that operation in each product.

The owner also requests materially deeper parallel research and qualification
than the last browser-recovery slice. Investigate interacting failure boundaries,
actual industry mechanisms, old-version and state retention, user-visible
changes, ready-made algorithms and libraries, and specific mistakes to avoid.
Keep findings and intermediate checkpoints committed and immediately pushed.
The [reliability study](../research/live-update-reliability-and-industry-evidence-2026-11-22.md)
records this next stage and its evidence coverage.

This confirms architecture direction, not a specific Wasm engine, production
executor, ordinary interruption default, migration policy or published SPI.
Accepted graph, product authority and canonical-state ownership remain in force.

## Owner-confirmed standalone library and continuous research, 2026-11-22

The owner confirms that the live-plugin work is a **standalone, reusable library
and separate repository**, potentially with substantial architecture and several
cohesive features. Do not keep treating the entire project as a small
product-local adapter. The earlier dated statement that the November 17 research
request did not authorize repository creation describes that earlier request;
this clarification establishes the separate-project delivery direction. Accepted
composition, product authority, state ownership and publication constraints
remain in force.

Follow the organization's current library-first quality and Feature Module
Standard requirements. Evaluate ordinary external consumers, strict dependency
direction, narrow ports and independent conformance. Reuse existing mechanisms
critically; neither a large framework by default nor artificially small code is
the target. Ordinary TypeScript and optional native Effect execution profiles
need explicit semantics; the application's Effect choice does not require all
library consumers to adopt Effect. An optional Wasm adapter remains part of the
architecture investigation.

Continuously preserve useful and harmful patterns, concrete failure examples,
primary sources, qualification gaps, state/old-version cleanup rules and live
user feedback. Commit useful intermediate checkpoints and immediately push each
commit. Research should proceed in parallel where the work is independent;
user-facing reports should be about one third more concise and omit obvious
explanations.

The [standalone blueprint](../research/standalone-live-plugin-library-blueprint-2026-11-22.md)
owns this follow-up research and its staged evidence. Repository provisioning,
module boundaries and bootstrap qualification must be reported as actual
outcomes. A separate repository does not itself publish a stable API, qualify a
production host or approve consumer adoption. Runtime selection, state migration
policy, ordinary-update defaults and final public contracts remain open.

## Owner-requested reuse-first design and granular updates, 2026-11-22

The owner confirms that the remembered ready-made plugin library is **Extism**.
Retain Extism and the other relevant runtimes/SDKs in the research inventory;
mark uncertain capabilities for deeper source inspection and qualification.
Audit plausible duplication above the Wasm engine as well: loading, composition,
execution, resource lifetime, update coordination, state and recovery. Put
actionable warnings beside their existing owners so later work does not recreate
an existing mechanism accidentally.

The owner's preferred direction to investigate is **ordinary TypeScript plugins
first, with optional WebAssembly through an adapter**. Design narrow feature
boundaries and explicit state/resource ownership now so a later language-neutral
implementation does not require an avoidable broad refactor. The owner questions
the need to implement the complete Wasm lane immediately; this request does not
adopt Extism, WIT, a public SPI or a new production runtime by implication.

Predictable granular live updates are a high-priority product goal: identify
which plugin components change, what state remains, which resources they own,
what active work experiences, and when a targeted restart is required. Investigate
industry mechanisms critically, including Flutter but not limited to it.
Preserving state is not evidence of compatible state, and a development reload
is not evidence of production retirement or rollback.

The [reuse-first study](../research/reuse-first-live-plugin-updates-2026-11-22.md)
records the authorized source review, disposable spikes, uncertainty register
and pushed checkpoints. Existing accepted owners and the controlled-restart
baseline remain in force. Ordinary-update defaults, grants, escalation,
supported state transitions and final runtime selection remain open.

## Owner-requested selectable updates and cross-language research, 2026-11-21

The owner asks to evaluate **multiple explicit update modes**, including an
agent optionally requesting interruption, a hard stop where supported, and
waiting until active plugin work reaches a safe completion boundary. This
direction applies to running backend and frontend applications. It narrows the earlier
binary interruption question into concrete capability, authority and policy
choices; it does not select one ordinary-update default.

The [completed research and bounded spikes](../research/live-update-policies-and-portable-runtimes-2026-11-21.md)
compare retaining old operations, closing admission and draining,
cooperative cancellation and forced isolated-executor termination. A supported
checkpoint or migration boundary is another candidate where a real feature
needs it. State the actual evidence available for each mode and execution
placement. An update request, cancellation request, observed stop, active new
version and completed cleanup are separate facts.

An agent may request a supported mode only within the consuming owner's grants.
Agent authorship and a plugin manifest cannot grant interruption authority.
The deadline and its next action must be explicit. An owner-selected policy may
authorize escalation in advance; an expired deadline must not silently select force,
claim successful drain or authorize retries of uncertain external effects.
The affected work, dependent operations and shared execution-unit scope also
need a declared contract. Existing emergency revocation and accepted deadlines
keep their authority.

The owner additionally asks whether TypeScript needs compilation or other
processing, how Wasm-based plugins compare with native JS/TS, and whether
cross-language execution should be foundational or an optional adapter.
Evaluate a TypeScript-first implementation with a portable SDK/contract path
alongside stronger language-neutral boundaries where useful. Host language,
guest language, artifact format and state compatibility are separate choices.
This research request does not select Wasm, a particular SDK or a host rewrite.

**Still open:** ordinary defaults, allowed agent policy, timeout escalation
grants, feature-specific safe boundaries, state migration and production
adapter selection. Disposable mode demonstrations do not make every mode
available in an existing production owner or supersede its accepted lifecycle.

## Owner-prioritized live application platform vision, 2026-11-18

**Confirmed high-priority product vision: a running application should be an
adaptable platform where users and agents can change substantive behavior.**
The owner explicitly wants this to shape the foundation of modules, plugins and
ordinary feature code now, so later development follows a coherent direction.
Live customization includes complex logic and workflows in both frontend and
backend; styling alone does not meet the goal.

The owner described the following intended user outcomes:

- Ask an agent to add or change behavior in a running frontend or backend,
  observe the result live and understand whether the change actually became
  active. The supported boundary may differ by feature and execution profile.
- Capture suitable authored changes as reusable plugins, with their required
  code, dependencies and configuration identified. Preserve installed choices
  and authored functionality across backend restart and frontend reload.
- Reuse and share those plugins in compatible projects. Installation and
  execution remain subject to the receiving product's own contracts and grants.
- List and manage installed and active functionality, choose supported versions,
  enable, disable or remove unwanted plugins, and manage eligible built-in
  features through explicit module boundaries.
- Build feature code with this evolution path from the start. New feature
  boundaries should state their supported replacement, restart or continuation
  mode and the owner of retained state/resources. Record a concrete constraint
  when a feature cannot yet support the desired live behavior.
- Give agents discoverable contracts and useful validation/diagnostics so they
  can make bounded, reviewable changes confidently. Agent authorship does not
  confer additional permission or ownership of trusted enforcement.
- Keep the system reliable while it evolves: preserve owned data, distinguish
  preparation from readiness and activation, account for outstanding work and
  resources, and expose a failed or incomplete transition honestly.

This vision includes more than one change mechanism: replacement for new calls,
retained old work, a supported component/container restart, and explicit state
continuation where qualified. It does not select one mechanism for every module
or promise arbitrary stack transplantation. Full-application-restart-only
behavior remains a baseline where declared, not sufficient evidence of the
intended live behavior for all categories.

### Built-in functionality and the trusted boundary

The goal is broad feature modularity, including eligible built-in functionality.
Keep a small, explicit trusted boundary for the product's invariants, authority,
canonical state and enforcement. Ordinary plugin management cannot replace those
invariants or grant itself new privileges. A feature's inability to be disabled
or replaced needs an owned reason; a built-in label alone should not become an
unexamined reason to couple ordinary features permanently.

The accepted identity distinction remains: a built-in module is not a plugin
artifact. Managing its enabled contribution does not make its code a published
artifact. Exporting or distributing suitable built-in behavior requires an
explicitly packaged artifact and the applicable admission path. Disabling a
feature, removing executable installation, retiring a generation and deleting
user-owned data remain different operations. Deletion of user data is never an
implicit side effect of plugin removal.

### Durable and portable evolution

Persist the facts the consuming owner needs to reconstruct the intended
functionality, with exact executable identity and state compatibility. A source
edit on disk, an installed package, a persisted target, a running instance and
an observed ready capability are different facts. A browser reload or backend
restart must reconcile them through the existing owner, not create another
competing catalog or active-head authority.

The [portable library direction below](#owner-requested-portable-library-direction-2026-11-17)
continues to apply: a demonstrated shared mechanism should be usable outside
Agent Teams from its first real delivery, while feature APIs and product policy
remain consumer-owned. Reuse Get Modular composition, existing qualified
lifecycle mechanisms and native resources before adding residual coordination.

The owner authorized deeper research and disposable spikes to make these
architecture choices concrete. The
[current investigation](../research/live-application-evolution-vision-and-executed-spikes-2026-11-18.md)
records source evidence and the exact scope of executed backend/browser probes.
Experiments do not select a production Host, publish a universal SPI, qualify
all consumers or supersede an accepted ADR. The prior controlled-restart
baseline remains as recorded below until its applicable successor is accepted.

**Ordinary-update defaults and escalation remain deliberately OPEN.** The
[November 21 clarification](#owner-requested-selectable-updates-and-cross-language-research-2026-11-21)
requests optional modes for evaluation. An experimental retention, restart or
cancellation profile does not select a universal product default. Emergency
revocation and previously accepted deadlines retain their existing authority.

## Owner-confirmed baseline, 2026-10-25

The owner selected **static composition with controlled restart** as the
baseline, with an **optional Temporal adapter for the same product-authorized
operation** where qualified infrastructure and durable coordination justify it.
The [validation record](../research/static-composition-and-controlled-restart-validation.md)
separates this confirmed direction, current PostgreSQL/Temporal authority,
executed scenarios and remaining production qualifications. This resolves the
baseline-versus-immediate-overlap question; it does not select a public SPI,
create a second Host authority, publish a package or qualify state migration.

## Owner-prioritized live plugin vision, 2026-11-14

**Confirmed product vision: live plugin evolution is a high priority.** The
owner wants plugins to be added, initialized, updated and replaced while the
application and agents continue operating, including changes authored or
requested by agents. The target spans plugin categories; it must shape new
boundaries now, with useful live behavior implemented early where practical.
Avoid coupling that would require an avoidable broad rewrite to introduce it.
This direction is stronger than treating live replacement as an incidental
future optimization.

The prior controlled-restart choice remains the confirmed delivery baseline,
not the ceiling of the product vision. An immutable composition per generation
can coexist with changing which generation accepts future work. This observation
does not select a production runtime or rewrite an accepted ADR. Any conflicting
accepted mechanism follows its explicit successor process.

The [current research](../research/live-plugin-evolution-vision-and-evidence-2026-11-14.md)
separates dynamic discovery, next-turn activation, live generation replacement,
isolated execution and migration of already running state. The goal is broad
live support; a promise of arbitrary instruction-level replacement, universal
state migration, zero interruption or immediate physical unload is not implied.
Each plugin category needs an honest supported update boundary and visible
limits. Do not impose irrelevant lifecycle hooks on pure contributions or call
a whole-application-restart-only implementation qualified live replacement.
A targeted plugin restart can keep the surrounding system live; its effect on
current plugin work still depends on the open interruption policy below.

Agent authorship grants no additional authority. Candidate code and requested
permissions pass the same consuming product's admission and runtime checks;
policy, canonical state and physical custody keep their existing owners.
The current Get Modular Effect integration is a relevant implementation option
to evaluate, not a newly selected dependency or automatic live-update runtime.

### Explicit owner TODO: interruption during ordinary updates

**Open policy details, now informed by the optional-mode direction above.**
The owner initially deferred whether an ordinary update may initiate
interruption. On November 21 the owner requested deeper evaluation of optional
agent-selected modes, including force and waiting for safe completion.
Choose supported capability boundaries, grants, defaults and escalation through
that owning decision; no earlier recommendation to pause, cancel, cut off or
migrate a session becomes a universal default. Research and compatible
preparation continue. Emergency revocation and already accepted deadlines keep
their authority.

## Owner-requested portable library direction, 2026-11-17

The owner asked to deepen the live-update research toward an independently
useful library or extension mechanism that other projects can use, without
coupling it to Agent Teams. Evaluate concrete implementations and alternatives
through Clean Architecture, SOLID, DRY and modular boundaries. This is a design
direction for the research and future shared work, not authorization to publish
a new package, create a repository or select an unresolved production runtime.

The [portable mechanism research](../research/portable-live-plugin-mechanisms-and-library-design-2026-11-17.md)
distinguishes the reusable update/lifetime mechanism from each consumer's tool,
UI, provider and business contracts. Ordinary consumers should not need Agent
Teams domain types, organization credentials, a catalog or its database schema
merely to use a qualified neutral mechanism. An EF artifact-admission consumer
still follows its accepted OCI, trust and authority profile; portability does
not introduce an implicit bypass.

Existing Get Modular composition and lifecycle ownership, native resource
primitives and fitting loaders/execution libraries must be subtracted before
designing residual shared coordination. One existing product owner may invoke
reusable code; that code must not become a second active-head, permission,
resource or operation authority. A separate package need not imply a separate
repository. The candidate package owner, public API and first real consumers
remain choices for the shared Host mechanics discussion below.

The all-category live vision remains intact. Qualification can proceed by
declared capability and runtime profiles without promising arbitrary stack
migration or identical cleanup semantics on every backend. The ordinary-update
interruption TODO above remains open. A library can make that policy explicit
without choosing it for the application.

The owner's further request is answered in the
[final implementation and architecture study](../research/live-plugin-evolution-final-research-and-architecture-2026-11-17.md).
It separates discovery freshness, actual executor version, retained resources,
shared-state compatibility and observed cleanup. Remote MCP version affinity
needs a server-supported contract; captured client metadata alone does not
establish it. These are research qualifications for the proposed boundary,
not new accepted defaults, a selected public API or package publication.

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

**Current scope of this TODO, 2026-11-23:** the owner has already confirmed the
standalone repository direction and a library implementing the complete update
operation. Those are not still awaiting selection. The remaining discussion
concerns exact public/internal contracts, first consumers and qualified profiles,
integration with existing lifecycle/custody owners and unresolved product policy.
The dated research proposals below must be read with that clarification.

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
  from its first real consumer plus external conformance delivery. The later
  [November 22 confirmation](#owner-confirmed-standalone-library-and-continuous-research-2026-11-22)
  resolves the independent-repository direction for the complete live-update
  library. Package count, public contracts and admitted profiles remain open;
  existing independent mechanisms retain their owners.
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

## Owner-requested detailed design and project preparation (2026-11-23)

The owner requested deeper responsibility, pattern, technology and adapter
design, integrated with Get Modular, the plugin system and Engineering
Foundation. The library should serve ordinary open-source consumers and eligible
features across the owner's projects. The owner also authorized preparing and
creating a separate repository with a descriptive public name; the working name
is `live-module-updates`.

The [operation proposal](../architecture/live-module-update-operation.md) and
[validation record](../research/live-module-update-design-validation-2026-11-23.md)
carry this work. Record competitors' useful implementations, tradeoffs and
counterexamples; use bounded spikes where their result can change a choice.
Commit useful checkpoints and immediately push them. The request does not
accept a public API, select Q1-Q7 defaults or qualify every project/module for
live replacement. Repository creation, actual admission and production delivery
remain separately observable steps.

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
