---
id: research.standalone-live-library
type: research
status: active
owner: architecture
summary: Defines the standalone library direction, reusable mechanisms, version and state lifetimes, live feedback, source-backed patterns and a staged qualification roadmap.
---

# Standalone Live Plugin Library Blueprint 2026-11-22

<!-- cspell:words CRDT EBADF -->

## Scope and authority

**Observation date: 2026-11-22, Europe/Kiev. Browser failure checkpoint.** The
owner confirms a substantial, purpose-neutral library in a separate repository.
This is a successor to the
[reuse-first study](reuse-first-live-plugin-updates-2026-11-22.md), not a new
runtime adoption. The current request and remaining choices are recorded in
[OD-003](../open-decisions/OD-003-module-runtime-and-public-spi-choices.md#owner-confirmed-standalone-library-and-continuous-research-2026-11-22).

The design target is controlled live replacement of eligible plugin features:
predictable operation affinity, resource lifetime, state/history behavior and
observable outcomes. Ordinary TypeScript is the first execution profile under
investigation; native Effect and Wasm adapters need their own capability and
qualification evidence. The application's native Effect decision is not a
mandatory dependency for every external consumer.

The previous 150-350-line estimate concerned one consumer integration. It must
not be reused as the size of this library, its adapters, conformance suite,
authoring tools, user interface or production qualification.

## Standalone structure and existing owners

The [current quality standard](https://github.com/agent-teams-ai/.github/blob/0b44c64c824f536bd1b085341e7669bcc64ef124/docs/engineering-quality-standard.md)
explicitly supports library-first design for reusable concerns. The
[Feature Module Standard 1.1](https://github.com/agent-teams-ai/.github/blob/0b44c64c824f536bd1b085341e7669bcc64ef124/docs/architecture/feature-module-standard/v1.1.md)
distinguishes repositories, modules and features. A separate repository is not a
reason to manufacture a package or empty layer for each logical concept.

Candidate feature boundaries below are recommendations to qualify, not public
exports. Each should become an independently understandable capability with one
owner and a concrete consumer scenario.

| Feature | Library responsibility to prove | Reuse or external owner |
| --- | --- | --- |
| Update planning | Explain affected features, compatible modes, expected state and resource transitions | Get Modular owns graph/dependency semantics; consumer owns grants |
| Operation affinity | Bind an admitted operation and its supported continuations to an immutable generation identity | Native async context or native Effect environment; existing lifecycle acquires/releases |
| Version retention | Describe reasons an old version is still needed and the owner's cleanup options | Existing resource/lifecycle implementation and durable execution system |
| Transition execution | Apply an authorized plan with correlated outcomes and recovery evidence | One owner for activation, fencing, cancellation and termination |
| State/history integration | Expose preserve, transform, clear and recovery capabilities with their costs | Product schemas, storage, editor/CRDT history and migration implementation |
| User feedback | Project actual receipts into pending, active, draining, failed and cleaned views | Host presentation, native runtime telemetry, durable journal where required |
| Conformance | Exercise each advertised mode and unsupported capability with independent consumers | Actual Node/browser/Effect/Wasm implementations, not a substitute runtime |

Plain TypeScript and native Effect should share the decision/receipt model where
semantics agree. Wrapping a Promise does not recreate native typed errors,
environment, interruption or scope. Keep execution-specific semantics in their
profile; do not introduce an abstract task/fiber language to hide the difference.

**Repository bootstrap status:** the separate destination has not yet been
provisioned at this checkpoint. Current research is committed in the existing
review branch so it is durable while the new-repository route is checked. A new
owned production repository must satisfy the current
[repository admission requirements](https://github.com/agent-teams-ai/.github/blob/0b44c64c824f536bd1b085341e7669bcc64ef124/docs/repository-admission.md):
full immutable FMS source, real Foundation/source coverage and native gates,
qualified Docs tooling and explicit admission state. Configuration alone is
`configured_not_qualified`; an empty skeleton is not qualification.

## Evidence and lessons

The machine-readable [source ledger](evidence/standalone-live-library-20261122.sources.json)
retains exact revisions, blob identities, observation dates and evidence classes.
The following source findings have implementation consequences worth preserving.
The [findings register](evidence/standalone-live-library-20261122.findings.json)
adds consequences and decisive rejection scenarios. Executed native probes and
independent cross-reviews are preserved below.

| Finding | Consequence for the proposed library | Evidence |
| --- | --- | --- |
| Temporal drain counts running pinned workflows, while closed workflow queries may still need old code | Separate no-running-work, no-live-resources, no-history-demand and artifact-deletion eligibility | V01, V13-V15; source/docs, upstream tests not executed |
| Restate pins invocations to deployment endpoints; Virtual Object state persists across deployments | Code affinity does not imply schema isolation; retain immutable endpoints and an explicit state compatibility policy | V03, V16 |
| Restate 1.8.1 CLI performs a drain preflight and then requests forced server deletion; server supports only forced deletion | Do not label a client-side check as an atomic backend guarantee; preserve the exact backend capability | V17-V18; inspected source, not a running Restate test |
| Module Federation force registration removes runtime bookkeeping but has no application resource-disposal contract in that path | Use it for remote loading, retain lifecycle ownership elsewhere; do not report cleanup from cache removal | F01 |
| A historical Module Federation report describes stale expose chunks; maintainer warns about shared/singleton state | Immutable build identity and sharing scope belong in qualification; do not present a 2025 report as a reproduced 2.9.3 defect | F10 |
| single-spa default lifecycle timeout reports and waits; its rejecting mode does not cancel the underlying work | Timeout, cancellation request, observed stop and cleanup are separate receipts | F02-F03 |
| Yjs UndoManager groups captured transactions by time; `stopCapturing` explicitly separates groups | A view/version boundary needs an intentional undo boundary; preserve document and user history under separate lifetimes | F04, F09 |
| VS Code refuses dynamic removal after activation has started and gathers host-stop vetoes | Advertise reload eligibility and the actual restart scope before promising per-plugin replacement | F06, F08 |

These sources suggest a distinction that the interface must make visible:
**a new version can be active while the old version is still needed**. The UI
should report activation and retirement separately, with concrete hold reasons:
active operation, stream, undo/history, replay/query, leased resource or unresolved
cleanup. A single progress percentage cannot explain those obligations.

## User-visible update contract to qualify

Before applying an update, show the changed feature set, affected dependents,
available mode, state/history consequences and restart scope. Use the actual
planner/runtime capability rather than a universal list of promised modes.

During execution, project correlated receipts: prepared candidate, activation
accepted, first successful new operation, old operations remaining, failed
cleanup and final observed retirement. If a loader returns a fallback, show the
fallback version and original error; an apparently successful render must not
claim that the requested version is active.

Keep an operation attached to one generation through supported asynchronous
continuations. A new UI gesture starts a new operation; a long-lived subscription
must not accidentally pin every future gesture to the generation captured when
the listener was installed. Streams and async iterators need explicit operation
boundaries and close behavior.

State actions should describe their subject. Clearing an editor's undo stack,
discarding a local draft, retiring a plugin cache and deleting durable user data
are separate operations with different owners. The default behavior and recovery
window remain consumer choices; the library must expose the difference.

## Executed native probes and their limits

The immutable [native evidence packet](evidence/standalone-live-library-native-20261122.tar.gz)
and [member manifest](evidence/standalone-live-library-native-20261122.manifest.json)
contain prior plans, actual TypeScript sources, exact lockfiles, first-run logs,
machine observations, source ledgers and two independent cross-reviews. Both
probes use Node 24.22.3 and strict TypeScript 7.0.2 with dependency declaration
checking enabled. The checks passed on their first execution; review found no
reason to repeat them.

| Probe | Executed result | Scope and significant counterexample |
| --- | --- | --- |
| Native Node asynchronous context | 5 passed, 0 failed, 0 skipped; strict typecheck passed | Real Promise, EventEmitter, snapshot, async generator and FileHandle. A captured context remains A after file close, while readFile fails with EBADF. |
| Released Yjs 13.6.33 state/history | 7 passed, 0 failed, 0 skipped; strict typecheck passed | Real document updates, observers, UndoManager, binary transfer and relative positions. Removing a tracked origin does not prevent a late write or its transfer to a peer. |

**Context:** `snapshot` retains a reference to the store, not an immutable copy.
A generator created in A can execute in B when `next` is called there; binding
its supported consumption methods restores A. The probe covers `next` and
`return`, not `throw`. A permanently bound listener can also keep every future
independent action on A. Reuse native context at the actual operation boundary;
resource acquisition and release remain the lifecycle owner's responsibility.
A Promise returning a stream may settle before that operation finishes.

**State:** preserving the document and UndoManager while replacing exact view
subscriptions retains content and history. Adjacent edits from different tracked
origins can form one Undo entry; `stopCapturing` separates them. Clearing history
retains the draft. Encoding/restoring a document retains content but does not
serialize the previous in-memory UndoManager. A relative caret survives a peer
prepend with its resolved index moving from 2 to 3.

The deliberate post-destroy negative control shows that `Doc.destroy` does not
revoke retained mutable references. It is misuse evidence, not a supported
post-destroy operating mode. A central command gate cannot reject writes that
bypass it through a previously issued mutable `Y.Doc` or `Y.Text`. The actual
state boundary must avoid that escape or disclose the trust/lifetime limit;
TypeScript readonly annotations are not enforcement.

These are native mechanism tests. They do not establish browser focus/IME,
renderer cleanup, durable storage, provider networking, distributed fencing or
production hot replacement. The next browser experiment is separately scoped
and will keep its own input identity and receipts.

### Frozen browser input and first native result

The [browser source input](evidence/standalone-live-library-browser-input-20261122.tar.gz)
and [manifest](evidence/standalone-live-library-browser-input-20261122.manifest.json)
freeze 16 files after strict TS7.0.2 checking and two independent reviews. A
scoped workflow runs the exact input in native Chromium: one test plans three
sequential phases and 38 independently named comparisons.

The phases cover actual React/Vite HMR with dirty host draft, Undo, focus and
selection; hook-signature remount with stable host document; then a genuinely
throwing import, continued useful editing/Undo on the prior view and repair.
The failed candidate's own diagnostic must be corroborated by a native error.
The test checks new edits after rejection so stale pixels cannot count as a
working fallback. Existing Vite/React/Playwright pins are reused; only Yjs is added.

**First run: failed, retained unchanged.**
[Run 45033310718](https://github.com/agent-teams-ai/extension-foundation/actions/runs/45033310718)
on input/workflow commit `bbff6146693fdf6eca320efbb6b67a6ef7a6be1d`
passed install and strict typecheck, then reached **31 matching comparisons**
before timing out waiting for repaired v4 useful output. The test result is
**0 passed / 1 failed**, not 31 passing tests. Native Chromium was 159.0.8154.6;
Node was 24.22.3. The first two phases completed; the third remained incomplete.

Compatible HMR and hook-signature remount preserved the actual host textarea,
dirty draft, Undo, focus and selection. After the genuine bad import, v3 still
processed a new edit and Undo. The repaired v4 source produced an actual watcher
event and Vite's `hot updated` message, but the useful view and subscriptions
remained v3 within the 15-second observation window. Source inspection supplies
a specific explanation: a new Vite hot context clears previous accept callbacks;
the throwing module never reaches React's generated acceptance footer. The next
repair captures an empty callback list before evaluating and registering the
repaired module. Its transport message therefore need not mean React applied it.
This explanation is tied to the exact inspected releases, not every HMR failure.

The [original artifact ZIP](evidence/standalone-live-library-browser-attempt1-20261122.zip)
and [run/member receipt](evidence/standalone-live-library-browser-attempt1-20261122.json)
retain raw logs, actual DOM screenshots, errors, final candidate bytes and all
observations. Root independently verified the ZIP digest, every original input
file and the workflow/input receipt. **A loader's completion message is therefore
insufficient evidence for user-visible activation in this exact native case.**

The separate [v2 input](evidence/standalone-live-library-browser-input-20261122-v2.tar.gz)
and [manifest](evidence/standalone-live-library-browser-input-20261122-v2.manifest.json)
preserve the first 31 comparisons and add an explicit recovery experiment. After
correlating the repaired module's actual evaluation with its public native
transport receipt, the harness requests
[Vite's documented reloadModule](https://vite.dev/guide/api-javascript#vitedevserver)
once. The test requires actual v4 computation, retained host draft, Undo/Redo,
focus/selection and current observers. One test plans three phases and 49 named
comparisons; strict TS7.0.2 passes. Browser recovery remains pending at this
input checkpoint. No custom accept handler or internal callback mutation is used.

The [architecture packet](evidence/standalone-live-library-architecture-20261122.tar.gz)
and [manifest](evidence/standalone-live-library-architecture-20261122.manifest.json)
retain the full boundaries report, 30 source records, 23 exact source snapshots,
upstream notices, independent reviews and browser preparation logs. Source
inspection of Effect/XState is still distinct from browser execution.

## Reuse decisions and targeted uncertainty

| Concern | First mechanism to inspect or reuse | Qualification still required |
| --- | --- | --- |
| Graph and bindings | Get Modular | Exact changed-feature plan and supported external consumer |
| Plain TS resources | Get Modular Resources/lifecycle | Admission race, stream lifetime, observed release, bounded retention |
| Native Effect lifetime | Effect Scope/Layer and Get Modular Effect profile | Layer identity, memoization sharing and native cancellation semantics |
| Node operation context | AsyncLocalStorage/snapshot | Mutable captured stores, delayed callbacks, iterator consumption |
| View replacement | Framework refresh/HMR, explicit unmount/mount | Dirty draft, focus/caret, undo, fallback identity and cleanup failure |
| Collaborative history | Yjs/other existing editor mechanism where actually needed | Undo boundary, ownership, late old writes, serialized versus in-memory history |
| Wasm execution | Extism or Component Model toolchain | Carry forward the previous study's SDK type, close, timeout and memory gaps |
| Durable update/replay | Existing Temporal, Restate or Golem deployment where justified | Cost, immutable version route, migration and history-retention guarantees |

Keep these as alternatives, not dependencies to install collectively. A consumer
that needs local view replacement should not acquire a durable workflow engine
or CRDT merely to satisfy the architecture diagram.

The Get Modular lifecycle kernel currently declares `private: true`; it is not
a released external-consumer dependency. Resources is released. Reusing a
private implementation requires its owning repository's qualification and
publication path rather than importing its source into this library (G3-G4, G10).

## Proposed module architecture

Start with a portable live-update module containing **planning, replacement and
observation**, one actual runtime adapter, and a conformance kit. These can become
substantial features. Split packages when platform dependencies, release cadence
or independently useful consumers justify the boundary. State-transfer
coordination can initially belong to replacement; consumer schemas and migration
functions remain outside the library.

The consumer's composition root chooses providers. Planning consumes inert
composition results, compatibility evidence and a capability profile. Replacement
depends on narrow feature-owned ports for preparation, existing activation
authority, state transfer and retirement. Runtime adapters implement those ports;
Node, Effect, DOM and Wasm SDK types stay out of the ordinary entrypoint's
declaration graph. Observation is a read-only projection. This is the practical
Clean Architecture boundary, rather than a directory named for each principle.

| Contract axis | Why it needs its own identity |
| --- | --- |
| Library release | Compatibility of the package consumed by applications |
| Plugin contract | Accepted request/result and capability behavior |
| Artifact/configuration digest | Exact code and relevant configuration prepared |
| Generation identity | Particular live instance and its owned work/resources |
| Authoritative head revision | Concurrent publication and stale-command detection |
| State schema and baseline | Which data this implementation can read/write/migrate |
| Update attempt | Correlate retries, late results and one observed outcome |

Human version labels are useful UI; they do not replace these identities. A token
from a private in-memory kernel is not automatically a durable identifier. A
candidate descriptor should reference the actual existing graph plan rather than
redeclare its grammar (G4, O2).

### One policy, explicit execution profiles

The first use case may be an ordinary asynchronous TS implementation. If the
real native Effect consumer requires a native chain, share a narrow replacement
decision/receipt protocol while keeping Scope, Fiber and E/R native in that
driver. A mandatory Effect implementation with a Promise facade is also possible,
but would be a deliberate dependency choice, not an optional dependency profile.

Before writing transition machinery, compare **XState 5.33.4 pure transitions**
with ordinary typed functions for this exact operation. Its pure API computes
next state and actions without starting a live actor. That can reuse a mature
state transition implementation while external code executes native effects. It does
not supply atomic publication, resource custody or a recovery journal. Adopt it
only if real hierarchical/parallel transitions and inspection needs justify its
cost (X2, D1).

Three source-verified integration traps require qualification:

- Effect 4.1.4 MemoMap shares by Layer identity. A new Scope or fresh mapper does
  not clone a borrowed mutable service or a captured Layer (E4, G8).
- ManagedRuntime's first dispose failure is not replayed by its success-completed
  completion Deferred to later dispose callers. Retain the first outcome if the
  library promises one stable terminal receipt; do not invent retry semantics
  for native finalizers (E2).
- XState Promise actors ignore late output after becoming inactive. Acquire
  custody before starting work that may allocate resources after cancellation;
  the dropped result must not be the only reference to required cleanup (X1, D2).

XState actor persistence also restarts invocations while considering previous
actions already performed. Changed machine logic and context that cannot be
serialized limit restoration. Its v6 beta documentation is not evidence for the inspected
stable v5 dependency (X3, D3-D4). All Effect/XState statements here are source
inspection, not new executed tests.

## Replacement protocol and failure boundaries

The proposed library should explain one authorized replacement operation and
delegate authoritative mutations to their current owner. The following protocol
is a design candidate to test; it is not an adopted runtime API.

| Boundary | Expected result | Failure or uncertainty behavior |
| --- | --- | --- |
| Plan | Exact target, expected head, affected closure, supported mode, state/retention consequences | Unsupported mode or incompatible contract rejects before mutation |
| Prepare | Candidate resources have custody; readiness has a meaningful feature-specific oracle | Keep the current version; clean candidate resources even after caller cancellation |
| Choose baseline, when recovery is promised | Existing durable authority records attempt, source, target and selected state baseline | Retry that identity or begin an explicit new attempt; do not silently pick a newer snapshot |
| Publish | Existing owner accepts or rejects the expected-head transition | A lost acknowledgement remains unknown; query/reconcile by attempt before retiring either side |
| Start new work | Newly admitted operations select the accepted generation | Existing operations retain their declared affinity, including supported streams/continuations |
| Acknowledge useful output | Adapter identifies rendered/result generation and relevant state revision | Show fallback or delayed rendering explicitly; loading alone is insufficient |
| Drain and finalize | Old operations and cleanup report their own outcomes | Failed or delayed finalizers remain visible after the new version becomes useful |
| Reclaim | No remaining declared hold reason; owner confirms actual release/deletion | History/replay and rollback reservations can retain artifacts after live execution stops |

Use one update lane per actual activation domain, not one global plugin lock.
Independent domains can progress concurrently. Two candidates for the same head
must use the existing compare-and-swap/fencing authority; a local mutex does not
settle cross-process races. Product authorization still grants the mode and its
escalation. An elapsed deadline cannot silently change drain into force.

Golem's released update queue is a useful baseline-identity pattern: it records a
selected recovery strategy tied to admission/source/target identity and does not
reselect the latest snapshot inside that same attempt. A new attempt may choose a
different strategy. Reuse the host's durable authority when that guarantee is
needed; a process-local profile should state its weaker restart behavior
(V19-V21, V25-V26).

Compatibility and preference are distinct. Orleans separately determines which
versions are compatible and which accepted version to select; its numeric policy
does not infer semantic state compatibility. Before old and new implementations
share writable state, qualify both new-read-old-data and old-read-new-data. Code
rollback after new writes is another transition against current state, not an
automatic rewind of user work (V07-V09, V22-V23, V28).

## Version retention and state cleanup

Use the RCU ordering as a design reference: remove the old route before reclaiming
what existing readers still use. Its module-unload guidance additionally
distinguishes reader completion from queued cleanup callbacks; producers must
stop before the appropriate final barrier. Crossbeam deferred destruction has no
fixed completion deadline. Neither mechanism is a complete asynchronous plugin
supervisor, but both expose a useful mistake to prevent: reader-zero is not a
cleanup receipt (V10-V12, V27, V29).

| Retained item | Normal owner/lifetime | Cleanup or retention decision |
| --- | --- | --- |
| Live executor and mutable heap | Runtime generation | Hold for declared active operations and cleanup; restart boundary depends on placement |
| Artifact and state codec | Artifact/history store | Keep for replay/query, rollback reservation and required compatibility window |
| Host document/draft | User session or durable state owner | Preserve across view replacement unless an explicit incompatible-state policy applies |
| Undo/Redo and editor session | History/session owner | Bound independently of content; clear history does not discard the document |
| Plugin cache/temporary resource | Exact feature resource scope | Drop or rebuild when invalid; shared pools require explicit borrowed ownership |
| Durable business data | Consumer's canonical state store | Migrate through its schema and transaction policy; runtime retirement does not delete it |
| Diagnostic history | Bounded read model or audit owner | Cap display history; resynchronize from owner snapshots after gaps |

A retention policy needs budgets for generations, resource/memory usage, active
streams, pending cleanup and history obligations. Explain which budget blocked
the next update. Choices can include defer, coalesce still-unstarted candidates,
reject, or an owner-authorized targeted restart. Never coalesce an already
selected durable attempt into another baseline. Retention TTL is a policy input;
it is not proof that a still-used resource has become safe to free.

For long-running work, choose the boundary deliberately: request, message,
explicit checkpoint, session or whole executor. A session pinned indefinitely
needs a defined escape policy if bounded version retention is a requirement.
Schema compatibility, effect idempotency and remote write fencing remain at the
actual state/effect receiver. Local abort cannot retract a request already sent.

## Practical live feedback

Expose three user-facing questions per changed feature: **what is selected,
what is visibly/usefully running, and what still holds the predecessor**. For
example: “Analyzer v2 is selected; this result still comes from v1; draft and
Undo are retained; one v1 stream and one failed cleanup remain.” Each fact has
its own receipt and available owner-authorized actions.

Useful UI behavior to qualify includes typing while preparation proceeds,
preserving focus/caret where the supported renderer permits it, marking stale
results with their document/generation revision, and offering the actual restart
scope when preservation is unsupported. A hidden candidate should be passive or
use isolated candidate resources; rendering it off-screen does not authorize
live mutations. Preview should show the affected dependency closure and concrete
state/history effects, not just a version label.

Bound and coalesce observation updates without blocking activation. After a gap
or reconnect, rebuild from an authoritative snapshot and owner-issued revision.
Wall-clock ordering and absent logs cannot prove that nothing remains. Exporter
errors must stay inside the observation adapter; decision hooks remain explicit
parts of the operation. A UI state machine cannot become another activation
authority.

## First delivery, cost and admission

The first useful delivery is one supported update mode, one real TS runtime,
one real application feature and independent ordinary consumers. Prove packed
JS/declarations with strict TS7.0.2+, public entrypoints, no checkout deep imports,
no organization credentials and no mandatory optional-runtime dependencies.
Then add a native Effect or Wasm profile where a real consumer demonstrates the
need. The current source evidence favors this incremental path; it does not
choose the final public contract.

The boundaries investigation estimates the first slice at **900-1,800 lines of
production logic**, **500-1,000 integration lines**, **1,800-3,500 test/conformance
lines** and **600-1,200 documentation/build/release lines**. These are planning
bands with confidence **4/10**, not measurements or commitments. They exclude a
full editor, marketplace, distributed update service and every renderer/runtime.
Native Effect, another runtime and durable recovery each have incremental
qualification and maintenance costs. The earlier 150-350-line adapter allowance
cannot estimate this project.

Engineering judgment for the bounded design: neutral library with existing
mechanism owners has confidence 8/10, reliability potential 8/10 and complexity
5/10. Shared ordinary/native drivers have confidence 6/10 and complexity 7/10;
their extra conformance burden needs a real benefit. These scores compare design
choices, not measured availability. The detailed alternatives and cost scopes
are retained with the boundaries report.

### Materialized standalone seed and tooling conflict

The [seed base](evidence/standalone-live-library-seed-base-20261122.tar.gz)
and [manifest](evidence/standalone-live-library-seed-base-20261122.manifest.json)
already contain their own README/AGENTS, architecture proposal, a concrete
bootstrap recipe, 15-source bill of materials and the entire immutable FMS 1.1
source with verified provenance. They create no empty production packages. The
completed research/probe directories are assembled separately into the final
transfer payload. The name is provisional and the destination is private
research until its own adoption is reviewed.

The proposed first slice is a real controlled TS capability replacement: reject
a bad candidate while A remains useful; activate B for new work while a held
operation/stream retains A; report pending versus completed cleanup through the
actual existing owner. Run that contract in a real application and an independent
consumer of the packed artifact. AsyncLocalStorage is an internal building
block, not a standalone wrapper product.

A concrete bootstrap conflict remains at the pinned organization revision:
the RECOMMENDED Docs cohort is `docs-2026-10-03-stable31`, with Docs 0.6.2,
organization adapter 0.3.2 and Foundation 1.7.2. Its eager Foundation CLI imports
reach API Extractor 7.58.12 and embedded TypeScript 5.9.3, below the required
7.0.2 floor. The released FMS 0.3.0 Node runner also excludes Foundation 1.7.2
from its peer window. Its kernel has no CLI; use the released Node API when the
qualified toolchain route is resolved.

Foundation 3.0.0, FMS 0.3.0, Stack Toolchain 0.1.1 and Docs 0.6.6 are published
catalog candidates; their availability does not update that managed cohort.
The seed retains exact metadata/source/archive evidence and the official
scaffold plan/apply route. A qualified compatible successor or reviewed tooling
transition is needed before claiming production bootstrap. No blocked old
Foundation/scaffold runtime was executed locally for this work, and no dependency
override or fabricated admission was introduced.

The new repository's full compiler, native behavior, FMS/source coverage, packed
external consumer, hosted execution and required-check enforcement must each be
observed. Its first workflow cannot protect its own bootstrap PR. This condition
does not invalidate the independently executed TS7.0.2 research probes.

## Open questions and validation

1. Qualify the smallest useful end-to-end feature slice in an ordinary external
   project and the intended application; share conformance, not product models.
2. The native Node and Yjs probes and cross-reviews are complete. Extend the next
   actual browser check to dirty draft/history and visible plugin logic changes;
   keep it separate from production and durable-recovery claims.
3. Define a retention budget: versions, bytes, active work, history demand and
   deadlines. An over-budget update must return an explicit defer/restart/reject
   choice, not silently delete the oldest generation.
4. Specify crash points around prepare, activation, state transform and cleanup.
   Persist enough identity to reconcile an incomplete transition using the
   existing authority; a progress event is not a recovery journal.
5. Separate public contract design, repository bootstrap qualification and
   application adoption. Record a scoped estimate for each before implementation.

## Checkpoint custody

The first checkpoint was committed and immediately pushed as
[`36499a2`](https://github.com/agent-teams-ai/extension-foundation/commit/36499a2ced8500a631d4a97f63983d1a21c9841a).
The initial documentation spelling check identified one legitimate technical
term, CRDT; a document-local dictionary entry fixed it. The corrected gate passed
with 92 catalog documents and 98 Markdown inputs. The previous evidence archive
is unchanged.

The native checkpoint was committed and immediately pushed as
[`e901903`](https://github.com/agent-teams-ai/extension-foundation/commit/e901903f6a8d7a38bec849626575eddab8e515ff).
Its independent archive review verified all 40 member hashes and sizes, both
native probes and both cross-reviews without rerunning the tests. Later spelling
checks identified EBADF and two uncommon wording choices; the local dictionary
and simpler wording resolved them without weakening the gate.

The connected GitHub API can write this repository but exposes no repository
creation operation. The CLI has no authenticated host and the browser's creation
page requires sign-in; no new repository has been created. The standalone
bootstrap/transfer recipe is being prepared as a reviewable deliverable while
all findings remain pushed here. This is an access limitation, not an additional
owner-approval requirement for the already confirmed separate-project direction.
