---
id: research.static-restart-validation
type: research
status: active
owner: architecture
summary: Owner-confirmed static restart direction, current storage authority and bounded executable validation before production implementation.
---

# Static Composition and Controlled Restart Validation

<!-- cspell:words controldata -->

Evidence cut: **2026-10-25**. The owner explicitly confirmed the baseline below.
This research record preserves that instruction and executable evidence; it does
not publish a package, accept a production Host, merge a product decision branch,
or change an immutable accepted ADR. Qualification results remain scoped to
exact inputs and scenarios.

## Confirmed direction

1. **Static composition with controlled restart is the baseline.** Choose
   implementations at a product-owned composition root, prepare an immutable
   Get Modular graph, and construct a fresh graph for the next execution owner.
   Preserve the old instance and its accepted-work obligations until its owner
   proves their disposition. A controlled restart can involve downtime; this
   baseline does not promise overlapping generations or transparent replacement
   of arbitrary retained references.
2. **Temporal may adapt the same product-authorized operation.** Use it where
   qualified infrastructure and durable coordination justify it. Ordinary calls
   remain independent of rollout scheduling. Temporal retries do not replace
   receiver-side command identity, epoch fencing, transactions or physical
   execution custody. Optional plugin rollout scheduling is distinct from an
   accepted product choice of Temporal for application workflows.
3. **Keep existing responsibility boundaries.** GM owns declarations and
   composition; its lifecycle kernel remains a private candidate. EF owns
   neutral extension/trust/protocol evidence and conformance. Products own
   extension points, effective grants, admission, canonical state and recovery;
   the existing execution owner controls processes. No second Host, mutable
   authority store, scheduler or kernel is introduced by these experiments.
4. **Qualify before large implementation.** Preserve successful tests and
   counterexamples. Use mature engines behind narrow adapters, and evaluate
   another implementation language only for a named reliability, systems or
   performance benefit. Scores and code estimates are planning judgments, not
   measured uptime or a substitute for production evidence.

This narrows [OD-003](../open-decisions/OD-003-module-runtime-and-public-spi-choices.md).
Public SPI, production Host profiles, state migration, exact package admission
and any stronger availability guarantee remain separate choices.

## Current storage and workflow authority

| Question | Verified current authority | Consequence |
| --- | --- | --- |
| Local and hosted canonical backend | Orchestrator main `aaabc1e7cd2e2482668530e4412e61c2bca1f515`, accepted [ADR-0114][O114] | Native PostgreSQL applies to both; earlier SQLite conclusions are superseded. ADR-0114 adopts the central backend reference at exact `4dcf4ffe29279e479e089bc06f745dd1a62f12d1`. |
| Fully Local Desktop | Accepted [ADR-0115][O115] on the same main | Required V1 profile; shared domain/application, PostgreSQL schemas and migrations; native bundled engine through the Local Supervisor adapter. |
| Launcher and database clients | [Adopted backend reference][BACKEND] and ADR-0114/0115 | `embedded-postgres` is the selected launcher approach; node-postgres/Drizzle remain context-owned adapters. Research package `18.4.0-beta.17` is not an approved production distribution pin. Exact artifact, engine, helper, signing, upgrade and OS qualifications remain open. |
| Earlier ADR-0048/0049 | ADR-0114 explicitly replaces the local SQLite engine premise within its stated scope | Preserve single authority, logical transfer and exact-value rules. Do not rewrite the historical accepted documents. |
| Fully Local workflow engine | Owner-accepted [ADR-0116][O116] at PR90 head `0af892165a023a274302f89b47ba514ab2915e59` | Full native Temporal Service plus PostgreSQL is the selected branch direction; OD-035 is closed there. **PR90 remains unmerged**, so this is not a claim about merged main. |
| Plugin rollout scheduling | Owner instruction, 2026-10-25 | Optional Temporal adapter to the same operation; this does not reopen the product's application workflow choice. |

The previous 2026-10-22 research compared an older Orchestrator branch with a
newer central reference. Its claim that local PostgreSQL still awaited an
adoption decision was stale relative to ADR-0114/0115. The earlier source pins
and experiment history remain evidence; current guidance follows the authority
above. OpenWorkflow observations remain useful comparative history, not the
current selected Fully Local engine. Do not repeat a historical PR90 merge
blocker as a current fact without rechecking its live checks and policy.

## Executable campaign and evidence status

The common brief gives every researcher the owner's full modularity vision and
existing ownership constraints. GPT-6.1 Sol xhigh researchers work on separate
static/restart, PostgreSQL and Temporal paths, cross-review one another's plans,
and retain source identities, logs, failed attempts and reproduction commands.
Independent review follows execution. Root additionally checks Node/browser
parity and the current graph-growth recipe.

### Executed results

The completed campaign used three GPT-6.1 Sol xhigh investigators and three
independent GPT-6.1 Sol xhigh critics in bounded parallel waves, with plan
cross-review and a shared owner brief. Root executed Node/browser parity and the
current graph-growth recipe. Counts below describe different assertion scopes
and must not be added into one fabricated reliability percentage.

| Track | Executed result | Claim boundary |
| --- | --- | --- |
| Public GM static composition and recovery | Unchanged semantic/recovery suite: **60 passed**; added positives: **6 passed** | Registry Core/Assembly 0.7.0, resources 0.2.1, conformance 0.5.0. This external consumer does not repin Orchestrator's accepted 0.5.0 design baseline. |
| Admission while stopping | **0 passed, 2 failed**; independent minimal reproduction **0 passed, 1 failed** | New identity is accepted after revoke/effect exit while stop awaits a held launch acknowledgement. This blocks promoting the recovery fixture unchanged. |
| Repeated static execution | **12** fresh one-shot A/B processes; **24** explicitly requested recovery-worker cycles | Exact known old PIDs are absent after exit. Parent FD counts plateau; complete descendant inventory, RSS and reference bounds are unqualified. The 24-cycle case has no dispatched work and keeps its Supervisor alive. |
| Accepted work across restart | Natural completion and effect-child exit precede old worker exit; new worker then becomes ready | Readback/duplicate submission does not launch a second effect. This is one bounded real-child scenario, not all product operations. |
| Real PostgreSQL | Existing feature tests **2/2 passed**; new crash/authority checks **5 passed** | Actual postmaster SIGKILL, same data root/system identity, independent readback, committed fact/outbox survival and staged uncommitted absence. Process crash is not power loss. |
| PostgreSQL restore tooling | **Unavailable** | Selected research payload lacks `pg_dump`, `pg_restore` and `pg_controldata`. Restore is not passed; qualify helpers and a real backup/restore cycle for the production distribution. |
| Full native Temporal baseline | **11 assertion scenarios passed**, plus a separately labeled resource observation | Real Service 1.32.1, SDK 1.24.0 and PostgreSQL 18.4 on Linux x64. No installer or all-OS production claim. |
| Optional Temporal adapter | **7 scenario groups passed**; independent physical-receipt oracle checked **10 finite GM compositions** | Real Workflow/Activity, PostgreSQL and existing one-shot GM child. This is a finite preflight seam and canonical receiver mutation, not long-lived Host replacement. |
| Ordinary invocation without Temporal | Actual GM calls passed with Workers absent and separately with service port refusing connections | Optional rollout scheduling stays outside these ordinary calls. |
| Node/browser parity | **5 grouped checks passed** in Node 26.11.1 and actual Chrome 156.0.8078.47 through Playwright 1.62.1 | Same strict-compiled public API program, native browser imports, equal outputs/digests/diagnostics; exact missing/ambiguous/duplicate diagnostics and four factory calls asserted. Static composition only. |
| Current graph-growth recipe | **N100, N500 and N1000 each passed all 8 stages**, sequentially under unchanged caps | New descriptor-union recipe already had upstream 2026-10-23 evidence. This is fresh released-package repetition, not a new compiler fix or active-plugin capacity proof. |

Strict TypeScript 7.0.2 own-source checks passed throughout. Static, PostgreSQL
and browser/growth tracks used `skipLibCheck: false`; Temporal used its owning
research profile's explicit `true`. Do not turn the latter into a declaration
compatibility claim. Exact locks, compiled/source identities and environmental
failures are retained.

### The admission counterexample

The test holds a real launch acknowledgement, begins stopping, observes
revocation and physical effect-child exit, then submits a different operation.
Both existing recovery profiles return `created: true` while shutdown is still
in flight. The record survives restart: `record-only` leaves it pending, while
`restart-pending` gives it a fresh claim/child and reaches success. Therefore the
finding is **missing admission sealing**, not demonstrated data loss or a defect
in the neutral GM composition library.

The desired rejection assertions remain red. An independent critic reproduced
one unchanged case and checked source/output identities. A future product
implementation must seal actual ingress before stopping and preserve accepted
work disposition. A future regression test also needs the rejected candidate's
absence/no-reservation oracle: the historical witness deliberately follows the
improperly accepted record and cannot become a green regression merely by
rerunning it after a correct seal.

### What Temporal did and did not prove

Killing the real Worker after the receiver's actual COMMIT produced two Activity
deliveries and one canonical receipt/effect. Killing the actual Temporal Service
and Worker recovered the same durable timer/history and one receiver mutation.
Direct and Temporal adapters called the same test-owned SQL receiver.

The delayed Activity was actually suspended; SQL epoch advanced from 1 to 2,
then the Activity resumed. Its stale mutation produced **zero canonical
receipts/effects**, but it still executed **one repeatable finite GM preflight
construction** before the receiver checked the epoch. This is an explicit limit:
SQL fencing does not fence arbitrary candidate code or physical effects that
occur before it. Production activation/effects need their own existing
admission, custody and receiver authority. Engine cancellation and process death
are not plugin-drain evidence.

The adapter harness's polls/retries are bounded, but not every
`Workflow.result()` has an enclosing wall-clock deadline. Its observed runs
completed and cleaned up. Future CI needs an enclosing process-group/job limit
with cleanup-debt reporting; no universal scenario timeout is claimed here.
Product outbox/reconciliation, actual Host preflight/start/stop failures and
long-lived accepted-work replacement remain unqualified.

### Large graph observations

| Modules in selected recipe | Generated source files | Full-smoke attempts | Factory calls | Dependency-port reads | Aggregate observed seconds |
| ---: | ---: | ---: | ---: | ---: | ---: |
| 100 | 703 | 201 | 10,200 | 19,803 | 31.03 |
| 500 | 3,503 | 1,001 | 251,000 | 499,003 | 70.81 |
| 1,000 | 7,003 | 2,001 | 1,002,000 | 1,998,003 | 277.57 |

Each size ran cold compilation, full runtime/smoke, unchanged incremental,
leaf edit, leaf verification, baseline rewarm, shared-contract edit and shared
verification. Original caps remained compiler 180 seconds, runtime 120 seconds,
aggregate 600 seconds. At N1000 cold compilation took 71.34 seconds; full runtime
34.22 seconds. These are single observations under this environment, not SLOs
or comparative benchmarks. Failure and abort are injected at every module in
the full smoke; generated descriptors do not allocate 1,000 persistent Workers.

The unchanged driver is from GM `b70ba393`; its four package manifests/dist
inputs were replaced in a disposable worktree with exact frozen public registry
bytes. This qualifies those published inputs under the current recipe, not a
source build of the same commit. The driver lock/HEAD and the external package
lock have distinct meanings. Source scanner coverage was explicitly incomplete,
RSS was not collected, and no production churn/isolation limit follows.

### Independent critic dispositions

| Finding | Disposition |
| --- | --- |
| Stop accepts a new command while stopping | Confirmed independently; blocks unchanged fixture promotion; retain both red cases and their recovery outcomes. |
| Historical red witness assumes the improperly accepted record exists | Preserve it as evidence; a future fixed receiver requires a rejection/absence oracle, without deleting the required rejection assertion. |
| Epoch comparison occurs after candidate preflight | Narrow claim to rejection of stale canonical SQL mutation; keep observed stale construction visible. |
| One-shot construction is not long-lived cutover | No combined production Host/rollout qualification claimed. Existing custody and product-operation integration remain required. |
| Strict own source versus dependency declarations | Preserve each track's actual compiler flags. |
| Browser compared diagnostics without asserting expected values | Strengthened the oracle, retained the compile-error/stale-output attempt, then passed strict compilation and targeted actual-browser replay. |
| Browser initially reused runtime/shared package links | Added an independent exact frozen installation and retained both input sets, package/native executable hashes and actual Chrome archive identity. |
| Exact-head hosted CI attribution needed its query envelope | Critic fetched the full run response binding run 40009973655 to PR90 head 0af8921; preserve it with the nine-job response. |

## Implementation boundary and planning estimates

**Recommendation:** implement the first concrete product restart operation
against existing product persistence and execution custody. Keep reusable
scheduling/command code narrow. No new repository or general asynchronous
runtime is justified by this campaign. GM remains the composition owner; EF
remains the neutral research/protocol/conformance owner; Orchestrator owns its
actual integration. Static restart does not require publishing the private
lifecycle kernel. A later independently useful residual package can be extracted
under existing admission rules when its real boundary is demonstrated.

Scores are engineering judgment out of 10: confidence reflects evidence/fit;
reliability means achievable behavior within the stated scope after prerequisites;
complexity increases with implementation/operational burden. They are not uptime
statistics. LOC ranges are approximately x2 planning bounds; columns are disjoint
new handwritten source and exclude existing engines, custody, domain changes,
installers, signing, migrations and full deployment operations.

| Option | Confidence | Reliability | Complexity | Shared/runtime LOC | Product integration LOC | Tests/fixtures LOC |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Direct controlled whole-process restart, downtime permitted, existing operation/persistence/custody | 8 | 9 | 4 | 0 | 150–500 | 600–1,400 |
| Optional Temporal adapter above that qualified operation and already admitted engine | 8 | 9 | 5 | 80–220 | 70–230 | 500–1,100 |
| Additional neutral driver package immediately, before a demonstrated shared boundary | 4 | 7 | 6 | 100–300 | 100–250 per consumer | 500–1,000 |
| Transparent overlapping generations and stateful hot replacement | 3 | 7 | 8 | Not estimated | 800–2,000 | 1,500–3,500 |

The second row is incremental to a real qualified operation. The third is
premature; the fourth is an unexecuted alternative outside the confirmed
baseline and omits unresolved runtime/state-migration cost. These are not
additive estimates for an entire plugin platform. Researcher's smaller adapter
allowances and critic's broader integration ranges remain in their raw reports
with different scope; this table uses the broader explicit integration scope.
Actual new production implementation in this campaign is **zero lines**.

## Remaining qualification gates

Choose the first actual product extension family and its restart/availability
contract. Reuse one existing execution custodian and one authoritative operation
record. Prove seal-before-stop, accepted-work disposition, duplicate/late result
handling, failed candidate cleanup, and unknown physical exit. Qualify exact
native bundles, backup/restore and signed Desktop delivery on target operating
systems. Packaging, hostile plugins, power-loss durability, schema rollback,
long-lived streams and aggregate production capacity are not established by
this campaign.

## Evidence delivery and reproduction

The [source, reports and evidence archive](evidence/static-restart-validation-20261025.tar.gz)
contains the common owner brief, investigator/critic reports, strict TS sources,
frozen locks, unchanged reused fixtures/drivers, full growth stage reports,
raw positive and negative logs, source/package/binary identities and reproduction
instructions. It excludes installed dependencies, native executables, database
roots and bulk output reproducible from retained source. A per-file SHA-256 manifest
binds every included payload. Archive: **416 files**, **805,541 bytes**,
SHA-256 `e16e9cdb74bed1e83ec863b19beea8dd7bfe55567d42b36b35ea58ffd1c6de68`.

Start with `README.md` inside the archive, then `reports/` and the owning
experiment's reproduction guide. Failed and unavailable rows remain visible;
the static experiment's complete check is intentionally red until the separately
owned receiver issue is addressed. No gate was relaxed or dependency source
patched. Historical source snapshots and prior archives remain unchanged.

Source snapshots are immutable evidence links; operational entry points should
link to maintained latest documentation. The rule to keep onboarding current
does not change accepted version pins or erase reproducibility.

[O114]: https://github.com/agent-teams-ai/agent-teams-orchestrator/blob/aaabc1e7cd2e2482668530e4412e61c2bca1f515/docs/decisions/0114-canonical-backend-stack-and-distributed-role-adoption.md
[O115]: https://github.com/agent-teams-ai/agent-teams-orchestrator/blob/aaabc1e7cd2e2482668530e4412e61c2bca1f515/docs/decisions/0115-canonical-fully-local-v1-adoption.md
[O116]: https://github.com/agent-teams-ai/agent-teams-orchestrator/blob/0af892165a023a274302f89b47ba514ab2915e59/docs/decisions/0116-native-temporal-for-fully-local-durable-workflows.md
[BACKEND]: https://github.com/agent-teams-ai/.github/blob/4dcf4ffe29279e479e089bc06f745dd1a62f12d1/docs/backend-stack.md
