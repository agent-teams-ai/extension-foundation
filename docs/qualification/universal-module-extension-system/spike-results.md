---
id: qualification.universal-module-extension-system.spike-results
type: qualification
status: qualified
owner: architecture
summary: Records repeatable disposable spike evidence and explicit limits of what each spike proves.
related:
  - ADR-0010
  - ADR-0012
  - OD-003
---

# Spike Results

## Scope

The spikes are disposable qualification code under `tests/qualification`.
They are not production packages or public SPI. Their purpose is to falsify
high-risk assumptions before the first implementation slice.

Run with:

```text
pnpm qualification:check
```

Reference environment on 2026-08-25: Node 24.18.0, macOS arm64, Apple M1 Max.
The suite passed 20/20 tests in about 5.1 seconds, including a real headless
Chromium Worker round trip.

## Evidence

| Spike | Verified evidence | Not proved |
| --- | --- | --- |
| Closed-world graph | Duplicate and missing providers fail before effects; stable batches, reverse cleanup and digest | Production descriptor schema, capability cardinality and product SPI |
| Property and differential graph | 200 input permutations keep one digest; 500 generated DAGs agree with Graphlib ordering validity | Graphlib is not selected as production authority |
| Large graph | 10,000-node chain and cycle compile without recursive stack overflow; observed test phase about 41 ms | Cross-machine p95, dense graph memory and final SLO gate |
| Concurrent activation | 100 same-fingerprint starts share one activation and one publication | Multi-process consensus or distributed admission |
| Readiness and rollback | Dependents wait; failed candidate leaves active routing unchanged | Product-specific health policy and durable recovery store |
| Parallel failure | A failed start batch settles bounded sibling hooks before reverse cleanup | A trusted hook that ignores cancellation still needs host-specific termination |
| Deadline and cleanup | Late startup cannot publish; hung stop returns at absolute deadline with explicit cleanup debt | OS process-tree kill and resource-specific release guarantees |
| Generation replacement | New generation publishes once; admitted old work drains or records timeout debt; stale durable write is rejected | Database/broker-specific fencing adapter |
| Crash/recovery reducer | Six durable crash boundaries produce deterministic retry, inspect, publish, drain, terminal or controlled-recovery actions | Durable schema, host inspection and product recovery policy |
| Portable protocol | Version, request/operation identity, generations, deadline, frame shape and size reject stale/malformed frames | Final wire encoding, authentication, N/N-1 compatibility |
| Node process host | Real child process negotiates, prepares, reports ready and stops over framed JSON | Sandbox, crash reattach, stdout corruption and hostile child |
| Node Worker host | Structured clone preserves frame validation and stale-generation rejection | Worker as a malicious-code boundary; it is only fault containment |
| Browser Worker host | Real Chromium Worker carries the same generation-bound serializable frame | Dedicated-origin CSP, capability broker and hostile-code isolation |
| Packed library | Actual `npm pack`, isolated install and import work without Foundation, Cordis or plugin dependencies | Final public package names and SemVer policy |
| Cordis 4.0.1 | A private Fiber owns resource cleanup and matches the native adapter's applicable two-generation semantic trace | Closed-world compile, product readiness, publication authority, recovery or isolation |
| Core Wasm | Inert module runs with zero host imports | Quotas, host functions or OS defense-in-depth |
| Extism 1.0.3 | Digest-verified official v1.1.1 plugin runs and closes through the stable JS SDK | Dependency acceptance, API stability, sandbox tier or MVP adoption |

## Important Findings

The native graph compiler stayed small and deterministic. Iterative cycle
diagnostics avoid JavaScript call-stack dependence, and residual-node discovery
uses set membership rather than quadratic scans.

Cordis is useful only below the neutral contract. Its `Fiber` lifecycle is a
resource mechanism, not the Agent Teams generation lifecycle. Introducing it
now would not delete enough owned code to justify a second runtime authority.

The process and Worker spikes validate transport shape, not security. A signed
or well-framed extension remains untrusted until host placement, capabilities,
quotas and product grants pass independent admission.

The Extism experiment is intentionally outside `qualification:check` because
it downloads one immutable digest-verified artifact. Run it explicitly with
`pnpm qualification:extism:experiment`. The npm `latest` tag points at
`2.0.0-rc13`; the spike instead pins the stable `1.0.3` SDK and records Node's
experimental WASI warning. This keeps Extism post-MVP and prevents accidental RC
admission.

## Repeatability Rules

- Keep all random tests seeded and reproducible on failure.
- Keep qualification dependencies exact and development-only.
- Record Node, OS, architecture and dependency versions with benchmark output.
- Never turn a measured local latency into a universal blocking threshold.
- Promote spike code only through a separate reviewed implementation plan.
- Delete a spike when production conformance proves the same claim more directly.
