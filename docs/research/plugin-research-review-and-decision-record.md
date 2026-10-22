---
id: research.decision-review
type: research
status: active
owner: architecture
summary: Independent critique dispositions, adoption conflicts and scoped implementation alternatives.
---

# Plugin Research Review and Decision Record

**Initial review:** 2026-10-21. **Follow-up:** 2026-10-22, recorded in its own section below. **Status:** non-normative research synthesis; no new architecture approval, production-runtime qualification, or merge authorization. The initial review combines the platform, production-system, ecosystem-scale, stateful-update and OpenClaw research with independent lifecycle, scale/security, and adoption/documentation critiques. Researchers supplied comparison evidence; critics challenged lifecycle promises, security and scale claims, and adoption provenance. Each dated record distinguishes source facts, historical reports, unexecuted assertions, executed experiments and recommendations.

## Recommendation and authority

Complete the authorized installation, research and navigation repairs. Preserve the approved direction: immutable Get Modular (GM) graphs, mandatory GM/static Feature Module Standard v1.1 in Orchestrator under ADR-0110, neutral Extension Foundation (EF) primitives, and product-owned executable admission, routing, recovery and retirement. Make production hot replacement a first-class **qualification target** for a bounded capability; do not present it as an already delivered library guarantee.

For a first dynamic profile, investigate one trusted, overlap-safe, request-oriented cohort behind a narrow typed Host port. Construct a fresh GM instance inside its execution owner; retain admitted old work against its original graph; admit new work through the newly published generation. A Node worker is a plausible first execution boundary. A supervised process is a separate option when its failure boundary is required. Neither choice is approved by this research. Ordinary static modules need none of this machinery. GM's lifecycle kernel remains a private candidate, not a released asynchronous supervisor. [GM candidate][gm-kernel]; [EF ownership][ef-extraction].

The evidence supports scoped guarantees and useful qualification scenarios. It does not support “world-leading,” universal safe unload, cross-platform hostile-code isolation, or automatic state/effect rollback.

## Verified baseline and adoption provenance

The supplied refreshed baselines are GM `7131d0d7a6bb5dd4c3e8906ccac065c0be0e0333`, EF `9ea7024672ae06a15c701fa1e23bf6db37975e20`, and Orchestrator main `98f653172215e2a2c73cc484db3fa4fe72ed21ba`. Orchestrator PR 86 at `8483949960cb783fe70090e2e7fbf526a043d362` descends directly from that main and contains owner-approved [ADR-0110][o110]. Its mandatory GM/static-FMS v1.1 selection is settled; runtime migration and qualification remain pending.

Stack the research patch on PR 86. PR 79 at `8f761d3b68b2b4a111cf36a9062b42797a1a4bce` diverges from refreshed main: its [FMS ADR-0103][o79-103] collides with main's accepted [Sandbox ADR-0103][omain-103]. PR 87 at `d60ac6cf55f680fde50a3e0374f1fd8f4877593e` stacks on PR 79 and does not resolve that collision. Preserve accepted bodies and historical sources; do not silently renumber, overlay the old tree, replace baseline entries, or repin. Preserve Sandbox and Activity work during later integration. Carry equivalent approved meaning through ADR-0110/local profile; additional operative meaning or catalog migration needs an explicitly owned successor record. These are integration obligations, not a request to reconsider approved framework choices.

The adopted Consumer Module Standard pin is [`ddf1e0b0053f546f12ca70190b237b4f7e78d09d`][gm-old-standard]. The verified exact diff to current GM adds only seven observation-cleanup clarification lines: pending/timeout retains dependencies and reports still-running; retain original close promise/control/infrastructure; abandoning observation does not stop cleanup; do not retry merely to observe again. This implements [ADR-0039][gm39], not a general asynchronous supervision release. Complete-document SHA-256 changed from `c2fe582a14ff6e79620b232ca7ffc914afb0474ec21fd43f208251dd7252f4a3` to `a6dac5d303adf80be3151c6703c919b715fd880a941a4ad68e927c87a7ee5882`. Keep both provenance facts; research does not amend the accepted pin. [Current standard][gm-standard].

## Critic findings and dispositions

### Later upstream update in the same review

At 19:14 UTC, GM main advanced to
[`eadd9d391657ae6f508a874dd30e923bdc4054f0`](https://github.com/agent-teams-ai/get-modular/commit/eadd9d391657ae6f508a874dd30e923bdc4054f0).
The selected flat source checks now pass through N1000 with published Foundation
2.1.1 and FMS 0.2.3. The [retained fixture record](https://github.com/agent-teams-ai/get-modular/blob/eadd9d391657ae6f508a874dd30e923bdc4054f0/tests/qualification/consumer-fixtures/growth/README.md)
keeps supported-compiler P5 acceptance and runtime qualification separate. The
Consumer Module Standard file is unchanged by this commit, so the reviewed
seven-line adoption delta and its digest above still apply. The earlier source
pins describe the research subjects; they are not an instruction to downgrade
current repository tooling or treat all growth work as still pending.

### Dispositions

“Adopt” below means incorporate the correction into research and future qualification, not accept a new architecture decision.

| Finding | Disposition and consequence |
| --- | --- |
| Current installation and immutable adoption are different | **Adopt.** New-install examples use `@latest --save-exact`; retain resolved exact locks and frozen CI. Historical release/adoption pins remain immutable. |
| Duplicate nominal identities can survive structural type compatibility | **Adopt.** Reusable modules declare peers within one compatible 0.x minor and exact development versions; Host supplies one physical GM copy. Inspect dependency trees; do not force incompatible deduplication. [Owning standard][gm-standard]. |
| A second research writer or acceptance lifecycle would compete with existing governance | **Adopt.** EF research uses the existing Docs Protocol schema/config/template/qualification route, non-normative status, and one canonical reference. GM/Orchestrator link to it. |
| Retained custody is not permission to start new calls after quiesce | **Adopt.** One admitted bounded operation owns its closed cohort invocation. Keep old generation quiescing while allowed work finishes; retire revokes ordinary invocation. No fresh per-provider authority is smuggled into old work. [Kernel contract][gm-kernel]. |
| Blue-green readiness fails for exclusive resources | **Adopt and narrow.** First profile rejects exclusives. A stable fenced broker or explicit stop/reconstruct profile is a later separate design, with interruption/recovery semantics. |
| Local lease and canonical admission form two distinct transitions | **Adopt final critique.** Pending attempts consume the in-flight cap; dispatch needs confirmed canonical admission and current local validity. Unknown acknowledgment reconciles the same operation; only the real owner releases completed or proven-undispatchable work. See the [bounded protocol](hot-reload-and-generation-replacement.md). |
| Construction graph alone misses imports, callbacks and retained consumers | **Adopt.** Define replacement closure across construction, immutable executable/lazy-import bytes, and operational retention. No live generation exports cross the outer request port. |
| Pointer switch is insufficient production publication | **Adopt.** Use product canonical publication/admission authority, monotonic head/fences and crash reconciliation where EF's durable profile applies. No transaction or global lifecycle lock spans execution/drain. [EF closure][ef11]. |
| Timeout, cleanup success and physical absence were conflated | **Adopt.** Report observation timeout, pending cleanup, debt, logical revocation and execution-exit evidence separately. Pending finally retains dependencies; outer infrastructure outlives retry debt. |
| Self-reload and indirect drain cycles can deadlock | **Adopt.** Initial profile rejects awaitable reload from affected admitted work before teardown; lifecycle control has independent Host authority. Test indirect cycles. |
| Worker/permission APIs were overstated as hostile isolation | **Adopt.** Trusted worker rotation is execution separation. Actual filesystem/network/credential controls belong to the target/deployment profile; grants and external-effect acceptance have separate owners. |
| Scale and compatibility claims lacked distinct denominators | **Adopt.** Separate catalog, feature/module/instance, tenant, execution-agent, concurrency, churn and authoring scale. Publish a tested workload envelope, not a synthetic “plugin count.” |
| Universal migration, dynamic rebinding and cross-platform hostility add unbounded scope | **Defer.** No generic manager, automatic migration, or mandatory dynamic conversion of static features. |

The final source-fidelity pass also corrected Independent Activity routing to include unversioned queues, replaced an unsupported “measured” label with “documented” for Gradle cache behavior, and kept Activity admission separate from operation/effect-owned idempotency.

The adoption critic's missing-old-object caveat is resolved by the subsequent exact source comparison above; its prohibition on silent repinning still applies. The lifecycle critic's larger production estimate also corrects the smaller mechanism-only estimates rather than contradicting them.

## What industry evidence changes

Mature systems validate bounded replacement while exposing its conditions. OSGi refresh follows dependency closure; stale service references remain a consumer obligation. OTP supplies VM-specific two-version/state-conversion machinery, not a portable JavaScript recipe. NGINX/Envoy process rotation separates new routing from old-work drain. Temporal pins executions but independent Activities can select another version; Flink requires explicit state identity and compatible serialization. Consequently “one generation” must name its operation boundary, collaborators and effect protocol. [OSGi specification][osgi]; [OTP source][otp]; [Envoy versioned guide][envoy]; [Temporal snapshot][temporal]; [Flink snapshot][flink].

OpenClaw at `33ccaae2f522c3ae299aaf8b195fa166ab536bd8` supplies substantial positive counterevidence: inert manifest discovery, precise instance/call authority, captured recovery bytes, retained work and physical cleanup barriers. Its [reload implementation][oc-reload] refuses self-reload and stops some prior resources before candidate registration, an availability tradeoff for exclusivity. Its [recovery implementation][oc-recovery] refuses substituting current disk bytes when old captured code is unavailable. Transfer these protections; do not describe the product as a naïve global-ID registry.

Remaining limitations include trusted native execution, import-time effects and ESM retention. Historical failure reports are not current-source reproductions. The audit verified narrow merged repairs such as [channel drain recovery][oc-fix]; that does not prove every reload symptom fixed. Issue [#154526][oc-issue] closed for inactivity, while sticky lazy rejection remains explicit in [pinned source][oc-lazy]; “closed” is not “fixed.” No comparative benchmark establishes ecosystem superiority.

## Qualification shape for the first dynamic capability

Prepare under independently owned resource custody after inert selection/trust/profile checks. Build the fresh closed graph and prove readiness without ordinary traffic or active effect grants. Revalidate expected head, dependency closure and authority immediately before bounded canonical publication. A stale candidate loses without disturbing the winner. Route projections may lag; they cannot mint stale work merely from cached pointers. [EF publication/retirement requirements][ef11].

Capture one operation/generation identity at admission. Old accepted operations finish under their defined authority while fresh requests select the new head. Readiness must not await candidate ordinary admission; a request must not await a reload whose drain awaits that request. Drain deadlines bound observation/escalation policy, not successful reclamation.

Then close under actual ownership and preserve pending setup/finally, cleanup debt, immutable artifacts and termination evidence. Process/worker exit does not reverse an accepted remote effect. Unknown outcomes remain with existing product reconciliation; do not invent a second outbox or durable effect system. Rollback selects old bytes as a **fresh** monotonic candidate, rechecking current grants and state compatibility. Initially prohibit private-state/schema migration and mutating external effects.

Bound retained generations and artifact bytes before preparation. A suggested first envelope is one active, one candidate and at most one unresolved predecessor per cohort; delay/reject further updates at the cap. Qualify publication races, late setup, pending cleanup, revocation, stale results, Host crashes/lost acknowledgments, dependency diamonds/lazy imports, unsupported exclusives, indirect self-reload and repeated varied churn. Measure retained roots/resources and memory slope, not disposer counts. Node exit observation and browser termination invocation have different APIs; do not fabricate browser exit acknowledgment. [Node versioned worker contract][node-worker].

## Alternatives, confidence and scoped effort

Scores are engineering judgment, not measured availability: confidence means fit for the stated scope; reliability means achievable bounded behavior after qualification; complexity increases with burden. LOC means new maintained handwritten production TypeScript/config versus test/fixture code, excluding dependencies, generated files, docs, domain business code, deployment platforms and new durable operation systems. Existing transactions, auth, operation identity and supervision are assumed; absent prerequisites invalidate these estimates. Ranges are planning bounds, approximately ±2×, and are alternatives rather than additive projects.

| Scope | Confidence /10 | Reliability /10 | Complexity /10 | Production LOC | Test LOC |
| --- | ---: | ---: | ---: | ---: | ---: |
| Approved static GM seam migration; controlled restart on revision | 8 | 8 | 4 | 120–300 | 250–700 |
| Trusted local in-process cohort; no durable/publication or physical-unload claim | 8 | 7 | 4 | 900–1,800 | 1,800–3,500 |
| Proposed trusted Node-worker cohort, including durable publication/recovery and bounded retirement | 7 | 8 | 6 | 3,000–5,500 | 5,000–9,000 |
| Same bounded cohort in supervised process, explicit descendant policy | 7 | 8 within the same logical promise | 7 | 4,000–7,000 | 6,500–11,000 |
| Browser counterpart with narrower termination evidence | 7 | 8 for stated claim | 6 | +800–1,600 | +1,500–3,000 |
| Broad rebinding/retained consumers and migration | 4 | 5 | 9 | 8,000–16,000 before domain migrations | 12,000–24,000 |
| Universal hostile JavaScript across targets; automatic effect/state reversal | 1 | 1 for the unsupported promise | 10 | No defensible estimate | No finite universal proof suite |

Smaller worker/process estimates in the security/platform memos cover local mechanisms around already established protocols. The production row includes publication/admission/recovery and retirement evidence; it must not be quoted as mere routing glue or charged to every static feature.

## Concrete implementation questions and remaining gates

These questions concern executable scope, not settled GM/FMS selection:

1. Which real request-oriented capability is overlap-safe, bounded, and useful enough to justify replacement? What dependency/import/retention closure and resources does it actually own?
2. What existing canonical transaction, operation identity, admission/grant gateway and restart reconciler will implement publication and stale-work fencing? Where must recipients enforce effect authority?
3. Does the selected trusted workload need worker rotation or process isolation, and which measurable failure/resource limits justify that choice? What exact Node/browser evidence is promised?
4. Which exact package train and supported envelope will qualify the first activation against the preserved adopted standard and its documented delta?
5. What independent integrations satisfy Orchestrator's production EF gate, and what packed N/N+1 provider/consumer, optional-dependency and duplicate-copy fixtures demonstrate compatibility without monorepo hoisting?

EF ordinary-library admission, GM 0.x authorization, stable-GM qualification and public-SPI publication are different gates. Orchestrator [OD-041][o41] still requires two independent product integrations for production EF adoption; EF-local permission does not waive it. The research/documentation repair can finish without answering all activation questions. The initial 2026-10-21 synthesis reported source review and recommendations only. The separate follow-up below records its actual bounded experiments without treating them as complete runtime qualification.

## Follow-up review: reusable mechanisms, language and customization

**Date: 2026-10-22.** Three parallel research assignments covered ready-made
replacement/execution mechanisms, Temporal scheduling and selective native
boundaries. Three independent critics challenged the same complete vision and
authorities from ownership/reuse, lifecycle-failure and customization/scale
perspectives. Two fresh final critics independently checked architecture and
evidence; a separate review reconciled the organization language guidance with
new upstream references. These agents used the requested **GPT-6.1 Sol xhigh**
configuration and received the full shared user vision/authority brief. A
separate bounded executor experiment and the final evidence critic's one
targeted rejecting fixture supplied executed evidence. Reviewer agreement is
not itself evidence that production requirements passed.

### Retained reports and source material

The complete twelve original research, critique, experiment and workflow
diagnosis reports, shared context, pinned Comlink source/identity material and
organization-policy validation log are frozen in
[plugin-portability-review-20261022.tar.gz](evidence/plugin-portability-review-20261022.tar.gz)
(**266,717 bytes**, SHA-256
`2bb8303207cc29c8c9f16391985f72428395afcb55793a2faefe65bc513b7699`).
The archive contains 23 files and a SHA-256 manifest; every entry was verified
byte-for-byte after packaging. Earlier report inferences remain historical and
may be superseded by the dispositions here. They are not parallel authorities.

Executable inputs and complete original/follow-up results have their own
verified archive in the [Worker Adapter Replacement Experiment](worker-adapter-replacement-experiment.md).
It retains exact tarball integrities, manifests/lock, ordinary TypeScript source,
environment, compiler failures, corrected harness assumptions and final logs.
No accepted ADR or dependency pin was changed by this research.

The governed reading route is now:

| Question | Maintained synthesis |
| --- | --- |
| What can be reused, and where should an independent library live? | [Reusable Generation Mechanisms and Ownership](reusable-generation-mechanisms-and-ownership.md) |
| When does a Temporal adapter reduce custom durable scheduling? | [Temporal and Rollout Orchestration](temporal-and-rollout-orchestration.md) |
| Which native boundary improves the actual guarantee, and what does it cost? | [Critical Components and Language Boundaries](critical-components-and-language-boundaries.md) |
| How do ordinary authors customize deeply while preserving scale and ownership? | [Customization Without Forks and Scale](customization-without-forks-and-scale.md) |
| What did executing the exact packages reveal? | [Worker Adapter Replacement Experiment](worker-adapter-replacement-experiment.md) |

### Findings and dispositions from overlapping reviews

The IDs below refer to their full archived reports. **Incorporated** means the
research was corrected; it does not select an executor, publish a package or
waive an adoption gate.

| Finding | Disposition and concrete consequence |
| --- | --- |
| Ownership F1/F4; CS-01/07; final architecture: the residual shared mechanism is a hypothesis | **Incorporated.** Subtract existing kernel, executor and RPC first. An actual repeated generation-bound invariant may justify one neutral shared driver/protocol/test kit; method renaming does not. Library-first applies from the real delivery, without a speculative new repository. |
| Several critics: one product authority was being confused with product-local code copies | **Incorporated.** Neutral code may implement the single product-authorized lifecycle operation. Reject independently advancing drivers and duplicate authoritative kernel/canonical records, not reusable sequencing itself. |
| Ownership admission review: ordinary-library source admission, stable SPI and product production gates were conflated | **Resolved as distinct claims.** Existing EF package admission can coexist with a real consumer and ordinary external fixture. Stable extension SPI and Orchestrator OD-041 retain their stronger independent evidence. No new approval deadlock is introduced. |
| LF-01: a `checkCall` followed by an await leaves a dispatch gap | **Incorporated in the central protocol.** After the last await/user conversion, one Host agent rechecks and performs the exact endpoint/owned-queue handoff without another gap. Queue handoff differs from CPU start; thrown/missing ACK does not automatically prove non-dispatch. |
| LF-02: an old accepted Boolean can recreate authority after Host restart | **Incorporated.** Acceptance binds operation, generation, execution/Host incarnation and authority policy. Recover exact prior execution/effects before a new attempt. Already accepted predecessor work need not remain the current head. |
| LF-03: replacing a scheduler does not stop an old Activity | **Incorporated.** Command receivers enforce the current scheduler epoch and exact target; stopping old starts alone is insufficient. Temporal progress, kernel facts and product state remain separate. |
| LF-04: forced exit can make cleanup completion impossible | **Incorporated.** Separate execution absence, interrupted callback, local custody disposition and external debt. Preserve actual cooperative finally obligations; neither fabricate success nor retain an impossible Promise as the only physical-stop criterion. |
| CS-03 and executed workerpool 10.0.3 evidence | **Corrected.** Default termination rejects preexisting queued work but admitted a new task during termination. Timeout termination fulfilled and fired its hook while the task remained live. Neither hook, stats nor fulfillment is actual Node exit evidence in this case. Earlier README-derived forced-timeout interpretations are superseded for this exact version/thread mode. |
| FE-01: Piscina 5.3.2 multiworker close can terminate another started task without a timeout error | **Incorporated; wider claim rejected.** One separately retained two-worker case confirmed it. The candidate is explicitly single-worker; multiworker close-alone drain is disproved for the case. An upstream resolution or separately demonstrated Host task-accounting strategy is needed for that wider promise. |
| FE-04; CS-01/02: message correlation/proxy reuse already exists, with lifetime escapes | **Incorporated.** Comlink 4.4.2 source/metadata is pinned; it was not installed or TS7-qualified. Reuse correlation only when the execution API lacks it. Proxy release is not cancellation/settlement/exit, and callbacks/ports cannot escape the first data-request profile. |
| CS-04/05; ownership F5: ordinary authoring and ordered-many semantics were underspecified | **Incorporated.** Contribution and provider-substitution recipes use existing consumer contracts. Authors do not implement canonical Host durability to add a menu item. A real ordered contract defines `next`, effects, failure and cancellation; missing seams use upstream contract evolution. |
| CS-06/FE-06: per-cohort caps do not bound tenant/cohort/replica multiplication | **Incorporated.** Name each cap's scope and use the existing product aggregate capacity owner. Installed descriptors do not allocate execution realms, and trusted sharing changes failure/authority scope. |
| FA-01: a failed candidate may evade the predecessor cap | **Incorporated.** Failed/timed-out preparation keeps its candidate/retained-owner slot while startup or cleanup remains live. Observer completion does not release capacity. Unresolved custody can honestly block later updates. |
| Ownership F3/FE-02: adapter cost was incorrectly called net | **Corrected.** Temporal and alternative scheduling allowances are gross new adapter/fixture estimates. Subtract replaced direct scheduling work before claiming a net difference. No measured savings or mandatory additive total is asserted. |
| Ownership F6/FE-03: preferred Protobuf direction was called an approved keeper schema | **Corrected.** Exact keeper schema/transport remains open. `prost` is a candidate codec once its owner selects that contract; Protobuf does not choose gRPC. |
| Ownership F7/final architecture: a process row implied greater logical reliability solely from placement | **Corrected.** The earlier process row is normalized to 8/10 within the same bounded logical promise. Physical containment is an additional scoped capability, not an automatic 9/10 result. |
| Final language/FE-05: central local PostgreSQL reference differs from adopted product SQLite | **Recorded, not silently resolved.** Central scope requires local adoption; accepted Orchestrator ADR-0048/0049 retain authority. OD-035 is open and preserves the current local workflow qualification direction. A future local PostgreSQL adoption needs the owning successor/adoption route. |

### Updated technical conclusion

Keep the existing GM synchronous kernel identity and its independent package
boundary. EF retains neutral research and extension protocol/conformance
ownership. Products define real extension families, grants, canonical state,
admission, recovery and supported operational envelopes. A shared neutral driver
can carry one demonstrated mechanical responsibility without inheriting those
authorities. A separate repository is an optional release/ownership shape for a
proven boundary, not a prerequisite for independent use.

Temporal is a useful optional rollout scheduler when the admitted deployment
already has it or the operation needs durable cross-host coordination. It stays
outside ordinary per-call invocation and outside the generation closure it
controls. Do not introduce another workflow engine, generic outbox or bespoke
durability platform solely for a local update. Current OpenWorkflow research is
updated in its source ledger; old missing-feature observations remain historical.

The language guidance keeps TypeScript for the main application while requiring
agents to consider a concrete native advantage. Reuse an existing engine or the
physical-custody owner, name complete lifecycle/release cost, and distinguish
memory safety from distributed authority. Deferred Rust migration and synthetic
evidence do not establish an available qualified keeper. The first official
Orchestrator Temporal worker remains under its existing TypeScript SDK choice.

For ecosystem design, qualify owned contributions, explicit substitutable
providers, justified ordered behavior and plugin-owned small points. Build-time
or restart-required customization is useful; not every feature needs dynamic
replacement. Ordinary authors must see actionable conflicts and compatibility
rules rather than another universal Host interface. Claims about thousands of
plugins need selected runtime/tenant/retention and compiler evidence, not a
descriptor count.

### Execution and verification limits

The original executor harness passed eight scenarios and the same unchanged
repeat on Linux x64, Node26.11.1, TS7.0.2, Piscina5.3.2 and workerpool10.0.3.
The final evidence critic independently verified both tarball identities and
original source hashes, then ran one separate two-worker rejecting case. Its
one successful failure-mode assertion does not make graceful multiworker drain
qualified. The compiler report retains Piscina's declaration mismatch under
`exactOptionalPropertyTypes`/full dependency checking; the final strict source
fixtures used `skipLibCheck:true`. The selected owner's declaration policy
determines adoption requirements; no repository setting or package was patched.

No complete generation runtime, product admission/recovery suite, churn/RSS
benchmark, browser/Windows/macOS executor parity, hostile sandbox, native build,
Comlink consumer or new Temporal plugin workflow was qualified. OD-005's two
35/35 runs remain its prior retained evidence. Documentation and ordinary-module
work can finish without claiming any of those stronger results.

Docs Protocol created the five new records through reviewed preview/apply and
manual index updates. The original checkout's published transaction could not
be recovered under its observed identity residue; it remains untouched. The
same supported workflow succeeded in an independent clean checkout with the
same base and frozen dependencies. The archived diagnosis states the known
mechanism and unproven underlying cause. No manual transaction edit, dependency
patch or reduced gate was used.

### Concrete owner choices that remain

Select the first actual extension family and the useful update promise:
controlled restart or overlap-safe bounded replacement. Identify any residual
shared contract after executor/RPC/kernel subtraction, then assign its package
and release owner. Set the real aggregate resource/degraded-update envelope.
Choose Temporal scheduling only for a concrete admitted operation. These
questions determine real implementation scope; routine helper signatures,
correlation mappings and documentation corrections need no additional approval.
The scoped comparison tables in the linked records give confidence, achievable
reliability and complexity out of ten, with production and test LOC separately.

If fully local PostgreSQL is now intended for Orchestrator, explicitly reconcile
accepted ADR-0048/0049 and OD-035 rather than changing them through this research.
This future adoption choice does not block the neutral plugin research or
current static GM work.

[gm-kernel]: https://github.com/agent-teams-ai/get-modular/blob/7131d0d7a6bb5dd4c3e8906ccac065c0be0e0333/docs/decisions/0029-admit-an-optional-lifecycle-kernel-candidate.md
[gm39]: https://github.com/agent-teams-ai/get-modular/blob/7131d0d7a6bb5dd4c3e8906ccac065c0be0e0333/docs/decisions/0039-retain-observation-load-drain-until-its-run-settles.md
[gm-standard]: https://github.com/agent-teams-ai/get-modular/blob/7131d0d7a6bb5dd4c3e8906ccac065c0be0e0333/docs/architecture/common-assembly.md
[gm-old-standard]: https://github.com/agent-teams-ai/get-modular/blob/ddf1e0b0053f546f12ca70190b237b4f7e78d09d/docs/architecture/common-assembly.md
[ef-extraction]: https://github.com/agent-teams-ai/extension-foundation/blob/9ea7024672ae06a15c701fa1e23bf6db37975e20/docs/decisions/0015-authorize-get-modular-semantic-extraction.md
[ef11]: https://github.com/agent-teams-ai/extension-foundation/blob/9ea7024672ae06a15c701fa1e23bf6db37975e20/docs/decisions/0011-extension-admission-custody-and-retirement-closure.md
[o110]: https://github.com/agent-teams-ai/agent-teams-orchestrator/blob/8483949960cb783fe70090e2e7fbf526a043d362/docs/decisions/0110-mandatory-get-modular-and-nested-feature-foundation.md
[o79-103]: https://github.com/agent-teams-ai/agent-teams-orchestrator/blob/8f761d3b68b2b4a111cf36a9062b42797a1a4bce/docs/decisions/0103-feature-module-standard-v1-1-adoption.md
[omain-103]: https://github.com/agent-teams-ai/agent-teams-orchestrator/blob/98f653172215e2a2c73cc484db3fa4fe72ed21ba/docs/decisions/0103-first-sandbox-runtime-migration-slice-admission.md
[o41]: https://github.com/agent-teams-ai/agent-teams-orchestrator/blob/98f653172215e2a2c73cc484db3fa4fe72ed21ba/docs/open-decisions/OD-041-shared-extension-foundation-and-artifact-distribution.md
[osgi]: https://docs.osgi.org/javadoc/osgi.core/8.0.0/org/osgi/framework/wiring/FrameworkWiring.html
[otp]: https://github.com/erlang/otp/blob/OTP-29.1.2/lib/kernel/src/code.erl
[envoy]: https://www.envoyproxy.io/docs/envoy/v1.36.0/intro/arch_overview/operations/hot_restart
[temporal]: https://github.com/temporalio/documentation/blob/34fb32fb06a6cb8d71df25f8dd9d522c93fecb9b/docs/encyclopedia/workers/worker-versioning.mdx
[flink]: https://github.com/apache/flink/blob/f237727ed52dbe967bc022268b173fb68587b81b/docs/content/docs/dev/datastream/fault-tolerance/serialization/schema_evolution.md
[oc-reload]: https://github.com/openclaw/openclaw/blob/33ccaae2f522c3ae299aaf8b195fa166ab536bd8/src/gateway/server-plugin-reload.ts#L242-L443
[oc-recovery]: https://github.com/openclaw/openclaw/blob/33ccaae2f522c3ae299aaf8b195fa166ab536bd8/src/gateway/server-plugin-reload-recovery.ts#L29-L99
[oc-fix]: https://github.com/openclaw/openclaw/commit/578690d7f174b0ffb8c76331b9ad9e1612e151d6
[oc-issue]: https://github.com/openclaw/openclaw/issues/154526
[oc-lazy]: https://github.com/openclaw/openclaw/blob/33ccaae2f522c3ae299aaf8b195fa166ab536bd8/src/shared/lazy-runtime.ts#L5-L17
[node-worker]: https://nodejs.org/download/release/v24.10.0/docs/api/worker_threads.html#workerterminate
