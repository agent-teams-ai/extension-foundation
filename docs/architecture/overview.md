---
id: architecture.overview
type: architecture
status: accepted
owner: architecture
summary: Defines the product-neutral scope, ownership, and dependency direction of Extension Foundation.
---

# Architecture Overview

Extension Foundation is a product-neutral technical library and tooling
repository. It is not a product control plane, marketplace, domain model, or
global plugin host.

```mermaid
flowchart LR
    Product["Orchestrator / AR / Frontend"] --> Port["Consumer-owned extension port"]
    Port --> Host["Product-owned extension host"]
    Host --> Foundation["Extension Foundation primitives"]
    Foundation --> OCI["OCI Distribution adapter"]
    OCI --> GHCR["GHCR"]
    OCI --> Harbor["Harbor"]
    Product --> Source["CatalogSource port"]
    Source --> Catalog["Authoritative catalog service"]
    Catalog --> Postgres["PostgreSQL canonical state"]
    Catalog --> Snapshot["Signed immutable snapshot"]
    Catalog --> Search["Derived search index"]
    Catalog --> Ref["Digest-pinned artifact reference"]
    Ref --> Host
```

## Ownership

Extension Foundation may own:

- manifest, package, capability-request, and permission-request schemas;
- extension, publisher, artifact, installation, and generation identities;
- lifecycle protocol primitives and compatibility negotiation;
- profile and lock-file schemas;
- OCI artifact resolution and registry conformance fixtures;
- signature, provenance, digest, and revocation verification primitives;
- shared test kits and AI-readable diagnostics.

Extension Foundation does not own:

- Orchestrator teams, work, runs, messages, policies, or workflows;
- Agent Runtime sessions, operations, custody, sandbox policy, or provider
  execution;
- Frontend layout, commands, views, routing, or application state;
- Platform tenants, memberships, entitlements, placements, or managed rollout;
- a universal service locator, aggregate repository, or shared product database.

## Dependency Direction

Products depend on released Foundation contracts. Foundation never imports a
product. Product-specific SPI remains physically located in the consuming
product and maps to Foundation lifecycle primitives only at composition and host
boundaries.

Full DDD belongs inside products where business invariants exist. This
repository uses domain modelling only for real extension lifecycle and trust
semantics; adapters, schema codecs, and OCI clients do not receive artificial
aggregates.

## Package Admission

The package catalog is closed and intentionally empty until an accepted owner
document and a real implementation slice exist. A package is admitted in one
reviewed change that adds its catalog entry, deterministic scaffold output, and
non-empty `src/features/<feature>/` implementation. Reserving empty packages or
root-level `domain`, `application`, `contracts`, or `adapters` directories is
not allowed.

Feature-specific contracts and adapters stay inside their owning feature.
Only product-neutral contracts with an independent release lifecycle may
become package boundaries. Technology adapters become separate packages only
when they are independently replaced, released, or deployed.

Use the reviewable scaffolding sequence; planning never writes source files:

```bash
pnpm --silent architecture:scaffold:plan -- <intent-path> --consumer . --json > <plan-path>
pnpm --silent architecture:scaffold:apply -- <plan-path> --consumer . --json
pnpm architecture:scaffold:recover
pnpm architecture:check
```

The Engineering Foundation owns the source-graph and scaffolding protocols.
This repository owns its package roles, catalog entries, allowed dependency
edges, feature names, and owner documents.

## Catalog State and Publication

Each writable catalog source owns one PostgreSQL canonical store. Signed
snapshots, search indexes, and OCI artifacts are derived or separately owned;
none can write back into catalog state. Federation selects one authority for an
extension route and does not merge records or fall back after an authority
failure.

The future `extension-catalog` owns Catalog Governance business behavior and
persistence. Foundation may provide portable source descriptors, snapshot
schemas, verification primitives, ports, and conformance fixtures without
becoming a catalog service or shared product database.
