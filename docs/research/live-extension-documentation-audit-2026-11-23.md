---
id: research.live-extension-documentation-audit
type: research
status: active
owner: architecture
summary: Tracks documentation custody, decision coverage, plan readiness and independent review for live modules and plugins.
---

# Live Extension Documentation Audit 2026-11-23

<!-- cspell:words Piral OpenComponents Zephyr CUST SLOC Comlink Yjs ASAR Wasmtime SQLSTATE -->

## Scope and authority

The owner requests a repeated audit of the already pushed module, plugin and
live-update work: preserve missing conclusions, make the current direction easy
to find outside the research chronology, classify the integration candidates,
assess documentation readiness and compare complete scenarios with ready stacks.

Baseline: `7611e1a44542204d77e489a166f92a2e31b0020a`, Draft PR 55, research branch
`docs/plugin-research-hot-reload-20261021`. The date uses Europe/Kiev. This is a
documentation and source-research task, with **zero planned production lines**
and **zero new plugin runtime experiments**. Existing qualification keeps its
recorded source, runtime profile and limitations.

The owning [OD-003](../open-decisions/OD-003-module-runtime-and-public-spi-choices.md)
already records the TypeScript-first standalone library and its complete update
operation. Its seven disputed choices remain OPEN. Accepted ADRs, exact adopted
pins and frozen evidence are not rewritten by this audit. The
[current system map](../architecture/live-extension-system-map.md) explains
authority and implementation without becoming a new decision.

## Audit plan and checkpoints

| Pass | Work and reviewable output | Checkpoint status |
| --- | --- | --- |
| 1. Inventory and authority | Baseline entry points, accepted constraints and owner direction; 15 architecture/planning findings | Complete; original report and source inventory preserved |
| 2. Custody and semantics | Compare available working reports to actual tracked/archive text; disposition unmatched reports and original failures | Complete; six original files rescued and archive bytes independently verified |
| 3. Synthesis and challenge | Current map, format/profile register, readiness rubric and fair ready-stack comparison | Complete; second and third independent reviews retained, material corrections rechecked |
| 4. Delivery audit | Re-read changed documents against findings; validate navigation, final source and remote bytes | Content/navigation review complete; exact final-source gate and remote receipts recorded through PR 55 |

Three independent lanes cover authority/readiness, evidence custody and
ready-stack capabilities. The main review reconciles them and checks the
consolidation again. The [findings ledger](evidence/live-extension-documentation-audit-20261123.json)
maps every A01–A15 and CUST-001–007 finding to a correction, retained boundary or
explicitly open specification item. A documented open contract is not counted as
implemented or decided.

The initial planning estimate was 700–1,100 added or clarified prose lines,
complexity **5/10** and confidence **8/10** in the documentation structure.
Evidence inventories are separate; these judgments do not measure product
readiness. Each useful commit is immediately pushed. No new native campaign is
needed to qualify this documentation-only change.

## Evidence and lessons

### Finite corpus and what was actually checked

At `7611e1a`, the initial repository inventory contains 31 research Markdown files
with 11,579 lines, four architecture documents, 16 decision-directory files
including its index, and 39 qualification Markdown files. The authority review
records 46 source-file observations with hashes and reading scope. The current
organization Engineering Quality Standard was also read; accepted pins and
existing quality gates were not changed.

| Custody dimension | Observed count or result |
| --- | ---: |
| Tracked research/evidence files plus OD-003 in the pinned custody scope | 163 |
| Readable archive containers, including one reconstructed split archive | 52 |
| Regular archive members / Markdown members | 3,781 / 536 |
| Embedded multiline JSON strings indexed | 316 |
| Available local candidate text/evidence files | 1,320 |
| Local files matching actual persisted bytes | 1,035 |
| Local Markdown files / distinct contents | 304 / 133 |
| Local Markdown files with exact persisted text / distinct matched contents | 285 / 114 |
| Unmatched Markdown files individually reviewed and classified | 19 |
| Outer manifests / declared members reconciled | 29 / 2,095 |
| Archive read errors or manifest/member mismatches | 0 |

These counts include repeated handoff copies. They are not unique finding or test
counts. Manifest checks cover the inspected outer schema; exact hashes establish
custody, not semantic correctness. Semantic review compared the unmatched reports,
current conclusions, authority conflicts and selected detailed source findings.
It does not claim line-by-line semantic review of every archived dependency file.

Five current November 22–23 working-report roots were available. Older scratch
roots from November 17–21 were unavailable; their actual retained reports and
failure records were inspected inside tracked packets. This audit cannot prove
that no inaccessible file or unrecorded conversation exists elsewhere.

### What was missing or misleading, and its disposition

| IDs | Finding | Current disposition |
| --- | --- | --- |
| A01 | Current summaries omitted the planned full-operation library owner | Corrected in the system map, docs index and research reference; product authority remains distinct |
| A02 | Several active historical studies still presented small-adapter or repository alternatives as current | Five dated successor notes route direct readers to the confirmed standalone/full-operation direction; original evidence stays intact |
| A03 | An older OD-003 subsection still called the separate repository an open choice | Partial-resolution note cites the November 22 owner confirmation; exact contracts/profiles remain open |
| A04 | No selected actual first library consumer, feature and independent integration | Explicit first-delivery prerequisite; no consumer is silently chosen |
| A05 | Seven owner alternatives could be mistaken for defaults or the entire backlog | All seven remain OPEN; further API, profile and release work is listed separately |
| A06 | Runtime, format, loading and shell roles lacked one current register | Register added; research/execution/adoption status and optional integration seams are separate; full production capability contracts remain open |
| A07 | The complete operation lacks one selected implementable transition/recovery contract | Responsibilities and narrow primitives are mapped; exact first-profile API/outcomes remain specification work |
| A08 | Smallest safe update unit cannot be inferred from a changed file | Dependency, captured-reference, realm and state boundaries retained under Q2; Get Modular remains graph owner |
| A09 | State continuity and returning to old code need a selected contract | State classes and owners mapped; Q3/Q6 remain OPEN, including mixed-version writers and external effects |
| A10 | Old-version/client retention and adoption promises are not selected | Holds, budgets and observations are explicit; Q4/Q7 remain OPEN |
| A11 | Reuse availability and toolchain compatibility are production prerequisites | Private lifecycle access, Extism declarations, runtime publication and compiler cohorts stay visible; no deep imports or pin overrides |
| A12 | Bounded probes do not constitute packaged-library consumer acceptance | First actual and independent integrations remain required; no whole-library E2E claimed |
| A13 | Ordinary library, stable Get Modular, package, public SPI and production host gates differ | Five gates mapped; each applies only to its own claim |
| A14 | Feature, core, adapter, package and plugin roles were not compactly explained | Glossary and module/plugin/generation/live-update relationship added |
| A15 | A passing structural check does not prevent stale conclusions | Maintenance rule links the current map, owning decision, contract and dated evidence |
| CUST-001 | Three complete value/competition reports and three source/registry receipts lacked full-text custody | All six original files added byte-for-byte to the new checkpoint archive |
| CUST-002–004 | Historical availability, archive integrity and original failures needed bounded claims | Scope limits recorded; 52 archives checked; original failures remain separate from corrections |
| CUST-005 | Rich archived findings were hard to discover | Exact archive/member navigation below, including all six deepening/MF lanes |
| CUST-006 | Sixteen other unmatched Markdown files might look lost | Individually classified as superseded drafts, snapshots, plans or already represented outcomes; no further unique conclusion found in reviewed differences |
| CUST-007 | Earlier Theia/Extism/wasmCloud gaps might be reopened unnecessarily | Already repaired at baseline; full original reports now strengthen custody |

The recovered reports include full comparison rationale, consumer scenarios,
counterexamples and the accounting behind code estimates. Intermediate scores in
those reports remain unadopted reviewer judgments; preservation does not replace
the maintained assessment or choose an OPEN policy.

### Exact routes to detailed findings

All archive paths below are under `docs/research/evidence/`. A member path names
actual preserved text, not just a hash. The full custody inventory records other
members and inline JSON text destinations.

| Topic | Archive and exact member examples | Maintained synthesis |
| --- | --- | --- |
| Portable application/browser/runtime mechanisms | `portable-live-plugins-20261117.tar.gz`: `portable-live-plugins-20261117/application-mechanisms/report.md`, `portable-live-plugins-20261117/browser-mechanisms/report.md`, `portable-live-plugins-20261117/runtime-mechanisms/runtime-mechanisms-report.en.md` | [Portable mechanisms](portable-live-plugin-mechanisms-and-library-design-2026-11-17.md) |
| Mature/durable runtimes and architecture | `live-plugin-final-study-20261117.tar.gz`: `durable-rollout/report.md`, `mature-runtimes/report.md`, `emerging-runtimes/report.md`, `portable-boundary/report.md` | [Final architecture study](live-plugin-evolution-final-research-and-architecture-2026-11-17.md) |
| Live frontend/backend and persistent plugins | `live-application-evolution-20261118.tar.gz`: `backend-spike/report.md`, `frontend-spike/report.md`, `persistent-industry/report.md` | [Live application study](live-application-evolution-vision-and-executed-spikes-2026-11-18.md) |
| Update policies and TS/Rust components | Reconstructed split `plugin-update-runtimes-20261121.tar.gz`: `backend-policy/report.md`, `frontend/report.md`, `wasm/report.md` | [Policies and portable runtimes](live-update-policies-and-portable-runtimes-2026-11-21.md) |
| Extism, existing resources and 24 reuse warnings | `plugin-reload-reuse-20261122.tar.gz`: `audit/REPORT.md`, `extism/report.md`, `industry/industry-report.md` | [Reuse-first study](reuse-first-live-plugin-updates-2026-11-22.md) |
| Full operation, versions and user feedback | `standalone-live-library-architecture-20261122.tar.gz`: `boundaries/REPORT.md`; `standalone-live-library-native-20261122.tar.gz`: `versions/REPORT.md`, `feedback/REPORT.md` | [Standalone blueprint](standalone-live-plugin-library-blueprint-2026-11-22.md) |
| Publication and reconciliation | `standalone-live-library-deepening-20261122.tar.gz`: `research/deepening/control/REPORT.md` | [Reliability study](live-update-reliability-and-industry-evidence-2026-11-22.md) |
| Execution: 18 structured findings | Same deepening archive: `research/deepening/execution/REPORT.md`, `research/deepening/execution/findings.json` | Reliability study: native ownership, stop evidence, admitted work |
| State: 13 structured findings | Same deepening archive: `research/deepening/state/REPORT.md`, `research/deepening/state/findings.json` | Reliability study: receiver fencing, mixed versions, canonical data and retention |
| Experience: 11 structured findings | Same deepening archive: `research/deepening/experience/REPORT.md`, `research/deepening/experience/findings.json` | Reliability study: dirty editor, source-generation races, semantic Undo |
| Desktop: 14 structured findings | `module-federation-research-supplement-20261122.tar.gz`: `desktop/REPORT.md`, `desktop/findings.json`, `desktop/CAPABILITY-UPDATE-SCOPE.md` | [Federation/update boundaries](module-federation-update-boundaries-and-architecture-options-2026-11-22.md) |
| Federation: 13 structured findings | Same MF supplement: `federation/REPORT.md`, `federation/findings.json` | Federation study: registration, evaluation, shared scope and retained references |
| Delivery: 15 structured findings | Same MF supplement: `delivery/REPORT.md`, `delivery/findings.json` | Federation study: release routing, per-client adoption and old assets |
| Seven OPEN owner alternatives | Same MF supplement: `architecture-review/OWNER-QUESTIONS.md`, `architecture-review/REVIEW-DISPOSITIONS.md` | [OD-003](../open-decisions/OD-003-module-runtime-and-public-spi-choices.md) and [decision matrix](module-federation-update-boundaries-and-architecture-options-2026-11-22.md#owner-decision-matrix) |
| Value, competition and sizing originals | `live-extension-audit-checkpoint2-20261123.tar.gz`: `retained-value-review/competition-js.md`, `retained-value-review/competition-runtime.md`, `retained-value-review/sizing-and-critique.md` and their three source receipts | [Value assessment](live-update-value-competition-and-implementation-size-2026-11-22.md) |
| Current audit and strong ready stacks | Same audit archive: `audit/authority-review.md`, `audit/custody-review.md`, `audit/stack-review.md`, corresponding inventories and source ledgers | This audit, current map and [ready-stack comparison](live-update-ready-stack-comparison-2026-11-23.md) |

These preserved details include Argo success without measurements, OpenFeature
observer versus activation authority, Comlink release versus physical stop,
PostgreSQL visibility and writer fencing, semantic Undo, Electron IPC effects,
ASAR boundaries, shared singleton selection and per-tab adoption. They remain
source-scoped findings or bounded evidence, not newly adopted guarantees.

### Original failures and correction history

The custody review located explanatory text for the November 18 invalid identity
fixture; both November 21 Wasm hosted failures; the November 22 browser repair,
editor placeholder-oracle and PostgreSQL SQLSTATE-oracle failures; the MF local
setup block and first hosted artifact-upload failure; and the earlier local
Docs 6/8 failure. Their exact paths and interpretation are in
`audit/custody-review.md`, section "Negative experiments and corrections were
preserved", and its machine-readable inventory.

Unreached scenarios remain unreached. The first hosted MF run logged four passing
native tests but failed artifact delivery; the later complete run does not add
four distinct cases. Detailed native receipts were unavailable from the first run.
A later hosted Docs pass does not establish the unknown cause of the local
failure. No original packet or failed attempt was overwritten.

### New evidence packet and independent rechecks

The [checkpoint archive](evidence/live-extension-audit-checkpoint2-20261123.tar.gz)
and [manifest](evidence/live-extension-audit-checkpoint2-20261123.manifest.json)
contain 14 regular members, **371,754 bytes**, SHA-256
`09f1e923dd7d9ad84d10bcf116958b0100df42cd8e0f8e3a54e7c634b1174140`.
Thirteen input files match their working originals exactly; the remaining member
is the new scope README. The independent second custody pass checked every
member, byte count, digest, manifest entry and absence of unsafe/duplicate paths.

The authority second pass corrected three details before accepting the map:
the current handoff is the **532-file deepening base plus a separate 167-file
supplement**, durable recovery facts depend on the selected recovery profile,
and TS/Rust through jco/generated JS does not imply native Wasmtime execution.
The role glossary and two additional historical successor notes then closed its
small remaining navigation gaps. The third passes also checked the separate
Get Modular stability gate, dated two residual historical recommendations,
corrected Piral event/cleanup wording and made the bad-candidate oracle depend
on the declared predecessor-preservation profile.

The [final review archive](evidence/live-extension-audit-reviews-20261123.tar.gz)
and [manifest](evidence/live-extension-audit-reviews-20261123.manifest.json)
preserve all six second/third-pass reports and their input identities, the exact
navigation checks and the root's final delta review. These are separate from the
immutable first-pass packet. Each review identifies the bytes it actually read;
later publication metadata is not silently attributed to an earlier reviewer.

| Final review lane | Result and concrete coverage |
| --- | --- |
| Authority / architecture | PASS on all A01–A15 dispositions; five distinct gates, current direction, readiness arithmetic and seven OPEN choices |
| Custody / source-to-summary | PASS on CUST-001–007; all 41 explicitly named archive/member paths and 30 ledger destinations resolve; original failures retain their scope |
| Ready stacks / comparative claims | PASS after the two Piral/scenario refinements; exact cohorts, existing mechanisms and unexecuted common comparison remain explicit |
| Root reconciliation | Reviews reconciled, publication-only delta separated, historical packets unchanged and no new runtime/adoption claim |

## Open questions and validation

### Readiness rubric

The denominator is the **planning/documentation package for a bounded TS-first
library and its first real delivery**, not all future languages/platforms or
implementation progress. Criteria move through five ordinal levels: absent;
named; alternatives and limits documented; coherent for a named scope; traced
and reviewed with an acceptance plan. Percentages below summarize engineering
judgment as coarse ranges, not a measured completion or reliability probability.

| Axis | Criteria and weights | Baseline | After this consolidation |
| --- | --- | ---: | ---: |
| Vision | Owner outcomes 25%; audience/non-goals 20%; boundaries 20%; user promises 20%; scope priorities 15% | 85–90% | **85–90%** |
| Documentation | Authority traceability 25%; current navigation 20%; bounded evidence 20%; profile/contract completeness 20%; maintenance/dispositions 15% | 65–75% | **Approximately 80–85%** after the recorded review and documentation gate |
| Implementation plan | Named first consumer 20%; necessary policy closure 20%; complete-operation contract 20%; ordered acceptance 20%; reuse/release/bootstrap 20% | 50–60% | **50–60%** |

If one overall number is needed, weights of vision 25%, documentation 35% and
plan 40% produce a post-repair range of 69.25–76.25%, communicated as **roughly
70–75%**. This arithmetic does not make the inputs measurements. Relative gaps
are more credible than a precise percentage. Better navigation raises DOC; it
does not select a policy or complete PLAN.

### Specification still needed

| When | Remaining work | Why it cannot be closed by an editorial rewrite |
| --- | --- | --- |
| Before first complete library slice | Name actual consumer, feature, supported host/trust/state profile, expected useful outcome and independent integration | Existing product/provider decisions are not a substitute for this library's acceptance target |
| Before applicable product promises | Resolve Q1 trust, Q2 update/shared boundary, Q3 state; applicable Q4 adoption, Q5 old work, Q6 rollback, Q7 old-client support | The owner explicitly requested alternatives rather than silent selections |
| After selecting the scope | Specify attempt identity, exact transitions/errors, publication/reconciliation, receiver authority, cleanup debt and capability contracts | Current responsibilities and counterexamples are substantial, but not one implementable contract |
| Before dependency/release adoption | Qualify actually available public primitives, compiler/package cohorts, release bootstrap and compatibility floor | A private kernel, declaration gap or unpublished package cannot be hidden behind a planned adapter |
| Before claiming reusable delivery | Package the complete operation and exercise an actual consumer plus independent conformance/integration | Mechanism probes cannot prove the missing full consumer chain |
| For later optional profiles | Scope Wasm/Extism/native Effect and foreign-format adapters independently | Architectural seams reserve a path, not completed support for every ecosystem |

The [ready-stack comparison](live-update-ready-stack-comparison-2026-11-23.md)
credits existing Piral state/cleanup/MF loading, single-spa async lifecycle,
Zephyr OTA, Native Federation staged rollback and OpenComponents lifecycle.
It defines the same useful editor/state/old-work/cleanup scenario for every
baseline and separates consumer glue from our implementation/adapter costs.
The proposed comparison is **not yet executed on either side**; uniqueness,
relative integration cost and commercial demand remain unproved.

### Documentation structure and maintenance

Use one current route: README and docs index → system map → owning decision or
contract → exact research/evidence. OD-003 remains the owner record; accepted
ADRs keep their authority; research and original failures remain immutable where
already frozen. Update the map's date, status and affected row when an owning
choice or qualified profile changes. Add dated successor notes to active older
studies that a reader could otherwise mistake for current instructions.

Do not copy the complete chronology into the map. Preserve original full reports
and inventories beside their manifest, and maintain a compact finding-to-current-
conclusion ledger. Structural documentation checks must be accompanied by a
semantic review of changed authority/status claims.

### Validation and publication

Checkpoint 1 was committed and immediately pushed as
[`e182dc1`](https://github.com/agent-teams-ai/extension-foundation/commit/e182dc1a3f30f3e86511276a9b327ac476320972).
Its local structural check passed 96 governed documents; Markdown/spelling
checks passed 102 files. This records that checkpoint, not subsequent edits.

The baseline's CI
[45082709665](https://github.com/agent-teams-ai/extension-foundation/actions/runs/45082709665)
completed **5/5 jobs** on `7611e1a`; its separate Docs run passed 4/4 jobs and
8/8 semantic tests. These are historical results, not qualification for this
consolidation.

Checkpoint 2 was committed and immediately pushed as
[`0fd566c`](https://github.com/agent-teams-ai/extension-foundation/commit/0fd566c81878bfd078237a488915e267865f0d40).
Its source/evidence tree was verified against the remote. Final qualification
belongs to the Documentation Protocol workflow on the final source, with exact
run identity, result and branch head in the current delivery block of
[Draft PR 55](https://github.com/agent-teams-ai/extension-foundation/pull/55).
A queued run is not a pass. This avoids qualifying a later commit with an older
receipt or creating an endless commit-after-CI receipt cycle. PR 55 remains
Draft/open; no merge or standalone remote creation is claimed.
