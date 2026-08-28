---
id: qualification.universal-module-extension-system.nightly.deferred-decisions
type: qualification
status: qualified
owner: architecture
summary: Defines explicit non-goals and evidence gates for work deferred beyond the first rehearsal.
related:
  - ADR-0011
  - OD-002
  - OD-003
---

# Deferred Decisions

Static imports and Pure DI were the nightly recommendation; the later
[productization roadmap](../../module-system-v1-productization/current-roadmap.yaml)
is the latest non-authoritative qualification projection. Accepted ADRs and
owning-product decisions remain authority.
The deferred graph and host items below are explicit later gates, not a parallel
graph-first roadmap.

## Explicit Non-Goals For The First Rehearsal

- Foundation graph, generic runtime, public SPI, stable npm publication, package
  train, or public compatibility promise.
- Public, community, third-party, dynamically loaded, independently installed,
  or untrusted modules.
- Plugin artifacts, installation, registry, catalog service, product profiles,
  managed updates, publisher namespaces, or moderation.
- Cordis, Graphlib, an ambient container, runtime aliases, registration-order
  selection, or activation-time provider fallback.
- Process, Worker, iframe, Electron utility process, Extism/WASI, or Module
  Federation host.
- Sandbox, tenant-isolation, hostile-plugin, hard-termination, or process-tree
  cleanup claim.
- Arbitrary hot unload, universal side-by-side replacement, global atomic
  cutover, or exactly-once external-effect claim.
- Stable JSON Schema, Protobuf, WIT, generated SDK, wire format, CommonJS,
  multi-version solver, implicit parent scope, or general lazy resolver.
- Product DTO, authorization, transaction, aggregate, React, Electron,
  transport, Cordis, Extism, or MF type in a Foundation contract.
- Provider invocation inside a Unit of Work or extraction merely because two
  repositories use identical bytes.

## Deferred With Explicit Gates

| Decision | Earliest gate |
| --- | --- |
| Runtime graph | Measured runtime-selection or independent-lifecycle need that static composition cannot meet; product approval; private bounded prototype |
| Foundation extraction | Real executable second consumer, semantic reconciliation, neutral intersection, independent expectations, conformance, ownership/version/migration review, separate decision |
| Public SPI | Independent implementations, compatibility and release fixtures, immutable admission, governance, support |
| Community modules | Public gates plus grants, revocation, T2/T3 containment, custody, uninstall, recovery, moderation |
| Cordis | Multi-factor scorecard win and complete private lifecycle parity in a real resource-heavy consumer |
| Extism/WASI | Funded non-TS or isolation need, ABI, broker, quotas, provenance, lifecycle, cross-platform containment |
| Module Federation | Frontend-owned independent deployment need and complete pre-execution Web/Electron closure |
| Process host | ADR-0011-equivalent closure, named consumer, UMEQ-009/012 resolution, authenticated protocol |
| Side-by-side | Restart cannot meet numeric SLO; prove fencing, state, capacity, cleanup, rollback, recovery |
| Distributed cutover | Named topology and sinks, L0/D1/D2/T1 profile, operator, measured barrier and propagation SLO |
| Managed channel | TUF operations from first remotely refreshed mutable metadata |
| Catalog | Independent distribution exists; one PostgreSQL writer, explicit authority route, and derived snapshots/indexes are sufficient |

A non-executable AR descriptor does not satisfy the graph/lifecycle
second-consumer gate. One-way imports bound candidate file movement but do not
make extraction mechanical; semantics, versioning, compatibility, ownership,
migration, and release policy remain reviewed work. Future plugin artifact
contributions map through product-owned adapters to product ports and become
runtime modules only after the runtime graph trigger is met.

Worker-corpus custody remains unproven. No committed semantic verifier binds
the reported archive, manifest digest, counts, wrapper identities, or integrity
result to committed bytes. Claim-level primary-source and successfully attested
executable closure, independent publisher or reproduction evidence,
product-owner review, and separate decisions remain gates. Deferred production
mechanisms need not be implemented merely to document their absence as blockers.

See [architecture roadmap](10-architecture-and-loc-roadmap.md),
[claim ledger](claim-ledger.yaml), and the
[executive report](01-executive-report.md).
