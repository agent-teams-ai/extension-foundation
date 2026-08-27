---
id: OD-003
type: open-decision
status: open
owner: architecture
summary: Tracks unresolved public SPI, runtime implementation, host protocol, and state-migration choices.
related:
  - ADR-0001
  - ADR-0010
  - ADR-0013
  - ADR-0014
---

# OD-003: Module Runtime And Public SPI Choices

## Decision Required

Choose any production module runtime, public contract, host protocol, and state
migration semantics only after product-local static composition supplies the
triggers and evidence required by ADR-0013.

The already approved guardrails are resolved by
[ADR-0014](../decisions/0014-product-local-module-authoring-composition-and-generation-guardrails.md).
They are not open alternatives here. This open decision cannot authorize a
Foundation package, production graph runtime, or public SPI by implication.

## Fixed Constraints

- ADR-0010's cumulative ownership, authority, identity, transaction,
  trust-tier, graph, lifecycle, and state safety floor remains fixed.
- ADR-0013 keeps product-local feature code and static Pure DI first. A private
  product graph requires a measured runtime-selection or independent-lifecycle
  trigger and an accepted owning-product decision.
- Foundation semantic extraction requires two real independently authored
  consumers, cross-consumer conformance, and a separate accepted extraction
  decision. Package extraction evidence alone is not semantic ownership.
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

### Public SPI And Compatibility

If independent consumers justify extraction, decide the exact descriptor and
generated-handle API, compatibility grammar, unknown-field and deprecation
rules, version negotiation, publication surface, and conformance evidence. The
choice must preserve validated serializable identities and generated nominal
TypeScript handles without turning a runtime symbol or central registry into an
identity authority.

ADR-0010's minimum publication floor still applies: a real product slice,
stable ownership, two independently authored conforming implementations,
compatibility fixtures, negative tests, and an executable conformance suite.
The extraction decision must provide the additional cross-consumer evidence
required by ADR-0013.

### Private Runtime Implementation

After an owning product records the required trigger decision, choose whether a
private runtime uses a minimal native implementation or a qualified private
adapter around a commodity graph, container, or resource-management library.
The selected tool cannot own product readiness, routing, authorization,
fencing, durable recovery, state custody, or isolation. Reject a candidate that
requires a second overlapping lifecycle state machine.

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
identity required by ADR-0010. Product migrations and canonical product state
do not move into Foundation.

## Required Evidence

A resolving decision must name the exact product trigger, owner, implementation
or public surface, applicable host placements, compatibility and migration
rules, negative cases, immutable evidence, and conformance results. Runtime,
host, public-SPI, and state-migration choices may be resolved separately; none
silently grants another.
