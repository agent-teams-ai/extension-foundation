---
id: research.update-policy-runtimes
type: research
status: active
owner: architecture
summary: Evaluates selectable interruption policies, compilation and optional cross-language runtimes through primary sources and bounded backend, browser and WebAssembly component experiments.
---

# Live Update Policies and Portable Runtimes 2026-11-21

## Scope and recommendation

**Observed: 2026-11-21, Europe/Kiev. Recommendation: keep a TypeScript host and
ordinary feature contracts, with explicit update policies and optional execution
adapters. Qualify WebAssembly Component Model where an actual cross-language
boundary justifies it.** Guest languages and the language of the coordinating
application are separate choices. Supporting a Rust-authored plugin does not
require rewriting the application or making every TypeScript module a Wasm
component.

The owner's [prominent platform vision](../open-decisions/OD-003-module-runtime-and-public-spi-choices.md#owner-prioritized-live-application-platform-vision-2026-11-18)
includes substantive frontend and backend behavior, agent-authored changes,
durable installation, sharing, removal and eligible built-in functionality.
The [November 21 clarification](../open-decisions/OD-003-module-runtime-and-public-spi-choices.md#owner-requested-selectable-updates-and-cross-language-research-2026-11-21)
asks for several optional interruption/completion modes. It leaves the ordinary
default, agent grants and escalation policy open; it does not impose a universal
ban on interruption or on automatic escalation explicitly authorized in advance.

This is research and disposable execution evidence. Production code, a public
SPI, a new runtime package and real-product integration remain zero. Existing
accepted ADRs, the controlled-restart delivery baseline, Get Modular composition
and the consuming product's authority are unchanged. The research does not
authorize merge or a release. Detailed investigator reports, plans, source
ledgers, reviews and original logs accompany the evidence packet below.

## What to make selectable

The useful unit is a named update operation with an affected feature/dependency
boundary, actor grant, compatible candidate, deadline and explicit deadline
action. A single `hotReload: true` flag cannot express those promises. The
following are proposed semantics for discussion, not an adopted public API.

| Mode | Behavior | Preconditions and honest unresolved outcome |
| --- | --- | --- |
| New calls use v2; old work retains v1 | Prepare v2, select it for new root operations and retain old resources while their owned work completes. | Versions must coexist against the relevant state and dependencies. A long session can retain v1 indefinitely; impose a declared resource policy. |
| Drain, then replace | Close new root admission, let the named existing work finish, retire the old executor and select the ready candidate. | Define what belongs to that work, including nested calls. An elapsed deadline may mean deferred; it is not proof that the work finished. |
| Cooperative cancellation | Request cancellation of the named work, then observe completion and any required cleanup separately. | Receiving an abort signal is not a completion receipt. The implementation may ignore it or be stuck in a host call. |
| Force an isolated execution unit | Revoke old write authority and invoke the actual owner's termination mechanism; report the available stop observation and unresolved effects. | The grant must cover the whole affected worker/process. A shared executor cannot promise per-plugin force without collateral interruption. |
| Checkpoint, migrate or controlled restart | Resume through an explicit compatible-state or durable-workflow contract. | A checkpoint is not arbitrary stack, closure, socket or VM-heap transplantation. Schema rollback may be invalid after new writes. |

An agent can request a mode only if the executor supports it, the actor has the
required grant and the feature's state contract permits it. A plugin manifest
declares requirements/capabilities; it cannot confer that grant on itself. A
product can explicitly authorize “drain for a budget, then force this dedicated
executor,” including agent initiation. The deadline must not invent that
permission, silently convert deferral to success or authorize retry of an
effect whose result is unknown.

### Safe boundaries depend on the actual feature

For a short calculation, completion of an invocation may suffice. A transaction
needs its transaction boundary; a streamed agent run may need a workflow
checkpoint; a UI contribution needs a controlled unmount/remount boundary and
owned draft state. “Zero active calls” does not establish safety if callbacks,
timers, subscriptions or dependency continuations still belong to the old
generation. Closing admission prevents an endless stream of new arrivals from
refilling the drain, but nested continuations may still need their pinned
dependency closure.

Keep one total transition budget and expose the remaining allowance for each
phase; resetting a full timer at every phase changes the promised deadline.
Cancellation, executor exit, required finalizers and external reconciliation
can have different observations. Their completion must not be compressed into
one misleading `stopped` boolean.

Preparation should precede destructive retirement where coexistence permits
it. An exclusive port, lock, device or singleton resource may prevent a fully
ready v2 while v1 owns it. In that case a declared handoff/gap or controlled
restart is more accurate than promising universal overlap. A new candidate
that fails preparation must leave a healthy current selection usable when the
chosen profile permits preservation.

The experiments use reversible private admission gates. Production shutdown
seals can be irreversible: the fixture's explicit resume operation is not
evidence that an accepted production seal can reopen. A production adapter must
preserve its actual lifecycle rather than simulate a stronger guarantee.

## Architecture without another universal manager

Clean Architecture here means preserving ownership and dependency direction,
not adding interfaces around every object. A consumer owns a small feature
contract. Ordinary feature logic depends on that contract and its state owner;
runtime-specific transport, engine handles and lifecycle details stay outside
it. Existing Get Modular composition resolves dependencies, and the applicable
native owner manages resource lifetime.

| Concern | Existing or intended owner | Boundary to preserve |
| --- | --- | --- |
| Feature behavior and compatibility | Consuming domain/use case | Narrow consumer-owned contract; no generic service locator in business code. |
| Composition | Get Modular | Do not introduce another dependency graph, kernel or independent reference counter. |
| Build and executable identity | Build/admission path | Exact dependency closure and artifact identity; source path and version label alone are insufficient. |
| Update mode and grants | Consuming operation/authority owner | One authoritative operation, affected scope and deadline action. An adapter executes granted mechanics. |
| State and commits | Actual state owner | Validate operation/generation authority at the write boundary; retaining an old object does not version shared data. |
| Execution and physical stop | Native worker/process/engine owner | Use the owner's real completion evidence; do not add a competing supervisor. |
| Lifetime and cleanup | Existing scoped resource mechanism | Native Effect scopes where appropriate; no mandatory Effect type in a portable consumer contract. |
| Installed intent and restart recovery | Existing durable installation/selection owner | Reconcile desired identity and observed readiness; avoid a second catalog or active-head authority. |

The SOLID consequences are practical: separate policy from execution, add an
adapter through a demonstrated port, and preserve each port's behavioral
contract. A supposedly substitutable adapter that returns success for
unsupported cancellation violates that contract. Interface segregation means
that a calculator need not implement a filesystem, UI or durable-workflow
interface. Dependency inversion keeps Wasmtime, browser and Effect types out
of an independently reusable feature contract.

DRY applies to stable shared semantics. Similar-looking teardown code in a
browser worker and a durable workflow does not justify one interface that
erases their different stop receipts. Extract residual mechanics after
independent consumers demonstrate the same need; keep their policy and state
ownership local. A portable library can start in the existing repository and
remain usable outside Agent Teams. A new repository or coordinator language is
not itself a portability guarantee.

The [November 18 executed study](live-application-evolution-vision-and-executed-spikes-2026-11-18.md)
already exercises native Get Modular/Effect resource composition and a bounded
durable installation/restart path. This follow-up examines additional execution
boundaries, not a replacement lifecycle kernel. Persistent desired selection,
active readiness, executable removal and deletion of user data remain distinct.
Removing a plugin must not implicitly erase user-owned data.

## Compilation and the live authoring loop

Source editing, code generation, validation and activation are separate steps.
An agent can edit a candidate while the current implementation continues to
serve. The candidate then goes through strict checking, target-specific build,
artifact admission, preparation/readiness and the authorized transition. This
does not require a compiler on every call or in the UI thread.

| Path | Required processing | Limits |
| --- | --- | --- |
| Ordinary TS in a browser | Strict type check, emit JavaScript, and bundle/resolve the actual dependency closure for the browser target. | Browsers do not execute TypeScript syntax; a development HMR server is not a production update/state contract. |
| TS in Node | Strict independent check; either emitted JS or a supported Node type-stripping profile for suitable source. | Type stripping is not type checking or general bundling. Package resolution and supported syntax remain explicit. |
| JS/TS in a Worker/process | Build the appropriate entrypoint and explicit message/RPC data contract. | Ordinary objects, closures and AbortSignals do not become a portable protocol automatically; cancellation needs correlated requests. |
| TS/JS as a Wasm component | Emit JS, then use ComponentizeJS to embed a JavaScript engine and construct a component. | This is not direct compilation of arbitrary TypeScript into a tiny native Wasm function; host APIs/imports and engine cost matter. |
| Rust or another compiled guest | Compile with a supported target, add a compatible component interface and generate/validate bindings. | Language support, canonical ABI types, resource ownership and async features depend on the exact toolchain profile. |
| Component in a JS host | Use a qualified component host, or jco transformation into core Wasm plus generated ESM bindings. | A Component Model binary is not automatically accepted by the ordinary core-Wasm Node/browser API. |

The browser fixture builds v2 only after v1 behavior is visible. Its worker
bundle combines two predetermined import-free emitted scripts; that is not
qualification of a general package bundler. The backend fixture uses Node type
stripping after strict TypeScript checking. The component experiment uses
explicit public build/transpile APIs and a narrow scalar WIT world.

Builds have their own execution boundary. ComponentizeJS initializes and
snapshots top-level guest code during component creation; build tooling is not
merely passive text processing. Production agent-authored builds therefore need
qualified resource/access limits, immutable inputs and admission before the
running application receives authority to use the result. The disposable
trusted fixtures do not qualify hostile-source builds or signatures.

The sources and implementation paths are the pinned
[ComponentizeJS API](https://github.com/bytecodealliance/ComponentizeJS/blob/4d812f5a7b524cea5bcfd565cac55f3fab876a57/src/componentize.js),
[jco transformation](https://github.com/bytecodealliance/jco/blob/53e2bd854660ce9fbead4b6004f6e619740aea07/packages/jco-transpile/src/transpile.ts)
and [Node TypeScript documentation](https://nodejs.org/docs/latest-v24.x/api/typescript.html).

## Wasm: which mechanism, and where it fits

| Name | Provides | Does not decide |
| --- | --- | --- |
| Core WebAssembly | Validated executable modules, memories and low-level imports/exports. | Product update policy or compatible application state. |
| Component Model | Typed component binaries, linking and canonical cross-language calls. | User grants, business behavior, durable recovery or migration. |
| WIT | Language-neutral interfaces/worlds, values and owned resources. | Semantic compatibility merely because two signatures match. |
| WASI | Standard capability interfaces for supported host facilities. | Which specific user's resources a plugin may access. |
| Extism | Plugin host SDKs/PDKs over core Wasm and an explicit memory/call convention. | It is not another name for WIT or Component Model. |
| Wasmtime | A native engine with Component Model and runtime controls. | Rollback of already committed external effects. |

The [WIT specification](https://github.com/WebAssembly/component-model/blob/585526aa1f2c7f76f07557d16e265dede38b3acb/design/mvp/WIT.md)
and [resource guide](https://component-model.bytecodealliance.org/using-wit-resources.html)
make resource ownership part of an interface. A handle belongs to an owning
instance/store; that does not make it portable to a replacement store. Preserve
host-owned durable identifiers or an explicit snapshot/reconstruction contract
instead of copying opaque handles.

The dated [WASI release record](https://github.com/bytecodealliance/wasi.dev/blob/1fe167069fb999656a2cd645d84a0c1cd335b799/docs/releases/index.md)
lists 0.3 as stable while noting uneven toolchain support; the jco 0.3 shim
remains experimental in this snapshot. Qualify an exact profile of language,
runtime, imports and async/resource features. A project advertising “WASI” does
not prove identical browser and backend support. This experiment deliberately
uses a small synchronous scalar contract and makes no async-WASI claim.

### Options and costs

These scores are engineering judgments for one trusted calculation feature,
not uptime measurements or estimates for an entire platform. Higher complexity
means greater burden. They do not select a production architecture.

| Option | Complexity / 10 | Bounded reliability / 10 | Confidence / 10 | Recommendation |
| --- | ---: | ---: | ---: | --- |
| Native TS contracts and existing composition/lifetimes | 3 | 8 | 9 | First choice for ordinary features; no hard per-call stop inside one shared isolate. |
| TS host plus Worker/process adapter | 5 | 8 | 8 | Use where isolation/termination is actually needed; declare transport and affected scope. |
| TS host plus optional Component Model adapter | 6 | 8 | 8 | Use for a demonstrated multilingual boundary; qualify needed types/imports. |
| Mandatory Wasm for all modules | Not scoped | Not qualified | Not qualified | Adds build, bindings and host obligations to every feature, including UI features with no demonstrated need. |
| Native coordinator with TS SDK | Not scoped | Not qualified | Not qualified | Consider only for measured native custody/runtime benefits; not a prerequisite for multilingual guests. |

Process/RPC is also a real language-neutral path. HashiCorp's pinned
[go-plugin](https://github.com/hashicorp/go-plugin/blob/155dcddc94873a285e14b7fa24b2f6ab6139668e/README.md)
uses explicit interfaces and supports non-Go gRPC implementations. It targets
local reliable communication; it is not a universal distributed execution
guarantee. Prefer the boundary that fits actual dependencies and operations.

For one future pure-calculation component adapter, assuming existing admission
and state owners, the investigator estimates 150–350 production/integration
lines plus 250–500 test/fixture lines. Generated bindings, engines, CI, packaging
and release maintenance are additional. Resourceful async contracts or a new
native host are different projects. No production code was added by this study.

For each new feature, record its actual replacement, continuation or restart
boundary and the owner of retained data/resources. An agent needs the feature's
inputs, outputs, compatible state versions and executable acceptance examples
to propose a bounded change. Inert contributions need no artificial lifecycle
hooks. A concrete reason for a restart-only profile keeps the broad live
evolution vision visible without inventing unsupported mechanics.

## Industry mechanisms worth retaining

These are primary documentation/source observations, not executions of upstream
platforms. Detailed exact paths, versions and inspected regions are retained in
each investigator's source ledger. Transfers below are our architectural
inferences, not new accepted requirements.

| Project and inspected identity | Mechanism or counterexample | Useful consequence |
| --- | --- | --- |
| [Kubernetes 1.37.2](https://github.com/kubernetes/kubernetes/blob/c50e5395f1ae2d4a2c05f28fdcc38c0916cc1a32/pkg/kubelet/kuberuntime/kuberuntime_container.go), [termination contract](https://kubernetes.io/docs/concepts/workloads/pods/pod-termination/) | Pre-stop and ordered shutdown consume the remaining grace budget. API force deletion does not wait for node-side termination confirmation. | Catalog withdrawal and process exit need separate evidence; budget the whole transition. |
| [Envoy 1.40.2](https://github.com/envoyproxy/envoy/blob/b2d89e0ae53916f28770771fbdd49c5c99c5c5a2/source/server/drain_manager_impl.cc) | Separate drain/parent-stop timers; a documented historical race was fixed by publishing the deadline before the draining flag. | Define actual admission behavior and publish a complete decision before readers observe its state. This is a fixed incident, not a current defect claim. |
| [go-plugin 1.8.0](https://github.com/hashicorp/go-plugin/blob/155dcddc94873a285e14b7fa24b2f6ab6139668e/client.go) | Existing process owner attempts graceful RPC closure before force and waits for owned client cleanup. | Reuse the process owner; do not infer external-effect rollback. |
| [Temporal cancellation contract](https://github.com/temporalio/documentation/blob/5f59f68df4084bdb7bbead6ff7384f1418e83a8e/docs/encyclopedia/workflow/cancellation-and-termination.mdx) | Cooperative cancellation differs from closing the workflow execution; activity cancellation depends on delivery/cooperation. | A terminal workflow record is not a physical-stop receipt for all remote effects. |
| [Golem v1.6 update guide](https://learn.golem.cloud/v1.6/how-to-guides/common/golem-update-running-agents) | Automatic replay and snapshot-assisted manual update are distinct; manual update waits behind invocations and uses explicit snapshot save/load. | Preserve a declared continuation boundary and compatibility contract. This versioned documentation was observed on the research date, not an immutable source commit or an executed Golem deployment. |
| [wasmCloud 2.12.2 lifecycle](https://github.com/wasmCloud/wasmCloud/blob/a8da8ac3472144e63a9a534aa428e32239e0ef88/crates/wash-runtime/src/plugin/component_host/lifecycle.rs) | A timed-out bind may keep running; grant authority is revoked and cleanup deferred. Fresh-store recovery replays idempotent bind before queued work. | Timeout, loss of authority and physical completion are distinct; reconstruction needs explicit idempotency. |
| [Extism 1.41.0](https://github.com/extism/extism/blob/051b765bb6abe4fe95d5e4f489f03ad7b137edbc/runtime/src/plugin.rs) | Cancellation requests and reset have concrete runtime semantics; reset invalidates old memory. | A cancel handle is not a stop receipt; retained pointers do not survive reset by implication. |
| [Wasmtime 51](https://github.com/bytecodealliance/wasmtime/blob/32656dc4873fcec5c8662aa937bd01acda3b2e85/crates/wasmtime/src/config.rs) | Fuel/epoch mechanisms interrupt guest execution; blocking host calls and large operations require separate bounds. | A configured engine budget is not a universal wall-clock bound on all host effects. |
| [Spin 4.3](https://github.com/spinframework/spin/blob/83b512fdf5a11783fde1d8546117b672fe9dd46e/src/commands/watch/uppificator.rs) | Watch coordinates builds and child-process restart. | A useful live development loop does not prove production session continuity or compatible state. |
| [Vite implementation](https://github.com/vitejs/vite/blob/3567471998e3da315675086f44368e266c9c0e33/packages/vite/src/shared/hmr.ts) | HMR disposes the old module before the later import completes; import failure can then surface. | Do not transplant development HMR ordering into a production prepare-before-retire guarantee. |
| [VS Code extension service](https://github.com/microsoft/vscode/blob/bfbf12b35b9978b92b2d341e81ade49f2b18c68c/src/vs/workbench/services/extensions/common/abstractExtensionService.ts) | Activated extensions are not generally removable in place; extension-host stop can be vetoed; web and desktop targets differ. | Capability support and execution placement matter even in mature plugin ecosystems. |

The broader [November 17 synthesis](live-plugin-evolution-final-research-and-architecture-2026-11-17.md)
retains OTP, Felix, durable execution, agent-discovery and MCP distinctions.
The [November 18 study](live-application-evolution-vision-and-executed-spikes-2026-11-18.md)
adds actual application extension systems and persistence. Taken together the
evidence supports live evolution as an architectural direction, while showing
several mechanisms and incompatible guarantees rather than one settled
industry-wide hot-swap contract.

The [Component Model async cancellation design](https://github.com/WebAssembly/component-model/blob/585526aa1f2c7f76f07557d16e265dede38b3acb/design/mvp/Concurrency.md#cancellation)
also uses cooperation: a request can precede further guest imports or I/O until
acknowledgement or normal completion. Async interface support is not hard-stop
semantics. This is source evidence; the scalar experiment does not execute it.

## Executed evidence

### Backend: actual HTTP and native Node Workers

Strict TypeScript 7.0.2 and **3/3 native integration cases passed**, with zero
failures, cancellations or skips. Node was 24.22.3, pnpm 11.25.0 and Node types
24.13.3. The observed suite duration was 896.03486 ms; it is not a benchmark.

Failed preparation and denied force left v1 usable. A held HTTP request kept
drain pending; after a real 25 ms deadline the outcome was deferred, new arrivals
received 503 and the old worker still answered a probe. Explicit fixture resume
restored admission. A later drain let the held old request return 17, observed
normal exit 0, then selected v2, which returned 19 for the same input.

Cooperative cancellation reached the exact worker-local AbortController,
settled its task and returned HTTP 409; normal exit preceded v2 selection.
Two cancellation-ignoring tasks remained pending after a real 30 ms deadline.
Denied force changed no state. Permitted force revoked old write authority,
rejected an already-received proposal while the old source was still selected,
awaited native exit 1, settled both requests as interrupted with external
outcome unknown, then selected v2. The prior accepted state value remained 17.

The final oracle asserts no native worker faults, so an unexpected crash cannot
silently substitute for the intended force path. The state fence is local and
single-owner. No distributed lease, database transaction, hostile-code sandbox,
CPU-bound Node cancellation or bounded native-terminate completion promise is
qualified. [Node's termination contract](https://nodejs.org/docs/latest-v24.x/api/worker_threads.html#workerterminate)
supports awaiting final exit; it does not promise application finalizers.

### Browser: actual Chromium and native Web Workers

**One E2E with 31 retained expected/observed comparisons passed** in Chromium
151.0.7922.34 through Playwright 1.62.1. Strict app, worker and harness checks use
TypeScript 7.0.2. v1 first returned 17 while the v2 artifact was absent; v2 was
then compiled. A closed gate rejected a new arrival while two old requests
finished with 17 and 19. The new implementation returned 27 for changed input.

Failed initialization and an incompatible protocol candidate preserved active
selection, revision, admission and committed state. Cooperative cancellation
settled the named task. A force action without a grant changed no state. The allowed
force called native termination after the worker reported entering a CPU loop;
the host settled its pending promises and rejected a real old response already
in its commit inbox. The current implementation returned 50, the same document
and user draft survived, pending work became zero, and both page errors and
post-ready worker faults were empty. The final screenshot was inspected.

The browser reports termination invoked, **not a portable physical-exit or
finalizer receipt**. Its stale-response test qualifies the combined
pending/selection/revision guard, not each predicate independently. Protocol
mismatch ran; a separate browser schema-mismatch case did not. No framework
remount, reload persistence or hostile-script containment is inferred. Earlier
November 18 evidence owns the prior persistence/reload scenarios.

### Component Model: TypeScript and Rust behind one WIT world

**One native E2E passed with 19 recorded comparisons and five specific
rejections**, zero failed, canceled or skipped tests. The exact profile is
Node 24.22.3, TypeScript 7.0.2, Rust 1.100.0, ComponentizeJS 0.23.0, jco 1.42.0,
jco-transpile 0.24.0 and preview2-shim 0.31.1. Component creation and generated
core-Wasm/ESM execution both actually ran. The browser lane remains separate;
this does not qualify browser execution of these components or a native
Component Model API in Node.

The emitted ordinary JS and TS-authored component returned 10,700 for input
10,000. A Rust-authored candidate returned 9,700 and was selected in the same
Node host; after the host input changed to 20,000, new behavior returned 18,700.
A previously captured old callable and its original input still returned
10,700. The application-owned cart and draft survived. This retains a host
operation and old callable; no executing/suspended Wasm stack is migrated.

A separate import-bearing WAT component executed its actual host audit function
with input 10,000. Supplying an empty import object to the same bytes produced
the precise generated-binding initialization TypeError. A compatible typed ABI
with state schema 2 was rejected by the feature's explicit host check. A WIT
string parameter lowered to a two-I32 canonical ABI rejected the one-I32
compiled export; malformed bytes failed interface extraction; ordinary core
`WebAssembly.compile` rejected the Component Model binary version. Missing-import
and schema rejection preserved selected behavior and cart; WIT and malformed-byte
rejection preserved active behavior. The core-API check establishes its binary
format limit. These are five different rejection mechanisms, not one generic
loader failure or five additional native tests.

| Observed final output | Plain emitted JS | Component binary | Generated core Wasm | Generated JS glue |
| --- | ---: | ---: | ---: | ---: |
| TS-authored v1 | 107 bytes | 11,945,632 bytes | 11,945,172 bytes | 97,709 bytes |
| Rust-authored v2 | Not applicable | 457 bytes | 139 bytes | 96,580 bytes |

The component binary and generated deployment files are alternative pipeline
representations, not all necessarily transferred together. Declarations are
also retained. The approximately 12 MB TS component includes a JavaScript
engine; the tiny Rust example implements a deliberately bounded scalar ABI.
These observations are not a general language benchmark, production bundle
budget, compression comparison or throughput/latency result. They do make the
fixed engine/binding cost visible before imposing Wasm on every small feature.

The preceding successful build, before its test failed, produced a TS component
48 bytes smaller from the same guest/build sources. The exact produced artifact
hashes differ. No cause or reproducible-build guarantee is inferred; bind the
actual delivered bytes rather than assuming source identity determines the
binary. The Rust component and generated glue identities remained unchanged
across these two observed builds.

Both final build and runtime module-load receipts show no TypeScript compiler
loaded or rejected on the selected public API paths. The separately invoked
checker/emitter is exactly 7.0.2. The dependency graph still contains a 6.0.3
compiler-API alias used by upstream scaffolding; that unqualified route was not
executed. A load guard rejects an older compiler before evaluation without
rewriting dependencies. This does not certify every upstream CLI/subprocess.

Not qualified: general Rust SDK bindings, strings/resources/async interfaces,
cross-store handle migration, guest teardown, CPU preemption, production
artifact trust, hostile-code containment or external-effect rollback. Rust's
small handwritten scalar ABI is a proof of this interface only. Main TS/Rust
components require no external imports in this profile. Their portability must
be reassessed when a real feature needs host facilities.

## Good patterns and failure patterns

| Retain | Avoid |
| --- | --- |
| Prepare and validate before destructive retirement where resources permit overlap. | Treat a successful file write, module import or registry update as activated readiness. |
| Pin an operation's actual dependency/implementation boundary. | Resolve dependencies afresh midway and silently mix incompatible generations. |
| Close or redirect new admission deliberately; define continuation rules. | Poll an active counter while new calls keep arriving and claim a bounded drain. |
| Correlate cancel requests with observed operation completion. | Treat AbortSignal delivery or a timeout as cleanup. |
| Gate commits at the actual state owner, even for already received results. | Assume changing a router or killing a worker invalidates buffered writes automatically. |
| Keep deadlines, grants and escalation explicit. | Let a timer create force authority or retry an uncertain payment/job. |
| Record actual stop evidence and unresolved effects. | Equate browser termination, Node exit, durable workflow closure and rollback. |
| Keep reusable domain state separate from execution-instance memory. | Copy old engine handles or assume matching WIT signatures imply compatible state. |
| Reconcile persisted desired identity after restart through the existing owner. | Persist only a mutable source path/version label or create a second active catalog. |
| Publish small declared capability profiles and truthful unsupported outcomes. | Require every module to pretend it supports force, migration and arbitrary hot swapping. |

These misuse examples are reasoning counterexamples unless an executed fixture
or pinned historical incident above explicitly demonstrates them. They are not
claims of newly discovered security defects in upstream projects.

## Proposed delivery path and remaining choices

Start with one actual consumer-owned feature whose state and replacement
boundary are understood. Keep ordinary TypeScript composition and native
lifetimes. Add only the modes that the feature can honor, with grants and
observable outcomes. Use a dedicated Worker/process when a separately terminable
execution unit is required; qualify security isolation separately. Add a narrow WIT or process/RPC boundary only for
an actual second-language implementation. Preserve the same domain contract
while the adapter owns its target-specific representation.

For external reuse, qualify two independently authored consumers against the
same bounded behavior, including candidate failure, long work, cancellation,
stale results, restart reconstruction and incompatible state. A production
publication decision and public conformance suite remain separate from these
disposable fixtures. No complete in-application LLM edit/build/admit/activate
loop was executed: the candidates were predetermined trusted source.

The remaining product choices are the ordinary default; which agents receive
which grants; the deadline and possible escalation authorized in advance; the affected
session/dependency/executor scope; state migration and external-effect recovery;
and the first production adapter. These are recorded in OD-003 for discussion,
not filled in by the experiments. Fleet rollout, frontend/backend version skew,
shared database migrations, arbitrary module/UI replacement and a complete
hostile-plugin security model remain separate qualifications.

## Review, provenance and validation

Each lane received root plan review and independent peer criticism. Material
corrections strengthened evidence: the backend checks its revision fence before
old-source selection changes; backend and browser retain post-ready worker
faults; the browser oracle uses real received stale data; and the component's
missing-import control uses the actual generated host-binding contract.
The [review dispositions](plugin-research-review-and-decision-record.md#selectable-updates-and-portable-runtimes-2026-11-21)
retain findings without converting review agreement into architecture adoption.

Original failures remain visible: the local browser could not create a page;
local component dependency installation was interrupted by a network-approval
cancellation; the first hosted component build lacked a WIT filesystem mapping;
the next build passed but its test supplied the wrong host-import object. A
public pinned build-input configuration fixed the first hosted error; a minimal
mapping correction fixed the second. No upstream dependency was patched,
compiler requirement relaxed or behavior assertion removed. The build mapping
is not described as read-only enforcement or a sandbox. The exact input archive
has all three original revisions retained in the research packet.

Final [research workflow 44924688888](https://github.com/agent-teams-ai/extension-foundation/actions/runs/44924688888)
completed both native profiles successfully at input commit
`118e2d226b0daed23e9fdbbbb5c1366da2880ad9`. Its
[frozen input archive](evidence/plugin-update-runtime-input-20261121.tar.gz)
and [input manifest](evidence/plugin-update-runtime-input-20261121.manifest.json)
bind 25 files with archive SHA-256
`b7b6058e4d0d8b95634ee722d272353ab3591ec581f2459b672ea77a37f3b34f`.
The [workflow](../../.github/workflows/plugin-update-runtime-spikes.yml) uses
isolated read-only repository access, exact locks and reviewed action/toolchain
identities. Its different profile-specific setup steps are conditional; the
actual frontend and component tests both ran. Report-only commits do not rerun
unchanged experimental inputs.

The complete [research and execution packet](evidence/plugin-update-runtimes-20261121.parts.json)
and [member manifest](evidence/plugin-update-runtimes-20261121.manifest.json)
retain plans, ledgers, strict source, local diagnostics, exact original hosted
ZIPs, selected decoded results, screenshots and independent reviews. Large
generated engine/core binaries and glue remain inside their original ZIPs,
avoiding a second extracted copy in the packet. License/notice provenance for
retained generated engine artifacts is included; this is not an exhaustive
license-clearance or reproducible-engine-build claim. Installed dependency
trees and copied upstream implementation trees are excluded.

The packet is delivered as two binary parts because the connected GitHub
transport limits each request body to 16 MiB. The linked parts index lists their
order, sizes and hashes. Concatenating them reconstructs the exact reviewed
gzip archive with SHA-256 `873a2c7aa48d49211a3d93a2a11d886a8cd46062283c875b4240494fb4e9a184`;
its members and original member manifest are unchanged. Verify that digest
before extraction. The final delivery record distinguishes the archived reviewed
report from this subsequent storage-link clarification.

Actual handwritten TypeScript is **1,059 lines**: backend 371, browser 387,
component hosted fixture 261 and its separate local diagnostic 40. Additional
source is 17 Rust, 12 WIT and 18 WAT lines. Production/integration into a real
product is zero. The original TS estimate was 1,050–1,510 lines; generated
output, dependencies, configuration, workflow bootstrap and prose are separate.
This is measured investigation cost, not a platform implementation quote.

The [delivery validation](evidence/plugin-update-runtimes-20261121.validation.json)
records exact documentation identities, archive custody and the completed
standalone Docs Protocol result. Final source publication and completed hosted
checks are recorded in existing [Draft PR 55](https://github.com/agent-teams-ai/extension-foundation/pull/55).
The unchanged general local Foundation route remains unexecuted because it
would initialize its embedded TypeScript 5.9.3; required hosted checks keep their
separate unchanged role. No dependency pin or required check is weakened.
Earlier November 14, November 17 and November 18 evidence remains unchanged.
The validation file and its archive review are intentionally outside the frozen
packet, avoiding a circular rebuild.
