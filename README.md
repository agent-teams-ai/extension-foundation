# Agent Teams Extension Foundation

Product-neutral extension contracts, lifecycle primitives, OCI distribution,
and conformance tooling shared by Agent Teams products.

This repository will provide common technical infrastructure for Orchestrator,
Agent Runtime, Frontend, and future products. Every product retains its own
domain language, feature-owned extension points, authority, state, and host.

## Status

Architecture foundation only. No public runtime SPI or production package has
been materialized yet. A package is created only after a real product slice and
an independent implementation prove substitutability.

## Accepted Direction

- OCI Distribution is the artifact transport and storage standard.
- ORAS performs OCI artifact operations.
- Cosign provides signature and provenance workflows.
- GHCR is the first hosted registry target.
- Harbor is the first self-hosted registry conformance target.
- Installation, activation, rollback, and audit pin immutable digests.
- Artifact registries, extension catalogs, and product authorization remain
  separate.

See the [documentation index](docs/README.md) and
[architecture decisions](docs/decisions/README.md).

## Development

```bash
pnpm install --frozen-lockfile
pnpm docs:find "extension lifecycle"
pnpm check
```

Engineering policy and deterministic checks come from the exact published
`@agent-teams/engineering-foundation` development dependency.

The repository is already qualified against the durable document writer in
Engineering Foundation PR `#99`. Registry mode remains pinned to the latest
published exact version until that pull request is merged and released. The
read-only `docs:find` command uses an explicitly temporary `0.15.x`
compatibility profile; the canonical writer profile is not weakened.
