---
id: docs.index
type: index
status: active
owner: architecture
summary: Entry point for Extension Foundation architecture, decisions, and unresolved questions.
---

# Documentation

Read by responsibility:

| Concern | Document |
| --- | --- |
| Product boundary and topology | [Architecture overview](architecture/overview.md) |
| Extension terminology and ownership | [Extension model](architecture/extension-model.md) |
| Accepted decisions | [ADR index](decisions/README.md) |
| Unresolved decisions | [Open decision index](open-decisions/README.md) |
| Dependency qualification evidence | [Qualification index](qualification/README.md) |

Documentation is repository-owned and checked through the unified Docs Protocol
and Engineering Foundation. Accepted ADRs are immutable; unresolved choices
remain explicit open decisions. The consumer-owned adoption authority is
`architecture/foundation/docs-protocol.yaml`; agents follow
`.agents/skills/docs-authoring/SKILL.md` and begin with `pnpm docs:info`.
