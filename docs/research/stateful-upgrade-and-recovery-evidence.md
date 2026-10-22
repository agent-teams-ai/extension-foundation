---
id: research.stateful-updates
type: research
status: active
owner: architecture
summary: Temporal and Flink evidence on generation affinity, state compatibility, drain and external-effect recovery.
---

# Stateful Upgrade and Recovery Evidence

Research date: 2026-10-21. Scope: two primary-source cases, Temporal Worker Versioning and Apache Flink stateful job upgrades. This memo extracts constraints for a product Host; it does not propose adopting either framework or change accepted architecture. Facts below describe documented contracts, not reproduced production results. Product implications are explicitly marked as inference.

## Finding

**A code generation can stop receiving new work while remaining necessary for existing work, and a successfully restored execution can still repeat an external effect.** Durable ownership therefore survives the publication of a new active generation. The Host needs an explicit answer for every old job, timer, stream partition, pending write and recoverable snapshot; disposing a constructed dependency graph answers only part of that question.

Temporal provides the stronger example of execution-affine generations and controlled recovery. Flink provides the stronger example of stable state identity, migration limits and the difference between pausing a stream and completing its event-time semantics. Both are successful protections and counterevidence against treating all dynamic replacement as inherently unsafe. Neither promises arbitrary code replacement with automatic business rollback.

## Source and version discipline

Temporal's current model uses **Worker Deployment name + Build ID**, Current/Ramping versions, and Pinned/Auto-Upgrade behaviors. Its changelog dates Worker Versioning GA to **2026-03-30**, while the separately announced Upgrade-on-Continue-as-New capability remains explicitly **Public Preview / experimental SDK option** in the retrieved documentation.[T0, T7] The production guide lists self-hosted minimum Server **1.29.1**, CLI **1.4.1** and TypeScript SDK **1.12**; these are compatibility minima, not recommendations to install those old versions.[T2]

Do not mix this with the 2023 compatibility-set model or 2024 prerelease model. The legacy encyclopedia identifies the 2023 draft as deprecated and distinguishes the 2024 opt-in draft. Current SDK documentation says pre-2025 support **was scheduled** for removal in March 2026. This wording does not independently establish removal in every server release; no such claim is made here.[T8]

Flink's official downloads page identifies **2.3.0** as latest stable at retrieval. This memo uses the **release-2.3** documentation, not the `master` documentation, which can describe unreleased behavior.[F0] Public documentation repository heads were resolved through GitHub's public commit API: Temporal **34fb32fb06a6cb8d71df25f8dd9d522c93fecb9b** and Flink release-2.3 **f237727ed52dbe967bc022268b173fb68587b81b**. Immutable source links below preserve what was inspected even if the hosted guides change.

## Case 1 — Temporal: route executions, retain old generations

### What pinning actually protects

A Worker Deployment Version groups workers running the same build and environment. Pinned workflows remain on their selected version; Auto-Upgrade workflows move with deployment routing and must remain replay-safe through compatible code or patching. Current and Ramping versions direct new work without automatically moving existing pinned executions.[T1]

This is execution routing across concurrent versions, not mutation of a live worker's code. Activities generally follow their workflow's version, but **Independent Activities** use a task queue outside the workflow's deployment version and follow that queue's own routing, which may be Current/Ramping or unversioned. A pinned parent therefore does not imply every participant in the business operation is pinned.[T1]

**Host inference:** persist the execution's selected generation separately from the current admission head. Resolve follow-up work from that durable selection. Record which dependencies intentionally float across generations. A generation ID alone does not freeze an external database schema, remote API, model provider or independently deployed activity implementation; those dependencies need their own compatibility contracts.

### Draining is an observed lifecycle, not a timeout

Temporal distinguishes Active, Draining and Drained. Drainage is refreshed periodically by checking open pinned workflows, with an observable last-check time. An old version is eligible for shutdown after its work drains, but queries against closed pinned workflows can still require workers of that version. Version metadata and executable capacity also have different garbage-collection conditions.[T3]

An indefinitely running pinned execution can keep an old deployment necessary. By default, pinned workflows inherit their version across Continue-as-New. The preview upgrade option moves the *new run* at that explicit boundary; it does not rewrite a run already in progress.[T7]

**Host inference:** an HTTP connection count or zero currently running callbacks is insufficient evidence of drain when durable jobs can wake tomorrow. Drain evidence should include suspended jobs, scheduled timers, recovery/query obligations and any independently owned work. A drain deadline must lead to a stated disposition—retain capacity, transfer at an application-defined checkpoint, suspend for operator recovery, or cancel—not silently relabel the generation retired. Snapshot/pin retention needs a resource budget because a sequence of long-lived versions otherwise grows without a natural bound.

### Rollback of admission is separate from repair of admitted work

Temporal's bad-rollout runbook first restores routing to a good version. It explicitly says already pinned workflows remain on the faulty version. Its recovery choices depend on execution status, restartability and state integrity: move an intact execution to a **replay-safe** version, or reset history while moving it. A closed execution can require compensation outside the workflow. Restartability is a property the application owner must establish.[T4]

The runbook also exposes operational limits: visibility queries are eventually consistent; repeated recovery must account for drainage. Resetting the same closed workflow is **not idempotent**, whereas the described running-workflow batch selection stops matching after migration. Thus even a mature recovery API does not make every repair command safely repeatable.[T4]

**Host inference:** define at least three outcomes independently: routing rollback succeeded; existing executions recovered or quarantined; externally visible effects reconciled. A new code digest cannot prove it accepts histories written by the failed build. Test replay using representative persisted histories before transfer, and validate application invariants afterward; replay consistency alone is not proof that the original business action was correct.

### Cancellation and physical stopping have different evidence

Temporal cancellation is cooperative and lets workflow code perform supported cleanup. Activity cancellation is delivered through heartbeats, so missing or throttled heartbeats prevent or delay delivery. Workflow termination closes execution immediately without executing cleanup or compensation.[T5] Worker shutdown is a separate layer: the shutdown guide documents SDK differences and cases where an Activity continues running or blocks shutdown. It tells applications to honor context cancellation.[T6]

Activities can perform arbitrary external actions; Temporal recommends idempotency to avoid duplicate effects when attempts retry.[T9]

**Host inference:** distinguish cancellation requested, execution closed, task attempt stopped, worker exited, capability revoked and external effect settled. A cancellation acknowledgement is not a transaction undo or physical process kill. A network call may have succeeded before its completion was durably recorded. Carry a stable business-operation idempotency key across retries and generation changes; do not generate a fresh key merely because the worker changed. Store effect receipts or use an existing product outbox/transaction mechanism where the product already owns one.

## Case 2 — Flink: restore state only when identity and semantics agree

### Stable state identity is independent of code placement

A savepoint captures a consistent execution-state image. Flink maps stored operator state to the new job through operator IDs. Automatically generated IDs depend on graph topology and can change when the program changes; explicit stable UIDs are recommended. New stateful operators start without prior state. Unmatched old state normally prevents restoration unless the operator deliberately permits discarding it. Canonical savepoints favor compatibility across state backends; native format trades broader portability for performance.[F1]

**Host inference:** durable contribution/job identity must not be derived from array position, registration order, source file path or an implementation's current placement. State custody should identify logical owner, schema version, producer generation, serializer format and snapshot provenance. Removing a plugin with persisted work must require an explicit retain/transfer/discard outcome. Silently ignoring unrecognized state makes a deployment appear healthy while losing business work.

### Migration support is bounded and directional

Flink's built-in state schema evolution documentation supports POJO and Avro types subject to rules. POJO fields can be added or removed, but declared field types and class name/namespace cannot change. Removed fields disappear from future snapshots. Key schema evolution is unsupported; collapsing distinct keys can require a semantic merge the runtime cannot invent. Kryo serialization prevents the documented automatic evolution guarantee, including nested values serialized through Kryo.[F2]

For explicit transformations, Flink's State Processor API can read, write and modify savepoints, split/merge state, change data types or operator UIDs. It retains the restore compatibility constraints of DataStream applications; an API for transforming state does not prove an arbitrary transformation correct.[F5]

**Host inference:** require a compatibility declaration with a direction, such as “B reads A-state.” “A reads B-state” is an independent requirement. Once B drops data or writes a new external schema, reinstalling A may no longer be a valid rollback. Preserve the pre-upgrade snapshot and needed serializers until the rollback window ends, and document whether rollback means read the new state, restore an old snapshot plus reconcile effects, or deploy a forward repair. Migration ownership belongs to the feature/domain that understands invariants, with the Host coordinating custody and readiness.

### The word “drain” can mean permanent logical completion

Flink `stop` creates a final savepoint as shutdown propagates from sources toward sinks. The separate `--drain` flag emits `MAX_WATERMARK`, firing event-time timers and flushing windows. The CLI documentation says to use it for permanent termination and warns against draining if the pipeline will resume, because restoration can yield incorrect results. The current CLI also deprecates cancellation-with-savepoint in favor of `stop`.[F3]

**Host inference:** a universal `drain()` hook is underspecified. For a stream it might mean stop intake while preserving open windows, or permanently close those windows and emit final results. For a durable agent it might mean finish the current turn, or close the entire user conversation. The product protocol must define the boundary and expected state after resumption. “Graceful” describes cooperation, not one universally correct completion behavior.

### A consistent snapshot is not a rollback of the world

Since Flink 1.15, intermediate savepoints do not participate in normal recovery or commit side effects. The savepoints guide warns about multiple jobs sharing a checkpoint timeline: restoring a second job while the first can recover to an earlier checkpoint can commit inconsistent transactions. It describes stopping the original job before running its successor as the straightforward single-timeline case.[F1]

The upgrade guide explicitly states restoration cannot revert external writes and can emit duplicate output when work after the snapshot is repeated. Its compatibility table concerns the **internal savepoint data format**, not SQL operator semantics or all higher-level behavior. Table/SQL changes and runtime-plan changes can invalidate state compatibility despite a readable snapshot.[F4]

**Host inference:** publishing two generations that can both resume the same durable state requires a single-writer ownership rule, fencing or an equivalent product-specific transaction protocol. Snapshot success and new-worker readiness do not establish that ownership. A source checkpoint, state snapshot and sink commit must refer to a coherent recovery boundary. A generic plugin lifecycle abstraction must not claim end-to-end exactly-once effects simply because its internal state was restored consistently.

## Applying the cases to Host / GM / EF

The following is a proposed interpretation of the supplied repository ownership baseline, not an upstream framework contract or new architecture approval.

| Concern | Semantic owner and implication |
| --- | --- |
| Select and publish a new generation | Product Host coordinates admission, readiness and routing; new construction can use a new immutable GM plan/instance. |
| Durable execution affinity | Product execution owner stores the selected generation and resumes against it; Host retains executable availability or an explicit recovery disposition. |
| State meaning and migrations | Feature/domain owner defines invariants and transformations; Host coordinates snapshot, exclusivity and recovery. EF can supply neutral custody/provenance primitives without owning domain migrations. |
| Artifact identity and trust | EF primitives can identify exact artifacts and trust/revocation evidence; Product Host decides executable admission and effective grants. |
| Resource cleanup | GM cooperative resources can report registered cleanup completion; Host separately proves worker termination, durable work disposition and authority removal. |
| External effects | Existing product transaction/idempotency/outbox owner remains authoritative; avoid a second effect ledger in a generic hot-reload subsystem. |

### Emergency revocation is a separate operation

**Inference from the limits above:** ordinary upgrade assumes the old generation may remain trusted long enough to finish. Security revocation can invalidate that assumption. The Host must be able to stop admission, block resumption by the revoked artifact identity, withdraw its effective grants or fence subsequent brokered writes, and stop/quarantine workers independently of ordinary drain. Do not wait indefinitely for a compromised worker to cooperate. Preserve state/effect evidence for recovery by a trusted version. Revoking a credential does not recall an already authorized remote operation, and terminating execution does not reverse completed writes.

This should be a distinct protocol and observable result, not `upgrade(force=true)` with hidden data-loss semantics. A product may choose fast fail-closed revocation for certain capabilities and a controlled handoff for others; those policies need a real threat model and consumer before their contracts are generalized into EF.

### Qualification questions exposed by these cases

Before claiming stateful hot replacement, demonstrate a pinned job sleeping across several publications; a replay-incompatible target rejected before transfer; forward migration followed by attempted rollback; an external write whose acknowledgement is lost; a revoked worker that ignores cancellation; and a stale worker attempting a write after ownership transfer. Include stream-specific stop/resume behavior if streams are actually in scope. These scenarios are research-derived acceptance concerns, not a request to build a universal durable runtime.

No framework adoption or implementation alternative is selected here, so this memo does not attach speculative LOC or numerical reliability scores. The unresolved choice is per real operation: retain its old generation, transfer at a compatible boundary, or stop and reconcile. Scope estimates should follow the concrete consumer and chosen semantics.

## Primary source register

All retrievals: 2026-10-21. `T*` immutable files use Temporal documentation commit **34fb32fb06a6cb8d71df25f8dd9d522c93fecb9b**; `F*` immutable files use Flink release-2.3 commit **f237727ed52dbe967bc022268b173fb68587b81b**. No incident claim is inferred from documentation warnings. The deprecated models and pre-1.15 behavior are historical; the documented current limitations above are not presented as defects awaiting a fix.

- **T0:** [GA announcement, 2026-03-30](https://temporal.io/changelog/worker-versioning-continue-as-new-worker-controller).
- **T1:** [Worker Versioning concepts: behaviors, independent activities, routing](https://github.com/temporalio/documentation/blob/34fb32fb06a6cb8d71df25f8dd9d522c93fecb9b/docs/encyclopedia/workers/worker-versioning.mdx).
- **T2:** [Production guide and minimum versions](https://github.com/temporalio/documentation/blob/34fb32fb06a6cb8d71df25f8dd9d522c93fecb9b/docs/production-deployment/worker-deployments/worker-versioning/index.mdx).
- **T3:** [Sunset and garbage collection](https://github.com/temporalio/documentation/blob/34fb32fb06a6cb8d71df25f8dd9d522c93fecb9b/docs/production-deployment/worker-deployments/worker-versioning/sunset-and-gc.mdx).
- **T4:** [Recover pinned Workflows after a bad rollout](https://github.com/temporalio/documentation/blob/34fb32fb06a6cb8d71df25f8dd9d522c93fecb9b/docs/production-deployment/worker-deployments/recover-pinned-workflows.mdx).
- **T5:** [Cancellation and Termination](https://github.com/temporalio/documentation/blob/34fb32fb06a6cb8d71df25f8dd9d522c93fecb9b/docs/encyclopedia/workflow/cancellation-and-termination.mdx).
- **T6:** [Worker Shutdown Behavior](https://github.com/temporalio/documentation/blob/34fb32fb06a6cb8d71df25f8dd9d522c93fecb9b/docs/encyclopedia/workers/worker-shutdown.mdx).
- **T7:** [Upgrade on Continue-as-New; explicit preview status](https://github.com/temporalio/documentation/blob/34fb32fb06a6cb8d71df25f8dd9d522c93fecb9b/docs/production-deployment/worker-deployments/worker-versioning/upgrade-on-continue-as-new.mdx).
- **T8:** [Legacy encyclopedia](https://github.com/temporalio/documentation/blob/34fb32fb06a6cb8d71df25f8dd9d522c93fecb9b/docs/encyclopedia/worker-versioning-legacy.mdx) and [current TypeScript versioning guide, scheduled removal wording](https://github.com/temporalio/documentation/blob/34fb32fb06a6cb8d71df25f8dd9d522c93fecb9b/docs/develop/typescript/workflows/versioning.mdx).
- **T9:** [Activities and idempotency](https://docs.temporal.io/activities), hosted guide retrieved on the stated date.
- **F0:** [Official stable downloads](https://flink.apache.org/downloads/) and [2.3.0 release announcement, 2026-06-25](https://flink.apache.org/2026/06/25/apache-flink-2.3.0-release-announcement/).
- **F1:** [Savepoints: UIDs, formats and intermediate-savepoint side effects](https://github.com/apache/flink/blob/f237727ed52dbe967bc022268b173fb68587b81b/docs/content/docs/ops/state/savepoints.md).
- **F2:** [State Schema Evolution and limitations](https://github.com/apache/flink/blob/f237727ed52dbe967bc022268b173fb68587b81b/docs/content/docs/dev/datastream/fault-tolerance/serialization/schema_evolution.md).
- **F3:** [CLI: stopping versus draining versus cancellation](https://github.com/apache/flink/blob/f237727ed52dbe967bc022268b173fb68587b81b/docs/content/docs/deployment/cli.md#terminating-a-job).
- **F4:** [Upgrading: external writes and compatibility scope](https://github.com/apache/flink/blob/f237727ed52dbe967bc022268b173fb68587b81b/docs/content/docs/ops/upgrading.md).
- **F5:** [State Processor API](https://github.com/apache/flink/blob/f237727ed52dbe967bc022268b173fb68587b81b/docs/content/docs/libs/state_processor_api.md).
