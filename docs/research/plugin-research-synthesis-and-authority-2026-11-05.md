---
id: research.cross-framework-synthesis
type: research
status: active
owner: architecture
summary: Cross-framework evidence, dated research authority clarification and conditional lessons; research and criticism do not adopt a design.
---

# Plugin Research Synthesis and Authority 2026-11-05

Research cut: **2026-11-05 UTC**. This follow-up preserves information and critique.
It adopts no plugin framework, runtime, public SPI, language boundary or new
product policy. The owner explicitly confirmed that research is reference
material, while design decisions are discussed and recorded separately.

## What was checked and what was changed

The previous packed-consumer continuation was independently audited at
EF9f5ba60, including its exact Git delta, all three archive/member ledgers, all
433 new fixture/consumer/driver TypeScript lines, and the ten copied Orchestrator
source/manifest/configuration files. No new production plugin runtime or accepted
ADR body was found in that continuation. The wider PR also contains existing
Docs Protocol research-type configuration and tests, so it must not be described
as prose-only. See the [packed E2E record](packed-extension-consumer-e2e-2026-11-05.md)
and the retained authority audit in this follow-up's evidence bundle.

This follow-up adds source-backed cases, source ledgers, independent criticisms,
and navigation/authority clarification. Existing accepted ADRs remain unchanged.
The current authoring instructions explicitly separate facts, transfer proposals
and owner-approved decisions. Historical pins and failed experiments remain
available; no later correction rewrites what was actually observed.

| Information | Meaning | Does not mean |
| --- | --- | --- |
| Documented contract | The named upstream documentation states behavior for its version/profile | We executed or qualified it |
| Inspected implementation | The exact source path/symbol implements the described mechanism | Every entrypoint, package artifact or deployment behaves identically |
| Inspected unrun test | An upstream test states an expectation that helps interpret source | Our test passed |
| Historical report/fix | A dated incident/change with separately recorded resolution | The same defect exists in the current pin |
| Inference / transfer hypothesis | A reasoned, conditional idea mapped to an existing owner | The product has selected it |
| Executed evidence | A specific retained run with exact inputs, environment, assertions and receipts | Broader profiles are qualified |
| Owner-confirmed direction / accepted ADR | The recorded owning decision governs its exact scope | Research or another project's implementation can silently amend it |

Research document status remains the existing `active` or `archived`; neither
is an approval status. This adds no competing acceptance registry or process.

## Confirmed direction and ownership

Static composition with controlled restart remains the confirmed baseline.
Downtime can be part of that profile; overlapping generations and seamless
replacement require a separately justified capability. An optional Temporal
adapter can orchestrate the same owned operation where the infrastructure is
already qualified. Neither more competitor evidence nor an attractive reload
API changes that agreement.

| Responsibility | Existing owner | Consequence for this research |
| --- | --- | --- |
| Neutral module/capability/implementation/slot identities, bindings, graph and immutable plan | Get Modular | No second resolver, DI container or composition compiler in EF |
| Neutral artifact/trust/distribution/protocol/conformance concerns | Extension Foundation | Evidence and a real shared neutral boundary; no implicit operational Host |
| Concrete extension point, allowed customization, grants, readiness, profile, canonical state | Consuming product | Narrow contracts and actual domain invariants stay owned there |
| Process/worker/resource custody and retirement evidence | Existing execution owner | A callback result, timeout or registry removal cannot replace its observation |

These boundaries are already grounded in
[ADR-0015](../decisions/0015-authorize-get-modular-semantic-extraction.md),
[ADR-0014](../decisions/0014-product-local-module-authoring-composition-and-generation-guardrails.md)
and the scoped production floor in
[ADR-0011](../decisions/0011-extension-admission-custody-and-retirement-closure.md).
The open Host/SPI/state choices remain in
[OD-003](../open-decisions/OD-003-module-runtime-and-public-spi-choices.md).
A library can be independently useful without creating another repository or
operational authority. This comparison does not select such a library.

Clean Architecture keeps framework/container access outside the product's
domain/application boundary, behind its own ports. SOLID requires a concrete
substitution contract and independently checked behavior. DRY preserves one
owner per invariant; it does not merge unrelated contexts into a generic service
bag. DDD keeps real bounded-context language and invariants with their owner;
a telemetry signal, callback phase or plugin package is not automatically a
bounded context. Pluggability makes selected changes possible through a declared
seam without granting extensions authority over product enforcement.

### Current authority clarifications

- The October overlapping-worker proposal is now explicitly labeled optional
  and unadopted where maintained navigation previously called it the next target.
- The historical research heading “Decision in one paragraph” now identifies a
  conditional research recommendation. Original case evidence remains intact.
- The October review retains original adoption pins and PR analysis, while a
  dated note routes current Orchestrator module adoption to accepted ADR-0117.
- EF OD-002 now limits itself to catalog security/offline parameters. Orchestrator
  ADR-0114 selects native PostgreSQL local/hosted authority and ADR-0115 requires
  Fully Local V1. EF ADR-0003's historical catalog rollout and possible SQLite FTS5
  search projection remain unchanged; they are not product canonical storage.
  See [OD-002](../open-decisions/OD-002-catalog-security-and-offline-operational-parameters.md)
  and the [current authority map](plugin-industry-and-scale-review-2026-11-05.md#research-coverage-and-current-authority).

These are scope and navigation repairs under existing decisions, not a new
storage choice, framework adoption or implicit permission to implement an open
product feature.

## Coverage added in this follow-up

The new comparison includes **14 cases in three lanes**. Prior coverage of
OpenClaw, OpenCode, Claude Code, Dify, IDE platforms, OSGi, Backstage, Vault,
JupyterLab, NGINX/Envoy, Erlang and other systems remains in the
[maintained reference](plugin-system-research-reference.md). Repeating a
framework name is not counted as a new investigation.

| Case | Actual extension unit inspected | Useful mechanism / boundary to examine |
| --- | --- | --- |
| Google ADK Python | Runner-wide callback plugin | First-result interception versus all-observer notification; owned/borrowed cleanup |
| Pydantic AI | Capability, toolset, per-run binding | Presence, order, dispatch provenance and run state are different contracts |
| Microsoft Agent Framework Python | Agent/chat/function middleware and bundle | Required contribution closure; streamed updates versus final result gates |
| Mastra | Phase processor and ID-keyed runner state | Explicit phase/state identity and bounded recovery cost |
| ElizaOS development source | Contribution bundle and owned runtime registrations | Partial setup/teardown bookkeeping; tolerant dependency resolution versus required closure |
| Current Letta Code | Fully trusted local harness mod | Deep customization, exact-owner cleanup and stale activation guards |
| Pluggy | Hookspec/implementation/caller | Result cardinality, wrappers and validated registration; historic replay caveats |
| PF4J | Artifact descriptor, lifecycle, typed extension | Descriptor closure versus actual dependency startup; class identity |
| Fastify/Avvio | Encapsulated registration context and boot tree | Scope/export semantics; observed boot timeout versus cancellation |
| Hapi | Registration realm and named extension phase | Phase order, dependencies and partial executable registration |
| NestJS | DI module/provider and application context | Provider selection, instance lifetime and cleanup-result semantics |
| Drupal | Installed module, hook, plugin type/definition/instance | Deep alterations with explicit discovery/install/data boundaries |
| OpenTelemetry Collector | Compiled component and configured pipeline instance | Sharing/backpressure, startup/drain order and bounded receiver reload |
| Apache APISIX | Named phase handler plus scoped configuration | Priority/precedence and trusted Lua loading semantics |

The first six cases are documented in
[Agent Framework Extension Evidence](agent-framework-extension-evidence-2026-11-05.md);
the next six in
[Specialist Plugin Framework Evidence](specialist-plugin-framework-evidence-2026-11-05.md).
The two data-plane cases appear below with exact source links. These categories
are a comparison aid, not a new product plugin taxonomy or public API.

Every case retains retrieval date, technology, actual extension unit, full source
commit, inspected symbols, primary URLs, release/tag relationship, limitations,
counterevidence, conditional applicability and smallest proposed falsifier.
Agent-framework default-branch observations are explicitly different from
released bytes. Eliza's inspected develop source has no established published-byte
identity in this study. Letta's old server repository explicitly directs current
development to Letta Code; the case follows that successor rather than inferring
a product deficiency from the retired tree.

## Conditional lessons across independently inspected systems

### 1. Define the useful behavior at each seam

A single-provider replacement, list of contributions, around-call wrapper,
first-result hook, notification and streaming transformation have different
cardinality, order, error and mutation semantics. Pluggy, ADK, Pydantic, Microsoft
and Drupal provide concrete examples in the two case studies. Calling everything
a universal plugin interface would conceal these differences.

**Unadopted transfer:** for a real product seam, state what may be added/replaced,
how ties are handled, what can short circuit and which result/postcondition is
required. Reuse existing GM declarations where they already express selection.
A hook's first non-None result (ADK/Pluggy) is not proof that one provider was eligible.
These are overlapping examples of seam behavior, not an exhaustive public
taxonomy or six new base interfaces.

### 2. Separate resolution, executable setup and usable readiness

PF4J makes descriptor resolution distinct from plugin startup; Fastify and Hapi
have executable boot/registration; OTel has startup ordering with separate
readiness notifications. Those mechanisms solve different portions of admission.
A pure validation pass can reject a declaration before mutation; arbitrary user
setup can acquire a handle and then fail.

**Unadopted transfer:** a product's selected candidate should have a precise
failure result and owned partial cleanup. Do not infer transactional rollback
from a rejected setup promise. Do not require old availability to survive an
interrupted controlled restart unless that stronger promise is actually selected.
Existing GM validation and execution custody already have owners.

### 3. Treat sharing and lifecycle identity as part of the contract

Mastra's per-run ID-keyed state, Pydantic's optional fresh run binding, ADK's
borrowed plugins, OTel's shared receivers and Letta's exact owner IDs expose
different identities. A package name, configuration ID, implementation object,
run state and physical resource are not interchangeable.

**Unadopted transfer:** explain the intended lifetime and sharing at a concrete
port. A stale disposer should not remove a successor contribution where
replacement is supported; a borrower should not close the resource owner.
Where the selected profile claims resource retirement, conformance must inspect
the actual owned resource, without inventing a global identity registry or
demanding a separate process for each module.

### 4. Preserve the chosen failure policy

All-observer error notifications may reasonably continue after one observer
fails. A required provider may need to reject the operation. Nest's best-effort
destroy continuation, Eliza's strict/best-effort retirement distinction and
Mastra's scoped retry cap are deliberate examples. The report retains both the
benefit and the limit.

**Unadopted transfer:** a product author should be able to tell whether failure
blocks work, degrades an optional feature, creates tracked cleanup debt, or ends
the selected operation. A logging-only cleanup failure is not physical retirement.
A per-hook retry cap is not an aggregate tenant budget or effect idempotency.

### 5. Keep ordinary customization inside the existing authority boundary

Letta and APISIX deliberately allow trusted code to reshape a local harness or
operator-controlled gateway. Fastify scopes, Hapi realms, Nest exports and PF4J
classloaders manage visibility or resolution. These are useful mechanisms, but
none of those named boundaries alone proves hostile-code containment.

**Existing constraint, not newly adopted research:** ordinary Agent Teams
extensions cannot replace authorization, product invariants, fencing, canonical
state or enforcement. **Unadopted transfer:** choose stable narrow product seams
that offer useful change without private method patching, and explain the selected
provider/adjustment when that information helps the author. No generic diagnostic
control plane or new sandbox is selected here. Useful no-fork fit must be
shown by a real customization and combination of independent extensions at a
selected seam; callback count or breadth alone does not establish it.

### 6. Make streaming promises explicit

Microsoft's inspected Python middleware distinguishes construction of a lazy
response stream from final-result validation; its warning names the case where
unbuffered updates have already been emitted. Mastra exposes separate chunk and
result phases. A final rejection cannot retroactively retract a delivered chunk.

**Unadopted transfer:** if a particular product invariant requires checking before
release, that product chooses the stream policy and accepts its latency/memory
cost. This is not a blanket buffering requirement for every plugin or an
alternative authorization owner.

## Scale: which claim would actually need evidence?

A large catalogue and a large simultaneous execution population are different.
The existing GM N1000 construction and 1,024 live scoped receivers remain useful,
bounded evidence. New source inspection neither invalidates those achievements
nor extends them to a production fleet of hostile third-party plugins.

| Axis | A useful concrete question | Why a source/plugin count is insufficient |
| --- | --- | --- |
| Catalogue and discovery | How many inert descriptors can be searched/validated without executing excluded code? | Loaded modules and active instances may be far fewer |
| Graph shape | How many vertices, edges, dense conflicts, nested scopes and dependency closures? | One thousand independent leaves do not represent one dense graph |
| Active state | How many live instances, tenants and intentionally shared resources? | A descriptor may create many instances or reuse one physical engine |
| Model-visible tools | What shortlist is useful, with what discovery quality and current authorization? | Token reduction alone can hide poor selection or stale permissions |
| Execution and backpressure | Which operations progress independently under a slow/blocked provider? | Many modules can still share one thread, queue or engine |
| Restart/retirement | What happens to accepted work, partial setup, failed cleanup and repeated churn? | Method fulfillment or a one-shot happy path does not bound retained resources |
| Independent releases | Which public package versions, nominal tokens, manifests and migration profiles interoperate? | One monorepo's lockfile may hide independent consumers' conflicts |
| Authoring and diagnosis | Can a user identify the effective provider, state scope and cause of rejection? | Runtime throughput does not establish understandable customization |

These are measurement dimensions, **not a newly mandatory test campaign**.
Reuse existing evidence for unchanged claims. A future minimal experiment should
test a specific remaining uncertainty at an actual selected seam, with an
independent oracle and realistic bounded inputs. No new runtime experiment or
E2E was added in this research follow-up.

## Decision and experiment discipline

The retained small falsifiers are proposals. They do not themselves choose what
the product ought to promise. A framework's tolerated optional target, interruption
during controlled restart, declared shared backpressure or trusted extension code
must not be scored as failure against an invented requirement.

Distinguish an upstream semantic probe (does this path behave as read), product
conformance (does an agreed seam meet its selected promise), and capacity
qualification (does a defined workload stay inside its envelope). One cannot
stand in for another. Run a proposed probe only when its result changes a named
decision or resolves a concrete claim; do not execute the entire research list
as an automatic test plan.

Before a significant unresolved technical/product choice, first inspect the
current implementation/accepted authority and competing explanations, then obtain
independent criticism. Present concrete alternatives with:

- confidence, reliability within the named profile, and complexity, each out of
  ten; higher complexity means more burden;
- production, integration and test LOC ranges separately, including the reuse
  baseline, uncertainty and platform/release/maintenance costs;
- the fact or small experiment that would change the recommendation.

Do not estimate an entire future plugin platform from these case studies.
Scores are engineering judgments, not measured availability or a ranking of
framework quality. This documentation task introduces no production/integration/
test implementation, and it creates no new material owner decision to block it.
The real Host/SPI/trust/availability decisions remain in their existing owning
records, to be discussed when the concrete slice is ready.

## Independent criticism and retained evidence

The evidence bundle keeps the task context, source ledgers, researchers' detailed
reports, pre-correction versions, six research critique reports from four independent
critics, separate publication reviews and explicit review dispositions. Two specialist
researchers and the four critics used GPT-6.1 Sol at xhigh; root supplied the two
data-plane cases and synthesis. Review report count is not independent reviewer
count. Criticism
corrected authority-shaped headings, startup-versus-readiness wording, actual
MUST/SHOULD contract strength, the distinction between signal boundaries and DDD
contexts, and conditional preservation of an initial error when cleanup also
fails. These are corrections to research, not implementation approvals.

Publication validation and exact archive identity are recorded in the delivery
section below after the governed documents are complete. Frozen third-party
source caches are not redistributed; source commits, blob IDs, URLs and findings
are sufficient to locate the inspected evidence.

## Adjacent data-plane case evidence

Author: root researcher. Status: retained research, not adoption.
Scope: read-only primary docs, exact released source, and selected unrun upstream
tests. No investigated framework was installed or executed. Confidence
below concerns source support, not reliability or performance of our future system.

### Source identity and release relationship

| Case | Technology and actual unit | Inspected release source | Moving head observed, not substituted |
| --- | --- | --- | --- |
| DP-01 OpenTelemetry Collector | Go; receiver, processor, exporter, connector, extension; compiled distribution plus configured pipeline instances | v0.164.0 / stable module set v1.70.0 at f532e15ef29b6ed7fefad2b23a0fefd27120ef9b; [release published 2026-10-26](https://github.com/open-telemetry/opentelemetry-collector/releases/tag/v0.164.0) | main 79bf8a49d2e4556e3aa72ac36e3b1e460a176ac1 on 2026-11-05 |
| DP-02 Apache APISIX | Lua/OpenResty; named plugins whose phase handlers act on configured routes/services/consumers; separate external-runner/Wasm options | 3.19.0 at 473043623c161966f3f6ef4e8f12d2d8667a12d2; [release published 2026-09-28](https://github.com/apache/apisix/releases/tag/3.19.0) | master 7f7b7a0ba8adadd2e9a937ae8839ad8fa28639e7 on 2026-11-05 |

Sources were retrieved on 2026-11-05 UTC. The companion JSON ledger retains file
blob IDs and immutable source URLs. Public documentation is mutable unless its
repository version is also pinned. Neither inspected release is selected as a
dependency of Agent Teams.

### DP-01: OpenTelemetry Collector

**Question.** What can a typed, large component ecosystem teach us about
composition, shared instances, startup/drain order and bounded reload?

#### Documented contract and inspected implementation

1. **Distinct roles and instance identity.** Collector separates receivers,
   processors, exporters, connectors and extensions. A configuration key has a
   component type and optional instance name. The configuration graph is a data
   path, not a universal container. Its builder can assemble a distribution from
   upstream and custom Go modules without forking the Collector source.
   [Architecture][ot-architecture], [Builder guide][ot-builder-guide],
   [pinned builder README][ot-builder].

2. **State sharing is explicit and asymmetric.** Graph creation reuses a
   receiver/exporter node for the same signal and component ID; processor nodes
   incorporate pipeline identity. Thus the same processor configuration used in
   two pipelines creates distinct processor instances, while a shared receiver
   fans out. This is more precise than saying all components are singletons or
   all pipelines are isolated. The factory may itself retain additional shared
   state; this inspection does not prove absence of globals in every component.
   [Graph createReceiver/createProcessor/createExporter][ot-graph],
   [Architecture][ot-architecture].

3. **Startup and shutdown ordering follow data dependencies.** StartAll traverses in
   reverse topological order and explicitly places receivers after non-receivers
   so shared eager receivers do not send into an unstarted downstream path.
   ShutdownAll uses forward order, retains downstream consumers while upstream
   drains, and accumulates shutdown errors. This supplies ordering, not proof
   that a particular component fulfills its shutdown contract. Start may return
   before background startup finishes, so ordering is not a universal operational
   readiness guarantee. The product's actual readiness predicate remains separate.
   [Graph StartAll/ShutdownAll][ot-graph].

4. **The lifecycle contract names cleanup obligations.** Component.Shutdown must
   tolerate no prior Start and repeated shutdown and abort background work before
   returning. The source uses should for stopping data acceptance and flushing
   buffers; do not silently strengthen those clauses into universal enforcement.
   A later lifecycle uses a
   new component. Factory.CreateDefaultConfig must support repeated creation
   without disruptive side effects. These are explicit component obligations;
   a function signature cannot enforce honest completion.
   [Component interface][ot-component].

5. **Dependency ordering and readiness are distinct.** Extensions declare
   dependencies through an optional capability; computeOrder rejects missing
   dependencies and cycles. Start uses that order; shutdown reverses it.
   PipelineWatcher readiness notifications are separate from extension startup.
   This is not evidence that an arbitrary TS callback can safely discover or
   rebind dependencies at runtime.
   [Extension graph][ot-ext-graph], [Extensions][ot-extensions],
   [Service startup/shutdown][ot-service].

6. **A synchronous fan-out shares a blockage boundary.** The architecture
   documentation explicitly warns that a blocking processor can stall its shared
   receiver's other pipelines. The inspected traces fan-out invokes consumers
   synchronously; it separates mutable/readonly consumers and clones only when
   necessary. This is a deliberate throughput/ownership tradeoff, not a newly
   discovered Collector defect. It explains why module count, instance count,
   pipeline count and independently isolated work are different quantities.
   [Architecture][ot-architecture], [Traces fan-out][ot-fanout].

7. **Reload is profile-specific.** Released source includes partial receiver
   reload, gated by service.partialReload (Alpha) and
   service.partialReloadReceivers (Beta). It leaves other graph component kinds
   untouched, shuts down changed receivers, then rebuilds/starts them. The
   collector attempts a full service reload if an attempted partial reload
   fails, explicitly because the graph may be partially modified. That fallback
   can also fail and is not guaranteed restoration of the predecessor. This is
   neither a universal hot-swap guarantee nor old-generation-keeps-serving on
   every failure. Do not describe this release as static-only either.
   [Service gate][ot-service], [generated gate declarations][ot-gates], [UpdateReceivers][ot-graph],
   [reloadConfiguration/tryPartialReceiverReload][ot-collector].

#### Inspected unrun tests and historical correction

TestSharedReceiverStartOrder constructs an eager shared receiver and exporters
that reject use before startup; it checks successful startup across ten ID/order
variations. The same pinned test file explicitly asserts removal/rebuild shutdown,
build and start failure paths for UpdateReceivers. These are inspected upstream
assertions, **not test executions by this research** and not our E2E coverage.
[Graph tests][ot-tests].

The official connector tutorial describes the older practice in which processors
directly exported newly generated signals, crossing their intended role. It
records deprecation/replacement by connectors. This is an acknowledged historical
architecture correction, not a claim that the current connector implementation
still has the old defect. [Connector tutorial][ot-connectors].

#### Conditional transfer and failure of the analogy

- **Unadopted hypothesis DP-01-H1:** product-owned call/data flow should make
  instance sharing, mutable ownership and downstream readiness explicit.
  GM already owns neutral composition; copy no new graph implementation into EF.
  The Collector's telemetry fan-out is not proof of desired agent tool scheduling.
- **Unadopted hypothesis DP-01-H2:** qualify controlled restart against an actual
  ingress-to-downstream dependency chain, with an eager ingress and failure
  during cleanup. Product/execution owners retain physical custody. The
  component contract may inform test questions, not certify our restart.
- **Unadopted hypothesis DP-01-H3:** use a dedicated boundary for an actual
  cross-signal/pipeline transformation rather than let a processor reach around
  its contract. A telemetry connector is not itself evidence of a DDD bounded
  context. DDD does not imply making every transform a package or a module.

**Minimal possible falsifiers, not scheduled/executed:** these apply only to an
explicitly promised property. Declared shared backpressure is not a defect, and
controlled restart need not preserve uninterrupted old availability. A blocked downstream
callback delays an unrelated product request despite a claimed isolation
boundary; an eager producer runs before its real consumer is ready; a shutdown
error is reported as successful retirement; a component sharing profile makes an
otherwise local mutation visible to another tenant. Each scenario needs the
real proposed product contract before a useful test can be written. No generic
Collector reimplementation or benchmark is warranted by this evidence.

### DP-02: Apache APISIX

**Question.** What do phase-oriented customization, configuration precedence and
hot loading really promise, especially when transferred to third-party plugins?

#### Documented contract and inspected implementation

1. **A plugin has a named schema and phase handlers.** The development guide
   describes unique plugin names, explicit priorities and JSON-schema validation;
   higher priority runs first within a phase. Lifecycle phases have protocol
   meaning. A plugin priority cannot turn arbitrary before/after relations into
   a validated dependency graph. [Plugin development][ap-dev].

2. **Ordering and configuration precedence are separate policies.** Global-rule
   and local instances can both execute. Among local configurations of the same
   plugin, the documented precedence is Consumer, Consumer Group, Route,
   Plugin Config, Service; this selects one local configuration. A per-instance
   _meta.priority overrides execution order with documented phase exceptions.
   The terminology document makes these policies discoverable rather than
   leaving authors to infer object merging. [Plugin terminology][ap-docs].

3. **Loading is executable.** load_plugin calls require before checking exported
   priority, version and schema; it then calls init where applicable. The same
   source explicitly avoids running stream-plugin initialization in the HTTP
   subsystem used for Admin schema validation. This is a concrete protective
   distinction, but require itself is not inert metadata discovery.
   [load_plugin][ap-plugin].

4. **The observed reload is not a prepare-then-publish generation protocol.**
   For the inspected Lua path, load iterates old entries through unload_plugin,
   which calls optional destroy and clears package.loaded, clears plugin tables,
   then loads new modules. A require failure is logged and that plugin is not
   inserted. That local path does not preserve the old initialized plugin until
   the replacement is validated. We did not execute reload, inspect every caller,
   or establish outage/effect behavior for the complete distributed deployment.
   The docs' hot-loading support is real; its guarantee is narrower than
   universal seamless replacement. [Plugin loader][ap-plugin], [Hot reload docs][ap-docs].

5. **Trust is an explicit deployment assumption.** The threat model treats the
   administrator, supplied Lua and external plugin runner as operator-trusted.
   Lua handlers run in a privileged worker context; an external process is not
   automatically a hostile-user sandbox. This is an intentional model suitable
   for operator configuration, not a promise of arbitrary marketplace-code
   containment. [Pinned threat model][ap-threat].

6. **Deep no-fork customization can expose unstable surfaces.** The development
   guide offers lua_module_hook to override a method and extra loading paths.
   Such escape hatches are useful for controlled deployments. Inference: if our
   ordinary plugin authors depend on private method replacement, upgrades and
   authorization invariants become harder to preserve. This does not establish
   that every APISIX use of the hook is unsafe or that its supported plugins
   depend on monkey patching. [Plugin development][ap-dev].

#### Benefits, costs and transfer limits

- Explicit phases, schemas, selected local configuration and inspectable
  priorities give users concrete customization handles. The cost is needing to
  understand both scope precedence and phase execution. Arbitrary numbers alone
  do not explain semantic dependencies or authorization.
- The reload path is simple for trusted Lua modules and supports rapid changes.
  Its teardown-before-load behavior cannot be cited as evidence that a failing
  candidate always leaves old service untouched. NGINX worker replacement and
  this Lua package reload are different mechanisms in the same broader stack.
- The API gateway's trusted operator and request-phase model is narrower than
  our intended large third-party ecosystem. No claim about thousand-plugin
  capacity, hostile isolation, or superiority is supported by these files.

**Unadopted hypothesis DP-02-H1:** a product extension point should say whether it
adds contributions, selects one provider, wraps an operation or transforms data.
Its conflict policy should be visible to the author. GM owns neutral binding
semantics; product owners define meaning; EF does not acquire a global priority
registry.

**Unadopted hypothesis DP-02-H2:** ordinary customization should use stable owned
ports/configuration and explain the effective selection, avoiding dependency on
private method patching. The decision about a specific supported seam still
belongs to that product and owner.

**Minimal possible falsifiers, not executed:** first specify the selected
tie/failure/availability policy; controlled restart may permit interruption.
Permuting equally eligible
providers changes security-sensitive behavior without a declared policy; an
ordinary plugin can bypass the authorization owner through a wrapper; a failed
candidate load destroys an otherwise promised active implementation; a plugin
excluded from executable discovery still runs code despite that explicit promise.
APISIX's request-time _meta.disable only skips execution in the configured
request path and is not such an excluded-loading promise. These are questions for
a concrete proposed profile, not facts about every APISIX configuration.

### Cross-case caution

The word “plugin” describes different boundaries even in these two systems.
Collector compile-time distribution membership, configured component instances,
APISIX phase handlers and external runner placement are not interchangeable.
The transferable unit is a precise contract with preconditions and failure
semantics. Research can narrow future choices; it does not choose the mechanism.

No production/integration/test LOC is committed by these hypotheses. A meaningful
estimate must name a real product seam, owner, required observable behavior and
deployment profile. Do not manufacture a framework implementation estimate from
a read-only source comparison.

[ot-architecture]: https://opentelemetry.io/docs/collector/architecture/
[ot-builder-guide]: https://opentelemetry.io/docs/collector/extend/ocb/
[ot-builder]: https://github.com/open-telemetry/opentelemetry-collector/blob/f532e15ef29b6ed7fefad2b23a0fefd27120ef9b/cmd/builder/README.md
[ot-graph]: https://github.com/open-telemetry/opentelemetry-collector/blob/f532e15ef29b6ed7fefad2b23a0fefd27120ef9b/service/internal/graph/graph.go
[ot-component]: https://github.com/open-telemetry/opentelemetry-collector/blob/f532e15ef29b6ed7fefad2b23a0fefd27120ef9b/component/component.go
[ot-ext-graph]: https://github.com/open-telemetry/opentelemetry-collector/blob/f532e15ef29b6ed7fefad2b23a0fefd27120ef9b/service/extensions/graph.go
[ot-extensions]: https://github.com/open-telemetry/opentelemetry-collector/blob/f532e15ef29b6ed7fefad2b23a0fefd27120ef9b/service/extensions/extensions.go
[ot-service]: https://github.com/open-telemetry/opentelemetry-collector/blob/f532e15ef29b6ed7fefad2b23a0fefd27120ef9b/service/service.go
[ot-gates]: https://github.com/open-telemetry/opentelemetry-collector/blob/f532e15ef29b6ed7fefad2b23a0fefd27120ef9b/service/internal/metadata/generated_feature_gates.go
[ot-fanout]: https://github.com/open-telemetry/opentelemetry-collector/blob/f532e15ef29b6ed7fefad2b23a0fefd27120ef9b/internal/fanoutconsumer/traces.go
[ot-collector]: https://github.com/open-telemetry/opentelemetry-collector/blob/f532e15ef29b6ed7fefad2b23a0fefd27120ef9b/otelcol/collector.go
[ot-tests]: https://github.com/open-telemetry/opentelemetry-collector/blob/f532e15ef29b6ed7fefad2b23a0fefd27120ef9b/service/internal/graph/graph_test.go
[ot-connectors]: https://opentelemetry.io/docs/collector/extend/custom-component/connector/
[ap-dev]: https://github.com/apache/apisix/blob/473043623c161966f3f6ef4e8f12d2d8667a12d2/docs/en/latest/plugin-develop.md
[ap-docs]: https://github.com/apache/apisix/blob/473043623c161966f3f6ef4e8f12d2d8667a12d2/docs/en/latest/terminology/plugin.md
[ap-plugin]: https://github.com/apache/apisix/blob/473043623c161966f3f6ef4e8f12d2d8667a12d2/apisix/plugin.lua
[ap-threat]: https://github.com/apache/apisix/blob/473043623c161966f3f6ef4e8f12d2d8667a12d2/docs/en/latest/security-threat-model.md

## Evidence files and delivery

The [agent ledger](evidence/plugin-frameworks-20261105-agent-sources.json),
[specialist ledger](evidence/plugin-frameworks-20261105-specialist-sources.json)
and [data-plane ledger](evidence/plugin-frameworks-20261105-data-plane-sources.json)
are directly available to agents: 152 ID-bearing records across 14 cases, plus
three additional moving-document observations and separate release metadata.
Record count is not a number of independent confirmations or a quality score.

The [research and critique archive](evidence/plugin-frameworks-20261105.tar.gz)
and [member manifest](evidence/plugin-frameworks-20261105.json) retain 51 regular
files: full reports, source ledgers, six research critique reports from four critics,
review dispositions, publication navigation/failure reviews, initial interpretations and
actual authoring/preflight logs. The manifest records the archive SHA-256,
every member's SHA-256 and byte size, task base and policy snapshot identity.
The exact member set, sizes, digests and three direct ledger copies were verified.

Archive SHA-256:
`9fa12b60c726c12910e09775bb1b6da3f44da5fdcae0cc78a807112e89b402bb`.

The original authoring transaction failed final stable verification after an
ordinary edit overlapped its create operation. Normal recovery then refused a
pre-existing orphan temporary artifact. The affected checkout and diagnostics
were preserved. Publication used a separate checkout of the same exact base,
normal sequential Docs Protocol previews/applies and unchanged frozen tooling;
its doctor reports idle. No transaction evidence was manually altered. The
archive's review dispositions describe this authoring incident and its limits.

The first full documentation gate subsequently passed seven of eight contract
tests; a fixture apply exceeded its unchanged 120-second child-process timeout.
The log, initial Git tree receipt and separate identity of an untracked tool
artifact copied into that fixture are retained. The cause remains unresolved.
A separate clean checkout with the same frozen tools, scripts and timeout then
reported four contract passes, but its execution session became unavailable
without a terminal summary or exit code. That full local result is indeterminate;
it is not a reproduced assertion failure or a demonstrated environmental cause.
Both attempts and their distinct inputs are retained. The authorized research
draft uses the existing hosted full gate at its actual final commit/tree for
qualification; no third local rerun or weaker gate is introduced.

Preflight verified the bounded documentation context, a complete 84-document
catalog and zero Markdown/spelling issues across 90 files. Final publication
uses the full `pnpm docs:protocol:check` gate and exact-head hosted checks; the
[continuing draft PR](https://github.com/agent-teams-ai/extension-foundation/pull/55)
records their concrete results and published head. Existing legacy Foundation
1.7.2 / API Extractor 7.58.12 / embedded TypeScript 5.9.3 cannot be initialized
under the current TS7.0.2+ rule. Its owning upgrade remains outside this research
slice; the independent documentation gate and green hosted results do not resolve
that already recorded toolchain gap.

No investigated framework or proposed falsifier was executed in this follow-up.
New production, product-integration and test implementation: **zero lines**.
The preceding packed-consumer E2E retains its own unchanged inputs and qualified
scope; these source inspections do not extend it to a production Host or fleet.
