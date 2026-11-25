---
id: architecture.plugin-delivery-plan
type: architecture
status: proposed
owner: architecture
summary: Current plugin delivery responsibilities, headless boundaries, open contracts and evidence gates separate from the shared live-update operation.
---

# Plugin Delivery Plan

## Purpose

**Delivery map updated 2026-11-25.** This is the plugin-specific workstream for
Extension Foundation. The shared [foundation delivery plan](https://github.com/agent-teams-ai/live-module-updates/blob/main/docs/plans/foundation-delivery-plan.md)
in Live Module Updates owns the cross-repository sequence and proposed complete
update operation. Its proposed consolidation was published in
[PR #1](https://github.com/agent-teams-ai/live-module-updates/pull/1); the fixture-first
qualification successor was merged in [PR #2](https://github.com/agent-teams-ai/live-module-updates/pull/2)
at [`9c9952ad`](https://github.com/agent-teams-ai/live-module-updates/commit/9c9952ad1edac0c773921e6aa3db73777ce04c10).
Keep the two plans linked; do not copy the whole operation roadmap here.
The [LMU L0–L7 implementation plan](https://github.com/agent-teams-ai/live-module-updates/blob/main/docs/plans/first-operation-implementation-plan.md)
provides the shared operation steps. The [joint review record](https://github.com/agent-teams-ai/live-module-updates/blob/main/docs/reviews/implementation-plans-2026-11-25.md)
retains independent critiques and their corrections. These are current navigation
links; the source and execution baselines below retain their exact identities.

The [implementation sequence](#implementation-sequence-2026-11-25) makes the
remaining work actionable. The [qualification successor](#qualification-successor-2026-11-25)
updates current status while retaining the dated source observations below.

The owner wants user- and agent-authored plugins that persist across restart,
can be shared or transferred between applications, and can be enabled, disabled
or removed. Eligible built-in features should expose deliberate replacement
boundaries. Preserve this direction when creating new modules without treating
every helper as an independently installed plugin or promising arbitrary code
replacement. The [owner record](../open-decisions/OD-003-module-runtime-and-public-spi-choices.md)
retains the vision and the choices that remain open.

**Fixture-first clarification, 2026-11-24:** qualify the foundation through
realistic test capabilities and independent test Hosts before applications are
ready. The fixture owns a concrete semantic contract, useful operation and
observable failure cases; it need not become a product. Browser, Desktop and
untrusted extensions constrain the architecture now. Successful execution,
isolation and later product adoption each retain their own evidence.

Current implementation status is **architecture and bounded qualification
research**. The package catalog has no production packages; there is no released
public extension SPI or complete production plugin Host. Test helpers are not
shipping admission, installation or lifecycle implementations. The November 23
70–75% rubric concerns bounded live-update planning, not plugin completion.

## Boundaries

| Owner or role | Owns | Boundary |
| --- | --- | --- |
| Portable feature core | Reusable behavior and narrow semantic ports | No imports from a consuming product's internal domain model, UI framework, organization credentials, internal catalog or GM construction types |
| Get Modular | Neutral composition grammar, validation, construction and its qualified public mechanisms | No artifact trust, business grants, product canonical state or universal plugin runtime |
| Consumer composition adapter | Concrete declarations, profiles and mapping from core ports to GM and product services | Keep framework types at this edge; no second graph or service locator |
| Extension Foundation | Artifact identity, trust, distribution, installation/admission vocabulary and separately qualified extension primitives | No consumer domain model, duplicate composition core or implicit public SPI |
| Product feature and Host | Product authority, canonical state and transactions, grants, loading, admitted execution, migrations and actual custody | An artifact or successful construction does not authorize a product effect |
| Live Module Updates, proposed | Shared implementation of a supported complete update operation | Reuses the real authority, state and lifetime owners; no second canonical control plane |

The Get Modular and Extension Foundation neutral cores do not import one another
under [ADR-0015](../decisions/0015-authorize-get-modular-semantic-extraction.md).
A consumer-owned outer adapter can use both. Portable behavior is not required
to import either foundation merely to be reusable. A portable capability can
own domain and application behavior; it does not import another application's
private model or transfer that application's authority. Headless means independent
of presentation; it does not mean independent of an explicit runtime profile,
permissions, state or effects.

An ordinary reusable library, a module adapter, a released package and a plugin
artifact are distinct roles. A distributable plugin adds reviewed metadata,
artifact/admission lineage and its applicable lifecycle to reusable behavior.
One plugin can provide several narrow contributions; their ownership and
permissions do not merge into a universal `PluginContext`.

## Foundation-first decision packet, 2026-11-24

The [global owner direction](https://github.com/agent-teams-ai/.github/blob/47a9cd50cc6e2297c036dab3d7883a6c823b1654/docs/architecture/ecosystem-vision.md)
confirms that the foundation serves multiple products. Independently usable
Get Modular and Extension Foundation neutral cores and product-owned operational
authority are accepted boundaries under
[ADR-0015](../decisions/0015-authorize-get-modular-semantic-extraction.md).
The retained production admission, package materialization and public-SPI
choices still need their owning decisions. This packet does not approve them.
Live Module Updates retains ownership of the proposed shared complete operation.

A compulsory runtime coupling neutral composition, artifact trust and product
activation for every consumer, and each product duplicating the same shared
update algorithm, are rejected counterexamples under those accepted boundaries.
They are not open alternatives. Product-specific policy, lifecycle hooks,
canonical state, custody and narrow integration adapters remain with their
actual product owners.

The remaining ergonomics question is direct library composition versus an
optional thin coherent entry point or integration preset that delegates to the
same independently usable mechanisms. Both preserve authority and independent
dependency closure. A coherent SDK or distribution is allowed within those
boundaries; no package per abstraction is required. Justify a package split by
independent usage, trust, delivery or dependency needs.

Compare authoring effort, dependency closure, independent release/versioning,
native/browser placement, failure behavior and independently wired consumers.
Qualify the selected profile through a representative authoring, installation,
invocation, supported update and removal flow. Prove that direct-library and
integrated paths execute the same mechanisms without a second shared update
algorithm or canonical authority. Add the thin surface only when this evidence
shows a concrete need. Keep detailed implementation and test estimates with
the selected scope and current LMU plan; do not budget a duplicate operation.

### Open contribution vocabulary

Extensible, owner-defined typed contributions are the confirmed direction. A closed category enum and arbitrary untyped payloads are rejected counterexamples, not open alternatives. A namespaced versioned envelope remains a candidate contract shape; keep its exact schema and required/optional compatibility negotiation open in OD-003 for the selected boundary. Contribution identity and compatibility must be explicit; artifact installation does not grant an effect. Product-specific extension point semantics, trust tier, data and invocation remain at the owner. Support only the negotiated required/optional capabilities. A new independent consumer's typed contribution must not require editing the neutral core or exposing a global service bag. UI remains optional and headless behavior may also be used as an ordinary library.

### Intended consumers and acceptance

Before implementation, record concrete scope for Runtime v3, Orchestrator, Platform, a future frontend host and an independent external library consumer as applicable. Use small real seams and independent fixtures, not full applications as incubators. Prove neutral dependency closure and packed imports, different consumer-defined contribution schemas, no execution on discovery, denial before protected effects, generation/custody failure cases, and the chosen replacement profiles. Keep actual adoption separate from intended coverage. Stabilization/publication still requires the accepted independent implementation and conformance floor. Resolve the specific ADR-0015/OD-003 admission delta before production code; do not silently reinterpret immutable decisions or start a competing lifecycle library.

## Structure

### Minimum authoring contract for a representative fixture

The [shared headless plugin and UI design](https://github.com/agent-teams-ai/live-module-updates/blob/main/docs/architecture/headless-plugins-and-ui.md)
contains the cross-application proposal. Before implementing the selected
fixture, record this contract with its semantic and test-Host owners. Use a
realistic operation, such as reading and conditionally editing a document,
whose outcome can be checked independently of the implementation:

| Contract item | Required declaration or observation |
| --- | --- |
| Semantic ports | Typed inputs, outputs, errors, compatibility and explicit effect boundaries; no UI/container/provider SDK type leakage |
| Dependencies and runtime | Selected runtime profile and actual package/import closure; supported platform and trust constraints |
| Ownership | Which resources are created and owned versus borrowed; who stops admission, drains work and releases each resource |
| Cancellation | Acceptance, cooperative interruption, late completion and physical cleanup remain distinguishable |
| State | Test-Host canonical data, plugin-private state/cache, transient handles and UI/session state have explicit owners and compatibility; production adoption assigns these to the real owners |
| Construction | Inert declarations and no implicit top-level startup; establish custody before evaluating admitted code with effects or acquiring resources |
| Disposal | Idempotence/retry expectations, partial construction failure, cleanup debt, outstanding work and removal consequences |
| Reuse evidence | Isolated packed consumer first; qualify one-artifact portability with that same artifact in independent Hosts, or a shared contract with every actual target build; record later product adoption separately |

Reuse proof for one built core in two Hosts is different from independently
authored conforming implementations of the same public SPI. The latter remains
its separately applicable admission/publication requirement. Neither means that
every ordinary static feature must wait for two complete applications or full
live replacement. Two configurations of one Host also do not prove two-Host
reuse. Products still meet their actual accepted local gates when adopting the
qualified profile.

Optional UI contributions stay outside the headless entry point. A plugin can
provide behavior without UI, or expose a presentation adapter under the Host's
rules. A UI-independent interaction model or declarative contribution is a
proposal to compare with existing frameworks for a concrete task. This plan does
not select a universal DSL, renderer, visual schema, protocol or new SDK.

Reuse the chosen toolkit's widget, accessibility, keyboard and focus behavior;
keep its elements, DOM references and interaction-machine types outside the
portable semantic contract. The [fixture/UI evidence](#fixture-and-ui-evidence-2026-11-24)
compares relevant library boundaries without selecting a dependency.

### Runtime and trust boundaries required from the start

| Target | Initial architectural obligation | Evidence before the corresponding support claim |
| --- | --- | --- |
| Browser | Browser-compatible import/declaration closure; browser-owned presentation/storage; explicit effect authority | The installed behavior artifact executes in a real browser realm, with independently observed results and cleanup; a UI calling Node does not prove this |
| Desktop | Renderer, privileged shell and any plugin process have distinct capabilities and narrow transport contracts | Actual selected shell/OS, sender and argument validation, denied privileged operations, lifecycle and physical process/resource observations |
| Untrusted plugin | Artifact/consent facts remain separate from executable containment; privileged effects pass through the owning authority | Denied filesystem/network/IPC/process effects, relevant resource bounds, revocation at the effect and actual termination under the selected native isolation profile |
| Optional UI | Semantic feature intent remains separate from toolkit state and renderer lifecycle | One task through meaningful independent presentations, required unsupported contributions rejected where negotiated, stale results and action identity preserved, accessible interaction checked |

No transport envelope is needed between ordinary in-process functions merely
because another profile uses IPC. The crossing adapter owns serialization,
protocol compatibility and cancellation transport when there is a real realm,
process or trust boundary. A Worker, signed artifact, `isolated` fixture value
or hidden UI control does not establish containment or authorization.

### Plugin-specific delivery backlog

| Slice | Concrete result and owner | Exit evidence |
| --- | --- | --- |
| Representative fixture and selected profile | Name one useful contribution, its semantic owner, test Hosts, runtime/trust boundaries, grants and state; keep unresolved choices in OD-003 | Reviewed contract, positive/rejecting outcomes and an independent oracle; no application prerequisite or synthetic production certificate |
| Artifact and byte identity | EF profile uses immutable OCI digest, ORAS/Cosign and the actual executable/import closure | Verified and installed bytes agree; tampered or incompatible artifacts fail closed |
| Catalog and distribution | Retain PostgreSQL canonical state, deterministic federation and selected GHCR/Harbor responsibilities | Owning accepted distribution/authentication/revocation fixtures; offline behavior does not invent an authority fallback |
| Installation and grants | Keep installation, activation, contribution visibility and authorization separate | The integrated test Host exercises artifact-to-effect denial, stale consent, revocation and wrong-scope cases using the real selected mechanisms |
| Loading and lifetime | Host owns evaluation, readiness, admission, resource custody and supported execution placement | Failed/late construction, cancellation, outstanding work and cleanup debt remain observable |
| State and removal | Feature/schema/custody owners define migration, rollback compatibility, retention and deletion | Failed/unknown migration, restart and recovery preserve authority and data; ordinary uninstall does not erase user data |
| Portable reuse | A second independent Host integrates the claimed artifact or a separately qualified target build through its own adapter | Shared semantic conformance and each actual artifact; no hidden product or organization dependency; source portability does not prove one binary works everywhere |
| Package admission | Retain a real owner and the applicable ADR-0015 admission basis: second consumer, independent replacement/release lifecycle, deployment/isolation, or a public SPI | Prove the selected package basis; the additional SPI implementation proof applies when a public SPI is claimed |
| Public extension SPI | Apply the separate accepted SPI publication decision | Two independently authored implementations of the same SPI, compatibility and executable conformance before SPI publication |
| Supported live updates | Route shared coordination to Live Module Updates and the selected product authority | Exact accepted profile, state/operation contract and full consumer evidence; static composition does not stand in for it |
| Product adoption | The adopting product supplies its actual state/authority primitives and accepted artifact/profile pins | Product-owned useful behavior, required safety and local admission gates; fixture success is reused only within its proved scope |

This is not a new centralized gate or a declaration that all rows block every
application. Select applicable obligations from existing accepted authority.
For Orchestrator's initial static module foundation, the existing Sandbox
Manifest seam is a concrete candidate; its actual adopted Core/Assembly pins
and owner admission still govern. It is not automatically selected as the
first complete live-update consumer. Other greenfield consumers can qualify
their own scoped static foundation while the broader update work continues.

## Implementation sequence, 2026-11-25

The owner requested detailed implementation phases before uncertain mechanisms
are built, repeated independent critique, and visible open questions without
stopping unrelated assigned work. This sequence is a proposed execution plan,
not acceptance of a public contract, a production Host or an admission successor.
E0–E6 are local planning identifiers, not runtime states or mandatory packages.

**Current entry state:** EF has no production packages. Its private preflight,
protocol models and finite Node fixture are reusable evidence, not an admitted
implementation. Start from the [qualification successor](#qualification-successor-2026-11-25)
and read the existing accepted decisions before changing their subjects.

| Phase | Concrete outcome | Depends on | Work that can continue independently |
| --- | --- | --- | --- |
| E0 | First profile, contribution contract and exact admission delta are recorded with their owners | Existing accepted boundaries and the open choices below | Source inventory, contract examples, fixture design and proposed successor drafting |
| E1 | Qualified package-evidence verification and prepared admission route | E0 acceptance for the scope whose evidence is being prepared | Verifier investigation and negative-case design do not require a production Host |
| E2 | Small neutral contribution/admission core with owner-defined contracts, materialized with its actual admission evidence | E0 contract selection and the E1 verifier; substantive implementation and first catalog entry belong to the same owning change | Two owner-authored contract examples and standalone packaging design |
| E3 | Actual verified artifact/import closure, selected before evaluation | E0 trust route and supported target; E2 facts where needed | Reuse investigation of accepted OCI/ORAS/Cosign mechanisms |
| E4 | Durable installation, enablement and grant integration with real state owners | E0 lifecycle scope; E3 verified identity; actual owner primitives | Inventory missing primitives and prepare their failure/recovery contracts |
| E5 | Useful invocation, supported disable/removal and complete joined-profile qualification | Applicable E2–E4 steps and supported lifetime mechanisms | Independent effect oracles, capability rejection and physical cleanup scenarios |
| E6 | Release/conformance for the exact declared profile; separate stronger profiles and later product adoption | Applicable accepted gates and complete evidence | Browser/Desktop/isolation/UI investigations with their own narrow claims |

These are dependencies of claims, not one serial platform project. Ordinary
libraries and static GM composition do not wait for E1 or E4. A restart-only
profile does not wait for all LMU live-update guarantees; it still proves its
own installation, state, authority and shutdown promises. A claimed full live
update uses the LMU operation rather than extending this plan into a second
update coordinator.

### E0: profile and admission decisions

1. Record one useful qualification capability, its contract owner, independent
   expected result, intended consumer seams and test Hosts. Existing document
   behavior can supply a starting example; add a second independently authored
   contribution schema to expose extensibility. Two Hosts sharing one core are
   not two implementations of a stable SPI.
2. Fill a profile record with runtime/OS, admitted trust, artifact route, invoked
   operation shape, supported restart/update mode, state subjects, authority
   owners, borrowed resources and failure envelope. Mark unsupported operations
   as rejected before evaluation. Do not infer an isolation guarantee from a
   process, Worker, signature or contribution category.
3. Compare the [execution choices in OD-003](../open-decisions/OD-003-module-runtime-and-public-spi-choices.md#implementation-choices-for-the-next-slice-2026-11-25).
   Select only facts required by this profile. Use LMU's existing Q1–Q7 register
   to reach the owning shared-update decisions; acceptance stays with the
   applicable profile and contract owners. Record the exact dependency rather
   than answering those questions again here.
4. Draft the scoped successor required by ADR-0015/OD-003: affected clauses,
   provisional package/Host scope, semantic owner, materialization basis,
   retained ADR-0011 obligations, qualifying evidence and limits. Separate
   package admission, production Host admission and stable SPI publication.
   Preserve accepted ADR bytes. Only an accepted successor changes a gate.
5. Before dependent production code, record the chosen contract and exact
   supported dependencies in their owning decisions. If a choice remains open,
   name the affected phase and continue only independent work in this table.

**Exit:** a reviewer can identify which guarantee is selected, which authority
accepted it, what the next implementation changes and which counterexample must
fail. A merged plan or a proposed TypeScript signature does not meet this exit.

### E1: package admission and evidence verification

The current [topology checker](../../architecture/checks/package-topology.mjs)
requires `verifyAdmissionEvidence` for a nonempty package catalog, while its CLI
calls `validatePackageTopology({ root })` without that verifier. Empty-catalog
success does not prove readiness to admit the first package. The
[existing overview](overview.md#package-admission) already requires actual
evidence bytes, stable repository identity and publication re-verification.

1. Reuse the existing request builder, receipt matcher, package-admission schema
   and applicable scaffold transaction. Inventory the exact checks already
   owned there before implementing the missing adapter; no parallel gate.
2. Choose a bounded evidence retrieval route under
   [EF-V](../open-decisions/OD-003-module-runtime-and-public-spi-choices.md#ef-v-how-package-admission-verifies-evidence). Bind the request
   to the package, admission record digest, selected basis and exact immutable
   evidence. Resolve provider repository IDs; aliases or mirrors do not create
   independent consumers or implementations.
3. Verify referenced bytes and their authenticated source/conformance lineage.
   A matching hash alone does not prove who ran conformance or which source it
   tested. Reject stale source/receipt bindings, unavailable evidence and claimed
   independence not established by the selected basis.
4. Bound accepted locations, redirects, file size and local containment. Keep
   credentials in the retrieving adapter and out of receipts/logs. A network
   failure cannot silently turn on an offline trust path.
5. Connect the verifier through the existing CLI and test the installed command
   with one genuine admitted fixture plus wrong digest, aliased repository,
   source substitution, unsupported basis and unavailable evidence. Preserve
   fail-closed behavior; no flag that bypasses required evidence.
6. New maintained helpers/tests use strict TypeScript 7.0.2+ and the owning source
   mappings. A substantial rewrite of the legacy checker migrates its affected
   code and callers together; a genuinely local bridge must document its exact
   legacy coverage limitation. Do not hide a new verifier inside unchecked JS.

**Exit:** the verifier accepts genuine evidence bound to its exact qualification
subject and rejects each independent invalid case. E1 prepares the route; the
first actual package, its substantive E2 feature, catalog/admission record and
that candidate's evidence are admitted in one owning change. No empty package
lands first. Publication later re-verifies the immutable receipt. This tooling
check is separate from runtime artifact trust and authorizes neither plugin
effects nor a new public SPI by itself.

### E2: contribution and admission core

1. Freeze the selected contribution identity, version/compatibility, required
   versus optional semantics and typed owner validation contract. Keep GM module,
   capability, implementation and graph identities under their existing owner;
   a contribution envelope references them only where the integration needs it.
2. Implement one cohesive neutral feature with meaningful validation and
   diagnostics. Keep OCI clients, product databases, UI and framework types in
   outer adapters, including emitted declarations. Do not create a package or
   empty domain layer for every validation step.
3. Have two contract owners supply different schemas and useful behaviors
   without changing core dispatch logic. Required unknown/incompatible contracts
   refuse before candidate evaluation; optional unsupported contributions follow
   the selected observable omission/refusal contract and gain no effects.
4. Validate untrusted metadata at its receiving boundary through the trusted
   extension-point owner's validator, not executable validation supplied by an
   artifact that has not yet been discovered or admitted. The inner typed
   decision consumes validated facts and identifies their authority/byte/revision
   bindings; it does not accept a consumer's `allowed: true` as a universal grant.
5. Pack the proposed package and compile/run an external consumer using only
   its public entrypoint and declarations. No source-checkout imports,
   organization credentials or mandatory optional-runtime dependencies.

**Exit:** representative owner contracts remain extensible, invalid metadata and
unsupported requirements fail at the intended boundary, and the package exposes
only its admitted feature. Stable SPI publication still needs its independent
implementations and accepted conformance decision.

### E3: artifact identity and authorized loading

1. Reuse the accepted OCI/ORAS/Cosign baseline. Pin the selected actual toolchain,
   registry and target; do not implement another registry or signature engine.
   A direct trusted digest route may qualify without the full catalog service.
   Catalog use additionally retains OD-001 routing and applicable OD-002 security
   parameters; a catalog outage never invents another authority.
2. Bind exact artifact and executable/import closure to target compatibility,
   provenance and the selected trust decision. Verify that installed bytes and
   public resolution match that closure; include dependencies, assets and native
   components when the claimed target executes them. Preserve the binding from
   verified bytes to the exact evaluated target across staging/loading; reject a
   substituted path, mutable content or changed closure rather than reusing an
   earlier verification result for different executable bytes.
3. Keep discovery inert. Before first import/evaluation, verify the selected
   implementation-to-loader binding, scope and applicable current grants, and
   establish an attempt owner for acquisitions and late completion. Revalidate
   mutable decisions at their actual subsequent authority boundaries.
4. Integrate through existing GM composition where selected. Assembly's public
   `createEntryFamily().capture/prepare` already supplies inert declaration/factory
   capture and verified wiring; ordinary prepared entries also support runtime
   selection. Begin with a supported typed wrapper for known contracts. Qualify
   any different execution ABI before claiming generic installable support.
5. Exercise tampered closure, substituted loader, wrong publisher/scope,
   incompatible required contract and revocation before evaluation. A rejecting
   result must correspond to no candidate evaluation or protected effect at the
   boundary being claimed.

**Exit:** the actual selected artifact mechanism reaches an authorized executable
through supported public contracts. The finite local npm fixture is retained as
a smaller control; it is not relabelled signed OCI qualification.

### E4: durable installation and owner state

1. Identify the existing owner implementation for each required primitive:
   durable installation records, enablement, grants, expected-revision mutations,
   effect fencing and restart recovery. Record absent primitives as separately
   owned implementation work with a bounded estimate. An adapter budget cannot
   include them implicitly; EF does not become a second canonical product store.
2. Model artifact installation, contribution installation, visibility,
   enablement, grant and runtime generation as distinct facts. Use the applicable
   ADR-0011 identity and fence rules; a static built-in does not receive fictional
   artifact identities merely to share this path.
3. Define the authority transaction and effect boundaries for install, enable,
   disable and uninstall. Record intent before applicable effects, use exact
   expected revisions and preserve the original operation identity through an
   unknown result. Extension code and external effects run outside transactions.
4. On restart, reconcile actual records/effects before routing work. Do not
   revive a disabled/removed installation or expired/revoked grant from cached
   metadata. Concurrent operations either observe the canonical winning revision
   or retain a conflict/unknown result; tests must not use a local mutex as proof
   for a claimed cross-process authority.
5. Keep canonical user data, plugin-private state, caches and transient handles
   separate. Ordinary uninstall preserves user data. Supported private-state
   migration, detach, export, transfer or deletion invokes its actual custody
   authority and exact attachment; unsupported operations fail closed. Uncertain
   effects and retained users prevent unsupported terminal/deletion claims.

**Exit:** the chosen installation survives the declared restart envelope with
correct enablement/grants and data ownership, including crash boundaries and
conflicting operations it promises. A successful package-manager install is not
this exit. Each combined ADR-0011 profile also proves its cross-profile joins.

### E5: invocation, disable and removal

1. Run one useful contribution through the installed public entrypoint and real
   Host receiver. Observe canonical state/effects and receipts independently;
   verify stale revision, wrong scope and revoked authority at the real effect.
2. For supported asynchronous calls/streams, establish atomic selection and
   retention for the complete operation, including reentrancy and continuation
   after `await`. Reuse a qualified owner mechanism. `beginCall` on an already
   chosen generation or a count of outstanding promises is not the whole
   guarantee. Do not import/copy GM's private lifecycle candidate to fill a gap.
3. Apply the selected ordinary-disable and emergency-revocation policies to new,
   prepared and already admitted work. A deadline stops waiting only; forced
   interruption requires its actual supported execution owner and evidence.
   Record re-enable behavior explicitly; a fresh invocation does not establish
   whether older prepared work may resume.
4. Retire exact owned instances and the affected dependency closure under the
   selected profile. Preserve unrelated sibling installations and borrowed
   providers. Retain the original cleanup completion and debt; a second close
   call or an empty listener counter cannot certify physical release. Before
   deleting artifact bytes, check actual runtime, history, old-client and other
   applicable retention owners. Removal from routing does not release their
   holds; the profile records who can release each hold and under which policy.
5. Use LMU for a claimed complete update operation. EF contributes artifact and
   admission facts; Host owners retain authority/state; existing resource and
   executor owners retain cleanup/stop. Do not copy LMU transitions into each
   product adapter or into this qualification Host.
6. Prove a positive effect and separately break a real grant, revision or cleanup
   control so an independent oracle detects the resulting violation. Add cases
   because they distinguish the declared contract, not to repeat implementation
   branches. Preserve exact source, artifact and environment receipts.

**Exit:** install/invoke/disable/uninstall and any selected update mode have actual
positive and rejecting observations, truthful pending/unknown/debt results and
correct retained state. Whole-operation LMU qualification remains its own
evidence row even when the integrated fixture exercises both libraries.

### E6: release, stronger profiles and adoption

1. Verify root-only packed imports/declarations, real dependency closure, strict
   compiler coverage and applicable repository/package gates on the reviewed
   source. Promotion requires the accepted package/public-SPI route; no stable
   SPI claim from two Hosts that share one implementation.
2. Run the claimed independent Host/target conformance. Reusing one artifact and
   sharing a semantic contract across different builds are distinct claims.
   Retain every actual artifact and its source/toolchain identity.
3. For Browser, Desktop or untrusted support, select the concrete mechanism and
   execute the [native obligations](#runtime-and-trust-boundaries-required-from-the-start).
   Observe privileged IPC denial, allowed/forbidden effects, resource limits and
   stop/recovery where promised. These targets constrain design now; unfinished
   stronger profiles do not invalidate a narrower correctly labelled result.
4. Add a UI adapter only for a useful interaction requiring it. Reuse the
   selected library's widget/accessibility behavior and qualify presentation
   separately from headless behavior; no universal schema/renderer follows.
5. An adopting product then records its own actual authority/state integration,
   approved artifact pins and useful behavior. Foundation proof does not publish
   a product's decision or certify its production deployment.

### Estimates and review checkpoints

The November 25 estimates below are engineering judgments for one bounded
neutral core, not a measured line count or the cost of the whole plugin platform. P is
handwritten production/integration code; T is tests/fixtures. Do not add
overlapping phase budgets or count moved research code as newly implemented
production behavior. Generated, vendored and documentation lines are excluded.

| Scope | P estimate | T estimate | Engineer-days and prerequisites |
| --- | --- | --- | --- |
| Neutral contribution/admission core | 2,000–4,000 | Included in the joint 4,000–8,000 below | Included in the conditional joint range below; selected E0 contracts |
| One artifact adapter and trusted Host wiring | 1,000–3,000 | Joint core/integration qualification: 4,000–8,000 | Joint core, wiring, focused review and package delivery: 25–50 days for one experienced engineer, assuming an already qualified E1 verifier and owner primitives; creating those missing mechanisms is excluded |
| Missing durable installation, authority, custody and recovery primitives | Not yet responsibly fixed | Not yet responsibly fixed | Inventory and a scoped owner estimate at E4; never hidden in the adapter allowance |
| E1 evidence-verifier investigation | 0 | See EF-V option ranges in OD-003 | A bounded route comparison; production verifier cost follows selected provenance/receipt contract |
| Complete live-update operation | Owned by LMU's current plan | Owned by LMU | Separate shared implementation; no duplicate EF update-engine budget |
| Desktop, isolation, broader custody or UI profile | Estimate after the discriminating mechanism investigation | Profile-specific | Native packaging, infrastructure, operations and maintenance are separate costs |

For the declared neutral-core scope, confidence in direction U=8/10, expected
reliability within that scope N=8/10, and complexity C=6/10; estimate confidence
is 3/10 until E0 and missing owner primitives are resolved. These are ordinal
judgments, not availability or readiness percentages. Narrower profiles are not
therefore generally safer than profiles covering a wider threat/failure model.

Review the contract/phase packet first from ownership/FMS/DDD, safety/recovery,
and integration/packaging perspectives. Revise concrete findings, then have an
independent second round challenge the revised joins and estimates. During
implementation, review each coherent phase against its exit evidence and retain
unresolved findings with severity, source and affected claim. Repeat affected
review after fixes until no critical finding remains; do not invent approvals
or rerun unchanged campaigns merely to increase a round count.

For each handoff, record the exact source, selected/open decisions, current phase,
changed files, validated observations, retained failures and next executable
step. Useful checkpoints are committed and pushed immediately. Documentation
delivery follows actual repository protections; pending CI is not success, and
prose-only planning does not require new runtime test machinery.

## Evidence and rejecting controls

Keep mechanism probes, integrated representative fixtures, public package
availability, SPI conformance and product adoption distinct. The
[existing-evidence audit](#existing-fixtures-and-the-missing-bridge)
identifies reusable controls and the missing artifact-to-effect integration.
Do not implement another lifecycle algorithm in a test Host to fill that gap.

Specify expected results and effect/receipt ledgers independently of the code
under test. Include a deliberately broken grant, fencing or cleanup control
that the corresponding oracle rejects. Fresh namespaces, state roots, ports
and browser contexts isolate cases; explicit barriers and concrete owned
resource observations establish reset. A finally block or empty counter alone
does not establish cleanup. Retain failed inputs/results and exact source,
package, lock, compiler, runtime, browser/shell and OS identities.

Use the ordinary library path where no plugin mechanism is required. For a
plugin claim, the representative fixture must traverse the actual selected
verification, admission, installation, invocation and supported removal path.
Production implementation of a changed EF package/Host boundary still requires
the specific admission reconciliation recorded in OD-003; this plan does not
authorize it implicitly. Historical evidence and accepted ADR bytes stay fixed.

## Qualification successor, 2026-11-25

Source review: EF `86c01a976792eed78a3ad8b8bdc350c7c8f7884f`, GM
`330c28dbea1a3de812d3aee5ddb71ef829dee347`, LMU
`6083e89ba7781b12571a102d273058052ad94148`. The package catalog remains empty.
This current entry point supersedes the dated gap summary below only to the
extent of these new observations; historical inputs and receipts stay unchanged.

| Delivered evidence | Exact useful result | Remaining boundary |
| --- | --- | --- |
| [EF #66](https://github.com/agent-teams-ai/extension-foundation/pull/66), merged `bf050098f4ef87c67d09f96d8b4d146159939574` | Actual pack/install/public import reaches a Host-owned file effect; stale/revoked and disabled cases reject; a deliberately broken live-grant check produces a forbidden write detected independently; uninstall removes public resolution while owner data remains | Trusted cooperative Node, one Host, finite receiver and fixed local closure; not signed OCI trust, durable product-host installation, arbitrary closures, hostile containment or a complete LMU operation |
| [EF #64](https://github.com/agent-teams-ai/extension-foundation/pull/64), merged `86c01a976792eed78a3ad8b8bdc350c7c8f7884f` | Shared protocol runtime/declaration have a separate source boundary; installed-command negative controls reject platform imports, opaque dynamic dependencies and type leakage while Host adapters retain their platform allowance | Dependency-boundary enforcement; not strict TypeScript qualification of the legacy JS harness or runtime isolation |
| [LMU #3](https://github.com/agent-teams-ai/live-module-updates/pull/3), merged `6083e89ba7781b12571a102d273058052ad94148` | Six named tests on actual Node/Chromium strengthen installed-byte binding, state/receipt integrity, delayed dispatch after revocation and all four browser cleanup handlers, including independent rejecting controls | Portable document behavior through two independent Hosts; no A-to-B update operation, EF production admission or Desktop/isolation claim |

EF's actual-main [qualification run](https://github.com/agent-teams-ai/extension-foundation/actions/runs/45516144384/job/138875952992)
at `bf050098` recorded 239 passed and zero failed/skipped/cancelled. LMU's
actual-main [run](https://github.com/agent-teams-ai/live-module-updates/actions/runs/45518777341/job/138884992384)
at `6083e89b` recorded six named tests passed with no failures/skips. Counts
describe those exact runs, not a new run on this documentation change. Positive
Host executions and negative controls inside a named test are not extra named
tests. EF re-enable exercised a fresh invocation; it did not choose resurrection
semantics for previously prepared work.

**Remaining bridge:** qualify the actual E3 artifact mechanism and E4 durable
installation/authority primitives through E5 useful behavior and the supported
removal path. Add another independently wired Host only for the corresponding
reuse claim. The finite EF #66 result is a completed part of that bridge, not
proof that all production Host obligations or public-SPI gates are closed.

GM already supplies public inert capture/preparation through
[Assembly's neutral bridge](https://github.com/agent-teams-ai/get-modular/blob/330c28dbea1a3de812d3aee5ddb71ef829dee347/docs/decisions/0043-plan-optional-native-effect-composition.md).
Use that existing owner before proposing another generic admission/compiler API.
The lifecycle candidate remains
[private and without a release claim](https://github.com/agent-teams-ai/get-modular/blob/330c28dbea1a3de812d3aee5ddb71ef829dee347/packages/lifecycle-kernel/README.md).
Public Resources already joins its current close flight; preserving that
original completion and exact ownership in the selected profile is integration
work, not evidence that a second cleanup mechanism is missing.

## Fixture and UI evidence, 2026-11-24

This is a bounded source audit against EF commit
[`5ee8a788`](https://github.com/agent-teams-ai/extension-foundation/tree/5ee8a788935c885fac075a5860a0217cf420b4d7)
and the linked immutable LMU qualification source. It records current design
inputs and observed limits, not a new production runtime, public SPI or UI
dependency. Historical research packets and accepted ADRs remain unchanged.

### Existing fixtures and the missing bridge

| Existing evidence | Useful result to reuse | Limit of the result |
| --- | --- | --- |
| [Contribution admission candidate](../../tests/qualification/contribution-admission-candidate.ts) and [its tests](../../tests/qualification/contribution-admission-candidate.test.ts) | Pure preflight over supplied artifact, installation, binding, grant, placement and custody facts; negative admission cases | It does not load code or enforce effects. Its fixed contribution-kind list and `isolated` input are fixture choices, not an approved universal schema or operating sandbox |
| [Packed extension consumer E2E](../research/packed-extension-consumer-e2e-2026-11-05.md) | A real discovery use case integrated through packed public contracts and disposable composition | It does not establish production plugin installation, authorization or a complete Host; retain the recorded failed attempts and exact experiment scope |
| [Universal-system spikes](../qualification/universal-module-extension-system/spike-results.md) | Browser Worker, Node Worker and child-process transport/handshake observations | Transport across a realm or process is not containment, a Desktop profile or a complete plugin lifecycle |
| [Protocol oracle](../../tests/qualification/dogfooding-protocol-oracle.ts), [reducer](../../tests/qualification/dogfooding-protocol-reducer.ts) and [scenarios](../../tests/qualification/dogfooding-protocol.test.ts) | Separately expressed expected protocol behavior and implementation transitions | The model needs real owner receipts and native effects before it can qualify a production authority or physical lifecycle |
| [Boundary/failure experiments](../research/plugin-boundary-and-failure-experiments.md) and [Worker replacement study](../research/worker-adapter-replacement-experiment.md) | Closure, path substitution, task ownership, cleanup debt and stop observations | The bounded experiments do not establish arbitrary-descendant cleanup, every platform or hostile-code containment |
| [LMU portable document fixture](https://github.com/agent-teams-ai/live-module-updates/tree/c5f6ed8b75c490785679de7e813f54901ee4e3b0/tests/qualification/portable-document) | One packed behavior core executes through public imports in independently wired Node and browser Hosts; conditional edits, revocation, reset and a deliberate listener-cleanup defect have observable outcomes | This is an ordinary-library portability slice, not GM composition, EF admission/install/remove, Desktop isolation, a public extension SPI or the complete LMU update operation |

The LMU [hosted run](https://github.com/agent-teams-ai/live-module-updates/actions/runs/45487365519)
at exact source `c5f6ed8b75c490785679de7e813f54901ee4e3b0` recorded
**Q1–Q3: 3 passed, 0 failed, skipped or cancelled** in
[job 138776212003](https://github.com/agent-teams-ai/live-module-updates/actions/runs/45487365519/job/138776212003).
The browser was Chrome Headless Shell 159.0.8154.6, Playwright Chromium build
1255, under Playwright 1.65.1; the runner used Node 24.22.3, pnpm 11.25.0
and TypeScript 7.0.2. The retained
[artifact 14965145969](https://github.com/agent-teams-ai/live-module-updates/actions/runs/45487365519/artifacts/14965145969)
archive SHA-256 is
`1bfbbbac4098e35317b9c901a75578cbd4f01865b3e0d68be9f5ad0b731d44ef`.
This is observed native-browser evidence, independent of the earlier local
browser-download failure. The exact source and artifact identify the proof;
the fixture-first delivery successor is retained at LMU merge
[`9c9952ad`](https://github.com/agent-teams-ai/live-module-updates/commit/9c9952ad1edac0c773921e6aa3db73777ce04c10).
Its delivery plan remains proposed; this result does not qualify the complete
update operation.

The portable core validates input and expresses the conditional-edit use case.
Each test Host owns canonical state, final permission/revision checks, receipts
and its actual resources. The Node Host uses a temporary file; the browser Host
uses browser storage and DOM interaction. Reuse of the same built core across
these Hosts is distinct from independently authored implementations of a public
SPI. Its cleanup mutation detects a retained listener even when a closed-state
guard prevents a write; this is stronger than checking only the final document.

**Next EF integration gap:** select a representative contribution and traverse
the actual chosen artifact verification, admission, installation, invocation,
disable and removal mechanisms in independently wired test Hosts. Observe
protected effects and their denials independently. A pure preflight returning
`allowed`, a package install or a model transition cannot close this bridge.
Use the qualified shared lifecycle mechanisms when that profile needs them;
do not recreate a lifecycle implementation inside the fixture.
The exact production package/Host admission delta remains in OD-003.

### UI library boundaries

Official documentation was inspected on 2026-11-24. These are library-boundary
observations, not a dependency selection, compatibility certification or
benchmark. Each row distinguishes the library's reuse boundary from ours.

| Library and primary source | Documented boundary | Consequence for the proposed architecture |
| --- | --- | --- |
| [Radix Primitives](https://www.radix-ui.com/primitives/docs/overview/introduction) and [getting started](https://www.radix-ui.com/primitives/docs/overview/getting-started) | Unstyled accessible primitives with React component examples and focus/keyboard behavior | A React presentation adapter can reuse the primitives; unstyled components do not by themselves create a framework-neutral business contract |
| [React Aria](https://react-aria.adobe.com/getting-started) | Unstyled React components corresponding to DOM elements, with composition and interaction behavior | Keep React components and DOM lifecycle in the presentation adapter; portability of the semantic feature is a separate property |
| [Zag introduction](https://zagjs.com/overview/introduction) and [framework adapters](https://zagjs.com/guides/framework-adapters) | Framework-independent interaction state machines are connected to reactivity, DOM and lifecycle through adapters | Reuse that interaction layer where suitable; do not rebuild its interpreter or expose toolkit machine types as the portable business API |
| [Ark UI overview](https://ark-ui.com/docs/overview/about) | Components use Zag machines and provide framework adapters while still interacting with the DOM | Multiple frontend adapters are useful evidence for a UI seam; they do not establish server execution of widgets or runtime isolation |

The design inference is to keep four properties separate: styling freedom,
reuse of interaction behavior across frontend frameworks, portability of
business behavior, and containment of untrusted code. None implies the others.

A feature core can own its domain/application rules and narrow semantic ports;
the Host retains its canonical state and effect authority. A presentation
adapter owns toolkit state, focus, elements, subscriptions and renderer cleanup.
Keep drafts, action identity and stale-result handling explicit at the seam.
Start a fixture with simple native controls if that is sufficient to exercise
the contract; require a particular toolkit only when its integration is the
claim under test. Compare a meaningful task in independent presentations before
publishing a broader UI portability claim. No four-library implementation,
universal widget engine or declarative UI language is required by this plan.

### Runtime and trust source observations

| Primary source | Observation | Design consequence |
| --- | --- | --- |
| [Browser Workers](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers) | Workers execute in a different global context and can use network APIs | A Worker realm alone does not prove network denial or an untrusted-plugin sandbox; specify the allowed effects and actual enforcement |
| [Node Worker options](https://nodejs.org/api/worker_threads.html#new-workerfilename-options) | Worker resource limits cover the JavaScript engine, exclude external data such as ArrayBuffers, and do not prevent a global out-of-memory abort | Process/resource guarantees need their own native test and selected resource boundary; an input limit is not a complete containment proof |
| [Electron process sandbox](https://www.electronjs.org/docs/latest/tutorial/sandbox) | Sandboxed renderers have different capabilities from privileged processes, and preload code remains a sensitive bridge | Select the Desktop placement and privileged broker deliberately; validate the chosen shell's real sender/effect/lifecycle behavior |
| [Electron context isolation](https://www.electronjs.org/docs/latest/tutorial/context-isolation) | Context isolation alone does not make unrestricted IPC exposure safe; the guide recommends narrow methods with argument filtering | Expose purpose-specific operations through the broker and recheck authority at the effect; hiding a control is not authorization |

These observations motivate boundaries, not selection of Electron or a specific
sandbox. The production shell, native isolation mechanism, resource budget,
interruption behavior and state guarantees remain explicit decisions. Record each
selected profile's actual positive and rejecting evidence. A Browser result
does not certify Desktop, and a trusted in-process result does not certify an
untrusted third-party plugin.

### Remaining decisions and proof scope

A fixture contract must say which negative cases apply. Missing capabilities,
revision negotiation, partial asynchronous setup or physical termination require
tests when the selected contract promises them; a pure synchronous library
should not acquire invented runtime services to satisfy an unrelated profile.
Keep useful operation, effect denial, independent oracle and owned-resource
cleanup testable for the actual chosen scope.

The open choices are the first representative EF contribution/integration,
selected execution and isolation profiles, any UI toolkit adapter worth proving,
and the exact retained production admission successor. The architectural
direction is already set: prepare the foundation before applications, keep
authority with its owner, reuse neutral mechanisms and qualify each claimed
boundary. Neither this audit nor the LMU portability result resolves the
remaining production SPI, hostile-plugin, Desktop or full update obligations.

## E1 provider investigation checkpoint, 2026-11-25

The owner requested continuation of the remaining E2E work after the completed
Get Modular #254/#255 delivery. This bounded next step investigates EF-V's
online provider route. It does not accept EF-A/C/V/P, materialize a package,
wire the topology CLI, publish an SPI or implement an extension Host.

### Written plan and scope

Use one private strict TypeScript experiment under `tests/qualification`, the
existing package-admission request builder and receipt matcher, and one finite
hosted research workflow. Production LOC: 0; estimated test/experiment code:
450–700 lines; CI/configuration: 60–100 lines, excluding documentation. Initial
estimate: 2–4 engineer-days including focused review and hosted qualification,
not a delivery promise. Fitness confidence 8/10, reliability within this bounded
read-only transport scope 8/10, complexity 5/10, estimate confidence 5/10.

The exact historical witness is EF source
`bf050098f4ef87c67d09f96d8b4d146159939574`, repository ID `1333298097`,
push CI run `45516144384`, attempt `1`, workflow ID `333712065`,
job `138875952992` named `check`, and `.github/workflows/ci.yml`.
The original provider run and job have been read independently. Its 239/239
qualification result remains evidence for that historical source, not a new
execution of those product tests by this investigation.

1. Pin the reviewed original workflow and log bytes before implementing their
   assertions. Hash bytes before decoding; the real log starts with a UTF-8 BOM.
2. Resolve the canonical repository through the fixed GitHub API and require
   its actual numeric ID, exact full name and non-fork status. Aliases and
   mirrors cannot create independent consumers or implementations.
3. Retrieve the exact run attempt and its finite complete job inventory. Bind
   run/source/repository/head-repository/workflow/event/status, and the selected
   job's own run ID, attempt, SHA, name and status. Require unique successful
   checkout and `Run pnpm check` steps. Refuse duplicate, missing, truncated
   or paginated evidence; never substitute the latest attempt or another job.
4. Retrieve exact-source workflow bytes and the exact job log; check the
   independently pinned hashes and checkout/test markers. These observations
   establish bounded provider lineage, not every byte arbitrary later commands
   executed or the semantic validity of their assertions.
5. Restrict initial requests to fixed HTTPS GitHub API endpoints. Refuse API
   redirects; permit one API-issued log redirect to the documented blob host
   family without Authorization or cookies. Reject credentials, wrong suffix
   boundaries, fragments, non-default ports and subsequent redirects. The
   Azure suffix is not exclusive GitHub ownership: authority comes from the
   fixed authenticated API response plus the pinned log bytes.
6. Bound total deadline, aggregate streamed bytes, each response and job count.
   The deadline covers body reads. Test missing/false Content-Length, stalled
   and oversized bodies. Persist closed refusal codes, never signed URLs,
   tokens, provider error bodies or arbitrary exception messages.
7. Use independent expected failures for identity/source/run/attempt/workflow/
   job/step changes, altered bytes, unavailable evidence and transport bounds.
   Keep valid workflow/log bytes and digests while changing lineage in at least
   one case. One isolated mutant omits an actual lineage assertion; a separate
   expected outcome must catch its incorrect acceptance. Verify valid recovery.
8. Bind a research observation to a synthetic research request made by the
   existing admission builder. Pass the observation to the existing receipt
   matcher and require refusal even after live success. Never manufacture
   `outcome: satisfied` or a catalog admission record.
9. Keep deterministic tests in the ordinary qualification gate and all new
   maintained `.ts` files in the effective strict TS 7.0.2+ project and source
   boundary. Execute the actual online adapter in a dedicated finite campaign:
   the research branch and main, filtered only to the experiment/workflow.
   Do not install a standing required check for unrelated changes. Historical
   logs can expire; their absence refuses observation and never enables an
   offline fallback, automatic witness refresh or a false success.
10. Use contents/actions read only, existing pinned actions, non-persisted
    checkout credentials and an ephemeral GITHUB_TOKEN only in the retrieval
    step. No repository secrets or pull_request_target. Independently review,
    fix, qualify the exact candidate, merge normally and inspect actual-main
    checks plus its fresh online observation.

### Review and dependency prerequisite

Two independent reviewers completed two plan rounds before implementation.
Round one corrected expiring-log CI coupling, incomplete job-attempt binding,
raw BOM handling, ambiguous transport authority and missing executable
non-admission/token/streaming controls. Both approved the corrected bounded
investigation in round two. This is plan approval, not source or E2E approval.

Read-only dependency inspection found that the existing Foundation 1.7.2
gate eagerly imports API Extractor 7.58.12 and its TypeScript 5.9.3, while the
root compiler is 7.0.2. The old compiler must not be initialized for this new
work. Resolve the effective dependency closure through the existing supported
managed-cohort qualification and consumer-adoption route. A bare version bump,
node_modules patch, version override or weakening of the gate is not accepted.
Keep the historical cohort unchanged and any required owner-level prerequisite
in its own repository; do not roll it out to unrelated consumers.

### Evidence limit and remaining decisions

Online provider evidence and deterministic transport-controlled tests are
separate results. Successful GitHub lineage does not prove semantic conformance,
independent authorship, artifact trust, product grants or complete E1 readiness.
EF-V route acceptance and the precise issuer/admission policy remain in OD-003.
Implementation, review, hosted execution and merge remain pending until their
exact-source observations are recorded in the delivery PR.

Primary contracts inspected on 2026-11-25:
[GitHub workflow jobs](https://docs.github.com/en/rest/actions/workflow-jobs),
[workflow runs](https://docs.github.com/en/rest/actions/workflow-runs), and
[runner communication requirements](https://docs.github.com/en/actions/reference/runners/github-hosted-runners#communication-requirements-for-github-hosted-runners).

## Operational implications

Artifact, installation and plugin-private-state custody must remain separate
from the product's canonical domain state, transaction and migration effects.
Name one writer and authority per state subject. EF vocabulary or a library
operation record cannot become a second product state store. Execute extension
code outside product database transactions and recheck mutable authority where
the real effect occurs.

Distinguish disable, uninstall, generation retirement and deletion of user data.
State lineage, schema compatibility, artifact retention and supported rollback
need their owners' receipts. A prior version may still be retained for active
work, history or old clients. Abort and timeout do not prove process termination,
completed writes or released resources. Preserve uncertain effects and cleanup
debt rather than returning a misleading single success flag.

The accepted [extension model](extension-model.md) and conditional production
Host floor remain authoritative. Ordinary libraries, static Pure DI and inert
module declarations do not acquire the whole operational Host profile merely
through this document. Conversely, an actual admitted production extension Host
cannot replace its required evidence with this planning table or a toy preflight.

Keep reports explicit about design, implementation, release and consumer
qualification. Use immutable source identities for proof and maintained routes
for navigation. The [November 23 audit](../research/live-extension-documentation-audit-2026-11-23.md)
is retained historical evidence. New constraints or observations belong in a
dated successor or the owning open decision; accepted ADRs and sealed packets
are not silently rewritten.

## Related decisions

- [ADR-0001: product-neutral ownership](../decisions/0001-product-neutral-extension-foundation-boundary.md).
- [ADR-0002: OCI, ORAS and Cosign](../decisions/0002-oci-oras-and-cosign-distribution-baseline.md).
- [ADR-0003: canonical catalog state](../decisions/0003-postgresql-canonical-catalog-state-and-signed-snapshots.md) and [ADR-0004: federation](../decisions/0004-deterministic-catalog-federation-and-namespace-authority.md).
- [ADR-0011: admitted Host safety floor](../decisions/0011-extension-admission-custody-and-retirement-closure.md).
- [ADR-0014: product declarations and generations](../decisions/0014-product-local-module-authoring-composition-and-generation-guardrails.md).
- [ADR-0015: independent composition and admission](../decisions/0015-authorize-get-modular-semantic-extraction.md).
- [OD-003: unresolved Host, SPI and migration choices](../open-decisions/OD-003-module-runtime-and-public-spi-choices.md).
