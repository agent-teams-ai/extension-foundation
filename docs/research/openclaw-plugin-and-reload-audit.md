---
id: research.openclaw
type: research
status: active
owner: architecture
summary: Pinned OpenClaw source strengths, limitations, historical repairs and transferable qualification scenarios.
---

# OpenClaw Plugin and Reload Audit

**Research date:** 2026-10-21. Primary material retrieved approximately 18:24–18:32 UTC.

**Canonical repository:** [openclaw/openclaw](https://github.com/openclaw/openclaw), repository ID 1103012935, default branch main; GitHub reports it as a non-fork and points to openclaw.ai.
**Pinned source:** [33ccaae2f522c3ae299aaf8b195fa166ab536bd8](https://github.com/openclaw/openclaw/commit/33ccaae2f522c3ae299aaf8b195fa166ab536bd8), committed 2026-10-21 18:24:53 UTC. All “current source” statements below mean this SHA, not an unqualified future main. [Repository metadata](https://api.github.com/repos/openclaw/openclaw) and [commit metadata](https://api.github.com/repos/openclaw/openclaw/commits/33ccaae2f522c3ae299aaf8b195fa166ab536bd8) were read directly.

## Executive assessment

OpenClaw is a useful case study in the *cost of owning a real dynamic host*, not evidence that a generic module framework should absorb that host. Current OpenClaw has substantial, deliberate lifecycle machinery: inert manifest reads, immutable metadata generations, precise instance ownership, retained-work accounting, source capture, targeted replacement, resource-cleanup barriers, runtime receipts, and conditional recovery. A claim that current OpenClaw simply “reloads everything and hopes” would be false.

Its limitations are equally useful. Native plugins are trusted executable code in the Gateway process. Import-time effects can escape managed cleanup. Native ESM code cannot be unloaded. Replacement can stop the previous registration before the candidate is known to activate successfully, so recovery reconstructs the old version under fresh ownership; it cannot undo arbitrary external effects. Long-running work, request-context inheritance, service cleanup, metadata publication, and downstream model/reply publication form different lifetimes. Public issue history contains concrete failures where those lifetimes diverged.

**Recommendation for our architecture:** keep Get Modular responsible for inert declarations, graph compilation and construction/resources; keep neutral artifact, provenance and custody vocabulary in Extension Foundation; keep executable admission, active generations, routing, drain, readiness and recovery with the product Host. OpenClaw supplies scenarios and host mechanisms to study. It does not justify introducing a second module kernel, an all-purpose PluginManager in EF, or mandatory dynamic machinery for ordinary static feature modules. Nothing in this memo changes accepted ADRs.

## Evidence and method

This was a read-only source/document/issue review using primary GitHub APIs and an initial web search to confirm navigation. The external repository was not modified, dependencies were not installed, and no OpenClaw Gateway, plugin or external service was executed. A direct git network probe failed; pinned GitHub file and tree retrieval succeeded. Directory API responses cap at 1,000 entries, so relevant source-tree endpoints were also read to avoid accidentally treating truncated directory listings as complete inventories.

Evidence labels:

- **Source fact:** directly inspected current pinned implementation or documentation.
- **Repository test assertion:** an inspected test expresses the stated behavior; it was **not run by this reviewer**.
- **Reported observation:** an issue/PR author describes a run. The environment, version and limitations matter.
- **Inference/recommendation:** our architectural interpretation or proposed qualification test.
- **Fixed historical mechanism:** a merged repair plus current corresponding code was verified; this does not certify every related symptom fixed.

The review sampled the relevant load/reload paths deeply. It does not claim a whole-repository security audit, a measured performance baseline, or proof that every open issue reproduces on this SHA.

## 1. Cold discovery is separate from execution; compatibility fallbacks still allow import effects before final exclusion

**Source fact — strength.** The native manifest reader opens checked, bounded manifest bytes, parses JSON5, and validates the manifest ID and config schema. It does not import the runtime entry to answer these questions. [manifest reader, lines 160–214][manifest-reader] The metadata scan regression writes a runtime entry that throws if imported, builds the startup snapshot, edits package files, and asserts that several metadata readers keep using the retained generation without rereading plugin files. [metadata regression, lines 88–183][metadata-test] This is good evidence for a meaningful cold metadata path, rather than “discovery” implemented by executing every candidate.

**Source fact — limitation.** A runtime load is a different boundary. The candidate loader records an import attempt because module evaluation can execute code before throwing; it then loads the entry and reads its exported definition. A legacy runtime-exported kind is still allowed to influence memory-slot exclusion *after* the import. [candidate import and memory policy, lines 510–618][candidate-import] A current regression deliberately constructs a runtime-only memory plugin with a top-level process listener, loads it, records it as disabled, disposes the registry, and expects the listener still to exist. The test cleans the listener manually. [disabled-plugin regression, lines 416–456][disabled-effect-test]

That is stronger evidence than a speculative accusation: the repository explicitly tests the limitation. It is also narrower than saying all disabled plugins execute. A manifest-declared disabled candidate can be rejected earlier; this specific compatibility path learns a relevant fact only from an executed module.

**Inference.** “Registry is non-activating,” “no register callback ran,” and “no top-level executable code ran” are three different claims. Managed contribution rollback is not a transaction over process globals, network sends, file writes or external child processes.

**Transfer.** Keep EF’s inert serializable artifact/declaration path and target-local literal loader table. For a profile promising zero evaluation of invalid or unselected candidates, selection and validation must finish before executable imports. Get Modular’s zero-factory property is valuable but cannot establish that earlier JavaScript imports were inert.

**Concrete qualification scenario.** Candidate A has a top-level marker file, process listener and timer; candidate B has a top-level throw. Exercise “unselected,” bad manifest, incompatible contract, denied grant, missing required capability and occupied exclusive slot. For each promised zero-evaluation path, assert no marker/listener/timer and zero factory invocations. Exercise runtime-exported fallback only in an explicitly weaker trusted compatibility profile.

## 2. Registration is a bounded declaration phase with real instance ownership; synchronous execution remains an availability boundary

**Source fact — strength.** Each PluginInstance owns its AbortController, cleanup map, runtime slots, call tokens and consumers. Its public lifecycle exposes signal, disposal registration and an instance-owned background runner. [instance definition, lines 49–124][instance-fields] Registration wraps the API, checks cross-instance registration authority, closes the registration surface when register returns, and rejects promise-returning registration by default. A small allowlist of operational methods remains callable later. [registration guard, lines 7–78][api-lifecycle] The loader marks registration complete only after the synchronous registration pass and dashboard contribution validation succeed. [register completion, lines 634–674][candidate-register]

Failures roll back managed contributions and retire the failed instance; construction rollback excludes predecessor/borrowed records. This is a meaningful ownership improvement over allowing arbitrary late registration into whichever global registry happens to be current. [registry rollback, lines 416–443][registry-rollback] [construction rollback, lines 715–727][core-rollback]

**Source fact — boundary.** Candidate module evaluation and register are still called synchronously in the execution owner. Worker preparation precedes evaluation for selected external sources; it does not move arbitrary plugin evaluation off the main execution thread. [candidate import, lines 530–557][candidate-import] [synchronous registration, lines 634–667][candidate-register] A long CPU loop or synchronous I/O inside that code cannot be interrupted by a JavaScript timer on the same blocked event loop. This is a consequence of the execution model, not a measured current OpenClaw hang.

**Inference.** Closing registration is useful, but late registration currently returns undefined once the guard closes; a plugin author can miss the contract violation unless another validation detects the missing contribution. Also, a rejected async register may already have started work. Tracking its promise and owned cleanup helps, but no API wrapper can retroactively make arbitrary earlier side effects inert.

**Transfer.** Preserve an inert declaration/compile boundary, construct scoped resources under Get Modular, and keep expensive asynchronous startup in a separately owned readiness phase. Product Host profiles must say whether their trusted in-process initialization can block the host or whether execution requires a separate process/worker. A timeout around observation is not preemption.

**Concrete qualification scenario.** Register synchronously exposes all declared callable surfaces and starts no network loop. Service startup opens the transport asynchronously. Inject a throwing register, promise-returning register, late callback attempting registration, and an initialization CPU loop in an isolated test host. Verify correct diagnostics, sibling health and process-level supervision where promised.

## 3. Current replacement preserves compatible exact instances; configuration snapshots and live readers intentionally differ

**Source fact — strength.** The current loader computes reuse inputs from selected source/origin, committed install ownership, manifest, activation policy and other admission facts. Explicit replacement suppresses retention; compatible retained records project their existing contributions into the successor registry. [identity inputs, lines 441–486][core-identity] [retention, lines 503–530][core-retain] This is not rediscovering a service by ID and registering it again.

A test distinguishes captured registration config from an explicit current-config reader. Mutating the caller config and publishing a later runtime config does not change the registered tool factory’s original description; the designated reader sees the replacement snapshot. [config capture test, lines 328–403][config-capture-test] This is an important way to preserve a static per-instance dependency graph while the Host supports multiple runtime instances over time.

**Historical report, not present-source conclusion.** [Issue #152965][i152965] remains open and reports that a non-channel plugin config reload on 2026.9.5 disposed channel instances without reconnecting them. Current targeted retention and the replacement-ID selector do not support treating that old “all instances disposed” mechanism as a description of present source. The selector starts from requested IDs and specific changed plugin-entry/install paths. [replacement selector, lines 110–130][replacement-selector] The issue’s repository review also says the production traces were not replayed on newer main.

**Inference.** Retaining an instance is safe only if the Host has selected a compatible resource/config/authority identity. Reusing an ID, package version or path alone is insufficient. Conversely, replacing every instance on every config edit needlessly destroys long-lived transports and increases failure exposure.

**Transfer.** Let a product adapter explicitly map artifact/contribution IDs to selected GM implementations and capabilities. A compiled per-instance GM plan can stay immutable while the Host decides whether the next active generation retains or reconstructs each instance. Do not add mutable rebinding to GM merely because product generations change.

**Concrete qualification scenario.** A and B each own a long-lived connection. Change only B’s settings, then change a semantically equivalent object-key order, then explicitly reload B. Check that A’s object identity, transport, pending callbacks and disposal count are unchanged; B is replaced only when required. Verify source-equivalent but provenance-different artifacts do not accidentally retain A.

## 4. Hot replacement is a multi-phase host transaction; “rollback” often means reconstruction, and post-commit failure needs separate recovery

**Source fact.** The current Gateway reload owner preflights metadata without modules, determines resource handoff, captures previous code for recovery, rejects self-reload, drains retained work/calls, pauses channel admission, stops affected channels/services, disposes prior instances, and *then* loads/registers the candidate. [reload preparation through old-resource stop, lines 242–354][reload-stop] It starts candidate services before publication, prepares capabilities, publishes the registry/metadata/services, marks the generation committed, and runs activation tails after commit. [publication, lines 361–443][reload-publish]

That ordering protects exclusive resources, but it is not “fully initialize a candidate beside a continuously serving old instance and atomically flip a pointer” for every capability. After stop begins, some old controllers and transports cannot be resumed. Recovery explicitly reconstructs the captured old code/config under fresh registrations, subject to successful cleanup. [recovery branch, lines 499–573][reload-recover] The recovery owner refuses to substitute present package files for missing old captured source; it can report that recovery of a prior owner is unavailable. [recovery custody, lines 29–99][recovery-custody]

**Fixed historical mechanism.** [PR #152530][p152530] was verified merged on 2026-09-30, merge commit [63578b2b112fcc1c9a56ef3904d2d82ac5be1a19][merge152530]. It repairs a plugin-only replacement that committed but failed during activation/cleanup, leaving model catalog and reply dispatch unavailable. The PR reports an isolated real-Gateway baseline/candidate experiment with a scripted local model endpoint; those are contributor-reported runs, not runs repeated here. Current source independently shows the corresponding committed-registry model/reply recovery and aggregation of original and refresh errors. [current recovery, lines 529–553][model-recovery]

[Issue #152275][i152275] is still open and contains distinct later reports. The merged fix establishes a repaired mechanism, not proof that every overlapping reload, database-admission failure or unpublished reply owner is solved.

**Inference.** One “reload failed” boolean is inadequate. Before commit, the relevant question is whether the prior generation is still usable or safely reconstructible. After commit, the new generation is authoritative even if activation has degraded. Retrying an accepted operation blindly can duplicate mutations or external effects.

**Transfer.** Host owns prepare/commit/after-commit/drain/recovery and must expose a receipt including committed generation, selected artifact digests and degraded readiness. GM owns construction/resource results; EF can describe artifact identity/custody. Neither can promise rollback of messages sent, external writes, subprocess actions or migrations merely because candidate construction failed.

**Concrete qualification scenario.** Fault injection at every phase: preflight; old drain; service stop; candidate register; candidate service readiness; publication; post-publication channel start; model/reply republish. Check the receipt and active generation after each failure, that no successor reacquires unfinished exclusive resources, and that recovery never imports changed disk bytes as the old version.

## 5. Timeout, cancellation and physical cleanup are separate facts; OpenClaw’s current resource barriers are worth copying

**Source fact — strength.** Service stop stores one exact stopping promise per startup attempt. An observer timeout wraps that pending cleanup rather than starting it again; completion follows the attempt across owner handoff. Raw startup must settle before its one final stop. [service stop ownership, lines 195–288][service-stop] Candidate startup observation is bounded while its underlying completion remains owned. [startup ownership, lines 624–667][service-start]

PluginInstance disposal similarly starts one physical cleanup task, returns an observation result after five seconds if necessary, and includes a settlement promise for unfinished cleanup. It keeps old code until admitted calls actually return. [disposal observation, lines 602–646][instance-dispose] [physical finish, lines 722–765][instance-finish] An inspected regression advances fake timers beyond the deadline, verifies captured files remain while cleanup is pending, then releases the work and checks deletion only after settlement. [disposal regression, lines 214–287][disposal-test]

The pre-stop admitted-work observer has a different budget. Its regression expects a 60-second timeout to preserve the retained reference and leave the old instance accepting calls rather than disposing it. [retention observer test, lines 14–70][retention-test]

**Additional source nuance confirmed during lifecycle review.** `PluginInstance.dispose()` invoked from its own active call can return `{ errors: [] }` while the physical disposal task continues. That self-call escape avoids waiting on itself; its immediate result is not terminal cleanup evidence. An adapter must retain the actual disposal/settlement owner instead of treating the returned object as proof of retirement. [instance disposal][instance-dispose]

**Source fact — operational tradeoff.** CLI documentation says the extended wait can hold new Gateway runs behind the replacement gate for up to ten minutes; cancellation before publication uses the recovery path and does not cancel already admitted work. [reload wait contract, lines 180–214][reload-cli-wait] That is a deliberately broad availability tradeoff, not an assertion of per-plugin transparent cutover.

**Historical repair.** [PR #150953][p150953], merged 2026-09-17 as [578690d7f174b0ffb8c76331b9ad9e1612e151d6][merge150953], reports and repairs channels remaining paused after a failed drain. Its bounded recovery expressly preserves barriers for unfinished writes and cleanup failures. This is a good example of restoring observability and healthy siblings without pretending a timeout released ownership.

**Transfer.** Keep completion reports honest: “registered disposers settled” is not evidence that a child process terminated or an external write was rolled back. Host should separately track observation deadline, execution revocation, cancellation request, actual settlement, physical resource release and custody transfer. Process shutdown or handover needs the physical facts that a local resource-scope report cannot establish.

**Concrete qualification scenario.** A service stop takes longer than the observer budget and eventually succeeds; repeat with rejection and with a never-settling stop. Assert stop runs once, pending resources cannot be reacquired, newer healthy siblings remain usable, shutdown joins actual cleanup where promised, and canceling the waiting requester does not cancel Host-owned recovery.

## 6. Request context, plugin instance authority and admitted work are different lifetimes; stale-generation failures need precise handling

**Source fact — strength.** Plugin ownership is keyed to exact records/resources and invocation tokens, not just a stable plugin ID. The scope helper explicitly checks active calls, accepting state, revocation and abort state. [instance authority, lines 71–134][instance-authority] Generation scope carries the selected metadata and registry; re-admission explicitly exits it. [generation scope, lines 18–50][generation-scope]

The current channel-start wrapper drops tool-caller identity, operator authority, lifecycle lease, root-work admission, prior plugin generation and generic async-work scope before creating long-lived channel work. Its monitor separately holds instance custody until termination. [channel startup, lines 12–47][channel-startup] The plugin background runner creates an instance-owned worker scope and detaches request context while preserving the correct host bindings. [background owner, lines 13–49][background-owner]

**Historical repairs.** [PR #159396][p159396], merged 2026-10-12 as [a4d915f206e196b35d89fc420fba89b571516be5][merge159396], addresses long-lived channel startup inheriting expired caller authority. Its description carefully separates direct regression proof from a real-Gateway integration that also passed the negative control. [PR #146799][p146799], merged 2026-09-13, fixes a narrower detached cross-agent reply retaining a completed caller’s runtime generation. Neither is evidence that every active-turn reload scenario is fixed.

**Current source and unresolved report.** The model-runtime lease has a specific path allowing compatible static nested work to borrow its admitted old snapshot, checking agent, workspace, config and selection. A later path still refuses a pinned run generation when the configured owner has changed or needs refresh. [borrow checks, lines 105–147][lease-borrow] [supersession guard, lines 223–238][lease-guard] [Issue #144291][i144291] remains open with 2026.9.3/9.5/9.6 observations of lost replies and fallback failures. The guard’s presence is *not itself a bug*: it also prevents detached stale work from silently gaining new authority.

The documented current limitation that arbitrary nested cross-plugin dependency chains are best effort is material. [architecture, line 203][nested-limit] It is not a general deadlock-free dynamic dependency graph.

**Transfer.** Make distinct owners for a request, admitted execution, runtime instance, durable Activity and process. Finishing an accepted task on its original grant/plan is different from re-admitting a detached continuation under new policy. Orchestrator #85’s Activity admission/observation should remain the product owner of durable work; GM observation does not replace it.

**Concrete qualification scenario.** Turn A holds plugin P; operator starts replacement; A acquires a nested compatible provider lease and finishes. In parallel, a detached callback from completed A tries the same acquisition and must fail or explicitly re-admit. Add cross-plugin P→Q→P calls, self-reload, credential/policy revocation, and disconnecting a --wait requester. Verify there is no implicit switch to the new generation during a retry.

## 7. Captured artifact replacement is not JavaScript unload; package imports and plugin dependencies need separate invalidation rules

**Source fact.** The instance module loader explicitly distinguishes bundled shared code from non-bundled captured artifacts. Bundled entries use the host module loader; non-bundled code can reuse retained native ESM code inside an inventory, with separately owned registration authority. It checks the expected source digest before binding a new artifact. [module binding, lines 253–341][module-binding]

The CLI contract reports restart-required when changed bundled code remains process-loaded; reload does not rebuild source. External captured source can be replaced without a Gateway restart, while removed registrations do not imply modules/native libraries have unloaded. [reload code-lifetime contract, lines 245–265][reload-code-contract] Native ESM’s process-lifetime retention is explicitly acknowledged in code. [module binding, lines 291–292][module-binding]

Capturing package/helper bytes is a useful way to stop a late import from silently reading edited dependencies from the installation. However, path transforms, resolver hooks, native companions, TypeScript and Node/Bun interop materially expand the host’s obligations. They do not yield reclaimable ESM by themselves.

**Source fact — dependency semantics.** The manifest’s requiresPlugins field is diagnostic, not a GM-style required binding or stop/restart dependency graph. Its discovery helper checks candidate identities and emits a warning when a required plugin is absent; it does not reject the plugin here. [missing dependency diagnostics, lines 7–55][required-warning] Documentation describes the same behavior. [manifest field, line 222][requires-doc] This should not be confused with Node package dependency capture or with dynamic service dependency invalidation.

**Inference.** Our system must choose how an admitted consumer of P behaves when P is replaced: retain the exact old lease, drain and reconstruct the consumer, or route through an explicit versioned indirection. Merely clearing require.cache, modifying an import URL, or warning about a missing plugin cannot establish this contract. Nor should every runtime capability dependency become a source-package dependency.

**Transfer.** GM’s required/optional/many bindings and immutable graph remain the authority for a selected per-instance construction. EF records artifact identity. Product Host chooses generation compatibility and consumer retention/replacement. Make process restart an explicit profile outcome for code that cannot be safely replaced or reclaimed; do not advertise “unload” when only callable revocation is supported.

**Concrete qualification scenario.** P imports helper H eagerly and lazily; edit H and P between generations. Hold an old callback/stream while loading the new version. Verify each call reads its own expected bytes and SDK identity; no half-old/half-new graph. Add missing plugin dependency, native addon companion, ESM evaluation failure and 100 repeated replacements; measure code/resource retention separately from callable correctness.

## 8. Negative caches are part of recovery policy; a closed issue is not proof of a fix

**Current source fact.** createLazyRuntimeSurface explicitly requests cached rejections, and returns a load function with peek/clear controls. The underlying generic lazy-promise helper evicts failures by default and supports manual clearing. [runtime wrapper, lines 5–17][lazy-runtime] [generic helper, lines 50–85][lazy-promise] These are different intended policies, not a simple accidental omission of catch.

**Repository test assertion.** The small lazy-runtime test expects repeated rejected loads to share a single importer invocation. [lazy-runtime tests][lazy-test] That proves an intentional contract in source, not that retrying a real failed native ESM import would work if the wrapper were cleared.

**Reported observation.** [Issue #154526][i154526] reports an approximately 80-minute Matrix outbound failure on 2026.9.5 and attributes unsuccessful same-process reload recovery to cached import rejection. It was closed on 2026-10-21 **for inactivity**, as the closing comment states. The repository review says the first exception and same-process recovery trace were unavailable and that the proposed unconditional cache-policy change would alter intentional tested behavior. [Repository review][lazy-issue-review] and [inactivity closure][lazy-issue-comments] are separate evidence.

**Inference.** We can confirm sticky rejected promises in current source. We cannot independently confirm this incident’s first cause, whether it was retryable import resolution versus ESM evaluation failure, or whether changing one wrapper would restore a real channel. Those distinctions matter because Node may retain failed native ESM evaluation independently.

**Transfer.** Each generation-owned cache needs a positive/negative fact policy, owner, invalidation trigger and recovery route. Distinguish immutable “absent in this artifact” from transient transport/worker failure. Do not scatter global cache-clear hooks and call that hot replacement.

**Concrete qualification scenario.** Fail a lazy load before evaluation, fail during evaluation, fail a selected export, and fail downstream service initialization. Clear only the cache the Host actually owns; then test concurrent retry deduplication and the actual invocation path. A health check should show the capability unavailable even if its transport remains connected.

## 9. Trust checks are useful admission controls; they do not isolate native plugin execution

**Source fact.** Discovery checks root containment, Unix ownership and world-writable paths. The permission check has a distinct Windows path. [discovery safety checks, lines 97–178][discovery-safety] Runtime entry opening uses a checked plugin-root open before module evaluation. [entry admission, lines 483–502][entry-admission] These are meaningful defenses against selecting unexpected bytes and filesystem races; they are not an execution sandbox.

The product’s current execution-model documentation explicitly says native plugins run with the Gateway’s process-level trust. It also distinguishes ID allowlisting from provenance and source selection. [execution/trust contract, lines 967–990][trust-doc] That frank boundary is a strength.

**Inference.** A malicious in-process plugin can bypass a cooperative SDK wrapper with direct Node APIs. Captured bytes, signatures, grants and managed cleanup can establish *which trusted code* is admitted and *what the host exposes*; they do not constrain arbitrary code already running with host authority. The instance wrappers are valuable correctness and cooperative-authority mechanisms, not a security sandbox against hostile native code.

**Transfer.** EF may define provenance, signature, admission, isolation and revocation contracts; the product selects and enforces a real profile. Use trusted in-process execution for ordinary owned code where appropriate. If admitting mutually untrusted third-party code, qualify an actual process/Wasm/browser boundary and its resource/IPC/cancellation semantics. Do not impose that profile on every static feature module.

**Concrete qualification scenario.** Distinguish denied manifest/API capabilities from denied underlying OS operations. In a profile claiming isolation, attempt direct file/network/process access, inherited environment access, symlink escape, and post-revocation IPC. If those actions remain possible, describe the profile as trusted/cooperative rather than sandboxed.

## 10. Global state and ecosystem cost are explicit product constraints; do not inherit them as a reusable library’s default

**Source fact — ownership constraint.** Current runtime state contains process-active registry/version/workspace/imported-ID state, stored through a global singleton. Exact-instance maps and invocation context also use shared singleton identity so duplicated SDK/core graphs agree on ownership. [runtime singleton, lines 53–85][runtime-global] [instance singleton, lines 78–90][instance-global] This solves a concrete duplicated-module-identity problem, but it creates a process-level coordination surface. The current load-pipeline documentation explicitly limits overlapping independent Gateways in one process to best effort. [load pipeline, lines 148–152][one-gateway]

**Inference.** This is a product deployment assumption, not automatically an antipattern. Copying it into a reusable module library would be a mistake if that library promises many independent containers/hosts in one process. ALS scopes and exact owner maps reduce accidental leakage but do not turn one process-active head into many independently coordinated heads.

**Source fact — scale mechanisms and limits.** Source capture copies/checks a selected graph and records receipts. The current file-copy path uses clone-auto where appropriate and a special small-file path; current native admission attempts to retain managed native names without copying bytes. [copy policy, lines 139–183][source-copy] [native admission, lines 578–605][native-reuse] These current mechanisms contradict a blanket claim that all present captures always byte-copy every binary.

**Reported observations, not reproduced benchmarks.** [Issue #157989][i157989] remains open with 2026.9.6 reports of large capture write volume and later platform-specific observations. Current sharing does not establish uniform physical-I/O savings on all filesystems, and a logically large capture is not necessarily a physically large copy. [Issue #170928][i170928] remains open with Windows startup and post-readiness stall measurements. The superficially related [#179111][i179111] was closed as a duplicate, not fixed; its claim that a 600-second constant causes the outage is specifically not supported by current source, whose default is 120 seconds. [current timeout, lines 95–98][current-build-timeout] We should preserve the real responsiveness report without repeating the unsupported timer-causation claim.

**Source fact — API coupling.** Current SDK documentation calls all plugin APIs experimental and requires testing/pinning declared host versions. [SDK stability, lines 25–36][sdk-stability] This is candid, but a broad host-specific extension surface carries real ecosystem coordination cost. It is not a model of a frozen cross-product public SPI.

**Transfer.** Keep host instances explicit. Keep neutral EF contracts narrow, give each contract a real owner, and admit public SPI only under the already accepted independent-implementation/conformance gates. Qualify at least four separate scale axes: inert graph compilation; TS authoring/type checking; artifact discovery/capture/import; running service/agent throughput. Neither OpenClaw issue counts nor a fast GM compile benchmark proves the others.

**Concrete qualification scenario.** Run two isolated Host objects in one Node process with the same artifact IDs and different policies, and confirm no cross-head activation/cleanup. Separately benchmark cold metadata, cold capture, warm invocation, single-plugin replacement, and repeated replacement with many idle versus active consumers. Record event-loop delay, retained ESM graphs, worker count/RSS, physical writes, file count, native handles and publication/readiness latency.

## Transfer / avoid matrix

These are recommendations for our owner split, not claims that OpenClaw should adopt our architecture.

| OpenClaw lesson | Transfer | Avoid | Owner in our architecture |
|---|---|---|---|
| Manifest-first metadata and retained inventory | Inert serializable metadata; exact artifact/config revisions; explicit refresh | Importing executable entries to discover selectable facts | EF artifact/declaration contracts; product discovery/admission |
| Exact plugin instance and resource ownership | Per-instance scopes, cancellation signal, disposer registration, call/consumer leases | Stable ID used as authority for delayed work | GM construction/resources; product admitted execution |
| Closed synchronous registration | Complete declared surfaces before readiness; async service startup afterward | Late mutation of a published registry; expensive synchronous initialization | GM inert graph/construct plus Host readiness |
| Retain compatible instances | Keep immutable per-instance wiring while Host changes active generations | Rebuilding every connection on unrelated config changes | Product adapter/Host |
| Phase-aware replacement and runtime receipts | Explicit prepare/commit/after-commit state and selected digests | Generic “reload succeeded/failed” hiding committed state | Product Host |
| One cleanup operation, separate observation | Retain raw cleanup completion; fence exclusive reacquisition | Treating timeout or AbortSignal as physical termination proof | GM cleanup facts; Host physical/custody proof |
| Captured previous source for recovery | Preserve exact previous bytes and provenance while needed | “Rollback” by reading changed install files or pretending external effects undone | EF custody/identity contract; product recovery |
| Context detachment for long-lived work | Explicit handoff to service/Activity owner | Inheriting an initiating request’s authority/generation indefinitely | Product execution and Activity owner |
| Native ESM and bundled-code limits | Honest restart-required / revocation-only profiles | Promising JavaScript unload or bounded code memory without process replacement | Product executable host |
| Negative-cache semantics | Cache owner, scope, error taxonomy and invalidation route | Blanket retry or global cache purge after every failure | Owning subsystem/Host |
| Provenance and filesystem checks | Verify exact selected bytes and source | Calling in-process SDK policy a sandbox | EF trust contract; product enforcement |
| Broad evolving SDK | Narrow capability contracts with qualified compatibility | One giant cross-product API or second composition authority | EF only for truly neutral qualified contracts |
| Source-capture costs | Measure physical I/O, worker/memory and event-loop effects | Equating package count, source size, graph time and throughput | Product qualification; libraries own their specific algorithms |

## Minimum host qualification suite suggested by this case study

1. **No evaluation before admission:** markers in invalid/unselected candidates stay absent; compile errors cause zero factory calls.
2. **Unchanged sibling survives:** hot replace B while A’s transport, callbacks and pending reply remain live.
3. **Old versus new admitted work:** old work uses its original compatible lease; new work gets the published generation; stale detached work cannot obtain new authority by ID.
4. **Phase fault injection:** verify explicit receipt, active head, routing and recovery for every pre-/post-commit failure.
5. **Cleanup ownership:** delayed/rejected/never-ending start and stop; one stop invocation; no exclusive-resource overlap; requester cancellation does not abandon cleanup.
6. **Source and dependency coherence:** edited helper/native companion/manifest/source-build selection; old capture remains old; no recovery from wrong bytes.
7. **Self-reload and cyclic retention:** prove rejection/handoff rather than waiting for one’s own lease; diagnose acquisition owners.
8. **Real execution after publication:** a cheap model/catalog/readiness response is insufficient—invoke the actual capability and final reply path.
9. **Cache-failure recovery:** distinguish retryable acquisition from failed module evaluation and downstream initialization.
10. **Bounded long-run economics:** repeated generations with active/idle consumers, independent hosts and platform/filesystem variations. Define measurements and limits before claiming “hundreds of plugins” qualified.

These tests belong to the selected admitted production host profile. They should not become a speculative blocker for ordinary trusted static Get Modular composition.

## Issue and repair ledger (retrieved 2026-10-21)

| Item | Verified state | What it supports | What it does not establish |
|---|---|---|---|
| #144291 | Open | Reported active-turn/fallback supersession failures, release-specific reproductions | All current pinned turns fail on every config edit |
| #146799 | Merged 2026-09-13 | Narrow detached A2A generation inheritance repair | General active-turn/fallback reload safety |
| #150953 | Merged 2026-09-17 | Drain-failure channel recovery with ownership barriers | Recovery after every permanent cleanup failure |
| #152965 | Open | Historical non-channel-reload/channel-disposal incidents | Current loader indiscriminately disposes all plugins |
| #152275 | Open | Several bounded model/reply unavailability observations | One universal root cause or every case still present |
| #152530 | Merged 2026-09-30 | Post-commit plugin-only activation failure repairs model/reply publication | All later overlap/database failures fixed |
| [#153386](https://github.com/openclaw/openclaw/pull/153386) | Merged 2026-09-20 | Owner-key/lease progress repair; separate livelock class | Every plugin reload issue solved |
| #159396 | Merged 2026-10-12 | Channel startup detaches short-lived caller authority | Every transport-specific lifecycle path proven |
| [#169945](https://github.com/openclaw/openclaw/pull/169945) | Merged 2026-10-20 | Slow historical dreaming cleanup moved to existing owned background work | General permission to detach readiness-critical startup |
| #154526 | Closed for inactivity 2026-10-21 | Sticky lazy runtime rejection is current and intentionally tested | Closed means fixed; missing first incident exception is known |
| #157989 | Open | Platform/version-specific capture cost reports | Exact physical-write volume on current pinned source |
| #170928 | Open | Windows readiness/stall investigation | A timeout constant is proven root cause |
| #179111 | Closed as duplicate of #170928 | Same responsiveness evidence consolidated | A repair landed or reporter’s timer theory confirmed |
| [#178504](https://github.com/openclaw/openclaw/issues/178504) | Open | 2026.10.5 plugin-state failures around generation changes | Proven current-main root cause, or healthy DB alone proves lifecycle safety |
| [#165059](https://github.com/openclaw/openclaw/issues/165059) | Open | 2026.9.8 retained-work reload failures and supersession observation | A demonstrated process leak, or deterministic minimal reproduction |

## Primary source index

All source links below are immutable at the pinned SHA; all issue/PR links were retrieved on 2026-10-21. Issue bodies and review comments can later be edited, so the ledger records the observed state.

[manifest-reader]: https://github.com/openclaw/openclaw/blob/33ccaae2f522c3ae299aaf8b195fa166ab536bd8/src/plugins/manifest.ts#L160-L214
[metadata-test]: https://github.com/openclaw/openclaw/blob/33ccaae2f522c3ae299aaf8b195fa166ab536bd8/src/plugins/manifest-metadata-scan.test.ts#L88-L183
[candidate-import]: https://github.com/openclaw/openclaw/blob/33ccaae2f522c3ae299aaf8b195fa166ab536bd8/src/plugins/loader-runtime-candidate.ts#L510-L618
[disabled-effect-test]: https://github.com/openclaw/openclaw/blob/33ccaae2f522c3ae299aaf8b195fa166ab536bd8/src/plugins/loader.instance-cleanup.test.ts#L416-L456
[instance-fields]: https://github.com/openclaw/openclaw/blob/33ccaae2f522c3ae299aaf8b195fa166ab536bd8/src/plugins/plugin-instance.ts#L49-L124
[api-lifecycle]: https://github.com/openclaw/openclaw/blob/33ccaae2f522c3ae299aaf8b195fa166ab536bd8/src/plugins/api-lifecycle.ts#L7-L78
[candidate-register]: https://github.com/openclaw/openclaw/blob/33ccaae2f522c3ae299aaf8b195fa166ab536bd8/src/plugins/loader-runtime-candidate.ts#L634-L674
[registry-rollback]: https://github.com/openclaw/openclaw/blob/33ccaae2f522c3ae299aaf8b195fa166ab536bd8/src/plugins/registry.ts#L416-L443
[core-rollback]: https://github.com/openclaw/openclaw/blob/33ccaae2f522c3ae299aaf8b195fa166ab536bd8/src/plugins/loader-runtime-core.ts#L715-L727
[core-identity]: https://github.com/openclaw/openclaw/blob/33ccaae2f522c3ae299aaf8b195fa166ab536bd8/src/plugins/loader-runtime-core.ts#L441-L486
[core-retain]: https://github.com/openclaw/openclaw/blob/33ccaae2f522c3ae299aaf8b195fa166ab536bd8/src/plugins/loader-runtime-core.ts#L503-L530
[config-capture-test]: https://github.com/openclaw/openclaw/blob/33ccaae2f522c3ae299aaf8b195fa166ab536bd8/src/plugins/loader.admission-contracts.test.ts#L328-L403
[replacement-selector]: https://github.com/openclaw/openclaw/blob/33ccaae2f522c3ae299aaf8b195fa166ab536bd8/src/gateway/server-plugin-reload-recovery.ts#L110-L130
[reload-stop]: https://github.com/openclaw/openclaw/blob/33ccaae2f522c3ae299aaf8b195fa166ab536bd8/src/gateway/server-plugin-reload.ts#L242-L354
[reload-publish]: https://github.com/openclaw/openclaw/blob/33ccaae2f522c3ae299aaf8b195fa166ab536bd8/src/gateway/server-plugin-reload.ts#L361-L443
[reload-recover]: https://github.com/openclaw/openclaw/blob/33ccaae2f522c3ae299aaf8b195fa166ab536bd8/src/gateway/server-plugin-reload.ts#L499-L573
[recovery-custody]: https://github.com/openclaw/openclaw/blob/33ccaae2f522c3ae299aaf8b195fa166ab536bd8/src/gateway/server-plugin-reload-recovery.ts#L29-L99
[model-recovery]: https://github.com/openclaw/openclaw/blob/33ccaae2f522c3ae299aaf8b195fa166ab536bd8/src/gateway/server-reload-hot.ts#L529-L553
[service-stop]: https://github.com/openclaw/openclaw/blob/33ccaae2f522c3ae299aaf8b195fa166ab536bd8/src/plugins/services.ts#L195-L288
[service-start]: https://github.com/openclaw/openclaw/blob/33ccaae2f522c3ae299aaf8b195fa166ab536bd8/src/plugins/services.ts#L624-L667
[instance-dispose]: https://github.com/openclaw/openclaw/blob/33ccaae2f522c3ae299aaf8b195fa166ab536bd8/src/plugins/plugin-instance.ts#L602-L646
[instance-finish]: https://github.com/openclaw/openclaw/blob/33ccaae2f522c3ae299aaf8b195fa166ab536bd8/src/plugins/plugin-instance.ts#L722-L765
[disposal-test]: https://github.com/openclaw/openclaw/blob/33ccaae2f522c3ae299aaf8b195fa166ab536bd8/src/plugins/plugin-module-generation.disposal.test.ts#L214-L287
[retention-test]: https://github.com/openclaw/openclaw/blob/33ccaae2f522c3ae299aaf8b195fa166ab536bd8/src/gateway/server-plugin-reload.retention.test.ts#L14-L70
[reload-cli-wait]: https://github.com/openclaw/openclaw/blob/33ccaae2f522c3ae299aaf8b195fa166ab536bd8/docs/cli/plugins/uninstall-and-update.md#L180-L214
[instance-authority]: https://github.com/openclaw/openclaw/blob/33ccaae2f522c3ae299aaf8b195fa166ab536bd8/src/plugins/plugin-instance-scope.ts#L71-L134
[generation-scope]: https://github.com/openclaw/openclaw/blob/33ccaae2f522c3ae299aaf8b195fa166ab536bd8/src/plugins/runtime/generation-scope.ts#L18-L50
[channel-startup]: https://github.com/openclaw/openclaw/blob/33ccaae2f522c3ae299aaf8b195fa166ab536bd8/src/gateway/server-channel-startup.ts#L12-L47
[background-owner]: https://github.com/openclaw/openclaw/blob/33ccaae2f522c3ae299aaf8b195fa166ab536bd8/src/plugins/plugin-instance-background.ts#L13-L49
[lease-borrow]: https://github.com/openclaw/openclaw/blob/33ccaae2f522c3ae299aaf8b195fa166ab536bd8/src/agents/prepared-model-runtime-lease.ts#L105-L147
[lease-guard]: https://github.com/openclaw/openclaw/blob/33ccaae2f522c3ae299aaf8b195fa166ab536bd8/src/agents/prepared-model-runtime-lease.ts#L223-L238
[nested-limit]: https://github.com/openclaw/openclaw/blob/33ccaae2f522c3ae299aaf8b195fa166ab536bd8/docs/plugins/architecture.md#L203
[module-binding]: https://github.com/openclaw/openclaw/blob/33ccaae2f522c3ae299aaf8b195fa166ab536bd8/src/plugins/plugin-instance-module-loader.ts#L253-L341
[reload-code-contract]: https://github.com/openclaw/openclaw/blob/33ccaae2f522c3ae299aaf8b195fa166ab536bd8/docs/cli/plugins/uninstall-and-update.md#L245-L265
[required-warning]: https://github.com/openclaw/openclaw/blob/33ccaae2f522c3ae299aaf8b195fa166ab536bd8/src/plugins/discovery-required-plugins.ts#L7-L55
[requires-doc]: https://github.com/openclaw/openclaw/blob/33ccaae2f522c3ae299aaf8b195fa166ab536bd8/docs/plugins/manifest.md#L222
[lazy-runtime]: https://github.com/openclaw/openclaw/blob/33ccaae2f522c3ae299aaf8b195fa166ab536bd8/src/shared/lazy-runtime.ts#L5-L17
[lazy-promise]: https://github.com/openclaw/openclaw/blob/33ccaae2f522c3ae299aaf8b195fa166ab536bd8/src/shared/lazy-promise.ts#L50-L85
[lazy-test]: https://github.com/openclaw/openclaw/blob/33ccaae2f522c3ae299aaf8b195fa166ab536bd8/src/shared/lazy-runtime.test.ts
[discovery-safety]: https://github.com/openclaw/openclaw/blob/33ccaae2f522c3ae299aaf8b195fa166ab536bd8/src/plugins/discovery.ts#L97-L178
[entry-admission]: https://github.com/openclaw/openclaw/blob/33ccaae2f522c3ae299aaf8b195fa166ab536bd8/src/plugins/loader-runtime-candidate.ts#L483-L502
[trust-doc]: https://github.com/openclaw/openclaw/blob/33ccaae2f522c3ae299aaf8b195fa166ab536bd8/docs/plugins/architecture.md#L967-L990
[runtime-global]: https://github.com/openclaw/openclaw/blob/33ccaae2f522c3ae299aaf8b195fa166ab536bd8/src/plugins/runtime.ts#L53-L85
[instance-global]: https://github.com/openclaw/openclaw/blob/33ccaae2f522c3ae299aaf8b195fa166ab536bd8/src/plugins/plugin-instance-scope.ts#L78-L90
[one-gateway]: https://github.com/openclaw/openclaw/blob/33ccaae2f522c3ae299aaf8b195fa166ab536bd8/docs/plugins/architecture-internals/load-pipeline.md#L148-L152
[source-copy]: https://github.com/openclaw/openclaw/blob/33ccaae2f522c3ae299aaf8b195fa166ab536bd8/src/plugins/plugin-source-file.ts#L139-L183
[native-reuse]: https://github.com/openclaw/openclaw/blob/33ccaae2f522c3ae299aaf8b195fa166ab536bd8/src/plugins/plugin-native-admission.ts#L578-L605
[current-build-timeout]: https://github.com/openclaw/openclaw/blob/33ccaae2f522c3ae299aaf8b195fa166ab536bd8/src/agents/prepared-model-runtime.ts#L95-L98
[sdk-stability]: https://github.com/openclaw/openclaw/blob/33ccaae2f522c3ae299aaf8b195fa166ab536bd8/docs/plugins/sdk-overview.md#L25-L36
[i144291]: https://github.com/openclaw/openclaw/issues/144291
[i152965]: https://github.com/openclaw/openclaw/issues/152965
[i152275]: https://github.com/openclaw/openclaw/issues/152275
[i154526]: https://github.com/openclaw/openclaw/issues/154526
[lazy-issue-comments]: https://github.com/openclaw/openclaw/issues/154526#issuecomment-6307534960
[lazy-issue-review]: https://github.com/openclaw/openclaw/issues/154526#issuecomment-5756588860
[i157989]: https://github.com/openclaw/openclaw/issues/157989
[i170928]: https://github.com/openclaw/openclaw/issues/170928
[i179111]: https://github.com/openclaw/openclaw/issues/179111
[p146799]: https://github.com/openclaw/openclaw/pull/146799
[p150953]: https://github.com/openclaw/openclaw/pull/150953
[p152530]: https://github.com/openclaw/openclaw/pull/152530
[p159396]: https://github.com/openclaw/openclaw/pull/159396
[merge150953]: https://github.com/openclaw/openclaw/commit/578690d7f174b0ffb8c76331b9ad9e1612e151d6
[merge152530]: https://github.com/openclaw/openclaw/commit/63578b2b112fcc1c9a56ef3904d2d82ac5be1a19
[merge159396]: https://github.com/openclaw/openclaw/commit/a4d915f206e196b35d89fc420fba89b571516be5
