---
id: research.live-update-ready-stack-comparison
type: research
status: active
owner: architecture
summary: Compares complete update scenarios across ready stacks and candidate integration profiles without adopting unresolved adapters.
---

# Live Update Ready Stack Comparison 2026-11-23

<!-- cspell:words Piral pilets pilet OpenComponents Zephyr Softarc gitHead tsconfig MemoMap unrender -->

## Scope and authority

Observed 2026-11-23, Europe/Kiev. Repository baseline:
`7611e1a44542204d77e489a166f92a2e31b0020a`. This study answers whether the
researched module formats should be adapters or underlying mechanisms, and whether
our complete-operation library could provide substantial practical value compared
with strong ready stacks. **No new package installation, runtime experiment,
adapter adoption or policy selection was performed.**

The [current map](../architecture/live-extension-system-map.md) describes the
owner-confirmed TypeScript-first, standalone library direction. All seven
[owner questions](module-federation-update-boundaries-and-architecture-options-2026-11-22.md#owner-decision-matrix)
remain OPEN. A competitor's documented feature, an inspected source path, a
published package manifest and an executed consumer scenario are distinct evidence.

The full independent report, 40-entry source ledger and complementary native
resource-source review are preserved in the
[audit checkpoint](evidence/live-extension-audit-checkpoint2-20261123.tar.gz)
and [manifest](evidence/live-extension-audit-checkpoint2-20261123.manifest.json).
The proposed complete comparison below has **not** been executed on either our
future library or the competing stacks. Their sufficiency is UNKNOWN where the
source evidence does not establish the whole behavior.

## Evidence and lessons

### Existing project coverage and integration roles

| Mechanism | Role | What is already recorded for this project | Candidate seam, not an adoption commitment |
| --- | --- | --- | --- |
| Module Federation | Remote module loading, shared dependencies and delivery metadata | Detailed source study and four bounded native browser cases | Loader/delivery integration plus the actual consumer lifecycle |
| Native Federation | ESM/import-map federation with build and runtime responsibilities | Competition inventory, now a deeper v4 source/package review | Build/load integration after compiler, version and replacement semantics are qualified |
| Piral/pilets | Authoring contract, shell capabilities, UI contributions and lifecycle | Competition inventory, now pinned lifecycle/state/loader inspection | Existing-shell or authoring-format bridge where a real consumer needs it |
| Piral Cloud | Discovery, delivery and version/environment control | Official evidence of support for multiple formats | Version source/delivery integration; product authority remains explicit |
| OpenComponents | Versioned UI components, registry, template/client rendering | Competition inventory, now exact client lifecycle and package-cohort inspection | UI/delivery integration for the selected client/template profile |
| single-spa | Application/parcel composition and asynchronous UI lifecycle | Prior source study; current official lifecycle/helper contract checked | Reuse its renderer lifecycle instead of rebuilding it |
| Zephyr | Release management and specific client update flows | Prior value/MF studies; current Electron OTA and rollback documentation | Delivery/client-adoption integration within its declared platform scope |

An adapter can use a ready mechanism internally. These alternatives are not
mutually exclusive: a pilet can use Piral's
[existing Module Federation loader][piral-mf], while Piral supplies shell
capabilities and a feed supplies delivery. Supporting a foreign authoring API may
require semantic compatibility with that shell; reading a manifest is not enough.
The ordinary TS profile need not acquire every adapter as a core dependency.

Loader shared-module resolution is distinct from Get Modular's product-capability
composition. Native Federation's name concerns web-platform modules, not native
machine-code or Wasm guest execution. Extism, Component Model and native Effect
belong to different execution/contract profiles, as recorded in the system map.

### Strong ready-stack baselines

| Baseline | Ready mechanisms to credit | Full-scenario integration still to establish |
| --- | --- | --- |
| Piral + Piral Cloud + an existing loader | Shell API/data, registrations, setup/teardown, version selection and a ready MF loader | Candidate readiness, dirty-document continuity, admitted work and completion of the selected resource/recovery contract |
| single-spa + framework helper + MF + Zephyr | Promise-based UI lifecycle, renderer helpers, loading/sharing, release selection/rollback and specific OTA UX | One coherent transition across selection, client adoption, state, old work and cleanup |
| Native Federation v4 + a selected UI/state lifecycle | Builder/metadata, shared resolver, loading and staged cache rollback in the inspected sources | A valid same-plugin replacement profile, actual import-map acknowledgement, UI/state/work/resource integration |
| OpenComponents + a selected registry/template/client + shell | Component versions, delivery/rendering, client lifecycle and events | Exact client cohort, awaited readiness/cleanup where required, dirty state and server-effect boundaries |

The second row is a proposed composite baseline of available mechanisms, not a
claim that the entire combination is an already qualified vendor bundle. Every baseline
may use fitting existing state, resource and framework helpers. The last column
means **not established by this review**, not that the product cannot provide it.

### Pinned completion boundaries: where integration matters

**Piral.** Published `piral@1.12.5` metadata points to source
`15af4fd41e049b5880916af81e130cf22e6ac44b`. Its [add/inject path][piral-actions]
removes the same-name managed registrations and emits `unload-pilet` before
starting the new setup. That ordering does not establish completed predecessor
teardown.
[Setup][piral-setup] catches/logs errors; a fulfilled outer action is therefore not
by itself a successful application-readiness receipt. Existing cleanup already
removes managed contributions and calls teardown; the inspected
[cleanup path][piral-cleanup] does not await arbitrary asynchronous teardown.
The [shell state and registration APIs][piral-state] are useful existing mechanisms,
not functionality we should describe as absent. A bridge could strengthen the
selected contract; its cost and behavior are unmeasured here.

**single-spa and Zephyr.** The [single-spa lifecycle][single-spa-lifecycle] accepts
asynchronous functions and sequentially waits for returned promises. Framework
helpers already implement rendering lifecycle work. Its
[application APIs][single-spa-api] do not equate unregistering an application
with erasing every retained module reference. Zephyr's [Electron OTA guide][zephyr-ota]
already provides a prompt and in-place feature swap. It is explicitly Beta and
scoped to a Vite/React renderer feature; main, preload, native and app-shell changes
need an ordinary release. [Release rollback][zephyr-rollback] and actual adoption
by an already running client remain separate observations. None of these facts
establishes arbitrary editor-history or external-effect rollback.

**Native Federation v4.** The core builder and orchestrator are separate projects.
The inspected orchestrator source
`d1502d3b99e1164c79c0946296caad2cd9ee8068` already implements
[staged initialization][nf-init] and [rollback of staged records][nf-rollback].
Calling it only a fetch/import wrapper would omit existing recovery work.
Its [resolver contract][nf-resolver] preserves committed mappings during dynamic
initialization; a known remote is not replaced merely by initializing it again
with a different URL. The [commit step][nf-commit] treats an asynchronous import-map
setter's acknowledgement separately. These source-scoped completion semantics
must be reflected in a proposed adapter; they are not a general defect claim.

Published metadata identifies core **4.10.1** and orchestrator **4.10.2**, while
package manifests at the inspected source commits still say **4.10.0** and the
published metadata lacks `gitHead`. Source observations are therefore not asserted
as inspected npm tarball behavior. The [core compiler contract][nf-typescript]
and [published dependency metadata][nf-core-package] require TypeScript **>=5 <7**.
That build-core candidate conflicts with our TS >=7.0.2 execution policy; no old
compiler, dependency override or workaround was run. This does not reject every
runtime-only or separately qualified integration of the family.

**OpenComponents.** In browser client **2.1.13**, published `gitHead`
`806b6a08d16d583a75dcdc5adb3266076e615dfd` provides an inspectable
[client lifecycle][oc-client-source]. Disconnect handling waits a tick and avoids
teardown if the element was reconnected; when its lifecycle is enabled it invokes
the available unmount callback. This is existing useful behavior. The inspected
ESM mount and disconnect paths do not await an arbitrary returned promise, so
render/unrender events need a specific bridge before claiming stronger readiness
or cleanup completion.

Package cohorts also differ: `oc@0.50.67` refers to browser `^2.1.13` and Node
client `^4.0.4`, but `oc-client@4.0.4` fixes browser **1.5.4**. The 2.1.13 findings
must not be generalized to every server-rendered OpenComponents application.
Exact metadata, integrity and source limitations are in ledger entries M04–M06.

### Existing resource algorithms remain part of every fair baseline

Effect's current [v4 Scope documentation][effect-scope] distinguishes scope
finalization from forcing an unfinished task to interrupt. Its
[layer memoization][effect-memo] already supplies reference-based sharing and an
explicit MemoMap. Current [Node Worker documentation][node-worker] ties the
termination promise to the exit event. These mechanisms should be reused within
their real contracts; a separately dispatched host effect remains a different
lifetime. These are current documentation observations, not a new execution of
the retained Node24/Effect fixtures or a dependency upgrade.

### One complete, falsifiable consumer scenario

The proposed scenario uses the same trust, host and state contract for each
baseline and our library. It is a comparison fixture, not a production default.
The first actual product consumer remains to be named under the owning plan.

A running editor v1 has an unsaved document D1 at revision r1. An earlier accepted
operation is still running for r0. The current generation owns an identified
timer, listener and subscription. The user continues editing while v2 is prepared.
At minimum, specify document preservation and rejection of a stale overwrite.
Focus, selection, Undo, IME and collaboration enter the promise only if explicitly
included for the chosen editor/profile.

| Step | Required observable result | Failure or ambiguity to exercise |
| --- | --- | --- |
| Discover v2 | Exact eligible artifact/profile identified | A feed entry alone does not claim application adoption |
| Prepare | Actual evaluated candidate, acquired resources and readiness are known | Failure after acquisition; loaded code that fails application readiness |
| Apply | The user can perform a real changed action using v2 while promised document state remains | Version-label change without useful behavior; unknown publication result where the profile has one |
| Finish old work | r0 cannot silently overwrite newer D1; its accepted operation gets a truthful outcome | Late callback, stream continuation or independent host effect |
| Retain v1 | An explicit hold explains which continuation, resource or recovery need remains | Registry deletion while a live reference or old-client asset is still required |
| Clean up | v1 handles are released by their actual owners; v2 resources remain intact | Partial cleanup failure, wrong-generation disposal, unobserved stop |
| Reject a bad candidate | In a profile promising predecessor preservation, its old action still works; an exclusive handover has its declared fallback/defer/restart outcome | Useful fallback tested by behavior rather than stale pixels; truthful state/resource result |
| Recover after adoption | Code selection and client recovery respect current canonical data | Returning to old code after incompatible writes or committed external effects |

A compatible-overlap case may allow old admitted work to drain while new work
uses v2. An exclusive-resource case needs a different declared outcome, such as
defer, an authorized handover or targeted restart. The comparison must not select
one as a universal default. Repeated updates count actual owned handles within the
declared profile; they do not prove universal garbage collection or leak freedom.

### Practical differentiation to prove

The strong hypothesis is a **portable complete operation**, with existing
mechanisms behind it and a result a user or agent can act on. Its value would be:

1. One plan connects the affected dependency group, state consequences and actual
   supported update boundary before acting.
2. The operation handles candidate failure, publication conflict/uncertainty and
   cleanup recovery without requiring each consumer to reimplement the sequence.
3. Version observations distinguish delivery, selection, useful user behavior
   and retirement, including reasons for retained predecessors.
4. Independent adapters obey documented capability and completion contracts;
   an unsupported guarantee or required restart is explicit.

These are proposed product benefits, not new algorithm discoveries. Existing
stacks already supply many constituent mechanisms and some complete user flows.
The evidence does not establish uniqueness or superiority of our future library.

Measure consumer integration code separately from business logic, third-party
dependencies, our library implementation, adapter implementation and fixtures.
Count glue moved into a newly written adapter as work, rather than hiding it.
Use the same code-count convention and fixed scenario on both sides. Also record
integration steps, named failure outcomes, useful-adoption behavior and ability
to explain retained resources; a shorter sample with a weaker promise is not a win.

If a ready stack meets the full agreed scenario with small, stable integration,
the reusable library should stay correspondingly small and reuse it. If several
independent hosts repeatedly need the same substantial transition/recovery code,
that is stronger evidence for the proposed standalone operation. If the needed
authority or resource primitive is absent, fix or qualify its owning boundary;
no neutral facade can manufacture the guarantee.

## Open questions and validation

The next comparison needs a named real consumer and selected Q1–Q3 boundaries,
then the applicable Q4–Q7 behavior. Candidate baselines can be narrowed by that
consumer; there is no commitment to implement every format or platform first.
The comparison should include a second independent integration without copied
orchestration before claiming broadly reusable consumer benefit.

The previous **MF 4/4** and **SystemJS 2/2** remain bounded mechanism evidence.
There is no new Piral, Native Federation, OpenComponents, Zephyr or whole-stack
E2E result in this source study. User benefit, comparative integration cost,
long-term compatibility and commercial demand remain unmeasured. The existing
7/10 conditional start recommendation is not raised merely because this review
found more detailed mechanisms.

## Primary sources

The archive's `audit/stack-sources.json` records 40 source entries with exact
identities, npm integrity where available, evidence classes and limitations.
`audit/root-runtime-sources.json` adds the three current resource references.
The preserved full report supplies the extended comparison and source mapping.

[piral-mf]: https://github.com/smapiot/piral/blob/15af4fd41e049b5880916af81e130cf22e6ac44b/src/framework/piral-base/src/loaders/mf/index.ts
[piral-actions]: https://github.com/smapiot/piral/blob/15af4fd41e049b5880916af81e130cf22e6ac44b/src/framework/piral-core/src/actions/app.ts
[piral-setup]: https://github.com/smapiot/piral/blob/15af4fd41e049b5880916af81e130cf22e6ac44b/src/framework/piral-base/src/lifecycle/setup.ts
[piral-cleanup]: https://github.com/smapiot/piral/blob/15af4fd41e049b5880916af81e130cf22e6ac44b/src/framework/piral-base/src/lifecycle/cleanup.ts
[piral-state]: https://github.com/smapiot/piral/blob/15af4fd41e049b5880916af81e130cf22e6ac44b/src/framework/piral-core/src/modules/core.ts
[single-spa-lifecycle]: https://single-spa.js.org/docs/building-applications/
[single-spa-api]: https://single-spa.js.org/docs/api/
[zephyr-ota]: https://docs.zephyr-cloud.io/features/electron-ota-updates
[zephyr-rollback]: https://docs.zephyr-cloud.io/features/instant-rollbacks
[nf-init]: https://github.com/native-federation/orchestrator/blob/d1502d3b99e1164c79c0946296caad2cd9ee8068/src/lib/core/2.app/flows/init-remote-entry.flow.ts
[nf-rollback]: https://github.com/native-federation/orchestrator/blob/d1502d3b99e1164c79c0946296caad2cd9ee8068/src/lib/core/2.app/steps/rollback-changes.ts
[nf-resolver]: https://github.com/native-federation/orchestrator/blob/d1502d3b99e1164c79c0946296caad2cd9ee8068/docs/version-resolver.md
[nf-commit]: https://github.com/native-federation/orchestrator/blob/d1502d3b99e1164c79c0946296caad2cd9ee8068/src/lib/core/2.app/steps/commit-changes.ts
[nf-typescript]: https://github.com/native-federation/native-federation-core/blob/b3822259fb748eec1309f45d2c978134baf46785/docs/architecture/typescript-dependency.md
[nf-core-package]: https://registry.npmjs.org/@softarc/native-federation/4.10.1
[oc-client-source]: https://github.com/opencomponents/oc/blob/806b6a08d16d583a75dcdc5adb3266076e615dfd/packages/oc-client-browser/src/oc-client.js
[effect-scope]: https://effect.website/docs/v4/resource-management/scope
[effect-memo]: https://effect.website/docs/v4/requirements-management/layer-memoization
[node-worker]: https://nodejs.org/api/worker_threads.html
