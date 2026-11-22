---
id: research.live-update-reliability
type: research
status: active
owner: architecture
summary: Deepens the standalone library with source-backed failure mechanisms, native concurrency and recovery probes, editor continuity, reuse decisions and explicit qualification coverage.
---

# Live Update Reliability and Industry Evidence 2026-11-22

<!-- cspell:words CodeMirror Comlink Piscina -->

## Scope and authority

**Observation date: 2026-11-22, Europe/Kiev. Native editor: seven scenarios and
70 comparisons pass. First hosted backend: 16 of 17 tests pass; one exact
PostgreSQL error-code expectation requires correction.** The owner accepts
the architectural direction in
[OD-003](../open-decisions/OD-003-module-runtime-and-public-spi-choices.md#owner-confirmed-architecture-and-deeper-qualification-2026-11-22):
a TypeScript control library, ordinary TypeScript plugins first, optional
Wasm/Extism and native Effect execution profiles, and a complete library-owned
update operation. Consumers supply narrow authority and state primitives;
reconstructing the coordinator in every product defeats the library's purpose.

This extends the [standalone blueprint](standalone-live-plugin-library-blueprint-2026-11-22.md).
The previous React/Vite browser experiment qualified one development recovery
path. Its 49 comparisons did not qualify concurrent publication, crash recovery,
receiver-side authority, full dependency cohorts, editor semantic history or
resource retention. Previous evidence remains unchanged and is not counted as
new execution here.

The work remains research with disposable host fixtures. Runtime selection,
default interruption policy, state migration policy, the public SPI and
production adoption remain separate decisions. Get Modular owns neutral graph
semantics; products own authorization and canonical state. A new repository is
still not provisioned; findings are pushed to the existing review branch.

## Evidence and lessons

The [first checkpoint](evidence/live-update-reliability-checkpoint1-20261122.json)
preserves the independently reviewed plans, early findings, exact package
provenance and source references before native execution. Evidence classes are
kept separate: inspected release bytes, inspected upstream source, normative
documentation, reported incident, proposed transfer and executed native result.
The [second checkpoint](evidence/live-update-reliability-checkpoint2-20261122.json)
adds the completed state, execution, editor and control-policy investigations,
accepted review corrections and original browser failure analysis.

### Mechanism-level warnings

| Mechanism | Concrete risk or boundary | Transfer to the library | Current evidence |
| --- | --- | --- | --- |
| PostgreSQL row locks | `FOR KEY SHARE` does not block updates that leave key columns unchanged; a revision column can change under that lock | Receiver validation and mutation need a correctly conflicting, short transaction; test the exact SQL | [PostgreSQL 18 locking](https://www.postgresql.org/docs/18/explicit-locking.html); native S07/S08 passed |
| Read Committed uniqueness | A conflicting insert may affect `ON CONFLICT DO NOTHING` while being invisible to that statement's snapshot | Reconcile the admitted operation in a fresh statement; do not assume a combined insert/fallback query returns a row | [PostgreSQL 18 isolation](https://www.postgresql.org/docs/18/transaction-iso.html); native S12 passed |
| Worker termination | A host effect already dispatched by the guest has a separate lifetime | Keep the original authority token on the effect and validate at the receiver; termination alone cannot reject it | Joint native E02/S09 passed, including unsafe receiver control |
| CodeMirror asynchronous lint | Native document identity protection does not prevent the reproduced same-document source race | Add only the missing contribution/revision gate for explicitly managed results; preserve native changed-document protection | Released lint 6.9.8; native CM-2 through CM-5 passed |
| CodeMirror history snapshot | Standard history JSON restores text changes but not custom inverted effects | State preservation declares document, selection, history and semantic effects separately; incompatible history needs an explicit reset/rebuild policy | Released commands 6.11.1; native CM-7 passed |
| Resource lifetime | A cleanup callback can fail before terminating its live executor | Keep cleanup debt and physical-stop evidence visible; use the public scope's supported retry, not an invented success flag | Public Resources 0.2.2; native E03/E04 passed |
| Argo Rollouts analysis | Inconclusive analysis pauses; early termination can be successful without meeting the configured consecutive-success threshold | Preserve completion reason, measured evidence and omitted checks; one green status is insufficient | [Analysis docs](https://argo-rollouts.readthedocs.io/en/stable/features/analysis/) and [pinned controller source](https://github.com/argoproj/argo-rollouts/blob/8c9c5ad2182ba7757bb6a35e79d2051afc31feee/analysis/analysis.go); no Argo runtime run |
| OpenFeature provider events | Provider readiness, staleness and context reconciliation describe flag evaluation; handlers have their own lifecycle | Optional rollout-intent integration can reuse those events; plugin activation, cleanup and state rollback retain their actual owners | [Pinned event specification](https://github.com/open-feature/spec/blob/b489ba9134ee081cecaf18a28b544ddabc1b25f7/specification/sections/05-events.md); no SDK execution |

These are actionable integration warnings, not blanket judgments that the
libraries are unsafe. The CodeMirror changed-document guard is positive
counterevidence; its history codec has a narrower purpose. Argo's successful
termination is documented policy, not an alleged controller defect.

### The complete operation needs explicit recovery

The proposed library coordinates planning, preparation, authorization,
publication, reconciliation and retirement. An adapter exposes narrow facts and
operations; it must not silently choose the update policy.

| Outcome | Coordinator obligation | Consumer primitive or evidence |
| --- | --- | --- |
| Preparation fails before publication | Keep the selected predecessor if one exists; release every acquired candidate resource and expose any debt | Public resource scope and adapter readiness/close receipts |
| Another attempt wins publication | Preserve the winner; release the losing candidate; any replan uses a new immutable attempt | Atomic expected-revision publication and recorded conflict |
| Publication acknowledgement is lost | Reconcile the same attempt before deciding which execution can be destroyed or retried | Durable outcome lookup with an explicit unknown state |
| Publication commits but useful behavior is not observed | Show selected versus useful separately; follow the declared recovery policy | Consumer observation correlated to generation, relevant input revision and declared result criterion; readiness remains separate |
| Previous work continues | Keep its admitted code/dependency cohort; apply the chosen old-write policy | Explicit operation affinity plus receiver-owned authority |
| Cleanup fails or physical stop is unobserved | Retain the debt, owner and allowed next action; do not claim retirement | Scope report and native executor stop evidence |

This is a proposed protocol to qualify, not a new accepted public interface.
The durable attempt identifies immutable inputs and a selected state baseline.
Retrying it must not silently select a newer snapshot or turn an old token into
the current authority. Restarting the host cannot reconstruct a lost worker
heap merely because its artifact identity is persisted.

The native database profile uses strict cutover: publication advances the
exclusive effect epoch. Old computation can finish, but new predecessor writes
are rejected. A previously committed effect with the exact original inputs
returns its historical receipt after cutover; it is not executed again. Compatible
old/new writer coexistence is a separate profile requiring its own evidence.
The protected SQL effect here is the inserted effect/receipt row, not an atomic
transaction with an arbitrary external service.

Selection, useful behavior, observation freshness and predecessor cleanup are
independent facts. A useful selected generation can coexist with cleanup debt.
An unknown publication, disconnected observer and unconfirmed physical stop have
different owners and next actions. Missing usefulness evidence does not by itself
prove failed behavior. The UI must not derive destructive retries from one
generic failed or unknown badge.

Resource scopes track ownership, cleanup attempts and debt. The execution
adapter retains the physical handle and implements the registered stop operation
and receipt; the coordinator consumes that result through the existing scope.
This delegation does not create two shutdown owners.

### Keep identities and retention reasons distinct

The qualification fixture separates an immutable artifact/cohort, a live
generation, a publication revision, an effect authority epoch, an update attempt,
a mutation idempotency key and a state schema. A1 -> B1 -> A2 can reuse the same
artifact label while A2 remains a fresh live execution. Monotonic revisions and
epochs prevent an earlier A1 operation from becoming current again.

Retention has several independent reasons: running computation or stream,
resource custody, user history, workflow replay/query, compatible rollback,
persisted snapshot, outstanding attempt and unresolved cleanup. Eligibility to
stop execution is not eligibility to delete the artifact. A fixed generation
budget must be checked before candidate acquisition; rejecting C after it has
already consumed the final worker slot is too late.

Each hold identifies what it retains: live execution, artifact bytes, a compatible
state/history codec or recovery metadata. User Undo need not retain a running
Worker. Clearing UI history does not release independent runtime or recovery
holds. Candidate pause applies to future admission; it does not abandon a
possibly committed attempt. Coalescing applies only to eligible unstarted
candidates and preserves their recorded identities and outstanding holds.

### Industry mechanisms: reuse decisions and failure lessons

The full lane reports and exact identities are retained in the second checkpoint.
This table records the decision each comparison changes. An upstream fix or
reported incident is not counted as a runtime experiment performed here.

| Mechanism family | Specific finding | Library consequence |
| --- | --- | --- |
| [Comlink 4.4.2](https://github.com/GoogleChromeLabs/comlink/blob/fd4b52666b1ec62784f8b45cb1108c7e40bc481d/src/comlink.ts) | Published proxy release is not awaitable termination; pending resolvers are cleared without rejection. A later [upstream fix](https://github.com/GoogleChromeLabs/comlink/commit/359584cc621212dcf6cb292843fc7d08cd15143d) corrects the release-response map used for port closure | Consider transport ergonomics independently from lifetime guarantees. Keep operations owned and settled; do not treat proxy collection as drain |
| [Piscina 5.3.2 source](https://github.com/piscinajs/piscina/blob/6c7e54630a8c28a96ce5c0625b463d849d21171c/src/index.ts) | Abortable tasks do not share workers; caller rejection precedes physical exit. Default task execution pauses detached asynchronous work between tasks | Reuse for bounded task pools when needed; qualify long-lived service/iterator behavior separately. The inspected npm bytes and tag manifest disagree on the version string, so both identities are retained |
| [OSGi DS 1.5](https://docs.osgi.org/specification/osgi.cmpn/8.1.0/service.component.html) | Dynamic references change independently; bind exceptions may be logged without failing activation, and teardown continues after some callback exceptions | Whole-cohort compatibility, readiness and cleanup debt need their actual evidence; do not map framework lifecycle labels directly to stronger guarantees |
| [OTP release handling](https://github.com/erlang/otp/blob/d199a49a01a2079afb6f2c5c9ae047cd4555e68d/system/doc/design_principles/release_handling.md) | Newly spawned processes can execute old code between suspension and loading; dependencies span modules, processes and nodes | Preserve operation-bound dependency selection; an independent lookup of latest requires an explicit compatibility policy |
| [.NET unloading](https://github.com/dotnet/docs/blob/c023f59008561b0633204140aaccd803139ac435/docs/standard/assembly/unloadability.md) and [plugin loading](https://github.com/dotnet/docs/blob/c023f59008561b0633204140aaccd803139ac435/docs/core/tutorials/creating-app-with-plugin-support.md) | Unload is cooperative and references can retain a context; privately loading the boundary assembly can duplicate interface identity | Separate shared contracts from private implementation dependencies; distinguish stop request, execution exit, heap reclamation and OS-resource release |
| [.NET ownership fixes](https://github.com/dotnet/runtime/pull/135436) | Concurrent first native-handle duplication created multiple owners; another [shipped writer-barrier fix](https://github.com/dotnet/runtime/pull/134999) had source-review-only evidence upstream | Give acquisition/handoff one ownership transition. Preserve evidence limitations instead of upgrading a reviewed fix into a reproduced result |
| [etcd ownership](https://github.com/etcd-io/etcd/blob/f5d605a93abe2fdfa13880aab0f1f3a4203628dd/client/v3/concurrency/mutex.go) | `IsOwner` supplies a creation-revision comparison usable inside an etcd transaction | It does not atomically protect a later PostgreSQL write. Use the actual receiver's primitive; avoid adding a second authority store solely for a lock |
| [GitLab migration guidance](https://gitlab.com/gitlab-org/gitlab/-/blob/37fda357d673f350c76ca218920473a515c63b35/doc/development/database/avoiding_downtime_in_migrations.md) | Coexisting application versions and schema caches require staged column removal and cleanup. The inspected incident report's suspected cache root cause is unconfirmed | Test real old/new readers and writers; additive SQL alone is not sufficient evidence. Preserve the incident's uncertainty |
| [Vitess 24 revert](https://vitess.io/docs/24.0/user-guides/schema-changes/revertible-migrations/) | New widened values or duplicates can prevent reversal into the previous schema, despite native reversible-migration support | Admit code rollback against current data and retained migration artifacts; expose a blocked rollback reason instead of promising a universal inverse migration |
| [Flink 2.2 savepoints](https://github.com/apache/flink/blob/5a336892424a9458653ead89610bf60d771ab8d7/docs/content/docs/ops/state/savepoints.md) | Stable operator identity, snapshot claim modes and intermediate savepoint semantics determine state association, custody and recovery | Reuse the durable engine when required. Separate a saved snapshot, committed effects, restore eligibility and responsibility for deletion |
| [AWS retry intent](https://aws.amazon.com/builders-library/making-retries-safe-with-idempotent-APIs/) and [Stripe v1](https://docs.stripe.com/api/idempotent_requests)/[v2](https://docs.stripe.com/api-v2-overview#idempotency) | Key scope, retained result, changed-input rejection, error replay and expiry differ between APIs | Give external-effect adapters an explicit retry/reconciliation contract. Do not promise universal exactly-once behavior or an unlimited replay horizon |
| [GitHub 2018 recovery](https://github.blog/news-insights/company-news/oct21-post-incident-analysis/) | Divergent writes blocked an immediate return to the previous primary; roughly 200,000 queued webhook payloads expired during recovery | Recovery duration can invalidate a normal TTL. Retention horizons and already-committed effects belong in the update/recovery plan |
| [Flutter reassembly](https://api.flutter.dev/flutter/widgets/State/reassemble.html) | New code can build before the reassemble hook; the hook is a development facility | Reuse framework refresh, while observing readiness and useful output separately. Do not infer a production transaction from hook ordering |
| [JetBrains disposers](https://plugins.jetbrains.com/docs/intellij/disposers.html) | A resource attached to a longer application/project lifetime can outlive its plugin and evade ordinary leak checks | Select the shortest correct resource owner. A disposer existing somewhere is not sufficient lifetime evidence |
| [PostgreSQL 19 native get-or-create](https://www.postgresql.org/docs/19/sql-insert.html) | `ON CONFLICT DO SELECT ... RETURNING` supplies an atomic insert-or-select alternative absent from the tested 18.7 grammar | Qualify that ready-made mechanism for a 19 profile before preserving an 18.x workaround as a generic library subsystem. Version 19 was not executed here |

### Proposed feature boundaries and execution profiles

The library is substantial because its operation connects several independently
owned guarantees. Size does not justify implementing another loader, graph
compiler, editor, resource manager, database or durable workflow engine. Following
the [organization's Feature Module Standard](https://github.com/agent-teams-ai/.github/blob/0b44c64c824f536bd1b085341e7669bcc64ef124/docs/architecture/feature-module-standard/v1.1.md),
organize cohesive user capabilities; create packages only where real dependency,
release or execution boundaries require them.

| Cohesive feature | Reusable operation behavior | External mechanism or owner |
| --- | --- | --- |
| Plan an update | Explain affected closure, supported policy, state consequences and expected predecessor | Get Modular graph/plan identity; consumer grants and compatibility evidence |
| Apply and reconcile | Prepare, request authoritative publication, handle known conflict versus unknown result, and preserve the selected outcome | Execution readiness; consumer atomic publication/lookup; no plugin callback inside a DB transaction |
| Retain and retire | Track the reasons a predecessor remains required, enforce the declared admission budget and coordinate cleanup debt | Public Resources scope and physical executor stop; artifact/state owners for non-live holds |
| Preserve or reset state | Request explicitly supported codecs, migration or reset actions and report omitted state/history | Native editor/history or the product's existing storage/migration mechanism |
| Observe and control | Supply immutable correlated snapshots, progress, allowed actions and normalized failures | Host presentation; optional native subscription, React external store, SSE or existing query client |

The same-process TypeScript profile, isolated Worker profile, native Effect
profile and Wasm profile must advertise different capabilities. Ordinary
TypeScript does not require Wasm. A UI contribution can reuse its host's native
reconfiguration; background work needing a physical stop can use an isolated
executor. Node Workers are not a tenant security sandbox. A profile without a
physical stop must reject or explicitly downgrade a force request under owner
policy; it cannot manufacture the guarantee with a timeout.

Native Effect retains native environment, typed error, fiber and scope semantics.
Share pure policy and receipt concepts where meanings agree, while keeping the
execution interpreter native. Extism and Component Model/WIT remain optional
adapter candidates backed by the earlier experiments. The prior Extism strict
declaration incompatibility remains a blocker for that exact SDK/toolchain
combination; this study neither resolves it nor adopts a Wasm backend.

The inspected Get Modular lifecycle kernel is still
[`private: true` at its recorded revision](https://github.com/agent-teams-ai/get-modular/blob/33c032f829028967825428bc6b049ed6db1c56b2/packages/lifecycle-kernel/package.json).
Do not deep-import or copy it. Its external contract and qualification require
resolution with its owner before it can supply reusable generation bookkeeping.
Public Resources already supplies scoped cleanup and debt. Exposing a collection
of low-level callbacks that leaves every consumer to rebuild the entire update
operation is not the accepted library architecture.

### Predictable controls and state/history actions

The user should see the requested candidate, selected version, actually useful
result, retained predecessors and unresolved cleanup when these differ. A useful
result carries its relevant input provenance; later input changes can make it
stale even if the original arrival was valid. The editor probe qualifies the
arrival gate, not ongoing validity after future edits.

Use distinct commands for refreshing a derived result, resetting contribution
state, clearing Undo/Redo, clearing the document, restoring a checkpoint, reverting
code, restarting an execution unit and releasing a retained artifact. Each names
its scope, compatibility requirement and state loss. Clearing history can retain
the draft; reverting code keeps current data unless an independently authorized
state action changes it. A full reset must not masquerade as a compatible reload.

Remote observation needs a coherent snapshot/cursor and an explicit resync path
after gaps; SSE reconnect alone does not provide retained application history.
Observer failure cannot become update authority. CodeMirror, React, OpenFeature
and a query cache remain optional integrations, not mandatory dependencies of the
core. OS IME and remote resync remain unqualified here.

The native Worker receipts reveal two practical reporting requirements: intended
parent termination returned exit code 1, so a raw code alone cannot classify a
crash; serializing a cleanup `Error` produced an empty object, so durable/UI
receipts need deliberate code, owner, phase and retry fields. Preserve the
original in-process cause separately. These are observations from the existing
Worker cases, not additional tests or defects attributed to Resources.

## Open questions and validation

### Approved new native experiment matrix

| Lane | Native mechanisms | Decisive cases | Explicit limit |
| --- | --- | --- | --- |
| Durable publication and state | PostgreSQL 18.7; node-postgres 8.23.1; real child-process exits | Competing publishers; same-attempt replay; changed-payload rejection; ABA; committed result before lost application reply; uncommitted crash; correct/incorrect locks; retained baseline; schema compatibility; snapshot visibility; metadata retention race | Not server failover, lost PostgreSQL wire acknowledgement, power-loss durability or arbitrary migration |
| Execution and resources | Node 24.22.3 Workers; literal A/B TS entries and dependencies; public Resources 0.2.2 | Old operation retains A/A while new work uses B/B; host effect survives Worker exit; close waits for stop; failed cleanup leaves a responsive Worker; retry and bounded live-generation admission | No Node sandbox, arbitrary graph loader, heap restore, memory bound or production kernel |
| User-visible contribution state | CodeMirror state 6.7.6, view 6.43.15, commands 6.11.1, lint 6.9.8; Playwright/Chromium | Native reconfiguration; unchanged/changed document async results; generation/revision gate; equal text after Undo; clear history separately from draft; semantic history codec boundary | No OS IME qualification, general state migration, production HMR or mandatory editor dependency |

Strict TypeScript 7.0.2 checks every maintained source before execution. Exact
locks, source hashes, native versions, raw observations and original failures
will be retained. Plans and source receive independent critique before hosted
execution. A corrective attempt receives a new input identity; an earlier failed
attempt is never rewritten into a pass.

The database and Worker lanes share one private host fixture. All transaction
bodies contain bounded host SQL; plugin execution and worker waits occur
outside them. The editor lane uses public native APIs, including native history,
instead of implementing a substitute editor or Undo engine.

### Coverage required before a public library

| Capability | Existing bounded evidence | Missing qualification |
| --- | --- | --- |
| Development refresh and repair | Retained React/Vite browser49 | Production update path, supported framework/version matrix |
| Cross-language execution | Retained TS/Rust Component Model and Extism experiments | Chosen backend/profile, cancellation and declaration compatibility |
| Ordinary resource scope | Retained Resources6/ALS5 and new native Worker cases | Concurrent admission reservations, arbitrary finalizers and process-tree/resource bounds |
| Durable publication | Native PG competition, replay, process crash, fencing and visibility cases passed; S13 correction pending | Completed retention race, real commit-wire ambiguity, failover and distributed recovery |
| User state and history | Retained Yjs7/React and new native editor seven-scenario E2E | Real IME, compatible semantic-history persistence, multi-input ongoing freshness |
| Library completeness | Owner-approved direction and feature boundaries | Independent external consumer, reusable operation and conformance |
| Separate repository bootstrap | Transfer packet and organization source retained | Provisioned remote and qualified current tooling cohort |

This matrix prevents several passing demonstrations from being presented as
coverage of the entire system. New reports must state which row changed and
what remains unproven.

### Original editor run and frozen input

The independently reviewed
[editor input](evidence/live-update-editor-input-20261122-v1.tar.gz) contains seven
exact files (18,005 compressed bytes), SHA-256
`4b94cb4d40019d77eff78b4cb01c5199197fd9eacbdb0c071c84797df0e63576`.
Its [manifest and review](evidence/live-update-editor-input-20261122-v1.manifest.json)
retain the approved plan, per-file hashes and strict TypeScript 7.0.2 check.
The [hosted workflow](../../.github/workflows/live-update-editor-reliability.yml)
verifies the frozen bytes, installs the exact lock, repeats strict checking and
runs one native browser E2E with seven distinct scenarios.

[Run 45042075044](https://github.com/agent-teams-ai/extension-foundation/actions/runs/45042075044)
on `f4ff3a49e695caef4e75d119ff318259b5937dac` failed one test after completing
CM-1 and CM-2: 27 of 28 executed comparisons matched. CM-2 reproduced the
same-document source race: B diagnostics became visible, then late A diagnostics
replaced them while B remained selected. In CM-3, the native changed-document
guard correctly left the diagnostic state empty; the harness incorrectly
expected no diagnostic DOM rows, while CodeMirror rendered its `No diagnostics`
placeholder. This is a failed test expectation, not a demonstrated failure of
that document guard. Later scenarios were not reached.

The [original artifact](evidence/live-update-editor-v1-attempt1-20261122.zip) and
[receipt](evidence/live-update-editor-v1-attempt1-20261122.json) preserve the
trace, screenshot, source, compiler output and failure. Any corrected expectation
uses a separate frozen input and run; this attempt remains a failure.

The [corrected v2 input](evidence/live-update-editor-input-20261122-v2.tar.gz)
changes only the native empty-state placeholder expectation. Its
[manifest](evidence/live-update-editor-input-20261122-v2.manifest.json) preserves
the exact diff, release-source confirmation, independent review and strict
TypeScript check. Six other source/configuration files are identical. SHA-256:
`c9d80c35364f9b2c5ed97a086f0a8ff24a9b2bc675c0666292c1e75ebedf81c3`.
The corrected
[run 45042722838](https://github.com/agent-teams-ai/extension-foundation/actions/runs/45042722838)
passed one E2E test, all seven scenarios and 70 of 70 comparisons, with no skipped
test, page error or cleanup error. The 70 include 69 scenario comparisons and
one final page-error comparison. Node 24.22.3, TypeScript 7.0.2 and Chromium
159.0.8154.6 are recorded. All seven returned source/configuration files match
the frozen input after execution. The [artifact](evidence/live-update-editor-v2-attempt1-20261122.zip)
and [receipt](evidence/live-update-editor-v2-attempt1-20261122.json) preserve the
original trace, screenshots, native observations and comparison results.

CM-1 retained editor DOM, document, focus, selection, field state and native Undo
while the new contribution handled input. CM-2 reproduced late A replacing B;
CM-3 preserved native changed-document rejection. CM-4 accepted B and rejected
late A without disturbing focus/selection. CM-5 rejected an earlier result after
edit and Undo returned equal text at a new revision. CM-6 cleared history while
retaining the draft and editable DOM, then tested an explicit reset separately.
CM-7 contrasted direct semantic Undo with a JSON round-trip: text Undo remained,
but the inverse custom effect did not. These are the qualified native boundaries,
not a claim that arbitrary plugin state or semantic history is portable.

### Frozen native backend input

The [backend input](evidence/live-update-backend-input-20261122-v1.tar.gz) and
[manifest](evidence/live-update-backend-input-20261122-v1.manifest.json) freeze
15 files, including 12 strict TypeScript sources and one dependency lock.
Archive SHA-256:
`06e8e448698bb2fa7af417c68822bbd4fb5fa5af71c62d2047ab426934814a59`.
The [workflow](../../.github/workflows/live-update-backend-reliability.yml)
uses Node 24.22.3 and the digest-pinned PostgreSQL 18.7 image. Its 17 unique
scenarios consist of 12 database cases, three Worker/Resources cases and two
joint cases. Execution E02 and state S09 name the same case and count once.

The [three independent Worker cases](evidence/live-update-worker-local-20261122.json)
passed locally on the same frozen source:
an abandoned close waiter left a responsive Worker; failed cleanup produced
visible debt and a later public close stopped it; a two-live-generation policy
refused C before acquisition and freed capacity only after A's native exit.
The [first hosted backend run](https://github.com/agent-teams-ai/extension-foundation/actions/runs/45042722876)
passed 16 of 17 tests, including both joint cases and all three Worker cases.
The [original artifact](evidence/live-update-backend-v1-attempt1-20261122.zip)
and [receipt](evidence/live-update-backend-v1-attempt1-20261122.json) retain the
failure: S13 correctly blocked deletion under `ON DELETE RESTRICT`, but the test
expected `23503` rather than PostgreSQL's specific `23001`. The reverse insertion
branch was not reached, so S13 remains incomplete in that run. All 15 returned
files match the input; actual PostgreSQL reports `180007` and the pinned image
digest. The local
admission case is serial; the retained operation is a native async generator
with controlled messages, not an HTTP or Readable transport qualification.

The [backend v2 input](evidence/live-update-backend-input-20261122-v2.tar.gz)
and [manifest](evidence/live-update-backend-input-20261122-v2.manifest.json)
correct only the first S13 expected error code, confirmed against PostgreSQL
18.7's referential-integrity source and error-code table. The reverse insertion
still expects `23503`; 14 other input files and the dependency lock are unchanged.
Strict TypeScript 7.0.2 passed before the corrected hosted run. Archive SHA-256:
`6aad6e191b132c8d6f95c7110d10e8db25ed3011ca8835d2f9586097fa1b732e`.
Its native outcome remains pending at this input checkpoint. S10's successful
rollback admission is a quiescent toy-codec check; it does not qualify concurrent
migration or guarantee that an old writer preserves newly added fields.
