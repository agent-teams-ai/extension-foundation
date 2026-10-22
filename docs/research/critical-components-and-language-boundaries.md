---
id: research.language-boundaries
type: research
status: active
owner: architecture
summary: Evidence for TypeScript, Rust and other implementation boundaries, with reuse, custody and release costs.
---

# Critical Components and Language Boundaries

Research date: **2026-10-22**. Status: **non-normative research and planning judgment**. This note does not approve a runtime, publish a package, amend an accepted ADR, qualify a sandbox, or report a benchmark. Primary documentation/source was inspected; no native build, runtime experiment, fuzz campaign, platform packaging test, or failure-injection suite was executed.

## Recommendation

Keep module composition, the existing local lifecycle bookkeeping, replacement policy, canonical publication/admission, operations, authorization, business recovery, and SDKs in **TypeScript**. Preserve the separately approved direction for reusable **Rust physical-custody keeper/init components**, with the preferred Protobuf encoding direction at a real cross-language service boundary; the exact keeper schema and transport are not yet approved or published. Native resource-journal/crash-cleanup ownership may move with its complete physical lifecycle. Do not create an additional Rust replacement supervisor or copy the Get Modular lifecycle state machine.

Use Rust elsewhere only for a named benefit that survives measuring the complete integration: an existing appropriate native/Wasm engine, operating system custody unavailable through the existing supported primitives, a bounded hostile-input parser, or a demonstrated CPU/memory bottleneck. Prefer adopting a maintained implementation over rewriting the mechanism in the preferred language. For hostile plugins, select the enforcement boundary and supported capability profile first; the host's implementation language does not create a sandbox.

The strongest native boundary here is **physical custody through an existing owner**, not replacement orchestration. A versioned process protocol separates native crashes, lifetime and deployment from the TS Host. A Node-API addon is reasonable for trusted bounded computation when its lower call overhead measurably matters; it shares the Node process's fate. Wasmtime or Extism is worth a bounded experiment when the plugin contract can be expressed as data and explicitly brokered capabilities. It is not an automatic way to run arbitrary existing Node/npm plugins.

### Existing ownership is a constraint, not an alternative to rate

Reviewed local source revisions: Extension Foundation `466e35a62481a6b21f2062524bb92c7eb221bb8c`; Get Modular `8249c674ad53458b31d6ad06803ceb76e29ff4c7`; Orchestrator `477b3445c4c66416121559894cf6f393c9450c72`; Agent Runtime `8d89b28f07426846b3ded7c6bd933363d9dc468c`; organization `.github` `d17901e6975fdb4388b1f75cad901e7f448aebbe`. These are research checkout observations, not a claim about newer remote heads.

GM accepted ADR-0029 already admits `@get-modular/lifecycle-kernel` as an optional, dependency-free, synchronous local candidate. It imports no Core/Assembly/EF/Node/runtime, performs no IO, and has no callbacks, Promises, clock, loader or background driver. It owns exact generation membership, call/custody identities and revocation; public qualification, release and production adoption remain separate. EF OD-003 rejects a second overlapping lifecycle FSM. Moving this into Rust or another repository requires a justified owner-approved successor/extraction; a language preference supplies neither need nor authorization. [L1–L3]

The parent supplied restored owner direction approving separate OSS Rust keeper/init components outside TS `agent-runtime`, with assistant-proposed names `custody-keeper` and `custody-init`. That direction is preserved here. Parent repository checks returned 404 for the proposed names; they are **not available/installed package claims**. TS operation/policy ownership and native physical custody must remain one coordinated ownership chain; no two supervisors control the same process.

The restored AR source now supplies concrete prior work: its Rust custody follow-up says migration was deferred as separate work after PR69 and **no production migration implementation was started**. It proposes host-side keeper plus in-container init, keeping Docker as selected Linux containment, moving technical resource journal/crash cleanup with physical lifecycle, and retaining operation state/PostgreSQL, SDKs, Provider Access, Runtime Security and HTTP/TLS in TS. It prefers per-attempt keeper unless a host-wide daemon has a demonstrated need. Current ordinary user-session execution remains the product default; contained-turn Host Custody is optional and default-off. [L5]

AR already contains isolated Rust Local Supervisor/Execution Guardian spike crates, TS caller exercises and a retained `main@aa76858` evidence record. The README reports scoped synthetic successes including Linux cgroup admission/credential reduction and Windows suspended creation/Job assignment, and documents remaining launch uncertainty, owner-crash reconciliation, process-group escape, protected-health-channel and release weaknesses. This subtask **read the reports; it did not rerun or independently certify those assertions**. Production gates remain open. Reuse/audit those mechanical primitives and independent fixtures before new implementation; their existing local deployable-supervision scope is not permission to add a competing plugin-generation policy owner. [L5]

The organization quality standard requires expected cross-project concerns to be designed as universal libraries from the start, with one owner/contract, at least one real consumer and disposable external qualification in the same delivery. A consumer is not an incubator. Public identities describe purpose without product coupling. These rules do not waive EF's stronger publication/conformance gates or Orchestrator OD-041. [L4]

## What Rust improves, and what it does not

Safe Rust prevents data races and many invalid memory accesses within its guarantees. The Rustonomicon explicitly distinguishes this from general race conditions. It does not make two distributed actions atomic, establish a monotonic fence at an external effect gateway, or decide whether an ACK was lost after commit. [S01]

For a small TS policy kernel, native code does not remove a large handwritten memory-management burden: the TS implementation already executes under a managed JS runtime. Rust enums/ownership may make some local illegal states harder to express, but TS discriminated unions, exhaustive transitions, opaque local identity membership and independently authored model/property tests already address the actual bookkeeping question. The correctness case must account for the new FFI/protocol and release matrix, not merely count compiler checks.

| Failure class | Useful improvement | Remaining owner and proof |
| --- | --- | --- |
| Native use-after-free, unchecked pointer lifetime, concurrent unsynchronized memory | Safe Rust boundaries; minimize/audit `unsafe`; reuse appropriate crates | Native implementation and transitive unsafe/native dependencies still require review and adversarial tests |
| Local transition ordering, stale lease, cleanup releasing a successor's resource | One exact-owner state machine, identity-bound operations, independent transition model | Existing GM kernel plus Host adapter; rewriting in Rust does not prove the model |
| Lost publication ACK, Host crash, duplicate dispatch, stale disconnected writer | Durable identity/reconciliation and receiver-enforced fences | Product canonical authority and operation/effect owner; local ownership types do not replace them |
| Uncooperative native CPU loop, native crash, allocator abort | Separate process with OS-enforced containment and observed exit | Physical custody owner; cancellation is a request until the chosen boundary proves more |
| Malicious plugin reading host files/network/secrets | Denied-by-default imports/brokers or qualified OS sandbox | Security/deployment owner; signed artifact and Rust guest/native binary are not grants |
| Parser/regex/compression workload exceeds latency or memory envelope | Existing bounded algorithm/native engine, appropriate limits, off-thread placement | Workload owner measures end-to-end benefit, including copies, queues, startup and failure recovery |

Examples of invariant failures that Rust cannot eliminate by construction include releasing a lease after an observation timeout while work still runs; admitting through an old cached head; retrying an unknown remote effect; losing physical custody after a late acquisition; and retiring a generation before accepted work obtains its first local lease. Those are protocol/authority errors regardless of language. Retain the prior bounded cohort's separation of local lease, pending admission, confirmed canonical acceptance, dispatch validity, actual work completion and physical retirement. [L2–L3]

## Candidate comparison

A stronger containment capability and a higher correctness score are different
claims. Compare reliability only for the same promise; the rows below are scoped
planning judgments and cannot rank Rust against TypeScript by language alone.
No native custody service is assumed available when estimating integration.

Scores are engineering judgments for the stated scope, **not measured uptime or benchmark results**. Confidence rates fit of this recommendation; reliability rates achievable behavior after the described qualification; complexity rises with burden. The bounded TS replacement baseline already assumes durable product primitives, immutable artifact closure, no exclusive resources or private-state migration, and initially read-only effects. No row funds a new durable operation engine.

| Candidate and appropriate scope | Confidence /10 | Reliability /10 | Complexity /10 | Judgment |
| --- | ---: | ---: | ---: | --- |
| Pure TS Host policy and existing qualified-owner local kernel adapter | 9 | 8 | 5 | Default for replacement coordination; strongest reuse and portability fit |
| Rewrite only pure local FSM in Rust, Node-API/Wasm wrapper | 3 | 7 | 7 | No demonstrated benefit; duplicates existing semantic owner and adds boundary/testing cost |
| Rust replacement supervisor owning policy/publication as well as custody | 2 | 6 | 9 | Reject overlapping owner; distributed correctness remains and two control planes create new hazards |
| Preferred narrow Rust keeper/init direction, exact process contract still open | 8 | 8 within a separately qualified physical-custody profile | 7 | Best native seam where supported OS handles/tree custody justify it; TS owns operations/policy |
| Rust via Node-API/napi-rs for trusted bounded CPU/parser operation | 7 | 8 for stated computation | 6 | Good after benchmark/reuse trigger; same-process faults remain |
| Existing Wasmtime in a native process, small brokered plugin contract | 8 | 8 for tested Wasm/capability profile | 8 | Appropriate hostile-Wasm candidate; do not write a Wasm runtime |
| Extism JS SDK, data-oriented portable Wasm plugin | 7 | 7 for separately tested SDK/target profile | 6 | Strong portability candidate with fewer native deployment artifacts; no parity assumption with native SDK |
| Extism native runtime/SDK inside custody-owned process | 7 | 8 for tested profile | 7 | Convenience over raw Wasmtime when its ABI suffices; watch transitive engine security/version support |
| Go sidecar reusing an already fitting Go runtime | 6 | 8 for qualified scope | 7 | Reuse can outweigh language preference; do not add Go solely for a custom second supervisor |
| Universal hostile Node/native plugins, browser/Desktop/server API with identical physical guarantees | 1 | 1 for that universal claim | 10 | No defensible universal guarantee or finite implementation estimate |

### 1. Pure TS with mature primitives

Node workers provide independent JS execution and message passing. Their resource limits apply to the JS engine, exclude external allocations such as ArrayBuffers, and do not prevent process-wide OOM. `worker.terminate()` stops JS as soon as possible and resolves on exit. None of that promises arbitrary addon thread termination, native library unload, or hostile-code isolation. [S02]

This remains a plausible first **trusted** request-cohort placement. Use an established pool only when pooling matches generation ownership; a pool is not a replacement protocol. Keep canonical state outside, no generation exports crossing the data port, and bounded unresolved predecessors. A child process is justified when the native/crash boundary is material; changing TS to Rust is not required to obtain that boundary.

### 2. Rust via Node-API/napi-rs

Node-API provides ABI stability across compatible Node versions. It does not erase OS/CPU/libc/native dependency differences. napi-rs separately identifies compiler/CLI requirements, generated target support and combinations actually tested; a parsed target triple is not a runtime support claim. Its v3 support page currently names Rust 1.88 minimum, but release work must inspect the selected version's actual requirements. [S03–S04]

An addon can efficiently wrap an existing parser, hashing/compression engine or bounded computation. Keep a coarse function boundary, owned bytes, explicit maximum sizes, stable domain error mapping and explicit cancellation. Do not expose JS callbacks/references or borrow buffers across asynchronous/native work casually. napi-rs documents that dropping the JS Promise does not cancel its Rust future and that spawned work must be owned through shutdown. Panic containment requires the right unwinding strategy and covers neither aborting panics nor undefined behavior/segfaults. [S05–S06]

An addon is a poor default for a keeper intended to survive Host failure: it shares the Host's process. Recreating a worker environment is not proof that every addon-owned thread, global, handle or OS resource disappeared. Cleanup hooks are obligations, not an independent failure domain. Use immutable versioned native artifacts and process replacement where necessary. **No native dynamic-library unloading promise:** even `libloading::Library::close` documents possible no-op behavior and unsafe load/unload routine obligations. [S07]

### 3. Narrow Rust process component

This is the recommended shape for the previously approved native custody work. Its possible mechanical responsibilities are owning exact OS execution handles, starting within the selected custody boundary, observing exit, requesting termination/escalation, handling documented descendant policy and reporting custody evidence. The TS runtime chooses operations, admission, grants, publication and recovery policy. Do not add composition graphs, active-head authority, business retry logic or an independent reload FSM to the keeper.

The owner has expressed a Protobuf preference for real public/service boundaries. This is not evidence that a keeper message schema or transport has already been accepted. AR ADR-0001 leaves Protobuf/ConnectRPC/public SDK schemas until the domain and recovery transitions stabilize; the custody follow-up still lists private IPC as open. Rust `prost` is a codec/code-generation candidate once that exact contract is selected; Protobuf does not automatically select gRPC. Internal TS modules continue to use consumer-owned TS interfaces. The current AR spike uses bounded NDJSON and explicitly leaves production encoding/mandatory handshake integration open: preserve it as historical evidence rather than calling it the approved production Protobuf implementation. Do not invent parallel public JSON contracts or generate the public policy API from native implementation internals. [S08,L5; supplied owner direction; AR ADR-0001](https://github.com/agent-teams-ai/agent-runtime/blob/8d89b28f07426846b3ded7c6bd933363d9dc468c/docs/decisions/0001-runtime-profile-and-activation-boundaries.md)

Protocol details still matter: authenticated local bootstrap/peer identity; exact operation/incarnation/resource IDs; finite frame/queue limits; explicit version/capability negotiation; idempotent mechanical commands or honest unknown outcomes; request/receipt ordering; deadlines; cancellation observation; same-operation readback after reconnect; native crash and TS crash recovery. A command ACK, cancellation request, exit observation and proof that the complete owned custody set is empty are different facts. The keeper's receipt is evidence, not business authorization.

On Windows, Job Objects manage associated process groups and limits; child membership has exceptions and breakaway rules. Merely killing a parent is insufficient. On Linux, Node expressly documents that child descendants do not automatically die with the parent. Linux process groups/cgroups/pidfd and Windows handles/jobs require placement-specific qualification; a shared port can preserve truthful result semantics without pretending every target implements the same mechanism. [S09–S10]

Rust does not automatically make shutdown correct: Tokio `Child` normally continues after its handle is dropped, `start_kill` does not wait, and killing a child does not itself establish whole-tree absence. Tokio `JoinHandle` drop detaches the task; a started `spawn_blocking` job cannot be aborted. `CancellationToken` signals cooperative cancellation. Retain/join actual work and report pending evidence, exactly as in TS. [S11–S13]

### 4. Wasmtime, Extism, WASI and Component Model

These solve a different boundary: executing constrained guests and brokered capabilities. Wasmtime supplies memory isolation and a capability-oriented WASI filesystem. Host imports can still confer excessive authority or block forever; validate every guest value and enforce product grants at the host-call/effect gateway. Wasmtime's security policy explicitly requires embedding hosts not to trust guest values and distinguishes compile-time DoS from execution-time vulnerabilities. Bound artifact size and compilation too, preferably outside the central Host's failure domain. [S14–S15]

Wasmtime fuel and epoch interruption can interrupt guest execution; epochs are not deterministic and neither mechanism cancels code blocked in an arbitrary host call. Async host operations need their own cancellation and ownership. `ResourceLimiter` excludes some runtime/host allocations, so total process RSS still needs an outer budget. [S16–S17]

Extism offers an existing plugin ABI and native runtime rather than requiring custom memory marshalling/runtime machinery. Its **JS SDK uses each JS runtime's own WebAssembly engine rather than FFI to libextism**, supporting major browsers, Node and other JS targets. Therefore native Extism and JS Extism are distinct enforcement/maintenance profiles. The JS manifest documents, for example, worker requirements for allowed-host handling. Verify timeout, memory cap, cancellation, async host functions and worker startup independently on every claimed target. Do not transfer Wasmtime guarantees into the JS SDK merely because both expose an Extism plugin. [S18–S20]

WIT/Component Model and `jco` are useful when typed Wasm imports/exports and composition are a concrete requirement. `jco` can supply JS-native component tooling. Respect the owner-selected public/service encoding direction and use an explicit adapter if a guest ABI needs WIT; they describe different boundaries, so a second independently editable definition of the same contract is undesirable. WASI version, feature set, resource representation and host implementation must be pinned and tested. Browser polyfills/adapters cannot create Node/filesystem/process capabilities that the browser does not provide. [S21]

Node's built-in `node:wasi` explicitly says not to rely on it to execute untrusted code. Do not substitute it for a qualified Wasmtime/OS profile. Arbitrary TS/npm/Node plugins also do not become compatible with WASI simply by recompiling: Node APIs, native addons, callback/reference semantics and dynamic package loading need an explicit guest profile or remain unsupported. [S22; inference]

Maintenance is part of safety. Wasmtime's documented release policy gives LTS versions 24 months and normal releases two months; supported feature/platform tiers matter. Its October 2, 2026 GHSA-32h6-97mm-8q3c documents a native stack overflow in a component async path and fixed releases. That is evidence that mature Rust engines still need prompt patched dependency/artifact management, not evidence that every Extism core-module call exercises that feature. Extism 1.41.0's release notes upgrade to Wasmtime 49; exact resolved patches, enabled features and packaged binaries must be examined before adoption. No version in this note is approved for installation. [S23–S25]

## Reuse shortlist and compatibility cautions

This is a shortlist to evaluate against the concrete slice, not a stack to install wholesale. Licenses are upstream direct-project observations; a release still needs exact transitive license/SBOM/provenance review.

| Existing component | Useful narrow reuse | License/maintenance evidence and limit |
| --- | --- | --- |
| GM lifecycle-kernel candidate | Existing exact local generation/call/custody semantics | Existing accepted owner; unpublished/unqualified as described in ADR-0029; cannot silently replace or move |
| AR Rust system-boundaries spike | Existing OS custody/stream/reconciliation primitives and independently frozen protocol fixtures | Isolated synthetic evidence, not production-ready binaries or hostile/real-provider qualification; audit fixture assumptions, protected health IPC and durable owner-loss cleanup [L5] |
| `tokio`, `tokio-util` | Native asynchronous IO, owned tasks, cancellation signals/process observation | Reuse rather than custom executor; signal/drop/abort semantics require explicit shutdown ownership [S11–S13] |
| `processkit` | Compare existing tree/stream/cancellation primitives against direct OS adapter maintenance | Current primary docs observed 3.3.4; historical AR evaluation said 3.1.0. Not an adopted dependency. It explicitly distinguishes Drop, abrupt owner death and process-group `setsid` escape; do not import its supervision/retry policy over existing owners [S34,L5] |
| `rustix`; focused `windows-rs` bindings | OS handle/syscall mechanics for native custody | Version/platform-specific APIs; `windows-rs` has MIT/Apache-2.0 license files and currently advises reusable libraries to prefer focused/private bindings over umbrella dependency weight [S26–S27] |
| `prost` | Codec/code-generation candidate for a future owner-selected Protobuf contract; no keeper schema or transport is selected here | Apache-2.0; generator/runtime version compatibility and TS binary/ProtoJSON golden fixtures still needed [S08] |
| Wasmtime/wasmtime-wasi | Existing Wasm engine, WIT/component support, interrupt/resource APIs | Supported release/features and transitive patches are mandatory selection inputs; no custom engine [S14–S17,S23–S24] |
| Extism native runtime and JS SDK | Established plugin byte ABI/PDKs and host integration | BSD-3-Clause; native and JS implementations differ; platform release matrix and engine update cadence remain separate [S18–S20,S25] |
| `wasmparser`/`wasm-tools` | Inspect/validate admitted Wasm structure instead of handwritten binary parser | Bytecode Alliance maintained toolchain; inspect exact crate license set and feature compatibility; parse success is not permission [S28] |
| Rust `regex` | Bounded algorithm when the application accepts its syntax | Documents no lookaround/backreferences and O(mn) search; compilation/memory/iteration still need limits; not a JS RegExp drop-in [S29] |
| Node/browser Web Crypto | Existing maintained crypto operations for TS application | Prefer common supported algorithm subset; native Rust crypto requires a missing algorithm, environment or measured need; never bespoke cryptography [S30] |
| HashiCorp `go-plugin` | Existing local subprocess/RPC lifecycle in an already Go host | **MPL-2.0**, not an assumed MIT license; local reliable network only, not general distributed RPC or OS sandbox. Go host/package API is not a ready TS adapter [S31] |
| `wazero` | Existing pure-Go Wasm runtime when a Go component already fits | Apache-2.0; no CGO, Core 1.0/2.0 claims; do not assume Component Model/WASI/native-Extism equivalence [S32] |
| Tini | Existing Linux container init behavior: child wait/reaping/signal forwarding | MIT; C implementation, container/Linux scope. Reuse is a serious counterargument to rewriting generic init merely to make it Rust; it is not a cross-platform custody keeper [S33] |

Broader runtimes such as an OCI runtime can be useful **deployment adapters** where the existing platform already operates them. Importing an entire runtime/control plane just to reload a trusted request plugin is disproportionate. Linux-only container machinery does not establish Windows/Desktop/browser support. Rust itself is not a reason to replace a fitting Go/C runtime with a bespoke implementation.

## Strongest counterarguments

**A pure Rust/Wasm kernel could give all targets one formally tighter implementation.** That is plausible if there are real non-JS consumers. Here the existing pure TS kernel already has no Node dependency, and a second implementation creates parity and release obligations before any missing capability is demonstrated. Independent model checking is valuable without moving the semantic owner.

**A native sidecar costs more operational work than an addon.** Correct. For frequent small trusted computation, the addon may win. The sidecar recommendation is specifically for independent physical custody/crash containment; it should reuse the already owned process component instead of creating another service. Library-first does not require a daemon or automatically require a native component.

**Maintained high-level process libraries could delete much custom Rust.** ProcessKit and existing deployment/init runtimes deserve a measured comparison. Accept them only if pre-execution custody, abrupt owner death, identity and retained evidence meet the selected profile; API breadth and kill-on-drop alone do not prove those properties.

**Wasm portability could outweigh native custody complexity.** For bounded data plugins, yes; this is a serious alternative. For existing Node/native/provider plugins needing incompatible APIs, the adapter/compatibility burden can erase the advantage. Choose a concrete guest and capability contract before adopting another execution platform.

## Scoped effort, including integration and release burden

Ranges are rough **±2× planning estimates**, not source-count measurements or delivery promises. They count maintained handwritten production code/config and independent tests/fixtures separately; exclude dependencies, generated bindings/messages, docs and domain code. “Release” is additional handwritten CI/packaging/bootstrap/signing/provenance configuration. These are **alternative or incremental scopes**, not all additive. OS-specific kernel/sandbox engineering, installers/updaters and a new durable operation store are excluded unless stated.

| Scope | Production LOC | Integration/release LOC | Test/fixture LOC | What the estimate actually includes |
| --- | ---: | ---: | ---: | --- |
| Existing bounded TS worker-cohort baseline | 3,000–5,500 | 250–600 | 5,000–9,000 | Prior product publication/admission/recovery estimate with packaging/fixture work shown separately; reuse existing durable primitives |
| New TS glue to an already qualified released lifecycle owner | 150–400 | 100–250 | 350–900 | Mapping/identity/errors and packed external consumer, **not** reimplementing or funding the unreleased kernel |
| Rewrite pure FSM into Rust addon, for comparison only | 600–1,100 Rust + 250–500 TS | 350–800 | 1,500–3,000 | Transition parity, FFI/worker shutdown, platform packaging; no new correctness proof |
| One existing Rust CPU/parser crate through napi-rs | 250–700 Rust + 150–350 TS | 300–700 | 800–1,800 | Bounded coarse API, marshalling, cancellation/error boundary, benchmarks, target install/smoke tests |
| Same computation as Protobuf sidecar | 600–1,300 Rust + 300–650 TS | 450–1,000 | 1,500–3,000 | Framing/session/correlation, crash/EOF/cancel, packaging and N/N−1 compatibility; use existing transport to reduce this |
| Thin TS adapter to an **already qualified** native custody service | 300–700 TS | 200–450 | 800–1,800 | Mapping, receipts, reconnect/readback, exact owner conformance; excludes keeper development |
| Isolated Linux+Windows custody mechanism prototype from maintained OS crates | 2,000–4,000 Rust + 400–900 TS | 800–1,500 | 4,000–8,000 | Mechanism/fixture planning only; **not** the AR migration, production qualification, sandbox or release plan; existing spike likely reduces new work |
| Existing AR whole-custody migration research estimate | 8,000–13,000 new/substantially reworked; 10,000–16,000 removed separately | Must be re-estimated from current implementation | 10,000–18,000 | Recorded historical estimate, confidence ~6/10; Linux + cooperative macOS proposal, not Windows production/Desktop updater/general public SDK; no net-LOC arithmetic [L5] |
| Existing AR first coherent Linux synthetic custody slice | 3,000–5,000 within whole-migration total | Must be re-estimated; no claim it is included completely | 4,000–7,000 within total | Historical proposed slice, not started migration or a new independent delivery commitment [L5] |
| Small Wasmtime/Extism native guest adapter within existing keeper | 700–1,700 Rust + 300–700 TS | 400–900 | 2,000–4,500 | Brokered read-only data guest, quotas, host-call cancellation, traps, compilation bounds, packed artifacts; no Node plugin compatibility |
| Extism JS SDK portable read-only guest prototype/adoption slice | 500–1,200 TS | 200–500 | 1,200–2,800 | Same data guest in Node plus browser with separately tested timeout/memory/import profile |
| WIT/component+jco counterpart, if concrete need exists | +500–1,200 | +300–700 | +1,000–2,500 | Generation/ABI adapter, imports/versioned feature coverage; not a new public API authority |

A Linux+Windows mechanism prototype does not imply macOS production is free or that either platform is admitted. Additional cooperative macOS adapter/fixture work might be 500–1,200 maintained production/config LOC and 1,000–2,500 tests, but this must not be added to AR's existing estimate as though its scope omitted macOS. A hostile-native-plugin sandbox has no defensible estimate without an exact target/threat/capability profile. Full installers/updaters, signed Desktop binaries, privilege transitions and credential brokers can dominate the small core's LOC. Reuse existing approved release and custody machinery before adding those numbers.

## Measurements and falsifiers before choosing a new language boundary

1. **Name the failure or budget.** Is the actual issue CPU latency, event-loop blocking, RSS, compilation, malformed-input rejection, descendant survival, or the need to survive Host crashes? A thousand descriptors is not evidence for any of them.
2. **Baseline the supported TS implementation and mature primitives.** Use TS 7.0.2 or newer within the owner-selected exact toolchain, real packed packages, representative payload sizes and active/tenant/generation counts. Compiler/editor generic-instantiation problems are a separate scale axis; native runtime code does not fix TS API complexity automatically.
3. **Benchmark the whole call.** Compare TS main/worker, existing native runtime API, napi-rs and sidecar using cold/warm startup, p50/p95/p99 latency, event-loop delay, CPU, peak/retained RSS, serialization/copy bytes, cancellation latency, saturated queues, restart cost and repeated-generation retention. Choose an owner-specific acceptance budget; no universal “Rust is 3× faster” threshold.
4. **Make containment observable.** Kill TS and native processes at each custody/receipt boundary; stall native work; lose ACKs; disconnect/reconnect; test late startup, reused PID, descendants, inherited handles, cancellation races and crash loops. Verify the actual OS custody set before reporting absence. Test Windows explicitly, including job nesting and denied assignment.
5. **Exercise guest denial and quotas.** Malformed/huge modules, expensive compilation, infinite loops, memory/table growth, blocked host calls, forbidden path/network access, output/log flooding and host-call reentrancy. Wasm linear-memory caps do not substitute for process RSS limits.
6. **Qualify release/install and API semantics.** The oldest supported OS/libc/Node runtime, exact Desktop shell, CPU architectures, browser isolation/CSP/worker conditions, clean packed install and offline/missing-native-artifact errors. N/N−1 protocol peers must reject unsupported capability/guarantee combinations before side effects.

The recommendation is falsified if the pure TS path demonstrably cannot meet a required envelope, or if a maintained native component eliminates a real OS-custody gap at lower total operational cost. A Rust FSM proposal remains weak unless its author demonstrates a defect class that cannot be addressed adequately in the existing semantic owner **and** includes boundary/release cost. A Wasm approach fails if the real extension needs unavailable Node/native/OS capabilities or if the host broker becomes a generic privileged tunnel.

Observability crosses every chosen boundary: bind logs/metrics/traces to artifact, runtime incarnation, operation and resource/custody identity; preserve error origin and terminal/pending distinctions; measure queues, cancellation requested/observed, retained generations, cleanup debt, restarts and version negotiation. An opaque “native failed” error or a lost async context removes reliability even if the inner computation is safer.

## Reusable language-selection checklist for future agents

The current organization
[backend reference](https://github.com/agent-teams-ai/.github/blob/86a85d6beda07e6e5ee7806646f700bc4e4db173/docs/backend-stack.md)
likewise selects Node/TypeScript primarily and permits Rust/Go with a concrete
advantage. It does not adopt a new language in every consumer. For example,
Orchestrator's [OD-005](https://github.com/agent-teams-ai/agent-teams-orchestrator/blob/477b3445c4c66416121559894cf6f393c9450c72/docs/open-decisions/OD-005-temporal-workflow-boundary.md)
fixes its first official Temporal worker to the TypeScript SDK; a measured need
and new owning decision are required for Go/Rust. General language-selection
guidance does not silently reopen that choice.

- Start with the accepted owner/ADR and existing library. Preserve TS policy/SDKs, GM composition/local-kernel ownership and approved native custody boundaries. Do not silently rewrite accepted ADRs or establish a second owner.
- Name the exact benefit and evidence: existing best-fit engine, missing OS primitive, measured CPU/RSS budget, or bounded hostile-input algorithm. “Critical” and “Rust is safer” are not sufficient justifications.
- Choose the narrowest boundary: native built-in/API reuse; existing library; pure function through addon/Wasm; custody-owned process where failure containment/lifetime requires it. Keep ordinary internal interfaces in TS; apply the preferred Protobuf direction only after the exact cross-language service contract and transport are selected.
- Separate memory safety, logical correctness, distributed authority and sandbox enforcement. State which claim the change improves and which existing owner proves the others.
- Bound inputs, queues, memory, compilation, host calls and execution lifetime. Define cancellation request, cleanup settlement, exit evidence and physical absence separately. Promise no dynamic native unload.
- Declare target/feature capabilities truthfully. Sharing a TS API does not grant a browser OS custody; unsupported semantics fail before effects instead of returning fake success.
- Verify current stable versions, actual resolved transitive engine patches, licenses, unsafe/native dependencies, MSRV/Node-API/OS floors, artifact provenance and security-maintenance owner. Commit exact approved locks/digests; moving docs are not a support pin.
- Include full integration/release/test cost and a real external disposable consumer. Reuse independent conformance, test protocol compatibility and failure modes, and measure the complete call.
- Record alternatives, counterarguments, measurable acceptance criteria, owner and removal/rollback plan in the owning open decision or successor ADR. Do not make this research an approval ritual or reopen a settled language decision without new evidence.
- TS code must continue to qualify on the owner-selected supported **TypeScript 7.0.2+** toolchain. Generated types/bindings and native adapters do not waive compiler, distribution or architecture gates.

## Primary-source ledger

All external sources retrieved **2026-10-22**. Docs labeled “latest,” `main`, or unversioned are dated observations and must be rechecked before adoption. Version labels below identify observed evidence, not recommended installation pins. Where exact source commits were not available, that limitation is explicit. No source tests were executed locally.

| ID | Primary URL / evidence pin | Observation and scope |
| --- | --- | --- |
| L1 | [GM ADR-0029](https://github.com/agent-teams-ai/get-modular/blob/8249c674ad53458b31d6ad06803ceb76e29ff4c7/docs/decisions/0029-admit-an-optional-lifecycle-kernel-candidate.md) | Accepted candidate boundary; source read locally |
| L2 | [EF OD-003](https://github.com/agent-teams-ai/extension-foundation/blob/466e35a62481a6b21f2062524bb92c7eb221bb8c/docs/open-decisions/OD-003-module-runtime-and-public-spi-choices.md) | Open host/public-SPI choice; rejects overlapping lifecycle FSM; source read |
| L3 | [EF research reference](https://github.com/agent-teams-ai/extension-foundation/blob/466e35a62481a6b21f2062524bb92c7eb221bb8c/docs/research/plugin-system-research-reference.md), [bounded replacement](https://github.com/agent-teams-ai/extension-foundation/blob/466e35a62481a6b21f2062524bb92c7eb221bb8c/docs/research/hot-reload-and-generation-replacement.md), platform/ecosystem/review companions at same commit | Prior research and non-normative baseline read locally; no new reproduction |
| L4 | [Engineering Quality Standard](https://github.com/agent-teams-ai/.github/blob/d17901e6975fdb4388b1f75cad901e7f448aebbe/docs/engineering-quality-standard.md) | Current shared library-first/universal purpose/ownership guidance read locally |
| L5 | [AR Rust follow-up](https://github.com/agent-teams-ai/agent-runtime/blob/8d89b28f07426846b3ded7c6bd933363d9dc468c/docs/architecture/rust-custody-migration-follow-up.md), [optional default](https://github.com/agent-teams-ai/agent-runtime/blob/8d89b28f07426846b3ded7c6bd933363d9dc468c/docs/architecture/host-custody-optional-default.md), [production gates](https://github.com/agent-teams-ai/agent-runtime/blob/8d89b28f07426846b3ded7c6bd933363d9dc468c/docs/spikes/rust-system-boundaries-production-gates.md), [spike README](https://github.com/agent-teams-ai/agent-runtime/blob/8d89b28f07426846b3ded7c6bd933363d9dc468c/experiments/rust-system-boundaries/README.md) | Source records inspected; scope, deferred implementation, historical estimates and reported tests only; no rerun or direct code audit here |
| S01 | [Rustonomicon races](https://doc.rust-lang.org/nomicon/races.html) | Moving official docs: data races versus general race conditions |
| S02 | [Node worker threads](https://nodejs.org/api/worker_threads.html) | Observed v26.12.1: JS-only resourceLimits and terminate/exit semantics; not consumer runtime adoption |
| S03 | [Node-API](https://nodejs.org/api/n-api.html) | Observed v26.12.1: ABI/lifetime/native API contract |
| S04 | [napi-rs support](https://napi.rs/docs/more/support-compatibility) | Moving v3 docs: Rust 1.88 floor, ABI versus target testing; package metadata observed napi 3.15.0 |
| S05 | [napi-rs async/concurrency](https://napi.rs/docs/more/async-concurrency) | Moving docs: Promise drop does not cancel, explicit owned task shutdown and thread/environment boundaries |
| S06 | [napi-rs errors/panics](https://napi.rs/docs/concepts/error-handling) | Moving docs: expected errors and panic boundary limits |
| S07 | [libloading Library](https://docs.rs/libloading/0.9.0/libloading/struct.Library.html) | Observed 0.9.0: unsafe load/termination and possibly no-op close |
| S08 | [prost](https://docs.rs/crate/prost/latest) | Observed 0.14.4: Protobuf implementation/code generation and Apache-2.0 license |
| S09 | [Microsoft Job Objects](https://learn.microsoft.com/en-us/windows/win32/procthread/job-objects) | Moving official OS docs: group limits, nested jobs and inheritance/breakaway exceptions |
| S10 | [Node child_process](https://nodejs.org/api/child_process.html) | Observed v26.12.1: killed flag versus exit, Windows signal differences, Linux descendant caveat |
| S11 | [Tokio Child](https://docs.rs/tokio/latest/tokio/process/struct.Child.html) | Observed 1.54.1: drop/kill/start_kill/wait semantics |
| S12 | [Tokio JoinHandle](https://docs.rs/tokio/latest/tokio/task/struct.JoinHandle.html) | Observed 1.54.1: detach on drop, started spawn_blocking cannot abort |
| S13 | [tokio-util CancellationToken](https://docs.rs/tokio-util/latest/tokio_util/sync/struct.CancellationToken.html) | Observed 0.7.20: cooperative signal, not force termination |
| S14 | [Wasmtime security](https://docs.wasmtime.dev/security.html) | Moving docs: sandbox and capability filesystem; dangerous terminal outputs also discussed |
| S15 | [Wasmtime security-bug definition](https://docs.wasmtime.dev/security-what-is-considered-a-security-vulnerability.html) | Moving policy: guest values, platform/feature scope and compilation DoS distinction |
| S16 | [Wasmtime interruption](https://docs.wasmtime.dev/examples-interrupting-wasm.html), [Config](https://docs.wasmtime.dev/api/wasmtime/struct.Config.html) | Moving docs: fuel/epoch tradeoffs; host-call blocking caveat |
| S17 | [Wasmtime ResourceLimiter](https://docs.rs/wasmtime/latest/wasmtime/trait.ResourceLimiter.html) | Observed docs label 50.0.0; not a release verification: not all host/runtime allocation is capped |
| S18 | [Extism JS SDK](https://github.com/extism/js-sdk) | Moving README; native JS WebAssembly engine, supported targets, BSD-3-Clause; exact latest SDK release unresolved |
| S19 | [Extism JS Manifest](https://extism.github.io/js-sdk/interfaces/Manifest.html) | Moving generated API docs; worker condition on allowedHosts; exact matching package release not verified |
| S20 | [Extism Manifest](https://docs.rs/extism/latest/extism/struct.Manifest.html), [Plugin](https://docs.rs/extism/latest/extism/struct.Plugin.html), [native repository](https://github.com/extism/extism) | Observed 1.41.0 docs: manifest, cancel/reset/data API and native platform matrix; BSD-3-Clause |
| S21 | [jco](https://github.com/bytecodealliance/jco) | Moving README: JS component tooling; Apache-2.0 with LLVM exception; actual selected release not resolved |
| S22 | [Node WASI](https://nodejs.org/api/wasi.html) | Observed v26.12.0 page: explicit untrusted-execution warning |
| S23 | [Wasmtime release policy](https://docs.wasmtime.dev/stability-release.html), [platform support](https://docs.wasmtime.dev/stability-platform-support.html) | Moving release/target policy: LTS and normal support differ; recheck selected feature tier |
| S24 | [GHSA-32h6-97mm-8q3c](https://github.com/bytecodealliance/wasmtime/security/advisories/GHSA-32h6-97mm-8q3c) | Published 2026-10-02; affected >=39,<48.0.4 and >=49,<49.0.2; fixed 48.0.4/49.0.2, component async path; not a complete advisory inventory |
| S25 | [Extism v1.41.0 release](https://github.com/extism/extism/releases/tag/v1.41.0) | Observed latest release, 2026-10-09, commit short ID `051b765`, upgrades Wasmtime to 49; exact packaged transitive patches not inspected |
| S26 | [rustix](https://docs.rs/crate/rustix/latest) | Observed 1.1.5: safe syscall bindings; exact selected target/features/license package needs release review |
| S27 | [windows-rs](https://github.com/microsoft/windows-rs) | Moving source README and MIT/Apache license files; focused bindings guidance observed |
| S28 | [wasmparser](https://docs.rs/crate/wasmparser/latest), [wasm-tools](https://github.com/bytecodealliance/wasm-tools) | Observed wasmparser 0.261.0; exact crate license/features must be selected explicitly |
| S29 | [regex](https://docs.rs/regex/latest/regex/) | Observed 1.13.1; algorithm/syntax and untrusted input limitations; no local performance test |
| S30 | [Node Web Crypto](https://nodejs.org/api/webcrypto.html) | Observed v26.12.1: existing crypto API; cross-browser algorithm parity not qualified |
| S31 | [HashiCorp go-plugin](https://github.com/hashicorp/go-plugin), [v1.8.0 API](https://pkg.go.dev/github.com/hashicorp/go-plugin@v1.8.0) | Current README/MPL-2.0; historical v1.8.0 pin from prior EF review, not latest selection; local RPC scope |
| S32 | [wazero](https://github.com/wazero/wazero) | Moving official README, redirected from tetratelabs: no CGO, Core 1.0/2.0, Apache-2.0; exact release unresolved |
| S33 | [Tini](https://github.com/krallin/tini) | Moving official README: Linux container init, wait/reap/signal, MIT; exact release unresolved |
| S34 | [ProcessKit](https://docs.rs/processkit/latest/processkit/) | Observed 3.3.4: existing tree/stream APIs with explicit Drop/abrupt-death/setsid caveats; license/current source maintenance not independently resolved, no adoption |

Some attempted raw GitHub/Cargo and release endpoints were unavailable to retrieval, and sandboxed direct HTTP was denied. Consequently this note intentionally does not claim exact Cargo.lock inspection, latest Wasmtime release selection, complete security-advisory closure, or a resolved release matrix. Those are adoption measurements/checks, not grounds to invent pins.
