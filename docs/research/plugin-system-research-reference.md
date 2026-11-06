---
id: research.plugin-system-reference
type: research
status: active
owner: architecture
summary: Maintained source-backed lessons for module composition, plugin systems, and hot replacement; research is not adoption.
---

# Plugin System Research Reference

**Current follow-up: 2026-11-06; initial industry audit: 2026-10-21.** This is the maintained cross-repository reference for
module composition, extension ecosystems and production hot replacement. It
preserves industry experience so future agents can use the same evidence,
counterexamples and qualification scenarios. Research is not an accepted ADR,
a released runtime, a security audit or a performance qualification.

## Current synthesis

The [2026-11-06 owner decision brief](../open-decisions/OD-003-module-runtime-and-public-spi-choices.md#owner-decision-brief-2026-11-06)
separates the accepted baseline from two proposed choices: the first useful
customization journey and ordinary update timing before Host disposal. It
retains independent authority/product/mechanism criticism, scoped LOC and
rating estimates, actual Agent Runtime readiness limits and the fresh merged
Temporal decision. The options await the owner's choice and authorize no new
runtime, public contract or implementation.

The [expanded research and authority synthesis](plugin-research-synthesis-and-authority-2026-11-05.md)
adds six agent ecosystems, six specialized plugin frameworks and two adjacent
data-plane systems. It separates documented contracts, inspected implementation,
unrun upstream tests, historical corrections and unadopted transfer hypotheses.
The owner's 2026-11-05 clarification is explicit: save research for reuse, discuss
design decisions separately, and implement only the confirmed scope. Agreement
between critics or a passing experiment cannot approve an unresolved design.

The [packed public-consumer E2E continuation](packed-extension-consumer-e2e-2026-11-05.md)
records ten executed public-package scenarios through the unchanged discovery
use case, independent result criticism and its exact product-level limits.
The corrected local run and all four hosted portability lanes pass. Original
failures, package-manager corrections, strict sources and receipts are retained.
The earlier `2b10732` checkpoint has completed hosted CI successfully; the
managed embedded-compiler adoption conflict remains separately recorded.

Start with the [2026-11-05 industry and scale review](plugin-industry-and-scale-review-2026-11-05.md)
for current agent platforms, three investigator lanes and independent criticism.
It preserves both real scaling achievements: the supported N1000 finite
composition/construction recipe and the newer 1,024 simultaneously live scoped
receiver instances. Dense semantic/depth checks are also retained. These do not
establish a product fleet's throughput, hostile isolation or long-running
resource envelope. Current GM main, published npm bytes and Orchestrator's
ADR-0117 adopted baseline are separate identities. OpenClaw's ordinary captures
and managed snapshots also require separate source/profile claims.

The owner confirmed static composition with controlled restart and an optional
Temporal rollout adapter on 2026-10-25. Start with the
[current validation and authority record](static-composition-and-controlled-restart-validation.md)
for fresh source pins, executable results, counterexamples and remaining gates.

The [plugin boundary and failure experiments](plugin-boundary-and-failure-experiments.md)
extend that record with the owner's 2026-10-26 request for independently
criticized, minimal realistic experiments before substantial implementation.
The first checkpoint preserves selected questions and plans. The local results
now retain a reproduced admission hole, a corrected queued seal, actual cleanup
and process observations, loading counterexamples and an independently corrected
async example. An isolated native PostgreSQL restore now passes for the retained
real feature, with raw backup bytes, restored authority and physical cleanup
evidence. The exact Drizzle baseline has a strict declaration blocker; its
migration scenarios remain unexecuted. Final independent criticism keeps the
next step at the actual product receiver/artifact/custody integration.

Design a demonstrated shared replacement concern as an independently useful
library from its first real delivery. First subtract the accepted local kernel
and fitting execution/RPC mechanisms; only then select a residual shared driver,
protocol or conformance responsibility. GM's existing dependency-free kernel
candidate remains in its accepted owner. EF owns this neutral evidence and
protocol discussion; each product retains extension contracts and operational
authority. Independent package use does not require a new repository.

One product-authorized operation can use neutral reusable driver code. Do not
duplicate authoritative phase, active-head, grants or effects, and do not run
two independently advancing drivers for one operation epoch. Temporal can
schedule a warranted rollout outside ordinary invocation; Rust can improve a
specific custody/engine/computation boundary with evidence. Neither technology
supplies the missing product authority by itself.

The earlier hot-replacement proposal studies a trusted, overlap-safe bounded
request cohort; it remains an optional unadopted hypothesis beyond the confirmed
controlled-restart baseline. Deep customization also includes ordinary contributions, explicit
provider substitution and build-time/restart profiles. These useful authoring
paths must not inherit all Host durability machinery.

The executed adapter study retained eight single-worker cases and an unchanged
repeat, plus one independently targeted two-worker rejecting case. It found
workerpool termination fulfillment before task completion, and Piscina 5.3.2
multiworker close fulfillment while another started task was terminated.
Therefore no generic close-success result stands for natural drain or complete
retirement. Exact observations, original failed assumptions and compiler limits
are preserved in the [experiment](worker-adapter-replacement-experiment.md).

## Start with the owning question

| Question | Read next | Decision owner |
| --- | --- | --- |
| What is already accepted, and what must the owner choose next? | [Owner decision brief, 2026-11-06](../open-decisions/OD-003-module-runtime-and-public-spi-choices.md#owner-decision-brief-2026-11-06) | Owning product chooses the actual capability and update policy; EF OD-003 remains open |
| What do further agent platforms and specialist frameworks actually implement? | [Agent framework evidence](agent-framework-extension-evidence-2026-11-05.md), [specialist framework evidence](specialist-plugin-framework-evidence-2026-11-05.md), [cross-case synthesis](plugin-research-synthesis-and-authority-2026-11-05.md) | Research supplies facts and conditional lessons; existing owners decide adoption |
| What do current agent products and current scale evidence change? | [Plugin Industry and Scale Review 2026-11-05](plugin-industry-and-scale-review-2026-11-05.md) | Existing composition, contract, product and execution owners; research is not adoption |
| How should ordinary modules be declared, composed and tested? | [Current GM authoring guide](https://github.com/agent-teams-ai/get-modular/blob/main/docs/guides/module-authoring.md), [Consumer Module Standard](https://github.com/agent-teams-ai/get-modular/blob/main/docs/architecture/common-assembly.md#consumer-module-standard) | Get Modular semantics; each product's adoption profile |
| What optional replacement profiles were researched? | [Hot Reload and Generation Replacement](hot-reload-and-generation-replacement.md) | Product Host; EF [OD-003](../open-decisions/OD-003-module-runtime-and-public-spi-choices.md) and product lifecycle decision |
| Can replacement be an ordinary reusable library, and which mechanics already exist? | [Reusable Generation Mechanisms and Ownership](reusable-generation-mechanisms-and-ownership.md) | Existing kernel/execution owners; residual mechanism owner only after its real boundary is shown |
| Can Temporal replace custom rollout scheduling, including local deployments? | [Temporal and Rollout Orchestration](temporal-and-rollout-orchestration.md) | Owning product operation and scheduling adapter; existing hosted/local adoption |
| Which critical components justify Rust or another language? | [Critical Components and Language Boundaries](critical-components-and-language-boundaries.md) | Existing responsibility owner and exact language/runtime adoption |
| How can authors customize deeply without forking or implementing the Host? | [Customization Without Forks and Scale](customization-without-forks-and-scale.md) | Consumer-owned extension points, provider contracts and deployment capacity |
| What did the actual executor experiment prove or reject? | [Worker Adapter Replacement Experiment](worker-adapter-replacement-experiment.md) | Exact tested package/runtime and future adapter qualification |
| What does current OpenClaw do well, and which limitations should we test against? | [OpenClaw Plugin and Reload Audit](openclaw-plugin-and-reload-audit.md) | Product Host qualification; no imported competitor architecture |
| What do IDE and RPC plugin platforms teach about references, unload and restart? | [Plugin Platform Reload Evidence](plugin-platform-reload-evidence.md) | Capability and execution-boundary owner |
| What do servers, VMs, workers and controllers guarantee during replacement? | [Production Reload System Evidence](production-reload-system-evidence.md) | Product admission, recovery and retirement adapters |
| How do long-lived jobs and state change the update problem? | [Stateful Upgrade and Recovery Evidence](stateful-upgrade-and-recovery-evidence.md) | Operation, state and effect owners |
| How do many independent authors and modules affect compatibility and scale? | [Plugin Ecosystem Scale and Composition](plugin-ecosystem-scale-and-composition.md) | Contract/package owners and qualification owners |
| Which proposals survived independent criticism, and what remains open? | [Plugin Research Review and Decision Record](plugin-research-review-and-decision-record.md) | Existing ADR/open-decision owners |

Links to `main` above are current navigation. Every source-derived finding in the
companion records has its own observation date and exact revision or an explicit
moving-documentation caveat. A newer repository head does not retroactively
change what was observed at a recorded pin.

## Keep the three implementation boundaries

| Boundary | Owns | Does not acquire through this research |
| --- | --- | --- |
| Get Modular | Inert declarations, contract/implementation/slot identities, deterministic graph preparation, immutable plans, typed construction, cooperative resource primitives and the separately gated local lifecycle candidate | Executable discovery, product authorization, durable publication, routing, process supervision or distributed fencing |
| Extension Foundation | Neutral extension/artifact/install identities, trust and distribution rules, admission/custody/retirement protocol obligations, evidence and reusable conformance boundaries when separately qualified | Product domain models, a universal service locator, duplicate GM composition or an implicitly admitted runtime package |
| Consuming product | Concrete capabilities and declarations, literal loaders, policy/grants, execution placement, readiness, canonical active state, admission, operation/effect recovery and physical retirement | Authority to weaken its domain invariants or treat a manifest/signature as a permission grant |

These are existing boundaries, not a new framework selection. EF
[ADR-0015](../decisions/0015-authorize-get-modular-semantic-extraction.md)
separates the neutral cores; a product-owned adapter may consume both. EF
[ADR-0014](../decisions/0014-product-local-module-authoring-composition-and-generation-guardrails.md)
keeps concrete authoring and generations with the product. EF
[ADR-0011](../decisions/0011-extension-admission-custody-and-retirement-closure.md)
applies its production-host safety floor only to the explicitly admitted
profile, not to every ordinary library or static GM module. Orchestrator retains
its stricter [OD-041 production gate](https://github.com/agent-teams-ai/agent-teams-orchestrator/blob/main/docs/open-decisions/OD-041-shared-extension-foundation-and-artifact-distribution.md).

Clean Architecture means domain/application code sees its own narrow ports,
not a plugin SDK or container. SOLID means contract owners define substitutable
behavior and independently exercise implementations. DRY means one owner for a
shared invariant and its tests; it does not justify a generic service bag or
shared domain model. DDD keeps actual bounded-context language and invariants with their owner; a
plugin package or callback phase is not automatically a bounded context.
Pluggability means a declared, qualified replacement seam,
not turning every helper, class, endpoint or package into a module.

## Pattern and failure register

The identifiers below are stable navigation labels, not new runtime APIs or
normative requirements. Each row routes to detailed primary evidence and a
proposed rejecting scenario.

| ID | Reusable pattern | Failure to prevent | Evidence and applicable owner |
| --- | --- | --- | --- |
| PR-01 | Read inert metadata before selected executable loading | Import every candidate to discover whether it is disabled, then assume zero side effects | [OpenClaw §1](openclaw-plugin-and-reload-audit.md); product admission/loader |
| PR-02 | Keep composition immutable per constructed generation | Live mutation of captured dependencies, registration order as priority, ambient `getCurrent()` inside modules | [Ecosystem evidence](plugin-ecosystem-scale-and-composition.md); GM and product composition |
| PR-03 | Use small owned extension points with explicit phase, cardinality and compatibility | One universal plugin interface or public registry that leaks Host internals | [Backstage](plugin-ecosystem-scale-and-composition.md) and [platform evidence](plugin-platform-reload-evidence.md); contract owners |
| PR-04 | Classify identity-bearing dependencies separately from ordinary libraries | Assume matching structural types prove equal runtime tokens, or force all libraries into one global copy | JupyterLab/Jenkins/Backstage in [ecosystem evidence](plugin-ecosystem-scale-and-composition.md); package contracts |
| PR-05 | Prepare an overlap-safe candidate before new-work publication | Claim old-active-on-failure while tearing down an exclusive predecessor first | NGINX/Envoy/OpenClaw in [hot-reload proposal](hot-reload-and-generation-replacement.md); product profile |
| PR-06 | Capture one generation and closed collaborator set per admitted operation | An old request calls a fresh provider after an await, or acquires fresh authority after quiesce | [Hot-reload identity and admission protocol](hot-reload-and-generation-replacement.md); Host adapter |
| PR-07 | Give every resource, registration and callback an exact owner | Late old cleanup deletes a newer registration; setup finishes after timeout without retained custody | [OpenClaw audit](openclaw-plugin-and-reload-audit.md), [system evidence](production-reload-system-evidence.md); resource owner |
| PR-08 | Separate publication, projection, admission, drain and retirement | Treat ACK, cached route pointer, `dispose()` return or deadline as universal completion proof | Envoy/Node/browser/GM in [hot-reload proposal](hot-reload-and-generation-replacement.md); product authority |
| PR-09 | Reconcile uncertain effects under the original operation identity | Retry a remote mutation because its response was lost, or call routing rollback an effect rollback | [Stateful evidence](stateful-upgrade-and-recovery-evidence.md); existing effect owner |
| PR-10 | Roll back by preparing immutable old bytes as a fresh forward generation | Reuse a retired token, decrement fences or silently load changed disk bytes for recovery | [OpenClaw recovery](openclaw-plugin-and-reload-audit.md), [hot-reload matrix](hot-reload-and-generation-replacement.md); product recovery |
| PR-11 | Bound live generations, admission, queues, artifact/cache retention and cleanup debt | Every failed replacement retains another worker, context, listener or sticky failure forever | [System evidence](production-reload-system-evidence.md), [scale axes](plugin-ecosystem-scale-and-composition.md); Host budgets |
| PR-12 | Separate trusted execution rotation from hostile-code enforcement | Describe workers, ports, permission requests or signed artifacts as a universal sandbox | Chrome/Backstage in [ecosystem evidence](plugin-ecosystem-scale-and-composition.md), Node in [system evidence](production-reload-system-evidence.md); security/deployment owner |
| PR-13 | Test packed independently released providers and consumers with independent oracles | Monorepo hoisting hides duplicate tokens; expected wiring is generated from actual wiring | [Ecosystem conformance scenarios](plugin-ecosystem-scale-and-composition.md); SDK/contract qualification |
| PR-14 | Keep normal upgrade, emergency revocation and state transfer as distinct operations | Drain compromised code indefinitely; use a generic state hook for incompatible snapshots | Temporal/Flink in [stateful evidence](stateful-upgrade-and-recovery-evidence.md); security and state owners |
| PR-15 | Subtract existing kernel/executor/RPC responsibilities before defining a shared library | A new generic manager duplicates an accepted owner or merely renames commodity APIs | [Reuse analysis](reusable-generation-mechanisms-and-ownership.md); shared mechanism owner |
| PR-16 | Use durable scheduling at the operation boundary with receiver-enforced epochs | Every call becomes a workflow, or a stale Activity continues advancing a replaced driver | [Temporal analysis](temporal-and-rollout-orchestration.md); scheduling and command receivers |
| PR-17 | Select native implementation for a demonstrated boundary benefit and full release cost | Rewrite a pure TS state machine because it is critical; treat memory safety as distributed correctness | [Language boundaries](critical-components-and-language-boundaries.md); existing component owner |
| PR-18 | Define supported customization seams and aggregate capacity scope | Ordinary authors implement Host durability; per-cohort caps hide tenant/replica multiplication or live failed candidates | [Customization and scale](customization-without-forks-and-scale.md), [bounded protocol](hot-reload-and-generation-replacement.md); contract and capacity owners |
| PR-19 | Separate installed metadata, executable activation and the model-visible tool shortlist | All definitions fill context; token savings hide poor discovery; a cached tool description is treated as a current grant | [Current agent catalog scale](plugin-industry-and-scale-review-2026-11-05.md#agent-facing-catalog-scale-is-a-separate-product-responsibility); product tool/protocol adapter and authorization owner |

## Qualification target and claims discipline

**Authority clarification, 2026-11-05:** static composition with controlled
restart is the owner-confirmed baseline. The earlier overlapping-worker scope
below is optional comparative research. It is pursued only if an actual product
capability justifies the stronger requirement and its owner selects that scope.

The earlier synthesis proposes one trusted, request-oriented, overlap-safe cohort in
a Node worker, with a fresh immutable GM instance per generation and product
canonical publication/admission/recovery. This is a concrete optional research and
qualification target. It is not an accepted worker runtime, a released lifecycle
kernel, a public SPI or a substitute for the product's admission decision.

The [full proposal](hot-reload-and-generation-replacement.md) contains the
admission race, crash matrix, budgets, rejecting tests and alternatives rated
for confidence, reliability and complexity out of ten, with production and test
LOC separately. Scores are judgments for the bounded scope, not measured
availability. Exclusive resources, cross-generation retained consumers,
private-state migration and hostile-code profiles require separate choices.

A scalability statement must report installed descriptors, active modules and
instances, dependency edges/closure, feature nesting, tenants, worker/process
count, in-flight work, independent package versions, compiler/editor workload,
and reload churn. Do not infer any of these from a marketplace's plugin count.
Caps must name their denominator. A per-cohort generation cap is not a Host or
tenant aggregate limit; failed preparation retains capacity while its actual
execution/custody remains unresolved. Sharing execution realms changes failure
and authority scope, not only cost.
The current review recognizes the bounded N1000 authoring/construction evidence,
dense semantic checks and 1,024 live scoped receivers. None is an actual product
thousand-plugin capacity envelope. Compare OpenClaw using equivalent scenarios and measured envelopes,
including its existing protections, before making a stronger comparative claim.

**Upstream update observed at 19:14 UTC on 2026-10-21:** GM
[`eadd9d391657ae6f508a874dd30e923bdc4054f0`](https://github.com/agent-teams-ai/get-modular/commit/eadd9d391657ae6f508a874dd30e923bdc4054f0)
qualified the selected flat **source-check** series through N1000 with published
Foundation 2.1.1 and FMS 0.2.3. Its [growth fixture record](https://github.com/agent-teams-ai/get-modular/blob/eadd9d391657ae6f508a874dd30e923bdc4054f0/tests/qualification/consumer-fixtures/growth/README.md)
explicitly retains the separate supported TypeScript 7.0.2 compiler blocker.
This supersedes earlier pending-source-check status; it does not establish
N1000 compiler/runtime qualification, process RSS or hot-reload retention limits.
Earlier pinned observations remain historical evidence.

**Authority correction, 2026-10-25:** Orchestrator accepted ADR-0114/0115
already adopt native PostgreSQL for hosted and Fully Local profiles. The
`embedded-postgres` launcher approach is selected, while exact production
bundles remain subject to qualification. Owner-accepted ADR-0116 in open PR90
selects native Temporal plus PostgreSQL for Fully Local; the branch is not yet
merged. The [current authority map](static-composition-and-controlled-restart-validation.md#current-storage-and-workflow-authority)
supersedes this research's earlier SQLite/OpenWorkflow adoption-gap conclusion.

**Growth correction, 2026-10-25:** current GM main `b70ba393` includes the newer
ADR-0041 descriptor-union recipe and its 2026-10-23 compiler/runtime evidence
through N1000. The historical source-check-only/compiler-blocker statement
above belongs to the older recipe and snapshot. It is not a current universal
N1000 blocker. Fresh bounded repetition is tracked in the validation record;
neither series establishes active-plugin capacity, RSS or reload retention.

**Current source and consumer correction, 2026-11-05:** GM main now includes
the live-instance test and later preparation/lifetime fixes, some newer than
published npm artifacts. Orchestrator accepted ADR-0117 reconciles its actual
Core/Assembly 0.5.0 baseline and supersedes the old ADR-0110 authoring pin. Read
the [current authority and evidence tables](plugin-industry-and-scale-review-2026-11-05.md#research-coverage-and-current-authority)
before treating an older snapshot as current. Historical compiler failures,
accepted pins and archived runs remain unchanged.

## Maintenance instructions for future agents

1. Start from the owning accepted ADR and current implementation contract. Read
   the relevant research row and its counterexamples before proposing a design.
2. For every new fact, record the primary URL, retrieval date, version/commit,
   technology, actual extension unit, scope, observed behavior, known limitation,
   counterevidence and practical implication. Use
   an immutable source pin when available. Label unversioned or development docs.
   Separate an inspected branch from a released feature and identify repository
   migrations rather than treating a retired source tree as a current product.
3. Separate inspected implementation, inspected-but-unrun test assertions,
   maintainer/user reports, fixed historical mechanisms, inference and executed
   local qualification. An issue closed as duplicate or stale is not a fix.
4. Add the concrete failure trace and a rejecting scenario. Name which owner
   can enforce it and what evidence would falsify the recommendation. Do not
   turn a framework-specific guarantee into a language-independent promise.
5. Recheck moving sources before adopting their behavior. Append dated
   corrections or supersession notes; preserve the earlier source pin and
   historical resolution. Keep current guidance current without rewriting
   accepted ADR bodies or immutable qualification results.
6. New installation recipes use the latest release channel, save exact resolved
   versions and commit a lockfile. Existing consumers compare their approved
   pin with current upstream and migrate with qualification. Artifact activation
   uses immutable digests; a mutable `latest` tag is only a discovery selector.
7. Put shared evidence in this reference family; link it from GM/Orchestrator
   instead of cloning the same research. Keep local conformance results beside
   their owning code, and record unresolved adoption in the owning open decision.
8. Before proposing production work, present concrete alternatives with
   confidence/reliability/complexity scores out of ten and separate production,
   integration and test LOC ranges, assumptions, uncertainty and release cost.
   Higher complexity means more burden; scores are judgments, not measurements.
   Preserve decisions already approved by the owner; discuss genuine conflicts
   through a successor decision. A transfer hypothesis remains unadopted until
   the owning decision records approval. Do not implement it merely because
   researchers agree, competitors use it or a prototype passes.

Research documents use the existing repository Docs Protocol with type
`research` and statuses `active` or `archived`. Neither status means accepted or
qualified. New records require the ordinary preview/apply/index/check workflow;
this reference introduces no second writer, database or runtime registry.
