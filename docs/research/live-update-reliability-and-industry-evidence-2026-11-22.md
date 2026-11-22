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

**Observation date: 2026-11-22, Europe/Kiev. First checkpoint: source review and
approved experiment plans; new native execution is pending.** The owner accepts
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

### Mechanism-level warnings

| Mechanism | Concrete risk or boundary | Transfer to the library | Current evidence |
| --- | --- | --- | --- |
| PostgreSQL row locks | `FOR KEY SHARE` does not block updates that leave key columns unchanged; a revision column can change under that lock | Receiver validation and mutation need a correctly conflicting, short transaction; test the exact SQL | [PostgreSQL 18 locking](https://www.postgresql.org/docs/18/explicit-locking.html); S07/S08 pending |
| Read Committed uniqueness | A conflicting insert may affect `ON CONFLICT DO NOTHING` while being invisible to that statement's snapshot | Reconcile the admitted operation in a fresh statement; do not assume a combined insert/fallback query returns a row | [PostgreSQL 18 isolation](https://www.postgresql.org/docs/18/transaction-iso.html); S12 pending |
| Worker termination | A host effect already dispatched by the guest has a separate lifetime | Keep the original authority token on the effect and validate at the receiver; termination alone cannot reject it | Joint native Worker/PostgreSQL negative control pending |
| CodeMirror asynchronous lint | Published source guards document identity but does not visibly guard the selected lint-source generation | Test same-document source replacement separately from changed-document completion; add only the missing contribution/revision guard | Release `@codemirror/lint` 6.9.8 inspected; CM-2 through CM-5 pending |
| CodeMirror history snapshot | Standard history JSON restores text changes but not custom inverted effects | State preservation declares document, selection, history and semantic effects separately; incompatible history needs an explicit reset/rebuild policy | Release `@codemirror/commands` 6.11.1 inspected; CM-7 pending |
| Resource lifetime | A cleanup callback can fail before terminating its live executor | Keep cleanup debt and physical-stop evidence visible; use the public scope's supported retry, not an invented success flag | Resources 0.2.2 public source inspected; real Worker probe pending |
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
| Preparation fails before publication | Keep the selected predecessor; release every acquired candidate resource and expose any debt | Public resource scope and adapter readiness/close receipts |
| Another attempt wins publication | Preserve the winner; release the losing candidate; any replan uses a new immutable attempt | Atomic expected-revision publication and recorded conflict |
| Publication acknowledgement is lost | Reconcile the same attempt before deciding which execution can be destroyed or retried | Durable outcome lookup with an explicit unknown state |
| Publication commits but useful behavior is not observed | Show selected versus useful separately; follow the declared recovery policy | Adapter health/render observation correlated to exact generation |
| Previous work continues | Keep its admitted code/dependency cohort; apply the chosen old-write policy | Explicit operation affinity plus receiver-owned authority |
| Cleanup fails or physical stop is unobserved | Retain the debt, owner and allowed next action; do not claim retirement | Scope report and native executor stop evidence |

This is a proposed protocol to qualify, not a new accepted public interface.
The durable attempt identifies immutable inputs and a selected state baseline.
Retrying it must not silently select a newer snapshot or turn an old token into
the current authority. Restarting the host cannot reconstruct a lost worker
heap merely because its artifact identity is persisted.

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
| Ordinary resource scope | Retained Resources6 and ALS5 | Coupled real executors, debt reconciliation, admission/stop races |
| Durable publication | Prior design/source analysis | New PG concurrency and crash probes; later distributed recovery |
| User state and history | Retained Yjs7 and React draft/history | New editor semantic-Undo and late-contribution probes; real IME |
| Library completeness | Owner-approved direction and feature boundaries | Independent external consumer, reusable operation and conformance |
| Separate repository bootstrap | Transfer packet and organization source retained | Provisioned remote and qualified current tooling cohort |

This matrix prevents several passing demonstrations from being presented as
coverage of the entire system. New reports must state which row changed and
what remains unproven.
