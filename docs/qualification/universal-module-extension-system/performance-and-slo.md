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

## Measure Before Optimizing

The module system is control-plane infrastructure. Its first responsibility is
correctness; its second is to stay small enough that feature delivery does not
pay a hidden framework tax. Budgets are initial qualification targets and must
be recalibrated on reference CI and product hardware.

## Signals

| Signal | Measurement |
| --- | --- |
| Graph compile latency | Descriptor input accepted to immutable plan or diagnostic |
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
| Equivalent graph permutations | identical digest and diagnostics | any mismatch |
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

Graph benchmarks include empty, chain, diamond, wide DAG, sparse random DAG,
layered DAG, giant cycle, many small cycles, and duplicate-edge storm at 1,000
and 10,000 nodes. Fixed seeds and checksums make regressions reproducible.

Measure parsing, validation, provider resolution, topology, cycle diagnostics,
canonical serialization, and hashing separately. No phase may allocate an
`N x N` matrix. Long chains must not depend on recursive JavaScript call depth.

Lifecycle benchmarks include:

- 100 concurrent starts with one operation identity and exact fingerprint;
- distinct operation identities with identical source and plan inputs;
- ready and failed candidate;
- diamond reverse rollback;
- one hung disposer;
- generation replacement with 0, 10, and 1,000 in-flight calls;
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

- generic framework glue exceeds 30% of changed production code in the first
  two product slices;
- one feature change repeatedly requires Foundation changes;
- an adapter introduces a second graph or lifecycle state machine;
- Cordis or another adapter saves less than 25% equivalent owned runtime code;
- public declarations leak framework types;
- startup, memory, or diagnostics regress without a capability benefit;
- a feature is delayed for hypothetical extensibility with no second consumer.

These signals trigger architecture review; security evidence may justify cost
when the reason is explicit.
