---
id: qualification.universal-module-extension-system.nightly.approval-ready
type: qualification
status: qualified
owner: architecture
summary: Separates product-owner approvals from agent recommendations without changing decision status.
related:
  - ADR-0011
  - ADR-0012
  - ADR-0013
  - OD-002
  - OD-003
---

# Approval-Ready ADR List

This is an approval queue, not an ADR edit. No item is automatically accepted,
resolved, or superseded by this dossier.

## Product-Owner Decisions Required Before Rehearsal

1. **First capability and owner.** Approve Orchestrator Work Coordination
   completion evidence, or name a different capability, bounded context,
   accountable owner, two built-ins, authority exclusions, success measure,
   and deletion trigger.
2. **Semantic ownership path.** Either accept ADR-0013 or an equivalent successor
   with explicit ADR-0012 supersession metadata for first-consumer semantics, or
   retain the ADR-0012 Foundation path and resolve OD-003, UMEQ-011, and
   UMEQ-013 before graph work.
3. **Rehearsal architecture.** Approve direct composition and the rule that no
   graph is built without measured need.

## Approval Questions For Later Phases

1. Which product and feature is the real second independent consumer, and what
   evidence qualifies neutral extraction?
2. Is a public or community ecosystem funded, and what publisher trust,
   containment, moderation, liability, compatibility, and support commitments
   are intended?
3. Will distribution remotely refresh releases, channels, mirrors, cohorts, or
   revocation? If yes, fund TUF operations and resolve OD-002 parameters.
4. Are non-TypeScript processes, remote deployment, or streaming RPC committed
   within 24 months? This controls UMEQ-009 and UMEQ-012.
5. What interruption, rollback, state-migration, stale-execution, and distributed
   effect guarantees are commercially required for each deployment profile?
6. Does Frontend need independently deployed executable UI, or are co-released
   built-ins sufficient for the next two releases?
7. Which named public artifacts require CommonJS, and who funds their support
   matrix?

## Canonical Status To Preserve

| Authority | Current status | W11 effect |
| --- | --- | --- |
| ADR-0012 | Accepted and effective | Remains effective |
| ADR-0011 | Proposed | Remains non-operative |
| ADR-0013 | Proposed | Remains non-operative |
| OD-002 and OD-003 | Open | Remain open |
| UMEQ-009 through UMEQ-018 | Open | Remain open |

Agents may recommend options, record evidence, and draft non-operative approval
material. Only the accountable owner may choose product scope, risk appetite,
support promises, lifecycle SLOs, public/community commitments, or accepted ADR
status.

See the canonical [ADR index](../../../decisions/README.md),
[open-decision index](../../../open-decisions/README.md), and the
[executive report](01-executive-report.md).
