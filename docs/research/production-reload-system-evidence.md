---
id: research.reload-systems
type: research
status: active
owner: architecture
summary: Primary evidence from OTP, NGINX, Envoy, JavaScript hosts, Wasm and deployment controllers.
---

# Production Reload System Evidence

Research date: **2026-10-21 UTC**. Assignment: seven concrete comparison cases, primary evidence, production cutover/failure semantics, and applicability to a TypeScript/Node/browser product using Get Modular (GM) and Extension Foundation (EF). **Research only; this memo does not approve architecture changes.** No implementation or remote changes were made. Repository ownership and adoption provenance are recorded in the [review record](plugin-research-review-and-decision-record.md); the cross-system researcher did not independently re-audit those repositories.

## Decision in one paragraph

**Use independently constructed generations with explicit Host admission and retirement, choosing an execution boundary that can actually be retired.** NGINX/Envoy supply the most transferable operational pattern: prepare a replacement, establish its readiness, route new work to it, preserve old work’s old execution context, and retire the old context under a deadline. Erlang supplies unusually strong *VM-specific* code/state upgrade machinery, not a portable TypeScript recipe. Node ESM cache tricks and Vite HMR do not supply production unload or recovery. Wasmtime/Extism can make instance ownership and resource limits clearer, but do not supply application publication, durable effects, or distributed fencing. Kubernetes is a useful deployment boundary, not a module kernel. These are recommendations inferred from the cases below; none authorizes a second GM lifecycle/composition engine or an EF-owned operational Host.

## Evidence conventions and limits

- **F** = documented API/implementation fact; **H** = historical report or limitation; **I** = architectural inference/recommendation for our stack.
- **High** confidence means directly supported by primary documentation or source; it does not mean locally tested. **Medium** means an issue author’s incident/diagnosis or an inference whose adequacy depends on the eventual Host profile.
- Versioned evidence is deliberately identified. Envoy **v1.36.0**, Node **v24.10.0**, and OTP **29.1.2** are evidence pins, not an assertion that they are the latest supported production versions. OTP pages expose their matching tag source. Current Wasmtime API pages identify themselves as **51.0.0-dev**; these establish documented mechanics, not a qualified production-version recommendation. Current docs and issue status were read on the research date. Some current pages are mutable; fetched page line locators below describe this retrieval and are not immutable permalinks.
- No case below establishes exactly-once external effects, automatic database compatibility, or fleet-wide atomic publication. A successful local lifecycle method proves only its documented postcondition.

## 1. Erlang/OTP: real VM code replacement, bounded by two versions and explicit state conversion

**F / High.** OTP’s code-loading reference distinguishes **current** and **old** module code. Both can execute concurrently; fully qualified calls select current code, while local calls can keep a process in old code. A process must make a fully qualified call to move to current code. The tutorial’s third-version explanation includes purging old code and terminating processes still in it. This is a bounded coexistence model, not unlimited retained generations. [E1]

**F / High.** The operational API requires finer language than “third load is safe”: `code:atomic_load` loads the requested modules together or none, and can reject `not_purged`. `prepare_loading` followed by `finish_loading` separates preparation from committing code loading; preparation rejects `-on_load` functions. `soft_purge` refuses if processes still reference old code; `purge` kills lingering processes. Thus forced purge and a safe failed update are different outcomes. [E2]

**F / High.** When process-state representation changes, OTP prescribes suspending relevant processes, changing state/code, removing old code, and resuming. Advanced updates call `code_change/3`. The release handler discovers affected processes through supervision-tree child-spec module lists. Each node’s release handler is local; every node requiring an upgrade must be addressed, although release scripts have synchronization instructions. [E3]

**F / High.** `gen_server:code_change` receives old-version identity, current state, and upgrade-specific data, and returns converted state or an error. An advanced update without the callback fails with `undef`; the callback contract documents rollback on `{error, Reason}`. This is an explicit state-migration interface, not automatic reinterpretation of arbitrary state. [E4]

**F / High.** Release installation and persistence are separate. `check_install_release` checks scripts/applications/code and evaluates pre-`point_of_no_return` instructions. A recoverable installation error restores application specifications; a non-recoverable error restarts the system. A successfully installed release must separately be made permanent to become the reboot default. Upgrade and downgrade scripts are explicit. [E5]

**Publication/cutover interpretation — I / High.** `finish_loading` is a local code-availability commit, not atomic conversion of every process, mailbox, database row, or remote peer. OTP’s exported-function switch also means an execution may enter new code before its process state is converted unless the upgrade procedure establishes the required safe points. A product cannot reproduce these semantics by replacing a JavaScript property or deleting a cache entry.

**What to reuse — I.** Explicit compatibility edges; separate prepare/commit; an observable refusal to retire while old references remain; opt-in state migration; separate running and reboot-persistent state. Make forced termination an explicitly reported policy outcome.

**What not to copy — I.** Do not emulate BEAM’s two-code VM in GM. Do not assume two TypeScript versions are state-compatible because interfaces compile, or that a downgrade reverses durable external effects. In-place conversion of arbitrary live domain objects is a costly specialized profile; replacement of the owning worker/process is generally a clearer boundary for this stack.

## 2. NGINX: configuration cycles and worker-process replacement

**F / High.** On `HUP`, the master checks configuration syntax and tries opening required logs/listen sockets. Failure preserves the old configuration. Success starts new workers and requests graceful shutdown of old ones; old workers close listen sockets and finish existing clients. Executable upgrade (`USR2`) is a separate procedure: a new master starts while the old master survives; both sets of workers initially accept requests. The operator can drain old workers and can restart them if the new executable is unacceptable. [N1]

**F / High.** `worker_shutdown_timeout` has no default time value shown; setting it bounds graceful shutdown by making NGINX attempt to close remaining connections when the timeout expires. This is a different guarantee from waiting indefinitely for all clients. [N2]

**F / High.** NGINX’s development guide explicitly identifies module globals and implicit library global state as reload hazards: generation-specific data should belong to a configuration cycle and its pool, because old and new configurations must coexist and later be destroyed. It also warns against copying internal functions because security fixes and binary compatibility do not automatically carry over. [N3]

**Publication/cutover interpretation — I / High.** This is admission at listener/worker boundaries. There is no advertised single point at which every client switches configurations. A retained connection can continue to use an old worker. Syntax and socket checks do not establish an application-level dependency readiness condition or the semantic correctness of new business behavior.

**What to reuse — I.** Construct candidate-owned resources before retiring the active generation; tie cleanup to the ownership scope; keep serving on preparation failure; preserve the old execution context for accepted work. Review implicit global state in third-party SDKs, telemetry registration, scheduled jobs, caches, and singleton connection pools.

**What not to copy — I.** A NGINX config reload is not evidence for live unloading arbitrary JavaScript or native add-ons. The documented dual-master binary-upgrade rollback depends on retained listener/process state and says nothing about undoing application writes. Do not import OS-signal/PID orchestration into every feature module.

## 3. Envoy: distinguish xDS config publication from process hot restart

### xDS configuration

**F / High.** In the pinned xDS protocol, ACK means individual resources passed validation and the client intends to apply them; it does **not** mean application succeeded. Clusters and listeners warm before serving; required EDS/RDS data is part of warming, with documented cache-specific exceptions. xDS is eventually consistent: routing to cluster Y before Y is supplied can blackhole traffic. The recommended dependency order is make-before-break: supply X+Y, repoint routes to Y, then remove X. ADS enables sequencing control; it is not a claim of a distributed all-resource transaction. [V1]

### Process hot restart and drain

**F / High.** A new Envoy fully initializes before obtaining copied listener sockets, starts listening, and asks its predecessor to drain. Existing connections are **not transferred**. `--drain-time-s` governs draining; independent `--parent-shutdown-time-s` should be larger, and remaining connections close at parent termination. Linux listener sockets are passed by worker index: decreasing concurrency can lose connections queued for removed workers. Hot restart does not update listener socket options; a full restart or LDS update is needed. Windows hot restart is unsupported in this pin. [V2]

**F / High.** Draining depends on network-filter support. The HTTP connection manager discourages reuse through HTTP/1 connection closure and HTTP/2 GOAWAY. The admin graceful-drain mode can continue accepting connections until its timeout; “draining” is therefore not universally equivalent to “admission closed.” [V3]

**H / Medium, 2019 incident; not a present-day unfixed-bug claim.** Issue #5894 reports an outage after mass hot restart while management servers were overloaded or unreachable on the new port: old instances drained before useful replacement configuration was available. A maintainer recommended canary/rolling procedures and described the control plane as necessary for starting/restarting instances. The issue’s closure is not proof of a specific code fix. [V4]

**Publication/cutover interpretation — I / High.** Parsing/ACK, dependency readiness, listener admission, individual request completion, and predecessor death are five different observable facts. “Healthy old data plane during control-plane outage” does not imply “a fresh replacement can initialize without that control plane.” Readiness must be checked against the candidate’s actual dependencies, not inferred from the active generation’s health.

**What to reuse — I.** Explicit candidate warming; dependency-before-consumer sequencing; separate grace and hard retirement deadlines; exact protocol-specific drain semantics; distinguish accepted candidate, active candidate, and proven retirement.

**What not to copy — I.** Do not turn every module into a miniature xDS control plane or assume ACK is publication. Do not promise connection preservation across platform boundaries. For a single local Host with an immutable GM graph, use one explicit selected plan; distributed resource streaming is optional infrastructure only when an actual deployment requires it.

## 4. Node ESM and worker/browser boundaries: new imports are not old-code retirement

**F / High.** The pinned Node ESM docs specify URL-based module identity: different query/fragment values load modules multiple times. `import` has a separate cache from `require.cache`. The current ESM docs retain these rules. This establishes duplicate loading, not a supported ESM unload operation. [J1]

**F / High.** Node workers provide a separate JavaScript execution context, but execution may stop at any point when `worker.terminate()` is invoked. In the pin, termination is asynchronous and resolves after the worker’s `exit` event. Worker resource limits apply to its JS engine; the API warns that external data is outside these limits and global out-of-memory can still abort the process. [J2]

**F / High.** Browser termination is a separate contract: the HTML standard directs the user agent to discard queued worker tasks and abort the running script; `Worker.terminate()` returns no completion Promise. It does not provide Node’s `exit` acknowledgement. [J3]

**Publication/cutover interpretation — I / High.** A timestamped `import()` may create new code while old exports, listeners, timers, closures, promise continuations, transitive dependency instances, or native resources still survive. Querying only the root module also does not by itself version every dependency URL. Re-execution is not revocation. Neither Node nor browser worker creation defines application readiness, generation admission, request IDs, or routing publication.

**What to reuse — I.** For actually replaceable executable code, put a selected immutable graph in a deliberately owned worker/process. Use a Host protocol: candidate reports compatibility/readiness, Host publishes a route, work carries request+generation identity, old admission closes, accepted work completes or is cancelled, then termination is requested and its available evidence recorded. Keep implementation-specific completion evidence explicit in the platform adapter.

**What not to copy — I.** Do not present `delete require.cache`, timestamped ESM imports, dropping one object reference, or invoking cleanup callbacks as a production unload guarantee. Do not assume `finally` runs after forced worker termination. Worker limits are not OS isolation; choose a process/container or constrained Wasm profile if the product requires a stronger failure/security boundary. Avoid one worker per ordinary static module.

## 5. Vite HMR: useful developer cleanup hooks, deliberately weaker than production replacement

**F / High.** Current HMR docs state that Vite does not actually swap the originally imported module. A boundary that re-exports a dependency must update those exports itself, and importers above the boundary are not notified. `hot.dispose` cleans persistent side effects; `hot.prune` handles removal from the graph; `hot.data` persists between instances. HMR code is guarded so production builds can remove it. The archived Vite 7 docs independently describe the same basic boundary/disposal model. [D1]

**H / Medium, 2025 attribution correction.** Vite issue #20155 reported severe growth after many HMR edits in Vite 6.3.5. The reporter subsequently attributed most retention to the Vue compiler’s LRU cache and reported dramatically smaller residual growth after removing it, then closed the issue as not planned. This is an author’s diagnosis and workaround experiment; no Vite release fix or current cross-browser memory guarantee is established by it. [D2]

**Publication/cutover interpretation — I / High.** HMR acceptance is a tooling boundary, not product authorization, durable operation admission, or service quiescence. Manual disposal is a valuable convention, but it cannot retract a payment, stop an uncooperative native call, or make stale imported objects disappear. Keeping browser dev sessions convenient is a different correctness target from replacing an admitted production capability.

**What to reuse — I.** Generation-scoped subscriptions, explicit disposal, and a full-reload fallback are useful during development. Test that repeated setup/dispose does not multiply event handlers or background loops.

**What not to copy — I.** Do not use Vite’s HMR graph as the production Host lifecycle or as a second GM wiring mechanism. Do not infer universal ESM-memory behavior from one framework cache issue; measure the exact selected runtime and replacement boundary.

## 6. Wasmtime/Extism: instance ownership is strong; application replacement remains Host-owned

**F / High, current development docs.** A Wasmtime `Module` is compiled code that can be cached/shared; execution uses an `Instance` in a `Store`. The Store docs recommend a roughly main-instance lifetime and explicitly warn that instance allocations are not individually reclaimed before Store destruction. Unlimited instance churn in one Store therefore retains memory. This statement concerns instance allocation ownership, not the absence of all Wasm-GC functionality. [W1, W2]

**F / High, current development docs.** Component `Linker::instantiate_pre` resolves and type-checks imports before actual instantiation; mismatches fail. Actual instantiation can still trap or exceed runtime limits. Core Wasm instantiation can execute a start function, so “instantiate candidate” is an execution-capable step rather than inert artifact inspection. [W3, W4]

**F / High, current development docs.** Fuel and epoch interruption govern running guest computation; they do not wake a guest blocked in a host call. The docs recommend async host functions so the embedder can regain control and enforce timeout/cancellation there. [W5]

**F / High.** Extism exposes create/call/free, host-context and host-function APIs, cancellation handles, and runtime reset. Reset invalidates allocated Extism memory; it is not a version-publication operation. Host configuration determines enabled interfaces and permitted network/file access. In the inspected runtime source, a `CancelHandle` sends a cancellation event and returns after send; it does not wait for termination. [W6, W7, W8]

**Publication/cutover interpretation — I / High.** Compile/preinstantiate are candidate checks; they do not prove trust, application readiness, or a new active head. Replacing an instance/Store is a practical memory-lifetime boundary. Host-owned sockets, DB transactions, capabilities, resource tables, or async tasks still require explicit ownership. A guest trap/cancel does not undo a host function already committed externally. In-process embedding retains shared fate with the embedding process.

**What to reuse — I.** Small explicit imports; separate code cache from mutable instance state; a Store/plugin lifetime that can be retired; guest CPU/memory limits plus cancellation-aware host calls. Use a worker/process around the embedder when physical termination of blocking native host operations is required. Retain compiled artifacts only according to an explicit bounded cache policy.

**What not to copy — I.** Do not implement a custom universal Wasm abstraction before selecting a real capability that benefits from it. Do not equate memory reset with code upgrade, cancellation request with cancellation completion, or type-compatible imports with authorization. Do not assume every resource becomes generation-owned merely because its handle is exposed to Wasm.

## 7. Kubernetes/operating controllers: replacement at deployment scale, with eventual convergence

**F / High.** A Deployment rollout is triggered by changes to its Pod template; rolling update replaces ReplicaSets under availability/surge settings. Updates can supersede an in-progress rollout. Rollback changes the revision again and restores only the Pod template. A progress deadline reports `ProgressDeadlineExceeded`; the Deployment controller does not itself roll back. [K1]

**F / High.** Pod deletion starts local graceful shutdown and EndpointSlice updates concurrently. A `preStop` hook consumes the termination grace period; TERM follows it, and remaining processes are killed after grace. Terminating endpoints remain represented with `ready=false` for regular traffic. Force deletion removes the API object without waiting for confirmation that the old process has stopped; the docs warn it may continue running. [K2]

**Publication/cutover interpretation — I / High.** The API’s desired-state update is not an all-clients traffic-switch instant. Controller convergence, readiness, endpoint propagation, old connections, and process death happen separately. A controller can reconstruct work from persisted desired state after restarting; that is not evidence it knows whether an application side effect committed. An operator must define its own idempotent reconciliation and external fencing when it owns exclusive resources.

**What to reuse — I.** Persist desired and observed state separately; retain revision identity/history; make transition steps resumable and repeatable; treat rollback as another forward change with fresh revision identity; permit a stalled candidate to coexist with a healthy active revision where the selected availability policy allows it.

**What not to copy — I.** Do not require Kubernetes for a local CLI/browser plugin or place rollout orchestration in GM. Do not use API-object deletion, lease expiry, endpoint removal, or readiness failure as proof of physical termination or exclusive ownership of a remote resource.

## Cross-system obligations for the selected product Host

The following is **I / recommendation**, not a claim that all seven systems implement the same protocol. It is a conformance checklist for an explicitly admitted production replacement profile; ordinary static GM composition remains outside it.

### Separate identities and publish one explicit selection

Keep artifact digest/version, compiled plan digest, candidate-generation identity, and active-head revision distinct. A rollback may select a previous artifact/plan while still allocating a **fresh generation and monotonically new head revision**. Otherwise stale expected-head updates and old observations can be mistaken for the current activation. Kubernetes supplies a documented precedent for new rollback revisions [K1]; applying it to the Host is our choice, not a GM feature claim.

Build a candidate with immutable per-instance GM wiring and owned resources. Define one publication/admission boundary in the product adapter: an operation must either acquire a lease on the old generation before its admission closes, or acquire the published replacement. The generation captured at admission remains attached to the operation and its dependent graph until completion. Do not reread a mutable global head independently at every internal call and accidentally mix providers within one execution.

If requests can enter through several processes or machines, one local compare-and-swap is only local publication. State which routing consistency is promised, where old admission is actually checked, how stale routers behave, and what happens during partitions. A safe rollout may deliberately serve both revisions; it still needs an explicit compatibility window and ownership rules.

### Distinguish execution leases from distributed fencing

A **local generation lease** keeps a captured execution context alive while in-flight work uses it. It does not prevent a paused predecessor, another process, a stale message, or an already-sent request from performing an external write. Shared external exclusivity requires enforcement at the protected resource or a trusted effect gateway, using a revision/epoch whose stale values that recipient rejects.

This distinction is supported by the historical Chubby paper: a lock holder includes a sequencer in protected operations, and the recipient tests its validity; the paper calls lock-delay without sequencer support an imperfect protection against delayed/reordered messages. The 2006 paper is a stable distributed-systems reference, not a recommendation to deploy Chubby. [F1]

Do not promise “revoked capability cannot act” if the plugin has direct long-lived credentials and the remote service cannot reject the obsolete grant. The selected profile must either narrow that claim, revoke credentials, route effects through an enforcing boundary, or wait for actual retirement before transferring exclusive ownership.

### Drain, cancellation, deadline, and uncertain effects are different outcomes

Use explicit evidence states: **new admission closed**, **in-flight work settled**, **cancellation requested**, **cancellation acknowledged**, **cleanup settled**, **termination requested**, **termination observed**, and **external custody reconciled**. Some profiles cannot observe all of these. Report unsupported guarantees rather than no-op methods that suggest success.

A deadline can improve bounded resource retention by cancelling or killing the old context. It cannot simultaneously guarantee completion of all arbitrary work. A lost response after a remote commit is **unknown outcome**, not proof of failure. Replaying it without a durable operation identity can duplicate effects. Reuse the existing product operation/effect owner's idempotency and transaction/outbox protocol, keeping operation identity stable across retry or replacement. Orchestrator [PR #85](https://github.com/agent-teams-ai/agent-teams-orchestrator/pull/85) owns Activity admission and observation/projection; it is not a universal effect ledger. Do not create a parallel durability engine in EF or GM.

Cleanup reports cover registered cleanup callbacks. They do not establish that unregistered descendants, native threads, remote locks, queued messages, or asynchronous external requests ceased. Use platform evidence appropriate to the profile and quarantine unreconciled custody instead of declaring retirement complete.

### Shared resources and database compatibility outlive wiring

Classify each resource as generation-owned, execution-owned, or shared with a longer-lived owner. An old generation must not close a shared DB pool, delete a shared filesystem path, unregister a new generation’s listener, or revoke credentials still used elsewhere. Cleanup by stable identity alone is unsafe when a newer generation has acquired that identity; include ownership-instance identity in the cleanup contract.

Database schema and persisted-message compatibility must cover all coexisting and rollback-eligible revisions. GitLab’s primary migration guide describes why a direct column rename breaks still-running old code and uses staged regular/post-deployment migrations; column removal likewise spans releases rather than assuming a code deployment made all old readers vanish. [S1]

Our inference: expand compatible schema/interfaces first, migrate/backfill with resumable product-owned procedures, deploy compatible readers/writers, verify old consumers are retired, then contract. Select an actual compatibility window, including background jobs and delayed events. Reusing an old artifact after destructive migration is not a safe rollback merely because its binary remains available. Data restore/compensation and code rollback are separate product decisions.

### Crash recovery requires a durable decision, not a live Promise

Before implementation, specify the authority for the active head and the reconciliation rule at each interruption:

| Crash/interruption point | Required interpretation / recovery invariant |
| --- | --- |
| During inert validation | Active generation unchanged; rejected/unselected candidate caused zero executable evaluation under the selected admission contract. |
| During candidate construction/readiness | Candidate never receives ordinary work; partially acquired resources can be identified and cleaned after supervisor/Host restart. Preparation may itself have effects if allowed, so their ownership must be recorded. |
| Candidate ready but expected head changed | Candidate is stale; reject publication or revalidate against the new head. Readiness alone grants no authority. |
| After durable publication, before caller acknowledgement | Read the authoritative head/transition record. Retry must not publish a duplicate generation or infer failure from the lost acknowledgement. |
| After publication, before old admission closes | The protocol must prevent this gap, or explicitly permit bounded overlap with compatible/fenced effects. A state label alone cannot close a live ingress path. |
| During old drain/cancel | New generation remains active; resumed reconciliation continues old retirement. Never resurrect obsolete admission merely because an old cleanup callback failed. |
| After cleanup request, before process-exit evidence | Retirement remains unproven; retry observation or terminate/quarantine according to policy. Do not return resources to another owner based only on request completion. |
| After external commit, before operation-result persistence | Record/resolve unknown outcome through the existing durable operation protocol; do not blindly replay effects. |
| During rollback | Treat rollback as a new selected transition with fresh head/generation identity and compatibility checks against current durable state. |

These invariants do not require a universal plugin state machine in a new package. They require the chosen Host profile to expose meaningful evidence and the existing owning lifecycle machinery to implement only the necessary transition semantics.

## Reusable pattern/antipattern table

All applicability statements are **I**. The evidence column identifies the closest documented analogue, not equivalence of guarantees.

| Pattern to retain | Failure/antipattern it prevents | Applicability and owner | What not to copy | Evidence |
| --- | --- | --- | --- | --- |
| Prepare separately from publish | Half-constructed candidate receives work; rejected candidate disturbs active state | Product Host admission/readiness around a GM-created graph | A second graph compiler or universal resolver | OTP prepare/finish; NGINX checked candidate; Wasmtime preinstantiate [E2, N1, W3] |
| Immutable generation + execution pin | One operation mixes old and new collaborators | GM owns fixed wiring; Host owns captured generation lease | Mutating already-injected objects or assuming old imports change | NGINX coexistence; Node/Vite retained references [N1, J1, D1] |
| Make dependencies ready before routing | Published routes point to unavailable capability | Product adapter’s selected plan/readiness | General distributed xDS infrastructure for static modules | Envoy make-before-break/warming [V1] |
| Bound coexistence and surface refusal | Unbounded retired generations retain memory/resources | Existing lifecycle mechanism and platform adapter | BEAM purge emulation; unlimited Stores or timestamp imports | OTP purge limits; Wasmtime Store ownership [E1, E2, W2] |
| Separate graceful drain from hard stop | “Drained” asserted while work or connections remain | Host policy + actual transport/executor adapter | One timeout meaning every lifecycle guarantee | NGINX timeout; Envoy independent deadlines; worker termination [N2, V2, J2] |
| Capability/effect fencing at recipient | Paused predecessor writes after lease loss | Product effect gateway/storage adapter | Equating local refcount/AbortSignal with distributed revocation | Chubby sequencers [F1] |
| Fresh rollback revision | ABA confusion; false assumption past code fits present state | Product transition/recovery authority | Erasing history or automatic destructive data downgrade | Kubernetes rollback revision; OTP explicit downgrade [K1, E5] |
| Resources have one real lifetime owner | Old cleanup closes/deletes resources now used by replacement | GM resource scopes where owned; Host/shared owner above generations | Per-generation destructive cleanup of shared identities | NGINX config-cycle pools; Wasmtime Store/host state [N3, W2] |
| Cross-version schema window | Old in-flight reader breaks during “successful” cutover | Product persistence/schema owner | A generic `migrate()` hook in the composition library | GitLab staged migrations [S1] |
| Persist decision; reconcile observed state | Crash loses active/retired knowledge; duplicate publish/effect | Product Host + existing Activities/durability owner | A second outbox/operation log in EF or GM | OTP permanent/current split; Kubernetes desired/observed precedent [E5, K1] |
| Profile-specific completion evidence | Cleanup Promise confused with process death | Node/browser/process/Wasm adapter | Pretending one TS signature has identical guarantees everywhere | Node `exit` Promise vs browser task abort [J2, J3] |
| Keep HMR in developer workflow | Dev convenience becomes production replacement promise | Build/tooling adapter | Vite as production Host or module kernel | Vite contract [D1] |

## Minimum conformance scenarios for a real production replacement profile

These are **I / proposed scenarios**, scoped to a selected replaceable capability. They are not new mandatory work for ordinary static modules, and they should be mapped onto the existing private GM lifecycle-kernel candidate where applicable rather than implemented by a duplicate kernel.

1. **Candidate rejection before execution.** Invalid artifact trust/digest/profile fails before import/initialization. Separately test invalid GM graph means zero factory calls; do not confuse these gates.
2. **Readiness is stronger than syntax/ACK.** Candidate can parse/type-check yet lacks a required dependency. It cannot become active. Active generation continues serving under the selected policy.
3. **Admission race at cutover.** Race many admissions against publication. Every accepted operation records exactly one captured generation; no admission slips into closed old admission; no execution mixes provider graphs. This is local admission determinism, not exactly-once effects.
4. **Stale concurrent candidate.** Two candidates prepare against head H. After one publishes H+1, the other cannot publish using the obsolete expected head. Retiring the losing candidate cannot touch the winning candidate’s resources.
5. **Old long-running execution.** Publish G2 while a G1 operation runs. G1 keeps its required graph/resources until its allowed completion/cancel boundary; new work uses G2. Test a retained session/stream separately from a short request.
6. **Uncooperative or blocked code.** Old JS loops, blocks in native code, or a Wasm guest blocks inside a host call. Cooperative cancellation alone must not produce a false retired result. Confirm the selected stronger boundary can terminate or visibly quarantine it within the claimed bound.
7. **Unknown external effect.** Commit an effect, then lose its response and terminate old execution. Retry with stable operation identity does not blindly repeat a non-idempotent effect; the result remains unknown until resolved by the product protocol.
8. **Shared-resource cleanup.** Both generations use one pool/shared capability. Old retirement leaves it valid for G2; last-owner retirement closes it once. Cleanup for stale resource-instance identity cannot delete a replacement.
9. **Forced retirement evidence.** Reach drain deadline with work outstanding. Record which operations were completed, cancelled, unknown, or abandoned; distinguish cleanup settlement from actual worker/process exit.
10. **Crash matrix.** Kill the Host/supervisor at every row in the recovery table. Restart converges from authoritative durable state, cannot duplicate publication, and cannot silently revive a retired generation.
11. **Backward/forward data compatibility.** Run G1/G2 readers, writers, delayed jobs, and rollback selection against the migration window. Prove destructive contraction is blocked until no eligible old consumer remains.
12. **Repeated replacement and capacity.** Exercise enough cycles to reveal retained workers, Stores, timers, listeners, credentials, and compiled artifacts. Measure bounded retention after the chosen retirement proof; do not merely assert a disposal callback ran. Test replacement surge against actual resource budgets.
13. **Platform qualification.** Run the same behavioral contract on Node and browser where supported, with distinct completion evidence. A browser adapter must not report Node process-exit certainty that the platform cannot observe.
14. **Distributed predecessor fencing, only if claimed.** Pause an old owner beyond lease expiry, grant a new owner, resume the old owner, deliver delayed/reordered writes. The protected resource rejects obsolete epochs. If the profile cannot do that, narrow its advertised exclusivity guarantee.

## Ownership recommendation and qualification boundary

**GM** remains the owner of inert composition declarations, validated immutable plans, per-run construction/wiring, and its resource mechanics. Its existing private lifecycle-kernel candidate is an input to qualification, not grounds to create another kernel or prematurely declare its production admission complete.

**EF** may own neutral artifact identity, provenance/trust/admission/isolation contracts and reusable conformance vocabulary for whichever production profile is actually selected. It should not own a current active generation, product grants, traffic routing, business readiness, database migration, durable operations, or fleet rollout.

**The product Host** owns operational authority: whether to prepare/authorize a candidate, selected implementation mapping, readiness, publication, leases/admission, recovery, drain deadlines, process/worker retirement, and external custody. A product adapter may import GM and EF and map them explicitly. Reuse an established process supervisor/container/orchestrator where appropriate rather than turning either library into one.

**Do next:** choose one real replaceable capability and write its claimed guarantees before selecting its boundary. For an internal source-composed feature, static GM composition can remain the entire solution. For independently delivered trusted executable code, worker/process rotation is a credible first profile if needed. For a narrowly constrained, computation-oriented extension with explicit imports, qualify a Wasm adapter. Production in-process arbitrary-JavaScript unload is the least substantiated option in the researched evidence.

## Primary-source ledger

All links below were read **2026-10-21**. Source URLs, named sections and version/commit pins identify the evidence. Current or development documentation is explicitly labeled. No unverified release-specific fix is asserted.

| ID | Source / pin | Evidence location and claim type | Confidence / caveat |
| --- | --- | --- | --- |
| E1 | [OTP compilation/code loading](https://www.erlang.org/doc/system/code_loading.html), page OTP 29.1.2 | current/old concurrency, fully qualified switching, third-version purge; F | High; tutorial simplification must be read with operational APIs |
| E2 | [OTP `code`](https://www.erlang.org/doc/apps/kernel/code.html); [tag source OTP-29.1.2](https://github.com/erlang/otp/blob/OTP-29.1.2/lib/kernel/src/code.erl) | atomic/prepare/finish; preparation; hard purge; soft purge; F | High; local VM guarantee |
| E3 | [OTP release handling](https://www.erlang.org/doc/system/release_handling.html); [tag source OTP-29.1.2](https://github.com/erlang/otp/blob/OTP-29.1.2/system/doc/design_principles/release_handling.md) | synchronized update; distributed-systems section; F | High; process discovery depends on supervision metadata |
| E4 | [OTP `gen_server`](https://www.erlang.org/doc/apps/stdlib/gen_server.html), page OTP 29.1.2 | `code_change` state, error, missing callback; F | High; callback contract, not arbitrary external transaction rollback |
| E5 | [OTP `release_handler`](https://www.erlang.org/doc/apps/sasl/release_handler.html), page OTP 29.1.2 | persistent/current/permanent; checks; failures/timeouts; F | High; persistence is explicitly separate from installation |
| N1 | [Controlling NGINX](https://nginx.org/en/docs/control.html), current unversioned docs | config validation/new worker/old clients; dual masters and rollback procedure; F | High; configuration/process swap, not cross-request transaction |
| N2 | [NGINX core module](https://nginx.org/en/docs/ngx_core_module.html#worker_shutdown_timeout), directive since 1.11.11 | deadline behavior; F | High; tries closing connections, does not promise effect completion |
| N3 | [NGINX development guide](https://nginx.org/en/docs/dev/development_guide.html), current unversioned docs | copying/private API warning; globals, implicit state and pools; F/current pitfall | High; not a historical incident report |
| V1 | [Envoy xDS protocol v1.36.0](https://www.envoyproxy.io/docs/envoy/v1.36.0/api-docs/xds_protocol) | ACK/NACK; warming/eventual consistency; F | High; avoid equating ACK with applied/active |
| V2 | [Envoy hot restart v1.36.0](https://www.envoyproxy.io/docs/envoy/v1.36.0/intro/arch_overview/operations/hot_restart) | replacement/deadlines/no connection transfer; platform/socket limitations; F | High; conditional continuity, not zero drops in all cases |
| V3 | [Envoy draining v1.36.0](https://www.envoyproxy.io/docs/envoy/v1.36.0/intro/arch_overview/operations/draining) | graceful mode/filter semantics; F | High; modes differ, inspect selected adapter |
| V4 | [Envoy issue #5894](https://github.com/envoyproxy/envoy/issues/5894), opened 2019-02-09 | Incident description maintainer recommendations H | Medium incident causation; direct record, no verified present-day fix |
| J1 | [Node ESM v24.10.0](https://nodejs.org/download/release/v24.10.0/docs/api/esm.html); [current ESM](https://nodejs.org/api/esm.html) | Pin duplicate URL identities, separate cache; current and retain these rules; F | High; no cache-eviction API inferred from current documented surface, no heap benchmark performed |
| J2 | [Node workers v24.10.0](https://nodejs.org/download/release/v24.10.0/docs/api/worker_threads.html) | arbitrary stop; async terminate/exit; `resourceLimits` caveat; F | High; worker termination is not external-effect rollback |
| J3 | [HTML worker standard](https://html.spec.whatwg.org/multipage/workers.html#terminate-a-worker), Last Updated 2026-10-20 on retrieved page | discard tasks/abort; Worker interface `terminate()` has undefined return; F | High normative text; living standard, browser conformance not tested |
| D1 | [Current Vite HMR](https://vite.dev/guide/api-hmr); [archived Vite 7 HMR](https://v7.vite.dev/guide/api-hmr) | Required guard; accept/boundary caveat; dispose/prune/data sections; F | High; explicitly development-oriented mechanics |
| D2 | [Vite issue #20155](https://github.com/vitejs/vite/issues/20155), opened/closed 2025-06-04, Vite 6.3.5 | initial report; version; reporter cache diagnosis/closure; H | Medium; not a universal runtime limitation or verified Vite patch |
| W1 | [Wasmtime Module](https://docs.wasmtime.dev/api/wasmtime/struct.Module.html), current page 51.0.0-dev | compiled code/cache/shared ownership; F | High for documented semantics; development docs, no released-version qualification |
| W2 | [Wasmtime Store](https://docs.wasmtime.dev/api/wasmtime/struct.Store.html), current page 51.0.0-dev | instance lifetime/host state; F | High; explicitly not a claim Wasm-GC does not exist |
| W3 | [Wasmtime component Linker](https://docs.wasmtime.dev/api/wasmtime/component/struct.Linker.html), current page 51.0.0-dev | preinstantiate/type checks/instantiate traps; F | High; startup validation does not imply business readiness |
| W4 | [Wasmtime core Linker](https://docs.wasmtime.dev/api/wasmtime/struct.Linker.html), current page 51.0.0-dev | import mismatch/start function; F | High; code can execute during instantiation |
| W5 | [Wasmtime Config](https://docs.wasmtime.dev/api/wasmtime/struct.Config.html#method.epoch_interruption), current page 51.0.0-dev | blocking host calls/async mitigation; F/current limitation | High; exact SDK behavior must be qualified in selected release |
| W6 | [Extism runtime APIs](https://extism.org/docs/concepts/runtime-apis/); [memory](https://extism.org/docs/concepts/memory/) | create/free/call/reset/context/cancel; F | High for API surface; does not specify active-generation management |
| W7 | [Extism configuration](https://extism.org/docs/concepts/configuration/) | Host configuration/WASI/allowlists; F | High; external host-function capabilities also need explicit review |
| W8 | [Extism runtime source, main](https://github.com/extism/extism/blob/main/runtime/src/plugin.rs) | `CancelHandle::cancel` sends TimerAction; `reset` invokes runtime reset; F | High inspection, mutable main rather than pinned release; [release list](https://github.com/extism/extism/releases) shows v1.41.0 published 2026-10-09 using Wasmtime 49, but that release was not source-qualified here |
| K1 | [Kubernetes Deployments](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/), current docs | rollback revision; superseding/rollback scope; progress deadline; F | High; controller desired/observed semantics, not app effect safety |
| K2 | [Kubernetes Pod lifecycle](https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/); [v1.36 snapshot](https://v1-36.docs.kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/) | Current graceful termination/endpoints; force-deletion warning; F | High; not proof propagation completed before TERM |
| S1 | [GitLab avoiding downtime migrations](https://docs.gitlab.com/development/database/avoiding_downtime_in_migrations/); [commit-pinned guide](https://gitlab.com/gitlab-org/gitlab/-/blob/45f612ae4da0f4a77290fe4cafb8a34755d638fa/doc/development/database/avoiding_downtime_in_migrations.md) | Dropping columns and renaming columns; current staged compatibility; F/practice | High; Rails-specific procedure is precedent, not code to port wholesale |
| F1 | [Burrows, Chubby, OSDI 2006](https://research.google.com/archive/chubby-osdi06.pdf) | p.5, sequencer recipient checks and imperfect lock-delay; historical design evidence | High for paper’s mechanism; no claim about today’s Google internal implementation |
