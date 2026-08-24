---
id: ADR-0009
type: adr
status: superseded
owner: architecture
summary: Defines built-in activation identity, shared-runtime retirement, contribution cardinality, and fail-closed uninstall.
approved_by: product-owner
accepted_at: 2026-08-23
superseded_by:
  - ADR-0010
supersedes:
  - ADR-0008
related:
  - ADR-0001
  - ADR-0005
  - ADR-0007
---

# ADR-0009: Extension Activation And Retirement Corrections

## Context

ADR-0008 established authority-scoped graph, runtime, grant, and private-state
relationships. Final adversarial review found four remaining ambiguities:

- a trusted built-in module has no plugin artifact or artifact installation, but
  still requires an authority-scoped activation identity;
- an unchanged runtime generation may be referenced by multiple routing
  snapshots, so candidate cleanup cannot own or terminate every referenced
  runtime;
- a contribution installation needs an exact manifest contribution and optional
  instance cardinality;
- uninstall needs an ordered, resumable transition before installation evidence
  or private-state attachments can disappear.

The authority, transaction, admission, trust, state-custody, and public API
decisions of ADR-0008 remain in force except where this ADR narrows them.

## Decision

### Activation source identities

A runtime generation belongs to exactly one authority-scoped activation source.
The source is a discriminated union, never a fabricated common installation:

```text
ActivationSource =
  | ArtifactContributionInstallation
  | BuiltInModuleInstallation
```

- `ArtifactContributionInstallation` identifies exactly one tuple of
  `(ArtifactInstallationId, ContributionId, InstanceId?)`.
- `ContributionId` is unique inside one immutable manifest. A repeated logical
  instance is legal only when the product-owned extension point explicitly
  supports multiplicity and assigns a distinct `InstanceId`.
- Grouping sibling contributions behind one contribution-installation identity,
  changing its parent, or silently creating duplicate singleton instances is
  rejected.
- `BuiltInModuleInstallation` binds one product authority scope, a stable
  product-owned module identity, and an immutable build or implementation
  digest. It has no publisher, artifact, manifest, or catalog identity.
- Replacing a built-in build or changing its authority scope creates another
  built-in installation and runtime generation. It cannot inherit an old grant.

A capability grant binds the common authority scope, graph generation, runtime
generation, activation-source identity, exact capabilities, immutable grant
identity, and monotonic non-reused revision in that grant lineage. Artifact-backed
grants additionally bind artifact and manifest digests. Built-in grants bind the
module identity and implementation digest instead.

The same numeric revision may exist in independent grant lineages. A current
`(GrantB, revision 1)` is valid even if `(GrantA, revision 1)` existed earlier;
the complete tuple and its graph, runtime, source, scope, and capability
relationships must match. A stale handle for `GrantA` can never exercise
`GrantB`.

### Graph references and runtime retirement

An immutable graph generation belongs to exactly one product authority scope
and may reference only same-scope runtime generations. A staged graph records
each runtime as either:

- candidate-owned, created specifically for that candidate; or
- referenced-existing, already reachable from another live graph or accepted
  in-flight invocation lease.

Failed or abandoned candidate cleanup terminates only candidate-owned runtimes
that have not become reachable elsewhere. It releases references to existing
runtimes but never disposes them.

Publishing a new routing snapshot fences new dispatch according to the compiled
handover plan. A runtime generation becomes retirement-eligible only when no
live routing snapshot and no accepted bounded in-flight invocation lease
references it. Retirement is idempotent, rechecks reachability after acquiring
its fence, and then drains, terminates, and records the terminal outcome.
Cleanup ownership and graph reachability are therefore separate evidence.

### Ordered uninstall

Uninstall is a durable, idempotent process with explicit checkpoints:

1. fence affected routes and invalidate applicable grants;
2. drain or cancel accepted work according to the product contract;
3. terminate retirement-eligible runtime generations and reconcile uncertain
   outcomes;
4. detach the exact private-state attachment without deleting, reusing, or
   changing custody of the state space;
5. remove local artifact material and mark the installation uninstalled.

A crash resumes from durable evidence. Later phases cannot execute before all
required earlier outcomes are terminal. Failed termination or uncertain external
effects block detachment and artifact removal. Product data and private user data
are never implicitly deleted by uninstall.

### Conformance floor

The first executable conformance suite must include negative and recovery cases
for every normative join, not only happy-path activation:

- catalog-admitted and product-approved direct-digest trust routes, with
  entitlement applicable and explicitly not applicable cases;
- independent product authorization and capability grant issuance;
- mismatched authority scope, graph, runtime, activation source, grant identity,
  revision, capability set, artifact parent, manifest digest, or built-in digest;
- valid new grant lineage revision reuse by number and stale old-lineage
  rejection;
- singleton, multi-instance, wrong-parent, grouped-sibling, and duplicate
  manifest contribution cases;
- failed-candidate and successful-handover reuse of an existing runtime;
- incompatible private-state schema lineage and sibling access;
- interruption and retry at every uninstall checkpoint.

## Consequences

- Built-in modules receive the same authority and fencing guarantees without
  pretending to be distributed plugin artifacts.
- Candidate cleanup, graph publication, and runtime retirement cannot terminate
  a generation still used by another graph or accepted invocation.
- Multi-contribution authorization and state ownership have exact cardinality.
- Uninstall is slower than deleting installation rows, but cannot leave active
  authority behind or silently destroy user data.

## Rejected alternatives

- Create synthetic plugin artifacts for built-ins. This pollutes distribution,
  provenance, and catalog semantics with fake records.
- Let each graph own every referenced runtime. Shared runtime references make
  that ownership unsafe.
- Infer contribution multiplicity from repeated IDs. Multiplicity must be an
  explicit product contract with distinct instance identity.
- Best-effort uninstall cleanup. Lost acknowledgement and partial failure require
  durable checkpoints and reconciliation.
