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

## Investigation checkpoint: exact profiles matter

Source inspection and the first local probes identify three important limits.
These findings will be accompanied by the final source ledger and retained
experiment packet; they do not select a production adapter.

- Extism's JavaScript Host SDK is a separate implementation from the native
  Wasmtime-backed runtime. The repository pin is `@extism/extism@1.0.3`; npm's
  currently selected candidate is the prerelease `2.0.0-rc13`. Do not upgrade a
  consumer implicitly or transfer cancellation/memory guarantees between them.
  See the [JavaScript SDK](https://github.com/extism/js-sdk) and its exact
  [candidate source](https://github.com/extism/js-sdk/tree/bec25c60d0ad32ce06d3934563fd8560f486f323).
- The new wasmCloud `v2.12.3` source marks `wash-runtime` as an internal crate
  with `publish = false`, despite the embedding guide's dependency example.
  Embeddable source and a supported published library are different availability
  claims. Evaluate the supported host or a qualified pinned-source integration;
  distribution/support remains open. This updates the earlier recommendation,
  without rewriting its historical source observations.
  [Inspected manifest](https://github.com/wasmCloud/wasmCloud/blob/8358f1f56a66c43aedc49f30e2c5d4fa2b4f7ca1/crates/wash-runtime/Cargo.toml).
- State preservation depends on the actual renderer/VM and transform.
  Flutter's [retained initialization behavior](https://docs.flutter.dev/tools/hot-reload)
  cannot be projected onto React. The selected Oxc transform includes a
  `useState` initializer in the refresh signature, so a changed initializer is
  expected to remount in this specific profile.
  [Inspected transform](https://github.com/oxc-project/oxc/blob/75efdca4747c4ad9b252542743098d4894f8005b/crates/oxc_transformer/src/jsx/refresh.rs).

### Native browser experiment awaiting hosted execution

The new [frozen input manifest](evidence/plugin-reload-browser-input-20261122.manifest.json)
identifies a separate disposable React/Vite experiment. It exercises real
filesystem-driven HMR, actual DOM identity, a parent-owned draft, native event
listeners, a retained asynchronous callback, changed hook/initializer
signatures and failed raw-module activation. It reuses Vite and React rather
than implementing another loader or reconciler.

The exact profile is Node `24.22.3`, TypeScript `7.0.2`, Vite `8.3.8`,
`@vitejs/plugin-react@6.3.0`, React/React DOM `19.3.1` and Playwright `1.65.1`.
All TypeScript sources and changed variants pass the strict checker locally,
including dependency declarations. The local browser download was denied by the
environment; the subsequent native launch failed because the pinned executable
was absent. These are retained failures, not browser passes.

The [scoped research workflow](../../.github/workflows/plugin-reload-reuse-spikes.yml)
will run the same verified bytes on a standard native runner. Its result is
pending at this checkpoint. No result from the earlier browser Worker spike
is being relabeled as renderer/HMR qualification.

### First native outcome and preserved repair inputs

The [first native run](https://github.com/agent-teams-ai/extension-foundation/actions/runs/44961594670)
on `30b9823` failed while awaiting the second component update. The earlier
compatible-update assertions had completed, but the job log contains only one
HMR event. Artifact upload also failed because its path contained a literal
parent-directory segment. The original archive and manifest remain unchanged;
the complete native job log is retained for the final evidence packet.

The [second input manifest](evidence/plugin-reload-browser-input-20261122-v2.manifest.json)
records a bounded repair: write watched files in place, separate independent
edits by 100 ms to stay outside the selected watcher's 50 ms suppression window,
record actual watcher events, and print the result JSON in the job log as well
as its artifact. The workflow normalizes the artifact directory. The first
timeout's watcher explanation is a source-supported hypothesis because its
browser observation artifact was not uploaded; it is not a demonstrated React
failure. State, DOM, listener and rejection assertions remain the same.
Rapid source-write/coalescing reliability is outside this profile and remains
an explicit follow-up. The second native run is pending at this checkpoint.
