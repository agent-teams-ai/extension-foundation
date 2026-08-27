---
id: qualification.universal-module-extension-system.nightly.architecture-roadmap
type: qualification
status: qualified
owner: architecture
summary: Provides the static-first phased architecture, adoption order, measured graph trigger, cost ranges, and separate extraction/publication gates.
related:
  - ADR-0001
  - ADR-0013
  - ADR-0014
---

# Architecture And LOC Roadmap

W11 static imports and Pure DI are the sole current implementation
recommendation. The earlier graph-first sequence is preserved historical
research, not a second roadmap.

## Phase 0: Governance Alignment

Approve the owning product capability, bounded context, accountable owner, two
fixed audited `T0` built-ins, authority exclusions, explicit selection, success
measure, deletion trigger, and separate LOC accounting. Record that Phase 1 has
no graph, runtime, Foundation package, plugin loading, or public SPI.

Estimate: 100-300 documentation and test-policy LOC, 1-3 working days.

## Phase 1: Product-Owned Static Rehearsal

Build the Orchestrator Work Completion evidence seam, or another explicitly
approved feature, with two static imports and Pure DI. The feature exports a
pure `FeatureModuleFactory`; the application composition root materializes the
implementation choice and owns configuration and lifetime. Use post-commit
dispatch, stale-result and authority revalidation, structured product
diagnostics, and focused positive/negative tests.

Do not add a runtime graph, descriptors, global container, service locator,
plugin loading, artifact identity, generic lifecycle coordinator, Foundation
package, public contract, or hot unload. Stop or simplify if generic glue is
more than 30% of changed production code or the named product outcome does not
improve.

Estimate: 1,500-4,500 LOC including tests, 1-3 weeks. Total through Phase 1:
1,600-4,800 LOC and 1.5-4 weeks including approvals.

## Phase 2: Measure; Generalize Privately Only After A Trigger

Measure whether static composition meets the product need. Keep it when it
does. A private product graph is eligible only when the product shows measured
runtime selection that cannot be met by rebuild/configuration, multiple
independently managed resource lifecycles needing dependency-aware operation,
or repeated composition defects that a bounded graph prototype can address.

If triggered, approve a private product scope and build only the minimum graph
needed. Use explicit bindings and closed dependency objects, keep descriptors,
diagnostics, and lifecycle semantics product-local, compare against the static
baseline, and delete the graph if it misses the measure or glue threshold. No
global container or Foundation extraction occurs here.

Estimate: 100-300 LOC and 2-5 days to measure; only if triggered, 2,000-5,000
LOC including differential/failure tests and 2-4 weeks for the private graph.

## Phase 3: Second Real Consumer And Semantic Reconciliation

Adopt a second product slice only for its own demonstrated need. A
non-executable AR provider-bundle descriptor is useful schema evidence but is
not an independent graph/lifecycle consumer. The second consumer must author
executable expectations independently. Reconcile identity, selection,
configuration, lifetime, failure, diagnostics, and ownership semantics; retain
product-local differences instead of forcing a false intersection.

Estimate: 1,500-4,500 product LOC plus conformance, 1-3 weeks; allow another
1-2 weeks for semantic reconciliation.

## Separate Foundation Extraction Gate

After Phase 3, a separate accepted extraction decision must name the neutral
intersection, real consumers, independent expectations, conformance evidence,
owner repository, version and compatibility policy, migration, support, and
release policy. One-way imports bound file movement, but extraction is not
automatically mechanical: semantic reconciliation, versioning, and ownership
remain reviewed work. Product ports, DTOs, adapters, authorization,
configuration, and consumer-specific lifecycle stay local.

Estimate after approval: 4,000-8,000 LOC, 2-4 weeks.

## Separate Publication Gate

Publication additionally requires two independently authored conforming
implementations, packed-consumer fixtures, immutable artifact admission, public
API review, compatibility and SemVer policy, release-promotion evidence,
support ownership, and an artifact-specific publication decision. Extraction
does not automatically publish.

Estimate: 6,000-11,000 incremental LOC, 3-8 weeks plus continuing support.

## Later Explicitly Gated Work

| Capability | Gate | Range |
| --- | --- | --- |
| Frontend trusted compiled catalog | Separate Frontend ownership and contribution decision | 2k-4.5k LOC, 2-4 weeks |
| Dynamic browser/Electron host | Independent loading value; capability broker; complete Web/Electron admission, containment, and compatibility | 10k-22k LOC, 6-12 weeks |
| Process host | Accepted production-host decision, named consumer, UMEQ-009/012 closure, authentication, custody and termination | 8k-13k LOC, 4-8 weeks |
| Plugin artifact/profile path | Independent install/update need, admitted host, digest/provenance, grants, rollback, custody and uninstall | 10k-18k LOC, 5-10 weeks |
| Public/community modules | Publication gates plus containment, revocation, moderation and support | Part of 40k-75k platform LOC, multiple quarters |
| Extism/WASI | Funded non-TS or isolation need and qualified ABI, broker, provenance, quota and host | Re-estimate after trigger |
| Side-by-side lifecycle | Restart misses a numeric SLO; prove fencing, state, capacity, cleanup, rollback and recovery | 12k-28k LOC, multiple months |
| D1/D2 distributed binding | Named topology, sinks, guarantees, SLO and operator | 10k-35k LOC, multiple months |
| Managed channel/catalog | Independent distribution; one PostgreSQL writer; explicit authority route; TUF for remote mutable metadata | 3.5k-11k LOC plus operations |

The first generic internal system exists only if Phase 2 and later evidence
trigger it; historical estimates remain roughly 8,000-15,000 LOC and 4-8 weeks.
A cross-product plugin platform remains roughly 40,000-75,000 LOC before
product-specific behavior and requires multiple quarters. Estimates carry at
least ±40% uncertainty until real slices exist.

## Audience And Distribution

- Private now: only static, audited, co-released built-ins.
- Public now: none. No current SHA or package is production-qualified.
- Community now/next: explicit non-goal.
- Plugin contributions, if later admitted, map through product-owned adapters
  to product ports. They become runtime modules only after measured graph or
  lifecycle need.
- No catalog or registry dependency now. Any later writable catalog has one
  PostgreSQL authority, explicit fail-closed federation routing, and derived
  snapshots/indexes. TUF applies from the first remotely refreshed mutable
  metadata.

See [graph and DI](06-dependency-graph-and-di-decision.md) for preserved
historical constraints, [deferred decisions](12-deferred-decisions.md), and the
[executive report](01-executive-report.md).
