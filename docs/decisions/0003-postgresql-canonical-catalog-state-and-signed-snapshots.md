---
id: ADR-0003
type: adr
status: accepted
owner: architecture
summary: Keep catalog state canonical in PostgreSQL and publish signed immutable snapshots as derived artifacts.
approved_by: product-owner
accepted_at: 2026-08-17
related:
  - ADR-0001
  - ADR-0002
  - OD-001
---

# ADR-0003: PostgreSQL Canonical Catalog State and Signed Snapshots

## Context

Official, managed, and customer-operated catalogs need transactional governance,
search, auditability, self-hosting, and future offline use. Treating Git files,
database rows, search indexes, and offline bundles as equal sources of truth
would create conflicting histories and ambiguous recovery. Making a central
Platform service canonical would also violate self-hosted independence.

## Decision

- Every writable catalog source owns one PostgreSQL database as its only
  canonical state. Federation does not create a shared global database.
- A future `extension-catalog` repository owns the Catalog Governance bounded
  context, service, schema, migrations, and snapshot publication. Extension
  Foundation owns only product-neutral contracts, verification primitives, and
  conformance fixtures.
- A governance transaction writes catalog state, append-only audit evidence,
  and an integration outbox atomically. The audit ledger is not an event-sourced
  reconstruction mechanism.
- OCI registries store extension artifact bytes. Catalog records store immutable
  digest references and never copy artifact blobs.
- Signed immutable snapshots are derived publication and export artifacts. They
  carry source identity, monotonically advancing version, creation and expiry
  metadata, schema version, content digest, and signature metadata. They cannot
  accept writes or outrank their source PostgreSQL state.
- Git stores catalog code, migrations, schemas, policy definitions, and test
  fixtures. Git is not a live catalog record store.
- Search indexes are disposable projections. PostgreSQL full-text search is the
  first server adapter. SQLite FTS5 is reserved for a later local or offline
  adapter behind the same catalog search contract.
- The future Catalog Governance application core owns narrow outbound ports such
  as `CatalogRepositoryPort`, `CatalogSearchPort`,
  `CatalogSnapshotPublisherPort`, and `ArtifactRegistryPort`. Its inbound API and
  Published Language do not expose persistence types.
- Each product owns its consumer-side catalog lookup port. An anti-corruption
  adapter maps the Catalog Published Language or a verified snapshot into that
  port. Products never import catalog repository ports or database models.
- The first deployment target is a self-hosted catalog service with PostgreSQL.
  Fully Local Desktop is deferred, while snapshot and persistence boundaries
  remain replaceable from the start.

## Consequences

- State mutation, search, snapshots, and artifacts have one explicit owner each.
- Self-hosted deployments do not depend on Agent Teams Platform.
- Search and offline stores can be rebuilt from signed canonical exports.
- PostgreSQL is an operational dependency for writable server catalogs.
- SQLite support requires a later adapter and shared conformance suite rather
  than pretending the two databases have identical concurrency behavior.

## Rejected alternatives

- Git-governed live records: reviewable, but weak for transactional workflows,
  moderation privacy, high write volume, and self-hosted service operation.
- PostgreSQL and Git as co-equal writers: creates split-brain ownership.
- Signed snapshots as a writable store: loses governance transactions and
  creates rollback and freshness ambiguity.
- An append-only journal as aggregate source of truth: unnecessary event
  sourcing complexity for catalog governance.
- SQLite as the first canonical server store: unsuitable as the baseline for
  concurrent hosted and self-hosted governance.
