---
id: research.decision-review
type: research
status: active
owner: architecture
summary: Independent critique dispositions, adoption conflicts and scoped implementation alternatives.
---

# Plugin Research Review and Decision Record

**Date:** 2026-10-21. **Status:** non-normative research synthesis; no new architecture approval, runtime qualification, or merge authorization. This record combines the platform, production-system, ecosystem-scale, stateful-update and OpenClaw research with independent lifecycle, scale/security, and adoption/documentation critiques. Researchers supplied comparison evidence; critics challenged lifecycle promises, security and scale claims, and adoption provenance. Primary sources were retrieved by those reviewers on this date; this synthesis distinguishes their source facts, historical reports and unexecuted test assertions from recommendations, without claiming independent reproduction.

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
| Same bounded cohort in supervised process, explicit descendant policy | 7 | 9 | 7 | 4,000–7,000 | 6,500–11,000 |
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

EF ordinary-library admission, GM 0.x authorization, stable-GM qualification and public-SPI publication are different gates. Orchestrator [OD-041][o41] still requires two independent product integrations for production EF adoption; EF-local permission does not waive it. The current research/documentation repair can finish without answering all activation questions. This synthesis records source review and recommendations only: it reports no new test execution, final check result, PR creation, merge or production qualification.

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
