---
id: research.reuse-first-live-updates
type: research
status: active
owner: architecture
summary: Investigates existing plugin runtimes, granular live updates, resource ownership and TypeScript-first optional WebAssembly boundaries with explicit uncertainties and bounded qualification.
---

# Reuse First Live Plugin Updates 2026-11-22

## Scope and authority

**Owner clarification: 2026-11-22, Europe/Kiev.** The remembered library is
[Extism](https://extism.org/), explicitly confirmed by the owner. Evaluate it
alongside existing component tooling before writing equivalent mechanisms.
The owner asks for a deep source review, disposable experiments, actionable
warnings about duplicated responsibilities, and immediately pushed checkpoints.

The preferred direction to investigate is ordinary TypeScript plugins first,
with a narrow optional adapter for other languages through WebAssembly. Make
future replacement boundaries, state and resource ownership explicit now.
This does not request a complete Wasm implementation, a universal plugin API
or an application rewrite. The owning
[clarification in OD-003](../open-decisions/OD-003-module-runtime-and-public-spi-choices.md#owner-requested-reuse-first-design-and-granular-updates-2026-11-22)
separates this direction from unresolved production choices.

This study extends the [November 21 experiments](live-update-policies-and-portable-runtimes-2026-11-21.md)
and the [existing mechanism inventory](reusable-generation-mechanisms-and-ownership.md).
Historical inputs and receipts remain immutable. Source inspection, an upstream
test assertion, a local observation and a real product qualification are separate
evidence classes. At this first checkpoint, new experiments are planned, not
passed. The existing controlled-restart baseline and accepted ADRs remain intact.

## Questions that can change the design

| Question | Evidence sought | Decision consequence |
| --- | --- | --- |
| Which Extism guarantees belong to the selected JS SDK, rather than another host implementation? | Exact released API/source, native execution, pending-call and disposal probes. | Advertise only actual adapter capabilities; do not import Wasmtime guarantees into a JS engine. |
| Can native TypeScript and a Wasm implementation satisfy one narrow consumer contract? | Real SDK calls with structured validation, independent expected results and host-owned state. | Preserve a useful execution seam without turning every module into a wire protocol. |
| Which module changes can preserve state, remount one component or require restart? | Flutter/Dart, React refresh, Vite, VM and IDE primary sources; rejecting traces. | Expose the supported boundary and affected dependency closure instead of one hot-reload boolean. |
| What happens when an update changes resources, initialization or hook signatures? | Actual lifecycle/resource ownership and failure-path evidence. | Distinguish retained state from compatible state and owned cleanup from global teardown. |
| Which existing owners already provide the required mechanisms? | Repository paths, current published packages and scoped adoption decisions. | Reuse composition, scopes, execution, transport and recovery before adding residual policy. |
| What would falsify the recommended architecture? | Candidate failure, stale continuation, dependency mixing, cleanup collision, non-cooperative code and uncertain effects. | Retain explicit limits or choose a larger restart boundary when a smaller update cannot be qualified. |

## Reuse warnings to carry into the review

The [existing ownership register](plugin-system-research-reference.md#keep-the-three-implementation-boundaries)
already assigns composition to Get Modular, product contracts and lifecycle to
their consuming owners, and artifact/trust obligations to Extension Foundation.
The audit will identify exact code or decision paths and the remaining policy
for each warning. These are research questions, not a second architecture owner.

1. Do not turn qualification models into a new production plugin manager.
2. Do not write a Wasm engine, ABI bridge or SDK binding already supplied by a
   selected qualified runtime or generator.
3. Do not add another graph compiler, lifetime counter, process supervisor,
   task queue, transport, migration engine or artifact catalog without naming
   the existing owner and the concrete missing behavior.
4. Do not describe development HMR as production update, state migration,
   transactional rollback or physical resource release without separate evidence.
5. Do not make a portable adapter report stronger cancellation, isolation or
   cleanup guarantees than its exact runtime can observe.

## Open questions and validation

The ordinary update default, affected dependency boundary, agent grants,
escalation, state migration and production runtime remain open in OD-003.
The study will record confidence, complexity and achievable reliability for
the same bounded scenarios, plus separate implementation and test costs.
Unverified claims will retain a specific next experiment or source question.
Checkpoint publication does not turn an investigation into an adopted design.
