---
id: ADR-0010
type: adr
status: superseded
owner: architecture
summary: Preserves the complete extension safety floor and closes staged reuse, custody, and target-specific retirement gaps.
approved_by: product-owner
accepted_at: 2026-08-24
superseded_by:
  - ADR-0011
supersedes:
  - ADR-0009
related:
  - ADR-0001
  - ADR-0005
  - ADR-0008
---

# ADR-0010: Extension Safety Floor And Retirement Closure

## Context

ADR-0008 defined the complete product authority, dependency isolation, trust,
runtime containment, transaction, invocation, graph, lifecycle, state custody,
and public API safety floor. ADR-0009 narrowed activation identities and runtime
retirement but did not state clearly enough that every other ADR-0008 rule
remained effective. Final adversarial review also found three unsafe gaps:

- a candidate graph could reference an existing runtime without pinning it
  against concurrent retirement;
- one generic uninstall flow could remove shared artifact material while sibling
  contributions remained active, and could not represent built-in retirement;
- compatible state lineage and product authorization did not independently
  prove that the state custody owner authorized an attachment or migration.

## Decision

### Complete effective safety floor

This ADR incorporates every normative decision of ADR-0008 and ADR-0009. No
ADR-0008 or ADR-0009 rule is retired unless the exhaustive replacements below
name it explicitly:

1. ADR-0009 graph reachability and retirement eligibility are replaced by the
   staged-reference pin protocol below.
2. ADR-0009 ordered uninstall is replaced by the discriminated retirement
   protocols below.
3. ADR-0008 private-state attachment and migration authorization are narrowed by
   the independent custody authorization below.
4. ADR-0009 conformance floor is extended by the negative matrix below.

All other rules remain effective, including product-owned authority and
transactions, closed dependency objects, no extension execution in a Unit of
Work, independent admission decisions, immutable identities and digests,
per-invocation fencing, trusted-versus-isolated host separation, bounded calls
and streams, containment, pure graph compilation, explicit handover, lifecycle
separation, private-state custody, secret isolation, and the public API gate.

### Staged runtime reference pins

A graph candidate cannot reference an existing runtime generation until it has
acquired a durable `StagedRuntimeReferencePin`. Pin acquisition and runtime
retirement eligibility are serialized by the same runtime retirement fence.
The pin binds candidate graph generation, runtime generation, authority scope,
and an immutable pin identity.

Graph publication atomically promotes every candidate pin to a live routing
snapshot reference. Candidate abandonment atomically releases its pins only
after candidate-owned work and startup effects have reached their required
terminal or reconciliation state. Recovery reconstructs candidate pins from
durable graph evidence and never guesses that an incomplete candidate was
published or abandoned.

A runtime becomes retirement-eligible only when no live routing snapshot, staged
candidate pin, or accepted bounded in-flight invocation lease references it.
Retirement acquires the fence, rechecks all three classes, records its durable
intent, and prevents later pin acquisition for that generation. A rejected pin
must trigger candidate recompilation against a current runtime generation; it
cannot revive a retiring runtime.

### Discriminated retirement targets

Retirement has three distinct durable targets and checkpoint sequences:

```text
RetirementTarget =
  | ArtifactContributionInstallation
  | ArtifactInstallation
  | BuiltInModuleInstallation
```

- Contribution retirement fences only that contribution's routes and grants,
  drains or cancels its work, terminates its retirement-eligible runtimes, and
  detaches only its exact state attachments. Shared parent artifact material and
  sibling contributions remain installed.
- Built-in retirement performs the same route, grant, work, runtime, and exact
  state-attachment closure, with artifact removal recorded as explicitly not
  applicable.
- Artifact uninstall first fences new child activation. It cannot remove artifact
  material or become terminal until every child contribution installation,
  route, grant, staged pin, live graph reference, invocation lease, runtime, and
  exact state attachment is terminal or explicitly retained under a separate
  custody decision. Every child outcome is recorded independently.

Each workflow persists target kind, target identity, ordered checkpoints,
applicable-versus-not-applicable phases, uncertain external outcomes, and its
terminal result. A crash resumes from this evidence. Uninstall never infers data
deletion, never groups sibling attachments, and never removes shared bytes while
one child can still execute or recover.

### Independent state custody authorization

Artifact verification, catalog or direct-digest trust, compatibility,
entitlement, product authorization, capability grants, and state custody
authorization remain independent decisions. None implies another.

Every attach, rebind, migrate, detach, export, retention change, or deletion of a
private state space requires a current product- or tenant-owned
`StateCustodyAuthorization`. It binds:

- immutable decision identity and revision;
- state-space identity and authority scope;
- publisher and extension lineage;
- exact current and proposed activation-source or installation identities;
- current and proposed schema lineage;
- the single allowed custody operation and any expiry or retention constraint.

Enforcement validates the complete tuple at commit. Publisher transfer,
extension identity reuse, installation replacement, scope change, schema change,
operation expansion, expiry, or revocation requires another custody decision.
The publisher supplies schema and migration intent but cannot authorize custody.
The product may authorize extension execution without authorizing access to an
existing state space.

### Extended conformance matrix

The first executable suite must prove positive and fail-closed negative cases for
every independent admission and custody input:

- valid and invalid provenance or digest verification;
- catalog admission, denied catalog policy, valid direct-digest policy, and
  denied direct-digest policy;
- compatible and incompatible host, protocol, and capability requirements;
- entitlement granted, denied, expired, and explicitly not applicable;
- product authorization granted, denied, stale, wrong-scope, and wrong-target;
- capability grant issuance and per-invocation graph-runtime-source-grant joins;
- custody authorization granted, absent, denied, stale, expired, wrong-scope,
  wrong publisher or extension lineage, wrong installation, wrong schema
  transition, and wrong operation;
- staged pin acquisition racing retirement, crash recovery before publication,
  atomic promotion, abandonment release, and rejected late pin acquisition;
- contribution, built-in, and artifact retirement interrupted at every
  checkpoint, including multiple sibling contributions and state attachments.

## Consequences

- The active decision has one explicit cumulative safety floor rather than a
  chain that implementations could interpret selectively.
- Graph reuse cannot publish a runtime that retired while the candidate staged.
- Contribution retirement cannot remove bytes or state still needed by a
  sibling, and built-ins no longer pass through fictional artifact phases.
- State compatibility remains necessary but cannot replace custody consent.
- Runtime and conformance implementations are larger because references,
  custody, and target-specific closure require durable evidence.

## Rejected alternatives

- Treat superseded ADRs as implicitly cumulative. An active index must not make
  safety depend on an undocumented interpretation rule.
- Pin reused runtimes only after graph publication. Retirement may win before
  publication and leave the new graph pointing at a terminated generation.
- Use one uninstall workflow with optional fields. Target cardinality and shared
  artifact ownership require different terminal conditions.
- Let product authorization imply state custody. Execution authority and
  control of retained user data have different owners and lifecycle rules.
