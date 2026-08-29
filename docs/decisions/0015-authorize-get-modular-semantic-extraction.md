---
id: ADR-0015
type: adr
status: accepted
owner: architecture
summary: Authorizes an independent product-neutral Get Modular repository for pre-1.0 composition semantics while preserving product and Extension Foundation authority boundaries.
approved_by: product-owner
accepted_at: 2026-08-29
supersedes:
  - ADR-0013
related:
  - ADR-0001
  - ADR-0010
  - ADR-0014
  - OD-003
---

# ADR-0015: Authorize Get Modular semantic extraction

## Context

ADR-0013 kept module semantics product-local until two independently authored
consumers and cross-consumer conformance proved a neutral intersection. That
default protected Extension Foundation from absorbing the first product's
composition model, but it also prevents an intentionally independent module
system from becoming the shared starting point for Agent Runtime,
Orchestrator, Frontend, and additional planned consumers.

The product owner has approved a separate public repository,
`agent-teams-ai/get-modular`, rather than placing module composition inside
Extension Foundation. Synthetic qualification at
`b002525250c8834fedf80d0bd3c91563e2477991` provides useful pre-production
evidence, while the draft dogfooding model at
`8d13e4e1e31d3d82e43584a953b1dc520eefc47f` remains non-authoritative. Neither
draft is treated as two production consumers.

## Decision

This ADR supersedes ADR-0013. Its feature, library, package, module-adapter,
plugin-artifact, colocation, product-first composition, and evidence discipline
remain authoritative except for the extraction timing changed below.

### Independent Get Modular ownership

Get Modular is an independent product-neutral library, not an Extension
Foundation package. Its pre-1.0 scope may include only:

- validated serializable module, capability, implementation, and local slot
  identities;
- inert declarations and explicit `required`, `optional`, and ordered `many`
  dependency semantics;
- complete normalized profiles and explicit provider bindings;
- deterministic graph validation and compilation with bounded structured
  diagnostics;
- canonical immutable plan encoding and `PlanContentDigest`;
- a loader-contract shape and optional attempt-scoped construction mechanics
  that receive already selected, authorized factories from the product host;
- implementation-independent conformance vectors for those semantics.

Get Modular does not own product capability payloads, artifact trust,
installation, authorization, grants, desired state, candidate or runtime
generations, readiness, publication, routing, fencing, drain, durable recovery,
or retirement authority.

### Separate authorities

Extension Foundation remains authoritative for extension artifact identity,
distribution, provenance, signatures, admission protocols, isolation
contracts, revocation, quarantine, installation, update, retirement, and state
custody. It does not import Get Modular core.

Each product host remains authoritative for product extension points, durable
desired-profile revisions, target-local literal loader tables, executable
imports, candidate preparation, generations, readiness, active-head
publication, routing, grants, fencing, drain, cleanup, and reconciliation.
Product-owned adapters may depend on both neutral cores and translate between
them; neither neutral core depends on the other.

`instantiate` means only invoking already authorized factories with a closed
dependency object in one host-issued attempt. It never means enable, admit,
authorize, prepare, publish, route, or activate. Any construction helper is a
separate optional leaf and cannot discover code, allocate durable identities,
retry unknown effects, or declare cleanup complete.

### Pre-1.0 and stability gates

Synthetic modules and qualification fixtures may drive an unstable `0.x`
implementation before two production adapters exist. Public 1.0 stability,
semantic compatibility guarantees, or a stable plugin SPI still require:

1. two independently authored product adoption adapters;
2. executable cross-consumer conformance over the claimed intersection; and
3. a promotion review that records the conformance version and immutable
   consumer evidence.

Before production code, Get Modular must record its own accepted ownership ADR,
normative requirements, exact-SHA provenance map, identity and binding algebra,
canonical plan and digest contract, diagnostic contract, compatibility policy,
and explicit exclusions. Source maps preserve provenance only; they cannot
transfer authority or turn draft evidence into an accepted decision.

Engineering Foundation and Docs Protocol are exact development dependencies
only. Their types and runtime code cannot enter Get Modular production imports,
packed runtime dependencies, or public declarations.

## Consequences

- Multiple products can begin against one intentionally neutral pre-1.0
  composition model instead of independently inventing incompatible kernels.
- Extension Foundation remains focused on plugin distribution, trust, and
  lifecycle protocols.
- Product hosts retain one operational authority; Get Modular cannot become a
  service locator or a second lifecycle coordinator.
- Early API changes remain possible until two real consumers and conformance
  justify stability.
- A second repository adds navigation cost, so exact-SHA provenance and
  bidirectional requirement traceability are mandatory.

## Rejected alternatives

- Put module composition inside Extension Foundation. This would recombine
  composition mechanics with plugin trust and lifecycle concerns.
- Wait for two complete product implementations before writing any shared code.
  This would force the consumers already waiting for modularity to duplicate
  the most compatibility-sensitive semantics.
- Move product activation into Get Modular. That would create duplicate
  generation, authorization, routing, and cleanup authority.
- Treat draft qualification or dogfooding documents as accepted authority.
  Draft evidence can challenge a design but cannot authorize it.
