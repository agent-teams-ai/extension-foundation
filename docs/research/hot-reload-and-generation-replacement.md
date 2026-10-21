---
id: research.hot-reload
type: research
status: active
owner: architecture
summary: Research options, invariants, failure traces and qualification scenarios for production hot replacement.
---

# Hot Reload and Generation Replacement

Research synthesis, **2026-10-21**. This document recommends a concrete research target; it does not implement, adopt, publish, or approve a runtime. Accepted ADRs retain their exact authority. Repository contracts were checked at GM `7131d0d7a6bb5dd4c3e8906ccac065c0be0e0333` and EF `9ea7024672ae06a15c701fa1e23bf6db37975e20`. External findings derive from the companion primary-source memos; no runtime, failure-injection suite, or comparative benchmark was executed. Scores and costs below are engineering judgments.

## Recommendation and ownership

**Qualify replacement of one closed, overlap-safe, request-oriented capability cohort in a trusted Node worker.** Construct a fresh immutable GM instance for each generation, publish through product-owned durable admission, finish bounded accepted operations against their original generation, and retire the predecessor using explicit cleanup and execution evidence. Start with read-only capability behavior, canonical product state outside the worker, no private-state migration, no exclusive resource acquisition, and one typed Host-facing request port. Several related modules may share this cohort. Ordinary static modules retain ordinary composition.

This makes executable replacement a first-class target while keeping one owner per concern:

| Owner | Responsibility |
| --- | --- |
| GM | Neutral declarations, deterministic plans and construction; cooperative Resources; the separately gated synchronous lifecycle-kernel candidate. No loader, supervisor, durable routing or distributed fencing. |
| EF | Neutral artifact, admission-evidence, trust, custody and lifecycle protocol/conformance research. A future durable SPI can describe those obligations; no production runtime package or public SPI is authorized by this proposal. |
| Product Host | Actual loaders, workers, desired revisions, authorization/grants, readiness, canonical publication, admission, drain, recovery, resource adapters and operational policy. |
| Feature/domain owner | Capability behavior, state meaning, migration compatibility and business-effect reconciliation. |

These boundaries follow EF ADR-0015 and ADR-0014. GM ADR-0029 admits only a candidate synchronous bookkeeping kernel, with separate public qualification, release and production-adoption gates. Do not copy that kernel into a new generic manager or treat this research as satisfying its gates. Product adapters may use both neutral cores; the cores do not import each other. [E1, E3, G1]

## What the industry evidence supports

NGINX demonstrates preparation that preserves the old configuration on failure, followed by new workers and old-client completion. Its development guidance places generation data in configuration-owned pools and warns about implicit globals. Envoy distinguishes validation acknowledgment, warming, admission, connection drain and predecessor death; existing connections are not transferred during process hot restart. **Inference:** adopt explicit owned generations and candidate readiness, rather than one Boolean “reloaded” result. Neither case proves arbitrary JavaScript unload or distributed business rollback. [P1, P2]

Node ESM URL identity permits distinct loads; it provides no corresponding unload guarantee. A query on the entry does not automatically version relative imports. Node worker termination provides an exit Promise, but worker limits exclude some external memory and do not prevent process-wide OOM. **Inference:** use a worker as a resettable trusted execution boundary, retain exact artifact/import bytes, and measure the complete Host. It is not a hostile-code sandbox. A process profile is a separate choice when failure containment requires it. [P3, P4]

OpenClaw supplies valuable counterevidence to simplistic competitor criticism: exact-instance retention, call accounting, captured recovery source, self-reload refusal and physical-cleanup barriers already exist. Its Gateway stops old services before replacement registration, addressing exclusivity at the cost of a different recovery/availability protocol. The proposed make-before-break advantage applies only to overlap-safe capabilities. OpenClaw also refuses to substitute currently edited disk bytes when captured recovery source is unavailable. Preserve those protections as design lessons. [O1–O3]

## Identity, closure and operation semantics

Keep the following identities separate; serialize product identities across the worker boundary instead of transporting GM objects or private brands:

| Identity | Meaning |
| --- | --- |
| Artifact digest and immutable import closure | Exact executable bytes and recovery material, distinct from publisher trust and grants. |
| Desired-profile revision and plan digest | Selected product intent and immutable compiled content. |
| Candidate generation | One preparation/readiness attempt; equal content can have several attempts. |
| Runtime generation and execution-owner identity | The exact constructed graph and worker incarnation owning its handles. |
| Active-head revision | Monotonic canonical publication revision; never reused for rollback. |
| Operation/call identity | One accepted bounded operation, its selected generation and authorization lifetime. |
| Resource/registration identity | Exact generation-owned acquisition, callback, listener or external target; prevents late old cleanup removing new state. |
| Authority revision/fence and lifecycle epochs | Product-enforced admission/ownership order; distinct from local kernel tokens. |

EF ADR-0014 explicitly separates content, candidate and head identities. The Host must additionally bind runtime, operation and resource identities to its real authority and evidence records. [E1, E2]

The cohort must close over three graphs: construction dependencies, executable/lazy-import dependencies, and operational retention through callbacks, caches, streams, timers and state. A provider-only change is unsafe if outside consumers retain its exports. Outside consumers must use the stable request port, join the replacement closure, or prevent replacement. OSGi refreshes a reverse wiring closure; its service specification separately warns that stale object references remain application responsibilities. **Inference:** reject incomplete closure rather than invent live GM rebinding. Avoid borrowed cross-generation inputs initially; their independent ownership is additional proof, not automatic sharing. [P5, G3]

One accepted request captures one generation before execution. Its internal graph calls after awaits remain part of that operation. GM's current kernel allows `beginCall` only while active; `checkCall` accepts an existing call while quiescing and rejects it after retirement. New custody likewise requires staged/active and must precede acquisition. Therefore keep old G quiescing while permitted work finishes. Do not retire G immediately and then grant arbitrary new nested calls. Detached callbacks require fresh admission or explicit longer-lived Host authority; custody never grants invocation. Broader retained-consumer semantics require a successor decision. [G1, G2]

## Proposed protocol and fixed envelope

The following numerical envelope is an **unmeasured qualification proposal**, to be replaced or accepted by the real capability owner before production: one active worker, one candidate and at most one unresolved predecessor; 64 concurrent pending-admission or accepted requests; 128 queued ingress requests; 1 MiB maximum request/result; 64 MiB retained artifact bytes per generation; 30 seconds candidate preparation; 60 seconds accepted-call lifetime; 5 seconds cancellation grace; 5 seconds termination-observation wait. No next candidate starts while the predecessor slot remains unresolved. Overflow rejects or delays explicitly. Observation expiry records uncertainty; it never fabricates retirement. Memory/RSS and host-call budgets require separate measured limits because worker JS limits are incomplete. Any changed envelope belongs to a new explicit profile revision.

1. **Record and validate intent.** Allocate durable lifecycle-operation and candidate identities; bind expected head, exact affected closure, artifacts, profile and admission evidence. Validate inert declarations, trust, compatibility and authorization before executable evaluation under the declared gate. Reject unsupported migration, exclusivity and self/indirect reload before teardown. A reload requested from affected admitted work cannot await its own drain; initially reject it.

2. **Prepare privately.** Establish resource custody before acquisition. Create a candidate-owned worker/scope, construct its immutable graph from selected authorized factories and test its actual dependencies. Candidate readiness uses a private control path; it cannot await ordinary admission or notifications emitted only after publication. Candidate has no ordinary route or effect grant. Keep underlying startup completion owned even if an observer times out.

3. **Revalidate and publish.** Under EF ADR-0011's bounded product transaction/CAS, compare expected head, closure revisions, lifecycle fences and current authority. Commit head, pin promotion, authoritative route eligibility/fences and grant activation together for one product authority scope. This authority point closes old new-admission even while projections lag. No provider callback, startup, drain or reconciliation runs under a held database lock. A stale candidate loses and cleans only its own work. [E2]

4. **Project and admit.** Router/worker projections converge separately. Every invocation acceptance repeats revision, fence, target and freshness checks against canonical authority or an actually qualified finite admission-lease protocol. A cached current pointer cannot grant work. The committed generation may temporarily be unavailable; report degraded activation and reconcile it. Do not silently restore the old head. Quiesce old local admission and preserve already accepted operation identities.

5. **Drain, revoke and close.** Observe accepted old work and its owned finally/setup continuations. At the policy deadline, cancel, revoke ordinary invocation authority and request termination as appropriate. Private Host cleanup authority remains distinct. Retain the real close flight and supporting infrastructure. GM Resources cleanup settlement proves registered callbacks completed, not physical absence; pending cleanup differs from failed cleanup debt. ADR-0039 retains Observation loading through its actual finally settlement after escalation. [G4, G5]

6. **Prove terminal conditions.** Record Node exit separately from cleanup completion, zero local leases, durable-work disposition and external-effect outcomes. Reacquire bounded fences and revalidate closure and terminal predicates. Unknown termination/effect outcomes block dependent detach, deletion or exclusive reassignment. Clear handles and artifact references only under exact ownership. A caller's bounded wait can finish with retirement pending; the operation report must say so. [E2]

The Host adapter must bridge local lease acquisition and canonical invocation acceptance explicitly. One possible ordering obtains an actual `beginCall(G)` lease while G is active and retains its exact token in a Host-owned operation record before attempting canonical acceptance for the same operation and generation. “Provisional” describes only the Host's pending product admission; GM has no separate reservation state. Pending attempts consume the same bounded in-flight capacity as accepted requests and have a bounded cancellation policy. Dispatch requires confirmed canonical acceptance under its defined authority policy and a successful current `checkCall` on the retained token at the local dispatch boundary. If retirement has revoked the token, do not dispatch; reconcile/cancel the accepted but undispatched operation under that policy. Definite rejection releases the token once dispatch is impossible. Lost acknowledgment or an observer timeout does not prove rejection: reconcile the same operation identity and prevent duplicate dispatch. The real owner releases the token after actual completion of owned work, or after proving that the attempt cannot dispatch and owns no live continuation; abort, exception, timeout and GC do not release it automatically. Canonical acceptance must not leave an operation needing its first `beginCall` after quiesce. This is a product bridge over existing GM bookkeeping, not atomicity between a database transaction and a WeakMap update. [G1, G2, E2]

Local leases track in-process authority and retention. They do not fence a disconnected writer. A distributed ownership claim needs monotonic epochs/finite leases checked by the resource or authoritative effect gateway at the relevant acceptance/commit point. `checkPermission(); await send()` leaves a race; process exit does not recall a previously accepted remote action. EF's declared publication scope is not a fleet-wide atomic switch; multi-scope rollout is a product saga. [E2]

Platform extensions retain their exact evidence limits. Browser workers have normative termination, but `terminate()` supplies no Node-like exit acknowledgment; a cooperative “stopped” message is a different fact. A process supervisor must separately address descendants and inherited authority. Neither counterpart inherits stronger retirement guarantees merely by sharing a request schema. [P3, P6]

## Crash and ambiguous-outcome matrix

Recovery reads canonical operation/head records and exact evidence before taking another action. Never retry publication or external effects merely because acknowledgment was lost.

| Failure point | Required recovery/result |
| --- | --- |
| Before candidate execution | Previous head continues; reconcile staged pins/intent under candidate identity. |
| Startup/readiness fails or settles late | Previous head continues in this overlap-safe profile; late acquisitions remain owned until actual cleanup. Observer timeout does not release custody. |
| Concurrent candidates or authority changes | Only a valid expected-head candidate commits; stale/revoked candidate aborts without changing the winner. |
| Publication commits, acknowledgment lost | Read canonical operation/head; return/reconcile that committed result, without creating another generation blindly. |
| Commit precedes route projection or worker loss | Committed head remains authoritative; refuse stale admission, reconstruct/reconcile the selected generation, report degraded readiness. |
| Host dies during predecessor drain | Recover accepted-work dispositions and fence stale survivors before new admission; ephemeral leases are not presumed to survive restart. |
| Cancellation/termination observation times out | Execution remains pending/unproven; predecessor consumes its capacity slot and dependent destructive work stays blocked. |
| External effect accepted, receipt lost | Outcome is uncertain until effect-specific authoritative reconciliation; an idempotency acknowledgment alone proves identity, not success. |
| Cleanup throws versus never settles | Record real failure debt and preserve retry infrastructure; pending ordered cleanup blocks predecessors. No blind retry of non-idempotent cleanup. |
| Requested fallback | Prepare old immutable bytes as a fresh candidate/new head; recheck grants, state and compatibility. Never resurrect a retired kernel generation. |

These are direct applications of EF0011's evidence and fence obligations and GM's ownership constraints, not a second generic recovery engine. Reuse existing product Activities/operations and effect reconciliation. [E2, G1, G4, G5]

## Separate later contracts: exclusivity, state and revocation

Exclusive resources cannot simply join blue-green preparation. A later profile may use a stable Host broker with genuine fenced reassignment, or explicitly stop/reconstruct with a service gap and immutable recovery bytes. The latter changes the preparation-failure promise and requires the proper architecture decision; do not rewrite EF0014 to call both protocols equivalent. A mutex name does not establish exclusive ownership.

Temporal demonstrates why durable executions need generation affinity beyond the current head: pinned workflows retain their selected deployment version, and rollback of new-work routing leaves existing pinned workflows on the bad version. Recovery requires restartability/replay compatibility or reset; some resets are not idempotent. Drained status also does not erase every query obligation. **Inference:** later jobs must retain, transfer at a proven boundary, or quarantine their durable work; an idle worker count is insufficient drain evidence. [T1–T3]

Flink restore maps state through stable operator IDs; migration compatibility is directional and bounded. Its `stop --drain` emits a final watermark and is unsuitable for some resumptions. Restoring a snapshot cannot undo external writes and may duplicate output. **Inference:** do not offer a universal `migrateState()`/`drain()` promise. Domain owners must define stable state identity, schemas/serializers, snapshot custody, semantic checkpoint and single-writer transfer; replay consistency alone does not prove business correctness. These capabilities remain excluded from the first profile. [F1–F3]

Security revocation is a separate control operation. Trust identifies accepted bytes; grants authorize tenant/action/resource access; isolation enforces runtime restrictions. Ordinary upgrade assumes old work may remain trusted briefly. Emergency revocation can require immediate admission closure, grant/credential gateway fencing, resumption prohibition and worker quarantine/termination independently of drain. Retain recovery evidence; do not report completed writes as rolled back. A trusted Node worker cannot establish malicious-code isolation, and neither signature validation nor a TypeScript port supplies that guarantee. [E2, P4]

## Alternatives, scores and handwritten LOC

Confidence rates fit/estimate confidence; reliability rates achievable behavior **within the stated qualified scope**, not measured availability; complexity 10 means hardest. Estimates cover one capability/Host, new maintained nonblank handwritten production/test TypeScript and fixtures. They exclude dependencies, generated code, domain behavior/migrations, UI/installers, new authorization/database/Activities systems and OS sandboxing. Existing durable infrastructure is assumed; if absent, quote its separate cost. Ranges overlap and are not additive projects.

| Alternative / bounded promise | Confidence /10 | Reliability /10 | Complexity /10 | Production LOC | Test/fixture LOC |
| --- | ---: | ---: | ---: | ---: | ---: |
| Static graph plus controlled restart | 9 | 8 | 2 | 150–500 | 300–900 |
| Local in-process immutable cohort; cooperative logical replacement, no physical unload | 8 | 7 | 4 | 900–1,800 | 1,800–3,500 |
| **Recommended Node-worker cohort with durable publication/admission/recovery above** | **7** | **8** | **6** | **3,000–5,500** | **5,000–9,000** |
| Supervised child-process counterpart; explicit descendants policy, sandbox separate | 7 | 9 | 7 | 4,000–7,000 | 6,500–11,000 |
| Stable existing fenced exclusive-resource broker extension | 5 | 8 | 7 | +1,500–3,500 | +2,500–5,000 |
| Explicit stop/reconstruct capability with service gap/recovery failure | 6 | 7 | 7 | 3,500–6,500 | 6,000–10,000 |
| Broad retained consumers, dynamic rebinding and state migration | 4 | 5 | 9 | 8,000–16,000 before domain migration | 12,000–24,000 |
| Arbitrary JS/native unload with automatic state/effect reversal | 1 | 1 | 10 | No defensible finite estimate | No finite suite proves it |

The recommended production range comprises worker/request adapter 600–1,000; preparation/resources 500–900; product publication/admission/recovery wiring 900–1,700; retirement/capacity/evidence 1,000–1,900. Smaller 900–2,400 worker-rotation estimates describe local mechanism prototypes, not the durable EF0011 floor. Kernel release/adoption qualification remains a separate gate.

## Conformance gate before any stronger claim

Require rejecting fixtures and real worker boundaries: denied/unselected/invalid artifacts execute zero code; invalid graph calls zero factories; old request/internal post-await call remains on G while fresh requests use G+1; incomplete dependency/import closure rejects; stale candidate/router/grant cannot admit; late G cleanup cannot erase G+1; self/indirect lifecycle waits reject; late setup and pending finally preserve custody/infrastructure; crash and lost-ack cases follow the matrix; revoked access fails at the actual gateway; cancellation-resistant work produces exit evidence or explicit uncertainty; unsupported exclusivity/migration rejects before teardown.

Exercise local-lease/canonical-acceptance races against publication, retirement, cancellation and lost acknowledgment. Pending attempts stay within the in-flight limit; revoked or unconfirmed attempts do not dispatch; each attempt is released by its real owner without losing accepted-work reconciliation or duplicating dispatch.

Exercise capacity overflow and repeated varied replacements after warm-up. Track generations, workers, ports, timers/listeners, pending operations, artifact bytes, host buffers and heap/RSS separately. Confirm stabilization within the selected budget; a disposer count or one RSS sample is insufficient. Test two Hosts and unrelated siblings for isolation. Publish the measured workload/runtime envelope and limitations. No current evidence establishes overall superiority to OpenClaw or world-leading scale.

## Immutable and primary source register

- **E1:** [EF ADR-0014](https://github.com/agent-teams-ai/extension-foundation/blob/9ea7024672ae06a15c701fa1e23bf6db37975e20/docs/decisions/0014-product-local-module-authoring-composition-and-generation-guardrails.md).
- **E2:** [EF ADR-0011](https://github.com/agent-teams-ai/extension-foundation/blob/9ea7024672ae06a15c701fa1e23bf6db37975e20/docs/decisions/0011-extension-admission-custody-and-retirement-closure.md), revision-bound admission, publication/fence hierarchy and effect-specific evidence.
- **E3:** [EF ADR-0015](https://github.com/agent-teams-ai/extension-foundation/blob/9ea7024672ae06a15c701fa1e23bf6db37975e20/docs/decisions/0015-authorize-get-modular-semantic-extraction.md).
- **G1:** [GM ADR-0029](https://github.com/agent-teams-ai/get-modular/blob/7131d0d7a6bb5dd4c3e8906ccac065c0be0e0333/docs/decisions/0029-admit-an-optional-lifecycle-kernel-candidate.md).
- **G2:** [GM kernel transitions](https://github.com/agent-teams-ai/get-modular/blob/7131d0d7a6bb5dd4c3e8906ccac065c0be0e0333/packages/lifecycle-kernel/src/features/lifecycle/kernel.ts#L26-L120).
- **G3:** [GM construction/borrowed inputs](https://github.com/agent-teams-ai/get-modular/blob/7131d0d7a6bb5dd4c3e8906ccac065c0be0e0333/packages/assembly/src/features/construction/run.ts#L117-L180).
- **G4:** [GM ADR-0030 Resources](https://github.com/agent-teams-ai/get-modular/blob/7131d0d7a6bb5dd4c3e8906ccac065c0be0e0333/docs/decisions/0030-admit-the-module-resource-scope-package.md) and [scope implementation](https://github.com/agent-teams-ai/get-modular/blob/7131d0d7a6bb5dd4c3e8906ccac065c0be0e0333/packages/resources/src/features/scope/scope.ts).
- **G5:** [GM ADR-0039 pending Observation drain](https://github.com/agent-teams-ai/get-modular/blob/7131d0d7a6bb5dd4c3e8906ccac065c0be0e0333/docs/decisions/0039-retain-observation-load-drain-until-its-run-settles.md).
- **P1:** [NGINX control](https://nginx.org/en/docs/control.html) and [development guide](https://nginx.org/en/docs/dev/development_guide.html), current primary documentation retrieved 2026-10-21 by the systems researcher.
- **P2:** [Envoy v1.36.0 hot restart](https://www.envoyproxy.io/docs/envoy/v1.36.0/intro/arch_overview/operations/hot_restart) and [xDS protocol](https://www.envoyproxy.io/docs/envoy/v1.36.0/api-docs/xds_protocol), evidence pin, not latest-install guidance.
- **P3:** [Node v24.10.0 ESM](https://nodejs.org/download/release/v24.10.0/docs/api/esm.html#urls) and [workers](https://nodejs.org/download/release/v24.10.0/docs/api/worker_threads.html#workerterminate), evidence pin, not runtime adoption recommendation.
- **P4:** [Node permission-model limits](https://nodejs.org/api/permissions.html), current documentation retrieved 2026-10-21 by the scale/security critic.
- **P5:** [OSGi Core 8 wiring/closure](https://docs.osgi.org/javadoc/osgi.core/8.0.0/org/osgi/framework/wiring/FrameworkWiring.html) and [stale service references](https://docs.osgi.org/specification/osgi.core/8.0.0/framework.service.html#framework.service.stalereferences).
- **P6:** [HTML worker termination](https://html.spec.whatwg.org/multipage/workers.html#terminate-a-worker) and [Worker interface](https://html.spec.whatwg.org/multipage/workers.html#the-worker-interface), living standard retrieved 2026-10-21 by the lifecycle critic; conformance was not tested.
- **O1:** [OpenClaw Gateway reload](https://github.com/openclaw/openclaw/blob/33ccaae2f522c3ae299aaf8b195fa166ab536bd8/src/gateway/server-plugin-reload.ts#L242-L443).
- **O2:** [OpenClaw recovery custody](https://github.com/openclaw/openclaw/blob/33ccaae2f522c3ae299aaf8b195fa166ab536bd8/src/gateway/server-plugin-reload-recovery.ts#L29-L99).
- **O3:** [OpenClaw disposal/physical finish](https://github.com/openclaw/openclaw/blob/33ccaae2f522c3ae299aaf8b195fa166ab536bd8/src/plugins/plugin-instance.ts#L602-L765).
- **T1:** [Temporal Worker Versioning](https://github.com/temporalio/documentation/blob/34fb32fb06a6cb8d71df25f8dd9d522c93fecb9b/docs/encyclopedia/workers/worker-versioning.mdx).
- **T2:** [Temporal bad-rollout recovery](https://github.com/temporalio/documentation/blob/34fb32fb06a6cb8d71df25f8dd9d522c93fecb9b/docs/production-deployment/worker-deployments/recover-pinned-workflows.mdx).
- **T3:** [Temporal sunset/GC](https://github.com/temporalio/documentation/blob/34fb32fb06a6cb8d71df25f8dd9d522c93fecb9b/docs/production-deployment/worker-deployments/worker-versioning/sunset-and-gc.mdx).
- **F1:** [Flink savepoints](https://github.com/apache/flink/blob/f237727ed52dbe967bc022268b173fb68587b81b/docs/content/docs/ops/state/savepoints.md) and [schema limits](https://github.com/apache/flink/blob/f237727ed52dbe967bc022268b173fb68587b81b/docs/content/docs/dev/datastream/fault-tolerance/serialization/schema_evolution.md).
- **F2:** [Flink stop/drain](https://github.com/apache/flink/blob/f237727ed52dbe967bc022268b173fb68587b81b/docs/content/docs/deployment/cli.md#terminating-a-job).
- **F3:** [Flink upgrades/external writes](https://github.com/apache/flink/blob/f237727ed52dbe967bc022268b173fb68587b81b/docs/content/docs/ops/upgrading.md).
