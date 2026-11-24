---
id: OD-002
type: open-decision
status: open
owner: architecture
summary: Choose concrete key custody, signing quorum, freshness, retention, and offline operating parameters.
related:
  - ADR-0002
  - ADR-0003
  - ADR-0004
  - ADR-0005
---

# OD-002: Catalog Security and Offline Operational Parameters

## Decision required

Choose production parameters and recovery procedures for signed catalog
snapshots without weakening self-hosted or future air-gapped operation.

## Constraints

- Snapshot metadata must prevent rollback and freeze attacks and must identify
  its catalog authority, version, schema, content digest, and validity window.
- Artifact signing through Cosign does not replace catalog snapshot signing or
  catalog governance evidence.
- Managed, self-hosted, and future air-gapped deployments need different key
  custody adapters but the same verification semantics.
- No guessed global TTL, including a hard-coded 24-hour value, becomes policy.
- A stale, unknown, or revoked authority state fails according to an explicit
  operating profile and never silently falls back to another catalog.
- Catalog snapshot and offline operating profiles remain subject to their own
  semantic conformance and qualification. This catalog question does not decide
  a consuming product's release scope or canonical database.

**Scope clarification, 2026-11-05:** Orchestrator's accepted
[ADR-0114](https://github.com/agent-teams-ai/agent-teams-orchestrator/blob/main/docs/decisions/0114-canonical-backend-stack-and-distributed-role-adoption.md)
selects native PostgreSQL for local and hosted authority, and
[ADR-0115](https://github.com/agent-teams-ai/agent-teams-orchestrator/blob/main/docs/decisions/0115-canonical-fully-local-v1-adoption.md)
requires Fully Local V1. EF's accepted
[ADR-0003](../decisions/0003-postgresql-canonical-catalog-state-and-signed-snapshots.md)
retains its original catalog rollout context and possible later SQLite FTS5
search projection; that is not a SQLite product-authority fallback or evidence
that offline catalog capabilities are already implemented. Its accepted body is
unchanged. The security and offline parameters in this record remain open.

## Options

### Proposed baseline

Use TUF-compatible metadata semantics for root rotation, delegated online
signing, freshness, and rollback protection. Use platform KMS or HSM adapters for
managed deployments and explicitly configured local custody for self-hosted
deployments. Keep the protocol independent of any one cloud KMS.

This is a proposal, not an accepted dependency or key topology.

### Alternatives requiring comparison

- A single online signing key with external backup. Simpler, but weaker against
  key compromise and operator error.
- Cosign-only signatures over snapshot blobs. Reuses artifact tooling, but does
  not by itself define root rotation, delegation, expiry, or rollback semantics.

## Acceptance criteria

- Specify root and delegated key roles, threshold, custody, rotation, revocation,
  emergency recovery, and audit evidence for each deployment profile.
- Specify snapshot versioning, expiry, clock-skew tolerance, retention, and
  rollback or freeze detection.
- Specify connected, intermittently connected, and air-gapped operating profiles
  with explicit stale-data behavior.
- Specify moderation evidence retention, public tombstone retention, backup,
  restore, RPO, and RTO requirements.
- Prove root rotation, compromised-key revocation, stale snapshot rejection,
  rollback rejection, interrupted publication, restore, and N/N-1 compatibility
  with executable fixtures.
- Qualify the chosen libraries and versions before they become dependencies.

## Resolution

Open. When resolved, set `status: resolved`, add `resolved_by: ADR-NNNN`, and
retain the deciding ADR in `related`.
