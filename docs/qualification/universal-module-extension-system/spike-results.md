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
The exact-head qualification command records the authoritative test count and
includes a real headless Chromium Worker round trip when Chromium is available.
This is local qualification evidence, not an immutable release attestation.
Exact-head CI and an evidence manifest keyed by commit, tree, lock digest,
platform and profile are required before promotion.
If Chromium is absent, the optional local check skips and creates no browser
evidence.

## Evidence

| Spike | Verified evidence | Not proved |
| --- | --- | --- |
| ID-DAG compiler | Duplicate and missing module IDs fail before hook resolution; stable immutable batches, reverse cleanup and digest | Capability slots, bindings, cardinality, versions, scope, sources and product SPI |
| Property and differential graph | 200 input permutations keep one digest; 500 generated directed graphs agree with Graphlib on cycle validity, while both orders independently satisfy every source edge | Graphlib is not selected as production authority |
| Large graph | 10,000-node chain and cycle compile without recursive stack overflow; observed test phase about 41 ms | Cross-machine p95, dense graph memory and final SLO gate |
| Concurrent activation | 100 starts with one operation identity and fingerprint share one activation; callers can cancel their own wait without cancelling shared startup; a changed activation-source digest, scope, product-authorization revision, capability-grant revision, host policy or cleanup input conflicts; distinct operation identities with identical source and plan remain separate competing candidates; caller-owned identity is snapshotted before admission; expected-active CAS permits one publisher | Resolver-to-hook digest binding, multi-process consensus or distributed admission |
| Readiness and rollback | Complete descriptor-based hook and readiness preflight runs before module effects; only own data fields on plain/null-prototype records are admitted and Node Proxy objects are rejected before reflection; every module-specific failure carries module/phase attribution; explicit probe/inert policy blocks dependents; failed candidate leaves active routing unchanged | Host isolation for untrusted contribution protocols, product-specific health policy and durable recovery store |
| Parallel failure | The first failed prepare or start promptly aborts the shared signal; siblings cannot enter a later activation phase, cooperative siblings settle, and every bounded sibling wrapper settles before reverse cleanup | A trusted hook that ignores cancellation may continue after its wrapper settles and overlap cleanup; the result is `termination_unproven` until host-specific termination proves otherwise |
| Deadline and cleanup | Late startup cannot publish; hung in-process hook is bounded and reported `termination_unproven`; one cleanup deadline is shared; an independent wall bound preserves budgets when an injected clock stalls; standalone subprocess fixtures prove hung prepare, start and stop keep Node alive until evidence is emitted | OS process-tree kill, durable debt and resource-specific release guarantees |
| Generation replacement | New generation publishes once; admitted old work drains or emits in-memory timeout evidence before the spike fence; a post-publication drain failure remains cleanup debt and cannot roll back or stop the active candidate | Atomic database/broker sink fencing and durable debt ordering |
| Crash/recovery reducer | Identity-bound reducer examples produce deterministic retry, inspect, publish, drain, explicit stop, cleanup reconciliation, retirement recording, terminal or controlled-recovery actions; retirement requires observed stop and confirmed cleanup | Crash/fault harness, durable schema, host inspection and product recovery policy |
| Portable codec | One strict portable implementation rejects malformed UTF-8, duplicate keys, unsafe integer values, non-canonical JSON values and arrays, control-bearing identifiers, response kinds on request dispatch, wrong authority/instance/generation/peer/audience tuples, expired deadlines, shape, depth and byte violations; responses reverse authenticated sender/audience direction | Authenticated channel establishment, method-specific schemas, receiver deadline horizons, operation journal, feature negotiation and N/N-1 compatibility |
| Node process smoke | Real child process validates bounded length-prefixed frames plus the connection-bound authority tuple and deadline, acknowledges hello, prepares, reports ready and stops | Actual authenticated negotiation, sandbox, crash reattach, stdout corruption and hostile child |
| Node Worker host | Structured clone preserves frame validation and stale-generation rejection | Worker as a malicious-code boundary; it is only fault containment |
| Browser Worker host | Real Chromium Worker carries the same generation-bound serializable frame | Dedicated-origin CSP, capability broker and hostile-code isolation |
| Packed harness fixture | A toy package survives actual `npm pack`, isolated install and import without Foundation, Cordis or plugin dependencies | Any production package, declaration leak checks, API report, host conditions and SemVer policy |
| Cordis 4.0.1 | A private Fiber owns resource cleanup and its hooks preserve the coordinator-owned two-generation trace shape | An independent lifecycle implementation, semantic equivalence, closed-world compile, product readiness, publication authority, recovery or isolation |
| Core Wasm | Inert module runs with zero host imports | Quotas, host functions or OS defense-in-depth |
| Extism 1.0.3 | Release-hosted v1.1.1 Wasm bytes matching the pinned digest run and close through the stable JS SDK | Publisher provenance, dependency acceptance, API stability, sandbox tier or MVP adoption |

## Important Findings

The native graph compiler stayed small and deterministic. Iterative cycle
diagnostics avoid JavaScript call-stack dependence, and residual-node discovery
uses set membership rather than quadratic scans.

Cordis is useful only below the neutral contract. Its `Fiber` lifecycle is a
resource mechanism, not the Agent Teams generation lifecycle. The applicability
fixture exercises Cordis hooks through the same `GenerationLifecycle`; it is not
a differential lifecycle implementation or equivalence proof. The current
trivial adapter does not demonstrate the required code deletion; the 25%
threshold remains a future real-consumer measurement, not a completed result.

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
