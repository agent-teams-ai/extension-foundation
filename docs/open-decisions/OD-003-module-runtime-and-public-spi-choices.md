---
id: OD-003
type: open-decision
status: open
owner: architecture
summary: Tracks unresolved extension host, public SPI, invocation protocol, and extension-state migration choices without reopening Get Modular composition ownership.
related:
  - ADR-0001
  - ADR-0011
  - ADR-0013
  - ADR-0014
  - ADR-0015
---

# OD-003: Extension Host, Public SPI, And State Migration Choices

## Decision Required

Choose any production extension host or runtime adapter, public extension SPI,
invocation protocol, and extension-state migration semantics only after
product-local static composition supplies the retained triggers and evidence
from ADR-0013 as preserved by ADR-0015.

This open decision does not select or redefine neutral module identities,
declarations, dependency cardinalities, bindings, graph compilation, canonical
plans, or plan digests. Those semantics belong to the independent
[`get-modular`](https://github.com/agent-teams-ai/get-modular) repository and
its own decisions. OD-003 therefore does not block Get Modular `0.x` work that
passes Get Modular's local production gates.

The already approved guardrails are resolved by
[ADR-0014](../decisions/0014-product-local-module-authoring-composition-and-generation-guardrails.md).
They are not open alternatives here. This open decision cannot authorize a
Foundation package, production graph runtime, or public SPI by implication.

## Fixed Constraints

- ADR-0011's cumulative ownership, authority, identity, transaction,
  trust-tier, graph, lifecycle, and state safety floor remains fixed.
- ADR-0015 preserves ADR-0013's product-local feature, static Pure DI, and
  private-graph trigger rules while authorizing the independent Get Modular
  pre-1.0 composition repository.
- A public Extension Foundation SPI requires independently authored
  implementations, executable conformance, and a separate accepted publication
  decision. Get Modular adoption evidence alone does not authorize an extension
  SPI or production extension host.
- Product-specific SPIs remain in the consuming product. Foundation cannot
  import product domain or host-framework models.
- Public contracts cannot expose container, loader, configuration, graph
  library, or host-framework types.
- A built-in module is not a plugin artifact. Artifact installation,
  contribution authorization, graph activation, and runtime generation remain
  distinct.
- Every production host remains subject to the accepted production-host safety
  closure and its own authority and termination evidence.

## Open Choices

### Public Extension SPI And Compatibility

If independent consumers justify publication, decide the exact extension
manifest, contribution descriptor, host invocation contract, compatibility
grammar, unknown-field and deprecation rules, version negotiation, publication
surface, and conformance evidence. The public extension SPI exposes only
Extension Foundation identity and protocol vocabulary. A product-owned adapter
may translate admitted contributions into Get Modular declarations and plans,
but this decision cannot prescribe or redefine that adapter's Get Modular API.

ADR-0011's conditional minimum publication floor still applies after an owning
product admits the applicable production-host profile: a real product slice,
stable ownership, two independently authored conforming implementations,
compatibility fixtures, negative tests, and an executable conformance suite.
Get Modular adoption or promotion evidence does not satisfy this publication
floor.

### Private Extension Host Runtime Implementation

After an owning product records the required trigger decision, choose whether a
private extension host uses minimal native mechanics or a qualified private
adapter around a commodity container or resource-management library. Get
Modular may supply an already compiled composition plan, but neither Get
Modular nor the selected tool can own product readiness, routing,
authorization, fencing, durable recovery, state custody, or isolation. Reject
a candidate that requires a second overlapping lifecycle state machine.

The decision must define deterministic diagnostics, lifecycle traces, health
gates, handover order, bounded drain or cancellation, recovery, candidate
cleanup, and restart-required behavior. It must remain compatible with
ADR-0014's distinct plan-content, candidate-generation, and active-head
identities.

### Production Hosts And Invocation Protocols

Decide trusted in-process resource adapters separately from isolated Worker,
process, WASM, Electron, and browser-realm hosts. For every admitted placement,
define framing, schema limits, authentication, negotiation, backpressure,
idempotency, timeouts, cancellation, terminal receipts, and stale-generation
fencing. No transport or host provides a universal security or physical-unload
claim.

Cross-target placement and distributed cutover remain product deployment
choices. An atomic active-head decision does not imply simultaneous observation
by every router or effect store.

### State Migration And Custody

Define plugin-private state compatibility, checkpoint, migration, rollback,
export, retention, deletion, and recovery protocols. Every operation remains
subject to the independent state-custody authorization and exact attachment
identity required by ADR-0011. Product migrations and canonical product state
do not move into Foundation.

## Required Evidence

A resolving decision must name the exact product trigger, owner, implementation
or public surface, applicable host placements, compatibility and migration
rules, negative cases, immutable evidence, and conformance results. Runtime,
host, public-SPI, and state-migration choices may be resolved separately; none
silently grants another.
