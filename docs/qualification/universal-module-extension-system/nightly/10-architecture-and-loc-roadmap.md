---
id: qualification.universal-module-extension-system.nightly.architecture-roadmap
type: qualification
status: qualified
owner: architecture
summary: Provides the NOW NEXT LATER architecture, adoption order, cost ranges, and extraction gates.
related:
  - ADR-0001
  - ADR-0012
  - ADR-0013
---

# Architecture And LOC Roadmap

## NOW

1. Obtain product ownership approval and, if module semantics enter scope, an
   accepted successor resolving ADR-0012/ADR-0013: 100-300 documentation and
   test-policy LOC, 1-3 working days.
2. Build the Orchestrator Work Coordination completion-evidence seam with two
   fixed T0 built-ins, direct composition, explicit selection, structured
   diagnostics, revalidation, and focused tests: 1,500-4,500 LOC, 1-3 weeks.
3. Measure direct composition. Do not create a graph merely to compare one.

Total first conditional rehearsal: 1,600-4,800 LOC and 1.5-4 weeks including
approval artifacts. Re-estimate production, tests, configuration, docs, and glue
separately.

## NEXT

1. Agent Runtime adopts second, starting with a non-executable product-private
   provider-bundle descriptor and empty executable closure: 1,500-4,500 LOC,
   1-3 weeks. AR must own custody, execution authority, secrets, and failure
   reconciliation before any executable placement.
2. Prove a real independent second consumer or implementation with independently
   authored expectations and black-box conformance: 1,500-4,500 product LOC plus
   conformance, 1-3 weeks.
3. Extract only the repeated neutral intersection after a separate Foundation
   decision: 4,000-8,000 LOC, 2-4 weeks. Product ports, authorization, DTOs,
   adapters, and first-consumer runtime policy remain local.
4. If useful, incubate role-specific packed artifacts internally as ESM-only:
   500-950 packaging LOC, 3-7 working days. Publication is separate.

## LATER

| Capability | Gate | Range |
| --- | --- | --- |
| Frontend trusted compiled catalog | Separate Frontend ownership and contribution semantics | 2k-4.5k LOC, 2-4 weeks |
| Focused dynamic frontend host | Independent loading value and full Web/Electron admission | 12k-22k LOC, 6-12 weeks |
| Process host | ADR-0011-equivalent closure, named consumer, UMEQ-009 resolution | 8k-13k LOC, 4-8 weeks |
| Artifact, profile, catalog | Independent distribution and production-host safety | 10k-18k LOC, 5-10 weeks |
| Public modules | Independent implementations, compatibility, governance, release support | 6k-11k incremental LOC, 3-8 weeks plus support |
| Community modules | Public gates plus containment, grants, revocation, custody, moderation | Part of 40k-75k platform LOC, multiple quarters |
| Extism/WASI | Funded non-TS or isolation need and qualified ABI/host | Re-estimate after trigger |
| D1 distributed binding | Named topology, sink inventory, SLO, operator | 10k-20k LOC, multiple months |
| D2 distributed binding | Unavoidable admission gate and stale-execution prohibition | 18k-35k LOC, multiple months |

The first usable generic internal system, if triggered after product evidence,
is estimated at 8,000-15,000 LOC and 4-8 weeks. A cross-product plugin platform
is 40,000-75,000 LOC before product-specific behavior and requires multiple
quarters. All estimates carry at least ±40% uncertainty until real slices exist.

## Audience And Distribution

- Private NOW: only static, audited, co-released built-ins.
- Public NOW: none. Stable SPI waits for independently authored implementations,
  immutable admission evidence, compatibility, release approval, and support.
- Community NOW/NEXT: explicit non-goal.
- No catalog or registry dependency NOW. Later, OCI/ORAS transports bytes and
  Cosign supplies authenticated evidence; neither is authorization or freshness.
  Use direct digest install before a catalog. A writable catalog has one
  PostgreSQL authority; signed snapshots and search indexes are derived.
- Any managed currentness or revocation metadata uses TUF semantics from its
  first remote use. Self-hosted and direct-digest profiles cannot require
  Platform.

See [graph and DI](06-dependency-graph-and-di-decision.md),
[deferred decisions](12-deferred-decisions.md), the existing
[catalog guidance](../catalog-and-profiles.md), and the
[executive report](01-executive-report.md).
