---
id: research.plugin-choice-deepening
type: research
status: active
owner: architecture
summary: Source authority corrections, industry comparison and bounded experiments for plugin extension contracts and ordinary updates.
---

# Plugin Choice Deepening 2026-11-06

## Scope and authority

Observed **2026-11-06**. This deepens and corrects the earlier
[OD-003 brief](../open-decisions/OD-003-module-runtime-and-public-spi-choices.md#owner-decision-brief-2026-11-06).
Research, scores and agreement between critics do not adopt an alternative,
publish a contract, qualify a deployment or authorize a merge. This delivery
changes no production implementation or accepted ADR.

Two GPT-6.1 Sol xhigh investigators examined extension contracts and ordinary
updates. A GPT-6 Astra xhigh critic reviewed authority, plans and results;
investigators also cross-reviewed ownership. Root checked the source correction,
raw compiler diagnostics and another industry lane. A second independent
GPT-6 Astra xhigh critic reviewed the overall conclusions. Three additional
GPT-6 Astra xhigh reviewers audited source authority, update policy and retained
evidence during task recovery. Their corrections are recorded below and in a
separate recovery evidence packet. The shared brief
preserves the owner's no-fork customization vision, potential thousands of
plugins, Clean Architecture/SOLID/DRY, product-owned semantics, existing custody,
static composition and controlled restart, and optional qualified Temporal
coordination. These reviews are evidence, not design approval.

## Corrections to the earlier recommendation

### The first provider journey was already selected

**Withdraw the earlier contained-provider-first 1A recommendation.** Accepted
[Agent Runtime ADR-0091][AR91] already selects the interactive Claude/session
slice, a runtime-owned consumer SPI and an ordinary external provider library.
It freezes contained-turn and forbids widening the ordinary Codex profile for
that slice. Current [AR modularity research][ARM] explicitly says its conditional
alternative shortlist must not reopen this accepted journey.

Both documents were present at the **same AR commit** `f990acc` cited by the
previous brief. This was a research omission, not a newly changed upstream
decision. Independent reviewers shared an incomplete source inventory; their
agreement did not cure it. Retain the earlier packet as history, but do not ask
the owner to reselect an already accepted direction.

This resolves the already admitted **provider slice**, not the design or
priority of every future customization capability. The broader ecosystem still
needs product-owned contribution, substitution and trust contracts. A provider
library is one useful no-fork journey, not a replacement for that vision.

The admitted erased subpath is
`@agent-teams/agent-execution/interactive-contracts`. Agent Execution owns
session/generation semantics; Embedded Runtime selects the concrete factory;
Orchestrator owns product work, tools and approvals. An external driver does not
supply its own custody, authorization or authoritative completion owner.
Current private `0.0.0` packages and curated exports are not a stable public
marketplace release. Real-provider and deployment qualification remain separate.
[AR91], [AR-contract], [AR-readiness].

ADR-0091 names `agent-teams-ai/provider-implementations`. It permits a separate
runtime-owned contracts package **only if actual independent packing proves
that the private runtime package cannot supply its type dependency**. That
contingency does not select EF/GM as contract owner or create a second Host.
The authenticated request for that repository returned 404 at this observation;
this is an access result, not proof of nonexistence. [AR91]

### The actual provider source is identifiable

The recovery audit followed the B donor path named by ADR-0091. At the same
`f990acc` pin, `experiments/interactive-provider-contract/src/claude` contains
six TypeScript files, **520 physical lines**. These are existing experimental
implementation, not 520 newly delivered lines or an installable production
provider. Its draft contracts are review inputs, not a second authority.
The named external packaged delivery remains unverified, but the donor source
is known. [AR91], [B-factory], [B-contract]

| Actual source boundary | Remaining adaptation under the accepted direction |
| --- | --- |
| B exports `openClaudeSession(ClaudeConfig, checkpoint?, sdk?)` returning `Reply<Session>`; canonical SPI expects `DriverFactory.open(OpenConfig)` returning `OpenedSession` | Bind trusted provider configuration in the concrete factory and preserve typed failure and resource ownership |
| B handoff uses `sdk-consumed`; canonical SPI and owner expect `client-consumed` | Align the runtime-owned contract without promoting input consumption into provider acceptance |
| Canonical open carries required capabilities and an optional checkpoint reference; the result reports confirmed capabilities | Confirm actual capabilities and resolve private checkpoint bytes through their existing owner |
| B calls `session.close()` after readiness failure, then returns only the readiness failure | Preserve failed-open cleanup ownership and its observed outcome; a thrown open error cannot substitute for physical closure proof |

The current session owner deliberately handles late open completion and obtains
separate custody evidence on close. Adaptation must preserve those guarantees;
it does not need a second Host or supervisor. One candidate simplification is
to return the canonical driver before the obsolete draft entrypoint's initial
readiness/cleanup stage, letting the existing owner retain the handle and check
readiness. Preserve the driver's per-handoff checks and ownership of resources
acquired before a handle returns. Evaluate this during the planned single move;
do not maintain parallel supported draft and canonical APIs. Source inspection is decisive for
these interface and cleanup-result differences. No new compiler or runtime run
was added for this finding, and no deployed provider failure is claimed.
[B-factory], [AR-driver], [AR-session-owner]

This is the relevant next integration investigation. The legacy Desktop probe
below remains a useful historical compatibility check, but it cannot replace
inspection of the ADR-named donor or qualify that donor's production extraction.

### Ordinary deferral is different from irreversible shutdown

The earlier 2A said to seal new work, finish accepted turns and keep an update
pending if work remains unresolved. Permanent admission closure plus unresolved
work can leave the old service unavailable indefinitely. The wording also
assumes a fresh-request gate that the inspected shutdown APIs do not supply.

The contained provider's `sealAdmission` sets `disposed`; delegated preparation
and process creation check the same flag. It cannot mean only rejecting fresh
user requests while all accepted work still dispatches. Host disposal never
resets its disposed state after a failed wait. Interactive Host cleanup similarly
retains `closing`. These are intended one-way shutdown boundaries, not newly
reproduced product bugs. [AR-seal], [AR-disposal], [AR-host].

Distinguish durable uncertainty about an operation from unproved physical
closure. In the inspected ordinary Host path, `disposeOrdinaryOwner` may prove
physical closure and required owner settlement, after which
`releaseOrdinaryOwnership` permits Host disposal while the durable operation
still remains `reconcile_required`. That is not operation success, permission
to replay it or permission to bypass a contract violation. Do not turn every
durable reconciliation record into a universal restart prohibition, and do not
transfer this ordinary-profile rule to interactive sessions without their own
owner evidence. [AR-disposal]

Interactive close already durably seals, rejects queued undispatched inputs,
joins cleanup and retains unknown closure. An idle turn may still belong to a
live session. Explicit restore binds exact checkpoint/configuration/account/
workspace identity, creates a new generation and restores neither filesystem
effects nor old callback authority. A generic drain fixture cannot replace
these accepted rules. [AR91]

## Current source and delivery identities

| Source | Exact observation | Meaning |
| --- | --- | --- |
| EF draft PR55 | `99a5b9157ee5dfdfeb2a14ed99d559fb0135fb7d` before this delivery | Research branch, not merged authority |
| GM main | `5fb83478dd7b95216be92c4d3077eddf2774eef8` | Existing composition and adopted contract semantics retain their owner |
| Orchestrator main | `a34587b313e656eeb43d755b4a4f08c40dff2116` | PostgreSQL/Fully Local/native Temporal and reconciled module adoption remain in force |
| Agent Runtime main | `f990acc26e1b8071ae22d0b87a2ddd3672be8e2e` | ADR-0091, interactive contract and current readiness inspected |
| Accessible `old-provider-implementations` | Open draft PR1 `7573a50842c3eeacb473f9d97d40f3ddf6ac0cf9`; default `bootstrap` is `97785f6096dd25c43c80394dbd58f416798069f2` | Separate legacy Desktop extraction; PR body excludes future Runtime/Orchestrator ownership |

The last row is **not established as the intended ADR-0091 delivery**. Similar
names and donor ancestry do not establish a supported integration pair. Its
own-contract packed test and AR's erased-contract test do not prove these two
artifacts work together. The diagnostic below is exploratory compatibility
evidence only. [EXT1], [external-contract], [AR-package-test].

Current navigation follows [AR main ADR-0091][AR91-current] and
[Orchestrator main ADR-0116][O116-current]. Exact pins bind findings; current
navigation does not silently repin adopted dependencies or rewrite history.

## Executed source-contract diagnostic

The initial packed-driver/Host hypothesis was reviewed, then narrowed because
matching built artifacts and an intended delivery pair were not available. The
approved falsifier checks assignability against unchanged real public barrels.
The inspected legacy Claude factory explicitly declares the external contract
as its return type. Its implementation and vendor SDK were not compiled or run.

Exactly three invocations used **TypeScript 7.0.2**, Node 24.22.1, `strict`,
`noEmit`, `skipLibCheck: false`, `exactOptionalPropertyTypes` and
`noUncheckedIndexedAccess`. The consumers total **11 TypeScript lines**.
Resolution lists show six AR contract-source files and three legacy contract
files. No new dependencies, live credentials or provider processes were needed.

| Case | Observed result | Precise conclusion |
| --- | --- | --- |
| Current AR factory type to itself | Exit 0 | Setup/current contract closure compile; no behavior claim |
| Legacy factory type to current AR type | Exit 1, TS2322 | Returned observations can include `compaction`, absent from AR's event union |
| Current AR type to legacy external type | Exit 1, TS2322 | Legacy caller can send a denied question reply that AR's parameter contract does not accept |

The critic verified all eleven retained contract/signature file hashes against
exact Git revisions and checked the diagnostics. Failures are semantic, not
missing-module or compiler-setup errors. Optional attachments were seen in
source, but the probe does not identify them as a failure cause. No casts,
suppressions, replacement interfaces or compatibility shims were used.

This establishes **two-way type divergence between exact exploratory
snapshots**. It does not establish a supported-release defect, an ADR-0091
delivery blocker, runtime behavior, artifact installability, SDK correctness or
a need to extract a package. Do not discard events, widen the current contract
or repair/merge the legacy PR to manufacture a pass. Identify the selected
provider artifact before planning its integration. No fourth compiler check,
package fallback or Host execution followed the decisive result.

## Industry lessons that affect these choices

Detailed reports retain exact source pins, inspected areas, historical fixes
and limitations. These are documented/source observations, not newly executed
deployments or claims that their workloads share AR session semantics.

| System inspected | Useful pattern | Misapplication to avoid |
| --- | --- | --- |
| Backstage, source `3978b97` and official docs | Small plugin-owned extension points; separate contract libraries; explicit additive/exclusive behavior; real catalog modules supply useful ingestion | Same-backend modules do not provide isolated live replacement. Importing the framework would duplicate GM composition. [BS], [Backstage-module] |
| VS Code, source `29ad5e7` and official docs | Capability-specific selection, merging and failure semantics; stable API separated from proposed API | Extension Host permissions include host files/network/processes. Its separation is not a hostile-code sandbox. [VS], [VSP], [VS-security] |
| go-plugin v1.8.0, `155dcdd` | Explicit consumer/RPC contracts, protocol versions and owned executable lifetime | Magic cookie is a UX guard; host environment inheritance is not least privilege. One two-second grace phase is not a total cleanup deadline. [GP], [GPS] |
| Vault, moving v2.x docs | Registration, distribution, activation and lifetime are distinct; multiplexing reuses processes across mounts | Catalog size does not equal process count; shared process reuse also shares a failure domain. [VAULT] |
| NGINX 1.28.0 and control guide | Validate/apply safe candidate resources before old retirement; preparation failure preserves old configuration | Worker overlap and socket inheritance do not prove agent-session transfer. Forced retirement can sacrifice connections. [NGINX], [NGINX-timer] |
| Envoy 1.36.0 | New initialization, connection drain and final shutdown are separate | Existing connections stay in the old process until completion or termination. Some graceful modes temporarily accept new connections. [ENVOY], [Envoy-drain] |
| systemd 258, with later corrective history | Completion-aware reload aims to separate reload result from service health | v258 has a known notify-reload timeout loop; do not claim guaranteed completion from its manual. The later fix and a timeout test are recorded in upstream PR39376. A failed reload still does not prove arbitrary application mutations were rolled back. [SYSTEMD], [SYSTEMD-issue], [SYSTEMD-fix] |
| Kubernetes 1.36 docs snapshot | Desired rollout, progress failure, availability and physical termination are distinct | Progress deadline does not automatically roll back; force deletion does not confirm node/process termination. [K8S], [K8SP] |
| Erlang/OTP 29.1.2 | Soft purge can refuse retirement while old code is referenced; hard purge has an interruption cost | VM code switching does not grant JavaScript object replacement, unlimited generations or effect rollback. [OTP] |

**Engineering inference:** prioritize useful narrow capability contracts before
expanding lifecycle machinery. Configuration, declarative contributions, a
provider implementation and privileged infrastructure are different authoring
needs. Define selection/cardinality, failure, version and permission semantics
per capability. Keep compatibility and conformance with the contract owner.
Do not export a universal service locator or give each plugin security, state
and process-lifecycle authority.

For scale, distinguish catalog entries, selected graph nodes, live instances,
persistent sessions, executing work, process count and version churn. Earlier
finite graph/receiver results retain their measured scope; this follow-up adds
no thousand-active-provider qualification. Native languages and commodity RPC
remain options for a demonstrated systems boundary. No new supervisor or
runtime dependency is selected by this review.

## Ordinary update policies after the correction

These are conditional recommendations, not new accepted lifecycle rules.
Emergency revocation, containment and already accepted deadlines retain their
existing authority.

| Candidate | User-visible tradeoff | Remaining prerequisite |
| --- | --- | --- |
| **Prepare safely; defer before sealing; stop at genuine quiescence** | Keep a healthy old service active while the update waits; continuous load, open sessions or unsettled obligations requiring this instance may postpone it indefinitely | Actual owner atomically establishes the relevant quiescence condition and stops admissions; polling zero calls then disposing is racy |
| Temporarily pause new-operation admission, abort/resume if drain fails | Pause fresh work for a bounded attempt; possibly resume the unchanged healthy service | A narrow reversible owner port, attempt identity and recovery; keep required replies/control/observation/reconciliation available |
| Explicit maintenance grace, then authorized cutoff/close | Permit interruption to progress toward an update; no unconditional completion deadline under unknown closure | Product selects maintenance/queue/session consequences; existing operation/custody owners enforce closure |
| Permanent seal plus indefinite wait | Can leave fresh work unavailable indefinitely | Only an explicitly chosen maintenance state could justify this; not recommended ordinary deferral |

The smallest candidate is **defer before irreversible shutdown**, avoiding a
new reversible lifecycle unless a concrete maintenance requirement needs it.
Safe preparation excludes incompatible shared-state mutation or exclusive old
resources. Once cutoff, close, revocation, disposal or authority transfer starts,
retain the barrier and reconcile; timeout cannot reopen the instance, replay
uncertain work or release retained custody.

For persistent sessions, idle turns are insufficient. Existing close remains
irreversible and rejects undispatched inputs. Automatic checkpoint/restore
continuity is not adopted by this research. Maintenance policy need not block
contract provenance or packing work already admitted by ADR-0091.

Quiescence does not require an active Host to have no resource handles: idle
infrastructure still needs ordinary disposal. Its exact predicate concerns
accepted work and obligations that require preserving this instance, under the
selected owner's contract. Physical closure, durable operation truth and update
readiness keep their separate evidence.

A promised durable pending update also needs its existing owner's crash
recovery: distinguish deferral before stop, irreversible stop in progress,
proved old closure with failed replacement startup, and a stale attempt's late
completion. A lost Promise cannot erase accepted desired state or authorize
reopening an old instance. These update-specific outcomes are not qualified by
the earlier receiver experiments, and their absent implementation is outside
the local-mechanics estimates below. This does not select a new store or
coordinator.

## Reviewed experiment stop

A separate plan considered a real receiver/effect-child probe with independent
admission and physical-exit observations. The critic and root rejected new
execution for now: the actual inspected owners provide no reversible pause or
atomic quiescence operation. Adding one to a synthetic harness would test a new
invention and would not validate the real product estimate.

The earlier [RST boundary campaign](plugin-boundary-and-failure-experiments.md)
already retains queued admission, permanent seal, failed readiness/cleanup
debt, late effects and process-exit observations. Those results were reused
without rerunning them; they do not qualify an interactive update policy. A
finite timer cannot prove liveness for indefinitely unresolved work. Another
spike is useful only when a real owner API and decision-changing uncertainty
are identified.

## Remaining choices and estimation limits

Follow the accepted interactive direction from its identified experimental
donor, adapt it to the canonical contract, and establish the actual external
artifact/revision/authority before a packed real-consumer test. Keep the
contracts-package contingency conditional on packing evidence. Public EF SPI,
untrusted author isolation, session update promises and plugin-private state
migration remain separately owned choices in
[OD-003](../open-decisions/OD-003-module-runtime-and-public-spi-choices.md).
A provider contract is one concrete journey, not the whole no-fork ecosystem.

The earlier contained-first estimates and `P0 / I150–350` wait/defer allowance
are not current delivery estimates. The investigator reports retain scoped
planning bands and exclusions. Total delivery is unknown until the intended
artifact, execution profile and missing owners are named. Reliability scores
refer to achievable named guarantees after qualification, not measured uptime.

### Conditional comparison budgets

The owner requested LOC and scores for alternatives. The bands below concern
**one hypothetical trusted local bounded-turn profile**, not the accepted
persistent interactive slice. They apply only if complete authoritative
accepted-work/debt inventory, atomic admission/quiescence and existing update
recovery records already exist. The inspected surfaces do not establish these
prerequisites; their missing implementation is outside the bands and has no estimate.

P means new/changed handwritten contract/owner behavior; I means one product's
operation/composition wiring; T means focused tests and rejecting fixtures.
Columns are disjoint; alternatives overlap and must not be added. Generated,
moved, vendor and documentation lines are excluded. Reliability is the achievable
named guarantee; recommendation confidence and sizing confidence are separate.
Complexity 10 is harder. Ranges may change by roughly a factor of two even within
the stated local scope and are not delivery ceilings.

| Hypothetical local policy | P LOC | I LOC | T LOC | Reliability /10 | Recommendation confidence /10 | Complexity /10 | Sizing confidence /10 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Atomic quiescent pre-seal defer | 120–300 | 100–250 | 350–800 | 8 | 7 | 4 | 3 |
| Separate reversible fresh-admission pause | 220–500 | 150–350 | 550–1,200 | 8 | 5 | 6 | 3 |
| Separate fresh-admission grace, then existing cutoff | 160–350 | 180–400 | 500–1,100 | 8 | 6 | 5 | 3 |

Equal reliability scores do not imply equal availability or interruption
behavior. For actual persistent-session continuity, P/I/T remains **unknown**,
recommendation confidence is **3/10**, sizing confidence **2/10**, and expected
complexity **8/10**; reliability cannot be rated without the exact promise.
Do not substitute bounded-turn arithmetic for that missing work.

For the admitted interactive direction, authority confidence is **9/10**.
A source-grounded synthetic adaptation of the identified B donor has the
following disjoint planning bands. It assumes a selected buildable package,
fixed trusted configuration, existing injected SDK transport and usable
checkpoint and exact-generation custody owners. These prerequisites are not
qualified by this research. A missing owner invalidates the estimate rather
than becoming an implicit new subsystem.

| Canonical donor adaptation | New TS LOC | Changed TS LOC | Combined |
| --- | ---: | ---: | ---: |
| Concrete adapter and canonical-contract alignment | 90–180 | 25–75 | 115–255 |
| One owning-product configuration/composition integration | 60–140 | 20–50 | 80–190 |
| Joined contract tests and rejecting fixtures | 220–450 | 60–150 | 280–600 |

The **520 existing donor lines** are excluded, as are package metadata,
generated/vendor code, documentation and operational release work. These are
engineering estimates, not implemented lines or a release ceiling; missing
prerequisites can change them by more than a factor of two. Recommendation
confidence is **8/10**, sizing confidence **4/10** and conditional complexity
**4/10**. Achievable reliability is judged **8/10 for the named joined
contracts after qualification**; the joined interactive realization remains
unqualified. Whole delivery cost remains unknown.

A later selected driver/public Host integration and its qualification harness
had the narrower conditional allowance: P **0**; I **100–250** for future
owning-product startup/composition wiring; T **200–500** for the independent
packed consumer/conformance fixture. This assumes legitimately built selected
artifacts and dependencies already work together.
It excludes contract repair, real credentials/tools/custody, native delivery,
product behavior and public support. This research has not met those prerequisites
or established a complete production estimate. It overlaps the donor adaptation
above and must not be added to it. Detailed decomposition and
independent objections are retained in the evidence reports.

## Retained evidence

The [evidence archive](evidence/plugin-deepening-20261106.tar.gz) and
[member manifest](evidence/plugin-deepening-20261106.json) retain the common
brief, both reviewed plans, investigator/critic reports, source ledgers,
unchanged source snapshots, strict probe inputs, compiler/native identity,
original outputs and exit codes. Historical failed predictions remain evidence.
Start from the [maintained research reference](plugin-system-research-reference.md).

The later [recovery audit packet](evidence/plugin-deepening-recovery-20261106.tar.gz)
and [member manifest](evidence/plugin-deepening-recovery-20261106.json) retain
the additional independent reviews, exact source identities, correction
dispositions and original failed/passing documentation logs. They supplement
the frozen first packet; its historical conclusions were not rewritten.

[AR91]: https://github.com/agent-teams-ai/agent-runtime/blob/f990acc26e1b8071ae22d0b87a2ddd3672be8e2e/docs/decisions/0091-interactive-agent-session-synthetic-vertical-slice.md
[AR91-current]: https://github.com/agent-teams-ai/agent-runtime/blob/main/docs/decisions/0091-interactive-agent-session-synthetic-vertical-slice.md
[ARM]: https://github.com/agent-teams-ai/agent-runtime/blob/f990acc26e1b8071ae22d0b87a2ddd3672be8e2e/docs/architecture/agent-runtime-modular-research.md
[AR-contract]: https://github.com/agent-teams-ai/agent-runtime/blob/f990acc26e1b8071ae22d0b87a2ddd3672be8e2e/packages/contexts/agent-execution/src/interactive-contracts.ts
[AR-readiness]: https://github.com/agent-teams-ai/agent-runtime/blob/f990acc26e1b8071ae22d0b87a2ddd3672be8e2e/docs/architecture/readiness.md
[B-factory]: https://github.com/agent-teams-ai/agent-runtime/blob/f990acc26e1b8071ae22d0b87a2ddd3672be8e2e/experiments/interactive-provider-contract/src/claude/index.ts
[B-contract]: https://github.com/agent-teams-ai/agent-runtime/blob/f990acc26e1b8071ae22d0b87a2ddd3672be8e2e/experiments/interactive-provider-contract/src/draft-contracts/index.ts
[AR-driver]: https://github.com/agent-teams-ai/agent-runtime/blob/f990acc26e1b8071ae22d0b87a2ddd3672be8e2e/packages/contexts/agent-execution/src/features/interactive-agent-session/application/ports/outbound/interactive-provider-driver.ts
[AR-session-owner]: https://github.com/agent-teams-ai/agent-runtime/blob/f990acc26e1b8071ae22d0b87a2ddd3672be8e2e/packages/contexts/agent-execution/src/features/interactive-agent-session/application/use-cases/interactive-session-owner.ts
[AR-seal]: https://github.com/agent-teams-ai/agent-runtime/blob/f990acc26e1b8071ae22d0b87a2ddd3672be8e2e/packages/contexts/agent-execution/src/features/contained-agent-turn/composition/codex-current-kernel-owner.ts
[AR-disposal]: https://github.com/agent-teams-ai/agent-runtime/blob/f990acc26e1b8071ae22d0b87a2ddd3672be8e2e/packages/apps/embedded-runtime/src/composition/agent-runtime-host-disposal.ts
[AR-host]: https://github.com/agent-teams-ai/agent-runtime/blob/f990acc26e1b8071ae22d0b87a2ddd3672be8e2e/packages/apps/embedded-runtime/src/features/interactive-session-runtime/application/use-cases/create-session-host.ts
[AR-package-test]: https://github.com/agent-teams-ai/agent-runtime/blob/f990acc26e1b8071ae22d0b87a2ddd3672be8e2e/packages/contexts/agent-execution/tests/package/interactive-contracts-packed-consumer.test.ts
[EXT1]: https://github.com/agent-teams-ai/old-provider-implementations/pull/1
[external-contract]: https://github.com/agent-teams-ai/old-provider-implementations/blob/7573a50842c3eeacb473f9d97d40f3ddf6ac0cf9/packages/provider-session-contracts/src/features/provider-session-contracts/contracts/session.ts
[O116-current]: https://github.com/agent-teams-ai/agent-teams-orchestrator/blob/main/docs/decisions/0116-native-temporal-for-fully-local-durable-workflows.md
[BS]: https://backstage.io/docs/backend-system/architecture/extension-points/
[Backstage-module]: https://github.com/backstage/backstage/blob/3978b972588f333882991d98a52a5d855f6afa05/plugins/catalog-backend-module-github/src/module/githubCatalogModule.ts
[VS]: https://github.com/microsoft/vscode/blob/29ad5e7ec8d963aa67226f58a4472697b21d6f35/src/vscode-dts/vscode.d.ts
[VSP]: https://code.visualstudio.com/api/advanced-topics/using-proposed-api
[VS-security]: https://code.visualstudio.com/docs/configure/extensions/extension-runtime-security
[GP]: https://github.com/hashicorp/go-plugin/blob/155dcddc94873a285e14b7fa24b2f6ab6139668e/client.go
[GPS]: https://github.com/hashicorp/go-plugin/blob/155dcddc94873a285e14b7fa24b2f6ab6139668e/server.go
[VAULT]: https://developer.hashicorp.com/vault/docs/plugins/plugin-architecture
[NGINX]: https://nginx.org/en/docs/control.html
[NGINX-timer]: https://github.com/nginx/nginx/blob/release-1.28.0/src/core/ngx_cycle.c
[ENVOY]: https://www.envoyproxy.io/docs/envoy/v1.36.0/intro/arch_overview/operations/hot_restart
[Envoy-drain]: https://www.envoyproxy.io/docs/envoy/v1.36.0/intro/arch_overview/operations/draining
[SYSTEMD]: https://github.com/systemd/systemd/blob/v258/man/systemd.service.xml
[SYSTEMD-issue]: https://github.com/systemd/systemd/issues/37515
[SYSTEMD-fix]: https://github.com/systemd/systemd/pull/39376
[K8S]: https://github.com/kubernetes/website/blob/release-1.36/content/en/docs/concepts/workloads/controllers/deployment.md
[K8SP]: https://github.com/kubernetes/website/blob/release-1.36/content/en/docs/concepts/workloads/pods/pod-lifecycle.md
[OTP]: https://github.com/erlang/otp/blob/OTP-29.1.2/lib/kernel/src/code.erl
