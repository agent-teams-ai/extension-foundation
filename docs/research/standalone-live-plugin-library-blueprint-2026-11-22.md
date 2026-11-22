---
id: research.standalone-live-library
type: research
status: active
owner: architecture
summary: Defines the standalone library direction, reusable mechanisms, version and state lifetimes, live feedback, source-backed patterns and a staged qualification roadmap.
---

# Standalone Live Plugin Library Blueprint 2026-11-22

<!-- cspell:words CRDT -->

## Scope and authority

**Observation date: 2026-11-22, Europe/Kiev. First research checkpoint.** The
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
Native probes and independent reviews are being recorded in the next checkpoint.

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

## Open questions and validation

1. Qualify the smallest useful end-to-end feature slice in an ordinary external
   project and the intended application; share conformance, not product models.
2. Review the real native Node and Yjs probes, preserve negative controls and
   record which results are runtime observations versus source inferences.
3. Define a retention budget: versions, bytes, active work, history demand and
   deadlines. An over-budget update must return an explicit defer/restart/reject
   choice, not silently delete the oldest generation.
4. Specify crash points around prepare, activation, state transform and cleanup.
   Persist enough identity to reconcile an incomplete transition using the
   existing authority; a progress event is not a recovery journal.
5. Separate public contract design, repository bootstrap qualification and
   application adoption. Record a scoped estimate for each before implementation.

This checkpoint preserves the direction and source findings. It does not claim
that a standalone runtime, its public API or the new repository has been shipped.
