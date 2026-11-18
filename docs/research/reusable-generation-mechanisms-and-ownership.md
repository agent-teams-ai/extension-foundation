---
id: research.replacement-reuse
type: research
status: active
owner: architecture
summary: Reuse evidence and ownership choices for an independent generation replacement mechanism.
---

# Reusable Generation Mechanisms and Ownership

Researcher: replacement/reuse workstream. Evidence retrieved **2026-10-22**. This is non-normative research, not a runtime selection, public-SPI approval, or change to an accepted ADR. The initial review inspected source without executing it. The subsequent [Worker Adapter Replacement Experiment](worker-adapter-replacement-experiment.md) installed verified packages and exercised eight bounded cases plus a separate source-directed two-worker rejecting case; its findings below are labeled separately. Neither source inspection nor those experiments qualify production replacement.

## Recommendation

**Use mature libraries for execution, transport, reference publication, cancellation, and task completion; retain one deliberate library owner for genuinely shared request/protocol mechanics, with the existing product lifecycle operation remaining the sole coordinator.** None of the inspected candidates supplies the complete cross-platform, durable replacement promise in the current proposal. That is a finding about this inspected set, not a proof that no other library exists.

The first decision is the replaceable unit. A complete HTTP service or a Temporal workflow worker can often use an existing platform's deployment mechanism. A TypeScript capability graph behind a typed request port needs narrower generation coordination. A browser capability cannot inherit the exit evidence of a Node process. Choosing the unit and promise before choosing the library avoids recreating a server platform inside an application.

The current GM **dependency-free** `@get-modular/lifecycle-kernel` candidate already owns synchronous local generation identity and stage/activate/quiesce/retire/call/custody bookkeeping. Its independence from GM composition is deliberate. Do not write a second lifecycle FSM in a new replacement package, silently move or rename that accepted candidate, deep-import it to bypass its release gate, or describe its current private status as a shipped asynchronous supervisor. A future qualified adapter can use that kernel and an execution library together. If research concludes that the kernel should move to another owner, that is an explicit successor-decision option, not incidental refactoring. [I1–I3]

Library-first guidance also matters: a concern expected across products is designed as a purpose-neutral library from its first delivery, with one real consumer and disposable ordinary external projects. Do not incubate competing copies in products and promise extraction later. At the same time, current research does not authorize releasing a new package or bypassing EF's independent-conformance and Orchestrator adoption gates. A coherent next implementation proposal can name the reusable mechanism, its actual availability, one real slice, its external fixtures, and the existing kernel adapter together. Physical separation into another repository is an ownership/release choice; it is not necessary for architectural independence. [I4]

For the bounded trusted request cohort previously proposed, compare **direct Node Worker plumbing against an explicitly single-worker Piscina profile**, retaining workerpool's cross-target task reuse as a conditional alternative with its observed termination gaps. The additional two-worker Piscina case rules out treating that version's graceful close alone as multiworker task-drain proof. Reuse the existing selected execution/resource-custody owner where applicable; do not add PM2, a Go supervisor, or a Rust sidecar as a second authority. Agent Runtime's proposed Rust keeper/init boundary is a **deferred follow-up, not an accepted implementation ADR or released mechanism**: the current source explicitly says no Rust migration implementation started, and the proposed repositories were unavailable in the parent workstream's check. Ordinary user-session execution is the default; contained-turn Host Custody is a separate optional profile, default off. Do not require native custody for ordinary plugins. Rust is justified for an actual native execution/resource requirement or measured bottleneck. It does not turn arbitrary TypeScript replacement into a solved problem. [I6]

## What replacement actually needs

The following are different mechanisms. Treating them as one `reload()` feature is the source of most overstates guarantees.

| Mechanism | Existing reusable building blocks | What still needs an owner |
| --- | --- | --- |
| Publish an immutable local snapshot | JavaScript reference assignment within a synchronous turn; Go `atomic.Value`/`atomic.Pointer`; Rust `ArcSwap` | When publication is authorized; consistency across processes; durable active head; state compatibility |
| Retain an old snapshot while work uses it | Captured JS references plus explicit owned operations; Go references/GC; Rust `Arc`/guards | Invocation authority, operational closure, callbacks/streams, maximum retention, external resources |
| Stop accepting new work and finish tracked work | GM candidate bookkeeping; worker/pool admission APIs; task trackers; HTTP shutdown | Defining accepted work; closing every real ingress; reconciling acceptance whose acknowledgment was lost |
| Request cancellation | Abort signals; Go contexts; Tokio CancellationToken; runtime-specific fuel/interrupts | Whether a task cooperates; whether remote effects were accepted; cleanup completion |
| Prove execution stopped | Node Worker exit; an observed child-process exit under the existing supervisor; tracked Rust task completion | Descendants, external effect outcome, durable custody, browser evidence limits |
| Replace a network server | tableflip; PM2 cluster reload; NGINX/Envoy; Pingora server framework | Plugin invocation closure, product grants, durable business acceptance, application-state migration |
| Run a plugin with a portable ABI | Extism/Wasmtime-style runtimes; HashiCorp go-plugin for subprocess RPC | Replacement policy, state/effect compatibility, authority, old-work retirement, supported target profile |

**Inference:** The most portable reusable part is request correlation, framing/schema limits, cancellation transport, generation-bound request/result validation, explicit observations, and conformance scenarios. The existing kernel owns local lifecycle legality; the product lifecycle operation owns orchestration. The OS process implementation, database CAS transaction, grant gateway, artifact trust policy, domain migration, and physical cleanup receipts are adapters or existing owners. The shared layer must not recreate them behind generic callback names.

## TypeScript and Node: adoption versus thin wrapping

### Direct Node Worker APIs

Node v24.22.0 documents that `Worker.terminate()` stops JavaScript execution as soon as possible and returns a Promise resolved when the `exit` event is emitted. It also says execution can stop at any point. The `resourceLimits` option constrains the JavaScript engine, excludes external data such as ArrayBuffers, and does not prevent process-wide out-of-memory abort. These are useful execution-boundary facts, not graceful cleanup or hostile isolation guarantees. [N1]

**Reuse boundary:** one worker per generation/cohort, exact immutable worker script/import closure, request/result serialization, error/exit observation, bounded requests. Direct APIs avoid forcing a long-lived capability into a task-pool model. The selected adapter needs correlation, queue bounds, startup readiness and explicit close control; existing message RPC can supply correlation/proxy mechanics. Those are conventional adapter responsibilities, not a reason to implement a new scheduler or supervisor.

**Failure cases:** Worker `online` only observes that its JavaScript started, not capability readiness. A worker can die after a remote mutation was accepted. A termination Promise cannot prove the remote mutation failed or cleanup callbacks ran. A process-wide crash can lose the Host's ephemeral lease state. Admission and recovery must remain tied to the product's canonical operation identity. The prior EF source record already distinguishes these facts; a library adapter must preserve them.

### Piscina

Inspected source: release tag `v5.3.2`, commit `6c7e54630a8c28a96ce5c0625b463d849d21171c`; GitHub release dated 2026-08-28. License MIT; documented Node requirement 20+. The repository is not archived and current-branch commits continued in October 2026. **Pin caveat:** the package.json returned at this release-tag source pin says 5.3.1. The initial source inspection alone did not verify a published tarball. The subsequent [executed experiment](worker-adapter-replacement-experiment.md) verified the npm tarball as 5.3.2, including its registry integrity; its included `src/index.ts` matches this inspected commit. Retain both identities rather than treating the differing package.json as a different executed version. [N2]

Piscina provides worker pools, readiness through a module-exported Promise, bounded `maxQueue`, cancellation, task outcomes, and pool shutdown. Its README says `destroy()` stops workers and rejects pending tasks; `close()` attempts graceful completion. The implementation is more precise than the short README wording: `closeTimeout` defaults to 30 seconds, close races pool flushing against that timeout, reports the error, and **finally destroys the pool**. Therefore `close()` finishing is not proof that every started task completed naturally. Capture task outcomes, shutdown cause, and worker exit separately. [N2, N3]

Piscina explicitly warns about unawaited asynchronous work: after a handler returns, the worker's event loop may be paused; outstanding work may resume with a later task. Its `drain` event concerns queue/capacity and must not be mapped to generation retirement. A task handler's Promise is not a universal resource-custody tracker. [N2]

**Additional executed counterexample:** two workers were both confirmed busy;
`close({ force: false })` had a 1,000 ms timeout; only task A was released.
Close fulfilled before a 300 ms observation bound with no error event, both
Workers exited, and task B rejected while its completion/finally flags remained
zero. The exact published 5.3.2 source registers repeated flush listeners and
counts a completed worker without deduplicating its identity, explaining early
flush. This is a separately retained rejecting fixture, not a timing benchmark.
Even absence of a timeout error therefore does not prove natural multiworker
drain. Initial single-worker results do not qualify arbitrary pool sequences.
An upstream resolution or a separately qualified strategy that seals admission
and observes every accepted task before close could address the chosen profile;
that strategy was not tested here. [N3; executed experiment]

**Adopt when:** the cohort really is bounded request tasks, an entire request/finally belongs to its task Promise, pool replication is intentional, and startup/shutdown semantics match the chosen profile. Create a separate pool for each immutable generation. Route an operation to one chosen pool once. Do not mutate filenames inside one pool and call that a generation protocol. Do not silently reassign an already accepted old-generation task to a fresh pool.

**Wrap thinly:** bind artifact/generation identity to pool creation, supply the kernel retention/admission adapter, translate real task/worker facts, and keep immutable old pool handles until actual settlement. Register an error listener. If callback cleanup, long-lived background work, or direct control channels are fundamental, direct Worker APIs may require less policy adaptation.

### workerpool

Inspected source commit `17dbcc88b87cb266d99953d91f7bc8898dce0b73`; package.json 10.0.3; Apache-2.0. It runs in browsers and Node with web workers, worker threads, or child processes. It supplies a queue, task execution, cancellation/timeouts, worker lifecycle hooks, and `Pool.terminate(force, timeout)`. Its documentation describes non-force termination as finishing running tasks and rejecting queued tasks, with a timeout. **Executed correction:** in published 10.0.3, `terminate(false, 50)` fulfilled and invoked its termination hook while a barrier-blocked task remained busy and unsettled. Releasing the barrier subsequently completed the task. New `exec()` during termination was also accepted and ran. An explicit subsequent `terminate(true)` rejected the running task. Public fulfillment and hooks therefore do not prove admission closure or physical exit. See the [exact installed-package experiment](worker-adapter-replacement-experiment.md); it supersedes any inference that the documented timeout itself guarantees forced termination. [N4]

**Important advantage:** this is a real existing cross-target execution abstraction, so a proposal for three bespoke worker clients must justify why workerpool is inadequate. **Important limit:** a shared Promise-shaped API does not create identical browser/Node/process exit evidence. The platform adapters must retain their actual observations. Dynamic `exec(function)` serialization is convenient for computation but is a poor fit for immutable signed plugin artifacts and captured dependency closure; use an explicit pinned worker script for this profile. [N4]

**Adopt when:** the task model fits and the cross-target packaging meaningfully reduces code. **Wrap:** generation identity, stable script selection, actual termination evidence, exact task outcomes, and host admission. **Reject for now when:** pooling obscures a capability's exact worker ownership, function serialization hides artifact closure, or an adapter would need to circumvent the package's scheduler/lifecycle extensively. A source-backed spike should compare those concrete costs, not assume the package with more features wins.

### PM2 and HTTP proxy helpers

PM2 is an established **process manager/platform**, with an embeddable JavaScript API; it is not a target-neutral generation library. Version 7.1.0 was released 2026-10-21. package.json declares AGPL-3.0. Official graceful-stop documentation requires the application to handle SIGINT and clean resources. `wait_ready` waits for application `process.send('ready')`; readiness/kill timeouts are configurable. These are valuable whole-service deployment features, but they do not define the application's business-admission or plugin callback closure. [N5]

Use PM2 when a deployment has already selected PM2 to own the service process. Do not embed it alongside the existing execution/custody owner merely to gain a restart API. The license also makes it a materially different dependency choice from MIT/Apache libraries; this report does not give a legal conclusion.

`node-http-proxy` really is a library: HTTP/WebSocket proxying, per-request target selection, and events. Its `close()` closes its inner server. Inspected default head `9b96cd725127a024dabebec6c7ea8c807272223d` is dated 2020-05-17, package 1.18.1, MIT. This is a maintenance caveat, not proof of abandonment or vulnerability. It does not implement generation acceptance, old-runtime custody, or durable replacement. Do not add it for an in-process typed request boundary. If the replaceable unit is already an HTTP service, prefer the deployment's existing supported proxy and its native drain APIs. [N6]

## Go: strong building blocks, no reason to port the TypeScript Host

### Standard library snapshot publication and HTTP shutdown

Go's own `atomic.Value` examples publish a fresh copy-on-write map and state explicitly that old readers retain their version until GC can reclaim it. This is the same useful immutable-snapshot pattern as ArcSwap without adding a custom reclamation package. It says nothing about a generation's authorization or asynchronous resource cleanup. `atomic.Pointer[T]`, contexts, and explicit task ownership are also available; choose the simplest correct synchronization that fits the actual contention. [G1]

`http.Server.Shutdown(ctx)` closes listeners and idle connections, then waits for active connections to become idle. Context expiry returns an error. It does not close or wait for hijacked connections such as WebSockets, and the program must keep running until shutdown completes. Thus it supplies HTTP-specific drain behavior, not general plugin retirement. A WaitGroup/task tracker is also insufficient unless the application closes admission before declaring the group complete. [G2]

Go's native `plugin` package is a poor shortcut for this need. Its official source says a loaded plugin cannot be closed, support is Linux/FreeBSD/macOS only, race-detector support is poor, and mismatched toolchains/build settings/shared source can cause runtime crashes. The documentation itself recommends considering IPC. This directly rejects any claim that switching to Go supplies general safe in-process plugin replacement. [G3]

### tableflip

Version 1.2.3, commit `b3a0d54308fba327fb463cc1a3c11d3607deea53`, BSD-3-Clause; release dated 2022-03-30. Repository not archived; API metadata shows later repository pushes in 2026, which is not a compatibility qualification. tableflip is a **library** for Go whole-process upgrades using inherited listening file descriptors. It starts a new copy of the executable, allows initialization before `Ready()`, handles failed initialization, serializes upgrades, and exposes an exit signal for the predecessor. Documented supported platforms are Linux and macOS; Windows can compile a fallback but does not gain zero-downtime upgrade. [G4]

Its HTTP example separately calls `server.Shutdown(...)` after receiving `upg.Exit()`, with a bounded wait and force-exit fallback. That division is crucial: tableflip hands off process/listener ownership; the application still performs and observes request drain. The upgrader has a candidate-readiness timeout and kills a child that never becomes ready. It does not transfer accepted requests into the new binary or reconcile domain effects. [G4, G5]

**Adopt:** for a Go server binary whose unit of deployment is the process and whose supported OS/deployment fits. **Do not wrap as:** a cross-language request-generation library, browser solution, or per-plugin sandbox. Adding a Go service purely to reuse this library expands the system more than the handoff code it removes.

### Suture and HashiCorp go-plugin

Suture v4 is an existing MIT Go supervisor-tree library. Source v4.0.6 `8a2561c661dce2a30c484b08e865676059c1e63e` is a useful pinned example; default branch has subsequent maintenance through July 2026. It restarts services, backs off failures, requests stop through contexts, and reports services that fail to stop. The service contract explicitly says Go cannot prove a stopped service has fully ceased; a timeout may leave service and stop goroutines alive. Services should not return from Serve until actual work and mandatory cleanup are done. [G6]

This is credible reuse for a **Go implementation already needing cooperative service supervision**. It is not code-version loading, atomic route publication, or forced goroutine termination. Reuse the existing execution/custody owner rather than introduce a Go supervisor into the TypeScript application solely for restart trees. The deferred Rust keeper/init direction does not make a new Go implementation necessary.

HashiCorp go-plugin v1.8.0, commit `155dcddc94873a285e14b7fa24b2f6ab6139668e`, MPL-2.0, released 2026-04-29, supplies subprocess lifecycle, RPC/gRPC transport, handshake/protocol negotiation, logging, checksums/optional TLS, and optional reattachment. The README expressly limits its intended network to local reliable transport. A Go host is the primary client API; gRPC allows other plugin implementation languages. A TypeScript host does not obtain the Go client implementation merely by using the same wire language. [G7]

Its `Client.Kill()` attempts close, waits about two seconds for graceful exit, then kills. It does not first establish an application-specific cohort drain. Reattachment supports a host upgrade while an old plugin remains running; it is not automatic plugin-version handover. This is a serious existing runtime candidate for a Go subprocess plugin architecture, but a poor mandatory dependency for shared Web/Desktop/Node TypeScript APIs. OS sandboxing and resource authority remain separate. [G8]

## Rust: use the right primitive, do not promise safe native unload

### ArcSwap is genuinely reusable and precisely scoped

ArcSwap 1.9.3, commit `624412b87757c6bd5d73c6ada594d321f602b2d2`, released 2026-10-18; dual MIT/Apache-2.0. Its own patterns document exactly the desired read-mostly snapshot operation: publish a new `Arc`, each work unit loads once, and old work retains its loaded value until dropping the guard/reference. It specifically distinguishes **one load per work unit** from reloading at every phase, which could mix generations. [R1]

It provides atomic reference publication and memory lifetime; it does **not** supply plugin code loading, lifecycle admission, durable fencing, state migration, asynchronous cleanup, task cancellation, external-resource disposal, or safety for unloading a dynamic library while callbacks/function pointers survive. An escaped Arc intentionally prolongs lifetime; a cache can retain old values. Dropping the last Arc proves ordinary Rust ownership destruction, not that arbitrary external effects are settled. A generated graph must still have the right replacement closure. [R1]

The changelog is instructive counterevidence to a blanket claim that Rust/lock-free reuse removes concurrency risk: 1.9.0 strengthened memory orderings after a mistaken interpretation of the standard, 1.9.1 added another ordering correction, and 1.9.3 adds an opt-in RwLock strategy while leaving the default unchanged. These are maintained corrections, not evidence that 1.9.3 fails. Pin a supported release and let the crate own atomic reclamation; do not write a bespoke RCU/hazard-pointer scheme. A plain lock may also be entirely sufficient at the expected publication rate. [R2]

**Conclusion:** adopt ArcSwap inside an already justified Rust runtime/router. It is not a reason to move TypeScript control-plane coordination to Rust. JavaScript's local single-turn pointer switch is not the part that currently makes the durable protocol expensive.

### Tokio task completion and cancellation

`tokio-util` 0.7.20, tag commit `5ec9e6b8d5a7111fe9cd35a637bd8b4e4eb1e483`, MIT, rust-version 1.85, provides CancellationToken and TaskTracker. The tracker waits until closed and empty; its docs explicitly guarantee that tracked task futures have exited and their destructors have completed when wait resolves. This is useful stronger local evidence than merely requesting cancellation. Dropping a TaskTracker does not abort tasks. [R3]

**Critical source fact:** `TaskTracker.close()` **does not prevent spawning new tasks**. Its closed flag enables wait completion; it is not an admission gate. Another owner must prevent fresh work and retain all actual work before interpreting emptiness as retirement. CancellationToken requests cancellation; tasks must observe it or another owner must enforce an execution boundary. This is a direct example of why wrapping an established tracker cannot erase the generation-kernel/admission obligation. [R3, R4]

`hyper-util` 0.1.21, commit `23a868965964c1d6bb1b94f30ba4c420a4bebe7c`, MIT, provides a GracefulShutdown watcher for supported Hyper connections and waits for watched connections. It is an HTTP-connection utility. It cannot know about the plugin's untracked background task, remote database transaction, or retained foreign callback. Use it at an HTTP adapter if Hyper is already selected. Do not adopt Hyper just to obtain a generic drain counter. [R5]

### Pingora: reusable framework, server-specific promise

Pingora 0.9.0, commit `702f69015e53f7244d6ad2e743de571d859a70a4`, Apache-2.0, released 2026-09-09, is a Rust network/proxy framework with graceful process upgrade. Its guide describes old/new instances agreeing on an upgrade socket, transferring listening sockets after SIGQUIT, new connections flowing to the new instance, and old requests completing within a grace period. Its README says Windows support is preliminary best effort. [R6]

This is more reusable than NGINX source extraction if building an actual Rust proxy, but still commits the application to Pingora's server/service/runtime model and OS handoff. Reusing it as a new universal plugin manager is not thin glue. Keep network rollout at the existing proxy/deployment owner whenever possible.

### Native Rust ABI/hot-reload helpers

`abi_stable` source `9966b8f0084fc768e3fb557bf81affea0b5868d8` (0.11.3-era branch, last default-head source commit October 2023), dual MIT/Apache-2.0, supplies ABI-safe Rust FFI types and load-time compatibility checking. Its README explicitly advertises a plugin system **without unloading**. It is not a safe-unload foundation. [R7]

`hot-lib-reloader` 0.8.2 source `c427661a1041562501e30abd69cdd45db2f8f6fb` (August 2025), MIT, supports developer iteration. Its documented restrictions include fixed function signatures, layout-sensitive shared types with possible undefined behavior/crash if changed, no generic exported functions, and global/TypeId state that must be handled across reloads. Its release-mode example can compile statically. These are not arbitrary production update guarantees. This does not make the tool poor at its purpose; it makes its purpose different. [R8]

**Reject:** using native hot-loading as the default for thousands of independently authored TypeScript/native plugins. Process or Wasm-instance replacement keeps code lifetime behind a tractable boundary. Rust memory safety does not establish the safety of arbitrary FFI callbacks, native globals, asynchronous destructors, or old function pointers.

## Ready-made portable plugin runtime: Extism deserves a real comparison

Extism core v1.41.0, commit `051b765bb6abe4fe95d5e4f489f03ad7b137edbc`, BSD-3-Clause, released 2026-10-09, supplies Wasm plugin invocation, host functions, memory/configuration controls, cancellation/reset mechanisms and multi-language plugin support. Its native runtime uses Wasmtime. That supplies an execution/ABI boundary, not the product's replacement authority. Fresh instances can represent generations; the Host still selects instances, retains old calls, validates artifacts and effective grants, and decides when to retire them. Reset invalidates plugin memory and is not a state migration/rollback protocol. [W1]

The **JavaScript Host SDK is a distinct implementation**, not simply the Rust shared library running everywhere. At source `bec25c60d0ad32ce06d3934563fd8560f486f323`, it uses the JavaScript environment's Wasm runtime and has exports for browser/Node/Bun. It documents cross-origin-isolated browser requirements for background workers. Inspected `createPlugin` source requires `runInWorker` for call timeouts and has a comment disabling default worker capability pending a specific issue. Do not transfer native Wasmtime cancellation/resource guarantees to the JS SDK. The latest GitHub release endpoint returned v1.0.1 from January 2024, while the inspected default-head source is from May 2025; package.json uses a CI-substituted version. Current published npm version/support parity was **not verified**. This is an adoption question to resolve, not a reason to discard Wasm. [W2]

The JavaScript **plugin** PDK is also a distinct environment. Current inspected source `beacc9ad9e6bac6250143980b669d2e6c68aaa18` documents synchronous exported calls, no task queue/background work, no Node filesystem/network modules, no DOM, and no dynamic imports. Pure JS libraries may bundle; arbitrary existing Node/browser packages do not. This is an architectural tradeoff: the constrained call boundary may simplify a user-plugin contract while narrowing deep customization. A port should expose needed capabilities deliberately rather than claim existing TypeScript plugins run unchanged. [W3]

**Recommendation:** qualify Extism as a separate plugin profile when third-party isolation, multi-language authoring, and a data/host-call ABI are desired enough to justify the constrained environment. It can coexist with trusted TypeScript modules. Do not make every ordinary feature a Wasm plugin, and do not write a Wasm host from scratch. A native/JS SDK parity spike must test the same plugin, host-call authorization, CPU timeout, memory limits, instance reset, late host calls, and actual termination observations on the supported targets.

## Existing platforms and Temporal are alternatives at the right boundary

NGINX's official control document demonstrates a whole-server make-before-break procedure: validate/open candidate resources, preserve old configuration on preparation failure, start new workers, close old listeners, and finish old clients. It is a server with an owned event/process model, not a general library to embed. Its executable-upgrade procedure can temporarily have both old and new workers accepting connections. Neither procedure proves a single product operation has a closed collaborator generation. [P1]

Envoy's drain and hot-restart APIs similarly apply to listeners, connections, filters and process versions. The current `latest` documentation retrieved during this work is explicitly **1.41.0-dev**, so it is not a stable-release adoption pin. Its value here is boundary clarification: connection drain is protocol specific, and upstream pool draining is distinct from application work. The earlier research's stable versioned evidence remains a safer citation for an adoption proposal. [P2]

Temporal is potentially a stronger reuse answer when the replaceable unit is **durable workflow execution**: let Temporal own worker deployment routing/pinning, history, retries and workflow progress through its adapter. Do not reconstruct that durable runtime in a plugin package. But Temporal does not load/unload JavaScript modules, close a browser worker, transfer native resource custody, select the application's synchronous plugin route, or prove external business effects were undone. A Temporal Activity that invokes the same mutable plugin endpoint has not thereby gained generation affinity. The operation must intentionally bind its plugin artifact/generation or dispatch to the intended versioned worker. Detailed worker-versioning semantics are covered by the separate Temporal research workstream and prior pinned EF memo; this report adds no independent runtime qualification. [I5]

## Portable package shape and ownership

A new reusable package needs a demonstrated residual concern after subtracting the existing kernel and fitting execution/RPC libraries. Correlation, cancellation transport and proxy plumbing are not automatically new library responsibilities: workerpool and Comlink already cover substantial parts. A possible residual mechanism validates generation-bound exchanges, preserves exact operation/execution custody and reports truthful observations under an ordinary external contract. That responsibility remains a hypothesis until the real slice and external fixtures demonstrate it. The consuming Host uses these mechanics while it prepares an opaque execution generation, publishes through its declared authority, binds a request, and observes old work. There must be one product-authorized lifecycle operation. Its driver code may itself be a reusable library: code reuse does not transfer business authority. What is excluded is a second independently driving coordinator or an independently editable copy of kernel/canonical state. Purpose-neutral public terminology can use generation, operation, execution, and retirement. It must not require organization credentials, an Agent Teams catalog, or GM composition to import it. A GM adapter may use the already owned optional kernel when qualified; a product adapter supplies its canonical admission and artifact policy. [I4]

This is a boundary proposal, **not an API design**. Avoid a facade with dozens of generic lifecycle hooks merely to call every dependency through one interface. Retain the existing synchronous kernel owner and execution/custody owner; reuse existing operation/reconciliation storage. Respect the deferred keeper/init direction without claiming it is available. Product-owned rollout-operation progress, kernel facts, and canonical authority are separate state; the shared helpers must not keep independently editable copies of them. A broader autonomous async manager is not the default recommendation and would require its own explicit owner discussion.

Useful external conformance cases include a plain callback implementation and independently packaged worker implementation consuming the same public root without any org policy. A real consumer proves the mechanism simultaneously. The [EF package-admission authority](../architecture/overview.md#package-admission) permits an ordinary-library source boundary for an independently replaced/released or deployed concern with its required evidence; it does not make those exports a public extension SPI. Exact accepted package identity, actual value-level implementation, admission verifier and recorded evidence are still required. The user-requested real consumer and ordinary external projects can qualify the candidate mechanism; stable public SPI independently requires its implementations, and Orchestrator OD-041 retains two real product integrations. A disposable fake or second wrapper over identical hidden code is not those stronger forms of independence.

The unit should be a **cohort**, not automatically one module or one installed plugin. Thousands of descriptors do not imply thousands of resident isolates. Grouping modules reduces worker/IPC cost but enlarges replacement closure and restart cost. Separate catalog count, active graphs, execution owners, tenants, concurrent work, bytes, and churn in qualification. No inspected library turns the marketplace plugin count into a memory or latency guarantee.

## Review outcome: repository choice and pool identity

A whole plugin ecosystem does not belong in one new runtime. GM retains neutral
composition and its independent local kernel candidate; EF retains neutral
artifact/trust/lifecycle obligations and conformance; products retain extension
points and operational authority. The physical custody owner remains separate.

**Current recommendation:** describe and qualify the replacement concern as a
purpose-neutral reusable mechanism from its first real delivery. Keep this
research and the owner discussion in EF. Do not move the accepted GM kernel or
create a speculative runtime repository. A separate repository is justified when
that first delivery identifies a substantial independent release/consumer
boundary; an independent package can also live in an existing repository. If
existing kernel plus execution/RPC adapters exhaust the shared need, use them
without inventing an extra generic package. The actual shared driver may be
reused across products without becoming an independent authority.

Piscina is a candidate for explicitly single-worker task-oriented reuse, not
yet the selected executor. Its tested multiworker close failure must be resolved
or avoided by a separately demonstrated strategy before that wider promise.
Its default thread counts follow machine parallelism, idle workers can recycle,
and aborting an active abortable task stops its Worker. A pool is therefore not
a single worker incarnation. Define fixed bounds, readiness for each executor,
allowed respawn and generation membership; distinguish graph generation from
execution incarnation. The initial single-worker profile must either use direct
Worker plumbing or explicitly qualify its pool mapping. Never infer support for
64 concurrent operations from a configured pool size.

Published Piscina declarations failed strict TypeScript7.0.2 dependency checking
with `exactOptionalPropertyTypes` in the experiment. Its final fixtures used
`skipLibCheck` for dependency declarations, retained the original failure and
kept their own TypeScript strict. This leaves full dependency-declaration validation unqualified; the actual
owning profile determines whether third-party `skipLibCheck` is permitted.
It is not a repository setting change or a waiver of the supported compiler.

Comlink **4.4.2**, Apache-2.0, is a concrete Node/browser message RPC candidate.
Its tag resolves to `fd4b52666b1ec62784f8b45cb1108c7e40bc481d`; npm metadata
reported the same version and `gitHead` on 2026-10-22. This is pinned-source and
registry-metadata evidence; no tarball execution, integrity check or strict
TypeScript7 consumer qualification was performed for Comlink. [N7]

Its request IDs and pending listeners supply transport correlation. Its pinned
protocol has no cancellation message; proxy release clears listeners and does
not return an awaited drain, and the remote finalizer return is not awaited.
Callbacks/proxied values can create additional MessageChannels and outlive the
outer request. Expose a narrow validated data method, keep raw proxies inside
the adapter, and reject callback/port/iterator escape from the first bounded
request profile. A transport request ID is not the product operation identity,
an idempotency key, authorization or evidence of task/Worker exit. [N7]

Compare Comlink only where the chosen execution API still needs message RPC.
Piscina's task API already correlates results; wrapping it in another proxy
without a real requirement would add a layer. A long-lived direct Worker
capability is a more plausible reuse case. Do not add a handwritten RPC stack
merely because a small generation envelope remains. The
[customization guidance](customization-without-forks-and-scale.md) and dated
[critic dispositions](plugin-research-review-and-decision-record.md) explain the
related lifetime and authoring boundaries.

## Alternatives and honest planning estimates

Scores are judgments for the bounded trusted request profile, not measured availability. Confidence rates evidence/fit; reliability rates achievable scoped correctness after qualification; complexity increases with burden. LOC is new maintained handwritten production versus test/fixture code, excluding dependencies, generated files, docs, domain behavior and infrastructure already owned elsewhere. The complete production rows assume existing canonical transaction/operation identity, grant enforcement, immutable artifact handling, and approved supervision. If those are absent, these estimates are invalid. Rows are alternatives and **must not be added together**. Ranges are planning estimates, approximately ±2×.

| Alternative | Confidence /10 | Reliability /10 | Complexity /10 | Production LOC | Test/fixture LOC |
| --- | ---: | ---: | ---: | ---: | ---: |
| Controlled restart/static seam using existing process deployment | 9 | 9 within restart promise | 2 | 150–600 | 300–1,200 |
| Local snapshot/cohort dispatch only, no durable acceptance or physical unload claim | 8 | 7 | 3 | 500–1,300 | 1,000–2,500 |
| Purpose-neutral protocol helpers + qualified existing kernel adapter + direct Node Worker adapter, including product-owned complete bounded protocol | 7 | 8 | 6 | 2,800–5,500 | 5,000–9,000 |
| Same protocol using Piscina for an explicitly single-worker task profile; wider pool closure unresolved | 6 | 8 after qualification of the stated profile | 6 | 2,500–5,000 | 4,500–8,500 |
| workerpool cross-target adapter, complete protocol with distinct platform evidence | 6 | 8 for explicit per-target promise | 6 | 3,000–5,800 | 5,500–10,000 |
| Existing supervised child-process owner + typed IPC, complete bounded protocol | 7 | 8 for the same logical promise | 7 | 3,200–6,000 | 5,500–10,000 |
| Go tableflip/PM2/existing proxy whole-service deployment, **only if that service boundary already exists** | 8 | 9 within service-deploy promise | 3 | 200–900 configuration/glue | 600–2,000 |
| Extism SDK profile + same authority/cohort obligations, constrained plugin ABI | 6 | 8 for explicit constrained profile | 7 | 3,500–6,500 | 6,000–11,000 |
| New Rust replacement coordinator around ArcSwap/Tokio plus TS/browser integration | 5 | 8 | 8 | 4,000–8,000 across languages | 7,000–13,000 |
| Move/extract/rename existing lifecycle-kernel into another repository/package | 4 before owner discussion | No reliability gain inherent in location | 6 | 500–1,500 migration/tooling, not feature completion | 1,000–3,000 compatibility/consumer fixtures |
| Native dynamic-library reload for arbitrary independently authored plugins | 2 | 3 for requested broad promise | 9 | No defensible complete estimate | No finite generic unload proof |

These rows compare different scoped promises, not reliability rankings across languages or placements. For the same bounded logical replacement promise, a process boundary does not inherently raise the 8/10 planning reliability judgment; its extra fault-containment capability needs its own evidence. The direct-Worker and Piscina estimates are alternative hypotheses, not measured code savings. The subsequent declaration failure must be resolved under the selected owning profile's declaration policy; this experiment is not full dependency-declaration qualification. The difference between direct Worker and Piscina is deliberately modest: the dominant complete-protocol work is admission/recovery/custody evidence, not issuing worker messages. Do not advertise the package as removing 80–90% of the effort without a measured implementation comparison. Conversely, do not write a bespoke pool, cancellation transport, RPC protocol, lock-free reclamation scheme, outbox, or process supervisor when an existing owner already supplies it.

A narrower transport-only adapter is plausibly **250–700 production LOC / 600–1,500 test LOC** around direct Node Worker or workerpool, or **150–450 / 400–1,000** around an already fitting Piscina pool. Those numbers do not include durable publication/admission or production retirement. A Rust ArcSwap wrapper alone may be tens of lines, but quoting that as the replacement system cost is a category error.

## Strongest objections to the recommendation

1. **A full-service rollout may already solve the actual user problem.** If independently replaceable HTTP/workflow service units deliver the desired customization, existing platform routing and drain are likely more economical than fine-grained plugin hot replacement. The first qualification must demonstrate why runtime granularity is needed.
2. **The task model may be the wrong abstraction.** Piscina/workerpool optimize task execution. A capability with persistent background listeners, callbacks, streams and exclusive hardware may become harder to express safely through a pool than through an explicitly supervised execution owner. Start with the bounded request profile and reject unsupported cases.
3. **The shared coordinator could become a disguised universal Host.** If product policy, grants, SQL schema, trust rules, state migration and native process control appear in its core, the proposed reuse boundary has failed. Keep those owners external and avoid a speculative universal adapter interface.
4. **An adapter can weaken a library's meaning.** Mapping pool `drain`, tracker `close`, proxy `close`, cancellation, and actual exit to one success Boolean is unsafe. Adapters must expose distinct facts and reject unsupported guarantees.
5. **Library-first can be misread as package-first.** Common guidance supports a deliberate reusable implementation with a real slice and external fixtures, not immediate publication of an abstract manager before its owning decision. Existing accepted package identity and EF/Orchestrator gates must remain visible.
6. **Rust could reduce native failure classes, but adds an integration surface.** It earns its place where a separately admitted custody implementation or a measured native workload requires it. The current deferred keeper/init direction is not that implementation. For a mostly TypeScript application, a second coordinator may increase maintenance, cross-target mismatch and operational coupling without replacing the hard authority protocol.
7. **Retaining old generations can become operationally expensive.** Incomplete cleanup, a pinned long operation, or a pool bug can fill the predecessor budget. Reuse does not remove the need for explicit caps and honest degraded results. More updates must stop at the cap rather than accumulate workers indefinitely.

## Concrete qualification that would change the conclusion

The [bounded adapter experiment](worker-adapter-replacement-experiment.md) has now executed readiness, task, admission and close cases. It did not execute canonical acceptance, kernel integration, browser parity, churn, memory or the production profile below. Reuse that evidence and add only the missing cases that can change selection. The original proposed comparison was a **small comparative spike**, not a new framework: same one trusted overlap-safe read-only request capability; direct Worker versus Piscina; optionally workerpool if cross-target delivery is needed immediately. Use one independently packaged plugin artifact, a slow accepted operation across publication, a candidate startup failure, a lost acceptance acknowledgment, task failure after a simulated accepted external call, late cleanup, a non-cooperating task, and repeated varied churn. Capture request-generation affinity, actual worker/task outcomes, bounded retained owners, shutdown cause and memory slope. Keep application behavior and canonical authority identical. No invented second operation store or supervisor.

Reject Piscina if its worker/task lifecycle forces unsafe control-path bypasses or obscures owned finally work. Reject bespoke Worker code if the library version meets the same invariants with materially less maintained code. Reject the whole fine-grained protocol if controlled service/process restart meets the real user outcome at substantially lower operational burden. Only after that evidence and the owning decisions should the team choose a package/repository delivery shape.

## Source ledger

All URLs retrieved 2026-10-22. GitHub commit refs below are inspected source pins. Published-release metadata and repository activity were inspected via the official GitHub API; neither proves a published package tarball or production compatibility was executed. Hosted docs without commit refs are moving documents. No source's marketing claim of production maturity is treated as our independently measured result.

### Existing authority and retained research

- **I1:** EF research hub, hot-reload proposal and review record at `466e35a62481a6b21f2062524bb92c7eb221bb8c`: <https://github.com/agent-teams-ai/extension-foundation/blob/466e35a62481a6b21f2062524bb92c7eb221bb8c/docs/research/plugin-system-research-reference.md>, <https://github.com/agent-teams-ai/extension-foundation/blob/466e35a62481a6b21f2062524bb92c7eb221bb8c/docs/research/hot-reload-and-generation-replacement.md>, <https://github.com/agent-teams-ai/extension-foundation/blob/466e35a62481a6b21f2062524bb92c7eb221bb8c/docs/research/plugin-research-review-and-decision-record.md>.
- **I2:** GM ADR0029, existing candidate owner: <https://github.com/agent-teams-ai/get-modular/blob/7131d0d7a6bb5dd4c3e8906ccac065c0be0e0333/docs/decisions/0029-admit-an-optional-lifecycle-kernel-candidate.md>.
- **I3:** EF ADR0015, semantic separation: <https://github.com/agent-teams-ai/extension-foundation/blob/9ea7024672ae06a15c701fa1e23bf6db37975e20/docs/decisions/0015-authorize-get-modular-semantic-extraction.md>. EF ADR0011 runtime-publication and retirement authority: <https://github.com/agent-teams-ai/extension-foundation/blob/9ea7024672ae06a15c701fa1e23bf6db37975e20/docs/decisions/0011-extension-admission-custody-and-retirement-closure.md>.
- **I4:** Current shared engineering-quality standard, library-first and universal tooling; source read in local refreshed .github checkout and remote current-head metadata `d17901e6975fdb4388b1f75cad901e7f448aebbe`: <https://github.com/agent-teams-ai/.github/blob/d17901e6975fdb4388b1f75cad901e7f448aebbe/docs/engineering-quality-standard.md>. This report does not silently apply a moving link as a change to any frozen adoption pin.
- **I5:** Prior primary Temporal evidence pin retained by EF: <https://github.com/temporalio/documentation/blob/34fb32fb06a6cb8d71df25f8dd9d522c93fecb9b/docs/encyclopedia/workers/worker-versioning.mdx>. Current Temporal recheck belongs to the parallel workstream; this report did not execute a Temporal spike.
- **I6:** Agent Runtime source `8d89b28f07426846b3ded7c6bd933363d9dc468c`, read in refreshed local checkout: <https://github.com/agent-teams-ai/agent-runtime/blob/8d89b28f07426846b3ded7c6bd933363d9dc468c/docs/architecture/rust-custody-migration-follow-up.md> and <https://github.com/agent-teams-ai/agent-runtime/blob/8d89b28f07426846b3ded7c6bd933363d9dc468c/docs/architecture/host-custody-optional-default.md>. Proposed keeper/init repository unavailability was reported by the parent workstream; not independently rechecked here.

### Node / TypeScript

- **N1:** Node v24.22.0 Worker source documentation, commit `f14cd3aa7bf9ca8df2cc5b8bb14beb0f335b1d93`: <https://github.com/nodejs/node/blob/f14cd3aa7bf9ca8df2cc5b8bb14beb0f335b1d93/doc/api/worker_threads.md>.
- **N2:** Piscina release-tag README, package and license: <https://github.com/piscinajs/piscina/blob/6c7e54630a8c28a96ce5c0625b463d849d21171c/README.md>, <https://github.com/piscinajs/piscina/blob/6c7e54630a8c28a96ce5c0625b463d849d21171c/package.json>, <https://github.com/piscinajs/piscina/blob/6c7e54630a8c28a96ce5c0625b463d849d21171c/LICENSE>. Release metadata <https://github.com/piscinajs/piscina/releases/tag/v5.3.2>. Tag/package-version discrepancy stated above.
- **N3:** Piscina close/destroy implementation: <https://github.com/piscinajs/piscina/blob/6c7e54630a8c28a96ce5c0625b463d849d21171c/src/index.ts>.
- **N4:** workerpool documentation and implementation: <https://github.com/josdejong/workerpool/blob/17dbcc88b87cb266d99953d91f7bc8898dce0b73/README.md>, <https://github.com/josdejong/workerpool/blob/17dbcc88b87cb266d99953d91f7bc8898dce0b73/src/Pool.js>, <https://github.com/josdejong/workerpool/blob/17dbcc88b87cb266d99953d91f7bc8898dce0b73/package.json>.
- **N4a:** independently verified published 10.0.3 registry `gitHead` and matching installed `Pool.js`: <https://github.com/josdejong/workerpool/blob/601124cf86602c1ac88c273a8f99e9c40bea0f16/src/Pool.js>, <https://github.com/josdejong/workerpool/blob/601124cf86602c1ac88c273a8f99e9c40bea0f16/src/Promise.js>; exact tarball identity, integrities and executed results in the [experiment](worker-adapter-replacement-experiment.md).
- **N5:** PM2 official graceful start/shutdown docs <https://pm2.keymetrics.io/docs/usage/signals-clean-restart/>; v7.1.0 source/package/license declaration <https://github.com/Unitech/pm2/blob/6fcb92a1c96b939c7649309fc6a8fa317191835c/package.json>; release <https://github.com/Unitech/pm2/releases/tag/v7.1.0>.
- **N6:** node-http-proxy <https://github.com/http-party/node-http-proxy/blob/9b96cd725127a024dabebec6c7ea8c807272223d/README.md> and package <https://github.com/http-party/node-http-proxy/blob/9b96cd725127a024dabebec6c7ea8c807272223d/package.json>.
- **N7:** Comlink 4.4.2 source-only/metadata check: <https://github.com/GoogleChromeLabs/comlink/blob/fd4b52666b1ec62784f8b45cb1108c7e40bc481d/README.md>, <https://github.com/GoogleChromeLabs/comlink/blob/fd4b52666b1ec62784f8b45cb1108c7e40bc481d/src/comlink.ts>, <https://github.com/GoogleChromeLabs/comlink/blob/fd4b52666b1ec62784f8b45cb1108c7e40bc481d/src/protocol.ts>, <https://github.com/GoogleChromeLabs/comlink/blob/fd4b52666b1ec62784f8b45cb1108c7e40bc481d/src/node-adapter.ts>, <https://github.com/GoogleChromeLabs/comlink/blob/fd4b52666b1ec62784f8b45cb1108c7e40bc481d/LICENSE>, <https://registry.npmjs.org/comlink/latest>. Retrieved source/tag/registry metadata are retained with the dated review evidence.

### Go

- **G1:** Go1.27.2 standard atomic.Value copy-on-write examples: <https://github.com/golang/go/blob/022c8636110ebac86a9b88724cda168ed713c21f/src/sync/atomic/example_test.go>.
- **G2:** Same Go source, Server.Shutdown: <https://github.com/golang/go/blob/022c8636110ebac86a9b88724cda168ed713c21f/src/net/http/server.go>.
- **G3:** Same Go source, native plugin warnings: <https://github.com/golang/go/blob/022c8636110ebac86a9b88724cda168ed713c21f/src/plugin/plugin.go>.
- **G4:** tableflip v1.2.3 documentation: <https://github.com/cloudflare/tableflip/blob/b3a0d54308fba327fb463cc1a3c11d3607deea53/README.md>, <https://github.com/cloudflare/tableflip/blob/b3a0d54308fba327fb463cc1a3c11d3607deea53/doc.go>.
- **G5:** tableflip application-owned HTTP drain and candidate timeout: <https://github.com/cloudflare/tableflip/blob/b3a0d54308fba327fb463cc1a3c11d3607deea53/http_example_test.go>, <https://github.com/cloudflare/tableflip/blob/b3a0d54308fba327fb463cc1a3c11d3607deea53/upgrader.go>.
- **G6:** Suture v4.0.6 service/supervisor contract: <https://github.com/thejerf/suture/blob/8a2561c661dce2a30c484b08e865676059c1e63e/v4/service.go>, <https://github.com/thejerf/suture/blob/8a2561c661dce2a30c484b08e865676059c1e63e/v4/supervisor.go>. Later default-head source `00e376b91b6b77b1b6caf74f757b3dd245e2fe60` was checked for maintenance only.
- **G7:** go-plugin v1.8.0 README/go.mod: <https://github.com/hashicorp/go-plugin/blob/155dcddc94873a285e14b7fa24b2f6ab6139668e/README.md>, <https://github.com/hashicorp/go-plugin/blob/155dcddc94873a285e14b7fa24b2f6ab6139668e/go.mod>.
- **G8:** go-plugin Client.Kill and startup semantics: <https://github.com/hashicorp/go-plugin/blob/155dcddc94873a285e14b7fa24b2f6ab6139668e/client.go>.

### Rust

- **R1:** ArcSwap1.9.3 usage patterns: <https://github.com/vorner/arc-swap/blob/624412b87757c6bd5d73c6ada594d321f602b2d2/src/docs/patterns.rs>; crate release metadata <https://docs.rs/crate/arc-swap/1.9.3>.
- **R2:** ArcSwap corrections/strategy changelog: <https://github.com/vorner/arc-swap/blob/624412b87757c6bd5d73c6ada594d321f602b2d2/CHANGELOG.md>.
- **R3:** tokio-util0.7.20 TaskTracker/Cargo manifest: <https://github.com/tokio-rs/tokio/blob/5ec9e6b8d5a7111fe9cd35a637bd8b4e4eb1e483/tokio-util/src/task/task_tracker.rs>, <https://github.com/tokio-rs/tokio/blob/5ec9e6b8d5a7111fe9cd35a637bd8b4e4eb1e483/tokio-util/Cargo.toml>.
- **R4:** Tokio official shutdown guide <https://tokio.rs/tokio/topics/shutdown>; CancellationToken source inspected in the same source family.
- **R5:** hyper-util0.1.21 GracefulShutdown source: <https://github.com/hyperium/hyper-util/blob/23a868965964c1d6bb1b94f30ba4c420a4bebe7c/src/server/graceful.rs>.
- **R6:** Pingora0.9.0 graceful guide, platform/MSRV and implementation: <https://github.com/cloudflare/pingora/blob/702f69015e53f7244d6ad2e743de571d859a70a4/docs/user_guide/graceful.md>, <https://github.com/cloudflare/pingora/blob/702f69015e53f7244d6ad2e743de571d859a70a4/README.md>, <https://github.com/cloudflare/pingora/blob/702f69015e53f7244d6ad2e743de571d859a70a4/pingora-core/src/server/mod.rs>.
- **R7:** abi_stable README, explicit no-unloading scope and ABI conditions: <https://github.com/rodrimati1992/abi_stable_crates/blob/9966b8f0084fc768e3fb557bf81affea0b5868d8/readme.md>.
- **R8:** hot-lib-reloader0.8.2 README and manifest: <https://github.com/rksm/hot-lib-reloader-rs/blob/c427661a1041562501e30abd69cdd45db2f8f6fb/README.md>, <https://github.com/rksm/hot-lib-reloader-rs/blob/c427661a1041562501e30abd69cdd45db2f8f6fb/Cargo.toml>.

### Wasm and platforms

- **W1:** Extism1.41.0 README/C API: <https://github.com/extism/extism/blob/051b765bb6abe4fe95d5e4f489f03ad7b137edbc/README.md>, <https://github.com/extism/extism/blob/051b765bb6abe4fe95d5e4f489f03ad7b137edbc/runtime/extism.h>.
- **W2:** Extism JS Host SDK separate implementation/requirements and worker-timeout check: <https://github.com/extism/js-sdk/blob/bec25c60d0ad32ce06d3934563fd8560f486f323/README.md>, <https://github.com/extism/js-sdk/blob/bec25c60d0ad32ce06d3934563fd8560f486f323/src/mod.ts>, <https://github.com/extism/js-sdk/blob/bec25c60d0ad32ce06d3934563fd8560f486f323/package.json>. GitHub latest release endpoint returned <https://github.com/extism/js-sdk/releases/tag/v1.0.1>; npm parity unverified.
- **W3:** Extism JS plugin environment restrictions: <https://github.com/extism/js-pdk/blob/beacc9ad9e6bac6250143980b669d2e6c68aaa18/README.md>.
- **P1:** NGINX official server control docs <https://nginx.org/en/docs/control.html>.
- **P2:** Envoy moving development drain docs <https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/operations/draining>; explicitly observed as 1.41.0-dev, not a stable adoption source. Prior stable reference retained by EF: <https://www.envoyproxy.io/docs/envoy/v1.36.0/intro/arch_overview/operations/hot_restart>.
