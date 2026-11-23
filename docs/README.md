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

**Current conclusions:** [Live Extension System Map](architecture/live-extension-system-map.md)
separates module composition, distributable plugins and the complete reusable
update operation. Start there for owner-confirmed direction, candidate
integrations, exact evidence routes and the remaining decisions.

**Product priority:** [live application evolution](open-decisions/OD-003-module-runtime-and-public-spi-choices.md#owner-prioritized-live-application-platform-vision-2026-11-18)
through live logic changes, persistent/shareable plugins and manageable built-in
features. Read this owner vision before choosing new module boundaries.

Read by responsibility:

| Concern | Document |
| --- | --- |
| Current module/plugin/live-update direction and implementation owners | [Live Extension System Map](architecture/live-extension-system-map.md) |
| Proposed complete operation, semantic ports, feature authoring and adverse outcomes | [Live Module Update Operation](architecture/live-module-update-operation.md) |
| Product boundary and topology | [Architecture overview](architecture/overview.md) |
| Feature ownership, standard identity and scoped checks | [Feature Module Standard Profile](architecture/feature-module-standard-profile.md) |
| Extension terminology and ownership | [Extension model](architecture/extension-model.md) |
| Proposed module-system dogfooding boundary | [Module System Dogfooding](architecture/module-system-dogfooding.md) |
| Module and plugin safety rules | [ADR-0011](decisions/0011-extension-admission-custody-and-retirement-closure.md) is the accepted cumulative safety floor for explicitly admitted product-owned production extension host profiles; static composition and Get Modular remain outside its operational scope |
| Product declaration instances and host adoption | [ADR-0014](decisions/0014-product-local-module-authoring-composition-and-generation-guardrails.md) governs colocation, product-owned capability payloads, literal loaders, desired-profile revisions, and host generations; neutral declaration grammar and validation come from Get Modular |
| Product-neutral module composition | [Get Modular repository](https://github.com/agent-teams-ai/get-modular), its [accepted bootstrap system boundary](https://github.com/agent-teams-ai/get-modular/blob/c0df3df08528480359a083daef980a90217884ff/docs/architecture/system-boundary.md), and [exact provenance map](https://github.com/agent-teams-ai/get-modular/blob/c0df3df08528480359a083daef980a90217884ff/docs/provenance/source-map.yaml); [ADR-0015](decisions/0015-authorize-get-modular-semantic-extraction.md) authorizes independent Get Modular 0.x without admitting an Extension Foundation runtime or public plugin SPI |
| Unresolved extension host, public SPI, invocation, and state-migration choices | [OD-003](open-decisions/OD-003-module-runtime-and-public-spi-choices.md) |
| Catalog state, federation, and trust | [ADR-0003](decisions/0003-postgresql-canonical-catalog-state-and-signed-snapshots.md), [ADR-0004](decisions/0004-deterministic-catalog-federation-and-namespace-authority.md), and [ADR-0005](decisions/0005-catalog-trust-and-moderation-boundaries.md) |
| Accepted decisions | [ADR index](decisions/README.md) |
| Unresolved decisions | [Open decision index](open-decisions/README.md) |
| Dependency qualification evidence | [Qualification index](qualification/README.md) |

## Plugin system research

These source-backed references are evidence and design recommendations. They do
not accept a runtime, publish a package, or replace an approved ADR.

- [Plugin System Research Reference](research/plugin-system-research-reference.md)
- [Live Module Update Design Validation 2026-11-23](research/live-module-update-design-validation-2026-11-23.md)
- [Live Extension Documentation Audit 2026-11-23](research/live-extension-documentation-audit-2026-11-23.md)
- [Live Update Ready Stack Comparison 2026-11-23](research/live-update-ready-stack-comparison-2026-11-23.md)
- [Live Update Value Competition and Implementation Size 2026-11-22](research/live-update-value-competition-and-implementation-size-2026-11-22.md)
- [Module Federation Update Boundaries and Architecture Options 2026-11-22](research/module-federation-update-boundaries-and-architecture-options-2026-11-22.md)
- [Live Update Reliability and Industry Evidence 2026-11-22](research/live-update-reliability-and-industry-evidence-2026-11-22.md)
- [Standalone Live Plugin Library Blueprint 2026-11-22](research/standalone-live-plugin-library-blueprint-2026-11-22.md)
- [Reuse First Live Plugin Updates 2026-11-22](research/reuse-first-live-plugin-updates-2026-11-22.md)
- [Live Update Policies and Portable Runtimes 2026-11-21](research/live-update-policies-and-portable-runtimes-2026-11-21.md)
- [Live Application Evolution Vision And Executed Spikes 2026-11-18](research/live-application-evolution-vision-and-executed-spikes-2026-11-18.md)
- [Live Plugin Evolution Final Research And Architecture 2026-11-17](research/live-plugin-evolution-final-research-and-architecture-2026-11-17.md)
- [Portable Live Plugin Mechanisms And Library Design 2026-11-17](research/portable-live-plugin-mechanisms-and-library-design-2026-11-17.md)
- [Live Plugin Evolution Vision And Evidence 2026-11-14](research/live-plugin-evolution-vision-and-evidence-2026-11-14.md)
- [Plugin Choice Deepening 2026-11-06](research/plugin-choice-deepening-2026-11-06.md)
- [Plugin Research Synthesis and Authority 2026-11-05](research/plugin-research-synthesis-and-authority-2026-11-05.md)

### Design questions

- [Hot Reload and Generation Replacement](research/hot-reload-and-generation-replacement.md)
- [Reusable Generation Mechanisms and Ownership](research/reusable-generation-mechanisms-and-ownership.md)
- [Temporal and Rollout Orchestration](research/temporal-and-rollout-orchestration.md)
- [Critical Components and Language Boundaries](research/critical-components-and-language-boundaries.md)
- [Customization Without Forks and Scale](research/customization-without-forks-and-scale.md)

### Industry evidence and counterexamples

- [Plugin Industry and Scale Review 2026-11-05](research/plugin-industry-and-scale-review-2026-11-05.md)
- [Agent Framework Extension Evidence 2026-11-05](research/agent-framework-extension-evidence-2026-11-05.md)
- [Specialist Plugin Framework Evidence 2026-11-05](research/specialist-plugin-framework-evidence-2026-11-05.md)
- [OpenClaw Plugin and Reload Audit](research/openclaw-plugin-and-reload-audit.md)
- [Production Reload System Evidence](research/production-reload-system-evidence.md)
- [Plugin Platform Reload Evidence](research/plugin-platform-reload-evidence.md)
- [Plugin Ecosystem Scale and Composition](research/plugin-ecosystem-scale-and-composition.md)
- [Stateful Upgrade and Recovery Evidence](research/stateful-upgrade-and-recovery-evidence.md)

### Executed evidence and independent review

- [Packed Extension Consumer E2E 2026-11-05](research/packed-extension-consumer-e2e-2026-11-05.md)
- [Static Composition and Controlled Restart Validation](research/static-composition-and-controlled-restart-validation.md)
- [Plugin Boundary and Failure Experiments](research/plugin-boundary-and-failure-experiments.md)

- [Worker Adapter Replacement Experiment](research/worker-adapter-replacement-experiment.md)
- [Plugin Research Review and Decision Record](research/plugin-research-review-and-decision-record.md)

## Ownership At A Glance

| Owner | Owns |
| --- | --- |
| Get Modular | Neutral identity grammar, declaration schemas, dependency cardinality and bindings, deterministic graph compilation, canonical plans and digests, composition diagnostics |
| Consuming product | Concrete declaration instances, capability payloads and ports, product adapters, desired-profile revisions, literal executable loaders, authorization, generations, lifecycle, routing, and recovery |
| Planned standalone live-update library | Reusable implementation of the complete planning, switching, reconciliation, cleanup and observation operation; calls narrow product authority/state primitives without creating another canonical authority |
| Extension Foundation | Extension, publisher, artifact, installation, contribution, and artifact-generation identity schemas; trust, OCI distribution, admission, isolation, revocation, retirement, and extension host-protocol primitives |

Product operational authority does not require consumer-written orchestration.
The owner-confirmed standalone library supplies the full reusable operation;
existing graph, resource and physical-custody mechanisms keep their owners.
Its remote and public production contract are not yet delivered. See the
[current map](architecture/live-extension-system-map.md#authority-and-reusable-implementation).

Document IDs are repository-scoped. Extension Foundation `OD-003` governs
extension hosts, public extension SPI, invocation, and extension-state
migration. The separate [Get Modular `OD-003`](https://github.com/agent-teams-ai/get-modular/blob/c0df3df08528480359a083daef980a90217884ff/docs/open-decisions/OD-003-v1-compatibility-diagnostics-and-resource-limits.md)
governs Get Modular V1 compatibility, diagnostics, and resource limits.

Documentation is repository-owned and checked through the unified Docs Protocol
and Engineering Foundation. Accepted ADRs are immutable; unresolved choices
remain explicit open decisions. The consumer-owned adoption authority is
`architecture/foundation/docs-protocol.yaml`; agents follow
`.agents/skills/docs-authoring/SKILL.md` and begin with `pnpm docs:info`.
