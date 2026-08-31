---
id: open-decisions.index
type: index
status: active
owner: architecture
summary: Canonical index of unresolved Extension Foundation public SPI, extension host, state, and catalog decisions.
---

# Open Decisions

- [OD-002: Catalog security and offline operational parameters](OD-002-catalog-security-and-offline-operational-parameters.md)
- [OD-003: Extension host, public SPI, and state migration choices](OD-003-module-runtime-and-public-spi-choices.md)

## Resolved Decisions

- [OD-001: Federated extension catalog topology](OD-001-federated-extension-catalog-topology.md)

Implementation must not silently resolve an open decision.
Product-local authoring and static composition guardrails are accepted in
[ADR-0014](../decisions/0014-product-local-module-authoring-composition-and-generation-guardrails.md),
not duplicated as open choices here.
Neutral module declarations, bindings, graph compilation, canonical plans, and
digests are owned by [Get Modular](https://github.com/agent-teams-ai/get-modular)
under [ADR-0015](../decisions/0015-authorize-get-modular-semantic-extraction.md),
not by OD-003.

Decision IDs are repository-scoped. This repository's `OD-003` is distinct from
[Get Modular `OD-003`](https://github.com/agent-teams-ai/get-modular/blob/c0df3df08528480359a083daef980a90217884ff/docs/open-decisions/OD-003-v1-compatibility-diagnostics-and-resource-limits.md),
which governs Get Modular V1 compatibility, diagnostics, and resource limits.
