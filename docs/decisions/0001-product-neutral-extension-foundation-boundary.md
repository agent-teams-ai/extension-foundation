---
id: ADR-0001
type: adr
status: accepted
owner: architecture
summary: Keep shared extension infrastructure product-neutral while every product owns its extension points, host, authority, and state.
approved_by: product-owner
accepted_at: 2026-08-13
---

# ADR-0001: Product-Neutral Extension Foundation Boundary

## Context

Orchestrator, Agent Runtime, Frontend, and future products need common extension
identity, lifecycle, distribution, verification, and conformance primitives.
Duplicating these mechanisms creates incompatible security and upgrade behavior.
Moving product-specific ports or domain models into a common framework instead
creates a shared application layer and global service locator.

## Decision

- Extension Foundation owns only product-neutral technical extension contracts,
  lifecycle primitives, distribution integration, verification, and conformance
  tooling.
- Every consuming product owns its narrow extension points, extension host,
  product authority, canonical state, and anti-corruption mappings.
- Foundation never imports product domain models or provides a universal plugin
  interface.
- Built-in implementations use the same semantic contract as external
  implementations only where replaceability is deliberate.
- Public SPI requires independent implementations and conformance evidence.
- Privileged security mechanisms cannot be weakened or replaced by ordinary
  user-installed extensions.

## Consequences

- Shared mechanics evolve once without merging product domains.
- Each product can choose different contribution types and isolation levels.
- Some code remains built in because extensibility would not improve product
  flexibility or would weaken authority.

## Rejected alternatives

- A global Plugin Manager resolving arbitrary services.
- Product-specific extension contracts centralized in Foundation.
- Making every adapter or internal module independently installable.
