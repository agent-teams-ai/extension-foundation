---
id: ADR-0011
type: adr
status: proposed
owner: architecture
summary: Closes revocation, source retirement, uncertain effects, tenant custody, built-in state, and dependency-closure gaps found by final review.
related:
  - ADR-0005
  - ADR-0008
  - ADR-0009
  - OD-003
---

# ADR-0011: Extension Admission, Custody, And Retirement Closure

## Context

Final adversarial review of ADR-0010 found that its cumulative safety floor still
left seven concrete gaps:

- admission decisions could become stale between candidate staging and graph
  publication;
- contribution or built-in retirement could race candidate publication;
- an uncertain external termination did not explicitly block later detach or
  removal phases;
- custody authority could expire after intent commit but before an irreversible
  effect;
- deployment-wide scope did not independently prove tenant ownership;
- built-in private state had no valid ownership or lineage representation;
- contribution retirement did not distinguish keeping sibling installations
  from fencing the complete affected dependency closure.

These are corrections to the accepted safety intent, not permission to weaken
any ADR-0008 through ADR-0010 invariant. If accepted, this ADR becomes the new
cumulative extension safety floor and supersedes ADR-0010.

## Decision

### Revision-bound admission and publication

Every candidate graph carries a closed `AdmissionEvidenceSet`. For every
applicable decision it binds immutable identity, revision, authority owner,
scope, target, expiry or non-expiring status, and the evidence digest used to
decide:

- artifact provenance and digest verification;
- catalog or direct-digest trust route;
- host, protocol, and capability compatibility;
- entitlement or an explicit not-applicable result;
- product authorization;
- capability grants;
- state custody authorization when state is attached or changed.

Every independently owned authority decision supplies an enforcement lease
with its decision identity, revision, monotonic authority fence, validity
interval, and target tuple. The host maintains the canonical monotonic
enforcement projection for that authority. Candidate publication, staged-pin
promotion, routing snapshot installation, and grant activation occur in one
publication transaction that compares every lease with that projection and the
current clock. A remote authority may report revocation as enforced only after
the host has durably advanced the corresponding projection and fenced affected
routes. An adapter that cannot provide this linearizable lease-and-fence
contract cannot participate in admission.

A stale, revoked, expired, wrong-owner, wrong-scope, or wrong-target decision
aborts publication and releases or reconciles candidate work; it can never be
treated as a successful prior check. At every invocation-lease acceptance the
host repeats the revision, fence, target, and freshness checks. Reaching expiry
rejects new invocation leases and durably fences the affected route and grant.
Already accepted bounded invocations follow their explicit lease and
reconciliation policy. Enforcement never relies on eventually refreshing an
in-memory cache.

### Publication and lifecycle fence hierarchy

`ActivationSource` retains the exhaustive ADR-0009 union of artifact
contribution installation or built-in module installation. An artifact
installation is a parent lifecycle target, not a fabricated activation source.

Every product authority scope has a `GraphPublicationFence`. Every activation
source has a `SourceLifecycleFence`, and every artifact installation has an
`ArtifactRetirementFence`. Any operation that can change route eligibility
acquires the scope fence first, then all affected artifact and source fences in
canonical kind-and-identity order. The complete affected set is derived from a
durable candidate or retirement dependency-closure snapshot and revalidated at
the atomic publication or terminal transition. A missing, newly introduced, or
revision-changed member aborts the operation and requires candidate
recompilation.

Creating or changing any reference or custody attachment to an activation source
or artifact installation follows the same ordering even when it does not change
route eligibility. This includes state attach or rebind, schema migration,
retention changes, runtime-generation creation, dependency-edge creation, and
any ownership transition that preserves a source or installation reference. The
operation validates and commits under the scope, affected parent-artifact, and
affected source lifecycle fences. Artifact-extension state always acquires its
`ArtifactRetirementFence`, even though an artifact installation is not an
`ActivationSource`. Retirement's terminal attachment check is performed under
those same fences, so a concurrent custody operation cannot introduce a
reference after the check.

The fence hierarchy serializes:

- child source creation with parent artifact retirement;
- staged reference-pin acquisition and promotion;
- multi-source routing snapshot publication;
- capability-grant issuance and revocation;
- retirement intent, drain, reconciliation, and terminal closure.

Contribution and built-in retirement cannot become terminal while any staged
pin, live routing reference, accepted invocation lease, runtime generation,
startup or external effect, or exact state attachment that references the
source or its affected reverse dependency closure remains unresolved. The
closure is fenced against new routes and leases, then drained, cancelled,
reconciled, or explicitly retained before target terminal completion. Routing,
work, or runtime retention requires the owning product policy. Exact private
state retention additionally requires a current `StateCustodyAuthorization`
owned by the matching product or tenant authority and bound to that attachment,
retention operation, owner revision, and retained source generation. Product
policy alone cannot retain tenant-owned state. Artifact retirement additionally
waits for every child contribution installation under the same parent fence.

Retiring one contribution keeps unrelated sibling installations and shared
artifact bytes installed. Dependent siblings in the durable reverse dependency
closure are fenced and drained; siblings outside that closure remain live.
Dependency closure, installation ownership, and byte ownership are separate
facts.

### Only proved external effects advance lifecycle

Every external lifecycle or custody effect records intent before dispatch and
records accepted-pending, confirmed-success, confirmed-already-absent,
rejected, failed, or uncertain outcome afterwards. Only effect-specific
confirmed success may advance dependent phases. `ConfirmedAlreadyAbsent` is a
successful terminal proof only for an operation whose required postcondition is
absence, such as termination, detach, deletion, revocation, or removal, and only
when authoritative reconciliation proves the exact target and generation are
absent. It is invalid for attach, rebind, export, migration, or retention change,
which require proof of their own positive postcondition. Accepted-pending,
rejected, failed, uncertain, or effect-inapplicable outcomes block all dependent
phases, terminal success, and destructive cleanup.

Acknowledging an idempotency key proves request identity, not effect success.
An uncertain outcome is resolved only by authoritative effect-specific state
reconciliation bound to the same target generation, a provider receipt that
proves the terminal effect, or controlled manual recovery. Blind retry is
forbidden. State is not detached and bytes are not removed while an earlier
process or external effect may still be live.

### Fenced custody effects and tenant ownership

ADR-0010's common publisher-and-extension lineage requirement and ADR-0008's
private-state owner union are replaced by this exhaustive discriminated custody
subject:

```text
StateCustodySubject =
  | ArtifactExtensionState {
      publisherIdentity,
      extensionIdentity,
      artifactDigest,
      artifactInstallationIdentity
    }
  | ArtifactContributionState {
      publisherIdentity,
      extensionIdentity,
      contributionIdentity,
      artifactDigest,
      contributionInstallationIdentity
    }
  | BuiltInModuleState {
      productIdentity,
      moduleIdentity,
      implementationDigest,
      builtInModuleInstallationIdentity
    }
```

Extension-owned state attaches only to its artifact installation,
contribution-owned state only to its contribution installation, and built-in
state only to its built-in module installation. No fictional publisher,
extension, contribution, or artifact identity is created for a built-in module.

Schema and migration authority is also discriminated rather than inferred from
the custody subject:

```text
SchemaAuthority =
  | ArtifactSchemaAuthority {
      publisherIdentity,
      extensionIdentity,
      schemaLineage,
      authorityRevision
    }
  | BuiltInSchemaAuthority {
      productIdentity,
      moduleIdentity,
      schemaLineage,
      authorityRevision
    }
```

The publisher supplies artifact schema and migration intent. The owning product
module supplies built-in schema and migration intent. Neither authority grants
state custody. Every custody authorization and migration effect binds the exact
schema-authority variant, lineage, revision, current schema, and proposed schema.

`StateCustodyAuthorization` binds immutable decision identity, authority owner,
authority revision and fence, exact current and proposed custody subjects,
immutable custody-owner identity, tenant or product identity, ownership
revision, authorizing-principal relation, state and schema transition, the
single permitted operation, and expiry or explicit non-expiring status. Sharing
a deployment scope does not imply cross-tenant authority.

Ownership transfer is a durable separate operation bound to exact old and new
owner identities and revisions. It first fences the old ownership revision,
then waits until every old-revision custody lease and every accepted or
ambiguous effect has effect-specific proof of completion or proof that no old
effect can still occur. Only then may one atomic transition attach the new owner
and advance the ownership revision. The new owner cannot attach, mutate,
export, or delete state before that transition commits.

The transfer requires a current `CustodyOwnershipTransferAuthorization` issued
by the current custody authority. It binds immutable decision identity,
authority owner, authority revision and fence, state-space identity, complete
custody subject, exact old and new custody-owner identities and revisions, the
transfer operation, and expiry or explicit non-expiring status. The terminal
ownership transition performs a linearizable comparison of this complete tuple
with the current authority projection and clock in the same serialized
transaction that advances the owner revision. Expiry, revocation, stale
authority, or any tuple mismatch aborts the transition. A product principal
cannot substitute for the current tenant authority over tenant-owned state.

An irreversible custody operation uses a durable `CustodyEffectLease` bound to
the authorization decision identity, authority owner, authority revision and
fence, custody-owner identity and ownership revision, exact current and proposed
custody subjects, state-space identity, schema transition, operation, expiry,
and idempotency key. Authority is checked when intent commits. Immediately
before dispatch, the authority owner performs one linearizable
compare-and-reserve transition over this complete tuple. Its durable receipt is
the effect's acceptance point. A local authority records that receipt in its
serialized authority transaction; a remote authority must expose an equivalent
CAS reservation and verifiable receipt. An adapter that can only check and then
dispatch cannot perform irreversible custody effects.

Revocation or expiry before this acceptance point rejects the reservation and
cancels dispatch. Once reserved, revocation fences new effects while this exact
bounded effect is reconciled to its effect-specific postcondition; it cannot
retroactively cancel or duplicate it. Provider acknowledgement is not the
authority acceptance point and losing it produces an ambiguous outcome, never a
new reservation or blind retry.

Provider and extension calls remain outside the product Unit of Work. The Unit
of Work records state, fenced effect intent, and outbox evidence atomically.

### Required conformance

Before any public SPI or production extension host, executable conformance must
include positive and fail-closed cases for:

- decision expiry or revocation before staging, during startup, at publication,
  after publication, and immediately before invocation;
- authority revocation racing the host enforcement projection and publication
  transaction;
- ordered scope, parent-artifact, and multi-source fence acquisition racing pin
  acquisition, graph publication, grant issuance, and every retirement target;
- retirement of a dependency with unrelated and dependent siblings, including
  closure-wide accepted leases, runtimes, startup effects, and reconciliation;
- accepted-pending, rejected, failed, uncertain, confirmed-success, and
  confirmed-already-absent termination or custody effects at every checkpoint;
- same-deployment cross-tenant substitution and explicit ownership transfer;
- ownership transfer expiry or revocation during drain, wrong authority owner,
  stale old or new owner revision, and product-for-tenant substitution;
- built-in, artifact-extension, and artifact-contribution state attach, migrate,
  export, detach, retention change, deletion, and interrupted retirement;
- source-reference creation and custody attach or rebind racing source and
  parent-artifact retirement, including a terminal attachment recheck;
- artifact-extension attachment racing artifact retirement without an
  activation source;
- product-owned and tenant-owned retained state, wrong-authority retention, and
  the discriminated artifact versus built-in schema-authority lineage;
- effect-specific terminal proof, including rejection of `already absent` for
  attach, export, migration, and retention changes;
- authority revocation before dispatch, after external acceptance, and after an
  acknowledgement is lost.

## Consequences

- Admission cannot be separated from publication freshness, and retirement
  cannot resurrect an activation source through a staged candidate.
- Tenant ownership and execution scope remain independent authorities.
- Built-in modules can own private state without pretending to be artifacts.
- Lifecycle implementations need durable fences, revision-bound evidence,
  idempotency, and reconciliation checkpoints, increasing implementation and
  conformance cost.
- The model remains product-neutral: products own concrete policies, identities,
  transactions, and extension points.

## Rejected alternatives

- Revalidate admission only on first staging. Revocation may occur before
  publication or invocation.
- Let contribution retirement fence only its direct route. Dependent
  contributions could remain routable with an absent required capability.
- Treat an uncertain external outcome as a warning. Destructive later phases
  could race a still-live process or effect.
- Let deployment scope imply tenant ownership. Multiple tenants may share one
  deployment authority scope.
- Model built-ins with synthetic publisher and artifact identities. That would
  corrupt provenance and custody semantics.
