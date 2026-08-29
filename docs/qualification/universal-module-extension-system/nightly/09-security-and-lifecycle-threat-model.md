---
id: qualification.universal-module-extension-system.nightly.threat-model
type: qualification
status: qualified
owner: architecture/security
summary: Defines the threats excluded from the T0 rehearsal and the gates for later lifecycle and hosting surfaces.
related:
  - ADR-0010
  - ADR-0011
  - OD-002
---

# Security And Lifecycle Threat Model

> Historical qualification evidence. This page is non-operative. Use the
> [current productization gate](../../module-system-v1-productization/README.md),
> [ADR-0014](../../../decisions/0014-product-local-module-authoring-composition-and-generation-guardrails.md),
> and [ADR-0015](../../../decisions/0015-authorize-get-modular-semantic-extraction.md)
> for current authority and implementation gates.

## Scope

The rehearsal admits two audited, co-released `T0` built-ins. Each is part of
the signed product build, reachable only through a literal target-specific
loader closure, and bound to the exact transitive executable closure digest,
provenance and review owner. There is no post-deployment executable mutation;
configuration and grants remain product-controlled. The rehearsal has no
remote or untrusted code, installer, artifact resolver, dynamic host, ambient
credential, external side effect, persistent plugin state, managed update
channel, or cross-tenant execution. Those exclusions avoid attack surfaces;
they do not prove the deferred platform safe.

| Threat or misuse | Consequence | NOW control | Gate before expansion |
| --- | --- | --- | --- |
| Cross-tenant substitution | Wrong tenant's code, grant, state, or result is used | Single explicit product scope; revalidate revisions and input identity | Complete authenticated authority tuple, partitioned caches, sink checks, negative corpus |
| Stale generation commit | Revoked or replaced work mutates state | No side-by-side; restart smallest authority realm | Durable generation allocator and atomic sink-local fence on every bypass path |
| Restore resurrection | Restore lowers grants, revocation, fence, or deletion state | No plugin custody or destructive retirement | Protected high-water state, quarantine, reconciliation, and N-1 restore tests |
| Descriptor/byte substitution | Verified metadata launches different code | Static build-time imports only | Sealed recursive closure, pre-import verification, verified launch receipt |
| Codec spoofing or replay | Validly encoded unauthorized request is accepted | No process protocol | Authenticated bootstrap, peer identity, nonce/replay policy, receiver-side authority checks |
| Deadline laundering | Caller deadline appears to prove cleanup | No generic lifecycle; report uncertainty | Monotonic hop-local budgets, independent cleanup horizon, terminal receipts |
| Partial cleanup | Leaked work or resource survives stop | Rehearsal should own no external resources | Transactional acquisition ledger, attempt-all reverse cleanup, joinable stop, leak soak |
| False global atomicity | Some routers or sinks accept stale effects | Local direct composition only | Named L0/D1/D2/T1 profile, every sink/bypass enumerated, measured barrier SLO |
| Dependency confusion | Alias, fallback, or ordering selects wrong provider | Closed explicit selection, no loader | Canonical IDs, exact locks, sealed factory binding, deterministic diagnostics |
| Publisher transfer | Old identity inherits new authority | No public publishers | Append-only transfer lineage, signer cutoff, re-approval, grant reissue |
| Remote metadata replay | Old release or revocation appears current | No managed channel | TUF semantics from first remotely refreshed mutable metadata |
| Manual digest mistaken for current release | Authentic old bytes are presented as publisher-current or bypass the operator's imported revocation policy | No remote artifact route | Label direct digest `manual-pin/no-currentness`; require exact-digest checks against the monotonic local revocation authority; require TUF before remote mutable channels or publisher-currentness claims |
| `T1` confused with hostile-code isolation | Same-user native code reaches filesystem, network, environment, IPC or descendants | No `T1` host in rehearsal | Restrict `T1` to trusted fault containment; qualify per-platform `T3` or `T4` before untrusted native code |
| Host escape | Plugin reaches product authority | No hostile plugin claim; `T0` only | Independently enforced `T2/T3` per-platform containment with no fallback |
| Unsafe artifact materialization | Traversal, links, decompression or partial promotion substitutes executable bytes | No installer or resolver | Exact dependency closure, bounded extraction, digest-before-execute, atomic promotion and partial-cleanup fixtures |
| Secret or egress exfiltration | Plugin obtains reusable credentials or reaches attacker-selected destinations | No ambient credential or plugin network | Product-owned secret/egress brokers with opaque leases, DNS/redirect/response limits, revocation and audit |
| State migration without custody | Update mutates or attaches another owner's state, or publishes over ambiguous schema | No persistent plugin state | Exact custody subject/owner, current authorization, fenced migration lease, schema proof and effect reconciliation |
| Uninstall loses retained-state references | Retained data becomes orphaned, deleted, or reachable by a successor | No plugin uninstall | Enumerate exact attachments and owner decisions; terminal retirement requires reference and custody closure |
| Resource or cleanup-debt escape | Exhaustion or leaked descendants survive reuse, update or retirement | Built-ins acquire no external resources | Hierarchical budgets, acquisition ledger, durable cleanup debt, terminal receipts and restart-loop quarantine |
| Reused runtime retires during staging | Published candidate routes to a terminated generation | No runtime reuse | Durable staged reference pins promoted or released under the retirement fence |

## Lifecycle Contract

Cancellation requests cooperation; it does not prove termination. A timeout
bounds waiting, not cleanup. Cleanup must have a separate horizon, attempt all
owned resources in reverse acquisition order, preserve aggregate failures, and
produce a terminal or explicitly uncertain result. In-process TypeScript cannot
promise forced termination. Process or browser placements need physical realm
termination receipts and descendant cleanup.

Restart-first is the V1 rule. Side-by-side is allowed only after an interruption
SLO cannot be met otherwise and capacity, state compatibility, grant and
generation fences, stale queues, rollback, cleanup, and recovery are proved.
Rollback advances identity; it cannot reverse irreversible external effects.

OCI/ORAS distribution, Cosign/Sigstore verification and TUF currentness remain
target architecture, not implemented or qualified adapters. Exact dependency
closure and safe materialization, brokered egress and secrets, state custody and
migration, uninstall retained-state closure, and resource/cleanup-debt controls
are independent future release gates. Failure of any applicable gate denies
admission or publication; it never silently falls back to a weaker host,
provider, source or prior state.

Every later phase preserves the fail-closed tenant, scope, generation and grant
join at publication, invocation and privileged sinks. Extension calls remain
outside the product Unit of Work; canonical state and durable intent commit
before dispatch, and uncertain effects reconcile before dependent phases.

## P0/P1 Disposition

- P0 governance, custody, and admission blockers fail closed for production,
  remote, dynamic, untrusted, and public surfaces.
- P1 authority freshness and stale-result checks must close in the rehearsal.
- P1 process, supply-chain, containment, update, custody, distributed, and
  public-SPI findings remain explicit release blockers for their later phases.
- ADR-0010 remains accepted; ADR-0011 remains proposed and cannot silently
  repair or supersede it.

See the existing [trust and security](../trust-and-security.md),
[lifecycle qualification](../lifecycle-and-concurrency.md), and the
[executive report](01-executive-report.md).
