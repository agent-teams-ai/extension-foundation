---
id: ADR-0002
type: adr
status: accepted
owner: architecture
summary: Use OCI Distribution, ORAS, Cosign, immutable digests, GHCR, and Harbor as the portable extension artifact baseline.
approved_by: product-owner
accepted_at: 2026-08-13
related:
  - ADR-0001
---

# ADR-0002: OCI, ORAS, and Cosign Distribution Baseline

## Context

Extensions require portable publication, content addressing, private and public
distribution, integrity, provenance, and self-hosted operation. A custom artifact
registry and signing protocol would duplicate mature standards and create
avoidable security risk.

## Decision

- OCI Distribution is the artifact transport and storage contract.
- ORAS provides OCI artifact operations.
- Cosign provides signature and provenance workflows.
- GHCR is the first hosted registry target.
- Harbor is the first self-hosted registry conformance target.
- Other OCI registries require the same conformance suite.
- Installation, activation, rollback, and audit pin immutable OCI digests.
- Mutable tags and SemVer assist discovery and compatibility but never define an
  installed or active artifact.
- Artifact storage, catalog governance, commercial entitlement, product
  authorization, and runtime enforcement remain independent.

## Consequences

- Source repositories, catalogs, and artifacts may live in different systems.
- Private plugins can use GHCR, Harbor, or another conformant OCI registry.
- Products require a user-facing CLI or API that hides raw OCI tooling.

## Rejected alternatives

- A custom artifact registry.
- Git repositories or release attachments as the only artifact protocol.
- Registry visibility or signature validity as product authorization.
