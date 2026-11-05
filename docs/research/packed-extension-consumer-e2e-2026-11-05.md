---
id: research.packed-consumer-e2e
type: research
status: active
owner: architecture
summary: Reviewed packed public-contract experiment, actual invocation evidence, and explicit product Host qualification limits.
---

# Packed Extension Consumer E2E 2026-11-05

## Scope and authority

**Observed 2026-11-05. Initial checkpoint: reviewed plan; execution pending.**
This continues the owner's E2E request after the
[industry and scale review](plugin-industry-and-scale-review-2026-11-05.md).
The selected scope is **public-package integration E2E** through an unchanged
real product use case. It does not establish full product plugin, UI, admission,
artifact-custody or lifecycle replacement readiness.

Orchestrator main `5a8496ce711909e381c5bc817fff5500be9a1761` exports the private
`@agent-teams/local-host-control@0.0.0` package. Its public `HostDiscoverySource`
port supplies `createHostDiscovery().discover()`. Existing packed checks prove
installation, factory presence and declarations; they do not invoke discovery.
No materialized application, shipped source adapter or public plugin Host exists
at this seam. The baseline source below is explicitly a fixture. A candidate
still requires a later authenticated handshake; it is not ready or trusted.

EF [OD-003](../open-decisions/OD-003-module-runtime-and-public-spi-choices.md)
remains open. GM retains neutral composition; the actual discovery package
retains validation. The disposable TEST consumer owns its finite process runs.
No production declaration, public SPI, new runtime or accepted pin changes here.

The previous EF checkpoint `2b10732` has now completed its actual hosted CI,
including Linux, macOS, Windows, Node and the trusted DocsProtocol route. That
success is separate from the local embedded-compiler policy conflict below.

## Evidence and lessons

### Reviewed plan

One investigator inspected actual EF, Orchestrator, GM and Agent Runtime seams.
Two independent GPT-6.1 Sol xhigh critics approved this bounded experiment after
reducing its composition to three entries. A separate investigator audited the
toolchain. Their reports and execution receipts will be retained with results.

1. Copy A's exact package source and manifest from the pinned Orchestrator tree;
   build its public JavaScript/declarations under strict TypeScript 7.0.2 and
   retain source, effective build configuration and archive identities.
2. Independently compile and pack adapter B against installed A declarations.
   B wraps a fixture fallback through the existing public source port and changes
   one explicit target's discovery result. A separately packed helper H affects
   the actual candidate identity. No private imports or workspace source aliases.
3. Install the exact archives into an external consumer. Use the retained
   Core/Assembly 0.5.0 pair, consistent with the owning product's accepted pin,
   in a thin TEST composition. These archived bytes are not represented as a
   fresh registry-authenticated release.
4. Use one Source capability: baseline provides it; B requires and provides it;
   discovery consumes it and constructs the real A use case. With no discovery
   binding, baseline+B is ambiguous. Explicit discovery-to-B binding repairs it;
   B's own source resolves to baseline because self is excluded. No extra C
   package or new resolver is needed.
5. Run baseline, B-selected and restored baseline in fresh owned child processes.
   Require actual discovery results, unchanged A bytes, direct factory counts,
   fixture-only B/H evaluation markers and joined child completion.
6. Preserve existing A validation through the installed boundary: source failure,
   wrong target and exact expiry. Hold an old source call while a fresh B-bound
   instance completes, then prove the old instance still uses its original source.

Root owns literal result oracles separately from the B/H implementation. The
adapter author receives A's public contract. Expected values are not computed
from the tested helper, selected profile or a second call to B.

| Check | Required independent observation |
| --- | --- |
| Baseline / delegation | Extension target is not found; a second target returns the exact baseline candidate and one source read. |
| B selected | A returns the exact B/H candidate, negotiated protocol and mandatory authenticated-handshake flag; unrelated target still delegates once. |
| Removal / fresh construction | B is absent from the restored consumer's dependency set and public resolution; a fresh child produces literal baseline outcomes with identical A bytes. |
| Binding ambiguity | Real GM refusal names discovery/source and both candidates before any factory or B/H evaluation. |
| Enumeration permutation | Same selected profile/binding retains the exact plan, digest and actual A result; ambiguous permutations retain the same refusal. |
| Source exception | A returns exactly unavailable/source-failure without the fixture's raw failure marker. |
| Wrong target | An otherwise valid B observation returns exactly rejected/target-mismatch. |
| Exact expiry | Fixed clock equals validUntil and A returns expired; no sleep or timing threshold. |
| Old/new independence | Fresh B result arrives while old read is pending; released old and its next call retain baseline, with no extra B call. |

All new maintained JavaScript-runtime code is `.ts`, with strict compiler
coverage of the driver, B/H and consumer. Record actual Node/pnpm/compiler
identities, source/archive/installed-byte hashes, lock inputs and named test
execution. Installation, typecheck and invocation are separate results.

The reviewed target is approximately 320–500 new maintained TypeScript lines;
up to 700 is allowed only for measured packing and evidence needs. Copied
unchanged A/GM inputs and generated output are reported separately. New
production code is zero. Stop after the finite journey and controls; unchanged
N1000, live-instance, lifecycle and mutable-path experiments are retained rather
than counted again.

### Toolchain audit

The compiler fix already exists in published Engineering Foundation 1.10.0 and
later releases; current stable is 3.1.0. The blocker is the consumer's exact
managed Docs Cohort `docs-2026-10-03-stable31`, which binds Foundation 1.7.2
and four companions. The inspected central registry has no qualified native
successor. Updating one pin would mix managed inputs.

The owning route is the existing central data-only Cohort qualification,
real registry signature/provenance/runtime-closure checks, producer canary and
consumer upgrade/rollback. An archive or synthetic receipt does not create that
authority. This experiment runs its own strict compiler without initializing the
legacy CLI; no managed state, dependency pin or required gate is weakened.

## Open questions and validation

Execution is pending at this plan checkpoint. Preserve initial failures, fixes,
independent result reviews and exact final inputs when appending results.

The application consuming a real extension point, a public product plugin
admission/configuration surface and the actual artifact-to-executor custody
handoff remain absent at this seam. A/H/B tarballs are research packages, not
admitted signed OCI plugin artifacts. The previous verified-path replacement
counterexample in [PB-02](plugin-boundary-and-failure-experiments.md) remains
relevant until an actual owner can enforce its guarantee. Do not invent that
owner inside a test or infer retirement/drain from concurrent instance binding.

| Selected direction | Confidence /10 | Scoped reliability /10 | Complexity /10 | Incremental code |
| --- | --- | --- | --- | --- |
| Actual A port plus packed B/H and thin GM TEST composition | 9 | 9 after the named checks pass | 3 | Zero production; roughly 80–150 integration and 220–350 test/packing lines, with about twofold uncertainty. |
| New general plugin Host/SPI to satisfy this experiment | 3 | Not qualified | 8 | Not bounded by this slice; requires its owning decision and real consumer. |

Scores are planning judgments, not measured uptime or product qualification.
