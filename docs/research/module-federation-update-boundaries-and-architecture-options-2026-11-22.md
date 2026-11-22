---
id: research.module-federation-update-boundaries
type: research
status: active
owner: architecture
summary: Verified module delivery and runtime boundaries, industry update mechanisms, bounded experiments and explicit owner decision alternatives.
---

# Module Federation Update Boundaries and Architecture Options 2026-11-22

## Scope and authority

**Observed: 2026-11-22. Status: research in progress; first source checkpoint.**
The owner requests deeper Module Federation and adjacent industry investigation,
verified evidence and architecture preparation. Contested choices must remain
open until the owner sees alternatives and the best-supported recommendation.
The [owning clarification](../open-decisions/OD-003-module-runtime-and-public-spi-choices.md#owner-requested-module-federation-and-unresolved-alternatives-2026-11-22)
does not select a production runtime, sharing strategy, restart default or state
migration policy.

The accepted direction remains a standalone TypeScript control library with
ordinary TypeScript plugins, optional Wasm/Extism and native Effect profiles,
and a complete reusable update operation. Get Modular owns neutral composition;
the product owns authorization, canonical state and effect receivers. Existing
Resources mechanisms are reused where applicable. Private lifecycle code is not
copied or exposed through a new public SPI.

This study extends the [completed reliability investigation](live-update-reliability-and-industry-evidence-2026-11-22.md).
Previous native results retain their original source, assertions and limits.
Source inspection below is not an additional E2E pass. The historical Module
Federation verdict is non-operative and cannot settle this new comparison.

### Method and checkpoint

Four parallel lanes investigate Federation, desktop process/bridge boundaries,
browser delivery and loader behavior, and dependency rollout/object replacement.
Record official release identities, exact source paths, positive guarantees,
counterexamples and open qualification cases. Keep development-head behavior
separate from the released version. Plans and early evidence are preserved in
the [first checkpoint](evidence/module-federation-checkpoint1-20261122.json).

No production code or public contract is introduced. Candidate native probes
use actual published mechanisms, strict TypeScript at least 7.0.2, independently
reviewed assertions and frozen inputs. A dependency audit precedes execution.
Only a probe that can distinguish architecture alternatives is worth adding.

## Evidence and lessons

### First verified boundaries

| Mechanism | Evidence and supported behavior | Consequence to investigate |
| --- | --- | --- |
| Module Federation | Released runtime 2.9.3 and webpack 5.113.0 have separate registration, generated-container, share-scope and live-export identities. A new runtime instance is not a new JavaScript realm. The exact source ledger and native matrix are in the checkpoint. | Decide the replaceable unit and shared-platform ownership explicitly; qualify real generated containers before promising independent replacement. |
| Electron bridge | Electron 45.4.1 source rejects rebinding an existing contextBridge global key; exposed values are copied/frozen while functions are proxied. Session preload registration does not rerun on in-page navigation. | Renderer replacement and bridge evolution need separate compatibility/lifetime boundaries. Function delegation remains possible; no native Electron claim is made. |
| Electron IPC and termination | Removing a handler changes future lookup, while already-dispatched promise continuations have separate lifetime. The utility process implementation calls Chromium termination machinery; the return value alone is not a durable-state receipt. | Verify actual completion and final-state acknowledgement separately from registry removal or a kill request. Platform-specific termination details are still under review. |
| Envoy xDS | Stable 1.40.2 documents ACK as validity plus intent to apply, with later application failure possible. A NACK need not mean that every resource was rejected. Dependent updates require ordering; independently delivered resource types are eventually consistent. | Keep accepted, ready and serving observations separate. Validate a compatible dependency cohort before switching routing; do not infer an atomic commit from an acknowledgement. |
| Envoy hot restart | The new process initializes before accepting new traffic; old connections remain with the draining predecessor and are eventually completed or closed. Existing connections are not transferred to the new process. | Reuse process handover where appropriate, but specify affinity, drain bounds and fallback for long-lived work. This does not choose our interruption policy. |
| Unreal Live Coding | Epic documents Live++ binary patching and object instance replacement as separate mechanisms. Existing constructor-initialized values, retained pointers/caches and final destruction need explicit treatment. | Successful code replacement is weaker than compatible live-object replacement. UI/state preservation requires a supported adapter contract and observable limits. |

Primary references for the root lane are [Envoy 1.40.2 xDS](https://www.envoyproxy.io/docs/envoy/v1.40.2/api-docs/xds_protocol),
[Envoy 1.40.2 hot restart](https://www.envoyproxy.io/docs/envoy/v1.40.2/intro/arch_overview/operations/hot_restart),
and [Epic Live Coding](https://dev.epicgames.com/documentation/en-us/unreal-engine/using-live-coding-to-recompile-unreal-engine-applications-at-runtime).
Envoy release source is pinned to
`b2d89e0ae53916f28770771fbdd49c5c99c5c5a2`. Epic's unversioned documentation
changed its displayed version between retrievals; treat it as observed living
documentation, not a release-pinned binary qualification. The checkpoint pins
the Federation and Electron source revisions and records unfinished checks.

### Reuse warnings under examination

- **Loader replacement:** do not implement a second module resolver or shared
  dependency negotiator before qualifying Federation, native imports or SystemJS
  for the chosen profile. Their operation does not automatically retire escaped
  application objects and resources.
- **Lifecycle replacement:** existing loaders, single-spa and runtime scopes
  own useful mechanisms. Compare their real timeout, unload and cancellation
  receipts with the guarantee required by the caller before adding a wrapper.
- **Delivery replacement:** reuse deployment selectors and caching tools where
  suitable, while checking complete artifact closure, delayed old chunks and
  multiple live clients. A changed entry URL alone is not a coherent deployment.
- **Desktop replacement:** reuse Electron/Node process and application-updater
  boundaries; do not promise that a renderer-only operation changes preload,
  native modules, packaged files or the main process.
- **Readiness replacement:** reuse Get Modular planning and existing ownership
  contracts. Do not create a parallel dependency graph or treat a loader ACK as
  successful publication, state migration or user-visible readiness.

## Open questions and validation

The final comparison will offer two or three alternatives for each decision,
including a preferred option, evidence, cost and conditions that change the
recommendation. These are **not adopted defaults**:

1. Replaceable unit: independent plugin, dependency-compatible cohort or whole
   execution realm; consequences of shared singleton and service-token identity.
2. Runtime profile: same-realm trusted UI, replaceable realm/process, and which
   capabilities ordinary TypeScript versus optional Wasm adapters can promise.
3. Candidate preparation: when module evaluation can have effects and which
   existing authority boundary can prevent premature publication or stale writes.
4. User experience: immediate eligible changes, explicit preview/approval or
   session deferral; visible reasons for remount, restart and state reset.
5. Delivery and retention: support window for old clients/artifact closures,
   offline behavior, version coexistence and observable cleanup eligibility.
6. Failure and state: rollback versus compensation, schema compatibility,
   checkpoint ownership and bounds on draining old work.

The current probe candidates are real webpack-generated remote replacement and
released SystemJS relinking behavior. Their concrete plans need root/peer review
before execution; no native result is claimed at this checkpoint. Source facts
that are already decisive do not require an additional demonstration. Electron,
Envoy and Unreal remain source research unless a concrete unresolved claim
justifies a separate bounded plan.

Architecture preparation means retaining explicit variation points and avoiding
coupling to one loader's public types. It cannot guarantee that every future
runtime or incompatible state change will require zero refactoring. No speculative
universal interface or empty production package is created to imply otherwise.
