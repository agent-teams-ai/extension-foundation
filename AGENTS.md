# Agent Navigation

This repository owns product-neutral extension infrastructure for Agent Teams
products.

**Foundation-first:** read the [organization ecosystem vision](https://github.com/agent-teams-ai/.github/blob/47a9cd50cc6e2297c036dab3d7883a6c823b1654/docs/architecture/ecosystem-vision.md) before selecting a shared boundary. Plan the foundation for many existing and intended consumers; coordinate with Live Module Updates rather than duplicating its operation. This route does not admit a public SPI or production host.

**Qualify before applications:** use realistic fixtures, packaged behavior and
independently wired test Hosts now. A first product feature is not a prerequisite
for foundation design or bounded fixture qualification. Keep later product
adoption and the applicable package/public-SPI admission gates separate. Read
the [fixture and UI evidence](docs/architecture/plugin-delivery-plan.md#fixture-and-ui-evidence-2026-11-24)
for current observations and missing tests.

Browser, Desktop and untrusted third-party plugins are confirmed architecture
targets. Name runtime placement, authority, state, transport and resource owners
at the initial boundary; qualify each selected execution or isolation profile
before claiming support. Reuse established UI libraries behind presentation
adapters. Unstyled components, framework-neutral interaction logic, portable
business behavior and hostile-code containment are distinct properties. No
universal renderer, widget engine or generic service bag is selected.

**High-priority owner vision:** [live application evolution](docs/open-decisions/OD-003-module-runtime-and-public-spi-choices.md#owner-prioritized-live-application-platform-vision-2026-11-18).
Read it before designing any feature/module boundary: substantive live logic
changes, durable reusable/shareable plugins, and management of eligible built-in
features must influence the architecture from the start. Keep supported update
boundaries, state ownership and protected invariants explicit. The record owns
the vision and its open choices; a spike does not adopt a production runtime.

Start with:

- [Plugin delivery responsibilities and open contracts](docs/architecture/plugin-delivery-plan.md)
- [Current live extension system map](docs/architecture/live-extension-system-map.md)
- [Shared foundation delivery plan, proposed](https://github.com/agent-teams-ai/live-module-updates/blob/main/docs/plans/foundation-delivery-plan.md)
- [Complete-operation implementation phases, proposed](https://github.com/agent-teams-ai/live-module-updates/blob/main/docs/plans/first-operation-implementation-plan.md)
- [Headless plugins and optional UI, proposed](https://github.com/agent-teams-ai/live-module-updates/blob/main/docs/architecture/headless-plugins-and-ui.md)
- [November 23 update-operation design snapshot](docs/architecture/live-module-update-operation.md)
- [Repository overview](README.md)
- [Documentation index](docs/README.md)
- [Architecture overview](docs/architecture/overview.md)
- [Feature Module Standard profile](docs/architecture/feature-module-standard-profile.md)
- [Extension model](docs/architecture/extension-model.md)
- [Architecture decisions](docs/decisions/README.md)
- [Open decisions](docs/open-decisions/README.md)
- [Plugin system research reference](docs/research/plugin-system-research-reference.md)

The Live Module Updates repository now exists. Continue the shared operation
design there; retain EF's artifact/trust/installation and plugin-admission work
in its own delivery plan. Keep portable behavior independent of the consuming
product's internal domain model, UI framework, credentials, internal catalogs
and Get Modular construction types;
an outer consumer-owned adapter supplies those integrations. Optional Headless UI
remains an explicit design choice, not an adopted DSL or renderer. Preserve
historical source packets and add dated successor notes when status changes.

Before designing plugin lifecycle, hot replacement, compatibility or scale,
follow the research reference to relevant primary evidence and critic
dispositions. Retain good patterns, counterexamples and fixed historical
incidents there so future agents can reuse the reasoning. Research remains
non-normative; implementation still follows the owning accepted decisions.
Record retrieval dates, exact source/release identities, technologies, evidence
classes, limitations and counterevidence. Keep observations, proposed transfers
and owner-approved decisions distinguishable. Critic agreement, competitor use
or a passing experiment does not approve an unresolved architecture choice.
Implement the confirmed scope only; retain unsettled choices in the owning open
decision and discuss material alternatives with the owner before implementation.
Update current navigation and installation recipes without rewriting immutable
source snapshots, approved adoption pins or historical qualification evidence.

Before adding loading, execution, resource-lifetime or update mechanisms, read
the [reuse-first warnings](docs/research/reuse-first-live-plugin-updates-2026-11-22.md#reuse-warnings-to-carry-into-the-review)
and name the existing owner and the demonstrated missing capability. The owner
confirmed Extism as a candidate and prefers investigating ordinary TypeScript
plugins with an optional Wasm adapter; this does not select a runtime or license
a second composition, lifecycle or supervision implementation.

The owner's [standalone library clarification](docs/open-decisions/OD-003-module-runtime-and-public-spi-choices.md#owner-confirmed-standalone-library-and-continuous-research-2026-11-22)
sets a separate, purpose-neutral project/repository as the delivery direction.
Its cohesive features may be substantial; estimates for a small consumer adapter
are not estimates for the whole library. Follow the
[standalone blueprint](docs/research/standalone-live-plugin-library-blueprint-2026-11-22.md),
retain source-backed patterns and counterexamples, and commit and immediately
push useful research checkpoints. Keep user-facing reports concise and focused
on findings. The new direction does not transfer existing mechanism ownership.

The owner's [live plugin vision](docs/open-decisions/OD-003-module-runtime-and-public-spi-choices.md#owner-prioritized-live-plugin-vision-2026-11-14)
is a high-priority design target across plugin categories, including changes
authored by agents. Preserve it when designing new boundaries. The same record
keeps interruption of current work explicitly open; vision does not silently
select a runtime, migration or cancellation policy.

The owner's [portable library direction](docs/open-decisions/OD-003-module-runtime-and-public-spi-choices.md#owner-requested-portable-library-direction-2026-11-17)
also requires evaluating ordinary external consumers. Reuse existing composition
and lifecycle mechanisms, keep product extension contracts consumer-owned, and
separate a reusable implementation from the authority that invokes it. Research
does not publish a package or select a universal plugin interface.

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
- Production EF package materialization and public-contract publication retain
  their applicable accepted admission requirements. Fixture qualification may
  proceed before a product; it does not count as product adoption or as two
  independently authored implementations of a claimed public SPI. Record any
  needed admission successor in OD-003 before implementing that changed scope.

## Engineering Workflow

Engineering Foundation is an exact development dependency and must never enter
production dependencies. The supported tooling runtimes are Node 24.21.0 or newer
within Node 24, and Node 26.11.1 or newer within Node 26, including the installed
Foundation 1.7.2 mandatory Node test runner. Node 26.11.1 is the default.
`pnpm evidence:custody:test`
protects exact critical identities in `architecture/foundation/required-node-tests.json`;
the profile gate also binds its complete selected entry file list. Preserve that
execution route in both architecture gates and keep OS exceptions exact. Use:

- `pnpm check:changed` while editing;
- `pnpm check:fast` before handoff;
- `pnpm check` as the complete gate, including the installed
  `architecture.source-dependencies` gate on the v3 `rootPackage` / `packageRoots`
  policy;

When the Foundation gate reports a boundary violation, fix the source rather
than shrinking scope or adding a baseline:

- forbidden domain/tooling dependency -> introduce a consumer-owned port and
  adapter, do not import filesystem, environment, network SDK, or a concrete
  adapter into the constrained boundary;
- deep import -> use the public entrypoint listed for that boundary;
- new root or package -> add an owner, `packageRoots`/`rootPackage` mapping, and
  a non-overlapping boundary, never an exclusion;
- unknown `includeRootPackage` in YAML -> that field is internal TypeScript only;
  public v3 config uses `rootPackage: true`;
- CI greening by dropping a governed root, pending a root silently, or adding an
  unbounded suppression is forbidden.
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

<!-- agent-teams:quality-standard:start -->
Before planning, implementing, or reviewing changes, read and follow the
[organization Engineering Quality Standard](https://github.com/agent-teams-ai/.github/blob/main/docs/engineering-quality-standard.md).
Apply it with this repository's instructions, accepted decisions and local
adoption profiles. This reference does not change pinned architecture contracts
or certify existing code as conformant.
<!-- agent-teams:quality-standard:end -->
