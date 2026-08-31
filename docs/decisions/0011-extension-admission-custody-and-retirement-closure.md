---
id: ADR-0011
type: adr
status: accepted
owner: architecture
summary: Closes revocation, source retirement, uncertain effects, tenant custody, built-in state, and dependency-closure gaps found by final review.
approved_by: product-owner
accepted_at: 2026-08-29
related:
  - ADR-0005
  - ADR-0008
  - ADR-0009
  - ADR-0014
  - ADR-0015
  - OD-003
supersedes:
  - ADR-0010
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
any ADR-0008 through ADR-0010 invariant. This ADR becomes the new cumulative
extension safety floor and supersedes ADR-0010.

## Decision

### Cumulative floor, applicability, and non-authorization

Every normative decision of ADR-0010 is incorporated into this ADR unless a
clause below explicitly replaces it. Product-owned authority and transactions,
closed dependency objects, execution outside the Unit of Work, independent
admission decisions, immutable identities, per-invocation fencing,
trusted-versus-isolated placement, containment limits, private-state and secret
isolation, target-specific retirement, and the public API gate therefore remain
effective.

This ADR explicitly replaces ADR-0010's contribution-only direct-route
retirement rule with fencing and draining the complete affected durable reverse
dependency closure. Unrelated sibling installations remain live as defined
below.

This ADR is a conditional safety floor for a product-owned production extension
host. It does not authorize a production module runtime, graph host, isolated
host, public SPI, Foundation package, or product extension point. A clause
applies only after an owning-product decision independently authorizes the
capability that invokes it.

Get Modular declarations, validation, graph compilation, diagnostics, immutable
plans, and attempt-scoped construction are outside this ADR. Ordinary reusable
libraries, source imports, static Pure DI, `FeatureModuleFactory`, inert
declarations, generated inventories, and target-local literal loaders are also
outside it. A trusted built-in, selected implementation, package, or source
module does not become a host-managed built-in installation merely by being
statically composed.

The following profiles are independent applicability and conformance
partitions:

- the runtime-publication profile applies only when the owning product creates a
  durable activation source and runtime generation;
- the artifact-lifecycle profile applies only when it creates a durable artifact
  installation;
- the custody profile applies only to extension-private state deliberately
  enrolled under a custody subject;
- tenant ownership transfer and external-effect profiles apply only when those
  capabilities are supported.

Unsupported operations fail closed without fictional identities or placeholder
implementations. These profiles are not one universal interface, service,
package, transaction, or state machine. A host implements only its declared
profiles and proves every join between profiles that it combines.

In this ADR, a candidate graph is a product-host publication candidate over
runtime-addressable activation sources, not a Get Modular compilation graph or
immutable plan. An artifact is the immutable OCI plugin artifact defined by the
Extension Model. An installation is a durable product-host lifecycle record,
not a package-manager or filesystem installation. The host is the
consumer-owned production extension host.

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

Immutable evidence is bound by digest and does not acquire a revocation lease.
Every independently owned revocable authority decision supplies an authenticated
enforcement lease. It binds decision and issuer identity, authority revision,
monotonic authority fence, requesting principal, tenant or product subject,
audience host or host-set membership epoch, operation, exact target and
generation, evidence digest, issue time, validity interval, and a declared
clock-skew bound. A remote revocable decision always has a finite interval; it
cannot be represented as non-expiring.

The product host maintains the canonical monotonic enforcement projection for
its own enforcement of that authority. Within one product authority scope, one
publication transaction atomically commits the active-head revision, staged-pin
promotion, authoritative route-eligibility and fence records, and grant
activation records in the product's canonical control-plane store. Remote
authority leases are immutable comparison inputs. Installing or observing those
records in routers, workers, caches, or external effect stores is not part of
that transaction; those projections may converge asynchronously and must reject
stale generations and fences.

A remote revocation is `pending-enforcement` until the product host advances its
projection fence and closes affected admission through a linearizable compare
and swap. It becomes enforced for that host and authority scope at that
linearization point. Across a host-set audience it is terminal only after every
live member has durably fenced the decision or the finite membership or decision
lease has expired. An unreachable or unknown member never permits fallback
admission. An adapter without authenticated projections, monotonic revisions,
finite lease and clock semantics, and this linearizable lease-and-fence contract
cannot participate in admission.

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

Every product authority scope has a `GraphPublicationFence`. A scope is the
smallest product-owned routing cohort with one canonical publication head; it
must not default to a deployment-wide mutex. Every activation
source has a `SourceLifecycleFence`, and every artifact installation has an
`ArtifactRetirementFence`. Any operation that can change route eligibility
acquires the scope fence first, then all affected artifact and source fences in
canonical kind-and-identity order. The complete affected set is derived from a
durable candidate or retirement dependency-closure snapshot and revalidated at
the atomic publication or terminal transition. A missing, newly introduced, or
revision-changed member aborts the operation and requires candidate
recompilation. One publication dependency closure cannot cross product authority
scopes. Multi-scope or cohort rollout is an explicit product-owned saga and
makes no global atomic-cutover claim.

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

Fence acquisition means a bounded transaction or compare-and-swap that advances
durable epochs and records intent. No database lock, distributed lock, or lease
is held while invoking providers, draining work, dispatching effects, or
reconciling outcomes. Finalization reacquires every applicable fence in
canonical order and revalidates the closure snapshot and terminal predicates.

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
facts. Every affected dependent is either republished against a compatible
replacement provider or remains durably non-routable after the retired source
becomes terminal. A stale snapshot cannot reactivate it.

### Only proved external effects advance lifecycle

`PhaseApplicability.NotApplicable` is a pre-dispatch terminal checkpoint derived
from the retirement target kind and durable plan. It is not an external effect
outcome. A dispatched effect cannot return inapplicable as proof of success.

Every applicable external lifecycle or custody effect records intent before dispatch and
records accepted-pending, confirmed-success, confirmed-already-absent,
rejected, failed, or uncertain outcome afterwards. Only effect-specific
confirmed success may advance dependent phases. `ConfirmedAlreadyAbsent` is a
successful terminal proof only for an operation whose required postcondition is
absence, such as termination, detach, deletion, revocation, or removal, and only
when authoritative reconciliation proves the exact target and generation are
absent. It is invalid for attach, rebind, export, migration, or retention change,
which require proof of their own positive postcondition. Accepted-pending,
rejected, failed, or uncertain outcomes block all dependent phases, terminal
success, and destructive cleanup. A planned not-applicable checkpoint satisfies
only that exact non-effect phase.

Acknowledging an idempotency key proves request identity, not effect success.
An uncertain outcome is resolved only by authoritative effect-specific state
reconciliation bound to the same target generation, a provider receipt that
proves the terminal effect, or controlled manual recovery that attaches
authoritative evidence. Manual recovery records the operator principal, product
policy revision, evidence references, reason, disposition, and remaining
quarantine or retention debt. It cannot assert success, synthesize a receipt, or
authorize replay. Blind retry is forbidden. State is not detached and bytes are
not removed while an earlier process or external effect may still be live.

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
Product canonical state, feature-owned persistence, ordinary library state, and
product migrations are never `BuiltInModuleState`. Product identity, module
identity, and installation identity are authoritative; `implementationDigest`
only pins implementation content and is not an identity authority.

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
then fences and reconciles every old-revision route, invocation lease,
state-access grant, runtime-held handle, credential, export stream, cache,
custody lease, and accepted or ambiguous effect capable of observing or changing
the state. Each item obtains effect-specific proof of completion or proof that
the old effect can no longer occur. Only then may one atomic transition attach
the new owner and advance the ownership revision. New-owner credentials are
issued only after that transition commits. Before then the new owner cannot
attach, mutate, export, or delete state.

The transfer requires a current `CustodyOwnershipTransferAuthorization` issued
by the current custody authority. It binds immutable decision identity,
authority owner, authority revision and fence, requesting principal and
audience, state-space identity, complete custody subject, exact old and new
custody-owner identities and revisions, the transfer operation, and expiry or
explicit non-expiring status. When old and new custody authorities differ, the
old authority authorizes release and the new authority authorizes acceptance of
the same immutable transfer tuple. The terminal ownership transition performs a
linearizable comparison of this complete tuple with the current authority
projection and clock in the same serialized transaction that advances the owner
revision. Expiry, revocation, stale authority, or any tuple mismatch aborts the
transition. A product principal cannot substitute for the current tenant
authority over tenant-owned state.

An irreversible custody operation uses a durable `CustodyEffectLease` bound to
the authorization decision identity, authority owner, authority revision and
fence, requesting principal and audience, custody-owner identity and ownership
revision, exact current and proposed custody subjects, state-space identity,
immutable provider resource identity and generation, exact schema-authority
variant, identity, revision and fence, migration intent, operation, dispatch
deadline, expiry, and idempotency key. Authority is checked when intent commits.
Immediately before dispatch, the custody authority performs one linearizable
compare-and-reserve transition over this complete tuple. A migration or other
schema-changing effect additionally obtains a finite current reservation from
the independently owned schema authority over the same effect identity, schema
transition, schema-authority revision and fence, immutable migration intent,
audience, target generation, and dispatch deadline. When custody and schema
authority are the same serialized authority, one transition may reserve both.
Otherwise, reservations are acquired in canonical authority-identity order and
dispatch remains forbidden until every required reservation is durably recorded
as one complete dispatch-authorization set. This set is a host-local dispatch
precondition, not a shared authority transaction or distributed acceptance
point. Failure to obtain the complete set leaves every obtained reservation
unconsumed and requires authoritative release or expiry; it never permits
partial dispatch.

Each reservation receipt is authenticated, provider-bound, audience-bound,
finite, and one-shot. Issuing a receipt is that authority's independent
acceptance point and grants this exact bounded effect until the receipt deadline;
it does not wait for another authority or the host. A local authority records
its receipt in its serialized authority transaction; a remote authority must
expose an equivalent conditional reservation, verifiable receipt, and durable
status lookup by lease identity and idempotency key. An adapter that can only
check and then dispatch cannot perform irreversible custody effects.

One audience-bound product-owned enforcement gateway atomically consumes the
complete non-expired receipt set against the effect identity before performing
the effect and rejects an incomplete set, replay, retargeting, or dispatch after
any receipt deadline. The gateway records one idempotent dispatch intent; this
local consumption does not mutate all authority stores atomically. Raw provider
credentials that bypass receipt-set consumption are not exposed to extensions
or untrusted adapters. A security-enforcement adapter is a least-privileged
product-authorized trusted component, never an ordinary extension-supplied
implementation. An unconsumed reservation expires or is released only after
authoritative proof that no dispatch using it was accepted.

For each authority, revocation or expiry that takes effect before that
authority's reservation rejects its receipt. Once that reservation is issued, later
revocation fences new reservations but cannot retroactively cancel or duplicate
the exact bounded grant. If the host does not collect and consume a complete
non-expired set, dispatch remains forbidden and the individual reservations are
released or expire. Provider acknowledgement is not an authority acceptance
point and losing it produces an ambiguous outcome, never a new reservation or
blind retry.

Provider and extension calls remain outside the product Unit of Work. The Unit
of Work records state, fenced effect intent, and outbox evidence atomically.

Every effect reservation remains queryable after recovery and distinguishes
`reserved-not-dispatched`, `dispatched-unknown`, `confirmed-postcondition`,
`definitively-not-committed`, and `manual-recovery-debt`. A crash after remote
reservation never creates a new effect identity. A new separately authorized
attempt is permitted only after authoritative reconciliation proves the prior
effect did not commit.

Every custody attachment records an authorized disposition policy at creation:
access expiry, retention deadline, export opportunity, deletion authority or
basis, legal hold, notification owner, and unreachable-authority treatment.
Expiry or revocation fences access but does not itself authorize deletion. If
neither retention nor deletion is currently authorized, the system records
`CustodyBlockedQuarantine`, removes extension routes and credentials, preserves
state and audit evidence, and does not claim detach, deletion, or terminal
custody success. Resolution requires a new custody decision or an independently
applicable product or legal authority.

These custody rules constrain authority, fencing, and evidence. They do not
select an in-place, versioned-copy, dual-write, export/import, partial-rollout,
or rollback migration strategy, nor an N/N-1 compatibility window. Those choices
require an owning-product decision under OD-003. Rollback after publication is a
new forward candidate, never an inferred reversal.

### Required conformance and diagnostics

Before a production host or public SPI claims a profile, executable conformance
must cover that complete profile and every cross-profile join it implements.
Capabilities the host does not implement fail closed and do not require
unrelated positive-case suites. Applicable suites include positive and
fail-closed cases for:

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
  acknowledgement is lost;
- stale router and worker projections, authority clock-skew boundaries,
  controller failover, and remote reservation crashes before local receipt
  persistence, before dispatch, and after dispatch;
- ownership transfer with unresolved old routes, grants, handles, credentials,
  streams, caches, and effects;
- proof that no database lock, distributed lock, or fence lease is held across
  provider invocation, drain, dispatch, or reconciliation;
- replayed, wrong-target, expired, wrong-provider, wrong-audience, and
  wrong-resource-generation effect receipts;
- custody or schema-authority revocation immediately before and after its own
  reservation, revocation between independently owned reservations, receipt
  expiry before host consumption, and acknowledgement loss, proving that a
  pre-reservation revocation rejects while a post-reservation revocation fences
  new grants without invalidating the exact bounded receipt;
- incomplete reservation sets never dispatch and are released or expire without
  claiming a shared distributed acceptance point;
- custody authorization expiry with inaccessible quarantine, authorized
  retention, legal hold, and separately authorized deletion.

Every operation exposes stable machine-readable diagnostics containing its
operation identity, authority scope, desired, candidate, active, and runtime
generations when applicable, target identities, authority and ownership
revisions, fence revisions, dependency-closure digest and cardinality, phase,
outcome, blocked-on reason, fixed deadline, receipt references, last
authoritative observation, and next safe operator action.

## Consequences

- Admission cannot be separated from publication freshness, and retirement
  cannot resurrect an activation source through a staged candidate.
- Tenant ownership and execution scope remain independent authorities.
- Built-in modules can own private state without pretending to be artifacts.
- Static modules, ordinary libraries, and product canonical state do not acquire
  extension-host lifecycle or custody machinery.
- Lifecycle implementations need durable fences, revision-bound evidence,
  idempotency, and reconciliation checkpoints, increasing implementation and
  conformance cost.
- Distributed publication changes one canonical product control-plane head;
  asynchronous projections reject stale generations instead of claiming a
  simultaneous global cutover.
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
- Hold locks while calling providers, draining, or reconciling. Crashes would
  create unbounded transactions and deadlock-prone recovery.
- Require every host to implement every profile. That would violate interface
  segregation and encourage fictional support for unavailable capabilities.
- Split publication and custody into independent safety floors now. Retirement,
  attachment creation, ownership transfer, and terminal cleanup require shared
  cross-profile invariants; separate implementation ports do not require
  competing normative authorities.
