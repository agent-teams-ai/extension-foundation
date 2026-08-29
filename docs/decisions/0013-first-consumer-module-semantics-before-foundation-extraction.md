---
id: ADR-0013
type: adr
status: superseded
owner: architecture
summary: Keeps module semantics product-local until independent consumers and conformance justify a separately approved Foundation extraction.
approved_by: product-owner
accepted_at: 2026-08-27
superseded_by:
  - ADR-0015
supersedes:
  - ADR-0012
related:
  - ADR-0001
  - ADR-0010
  - ADR-0012
  - ADR-0014
  - OD-003
---

# ADR-0013: First-Consumer Module Semantics Before Foundation Extraction

## Context

ADR-0012 correctly separated features, library cores, module adapters, packages,
and plugin artifacts. It also established sound one-way dependencies,
feature-local colocation, explicit capability dependencies, deterministic closed
composition, and evidence-backed extraction bases. Its runtime-neutrality
section nevertheless assigned canonical module definitions, graph semantics,
lifecycle outcomes, and diagnostics to Extension Foundation before independent
consumers had proved a product-neutral boundary.

That premature semantic ownership conflicts with ADR-0001's product-neutrality
rule and ADR-0010's evidence floor for a stable public SPI. Package extraction
can be justified by an independent release, replacement, deployment, or
isolation lifecycle without proving that Foundation should own module semantics.
A cumulative successor must preserve those distinct admission bases while
removing the unsupported ownership claim.

## Decision

This ADR supersedes ADR-0012 and incorporates all of its decisions except the
premature assignment of canonical module and runtime semantics to Foundation.
The following cumulative rules are authoritative.

### Orthogonal roles and one-way dependencies

- A **feature** owns one coherent capability, its language, contracts,
  implementation, adapters, and tests.
- A **library core** is ordinary reusable code with explicit constructor or
  factory dependencies and no module-runtime lifecycle.
- A **module adapter** connects feature-owned code to product-local composition,
  lifecycle, and capability contracts.
- A **package** is a physical build and release boundary created only when an
  independent release, replacement, deployment, or proven reuse lifecycle
  justifies it.
- A **plugin artifact** is an independently distributed trust, installation,
  update, and rollback envelope. One artifact may provide multiple
  contributions.

The library core never imports a module adapter, Foundation runtime, product
host, dependency-injection container, artifact manifest, or plugin SDK. A
module adapter may depend on its core. A contribution adapter or proxy may
connect an independently distributed plugin artifact to a product-owned module
boundary, but the artifact does not redefine the library or feature roles.

### Colocation, contracts, and package extraction

Before extraction, core code, module declarations or adapters, activation
factories, and composition remain beside the owning product feature using the
product's native feature-slice structure. Host protocol translators remain in
the feature's inbound adapter boundary. None belongs in `domain/` or a global
`modules/`, `contracts/`, or `adapters/` directory.

When independent publication becomes justified, related artifacts may remain
discoverable under one capability group while retaining separate `core`,
`module-adapter`, `test-kit`, or technology-adapter package roles. These roles
do not require those folders. A capability with one consumer stays in its
feature. A module adapter may remain product-owned even when its core is
published. Technology adapters become separate packages only when their
dependency or release lifecycle is independently meaningful.

Contracts remain with the owning feature by default. A contract becomes a
separate package only when it is a real Published Language or public consumer
contract with stable ownership, compatibility policy, and independent
consumers. Foundation never centralizes product domain contracts.

Package extraction or publication requires at least one proven basis:

- a second real consumer needs the same package boundary;
- the implementation has an independent replacement or release lifecycle;
- the implementation must deploy or isolate independently; or
- a public SPI has the independent implementations and conformance evidence
  required by ADR-0010.

Every published library also requires curated exports, packed-artifact consumer
fixtures, API compatibility review, and explicit SemVer intent. Framework,
container, host, ORM, and product-internal types cannot leak through a core
package's public declarations. Package extraction evidence admits only the
named package boundary; it is not evidence that Foundation owns module
semantics.

The evidence-backed progression remains optional and reversible:

```text
feature-owned implementation
  -> reusable core + product-owned module adapter
  -> independently distributed plugin artifact
  -> isolated process or service when trust or deployment requires it
```

Moving back or stopping is required when the first two product slices spend
more than 30% of their changed production code on generic framework glue, when
ordinary feature work repeatedly requires Foundation changes, or when a
candidate runtime needs a second overlapping lifecycle state machine. A safety
requirement can justify that cost only with explicit evidence.

### Product-first composition

Product-local feature code and static Pure DI composition are the default. An
ordinary source dependency remains an ordinary package import when runtime
replacement is not required. Product composition selects explicit providers
and passes closed dependency objects; parent fallback, `get<T>()`, a global
service locator, and host-container access remain forbidden.

A private product graph is allowed only after measured runtime-selection or
independent-lifecycle needs trigger it and the owning product records an
accepted decision. Such a graph depends on typed capability contracts rather
than concrete provider modules. It declares complete required, optional, and
ordered-many dependencies and validates the complete selected profile before
any factory runs. It rejects missing requirements, duplicate single providers,
ambiguous selection, incompatible scopes, cycles, invalid lifetimes, and
unstable ordering. Provider selection is explicit and deterministic; source,
registration, and object-iteration order are never business semantics.

Runtime module edges are reserved for intentionally replaceable capabilities
or independently managed lifecycle. Cross-bounded-context interaction continues
through consumer-owned ports or versioned Published Language; a private graph
does not authorize domain imports or cross-context transactions. Colocated
declarations are the authority, while any registry, index, reverse-dependency
map, diagram, or AI-readable report is a generated read-only projection.

### Foundation semantic extraction

The first real consumer owns its private module identities, declaration
grammar, composition semantics, lifecycle outcomes, diagnostics, and
implementation inside the owning product feature. Commodity graph, container,
resource-management, testing, telemetry, OCI, and signature tools may remain
private replaceable adapters or development dependencies; they do not define a
canonical public model.

Foundation may own only the product-neutral semantic intersection proven by:

1. two real independently authored consumers;
2. executable cross-consumer conformance over the proposed intersection; and
3. a separate accepted extraction decision naming the exact semantics, owner
   repository, neutrality claim, release policy, conformance version and
   results, and immutable evidence for both consumers.

No production Foundation module runtime, public module SPI, or canonical graph
model is authorized by this ADR. Package admission under another preserved
package-admission basis does not waive these semantic-extraction conditions.

[`modularity_dart`](https://github.com/cherrypick-agency/modularity_dart)
remains a non-normative design reference only. Its explicit imports, private
bindings, public exports, cycle diagnostics, and graph visualization are useful
precedents. Its ambient resolution, parent fallback, concrete module-instance
imports, and state-preserving hot reload are not adopted. No code is copied and
no dependency is introduced.

## Consequences

- Reusable code remains consumable without a module or plugin stack.
- The first product can rehearse static composition without creating a
  cross-product framework or Foundation runtime.
- A private runtime graph is deferred until measured product needs justify its
  cost and ownership.
- Package extraction remains evidence-driven, but package and semantic
  extraction gates cannot be conflated.
- Future Foundation semantics require independent authorship, executable
  cross-consumer evidence, and a dedicated accepted decision.
- Later extraction may require deliberate reconciliation of independently
  evolved product semantics; it is not presumed to be mechanical.

## Rejected Alternatives

- Retain Foundation semantic ownership while waiting for implementation
  evidence. Ownership itself creates a framework constraint before neutrality
  is proved.
- Require a second consumer for every package. Independent release,
  replacement, deployment, isolation, and qualified public-SPI lifecycles remain
  valid package bases.
- Treat package extraction as automatic semantic extraction. A physical release
  boundary and a product-neutral module contract prove different facts.
- Publish the first consumer's private grammar as a provisional SPI. A
  provisional public contract still creates compatibility obligations without
  independent evidence.
