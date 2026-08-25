---
id: OD-003
type: open-decision
status: open
owner: architecture
summary: Tracks unresolved contract token, runtime host, ordering, handover, compatibility, state migration, and proof choices.
related:
  - ADR-0001
  - ADR-0006
  - ADR-0007
  - ADR-0008
  - ADR-0009
  - ADR-0010
  - ADR-0012
---

# OD-003: Module Runtime And Public SPI Choices

## Decision required

Choose the first executable module graph and runtime contracts without exposing
a dependency-injection framework or prematurely promising one invocation model
for trusted and isolated implementations.

## Constraints

- ADR-0010 cumulative ownership, authority, identity, transaction, trust-tier, graph, and
  state boundaries are fixed.
- Product-specific SPIs remain in Orchestrator, Agent Runtime, Frontend, or
  another consuming product.
- Extension Foundation cannot import Run, Task, RuntimeSession, React component,
  or another product model.
- A built-in module is not a plugin artifact. One admitted plugin artifact may
  provide multiple contributions. Artifact installation, contribution
  authorization, graph activation, and runtime generation remain distinct.
- A runtime generation has exactly one discriminated activation source:
  artifact-backed contribution installation or authority-scoped built-in module
  installation. Built-ins never receive synthetic artifact identities.
- Public contracts cannot contain Cordis Context, Fiber, Awilix, container,
  loader, or configuration types.
- Every invocation is fenced by authority scope, graph generation, runtime
  generation, immutable grant identity, and a monotonic non-reused revision in
  that grant lineage. This safety floor is not open for selection here.

## Options

### Contract tokens

- Branded TypeScript values with explicit version-family identity.
- Serializable contract descriptors plus generated TypeScript bindings.
- A smaller static module descriptor with product-owned typed keys.

The choice must prove duplicate detection, deterministic identity, useful
diagnostics, and no generic runtime resolver in product code.

### Runtime hosts

- A small native trusted-module runner plus a separate process contribution
  protocol.
- Cordis `4.0.1` behind a private adapter for trusted modules plus the same
  separate process protocol.
- A process-first host, accepting higher overhead for stronger uniformity.

Cordis is a candidate, not a dependency decision. Replaceability requires two
host adapters passing the same applicable lifecycle traces; source-level type
isolation alone is not conformance evidence.

### Candidate dependency watchlist

This table is non-normative research evidence, observed on 2026-08-24. An entry
does not admit a package, select a runtime, or authorize its types in a public
contract. Recheck the stable version, license, provenance, and conformance
evidence immediately before adding any dependency.

| Candidate | Observed version | Possible role | Required boundary |
| --- | --- | --- | --- |
| [`@deepseek-ai/cordis`](https://github.com/deepseek-ai/deepseek-harness/tree/master/vendor/cordis) | `4.0.1` | Experimental trusted in-process module-host adapter with scoped services, fibers, and reverse effect cleanup | This DeepSeek-owned package is distinct from upstream `cordis@4.0.0-rc.8`. Pin exactly; keep `Context`, `Fiber`, loader, and configuration types inside the adapter; do not delegate product readiness, routing, fencing, durable recovery, or isolation. Reject it if the qualification requires a second competing lifecycle state machine. |
| [`awilix`](https://github.com/jeffijoe/awilix) | `13.0.5` | Consumer-owned bounded-context composition | Not a Foundation module runtime. Keep it under product `composition/**`; no cradle, container, registration, or resolver types may cross into features or contracts. |
| [`@dagrejs/graphlib`](https://github.com/dagrejs/graphlib) | `4.0.5` | Private graph-algorithm implementation or differential test oracle | The owned compiler still defines canonical identity, stable tie-breaking, provider selection, diagnostics, serialization, and digest semantics. No mutable graph object or library error crosses the boundary. |
| [`fast-check`](https://github.com/dubzzz/fast-check) | `4.9.0` | Property-based graph and lifecycle conformance tests | Development dependency only; generated cases must assert product-owned invariants and retain deterministic seeds for failures. |
| [`xstate`](https://github.com/statelyai/xstate) and [`@xstate/graph`](https://github.com/statelyai/xstate/tree/main/packages/xstate-graph) | `5.32.5` and `3.0.4` | Deferred model-based lifecycle test oracle when the accepted transition matrix becomes non-trivial | Do not make actors, machines, snapshots, or XState persistence the default product runtime or public protocol. |
| Node.js [`AsyncDisposableStack`](https://nodejs.org/api/globals.html#class-asyncdisposablestack) | Node `24.18.0` baseline | Native LIFO cleanup primitive for trusted runtime resources | Cleanup is cooperative and does not prove process termination, product rollback, drain completion, or external-effect reversal. |
| [`@lumino/application`](https://github.com/jupyterlab/lumino) | `2.4.10` | Reference implementation and possible adapter spike for typed plugin dependencies and activation | Frontend-oriented lifecycle semantics remain private; it does not own product health, publication fencing, durable recovery, or hard termination. |
| [`avvio`](https://github.com/fastify/avvio) | `9.3.0` | Reference for deterministic boot, readiness, timeout, and reverse close ordering | Treat as boot/close machinery, not a dynamic module graph, hot-update protocol, or product authority layer. |
| [`@backstage/backend-plugin-api`](https://github.com/backstage/backstage) | `1.10.0` | Reference for explicit plugin initialization and shutdown hooks | Do not import Backstage's product framework or treat process-shutdown hooks as runtime plugin unload. |
| [`effect`](https://github.com/Effect-TS/effect) | `3.22.1` | Scoped resource and layer reference for an intentionally Effect-native consumer | Do not introduce Effect types as a hidden adapter vocabulary in otherwise plain product ports and factories. |
| [Extism](https://github.com/extism/extism) | `v1.30.0` | Deferred post-MVP WASM host for language-neutral isolated extensions | Separate trust-tier adapter and conformance suite; no WASM ABI, host function, or Extism type enters product SPI. |

The first qualification slice should prefer native typed factories and standard
resource-management primitives. A candidate library is introduced only when a
measured reduction in lifecycle or composition complexity outweighs its adapter,
upgrade, and negative-conformance cost.

The agreed reuse boundary is recorded by ADR-0012. Commodity primitives remain
behind owned ports and diagnostics: Node resource disposal for cooperative local
cleanup, `fast-check` for property and fault generation, a graph package only as
a private algorithm or differential oracle, OpenTelemetry through an
observability adapter, and the already accepted ORAS and Cosign distribution
baseline. Awilix remains consumer composition machinery, and Extism remains a
deferred isolated-host adapter. Package admission and exact dependency versions
still require executable qualification; this list is not permission to expose
their types or install all candidates preemptively.

### Ordering and handover

- Explicit ordered collections with stable product-owned priority and conflict
  rules.
- Named single-provider selection with no collection semantics in the first API.
- Generation handover with either drain-before-route or route-before-drain,
  selected per contribution contract and tested against in-flight invocations.

The host must compile one valid handover plan for the complete affected
dependency closure. Per-contribution route or drain policies are valid only
when their combined ordering is acyclic and preserves every required dependency;
an incompatible mixed-policy chain is rejected before staging. The old grant is
fenced before its runtime enters drain, so no new invocation can enter it.
Candidate cleanup owns only newly staged runtimes. Referenced existing runtimes
acquire durable staged pins under the runtime retirement fence. Publication
promotes those pins; abandonment releases them. A runtime remains pinned until
no staged candidate, live graph, or accepted bounded invocation references it;
retirement rechecks reachability under the same fence.

The final contract must still decide health gates, bounded completion versus
cancellation of already accepted in-flight work, and when recovery may activate
another generation versus requiring reconciliation or roll-forward. External
startup effects cannot be made transactional by graph publication.

### Compatibility and state migration

Decide contract token identity, caller and callee compatibility direction,
supported ranges, unknown-field behavior, deprecation, N/N-1 fixtures, and
negative cases. Define plugin-private state migration, checkpoint, rollback,
export, retention, and deletion protocols without moving product migrations into
Foundation.

### Public API evidence

ADR-0010 already fixes the minimum publication floor: one real product slice, a
stable owner, two independently authored conforming implementations,
compatibility fixtures, negative tests, and an executable conformance suite.
This decision chooses the evidence format, independence proof, compatibility
matrix, and any additional evidence required by the first concrete SPI. It does
not weaken that floor.

### Candidate repository topology

The following layout preserves the current research without reserving packages
or accepting their public APIs. Create a package only when a real product slice
and the ADR-0010 evidence justify it.

```text
packages/<admitted-capability>/
  core/                  # optional product-neutral library admitted after reuse evidence
  module-adapter/        # optional integration with the module runtime
  test-kit/              # optional reusable conformance fixtures
  adapters/<technology>/ # only independently released integrations
```

This is an illustrative role layout aligned with ADR-0012, not a reserved
horizontal package topology. Before cross-product admission, the first graph and
lifecycle implementation stays inside its owning product feature. No
`module-kit`, `plugin-protocol`, integration or testing package is created by
this open decision. Product-scoped libraries and module adapters stay in the
owning product repository; proposed ADR-0013 records the ownership correction
that still requires product-owner approval.

- A module is a runtime composition and lifecycle unit. A plugin artifact is a
  signed distribution, trust, installation, and update envelope.
- One plugin artifact may provide one or more contribution modules or proxies.
  A built-in module needs no plugin artifact.
- Product SPIs remain in their owning products. Contracts, ports, and adapters
  stay inside the owning feature by default.
- A separate adapter package is justified only by an independent dependency,
  release, replacement, or deployment lifecycle.
- After at least two products prove the same topology rules, the reusable part
  may become an Engineering Foundation profile. This candidate is not that
  promotion decision.

## Acceptance criteria

- Compile a deterministic graph with missing, cyclic, ambiguous, incompatible,
  and duplicate-provider negative fixtures.
- Prove one trusted runtime and one isolated runtime without sharing
  non-serializable public types.
- Prove required and optional multi-contribution dependencies, explicit
  contribution selection, separate authorization, partial failure, and the
  selected recovery behavior.
- Prove grant binding, revocation fencing, stale-generation rejection, drain,
  cancellation, unknown-outcome reconciliation, and bounded streaming.
- Prove that a current new grant lineage may start at the same numeric revision
  as an old lineage, while the stale old grant tuple is rejected and cannot
  cross an authority scope.
- Prove artifact-backed and built-in activation sources, immutable built-in
  implementation identity, and same-scope versus cross-scope graph admission.
- Prove exact one-contribution installation mapping, explicit multi-instance
  identity, manifest-local uniqueness, and wrong-parent or grouped-sibling
  rejection.
- Prove that a graph contains only same-scope runtimes and that cross-scope
  dependency or routing edges fail compilation.
- Prove closure-wide handover planning, pre-drain fencing, and rejection of an
  incompatible mixed route/drain policy chain.
- Prove failed-candidate and successful-handover reuse of an existing runtime,
  including staged, graph, and in-flight reachability pins before retirement,
  crash recovery, atomic promotion, abandonment release, and a retirement race.
- Prove exact artifact-versus-contribution private-state attachment, compatible
  schema lineage, and sibling-contribution isolation.
- Prove catalog and direct-digest trust routes with applicable and explicitly
  not-applicable entitlement, independent product authorization, and mismatched
  graph-to-runtime-to-source-to-grant relationships.
- Prove fail-closed negative provenance, trust-route, compatibility,
  entitlement, product authorization, and capability-grant outcomes.
- Prove explicit state custody authorization for every operation, including
  missing, stale, expired, wrong-scope, wrong-lineage, wrong-installation,
  wrong-schema, and wrong-operation rejection.
- Prove interruption, retry, uncertain termination, exact state detachment, and
  target-specific contribution, built-in, and artifact retirement at every
  checkpoint, including sibling contributions and attachments.
- Prove N/N-1 request and response fixtures for every direction selected by the
  final compatibility decision.
- Prove that Cordis or any other composition library can be replaced without
  changing product-owned ports or published plugin protocols.
- Keep non-normative research evidence pinned to immutable source revisions:
  [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness/tree/b150a551b8d465e31e418e1b2eaf5e79bbb7d28e),
  [Lumino](https://github.com/jupyterlab/lumino/tree/d9b39db2c6d609af334729eeba2ab9376a11c0a7),
  [Backstage](https://github.com/backstage/backstage/tree/de92faeb4a375af5bd4f7a84311e702736e98964),
  [VS Code](https://github.com/microsoft/vscode/tree/62e4ec989dc0bb317b431d9d23a36019ef3c0d5b),
  and [Spring Modulith](https://github.com/spring-projects/spring-modulith/tree/fc0a547c05dfd240d23c32f3fbb9fa45283af21f).

## Resolution

Open. When resolved, set `status: resolved`, add `resolved_by: ADR-NNNN`, and
retain the deciding ADR in `related`.
