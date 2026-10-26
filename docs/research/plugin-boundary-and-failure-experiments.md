---
id: research.plugin-boundary-experiments
type: research
status: active
owner: architecture
summary: Question-led follow-up experiments for plugin loading, restart admission and state recovery with independent plan review.
---

# Plugin Boundary and Failure Experiments

## Scope and authority

Campaign opened **2026-10-26** after the owner requested a larger autonomous
experimental phase before substantial plugin implementation. Static composition
with controlled restart remains confirmed. Optional Temporal scheduling adapts
the same product-owned operation. Existing GM, EF, product and physical execution
owners retain their responsibilities.

This record extends the
[previous validation](static-composition-and-controlled-restart-validation.md).
It does not accept a public SPI, production Host, migration framework, package
release or language rewrite. Accepted ADRs and frozen earlier evidence remain
unchanged. [OD-003](../open-decisions/OD-003-module-runtime-and-public-spi-choices.md)
still owns the unresolved implementation choices.

The first checkpoint records reviewed questions and plans, **not new passing
results**. Each execution will retain its actual source, inputs, negative controls,
observations, failures and cleanup evidence before a conclusion is promoted.

## Evidence and lessons

### Current source and execution identities

Fresh source inspection found EF draft `84f43b9`, GM main `b1866ac` and
Orchestrator main `94a480d`. PR90 remains unmerged at `0af8921`.
Source freshness does not silently change an adopted package pin.

The lightweight experiments reuse the prior frozen public Core/Assembly 0.7.0,
Resources 0.2.1 and Conformance 0.5.0 inputs, now restored with Node 26.11.1,
TypeScript 7.0.2 and pnpm 11.18.0. Current GM manifests still identify those
public versions; its lifecycle kernel remains private. The historical manifest
and lock were compared byte-for-byte after the frozen installation.

The original 416-file archive was restored and every SHA-256 entry verified.
It is not modified. In particular, the two historical stop-admission rejection
assertions stay red evidence; a corrected disposable copy must use a new
independent absence and reservation oracle.

### Questions selected before implementation

| ID | Uncertain boundary | Decision the result can change | Independent observation |
| --- | --- | --- | --- |
| RST-01 | New acceptance during stop, including work already ahead of the seal | Whether the existing receiver queue can provide a permanent admission seal without losing earlier acceptance | Canonical bytes, fresh-worker readback and operation-specific reservation and launch observations |
| RST-02 | Real construction succeeds, readiness rejects and first cleanup fails | Whether the retained attempt/resource owner can handle this join without another state machine | Actual file handles, journal content, publication and effect observations |
| RST-03 | Real late success or IPC disconnect before child exit | Whether the custodian preserves separate semantic, effect and physical-exit facts | Synced effect file before cleanup, actual messages and exact owned process identity |
| PB-01 | Inert metadata selection versus top-level executable evaluation | Minimum product loading sequence and the strength of any runtime-export compatibility path | Parent-observed marker files, actual public GM diagnostic and a working direct-import control |
| PB-02 | Entry hash, dependency bytes, ESM cache and verification/loading race | Whether a complete static artifact and fresh execution owner are required, and which custody assumption remains | Independent entry/helper hashes, fixed invocation outputs and explicit mutation barriers |
| PB-03 | Async non-settlement and synchronous initialization loop | Appropriate trusted execution placement and retirement promise | Independent nonce pings, real child or OS thread identity, runtime exit and native absence |
| SR1 | Logical restore of the preserved real Agent Context feature | Whether separately sourced PostgreSQL helpers can fill the missing local restore capability | Different cluster identity, restored facts/outbox, exact values, roles, direct runtime SQL and rejected writes |
| SR2 | Concurrent and blocked schema migration | Whether an existing migration library already supplies sufficient serialization or its owner needs a narrow lock | Actual library SQL, server lock state, schema/journal rollback and real retry |

SR2 is being refined against the accepted Drizzle migrator before implementation.
A self-written time-conversion procedure is not sufficient evidence about a
library or product integration. The original proposal and criticism stay visible
in the planning snapshot.

### Mandatory plan-critic dispositions

Three GPT-6.1 Sol xhigh researchers read the common owner brief and frozen
evidence. Different researchers then independently criticized the plans before
execution. The accepted refinements are concrete:

- Keep admission sealing separate from a recoverable storage freeze. Observe
  the actual queued seal completion, allow acceptance already ahead of it, and
  prove reconciliation cannot reopen admission.
- Give rejection a command-specific durable absence and acquisition oracle;
  a final count or a boolean in the implementation is insufficient.
- Limit readiness/cleanup work to its newly selected join; do not repeat the
  earlier lifetime suite for volume.
- Observe real terminal messages and IPC disconnect without changing the
  custodian's existing completion-after-exit semantics. Capture committed effect
  bytes before cleanup. Planned force retirement and emergency watchdog cleanup
  are different outcomes.
- Make the verification/loading counterexample acknowledge the **complete
  two-file receipt** before mutation. Complete hashing still does not create
  custody of writable paths.
- Require a working selected-import control and normal rejection completion
  before interpreting absent markers as zero evaluation.
- Identify the OS thread synchronously inside the Worker. A JavaScript thread
  identifier, a fulfilled promise or a sent signal does not substitute for the
  named native observation.
- For restore, probe both visibility and write rejection through restored
  non-superuser SQL authority. Do not repair grants or rerun migrations after
  restoring and then attribute those repairs to the archive.
- Use real pending migration work and fresh schema state for contention;
  an already-applied no-op cannot demonstrate serialization.

These are experimental acceptance criteria, not new production contracts.
Current Node primary documentation retrieved by researchers identifies v26.12.1;
the executed toolchain is separately pinned to v26.11.1. Documentation inspection
and local execution are distinct evidence.

### Resource and execution status

At this checkpoint, restart and loading sources are being prepared under strict
TypeScript. Their compiler and process groups run sequentially to limit resource
competition. No new execution result is claimed here.

The shared local disk has insufficient available space for the native
PostgreSQL plan's stated guard. Native execution must retain that guard; a
separately qualified execution environment is an alternative. Read-only reuse
of an existing binary does not qualify its provenance or a new distribution.
The research does not delete another task's files or substitute older PostgreSQL
helpers to produce a passing row.

### Planning evidence

The [reviewed planning archive](evidence/plugin-boundary-experiments-20261026-plan.tar.gz)
contains the full common brief, three track plans, independent cross-critiques
and a dated retained engineering-standard source. Start its `README.txt`;
`SHA256SUMS` binds every payload. The
[machine receipt](evidence/plugin-boundary-experiments-20261026-plan.json) records
the exact source identities and open conditions.

Archive: **10 files**, **61,437 bytes**, SHA-256
`f277f258b2935cedd4668d1eee88f3701ffab0711bf28e09e0e7775234f83ea3`.
Later result archives will preserve actual executed sources and outcomes
separately from this initial planning snapshot.

## Open questions and validation

For each selected group, require a concrete falsifier, an independently observed
boundary, a meaningful control, bounded runtime/resources and exact cleanup.
Keep real components and test-owned policy explicit. Stop after the selected
uncertainty is resolved; an unavailable native observation is not a passing mock.

The existing static graph-growth and ordinary invocation-without-Temporal
results are not repeated just to increase counts. No broad production load,
hostile-code isolation, power-loss durability, full Desktop delivery or arbitrary
stateful hot replacement follows from these minimal examples.

Significant alternatives retain confidence, achievable reliability and
complexity scores out of ten plus separate production, integration and
test/fixture LOC in the owning plans. These are scoped engineering estimates,
not uptime measurements or the cost of the entire plugin platform.
