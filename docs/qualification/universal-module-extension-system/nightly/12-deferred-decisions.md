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
| Runtime graph | Real direct-composition failure, accepted ownership path, private bounded prototype |
| Foundation extraction | Real second consumer, neutral intersection, independent expectations, conformance, separate decision |
| Public SPI | Independent implementations, compatibility and release fixtures, immutable admission, governance, support |
| Community modules | Public gates plus grants, revocation, T2/T3 containment, custody, uninstall, recovery, moderation |
| Cordis | 25% net deletion and complete private lifecycle parity in a real resource-heavy consumer |
| Extism/WASI | Funded non-TS or isolation need, ABI, broker, quotas, provenance, lifecycle, cross-platform containment |
| Module Federation | Frontend-owned independent deployment need and complete pre-execution Web/Electron closure |
| Process host | ADR-0011-equivalent closure, named consumer, UMEQ-009/012 resolution, authenticated protocol |
| Side-by-side | Restart cannot meet numeric SLO; prove fencing, state, capacity, cleanup, rollback, recovery |
| Distributed cutover | Named topology and sinks, L0/D1/D2/T1 profile, operator, measured barrier and propagation SLO |
| Managed channel | TUF operations from first remotely refreshed mutable metadata |
| Catalog | Independent distribution exists; one PostgreSQL writer and derived snapshots/indexes are sufficient |

Evidence custody is also deferred to Lane C, but it gates publication of this
qualified synthesis. Lane C must freeze create-only content-addressed results,
recover attempt lineage, quarantine invalid citations, scan for secrets, build a
deterministic claim manifest, and verify it independently. Deferred production
mechanisms need not be implemented merely to document their absence as blockers.

See [architecture roadmap](10-architecture-and-loc-roadmap.md),
[claim ledger](claim-ledger.yaml), and the
[executive report](01-executive-report.md).
