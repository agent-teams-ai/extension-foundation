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
| Module and plugin safety rules | Accepted [ADR-0010](decisions/0010-extension-safety-floor-and-retirement-closure.md); proposed [ADR-0011](decisions/0011-extension-admission-custody-and-retirement-closure.md) records a non-operative closure candidate for known production-host gaps |
| Product declaration instances and host adoption | [ADR-0014](decisions/0014-product-local-module-authoring-composition-and-generation-guardrails.md) governs colocation, product-owned capability payloads, literal loaders, desired-profile revisions, and host generations; neutral declaration grammar and validation come from Get Modular |
| Product-neutral module composition | [Get Modular repository](https://github.com/agent-teams-ai/get-modular), its [accepted bootstrap system boundary](https://github.com/agent-teams-ai/get-modular/blob/c0df3df08528480359a083daef980a90217884ff/docs/architecture/system-boundary.md), and [exact provenance map](https://github.com/agent-teams-ai/get-modular/blob/c0df3df08528480359a083daef980a90217884ff/docs/provenance/source-map.yaml); [ADR-0015](decisions/0015-authorize-get-modular-semantic-extraction.md) authorizes independent Get Modular 0.x without admitting an Extension Foundation runtime or public plugin SPI |
| Unresolved extension host, public SPI, invocation, and state-migration choices | [OD-003](open-decisions/OD-003-module-runtime-and-public-spi-choices.md) |
| Catalog state, federation, and trust | [ADR-0003](decisions/0003-postgresql-canonical-catalog-state-and-signed-snapshots.md), [ADR-0004](decisions/0004-deterministic-catalog-federation-and-namespace-authority.md), and [ADR-0005](decisions/0005-catalog-trust-and-moderation-boundaries.md) |
| Accepted decisions | [ADR index](decisions/README.md) |
| Unresolved decisions | [Open decision index](open-decisions/README.md) |
| Dependency qualification evidence | [Qualification index](qualification/README.md) |

## Ownership At A Glance

| Owner | Owns |
| --- | --- |
| Get Modular | Neutral identity grammar, declaration schemas, dependency cardinality and bindings, deterministic graph compilation, canonical plans and digests, composition diagnostics |
| Consuming product | Concrete declaration instances, capability payloads and ports, product adapters, desired-profile revisions, literal executable loaders, authorization, generations, lifecycle, routing, and recovery |
| Extension Foundation | Extension, publisher, artifact, installation, contribution, and artifact-generation identity schemas; trust, OCI distribution, admission, isolation, revocation, retirement, and extension host-protocol primitives |

Document IDs are repository-scoped. Extension Foundation `OD-003` governs
extension hosts, public extension SPI, invocation, and extension-state
migration. The separate [Get Modular `OD-003`](https://github.com/agent-teams-ai/get-modular/blob/c0df3df08528480359a083daef980a90217884ff/docs/open-decisions/OD-003-v1-compatibility-diagnostics-and-resource-limits.md)
governs Get Modular V1 compatibility, diagnostics, and resource limits.

Documentation is repository-owned and checked through the unified Docs Protocol
and Engineering Foundation. Accepted ADRs are immutable; unresolved choices
remain explicit open decisions. The consumer-owned adoption authority is
`architecture/foundation/docs-protocol.yaml`; agents follow
`.agents/skills/docs-authoring/SKILL.md` and begin with `pnpm docs:info`.
