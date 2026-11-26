---
id: architecture.feature-module-standard
type: architecture
status: accepted
owner: architecture
summary: Maps the pinned feature standard to two provisional Extension Foundation packages and their scoped deterministic checks.
related:
  - ADR-0015
  - ADR-0016
  - OD-003
code_anchors:
  - enforcement: required
    pattern: architecture/feature-module-standard-profile.json
  - enforcement: required
    pattern: architecture/checks/feature-module-standard-profile.ts
---

# Feature Module Standard Profile

## Purpose

Extension Foundation applies the organization `agent-teams.feature-module-standard`
`v1` to its cataloged production source. The
[central authority](https://github.com/agent-teams-ai/.github/blob/41ed61bfad895d7f46041532538de64202a1ec68/docs/architecture/feature-module-standard/v1.md)
remains the only definition of the shared standard. Its path is
`docs/architecture/feature-module-standard/v1.md`, Git blob
`d0bfff2033faf544fe65268c1dcdfd524d093015`, SHA-256
`851653f96643cf0466b67ab22963661976b00de44840fa3144a48a8c054f95fa`.
The pin is unchanged by this delivery.

The machine-readable profile is
`architecture/feature-module-standard-profile.json`. Its `provisional-packages`
status names the two ordinary libraries accepted in
[ADR-0016](../decisions/0016-provisional-contribution-and-verified-artifact-packages.md).
Structural conformance is `scoped` to those identities, roles and features;
runtime conformance remains `not-claimed`. Passing this profile does not admit
a production Host, a stable public SPI or another package role.

## Boundaries

| Package | Catalog role | Owned feature | Inward boundary |
| --- | --- | --- | --- |
| `@extension-foundation/core` | `foundation-component` | `contributions` | Pure owner-contract matching; no Node, product, GM or adapter dependency |
| `@extension-foundation/node-artifact` | `integration-adapter` | `verified-artifact` | Pure manifest policy beneath Node transport, staging and captured evaluation |

The production root is `packages`, with one cataloged module per `packages/*`.
There are no application roots. `architecture`, `docs`, root `tests` and
`fixtures` remain development tooling, documentation and qualification evidence.
They are outside production FMS claims and remain governed by their existing
source and documentation checks. Production features cannot move into those
roots to evade admission.

The closed catalog, effective accepted owner and authenticated package-evidence
gate retain admission authority. Profile metadata alone cannot admit a package.
Changing the package list, owned features, roles, source dependencies or claimed
execution profile requires a coherent owner, implementation and evidence change.
The scoped successor in ADR-0016 preserves the applicable ADR-0011 and ADR-0015
obligations and does not transfer composition or update ownership into EF.

## Structure

| Abstract role | Local mapping |
| --- | --- |
| Production module | Cataloged `packages/*` with role and accepted owner |
| Source and feature | `src/features/<feature>/`, with a curated `index.ts` |
| Module entry and thin assembly | `src/index.ts`, exporting feature entrypoints |
| Feature implementation | Real value-level behavior reachable through its public entry |
| Feature tests | Executable `test/features/<feature>/*.{test,spec}.ts` tests through that entry |
| Application composition | Not present in this library repository |

The neutral contribution feature uses functions and owner-supplied predicates.
It needs no domain aggregate or empty application layer. The Node adapter keeps
its manifest/contract kernel independent of native processes, filesystem and
execution. Its declared internal staging and evaluation boundaries carry only
their exact dependencies. A runtime capability admitted to the evaluation file
does not authorize arbitrary loading in another file or feature.

`src/index.ts` remains a curated package entrypoint, and the package export map
exposes only that public root. Foreign source and deep imports remain forbidden.
No module-level helper directory, universal registry, generic service bag or
additional public export is adopted. All six requirements in
`productionEvidence.obligations` remain part of the acceptance gate.

| Obligation | Required evidence for this scope |
| --- | --- |
| Valid feature per adopted role | Both real package features pass topology and the installed source analyzer; their packed public APIs execute useful consumer operations |
| Role-specific layer direction | Core and Node manifest kernel reject platform/adapter imports; only the declared outer adapter layers may use native facilities |
| Cross-feature deep import rejection | Existing Foundation source analysis rejects non-public and undeclared boundary edges |
| Undeclared edge and cycle rejection | Existing Foundation diagnostics and the concrete package-boundary regression fixtures refuse those mutations |
| Empty layer rejection | Topology requires reachable executable behavior and feature-owned tests; the concrete declared internal layers must remain present |
| Owned module exception rejection | Catalog/accepted ownership is exact; unknown packages, features, roles or layer allowances refuse |

The profile declares no deviations from FMS v1. Its local extensions select
TypeScript, closed-catalog owned features and a static library entrypoint.
Transport and Host lifecycle are not additional shared-standard requirements.

## Enforcement

`pnpm architecture:feature-module-profile` binds the reviewed authority, exact
package scope, mapping, documentation route, source roots and blocking command
paths. `pnpm architecture:feature-module-profile:test` preserves the positive
and rejecting profile fixtures and the independent dogfooding-model budgets.
`pnpm architecture:package-source:test` runs the installed analyzer against the
actual package sources and rejecting mutations; the profile binds that campaign
in the full architecture gate.
The profile and its regression tests remain in the full and fast architecture chains, and CI's `check` job
executes the blocking full gate.

`architecture:topology:check` owns package shape, ownership and genuine admission.
`architecture:source-dependencies:check` invokes the installed Foundation source
analyzer; this profile does not introduce another import parser. Strict package,
test and tooling projects cover the new maintained TypeScript. The installed
package campaigns compile ordinary external consumers against emitted
declarations and execute the public package exports. Native artifact evidence
names its actual Linux Node/OCI/direct-key profile separately.

`architecture/checks/source-safety.mjs` remains a legacy analyzer. This change
makes a localized correction to recognize direct inert descriptor inspection,
needed to reject metadata accessors without calling them, and exposes parsed
import facts for the exact artifact evaluation boundary. Its other loader,
reflection and assertion-provenance refusals remain. The analyzer has a truthful
declaration contract, but its JavaScript implementation is not claimed as
strictly typechecked; new profile tooling and fixtures are TypeScript.

These gates cannot prevent a privileged author from editing policy, checker and
CI together. Existing protected review and independent semantic review remain
necessary. Structural checks, packed behavior, artifact trust, runtime-profile
qualification and product adoption are different claims.

## Operational implications

The original 2026-09-21 adoption review found no previous central FMS pin and
matched the v1 digest above. This delivery changes its concrete package scope;
it does not silently adopt another FMS version.

The retained Get Modular Consumer Module Standard review is pinned to
`2d0181928915e3f35de9a453d5548219a64a1ae6`, whole-document SHA-256
`d5bb71e5a700014f9f0a09b17d1f33d24b30b66c49b273c9fb65584672c51e4f`.
Neither package introduces a GM composition dependency or an Assembly Host.
A consumer-owned outer adapter may compose EF with GM and Live Module Updates;
its own accepted scope and qualification remain necessary.

Shared source classification and scaffolding remain Engineering
Foundation-owned. Repository adapters select exact applicability and admission
facts. A future role or target extends its real positive and rejecting evidence
before enlarging this profile.

## Retained Foundation 1.7.2 tooling migration evidence

The earlier official managed Docs Protocol upgrade through published adapter 0.3.2
applied cohort `docs-2026-10-03-stable31`. The consumer integration and managed
state bind these exact published coordinates:

| Package | Version |
| --- | --- |
| `@agent-teams/repository-mutation` | `0.2.2` |
| `@agent-teams/document-authoring` | `0.3.2` |
| `@agent-teams/docs-protocol` | `0.6.2` |
| `@agent-teams/docs-protocol-agent-teams` | `0.3.2` |
| `@agent-teams/engineering-foundation` | `1.7.2` |

The root manifest keeps Foundation, Docs Protocol and its adapter as exact
development dependencies. Document Authoring and Repository Mutation remain
transitive tooling dependencies. The registry lock binds the same versions and
integrities. The managed caller in `.github/workflows/docs-protocol.yml` invokes
the shared `agent-teams-ai/.github` Docs Protocol workflow at
`b30455e32cf5d54ade6d8301637701347e4ce57c`.

The installed public `agent-teams-node-test` execution event contract admits both
supported tooling runtimes: Node 24.22.1 or newer within Node 24, and Node 26.12.1
or newer within Node 26. The default is `.node-version` at 26.12.1, used by the
`check` job; `node-26-check` pins the same 26.12.1. Both run the strict frozen install,
locked peer validation and full `pnpm check` with the same exact dependencies.
Node 25 and Node 27 remain outside the supported policy.

These gates use the standard `agent-teams-docs` CLI. The exact managed adapter
0.3.2 consumer check and plan still require Node 24; managed integration runtime
qualification remains a separate shared-owner concern. Repository tooling
compatibility does not qualify that managed execution path.

`pnpm evidence:custody:test` runs the existing custody suite through that public
runner. Three exact identities in
`architecture/foundation/required-node-tests.json` protect external manifest
identity, clean-root capture, and Windows verifier-only behavior. The contract
admits only the existing OS-specific skips. The profile gate binds the entire
selected entry file list and requires this execution-backed test gate in both
architecture command chains.

The existing `tests/foundation-upgrade.test.mjs` regression exercises the public
installed runner with the inherited parent `NODE_TEST_CONTEXT`. It checks actual
completion and rejects omitted, skipped, unfinished and misidentified tests,
while admitting only exact OS exceptions. The shared nested-context
CLI fix for [Foundation issue 363](https://github.com/agent-teams-ai/engineering-foundation/issues/363)
was released in 1.7.2 through [PR 365](https://github.com/agent-teams-ai/engineering-foundation/pull/365).
The former 1.7.1 standalone disposable-run and failure receipts remain historical
evidence. Existing source-gate regressions cover unavailable inputs and forbidden
source explicitly governed beneath `dist`.

Delivery requires operators to retain full-gate results, independent review and
live consumer evidence for the final revision. OS-specific and canary
qualification require their own executed evidence.

At that retained checkpoint, all source-policy boundaries were development
boundaries. The empty catalog and pre-production guard left no typed production scope for
`quality.source-coverage` or its default unknown assertion bridge check.
The retained qualification TypeScript ran through `qualification:typecheck` as
TEST evidence. That migration introduced no bridge admission, SDK growth grant or production
qualification. The current two-package scope above separately requires its
applicable production coverage and typed routes.

The retained CMS delta review compares the digest-matching historical packet
with upstream snapshot `4b56072ec6ca269fb16e3fdf131d31423af804bd` and document
commit `9c722ceff4ede307d06d7a4b63fdebe615f54c53`. The current whole-document
digest is `33b41d5babf0a431c97e8e596a56e6ec1557ba1a0b26d39bf23e13d9a19e1fbd`.
The added optional dynamic Host lifecycle candidate is outside this consumer
scope. The reviewed CMS pin above remains unchanged.

## Related decisions

[ADR-0015](../decisions/0015-authorize-get-modular-semantic-extraction.md) preserves
the independent neutral cores and package admission boundary.
[ADR-0016](../decisions/0016-provisional-contribution-and-verified-artifact-packages.md)
owns the exact provisional package successor.
[OD-003](../open-decisions/OD-003-module-runtime-and-public-spi-choices.md) keeps
the Host and public SPI choices open. This profile changes neither decision.
