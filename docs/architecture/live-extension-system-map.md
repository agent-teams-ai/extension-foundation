---
id: architecture.live-extension-system-map
type: architecture
status: proposed
owner: architecture
summary: Maps the current module, plugin and live-update direction to accepted owners, research evidence and unresolved decisions.
---

# Live Extension System Map

<!-- cspell:words Piral pilets OpenComponents Wasmtime Comlink Piscina Yjs -->

## Purpose

**Current navigation: 2026-11-27; recorded direction and evidence retain their dates.** Start here to understand what we have concluded
about modules, distributable plugins and live replacement. This map routes to
the owning decisions and evidence; it does not create another decision authority.
Its proposed status reflects the unresolved contracts it describes, not a
reopening of the accepted constraints or owner-confirmed direction below.

| Need | Read next |
| --- | --- |
| Current purpose, boundaries and integration candidates | This map |
| EF plugin-specific delivery and open contracts | [Plugin Delivery Plan](plugin-delivery-plan.md) |
| Qualify before applications; Browser/Desktop/trust and UI seams | [Fixture and UI evidence](plugin-delivery-plan.md#fixture-and-ui-evidence-2026-11-24) and [owner clarification](../open-decisions/OD-003-module-runtime-and-public-spi-choices.md#fixture-first-and-runtime-boundary-clarification-2026-11-24) |
| Shared foundation sequence and implemented operation | [LMU delivery plan](https://github.com/agent-teams-ai/live-module-updates/blob/47c17f95f7c8cf3650c907ac4ed52d6127febe5c/docs/plans/foundation-delivery-plan.md) and [usage contract](https://github.com/agent-teams-ai/live-module-updates/blob/47c17f95f7c8cf3650c907ac4ed52d6127febe5c/docs/architecture/cooperative-operation-usage.md), reviewed source in [PR #9](https://github.com/agent-teams-ai/live-module-updates/pull/9) |
| Exact owner confirmations and unresolved policy | [OD-003](../open-decisions/OD-003-module-runtime-and-public-spi-choices.md) |
| Independent documentation audit and readiness method | [Documentation audit](../research/live-extension-documentation-audit-2026-11-23.md) |
| Full library features and evidence | [Standalone blueprint](../research/standalone-live-plugin-library-blueprint-2026-11-22.md) and [reliability study](../research/live-update-reliability-and-industry-evidence-2026-11-22.md) |
| Industry findings and historical corrections | [Research reference](../research/plugin-system-research-reference.md) |
| Ready stacks and practical differentiation | [Complete-scenario comparison](../research/live-update-ready-stack-comparison-2026-11-23.md) |
| Seven owner alternatives | [Decision matrix](../research/module-federation-update-boundaries-and-architecture-options-2026-11-22.md#owner-decision-matrix) |

Use four distinct labels: **accepted constraint** refers to an effective ADR;
**owner-confirmed direction** records the owner's design intent; **proposal**
needs its stated qualification or decision; **executed evidence** proves only
the recorded fixture and runtime profile. Source review is neither execution
nor adoption. Do not convert a recommendation into a default through this map.

## Qualified implementation checkpoint, 2026-11-27

The [contribution core](../../packages/core/README.md) and
[verified Node artifact adapter](../../packages/node-artifact/README.md) are
implemented private `0.0.0` packages under
[ADR-0016](../decisions/0016-provisional-contribution-and-verified-artifact-packages.md).
LMU supplies an implemented private cooperative operation; its
[usage contract](https://github.com/agent-teams-ai/live-module-updates/blob/47c17f95f7c8cf3650c907ac4ed52d6127febe5c/docs/architecture/cooperative-operation-usage.md)
owns the actual API and Host obligations.

| Qualified subject | Exact executed evidence | Scope |
| --- | --- | --- |
| EF source `4990f1f5047ef4b71e95aa74eba86fc646e84e35` | [Run 45918944244](https://github.com/agent-teams-ai/extension-foundation/actions/runs/45918944244) and [source-bound report](../research/packaged-foundation-qualification-2026-11-26.md#final-source-qualification-successor-2026-11-27) | Actual packages, installed consumers, native artifact verification and the existing qualification suite; managed admission remains a separate gate |
| Combined EF-to-LMU source `47c17f95f7c8cf3650c907ac4ed52d6127febe5c` | [Run 45916966246](https://github.com/agent-teams-ai/live-module-updates/actions/runs/45916966246) and [retained receipt artifact 15163076062](https://github.com/agent-teams-ai/live-module-updates/actions/runs/45916966246/artifacts/15163076062) | Five signed/refused Node scenarios through the original qualified EF archive and installed LMU operation; useful B, retained A and native cleanup |

The [owning qualification record](../research/packaged-foundation-qualification-2026-11-26.md#handoff-and-remaining-exits)
retains exact input identities and limits, including the absence of a joint
staging-failure recovery test. These results do not assert merged PRs, public npm
publication, a stable public SPI, durable installation, production Host adoption
or hostile-code containment. The historical research below retains its original
inputs and outcomes.

## Where we have arrived

The following direction is already recorded in
[OD-003's November 22 confirmations](../open-decisions/OD-003-module-runtime-and-public-spi-choices.md#owner-confirmed-architecture-and-deeper-qualification-2026-11-22)
and [expanded live application vision](../open-decisions/OD-003-module-runtime-and-public-spi-choices.md#owner-prioritized-live-application-platform-vision-2026-11-18).

1. Build a purpose-neutral **standalone library in a separate repository**.
   This is a substantial reusable concern, not an estimate for a small adapter.
   The [Live Module Updates repository](https://github.com/agent-teams-ai/live-module-updates)
   now contains the private cooperative implementation and qualified fixtures
   linked above. Its original transfer package is preserved below; production
   adoption retains the consuming owner's separate qualification.
2. Start with a **TypeScript control library and ordinary TypeScript plugins**.
   Wasm/Extism and native Effect are separate optional profiles. No particular
   engine, mandatory Effect dependency or production adapter is selected.
3. Put the **complete update operation in the library**: planning, preparation,
   authoritative switching, reconciliation, cleanup coordination and observable
   results. Consumers supply narrow primitives rather than reassemble the flow.
4. Keep business contracts, grants, canonical state and operational authority
   with the consuming product. Reusing the operation implementation does not
   create a second active-head, lifecycle, permission or state authority.
5. Support meaningful frontend and backend changes while the application remains
   useful. Eligible built-in features and durable, reusable/shareable authored
   plugins are part of the vision. Supported replacement boundaries remain
   explicit; not every internal helper becomes a plugin.
6. Make update impact, actual useful adoption, remaining old work and cleanup
   visible. A target revision, selected generation, useful result and completed
   retirement are distinct observations.
7. Reuse existing composition, loaders, execution, resource scopes and state
   mechanisms. A missing end-to-end contract can justify coordination; it does
   not justify implementing another graph engine or runtime.
8. Qualify the foundation on realistic fixtures and independent test Hosts now,
   without waiting for the intended applications. Browser, Desktop and
   untrusted plugins constrain boundaries from the start; exact execution,
   containment and later adoption claims retain separate evidence. Reuse UI
   libraries behind presentation adapters without building another widget
   engine or coupling portable business contracts to a frontend framework.

The earlier controlled-restart baseline still has its accepted delivery scope.
The later live-evolution direction extends the design target; a passing research
probe does not silently replace a production owner's accepted mechanism.
The fixture-first clarification changes the order of design and qualification,
not production authority or immutable admission requirements. The
[plugin delivery plan](plugin-delivery-plan.md#runtime-and-trust-boundaries-required-from-the-start)
owns the current target-specific obligations. Dated earlier proposals remain
research inputs; their first-product assumptions are not current prerequisites
for beginning this bounded fixture work.

## Boundaries

### Modules, plugins and live replacement are related, distinct concerns

Architectural roles are also distinct: a **feature** groups behavior for one
owner; an **ordinary library core** supplies reusable behavior; a **module
adapter** connects that behavior to composition; a **package** has an explicit
release/dependency boundary; a **plugin artifact** has independent distribution
and admission lineage. One feature may use several packages, and a package need
not be a plugin. ADR-0015 retains this role discipline from ADR-0013; no new
public descriptor is introduced here.

| Concern | Meaning in this system | Relationship |
| --- | --- | --- |
| Module composition | Declared capabilities, implementations, slots, bindings and a validated dependency plan | Get Modular supplies the neutral semantics; a product supplies its declarations |
| Plugin distribution | An independently distributable implementation with artifact/admission/installation lineage | A plugin may contribute implementations to several narrow product contracts |
| Execution generation | One admitted executable and dependency cohort with a lifetime and recorded identity | The same artifact may create another generation; artifact, plan and active-head identities do not collapse |
| Live update | An authorized transition between supported generations or contribution groups | Uses composition, loaders, execution and state boundaries; module delivery alone does not perform the whole transition |
| UI composition | Registering, mounting, updating and unmounting product contributions | Can reuse an existing framework without transferring business state or update authority to that framework |

An internal adapter can remain built in. A distributed plugin can contain several
adapters. A built-in feature can be managed through the same eligible semantic
boundary without becoming an OCI artifact. See the accepted
[extension model](extension-model.md) and
[ADR-0014](../decisions/0014-product-local-module-authoring-composition-and-generation-guardrails.md).

### Authority and reusable implementation

| Owner | Responsibility | Boundary to retain |
| --- | --- | --- |
| Get Modular | Neutral composition, typed construction, public resource mechanisms and separately qualified lifecycle primitives | No product permission, executable discovery, durable active head or physical supervisor |
| Extension Foundation | Artifact/trust/distribution vocabulary, admitted host obligations and separately qualified conformance primitives | No product domain model, duplicate composition core or universal plugin interface |
| Live Module Updates | Private implementation of the finite cooperative update operation, including preparation, publication, reconciliation and retirement | Invokes the actual authority/custody owners; does not duplicate their canonical records or kernels |
| Consuming product | Business extension contracts, concrete declarations, policy/grants, canonical state, authoritative publication and recovery decisions | Supplies narrow primitives; does not have to rebuild the library's update flow |
| Existing execution/resource owner | Actual native scope release, process/thread lifecycle and physical stop evidence; Agent Runtime in its admitted product profiles | A library callback or loader result cannot invent a stronger stop/cleanup receipt |

The accepted EF and Get Modular cores remain independent. A consuming adapter
may use both under [ADR-0015](../decisions/0015-authorize-get-modular-semantic-extraction.md).
The standalone operation is another implementation concern, not a new
dependency edge between those cores.

OCI/ORAS/Cosign and digest-pinned admission remain the accepted EF artifact
profile. The portable library does not require every ordinary external consumer
to install the Agent Teams catalog, PostgreSQL schema or runtime. An EF-admitted
consumer still applies its actual artifact and authority rules.

## Structure

Continue the shared operation and authoring design in the
[Live Module Updates foundation plan](https://github.com/agent-teams-ai/live-module-updates/blob/47c17f95f7c8cf3650c907ac4ed52d6127febe5c/docs/plans/foundation-delivery-plan.md)
and [headless plugin/UI proposal](https://github.com/agent-teams-ai/live-module-updates/blob/4cf4ca714f7ec6788417fcda1a75677615827dff/docs/architecture/headless-plugins-and-ui.md).
The EF [plugin delivery plan](plugin-delivery-plan.md) retains its own artifact,
trust, installation and host-admission responsibilities.
The local [complete operation contract](live-module-update-operation.md) and
[design validation record](../research/live-module-update-design-validation-2026-11-23.md)
retain the November 23 design/evidence snapshot; neither is a second current
implementation roadmap or a published production API.

### Complete operation, narrow consumer primitives

This table maps responsibilities across profiles; the implemented finite
cooperative profile uses LMU's linked usage contract. Broader profiles still
need their own qualification. The [reliability study](../research/live-update-reliability-and-industry-evidence-2026-11-22.md)
retains the earlier failure cases and native mechanism evidence.

| Library responsibility | Reused mechanism or consumer primitive | Result that needs observation |
| --- | --- | --- |
| Plan affected changes | Existing composition/dependency semantics, feature compatibility and grants | Exact affected group, supported mode, predecessor and state consequences |
| Prepare a candidate | Selected loader/executor, resource acquisition and readiness checks | Qualified candidate or a failed preparation with owned cleanup debt |
| Request switching | Owner's atomic expected-revision publication and exact attempt identity | Committed, rejected/conflicting, or explicitly unknown publication result |
| Reconcile uncertainty | Owner's authoritative outcome lookup; durable recovery facts where the selected restart-recovery profile requires them | Recover the same attempt before retrying or destroying a possibly active candidate |
| Preserve admitted work | Selected operation/dependency affinity and receiver-owned write authority | Old work completion or an explicitly authorized interruption outcome |
| Retain and retire | Existing resources, executor stop, state/history and artifact-retention owners | Concrete remaining holds, cleanup debt and observed retirement eligibility |
| Explain progress | Correlated observations and product presentation | Requested, selected, useful and cleaned states remain distinguishable |

Candidate callbacks never run inside a product database transaction. A timeout
does not decide whether publication or an external effect committed. Returning
to old code is another authorized transition with current state compatibility,
not a rewind of permissions or external effects.

### Module-format and execution-profile register

The mechanisms mentioned in competitor research are **not one list of
interchangeable runtimes**. A profile may combine several of these layers. The
register describes integration seams to evaluate, not promised adapter packages.

| Mechanism | Architectural role | Current project status | Integration direction to evaluate |
| --- | --- | --- | --- |
| Ordinary TS/JS | Plugin implementation and host execution | First profile is owner-confirmed; final production host contract remains open | Use the selected host's normal build/load path; no Wasm requirement |
| Native ESM | Module linking/loading | Existing mechanism considered in loading research | Loader seam; evaluated code and retained references still have their own lifetime |
| Module Federation | Remote loading, shared dependency resolution and delivery metadata | Deep source study plus four bounded native browser tests; no adopted production adapter | Optional loader/delivery integration; UI and resource lifecycle remain explicit |
| Native Federation | ESM/import-map federation and build/runtime integration | Researched candidate; not selected or executed by this project | Optional loader/build integration after version, compiler and dependency compatibility checks; the name does not mean a native machine-code runtime |
| Piral pilets and Piral Cloud | Application-shell contribution contracts plus discovery/delivery of multiple formats | Researched ready-stack alternative; no adopted adapter contract | Integrate an existing shell/feed when a real consumer needs it; do not put its UI types in the neutral core |
| OpenComponents | Versioned UI component registry and rendering/client lifecycle | Researched ready-stack alternative; no adopted adapter contract | A UI/delivery adapter for that consumer cohort, not a substitute for every backend plugin profile |
| SystemJS | Module loading and binding mechanics | Two bounded Node tests; no whole-library qualification | Optional loader integration where rebinding is actually required |
| Wasm Component Model, jco, Wasmtime | Language-neutral component contracts, tooling and execution | Retained TS/Rust through jco/generated JS; no native Wasmtime run implied; final engine and binding profile remain open | Reuse component tooling behind a qualified execution boundary |
| Extism | Ready Wasm plugin runtime/SDK family with its own host/guest contract | Explicit owner-named candidate; retained bounded experiments and declaration gaps | Optional execution profile; do not assume it is the same ABI as Component Model |
| Native Effect | Native requirements, concurrency and resource lifetime | Owner-confirmed optional profile; the new app's Effect choice is separate | Preserve native errors, interruption and scopes; no Promise wrapper claiming equivalent semantics |
| Temporal or another already admitted durable engine | Durable scheduling/recovery for a product-authorized update | Optional rollout mechanism in the recorded deployment scope | Reuse its durable execution when needed; keep ordinary plugin invocation separate |

MF/Piral/Native Federation/OpenComponents therefore intersect the plugin design
through delivery, loading and contribution lifecycle. Their discovery formats do
not replace Get Modular's business-capability graph. They can be dependencies
inside an optional adapter when selected, rather than mandatory dependencies of
every consumer. Adapter availability, public contracts and conformance must be
recorded before advertising support.

See the [Federation study](../research/module-federation-update-boundaries-and-architecture-options-2026-11-22.md)
and [ready-stack comparison](../research/live-update-ready-stack-comparison-2026-11-23.md)
for exact source/package cohorts and the proposed common scenario. In particular,
Native Federation's inspected v4 build core has a TS <7 dependency, and
OpenComponents browser and Node-client versions must not be conflated. Neither
is silently adopted under our compiler policy.

## Operational implications

### State and old-version lifetimes

| Subject | Required distinction | Owning evidence or open choice |
| --- | --- | --- |
| Durable business data | Product-owned canonical data is not plugin cache | Accepted custody constraints; feature migration still requires its own contract |
| Dirty draft/document | Preserve, transform or discard must name the subject and authorization | State-continuity Q3; native Yjs/React/CodeMirror evidence is profile-specific |
| Undo, focus, selection and IME | Each has its own continuity and reconstruction behavior | Rich continuity must be separately specified; actual OS IME remains unqualified |
| Old operations and streams | Accepted work can outlive the active version | Q5 chooses the policy; operation boundaries and receiver authority remain explicit |
| Resource cleanup | A finalizer call, request to stop and observed stop are different facts | Existing resource and executor owners; unresolved cleanup remains visible |
| Artifact retention | Old bytes may be needed for rollback, lazy loading, offline clients, replay or query | Q6/Q7 and actual storage/history owners; no single live-instance count proves deletion eligibility |
| Disable/remove/reset | Disable contribution, remove executable installation, retire a generation and delete user data are different actions | User data deletion is never an implicit consequence of ordinary plugin removal |

Retention needs reasons and budgets. A new version can be useful while the old
one is still draining or held for history. Clearing one hold does not clear the
others. The library should expose the remaining owner, reason and allowed action
without inventing a second canonical state store.

### Reuse warnings that must survive implementation

Before adding a mechanism, consult the full
[24-warning register](../research/reuse-first-live-plugin-updates-2026-11-22.md#reuse-warnings-to-carry-into-the-review)
and name the missing capability. The important categories are:

- Reuse Get Modular composition and qualified resource/lifecycle primitives;
  do not copy private internals or create another dependency graph authority.
- Reuse ESM, Federation/SystemJS, existing build tools and artifact clients;
  cache replacement is not an application cleanup protocol.
- Reuse native Effect scopes, Workers/processes or fitting Comlink/Piscina
  mechanics within their actual semantics; transport disposal is not necessarily
  observed execution or host-effect completion.
- Reuse the consumer's editor/history, storage/migration and durable workflow
  mechanisms; the library coordinates their contracts rather than inventing
  a universal serializer, undo stack, transaction manager or workflow engine.
- Keep candidate side effects, actual useful output, old callbacks, shared
  dependencies, uncertain commits and retry safety in the conformance cases.
  A familiar framework lifecycle label is not a stronger receipt by itself.

### Evidence and remaining delivery

| Area | Durable evidence entry | Limit to retain |
| --- | --- | --- |
| Static composition and controlled restart | [Validation and authority](../research/static-composition-and-controlled-restart-validation.md) | Confirmed baseline with its declared product scope |
| Live frontend/backend and cross-language execution | [November 18](../research/live-application-evolution-vision-and-executed-spikes-2026-11-18.md), [November 21](../research/live-update-policies-and-portable-runtimes-2026-11-21.md) | Bounded native fixtures; no generic public SDK or universal migration |
| Resources, state/history and failure recovery | [Blueprint](../research/standalone-live-plugin-library-blueprint-2026-11-22.md), [reliability study](../research/live-update-reliability-and-industry-evidence-2026-11-22.md) | Real mechanism evidence and retained failures; no complete production-library claim |
| Federation and rebinding | [MF/SystemJS study](../research/module-federation-update-boundaries-and-architecture-options-2026-11-22.md) | Four browser and two Node tests, with exact input/version boundaries |
| November 23 standalone handoff | [Live Module Updates project](../research/evidence/live-module-updates-standalone-20261123.tar.gz), [manifest](../research/evidence/live-module-updates-standalone-20261123.manifest.json) and [delivery validation](../research/evidence/live-module-updates-standalone-20261123.validation.json) | Frozen specification, bounded native results and ten immutable source-packet routes; the separate repository now exists, while production qualification remains outstanding |
| Historical standalone evidence | [532-file base manifest](../research/evidence/standalone-live-library-deepening-20261122.manifest.json) and [167-file supplement manifest](../research/evidence/module-federation-research-supplement-20261122.manifest.json) | Separate immutable sibling packets, not an overlay; [earlier transfer seed](../research/evidence/standalone-live-library-transfer-20261122.manifest.json) remains historical |
| Public lifecycle mechanisms | [Piral, Resources and Effect design validation](../research/live-module-update-design-validation-2026-11-23.md#observed-native-results) | Three tests, six cases and 66 comparisons on the frozen input; not complete-library or comparative application E2E |

Do not sum assertions, repeated attempts or corrected runs into a product test
count. Original failures and superseded source observations remain preserved.
The [documentation audit](../research/live-extension-documentation-audit-2026-11-23.md)
tracks corpus coverage and final review; a good document does not qualify the
production implementation it describes.

## Open decisions and specification work

### Separate gates

| Claim | Applicable evidence and owner |
| --- | --- |
| Ordinary reusable library slice | Concrete reusable contract and real consumer plus independent conformance for the selected scope |
| Stable Get Modular 1.0 semantics | [ADR-0015](../decisions/0015-authorize-get-modular-semantic-extraction.md#pre-10-and-stability-gates): two independently authored product adoption adapters, executable cross-consumer conformance and promotion review with immutable consumer evidence |
| Package admission in Extension Foundation | The accepted owner/admission path in the architecture overview; no empty package reservation |
| Stable public extension SPI | Separate accepted publication decision and its independent implementations/compatibility/conformance floor |
| Production extension host adoption | The owning product's admitted profile and actual authority, custody and recovery qualification |

Passing one gate does not pass all five. Static Get Modular use does not acquire
the operational production-host obligations merely through this map.

The [seven-question matrix](../research/module-federation-update-boundaries-and-architecture-options-2026-11-22.md#owner-decision-matrix)
remains the discussion entry point for additional profiles: Q1 trust, Q2 shared dependencies/update
unit, Q3 state continuity, Q4 visible adoption, Q5 admitted work, Q6 rollback
meaning and Q7 old-client support. Its conditional preferences are not defaults.

The [selected cooperative profile](https://github.com/agent-teams-ai/live-module-updates/blob/47c17f95f7c8cf3650c907ac4ed52d6127febe5c/docs/decisions/0001-cooperative-update-profile.md)
and usage contract now define the implemented finite operation, its authority,
invocation affinity, budgets and cleanup obligations. Its actual qualification
does not select those policies for streams, durable recovery, Desktop or
untrusted code. New profiles retain their own contracts and acceptance evidence.

The November 23 [audit rubric](../research/live-extension-documentation-audit-2026-11-23.md#readiness-rubric)
is a historical estimate for bounded TypeScript-first live-update planning:
vision **85–90%**, documentation **80–85%**, implementation plan **50–60%**,
with a weighted planning result of **70–75%**. It is not an overall plugin-system
readiness percentage, an implementation count or a reliability measurement.
The current private EF packages and joint operation fixture are recorded in the
dated checkpoint above. Stable SPI, production Host adoption and stronger
execution/state profiles remain separate; the historical planning percentages
do not measure the present implementation.

Update this map when an owning decision changes status or a declared profile is
qualified. Put the decision in its existing authority, the implementation contract
with its owner, and source evidence in the research family. Keep this map as the
short route to them, not another copy of every research report.

## Related decisions

- [ADR-0001: neutral ownership](../decisions/0001-product-neutral-extension-foundation-boundary.md).
- [ADR-0002: artifact distribution](../decisions/0002-oci-oras-and-cosign-distribution-baseline.md).
- [ADR-0011: admitted production-host safety floor](../decisions/0011-extension-admission-custody-and-retirement-closure.md).
- [ADR-0014: product declarations and generation guardrails](../decisions/0014-product-local-module-authoring-composition-and-generation-guardrails.md).
- [ADR-0015: Get Modular extraction](../decisions/0015-authorize-get-modular-semantic-extraction.md).
- [OD-003: current owner direction and unresolved choices](../open-decisions/OD-003-module-runtime-and-public-spi-choices.md).
