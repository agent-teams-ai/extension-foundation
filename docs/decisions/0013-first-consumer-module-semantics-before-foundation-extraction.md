---
id: ADR-0013
type: adr
status: proposed
owner: architecture
summary: Proposes keeping private module semantics with the first owning product until two consumers justify product-neutral Foundation extraction.
related:
  - ADR-0001
  - ADR-0010
  - OD-003
---

# ADR-0013: First-Consumer Module Semantics Before Foundation Extraction

## Context

ADR-0012 correctly separates reusable library cores, module adapters, packages,
and plugin artifacts. Its runtime-neutrality section nevertheless assigns the
canonical module definition, graph semantics, lifecycle outcomes, and
diagnostics to Extension Foundation before any cross-product extraction has
been approved. That conflicts with ADR-0001's product-neutrality rule and with
ADR-0010's requirement for two independently authored implementations before a
stable public SPI.

The qualification cannot rewrite an accepted ADR. This proposal records the
smallest correction for product-owner approval. Until it is accepted, OD-003
remains open and no Foundation runtime package or public SPI may be admitted.

## Proposed Decision

If accepted, this ADR will supersede ADR-0012 while incorporating every
ADR-0012 decision except its Runtime Implementation Neutrality ownership
paragraph, which is replaced as follows.

The first real consumer owns its private module identities, descriptor grammar,
graph semantics, lifecycle outcomes, diagnostics, and implementation inside the
owning product feature. The product may select explicit provider bindings and a
private native implementation through its own accepted feature decision. These
choices are not a Foundation contract and cannot be published as one.

Extension Foundation becomes the canonical owner only for the product-neutral
intersection proven by at least two independently authored consumers, an
executable cross-implementation conformance suite, and a separate accepted
extraction decision. The extraction decision must name the owner repository,
neutrality claim, release policy, conformance version/results, and immutable
evidence for both consumers.

Product-scoped libraries and module adapters remain in the owning product
repository. Only product-neutral capabilities admitted through the extraction
gate may appear in the Extension Foundation package catalog. Cordis, Awilix,
graph libraries, and host runtimes remain private replaceable adapters and do
not define the extracted public model.

## Consequences

- Phase 1 can prove one product-local graph slice without prematurely creating
  a cross-product framework.
- Foundation admission remains fail-closed until independent reuse is real.
- The first consumer may need a mechanical extraction later; one-way library
  and module dependencies keep that move bounded.
- ADR-0012 remains effective until this proposal receives explicit approval.

## Rejected Alternatives

- Silently narrow ADR-0012 in qualification prose. An accepted decision cannot
  be changed by a research document.
- Put product-scoped packages in Extension Foundation. That makes Foundation a
  shared product kernel and weakens repository ownership.
- Publish the first consumer's private grammar as a provisional SPI. A
  provisional public contract still creates compatibility obligations without
  independent evidence.
