---
id: OD-003
type: open-decision
status: open
owner: architecture
summary: Tracks unresolved contract token, runtime host, ordering, handover, compatibility, and extraction choices.
related:
  - ADR-0001
  - ADR-0006
---

# OD-003: Module Runtime And Public SPI Choices

## Decision required

Choose the first executable module graph and runtime contracts without exposing
a dependency-injection framework or prematurely promising one invocation model
for trusted and isolated implementations.

## Constraints

- ADR-0006 ownership, authority, identity, transaction, trust-tier, graph, and
  state boundaries are fixed.
- Product-specific SPIs remain in Orchestrator, Agent Runtime, Frontend, or
  another consuming product.
- Extension Foundation cannot import Run, Task, RuntimeSession, React component,
  or another product model.
- A built-in module is not a plugin artifact. One admitted plugin artifact may
  provide multiple contributions that become isolated runtime proxies.
- Public contracts cannot contain Cordis Context, Fiber, Awilix, container,
  loader, or configuration types.

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

### Ordering and handover

- Explicit ordered collections with stable product-owned priority and conflict
  rules.
- Named single-provider selection with no collection semantics in the first API.
- Generation handover with either drain-before-route or route-before-drain,
  selected per contribution contract and tested against in-flight invocations.

### Compatibility and state migration

Decide contract token identity, caller and callee compatibility direction,
supported ranges, unknown-field behavior, deprecation, N/N-1 fixtures, and
negative cases. Define plugin-private state migration, checkpoint, rollback,
export, retention, and deletion protocols without moving product migrations into
Foundation.

### Extraction gate

Choose the minimum evidence for publishing the first product-neutral API. The
baseline candidate is one real product slice, a stable owner, two independently
authored conforming implementations, and an executable conformance suite.

## Acceptance criteria

- Compile a deterministic graph with missing, cyclic, ambiguous, incompatible,
  and duplicate-provider negative fixtures.
- Prove one trusted runtime and one isolated runtime without sharing
  non-serializable public types.
- Prove multi-contribution installation and graph-generation rollback as one
  explicit lifecycle decision.
- Prove grant binding, revocation fencing, stale-generation rejection, drain,
  cancellation, unknown-outcome reconciliation, and bounded streaming.
- Prove N/N-1 request and response compatibility in both supported directions.
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
