---
id: docs.index
type: index
status: active
owner: architecture
summary: Entry point for Extension Foundation architecture, decisions, and unresolved questions.
code_anchors:
  - enforcement: required
    pattern: architecture/foundation/docs-protocol.yaml
---

# Documentation

Read by responsibility:

| Concern | Document |
| --- | --- |
| Product boundary and topology | [Architecture overview](architecture/overview.md) |
| Extension terminology and ownership | [Extension model](architecture/extension-model.md) |
| Module and plugin safety rules | [ADR-0006](decisions/0006-extension-module-safety-boundaries.md) |
| Unresolved module runtime and SPI choices | [OD-003](open-decisions/OD-003-module-runtime-and-public-spi-choices.md) |
| Catalog state, federation, and trust | [ADR-0003](decisions/0003-postgresql-canonical-catalog-state-and-signed-snapshots.md), [ADR-0004](decisions/0004-deterministic-catalog-federation-and-namespace-authority.md), and [ADR-0005](decisions/0005-catalog-trust-and-moderation-boundaries.md) |
| Accepted decisions | [ADR index](decisions/README.md) |
| Unresolved decisions | [Open decision index](open-decisions/README.md) |
| Dependency qualification evidence | [Qualification index](qualification/README.md) |

Documentation is repository-owned and checked through the unified Docs Protocol
and Engineering Foundation. Accepted ADRs are immutable; unresolved choices
remain explicit open decisions. The consumer-owned adoption authority is
`architecture/foundation/docs-protocol.yaml`; agents follow
`.agents/skills/docs-authoring/SKILL.md` and begin with `pnpm docs:info`.
