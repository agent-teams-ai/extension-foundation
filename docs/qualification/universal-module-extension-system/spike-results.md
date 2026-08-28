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
The qualification command reports the test count for that invocation and
includes a real headless Chromium Worker round trip when Chromium is available.
This is local disposable evidence, not an immutable release attestation and not
proof about the current document commit. Exact-head CI and an evidence manifest
keyed by commit, tree, lock digest, platform and profile are required before any
promotion claim.
If Chromium is absent, the optional local check skips and creates no browser
evidence.

## Evidence

| Spike | Verified evidence | Not proved |
| --- | --- | --- |
| ID-DAG compiler | Duplicate and missing module IDs fail before hook resolution; stable immutable batches, reverse cleanup and digest | Capability contracts, scope, sources and product SPI |
| Disposable binding compiler | Explicit required, optional and ordered-many bindings; an explicit empty optional selection is preserved as unbound while a missing optional coordinate fails closed; structural collision-free coordinates; fail-closed cardinality/version checks; duplicate declarations/providers/offers, including unbound offers; missing providers and binding-induced cycles | Production grammar, compatibility policy, product ownership, package or public SPI |
| Property and differential graph | 200 input permutations keep one digest; 500 generated directed graphs agree with Graphlib on cycle validity, while both orders independently satisfy every source edge | Graphlib is not selected as production authority |
| Large graph | Five 1,000-node and five 10,000-node chain samples stay within provisional hard caps; the 10,000-node cycle remains stack-safe and the observed heap delta stays within its qualification cap | Cross-machine calibrated percentiles, retained/dense graph memory and final production SLO gate |
| Concurrent activation | 100 starts with one operation identity and fingerprint share one activation; callers can cancel their own wait without cancelling shared startup; a changed activation-source digest, scope, product-authorization revision, capability-grant revision, host policy or cleanup input conflicts; distinct operation identities with identical source and plan remain separate competing candidates; caller-owned identity is snapshotted before admission; request, identity and waiter getters that reenter terminal shutdown cannot admit a later activation; expected-active CAS permits one publisher | Dual expected-desired/expected-active admission, bounded queue/supersede/reject behavior, deterministic conflict records, resolver-to-hook digest binding, multi-process consensus or distributed admission |
| Readiness and rollback | Complete descriptor-based hook and readiness preflight runs before module effects; only own data fields on plain/null-prototype records are admitted and Node Proxy objects are rejected before reflection; every module-specific failure carries module/phase attribution; explicit probe/inert policy blocks dependents; failed candidate leaves active routing unchanged | No fixture binds a selected provider through an optional slot and proves its startup/readiness failure aborts the candidate without fallback; host isolation, product-specific health policy and durable recovery are also unproved |
| Parallel failure | Each parallel batch has prepare, start and ready barriers; a phase failure aborts the shared signal, blocks every sibling from the next phase, waits for bounded same-phase siblings and then begins reverse cleanup | A trusted hook that ignores cancellation may continue after its wrapper settles and overlap cleanup; the result is `termination_unproven` until host-specific termination proves otherwise |
| Deadline and cleanup | Every queued hook rechecks one activation deadline before invocation; late startup cannot publish; hung in-process hook is bounded and reported `termination_unproven`; one cleanup cap is shared; an independent wall bound preserves budgets when an injected clock stalls; standalone subprocess fixtures prove hung prepare, start and stop keep Node alive until evidence is emitted | The three distinct durable non-renewable admission/validation, provider-execution and activation/handoff deadlines, their clocks/receipts, OS process-tree kill, durable debt and resource-specific release guarantees |
| Generation replacement and shutdown | New generation publishes once; admitted old work drains only until the recorded cutoff; commit-time fencing rejects overdue work even when the event loop delays the timer; terminal explicit shutdown reserves one flight before injected code, permanently rejects new admission, drains accepted work and stops in reverse activation order; in-memory timeout evidence precedes final fencing; a post-publication drain failure remains cleanup debt and cannot roll back or stop the active candidate | Separate typed activation/drain/retirement/migration plans, atomic database/broker sink fencing, durable host-incarnation `restart_required` high-water marks, fresh-host debt closure and richer update arbitration policies |
| Crash/recovery checkpoint harness | Identity-bound states for every represented phase are serialized, restored into fresh in-memory coordinators and produce deterministic retry, inspect, publish, drain, explicit stop, cleanup reconciliation, retirement recording, terminal or controlled-recovery actions; synthetic ready observations require exact runtime generation, module, module activation generation and attempt identity; retirement requires observed stop and confirmed cleanup | Process-crash harness, persistent store, multi-runtime/module readiness aggregation and receipts, staged runtime pins and retirement-fence races, discriminated target retirement, state migration/custody gate, durable host inspection and product recovery policy |
| Portable codec | One strict portable implementation rejects malformed UTF-8, duplicate keys, unsafe integer values, non-canonical JSON values and arrays, control-bearing identifiers, response kinds on request dispatch, wrong authority/instance/generation/peer/audience tuples, expired deadlines, shape, depth and byte violations; responses reverse authenticated sender/audience direction and must correlate to the originating request's graph generation, module activation generation and host incarnation | Authenticated channel establishment, method-specific schemas, receiver deadline horizons, operation journal, feature negotiation and N/N-1 compatibility |
| Node process smoke | Real child process validates bounded length-prefixed frames plus the connection-bound authority tuple and deadline, acknowledges hello, prepares, reports ready and stops | Actual authenticated negotiation, sandbox, crash reattach, stdout corruption and hostile child |
| Node Worker host | Structured clone preserves frame validation and stale-generation rejection | Worker as a malicious-code boundary; it is only fault containment |
| Browser Worker host | Real Chromium Worker carries the same generation-bound serializable frame | Dedicated-origin CSP, capability broker and hostile-code isolation |
| Packed harness fixture | A toy package survives actual `npm pack`, isolated install and import without Foundation, Cordis or plugin dependencies | Any production package, declaration leak checks, API report, host conditions and SemVer policy |
| Cordis 4.0.1 | A private Fiber owns resource cleanup and its hooks preserve the coordinator-owned two-generation trace shape | An independent lifecycle implementation, semantic equivalence, closed-world compile, product readiness, publication authority, recovery or isolation |
| Core Wasm | Inert module runs with zero host imports | Quotas, host functions or OS defense-in-depth |
| Extism 1.0.3 | Release-hosted v1.1.1 Wasm bytes matching the pinned digest run and close through the stable JS SDK | Publisher provenance, dependency acceptance, API stability, sandbox tier or MVP adoption |

## Lifecycle Claims Not Yet Proved

The current spike must not be read as production qualification for any of the
following:

- a selected provider's startup or readiness failure aborting an optional-slot
  candidate while only a compiled null/unbound binding represents absence;
- one durable intent fixing three non-renewable absolute deadlines and producing
  admission-authority, provider-execution and activation/handoff receipts,
  reconciliation receipts, and caller-monotonic observation evidence;
- desired-state admission comparing both expected desired and active heads with
  bounded durable queue, explicit supersede/reject decisions and deterministic
  conflict diagnostics;
- a durable `restart_required` high-water mark blocking admission and
  publication for one host incarnation until a fresh-host reconciliation receipt
  closes every affected route, pin, lease, effect, runtime and resource debt;
- typed ordering edges producing different activation, drain, discriminated
  retirement and migration plans rather than one universal DAG;
- ADR-0010 durable staged runtime pin acquire/promote/release, crash recovery and
  retirement-fence races. In particular, T0 runtime reuse is prohibited until
  that protocol is implemented and tested;
- the custody-authorized state migration gate required before an artifact or
  contribution update attaches persistent state; or
- crash-safe reconciliation of ambiguous external effects with no automatic
  retry after an unknown outcome.

These are mandatory future conformance gates. They are not gaps that can be
closed by rewording the existing in-memory trace, increasing its test count, or
recording a commit hash without an exact-head evidence manifest.

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
