---
id: research.plugin-boundary-experiments
type: research
status: active
owner: architecture
summary: Question-led follow-up experiments for plugin loading, restart admission and state recovery with independent plan review.
---

# Plugin Boundary and Failure Experiments

<!-- cspell:words PGDG libpq -->

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

The first checkpoint, `a19cb28`, records reviewed questions and plans. The next
checkpoint adds the local executions below. Original failures, independent
criticism and the later correction of an insufficient asynchronous example remain
separate evidence. Native database restore is still awaiting isolated execution.

## Evidence and lessons

### Executed local results

The original stop-admission hole remains reproducible. A small correction in a
disposable receiver copy closes the measured hole using its existing transition
queue. Loading experiments also falsify entry-only artifact identity, root-only
ESM refresh and complete hashing as a substitute for custody of mutable paths.

| Group | Actual outcome | Decision-relevant fact |
| --- | --- | --- |
| Original unchanged S07 | **2 failed rejection assertions** | New work is accepted during stop and remains durable; this is not a data-loss result. |
| Independent baseline absence control | **1 failed absence assertion** | Actual reservation acquisition and fresh-worker canonical readback expose the same unsealed acceptance. |
| RST-01 corrected admission | **4 passed** | Actual queued seal completion precedes rejection; rejected identities acquire nothing and remain absent after restart. Earlier queued work retains its explicit recovery disposition. |
| RST-02 readiness and failed cleanup | **1 passed** | The same existing attempt retains real resource and journal handles through cleanup debt; retry closes both without publication or business effects. |
| RST-03 late result and physical exit | **2 passed** | Canonical cancellation survives a real late success message; result and IPC disconnect do not release a still-live child's reservation. |
| PB-01 inert metadata and selected loading | **6 observations completed** | Actual released Core rejects an incompatible graph before selected entry evaluation; working imports and normally exited negative controls qualify the marker oracle. |
| PB-02 dependency bytes and loading | **4 groups completed** | Helper mutation, root-only cache refresh and verified-receipt/path-replacement each expose a different coherence limit; unchanged separate artifacts work in fresh processes. |
| PB-03 execution placement | **5 trials completed; 1 import-failure control reused** | Worker/process placement preserves the observed host response under a pure JavaScript loop; physical retirement and earlier file effects remain distinct. The original async row has a narrower interpretation below. |
| Actual awaited-initializer refinement | **1 passed** | The retained startup really awaits initialization, answers independent pings while pending, and reaches readiness only after the same initializer is released and returns. |

These are different cases and controls, not a combined reliability percentage.
The three red assertions remain failed tests in raw output. No expected-failure
wrapper turns them into a green aggregate. Original broad lifetime, crash,
Temporal and static growth suites were not repeated for volume.

### Admission ordering and retained cleanup authority

The corrected receiver separates a permanent admission seal from its recoverable
storage freeze. Stop enqueues the seal on the same queue as acceptance, closes
dispatch scheduling and awaits the actual seal completion. Existing identity and
conflict lookup still precedes rejection of new work. Reconciliation cannot
reopen sealed admission.

The independent parent checks canonical bytes, fresh-worker readback and
operation-specific reserve, permission and launch observations. Final empty
capacity alone is insufficient. An acceptance already ahead of the seal can
finish after wall-clock stop request: it is accepted work, not retroactively
rejected work. The tested record-only profile retains it pending; restart-pending
performs one actual effect after restart.

The readiness example uses real public GM construction. Its first cleanup has a
named failed debt while real handles remain open. Retrying the same attempt
closes both handles and clears the debt. This new example retains its first
report for evidence; discarded-report behavior remains the earlier L07 evidence.
No extra lifecycle owner was needed for this join.

In the late-result example, an independently observed synced file effect already
exists before cancellation. A later success message cannot overwrite canonical
cancellation, but cancellation does not undo the file effect. A second child
sends success and disconnects while retaining a live timer. Its reservation and
stop remain pending until planned exact-handle force retirement, actual exit,
stdio close and native absence. That is force retirement, not graceful cleanup.

### Artifact closure, loading and execution placement

Inert metadata, actual public graph validation and selected literal loaders are
distinct steps. Installed but unselected code stays unevaluated in the measured
example. Product-owned byte and loader correspondence checks are explicitly
fixture policy; they are not an implemented EF admission service or proof that
an arbitrary manifest truthfully describes executable behavior.

Changing only a helper leaves the entry hash unchanged but changes invocation.
Adding a query to only the ESM entry reloads that entry while retaining its old
helper. A fresh process sees changed dependency bytes. More decisively, the
child verifies and acknowledges **both entry and helper hashes**; the parent
independently checks that receipt, replaces the entry at the same mutable path,
and the subsequent import executes the replaced entry. Hashing the full selected
closure and holding that closure fixed through evaluation are separate duties.

Separate unchanged A/B artifact directories in fresh processes produce coherent
results. This supports a closed build artifact plus fresh execution lifetime for
the accepted restart profile, conditional on the existing artifact/execution
owner enforcing real byte custody. The test does not implement that enforcement.

A synchronous loop in the main execution process blocks its post-start response.
A Worker or child process keeps its tested host responsive. Worker retirement is
observed through its actual OS task identity, separately from JavaScript thread
identity and promise fulfillment. Child retirement records signal, disconnect,
exit, close and native absence separately. Earlier marker files survive all
retirement modes. None of these observations qualifies hostile-code isolation,
native-addon faults, arbitrary descendants or an application latency target.

### A critic found and corrected an insufficient example

The original PB-03 asynchronous row creates an unused pending promise and
withholds readiness. It proves the measured protocol response and process exit,
but not ownership of an actually awaited initializer. The independent result
critic identified that gap after the first report was frozen.

One separate example now retains a startup promise that actually awaits the
initializer. During a 503.4 ms readiness observation, the parent sees only the
entered marker, no ready event, the same live process and fresh responses. The
parent then releases the test gate. Actual return, readiness and joined startup
occur in order; exactly one ready event precedes normal exit, close and native
absence. This reachable-path control prevents a broken readiness path from
masquerading as successful pending initialization.

The original archive and report are unchanged. The new result does not add
cancellation, resource cleanup or a hard watchdog guarantee. Observation timers
using `Promise.race` do not cancel the underlying work. The first refinement
attempt hit disk exhaustion before a result existed; its partial emission and
empty logs remain separate from the successful strict build and execution.

### Real package readiness stopped one native question early

Orchestrator's accepted ADR-0052 identifies the initial Drizzle baseline as
`drizzle-orm@1.0.0-rc.4` and explicitly requires compatible GA readiness review
when production persistence materializes. It does not permit silent repinning.
The fixture fetched that exact official package, retained registry integrity,
and compared six shipped source-map originals with exact release source.

Under the declared TypeScript 7.0.2 profile, after correcting eight mistakes in
the fixture's initial constructor calls, **47 diagnostics remain in shipped
Drizzle declarations and zero in owned source**. Counts are 33 TS2339, five
TS2344, three TS2420, two TS2559 and four TS2636. `skipLibCheck: false`, exact
optional property checking and `noEmitOnError: true` remain enforced. No SR2
runtime was emitted or executed around the failed gate.

The inspected source suggests pending migration selection before the transaction
without an early owner serialization lock. That remains a source-based
hypothesis, not a newly observed duplicate migration. The prepared real-library
contention, blocked-DDL rollback, retry and no-op controls remain unexecuted.

Read-only current registry inspection found stable ORM 0.45.4 and Kit 0.31.11,
and ORM RC 1.0.0-rc.5; no 1.0 GA tag was observed. The stable migration format and
journal selection differ from RC4. It is a separate compatibility candidate,
not a drop-in replacement selected here. No alternate version was installed,
no accepted ADR changed and no custom migration engine was introduced.

The restore fixture has an independent strict profile and passes that source
gate. Its dependency set includes `@types/node` 26.6.5, unlike the earlier
lightweight fixture's 24.19.1. A successful compiler result is not a restore pass.

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

SR2 was revised against the accepted Drizzle migrator before source preparation,
then stopped at the actual dependency declaration gate described above. A
self-written time-conversion procedure was rejected as insufficient evidence
about a library or product integration. The original proposal, revision and
criticism stay visible in their respective snapshots.

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

Restart, loading and the awaited-initializer correction ran under strict
TypeScript. Their compiler and process groups ran sequentially to limit resource
competition. All actual positive-fixture identities matched the expected finite
create counts and were observed retired. The restart registrar can silently omit
an identity it cannot map; these finite matched executions do not qualify a generic
fail-closed registrar or arbitrary descendant inventory.

Initial PID-namespace assumptions, empty raw-pipe capture attempts, invalid Core
identity input and an incomplete disk-exhausted build remain recorded harness
failures. Corrected observers retain both namespace and native process identity.
An unavailable observation is not interpreted as an absence. Only the two
restart rows missing a specific retained fact and the insufficient async row
received targeted evidence refinements.

The shared local disk has insufficient available space for the native
PostgreSQL plan's stated guard. Native execution must retain that guard; a
separately qualified execution environment is an alternative. Read-only reuse
of an existing binary does not qualify its provenance or a new distribution.
The research does not delete another task's files or substitute older PostgreSQL
helpers to produce a passing row.

The presumed local native payload path proved to contain PostgreSQL 17.10,
not the planned 18.4. It was not used. The isolated native plan fetches the exact
historical 18.4 package and separately identified PGDG 18.4 helpers. The retained
PGDG signed index binds the exact client and libpq package hashes. This improves
input provenance without qualifying production signing, installation or delivery.

The documentation catalog and prose checks pass after canonical authoring
recovery. The local contract gate still records one opaque failed authoring test
file, including a reporter-only diagnostic reproduction. No journal, recovery
lock, dependency or gate was patched. Hosted repository checks are tracked
separately at their actual commit; a local failed gate is not relabeled passed.

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

### Executed evidence

The [local execution archive](evidence/plugin-boundary-experiments-20261026-local.tar.gz)
preserves source, frozen package inputs, exact commands, raw successful and failed
results, two independent result critiques, the separately reviewed async
refinement and root validation observations. Its
[machine receipt](evidence/plugin-boundary-experiments-20261026-local.json)
records the archive identity, scope and unresolved gates. Start `README.md` and
verify `SHA256SUMS` before following the track reports.

Local archive: **301 files**, **350,851 bytes**, SHA-256
`ab8e79dbc2b21a94ea1e6fe550ade5198c4000cec62ed1da1910f3fe35e09ac3`.

Original PB source/results/manifests remain unchanged. The refinement report
explicitly corrects the scope of the original async row; it does not replace
that earlier evidence with a more favorable history.

### Native restore inputs and independent criticism

The [native input archive](evidence/native-state-recovery-20261026-inputs.tar.gz),
[checksum](evidence/native-state-recovery-20261026-inputs.sha256) and
[input receipt](evidence/native-state-recovery-20261026-inputs.json) preserve the
final strict SR1 source, blocked SR2 source/diagnostics, exact package locks,
signed native provenance, execution scripts and independent reviews. These
**65 files / 1,099,983 bytes** have archive SHA-256
`9ee27beb087e17d946724b98fb4dbd01370350910757dfa6faed4b3da7e90740`.
Root verified every source-manifest member, all archive members and the signed
package tuple binding before publication. This receipt claims no native pass.

A fourth independent GPT-6.1 Sol xhigh critic reviewed actual restore source
before the native run. Three concrete findings were corrected and re-inspected:

- Foreign writes now require actual RLS-specific server diagnostics and four
  individual effective INSERT/UPDATE privilege checks. An ordinary permission
  error cannot stand in for policy enforcement; DDL denial is separate.
- The tiny synthetic logical dump remains in the output with globals and TOC.
  Physical data directories are excluded, preserving the actual restore input.
- Every allocated cluster root is registered immediately. A failed initializer
  cannot omit an unreturned root and then claim all cleanup completed; outstanding
  root/debt evidence makes that claim false.

The final independent strict SR1 build passed after those corrections. An
isolated, branch-scoped workflow uses read-only repository permissions, exact
action/tool pins, an unprivileged native process and the unchanged 1 GiB available
disk guard. Acquisition and external execution bounds leave time for retaining
failed logs. Outer timeout is failure with cleanup unproved; hosted-job containment
is the last fallback, not proof of graceful or complete retirement.

Hosted checks on exact planning commit `a19cb28` passed the repository `check`,
Node 26, Windows/macOS architecture, product-source, CodeQL and actual trusted
DocsProtocol routes. The existing identity check still fails its author-alias
comparison. These are observations of that commit; the new evidence/native
workflow checkpoint must retain its own run results.

The first hosted native workflow failed before scheduling any job. Source review
identified use of the runner context in job-level environment, which GitHub
permits only at the relevant step scope. The
[failure and correction receipt](evidence/native-state-recovery-20261026-workflow-correction.json)
retains the actual run and empty job list. Both affected variables were moved to
the consuming steps. The original input archive and its initial reviewed workflow
snapshot remain unchanged; later execution evidence must bind the actual
corrected workflow separately. No native assertion, guard, path or permission
changed.

## Open questions and validation

### Decisions supported by this round

Continue the accepted static composition and controlled restart direction. Put
the seal in the existing acceptance owner; keep the original attempt/resource
owner through readiness and cleanup; qualify complete artifact custody and
physical execution lifetime separately. Use fitting existing execution adapters
for capabilities needing independent interruption. Ordinary modules do not each
need a process, Worker, workflow or new lifecycle framework.

GM retains graph and construction semantics. EF retains this neutral evidence
and extension protocol discussion. Products retain declarations, literal
loaders, permissions, readiness and canonical state; existing execution owners
retain physical custody. This round does not justify a new repository or a
general replacement library. Extract a shared mechanism only after a real
residual responsibility remains after existing owners and libraries are reused.

The new TypeScript fixture lines are 608 for restart instrumentation and its
two copies, 571 for loading/placement and 107 for the isolated async correction.
The correction also copies 113 existing observer lines unchanged. These are
research costs, not estimates of the plugin platform. New production and product
integration lines are both **zero**.

| Scoped next step | Confidence / 10 | Achievable reliability / 10 | Complexity / 10 | Estimated new production mechanism LOC | Estimated product integration LOC |
| --- | ---: | ---: | ---: | --- | --- |
| Receiver-local queued seal using the existing owner | 9 | 9 for the tested accepted-cohort ordering | 2 | 0 shared framework | 20–60 plus owning conformance |
| Retain existing attempt through readiness and cleanup retry | 9 | 9 for the measured resource join | 2 | 0 | 20–60 |
| Complete fixed artifact plus fresh process lifetime | 9 | 9 conditional on separately qualified byte custody | 3 | 0–50 only if a fitting existing adapter lacks a narrow seam | 80–180 |
| Existing Worker/process adapter for a capability needing independent interruption | 9 | 8–9 within the measured pure-JavaScript/Linux scope | 4–5 | 0 if the existing owner fits | 60–220 |

Scores are engineering judgments about the named scope, not uptime or security
measurements. Future LOC ranges are incremental, exclude existing libraries and
domain migration SQL, and have approximately twice the stated range's uncertainty.
They do not price production distribution, cross-OS delivery or a thousand
simultaneously active plugins.

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
