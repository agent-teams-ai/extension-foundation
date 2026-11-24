---
id: research.module-federation-update-boundaries
type: research
status: active
owner: architecture
summary: Verified module delivery and runtime boundaries, industry update mechanisms, bounded experiments and explicit owner decision alternatives.
---

# Module Federation Update Boundaries and Architecture Options 2026-11-22

<!-- cspell:words ASAR Rspack -->

## Scope and authority

**Observed: 2026-11-22.** This investigation adds exact Module Federation,
SystemJS, browser-delivery, desktop and industry evidence to the
[completed reliability study](live-update-reliability-and-industry-evidence-2026-11-22.md).
It does not adopt a production runtime or settle the owner's contested choices.
The [owner's clarification](../open-decisions/OD-003-module-runtime-and-public-spi-choices.md#owner-requested-module-federation-and-unresolved-alternatives-2026-11-22)
requires alternatives and recommendations at the end, not implicit defaults.

The confirmed direction remains a **standalone TypeScript library providing the
complete update operation**, ordinary TS plugins first, with optional Wasm/Extism
and native Effect profiles. Consumers supply narrow authority and state primitives;
they do not reconstruct orchestration. Get Modular keeps neutral composition,
canonical plans and digests. Product authorization, canonical data and effect
receivers keep their owners. Existing Resources/lifecycle mechanisms are reused
through supported boundaries; private kernel code is not copied or deep-imported.

Four source lanes and independent architecture/fixture reviews distinguish:
released-source facts, living documentation, historical incident reports, native
observations, design inferences and owner choices. The historical MF verdict is
non-operative. Prior qualified native results retain their original inputs and
limits; this investigation does not count them again.

No production/library code or public SPI is introduced. The new maintained
TypeScript consists of 216 SystemJS fixture/build/harness lines and 520 Federation
lines. These measured fixture sizes do not estimate the eventual library.
The existing repository's accepted FMS v1 pin is unchanged; a separate project's
adoption scope still needs its own record.

## Evidence and lessons

### 1. What Module Federation already solves

Federation supplies substantial independent-build, remote/chunk loading and shared
dependency machinery. Reimplementing its resolver or containers is unnecessary
for a qualified profile. It does not by itself provide the complete application
operation covering authority, state compatibility, publication, resource
retirement and useful user-visible behavior.

| Reviewed profile | Exact baseline | Scope distinction |
| --- | --- | --- |
| Standalone MF runtime | 2.9.3; `40688424f13ea9d4338b9a0cf230e8f1ac4d3835` | Runtime registration, hooks and sharing; enhanced build integrations are additional components |
| webpack built-in containers | 5.113.0; `e9f0c9b25456ae5d80739ba7f498ae5b623ca194` | Actual generated container and consume runtime used in the browser probe |
| Rspack family | Reviewed 2.3.3 docs/release | MF1.5 is an integration-family label, not necessarily the runtime-tools package version |
| JupyterLab consumer | 4.6.6; `8d57791d0254820dfa4a540e010105803e128bcd` | Its lock pins builder 1.0.0-beta.1, Rspack 2.0.2 and runtime-tools 2.4.0; it is not our native fixture |

The real-consumer distinction matters. Separately released `@jupyter/builder`
1.3.0 explicitly selects the V1 integration and explains its preference for a
warning/host-version fallback in one non-singleton, no-local-fallback case.
That maintainer rationale is not a reproduced MF2 defect and does not authorize
either permissive or strict behavior for this library. Pin the producer and
consumer profiles together. [JupyterLab lock](https://github.com/jupyterlab/jupyterlab/blob/8d57791d0254820dfa4a540e010105803e128bcd/yarn.lock),
[builder source](https://github.com/jupyterlab/jupyter-builder/blob/326b62a97413b96feb1e28791292122a7076afe2/src/extensionConfig.ts).

### 2. Four boundaries that change replacement semantics

| Boundary | Verified mechanism | Consequence for the complete operation |
| --- | --- | --- |
| Runtime mutation vs application publication | In MF 2.9.3, one forced-registration path removes A before replacement alias validation can throw | A rejected registration can already have changed lookup. Report actual selection, retained A work and recovery separately. |
| Loading vs candidate execution | Ordinary loading evaluates the exposed factory; `loadFactory:false` defers it after entry/init/get work | Useful deferral exists, but the preceding stages are not proven inert. A preview/prepare contract must state permitted effects. |
| Shared identity vs implementation revision | Compatible consumers can share one token object; a loaded singleton can constrain later choices and strict incompatible consumption rejects | A shared dependency change may enlarge the compatible update group. Semver alone does not prove state/protocol compatibility. |
| Runtime instance vs execution environment | A new runtime object can target an already initialized generated container that rejects another share-scope object | A runtime object is not a fresh realm. Container/global/chunk/scope/export identities must remain distinguishable where relevant. |

Primary source: [forced registration](https://github.com/module-federation/core/blob/40688424f13ea9d4338b9a0cf230e8f1ac4d3835/packages/runtime-core/src/remote/index.ts),
[factory loading](https://github.com/module-federation/core/blob/40688424f13ea9d4338b9a0cf230e8f1ac4d3835/packages/runtime-core/src/module/index.ts),
[generated container](https://github.com/webpack/webpack/blob/e9f0c9b25456ae5d80739ba7f498ae5b623ca194/lib/container/ContainerEntryModule.js).
The retained listener in the probe demonstrates explicit resource ownership;
it is not a measured memory leak or a broken cleanup guarantee promised by MF.

The corrected hosted profile passed **4/4 native tests, zero failures or skips**
on Node 24.22.3, TypeScript 7.0.2 and Chromium 159.0.8154.6. Root and an independent
audit verified the ZIP and all eleven frozen executable/configuration inputs.
N1 observed B evaluating while A was still selected, retained A references and
listener, then explicit listener cleanup; factory deferral preserved the positive
control. N2 observed the concrete alias rejection, missing public lookup and
working retained A, followed by explicit re-registration. N3 shared the actual
host token and rejected the incompatible consumer. N4 observed distinct runtime
and scope objects targeting the same container, its rejection and fresh-context
success. [Hosted run](https://github.com/agent-teams-ai/extension-foundation/actions/runs/45054452281),
[raw ZIP](evidence/module-federation-v2-hosted-attempt2-20261122.zip),
[audit receipt](evidence/module-federation-v2-hosted-attempt2-20261122.json).

JupyterLab is useful positive evidence: providers and consumers require the same
service-token object, so contract-package sharing can be necessary for correctness.
A required consumer can rely on its provider's bundled token package; an optional
consumer cannot assume that provider exists. Its bootstrap initializes containers
before main application consumption, then registers plugins/styles separately.
Package, container, plugin and style units need not coincide.
[Official extension guide](https://jupyterlab.readthedocs.io/en/stable/extension/extension_dev.html).

Keep two narrower source lessons. Loaded-first avoids eager entry initialization
through a particular sharing path, but explicit preload/bootstrap can still load
entries; error hooks also prevent a universal offline-startup theorem. JupyterLab's
five-second activation timer is a slow-stage warning, not a cancellation deadline.
Neither behavior selects this library's interruption policy. The source packet
retains the exact branches and qualifications.

### 3. SystemJS supplies a useful real replacement primitive

Released SystemJS 6.15.1 returns a reconnect callback after successful deletion.
After loading B, that callback reconnects existing importer setters. Public API
prose still describes a Boolean; released source and published declarations
establish the richer result. [Pinned registry source](https://github.com/systemjs/systemjs/blob/17c238ec00cf7c4bcabcf3579f876513fcedba30/src/features/registry.js).

The native Node probe passed **2/2**, with no failures or skips. It observed the
existing importer reading A before the callback and B afterwards, while an escaped
namespace, old function and initially captured function retained A. Callback
guards returned false; success returned undefined. Deletion was refused during
real pending evaluation, and the original import completed after its gate opened.
[Raw results](evidence/systemjs-rebinding-v1-attempt1-20261122.tar.gz),
[receipt manifest](evidence/systemjs-rebinding-v1-attempt1-20261122.manifest.json).

This changes the reuse assessment: there is an existing binding mechanism to
qualify. It does not prove an application graph transaction, state migration or
resource cleanup. The source's setter loop has no rollback around an exception;
that exceptional path was not fabricated with private hooks or counted as a
native failure. The historical failed-link deletion issue was fixed in 2020,
not rediscovered here as a current regression.

### 4. Delivery and UI adoption have separate lifetimes

| Mechanism | Useful existing behavior | Boundary to preserve |
| --- | --- | --- |
| Native import maps | Multiple maps can add eligible resolutions | Prior conflicts and already-resolved mappings are protected; identity is local to a module map/environment. Changing an entry query does not rewrite dependency URLs. |
| import-map-deployer 7.0.0 | Ready publication/IO tooling | The inspected path uses a process-local lock; default S3 reads/writes do not establish distributed compare-and-swap, and JSON/JS outputs are separate writes. |
| S3 conditional writes | Existing If-Match/If-None-Match support | Single-object consistency is not a multi-object transaction or client adoption receipt. |
| Workbox 7.4.1 | Worker waiting/control events, messaging and precache management | An external controlling event differs from the promise for one's own worker. Cache cleanup can remove old generation assets; activation does not remount old pages. |
| Angular 22.3.0 | Manifest asset versions and client-to-version assignments allow simultaneous versions | Lazy resources, assets without hashes, eviction, degraded modes and inactive clients limit the guarantee. |
| Vercel Skew Protection | Deployment affinity for eligible requests | Cookie scope spans tabs; top-level navigation chooses current deployment; cross-origin IDs require configured eligibility. Missing/expired deployments have fallback behavior. |
| Scoped custom-element registries | Ready support for separate definitions in supported browsers | An initialized node's registry and existing instance are not replaced by `upgrade()`. Use a qualified new subtree/lifecycle boundary. |
| Framework/style mechanisms | Framework mount/unmount, CSS Modules, Shadow DOM and adopted stylesheets | Shared styles remain shared state; scope is not an ownership or physical-process guarantee. |

Sources: [publisher modify path](https://github.com/single-spa/import-map-deployer/blob/5cc181ae23c55750b403325b299ea40609a00393/src/modify.js),
[S3 adapter](https://github.com/single-spa/import-map-deployer/blob/5cc181ae23c55750b403325b299ea40609a00393/src/io-methods/s3.js),
[conditional writes](https://docs.aws.amazon.com/AmazonS3/latest/userguide/conditional-writes.html),
[Workbox](https://github.com/GoogleChrome/workbox/blob/62b9d8ba8eb3c1a2ab8aac9d84c90cda7865d6a3/packages/workbox-window/src/Workbox.ts),
[Vercel](https://vercel.com/docs/skew-protection),
[custom-element specification](https://html.spec.whatwg.org/multipage/custom-elements.html).
These delivery/DOM cases are source research, not new native browser tests.
Vercel and specification pages are living sources; the dated ledger preserves
their observed scope without claiming an immutable provider guarantee.

Angular provides a particularly useful supported pattern. A version groups the
required asset set and keeps client assignments. Its driver also handles worker
script affinity, while cache cleanup acknowledges that active-client discovery
may miss back-forward-cache clients. This is a source caveat, not a reproduced
bug. The documented unrecoverable case combines eviction of an old lazy chunk
with deletion of its server copy; a cache is therefore not an indefinite
availability promise. Activating B without reloading can also mix it with an
executing A shell. [Driver](https://github.com/angular/angular/blob/53ef99a543e037b64c596e9c3e147cb365062cea/packages/service-worker/worker/src/driver.ts),
[update communication](https://angular.dev/ecosystem/service-workers/communications).

Do not silently require a service worker or a particular hosting provider. The
open requirement is the supported client/version window, including delayed
imports and offline recovery. Reuse the host's delivery mechanism when it fits.

### 5. Desktop and native changes need truthful update scope

Electron 45.4.1 distinguishes renderer, installed preload contract, main authority,
utility-process lifetime and packaged host. The default contextBridge copies and
freezes supported values, proxies functions and rejects rebinding an existing
global key. A proxy may still delegate to mutable implementation: a stable bridge
can evolve behavior within a deliberately supported contract. A renderer remote
does not install a new bridge or main/native binary.
[Pinned bridge](https://github.com/electron/electron/blob/deaded07eebdfe9a3737884933b1acbe65971f64/shell/renderer/api/electron_api_context_bridge.cc).

Removing an IPC handler changes future lookup, not admitted promises/effects.
Frame/document identity and process-attempt identity must be meaningful when
checking current authority. Utility-process separation is useful for lifetime
and crash handling, but is not by itself a permission sandbox.

The strongest incident chain is precise: original message-draining fix #54924
was backported as #54956; original acknowledgement restoration #55082 was
backported as #55123. Draining messages already received by the parent did not
make posting immediately before child exit reliable. Current tests restore an
ordered-channel barrier and parent ACK. Browser shutdown has a separate path
that drops messages and can emit exit zero while a child is still starting or
running. Neither exit zero nor transport delivery certifies persisted state.
[ACK restoration](https://github.com/electron/electron/commit/0f79472f0bdf27e4977e5c89f5bacb2957650f7e),
[released utility source](https://github.com/electron/electron/blob/deaded07eebdfe9a3737884933b1acbe65971f64/shell/browser/api/electron_api_utility_process.cc).

Reuse Node-API/context-aware cleanup, Electron rebuild/process tooling and the
supported application updater where appropriate. ABI stability does not guarantee
that a native module can be unloaded. ASAR integrity is not authorization for external plugins; the
inspected unpacked-file path has different coverage. Full OS signing and the
actual distribution channel were not audited. Desktop details stay in adapters,
with explicit host compatibility and state receipts; no desktop native test ran.

### 6. Other industry mechanisms worth carrying forward

**Envoy 1.40.2:** ACK means resource validity and intent, with later application
failure still possible; NACK does not imply every resource was rejected. Its
dependency sequence introduces the new target before switching routes and retiring
the old target. Existing warming machinery helps, but resource types differ.
The response nonce belongs to one stream/resource type, not durable application
authority. Hot restart initializes the successor while existing connections stay
with the draining predecessor and eventually complete or close; connections are
not transferred. [xDS](https://www.envoyproxy.io/docs/envoy/v1.40.2/api-docs/xds_protocol),
[hot restart](https://www.envoyproxy.io/docs/envoy/v1.40.2/intro/arch_overview/operations/hot_restart).
The study explicitly rejected copying development-head field semantics into the
reviewed stable release. No Envoy native run or interruption default is adopted.

**Unreal Live Coding:** Live++ binary patching and reflected instance replacement
are distinct. Existing constructor values, pointers, caches and destruction need
specific treatment. This is useful development-workflow experience for supported
state preservation, not evidence for arbitrary production object migration.
The unversioned page changed its displayed engine version between retrievals;
only the observed documentation is claimed.
[Epic documentation](https://dev.epicgames.com/documentation/en-us/unreal-engine/using-live-coding-to-recompile-unreal-engine-applications-at-runtime).

### 7. Architecture seams justified now

These are proposed responsibility boundaries, not new public interface or package
names. The complete library operation coordinates them once; a consumer does not
receive a callback kit that it must assemble into a correct update algorithm.

| Keep separate | Concrete variation it supports | Owner/mechanism to reuse |
| --- | --- | --- |
| Inert declaration/plan and executable preparation | Literal TS loader, Federation entry, SystemJS module, Wasm artifact | Get Modular plan plus selected loader/admission boundary |
| Composition and actual compatibility evidence | Shared token/provider, state version, exclusive native resource | Existing topology plus product compatibility rules; no second graph authority |
| Runtime lookup and selected application generation | A runtime can mutate then reject while old references still work | Complete library operation and authoritative selection primitive |
| Operation admission and subsequent continuation | Direct call, callback, stream or worker request | One compatible invocation context and actual resource scope |
| Canonical data and transient runtime/view state | Stable feature state, framework retention, checkpoint or reset | Existing product state owner and concrete codecs/adapters |
| New admission and old retirement | Compatible draining, exclusive handover or allowed isolated termination | Existing executor/resource owner with precise receipts |
| Artifact availability and client adoption | Old tab, worker, delayed chunk, desktop host compatibility | Storage/deployment and host adapters |
| Mechanical success and useful changed behavior | Loaded, mounted, displayed, degraded, recovery required | Consumer-specific readiness evidence and a library result projection |

A stable facade that resolves `current` on every internal call can mix A and B
inside one operation. Preserve an appropriate operation context through dependent
calls and stream consumption where consistency requires it. This does not select
a universal invocation protocol or require serializing ordinary direct TS calls
merely to anticipate Wasm.

Preparation can execute code and exclusive resources can prevent two ready
generations from coexisting. Model a declared handover/unsupported result instead
of promising a universal two-phase transaction. A same-realm loader, process host
and Wasm adapter must not hide different stop guarantees behind identical success.

Account for capacity consumed by predecessors, failed candidates, pending creation
and incomplete cleanup. Use existing admission/retention owners; do not add a
parallel counter or journal. Unknown escaped references require a narrower
guarantee, a larger restart boundary or a reported unsupported operation.

For the user, distinguish desired revision, selected revision and actual displayed
revision when they differ. Show the affected group, promised state continuity,
remaining work and the reason for a deferred/remount/restart outcome. A slow-stage
warning is distinct from cancellation; a rollback action needs compatible state
and authority. This is a proposed experience contract, not an implemented UI.

### 8. Warnings against accidental duplicate mechanisms

| Warning | Reuse first | Residual work that can justify library code |
| --- | --- | --- |
| Do not write another loader/shared resolver | Native imports, exact MF profile, SystemJS | Translate actual load/evaluation evidence and capabilities |
| Do not create another dependency graph or plan digest | Get Modular | Combine its plan with declared runtime/state constraints |
| Do not rebuild resource scopes/supervisors | Qualified Resources, native Effect, host process mechanisms | Coordinate the existing owner's lifecycle and receipts |
| Do not replace canonical authority with an import-map registry | Product state/head primitives, selected conditional-write mechanism | Portable orchestration and honest conflict/recovery results |
| Do not invent a distributed selector lock | Storage conditional writes and suitable publishers | Closure selection, adoption and retention policy integration |
| Do not build a framework-independent object migration engine | Concrete framework lifecycle and supported state codecs | Preserve the specifically promised draft/view context |
| Do not recreate worker update notifications | Existing Workbox or host integration | Explain per-client adoption and restore requirements |
| Do not treat artifact deletion as user-state deletion | Existing state/custody and retention policy | Report remaining holds and separate cleanup authorization |
| Do not make a new native/desktop updater | Electron/Node/platform mechanisms | Compatibility, artifact admission and state handover |
| Do not freeze every future adapter/package now | A real first consumer and proportional conformance | Materialize only boundaries with concrete variation and evidence |

The reuse review does not suppress the new library's own application responsibility.
There is still one complete update operation to implement. Private lifecycle
publication gaps are explicit integration gates, not permission to copy internal
code or push orchestration back to each consumer.

## Open questions and validation

### Owner decision matrix

Q1–Q3 are needed before choosing the first trust/update/state boundary. Q4–Q7
are needed before promising product behavior; a research probe can use an explicit
configuration without turning it into a global default.

| Question | Alternatives | Preferred direction to discuss, and what changes it |
| --- | --- | --- |
| Q1. Trust of the first execution profile | A: trusted TS in the application environment. B: trusted UI with separately constrained plugin logic. C: independent third-party UI immediately. | A if the first consumer runs its own trusted code; B/C immediately if independently supplied code is a first-release requirement. Preserve the seam, without pretending a process alone defines permissions. |
| Q2. Shared dependencies and update unit | A: small named shared platform/contracts, with compatible dependent groups. B: independent environments and their own dependency generations. | A for integrated UI and shared token identity. B when independent versions matter more than direct integration. No allowlist or compatibility policy is selected. |
| Q3. State continuity | A: preserve data/draft, permit declared view reconstruction. B: preserve a specified richer focus/selection/Undo contract for selected editors. | B for one primary editor, A elsewhere initially. Actual Undo/IME/collaboration requirements can change the scope. Canonical-state ownership is fixed in either option. |
| Q4. When changes become visible | A: automatically apply eligible compatible changes, expose disruptive impact separately. B: preview/apply each change. C: pin active sessions to an explicit boundary. | A fits live adaptation, with B/C available by product policy. The owner still chooses eligible automatic changes; same-realm candidate execution is not automatically a safe preview. |
| Q5. Already admitted work | A: new work uses B while compatible A work drains. B: wait for a safe boundary, then permit specified cancellation/restart when authorized. | A is a candidate ordinary default only for compatible operations; B for named exclusive/incompatible cases. No deadline automatically grants force; emergency revocation retains its existing authority. |
| Q6. Meaning of returning to an old version | A: retain A before publication; return after publication only when state remains compatible. B: selected features support stronger checkpoint recovery. | A for the first general operation; B only with a real recovery contract. Old bytes are a new authorized operation/generation, not a rewind of authority or external effects. |
| Q7. Supported old clients | A: independent tab/session versions within a declared support window. B: short coexistence followed by coordinated transition. | A for long working/editor sessions, B for short stateless panels. Duration, offline budget and limits need workload evidence; cached assets do not extend execution permission. |

The complete Russian alternatives and independent review are preserved in the
[portable supplement](evidence/module-federation-research-supplement-20261122.tar.gz).
These questions do not reopen TS-first, optional execution
profiles, the complete library operation, canonical product state or Get Modular
ownership. Exact wire format, all future adapters, package count and SSR/desktop
breadth can wait for a concrete consumer. Ordinary-library qualification, a
production host and publication of a public extension SPI remain distinct gates.

### Executed evidence and remaining qualification

| Profile | Result | Actual limit |
| --- | --- | --- |
| SystemJS 6.15.1 / Node 24.22.3 / TS7 / Rollup | One native attempt, 2/2 passed, zero skips | Module binding mechanics; no browser or library E2E claim |
| MF v1 local preparation | Strict check and actual webpack build passed; browser setup blocked | Zero semantic cases executed; preserve four setup-hook failures |
| MF v2 first hosted run | Four native tests passed; artifact upload failed | Raw job log retained; detailed observations unavailable from this run |
| MF v2 corrected hosted workflow | 4/4 passed, zero skips; ZIP delivered and verified | Same frozen inputs/assertions; only workflow path normalization and browser launch diagnostics changed |
| Earlier backend/editor/Wasm/Effect evidence | Original immutable results carried forward | No duplicate counts and no automatic qualification of new profiles |

The successful MF artifact has 47 members and five observation rows: N1–N4 plus
the N4 fresh-context control. Those are four tests, not five. All 27 recorded
fixture requests returned 200, and every observation has no page error. Browser
version comes from the launched browser. The receipt's `browserExecutable` field
is the Playwright API default path; the captured launch diagnostic establishes
that headless shell revision 1255 actually ran. No performance, garbage-collection,
security, other-browser, Rspack, SSR, Electron or whole-library E2E claim follows.
The first hosted run is a retained delivery failure, not another four unique tests.

Further production claims need the corresponding real consumer: complete update
operation across independent adapters; candidate side-effect admission; shared
dependency change; stale callback/stream and receiver authority; retained-version
capacity; compatible/incompatible state and undo history; old lazy assets across
tabs/offline return; actual bridge/native host transition; and useful UI adoption.
These are named gaps, not authorization to implement every profile now. The
prior Extism strict-declaration and private lifecycle/publication gaps remain
explicit in their original study.

### Preserved checkpoints and transfer

The [167-file supplement](evidence/module-federation-research-supplement-20261122.tar.gz)
and its [per-file manifest](evidence/module-federation-research-supplement-20261122.manifest.json)
retain the four final source lanes, owner alternatives, independent reviews,
frozen fixtures, raw native evidence and original failures. Its reading copies
originate at `52810c469783c77f852ee2a62be74ec259867747`; later archive publication
does not change the source identities that produced the results.

Use it alongside the unchanged
[532-file standalone base](evidence/standalone-live-library-deepening-20261122.tar.gz).
Extract the two packets into separate sibling directories: the supplement is not
an overlay and does not replace the base's seed, manifest or accepted decisions.
The supplement README records reproduction profiles and license/provenance scope.

- [First source checkpoint](evidence/module-federation-checkpoint1-20261122.json).
- [Four-lane source and review checkpoint](evidence/module-federation-checkpoint2-20261122.tar.gz) and [manifest](evidence/module-federation-checkpoint2-20261122.manifest.json).
- [SystemJS frozen input](evidence/systemjs-rebinding-v1-input-20261122.tar.gz) and [manifest](evidence/systemjs-rebinding-v1-input-20261122.manifest.json).
- [Federation v1 input](evidence/module-federation-v1-input-20261122.tar.gz) and [manifest](evidence/module-federation-v1-input-20261122.manifest.json).
- [Original local browser failure](evidence/module-federation-v1-local-attempt1-20261122.tar.gz) and [manifest](evidence/module-federation-v1-local-attempt1-20261122.manifest.json).
- [Federation v2 input](evidence/module-federation-v2-input-20261122.tar.gz) and [manifest](evidence/module-federation-v2-input-20261122.manifest.json).
- [First hosted attempt with failed artifact delivery](evidence/module-federation-v2-hosted-attempt1-20261122.tar.gz) and [manifest](evidence/module-federation-v2-hosted-attempt1-20261122.manifest.json).
- [Successful hosted raw artifact](evidence/module-federation-v2-hosted-attempt2-20261122.zip), [delivery audit](evidence/module-federation-v2-hosted-attempt2-20261122.json) and [independent semantic review](evidence/module-federation-v2-semantic-review-20261122.json).

The [dedicated hosted workflow](../../.github/workflows/module-federation-research.yml)
uses pinned actions and exact dependency/compiler identities. Its upload step runs
even after earlier failure; delivery and ZIP contents require independent checks.
Original failures are preserved instead of overwritten. Existing
qualified workflows and earlier sealed transfer packets remain unchanged.

Architecture readiness here means explicit, evidenced variation points and less
coupling to a chosen mechanism. It is not a guarantee that every future runtime
or incompatible state change will require zero refactoring.
