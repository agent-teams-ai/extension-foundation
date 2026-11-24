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
Extension Foundation. The shared [foundation delivery plan](https://github.com/agent-teams-ai/live-module-updates/blob/fddfd82290a751e0890bce570bd3c4506743676d/docs/plans/foundation-delivery-plan.md)
in Live Module Updates owns the cross-repository sequence and proposed complete
update operation. Its proposed consolidation was published in
[PR #1](https://github.com/agent-teams-ai/live-module-updates/pull/1).
Keep the two plans linked; do not copy the whole operation roadmap here.

The owner wants user- and agent-authored plugins that persist across restart,
can be shared or transferred between applications, and can be enabled, disabled
or removed. Eligible built-in features should expose deliberate replacement
boundaries. Preserve this direction when creating new modules without treating
every helper as an independently installed plugin or promising arbitrary code
replacement. The [owner record](../open-decisions/OD-003-module-runtime-and-public-spi-choices.md)
retains the vision and the choices that remain open.

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

### Minimum authoring contract to specify with a real feature

The [shared headless plugin and UI design](https://github.com/agent-teams-ai/live-module-updates/blob/fddfd82290a751e0890bce570bd3c4506743676d/docs/architecture/headless-plugins-and-ui.md)
contains the full cross-application proposal. Before implementing the selected
feature, record this small concrete contract with its actual owner:

| Contract item | Required declaration or observation |
| --- | --- |
| Semantic ports | Typed inputs, outputs, errors, compatibility and explicit effect boundaries; no UI/container/provider SDK type leakage |
| Dependencies and runtime | Selected runtime profile and actual package/import closure; supported platform and trust constraints |
| Ownership | Which resources are created and owned versus borrowed; who stops admission, drains work and releases each resource |
| Cancellation | Acceptance, cooperative interruption, late completion and physical cleanup remain distinguishable |
| State | Product canonical data, plugin-private state/cache, transient handles and UI/session state have explicit owners and compatibility |
| Construction | Inert declarations and no implicit top-level startup; establish custody before evaluating admitted code with effects or acquiring resources |
| Disposal | Idempotence/retry expectations, partial construction failure, cleanup debt, outstanding work and removal consequences |
| Reuse evidence | One real consumer for the first scoped feature; the same built core in a second independently integrated Host for the claimed portability |

Reuse proof for one built core in two Hosts is different from independently
authored conforming implementations of the same public SPI. The latter remains
its separately applicable admission/publication requirement. Neither means that
every ordinary static feature must wait for two complete applications or full
live replacement. Consumers still meet their actual accepted local gates.

Optional UI contributions stay outside the headless entry point. A plugin can
provide behavior without UI, or expose a presentation adapter under the Host's
rules. A UI-independent interaction model or declarative contribution is a
proposal to compare with existing frameworks for a concrete task. This plan does
not select a universal DSL, renderer, visual schema, protocol or new SDK.

### Plugin-specific delivery backlog

| Slice | Concrete result and owner | Exit evidence |
| --- | --- | --- |
| First consumer and trust profile | Name one real contribution, its feature owner, Host, runtime, grants and state; keep unresolved choices in OD-003 | Reviewed narrow contract and an admitted implementation slice, not a synthetic model labelled production |
| Artifact and byte identity | EF profile uses immutable OCI digest, ORAS/Cosign and the actual executable/import closure | Verified and installed bytes agree; tampered or incompatible artifacts fail closed |
| Catalog and distribution | Retain PostgreSQL canonical state, deterministic federation and selected GHCR/Harbor responsibilities | Owning accepted distribution/authentication/revocation fixtures; offline behavior does not invent an authority fallback |
| Installation and grants | Keep installation, activation, contribution visibility and product authorization separate | Denial, stale consent, revocation and wrong-scope cases through the real consumer |
| Loading and lifetime | Host owns evaluation, readiness, admission, resource custody and supported execution placement | Failed/late construction, cancellation, outstanding work and cleanup debt remain observable |
| State and removal | Feature/schema/custody owners define migration, rollback compatibility, retention and deletion | Failed/unknown migration, restart and recovery preserve authority and data; ordinary uninstall does not erase user data |
| Portable reuse | A second independent Host integrates the same built headless core through its own adapter | No source edits, UI dependency or hidden organization infrastructure in the portable core |
| Package admission | Retain a real owner and the applicable ADR-0015 admission basis: second consumer, independent replacement/release lifecycle, deployment/isolation, or a public SPI | Prove the selected package basis; the additional SPI implementation proof applies when a public SPI is claimed |
| Public extension SPI | Apply the separate accepted SPI publication decision | Two independently authored implementations of the same SPI, compatibility and executable conformance before SPI publication |
| Supported live updates | Route shared coordination to Live Module Updates and the selected product authority | Exact accepted profile, state/operation contract and full consumer evidence; static composition does not stand in for it |

This is not a new centralized gate or a declaration that all rows block every
application. Select applicable obligations from existing accepted authority.
For Orchestrator's initial static module foundation, the existing Sandbox
Manifest seam is a concrete candidate; its actual adopted Core/Assembly pins
and owner admission still govern. It is not automatically selected as the
first complete live-update consumer. Other greenfield consumers can qualify
their own scoped static foundation while the broader update work continues.

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
