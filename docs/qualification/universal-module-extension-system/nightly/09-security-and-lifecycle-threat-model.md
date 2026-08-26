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

## Scope

The rehearsal admits two audited, co-released T0 built-ins. It has no remote or
untrusted code, installer, artifact resolver, dynamic host, ambient credential,
external side effect, persistent plugin state, managed update channel, or
cross-tenant execution. Those exclusions avoid attack surfaces; they do not
prove the deferred platform safe.

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
| Host escape | Plugin reaches product authority | No hostile plugin claim; T0 only | Independently enforced T2/T3 per-platform containment with no fallback |

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
