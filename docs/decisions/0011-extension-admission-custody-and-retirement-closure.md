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

Candidate publication, staged-pin promotion, routing snapshot installation, and
grant activation occur under the owning activation-source lifecycle fence. The
transaction atomically revalidates every evidence revision and freshness
condition. A stale, revoked, expired, wrong-owner, wrong-scope, or wrong-target
decision aborts publication and releases or reconciles candidate work; it can
never be treated as a successful prior check.

Post-publication revocation durably fences affected routes and new invocation
leases before the revocation is reported as enforced. Already accepted bounded
invocations follow their explicit lease and reconciliation policy. Revocation
never relies on eventually refreshing an in-memory cache.

### One lifecycle fence per activation source

Built-in module installations, artifact contribution installations, and
artifact installations each have an owning activation-source lifecycle fence.
The fence serializes:

- staged reference-pin acquisition and promotion;
- routing snapshot publication;
- capability-grant issuance and revocation;
- retirement intent, drain, reconciliation, and terminal closure.

Contribution and built-in retirement cannot become terminal while any staged
pin, live routing reference, accepted invocation lease, runtime generation, or
exact state attachment owned by that source remains unresolved. Artifact
retirement additionally waits for every child contribution installation.

Retiring one contribution keeps unrelated sibling installations and shared
artifact bytes installed. It still fences routes and grants across the complete
affected dependency closure when another contribution depends on the retiring
source. Dependency closure and installation ownership are separate facts.

### Uncertain effects are terminal barriers

Every external lifecycle or custody effect records intent before dispatch and
records accepted, rejected, failed, or uncertain outcome afterwards. Failed or
uncertain termination, revocation, detach, export, deletion, or artifact-removal
effects block all dependent phases, terminal success, and destructive cleanup.

An uncertain outcome is resolved only by an idempotency key acknowledged by the
external system, authoritative state reconciliation bound to the same target
generation, or controlled manual recovery. Blind retry is forbidden. State is
not detached and bytes are not removed while an earlier process or external
effect may still be live.

### Fenced custody effects and tenant ownership

Every private state space has a discriminated custody subject:

```text
StateCustodySubject =
  | ArtifactContributionState {
      publisherIdentity,
      extensionIdentity,
      contributionIdentity,
      artifactDigest,
      installationIdentity
    }
  | BuiltInModuleState {
      productIdentity,
      moduleIdentity,
      implementationDigest,
      installationIdentity
    }
```

No fictional publisher or artifact identity is created for a built-in module.

`StateCustodyAuthorization` additionally binds immutable custody-owner identity,
tenant or product identity, ownership revision, authorizing-principal relation,
and any permitted ownership transfer. Sharing a deployment scope does not imply
cross-tenant authority. A transfer is a separate explicit operation that fences
the old owner before the new owner can attach or mutate state.

An irreversible custody operation uses a durable `CustodyEffectLease` bound to
the authorization revision, complete custody subject, state-space identity,
schema transition, operation, expiry, fence, and idempotency key. Authority is
checked when intent commits and again immediately before external acceptance of
the irreversible effect. Revocation or expiry before acceptance cancels the
dispatch. Revocation after an accepted or ambiguous outcome enters
reconciliation; it does not cause a blind retry or rewrite history.

Provider and extension calls remain outside the product Unit of Work. The Unit
of Work records state, fenced effect intent, and outbox evidence atomically.

### Required conformance

Before any public SPI or production extension host, executable conformance must
include positive and fail-closed cases for:

- decision expiry or revocation before staging, during startup, at publication,
  after publication, and immediately before invocation;
- pin acquisition, graph publication, grant issuance, and each retirement target
  racing under the same lifecycle fence;
- retirement of a dependency with unrelated and dependent siblings;
- uncertain termination or custody effects at every checkpoint;
- same-deployment cross-tenant substitution and explicit ownership transfer;
- built-in and artifact-contribution state attach, migrate, export, detach,
  retention change, deletion, and interrupted retirement;
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
