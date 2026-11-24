---
id: architecture.plugin-delivery-plan
type: architecture
status: proposed
owner: architecture
summary: Current plugin delivery responsibilities, headless boundaries, open contracts and evidence gates separate from the shared live-update operation.
---

# Plugin Delivery Plan

## Purpose

**Delivery map dated 2026-11-24.** This is the plugin-specific workstream for
Extension Foundation. The shared [foundation delivery plan](https://github.com/agent-teams-ai/live-module-updates/blob/4cf4ca714f7ec6788417fcda1a75677615827dff/docs/plans/foundation-delivery-plan.md)
in Live Module Updates owns the cross-repository sequence and proposed complete
update operation. Its proposed consolidation was published in
[PR #1](https://github.com/agent-teams-ai/live-module-updates/pull/1); the fixture-first
qualification successor is tracked in [PR #2](https://github.com/agent-teams-ai/live-module-updates/pull/2).
Keep the two plans linked; do not copy the whole operation roadmap here.

The owner wants user- and agent-authored plugins that persist across restart,
can be shared or transferred between applications, and can be enabled, disabled
or removed. Eligible built-in features should expose deliberate replacement
boundaries. Preserve this direction when creating new modules without treating
every helper as an independently installed plugin or promising arbitrary code
replacement. The [owner record](../open-decisions/OD-003-module-runtime-and-public-spi-choices.md)
retains the vision and the choices that remain open.

**Fixture-first clarification, 2026-11-24:** qualify the foundation through
realistic test capabilities and independent test Hosts before applications are
ready. The fixture owns a concrete semantic contract, useful operation and
observable failure cases; it need not become a product. Browser, Desktop and
untrusted extensions constrain the architecture now. Successful execution,
isolation and later product adoption each retain their own evidence.

Current implementation status is **architecture and bounded qualification
research**. The package catalog has no production packages; there is no released
public extension SPI or complete production plugin Host. Test helpers are not
shipping admission, installation or lifecycle implementations. The November 23
70–75% rubric concerns bounded live-update planning, not plugin completion.

## Boundaries

| Owner or role | Owns | Boundary |
| --- | --- | --- |
| Portable feature core | Reusable behavior and narrow semantic ports | No imports from a consuming product's internal domain model, UI framework, organization credentials, internal catalog or GM construction types |
| Get Modular | Neutral composition grammar, validation, construction and its qualified public mechanisms | No artifact trust, business grants, product canonical state or universal plugin runtime |
| Consumer composition adapter | Concrete declarations, profiles and mapping from core ports to GM and product services | Keep framework types at this edge; no second graph or service locator |
| Extension Foundation | Artifact identity, trust, distribution, installation/admission vocabulary and separately qualified extension primitives | No consumer domain model, duplicate composition core or implicit public SPI |
| Product feature and Host | Product authority, canonical state and transactions, grants, loading, admitted execution, migrations and actual custody | An artifact or successful construction does not authorize a product effect |
| Live Module Updates, proposed | Shared implementation of a supported complete update operation | Reuses the real authority, state and lifetime owners; no second canonical control plane |

The Get Modular and Extension Foundation neutral cores do not import one another
under [ADR-0015](../decisions/0015-authorize-get-modular-semantic-extraction.md).
A consumer-owned outer adapter can use both. Portable behavior is not required
to import either foundation merely to be reusable. A portable capability can
own domain and application behavior; it does not import another application's
private model or transfer that application's authority. Headless means independent
of presentation; it does not mean independent of an explicit runtime profile,
permissions, state or effects.

An ordinary reusable library, a module adapter, a released package and a plugin
artifact are distinct roles. A distributable plugin adds reviewed metadata,
artifact/admission lineage and its applicable lifecycle to reusable behavior.
One plugin can provide several narrow contributions; their ownership and
permissions do not merge into a universal `PluginContext`.

## Foundation-first decision packet, 2026-11-24

The [global owner direction](https://github.com/agent-teams-ai/.github/blob/bb7b1c00f18a8c532681f286afa51dda954469b4/docs/architecture/ecosystem-vision.md) clarifies that the foundation serves multiple products, not a single product from which a framework is extracted later. This packet proposes the needed successor to retained product-first constraints; it does not approve package materialization, a production host or a public SPI. The current Live Module Updates plan retains ownership of the shared operation and is being developed separately.

| Alternative | Reliability /10 | Complexity /10 | Confidence /10 | Incremental implementation and test LOC |
| --- | ---: | ---: | ---: | ---: |
| Independent neutral mechanisms with one shared complete update operation and a coherent integration surface where needed | 9 | 7 | 9 | 5,000–12,000 |
| One mandatory module/plugin runtime coupling composition, artifact trust and dynamic activation | 7 | 9 | 7 | 12,000–30,000 |
| Separate product-local hosts that each implement the lifecycle algorithm | 7 | 8 | 9 | 8,000–15,000 per product |

The first is the leading hypothesis, not a decision on the number of packages. Compare authoring effort, dependency closure, independent release/versioning, authority and lifecycle reuse, native/browser placement, failure behavior and independently authored consumers. A thin facade can give applications one coherent authoring/install/update experience without duplicating Core/Assembly, artifact trust, state custody or the complete LMU operation. A package split is justified by independent usage, trust, delivery or dependency needs, not by aesthetic modularity. A single integrated SDK or distribution that delegates to the same independently usable mechanisms is a packaging choice within the first option, not the second architecture. It remains a candidate if it preserves those properties. Validate it with a real authoring/install/invoke/update/remove flow; prove that the direct-library and integrated paths execute the same mechanisms, not two lifecycle algorithms. Estimates overlap the existing LMU work and must be recalibrated against its current plan, not summed as a second implementation.

### Open contribution vocabulary

Do not freeze a closed list of contribution kinds. Compare a closed enum, arbitrary untyped payloads, and a generic versioned envelope with owner-defined typed contribution contracts. Prefer the last hypothesis: identity and compatibility of a contribution contract are explicit; artifact installation does not grant an effect. Product-specific extension point semantics, trust tier, data and invocation remain at the owner. Support only the negotiated required/optional capabilities. A new independent consumer's typed contribution must not require editing the neutral core or exposing a global service bag. UI remains optional and headless behavior may also be used as an ordinary library.

### Intended consumers and acceptance

Before implementation, record concrete scope for Runtime v3, Orchestrator, Platform, a future frontend host and an independent external library consumer as applicable. Use small real seams and independent fixtures, not full applications as incubators. Prove neutral dependency closure and packed imports, different consumer-defined contribution schemas, no execution on discovery, denial before protected effects, generation/custody failure cases, and the chosen replacement profiles. Keep actual adoption separate from intended coverage. Stabilization/publication still requires the accepted independent implementation and conformance floor. Resolve the specific ADR-0015/OD-003 admission delta before production code; do not silently reinterpret immutable decisions or start a competing lifecycle library.

## Structure

### Minimum authoring contract for a representative fixture

The [shared headless plugin and UI design](https://github.com/agent-teams-ai/live-module-updates/blob/4cf4ca714f7ec6788417fcda1a75677615827dff/docs/architecture/headless-plugins-and-ui.md)
contains the cross-application proposal. Before implementing the selected
fixture, record this contract with its semantic and test-Host owners. Use a
realistic operation, such as reading and conditionally editing a document,
whose outcome can be checked independently of the implementation:

| Contract item | Required declaration or observation |
| --- | --- |
| Semantic ports | Typed inputs, outputs, errors, compatibility and explicit effect boundaries; no UI/container/provider SDK type leakage |
| Dependencies and runtime | Selected runtime profile and actual package/import closure; supported platform and trust constraints |
| Ownership | Which resources are created and owned versus borrowed; who stops admission, drains work and releases each resource |
| Cancellation | Acceptance, cooperative interruption, late completion and physical cleanup remain distinguishable |
| State | Test-Host canonical data, plugin-private state/cache, transient handles and UI/session state have explicit owners and compatibility; production adoption assigns these to the real owners |
| Construction | Inert declarations and no implicit top-level startup; establish custody before evaluating admitted code with effects or acquiring resources |
| Disposal | Idempotence/retry expectations, partial construction failure, cleanup debt, outstanding work and removal consequences |
| Reuse evidence | Isolated packed consumer first; the same built core in independently wired test Hosts for the claimed portability; record later product adoption separately |

Reuse proof for one built core in two Hosts is different from independently
authored conforming implementations of the same public SPI. The latter remains
its separately applicable admission/publication requirement. Neither means that
every ordinary static feature must wait for two complete applications or full
live replacement. Two configurations of one Host also do not prove two-Host
reuse. Products still meet their actual accepted local gates when adopting the
qualified profile.

Optional UI contributions stay outside the headless entry point. A plugin can
provide behavior without UI, or expose a presentation adapter under the Host's
rules. A UI-independent interaction model or declarative contribution is a
proposal to compare with existing frameworks for a concrete task. This plan does
not select a universal DSL, renderer, visual schema, protocol or new SDK.

Reuse the chosen toolkit's widget, accessibility, keyboard and focus behavior;
keep its elements, DOM references and interaction-machine types outside the
portable semantic contract. The [fixture/UI evidence](#fixture-and-ui-evidence-2026-11-24)
compares relevant library boundaries without selecting a dependency.

### Runtime and trust boundaries required from the start

| Target | Initial architectural obligation | Evidence before the corresponding support claim |
| --- | --- | --- |
| Browser | Browser-compatible import/declaration closure; browser-owned presentation/storage; explicit effect authority | The installed behavior artifact executes in a real browser realm, with independently observed results and cleanup; a UI calling Node does not prove this |
| Desktop | Renderer, privileged shell and any plugin process have distinct capabilities and narrow transport contracts | Actual selected shell/OS, sender and argument validation, denied privileged operations, lifecycle and physical process/resource observations |
| Untrusted plugin | Artifact/consent facts remain separate from executable containment; privileged effects pass through the owning authority | Denied filesystem/network/IPC/process effects, relevant resource bounds, revocation at the effect and actual termination under the selected native isolation profile |
| Optional UI | Semantic feature intent remains separate from toolkit state and renderer lifecycle | One task through meaningful independent presentations, required unsupported contributions rejected where negotiated, stale results and action identity preserved, accessible interaction checked |

No transport envelope is needed between ordinary in-process functions merely
because another profile uses IPC. The crossing adapter owns serialization,
protocol compatibility and cancellation transport when there is a real realm,
process or trust boundary. A Worker, signed artifact, `isolated` fixture value
or hidden UI control does not establish containment or authorization.

### Plugin-specific delivery backlog

| Slice | Concrete result and owner | Exit evidence |
| --- | --- | --- |
| Representative fixture and selected profile | Name one useful contribution, its semantic owner, test Hosts, runtime/trust boundaries, grants and state; keep unresolved choices in OD-003 | Reviewed contract, positive/rejecting outcomes and an independent oracle; no application prerequisite or synthetic production certificate |
| Artifact and byte identity | EF profile uses immutable OCI digest, ORAS/Cosign and the actual executable/import closure | Verified and installed bytes agree; tampered or incompatible artifacts fail closed |
| Catalog and distribution | Retain PostgreSQL canonical state, deterministic federation and selected GHCR/Harbor responsibilities | Owning accepted distribution/authentication/revocation fixtures; offline behavior does not invent an authority fallback |
| Installation and grants | Keep installation, activation, contribution visibility and authorization separate | The integrated test Host exercises artifact-to-effect denial, stale consent, revocation and wrong-scope cases using the real selected mechanisms |
| Loading and lifetime | Host owns evaluation, readiness, admission, resource custody and supported execution placement | Failed/late construction, cancellation, outstanding work and cleanup debt remain observable |
| State and removal | Feature/schema/custody owners define migration, rollback compatibility, retention and deletion | Failed/unknown migration, restart and recovery preserve authority and data; ordinary uninstall does not erase user data |
| Portable reuse | A second independent Host integrates the same built headless core through its own adapter | No source edits, UI dependency or hidden organization infrastructure in the portable core |
| Package admission | Retain a real owner and the applicable ADR-0015 admission basis: second consumer, independent replacement/release lifecycle, deployment/isolation, or a public SPI | Prove the selected package basis; the additional SPI implementation proof applies when a public SPI is claimed |
| Public extension SPI | Apply the separate accepted SPI publication decision | Two independently authored implementations of the same SPI, compatibility and executable conformance before SPI publication |
| Supported live updates | Route shared coordination to Live Module Updates and the selected product authority | Exact accepted profile, state/operation contract and full consumer evidence; static composition does not stand in for it |
| Product adoption | The adopting product supplies its actual state/authority primitives and accepted artifact/profile pins | Product-owned useful behavior, required safety and local admission gates; fixture success is reused only within its proved scope |

This is not a new centralized gate or a declaration that all rows block every
application. Select applicable obligations from existing accepted authority.
For Orchestrator's initial static module foundation, the existing Sandbox
Manifest seam is a concrete candidate; its actual adopted Core/Assembly pins
and owner admission still govern. It is not automatically selected as the
first complete live-update consumer. Other greenfield consumers can qualify
their own scoped static foundation while the broader update work continues.

### Evidence and rejecting controls

Keep mechanism probes, integrated representative fixtures, public package
availability, SPI conformance and product adoption distinct. The
[existing-evidence audit](#existing-fixtures-and-the-missing-bridge)
identifies reusable controls and the missing artifact-to-effect integration.
Do not implement another lifecycle algorithm in a test Host to fill that gap.

Specify expected results and effect/receipt ledgers independently of the code
under test. Include a deliberately broken grant, fencing or cleanup control
that the corresponding oracle rejects. Fresh namespaces, state roots, ports
and browser contexts isolate cases; explicit barriers and concrete owned
resource observations establish reset. A finally block or empty counter alone
does not establish cleanup. Retain failed inputs/results and exact source,
package, lock, compiler, runtime, browser/shell and OS identities.

Use the ordinary library path where no plugin mechanism is required. For a
plugin claim, the representative fixture must traverse the actual selected
verification, admission, installation, invocation and supported removal path.
Production implementation of a changed EF package/Host boundary still requires
the specific admission reconciliation recorded in OD-003; this plan does not
authorize it implicitly. Historical evidence and accepted ADR bytes stay fixed.

## Fixture and UI evidence, 2026-11-24

This is a bounded source audit against EF commit
[`5ee8a788`](https://github.com/agent-teams-ai/extension-foundation/tree/5ee8a788935c885fac075a5860a0217cf420b4d7)
and the linked immutable LMU qualification source. It records current design
inputs and observed limits, not a new production runtime, public SPI or UI
dependency. Historical research packets and accepted ADRs remain unchanged.

### Existing fixtures and the missing bridge

| Existing evidence | Useful result to reuse | Limit of the result |
| --- | --- | --- |
| [Contribution admission candidate](../../tests/qualification/contribution-admission-candidate.ts) and [its tests](../../tests/qualification/contribution-admission-candidate.test.ts) | Pure preflight over supplied artifact, installation, binding, grant, placement and custody facts; negative admission cases | It does not load code or enforce effects. Its fixed contribution-kind list and `isolated` input are fixture choices, not an approved universal schema or operating sandbox |
| [Packed extension consumer E2E](../research/packed-extension-consumer-e2e-2026-11-05.md) | A real discovery use case integrated through packed public contracts and disposable composition | It does not establish production plugin installation, authorization or a complete Host; retain the recorded failed attempts and exact experiment scope |
| [Universal-system spikes](../qualification/universal-module-extension-system/spike-results.md) | Browser Worker, Node Worker and child-process transport/handshake observations | Transport across a realm or process is not containment, a Desktop profile or a complete plugin lifecycle |
| [Protocol oracle](../../tests/qualification/dogfooding-protocol-oracle.ts), [reducer](../../tests/qualification/dogfooding-protocol-reducer.ts) and [scenarios](../../tests/qualification/dogfooding-protocol.test.ts) | Separately expressed expected protocol behavior and implementation transitions | The model needs real owner receipts and native effects before it can qualify a production authority or physical lifecycle |
| [Boundary/failure experiments](../research/plugin-boundary-and-failure-experiments.md) and [Worker replacement study](../research/worker-adapter-replacement-experiment.md) | Closure, path substitution, task ownership, cleanup debt and stop observations | The bounded experiments do not establish arbitrary-descendant cleanup, every platform or hostile-code containment |
| [LMU portable document fixture](https://github.com/agent-teams-ai/live-module-updates/tree/c5f6ed8b75c490785679de7e813f54901ee4e3b0/tests/qualification/portable-document) | One packed behavior core executes through public imports in independently wired Node and browser Hosts; conditional edits, revocation, reset and a deliberate listener-cleanup defect have observable outcomes | This is an ordinary-library portability slice, not GM composition, EF admission/install/remove, Desktop isolation, a public extension SPI or the complete LMU update operation |

The LMU [hosted run](https://github.com/agent-teams-ai/live-module-updates/actions/runs/45487365519)
at exact source `c5f6ed8b75c490785679de7e813f54901ee4e3b0` recorded
**Q1–Q3: 3 passed, 0 failed, skipped or cancelled** in
[job 138776212003](https://github.com/agent-teams-ai/live-module-updates/actions/runs/45487365519/job/138776212003).
The browser was Chrome Headless Shell 159.0.8154.6, Playwright Chromium build
1255, under Playwright 1.65.1; the runner used Node 24.22.3, pnpm 11.25.0
and TypeScript 7.0.2. The retained
[artifact 14965145969](https://github.com/agent-teams-ai/live-module-updates/actions/runs/45487365519/artifacts/14965145969)
archive SHA-256 is
`1bfbbbac4098e35317b9c901a75578cbd4f01865b3e0d68be9f5ad0b731d44ef`.
This is observed native-browser evidence, independent of the earlier local
browser-download failure. The exact source and artifact identify the proof;
the current delivery proposal remains in LMU PR #2.

The portable core validates input and expresses the conditional-edit use case.
Each test Host owns canonical state, final permission/revision checks, receipts
and its actual resources. The Node Host uses a temporary file; the browser Host
uses browser storage and DOM interaction. Reuse of the same built core across
these Hosts is distinct from independently authored implementations of a public
SPI. Its cleanup mutation detects a retained listener even when a closed-state
guard prevents a write; this is stronger than checking only the final document.

**Next EF integration gap:** select a representative contribution and traverse
the actual chosen artifact verification, admission, installation, invocation,
disable and removal mechanisms in independently wired test Hosts. Observe
protected effects and their denials independently. A pure preflight returning
`allowed`, a package install or a model transition cannot close this bridge.
Use the qualified shared lifecycle mechanisms when that profile needs them;
do not recreate a lifecycle implementation inside the fixture.
The exact production package/Host admission delta remains in OD-003.

### UI library boundaries

Official documentation was inspected on 2026-11-24. These are library-boundary
observations, not a dependency selection, compatibility certification or
benchmark. Each row distinguishes the library's reuse boundary from ours.

| Library and primary source | Documented boundary | Consequence for the proposed architecture |
| --- | --- | --- |
| [Radix Primitives](https://www.radix-ui.com/primitives/docs/overview/introduction) and [getting started](https://www.radix-ui.com/primitives/docs/overview/getting-started) | Unstyled accessible primitives with React component examples and focus/keyboard behavior | A React presentation adapter can reuse the primitives; unstyled components do not by themselves create a framework-neutral business contract |
| [React Aria](https://react-aria.adobe.com/getting-started) | Unstyled React components corresponding to DOM elements, with composition and interaction behavior | Keep React components and DOM lifecycle in the presentation adapter; portability of the semantic feature is a separate property |
| [Zag introduction](https://zagjs.com/overview/introduction) and [framework adapters](https://zagjs.com/guides/framework-adapters) | Framework-independent interaction state machines are connected to reactivity, DOM and lifecycle through adapters | Reuse that interaction layer where suitable; do not rebuild its interpreter or expose toolkit machine types as the portable business API |
| [Ark UI overview](https://ark-ui.com/docs/overview/about) | Components use Zag machines and provide framework adapters while still interacting with the DOM | Multiple frontend adapters are useful evidence for a UI seam; they do not establish server execution of widgets or runtime isolation |

The design inference is to keep four properties separate: styling freedom,
reuse of interaction behavior across frontend frameworks, portability of
business behavior, and containment of untrusted code. None implies the others.

A feature core can own its domain/application rules and narrow semantic ports;
the Host retains its canonical state and effect authority. A presentation
adapter owns toolkit state, focus, elements, subscriptions and renderer cleanup.
Keep drafts, action identity and stale-result handling explicit at the seam.
Start a fixture with simple native controls if that is sufficient to exercise
the contract; require a particular toolkit only when its integration is the
claim under test. Compare a meaningful task in independent presentations before
publishing a broader UI portability claim. No four-library implementation,
universal widget engine or declarative UI language is required by this plan.

### Runtime and trust source observations

| Primary source | Observation | Design consequence |
| --- | --- | --- |
| [Browser Workers](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers) | Workers execute in a different global context and can use network APIs | A Worker realm alone does not prove network denial or an untrusted-plugin sandbox; specify the allowed effects and actual enforcement |
| [Node Worker options](https://nodejs.org/api/worker_threads.html#new-workerfilename-options) | Worker resource limits cover the JavaScript engine, exclude external data such as ArrayBuffers, and do not prevent a global out-of-memory abort | Process/resource guarantees need their own native test and selected resource boundary; an input limit is not a complete containment proof |
| [Electron process sandbox](https://www.electronjs.org/docs/latest/tutorial/sandbox) | Sandboxed renderers have different capabilities from privileged processes, and preload code remains a sensitive bridge | Select the Desktop placement and privileged broker deliberately; validate the chosen shell's real sender/effect/lifecycle behavior |
| [Electron context isolation](https://www.electronjs.org/docs/latest/tutorial/context-isolation) | Context isolation alone does not make unrestricted IPC exposure safe; the guide recommends narrow methods with argument filtering | Expose purpose-specific operations through the broker and recheck authority at the effect; hiding a control is not authorization |

These observations motivate boundaries, not selection of Electron or a specific
sandbox. The production shell, native isolation mechanism, resource budget,
interruption behavior and state guarantees remain explicit decisions. Record each
selected profile's actual positive and rejecting evidence. A Browser result
does not certify Desktop, and a trusted in-process result does not certify an
untrusted third-party plugin.

### Remaining decisions and proof scope

A fixture contract must say which negative cases apply. Missing capabilities,
revision negotiation, partial asynchronous setup or physical termination require
tests when the selected contract promises them; a pure synchronous library
should not acquire invented runtime services to satisfy an unrelated profile.
Keep useful operation, effect denial, independent oracle and owned-resource
cleanup testable for the actual chosen scope.

The open choices are the first representative EF contribution/integration,
selected execution and isolation profiles, any UI toolkit adapter worth proving,
and the exact retained production admission successor. The architectural
direction is already set: prepare the foundation before applications, keep
authority with its owner, reuse neutral mechanisms and qualify each claimed
boundary. Neither this audit nor the LMU portability result resolves the
remaining production SPI, hostile-plugin, Desktop or full update obligations.

## Operational implications

Artifact, installation and plugin-private-state custody must remain separate
from the product's canonical domain state, transaction and migration effects.
Name one writer and authority per state subject. EF vocabulary or a library
operation record cannot become a second product state store. Execute extension
code outside product database transactions and recheck mutable authority where
the real effect occurs.

Distinguish disable, uninstall, generation retirement and deletion of user data.
State lineage, schema compatibility, artifact retention and supported rollback
need their owners' receipts. A prior version may still be retained for active
work, history or old clients. Abort and timeout do not prove process termination,
completed writes or released resources. Preserve uncertain effects and cleanup
debt rather than returning a misleading single success flag.

The accepted [extension model](extension-model.md) and conditional production
Host floor remain authoritative. Ordinary libraries, static Pure DI and inert
module declarations do not acquire the whole operational Host profile merely
through this document. Conversely, an actual admitted production extension Host
cannot replace its required evidence with this planning table or a toy preflight.

Keep reports explicit about design, implementation, release and consumer
qualification. Use immutable source identities for proof and maintained routes
for navigation. The [November 23 audit](../research/live-extension-documentation-audit-2026-11-23.md)
is retained historical evidence. New constraints or observations belong in a
dated successor or the owning open decision; accepted ADRs and sealed packets
are not silently rewritten.

## Related decisions

- [ADR-0001: product-neutral ownership](../decisions/0001-product-neutral-extension-foundation-boundary.md).
- [ADR-0002: OCI, ORAS and Cosign](../decisions/0002-oci-oras-and-cosign-distribution-baseline.md).
- [ADR-0003: canonical catalog state](../decisions/0003-postgresql-canonical-catalog-state-and-signed-snapshots.md) and [ADR-0004: federation](../decisions/0004-deterministic-catalog-federation-and-namespace-authority.md).
- [ADR-0011: admitted Host safety floor](../decisions/0011-extension-admission-custody-and-retirement-closure.md).
- [ADR-0014: product declarations and generations](../decisions/0014-product-local-module-authoring-composition-and-generation-guardrails.md).
- [ADR-0015: independent composition and admission](../decisions/0015-authorize-get-modular-semantic-extraction.md).
- [OD-003: unresolved Host, SPI and migration choices](../open-decisions/OD-003-module-runtime-and-public-spi-choices.md).
