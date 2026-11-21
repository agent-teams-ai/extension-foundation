---
id: research.reuse-first-live-updates
type: research
status: active
owner: architecture
summary: Investigates existing plugin runtimes, granular live updates, resource ownership and TypeScript-first optional WebAssembly boundaries with explicit uncertainties and bounded qualification.
---

# Reuse First Live Plugin Updates 2026-11-22

<!-- cspell:words bindgen Chokidar coalescible EBADF EEXIST embeddability kvstore refreshable -->

## Recommendation and authority

**Keep ordinary TypeScript plugins as the first implementation profile. Preserve
narrow consumer-owned contracts and explicit state/resource lifetimes now;
qualify an optional WebAssembly adapter when one actual capability needs another
language or execution boundary. Reuse existing mechanisms at every layer.**
Extism is the library the owner explicitly remembered, not merely our guess.

The owner asks for deep research, critical industry comparison, disposable
experiments, warnings against accidental duplication and immediately pushed
checkpoints. The [November 22 clarification in OD-003](../open-decisions/OD-003-module-runtime-and-public-spi-choices.md#owner-requested-reuse-first-design-and-granular-updates-2026-11-22)
records that direction. Granular live updates should influence feature boundaries
from the start. A complete Wasm implementation, public SPI or new platform is
not implicitly adopted. Ordinary update defaults, grants, escalation, state
migration and exact production execution profiles remain open there.

The architectural advantage to pursue is a supported update whose effects are
predictable: users can see what changes, which work continues, what state
survives and which resources still need cleanup. Arbitrary running code changing
without interruption or bugs is not a supported promise. A targeted plugin or
component restart can preserve the surrounding application and its state.

This record extends the [November 21 mode and component experiments](live-update-policies-and-portable-runtimes-2026-11-21.md),
the [existing reuse inventory](reusable-generation-mechanisms-and-ownership.md)
and the [research reference](plugin-system-research-reference.md).
It is non-normative research with native experiments, not a production runtime,
release, SDK publication or migration of accepted consumers. Dates use
Europe/Kiev; source and execution receipts retain their original timestamps.

## Findings that materially change the recommendation

1. **There is useful ready-made machinery above the Wasm layer.** The resource
   spike uses published Get Modular Resources for acquisition, late completion,
   cleanup and unresolved debt. Native Effect remains an alternative in a
   consumer that adopts that profile, not a second owner of the same resources.
2. **Extism is a real candidate with SDK-specific limits.** Its JS SDK does not
   inherit native Wasmtime guarantees. Both tested declaration sets fail direct
   strict TypeScript 7.0.2 checking; successful runtime probes do not resolve
   that production integration issue.
3. **SDK close and application retirement are separate facts.** Tested foreground
   instances remain callable after close; worker close leaves a dispatched call
   unsettled during the observed window. An adapter cannot infer stronger
   guarantees from that receipt alone.
4. **The wasmCloud embedding recommendation needs qualification.** Useful runtime
   source exists, but the current release marks `wash-runtime` internal and
   unpublished. Supported host distribution or exact-source integration needs
   evaluation before treating it as a released library.
5. **Hot reload is not one interchangeable industry guarantee.** Flutter/Dart,
   React, OSGi, OTP and server generations make different choices about state,
   old code, resources and fallback. Reuse a mechanism with its actual limits.
6. **The smallest safe update unit follows ownership and dependencies.** It can
   be a plugin component, provider cohort, Wasm instance or executor. It is not
   necessarily a changed file, package or arbitrary method. Unknown retained
   references can require a larger restart.

The [source ledger](evidence/plugin-reload-reuse-20261122.sources.json) separates
inspected source, documented behavior, unexecuted upstream tests and new native
observations. Detailed reports, reviews, sources and original failures are
retained in the evidence packet described below.

## Actual ownership and available mechanisms

At inspected EF baseline `534fa846`, the production package catalog is empty.
Substantial graph/lifecycle/recovery code under `tests/qualification/` consists
of research fixtures. The risk is promoting it into another generic runtime;
we have not identified an already shipped proprietary Wasm engine. This is an
audit of the named scope, not every organization repository. The older manually
connected 17-line Rust scalar fixture is not a public SDK to grow into a general ABI.

| Concern | Verified owner or availability | Consequence |
| --- | --- | --- |
| Declarations, graph preparation and composition | [ADR-0015](../decisions/0015-authorize-get-modular-semantic-extraction.md) assigns neutral semantics to Get Modular. | No shadow graph compiler or global service locator. |
| Concrete feature ports, loading and lifecycle authority | [ADR-0014](../decisions/0014-product-local-module-authoring-composition-and-generation-guardrails.md) keeps these with the consumer. | Adapter details stay outside feature logic; shared mechanism does not become a second authority. |
| Current GM source | [33c032f8](https://github.com/agent-teams-ai/get-modular/tree/33c032f829028967825428bc6b049ed6db1c56b2): Core/Assembly 0.8.0, Resources 0.2.2, Observation 0.2.1, Effect integration 0.1.1. | Resources 0.2.2 was installed and executed here; availability does not upgrade other consumers. |
| Lifecycle kernel | GM private, unreleased candidate. | Do not deep-import it, copy it or call it a released plugin runtime. |
| Actual Orchestrator adoption | [ADR-0117 at inspected main](https://github.com/agent-teams-ai/agent-teams-orchestrator/blob/a34587b313e656eeb43d755b4a4f08c40dff2116/docs/decisions/0117-reconcile-mandatory-module-composition.md) retains Core/Assembly 0.5.0 and its CMS pin. | Research dependencies do not silently migrate this product or adopt Effect there. |
| Artifact distribution/signing | [ADR-0002](../decisions/0002-oci-oras-and-cosign-distribution-baseline.md), OCI Distribution, ORAS and Cosign. | Avoid a registry, signing protocol or artifact identity per runtime language. |

The [warning map](evidence/plugin-reload-reuse-20261122.warnings.json) links all
24 surfaces to exact repository paths and source identities. These are scoped
risks or demonstrated experimental limits, not 24 alleged production defects.

## Extism, Component Model and other ready-made options

| Option | Reuse it for | Remaining decision or qualification |
| --- | --- | --- |
| Ordinary TS and existing composition/resources | Direct feature calls, typed integrations and scoped lifetime. | State semantics, operation boundary and update profile stay consumer-owned. |
| Extism SDK/PDK | Existing plugin ABI, guest toolchains, loading, imports, invocation and selected instance controls. | Select exact Host SDK, release channel, limits and deployment; its ABI differs from WIT components. |
| WIT and jco | Typed component boundaries and generated JS hosting artifacts. | Qualify the actual data/resource/error contract and exact Node/browser profile. |
| ComponentizeJS | Components built from supported JavaScript with an included JS engine. | No automatic performance win, universal JS environment or authoring/build sandbox. |
| wit-bindgen and Wasmtime component bindings | Generated guest bindings and separately generated Rust host bindings. | Consumer semantics, grants, state compatibility and update policy are not generated. |
| Wasmtime | Native execution and qualified interruption/resource mechanisms. | Host IO and resource custody still need bounds; native packaging adds release work. |
| wasmCloud | Existing workload/host/component lifecycle where that execution unit fits. | Current runtime source is internal/unpublished; distribution and support remain open. |
| Spin | Existing development/build/watch/restart loop for a Spin application. | That unit does not automatically fit arbitrary TS modules or UI contributions. |

Primary navigation: [Extism JS SDK](https://github.com/extism/js-sdk),
[Component Model](https://component-model.bytecodealliance.org/design/why-component-model.html),
[jco](https://bytecodealliance.github.io/jco/),
[ComponentizeJS](https://github.com/bytecodealliance/ComponentizeJS),
[wit-bindgen](https://github.com/bytecodealliance/wit-bindgen),
[Wasmtime components](https://docs.wasmtime.dev/api/wasmtime/component/index.html),
[Spin](https://spinframework.dev/v4/running-apps).
Moving documentation is navigation; exact inspected identities and evidence
classes live in the ledger. Current jco documentation retains stability caveats.

Do not implement Extism and Component Model production adapters simultaneously
just to preserve options. One narrow feature contract and an independently
qualified alternative can prove a useful boundary. Adding both stacks multiplies
packaging, diagnostics and conformance work. Choosing Extism for one port does
not require every TS operation to become bytes or an SDK object to enter domain code.

### Extism: exact new evidence

The experiment executes repository pin `@extism/extism@1.0.3` and separately
installed `2.0.0-rc13`, which npm's latest channel currently selects. A
latest-channel prerelease is not stable adoption. Source identities are
`e0c1672e7469e7fd9d253d43f55c0c488e08aae1` and
`bec25c60d0ad32ce06d3934563fd8560f486f323` respectively.

The official Rust-PDK `count_vowels_kvstore.wasm` guest is 74,029 bytes,
SHA-256 `6360898f83288ae74fe51776863376060fa725c7a4c2581ed93204bc6e661954`.
It uses the existing PDK/ABI; no ABI was authored and Rust was not compiled in
this lane. Native TypeScript and this guest implement one small text-analysis
contract with independently stated expected results.

| Observation | Establishes | Does not establish |
| --- | --- | --- |
| TS then Rust gives host totals 2, 4 and 7; draft survives reset/fresh instances. | A narrow consumer port hides SDK invocation and preserves host-owned state. | Later Rust replacement uses the same bytes with changed configuration, not newly compiled Rust code. |
| Old async host import is held while new instance commits; old resumed write rejects. | The existing state/import owner enforces the fixture's local epoch. | Distributed fencing, arbitrary effect cancellation or stack migration. |
| In the tested worker profile, active reset returns false and a reentrant call rejects. | That instance is not an unlimited concurrent pool. | Other execution profiles, fair scheduling or automatic queue ownership. |
| Missing imports, bad hash and malformed Wasm reject. | Actual SDK errors leave the selected TS fixture usable. | Semantic compatibility, authorization or complete malformed-input security. |
| Foreground calls still work after close in both SDKs. | Close is not invocation revocation in this profile. | Every Host SDK has identical behavior. |
| Worker close resolves; dispatched call remains pending/active 100 ms later. | Close did not settle the outstanding operation in the observed window. | Forever-pending behavior, explicit guest-entry instrumentation or independently observed physical exit. |
| rc13 timeout rejects a CPU loop and hanging initializer. | Existing SDK machinery covers these tested timeouts. | Universal per-call cancel or interruption of all host IO. |
| After timeout, `functionExists('loop')` succeeds. | A subsequent control query works. | Successful second guest invocation or full workload recovery. |
| rc13 `memory.maxPages: 1` allows 17 guest pages initially and 18 after a call. | SDK allocation budget is not a general cap on this guest's exported memory. | A conclusion about native Wasmtime-backed Extism limits. |

Memory was 1,114,112 then 1,179,648 bytes, against one 65,536-byte page. A shared
adapter cannot advertise a universal memory limit from an option whose actual
scope differs. Raw SDK memory views also should not become retained domain state.

**14/14 behavior cases pass** on Node 24.22.3. The own harness passes strict
TypeScript 7.0.2. Separately, both SDK declaration sets produce TS2508 at
`PluginOutput extends DataView` under the minimal direct-import check. The
behavior harness validates unknown runtime values at a research boundary; it
does not suppress checking, patch the SDK, downgrade TypeScript or qualify those
declarations. This preserves runtime observations without claiming the final
SDK integration is ready.

The JS SDK uses its JavaScript runtime's Wasm engine rather than libextism.
rc13 close awaits worker termination internally; that still did not settle the
caller's pending promise in the observation window. Inspect the selected release
instead of importing native runtime guarantees or treating an old closed issue
as proof of a currently unfixed defect.

### wasmCloud availability correction

Release `v2.12.3`, revision `8358f1f56a66c43aedc49f30e2c5d4fa2b4f7ca1`, was
published on November 22 in Kyiv. Its
[runtime manifest](https://github.com/wasmCloud/wasmCloud/blob/8358f1f56a66c43aedc49f30e2c5d4fa2b4f7ca1/crates/wash-runtime/Cargo.toml)
marks `wash-runtime` internal with `publish = false`, while the
[embedding guide](https://wasmcloud.com/docs/runtime/building-custom-hosts/)
still illustrates a wildcard dependency. Source embeddability is real; an
ordinary published-library contract for this release is not established.

The source contains workload generation/revocation, deferred unbind, store
reconstruction and failure isolation worth comparing before writing another
supervisor. These were inspected, not executed. Evaluate the supported host
distribution or exact-source integration with its support/release cost. Linked
native host plugins and runtime-loaded Wasm host component plugins are distinct;
neither automatically has a frontend widget's or ordinary TS capability's boundary.

## Industry mechanisms and limits

Prior research already covered many of these systems. The additions concern exact
retention, initialization, lifetime and readiness behavior; older evidence is
not being relabeled as new execution. Pins and moving-source caveats are retained.

| System and mechanism | Useful transfer | Limitation or counterexample |
| --- | --- | --- |
| Flutter/Dart VM reload and widget rebuilding | Preserve working context; classify changes needing restart. | Existing frames/closures and later method lookup can use different code histories; preserved state need not match a clean old/new application. |
| React refresh family/signature classification | Preserve eligible state, remount a region, retain stable parent draft. | Effects rerun even with empty dependencies; the selected transform includes state initializer source in the signature. |
| Vite acceptance/invalidation and disposal | Reuse the dev loader/compiler/renderer integration. | Old disposal precedes new import. Failure can leave old resources unavailable; recovery can call the old disposer again. |
| IntelliJ eligible dynamic plugins and service scopes | Bind work to plugin plus project/application lifetime; explain restart fallback. | Longer-lived project work can retain an unloaded plugin; cancellation and completion are different. |
| OSGi binding policy and dependent refresh | Use actual dependency closure and exact service registrations. | Artifact updates need not rewire retained consumers; late old unbind must not erase the successor. |
| OTP prepared code loading, safe points and old-code retention | Distinguish installation, state transformation, retirement and reboot selection. | Old references can prevent soft purge; forced purge can terminate processes; release checks may execute instructions. |
| NGINX independently owned worker generations | Validate candidates and finish applicable old work. | Server startup/transition is not an arbitrary plugin readiness handshake. |
| Envoy initialization, handoff and separate drain/shutdown | Keep ready, selected, draining and retired facts distinct. | Existing connections do not move; acceptance is not a global application transaction. |

Primary navigation: [Flutter](https://docs.flutter.dev/tools/hot-reload),
[Dart runtime semantics](https://github.com/dart-lang/sdk/blob/c8a0db5978a68d4037f7e5294ffc79867935c8c2/runtime/docs/hot-reload.md),
[React Native refresh](https://reactnative.dev/docs/fast-refresh),
[Vite HMR](https://vite.dev/guide/api-hmr),
[IntelliJ scopes](https://plugins.jetbrains.com/docs/intellij/coroutine-scopes.html),
[OSGi services](https://docs.osgi.org/specification/osgi.cmpn/8.1.0/service.component.html),
[OSGi wiring](https://docs.osgi.org/specification/osgi.core/8.0.0/framework.wiring.html),
[OTP release handling](https://github.com/erlang/otp/blob/OTP-29.1.2/lib/sasl/src/release_handler.erl),
[NGINX](https://nginx.org/en/docs/control.html),
[Envoy 1.40.2](https://www.envoyproxy.io/docs/envoy/v1.40.2/intro/arch_overview/operations/hot_restart).

### Learn from Flutter without recreating a VM

Flutter gives a valuable interaction goal: change behavior while retaining the
working context. Its development reload does not rerun `main` or `initState`;
incompatible types or native changes need broader restart. Dart's method/closure
semantics differ from pinning a complete provider set per business operation.
Even `reassemble` is not a safe-point barrier: a timer may render new code first.
[Official ordering contract](https://api.flutter.dev/flutter/widgets/State/reassemble.html).

For example, retaining a field interpreted as USD while new logic assumes EUR
can preserve an object and break a feature invariant. Structural compatibility
cannot decide the meaning. The state owner must choose preservation, directional
migration, reset, restart or refusal. For request-oriented business work, an
immutable implementation/dependency closure per operation is the more predictable
proposal. A development UI refresh may deliberately use different semantics.
There is no reason to write a TS heap/closure patcher to emulate Dart.

### React and Vite: native refresh with an application boundary

The inspected released chain is plugin-react 6.3.0, Vite 8.3.8, Rolldown 1.2.19
and Oxc transformer 0.156.0. The plugin uses Oxc refresh by default; React tests
using a different transform cannot alone predict its behavior. Exact
[Oxc signature source](https://github.com/oxc-project/oxc/blob/75efdca4747c4ad9b252542743098d4894f8005b/crates/oxc_transformer/src/jsx/refresh.rs)
includes the first `useState` argument. Review corrected an early assumption
about initializer preservation before execution.

The native fixture separates an unchanged-signature edit, new hook, new
initializer, held old callback and failed module evaluation. Effects should
register reversible owned resources; a domain action placed in refreshable
setup can run again and needs its existing effect/idempotency owner. Keeping a
draft outside the replaceable region does not require a custom renderer.
The executed results below do not establish production authorization, arbitrary
state migration, module-cache reclamation or hostile-code isolation.

## Reuse warnings to carry into the review

For each proposed mechanism, identify the existing owner and demonstrated missing
behavior. These 24 warnings are a design/review aid, not a new approval procedure
or a ban on small consumer adapters. Source IDs in this register refer to the
`audit` section of the [source ledger](evidence/plugin-reload-reuse-20261122.sources.json).
The [warning map](evidence/plugin-reload-reuse-20261122.warnings.json) supplies
exact code/decision paths and separates existing mechanisms from candidates.

| ID / surface and owner | Reuse before writing | Warning and exact follow-up |
| --- | --- | --- |
| W01 Metadata discovery and inventory — consumer loader, GM declaration owner | Existing inert declarations, generated read-only inventories and literal target-local import tables; EF ADR-0014 | **Warn if discovery imports all installed plugins or adds a hand-maintained global registry.** Verify zero top-level evaluation of unselected/invalid sentinels. Automatic import-table generation needs measured wiring complexity; inert catalog discovery never grants execution. |
| W02 Executable loading and cache invalidation — target loader/build adapter | Runtime module loader and selected bundler; Vite HMR in development; isolated execution instance where reset is required | **Warn if `?version=` or deleting a cache is described as complete reload.** Node loads query-distinct ESM URLs, but a new entry URL does not version relative imports or release retained exports. Qualify the full import closure, lazy imports, cleanup and churn on each target. [N1] |
| W03 Composition, DI, dependency ordering — Get Modular | Core/Assembly and the consumer's exact accepted profile | **Warn on another resolver, topological compiler, priority-by-registration convention, universal service bag, or production import of EF graph/lifecycle fixtures.** Missing graph capability belongs to GM's owner; do not repair it with a shadow compiler. [G1, O1] |
| W04 Affected component closure — GM topology plus consumer lifetime/import evidence | Existing immutable composition plan and generated reverse dependency information; platform-native HMR graph only for its own role | **Warn when replacing a single provider while live consumers retain it, or creating a second authoritative dependency graph.** Check construction, code-import and operational retention edges. A changed source file, plugin artifact, contribution, generation and worker are different units. Unknown retained edges require expanding the supported restart boundary or declining the update. [E4] |
| W05 Commands, hooks and registrations — capability and registration owners | Narrow declared ordered capabilities; Node/framework event APIs for local notifications; exact disposable registrations | **Warn on a new global event bus or cleanup by logical name alone.** Test late old cleanup after v2 registers the same logical hook. Remove the exact owned callback/token; `removeAllListeners` can delete the successor. State notifications are not durable commands. [O2, new case2] |
| W06 Resource acquisition and cleanup — resource owner | `@get-modular/resources` in its qualified ordinary profile, or native Effect Scope/Layer in an Effect profile; appropriate standard disposal APIs | **Warn on a second cleanup stack, refcount, retry journal or ownership of the same resource by both GM Resources and Effect.** Qualify close during acquisition, late settlement, cleanup failure, reentrancy and borrowed ownership. `complete` reports callback completion, not universal physical release. [G2, G3, G4] |
| W07 Work retention, cancellation and streams — owning operation | Native structured concurrency/fibers where adopted; AbortSignal at foreign IO; resource scope around actual stream consumption | **Warn when returning a stream/promise is counted as work finished, a new root runner loses the caller's context, or abort is reported as stopped.** Test a delayed stream after selection changes and a foreign call that ignores abort. Never restore a closed construction Scope through captured context. [G3, G4, new cases1/5] |
| W08 Execution pools and supervision — actual execution/custody owner | Existing Node Workers/process platform; qualified Piscina/workerpool profile only if fitting; existing local supervisor/hosted platform | **Warn if every plugin adds a process manager, a second keeper, or a pool is treated as one stable worker incarnation.** Qualify kill scope, worker respawn, pending task disposition, descendants and exact exit observation. Prior multiworker pool counterexamples remain relevant; don't erase them by calling `close()` a drain. [E4, O2, N2] |
| W09 Sandboxing, CPU/memory and hard interruption — security/runtime profile | Extism/Wasmtime/WASI or an existing process containment owner, with SDK-specific qualification | **Warn if Worker, signature, WIT or a generic `cancel()` boolean is advertised as a sandbox or universal hard stop.** Qualify CPU loop, stalled host import, external memory, shared executor collateral interruption, malicious imports and actual termination receipt on the selected OS/runtime. Native/JS SDK parity is open until tested. |
| W10 Wasm engine, ABI and code generation — execution adapter/toolchain | Extism SDK/PDK for its ABI; jco/ComponentizeJS for JS component tooling; wit-bindgen for guest bindings; Wasmtime host bindings; evaluate wasmCloud's supported host or exact source embedding before building a backend workload host | **Warn on handwritten general Canonical ABI code or treating Extism ABI and WIT components as interchangeable.** Current wasmCloud v2.12.3 marks wash-runtime internal and publish=false: source embeddability is not a released library contract. The scalar Rust fixture is not SDK code to grow. Choose a real structured interface, generate bindings and qualify results/errors/imports/ownership. Runtime selection remains open; see the companion Extism report's pinned E13 source. |
| W11 RPC and worker messaging — transport adapter | Existing Comlink/workerpool where appropriate; adopted Connect/gRPC/Protobuf at real service boundaries | **Warn on a universal RPC proxy, handwritten promise-correlation framework or hand-framing protocol promoted from qualification code.** Determine the residual need after existing transport. Request IDs are not operation identity or authorization; releasing a proxy does not prove drain or process exit. No serialization layer is needed for ordinary same-process TS calls. [P1, N3, E3] |
| W12 Data codecs and compatibility — owning semantic/wire contract | Existing schema tooling, generated Protobuf or WIT codecs for the boundary actually selected | **Warn if SDK DTOs enter domain code, several handwritten decoders drift, or matching types/ABI are treated as behavioral compatibility.** Independently exercise inputs, outputs, errors, version rejection, ownership, limits and capability requirements. A future portable subset can coexist with richer native-only ports. [E2, E4, P1] |
| W13 State storage, migration and resume — feature/domain owner | Existing canonical state store and its migration machinery; Temporal or another explicitly selected checkpoint/history runtime where suitable | **Warn on universal heap/closure serialization, copying mutable plugin state at an arbitrary instant, or claiming rollback undoes new writes.** Specify what survives: host draft, durable record, plugin-private cache, checkpoint or nothing. Test mixed-version read/write and recovery after partial migration. Arbitrary suspended-stack transfer remains unsupported. [E4, P1] |
| W14 Reactive state and cache ownership — state owner | Existing GM Observation for coalescible latest state, native Effect state/stream primitives in their profile, existing application caches | **Warn if Observation becomes an event broker, duplicate state authority, or replacement fencing mechanism.** Can intermediate changes be dropped? If not, use the durable event owner. Test listeners and stale loaders across retirement; coalescing/data revision checks don't revoke executable authority. [G5, O2] |
| W15 Durable update orchestration and crash recovery — existing lifecycle operation | Existing product operation/reconciliation records and adopted Temporal scheduling | **Warn on another generic update database, saga engine, outbox, periodic reconciliation loop or independently advancing coordinator.** Prove a residual shared mechanism before extraction. Stable operation identity and receiver-enforced authority survive lost acknowledgments; a workflow Activity calling a mutable endpoint does not pin the plugin by itself. [E4, P1] |
| W16 Admission queues, retries and backpressure — admission/executor owner | Runtime/pool limits, existing queue primitives and adopted durable broker | **Warn on an unbounded pending-call Map, automatic retry after force, or a new queue implementation inside each plugin adapter.** Qualify overload, fairness, cancellation removal and unknown-effect reconciliation. Limits must cover tenant/host totals, overlapping failed candidates and retained generations, not just one pool. [E4, P1] |
| W17 Selection, publication and rollback — canonical active-head owner | Existing compare-and-set/revision transaction, immutable plan/artifact, existing recovery operation | **Warn on mutable global `enabled`, last-completing-candidate-wins, or resetting the head counter during rollback.** Revalidate expected revision and grants before selecting. Restoring old bytes is a fresh forward generation; post-publication cleanup debt does not automatically mean v2 failed. Small fixture CAS is policy demonstration, not a new durable library. [E2, new case4] |
| W18 Capability grants and revocation — product authorization and effect recipient | Existing authorization adapter and receiver-side epoch/revision checks; narrow host functions for guest effects | **Warn if manifest requests, signed packages, successful import, language choice or agent authorship grants authority.** Test revoked host calls and stale callbacks at the actual recipient. A preflight permission check followed by awaited IO leaves a race unless the chosen promise accounts for it. Direct credentials can bypass a host fence. [E1, E2] |
| W19 Artifact registry, hashing and signing — EF distribution/trust adapter | Already selected OCI Distribution, ORAS, Cosign; immutable digest identity | **Warn on a custom artifact protocol or signature verifier, a registry per runtime language, or mutable tags as active identity.** Qualify one same artifact through approved registries/auth profiles. Signature validation proves the selected trust claim, not permission or safe behavior. [E5, O3, N4] |
| W20 Catalog and federation — catalog authority | Existing PostgreSQL-backed canonical source, deterministic authority route, signed immutable snapshots | **Warn on using Git/search/OCI as a second writer, merged mutable names, or runtime fallback to a different authority after failure.** Keep installed bytes, current active selection and catalog availability distinct. This research must not grow another marketplace service. [E1, E5] |
| W21 UI lifecycle and state retention — renderer/contribution owner | Selected renderer mount/unmount, framework resource hooks; single-spa only if its application unit fits; Vite/React refresh for developer workflow | **Warn on custom virtual DOM reconciliation or claiming dev state preservation for production plugins.** Qualify stable shell state, component local reset, stale event handlers, hooks changes, styles/listeners and re-mount failures. Preserve draft outside the replaceable owner when its continuity is required. [E4] |
| W22 Observability and operator controls — application operations plus existing telemetry adapter | Existing traces/logging/metrics SDKs, e.g. OpenTelemetry where adopted; existing diagnostics surfaces | **Warn on another tracing/metrics database or one green `reloaded` flag that hides retirement debt.** Report requested policy, observed selection, old work and cleanup independently. Keep per-operation/candidate IDs in suitable traces/logs; bound metric cardinality. Exact dashboards/SDK adoption still need consumer choice. [N5] |
| W23 Conformance, test generators and evidence — contract owners and existing development tooling | Existing GM conformance, node:test, fast-check, Playwright and repository evidence/Docs Protocol routes | **Warn on a new test framework, oracle generated from the implementation, or treating fixture passes as product adoption.** Extend a concrete uncovered boundary rather than building another reducer. Retain negative controls, exact artifacts and failures; separate source inspection, local execution, hosted results and production evidence. [E3, E4, G1] |
| W24 Packaging and cross-platform release — selected adapter/toolchain maintainer | Standard package/bundler and ABI tooling, approved lockfiles, existing CI/release system | **Warn when a small adapter estimate excludes native binaries, target matrices, signing, licenses, symbols, cold start or compiler compatibility.** Compare total and incremental cost on the same guarantee. Current upstream versions do not automatically upgrade accepted consumer pins. Browser success, Node success and native Wasmtime success are different profiles. [G1, O1, P1] |

**New native follow-up to W05/W06/W22:** after failed raw-module import, Vite
called the same old disposer again during recovery and logged an update despite
the failed import. Cleanup must be repeat-safe and remove its exact resource;
framework log text cannot be the product's activation receipt. This is observed
in the retained browser trace and corroborated by the
[exact Vite implementation](https://github.com/vitejs/vite/blob/b39e6e63dcbfc3cf4be871acf3554efbd6d0e268/packages/vite/src/shared/hmr.ts).
It does not prove that retrying partially completed external cleanup is safe.

## Architecture to preserve now

The following is a proposal for the first real consumer slice. It preserves
existing owners and describes useful boundaries; it is not a new public SPI,
mandatory set of interfaces or a second plugin manager.

### Separate the feature contract from execution placement

A feature calls the semantic operation it needs. An ordinary TS provider can
implement it directly. A selected Wasm adapter maps that operation to generated
bindings or Extism's existing ABI. SDK handles, worker messages and binary
buffers remain outside the feature. A particular rich native-only port can
remain native; arbitrary JS callbacks, object identity, iterators and handles
do not become language-neutral because a generic interface wraps them.

The new text-analysis experiment proves this distinction for one small port:
the caller supplies a request ID and bounded text, and receives an ID, count
and total. Native TS is an ordinary function; the Wasm adapter validates the
foreign result. That is a demonstrated seam, not a universal contract for UI,
workflows and operating-system resources.

Runtime choice belongs to outer composition. The main application remains TS.
A Rust guest or native executor does not imply a Rust rewrite of update policy,
authorization, UI or state management. Ordinary TS modules need compilation
appropriate to their existing target, not compulsory Wasm conversion. Add the
Wasm dependency/build lane only for the profile that uses it.

### Minimum boundaries and why they matter

| Boundary to preserve | Concrete purpose | Avoid speculative infrastructure |
| --- | --- | --- |
| Consumer-owned semantic port | Independent providers satisfy the same inputs, outputs, errors and meaning. | No universal `Plugin` interface or SDK-shaped domain API. |
| Inert metadata and exact executable/configuration identity | Preview and select a candidate without importing every installed plugin. | Reuse current declarations, literal loaders and artifact owner. |
| Immutable operation context | A request and its continuations use one compatible provider/dependency closure. | No ambient `getCurrent()` midway through a business operation. |
| Scoped resource ownership | The owner can release listeners, tasks, connections and late acquisitions. | Reuse one applicable resource mechanism; no parallel cleanup/refcount layer. |
| State ownership and compatibility | User state survives where promised; private caches can be reconstructed. | No generic object-graph or suspended-stack serializer. |
| Actual executor capabilities | Supported wait/cancel/force modes match that SDK, placement and OS. | Unsupported methods cannot return success or be silent no-ops. |
| Existing active-selection and effect authority | Selection races and late writes are decided at their existing owners. | No second active-head database, permission registry or supervisor. |
| Observable operation outcomes | Candidate readiness, new selection, retained old work and cleanup are distinguishable. | No universal green `reloaded` flag. |

This can initially be implemented through an existing composition recipe and
a small consumer adapter. Add a reusable mechanism only after subtracting
responsibilities that GM, the executor, resources, transport and the product
operation already supply. If a shared invariant remains, follow the existing
library-first rule with a real consumer and independent conformance in that
delivery; do not create empty public interfaces for hypothetical consumers.

### Determine the smallest safe component update

Start with the contribution whose behavior changes. Use the existing
composition plan for constructed dependents, and add actual code-import,
state/retention and physical-execution constraints. These describe different
relationships; a second authoritative graph cannot make hidden references safe.

Expand the affected set until its outer edges are explicit compatible stable
boundaries. An old request retaining a provider keeps that provider's required
collaborators and resources. A stream is still work while it is consumed;
returning its iterator does not finish it. A callback registered elsewhere can
outlive both the initial method call and a file reload.

Selection and lifetime acquisition must form one safe admission action. If an
acquire can suspend, use the existing owner's reservation/revalidation mechanism
so disposal cannot occur between observing a pointer and retaining its owner.
Do not add an unrelated global counter to imitate a lifecycle guarantee.

For a plugin containing an editor, a pricing function and a subscription, changing
only compatible pricing can plausibly replace that provider while preserving
the editor and draft. Changing the units/schema of shared state can widen the
update to dependents or require migration/restart. Forcing a shared Worker
interrupts the Worker boundary even if only one logical component was selected.
If the affected closure cannot be established, enlarge the restart boundary or
report unsupported live replacement; do not promise method-level replacement.

### Treat state and resources according to their actual owner

| Kind | Supported treatment to qualify | Important limit |
| --- | --- | --- |
| User draft/navigation and canonical feature state | Stable owner outside the replaceable implementation; versioned semantic access. | The owner may be the feature's state component, not necessarily one global Host store. |
| Generation-private cache or transient object | Discard and reconstruct, or explicitly preserve compatible data. | Preservation of bytes/fields is not preservation of meaning. |
| Listener/timer/connection | Generation scope owns setup and exact repeat-safe release. | Old cleanup cannot delete a new registration sharing the logical name. |
| Shared stable capability | Borrow from its longer-lived owner. | An old generation cannot dispose a borrowed resource. |
| Exclusive device/port/file/session | Existing stable owner, qualified transfer, or explicit stop/reacquire gap. | Two fully ready versions cannot always coexist. |
| Durable workflow/checkpoint | Existing history/state owner defines versioning and resume. | No generic JS/Wasm stack transplantation. |

Compatibility has at least contract shape, behavioral meaning, state schema,
capability requirements and lifecycle obligations. Same TS type, WIT shape or
ABI version proves only part. For overlap, specify which old/new readers and
writers can coexist. After v2 changes durable state, selecting old bytes might
require a forward-compatible reader, reverse migration or refusal. Routing
rollback cannot undo effects outside the state owner's transaction.

## A controlled update operation

The useful operation is a declared transition at an existing owner. This phase
description is not a new generic orchestration engine. Reuse the accepted
operation/reconciliation record and durable scheduling adapter where applicable.

| Phase | Useful evidence and action | Failure or limit to expose |
| --- | --- | --- |
| Inspect impact | Exact candidate identity, expected current revision, affected closure, state policy, resource conflicts and permitted modes. | Inert inspection is distinct from executing candidate initialization. |
| Prepare candidate | Validate shape/semantics and establish candidate-owned resources under the selected profile. | Initialization may have effects; its scope and cleanup remain owned if preparation fails or the caller stops waiting. |
| Establish feature readiness | The actual capability satisfies its stated useful readiness predicate. | Constructor/process startup or a fixed delay is not sufficient by itself. |
| Apply work policy and select | Revalidate expected revision/grants; select at the owning authority's publication boundary. | Concurrent prepared candidates cannot both overwrite the same expected head; lost acknowledgment requires reconciliation. |
| Finish/interrupt retained work | Retain old closure, drain, cooperatively cancel, or use an authorized actual stop boundary. | Deadline expiry is not successful drain or new force authority; shared-executor effects must be visible. |
| Retire and reconcile | Observe operation settlement, resource release, actual stop receipts and remaining debt separately. | v2 can be active while v1 cleanup remains incomplete; unknown external outcomes stay unknown until reconciled. |

Supported modes are the intersection of feature/state compatibility, exact
executor capability, actor grants and deployment/resource constraints. There is
no single universal default selected by this report. An explicitly approved
policy may say “drain for this budget, then terminate this dedicated executor.”
An elapsed timer alone must not invent that instruction. Ordinary update and
emergency revocation keep their separate authority and guarantees.

Where overlap is safe, failed preparation should leave the healthy predecessor
usable. Where exclusive resources prevent overlap, explain the handoff gap and
recovery plan before starting. Before publication, discarding an isolated
candidate is different from reversing a published version's data changes.
Restoring old executable bytes is a fresh forward generation with new authority,
not decrementing a fence or resurrecting a retired token.

### What the user and an agent should be able to see

An update preview should identify the changed plugin/components, dependent scope,
state preserved/reset/migrated, selected work policy, deadline action, potential
service gap and any shared execution unit affected. A reason should accompany
unsupported hot replacement or required restart. Keep implementation details out
of the normal interaction unless they explain an actual choice or consequence.

After execution, show the actual version serving new work, remaining old work,
cleanup debt and recovery status. “New version active; one old stream finishing”
is more useful than a misleading all-or-nothing success label. The product's
existing telemetry can correlate artifact, candidate, generation and operation
identities without creating a new logging database or unbounded metric labels.

This is the intended practical advantage: authors use ordinary feature code and
existing libraries; users get explicit impact and trustworthy outcomes. A broad
claim of superiority over Flutter, OTP or Envoy would compare different goals
and is not justified by these experiments.

## Newly executed experiments

All own JS-runtime experiment sources use TypeScript 7.0.2 with strict checking.
The resource and browser checks include dependency declarations. Extism's direct
SDK declaration failure is reported separately and remains unresolved. No
production integration, public package, new application runtime or accepted ADR
was changed by the experiments.

### Resources: published implementation and actual native handles

`@get-modular/resources@0.2.2`, Node 24.22.3 and pnpm 11.25.0:
**6/6 tests pass**, with zero failures, cancellations or skips. Only the public
root API is imported. npm tarball integrity and all 16 installed package files
are checked; source/lock/receipts are retained.

| Scenario | Observed result | Precise qualification limit |
| --- | --- | --- |
| Held stream plus stable shared file | Old stream gives v1/v1 with old dependency; new call gives v2; shared file survives both and closes once at Host shutdown. | Fixture explicitly joins stream consumption; Resources does not infer operation borrowing. |
| Deliberately early close | Escaped read fails with actual `EBADF`. | Returning a capability does not extend its scope. |
| Delayed predecessor cleanup | Exact listener removal preserves v2; broad `removeAllListeners` control deletes both. | No claim that events cannot reach the old listener before cleanup finishes. |
| Exclusive acquisition | Overlap gets actual `EEXIST`; old handle remains usable; release/reacquire succeeds in order. | One-process file fixture, not distributed locking or zero-gap handoff. |
| Concurrent prepared candidates | B wins expected revision; late A rejects and cleans only itself. | Local fixture policy illustrates a need; it is not durable CAS or a new selection library. |
| Abandoned close wait and late acquisition | Incomplete/unsettled debt remains visible; late handle closes once; closed-scope acquisition rejects. | Finite controlled acquisition, not forced interruption of an infinite foreign operation. |
| Repeated generations | 250 acquisitions/releases, 249 replacements, maximum two listeners during overlap and zero at end. | Listener accounting, not heap/RSS, ESM cache reclamation or thousand-plugin capacity. |

One cleanup failure is injected before release and successfully retried. It
does not qualify retry after partially completed external cleanup. Peer review
corrected the original wording “250 replacements”: initial construction has no
predecessor. Original logs are retained; final source and results use 250
generation cycles and 249 transitions. There are six tests; the table separates
a negative control from its containing case.

### Browser: real framework HMR, state and resource failure

[Successful native run 44962153869](https://github.com/agent-teams-ai/extension-foundation/actions/runs/44962153869)
is bound to `c1653881b574b4258fb16a2d44b93a1004c06a94` and the
[v2 input manifest](evidence/plugin-reload-browser-input-20261122-v2.manifest.json).
**One native scenario passes with 32 unique comparisons, all matching.**
Profile: Node 24.22.3, TypeScript 7.0.2, Vite 8.3.8, plugin-react 6.3.0,
React/React DOM 19.3.1, Playwright 1.65.1 and Chromium 159.0.8154.6.

The compatible edit preserves state 13, the actual button object, document and
host draft. Adding a hook remounts the component at 11; changing its initializer
remounts at 99. Both preserve the parent draft and document. Effect cleanup
precedes new setup, and an actual event reaches exactly the current listener.
A captured old Promise callback still finishes v1 after v2 setup.

A raw candidate throws after the old listener has been removed. Acceptance
receives undefined; old resource availability is not restored automatically.
Recovery constructs the v3 listener. The trace also shows the old disposer
called twice across failure/recovery. A full page reload creates a new document
and resets the in-memory host draft. Unexpected page exceptions are absent.

The independently downloaded artifact is 39,290 bytes, SHA-256
`c15ba9412478a3a1fe2f68ba8e41253f5529e1fc8278d0c5f9c86eff176b0a28`.
ZIP CRC/path checks pass; all 18 input files match the manifest. Its receipt binds
commit/run/attempt/input/workflow, and its observation JSON equals stdout.

### Preserved failures and limits

The local pinned-browser download was unavailable; local native launch therefore
failed because the executable was absent. The first
[hosted run 44961594670](https://github.com/agent-teams-ai/extension-foundation/actions/runs/44961594670)
reached Chromium and passed compatible-v2 assertions, then timed out awaiting
v3. Artifact upload separately rejected a literal parent-directory path, so
that run's browser observation file was unavailable. The full job log and
[original input](evidence/plugin-reload-browser-input-20261122.manifest.json)
remain unchanged.

V2 writes files in place, separates independent edits by 100 ms, records actual
watcher events and prints diagnostic JSON into the native job log. The workflow
normalizes its artifact directory. Node's `fs.cp` replacement and the selected
watcher's 50 ms event suppression support a coalescing hypothesis for the first
timeout; changing both write method and spacing does not isolate its cause.
All browser state/resource assertions remain unchanged. Five actual change
events are observed in the successful run. Rapid-write reliability remains
unqualified; this is an independent-edit development profile.

The new evidence does not rerun or replace November 21's backend/drain/force,
browser Worker or separate Component Model experiments. Those keep their own
source-bound receipts. In particular, browser HMR here does not qualify browser
Extism, browser Wasm component execution or production plugin cutover.

## Remaining uncertainty and concrete next verification

| Question / owner | What remains uncertain | Evidence that should change the choice |
| --- | --- | --- |
| First real feature / consumer | Actual useful replaceable unit and stable state boundary. | One product operation with independent provider, error behavior, resources and update outcome; reject a generic interface that cannot fit it. |
| Portable data boundary / contract owner | Extism ABI versus WIT for that operation. | Structured values, errors, limits and required imports across independently authored implementations, not only scalar arithmetic. |
| Extism JS adoption / adapter owner | Direct TS 7 declaration compatibility and exact release channel. | Upstream compatible declarations and strict direct consumer check; do not ship the research reflection boundary as an implicit fix. |
| Retirement / executor and operation owners | Pending-call settlement, cancellation of foreign host IO, browser/native differences. | Real CPU and stalled-import scenarios with exact caller settlement and stop receipts; the control query after timeout is insufficient workload recovery proof. |
| Resource enforcement / selected runtime | Guest versus SDK memory, CPU and shared-executor scope. | Measure/enforce the actual required resource with rejecting fixtures; compare existing native containment if JS cannot meet it. |
| wasmCloud / runtime integrator | Supported embedding artifact and release/support contract. | Qualified published distribution or exact-source build, supported platforms and maintenance cost; documentation snippets are insufficient. |
| Partial replacement / composition and consumer | Escaped references, dynamic imports and retained dependencies. | A real dependency diamond and held stream/callback in the product; expand restart closure when it cannot be proved. |
| State evolution / state owner | Mixed-version reads/writes, directional migration and rollback after new writes. | Actual schema/history compatibility and failure recovery at the existing state boundary. |
| Readiness / feature owner | A useful check that is not merely process alive and whose effects are owned. | Delayed/failed required capability while healthy predecessor remains usable in the overlap profile. |
| Policy / OD-003 and consuming owner | Ordinary default, actor grants, deadlines and permitted escalation. | Select a concrete feature policy; show affected current work and reject unsupported modes truthfully. |
| Capacity / deployment owner | Retained generations, imports, memory, queues and cleanup debt under realistic churn. | Host/tenant-wide bounds and measured memory/resources; 250 listener cycles do not answer this. |
| Shared residual mechanism / library owner | Whether a new reusable implementation remains after existing mechanisms. | A concrete invariant and real plus independent consumer; otherwise a qualified integration recipe is sufficient. |

## Conditional delivery sequence and cost

**Recommended sequence:** keep the confirmed static-composition/controlled-restart
baseline, implement one useful native TS feature seam with its state/resources
explicit, qualify a targeted live update or component restart where its contract
allows, and then add one optional Wasm adapter to that seam. The experiments
justify this direction; they do not adopt a universal ordinary-update policy or
require waiting until every plugin category has a solution.

The first slice should show a user-visible result: the feature updates, its
declared draft/state survives, rejected candidates leave a truthful outcome,
and old work/resources reach their promised result. Supporting another language
then becomes bounded adapter/toolchain/conformance work. It is still work:
native JS closures and DOM handles cannot cross the boundary automatically.

These estimates compare one trusted request-oriented capability using existing
state, composition and lifecycle owners. They are engineering judgments, not
measured availability. Complexity increases with burden. P is new production
mechanism, I is consumer integration, T is tests/fixtures; library dependency
code is excluded. Alternatives are not additive.

| Option | Confidence / 10 | Achievable reliability in this scope / 10 | Complexity / 10 | P / I / T new LOC | Scope and qualification |
| --- | ---: | ---: | ---: | --- | --- |
| Native TS with existing composition/resources recipe | 8 | 8 | 3 | 0 / 150–350 / 350–750 | Total for this one integration, before unrelated product work; current preferred starting slice. |
| Add one Extism adapter | 6 | 7 | 5 | 0–250 / 150–400 / 500–1,000 | Incremental over the native slice; requires SDK typing, shutdown and resource-profile qualification. |
| Add one generated Component Model adapter | 6 | 7 | 6 | 0–350 / 200–500 / 600–1,200 | Incremental alternative to Extism; typed richer boundary and target/toolchain qualification remain. |
| Build a universal loader, supervisor and state-migration platform | 2 | Unrated | 10 | Not responsibly estimated | Scope is undefined and duplicates known owners; do not infer reliability or cost from a small prototype. |

The first two bands retain the bounded audit planning assumptions; the component
band is a new uncertain synthesis estimate. Modified existing code, native
binary distribution, OS/architecture matrices, licenses/signing, debugging,
observability integration and release maintenance are additional work, not
hidden inside a few adapter lines. Rust is useful for a guest or a demonstrated
native boundary; rewriting TS policy alone does not strengthen its business or
distributed correctness.

## Evidence, reviews and publication

The [complete evidence packet](evidence/plugin-reload-reuse-20261122.tar.gz)
and [member manifest](evidence/plugin-reload-reuse-20261122.manifest.json)
retain three investigator reports, exact source/package ledgers, original and
corrected inputs/results, independent reviews, upstream fixture licenses,
native logs and browser artifacts. Installed dependency directories are excluded.
The [source ledger](evidence/plugin-reload-reuse-20261122.sources.json) and
[warning map](evidence/plugin-reload-reuse-20261122.warnings.json) are directly
readable without extracting the packet.

Independent reviews checked ownership and actual oracles, not just compilation.
Material corrections included the initializer signature, a missing-cleanup
false-positive check, exact resource counts, control-query versus guest-call
recovery, workflow context availability, and the artifact path. The first
workflow review missed a context error; root caught it before publication.
Later review records preserve that miss and the first native failure. Agreement
does not select a production runtime or make unresolved choices accepted.

| Published checkpoint | Concrete content |
| --- | --- |
| [dfe424c](https://github.com/agent-teams-ai/extension-foundation/commit/dfe424c71345774d89f24e025bb1045074396dd3) | Owner clarification, reuse warnings/navigation and research questions. |
| [30b9823](https://github.com/agent-teams-ai/extension-foundation/commit/30b9823aacecc0728ebf72c2e450e7c8c06b93e2) | First frozen native browser input and scoped workflow; preserves the failed native attempt. |
| [c165388](https://github.com/agent-teams-ai/extension-foundation/commit/c1653881b574b4258fb16a2d44b93a1004c06a94) | Separate reviewed v2 input and evidence-retention repair; successful native browser run. |

Each checkpoint was pushed immediately. The final documentation/evidence
publication is verified on its own head; the unchanged successful browser input
and workflow reuse their exact-source result rather than rerunning on prose edits.
The existing draft PR remains research, with production selection tracked in
OD-003 and the consuming product's authorities.

### Validation status

The new experimental results are complete as described above. The final
documentation and source-bound hosted gate receipts are recorded in the review
record and PR delivery summary. Local broad Foundation gates remain blocked by
the previously identified embedded older compiler; no compiler pin, immutable
input, gate or test assertion was weakened to claim a pass. This limitation is
separate from the strict TS 7 checks on the new experiments and automatic hosted
checks on the research branch.
