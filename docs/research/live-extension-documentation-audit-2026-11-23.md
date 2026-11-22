---
id: research.live-extension-documentation-audit
type: research
status: active
owner: architecture
summary: Tracks documentation custody, decision coverage, plan readiness and independent review for live modules and plugins.
---

# Live Extension Documentation Audit 2026-11-23

<!-- cspell:words Piral OpenComponents -->

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
pins and frozen evidence are not rewritten by this audit. A current-state map
will explain authority and implementation without becoming a new decision.

## Audit plan and checkpoints

| Pass | Work | Reviewable output | Initial status |
| --- | --- | --- | --- |
| 1. Inventory and authority | Compare entry points, current owner direction, accepted decisions and dated research | Finite source inventory; list of missing or misleading current-state projections | In progress |
| 2. Custody and semantics | Compare available working reports with preserved archive members and maintained findings | Each useful finding linked to its durable destination, or explicitly marked unavailable/superseded | In progress |
| 3. Synthesis and challenge | Build the current system map, format/profile register, readiness rubric and fair ready-stack comparison | Independent criticism of ownership, completeness, competitor claims and open choices | Planned |
| 4. Delivery audit | Re-read the changed documents against findings and source inventory; validate navigation and remote bytes | Corrected findings ledger, review dispositions, final checks and immediate push | Planned |

Three independent review lanes cover authority/readiness, evidence custody and
ready-stack capabilities. The main review reconciles them and checks the final
documents again. Count reviewed sources separately from inventory-only entries;
do not equate an archive hash or a source URL with preserved report text.

Planned maintained prose: approximately 700–1,100 added or clarified lines across
a concise architecture map, this audit, the comparative study and navigation.
Evidence inventories are separate from that estimate. Complexity is **5/10**;
confidence in the proposed documentation structure is **8/10**. These are planning
judgments, not a claim that an exhaustive audit or production system is complete.

Each useful checkpoint is committed and immediately pushed. Required final
documentation qualification runs on the final source; intermediate checks do
not need repeated full native runtime campaigns.

## Evidence and lessons

### Baseline inventory

At the baseline the repository contains 31 maintained research Markdown files
with 11,579 lines, four architecture documents, 16 files in the decision directory
including its index, and 39 qualification Markdown files. This count establishes
the starting corpus, not that every line has already passed semantic review.
The detailed evidence/working-report inventory is being reconciled separately.

The older working directory used for some November 17–21 investigations is no
longer available. Their tracked full evidence archives and embedded reports are
the available audit sources; this audit must not claim to re-read vanished local
files. Current November 22–23 reports remain available for direct comparison.

### Confirmed initial gaps

| Finding | Evidence at baseline | Required correction |
| --- | --- | --- |
| The implementation owner is missing from the main overview table | `docs/README.md` lists Get Modular, the consuming product and Extension Foundation; OD-003 already confirms a separate library owning the complete reusable update operation | Add a clearly labeled planned implementation owner while preserving product authorization, canonical state and existing custody |
| Current navigation requires reconstructing a chronology | README starts at the November 18 vision; current clarification is distributed across OD-003 and later research | Provide one architecture entry point routing modules, plugins, update behavior, evidence and unresolved choices |
| The current reference still calls its ownership summary three boundaries | The reference's older boundary summary does not expose the newer full-operation library direction | Distinguish implementation ownership from operational authority; link the current owner confirmation |
| Several module formats are mentioned without an adoption register | Piral, Native Federation and OpenComponents appear in competition research; no production adapter contract is adopted | Record each mechanism's architectural role, research depth, proposed integration seam and actual adoption status |

These are projection and traceability defects. They do not imply that the
confirmed direction was absent from all preserved research, or authorize a new
runtime, package or product policy.

### Prior checkpoint verification

The previous checkpoint's full CI run
[45082709665](https://github.com/agent-teams-ai/extension-foundation/actions/runs/45082709665)
has now completed **5/5 jobs successfully** on `7611e1a`. Its separate Docs run
passed 4/4 jobs and 8/8 semantic tests. This is historical evidence for the
baseline, not qualification for subsequent changes in this audit.

## Open questions and validation

Documentation readiness will use a published weighted rubric with concrete
remaining specification items. It must distinguish clear vision, implementation
specification and qualification design, and must not average away an unresolved
critical contract. No percentage is assigned before the authority review.

The comparative study will use the same complete scenario and permit competitors
their documented companion libraries and reasonable application integration.
It will separate source-supported capabilities, bounded executed evidence,
application responsibilities, unknowns and our proposed contract. Neither absent
documentation nor a large list of proposed features proves superiority.

Completion requires durable destinations for useful identified findings,
traceable open issues, more than one independent review of the consolidated
result, correct current navigation, the required Docs gate and verification of
the pushed source. The audit covers the declared available corpus; it cannot
prove that no unrecorded conversation or inaccessible file exists elsewhere.
