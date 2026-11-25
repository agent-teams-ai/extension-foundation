# Agent Teams Extension Foundation

Product-neutral extension artifact, trust, distribution, isolation, and
conformance primitives shared by Agent Teams products.

This repository will provide common technical infrastructure for Orchestrator,
Agent Runtime, Frontend, and future products. Every product retains its own
domain language, feature-owned extension points, authority, state, and host.

Start with the [Plugin Delivery Plan](docs/architecture/plugin-delivery-plan.md)
for the plugin-specific contracts, owners and qualification still needed. The
[current system map](docs/architecture/live-extension-system-map.md) connects
modules, plugins and live replacement to their decisions and evidence.
The separate [Live Module Updates foundation plan](https://github.com/agent-teams-ai/live-module-updates/blob/main/docs/plans/foundation-delivery-plan.md)
coordinates the shared application foundation and proposed update operation;
its proposed design was published in [PR #1](https://github.com/agent-teams-ai/live-module-updates/pull/1).

## Product vision: live application evolution

**High priority: users and agents should be able to change substantive frontend
and backend logic while the application remains running.** Changes should become
reusable plugins that survive restart, can be shared, and can be enabled,
disabled or removed. Eligible built-in features should be manageable through
explicit module boundaries, with trusted product invariants preserved.

Read the [owner's expanded vision](docs/open-decisions/OD-003-module-runtime-and-public-spi-choices.md#owner-prioritized-live-application-platform-vision-2026-11-18)
before designing feature or module boundaries. It is a foundation for future
design, with supported live-update profiles and reliability established through
[source research and bounded spikes](docs/research/live-application-evolution-vision-and-executed-spikes-2026-11-18.md).
The current implementation/adoption status remains explicit below.

## Status

Architecture and executable qualification research. No public runtime SPI or
production package has been materialized yet. Representative fixtures and
independently wired test Hosts qualify the foundation before applications are
ready; a first product is not a prerequisite for that work.

Production package materialization retains the applicable ADR-0015 requirements
inherited from ADR-0013 until an owning successor accepts the exact changed
scope. The [current admission question](docs/open-decisions/OD-003-module-runtime-and-public-spi-choices.md#fixture-first-and-runtime-boundary-clarification-2026-11-24)
separates a proposed provisional 0.x package, production Host admission and
stable public SPI publication. Independent deployment/isolation, replacement or
release lifecycle, a second consumer, or a public SPI with two implementations
remain distinct package bases; their applicable evidence is not interchangeable.

The [November 25 implementation sequence](docs/architecture/plugin-delivery-plan.md#implementation-sequence-2026-11-25)
records concrete steps, dependencies, estimates and unresolved choices. Its
[evidence successor](docs/architecture/plugin-delivery-plan.md#qualification-successor-2026-11-25)
includes the real packed Node artifact-to-effect scenario and the enforced
portable-protocol source boundary. These results do not yet supply a durable
installed-plugin lifecycle, signed OCI admission or the complete LMU operation.

For a new static application, start with the existing
[Get Modular consumer quickstart](https://github.com/agent-teams-ai/get-modular/blob/main/docs/guides/consumer-quickstart.md)
and the consumer's accepted artifact pins and admission. A reusable headless
feature does not need a public plugin SPI or complete live replacement first.
The [headless plugin and UI design](https://github.com/agent-teams-ai/live-module-updates/blob/main/docs/architecture/headless-plugins-and-ui.md)
is a proposal for portable behavior and optional presentation, not a published
SDK, renderer or universal UI language.

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
For industry patterns, production hot replacement and the pinned OpenClaw
audit, start with the [plugin research reference](docs/research/plugin-system-research-reference.md).
Research supplies evidence and qualification scenarios; it does not admit a
runtime or replace an approved decision.

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
--summary <summary> --dry-run --json`. After review, replace `--dry-run` with
`--apply --expect <reviewed-result.planDigest>` and keep all intent inputs identical.
The writer never edits indexes; add the exact reported link to the reported
index. See the [authoring Skill](.agents/skills/docs-authoring/SKILL.md).
