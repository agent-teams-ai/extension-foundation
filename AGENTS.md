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
- Manifest permissions are requests, not grants.
- Artifact signatures, catalog listings, commercial entitlements, product
  authorization, and runtime enforcement are independent facts.
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

After the durable document writer from Engineering Foundation PR `#99` is
released, use `agent-teams-foundation docs new` with the repository-owned
`docs/document-authoring.yaml` profile for new ADR and open-decision files. Until
that release, the profile is checked against the exact PR head in disposable
qualification only; the mergeable repository remains pinned to the published
registry package.

Accepted ADRs are immutable. A changed decision requires a superseding ADR.
Keep unresolved implementation choices in `docs/open-decisions/`.
