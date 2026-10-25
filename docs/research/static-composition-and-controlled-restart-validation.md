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

**Checkpoint:** execution is in progress. Results below are observations already
reported by the owning researchers; the final consolidated archive and review
will be linked after completion. Pending rows are not passes.

| Track | Observed checkpoint | Claim boundary |
| --- | --- | --- |
| Public GM static composition and recovery | Unchanged semantic/recovery suite: 60 assertions pass; added positive scenarios: 6 pass | Registry Core/Assembly 0.7.0, resources 0.2.1, conformance 0.5.0, TS 7.0.2; external consumer evidence does not repin Orchestrator adoption. |
| Admission while stopping | **Both required rejection assertions fail** in unchanged recovery fixture | New identity is accepted after revoke/effect exit while stop awaits a held launch acknowledgement. This blocks calling that fixture a complete controlled-restart implementation. |
| Repeated static execution | 12 fresh one-shot A/B executions and 24 recovery-worker cycles, exact known PIDs absent after exit | Parent file-descriptor observations are bounded; complete descendant inventory and memory/reference bounds are not qualified. |
| Real PostgreSQL | Existing feature tests 2/2 pass; new crash/authority checks 5 pass | SIGKILL of actual postmaster, same data root/system identity, independent readback, committed fact/outbox survival and uncommitted absence. Process crash is not power-loss proof. |
| PostgreSQL restore tooling | **Unavailable in selected research binary payload** | `pg_dump`, `pg_restore` and `pg_controldata` are absent. Backup/restore is not passed and must be qualified for the selected production distribution. |
| Full native Temporal baseline | Original PR90 native baseline: 11 assertion scenarios pass | Real Service 1.32.1, SDK 1.24.0, PostgreSQL 18.4, Linux x64. Not an installer or all-OS production qualification. |
| Added Temporal rollout adapter | Pending | Test-owned SQL receiver and one-shot real GM construction seam; no long-lived product Host guarantee. |
| Node/browser and N100/N500/N1000 recipe | Pending | Real browser execution and compiler/runtime measurements; installed descriptors are not concurrent active plugins. |

The actual admission counterexample must remain visible even when other tests
pass. A future product implementation needs an atomic admission seal before
shutdown progresses, durable handling of work accepted before that seal, and
reconciliation of ambiguous completion. A failing fixture does not by itself
prove a defect in GM's neutral composition library.

## Before production implementation

Choose the first actual product extension family and its restart/availability
contract. Reuse one existing execution custodian and one authoritative operation
record. Prove seal-before-stop, accepted-work disposition, duplicate/late result
handling, failed candidate cleanup, and unknown physical exit. Qualify exact
native bundles, backup/restore and signed Desktop delivery on target operating
systems. Packaging, hostile plugins, power-loss durability, schema rollback,
long-lived streams and aggregate production capacity are not established by
this campaign.

Source snapshots are immutable evidence links; operational entry points should
link to maintained latest documentation. The rule to keep onboarding current
does not change accepted version pins or erase reproducibility.

[O114]: https://github.com/agent-teams-ai/agent-teams-orchestrator/blob/aaabc1e7cd2e2482668530e4412e61c2bca1f515/docs/decisions/0114-canonical-backend-stack-and-distributed-role-adoption.md
[O115]: https://github.com/agent-teams-ai/agent-teams-orchestrator/blob/aaabc1e7cd2e2482668530e4412e61c2bca1f515/docs/decisions/0115-canonical-fully-local-v1-adoption.md
[O116]: https://github.com/agent-teams-ai/agent-teams-orchestrator/blob/0af892165a023a274302f89b47ba514ab2915e59/docs/decisions/0116-native-temporal-for-fully-local-durable-workflows.md
[BACKEND]: https://github.com/agent-teams-ai/.github/blob/4dcf4ffe29279e479e089bc06f745dd1a62f12d1/docs/backend-stack.md
