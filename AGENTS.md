# Agent Navigation

This repository owns product-neutral extension infrastructure for Agent Teams
products. Start with:

- [Repository overview](README.md)
- [Documentation index](docs/README.md)
- [Architecture overview](docs/architecture/overview.md)
- [Extension model](docs/architecture/extension-model.md)
- [Architecture decisions](docs/decisions/README.md)
- [Open decisions](docs/open-decisions/README.md)

## Hard Boundaries

- Orchestrator, Agent Runtime, Frontend, and Platform domain models never enter
  this repository.
- Product-specific extension points remain narrow and consumer-owned in the
  product that consumes them.
- There is no global service locator or universal plugin interface.
- Neutral module, capability, implementation, and slot identities; module
  declarations; dependency bindings; graph compilation; canonical plans and
  digests; and bounded composition diagnostics belong to
  [`get-modular`](https://github.com/agent-teams-ai/get-modular). This
  repository does not duplicate or import that composition core. A
  product-owned adapter may consume both repositories.
- Products own their concrete declaration instances, capability payloads,
  product adapters, desired-profile revisions, literal loaders, and runtime
  lifecycle. Product-local authoring guidance does not transfer neutral grammar
  or validation ownership away from Get Modular.
- Manifest permissions are requests, not grants.
- Artifact signatures, catalog listings, commercial entitlements, product
  authorization, and runtime enforcement are independent facts.
- Each writable catalog source has one PostgreSQL canonical store. Git, search
  indexes, signed snapshots, and OCI registries are never co-equal writers.
- Catalog federation selects one explicit authority route and fails closed. It
  never merges mutable names or falls back after an authority failure.
- Installed and active artifacts are identified by immutable OCI digest, never
  by a mutable tag alone.
- Extension code is never invoked inside a product database transaction.
- Ordinary extensions cannot replace product invariants, authorization,
  fencing, canonical state, or security enforcement.
- Do not create packages or public contracts before a real product slice and an
  independent conformance implementation prove the boundary.

## Engineering Workflow

Engineering Foundation is an exact development dependency and must never enter
production dependencies. Use:

- `pnpm check:changed` while editing;
- `pnpm check:fast` before handoff;
- `pnpm check` as the complete gate;
- `pnpm foundation:attach -- /absolute/path/to/engineering-foundation` only for
  explicit local Foundation development;
- `pnpm foundation:detach` before commit, followed by
  `pnpm foundation:assert-registry`.

<!-- agent-teams-docs:route/v1 begin -->
Use [.agents/skills/docs-authoring/SKILL.md](.agents/skills/docs-authoring/SKILL.md) for documentation.
<!-- agent-teams-docs:route/v1 end -->

Start every documentation task with that standalone route, then run
`pnpm docs:info`. The repository-owned unified Docs Protocol is authoritative for
supported types, owners, metadata, placement, and reachability. Preview is
non-mutating, creation requires explicit `--apply`, and the protocol never edits
indexes.

Accepted ADRs are immutable. A changed decision requires a superseding ADR.
Keep unresolved implementation choices in `docs/open-decisions/`.
