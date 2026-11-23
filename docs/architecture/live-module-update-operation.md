---
id: architecture.live-module-update-operation
type: architecture
status: proposed
owner: architecture
summary: Proposed complete update contract, feature ownership, integration seams, and adoption prerequisites for the standalone library.
---

# Live Module Update Operation

<!-- cspell:words Piral XState OpenComponents CRDT -->

## Scope and authority

This is the proposed implementation contract for **live-module-updates**, the
owner-requested standalone library. It details the confirmed direction in the
[system map](live-extension-system-map.md): ordinary TypeScript first, one
complete update operation, optional integration profiles, and consumer-owned
authority and state. It does not publish an API, accept a runtime, or resolve
the [seven owner choices](../research/module-federation-update-boundaries-and-architecture-options-2026-11-22.md#owner-decision-matrix).

The [design validation record](../research/live-module-update-design-validation-2026-11-23.md)
owns current source observations, independent reviews and experiment results.
Existing accepted EF and Get Modular decisions retain their authority.

## One complete operation with separate facts

The library implements planning, preparation, publication coordination,
reconciliation, continuity and retirement. The consumer supplies narrow
authority/state primitives and selects supported policies. It must not rebuild
the orchestration from a set of hooks. The existing graph, resource and execution
owners remain beneath that operation.

A result needs several independent dimensions:

| Dimension | Facts the operation must distinguish |
| --- | --- |
| Plan and candidate | Unsupported or stale basis; preparation running; prepared; failed with remaining owned resources |
| Authoritative publication | Not requested; committed; rejected/conflicting; outcome unknown and being reconciled |
| Useful adoption | Selected version; useful output observed; some views/sessions still old; failed or degraded adoption |
| Predecessor work and cleanup | New admission closed; old work retained; close running; cleanup debt; actual completion |
| Retention | Runtime, history, artifacts and old-client holds; each owner and the action that can release it |

These are semantic distinctions, not frozen enum or JSON field names. A new
version can be useful while old cleanup has failed. A timeout can stop a caller
waiting while publication remains unknown. Neither condition fits a single
success/failure flag or a monotonically advancing progress percentage.

The operation's attempt record stores its requests and observations. It points
to the canonical head and actual lifetime identities; it cannot independently
select an active generation or authorize deletion. A durable profile persists
the attempt facts it needs for recovery. An in-memory profile states its host-loss
limit. The library supplies the recovery logic for its selected profile.

## Identity and compatibility

Keep capability revision, composition plan, artifact/import closure, runtime
generation, update attempt, authoritative head, state baseline and shared realm
distinct. Stable plugin and installation identifiers do not identify the exact
old listener or resource that a finalizer may remove.

The plan binds the relevant identities and explains its affected closure. That
closure combines existing dependency semantics with state compatibility and
actual sharing constraints. It is not inferred from a source filename, package
version or feature folder. Get Modular remains the owner of graph compilation
and bindings; the update planner consumes its facts rather than maintaining a
second import graph.

Revalidate mutable grants, head and state facts at their actual authority
boundary. A valid earlier preview cannot authorize a later write. Returning to
old code creates another authorized generation against current state and grants.

## Semantic ports and their obligations

These responsibilities describe the contracts to qualify. They do not require
one large interface or an empty method for every optional capability.

| Responsibility | Consumer or existing mechanism supplies | Operation guarantees to implement |
| --- | --- | --- |
| Inspect and plan | Inert declarations, existing composition result, policy and compatibility facts | Explain affected contributions, required guarantees and rejection reasons before candidate evaluation |
| Prepare | Qualified loader/construction mechanism and meaningful readiness observation | Establish custody before imports or acquisition; retain failed and late construction until the required cleanup obligations complete, including any settled debt |
| Publish | Authorized expected-revision mutation bound to original attempt and candidate | Distinguish committed, rejected and unknown; never execute a candidate callback inside a database transaction |
| Reconcile | Authoritative lookup of the original attempt and the selected recovery evidence | Resolve uncertainty before replaying an effect or destroying a possibly active candidate |
| Admit and retain calls | Qualified atomic selection/admission/custody mechanism | Preserve the selected cohort across supported awaits, streams and continuations |
| Transfer state | Owner-held schema, baseline, compatibility and migration primitives | Coordinate the selected state transition, conflict and recovery result without inventing a serializer |
| Retire | Existing admission, effect-authority and execution owners | Separate preventing new calls, fencing writes, waiting for old work and requesting physical stop |
| Close resources | Native scope/executor and its actual original completion result | Retain pending cleanup and debt; distinguish abandoned waiting from release |
| Observe adoption | Product/view evidence tied to generation and state revision | Report useful behavior separately from artifact download, selection or component construction |
| Evaluate retention | Runtime, artifact, history and session owners | Expose outstanding holds and budgets; permit deletion only after every relevant hold is released and the owner confirms eligibility |

Reading a head and retaining it after an `await` does not implement atomic
selection/admission. Repeatedly calling an idempotent close does not necessarily
join its original finalizers. These are requirements on the selected mechanism,
not gaps to conceal in a generic adapter.

Preparation custody covers the supported profile's declared acquisitions and
continuations. Importing code does not capture arbitrary unregistered top-level
effects; the selected loader/trust profile must account for that boundary.

### Operation ordering

The first supported profile needs an executable transition model covering:

1. Validate requested guarantees and produce an inert, explainable plan.
2. Establish attempt ownership before candidate evaluation or acquisition.
3. Prepare through the selected native mechanisms and collect readiness/state
   evidence.
4. Revalidate and request publication at the actual authority boundary.
5. Reconcile an uncertain publication using the same attempt identity.
6. Observe useful adoption and preserve the selected old-work affinity.
7. Coordinate predecessor retirement, native cleanup and retention.

This is not a universal total order. Exclusive resources, state migration and
multi-client publication can require different supported variants. The library
ships those variants; business code supplies the policy and primitives.

Coordinate publication per actual activation domain. Independent domains can
progress concurrently; this does not select preparation concurrency for competing
candidates. Cross-process conflicts still use the canonical expected-revision
authority. Budgets can defer or reject another candidate; a deadline cannot
silently change draining into forced termination.

## Features, layers and patterns

Start with one substantive update-operation feature inside an ordinary library
module. Planning, reconciliation and observation can remain cohesive subareas.
Extract an adapter or feature when it has a real dependency, release, ownership
or independently used capability boundary. A phase or port is not automatically
a package.

The inner use case owns semantic models and ports. Outer adapters own SDKs,
network/storage access, DOM/Node APIs and transport mapping. The composition
root wires them; it does not contain the update algorithm. The accepted Get
Modular consumer rules keep its declarations and imports at outer composition.
Check emitted declarations as well as runtime imports for accidental optional
framework dependencies.

| Pattern | Appropriate use | Reuse and rejection boundary |
| --- | --- | --- |
| Ports and adapters | Authority, state, composition and native lifecycle seams | Ports describe consumer-needed behavior; no global service bag or universal Plugin interface |
| Explicit transition model | Attempts, uncertain outcomes and recovery | Compare typed functions with the already researched XState pure transition API; no second workflow platform |
| Expected-revision publication and same-attempt reconciliation | Concurrent updates and lost acknowledgements | Reuse the authority store; a local mutex or new attempt ID cannot resolve an unknown commit |
| Exact-instance ownership | Listeners, registrations, scopes and finalization | Old cleanup removes only what it still owns; a stable route/name alone can address the successor |
| Scoped resource acquisition | Partial construction, late completion and cleanup debt | Reuse native scopes and their real receipts; do not implement a parallel cleanup stack |
| Read model / projection | Progress, useful adoption, debt and retention UI | Rebuild from owner snapshots after gaps; observations never become publication authority |
| Expand/contract compatibility | Selected state/protocol evolution | Use the state owner's migrations and compatibility tests; code rollback does not reverse external effects |
| Reader retention before reclamation | Preserving admitted work while routing new work elsewhere | Reuse the qualified lifetime mechanism; reader-zero is not proof that queued cleanup or artifact holds ended |

DDD applies to real invariants and ownership. The update attempt has technical
transition invariants; business data stays in its product context. Do not create
an aggregate for each callback or duplicate the product domain in the library.
DRY means one owner of transition rules, graph semantics and cleanup mechanics;
independent test oracles still remain independent.

The [blueprint](../research/standalone-live-plugin-library-blueprint-2026-11-22.md#one-policy-explicit-execution-profiles)
retains the typed-function/XState comparison and native Effect alternatives.
An optional Effect profile preserves native errors, requirements and scopes.
It must not make Effect mandatory through a Promise facade. A shared decision
and receipt contract can support a native driver; the concrete interpreter shape
needs a real consumer before introducing another abstraction framework.

## Eligible module authoring

For an eligible feature, keep the following information beside its owned
declaration, following [ADR-0014](../decisions/0014-product-local-module-authoring-composition-and-generation-guardrails.md).
This is a proposed authoring dossier, not a new Get Modular schema or public SPI.
Executable loaders remain separate, target-local code.

| Fact to record | Purpose |
| --- | --- |
| Feature and capability contract owner | Who controls meaning and compatibility |
| Implementation/artifact closure and supported execution profile | Which code and shared runtime identities actually participate |
| Replacement boundary and dependency constraints | What must change together and what is unsupported |
| Preparation, readiness and useful-adoption observations | What each completion claim means in this feature |
| State subjects and compatibility/migration rules | Who retains documents, drafts, history, sessions and schema baselines |
| Calls, streams, callbacks and resources | Which work can outlive selection and which mechanism retains it |
| Cleanup and retention obligations | Exact-instance debt, artifact/history holds and old-client support |
| Allowed fallback and rejecting cases | When remount, restart or rejection is required |
| Evidence and review trigger | Which changed contract or dependency invalidates the claim |

Broad use across the owner's projects means a consistent authoring and validation
path. One application may combine live-replaceable contributions, controlled
restart boundaries and fixed dependencies. Start with a real selected dossier;
generalize facts demonstrated by independent uses.

## Integration profiles

The [system map's technology register](live-extension-system-map.md#module-format-and-execution-profile-register)
owns the complete candidate list. Separate integration dimensions:

- **Composition:** fixed typed factories or an optional Get Modular integration.
  A simple external consumer need not introduce a dynamic dependency graph.
- **Delivery and loading:** ordinary build output/ESM, Module Federation,
  SystemJS or Native Federation where required. Reuse their resolution semantics;
  a loader instance is not automatically a new realm or fresh singleton.
- **Contributions:** the existing UI framework, Piral, single-spa or an
  OpenComponents integration for its actual consumer. Mount/unmount and managed
  registration are not universal state or cleanup guarantees.
- **Execution:** cooperative TS, native Effect, existing Worker/process support,
  or a qualified Wasm profile. Extism and Component Model tooling have different
  host/guest contracts; they are separate candidates.
- **State and durability:** the product's store/history and, only where needed,
  its existing durable execution mechanism. No mandatory PostgreSQL, CRDT or
  workflow engine for ordinary library consumers.
- **Admission:** optional EF integration applies its actual artifact/trust
  obligations. It does not make the Agent Teams catalog mandatory for OSS use.

A profile qualifies a combination, including runtime/declaration dependency
closure and adverse behavior. This list does not promise an adapter package for
every technology. An unsupported guarantee must be rejected before candidate
execution, not represented by an empty method.

## Required adverse outcomes

| Case | Required retained fact/result |
| --- | --- |
| Plan becomes stale | Current authority/state reason; reject or explicitly replan |
| Candidate fails after acquisition | Failed preparation plus still-owned candidate work and cleanup |
| Caller abandons waiting | Caller outcome separate from the continuing owned operation |
| Publication acknowledgement is lost | Unknown result; original attempt retained and reconciled |
| Two updates race | Canonical publication outcome, conflict or unresolved peer |
| Old work issues a delayed write | Receiver applies current authority under the selected policy |
| Old registration disposer runs late | Successor registration remains owned by its exact instance, or the profile rejects that capability |
| Native cleanup fails | Useful successor remains distinguishable from predecessor cleanup debt |
| A second close returns early | Original cleanup flight still controls completion evidence |
| A view mounts but is not useful | Adoption remains unconfirmed/degraded; state and useful behavior are observed |
| Shared dependency identity differs | Reject unsupported sharing/compatibility before promising an atomic group |
| Host restarts mid-operation | Selected durable profile reconciles; in-memory limitation remains explicit |
| Local instance is unused but old clients/history need bytes | Artifact retention continues for the actual remaining hold |

The native mechanism studies qualify only their own fixtures. The first public
library still needs one complete real consumer scenario and independent
conformance, including a packed external consumer using only supported exports.

## Cross-repository delivery

| Owner | Concrete next work | Acceptance boundary |
| --- | --- | --- |
| Standalone library | One real operation feature, supported profile, ordinary consumer and public-root conformance | No empty packages or callback kit requiring consumer orchestration |
| Get Modular | Qualify a supported invocation/custody mechanism for profiles requiring it; expose missing neutral facts through the existing owner | Public Resources is cleanup; private kernel source is not a supported dependency |
| Extension Foundation | Keep current navigation, artifact mapping and admitted-host obligations connected to the standalone operation | Cores remain independent; accepted artifact and stable-SPI gates remain scoped |
| Engineering Foundation | Reuse source/declaration/dev-only checks and FMS enforcement; propose new validation only for a demonstrated portable gap | Tooling remains development-only and cannot certify runtime behavior by metadata |
| Organization rules | Register an actually created repository and publish the supported adoption route | No invented repository ID, positive qualification or implicit fleet migration |
| Consuming project | Select policy/profile and implement narrow authority/state primitives; demonstrate useful adoption and recovery | Business code does not acquire a second update state machine |

Current GM source separates released Resources from the private lifecycle
kernel. ADR-0030 withdrew ADR-0028's old eligibility order while retaining
ADR-0029's own surviving gates. Their withdrawal does not publish the kernel.
The detailed source record is in the design validation packet; no consumer pin
changes through this proposal.

Full FMS v1.1 and Foundation coverage belong in a new production repository's
first reviewed bootstrap. Existing rules already express the required feature,
layer and composition ownership; this study does not justify changing the
immutable standard. A source feature, public package release, eligible Docs
cohort, configured consumer and enforced hosted check remain separate steps.

## Decisions before implementation

Keep Q1-Q7 open: trust, shared dependencies/update unit, state continuity, useful
adoption, admitted work, rollback meaning and old-client support. The first
complete-library consumer/profile is also not chosen here. The already accepted
Agent Runtime provider journey is a distinct owner decision.

The next vertical slice should settle only its required choices, verify public
dependencies, implement the complete operation with one real consumer, then run
independent adverse and packed-consumer conformance. Other adapters follow an
actual consumer need. This architecture prepares extension points without
advertising unimplemented guarantees.
