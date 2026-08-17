---
id: ADR-0004
type: adr
status: accepted
owner: architecture
summary: Use explicit authority routing for federated catalog sources and stable non-reusable identities.
approved_by: product-owner
accepted_at: 2026-08-17
related:
  - ADR-0001
  - ADR-0003
  - OD-001
---

# ADR-0004: Deterministic Catalog Federation and Namespace Authority

## Context

A product may use official, managed, private, and self-hosted catalog sources.
Merging records by mutable names or trying sources in priority order makes an
outage, revocation, or attacker-controlled source change extension identity and
resolution behavior.

## Decision

- Federation routes each extension lookup to one authoritative catalog source.
  Sources are not co-equal writers for the same authority route.
- Routing precedence is exact extension assignment, then the longest matching
  namespace assignment, then an explicitly configured default. Equal-specificity
  conflicts fail closed.
- A not-found response, outage, stale snapshot, invalid signature, or revocation
  from the selected authority never triggers implicit fallback to another
  catalog. Mirrors and caches may serve only the already selected authority and
  immutable content.
- Direct digest-pinned OCI installation is an explicit trust mode, not a hidden
  federation fallback. It still requires signature, compatibility, capability,
  and product authorization checks.
- `CatalogAuthorityId`, `PublisherId`, `NamespaceId`, and `ExtensionId` are
  separate immutable identities. Display names, handles, and aliases are not
  identities.
- Retired aliases and identity tombstones are never reused. Namespace transfer
  changes stewardship without changing identity. Account recovery restores
  control and does not clone history or reputation.
- Signing keys are credentials of an authority or publisher, not their identity.
  Rotation and revocation therefore do not allocate a new logical identity.
- Federation routes, source descriptors, and snapshot provenance are portable
  product-neutral contracts. Catalog governance remains owned by the catalog
  service, and product installation remains owned by each product host.

## Consequences

- Resolution is deterministic across managed, self-hosted, and future local
  deployments.
- Namespace takeover, dependency confusion, and outage-based downgrade paths
  become explicit failures instead of surprising fallback behavior.
- Operators must configure authority routes and resolve conflicts deliberately.
- Federation does not provide global ordering or global transactional writes.

## Rejected alternatives

- A globally ordered list of catalog sources with first-match resolution.
- Merging releases from several sources by name or highest SemVer.
- Reusing deleted namespaces or aliases after a waiting period.
- Making Agent Teams Platform the mandatory global namespace authority.
