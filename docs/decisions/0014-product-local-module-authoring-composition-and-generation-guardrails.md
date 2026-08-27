---
id: ADR-0014
type: adr
status: accepted
owner: architecture
summary: Defines inert product-local module declarations, static Pure DI composition, literal loaders, and generation-safe future activation.
approved_by: product-owner
accepted_at: 2026-08-27
related:
  - ADR-0001
  - ADR-0010
  - ADR-0013
  - OD-003
---

# ADR-0014: Product-Local Module Authoring, Composition, And Generation Guardrails

## Context

The product owner approved a product-first authoring and composition path while
public SPI, production runtime, host, compatibility, and state-migration choices
remain open. The approved guardrails need one accepted authority so an owning
product can rehearse a static module-shaped feature without inventing a
Foundation runtime or allowing discovery and mutable activation state to become
hidden execution authority.

## Decision

This ADR governs product-local authoring, build-time composition, and the safe
shape of a future generation-based activation path. It does not admit a
Foundation package, authorize a production module runtime or graph host, or
publish a public SPI.

### One inert declaration authority

Each module has exactly one module-local, colocated, inert declaration as its
metadata authority. The declaration contains serializable data only. It cannot
contain factories, callbacks, decorators, executable imports, ambient container
lookups, or host configuration. Hand-maintained central module or identifier
registries are forbidden. Aggregate inventories, typed navigation indexes,
reverse-dependency maps, diagrams, and AI-readable reports are generated
read-only projections.

`ModuleId` and `CapabilityId` values are validated serializable strings within
their owning module or product capability namespace. The string is authoritative
for build artifacts, persistence, audit, wire representations, and cross-host
identity. Runtime `Symbol` values, paths, package names, mutable tags, and
content hashes are not identity authorities. Generation emits nominal
TypeScript handles and indexes from the validated declarations; an erased
`unique symbol` brand may provide type-level separation without replacing the
serializable identity.

The product-private authoring vocabulary for dependency slots is `required`,
`optional`, and `many`. `many` declares ordered provider cardinality only; it
does not configure concurrency, retries, or execution parallelism. Every
single-provider and ordered-many slot is bound explicitly in a product-owned
profile. Discovery order, registration order, object iteration, and an
apparently unique installed provider never select a binding implicitly.

The executable activation factory is a separate file and authority from the
inert declaration. Static imports from ordinary product composition may reach
the factory. Metadata discovery and generation may not.

### Two-level composition ownership

Composition has two product-owned levels:

1. A feature-local composition boundary constructs the feature's core and
   adapters from explicit inputs.
2. A target composition root selects the closed feature set, supplies explicit
   profile slot bindings, and connects the feature-local boundaries using Pure
   DI.

Static Pure DI is the default. Ordinary source dependencies remain ordinary
imports and explicit factory or constructor parameters. Module-shaped metadata
does not require a runtime edge. A private product graph may be considered only
after a measured runtime-selection or independent-lifecycle trigger and an
accepted owning-product decision under ADR-0013.

### Inert discovery and literal loading

Candidate enumeration starts from bounded consumer-owned roots and reads only
fixed-name inert declarations. The build and its discovery step never import or
evaluate executable module code. Generated declaration fragments and aggregate
inventories are disposable projections, not a runtime registry.

When a target actually needs deferred executable loading, start with a
handwritten target-local table whose values are literal import expressions.
Node/server, Electron main, preload, renderer or Worker, and browser authority
closures have separate loader tables. Runtime string interpolation, filesystem
scanning, catalog lookup, and a universal cross-target loader are forbidden.
Loader generation begins only after repeated wiring or profile variants provide
measured evidence that generation reduces complexity. Selected executable IDs
and loader keys must form an exact bijection, and build evidence must prove that
unselected and invalid sentinels receive zero top-level evaluation.

Runtime targets are local composition and authority closures. Cross-target
placement, connectivity, rollout, and failure topology belong to the owning
product's deployment planning, not to module metadata or a Foundation graph.

### Distinct immutable generation identities

Generated plans separate three facts:

- `PlanContentDigest` identifies canonical immutable plan content;
- `CandidateGeneration` identifies one preparation and readiness attempt for
  that content; and
- `ActiveHeadRevision` is the monotonic, non-reused compare-and-set revision of
  the published active head.

Equal plan content may be prepared as more than one candidate generation. A
candidate identity cannot be reused as an active-head revision, and neither is
derived merely by relabeling the plan digest. Receipts bind the declaration
inputs, plan content, target loader source, selected implementation, and emitted
bundle digests without collapsing those three identities.

### Future enable, disable, and replacement

No live registry contains a mutable authoritative `enabled` flag. A future
enable, disable, replace, or update operation creates a new immutable desired
profile revision. The owning product compiles and validates the complete
affected dependency closure, prepares a distinct candidate generation, proves
readiness, and publishes it through one compare-and-set active-head update.
Failure before publication leaves the prior generation active. Success seals
old admission before bounded drain and reverse-order cleanup.

Removing a required provider is rejected unless the candidate also rebinds,
replaces, or disables all affected dependents. Optional degradation must be
declared by the consumer. Ordered-many bindings retain their declared order,
cardinality, compatibility, scope, and authorization invariants.

This future activation shape constrains a runtime but does not authorize one.
Trusted in-process code can promise fenced logical replacement, not arbitrary
JavaScript unload. Physical termination and distributed cutover guarantees
remain host- and deployment-specific open decisions.

### Plugin contribution boundary

A plugin contribution becomes a product module only when runtime selection or
an independently managed lifecycle requires that boundary. Distribution as a
plugin artifact alone does not turn its reusable core, every contribution, or
every product feature into a module. Artifact installation, contribution
authorization, desired enablement, active routing, runtime health, state
custody, and artifact retirement remain independent facts.

## Consequences

- Products can author deterministic module-shaped metadata while executing the
  first slice through ordinary static Pure DI.
- Build discovery is safe to run because it cannot execute candidate code.
- Generated handles improve TypeScript navigation without becoming durable
  identity authorities.
- Target-local literal loaders keep bundler and authority closures explicit.
- A later dynamic path has non-ambiguous content, candidate, and publication
  identities, but still requires a product runtime decision.
- Foundation gains no production package, public SPI, canonical graph model, or
  runtime authority from this decision.

## Rejected Alternatives

- Executable module definitions as discovery metadata. Enumeration would gain
  top-level execution authority.
- Runtime symbols or a central enum as durable identity. Neither preserves
  module-local ownership and portable serializable identity.
- Auto-bind the only installed provider. Installation state would silently
  change composition semantics.
- Generate a universal loader before target need is measured. It would blur
  bundler, placement, and authority boundaries.
- Treat plan digest, candidate generation, and active revision as one value.
  Retries and publication fencing require distinct identities.
- Add a mutable enable flag to a live registry. Safe replacement requires an
  immutable desired profile and candidate publication.
