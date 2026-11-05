---
id: research.packed-consumer-e2e
type: research
status: active
owner: architecture
summary: Reviewed packed public-contract experiment, actual invocation evidence, and explicit product Host qualification limits.
---

# Packed Extension Consumer E2E 2026-11-05

## Scope and authority

**Observed 2026-11-05. Corrected local execution and all four hosted lanes passed.**
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

### Executed local result

The corrected third local run passed **ten named scenarios plus their enclosing
test: 11 passed, zero failures, cancellations or skips**. The actual runtime was
Linux, Node 24.22.1, pnpm 11.25.0 and TypeScript 7.0.2. All 27 child commands
completed with exit zero and no terminating signal; ten fresh scenario processes
ran. These counts describe one finite experiment, not a reliability percentage.

The [frozen input archive](evidence/packed-consumer-e2e-20261105-inputs.tar.gz)
and [member ledger](evidence/packed-consumer-e2e-20261105-inputs.json) preserve
29 regular files, 105,046 archive bytes, SHA-256
`61fc7aa6b921ce9e68ea8c52165aa08ca6f0f06efdae114e3a23bf779cbbd500`.
Start its `README.md` for exact reproduction. New maintained code is **433
TypeScript lines**: 39 fixture, 161 TEST consumer/composition and 233 driver
lines. Production and product-integration code remain zero. Copied product
inputs and generated JavaScript/declarations are counted separately.

Two independent execution critics inspected source, logs and receipts. The
artifact critic also compared every packed and installed A/B/H regular file:
20/4/4 files respectively, with identical sets and bytes. B resolves its A peer
and H helper to the same physical packages used by the consumer. These are
read-only checks of retained evidence, not additional runtime executions.

The actual A invocation changes from not-found to the expected B/H candidate,
including protocol 3 and mandatory authenticated handshake, and preserves the
delegated baseline result. Both ambiguous enumeration orders fail real GM
preparation before any factory or executable B/H evaluation. Explicit binding
works, and one full enumeration reversal preserves plan, digest and behavior.
Source failure, wrong target and exact expiry preserve A's actual validation.
The pending old source remains independent while a fresh B-bound instance
completes; fresh construction without B restores the literal baseline.

### Failures and corrections retained

1. The first run failed installing the unpublished helper: pnpm 11 ignored the
   old `package.json` overrides location and requested the registry package.
   Generated self-only `pnpm-workspace.yaml` overrides fixed the install.
2. The second run passed its behavioral assertions but actually ran A's
   `prepack` clean/build. Environment and `.npmrc` configuration did not suppress
   it. Its final bytes and logs remain historical evidence; it does not prove
   the intended explicit-build-only route. The corrected run passes the actual
   CLI option `--config.ignore-scripts=true` and asserts every `dist` inventory
   unchanged during packing. The original A manifest and source stay unchanged.
3. A critic found that receipt status could say passed after ten assertions even
   if final evidence collection failed. The corrected driver records success
   only after the complete body finishes. It also checks both compiled consumer
   files for equality across all three installations.

The corrected input passed a frozen compiler install and full strict E2E again.
No failed result was relabeled as a pass. The consumer inherits the trusted
parent environment, with nested-test context cleared; this is not a hermetic or
hostile execution boundary.

The [local evidence archive](evidence/packed-consumer-e2e-20261105-local.tar.gz)
and [member ledger](evidence/packed-consumer-e2e-20261105-local.json) retain
316 files, 335,181 archive bytes, SHA-256
`2d3e72a2d4fed1eca193e2365078ea564416ea341ad74bd59d3b7716f0d5522f`.
Start `LOCAL-EVIDENCE.md`. It includes the original failures, corrected run,
source/configuration and lock inputs, generated outputs, seven planning/review
reports, exact staged workflow and completed local documentation checks.
Its hosted-pending status is preserved as the earlier checkpoint.

### Completed hosted validation

[Run 42099097668](https://github.com/agent-teams-ai/extension-foundation/actions/runs/42099097668)
completed successfully at exact commit
`11fa2e2450a8aba62823544fc3129318918e9696`. Every lane staged the same verified
29-file archive outside the EF workspace, performed a frozen strict compiler
install and invoked the actual E2E command. All retained input files match the
ledger on all four systems. No legacy Foundation CLI was initialized by this
experiment; separate existing repository CI retains its own scope.

| Executed platform | Actual Node | Architecture | Named scenarios | Tests including parent | Fail / skip |
| --- | --- | --- | --- | --- | --- |
| Ubuntu 24.04 | 24.21.0 | x64 | 10 passed | 11 passed | 0 / 0 |
| Ubuntu 24.04 | 26.11.1 | x64 | 10 passed | 11 passed | 0 / 0 |
| macOS 15 | 26.11.1 | arm64 | 10 passed | 11 passed | 0 / 0 |
| Windows Server 2022 | 26.11.1 | x64 | 10 passed | 11 passed | 0 / 0 |

Each lane records 27 successful child commands and ten fresh scenario children.
The same ten scenario definitions ran on four platform/runtime combinations;
this is not forty distinct behavior designs. Actual image versions, original
artifact ZIPs, their GitHub SHA-256 digests, inner archive digests, job logs and
per-run receipts are retained in the hosted evidence bundle. The logs use Node's
spec reporter; the counts do not imply a separate raw TAP artifact. A green upload is
not substituted for the original successful test-step and whole-job conclusions.

The finite temporary workflow is removed after its completed experiment. Its
exact executed bytes remain in the archives and commit history; no continuous
coverage or new required gate is implied by this research. The setup review
caught pnpm action manifest/version and relative-path traps before publication.
No OS exception, test-name filtering or weakened assertion was introduced.

The [hosted evidence archive](evidence/packed-consumer-e2e-20261105-hosted.tar.gz)
and [member ledger](evidence/packed-consumer-e2e-20261105-hosted.json) retain
33 files, 722,430 archive bytes, SHA-256
`0e83c4739a323619212b892ff0190bffb4daee737602a9d589d3ddba4250bdc3`.
Start `HOSTED-EVIDENCE.md`. Both independent hosted critics found no blocking
discrepancy. Complete child payloads match the corrected local run and all
hosted lanes after removing only process ID and consumer-root path. The archive
keeps each original ZIP, selected immediately readable receipts/logs and exact
workflow; each ZIP contains the full 130-file retained execution tree.

Packed A's file hashes match its retained installed-file inventory on every
lane. Those are the runner's remote assertions, not a fresh physical inspection
of remote dependency stores by the critics. Such stores were intentionally
excluded. A/H unpacked contents match across lanes, while compressed archives
and B's preserved run-specific development path can differ; their separate
identities remain recorded. Neither correspondence nor a green run proves
future executable byte custody.

### Remaining product boundary

The application consuming a real extension point, a public product plugin
admission/configuration surface and the actual artifact-to-executor custody
handoff remain absent at this seam. A/H/B tarballs are research packages, not
admitted signed OCI plugin artifacts. The previous verified-path replacement
counterexample in [PB-02](plugin-boundary-and-failure-experiments.md) remains
relevant until an actual owner can enforce its guarantee. Do not invent that
owner inside a test or infer retirement/drain from concurrent instance binding.

| Selected direction | Confidence /10 | Scoped reliability /10 | Complexity /10 | Incremental code |
| --- | --- | --- | --- | --- |
| Actual A port plus packed B/H and thin GM TEST composition | 9 | 9 within the named finite checks | 3 | Zero production/product integration; 200 fixture and TEST composition/consumer plus 233 driver lines, measured. |
| New general plugin Host/SPI to satisfy this experiment | 3 | Not qualified | 8 | Not bounded by this slice; requires its owning decision and real consumer. |

Scores are planning judgments, not measured uptime or product qualification.
