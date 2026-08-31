---
id: qualification.universal-module-extension-system.performance-and-slo
type: qualification
status: qualified
owner: architecture
summary: Defines measurable performance and operability budgets for graph compilation, activation, updates, isolation hosts, and telemetry.
related:
  - ADR-0010
  - OD-003
---

# Performance And SLOs

> Historical qualification evidence. This page is non-operative. Use the
> [current productization gate](../module-system-v1-productization/README.md),
> [ADR-0014](../../decisions/0014-product-local-module-authoring-composition-and-generation-guardrails.md),
> and [ADR-0015](../../decisions/0015-authorize-get-modular-semantic-extraction.md)
> for current authority and implementation gates.

## Measure Before Optimizing

The current baseline is static Pure DI; the graph and lifecycle measurements in
this document are qualification targets for a future product-triggered private
runtime, not claims about production Foundation infrastructure. Its first
responsibility would be correctness; its second is to stay small enough that
feature delivery does not pay a hidden framework tax. Budgets are initial
qualification targets and must be recalibrated on reference CI and product
hardware.

## Signals

| Signal | Measurement |
| --- | --- |
| Graph compile latency | Descriptor input accepted to immutable plan or diagnostic |
| Template compile latency | Canonical declarations/profile accepted to `PlanTemplate` or diagnostic |
| Target closure latency | Template accepted to one target-local executable/blob closure |
| Scope binding latency | Target closure accepted to canonical authority-scope binding |
| Activation latency | Durable intent to ready evidence |
| Publication latency | Ready accepted to active pointer visible |
| Update interruption | Interval where no admitted generation can serve work |
| Drain duration | Admission seal to all accepted work complete or fenced |
| Recovery time | Host restart to stable, terminal, or controlled-recovery state |
| Memory per module | Retained heap/process RSS attributable to one active generation |
| Protocol overhead | Serialized bytes and latency per host invocation |
| Cleanup debt | Count and age of resources not confirmed released |
| Duplicate durable effects | Zero only for sinks with atomic fencing or native idempotency; otherwise explicit uncertain outcome and reconciliation |

## Initial Qualification Budgets

| Scenario | Target | Hard failure |
| --- | ---: | ---: |
| 1,000-node sparse graph compile | p95 under 100 ms | 500 ms |
| 10,000-node sparse graph compile | p95 under 1 s | 5 s or stack overflow |
| Equivalent graph permutations | identical template/content digests and diagnostics | any mismatch |
| Trusted in-process dispatch overhead | p95 under 1 ms excluding capability work | 5 ms |
| Local process-host round trip | p95 under 10 ms excluding capability work | 50 ms |
| Browser Worker round trip | p95 under 10 ms on reference desktop | 50 ms |
| Candidate publication | one compare-and-set, under 100 ms locally | multiple cutovers |
| Hung cleanup | bounded by configured absolute deadline | unbounded wait |
| Recovery replay | deterministic stable or explicit uncertain result | silent divergence |
| Metric series cardinality | bounded allowlist and per-product budget | unbounded identity labels |

These are provisional. CI reports distributions and environment metadata;
absolute blocking begins only after stable baselines exist. Determinism, memory
bounds and no leaked resources block immediately. Duplicate durable effects
block only where the authoritative sink contract can enforce that guarantee;
non-queryable external effects must surface uncertainty rather than claim
exactly-once delivery.

## Synthetic Matrix

Graph benchmarks apply to one target-local graph and include empty, chain,
diamond, wide DAG, sparse random DAG, layered DAG, giant cycle, many small
cycles, and duplicate-edge storm at 1,000 and 10,000 nodes. Fixed seeds and
checksums make regressions reproducible. Cross-target/service relationships are
benchmarked in the consuming product's separate deployment-plan suite, not by
pretending they are one module graph.

Measure `PlanTemplate` parsing/validation/provider resolution, target execution
closure, authority-scope binding, runtime-generation allocation, typed topology,
cycle diagnostics, each derived order, canonical serialization, and hashing
separately. Repeated equivalent inputs must reproduce `PlanTemplateDigest` and
post-admission `PlanContentDigest` while monotonic graph generations and
active-head revisions advance independently. No phase may allocate an `N x N`
matrix. Long chains must not depend on recursive JavaScript call depth.

Lifecycle benchmarks include:

- 100 concurrent starts with one operation identity and exact fingerprint;
- distinct operation identities with identical source and plan inputs;
- ready and failed candidate;
- diamond reverse rollback;
- one hung disposer;
- generation replacement with 0, 10, and 1,000 in-flight calls;
- retained, restarted, replaced, degraded, and disabled impact classifications;
- predicted versus observed peak coexistence of old/new module instances,
  process RSS, artifact blobs, connections, and migration scratch state;
- distinct activation, drain, retirement, and migration orders over typed-edge
  fixtures;
- controller crash at each durable boundary;
- duplicate/reordered protocol messages;
- process and browser host backpressure.

## Local And Hosted Profiles

Local Desktop prioritizes bounded memory, zero mandatory external services,
predictable startup, and clean process termination. Hosted deployment
prioritizes horizontal routing, failover, durable reconciliation, and tenant
isolation. Both expose the same semantic traces where guarantees overlap.

Distributed adapters report control-plane latency, route propagation, stale
route rejection, readiness convergence, and partition state separately from
the local graph compiler. Foundation does not promise simultaneous physical
rollout across partitions.

A future immutable change-impact artifact reports the predicted peak
coexistence and blast radius before activation. Runtime evidence then records
actual retained/restarted/replaced/degraded/disabled outcomes, state operations,
rollback disposition, and high-water resource use. Exceeding an admitted peak
budget fails before cutover or forces the explicit product-owned degraded plan;
it never silently increases parallelism. Ordered-many cardinality and order do
not define concurrency.

## Telemetry

Stable low-cardinality attributes include host tier, lifecycle phase, outcome,
diagnostic code, schema version, and product identifier. Module, artifact,
tenant, project, operation, graph generation, digest, path, error message, and
publisher are evidence or log fields, not unbounded metric labels.

Each product profile declares a telemetry-cardinality budget and tests the
maximum series count for its fixed label vocabulary. Unknown labels fail schema
validation; identity-bearing detail goes to sampled traces or bounded logs, not
metrics. The initial numeric budget is calibrated from a real deployment rather
than invented by Foundation.

Telemetry is not lifecycle authority. Sampling cannot be the only record of
admission, grants, publication, uncertain effects, cleanup debt, or revocation.
Secrets and user content are redacted before export.

## Framework Tax And Kill Criteria

Stop or simplify a candidate when:

- the first two product slices spend more than 30% of changed production code
  on generic framework glue;
- ordinary feature work repeatedly requires Foundation changes;
- a candidate runtime requires a second overlapping lifecycle state machine;
- Cordis or another adapter loses the predeclared semantic, lifecycle,
  maintainability, provenance, complexity, performance, and reversibility
  scorecard;
- public declarations leak framework types;
- startup, memory, or diagnostics regress without a capability benefit;
- a feature is delayed for hypothetical extensibility with no second consumer.

The first three conditions require stop or rollback under ADR-0013; only
explicit safety evidence may justify their cost. The remaining signals trigger
architecture review; security evidence may justify cost
when the reason is explicit.
