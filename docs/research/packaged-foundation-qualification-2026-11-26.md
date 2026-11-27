---
id: research.packaged-foundation-qualification-2026-11-26
type: research
status: active
owner: architecture/tooling
summary: Records executed package qualification, the managed toolchain closure mismatch, source identities and remaining admission requirements.
---

# Packaged Foundation Qualification 2026-11-26

<!-- cspell:words rushstack tybys ENOTEMPTY pnpmfile -->

## Scope and owner

This is execution evidence for the [workstream A plan](../architecture/plugin-delivery-plan.md#workstream-a-execution-2026-11-26)
and [ADR-0016](../decisions/0016-provisional-contribution-and-verified-artifact-packages.md).
It separates independently executed mechanisms from the incomplete managed
consumer transition and final online package admission. All delivery belongs to
[EF PR #70](https://github.com/agent-teams-ai/extension-foundation/pull/70).
Public npm publication remains deferred.

The private package roots and their usage examples are
[core](../../packages/core/README.md) and
[node-artifact](../../packages/node-artifact/README.md). Both have actual
implementations, unit controls and clean installed-consumer campaigns. Their
public contracts expose no GM construction types or product-specific domain.

## Executed package and boundary evidence

| Evidence | Actual observation | Limit |
| --- | --- | --- |
| Core package | Official scaffold, effective strict typecheck, build and 12 unit tests passed | Provisional private library |
| Independent core consumers | Node 26.12.1, pnpm 11.18.0 and TS7.0.2; two separate clean installs compiled and executed the same archive | No runtime checkout aliases; this is not two SPI implementations |
| Core artifact | SHA-256 `69e28e28eb7e134598903cbc09edd637599f69a4681581b2e93d4af388ef6802` | Local and independently hosted tested archives have the same bytes |
| Real native route | Actual Distribution registry, digest-addressed ORAS manifest/blob retrieval and Cosign direct-key verification executed | Disposable publisher, no transparency-log/keyless or GHCR/Harbor qualification claim |
| Artifact package | Patched Node, pnpm 11.18.0 and TS7.0.2; strict typecheck, build and 11 portable manifest/profile tests passed | Public factory refuses unsupported platforms before native work |
| Independent artifact consumer | On both actual runtimes, 8 mandatory Linux campaign tests passed with zero skips, including 21 signed/transport rejection cases and native process/staging custody controls; each consumer started with an empty registry metadata cache | Linux x64 cooperative finite artifact profile; no hostile-code containment |
| Artifact archive | Both runtime campaigns produced identical SHA-256 `151890f5a69798d4098cd557f03c249678c18f4feb77cdff7563202b935882f9` | Both hosted runtime campaigns independently produced the same bytes |
| Source boundaries | Actual published Foundation4.0.2 analyzed the working tree with zero diagnostics; 11 positive/rejecting production-source tests passed | Isolated selected-tool evidence, not managed consumer adoption |
| Admission and preparation | Authenticated-provider controls, source-policy binding, source additions, malformed evidence and preparation refusal cases passed | Mock transport cases do not prove the live provider route |
| FMS | 75 tests passed, including retained dogfooding budgets and new scoped production checks | Structural scope only; runtime conformance remains not claimed |
| Existing topology | 27 tests passed with actual admission metadata in the independently qualified Foundation4 copy | Its injected unit receipt tests structure; it does not claim real online admission or managed adoption |

The hosted [package-conformance workflow](../../.github/workflows/package-conformance.yml)
runs the actual clean installed campaigns, retains their exact tested archives,
and emits each proof in a separate reviewed step. The collector uses the real
GitHub step-log API. The final admission gate binds stable repository ID,
source revision, run/attempt/job/step, workflow bytes, conformance identity,
closed source inputs and tested archive hash. Failed or unavailable evidence
refuses; neither local mock receipts nor arbitrary local evidence files can
satisfy this gate. Final provider coordinates are recorded only after that
actual workflow completes successfully.

The proposed-merge admission job executes the same repository verifier with
the workflow's real Actions-read credential. It consumes an already completed
push run whose selected source bytes match the current checkout. The producing
push run does not depend on its own admission receipt. This verifies the live
evidence port separately from accepted ownership, source boundaries and the
managed-toolchain gates; those obligations remain in the full repository gate.

## Hosted qualification, 2026-11-27

The actual [push run 45914561543, attempt 1](https://github.com/agent-teams-ai/extension-foundation/actions/runs/45914561543)
completed successfully for source
[`c0a8f2733b54323e2f85322b86167491a169af1d`](https://github.com/agent-teams-ai/extension-foundation/commit/c0a8f2733b54323e2f85322b86167491a169af1d).
Its producer job `140230571298` passed both installed core consumers, the native
artifact campaigns on Node 26.12.1 and 24.22.3, and the byte comparison of the two
artifact archives. It retained the exact qualified archives and emitted core
proof at step 16 and artifact proof at step 17.

Collector job `140230964273` used the actual Actions-read credential and the
GitHub step-log API successfully. Both returned proof records bind stable
repository ID `1333298097` and source-input digest
`sha256:bb1f93a57518c316855d640833739b7733ee85e604ff4ee9342a4c76fad38524`.
The raw core step-log digest is
`sha256:4e644080e33f16a04cfcfac4671807cbe0c60a3a4ad838554eb67078a75c0a77`;
the raw artifact step-log digest is
`sha256:4d592a86eb5928cc4bea9cdaaea6d157f8c40e7b33cd27c69acfb961d3a96c2b`.
These are provider log identities, not hashes reconstructed from local JSON.

The [evidence policy](../../architecture/package-evidence-policy.json) and
[core](../../architecture/package-admissions/extension-dot-core.json) /
[artifact](../../architecture/package-admissions/extension-dot-node-dash-artifact.json)
admission records are derived from those actual completed-run values. Their
existing strict policy validators passed, and materializing the metadata left
the source-input digest unchanged. No verification receipt is stored or invented.
The proposed-merge online gate validates the final records against the current
source subject; its current result is recorded in [PR #70 checks](https://github.com/agent-teams-ai/extension-foundation/pull/70/checks).
A successful producer/collector run alone does not satisfy the separate
accepted-owner or managed-cohort gates.

## Review corrections

Independent implementation reviews corrected the preparation/admission cycle,
source-policy narrowing, omitted package-envelope inputs, overlapping source
boundaries, implicit Node type selection and child-process custody on stdin
failure. Core and Node compilation are now separate: the core has no Node
ambient types, while the generated adapter config selects its own Node base.
The artifact decoder rejects duplicate or lexically ambiguous compact manifest
JSON before descriptor interpretation. Native evaluation imports captured bytes
through the one explicitly declared internal evaluation boundary.

The existing Oxc analyzer supplies source facts. No parallel parser, resolver,
module lifecycle or generic permission store was introduced. New maintained
runtime/check/fixture code is strict TypeScript; the legacy bridges remain
small. The substantial FMS checker and tests were migrated together.

Portable package discovery includes only the manifest and public platform-profile
controls. Native process and filesystem cases live in the owning adapter's
`qualification/` directory and run as a mandatory first command of the explicit
Linux qualification campaign, with their own narrow development source boundary.
This preserves the repository's macOS/Windows package checks without skipping
the Linux custody requirements, crossing package-private source boundaries or
opening private package exports.

Once real admission records existed, the complete structural topology fixture
reached the package test-source checks and exposed five shape violations. The
correction retained all existing assertions, used named assertion imports and
inert annotation construction, and made the public limits/error contracts
directly executable in their own tests. The original analyzer and negative
controls remain unchanged. All 27 topology tests then passed in the supported
Foundation4 copy. These test-source changes require fresh hosted proof even
though the packaged runtime bytes are unchanged.

The remaining independent qualification suite exposed an obsolete empty-catalog
assertion. It now requires exactly the two ADR-0016 package identities, roles,
paths and owners, and verifies both manifests remain private. The producer runs
the entire existing `qualification:check`, including its real browser Worker
scenario, instead of only the qualification compiler project. The local system
browser launcher points into unavailable files on a read-only mount; no browser
skip or alternate harness is accepted as a successful full campaign. The actual
hosted run supplies that complete result. The root compiler, dogfooding model
and public Foundation4 mandatory custody runner were separately exercised.

The first real hosted campaign exposed a clean-runner assumption: a frozen root
install supplies package bytes without necessarily caching registry metadata for
a second independent install. The consumer now starts with an explicitly empty
metadata cache and resolves its lockfile through the normal registry route. It
then requires exactly the three reviewed registry packages, identical root-lock
integrities and dependency edges, plus the exact local archive's SHA-512. The
actual installation remains frozen and offline with scripts and hooks disabled.
The reviewed transitive type dependency is pinned explicitly in the disposable
consumer; no override or peer-policy relaxation is used. The repeated real
Node 24.22.3 and 26.12.1 campaigns both passed this cold-cache route.

## Current compiler preset owner

The root now declares the exact development dependency
[`stack-toolchain@0.3.1`](https://registry.npmjs.org/stack-toolchain/0.3.1)
and extends its public `presets/typescript/node.json`. Published Foundation 4.0.2
assigns preset ownership to Stack and no longer exports the former facade.
The [source README](https://github.com/agent-teams-ai/engineering-foundation/blob/fac03920e50ebde038ae415edeb7aa9e3d610ada/packages/stack-toolchain/README.md)
identifies that direct consumer route.

The downloaded Stack archive matched registry SHA512. Its selected base and Node
JSON presets are byte-for-byte equal to the former Foundation presets. The Node
preset selects ES2024 and NodeNext without enabling Node ambient types. An
independent negative compilation with `@types/node` installed rejected both
`process.pid` and `document.title` in the pure core profile; the adapter retains
its own explicit Node compiler base. No old compiler was executed to compare
the JSON files.

The actual root installation with declared pnpm 11.18.0 and strict engine/peer
checks succeeded. The lockfile peer-policy check and both maintained tooling
compiler projects passed. The selected Stack closure uses TypeScript 7.0.2 and
the published ESLint 10.3.0 peer route. This ordinary preset migration does not
replace the managed Cohort transition or establish full Stack CLI qualification.

## Final security and input-closure review

Independent review reproduced an exported-namespace assimilation bug: the lexer
returns a raw Unicode-escaped identifier, so an escaped spelling of `then`
passed an exact-name check and Node resolved the import to the exported
function's replacement object. The finite artifact profile now refuses escaped
export names as well as literal `then`. Both fixed and braced Unicode spellings
have actual signed rejecting cases and an independent no-evaluation witness.
The signature-bundle size bound is also enforced before allocation, retaining
the second check after its detached copy.

The installer review reproduced execution of an implicit root pnpm hook despite
`--ignore-scripts`. The qualification subject now refuses both implicit hook
filenames. Actual installation commands use `--ignore-pnpmfile`, and the tracked
workspace sets `ignorePnpmfile: true`. Both routes were checked against real
pnpm 11.18.0 with `.mjs` and `.cjs` marker fixtures. The setting belongs in
[pnpm's workspace configuration](https://pnpm.io/settings), not `.npmrc`;
the latter was experimentally ineffective in this version.

The current default runtime is the security release
[Node 26.12.1](https://nodejs.org/en/blog/release/v26.12.1), with supported minimum
[Node 24.22.1](https://nodejs.org/en/blog/release/v24.22.1) in the Node 24 line.
The official Linux x64 Node 26.12.1 archive matched published SHA-256
`6170b2d474e1c626f43cff3adc118df9fe3b573258a4fc3d850c8dbc6b079bbd`.
The pnpm action is pinned to verified official v6.1.1 commit
`73e46992e05b19abd31f2f3c20e0e7370d762115`; its
[release](https://github.com/pnpm/action-setup/releases/tag/v6.1.1) refreshes the
bootstrap to 11.28.10. Setup selects the patched Node before installing ordinary
JavaScript pnpm, avoiding the affected embedded runtime in older standalone
[pnpm executables](https://github.com/pnpm/pnpm/security/advisories/GHSA-w8f5-6m3h-r453).
Existing research workflows retain their own pinned inputs and patched Node 24
versions while taking the same corrected action order and installer pin.

No managed package coordinate, state or transition receipt was edited. The
managed-transition reproduction below remains a historical observation on its
recorded runtimes; a future qualified transition must preserve the corrected
runtime minimum and cannot silently restore the older runtime.

## Handoff and remaining exits

A consumer-owned outer adapter supplies publisher trust and current authority,
uses `verify`, then maps immutable facts and its own typed `evaluate` binding to
LMU. `verify` has per-command deadlines but no cancellation signal. The Host
awaits settlement before releasing verification custody, then owns the lifetime
and effects of evaluated exports. Node may retain evaluated data-URL modules
until process exit; no unloading or hostile-code containment claim is made.

The live combined EF-to-LMU fixture remains owned by
[LMU PR #9](https://github.com/agent-teams-ai/live-module-updates/pull/9).
Neither this report nor a successful local pack substitutes that separate
integration receipt. The exact GM copyable-template correction also remains at
its owner under the one-EF-PR limit; EF navigation points to GM's maintained
consumer quickstart.

The managed upgrade reproduction below is a separate required dependency.
It must be resolved by a qualified producer/consumer route before the full
repository gate and ordinary merge can succeed. No baseline, exclusion, fake
cohort receipt or old embedded compiler is used to mark that transition green.

## Managed transition attempted

- Clean consumer: `/workspace/scratch/8f752a8bf341/ef-managed-probe`.
- Exact source: `d1830b3515f311c1af538b33e15ac5a0e955ade3`.
- Source Cohort: `docs-2026-10-03-stable31`, generation 2.
- Selected qualified target: `docs-2026-11-26-stable33`, generation 3.
- Retained controller: published `@agent-teams/docs-protocol-agent-teams@0.7.1`
  installed outside the consumer in `ef-managed-controller`.
- Physical controller runtime: Node 24.21.0, Linux x64.
- Physical target runtime: Node 26.11.1; selected pnpm 11.20.0.
- Both runtime archives were checked against their previously observed official
  SHA256 values before extracting the executables:
  - Node 24.21.0: `fd8e59d5a511510f6a298afb548f18c7d2b1be404d8b4a27d94fbe49f56cb2d6`.
  - Node 26.11.1: `3883bfc73f9a680ca4eab04b196068aaaab1373ffa77d8fc1a4408222495b651`.

The supported `upgrade --source-generation 2 --target-generation 3 --prepare`
route was used with explicit Node24, Node26 and Corepack paths. No managed
manifest, lockfile, profile, caller, state or receipt was hand edited.

An initial resource failure was distinguished from the later policy result.
The shared executor restarted (tool reported an executor-key change), clearing
`/tmp`; after exact runtimes were restored, memory and disk availability were
healthy and the same official preparation completed with this specific refusal:

```text
DOCS_CONSUMER_UPGRADE_TARGET_BLOCKED
  DOCS_CONSUMER_RUNTIME_CLOSURE_MISMATCH
  Observed profile4 runtime closure digest differs from the Cohort3 binding.
```

The clean source remained unchanged. No `.prepared` or restoration-proof file
was created. There was no successful finalize or activation.

## Exact closure conflict

Fresh Central `main` read at `89b5d7c512d9c4b5ae63709857a0d71cb2e6d178`
still selected these target coordinates:

| Package | Version |
| --- | --- |
| `@agent-teams/repository-mutation` | 0.5.2 |
| `@agent-teams/document-authoring` | 0.3.9 |
| `@agent-teams/docs-protocol` | 0.6.9 |
| `@agent-teams/docs-protocol-agent-teams` | 0.7.1 |
| `@agent-teams/engineering-foundation` | 4.0.2 |

The pinned runtime projection contains 88 reachable packages and digest
`sha256:aa79cc15300790ba1f76413a93b60c0a0c51d2854e7c90b0195bba0d12198bbf`.
The actual temporary lock written by the official preparation was observed
read-only before its automatic cleanup, without changing the staging operation.
It is retained as `ef-managed-observed-pnpm-lock.yaml`, SHA256
`f245224e89879fd2408a06db33cc14c366b4f054f9a528e7727d0b3756c64e42`.
It has 89 reachable packages in the selected managed closure.

Two independent differences explain why the exact digest cannot agree:

1. EF explicitly declares `@types/node@24.13.3`. Foundation 4.0.2 depends on
   `@microsoft/api-extractor-model@7.33.10`, which reaches
   `@rushstack/node-core-library@5.23.3` with an optional `@types/node` peer.
   Actual pnpm resolution adds `(@types/node@24.13.3)` to those three snapshots
   and includes `@types/node` / `undici-types`. The qualified projection has
   no Node-types package or Node-types-qualified snapshot.
2. Normal preparation preserves compatible transitive resolutions from EF's
   source lock. The qualified producer projection contains different versions:

| Dependency | Actual official staged lock | Qualified projection |
| --- | --- | --- |
| `@microsoft/tsdoc-config` | 0.18.1 | 0.18.3 |
| `@napi-rs/wasm-runtime` | 1.2.3 | 1.2.7 |
| `@tybys/wasm-util` | 0.10.3 | 0.10.5 |
| `fast-uri` | 3.1.5 | 3.1.9 |
| `graceful-fs` | 4.2.11 | 4.2.12 |
| `is-core-module` | 2.16.2 | 2.18.0 |
| `resolve` | 1.22.12 | 1.22.14 |
| `tslib` | 2.8.1 | 2.9.1 |

The target's strict closure verifier correctly refuses these differences. Its
digest was not weakened or replaced. No override, package extension, peer
suppression or fake metadata was added to obtain a passing result.

## Ordinary configuration alternative tested

A separate minimal consumer at
`/tmp/ef-peer-resolution-spike-8f752a8bf341` used the exact three direct target
packages plus `@types/node@24.13.3`, actual Node 26.11.1 and pnpm 11.20.0.
`resolvePeersFromWorkspaceRoot: false`, `strictPeerDependencies: true` and
`engineStrict: true` were selected. A lock-only install passed, but Foundation
still resolved as `4.0.2(@types/node@24.13.3)` and the same typed peer variants
were present. The setting controls cross-project root sharing; it does not
remove the root project's own explicit peer provider. Therefore no config-only
change was applied to the real consumer or probe.

The published controller's `validateConsumerTargetLockfile` explicitly accepts
only profile 1 → 3 / generation 1 → 2. Its `--target-lockfile` feature cannot
legitimately supply a generation 2 → 3 replacement lock. That guard was read
and preserved, not bypassed. Fresh npm registry reads still reported adapter
0.7.1 and Foundation 4.0.2 as latest; the current registry contained no later
qualified TS7-compatible Cohort alternative.

The stable33 qualification record explicitly states `canaryExecuted: false`
and `consumerFinalChecksCompleted: false`. Producer qualification therefore
does not establish success of this actual EF consumer transition.

## Independent official scaffold qualification completed

To continue independent implementation, the exact published Foundation 4.0.2
artifact was installed separately. Its tarball SRI matched:

```text
sha512-OVnEi7aN/dQWpt5feF2gb92Nnic9YlXWeuTEf3tdDgyTEsVTs+lwiLHo1rS+ScdGnB+vK3WbkilnZiOJkHLJBQ==
```

The observed reachable compiler packages are all TypeScript 7.0.2. The ordinary
public CLI documents explicit `--consumer` governance and scaffold commands.
An isolated disposable checkout received only the candidate ADR0016, catalog,
schema/index, scaffold intents and repository-owned preparation helper. The
separately installed toolchain supplied its dependencies; this was explicitly
an isolated mechanism test, not the consumer's managed registry installation.

The real `architecture-decisions-promote-baseline` command appended ADR0016;
all previous 15 records were preserved. The independent selected
`governance.architecture-decisions` check passed with zero diagnostics.
The repository's actual scaffold adapter then used the accepted owner resolver,
closed catalog checks, new exact preparation policy and official recipe.

| Package | Official plan digest | First successful apply receipt digest |
| --- | --- | --- |
| core | `sha256:8b579708375a7da0d56dfb9293f9b4e60b01e16ac3fdeb32ec8d6634eba670c4` | `sha256:e2d74851b1f2ef419b0d6f1c5937be4375fed7cb5497b2dd3061a9bf02ddc41f` |
| node-artifact | `sha256:7c88d6d30d725df66ac98f67750ecd1dac4e91be617c457e71762939373c8062` | `sha256:a167197d926f67fbb83484e5c24f067518aabd8f941a45d1b9b36aa7836405b2` |

Both applied receipts reported `committed` / `journaled-recoverable` and all
three materialization operations applied. The plans bind the exact ADR bytes
`sha256:2cd769456092eebd9aa61668d986e3a2c553bea3ef11ac33ae22afc684d9c7bb`.
Source inputs were compared to the working implementation before transferring
only generated manifests, tsconfigs, root source indexes, plans and the actual
generated accepted-decision ledger. No journal, managed Cohort state or
admission evidence was transferred. Full package admission remains unproved.

### Separate same-root scaffold recovery defect observed

Core first apply succeeded in
`/tmp/ef-scaffold-qualified-8f752a8bf341`. Artifact's subsequent apply in a
separate executor invocation on that same root failed with `ENOTEMPTY` when
renaming `scaffolding-transaction.json.scaffold-retired.2.1` into an already
existing completed-evidence directory. Official recover then refused the
incomplete transition. The evidence and failed disposable root were preserved.

The published `node-scaffold-journal-store.js` generates those names from
`process.pid` plus a counter reset per process. Both executor invocations used
PID 2. This explains the observed evidence-name collision; no successful
recovery or general sequential-CLI qualification is claimed. Artifact first
apply was then independently qualified in a new clean disposable root,
`/tmp/ef-scaffold-artifact-qualified-8f752a8bf341`, without copying or deleting
the failed transaction's evidence.

## Sources

- [Central exact current registry](https://github.com/agent-teams-ai/.github/blob/89b5d7c512d9c4b5ae63709857a0d71cb2e6d178/governance/docs-qualified-cohorts.json)
- [Stable33 pinned closure](https://github.com/agent-teams-ai/.github/blob/89b5d7c512d9c4b5ae63709857a0d71cb2e6d178/governance/docs-runtime-closures/sha256-aa79cc15300790ba1f76413a93b60c0a0c51d2854e7c90b0195bba0d12198bbf.json)
- [Stable33 qualification record](https://github.com/agent-teams-ai/.github/blob/89b5d7c512d9c4b5ae63709857a0d71cb2e6d178/governance/evidence/docs-cohorts/docs-2026-11-26-stable33/qualification.json)
- [Published controller metadata](https://registry.npmjs.org/@agent-teams%2fdocs-protocol-agent-teams/0.7.1)
- [Published Foundation metadata](https://registry.npmjs.org/@agent-teams%2fengineering-foundation/4.0.2)
- [pnpm peer configuration reference](https://pnpm.io/settings/peer-dependencies)

The pnpm website currently renders newer documentation; the selected setting's
actual behavior above was tested with the exact required pnpm 11.20.0 binary.

## Node adapter compiler recipe successor

The initial generated Node adapter inherited the portable root and therefore
selected no Node ambient types under TS7. The final official recipe selects
`tsconfig.node-adapter.json`; the core retains the portable root. Foundation4
performed plan/apply in a fresh disposable source with the actual owner/catalog
read set. Only its generated plan and adapter tsconfig were transferred.

- Final adapter plan: `sha256:85da3a8e92267dd2fe5c236aba002d99d510d54c292b7c0975fede359a95458a`.
- Actual apply receipt: `sha256:465465d5e829e5f2bfa2a04c5d01e7dc40176a4ea55877b5158111531bb0f7a0`.
- Main managed pins, managed state and transaction journals were unchanged.
