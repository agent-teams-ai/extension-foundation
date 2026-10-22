---
id: research.forkless-customization
type: research
status: active
owner: architecture
summary: Owned extension points, replacement profiles and author experience for a large plugin ecosystem.
---

# Customization Without Forks and Scale

Research retrieved 2026-10-22. Non-normative. No implementation, benchmark,
public SPI or thousand-plugin qualification is claimed. Start with the
[research hub](plugin-system-research-reference.md) and its existing
ecosystem/platform/OpenClaw evidence before this supplement.

## What the new evidence changes

The user's goal is deep supported customization without carrying a product fork.
It does not imply that every internal method must become a runtime hook, or that
every extension has to be hot-replaceable. Four independent properties must be
named: what can be customized, when the binding changes, the compatibility
promise, and the enforced trust/failure boundary. A powerful build-time module,
runtime task provider, UI contribution and hostile user program can share
contract vocabulary without sharing execution guarantees.

### Primary observations

- **Theia:** its current documentation explicitly distinguishes compile-time
  Theia extensions with internal/DI access from runtime-installed VS Code/Theia
  plugins using their respective APIs. Headless plugins have another placement
  profile. Services and contribution points can be provided by extensions;
  implementations are selected by startup container wiring. This demonstrates
  that deep product customization and runtime installation are different
  promises. It does not establish safe replacement of captured DI references.
  The current guide also says Theia plugin support is under discussion and
  recommends VS Code extensions or Theia extensions instead; this observation
  is not an endorsement of every listed mechanism as a stable future contract.
  Sources: <https://theia-ide.org/docs/extensions/> and
  <https://theia-ide.org/docs/services_and_contributions/> (moving documentation).
- **VS Code:** documented extension surfaces include commands, providers,
  configuration and owned UI contributions. Direct Workbench DOM access and
  custom styling of its internals are excluded because those internals change.
  A Webview is a supported route for custom UI. Node local/remote extension
  hosts and browser Web Workers are distinct runtime placements. Activation
  events support demand-driven loading; broad `*` activation is discouraged.
  Sources: <https://code.visualstudio.com/api/extension-capabilities/overview>,
  <https://code.visualstudio.com/api/advanced-topics/extension-host>,
  <https://code.visualstudio.com/api/references/activation-events> (moving docs).
- **Backstage frontend:** extensions expose typed input/output data references
  and attach into a tree. Their IDs identify contributions, install and enable
  are separate, and attachment/order/override configuration affects composition.
  Its documented enabling behavior can influence ordering: our deterministic
  GM profile must not inherit that as an unstated registration-order rule.
  Source: <https://backstage.io/docs/frontend-system/architecture/extensions/>.
- **Backstage backend:** plugin-owned small extension points are exported
  separately from implementations; their factory variant attributes startup
  failure to the contributing module. A backend service has one selected factory
  per backend instance, and plugin-scoped service state has an explicit owner.
  Sharing mutable plugin state through root context violates its isolation rule.
  Sources: <https://backstage.io/docs/backend-system/architecture/extension-points/>
  and <https://backstage.io/docs/backend-system/architecture/services/>.
- **Historical fixed Backstage lesson:** v1.24.0 release notes say the early
  `EventsExtensionPoint` did not respect plugin isolation. The change replaced
  it with `EventsService` and reduced exposure of internal concerns. This is a
  documented migration, not a claim of a current defect. A generic event bus
  can silently cross boundaries even when its methods are nicely typed.
  Source: <https://backstage.io/docs/next/releases/v1.24.0-changelog/>
  (historical release, change 56969b6).

These observations complement the already retained JupyterLab token identity,
Jenkins compatibility, Gradle cache/isolation, Chrome lifecycle/permissions,
JetBrains dynamic plugin, OSGi service-reference and OpenClaw source evidence.
Do not copy those records or call their scenarios newly rerun.

## Proposed extension vocabulary, not a new public API

| Customization | Contract and selection | Boundary to preserve |
| --- | --- | --- |
| Add capability/UI/command/data format | Owned declarative contribution slot with payload schema and explicit cardinality | Adding a contribution does not grant execution or access to internal state |
| Replace a provider | Consumer-owned substitutable port and explicit desired-profile binding | A provider cannot win by package load order or mutate existing consumers |
| Compose steps around behavior | An explicitly declared ordered-many contract, only where its owner needs composition | Order, failure, cancellation, result/effect semantics and permitted `next` use are specified; no ambient interception of all calls |
| Extend another plugin | That plugin's small owned public extension point and qualified dependency contract | No deep import, shared private mutable state or implicit grant inheritance |
| Customize product presentation | Owned UI slots, model/command contracts and supported theming surface | Internal DOM/component instances are not a compatibility API |
| Supply a deeply integrated product variant | Owner-selected build-time module/provider under the same domain invariants | Build-time replaceability is useful without promising live replacement |

One documented extension point should say: semantic owner; input/output schema;
required/optional/ordered-many cardinality; compatibility promise for consumers
AND implementers; phase; lifetime/placement profile; configuration and grants;
error/timeout semantics; contribution provenance; how conflicts are explained;
and the owner-provided conformance examples. These are views of existing GM,
product and EF contracts, not a second manifest schema to be invented in EF.

Ordered-many binding establishes an order of providers. It does not itself
define middleware execution: the owning product contract must say whether
`next` may be called zero, once or several times, whether it may escape
asynchronously, and what short-circuiting, exceptions, concurrency, cancellation
and effects mean. Do not add a generic interceptor runtime to GM.

Authorization implementations can be swappable through an owner-approved port
while its invariant remains fixed. An ordinary plugin cannot replace the code
that decides whether that very plugin is allowed to run, remove a canonical
fence, or grant itself additional authority. Avoid claiming that all security
implementation is permanently hard-coded: distinguish protected guarantees
from qualified implementations selected by the product owner.

## Replacement closure is the real granularity

If module A captured provider B at construction, changing B's registry entry
does not rewire A. A supported update either constructs the dependent closure
again or crosses an intentionally stable invocation boundary whose operation
captures one generation. Streams, callbacks, sessions, iterators and
subscriptions can retain references beyond a request. Their owners must define
a longer lifetime or require restart; do not accidentally label them bounded
requests. A plugin author should not implement the Host's drain protocol simply
to add a menu item or an ordinary static module.

Product profiles should explain why a proposed edit is classified as dynamic,
restart-required, migration-required or rejected. The minimal closed request
cohort is the current research target; wider profiles need their own evidence.
UI rebuild, state transfer and emergency revocation have different semantics.

## Scale by the dimensions that consume resources

Installed descriptors, selected declarations, active instances, active tenants,
dependency edges, independently released versions, execution realms,
simultaneous generations, in-flight work and churn are different axes. Start
from inert indexed metadata; load only selected executable closures. Do not
start one worker, scheduler, polling loop or Temporal deployment per installed
descriptor. Grouping several trusted modules may reduce overhead, but a shared
realm also shares its failure and privilege boundary; arbitrary hostile user
plugins cannot be grouped merely because it benchmarks well.

Illustrative capacity arithmetic, not a benchmark: if every one of 1,000 units
is independently instantiated for 100 tenants and two simultaneously retained
generations, that shape has 200,000 instances. If only 20 units are selected per
tenant, the shape differs materially. Shared immutable plans do not imply shared
tenant state or grants. Cached artifacts, plans, admission decisions and runtime
instances need distinct owner-defined invalidation inputs and retention caps.

Every budget must name its scope: per operation, endpoint, cohort, tenant,
execution owner or host. A three-generation cap per cohort is not a deployment
cap. For example, 100 tenants × 20 selected cohorts × 3 retained generations ×
1 worker permits 6,000 potential workers; pool replicas multiply that envelope
again. This is illustrative arithmetic, not tested capacity or a required
topology. The existing product capacity owner must bound aggregate workers,
memory, queues, artifacts and cleanup debt. This does not require a new generic
scheduler. Sharing a trusted execution owner changes the failure and authority
scope and must be an explicit profile choice.

Use the existing GM source-check N1000 result accurately: it does not remove the
separate TypeScript7.0.2 compiler blocker or establish runtime/reload/tenant
scalability. New parallel dependency resolution, specialized caches or native
code need a measured bottleneck before selection. Prefer an ordinary readable
contract over complex type-level inference that the ecosystem cannot compile.

## Concrete author experience to qualify

One external ordinary project and one actual product slice should demonstrate:
adding a contribution; replacing one provider; extending a plugin through its
public point; composing two ordered contributions; two conflicting providers;
a missing optional versus missing required dependency; an incompatible packed
provider/consumer version; and an update which correctly reports restart needed.
These are proposed qualification scenarios, not a new mandatory gate on every
documentation change. Reuse existing package/conformance tooling and fixtures.
Only the actual first extension family belongs in the initial delivery; this
catalogue of scenarios is not a demand to implement every customization category.

For an ordinary contribution, the author implements the consumer-owned payload
or port, declares the contribution through the existing
[GM authoring guide](https://github.com/agent-teams-ai/get-modular/blob/main/docs/guides/module-authoring.md)
and follows the product's selection and resource contract. The author does not
implement durable publication, admission receipts or Host retirement. For a
provider substitution, the author implements the same public port and its
conformance cases; the product explicitly selects that implementation in a new
immutable profile. If two providers claim a single required slot, the diagnostic
identifies both providers and the slot, then asks for an explicit selection.
Package installation order cannot silently choose the winner.

Diagnostics should name the owner/slot/provider/artifact and dependency path,
say why selection failed, show the effective order and configuration provenance,
and explain the minimum corrective action. Installed/enabled/selected/prepared/
active/quiescing/blocked are distinct facts, not one green plugin badge. A preview
can show affected dependent closure and expected resource cost without invoking
candidate code or promising arbitrary dry-run safety for setup.

An ecosystem's long-term maintenance depends on stable extension-point ownership
and tested provider substitution, not just a `Plugin` type. Establish the minimal
contract in the real slice, publish its examples and compatibility policy, and
add seams when concrete customization asks demonstrate them. No absolute promise
that every future request can avoid a core change: a new invariant or absent
extension point may need an upstream contract change rather than a private fork.

## Alternatives and planning judgments

Confidence/reliability/complexity are /10, with higher complexity worse; reliability
means achievable behavior within the stated scope after qualification, not uptime.
LOC below is new handwritten wiring/contracts and focused fixture code for ONE
real product extension family, excluding provider business logic, shared Host
runtime, UI design, catalogue, security platform and existing GM implementation.
Approximate ranges may vary by2x and are not estimates for the entire ecosystem.

| Option | Confidence | Reliability | Complexity | Production LOC | Test/fixture LOC |
| --- | ---: | ---: | ---: | --- | --- |
| Small owned contribution/provider ports plus immutable profile selection | 9 | 8 | 4 | 400–1,000 | 800–1,800 |
| Same plus specifically justified ordered composition and plugin-owned extension points | 8 | 8 | 5 | 700–1,600 total | 1,400–3,000 total |
| Generic global hooks/interception/container access for all user plugins | 3 | 3 | 9 | A demo may be short; no responsible production total without scope | Unbounded compatibility/failure surface; no honest finite total |
| Pure build-time product variants first, controlled restart for changes | 9 | 8 | 3 | 250–700 | 500–1,200 |

The first and fourth can coexist; these are capability profiles, not rival whole
systems. Dynamic Host costs must be counted separately once per shared mechanism,
not multiplied by the number of ordinary module declarations. New runtime SDKs,
catalogue UI or migration frameworks are not selected by this research.

## Independent review and remaining qualification

Independent critics checked customization power, service-locator and duplicate
contract risks, reference escape, pool identity and scope estimates. The
[review record](plugin-research-review-and-decision-record.md) retains their
findings and dispositions. The first real slice must still prove that its
actual authoring tasks fit these owned seams. Sessions, UI references and
plugin-to-plugin callbacks do not gain a bounded request lifetime by naming
them a contribution; use an explicit longer profile or report restart needed.
