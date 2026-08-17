---
id: ADR-0005
type: adr
status: accepted
owner: architecture
summary: Separate catalog governance, artifact verification, product authorization, and private moderation evidence.
approved_by: product-owner
accepted_at: 2026-08-17
related:
  - ADR-0001
  - ADR-0002
  - ADR-0003
  - ADR-0004
  - OD-001
---

# ADR-0005: Catalog Trust and Moderation Boundaries

## Context

A signed artifact can still be unsafe, incompatible, commercially unavailable,
or unauthorized for a specific product. Catalog moderation also contains private
reports and evidence that must not leak through public records or snapshots.
Combining these concerns would let one subsystem grant authority it does not own.

## Decision

- Artifact integrity and provenance, catalog admission, commercial entitlement,
  product authorization, capability grants, and runtime enforcement are
  independent decisions with independent evidence.
- Catalog moderation has three planes: public governance outcomes, private case
  and evidence records, and product-owned runtime authorization. Public snapshots
  contain outcomes and safe reasons, never private evidence.
- Catalog lifecycle terms remain distinct:
  - `deprecated` discourages use while preserving discovery and resolution;
  - `yanked` removes a release from new resolution while preserving audit history;
  - `quarantined` is a temporary safety hold requiring product policy to block
    new installation or activation;
  - `revoked` records invalidated trust and must produce a fail-closed verification
    outcome for affected artifacts or authorities.
- An appeal does not lift a restriction. Reinstatement requires a new,
  attributable governance decision that supersedes the previous outcome.
- Permission and capability declarations in a manifest are requests. Only the
  consuming product can grant authority, and the runtime owner enforces it.
- Verification reports preserve source, snapshot, artifact digest, signature,
  policy, and decision identities so an operator can explain an outcome.
- Cryptographic protocols use established standards and libraries. Catalog
  snapshot freshness, key custody, threshold, rotation, and offline parameters
  remain governed by OD-002 rather than custom or implicit defaults.

## Consequences

- A valid signature cannot silently become installation or execution authority.
- Public catalog replication remains possible without distributing sensitive
  moderation evidence.
- Products must map catalog outcomes into their own authorization and lifecycle
  policies; Foundation cannot make that business decision for them.
- Verification and moderation require durable reason codes and conformance
  fixtures, not only Boolean results.

## Rejected alternatives

- Treating `verified`, `listed`, `entitled`, and `authorized` as one status.
- Publishing full moderation cases in catalog snapshots.
- Letting an extension manifest grant its requested permissions.
- Automatically restoring an extension when an appeal is filed.
- Inventing a custom signing or revocation protocol.
