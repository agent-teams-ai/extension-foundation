---
id: research.temporal-replacement
type: research
status: active
owner: architecture
summary: Optional durable rollout coordination without transferring generation or product authority to a workflow engine.
---

# Temporal and Rollout Orchestration

Research cut: **2026-10-22**. Research and engineering judgment, not adoption, release approval, a new public SPI, or newly executed qualification. No accepted ADR is amended here. The [prior EF research family][ER] was read at `466e35a62481a6b21f2062524bb92c7eb221bb8c`; newer source pins below supplement their 2026-10-21 evidence.

## Current authority correction, 2026-10-25

The [new validation record](static-composition-and-controlled-restart-validation.md)
records owner-confirmed static restart and optional rollout scheduling, fresh
PostgreSQL/Temporal authority and newly executed evidence. Orchestrator main
ADR-0114/0115 already adopt native PostgreSQL including Fully Local Desktop.
Owner-accepted ADR-0116 in **unmerged PR90** selects full native Temporal Service
plus PostgreSQL for that product profile. Earlier OpenWorkflow/SQLite direction
below is retained only where explicitly historical; it is not current guidance.

## Recommendation

**Yes: Temporal can implement an adapter that durably coordinates a plugin-generation replacement. It should schedule and observe product Host operations, rather than become the generation runtime or request-admission authority.** It buys durable waits, crash recovery of coordination, retries, execution history and operational visibility. It does not make retained JavaScript references disappear, atomically switch product routes, fence a stale writer, migrate arbitrary plugin state, or prove physical cleanup. Those facts remain with their existing owners.

Use it where the product already operates Temporal or where a concrete replacement crosses processes/hosts and genuinely needs long-lived recovery. Do not adopt an orchestration platform merely to rotate one local worker. Keep the per-call execution path independent of the rollout workflow. A thousand plugin packages do not imply a thousand Temporal deployments, task queues or workflows continuously processing every invocation.

For this organization, the technology choice is substantially narrower than a fresh platform selection. Orchestrator [ADR-0027][O27] already accepts Temporal as a **replaceable Run Orchestration adapter**, with authoritative application persistence and application-owned authorization, idempotency and invariants. [OD-005][O05] already chooses TypeScript SDK first and records prior retained spike evidence. The earlier [OD-035 snapshot][O35] preferred an OpenWorkflow spike; the owner-accepted ADR-0116 in unmerged PR90 supersedes that branch direction with full native Temporal plus PostgreSQL. Extending scheduling to a plugin rollout needs its own owning feature/profile; it does not move plugin lifecycle business ownership into Run Orchestration or reopen the product workflow engine decision.

The reusable concern should follow the organization's [library-first rule][Q]: one neutral mechanism and conformance contract from the outset, validated with an ordinary disposable external project and at least one real consumer in the same delivery. **Do not recreate GM's existing lifecycle kernel inside a new library or workflow.** A separately owned library/repository may be justified for cross-platform generation execution adapters, replacement coordination contracts and conformance, if that concrete scope is admitted. Its useful identity is the responsibility it owns, not a universal plugin manager. Generic consumers should not need Agent Teams catalogs, credentials or governance records. Product policy, durable records and grants remain adapters supplied by the consumer. EF public-package qualification and GM release gates remain exactly as recorded. EF [OD-003][EOD] already requires rejecting an overlapping lifecycle state machine and contains the shared Host mechanics discussion; a workflow adapter must fit that discussion, not resolve it by implication.

## Existing authority and evidence

Local source reviewed:

| Repository / branch | Exact reviewed HEAD | Relevant authority |
| --- | --- | --- |
| `.github` / `main` | `d17901e6975fdb4388b1f75cad901e7f448aebbe` | Library-first; one concern/owner; neutral public names; real consumer and external fixtures; no speculative platform. |
| `extension-foundation` / `docs/plugin-research-hot-reload-20261021` | `466e35a62481a6b21f2062524bb92c7eb221bb8c` | Existing four research records; EF0011/0014/0015 ownership preserved. |
| `get-modular` / `docs/plugin-research-latest-20261021` | `8249c674ad53458b31d6ad06803ceb76e29ff4c7` | [ADR-0029][G29] and actual kernel; no new runtime authority. |
| `agent-teams-orchestrator` / `docs/plugin-research-adoption-20261021` | `477b3445c4c66416121559894cf6f393c9450c72` | ADR0027, OD005, OD035 and deployment profiles read at this revision. |

**Supersession of the 2026-10-22 authority assessment:** the earlier comparison
used Orchestrator `477b3445` and central reference `86a85d6`. Fresh main
ADR-0114/0115 supplies the explicit adoption previously reported missing. Its
bounded replacement preserves the earlier single-authority, logical-transfer
and exact-value requirements while adopting PostgreSQL locally. The
[current authority map](static-composition-and-controlled-restart-validation.md#current-storage-and-workflow-authority)
retains exact adopted references and distinguishes main from accepted PR90.
No accepted ADR body is changed by this correction.

OD005 reports **two independent 35/35 Temporal spike runs**. Its manifest records 70/70 and fingerprint `f8818afbd39e507b849ec697cb8eb6186f09bbdeee4cdc5b9bfa4aa9ce1eef5f`. Covered cases include worker death/replay, failure before/after application commit, overlapping timeout retries, stale/duplicate signals, product cancellation, late completion fencing, bounded Continue-as-New, pinned routing, readiness and application-command equivalence. **These are prior retained results, not rerun by this researcher and not a plugin-replacement qualification.** OD005 also records that `Worker.create()` did not prove server registration of a pinned build; start readiness required registration verification or retrying the same idempotent workflow start. [O05], [OE]

GM ADR0029 already owns the pure local state machine. Its candidate kernel is synchronous, dependency-free and has no IO, callbacks, timers, Promises or resource handles. Its WeakMap membership, phases and exact call/custody leases are local bookkeeping. It remains candidate/unreleased. Workflow progress may record that a quiesce command was requested or a host receipt was observed; it must not become a second owner of those live phase/token facts. A replayed history saying “zero leases” is not a fresh kernel observation after a host restart. [G29], [GK]

## What is borrowed, and what still has to be implemented

| Concern | Temporal supplies | Existing owner / unavoidable application protocol |
| --- | --- | --- |
| Durable rollout coordination | Persisted workflow execution history, replay, durable timers, message handling, Activity scheduling and retry machinery. | Which operation is allowed, which steps/results matter, retry budgets, escalation and compensation policy. |
| Rollout command uniqueness | Workflow identity/conflict policies can deduplicate starts within their documented scope. | Stable product operation ID, durable command receipts, expected revisions, scheduler ownership epoch; no claim of eternal deduplication after history retention/deletion. |
| Active plugin head | No atomic transaction over the product DB and an arbitrary worker's memory. | Canonical publication CAS/transaction, exact artifact/closure/grant revisions and authority fence; no plugin callback under the DB lock. |
| New request admission | Temporal routes Temporal tasks to workers. | Product acceptance, local `beginCall`, pending-cap accounting, fresh authority and exact generation selection before dispatch. |
| Object/reference lifetime | Workflow state reconstructs serialized execution progress. | Actual JS graph, closures, callbacks, pending finally/setup, retained handles and kernel token ownership. These cannot be serialized into transferable lease authority. |
| Old work affinity | Worker Deployment Versions can pin Temporal workflow executions. | Product operation's generation identity, immutable import/dependency closure and affinity of ordinary calls. Independently deployed Activities are a separate routing boundary. |
| Drain | Version drainage status counts open pinned Temporal workflows periodically. | Local accepted calls, pending admissions/setup/cleanup, durable work dispositions, query/recovery obligations, actual stop and resource evidence. |
| Cleanup/termination | Cancellation requests, timeouts and worker shutdown support. | Cooperative cleanup, host/supervisor process control, observed exit, descendants/external resources and unresolved debt. |
| State and effects | Recorded step outcomes; retries and supported workflow recovery APIs. | Domain schema/state compatibility, snapshots, single-writer transfer, external idempotency/receipts/reconciliation. No arbitrary effect undo. |
| Portability | Supported server/SDK deployment choices. | Browser/Node/Desktop execution adapters, profile-specific guarantees, offline packaging and qualified runtime custody. |

The Temporal column is borrowed infrastructure; the right column is mostly already required by EF and product contracts. Calling it “custom logic” does not make it removable: it is the protocol that says what success means. Conversely, writing a second general durable scheduler/outbox/history engine to avoid these small adapter methods would duplicate proven infrastructure and violate the existing direction. [O27], [E11]

## A concrete optional adapter shape

Keep **three different state authorities** explicit:

1. **Product persistence:** replacement intent/result, active head, effective authority, operation receipts, expected revisions and recovery disposition.
2. **GM kernel and actual execution owner:** exact local phase, live leases, retained objects and resources. Fresh observations are bound to the host incarnation. Physical custody comes from the approved supervisor/resource owner where applicable.
3. **Temporal:** which scheduling steps/awaits completed and which workflow task to execute next. It owns durable execution progress, not another active-head aggregate.

One workflow per replacement operation, or another bounded feature-owned grouping justified by workload, can coordinate the following. This is a conceptual command trace, **not an approved public API or second lifecycle FSM**:

| Step | Workflow role | Activity / Host role |
| --- | --- | --- |
| Request | Start under stable lifecycle-operation identity and scheduler epoch. | Admit the request in product persistence; bind expected head, exact artifact closure and profile. |
| Prepare | Schedule preparation; wait or reschedule observation. | Validate inert metadata/trust; retain custody before acquiring; create candidate under one exact execution owner; construct fresh immutable GM graph; readiness uses private control authority. |
| Publish | Request publication and observe original operation outcome. | Revalidate authority/closure/head; bounded product transaction commits canonical successor and fences. Lost ACK queries/reconciles the same operation. |
| Project | Wait for required observations, without assuming cached routing is authority. | Converge route/worker projections; keep committed-but-unavailable state explicit and prevent stale acceptance. |
| Retire predecessor | Durable wait/deadline drives an already defined Host command; workflow can survive coordinator failure. | Quiesce local admission, retain accepted work, revoke when policy requires, own actual close flight and request supervisor termination. |
| Complete / pending | Report a product-recorded terminal outcome, or pending/degraded/uncertain status. | Verify required cleanup, zero local leases, execution evidence and durable/effect disposition; release only owned references. |

Activities should invoke narrow, replay-safe **application commands**. Candidate creation cannot mean “spawn another worker on every Activity attempt.” For example, a repeated preparation command must return/reconcile the execution already bound to that operation or safely establish one new authorized owner under its ownership epoch. A timed-out first Activity can still be running when a second attempt starts. Host-owned identity and fencing prevent duplicate acquisitions; Temporal retry does not.

Prefer “request bounded host action, then observe its authoritative operation” to a single unbounded Activity that owns the entire lifetime of in-process references. An Activity can be useful for waiting with heartbeats, but it is not the actual owner of a JavaScript promise merely because it awaits it. If execution is host-specific, routing must identify that host/incarnation and handle its loss. The documented worker-specific task queue pattern needs bounded Schedule-to-Start and cleanup; it is not evidence that arbitrary retries on another host can recover local handles. Do not allocate versioned queues per plugin instance blindly. [TQ]

Start submission itself needs the already owned dispatch/reconciliation path: product DB commit and Temporal start are not one transaction. Reuse the existing outbox/dispatch owner where present. The same operation identity must be safe to submit again after lost acknowledgment. Do not introduce a second durable command journal in the replacement library. Keep external clients on product APIs as OD005 already requires.

### Admission stays off the workflow path

The proposed local-lease/canonical-acceptance bridge remains necessary. Pending acceptance consumes the cap; acquire actual local admission while active; dispatch only after confirmed canonical acceptance **and** current local token validity. Unknown acceptance reconciles the original operation. The real owner releases after actual completion or proven impossibility of dispatch. Temporal accepting a Signal/Update is acceptance into Temporal's history, not the product's authorization to invoke a plugin.

For ordinary low-latency calls, keep the stable typed request port, immutable captured generation and qualified admission authority local to the Host. No workflow Activity for every internal module call. A replacement workflow runs only on control changes and observations. Temporal therefore need not add network/durable-scheduling latency to each plugin request.

If a capability already executes a genuine durable job through Temporal, its existing job/Activity boundary can retain generation affinity. It still needs a product-owned policy for retaining old bytes, transferring at a proven checkpoint, or suspending/quarantining the job. That is a separate profile from the initial bounded read-only request cohort. An indefinitely pinned job can retain an old version indefinitely.

### Review clarification: dispatch and scheduler fencing

After the final pre-handoff await or payload conversion, the same Host execution
agent must validate the exact local call authority and perform its owned dispatch
transition without another user callback/await gap. Handoff can be acceptance by
the exact retained generation endpoint or by an owned queue already bound to that
generation and operation custody. It is not the worker's later CPU start. A queue
that chooses a new provider when it eventually runs is not this boundary.

Canonical acceptance/readback binds operation, generation, execution and Host
incarnation plus the applicable authority policy/revisions. A bare `accepted`
Boolean after Host restart cannot recreate a local nominal token. Reconcile and
fence the original execution before an explicitly authorized fresh attempt.
Conversely, a previously accepted closed-cohort call can legitimately outlive a
head change; do not reject it solely because its generation is no longer current.
These rules specialize the existing Host contract and do not claim atomicity
between a database commit and a cross-agent send.

Scheduler fencing must be enforced by the receiving authority-changing command,
not only by stopping old workflow starts. A delayed old Activity can otherwise
act after a provider switch. Retain the original operation ID and expected
revision/incarnation/epoch at receivers. An already accepted external effect
remains its effect owner's reconciliation responsibility.

## Worker Versioning is helpful, but it versions the right thing only when modeled correctly

Current Temporal uses **Deployment name + Build ID**, Current/Ramping routing, and Pinned/Auto-Upgrade workflow behaviors. A pinned workflow stays on its selected deployment version; an auto-upgrading one requires replay-safe evolution. Independent Activities use their own queue's routing, including unversioned queues; parent pinning does not freeze all participants. [TV]

There are two separate uses:

- **Version the rollout coordinator code:** deploy durable workflow code safely while a replacement operation is still in progress. This does not automatically version the plugin it coordinates.
- **Version plugin durable execution:** useful if plugin jobs are intentionally implemented as independently deployed Temporal workers. This can reuse pinning/ramping directly, while product admission, artifact trust, grants and migration remain necessary.

Do not equate each installed plugin artifact with a Temporal Worker Deployment. Deployment limits and the resource cost of concurrently retained versions need deliberate grouping. Current production docs list self-hosted minima SDK TypeScript 1.12, Server 1.29.1, CLI 1.4.1 and UI 2.38.0; these are compatibility floors, not latest-install recommendations. Current reviewed releases are TS SDK **1.24.0** and Server **1.32.1**. [TP], [TS], [TR]

Temporal “Drained” is a periodically refreshed statement about closed pinned workflows, not proof that the OS worker, application call, cleanup continuation or remote effect has stopped. Closed-workflow Queries during retention may still need old-version workers. Version metadata GC has separate poller/drain conditions. A correct product retirement report combines exact relevant evidence rather than promoting a Temporal status to universal cleanup proof. [TG]

Changing Current/Ramping back stops new workflow routing to a bad version; existing pinned jobs remain there. Recovery may require a replay-safe version override, reset or compensation. The runbook warns that resetting closed executions repeatedly is not idempotent and that Visibility is eventually consistent. “Roll back routing,” “repair admitted work” and “reconcile effects” must remain distinct results. [TB]

## Cancellation, timeouts, unknown outcomes and replay

**No workflow engine turns an arbitrary external side effect into exactly-once execution.** If a worker calls an external service successfully and dies before recording completion, a retry can repeat the call. Use the original application command/effect identity, durable receipt or authoritative effect-specific reconciliation. Even a single allowed attempt can have an unknown outcome. A replayed workflow returning a recorded result means the result was recorded; it is not proof that an unrecorded attempted effect never occurred. Temporal's own current MCP integration explicitly describes this lost-response repeat case. [TI]

Regular Activity cancellation arrives through heartbeats; delivery may be delayed by heartbeat throttling. `TRY_CANCEL` can let workflow logic proceed while an Activity continues, and `ABANDON` deliberately does not request cancellation. Explicit `WAIT_CANCELLATION_COMPLETED` provides a stronger wait at Temporal's Activity boundary, but a timeout or closed Activity record still does not establish physical absence of a task that ignored cancellation. Cancellation must propagate to the actual host command/API, and retirement still uses its own evidence. [TC], [TH]

**Source fidelity caveat:** current hosted TypeScript cancellation docs say default `TRY_CANCEL`, while SDK 1.24.0 `activity-options.ts` documents default `WAIT_CANCELLATION_COMPLETED`; the encoder maps the enum separately and does not by itself establish all default runtime behavior. This review did not run a default-behavior test. Set cancellation type explicitly and verify the exact SDK/server combination; do not make safety depend on a contradictory default annotation. [TC], [TA]

Workflow termination skips supported workflow cleanup/compensation. Stopping Temporal workflow history is not killing an arbitrary OS process or recalling an already accepted remote request. The 1.24.0 worker options say force-shutdown expiry throws and does **not** clean up running Activities/workflows; the application is advised to exit the process. Actual process/resource custody therefore remains outside the workflow adapter. [TT], [TW]

Workflow code must be replay-safe: filesystem/network/plugin evaluation and nondeterministic policy reads belong behind Activities, while workflow code coordinates recorded inputs and supported SDK operations. Keeping “call plugin cleanup” inside deterministic workflow code is incorrect. Pinning coordinator builds or controlled patching/Continue-as-New addresses workflow code evolution, not domain state compatibility. Local Activities reduce scheduling overhead but can run again before their marker is durably recorded; they cannot recover host-local ownership on another machine and are unsuitable as an assumption of exactly-once startup/cleanup. [TD], [TL]

State migration remains a domain contract: stable identity, schemas/serializers, compatibility direction, snapshot custody, single-writer transfer and effect reconciliation. Neither Temporal replay nor rollback restores a remote world to an earlier point. Initially preserve the existing research profile: canonical state outside the replaceable worker, no private-state migration or exclusives, read-only effects, bounded accepted requests.

## Deployment, portability, latency and cost

| Target / profile | Fit and limits |
| --- | --- |
| Hosted Node server | Good fit when Temporal already runs. TS workers use Node and a native SDK Core bridge; consumers deploy/operate their application workers even with Cloud. Keep workflow workers independent of the plugin generation they control. |
| Browser / Web client | Ordinary UI calls product APIs. The reviewed TypeScript SDK officially supports Node 20/22/24; its Worker requires Node-API native modules and Node execution facilities. A browser Web Worker is not a Temporal worker. Host protocol types and outcome semantics can be shared; runtime implementation and termination evidence differ. |
| Desktop connected to hosted authority | Client surface does not determine placement. Server-side Temporal may coordinate rollout, but a disconnected device cannot acquire fresh local permission from the hosted workflow. Define bounded offline/degraded authority separately. |
| Fully Local Desktop | Main ADR-0114/0115 adopt bundled native PostgreSQL. Accepted ADR-0116 in unmerged PR90 selects full native Temporal Service. Signed redistribution, lifecycle, crash/upgrade/restore and Windows/macOS/Linux qualification remain exact product gates. |
| Self-hosted server | Production Temporal service or Cloud plus application workers is required. Self-hosting adds service persistence, upgrades, backups, TLS, capacity and monitoring. SQLite/start-dev is development/test infrastructure, not a production Desktop packaging argument. |

These distinctions follow product [deployment profiles][OP] and Temporal's [runtime support][TS], [production deployment][TPR] and [persistence][TPS] docs. An adapter contract can preserve portable semantics without pretending every platform has identical local capabilities.

No defensible universal millisecond overhead follows from documentation. A normal Activity crosses durable scheduling/worker boundaries; placement, queue depth, service/network latency and retries matter. Do not quote an unmeasured constant. Benchmark replacement latency separately from request p50/p95/p99. Per-change coordination tolerates seconds-long durable waits far better than placing workflow scheduling inside each small module call.

At retrieval, Temporal Cloud Actions start at **$50 per million**, plus storage and plan/support. Developer has no base fee and adds 10% of usage; Business support is at least $500/month or 10% of usage, with allocations and volume terms. Action accounting includes starts, Activity attempts, delivered heartbeats and messages; events are not automatically one Action each. [TCost], [TAct]

Illustrative arithmetic, **not a measured rollout cost**: 10,000 changes/month × an assumed 20 billed Actions/change = 200,000 Actions, or $10 Actions at the introductory rate, before storage/support/compute. By comparison, 1,000 invocations/second × 30 days × only two assumed Actions/invocation = 5.184 billion Actions/month, with actual volume pricing and capacity still to assess. This is why the orchestration boundary matters more than the word “plugin.” Worker compute and operational attention can dominate low-volume control-plane cost. Cloud avoids operating the Temporal service; it does not operate arbitrary plugin workers or remove their retirement requirements.

## Alternatives and effort

Scores are engineering judgment, not uptime measurements. **Confidence** rates evidence/fit for this architecture, **reliability** rates achievable behavior within the bounded profile after qualification, and **complexity** increases with burden. LOC estimates are new maintained handwritten TS/config and tests/fixtures, excluding dependencies/generated code, existing GM kernel, product business code, state migrations, supervisor implementation, security sandboxing, UI/installers and platform operations. Ranges are planning bounds, roughly ±2×, not quotations. No option is newly production-qualified here.

The common bounded Node-worker replacement planning envelope remains the prior estimate: **3,000–5,500 production / 5,000–9,000 test LOC**, assuming existing product transactions, command identities, receipts, authorization, dispatch/reconciliation and execution custody. The adapter rows below describe **additional or substituted scheduling integration**, not a demonstrated reduction of that envelope. Do not add all rows together.

| Alternative | Confidence /10 | Reliability /10 | Complexity /10 | New production LOC | New tests/fixtures LOC |
| --- | ---: | ---: | ---: | ---: | ---: |
| Static immutable graph + controlled restart; no dynamic-cohort promise | 9 | 8 | 2 | 150–500 total | 300–900 total |
| Shared bounded mechanism + direct feature-specific driver using existing product persistence/scheduler | 8 | 8 | 6 | 3,000–5,500 total | 5,000–9,000 total |
| Same safety mechanism + Temporal rollout adapter, existing qualified Temporal infrastructure | 8 | 8 | 7 | 600–1,400 gross adapter allowance; net difference unknown | 1,200–2,500 gross adapter fixtures; net difference unknown |
| Historical OpenWorkflow local adapter alternative; superseded product selection | 6 | 7 | 7 | 800–1,800 gross adapter allowance | 1,800–3,500 gross adapter fixtures; OS qualification additional |
| Same mechanism + Restate coordinator, if Restate already operated | 6 | 8 | 7 | 900–2,000 gross adapter allowance | 2,000–4,000 gross adapter fixtures |
| Same mechanism + DBOS coordinator, if Postgres/DBOS already selected | 6 | 8 | 7 | 800–1,800 gross adapter allowance | 1,800–3,500 gross adapter fixtures |
| Same mechanism + Dapr Workflow, if Dapr already selected | 5 | 7 | 8 | 1,000–2,200 gross adapter allowance | 2,000–4,000 gross adapter fixtures |
| Adopt any new distributed workflow platform solely for one local reload | 3 | No host-safety increase by adoption alone | 9 | Adapter ranges omit substantial platform work | No honest small cross-platform qualification estimate |

Temporal's gross adapter allowance is identity/schema mapping, idempotent Activity commands, scheduler fencing, workflow/replay fixtures, operational readiness and failure reconciliation. It may reduce a direct driver's timer/retry/wake-up code, but its workers, histories and deployment versioning add real maintenance. Mature infrastructure is most economical when shared across genuine durable workflows. The right comparison is **existing persistence + bounded feature driver versus existing persistence + existing workflow adapter**. The actual net difference is the new adapter, replay and operational work minus the direct scheduling code it replaces; that subtraction was not measured. Adding the entire allowance to the earlier total is only a conservative budgeting scenario, not an established total or a minimum safety floor.

### OpenWorkflow: retained comparative evidence

The selected local direction is now native Temporal in accepted PR90; the following observations preserve the 2026-10-22 comparison. OD035's August 0.9.2 observation is historical. The release reviewed then is **0.11.0** (2026-10-12), commit `80d90b8d06b0cd43023dd324caa51fe35de4588f`. It adds cron/reruns and stale-step-completion fixes; current documentation includes OpenTelemetry. Do not repeat the old roadmap omissions as current absence. The release requires Node **22.22+**, which needs comparison with the actual Desktop runtime baseline. [OWR], [OWP]

It runs workers against SQLite/Postgres without another orchestration server and matches workflow name/version; missing versions are retried. Cancellation records workflow cancellation but an in-progress step may complete. Signals are **not buffered**: delivery with no waiter can be lost. A rollout adapter must reconcile the durable product operation after waking and use authoritative state/timers or an already owned inbox rather than rely on a one-shot notification. [OWV], [OWC], [OWS]

Pinned 0.11.0 worker code maintains per-execution leases/heartbeats and uses claim identity for writes; this does not fence arbitrary external calls after lease loss. Its CI file at the same commit runs Ubuntu Node and Bun jobs, not a Windows/macOS matrix. These were concrete concerns for the earlier OD035 spike; they do not reopen the later native Temporal selection. Current SQLite docs recommend it for low-throughput single-server use; full crash/corruption/upgrade/packaging parity remains the product gate. [OWI], [OWCI], [OWSQL]

### Restate, DBOS and Dapr: alternatives worth understanding, not new recommendations

**Restate** directly reuses immutable endpoint deployments: in-flight requests retry against their original endpoint, while new requests use the selected new deployment. Durable steps still require safe external idempotency; cancellation is cooperative/nonblocking, detached calls can outlive cancellation, and “kill” does not establish OS process absence. Its single binary can reduce service-management burden relative to a distributed Temporal installation, but single-node durability depends on disk and availability requires a cluster. Latest reviewed release: 1.8.1, 2026-10-21. It is attractive when services already live in Restate; replacing an accepted Temporal/local architecture just for plugin rollout adds an unnecessary second platform. [RV], [RD], [RC], [RH], [RR]

**DBOS** embeds durable workflow machinery with Postgres rather than requiring a separate workflow server. It tags workflows with application versions and recommends blue-green retention of old-version processes. Current TypeScript step timeout docs explicitly say uncooperative work continues in the background after timeout, while its result is discarded. That is the same cleanup/effect gap under a lighter hosting model. Latest reviewed release: 5.3, 2026-10-15. Its database transaction facilities can be valuable within their supported transactional scope; they are not an atomic transaction with an arbitrary plugin worker or external system. [DV], [DS], [DC], [DR]

**Dapr Workflow** supplies durable execution through its sidecar/actor/state infrastructure, versioning and patching. Current docs warn mismatched workflow registrations can stall during rollout and old/dormant versions must be retained. JavaScript workflow authoring uses deterministic generator functions. Adopting Dapr solely for generation rotation would introduce more infrastructure and SDK constraints without solving reference ownership. It would require an independently selected workflow profile. The newer central backend reference uses Dapr for private service invocation and explicitly excludes it as the workflow engine; Dapr installation does not select Dapr Workflow. [DP], [DJ]

## If Temporal itself is a replaceable provider

Keep the scheduler adapter **outside the replacement closure it drives**. A rollout must not await the drain of its own workflow/activity worker or control channel. Reuse the independently owned supervisor/bootstrap/control path. Upgrading the Temporal server is a service deployment/backup/compatibility operation; it is not equivalent to swapping a local provider object.

Switching from Temporal to another scheduling provider requires a **scheduler-ownership fence** in canonical product state. Old and new coordinators cannot both drive one process generation. Stop new starts on the old provider, keep old histories/workers available to finish or explicitly disposition them, establish a safe checkpoint if transfer is supported, revoke old scheduler ownership, then resume under the new owner. Product command IDs and receipts retain their identity. Do not silently dual-run, replay effects with new keys, or claim generic history conversion. OD005 already forbids in-process and Temporal schedulers concurrently coordinating the same process generation without such a fence. [O05]

Reusable driver code may implement the single product-authorized lifecycle operation. It should depend on narrow, consumer-owned commands/observations and an optional scheduling adapter, not import Temporal into GM, EF neutral cores or domain/application code. It must not create another authoritative lifecycle aggregate. A provider can be replaceable without every active history being portable. Draining existing operations on their original provider is a valid exit strategy; migrating them needs a separate demonstrated contract.

No Rust rewrite is justified by the orchestration question. The official TS SDK already uses native Rust Core through Node-API. Use the accepted physical process/resource-custody owner for the responsibilities it actually owns; do not introduce a new Rust supervisor here. The orchestration adapter, product command mappings and shared TypeScript protocol logic remain TypeScript unless a measured requirement changes the owning decision. [TS], [TCore], [O05]

## What could falsify or materially change this recommendation

1. A real capability proves every invocation is already a durable Temporal job, and its plugin implementation is already one immutable worker build: direct Worker Versioning reuse may remove substantial custom execution routing.
2. Replacement must survive multi-hour device disconnection while accepting new local work: hosted Temporal cannot be the sole coordinator/authority; the already identified local profile becomes necessary.
3. The product already has qualified wake-up, timers, retry dispatch and receipts, and rollouts are short/single-host: the optional Temporal adapter may add more work than it removes.
4. Admission/publication cannot be implemented under existing canonical persistence/grant/fence owners: no workflow provider can compensate for that missing authority boundary; the LOC estimate is invalid.
5. A capability owns exclusive native state or irreversible effects: the first overlap-safe read-only profile no longer applies; state/effect owners must define handoff/recovery before implementation.
6. Required throughput, latency, history retention or operational cost fails representative measurement: regroup workflows/versions or keep control scheduling direct, without weakening admission evidence.
7. The selected native Temporal/PostgreSQL bundle fails its actual OS/crash/upgrade/restore matrix: retain the failing qualification and address it through the owning product decision, without an implicit fallback engine.

## Focused qualification before adoption

Reuse OD005's retained fixtures where their inputs/contract remain valid; add only the new generation-specific boundary cases. Kill the coordinator after publication commits but before ACK; timeout preparation while the original Activity continues; duplicate the same command; lose an observation notification; restart the Host and reject stale local identities; revoke while accepted dispatch is pending; retain a long finally through cancellation; report unknown exit separately; verify stale scheduler fencing after provider switch. Replay representative rollout histories on the selected coordinator versions. Prove a thousand installed inactive plugins do not create a thousand permanent workflow workers or unbounded histories.

The real consumer plus disposable external project must use the same neutral mechanism without organization credentials. Measure per-call latency independently from rollout latency and repeated-churn resource stabilization. No dynamic production claim follows until the current GM/EF/product gates are met. This memo ran source inspection only, not those tests.

## Owner input genuinely still needed

- Which real overlap-safe capability and execution placement will qualify the first consumer, and what is its required availability/replacement deadline?
- Which existing product operation/admission/dispatch owners expose the concrete commands and scheduler fence, and is rollout long-lived/distributed enough to warrant Temporal immediately?
- Does the new reusable scope belong in a separately admitted neutral package/repository or an existing owner? This cannot be settled by copying GM's kernel or declaring EF's unreleased SPI public.

These are bounded implementation ownership questions, not requests to reconsider approved GM/FMS adoption, TypeScript-first Temporal, the physical custody direction or the future local profile.

## Primary source ledger

All moving documentation retrieved 2026-10-22. GitHub pins are evidence snapshots, not instructions to change accepted dependency pins. Release inspection/source review is not runtime reproduction.

- **Q:** [Central quality standard at reviewed `.github` revision][Q].
- **O27 / O05 / O35 / OE / OP:** Orchestrator accepted adapter decision, open operational choices/local spike, retained evidence manifest and deployment profiles at reviewed branch HEAD.
- **G29 / GK:** GM lifecycle candidate decision and actual kernel at reviewed revision; preserves single local owner and release limits.
- **E11 / ER:** EF canonical admission/retirement decision and prior research at supplied PR55 revision.
- **TV / TG / TB / TC / TT / TD:** Temporal documentation source at `82ac5bd3194a042b984f72c3c5db8ea5e96d9c39` (latest observed docs commit; 2026-10-21T22:07:05Z), plus hosted docs where noted.
- **TS / TA / TW / TCore:** TypeScript SDK 1.24.0, commit `1fd1c81a0383f5f5c7923dd735472c7d1ffdc867`, release 2026-09-15; Core gitlink `db635f0f21b0168a01f993e0f1b6c0f1983ec2bc` points to `temporalio/sdk-rust`.
- **TR:** Server latest observed 1.32.1, 2026-10-08. Current docs list older compatibility minima separately.
- **OWR / OWP / OWI / OWCI:** OpenWorkflow 0.11.0, commit `80d90b8d06b0cd43023dd324caa51fe35de4588f`, tag object `44145eb2e9704e59fffb9434c71ff565798c3e17`, 2026-10-12. Hosted docs are moving; critical release/source observations use the pin.
- **RV / RD / RC / RH / RR:** Restate current hosted official docs; release 1.8.1 points at `20efb1b83a39b8227451e531c366e067588ae9ee`, 2026-10-21. Alternative was not installed or qualified.
- **DV / DS / DC / DR:** DBOS current official TypeScript docs and 5.3 release (2026-10-15). Alternative was not installed or qualified.
- **DP / DJ:** Current Dapr official versioning and JavaScript workflow guides; no new Dapr adoption or runtime version qualification implied.

[Q]: https://github.com/agent-teams-ai/.github/blob/d17901e6975fdb4388b1f75cad901e7f448aebbe/docs/engineering-quality-standard.md
[O27]: https://github.com/agent-teams-ai/agent-teams-orchestrator/blob/477b3445c4c66416121559894cf6f393c9450c72/docs/decisions/0027-temporal-as-run-orchestration-adapter.md
[O05]: https://github.com/agent-teams-ai/agent-teams-orchestrator/blob/477b3445c4c66416121559894cf6f393c9450c72/docs/open-decisions/OD-005-temporal-workflow-boundary.md
[O35]: https://github.com/agent-teams-ai/agent-teams-orchestrator/blob/477b3445c4c66416121559894cf6f393c9450c72/docs/open-decisions/OD-035-local-durable-workflow-engine.md
[OE]: https://github.com/agent-teams-ai/agent-teams-orchestrator/blob/477b3445c4c66416121559894cf6f393c9450c72/docs/research/foundation-spike-evidence-manifest-2026-07-26.md
[OP]: https://github.com/agent-teams-ai/agent-teams-orchestrator/blob/477b3445c4c66416121559894cf6f393c9450c72/docs/architecture/deployment-profiles.md
[G29]: https://github.com/agent-teams-ai/get-modular/blob/8249c674ad53458b31d6ad06803ceb76e29ff4c7/docs/decisions/0029-admit-an-optional-lifecycle-kernel-candidate.md
[GK]: https://github.com/agent-teams-ai/get-modular/blob/8249c674ad53458b31d6ad06803ceb76e29ff4c7/packages/lifecycle-kernel/src/features/lifecycle/kernel.ts
[EOD]: https://github.com/agent-teams-ai/extension-foundation/blob/466e35a62481a6b21f2062524bb92c7eb221bb8c/docs/open-decisions/OD-003-module-runtime-and-public-spi-choices.md
[E11]: https://github.com/agent-teams-ai/extension-foundation/blob/466e35a62481a6b21f2062524bb92c7eb221bb8c/docs/decisions/0011-extension-admission-custody-and-retirement-closure.md
[ER]: https://github.com/agent-teams-ai/extension-foundation/blob/466e35a62481a6b21f2062524bb92c7eb221bb8c/docs/research/hot-reload-and-generation-replacement.md
[TV]: https://github.com/temporalio/documentation/blob/82ac5bd3194a042b984f72c3c5db8ea5e96d9c39/docs/encyclopedia/workers/worker-versioning.mdx
[TP]: https://docs.temporal.io/production-deployment/worker-deployments/worker-versioning
[TG]: https://github.com/temporalio/documentation/blob/82ac5bd3194a042b984f72c3c5db8ea5e96d9c39/docs/production-deployment/worker-deployments/worker-versioning/sunset-and-gc.mdx
[TB]: https://github.com/temporalio/documentation/blob/82ac5bd3194a042b984f72c3c5db8ea5e96d9c39/docs/production-deployment/worker-deployments/recover-pinned-workflows.mdx
[TC]: https://github.com/temporalio/documentation/blob/82ac5bd3194a042b984f72c3c5db8ea5e96d9c39/docs/develop/typescript/workflows/cancellation.mdx
[TH]: https://docs.temporal.io/encyclopedia/detecting-activity-failures
[TT]: https://github.com/temporalio/documentation/blob/82ac5bd3194a042b984f72c3c5db8ea5e96d9c39/docs/encyclopedia/workflow/cancellation-and-termination.mdx
[TD]: https://github.com/temporalio/documentation/blob/82ac5bd3194a042b984f72c3c5db8ea5e96d9c39/docs/develop/typescript/workflows/basics.mdx
[TL]: https://docs.temporal.io/local-activity
[TQ]: https://docs.temporal.io/design-patterns/worker-specific-taskqueue
[TI]: https://docs.temporal.io/develop/python/integrations/mcp
[TS]: https://github.com/temporalio/sdk-typescript/blob/1fd1c81a0383f5f5c7923dd735472c7d1ffdc867/README.md
[TA]: https://github.com/temporalio/sdk-typescript/blob/1fd1c81a0383f5f5c7923dd735472c7d1ffdc867/packages/common/src/activity-options.ts
[TW]: https://github.com/temporalio/sdk-typescript/blob/1fd1c81a0383f5f5c7923dd735472c7d1ffdc867/packages/worker/src/worker-options.ts
[TCore]: https://github.com/temporalio/sdk-typescript/tree/1fd1c81a0383f5f5c7923dd735472c7d1ffdc867/packages/core-bridge/sdk-core
[TR]: https://github.com/temporalio/temporal/releases/tag/v1.32.1
[TPR]: https://docs.temporal.io/production-deployment
[TPS]: https://docs.temporal.io/temporal-service/persistence
[TCost]: https://docs.temporal.io/cloud/pricing
[TAct]: https://docs.temporal.io/evaluate/cloud/actions
[OWR]: https://github.com/openworkflowdev/openworkflow/releases/tag/openworkflow%400.11.0
[OWP]: https://github.com/openworkflowdev/openworkflow/blob/80d90b8d06b0cd43023dd324caa51fe35de4588f/packages/openworkflow/package.json
[OWI]: https://github.com/openworkflowdev/openworkflow/blob/80d90b8d06b0cd43023dd324caa51fe35de4588f/packages/openworkflow/worker/worker.ts
[OWCI]: https://github.com/openworkflowdev/openworkflow/blob/80d90b8d06b0cd43023dd324caa51fe35de4588f/.github/workflows/ci.yaml
[OWV]: https://openworkflow.dev/docs/versioning
[OWC]: https://openworkflow.dev/docs/canceling
[OWS]: https://openworkflow.dev/docs/signals
[OWSQL]: https://openworkflow.dev/docs/sqlite
[RV]: https://docs.restate.dev/services/versioning
[RD]: https://docs.restate.dev/develop/ts/durable-steps
[RC]: https://docs.restate.dev/services/invocation/managing-invocations
[RH]: https://docs.restate.dev/server/overview
[RR]: https://github.com/restatedev/restate/releases/tag/v1.8.1
[DV]: https://docs.dbos.dev/typescript/tutorials/upgrading-workflows
[DS]: https://docs.dbos.dev/typescript/tutorials/step-tutorial
[DC]: https://docs.dbos.dev/typescript/reference/configuration
[DR]: https://github.com/dbos-inc/dbos-transact-ts/releases/tag/v5.3
[DP]: https://docs.dapr.io/developing-applications/building-blocks/workflow/workflow-versioning/
[DJ]: https://docs.dapr.io/developing-applications/sdks/js/js-workflow/
