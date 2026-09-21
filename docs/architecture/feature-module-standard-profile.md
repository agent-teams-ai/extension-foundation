---
id: architecture.feature-module-standard
type: architecture
status: accepted
owner: architecture
summary: Maps the pinned organization feature standard to pre-production Extension Foundation and its deterministic checks.
related:
  - ADR-0015
  - OD-003
code_anchors:
  - enforcement: required
    pattern: architecture/feature-module-standard-profile.json
  - enforcement: required
    pattern: architecture/checks/feature-module-standard-profile.mjs
---

# Feature Module Standard Profile

## Purpose

Extension Foundation adopts the organization `agent-teams.feature-module-standard`
`v1` as the prospective rule for its first and subsequent production packages.
The [central authority](https://github.com/agent-teams-ai/.github/blob/41ed61bfad895d7f46041532538de64202a1ec68/docs/architecture/feature-module-standard/v1.md)
remains the only definition of the shared standard. Its path is
`docs/architecture/feature-module-standard/v1.md`, Git blob
`d0bfff2033faf544fe65268c1dcdfd524d093015`, SHA-256
`851653f96643cf0466b67ab22963661976b00de44840fa3144a48a8c054f95fa`.

The machine-readable local profile is
`architecture/feature-module-standard-profile.json`. The current status is
`pre-production`; structural and runtime conformance are both `not-claimed`.
Accepted guidance does not certify nonexistent production packages.

## Boundaries

The prospective production root is `packages`, with one cataloged module per
`packages/*`. There are no application roots. `architecture`, `docs`, root
`tests` and `fixtures` contain development tooling, documentation and experiments;
they are excluded from production FMS claims, not from existing Foundation
source-dependency or documentation checks. Exclusions cannot host new production
features as a way to bypass package admission.

The closed package catalog currently contains no production package. Its existing
topology and executable admission rules remain authoritative. A package cannot
be admitted merely by changing this profile's status. Its first delivery must
also replace the pre-production profile guard with evidence for the exact
materialized scope, while preserving the package-specific admission requirements.

## Structure

| Abstract role | Local mapping |
| --- | --- |
| Production module | Cataloged `packages/*` with role and accepted owner |
| Source and feature | `src/features/<feature>/`, with a curated `index.ts` |
| Module entry and thin assembly | `src/index.ts`, using feature entrypoints |
| Feature implementation | Real value-level implementation reachable from its public entry |
| Feature tests | Executable `test/features/<feature>/*.{test,spec}.ts` tests through the feature entry |
| Application composition | Not present in this library repository |

These mappings preserve the stricter current package envelope. They do not
authorize new module-level helpers, a composition directory or additional public
exports. Any such change requires a reviewed topology and profile change.
There are no declared deviations from FMS v1. Domain modeling applies only to
real invariants; codecs and technical verification features need no ceremonial
domain aggregates or empty layers.

The profile's `localExtensions` identifies TypeScript as the package language,
closed catalog and owned-feature packaging, and static composition through the
library module entrypoint. No transport or application composition is adopted.
These are local applicability rules, not additional shared FMS requirements;
changing them requires the same profile, topology and evidence review.

| FMS concern | Current evidence and remaining scope |
| --- | --- |
| Owned modules and features | Package catalog, accepted owner checks and topology rejecting fixtures already exist |
| No unowned package behavior | Topology rejects paths outside the cataloged feature envelope; this is not a repository-wide semantic discovery claim |
| Curated public surfaces | Topology checks package-to-feature export reachability and a real implementation |
| Feature-owned tests | Topology requires executable assertions through the feature entrypoint |
| Dependency boundaries | Existing Foundation source policy and source-boundary fixtures remain the single import-analysis path |
| First module of each role | Pending real production package and role-specific positive evidence |
| Internal layers, deep imports, undeclared edges and cycles | Pending exact production mapping and positive/rejecting evidence; development-boundary checks alone do not prove these |
| Empty layers and ownership exceptions | Pending production fixtures and explicit owner review; no exception is currently admitted |
| Compliant creation | Existing reviewable scaffold Plan/Apply and topology checks |

## Enforcement and first-package acceptance

`pnpm architecture:feature-module-profile` checks the reviewed identity, mapping,
state, catalog, documentation route, development classification and blocking
command paths. `pnpm architecture:feature-module-profile:test` runs positive and
rejecting fixtures. Both execute in `architecture:check` and
`architecture:check:fast`, reached by the full and fast repository gates.
CI's `check` job must run the blocking full gate. Existing
`architecture:topology:check` and `architecture:source-dependencies:check` keep
their responsibilities; this adapter does not parse production imports.

Before admitting the first real package, complete the six evidence items in
`pendingProductionEvidence` for its actual role. Extend the existing classifier
and source checks only where that concrete mapping exposes a gap. Preserve
negative cases for code outside features, deep imports, cycles, empty layers
and unknown ownership. A profile change without these checks cannot promote
structural or runtime conformance. No empty package or invented feature is
created to make an adoption dashboard green.

The profile's fail-closed checks do not prevent a privileged author from editing
the checker and CI together; existing protected-policy review and semantic
review remain necessary. No new production qualification is implied.

## Operational implications

The 2026-09-21 adoption review found no previous central FMS pin. The canonical
bytes matched the v1 digest above; this is initial explicit adoption, not an
automatic migration from the Orchestrator's local profile. Existing stronger
package rules and immutable accepted ADRs are preserved.

The Get Modular Consumer Module Standard was reviewed at
`2d0181928915e3f35de9a453d5548219a64a1ae6`, whole-document SHA-256
`d5bb71e5a700014f9f0a09b17d1f33d24b30b66c49b273c9fb65584672c51e4f`.
This checkpoint adds no production composition boundary and adopts no Assembly
Host scope. Fixed development helpers remain static dependencies. A future
meaningful production composition boundary needs its own applicable CMS review;
FMS adoption does not silently install Get Modular or create a runtime dependency.

Shared-first review: the reusable source classifier and scaffold engine remain
Engineering Foundation-owned. This small repository adapter binds local policy
and invokes existing checks, as other consumers' profiles do. It introduces no
second AST analyzer, runtime framework or cross-repository policy owner.
Production source-coverage activation remains separate and pending its real scope.

## Related decisions

[ADR-0015](../decisions/0015-authorize-get-modular-semantic-extraction.md) preserves
the independent neutral cores and package admission boundary.
[OD-003](../open-decisions/OD-003-module-runtime-and-public-spi-choices.md) keeps
the Host and public SPI choices open. This profile changes neither decision.
