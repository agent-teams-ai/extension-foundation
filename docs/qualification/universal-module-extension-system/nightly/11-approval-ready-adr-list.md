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
  - ADR-0014
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
2. **Semantic ownership path.** Apply accepted ADR-0015: independent Get Modular
   `0.x` is authorized, while ADR-0013's product-first, runtime-trigger, public
   SPI, and stop safeguards remain effective. ADR-0012 is historical authority,
   not a competing Foundation graph path.
3. **Rehearsal architecture.** Apply ADR-0014's direct-composition direction:
   the feature exports a pure `FeatureModuleFactory`, the application root owns
   implementation/configuration/lifetime, and no graph is built without
   measured runtime-selection or independent-lifecycle need.

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
| ADR-0012 | `superseded` | Preserved historical authority only |
| ADR-0011 | `accepted` | Conditional safety floor; does not admit a runtime |
| ADR-0013 | `superseded` | Retained safeguards continue through ADR-0015 |
| ADR-0014 | `accepted` | Static-first rehearsal direction is effective |
| ADR-0015 | `accepted` | Independent Get Modular extraction is authorized |
| OD-002 and OD-003 | `open` | Remain open |
| UMEQ-009 through UMEQ-010 | `open` | Remain open |
| UMEQ-011 | `accepted-existing` | Explicit provider binding is effective through ADR-0014 |
| UMEQ-012 through UMEQ-015 | `open` | Remain open |
| UMEQ-016 | `accepted-existing` | Generation replacement baseline is effective through ADR-0014 |
| UMEQ-017 through UMEQ-018 | `open` | Remain open |

Agents may recommend options, record evidence, and draft non-operative approval
material. Only the accountable owner may choose product scope, risk appetite,
support promises, lifecycle SLOs, public/community commitments, or accepted ADR
status.

See the canonical [ADR index](../../../decisions/README.md),
[open-decision index](../../../open-decisions/README.md), and the
[executive report](01-executive-report.md).
