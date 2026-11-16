---
id: research.portable-live-plugins
type: research
status: active
owner: architecture
summary: Deep source comparison and portable library design for live plugin evolution, preserving composition and product ownership.
---

# Portable Live Plugin Mechanisms And Library Design 2026-11-17

<!-- cspell:words Cordis cordisjs Letta HashiCorp single-spa MemoMaps HMRClient registerRemotes LayerNode RcRef ScopedRef WASI -->

## Scope and authority

The owner asked for a deeper implementation study and a library design usable
by other projects, with Clean Architecture, SOLID, DRY and modular boundaries.
The [owner direction](../open-decisions/OD-003-module-runtime-and-public-spi-choices.md#owner-requested-portable-library-direction-2026-11-17)
extends the high-priority all-category live plugin vision. It does not select
a new runtime, public SPI, package owner, repository or production migration.

**Ordinary-update interruption remains open.** The owner explicitly deferred
whether updating a healthy plugin may interrupt current work. This report
does not adopt a default finish, pause, cancel or migration policy. Existing
emergency revocation, operation deadlines and authorization keep their owners.
The accepted static-composition/controlled-restart baseline remains in force;
the broader live vision determines which future boundaries to preserve.

Observation date: **2026-11-17, Europe/Kiev**; source retrieval began on
2026-11-16 UTC. Three specialist lanes and root research inspected agent
applications, reusable execution mechanisms, browser lifecycles and current
Get Modular ownership. This follow-up adds source depth and portability design;
it does not rerun the earlier four Effect experiments or claim new runtime E2E.
Official contracts, pinned implementation, registry metadata, inspected tests,
architectural inference and proposed qualification are labelled separately.

The [new evidence packet](evidence/portable-live-plugins-20261117.tar.gz) and
[member manifest](evidence/portable-live-plugins-20261117.manifest.json) retain
full reports, source ledgers and independent criticism. The
[2026-11-14 study](live-plugin-evolution-vision-and-evidence-2026-11-14.md) and
its original experiment archive remain immutable historical evidence. The
[validation receipt](evidence/portable-live-plugins-20261117.validation.json)
records this documentation delivery separately from runtime evidence.

## Recommendation for discussion

**Design reusable live evolution around explicit generations and resource
ownership. Keep extension contracts in the consuming application.** The useful
common concern is coordinating an already admitted candidate with the existing
owner's selection, invocation and retirement boundaries. It is not a single
plugin object containing tools, UI, agents, database migrations and every
possible lifecycle hook.

Start by subtracting the existing Get Modular composition and private lifecycle
kernel, native resource primitives and fitting loaders or execution libraries.
Only the remaining shared coordination should become new mechanism code. It
must execute under one existing owner; it must not advance a second active head,
grant store, lifecycle ledger or independent supervisor.

This is compatible with a library for ordinary projects: a consumer can supply
its own capability contracts, admitted executable and operation policy. It need
not import Agent Teams models or use its catalog, credentials or database. A
consumer explicitly adopting EF artifact admission still follows that accepted
OCI/trust profile. A neutral lifetime mechanism is not an alternate admission
path around it. [Ownership constraints][ef-agents]; [existing discussion][od-existing].

The strongest incremental candidate is **existing primitives plus small
coordination and qualified adapters**. Native Effect is a useful implementation
profile for an Effect application. Other consumers should not have to adopt
Effect to use a qualified neutral boundary. The study does not propose that
all adapters offer identical guarantees or that every plugin category can be
qualified in the first release.

## What portability should mean

| Dimension | Useful target | Claim that still needs separate evidence |
| --- | --- | --- |
| Product | Ordinary projects supply their own capability and policy contracts | Independence from Agent Teams types and infrastructure must be tested. |
| Runtime | A small neutral mechanism plus explicitly supported adapters | Browser, Node, worker, process and Wasm cleanup are not interchangeable. |
| Framework | UI and service adapters sit outside the shared mechanism | A renderer's state and root lifetime remain renderer/consumer concerns. |
| Language | A TypeScript library can be useful immediately; RPC/Wasm may connect other languages | A cross-language protocol is an additional contract, not automatic portability. |
| Packaging | Independent installation and explicit dependencies | A separate repository is not required; public publication remains a separate gate. |
| Operation | A declared boundary adopts a coherent implementation and descriptor set | Migrating arbitrary suspended stacks or undoing external effects is not implied. |

The architectural goal is broad live support. Its qualification unit is a named
capability/runtime profile, not the word plugin. Instruction-only contributions
can use immutable descriptor snapshots. A tool may require a request or turn
boundary. A UI extension needs a rendering boundary. A stateful provider needs
an execution and custody protocol. These different implementations can share
mechanical pieces without being forced into one oversized SPI.

A proposed external conformance example is an ordinary document server replacing
its own renderer. It supplies a selected factory, its resource owner, readiness
condition and update policy. It need not use agent sessions, EF catalog storage
or GM declarations when no composition graph is needed. This is an acceptance
example, not a claimed existing adopter. Its implementation must use qualified
package entrypoints or an explicitly admitted packed candidate; private source
imports do not prove an independently usable release.

## What the implementation study found

The following table summarizes source observations, not local executions.
Exact files, symbols, versions, licenses and limitations are in the lane
ledgers. Main/dev source and published packages are deliberately distinguished.

| Project or mechanism | Actual implementation boundary | Reusable lesson and material limit |
| --- | --- | --- |
| OpenCode V2 development source | Source tracking, serialized reload, ordered activation scopes and per-model-request tool snapshots | Capture descriptors and executors together. Restoring prior code after failed setup is reconstruction, not retaining the old instance. |
| Letta Code main source | Owner generations, registry snapshots, prepared execution contexts and activation cancellation | Captured tools can remain coherent while becoming unavailable. Reload first disposes the old registry; cooperative cancellation is not physical termination. |
| Pi main source | Extension runner reconstruction; explicit settled-agent self-reload example | The updater must reach a suitable boundary rather than wait for the very turn containing its own update call to finish. |
| Cordis and its HMR package | Scoped effects, component replacement and a programmatic Node reconciliation layer | Reuse a fitting reconciler; import rollback does not undo activation failure or top-level effects. Published and latest source dependencies differ. |
| HashiCorp go-plugin | Process startup, handshake, RPC proxies and process custody | Reuse process/RPC plumbing. The examined shutdown path is not proof of application-level RPC drain or state migration. |
| Extism JavaScript SDK | Explicit Wasm calls, host functions and optional worker execution | Qualify the concrete SDK/backend. A method named close does not establish one universal shutdown guarantee. |
| VS Code | Application-owned extension registry and extension-host lifecycle | Dynamic registry changes have limits; activated extensions can require host restart. A large application host is not automatically an extractable library. |
| single-spa | Loader, bootstrap, mount, unmount and unload, with framework helpers | Reusable lifecycle intent can be narrow and useful. Unregistering does not erase cached code; timeout rejection does not kill lifecycle code. |
| Vite | Accepted module boundaries, dispose/prune callbacks and import refresh | Useful development integration. The inspected path disposes before new import; no general last-known-good-resource transaction follows. |
| Module Federation | Remote registration/loading, module caches and shared dependency records | Reuse remote loading where appropriate. Forced registration does not own UI unmount, escaped references or application state. |

### Agent applications: three distinct responsibilities

OpenCode tracks local file/directory fingerprints, caches failed source-load
attempts and serializes reload work. Its Node loader adds generation information
to local imports; its Bun path scans local imports and evicts cache entries.
This is stronger than changing only the entrypoint URL. It still does not seal
all transitive executable bytes: excluded dependencies, later dynamic imports
and ambient services require their own boundary. A revision token is meaningful
only with a declared closure contract. [Source tracking][oc-source];
[Node import preparation][oc-node]; [Bun import preparation][oc-bun].

Activation preserves an unchanged prefix, closes a changed suffix in reverse
order, then sets up replacements. On setup failure it can run previous healthy
code again in a new scope. That does not recover the exact old heap, connection
or external effect history. Tool snapshots separately capture descriptors and
executable references for a model request; keeping those references does not
retain resources closed by activation cleanup. [Activation][oc-activation];
[tool snapshot][oc-tools].

Its `LayerNode.replace` is a declaration override resolved by `compile` before
acquisition, with graph checks and local/shared MemoMaps. It is not live
rewiring of already acquired application objects. Although the util package
exports this helper, adding it as another graph owner beside Get Modular would
duplicate the responsibility being reused. Borrow the reasoning, or choose a
composition alternative explicitly; do not combine two competing compilers.
[LayerNode source][oc-layer]; [export map][oc-util].

Letta makes a related distinction explicit. Prepared execution contexts bind
model-visible tools to a retained registry snapshot. A supplied unknown context
is rejected. Each mod has an owner generation and activation signal; tool
execution checks liveness and links call cancellation with activation
cancellation. Therefore coherent old descriptors need not imply permission to
start an old call after revocation. During reload the old registry is disposed
before replacement loading; this is not an atomic keep-old-until-ready swap.
[Mod engine][letta-engine]; [execution context][letta-execution].

Pi's official self-reload example defers the request until `agent_settled`.
That is a concrete deadlock lesson: an update command running inside the old
generation must not synchronously wait for that generation's complete drain.
The shared mechanism may return a receipt or schedule owner-managed work;
the actual boundary and completion semantics remain consumer decisions.
[Pi self-reload][pi-reload]; [session reload][pi-session].

### Runtime libraries: matching signatures can hide different guarantees

Cordis is a serious reuse candidate for a trusted Node integration, not evidence
that a new module reconciler must be written. Its registry preserves
fiber identity and configuration while replacing the component/runtime binding;
fibers dispose old effects/dependents and run new activation.
Its HMR transaction can recover certain import/cache failures, but activation
failure leaves a failed fiber. A module's earlier external side effects are
not undone by restoring cache entries. Native addons, host changes and retained
module records also limit indefinite in-process replacement. [Registry][cordis-registry];
[fiber lifecycle][cordis-fiber]; [HMR requirements][cordis-docs];
[maintainer discussion of retained records][cordis-discussion].

The release distinction matters: published `cordis` 4.0.0-rc.13 and
`@cordisjs/hmr` 2.0.0-rc.0 are prereleases. Current source adds a required
filesystem service and changes base-directory configuration relative to that
published HMR revision. Neither is the repository's separately pinned
`@deepseek-ai/cordis` 4.0.1. A shared package cannot silently depend on a newer
main-only assumption or treat these identities as one library.
[Published-source HMR][cordis-published]; [current-source HMR][cordis-main];
registry receipts are retained in the runtime lane ledger.

In go-plugin, the inspected `Client.Kill` calls protocol close before its later
exit timeout. The gRPC path asks a controller to shut down, and the controller
uses server stop. An explanatory TODO about graceful stop is historical context;
the decisive current fact is the invoked stop path, which can terminate active
RPCs. Reuse its startup, handshake and process
custody instead of reimplementing them, but retain application admission,
generation routing and work settlement in the consuming owner.
[Released client][go-client]; [RPC close][go-close]; [controller shutdown][go-stop].

The published Extism JavaScript SDK 2.0.0-rc13 is a separate implementation from
the Rust runtime. In that inspected version, foreground close closes WASI contexts while
retaining the instance; background close terminates its worker but does not
itself contain a pending-call settlement path. Timeout recovery has an explicit
hung-state limitation if worker restart fails. These are source observations,
not reproduced incidents. They prohibit transferring a Rust engine's guarantees
or treating every backend close as proof of revocation, settled work and absent
resources. [Foreground source][extism-foreground]; [worker source][extism-background].

VS Code makes the execution boundary explicit at application scale. Its current
source rejects dynamic removal once extension activation has started. Host
termination coordinates deactivation but races it against a deadline before
exit. The surrounding application can remain available while its extension host
restarts; this does not prove that current extension work is uninterrupted.
Reusing that boundary principle is different from copying workbench internals
into a portable library. [Removal eligibility][vscode-removal];
[host termination][vscode-host].

### Browser boundaries expose missing ownership

single-spa provides a useful example of an ordinary reusable lifecycle library.
It separates loading from UI mounting and permits immediate unload or waiting
for unmount. Its timeout implementation either keeps waiting after logging or
rejects a wrapper promise; it does not terminate the original lifecycle code.
Unregistering does not delete the SystemJS registry entry or erase code from
browser memory. DOM, listeners and subscriptions remain lifecycle cleanup
obligations. [API][single-api]; [application lifecycle][single-lifecycle];
[timeout source][single-timeout].

Vite's stable v8.3.8 and inspected v8.4.0-beta.1 source have the same relevant
HMR implementation. `HMRClient.fetchUpdate` awaits the old disposer before
importing the replacement. Import failure is reported to acceptance callbacks
with no replacement value; this path does not reconstruct disposed resources.
The documented acceptance boundary also does not rewire every original import.
Use Vite as development integration; production handoff needs its own qualified
resource boundary. [HMR API][vite-api]; [stable HMR source][vite-source].

Module Federation's current source still removes an old remote's registration
and relevant caches before normalizing a forced replacement. Its shared-use
records are more sophisticated than a single cache delete, but the operation
does not own a renderer root, an escaped export, a socket or application state.
It is a useful loader and dependency-sharing tool, not a general replacement
transaction. [Runtime API][mf-api]; [remote implementation][mf-source].

## Smallest architecture that preserves the vision

The following are responsibility boundaries, not a proposal to create a package
for every row. A port is justified when an actual external dependency or an
independent implementation needs it. Most internal functions can stay ordinary
functions within an existing feature.

| Responsibility | Existing or proposed home | Must remain outside it |
| --- | --- | --- |
| Module identities, declarations and closed composition | Existing Get Modular core/assembly | Artifact discovery, permissions, routing and production recovery |
| Mechanical lifecycle phases and admitted-call/custody accounting | Existing optional GM lifecycle-kernel candidate under its release gates | A second kernel, new product authority or automatic physical cleanup |
| Physical resource acquisition/release | Native Effect scopes or a qualified runtime adapter | Duplicate refcount and permission decisions |
| Executable loading and runtime container | A Node, browser, process or Wasm integration using fitting libraries | Business contracts and inferred universal unload guarantees |
| Residual update coordination | Small reusable code invoked by the existing owner; exact package location open | An independently advancing supervisor or second active-head store |
| Which revision may serve which operation | Existing consumer Host/owner | Neutral library policy defaults that silently choose interruption |
| Artifact identity, trust and distribution | Existing EF/product admission boundary where adopted | Composition compiler or native scope pretending to grant authority |
| Tool, provider, UI and business extension contracts | Their consuming product or separately qualified domain library | One universal plugin interface |

The dependency rule is concrete: the neutral mechanism must not import Node
filesystem APIs, a browser renderer, a database client, Agent Teams session
types, a catalog SDK or Effect-specific domain types. The composition root
wires the appropriate implementations. An explicitly Effect-native integration
can expose native types on its own opted-in boundary; it should not flatten
failure causes, interruption and finalizers into an unqualified Promise wrapper
just to make all implementations look alike.

Product-owned authority and reusable implementation are compatible. Calling a
shared coordination function does not transfer the product's permission to
that function. Conversely, merely naming a second scheduler an adapter does not
make two independently progressing state machines safe. The review must locate
the one authoritative selection operation and show how stale completions are
rejected.

### Existing assets to reuse first

Current Get Modular main is
`33c032f829028967825428bc6b049ed6db1c56b2`. Its composition model already
supports immutable instances and a stable facade selecting a generation through
the Host. The private lifecycle kernel already includes phase transitions,
admitted-call checks and custody accounting. The relevant kernel and common
assembly source blobs are unchanged from the earlier study. A replacement
research task is not a reason to copy or rename them. [Common assembly][gm-cms];
[kernel][gm-kernel]; [kernel admission][gm-kernel-adr].

There is a fresh publication change: npm metadata now reports
`@get-modular/effect` **0.1.1**, with exact Effect peer **4.1.4** and Core/Assembly
0.8 compatibility. The current source README still names the published 0.1.0
line; these are separate observations. The lifecycle-kernel manifest remains
private and its npm latest lookup returns 404. Thus the older research's dated
Effect source-candidate status must not be repeated as current, while the
kernel is still not an ordinary installable public dependency. Registry
publication is not an additional production plugin qualification.
[Effect README][gm-effect]; [kernel manifest][gm-kernel-package];
registry receipts are retained in the ownership lane.

The earlier four-case native Effect experiment remains useful bounded evidence:
bare `ScopedRef` replacement is not safe borrowing, while scoped `RcRef`
retention protects existing borrowers under its owning scope. That evidence
does not establish ready-before-publish coordination, universal interruption
semantics or a runtime update engine. Do not add a second reference counter or
re-run identical tests merely to attach a newer date. [Original experiment
and limits](live-plugin-evolution-vision-and-evidence-2026-11-14.md#fit-of-the-current-get-modular-effect-integration).

## A concrete update operation

This is a proposed responsibility sequence, not a selected public API. Some
profiles cannot prepare two live instances concurrently; their exclusive
resource transition is explicit below.

1. **Obtain an admitted candidate.** The loader/admission owner identifies the
   exact executable closure it controls. An entry-file hash or import query
   alone cannot certify all dependencies. Stable host services are declared
   collaborators, not accidentally frozen by an artifact hash.
2. **Prepare a closed composition.** Reuse the selected composition engine.
   Acquire candidate resources within a candidate-owned scope or container.
   Validate contract compatibility and readiness for the named role. External
   effects during preparation need an explicit application protocol; cleanup
   cannot promise to reverse arbitrary writes.
3. **Ask the existing owner to select.** The owner checks the expected current
   revision, desired revision and applicable policy. A stale candidate cannot
   overwrite a newer choice. The selection commit and any durable record have
   the existing product's authority; no generic library owns a second copy.
4. **Admit work coherently.** Each chosen operation captures the descriptor,
   executable and generation identity it will use. Selection, admission and
   lifetime retention must form one protected acquisition before any asynchronous
   gap can retire the selected resource. If borrowing suspends, the existing
   owner needs a reservation/revalidation protocol; reading current, awaiting a
   borrow and then invoking is insufficient. Current authorization and
   admission are checked separately from retaining resource custody. A tool
   advertised under one contract must not silently run a different contract.
5. **Settle the prior generation under explicit policy.** Completion, deferral,
   cancellation, checkpoint/restart and migration are different profiles.
   This report chooses none as the ordinary-update default. A snapshot may be
   coherent but no longer callable after revocation.
6. **Observe cleanup.** Track whether admission closed, calls settled,
   resources released and the execution container exited. Report failures or
   uncertainty honestly. Cache deletion, promise rejection and a cancellation
   request are insufficient substitutes for those observations.

This sequence defines questions for one owner, not six independent managers.
An already admitted call's semantic boundary must include the collaborators
needed for its consistency promise. It may be a single tool call, the complete
model request or a longer workflow. The library cannot infer the right unit
from a JavaScript function type.

For a stream, subscription or long-lived handle, the required retention interval
extends through consumption and finalization, not merely until the function
returns the handle. If the chosen policy revokes it sooner, admission and
cancellation must report that outcome explicitly. An in-process protected
acquisition also does not establish a distributed or durable publication
transaction.

### Failure semantics that the contract must distinguish

| Failure point | What can honestly remain true | What must not be claimed automatically |
| --- | --- | --- |
| Source fetch/import fails | The owner may retain a healthy old selection if the chosen profile has not already disposed it | All import-time side effects rolled back |
| Candidate readiness fails | Candidate cleanup can be attempted; old selection may remain healthy under an overlap-capable profile | Exclusive resources could always be acquired in parallel |
| Candidate becomes stale | Owner rejects publication and disposes that candidate | A later successful completion is still entitled to publish |
| Selection succeeds, old cleanup fails | New routing and old physical custody can have different status | Selecting old code restores its former resources/state |
| Cancellation is requested | The request reached a cooperative execution boundary | Running work has ceased or its external effects were undone |
| Container exits | Its execution endpoint is gone where observed by the adapter | All external effects, children or remote requests necessarily ceased |
| State migration fails | Recovery follows an explicit schema/operation protocol | A pointer swap reverses committed state changes |

Keep separate error facts for preparation, selection, execution and cleanup.
An error can be typed without exposing a runtime's entire exception model in
the neutral contract. A native adapter should retain its richer cause inside
the opted-in integration and map only the facts needed by the common boundary.

## Three consumer walkthroughs

### An agent adds or revises a tool

The agent produces a candidate through normal admission. The tool's input and
output contract and its executor are captured together for the chosen model
request or turn. The next permitted boundary can select the new tool set.
Already captured work follows the explicit liveness policy: it may continue,
be deferred or receive a typed unavailability result. Capturing a function
does not authorize new calls after its owner is retired.

An agent requesting its own update gets a receipt or hands scheduling to the
existing owner; it does not wait inside its old invocation for that invocation
to drain. Installation, permission changes and activation are distinguishable.
Agent authorship supplies no additional privilege. OpenCode, Letta and Pi
provide different concrete pieces of this pattern; none alone proves the whole
proposed consumer contract. [OpenCode tools][oc-tools];
[Letta execution][letta-execution]; [Pi example][pi-reload].

### A streaming provider owns an exclusive connection

Two candidates may be unable to acquire the same port, device, session or
fenced external resource. Do not call a failed parallel acquisition a generic
update bug. The consumer must either place the shared exclusive resource behind
an existing stable owner, define a controlled stop/reconstruct operation, or
adopt a qualified transfer protocol. A new broker is not free: its lifetime,
authority and failure behavior need evidence.

The already accepted interactive provider direction is not reopened by this
research. For additional capabilities, selection of a live replacement profile
requires a real availability and interruption promise. An ordinary update's
ability to stop the healthy provider remains the owner's open question. A
generic timeout must not secretly decide it. The library should expose the
unsatisfied prerequisite rather than manufacture a zero-interruption guarantee.

### A UI extension changes while a user is editing

The remote loader can fetch another component revision. The renderer owns
mount/unmount, event listeners and the editing surface. The consumer determines
whether form state is external, serializable, compatible or deliberately reset
at a permitted boundary. The common mechanism can coordinate the revision and
the adapter's observations; it cannot migrate arbitrary renderer internals.

For a single-spa application, reuse its existing lifecycle helpers. For a
framework component, use that framework's qualified root lifecycle. Add a
generic UI adapter only when a second implementation demonstrates a useful
shared contract. Module Federation loading and Vite development HMR can remain
separate integrations. [single-spa lifecycle][single-lifecycle];
[Module Federation implementation][mf-source].

## Applying Clean Architecture, SOLID and DRY

These principles should remove concrete coupling and duplicated ownership.
They do not justify an abstraction layer for every function.

| Principle | Concrete design consequence | Review question |
| --- | --- | --- |
| Clean Architecture and dependency inversion | Neutral code accepts narrow operations; filesystem, renderer, Effect and transport integrations are outside it | Can a consumer exercise the mechanism without importing our product or its infrastructure? |
| Single responsibility | Composition, admission, selection and physical cleanup have named owners | Which invariant would have two authoritative writers after extraction? |
| Open extension | Add an adapter for a real runtime without modifying every product contract | Does another backend require changing the neutral algorithm or only its integration? |
| Substitutability | Adapter guarantees are behaviorally qualified | Does close mean request, resource release, call settlement or observed process exit? |
| Interface segregation | Pure contributions, UI and stateful execution use only their required operations | Are unused hooks mandatory merely because another category needs them? |
| DRY | Reuse GM graph checks, kernel accounting and native scopes | Are we duplicating an invariant, or only seeing superficially similar syntax? |
| Modular design | Package boundaries follow independent ownership and dependency direction | Does a new package have a real independently useful consumer? |
| Domain boundaries | Artifact, runtime generation, operation and permission remain distinct concepts | Did a generic plugin object accidentally merge their identities or authority? |

A practical design review should inspect the import graph and ownership table,
not count interfaces. A small adapter can contain platform-specific code.
Two adapters may legitimately differ where their guarantees differ. Conversely,
two identical local kernels with separate fixes are a genuine reuse problem.

## Alternatives and package placement

| Alternative | Appropriate use | Main cost or risk | Current research recommendation |
| --- | --- | --- | --- |
| Reuse current GM/native primitives; add residual coordination only where demonstrated | Projects needing composition plus controlled live boundaries | Must prove the remaining common algorithm and its external contract | Preferred direction for the next design/qualification slice |
| Effect-native integration under the same owner | An application already using native Effect | Public consumer coupling and cancellation/finalizer translation if generalized carelessly | Useful explicit profile; keep native semantics and optional adoption |
| Adopt a complete existing framework such as Cordis | A consumer that wants its full service/lifecycle model | Overlap with GM ownership, prerelease/runtime constraints and different update semantics | Compare as an alternative; do not stack competing graph/lifetime owners |
| Reuse process/RPC or Wasm execution libraries behind a narrow adapter | A named isolation, termination or language boundary | Serialization, process/container costs, state and application admission remain | Use where the profile needs it; qualify the concrete backend |
| Build a broad plugin platform immediately | A proven multi-product need including artifacts, UI, marketplaces and orchestration | Large public contract, duplicated existing responsibilities and speculative adapters | Evidence does not justify this scope now |

Package location follows ownership. A new GM leaf could be appropriate if the
residual concern is genuinely neutral composition-adjacent coordination and its
maintainers accept that scope. EF can own qualified neutral protocol/conformance
pieces within its accepted boundary; it cannot import GM's composition core or
become a product Host. A product-owned adapter may consume both. Design a
demonstrated shared concern as a purpose-neutral ordinary library from its first
real consumer plus external conformance in the same delivery. An internal seam
can stage packaging; it is not permission to incubate copied product-local
semantics and defer portability. If there is no residual shared invariant, a
qualified recipe may be the complete result. No placement is selected by this
report.

### Conditional implementation estimates

These are expert planning bands for a **single trusted in-process cohort and
one JavaScript execution agent**, not measured delivery forecasts. Candidate
bytes, permission/readiness/recovery owners and existing GM/kernel/native
primitives are assumed. **P** is new reusable production mechanism, **I** new
code for one consumer integration and **T** new tests including external
fixtures. These categories do not overlap. Existing reused code is not counted
as newly written code. Modified existing LOC is unmeasured, not included or
assumed zero. The alternatives are not additive.

| Alternative | P, LOC | I, LOC | T, LOC | What the estimate covers |
| --- | ---: | ---: | ---: | --- |
| Qualified recipe using existing primitives | 0 | 150–350 | 350–750 | One integration and bounded evidence; no new package and no kernel publication |
| Neutral coordination with one ordinary execution implementation | 400–900 | 150–350 | 900–1,800 | Residual shared mechanism plus external package/typing/behavior fixtures |
| Effect-native coordination | 200–500 | 120–300 | 700–1,400 | Native consumers, retained error/interruption/finalizer semantics |
| Later genuinely different execution implementation | +200–500 | +120–300 | +500–1,000 | Conditional addition only after a real consumer demonstrates the need |
| Broad plugin platform | Not estimated | Not estimated | Not estimated | Contracts and deployment scope are not sufficiently selected |

Code loading, artifact admission, authorization, distributed/durable publication,
state migration, hostile-code isolation, full UI behavior, documentation,
release delivery and migration of a non-Effect application are outside these
bands. They must not be presented as the total cost of shipping a general public
plugin platform. The previous report's smaller one-consumer integration bands
did not include the same external-library obligations.

The investigator's confidence in these estimates is **6/10 for native Effect**
and **5/10 for ordinary coordination**; implementation complexity judgments are
**5/10** and **6/10**, respectively. For the same explicitly bounded invariants,
both routes receive an achievable reliability judgment of **8/10 after
conformance**, not a measured failure probability, availability, security or
whole-platform score. The actual production promise requires its own evidence.

## Qualification path before a public library

1. **Name the first useful operation and supported profile.** Use a real
   consumer, its actual capability contract and existing authority. Preserve
   accepted provider choices. State the update boundary and which interruption
   choices still require an owner decision.
2. **Subtract existing implementation.** Inventory GM/native primitives and
   the chosen loader/executor. Demonstrate a residual common responsibility;
   if none remains, deliver the qualified integration instead of a new package.
3. **Exercise an ordinary external consumer.** No Agent Teams types,
   organization credentials, catalog or product database should be needed by
   the neutral mechanism. Do not fake portability by renaming a copy of the
   same product fixture. Preserve the actual adapter/profile limitations.
4. **Write an independent external conformance fixture.** Cover stale completion, candidate
   failure, captured descriptor/executor consistency, resource ownership,
   close uncertainty and policy observance. The fixture must be independently
   authored against the boundary and observe real behavior. Stronger independent
   implementations required for a stable extension SPI remain a separate gate;
   they are not imposed on every ordinary library experiment.
5. **Decide publication and compatibility.** Choose the owning package, named
   guarantees, supported versions and API stability only after that evidence.
   Ordinary library admission, stable extension SPI and production adoption
   remain separate gates; do not substitute one for another.

The highest-value additional experiments are targeted, not a new broad test
matrix: one late old call across replacement, one candidate that fails after
acquiring a real resource, one stale candidate after a newer desired revision,
one failed cleanup, and one materially different consumer. Add an exclusive
resource or UI scenario when its profile becomes part of the selected scope.
Native finalizer tests already retained should be reused when applicable.

Rapid agent-authored changes also need a declared resource envelope. Pending
candidates can be coalesced under owner policy; published generations, retained
calls and memory cannot grow without a bound. The eventual response to pressure
is a product policy choice and may be deferral or rejection. It must not become
an implicit ordinary-update cancellation rule. In-process module-cache retention
may require a qualified worker/process recycling boundary for sustained churn.

## Validation and open choices

Two bounded cross-review rounds checked the synthesis and peer reports. The
[review record](plugin-research-review-and-decision-record.md#portable-library-mechanism-review-2026-11-17)
retains the material corrections and their dispositions. The final packet
contains the exact reviewed hashes; later root edits add this navigation,
the already proposed external-consumer example and spelling/source-link fixes.

This follow-up provides source evidence, architectural alternatives and a
qualification plan. It adds no production source, dependencies, public types,
runtime tests or releases. Documentation checks and the exact research branch
CI are recorded in the adjacent validation receipt and PR. Passing those checks
validates this documentation change, not a universal live-plugin runtime.

The remaining substantive choices are the first new consumer/profile, any
ordinary-update interruption policy, the residual shared contract and its owner,
and supported execution adapters. They remain in
[OD-003](../open-decisions/OD-003-module-runtime-and-public-spi-choices.md).
The vision is recorded now so future code does not couple these responsibilities
in a way that forces an avoidable rewrite.

## Source navigation

The evidence archive contains the full source ledgers, exact inspected symbols,
release metadata and per-claim limits. These links identify the most relevant
primary implementation paths; they are not substitutes for release/qualification
evidence.

[ef-agents]: https://github.com/agent-teams-ai/extension-foundation/blob/4285fc983a954390d81d19ade861acb2c0a4177a/AGENTS.md
[od-existing]: https://github.com/agent-teams-ai/extension-foundation/blob/4285fc983a954390d81d19ade861acb2c0a4177a/docs/open-decisions/OD-003-module-runtime-and-public-spi-choices.md#owner-discussion-todo-shared-host-mechanics
[oc-source]: https://github.com/anomalyco/opencode/blob/fd9137efec534fafb60102787022a782140365a4/packages/plugin/src/source.ts
[oc-node]: https://github.com/anomalyco/opencode/blob/fd9137efec534fafb60102787022a782140365a4/packages/plugin/src/source.node.ts
[oc-bun]: https://github.com/anomalyco/opencode/blob/fd9137efec534fafb60102787022a782140365a4/packages/plugin/src/source.bun.ts
[oc-activation]: https://github.com/anomalyco/opencode/blob/fd9137efec534fafb60102787022a782140365a4/packages/core/src/plugin.ts
[oc-tools]: https://github.com/anomalyco/opencode/blob/fd9137efec534fafb60102787022a782140365a4/packages/core/src/tool.ts
[oc-layer]: https://github.com/anomalyco/opencode/blob/fd9137efec534fafb60102787022a782140365a4/packages/util/src/effect/layer-node.ts
[oc-util]: https://github.com/anomalyco/opencode/blob/fd9137efec534fafb60102787022a782140365a4/packages/util/package.json
[letta-engine]: https://github.com/letta-ai/letta-code/blob/a472af0d66b42d5d9d6f13e1b8d2602eb33026c9/src/mods/mod-engine.ts
[letta-execution]: https://github.com/letta-ai/letta-code/blob/a472af0d66b42d5d9d6f13e1b8d2602eb33026c9/src/tools/manager.ts
[pi-reload]: https://github.com/earendil-works/pi/blob/5a2febe5d7638ab05540b44a60518b41201be170/packages/coding-agent/examples/extensions/reload-runtime.ts
[pi-session]: https://github.com/earendil-works/pi/blob/5a2febe5d7638ab05540b44a60518b41201be170/packages/coding-agent/src/core/agent-session.ts
[single-api]: https://single-spa.js.org/docs/api/
[single-lifecycle]: https://single-spa.js.org/docs/building-applications/
[single-timeout]: https://github.com/single-spa/single-spa/blob/b619c26f0a39bbc8f175805a361a88a22fbd6d9b/src/applications/timeouts.js
[vite-api]: https://vite.dev/guide/api-hmr
[vite-source]: https://github.com/vitejs/vite/blob/b39e6e63dcbfc3cf4be871acf3554efbd6d0e268/packages/vite/src/shared/hmr.ts
[mf-api]: https://module-federation.io/guide/runtime/runtime-api.html
[mf-source]: https://github.com/module-federation/core/blob/d4a31960d20a717626af43be59aab0881c7b6cc0/packages/runtime-core/src/remote/index.ts
[gm-cms]: https://github.com/agent-teams-ai/get-modular/blob/33c032f829028967825428bc6b049ed6db1c56b2/docs/architecture/common-assembly.md
[gm-kernel]: https://github.com/agent-teams-ai/get-modular/blob/33c032f829028967825428bc6b049ed6db1c56b2/packages/lifecycle-kernel/src/features/lifecycle/kernel.ts
[gm-kernel-adr]: https://github.com/agent-teams-ai/get-modular/blob/33c032f829028967825428bc6b049ed6db1c56b2/docs/decisions/0029-admit-an-optional-lifecycle-kernel-candidate.md
[gm-kernel-package]: https://github.com/agent-teams-ai/get-modular/blob/33c032f829028967825428bc6b049ed6db1c56b2/packages/lifecycle-kernel/package.json
[gm-effect]: https://github.com/agent-teams-ai/get-modular/blob/33c032f829028967825428bc6b049ed6db1c56b2/packages/effect/README.md
[cordis-registry]: https://github.com/cordiverse/cordis/blob/bc9fae7a92de7f74417e54eaf3decdecf71f937a/packages/core/src/registry.ts
[cordis-fiber]: https://github.com/cordiverse/cordis/blob/bc9fae7a92de7f74417e54eaf3decdecf71f937a/packages/core/src/fiber.ts
[cordis-docs]: https://github.com/cordiverse/cordis/blob/86f59e4e0bffd9bf5868f81200f5fa6c0202a872/packages/hmr/README.md
[cordis-published]: https://github.com/cordiverse/cordis/blob/bc9fae7a92de7f74417e54eaf3decdecf71f937a/packages/hmr/src/index.ts
[cordis-main]: https://github.com/cordiverse/cordis/blob/86f59e4e0bffd9bf5868f81200f5fa6c0202a872/packages/hmr/src/index.ts
[cordis-discussion]: https://github.com/cordiverse/cordis/issues/243
[go-client]: https://github.com/hashicorp/go-plugin/blob/155dcddc94873a285e14b7fa24b2f6ab6139668e/client.go
[go-close]: https://github.com/hashicorp/go-plugin/blob/155dcddc94873a285e14b7fa24b2f6ab6139668e/grpc_client.go
[go-stop]: https://github.com/hashicorp/go-plugin/blob/155dcddc94873a285e14b7fa24b2f6ab6139668e/grpc_controller.go
[extism-foreground]: https://github.com/extism/js-sdk/blob/bec25c60d0ad32ce06d3934563fd8560f486f323/src/foreground-plugin.ts
[extism-background]: https://github.com/extism/js-sdk/blob/bec25c60d0ad32ce06d3934563fd8560f486f323/src/background-plugin.ts
[vscode-removal]: https://github.com/microsoft/vscode/blob/3808bcd7ee4acef05d4870d04ade43735f351ff5/src/vs/workbench/services/extensions/common/abstractExtensionService.ts
[vscode-host]: https://github.com/microsoft/vscode/blob/3808bcd7ee4acef05d4870d04ade43735f351ff5/src/vs/workbench/api/common/extHostExtensionService.ts
