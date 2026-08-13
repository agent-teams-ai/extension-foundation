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

Use the repository-owned `docs/document-authoring.yaml` profile through these
scripts:

- `pnpm docs:find [text]` discovers documents;
- `pnpm docs:new -- --type <type> --id <id> --title <title> --owner <owner>
  --summary <summary> --dry-run` previews an ADR or open decision;
- rerun `pnpm docs:new` without `--dry-run` to create the reviewed file;
- `pnpm docs:doctor` inspects document-writer transaction health;
- `pnpm docs:recover` performs the recovery prescribed by the doctor.

The writer is create-only: it does not create directories or edit indexes. After
creation, add the exact link reported by the command to the artifact type's
fixed index, then run `pnpm check:fast`.

Accepted ADRs are immutable. A changed decision requires a superseding ADR.
Keep unresolved implementation choices in `docs/open-decisions/`.
