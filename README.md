# Agent Teams Extension Foundation

Product-neutral extension artifact, trust, distribution, isolation, and
conformance primitives shared by Agent Teams products.

This repository will provide common technical infrastructure for Orchestrator,
Agent Runtime, Frontend, and future products. Every product retains its own
domain language, feature-owned extension points, authority, state, and host.

## Status

Architecture foundation only. No public runtime SPI or production package has
been materialized yet. A package is created only after a real product slice and
one admission basis retained by ADR-0015 from superseded ADR-0013 is proved: a
second consumer, an independent replacement or release lifecycle, independent
deployment or isolation, or a public SPI with two implementations and
conformance evidence.

## Accepted Direction

- OCI Distribution is the artifact transport and storage standard.
- ORAS performs OCI artifact operations.
- Cosign provides signature and provenance workflows.
- GHCR is the first hosted registry target.
- Harbor is the first self-hosted registry conformance target.
- Installation, activation, rollback, and audit pin immutable digests.
- Artifact registries, extension catalogs, and product authorization remain
  separate.
- PostgreSQL is the only canonical state for each writable catalog source.
- Signed catalog snapshots and search indexes are derived, reproducible outputs.
- Federation routes each extension to one explicit authority and fails closed.

Neutral module, capability, implementation, and slot identities; module
declarations; dependency bindings; deterministic graph compilation; immutable
plans and digests; and bounded composition diagnostics belong to
[`get-modular`](https://github.com/agent-teams-ai/get-modular). Extension
Foundation does not duplicate or import that composition core. Product-owned
adapters may consume both repositories while the product host retains loading,
authorization, lifecycle, readiness, routing, and recovery authority.

See the [documentation index](docs/README.md) and
[architecture decisions](docs/decisions/README.md).

## Development

```bash
pnpm install --frozen-lockfile
pnpm docs:info
pnpm docs:find -- "extension lifecycle"
pnpm docs:doctor
pnpm architecture:check
pnpm typecheck
pnpm check
```

Engineering policy and deterministic checks come from the exact published
`@agent-teams/engineering-foundation` development dependency.

Document discovery and create-only authoring use the canonical unified Docs
Protocol profile at `architecture/foundation/docs-protocol.yaml`. Start with
`pnpm docs:info`, then preview a new document with
`pnpm docs:new -- --type <type> --id <id> --title <title> --owner <owner>
--summary <summary> --dry-run`. After review, replace `--dry-run` with `--apply`.
The writer never edits indexes; add the exact reported link to the reported
index. See the [authoring Skill](.agents/skills/docs-authoring/SKILL.md).
