---
id: research.industry-scale-refresh
type: research
status: active
owner: architecture
summary: Current industrial mechanisms, bounded scale evidence, and decision-changing qualification gaps.
---

# Plugin Industry and Scale Review 2026-11-05

<!-- cspell:words Dify -->

## Scope and authority

**Observed 2026-11-05.** The owner asks whether the industrial research and scale
evidence support a deeply customizable, independently extensible agent platform
with hundreds or thousands of modules. This record updates the
[research reference](plugin-system-research-reference.md), preserves the earlier
20 comparison cases and their pins, and identifies the next evidence that could
change a design decision. It does not claim industry leadership, approve a
runtime, migrate a consumer or replace an accepted ADR.

The useful direction remains product-owned typed extension points, Get Modular
composition and static composition with controlled restart. Library scale has
advanced beyond the October snapshot: current GM includes a real **1,024 live
instance** correctness test. Product-level capacity, external plugin safety,
long-running retention and independent-author compatibility remain separate
questions. Current agent products also have stronger customization mechanisms
than an old hook/skill-only comparison would suggest.

Evidence classes used below are **documented** (official current design/API),
**inspected** (particular source/patch), **executed** (a retained run with a named
scope), **historical fixed** (a merged repair), and **proposed** (our inference or
unrun qualification). A release tag does not automatically pin a moving website.
An upstream report or source test is not a test executed in this research round.

## Research coverage and current authority

The earlier evidence covers IDE and extension ecosystems, backend composition,
process/RPC systems, production replacement, durable workflows and stateful
recovery. It includes VS Code, Theia, IntelliJ, OSGi, Backstage, JupyterLab,
Jenkins, NGINX, Envoy, Erlang/OTP, Temporal, Flink and the pinned OpenClaw audit.
The comparison-case count is an inventory, not a quality score or an exhaustive
market survey. The follow-up retains the actual worker, composition, browser,
restart, artifact and PostgreSQL experiments in their existing records.

This round adds a focused current review of OpenClaw, OpenCode V2, Claude Code,
Dify Plugin Daemon, mature extension systems, and model-facing catalog scale.
Three investigators cover agent products, mature ecosystems and internal
evidence; three separate critics challenge industrial claims, scale/design and
the plugin author's experience. No competitor runtime or new scale benchmark
is executed here.

| Repository / surface | Verified snapshot | Meaning for this review |
| --- | --- | --- |
| EF research branch | `70f03d3d9e134780f27268339a6729a7305a2363`, open draft PR55 | October source and experiment evidence remains intact. |
| EF main | `29ae5b0269d9d83f071344e3e18761ded04ff53d` | Still architecture/qualification work; no public extension runtime or SPI is shipped by this research. The delta since the prior main is the accepted identity-verifier alias update. |
| GM main | [`5fb83478dd7b95216be92c4d3077eddf2774eef8`][gm-main] | Includes live-instance qualification and subsequent ownership, lifetime and preparation-path fixes. |
| GM published artifacts | Core/Assembly `0.7.1`, Conformance `0.5.1`, Resources `0.2.1`, Observation `0.2.0` observed in the npm registry | November 2–5 fixes in main do not become published package guarantees automatically. The lifecycle kernel remains private. |
| Orchestrator main | [`5a8496ce711909e381c5bc817fff5500be9a1761`][orchestrator-main] | Accepted [ADR-0117][orchestrator-0117] reconciles the baseline to Core/Assembly `0.5.0`, CMS `a3a079baca2c6af48c9d45bc08992825be1c2bbd`, FMS v1.1; actual product adoption still has its owning readiness gates. |

ADR-0117 supersedes the earlier ADR-0110 composition pin; it does not authorize
a silent package upgrade. Native PostgreSQL local/hosted authority remains in
ADR-0114/0115. Orchestrator PR90's native Temporal decision is still on an open,
unmerged branch. That application workflow decision is distinct from an optional
Temporal adapter above a product-owned replacement operation. Historical EF
research references to the old composition pin are dated evidence, not the
current consumer baseline.

## Current industrial mechanisms worth transferring

### Agent products

| System and evidence class | Useful mechanism | Boundary / lesson for us |
| --- | --- | --- |
| OpenClaw, current documentation and targeted source inspection | One metadata inventory, selective activation, separate source-capture/install-snapshot modes, registry generations and explicit drain/recovery rules | Respect its existing protections. Ordinary late-demand dependencies and managed snapshots have different custody scope; verify exact source/profile before claiming a closed immutable artifact. |
| OpenCode V2, current documentation | Owned domain transformations, ordered contributions, disposal and request-specific executable tool snapshots | Define the conflict/merge rules per product point. An immutable definition can still close over mutable state. V1 implementation assumptions cannot describe V2. |
| Claude Code, current documentation | Packaged components plus in-process JS/TS mods for UI and behavior; distinct installed, enabled, loaded and effective contribution states | Deep customization already includes UI and policy hooks in contemporary products. Give authors supported public seams and precise attribution; preserve the separate product authority boundary. |
| Dify Plugin Daemon, documentation and merged fixes | Runtime dispatch across local/debug/serverless adapters; exact package identity distinct from tenant installation authorization | A cached install record, selected version and current permission are different facts. Update/uninstall invalidation belongs to the authority owner. |

OpenClaw's [current internals][openclaw-architecture] describe considerably more
than a loader that imports arbitrary mutable files. The [October audit](openclaw-plugin-and-reload-audit.md)
already retained successful protections and exact limited counterexamples. Its
source-specific findings must not become current accusations without another
source comparison. The current site is documented design; the release anchor
observed here is `v2026.11.1` at `4ffdd2047d192dd65554de3c8c46c0e0197c6e2a`.
This round does not establish the whole implementation's safety or performance.

The independent source critic found an important limit in both current docs and
the release: an ordinary first-demand import/require can capture a dependency
after the original source digest was established. Already captured files are
independent copies, but that does not prove a complete dependency closure fixed
at admission. The managed snapshot/publication path is separately present at
current main `8eb01599c83a05509c5f1f52407b218e7660623b`; the inspected publication
file is absent at the release tag. Do not merge these facts into one blanket
guarantee or a blanket mutable-loader accusation. Exact files/blob identities
and failed/successful retrievals are retained in the critic report.

OpenCode's [server plugin contract][opencode-server] specifies that disposing an
owned transform rebuilds the remaining contributions, and an existing model
request retains its captured executable tool definitions. This is a useful
customization mechanism when the product specifies ordering and replacement.
It does not make independent mutations commutative or freeze captured external
state. The [V1 migration guide][opencode-migration] requires implementation
changes; old API review must retain its version.

Claude Code's [mods][claude-mods] run within the product and can customize its
interface and operation behavior. Its [trust documentation][claude-security]
explicitly distinguishes the sandbox/permission rules for model tool calls from
plugin-owned code. Our ordinary extension cannot become the authority deciding
its own grants or alter a trusted approval display. That is an existing product
boundary; the desired customization surface should be designed around it.

Claude's [permission reference][claude-permissions] further qualifies mediated
tool-call precedence by managed policy, credential and mode: in a session
without the documented managed-settings or qualifying Team/Enterprise login
protection, a mod can also approve a call rejected by a deny rule. These are
explicit trusted-code semantics. A protected permission display does not
sandbox direct file/process access by a native mod. Our authority rule is our
product's contract to enforce, not a universal guarantee inferred from peers.

### Mature ecosystems

| System | Useful lesson | Limit that must remain visible |
| --- | --- | --- |
| Backstage | Small plugin-owned points, additive or singleton cardinality, a pre-start registration barrier, supplier attribution when later connection fails | Dynamic startup selection is not unrestricted live topology mutation; trusted shared-process plugins are not sandboxed. |
| VS Code | Declarative contribution metadata, lazy activation, runtime placement and tools for finding slow/broken extensions | Shared-host extensions can block each other; host placement is not a per-plugin permission boundary. |
| IntelliJ | Explicit points, plugin-scoped services/disposal, conditional dynamic unload and binary compatibility checks | A longer-lived parent can retain a retired plugin; successful binary verification does not prove semantic or lifetime correctness. |
| HashiCorp go-plugin | Existing subprocess RPC/version machinery and an explicit process owner | Trusted checksum origin and preventing modification before execution are separate obligations. |
| Wasmtime | Capability-oriented guest interfaces and optional computation limits | Guest fuel/epochs do not stop a blocked host call; a store resource limiter does not account for all embedder memory. |

Backstage's [extension points][backstage-points] are especially close to our
no-fork goal: expose a small public contract from the consuming plugin, reject
ambiguous singleton contributions, and preserve which module supplied a failing
provider. Product readiness still decides whether that provider is required.
Its inspected [initializer source][backstage-initializer] rejects feature
addition after startup begins. This supports controlled composition; it does
not require importing Backstage's container into GM.

The [VS Code CPU guide][vscode-cpu] and [runtime security page][vscode-security]
qualify broad claims about extension-host isolation. Its API also says async
subscription disposal is not awaited. IntelliJ's [disposal guide][intellij-disposal]
warns against attaching plugin resources directly to an Application or Project
that outlives unloading. Our existing resource/attempt owner must retain actual
cleanup outcomes and debt. Another generic disposal manager would not solve it.

Backstage's [version policy][backstage-versioning] distinguishes some consumer
stability promises from producer implementation changes. We therefore need
conformance for the author implementing a point as well as the product calling
it. Compatibility has structural, behavioral, lifetime and artifact aspects;
one semver range cannot certify all four.

### Concrete failures retained as historical lessons

| Source and fixed status | Failure mechanism | Reusable falsifier / existing pattern |
| --- | --- | --- |
| OpenCode [PR60668][opencode-shutdown], merged October 30, included in v2.2.5 | Shutdown callbacks published catalog/status changes; clients fetched again and recreated the resource being evicted. The final fix scopes and stops callbacks before closing connections. | Stopping a resource must not trigger its own recreation through observers; PR-07 and PR-11. |
| Dify [PR839][dify-839] and [PR840][dify-840], merged October 21, included in 0.6.12 | Exact version/checksum dispatch needed tenant installation authorization; the first repair bypassed a useful cache, and the follow-up restored cache reuse with shared post-commit uninstall invalidation. | Keep selected bytes, current authority and cache invalidation separate; PR-06, PR-09 and PR-10. |
| Dify [PR799][dify-799], merged August 24, included in 0.6.11 | Local child processes inherited the daemon environment until the spawn boundary used an allowlist. | A separate process still needs an explicit environment/authority boundary; PR-12. |

These repairs are evidence of known mechanisms and maintenance, not current
defect-rate measurements or a ranking. The upstream test reports were not rerun.

## What scale has actually been demonstrated

### Composition and finite construction

The retained [October validation](static-composition-and-controlled-restart-validation.md)
passed N100/N500/N1000 through eight capped stages of the descriptor-union
recipe. That EF repetition used frozen public Core/Assembly **0.7.0**, Resources
**0.2.1** and Conformance **0.5.0**, with driver source `b70ba393` and registry
distribution replacements. It is neither current `5fb83478` source qualification
nor a run of latest `0.7.1`. The N1000 record contains **1,001 declarations** (1,000 features plus the
input), **2,000 entries and groups combined, 1,997 edges and 7,003 files**. Its finite
smoke work performed **2,001 attempts and 1,002,000 factory calls**. Reported
71.34-second cold compilation and 34.22-second runtime belong to that exact
fixture/environment, not a product latency target or cross-vendor comparison.

This is useful graph/compiler/construction evidence. It neither claims 1,000
long-lived execution realms nor models arbitrary dense graphs, all independent
package combinations, editor responsiveness or user workloads. The earlier
compiler failure belongs to its older recipe; it is not a current universal
TypeScript limitation.

Dense graphs are not wholly untested. Source-inspected [Core tests][gm-dense]
define the private P500 admission-to-semantics-to-output pipeline with 500
modules and a 48-provider many window, independent complete plan/digest oracles,
input permutations and missing-binding/order controls. It also checks the literal
2,048/2,049 depth boundary. The [primary vectors][gm-dense-vectors] identify 1,496
bindings, 23,821 provider occurrences and 22,824 distinct adjacency edges for
P500. The [historical profile][gm-dense-history] separately records a private
4,096-node/258,048-edge traversal fixture. This round did not rerun these dense
tests or independently inspect a named dense-test CI receipt. They have narrower subjects
than the actual product's public carrier and active runtime. There is no reason
to rerun dense toy fixtures merely because the 1,024-live-instance graph is small.

### Simultaneously live instances

Current GM's [live-instance test][gm-live-test] prepares **one receiver module
and one borrowed source input**, then creates **1,024 distinct live receivers in
separate scopes**, split across two source objects. It proves exact repeated
event delivery, source separation, closing half while the rest stay usable,
complete final unsubscribe, no duplicate cleanup and fresh reuse of the prepared
template. Callbacks are synchronous. This closes a real lifetime/custody evidence
gap that the older finite construction loop did not cover.

The research inspected the test and actual successful hosted evidence. On
[run 41971404753][gm-ci], exact source
`3aae8a2e6695ba1fca96beea68e674a3c27ef0e9`, all 64 jobs succeeded. Named test
execution and tracked-workspace integrity were independently read in Ubuntu,
macOS and Windows job logs; the nine Assembly lanes succeeded. This is existing
upstream execution, not a new local run. The merged main source retains the test.

It does **not** model 1,024 independently released plugin implementations,
operating-system processes, real tenants/grants, asynchronous business jobs,
arbitrary descendants, sustained throughput, bounded RSS or restart churn.
Calling it only a descriptor test would understate the evidence; calling it a
production thousand-plugin capacity proof would overstate it.

### Algorithm and lifetime fixes after the old snapshot

GM's [November qualification record][gm-refactor] retains reproduced preparation
aliasing, completed-profile admission, deep cleanup, retained-parent, candidate
allocation and deep-value failures, with rejecting baseline controls and their
repairs. For example, a graph with 1,024 providers and 2,048 unresolved slots
materialized 2,097,152 candidate references before preparation-local reuse.
The all-candidates diagnostic output can still be large; the repair is not a
universal linear-memory guarantee. Deep-tree cleanup and detached-child
retention were also tested at their actual owner.

That record also retained a false-green nested test invocation caused by an
inherited Node test environment variable. Its repair checks actual executed
test receipts. The lesson is to inspect named execution, cancellation/skip
counts and independent controls, rather than interpreting process exit zero as
complete qualification.

The currently published npm versions precede the later main-only repairs.
Orchestrator has its own older accepted baseline and first-materialization
gates. Neither a main commit nor a registry release upgrades that consumer.

## A capacity statement needs several denominators

| Axis | Evidence already available | Remaining product question |
| --- | --- | --- |
| Catalog size and metadata discovery | Inert loading/selection experiments and current industry patterns | How much I/O, indexing and diagnostic output is needed for an installed catalog with a small selected subset? |
| Selected graph size, depth and edges | Bounded N1000 recipe; P500 private dense semantic/output checks; depth and preparation regressions | Which real product shapes, public carrier, shared capability fan-out and authoring/IDE budgets fit the initial envelope? |
| Live instance count | 1,024 scoped receiver instances with exact cleanup | What do real instances retain while doing async work, including failed setup and shutdown? |
| Concurrency and overload | Existing finite lifecycle examples | Are global, tenant, extension and downstream budgets enforced with explicit backpressure and fair progress? |
| Execution placement | Bounded Worker/process observations | Which failure/permission cohorts share a realm, and what are their actual process/handle/memory costs? |
| Update and failure retention | Bounded stop, admission and cleanup counterexamples | Do repeated real updates, failures and late callbacks remain within total generation/cache/debt budgets? |
| Independent authors and versions | Existing contract/packed-consumer checks | Can independently packaged contributions coexist, diagnose conflicts and survive a supported upgrade? |
| Agent-facing tools and skills | Current provider/MCP documentation | What are transport bytes, context tokens, search recall, wrong-tool rates and call-time authorization behavior? |

As an arithmetic illustration, not a deployment estimate: 100 active instance
scopes per tenant, 20 tenants and two retained generations produce 4,000 scopes
if those lifetimes are independent. That does **not** imply 4,000 processes.
The actual realm count depends on justified sharing and the required failure
and authority boundaries. A per-generation or per-tenant cap alone cannot bound
the complete host. Failed candidates and unresolved cleanup consume capacity.

Do not select one process per module, or a single process for all plugins,
from module count alone. Trusted ordinary modules can use ordinary composition;
selected extension cohorts can use existing execution adapters where their
fault/authority requirements justify the boundary. Resource and effect owners
remain explicit even when execution is shared.

## Agent-facing catalog scale is a separate product responsibility

[Tool Search][tool-search] illustrates deferred model-context loading and
on-demand discovery. Its current API still receives the definitions in the
request; context reduction is not automatically transport reduction. Its vendor
performance observations are not our benchmarks. A plugin can contribute many
tools or no tools, so module count cannot stand for context cost.

The [MCP 2026-07-28 tools specification][mcp-tools] recommends deterministic tool
ordering and specifies pagination, caching and authorization-sensitive catalogs. The [release notes][mcp-release]
describe a stateless protocol core; application state still needs explicit
ownership. Installed clients/servers may use earlier revisions. Do not silently
change an adapter protocol or assume that catalog discovery grants execution.

For the first actual agent-tool projection, reuse its provider/protocol adapter.
Measure the catalog, eligible tools, loaded executable set and model-visible
shortlist separately. Test similar names and authority namespaces, stale search
results, changed grants and irrelevant descriptors. A reduced shortlist must
retain useful discovery; token savings without recall or call-time checks are
not an adequate goal. This extends the pattern register with PR-19.

## What an industry-leading claim should have to demonstrate

The ambition is best translated into reproducible user outcomes within a named
profile. These are proposed evaluation criteria, not established achievements:

1. An independent author adds a tool or context source, replaces a provider,
   extends another plugin and customizes a supported UI/workflow surface using
   documented contracts, without modifying product source.
2. Two contributors with conflicting intent receive a deterministic result or
   actionable rejection. Discovery permutations preserve outcomes for identical
   declared inputs; explicit pipeline order can intentionally change behavior.
   Diagnostics show the point, contract/version, both suppliers, effective
   selector/order and a practical repair, with full provenance available.
3. An admitted operation retains its selected collaborators; failure, cancellation,
   update and late completion do not erase effects or silently cross generations.
4. A declared deployment envelope bounds activation, async work, queues,
   subprocesses, handles, retained generations and cleanup debt, including one
   noisy contributor and unequal tenant load.
5. A supported host/plugin upgrade preserves the documented user journey and
   detects producer as well as consumer incompatibility before readiness.
6. Operators can explain installed versus active versus serving state and locate
   a failing contribution without guessing from a global plugin-enabled flag.

The ordinary author should learn the relevant point and its contract, not the
entire rollout/custody protocol. Conversely, customization must not turn every
helper into an overridable public API. Each additional point creates a behavior,
compatibility and support responsibility. Strong mechanisms with a few complete
author journeys are more informative than feature-count parity.

Contract support follows the owner's MVP and version policy. Deliberate breaks
remain allowed with an explicit version/lock change, understandable rejection
and migration guidance. A peer's deprecation practice does not create a new
permanent compatibility promise here. Narrow typed hooks, workflow transforms
and UI contributions can be useful under static composition and controlled
restart; they are different from arbitrary global mutation or universal unload.

## Next qualification work and stop conditions

The next tests belong at actual product boundaries. Repeating unchanged toy
matrices would not answer the remaining questions. Select these in order as the
real surfaces become available; no extra framework is a prerequisite.

| Priority | Minimal realistic experiment | Independent outcome that can change the decision |
| --- | --- | --- |
| 1 | One visible no-fork journey: feature plugin A, independently packed extension B using A's public contract, and a small conflicting contribution | B both replaces the selected provider actually used by existing consumers and changes one useful workflow or UI behavior while preserving A's other behavior. No private imports or source edits; identical declared inputs survive discovery permutations; conflict/readiness diagnostics give a repair. |
| 1 | Existing verify-then-replace witness against the actual artifact handoff, including a helper import | The executed closure remains bound to admitted bytes, or activation refuses before substituted code obtains a useful capability. Hashing alone is not the outcome. |
| 2 | Real async workload under chosen total/tenant/extension budgets, one slow/noisy contributor and oversized output | Bounded acceptance/queues, fair progress, explicit overload, retained in-flight ownership and measured unaffected operations on named hardware. |
| 2 | Repeated failed setup/restart/cleanup at that same seam, with an observer that tries to recreate retiring resources | No post-seal admission or unintended resurrection; bounded generations/listeners/handles/cache/debt; accepted work and effects remain accounted for. |
| 3 | Expand the first journey across one supported upgrade matrix and additional actual surfaces | Independent producer/consumer compatibility, understandable rejection of unsupported versions, permission preservation and a working documented migration. |
| 3 | Real model-facing discovery with extra inert descriptors, similar names, stale snapshots and revoked grants | Relevant-tool recall and token/transport/latency measurements, with denied effects enforced by the receiver. |

Performance thresholds need the actual deployment profile and representative
workload. This research does not invent a universal p99, RSS limit or sustained
request rate. Correctness assertions can be fixed now; capacity claims require
the stated hardware, artifacts, graph shape, data sizes, concurrency and time
window. Stop expanding a test once its decision-changing uncertainty is resolved.

The first journey permits ordinary dependency/configuration/lock changes, builds
B against public contracts outside workspace aliases, and observes the changed
user outcome rather than just registration. Removing B and controlled restart
must restore the baseline task. If that journey covers workflow only, UI remains
unqualified, and conversely. Do not invent a dummy UI or a new public framework
to tick a box. Record author concepts, boilerplate, missing documentation and
whether the diagnostic is sufficient to repair a failure. Minimal author burden
is an unqualified goal until observed with an independent author.

For the first controlled-restart integration, the existing planning estimate
remains **0 new shared production LOC, 150–500 product integration LOC and
600–1,400 test/fixture LOC**, assuming the selected product already owns its
operation and custody adapters. It is a scoped October estimate with at least
approximately twofold uncertainty, not a new quotation for a full plugin
platform. New public UI, hostile execution, marketplace and distributed rollout
work are excluded. Additional no-fork journey work is not estimated until its
actual public surface is selected; zero shared code is an assumption to verify,
not the total price of deep customization. No production or product integration
code is added here.

| Direction within its stated scope | Confidence /10 | Expected reliability /10 | Complexity /10 | Adoption disposition |
| --- | --- | --- | --- | --- |
| Existing GM plus narrow product points and controlled restart, trusted first slice | 9 | 8, conditional on real joins | 4 | Continue the accepted direction and qualify the actual seam. |
| Narrow typed workflow transform or UI contribution under the same static composition | 8 | 8 under its explicit conflict/authority contract | 5 | Qualify one useful author journey. Production/integration LOC requires the actual selected surface; the backend estimate does not cover it. |
| Optional existing process/RPC boundary for a selected noisy extension cohort | 8 | 8 for the selected process-fault boundary | 7 | Use only with the existing execution owner and qualified authority/environment policy. No total implementation LOC is defensible before choosing the adapter and profile. |
| Generic global mutation registry with implicit last-writer conflict handling | 3 | 3 | 7 over its lifecycle | No demonstrated need or bounded implementation estimate; keep point-specific rules instead. |
| Universal in-process unload across arbitrary plugin state and references | 2 | 3 | 10 | No bounded contract or honest total estimate; outside the accepted restart scope. |

Scores are engineering judgments, not measured uptime or vendor rankings. The
first row's estimate applies only to its named backend slice. The other rows do
not have an honest production/integration total without further scope; the
retained investigator reports estimate small test-only falsifiers separately.
No new decision conflicts with an accepted ADR in this review.

## Retained review and reproduction material

The [companion evidence bundle](evidence/plugin-industry-scale-20261105.tar.gz) retains the full owner brief, investigator
reports, independent critic reports, exact internal evidence receipts and the
root's model-facing source note. It does not redistribute competitor code or
claim that their tests were run here. See the [JSON receipt](evidence/plugin-industry-scale-20261105.json) for the
member inventory and checksums. The existing October archives are unchanged.

Current review dispositions and final documentation validation are recorded in
the bundle and PR55. Accepted ADRs, public APIs, dependency pins and experimental
source inputs remain with their existing owners.

The documentation gate is recorded separately from the complete repository
gate. Local Foundation-based commands are blocked by the current organization
compiler policy: pinned Foundation 1.7.2 statically initializes API Extractor
7.58.12 and its TypeScript 5.9.3 dependency, while the policy requires 7.0.2 or
newer, including embedded compilers. The workspace compiler is 7.0.2. The
bundle retains the inspected import chain and resolved package metadata. No
older compiler was initialized in this review, and no pin or gate was weakened;
the owning Foundation upgrade route must resolve that existing conflict.

## Source navigation

All current external documentation above was retrieved on 2026-11-05. The bundle
contains the complete source ledgers, observed release anchors, source-vs-doc
qualifications and targeted critic corrections. The links here route to the
claims that affect the recommendation; they are not an exhaustive market list.

[gm-main]: https://github.com/agent-teams-ai/get-modular/commit/5fb83478dd7b95216be92c4d3077eddf2774eef8
[gm-live-test]: https://github.com/agent-teams-ai/get-modular/blob/5fb83478dd7b95216be92c4d3077eddf2774eef8/tests/assembly/live-instance-custody.test.ts
[gm-ci]: https://github.com/agent-teams-ai/get-modular/actions/runs/41971404753
[gm-refactor]: https://github.com/agent-teams-ai/get-modular/blob/5fb83478dd7b95216be92c4d3077eddf2774eef8/docs/qualification/foundational-runtime-refactor-2026-11.md
[gm-dense]: https://github.com/agent-teams-ai/get-modular/blob/5fb83478dd7b95216be92c4d3077eddf2774eef8/packages/core/tests/features/composition-semantics/scale-integration.test.mjs
[gm-dense-vectors]: https://github.com/agent-teams-ai/get-modular/blob/5fb83478dd7b95216be92c4d3077eddf2774eef8/architecture/qualification/v1/resource-boundary-vectors.json
[gm-dense-history]: https://github.com/agent-teams-ai/get-modular/blob/5fb83478dd7b95216be92c4d3077eddf2774eef8/docs/qualification/v1-contract-council-and-resource-profile.md
[orchestrator-main]: https://github.com/agent-teams-ai/agent-teams-orchestrator/commit/5a8496ce711909e381c5bc817fff5500be9a1761
[orchestrator-0117]: https://github.com/agent-teams-ai/agent-teams-orchestrator/blob/5a8496ce711909e381c5bc817fff5500be9a1761/docs/decisions/0117-reconcile-mandatory-module-composition.md
[openclaw-architecture]: https://docs.openclaw.ai/plugins/architecture
[opencode-server]: https://opencode.ai/v2/docs/build/plugins/server/
[opencode-migration]: https://opencode.ai/v2/docs/build/plugins/migrate-v1/
[opencode-shutdown]: https://github.com/anomalyco/opencode/pull/60668
[claude-mods]: https://code.claude.com/docs/en/plugins/mods/overview
[claude-security]: https://code.claude.com/docs/en/plugins/security
[claude-permissions]: https://code.claude.com/docs/en/permissions#extend-permissions-with-hooks
[dify-839]: https://github.com/langgenius/dify-plugin-daemon/pull/839
[dify-840]: https://github.com/langgenius/dify-plugin-daemon/pull/840
[dify-799]: https://github.com/langgenius/dify-plugin-daemon/pull/799
[backstage-points]: https://backstage.io/docs/backend-system/architecture/extension-points/
[backstage-initializer]: https://github.com/backstage/backstage/blob/c6395a54e68e1b4590e3db1f0a5d29f9ec0b0aa1/packages/backend-app-api/src/wiring/BackendInitializer.ts
[backstage-versioning]: https://backstage.io/docs/overview/versioning-policy/
[vscode-cpu]: https://github.com/microsoft/vscode/wiki/Explain-extension-causes-high-cpu-load
[vscode-security]: https://code.visualstudio.com/docs/configure/extensions/extension-runtime-security
[intellij-disposal]: https://plugins.jetbrains.com/docs/intellij/disposers.html
[tool-search]: https://platform.claude.com/docs/en/agents-and-tools/tool-use/tool-search-tool
[mcp-tools]: https://github.com/modelcontextprotocol/modelcontextprotocol/blob/3c4d91b7e832d9b74338d56eed03403ccc662123/docs/specification/2026-07-28/server/tools.mdx
[mcp-release]: https://blog.modelcontextprotocol.io/posts/2026-07-28/
