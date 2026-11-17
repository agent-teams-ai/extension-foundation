---
id: research.live-plugin-final-study
type: research
status: active
owner: architecture
summary: Final implementation-backed synthesis of live evolution, portable ownership, continuity limits and qualification choices.
---

# Live Plugin Evolution Final Research And Architecture 2026-11-17

## Scope and authority

<!-- cspell:words Golem wasmCloud Restate Erlang OSGi Felix relup appup gen_server RcRef ScopedRef Wasmtime wasmcloud TTL xDS RDS MCP ESM WASI WIT replayed replayable quiescence binders rollback deduplication deduplicate Liskov -->

Observation: **2026-11-17, Europe/Kiev**. The owner requested the findings in
plain language and an even deeper final study of universally reusable live
extension mechanisms. This report adds new implementation and contract evidence
to the [ten-case portable mechanism study](portable-live-plugin-mechanisms-and-library-design-2026-11-17.md).
It is the current decision-oriented synthesis; the earlier reports and immutable
experiment packets remain available through the [research reference](plugin-system-research-reference.md).

The [owner's all-category live vision and portability direction](../open-decisions/OD-003-module-runtime-and-public-spi-choices.md)
remain high priority. **Whether an ordinary update may interrupt healthy current
work remains OPEN.** This research does not adopt a default wait, cancellation,
pause, migration or timeout policy. It does not create a public SPI, publish a
package, select a new runtime, change accepted decisions or authorize a merge.

Evidence labels used below:

- **Contract:** an official specification or documented behavior.
- **Source:** an inspected implementation at the identified commit or release.
- **Inference:** our architectural conclusion, not an upstream guarantee.
- **Proposed check:** a future falsifier, not a test run in this study.

Three specialist lanes and root research cover mature runtimes, durable
execution and routing, JavaScript and MCP boundaries, and current Wasm agent
platforms. The [evidence packet](evidence/live-plugin-final-study-20261117.tar.gz)
and [manifest](evidence/live-plugin-final-study-20261117.manifest.json) retain
the detailed reports, source ledgers and review dispositions. No new runtime
experiment or load benchmark was executed. Documentation validation is recorded
separately in the [delivery receipt](evidence/live-plugin-final-study-20261117.validation.json).

## Findings for the owner

**The direction is real and useful. The reusable opportunity is a precise
mechanism for changing selected implementations while accounting for their
work, resources and state.** Existing systems already implement important parts
of that behavior. The strongest architecture combines their proven primitives
with application-owned extension contracts and explicit guarantees.

The deeper research changes the design discussion in five concrete ways:

1. **A live application, a live operation and preserved state are different
   promises.** OTP can change module code inside a running VM; Golem can restart
   and replay an agent; a deployment router can preserve old requests on old
   workers. These are useful alternatives with different prerequisites.
2. **A tool catalog snapshot does not pin a remote implementation.** Current
   MCP discovery and cache invalidation help clients learn about changes. They
   do not, by themselves, bind a subsequent invocation to the version whose
   schema the model saw.
3. **Keeping old code alive does not version its database.** Restate explicitly
   preserves object state across code versions. Temporal continuation preserves
   a logical workflow identity while starting a new run. State compatibility
   and business deduplication remain separate responsibilities.
4. **Successful update completion is weaker than useful readiness.** OSGi can
   complete refresh after errors. A timeout can return while a Wasm lifecycle
   callback is still running. The adapter must report the fact actually observed.
5. **An external library need not own a second platform.** Get Modular already
   owns composition and an optional private lifecycle candidate; Effect already
   owns native resources. First determine the residual shared algorithm. A
   qualified integration recipe may be sufficient; a new package is warranted
   only if a real shared responsibility remains.

These conclusions are supported in the implementation sections below. The
recommendation is to preserve portable boundaries now and qualify one useful
profile with a real consumer plus an ordinary external consumer in the same
delivery. The first shared implementation should already be independently
usable; product-specific copies should not be incubated for later extraction.

## What the trend actually consists of

The evidence supports a convergence of several developments, rather than one
industry-wide universal plugin standard. This is an inference from the inspected
systems, not a market-share forecast or proof that every project is adopting it.

| Direction | Present evidence | Maturity and practical implication |
| --- | --- | --- |
| Replacing code behind an explicit boundary | OTP release handling, OSGi refresh, process and request routing | Mature mechanisms exist, each with its own state and lifecycle constraints. |
| Updating agent capabilities during operation | OpenCode, Letta, Pi and MCP dynamic discovery in the preceding study | Concrete implementations exist; discovery, local capture and actual execution affinity differ. |
| Updating a durable agent's code and recovering its state | Golem 1.6.3 automatic replay and manual snapshots; Temporal versioned runs | Stronger continuity requires an owned history/checkpoint model and compatible effects. |
| Portable executable components and host capabilities | Wasm Component Model, wasmCloud 2.12.1 and the earlier Extism study | Typed imports and bounded instances are useful; backend and plugin-category limits still matter. |
| A reusable mechanism with optional integrations | Existing lifecycle, resource, routing and loader libraries | Reuse is credible. A single framework encompassing every product and state model is not established by this sample. |

Agent-authored changes increase how often candidates appear and how likely they
are to overlap. The architectural consequence is stronger candidate identity,
validation, bounded pending work and stale-result rejection. Agent authorship
does not grant permission to change the owner's authority or bypass executable
admission. This conclusion uses the existing owner model, not a new approval
system for every update.

## Replace the hot-reload boolean with a declared promise

The following are analytical profiles, not proposed public enum values or an
ordered certification ladder. A component may support several, and some are
mutually exclusive for a given operation.

| Promise | What changes | What must be established | Typical boundary |
| --- | --- | --- | --- |
| Fresh discovery | Descriptors, instructions or available names | Cache scope, freshness and visibility rules | Next discovery or model request |
| New-call replacement | New operations select a prepared implementation | Protected admission and selection, compatible contract | Request, message or explicit call |
| Retained old work | Existing admitted work retains the required resources | Scoped ownership through completion or another selected policy boundary | Whole call, stream or session |
| Checkpoint continuation | A logical operation continues on new code from explicit state | Compatible snapshot/history, durable identity, effect semantics | Named checkpoint or new run |
| Container replacement | A worker/process/host restarts while its surrounding application remains available | Readiness, routing, shutdown and failure observation | Execution container |
| In-place code conversion | Running runtime-managed state changes code | Runtime support, explicit safe points and state conversion | Qualified VM/process mechanism |

For pure descriptors, manufacturing start/stop hooks adds no value. For streams,
retaining a handle until the function returns is too short; resources may be
needed until consumption and finalization. For a device, terminal or exclusive
connection, parallel candidate acquisition may be impossible. For a renderer,
editing state and DOM ownership belong to the renderer and consuming feature.
The [previous walkthroughs](portable-live-plugin-mechanisms-and-library-design-2026-11-17.md#three-consumer-walkthroughs)
remain applicable, with the remote-MCP qualification added below.

**All plugin categories should be designed for explicit evolution.** That vision
does not require every backend to claim the same uninterrupted-operation or
state-migration guarantee. An unsupported promise should be rejected or routed
through an explicitly selected restart/handoff profile, not represented as a
successful no-op.

## Implementation evidence that changes the design

### Golem: changing a durable agent through replay or snapshots

**Source and contract.** Release **1.6.3**, commit
`b277b3ddfbcf02cf52b921e9c41f5816bbd55de7`, supports two different update modes.
Automatic mode queues an update and requests restart for a running agent.
Manual mode queues a special invocation that saves state at an invocation
boundary. The lifecycle implementation confirms that this timing difference is
real, not just CLI terminology. [Update implementation][golem-lifecycle];
[versioned guide][golem-guide].

Automatic recovery can use a compatible snapshot plus a history suffix or
replay from the authoritative baseline. The source separates the admitted
request identity from the later selected recovery strategy. The choice between
assisted and full replay is persisted. A snapshot-assisted selection additionally
binds source revision and its start identity and rejects a stale source before
instantiation; the plain automatic strategy records the target revision without
those assisted-source fields. Restart reconstructs the persisted choice instead
of silently selecting another strategy. [Selection implementation][golem-selection].

Manual updates require a source snapshot that the target can actually load.
Filesystem state is a separate input; conflicting initial-file changes can
reject an update. The versioned guide also records a current Go manual-update
limitation. [Versioned update guide][golem-guide]. This is strong evidence for
explicit migration contracts, not a
promise to transplant arbitrary stacks or every language's runtime state.
[Updating agents][golem-updating]; [revision preparation][golem-revision].

**Inference.** This is a particularly relevant precedent for agent-authored
evolution: preserve the logical identity, choose a supported recovery boundary,
validate the target against retained state, and only then resume live effects.
Use an existing durable owner when that behavior is required. Recreating its
history engine inside a general TypeScript plugin library would substantially
expand the product and duplicate responsibility.

The server uses **Business Source License 1.1**, with an additional use grant
and restrictions for certain hosted developer-platform services. It is a
source-available reference, not a permissively licensed library to copy into
our neutral package. This study makes no license-adoption decision.
[Exact release license][golem-license].

### OTP: VM support still needs admission and state boundaries

**Contract.** OTP maintains current and old module code and provides explicit
code-change and release procedures. Its VM semantics are stronger than ordinary
JavaScript module caching, but release handling still warns about dependency
ordering and new processes appearing during an upgrade. [Code loading][otp-loading];
[release handling][otp-release].

**Source.** In **OTP 29.1.2**, `release_handler_1` discovers processes and retains
those it successfully suspends. That observed set is not a barrier preventing
new work. Conversion visits processes sequentially; successful conversions and
external callback effects are not automatically rolled back when another
conversion fails. The checker and installer can both evaluate instructions
before `point_of_no_return`, including user `apply` instructions.
[Pinned interpreter][otp-engine].

**Inference.** Preparation must have a stated effect and retry contract. A
candidate's setup may acquire resources; an application migration may write
state. Neither should be treated as pure because its method is called check or
prepare. Likewise, enumerating active calls is weaker than atomically sealing
the admission path. These distinctions apply even with single-threaded async
JavaScript because awaited phases can interleave.

The transferable design is a named operation boundary and scoped ownership.
Adopting a BEAM-style runtime would be a separate architectural choice, not a
small implementation detail of a portable JavaScript library.

### OSGi and Felix: completion, readiness and rollback are different facts

**Contract.** OSGi refresh computes an affected dependency closure, stops and
re-resolves bundles, and attempts restart asynchronously. It can emit errors
and leave bundles unresolvable before announcing `PACKAGES_REFRESHED`.
Declarative Services also gives activation, bind, modified and unbind callbacks
different failure semantics. One completion event is not a readiness oracle.
[Framework wiring][osgi-wiring]; [DS 1.5][osgi-ds].

**Source.** Released **Felix Framework 8.0.0** stops an active bundle before
revising it. Restoring a previous revision can reconstruct the old service;
the former live instance has already stopped. Reentrant update while STOPPING
or actively STARTING is rejected, with an explicit exception for supported lazy
activation. Released SCR 2.3.0 serializes competing dynamic binding
candidates and checks their continued identity. [Framework implementation][felix-core];
[dependency manager][felix-dependencies].

**Contract.** A failed `BundleActivator.start` does not receive `stop`; partial
acquisition needs its own cleanup. Framework 8 deliberately removes the OSGi
Security Manager layer while keeping permission API types available. These
documented facts demonstrate that lifecycle names and type compatibility are
insufficient to establish cleanup or enforcement guarantees.
[Lifecycle specification][osgi-lifecycle]; [Framework 8 upgrade][felix-upgrade].

**Inference.** Register cleanup while acquiring each resource. Prepare ownership
before exposing a service, because callbacks can reenter the system. A runtime
adapter should state which postcondition it actually establishes. Existing
kernel identity checks and native resource scopes are appropriate reusable
pieces; a second dependency resolver or generic service container is not.

### Temporal and Restate: execution affinity does not solve every state change

**Contract.** Current Temporal documentation still marks upgrade on
Continue-as-New as a **Public Preview** SDK option. An individual run remains
pinned; the continuation starts another run on the selected version. The
entity-workflow guidance separately requires preserving needed application
deduplication across runs, because Update IDs are scoped to an execution.
[Version upgrade][temporal-upgrade]; [entity workflow][temporal-entity].

**Contract and source.** Restate's immutable endpoint model keeps retries of an
invocation on its selected deployment. Its replay implementation carries both
deployment and protocol information from the journal. The documentation warns
that Virtual Object state persists across versions and therefore requires
schema compatibility. An unchanged endpoint name is not proof that the bytes
behind it remained unchanged. [Versioning guide][restate-versioning];
[release 1.8.1 invocation implementation][restate-invocation].

**Source.** Restate's CLI checks drainage before deletion, but then invokes a
forced server deletion; that server route only supports forced deletion. This
is a layered operation observed in source, not an executed race or an upstream
defect claim. A generic adapter must not turn an earlier status query into a
claim of atomic retirement. [CLI removal][restate-remove]; [admin route][restate-admin].

**Inference.** Keep logical business operation, execution attempt, selected
implementation and state schema distinct. Retrying an operation across an
update must preserve its required deduplication facts. Old and new code sharing
one database need directional compatibility or an explicit transition. The
neutral lifetime mechanism should consume these conditions from the existing
state/workflow owner; it should not become another workflow engine or migrator.
Restate's inspected server is also BSL 1.1; library adoption is not implied.
[Exact server license][restate-license].

### Envoy: request coherence has a smaller scope than global cutover

**Source.** In released **Envoy 1.40.2**, RDS publication schedules thread-local
configuration replacements. HTTP streams capture a route-configuration
snapshot, while explicit refresh paths can replace it at a defined point.
Per-stream coherence, per-thread visibility and system-wide propagation are
different observations. [RDS publication][envoy-publication];
[stream implementation][envoy-stream].

**Contract and source.** xDS ACK/NACK and warming manage configuration delivery
and acceptance; they are not a transaction spanning every dependency, worker
and application operation. The inspected RDS code logs some after-warming
publication-hook failures rather than converting them into a rejected update.
[Versioned protocol][envoy-protocol]; [subscription source][envoy-subscription].

**Inference.** Define exactly what one successful selection means. A single
JavaScript owner can publish one coherent reference for its new operations.
That claim does not extend automatically to every worker, process, UI renderer
or remote executor. Distributed propagation belongs to the existing rollout
owner, with its own observed progress and failure semantics.

### MCP: freshness and a frozen client list are insufficient for remote pinning

**Contract.** The **2026-07-28** tools protocol supports changing tool lists and
notifications. Its standard invocation parameters do not include an expected
tool implementation revision. Caching explicitly treats TTL as a hint, allows
underlying data to change earlier and provides no cross-page snapshot guarantee.
Private cache entries are scoped to the authorization context.
[Tools specification][mcp-tools]; [request schema][mcp-schema];
[caching specification][mcp-cache].

**Inference.** Freezing the client's descriptors and callable client objects can
prevent local registry mixing, but the client object may still call a mutable
remote endpoint. A stronger promise requires a server-owned generation-affine
endpoint or an explicit versioned invocation contract. If the server does not
support that, the adapter must describe its weaker behavior and use declared
refresh, rejection or replanning semantics. Re-fetching may reduce staleness;
it cannot manufacture an atomic snapshot during continuous changes.

An invocation can also be authorized differently after discovery. Retained
schema, a cached result or a resource handle does not override current grants.
Stateful handles need an explicit owner, scope, expiry and permission checks.
This is a material qualification to the preceding study's captured
descriptor/executor recommendation: that recommendation must be enforced at
the actual execution boundary, not assumed from a local proxy.

The specialist lane retains an additional **unexecuted falsifier** in current
TypeScript SDK source: a mutable registered tool can be read before awaited
validation and accessed again afterward. That inspection motivates testing a
mutation during validation. It is not presented as a reproduced SDK defect or
a reason to replace the official SDK. [Inspected SDK implementation][mcp-sdk];
[inspected sequential tests][mcp-sdk-tests].

### Node: fresh imports, old closures and resource retirement have separate lives

**Contract and source.** Node ESM caches by module identity and has no CommonJS
`require.cache` entry through which ESM can be generally unloaded. Giving a root
module a different query can create a new root identity; ordinary relative
imports still resolve to their own URLs and may retain cached dependencies.
The pinned **26.13.1** loader and resolver support this distinction.
[ESM documentation][node-esm]; [resolver][node-resolver].

**Inference.** A reload candidate needs a qualified executable closure. A changed
root URL alone does not establish that every transitive module, singleton and
native resource belongs to the new generation. Existing function references
also remain references to the objects that created them. A loader, immutable
bundle or execution-container boundary should own the supported closure; the
neutral mechanism should not invent a parallel package resolver.

**Contract.** Worker termination observes a worker's exit, not an arbitrary
application's graceful completion or reversal of remote effects. Native addons
also need the appropriate multi-environment and cleanup support.
[Worker documentation][node-worker]; [addon documentation][node-addon].

**Inference.** A worker can be useful for reclaiming an execution container under
sustained update churn. It does not supply a universal state migration or hostile
isolation promise. Backpressure must bound pending candidates and retained
generations without quietly selecting cancellation of healthy old work.

### wasmCloud: useful typed boundaries and explicit category limits

**Contract.** Current **v2** documentation separates native host plugins,
Wasm host component plugins and workloads. Host component plugins are loaded
once when the host starts; the guide explicitly says dynamic reload is not
available. The older **v1** development-loop page's component update behavior
must not be transferred to this v2 host-plugin category.
[Host component plugins][wasmcloud-plugins]; [v1 development update][wasmcloud-v1].

**Source.** In release **2.12.1**, a workload-call handle captures a target route
and deployment generation, then checks that generation again when called. A
handle surviving redeploy does not revive the old component merely because the
logical workload ID is reused. This is useful positive evidence for separating
identity, retained objects and current liveness. [Call implementation][wasmcloud-call].

The same release's lifecycle code documents that a bind timeout can fail the
deployment while a hook that cannot be cancelled continues. Unbind is deferred until
the hook replies or store teardown drops that reply, so its late state can be
reclaimed under the owning lifecycle. Supervised plugin
restart replays binding hooks before serving queued calls, requiring idempotent
hooks. Cleanup bookkeeping retains the owning reservation and resources and
checks that later recovery still owns them. These are inspected mechanisms,
not a reproduced failure or proof that arbitrary cleanup always terminates.
[Lifecycle source][wasmcloud-lifecycle]; [cleanup source][wasmcloud-cleanup].

**Inference.** An adapter may report that the caller's wait ended while cleanup
remains outstanding. It must not report physical absence from that timeout.
One existing custody owner should retain and retry the debt if its profile
requires it. Do not copy the whole Rust host into our library to obtain these
principles. This released platform is Apache-2.0; deployment and integration
qualification would still be separate work.

## Architecture recommendation: one owner per invariant

This section is a proposal for discussion and qualification. It names
responsibilities, not an instruction to create one package or interface per row.

| Responsibility | Existing or intended owner | Boundary of reusable code |
| --- | --- | --- |
| Neutral declarations, graph validation and immutable composition | Get Modular Core/Assembly | Reuse the compiled cohort; no second graph compiler or mutable service locator. |
| Candidate executable identity and admission | Existing artifact/loader and consuming authority | Accept an already admitted factory/container and its actual guarantees. |
| Selection, invocation permission and update policy | One existing consumer Host/application owner | A reusable algorithm runs as that owner's implementation; it does not advance an independent active head. |
| Phase/call/custody bookkeeping | Existing qualified kernel where applicable | Subtract existing implementation before adding another counter or transition ledger. |
| Resource acquisition and finalization | Native Effect scopes or the selected ordinary execution owner | Bind acquisition to cleanup and expose the observed lifetime facts. |
| Tool, renderer, provider or business API | Consuming feature | Narrow capability contracts; no universal plugin object containing every category. |
| Durable identity, state migration, effect recovery | Existing business/state/workflow owner | Optional integration consumes its contract; no duplicate database or workflow coordinator. |
| Worker/process/Wasm lifecycle | Qualified execution adapter and existing custody owner | Reuse suitable execution/RPC libraries; describe isolation and exit precisely. |

The current Get Modular main was rechecked at
`33c032f829028967825428bc6b049ed6db1c56b2`; it is unchanged from the preceding
study. The lifecycle candidate still has **`private: true`**. It is available for
its admitted internal use, not an installable public npm contract. A recipe for
ordinary outside users must use released entrypoints or an explicitly qualified
packed candidate; private deep imports do not establish portability.
[Kernel package][gm-kernel-package]; [kernel implementation][gm-kernel].

### Why this is Clean Architecture, SOLID and DRY in practice

**Clean Architecture / dependency inversion.** Application policy asks for a
capability and required guarantee. The edge supplies the loader, resource runtime
and execution adapter. Neither a neutral library nor business code needs an
Agent Teams catalog, database schema or provider SDK merely to express the
replacement invariant. An explicit EF-admission consumer continues to use its
accepted OCI/trust profile; neutrality is not an alternate admission route.

**Single responsibility.** A component should change for one owner and one
reason. A registry that also downloads packages, grants permissions, migrates
SQL, schedules agent turns and kills processes combines unrelated authority.
Keep those owners and connect the few required operations at the composition
edge. This does not require ceremonial domain entities or identical mapper
layers around simple data.

**Open/Closed and interface segregation.** Add a real execution integration
behind the capability it can implement. A descriptor contribution should not
implement a fictitious shutdown method. A stateful provider should not pretend
to satisfy a stateless replacement contract. Common code should depend only on
the operations the selected profile actually uses.

**Liskov substitution.** Matching TypeScript signatures is insufficient. If one
adapter's close means request accepted and another's means observed exit,
substituting them under the same stronger promise is incorrect. Distinguish
capabilities or observations and reject an adapter unable to meet the required
postcondition. The OSGi/Felix enforcement transition makes this concrete.

**DRY.** Reuse one authoritative graph rule, transition, grant and state schema.
Do not recreate reference counting already owned by native resources or the
qualified kernel. Conversely, do not force UI unmount, workflow continuation
and process exit into one implementation merely because each is named stop.
Similar code shape does not establish a shared semantic contract.

**Modularity.** Ordinary outside users should be able to exercise the mechanism
without our product types or credentials. Get Modular can remain optional for
a consumer that already supplies a factory and needs no graph compilation.
Effect can be an explicit integration for applications using it. Package
placement follows the proven semantic owner; a separate repository is not a
prerequisite for an independent library.

## Required consistency boundaries

### Protect acquisition across selection and retirement

The existing owner needs one protected action that selects a generation,
admits the operation and retains the resources required by that operation.
If acquiring the retention suspends, use the owner's existing reservation and
revalidation mechanism. Reading current, awaiting a borrow and then invoking
without revalidation leaves a retirement window.

That acquisition binds the input/output capability contract and actual executor
for its
declared boundary. For a local cohort, the descriptor and executor can share one
immutable binding. For remote MCP, the guarantee must reach the server as
described above. A captured client closure alone is insufficient.

A local atomic publication is scoped to one owner. Another process can observe
the change later. Propagation should retain truthful per-owner observations;
a broad distributed transaction should not be added to a library whose real
consumer needs only local request consistency.

### Keep dependent changes coherent without making the whole graph mutable

Changing provider B can affect consumers that captured B during construction.
An immutable graph remains useful: compile a new coherent cohort and select it
at a declared boundary. Decide which dependencies intentionally remain stable
outside that cohort and which must be reconstructed together. Reuse Get Modular
for that composition knowledge; a live registry must not silently rebuild a
different graph using its own resolver rules.

Holding a generation should cover the required execution closure, including
callbacks, streams and relevant resources. It does not freeze a shared database,
remote service, mutable configuration object or permission grant. Those require
their owning compatibility or authority checks.

### State compatibility is directional and the update has a recovery limit

| Question | Separate fact needed |
| --- | --- |
| Can new code read existing state? | A forward compatibility or migration rule tested on source-produced state. |
| Can old retained code read state written by new code? | A backward compatibility rule, separate from the first one. |
| Can an old invocation safely write after selection changes? | Existing transaction/authority contract; an object reference alone is insufficient. |
| Can a failed update return to old code? | Whether old resources survived, must be reconstructed or cannot be reacquired. |
| Can business effects be undone? | A domain-specific compensation/reconciliation contract, when one exists. |
| Can retry cross a checkpoint without duplicating work? | Stable logical operation identity and retained deduplication facts. |

A preparation failure before publication is different from a failure after new
code has written canonical state. The latter may require a forward repair or
an explicit restore/reconciliation procedure. Calling both rollback conceals a
material difference. Do not put arbitrary migration callbacks under an
advertised generic transaction that cannot reverse their effects.

### Bound churn and make self-update non-reentrant

An agent may propose several updates before the first one finishes. Candidate
revision and operation identity must prevent a late older preparation from
overwriting a newer selection. Pending candidates may be coalesced if the owner
allows it; already published work and resource debt cannot simply be forgotten.

The resource envelope must account for the active generation, any retained old
generations, pending acquisitions, module-cache retention and cleanup debt.
When that envelope is exhausted, deferral, rejection or another explicitly
selected action is needed. A hidden deadline that cancels healthy work would
silently resolve the still-open interruption policy.

Self-update should hand scheduling to the existing owner and return an
appropriate receipt. It must not wait inside its own old invocation for that
invocation to drain. Receipt durability is required only when the selected
recovery profile needs it. An in-memory library should not require a durable
workflow platform merely to schedule the next boundary.

## How Effect fits

The accepted native Effect application direction remains useful. The current
`@get-modular/effect` integration supplies native Layers and resource-owning
factories; a fresh composition can be acquired under its own scope. It does not
rewrite previously acquired dependencies or supply a complete live-selection
protocol. [Integration README][gm-effect].

The retained [four real-resource scenarios](live-plugin-evolution-vision-and-evidence-2026-11-14.md)
already distinguish `ScopedRef` replacement from scoped `RcRef` retention. They
are historical executed evidence, not tests repeated in this follow-up.

**New source qualification:** in inspected Effect **4.1.4**, omitted
`idleTimeToLive` and finite TTL, including zero, have different finalization
observations. When `idleTimeToLive` is omitted, or after invalidation, the final borrower's
release awaits cleanup. Finite TTL schedules cleanup separately for a resource
that has not been invalidated. The owning scope remains another lifetime
boundary. A generic release receipt must
not promise observed resource cleanup from a scope release under every
configuration. [RcRef public contract][effect-rcref]; [implementation][effect-rcref-internal].

Use native scopes, interruption, causes and concurrency where the application
already uses Effect. Keep the public neutral boundary smaller than Effect's
entire runtime if ordinary external consumers are an intended audience. Do not
build a second general resource runtime to hide Effect, or migrate an unrelated
consumer merely to use a small common mechanism.

## Options, cost and recommendation

These are alternative paths, not additive phases that all need implementation.
The earlier estimates remain conditional planning judgments for one trusted
in-process cohort and one JavaScript execution agent. **P** is new shared
production mechanism, **I** new code for one consumer integration, and **T** new
tests/external fixtures. Existing reused code is excluded; modified existing
LOC is unmeasured, not assumed zero.

| Option | P / I / T, new LOC | Fit and recommendation |
| --- | --- | --- |
| Existing primitives with a qualified recipe | 0 / 150–350 / 350–750 | First determine whether this is the complete useful result. No package is needed if no shared algorithm remains. |
| Residual neutral coordination with one ordinary implementation | 400–900 / 150–350 / 900–1,800 | Strong candidate if materially different consumers need the same invariant. Preserve one existing authority. |
| Native Effect coordination | 200–500 / 120–300 / 700–1,400 | Useful for the accepted Effect application; keep native semantics and explicit external-consumer coupling. |
| A complete framework/runtime | Not responsibly estimated | Compare only for a need that justifies its platform, deployment and migration cost. |

These bands exclude artifact admission, a new loader, distributed publication,
state migration, hostile-code isolation, broad UI behavior, release tooling and
documentation. The additional MCP, state and callback findings must be scoped
before any implementation promise; the numbers are not a quote for solving all
of them. We did not measure new delivery cost in this research.

The retained judgment scores are **confidence 6/10, complexity 5/10 for the
bounded native Effect path**, and **confidence 5/10, complexity 6/10 for the
ordinary coordination path**. Achievable reliability was judged **8/10 after
conformance for those same bounded invariants**. These scores are not measured
availability, security, failure probability or a ranking of whole platforms.

**Recommendation:** retain the portable mechanism direction; compare a qualified
recipe with the smallest demonstrated residual implementation. Use the native
Effect path for the already accepted application where it fits. Require the
same shared delivery to exercise an ordinary external consumer. A separate
neutral package remains an outcome of that comparison, not a prerequisite or
a reason to duplicate the private kernel.

## Concrete next qualification slice

This is a proposed plan, not work claimed complete by the current study. The
accepted interactive provider direction is not reopened. Choose the additional
shared-library acceptance scenario around an already owned useful operation.

An external example can be a document server changing its renderer while a
previous render still owns a real file/resource. It should have its own contract,
entrypoint and assertions, without agent-session types, organization credentials
or an EF catalog. It is a proposed conformance consumer, not a claimed adopter.
Use released package entrypoints or an explicitly admitted packed candidate.

| Decisive scenario | Independently observed result |
| --- | --- |
| Candidate acquires one real resource, then fails | Partial resource cleanup and actual old-selection status are both known. |
| An older preparation finishes after a newer selected revision | Stale publication is rejected; its cleanup cannot clear the newer binding. |
| Admission races with retirement | No operation is accepted without its required generation and resource retention. |
| A call returns a stream before the stream finishes | Required resources remain owned for the declared consumption lifetime. |
| A model sees one schema while the remote MCP server changes | The supported server contract preserves the promised revision or reports the declared weaker outcome. |
| Setup or a binding callback requests another update | Reentrancy has a declared result and cannot deadlock on its own drain. |
| A callback times out and completes later | The caller's result and outstanding cleanup remain distinct; late cleanup affects only its owner. |
| A logical command retries across a checkpoint/new run | Needed deduplication survives and external effects follow the existing contract. |
| New code writes state while old work remains | The actual selected compatibility protocol preserves invariants or rejects unsafe access. |
| An adapter cannot meet the required guarantee | It is rejected rather than returning misleading success through a compatible signature. |

Select only the rows needed by the chosen profile; this is not a mandate for a
new universal test platform. Existing valid native resource and packed-consumer
evidence should be reused when its exact inputs and guarantees apply. Add
worker/process, exclusive-resource or UI cases when those profiles are actually
selected.

The ordinary library fixture and the stronger independent implementation
requirements for a stable public extension SPI remain different gates. A useful
public library should not be blocked by inventing a universal SPI first; a
passing small library fixture must not be promoted into stable SPI approval.

## Final position and delivery boundary

The important vision is now concrete: **extensions evolve during application
operation through explicit generation, capability and state boundaries, with
portable mechanism code and consumer-owned policy.** This leaves room for
agent-authored additions, prepared replacement, checkpoint continuation and
qualified execution containers without requiring every project to adopt one
framework.

The remaining product question is deliberately preserved: may an ordinary
update interrupt healthy current work? The first shared implementation/profile,
its package owner and public compatibility promise also remain choices in
[OD-003](../open-decisions/OD-003-module-runtime-and-public-spi-choices.md).
The research provides evidence and a falsifiable direction; it does not turn
those choices into accepted decisions.

Two bounded independent review rounds and their material corrections are
retained in the [review record](plugin-research-review-and-decision-record.md#final-live-evolution-review-2026-11-17)
and evidence packet. This delivery changes research, navigation and discussion
records only. It adds **zero production/integration runtime code**, changes no
dependency pins or accepted ADRs, and leaves the existing research PR as Draft.
Passing documentation/CI gates validates this delivery, not a universal live
plugin runtime or a production capacity claim.

## Primary source navigation

The archive's ledgers contain exact retrieved paths, symbols, commit/blob
identities, source classes and limitations. The links below support the main
findings without reproducing upstream implementation or specification text.

[golem-lifecycle]: https://github.com/golemcloud/golem/blob/b277b3ddfbcf02cf52b921e9c41f5816bbd55de7/golem-worker-executor/src/worker/lifecycle/mod.rs
[golem-guide]: https://github.com/golemcloud/golem/blob/b277b3ddfbcf02cf52b921e9c41f5816bbd55de7/docs/src/content/v1.6/how-to-guides/common/golem-update-running-agents.mdx
[golem-selection]: https://github.com/golemcloud/golem/blob/b277b3ddfbcf02cf52b921e9c41f5816bbd55de7/golem-worker-executor/src/worker/snapshot_selection/mod.rs
[golem-updating]: https://github.com/golemcloud/golem/blob/b277b3ddfbcf02cf52b921e9c41f5816bbd55de7/docs/src/content/v1.6/develop/updating.mdx
[golem-revision]: https://github.com/golemcloud/golem/blob/b277b3ddfbcf02cf52b921e9c41f5816bbd55de7/golem-worker-executor/src/durable_host/revision_update.rs
[golem-license]: https://github.com/golemcloud/golem/blob/b277b3ddfbcf02cf52b921e9c41f5816bbd55de7/LICENSE
[otp-loading]: https://www.erlang.org/doc/system/code_loading.html
[otp-release]: https://www.erlang.org/doc/system/release_handling.html
[otp-engine]: https://github.com/erlang/otp/blob/d199a49a01a2079afb6f2c5c9ae047cd4555e68d/lib/sasl/src/release_handler_1.erl
[osgi-wiring]: https://docs.osgi.org/javadoc/osgi.core/8.0.0/org/osgi/framework/wiring/FrameworkWiring.html
[osgi-ds]: https://docs.osgi.org/specification/osgi.cmpn/8.1.0/service.component.html
[osgi-lifecycle]: https://docs.osgi.org/specification/osgi.core/8.0.0/framework.lifecycle.html
[felix-core]: https://github.com/apache/felix-dev/blob/b1bcadcfefde90bd6ef6f5919dbf626754255f2f/framework/src/main/java/org/apache/felix/framework/Felix.java
[felix-dependencies]: https://github.com/apache/felix-dev/blob/615dd9d623fc7659631aec9e2b6962feeccfefa6/scr/src/main/java/org/apache/felix/scr/impl/manager/DependencyManager.java
[felix-upgrade]: https://felix.apache.org/documentation/subprojects/apache-felix-framework/apache-felix-framework-8-upgrade-guide.html
[temporal-upgrade]: https://github.com/temporalio/documentation/blob/8ae62952028e3f473a163f45cf89e9eda4520d89/docs/production-deployment/worker-deployments/worker-versioning/upgrade-on-continue-as-new.mdx
[temporal-entity]: https://github.com/temporalio/documentation/blob/8ae62952028e3f473a163f45cf89e9eda4520d89/docs/design-patterns/entity-workflow.mdx
[restate-versioning]: https://docs.restate.dev/services/versioning
[restate-invocation]: https://github.com/restatedev/restate/blob/20efb1b83a39b8227451e531c366e067588ae9ee/crates/invoker-impl/src/invocation_task/mod.rs
[restate-remove]: https://github.com/restatedev/restate/blob/20efb1b83a39b8227451e531c366e067588ae9ee/cli/src/commands/deployments/remove.rs
[restate-admin]: https://github.com/restatedev/restate/blob/20efb1b83a39b8227451e531c366e067588ae9ee/crates/admin/src/rest_api/deployments.rs
[restate-license]: https://github.com/restatedev/restate/blob/20efb1b83a39b8227451e531c366e067588ae9ee/LICENSE
[envoy-publication]: https://github.com/envoyproxy/envoy/blob/b2d89e0ae53916f28770771fbdd49c5c99c5c5a2/source/common/rds/rds_route_config_provider_impl.cc
[envoy-stream]: https://github.com/envoyproxy/envoy/blob/b2d89e0ae53916f28770771fbdd49c5c99c5c5a2/source/common/http/conn_manager_impl.cc
[envoy-subscription]: https://github.com/envoyproxy/envoy/blob/b2d89e0ae53916f28770771fbdd49c5c99c5c5a2/source/common/rds/rds_route_config_subscription.cc
[envoy-protocol]: https://www.envoyproxy.io/docs/envoy/v1.40.2/api-docs/xds_protocol
[mcp-tools]: https://modelcontextprotocol.io/specification/2026-07-28/server/tools
[mcp-cache]: https://modelcontextprotocol.io/specification/2026-07-28/server/utilities/caching
[mcp-schema]: https://github.com/modelcontextprotocol/modelcontextprotocol/blob/de3550c9fea3c5269e42ac95204eef44a2b2cb92/schema/2026-07-28/schema.ts
[mcp-sdk]: https://github.com/modelcontextprotocol/typescript-sdk/blob/919bb8ea88b6e10e72c2f8b6218fad4cfdc40b2c/packages/server/src/server/mcp.ts
[mcp-sdk-tests]: https://github.com/modelcontextprotocol/typescript-sdk/blob/919bb8ea88b6e10e72c2f8b6218fad4cfdc40b2c/test/integration/test/server/mcp.test.ts
[node-esm]: https://nodejs.org/docs/v26.13.1/api/esm.html
[node-resolver]: https://github.com/nodejs/node/blob/e9c277643b0249c50f6e6de5413be8a88ea11b6a/lib/internal/modules/esm/resolve.js
[node-worker]: https://nodejs.org/docs/v26.13.1/api/worker_threads.html
[node-addon]: https://nodejs.org/docs/v26.13.1/api/addons.html
[wasmcloud-plugins]: https://wasmcloud.com/docs/runtime/creating-host-component-plugins/
[wasmcloud-v1]: https://wasmcloud.com/docs/v1/developer/components/update/
[wasmcloud-call]: https://github.com/wasmCloud/wasmCloud/blob/8b0e24cb6610642783e3f16f5f1eac45ff2cb5aa/crates/wash-runtime/src/plugin/component_host/workload_call.rs
[wasmcloud-lifecycle]: https://github.com/wasmCloud/wasmCloud/blob/8b0e24cb6610642783e3f16f5f1eac45ff2cb5aa/crates/wash-runtime/src/plugin/component_host/lifecycle.rs
[wasmcloud-cleanup]: https://github.com/wasmCloud/wasmCloud/blob/8b0e24cb6610642783e3f16f5f1eac45ff2cb5aa/crates/wash-runtime/src/host/cleanup.rs
[gm-kernel-package]: https://github.com/agent-teams-ai/get-modular/blob/33c032f829028967825428bc6b049ed6db1c56b2/packages/lifecycle-kernel/package.json
[gm-kernel]: https://github.com/agent-teams-ai/get-modular/blob/33c032f829028967825428bc6b049ed6db1c56b2/packages/lifecycle-kernel/src/features/lifecycle/kernel.ts
[gm-effect]: https://github.com/agent-teams-ai/get-modular/blob/33c032f829028967825428bc6b049ed6db1c56b2/packages/effect/README.md
[effect-rcref]: https://github.com/Effect-TS/effect/blob/289a53f7b1fc40049219c6e69022db2fb859c356/packages/effect/src/RcRef.ts
[effect-rcref-internal]: https://github.com/Effect-TS/effect/blob/289a53f7b1fc40049219c6e69022db2fb859c356/packages/effect/src/internal/rcRef.ts
