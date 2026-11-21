---
id: research.update-policy-runtimes
type: research
status: active
owner: architecture
summary: Evaluates selectable interruption policies, compilation and optional cross-language runtimes through primary sources and bounded backend, browser and WebAssembly component experiments.
---

# Live Update Policies and Portable Runtimes 2026-11-21

## Scope and authority

**Observed: 2026-11-21, Europe/Kiev. This checkpoint records the research plan;
its new execution results are pending.** The owner asks for selectable update
modes, optional agent-triggered interruption, safe completion of active work,
backend and frontend coverage, and a clear compilation and cross-language path.
The [owning clarification](../open-decisions/OD-003-module-runtime-and-public-spi-choices.md#owner-requested-selectable-updates-and-cross-language-research-2026-11-21)
keeps defaults, escalation and production runtime selection explicit.

This continues the [executed November 18 study](live-application-evolution-vision-and-executed-spikes-2026-11-18.md).
Research and disposable fixtures do not adopt a production Host, publish an SPI,
release a package, authorize merge or supersede accepted ADRs. Existing
composition, authority, state and physical-custody owners remain in force.

## Questions and bounded execution plan

The investigation must distinguish requested cancellation from observed
completion, and a termination command from the executor's available stop
observation. It must also distinguish source-language compilation, artifact
validation, runtime instantiation and application activation.

| Lane | Planned evidence | Independent oracle |
| --- | --- | --- |
| Backend update modes | Actual loopback HTTP and native Node Workers. | Stop new admissions before draining held work; report a real deadline without implicit escalation; observe ignored cancellation; reject a stale state-write proposal; await native Worker exit after an allowed force action. |
| Browser update modes | Real Chromium and native Web Workers. | Build a new TypeScript candidate after visible old behavior; preserve document and draft; reject failed or incompatible candidates; exercise drain, cooperative cancellation and a busy-worker stop; reject an already-received stale result. |
| Cross-language component | A narrow WIT world implemented by TypeScript and Rust, using actual WebAssembly Component Model tooling. | Validate and execute both implementations; capture an old host operation before selecting the new implementation; reject malformed, missing-import and schema-incompatible candidates while preserving application state. |

Use message and HTTP barriers for ordering. Timers represent actual deadlines
or bound a hung test; elapsed time is never proof of quiescence. Native Node and
browser Workers expose different completion evidence. The fixture's admission
gate must not be presented as an existing production reversible pause: OD-003
already records that production shutdown seals can be irreversible.

Candidates are predetermined disposable source. A captured host operation does
not migrate a running Wasm stack. The experiments do not qualify a complete
in-application LLM authoring loop, distributed rollout, shared-schema migration,
external-effect rollback, production artifact admission or hostile-code isolation.

## Proposed mode and runtime comparisons

Compare retaining old work while new calls select a new version, closing
admission and draining, cooperative cancellation, explicit force of an isolated
execution unit, and checkpoint/migration where supported. Each mode needs a
declared target, affected work, compatibility preconditions and observable
outcome. A deadline may invoke a named escalation policy authorized in advance; it must
not silently add permission or become successful completion.

Compare native TypeScript execution, Worker/process/RPC adapters and an optional
Wasm Component Model adapter before considering mandatory Wasm for all plugins.
Separate core Wasm, Component Model, WIT, WASI, Extism and a concrete runtime.
Multi-language guest support does not by itself require rewriting a TypeScript
host; portable guest contracts and host implementation are distinct choices.

Keep ordinary in-process module contracts narrow and consumer-owned. A wire
protocol or WIT world belongs at a demonstrated execution boundary, not between
every TypeScript module. Reuse Get Modular composition and native lifetime
mechanisms; introduce no second kernel, refcount, catalog or policy authority.

## Review, cost and delivery

Each lane receives a root plan review and an independent peer critique before
execution. Retain findings and dispositions, then independently review results
and the final synthesis. One aggregate-plan correction is already adopted:
forbid implicit or unauthorized force, while allowing an owner-selected policy to
authorize escalation in advance. The research does not impose a universal ban on such
automatic escalation.

Estimated new handwritten TypeScript: backend 420–580 lines (fixture 300–400,
tests 120–180); browser 350–500 (fixture 210–300, tests 140–200); component
280–430 (fixture/build 170–270, tests 110–160). Total 1,050–1,510 TS lines,
plus about 25 Rust and 20 WIT lines. Production code and real-product integration
are zero. Workflow, locks, generated artifacts and prose are separate. These
are research estimates, not implementation quotes for an entire platform.

Judgment scores, each out of ten, apply only to these bounded experiments:

| Lane | Complexity | Achievable reliability | Confidence before execution |
| --- | --- | --- | --- |
| Backend | 4 | 8 | 7 |
| Browser | 4 | 8 | 8 |
| Component Model | 6 | 8 | 8 |

Higher complexity means more burden; reliability scores are not uptime metrics.
Every new JavaScript-runtime source receives a strict TypeScript 7.0.2-or-newer
check. Inspect embedded compiler imports before executing candidate tooling.
The unchanged general local Foundation route embeds API Extractor's TypeScript
5.9.3 and remains unexecuted; the standalone Docs Protocol route and existing
required hosted checks retain their separate roles.

Commit and push each coherent checkpoint to existing Draft PR 55: this plan
and owner clarification, any frozen hosted-run inputs, then the completed
research and evidence. Preserve historical archives and original failed attempts.
Exact final source, completed checks and result limits will be recorded with
the final delivery; pending or skipped work is not successful qualification.

## Open questions and validation

Default update behavior, per-agent authority, escalation, session/dependency
boundaries, state migration and production runtime selection remain owned by
[OD-003](../open-decisions/OD-003-module-runtime-and-public-spi-choices.md).
The final report will record primary-source identities, actual toolchain paths,
executed observations, counterexamples and recommendations after the planned
experiments. This checkpoint claims no new runtime pass.
