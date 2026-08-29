---
id: qualification.module-system-v1-productization.module-authoring-measurement-proof
type: qualification
status: active
owner: architecture
summary: Records a disposable synthetic comparison of Pure DI and a static authoring candidate without admitting L1.
---

# Synthetic Two-Fixture Module Authoring Measurement Proof

## Verdict

`NO-GO`. Canonical consumer admission keeps both named product sources at
`L1_NO_GO_MEASUREMENT_CANDIDATE` and shared extraction at `L5_NO_GO`. The
disposable candidate validates useful closed-world failure cases, but no
owning-product-approved benchmark establishes an authoring problem.

The synthetic generic-proof ratio is `3.993939`, but it is non-authoritative
negative evidence rather than ADR-0013 production-glue evidence. Product-owned Pure DI and
`FeatureModuleFactory` remain the baseline. Nothing in this proof admits a
consumer, shared extraction, production package, public SPI, graph, or runtime
module engine.

## Locked Context And Scope

| Context | Exact revision | Meaning |
| --- | --- | --- |
| Extension Foundation base | `4738aa329196f9d0c50a14edfcbe454d2cca0b98` | Proof base |
| Agent Runtime | `7be998237a4c262bee9c4198d554b43cd2757ac6` | Contextual source-lock label |
| Frontend | `85c0850e2fc312b995ba3116f8d4aa46dcb0b1dd` | Contextual source-lock label |
| Orchestrator | `4c5f55366ed8c83f97374b66c8e9f84059c47382` | Governed non-admission record |

The proof revision is the exact Draft PR head recorded by GitHub CI and the PR
body. It is intentionally not embedded in its own Git commit as a circular
self-reference.

Agent Runtime and Frontend names identify synthetic measurement fixtures. The
executable proof does not consume product trees or prove that those revisions
produced the fixture shapes. Exact Git custody remains the responsibility of the
separate source-evidence records. Orchestrator admission is read directly from
`consumer-admission.md`; it is not duplicated as a measurement constant.

All executable proof code lives under `tests/qualification/`. Candidate declarations
are fixed-name inert JSON, loaded from explicit bounded fixture directories.
The synthetic validator produces deterministic diagnostics and a disposable
plan projection, but runtime behavior never interprets that plan. Both candidate
fixtures continue to execute through direct, product-shaped Pure DI.

This is build-time qualification in a trusted, non-concurrently-mutated checkout,
not a hostile-filesystem security boundary. Discovery charges every observed
entry, rejects duplicate JSON members, uses no-follow flags where the platform
exposes them, and verifies file identity before and after bounded reads. A future
installer still requires its own process/descriptor containment evidence,
especially on Windows; this implementation must not be promoted as that loader.

The proof contains no production package, product API change, plugin host,
lifecycle, recovery, service locator, global registry, decorator, executable
metadata, runtime file scan, or dynamic string import. Product-specific plugin
contribution data stays outside the generic declaration grammar.

## Executable Evidence

The root test contains 46 named scenarios with independent expected outcomes.

| Evidence area | Covered outcomes |
| --- | --- |
| Declaration authority | Fixed-name JSON is inert; discovery/generation causes zero activation-sentinel evaluation |
| Admission | Unknown fields, duplicate IDs/providers/roots/bindings/loaders, owner mismatch, unknown references, and collisions fail closed |
| Cardinality | `required`, `optional`, and ordered `many` cover zero/one/many; optional arrays and duplicate many providers fail |
| Compatibility | Capability IDs require `/vN`; version mismatch differs from capability-family mismatch |
| Disable impact | Disabled roots/providers fail; required-dependency impact is complete and deterministic |
| Determinism | Plans, inventories, generated output, stale checks, and diagnostics ignore non-semantic input order |
| Discovery/loading | Root/entry/byte limits and explicit directory lists apply; duplicate JSON keys and unsafe files fail closed; invalid/unselected literal loaders receive zero evaluation |
| Isolation | Packed qualification artifact installs offline, passes pinned TypeScript checking, and executes in a private temporary consumer |
| Governance | Current Orchestrator `L1-L5_NO_GO` state is checked against the canonical admission document |

Diagnostics use binary code-unit ordering and relative sanitized paths. They
contain no absolute paths, stacks, timestamps, locale dependence, or discovery
order as semantics.

## Deterministic Measurements

These are synthetic qualification measurements, not production metrics.

| Category | Result |
| --- | --- |
| Baseline wiring | `23` non-empty LOC across `2` files |
| Candidate product-shaped footprint | `165` non-empty LOC across `13` TypeScript/JavaScript/JSON files |
| Generic proof glue | `659` non-empty LOC across `4` files |
| Candidate plus generic glue | `824` non-empty LOC |
| Generic/candidate ratio | `3.993939` |
| ADR production-glue ratio | `not-applicable-production-loc-zero` |
| Syntactic binding markers | baseline `2/2`; candidate `4/4` sites/files |
| Disposable executable proof | `100%` |

The measurement consumes one exhaustive classified manifest and fails if any
file under `tests/qualification/module-authoring-proof/` is unclassified.
Generated temporary output and this report are not LOC inputs.

| Bucket | Classified paths |
| --- | --- |
| Baseline | `agent-runtime-baseline.ts`, `frontend-baseline.ts` |
| Candidate product | `agent-runtime-candidate.ts`, `agent-runtime-loaders.ts`, `frontend-candidate.ts`, `frontend-loaders.ts`, both activation sentinels, seven declaration/profile JSON files |
| Generic proof | `model.ts`, `io.ts`, `literal-loaders.ts`, `fixture-data.ts` |
| Shared fixture, excluded | `agent-runtime-fixture.ts`, `frontend-fixture.ts` |
| Measurement harness, excluded | `measurement.ts`, `module-authoring-proof.test.ts` |
| Support type, excluded | `architecture/checks/strict-json.d.mts` for the pre-existing strict JSON parser |

Binding probes are only deterministic syntactic marker counts. No provider-rebind
task, navigation-time measurement, semantic diff, or product outcome is claimed.
Each marker must match exactly one checked-in source token or measurement fails.

Packed-install, typecheck, execution, determinism, and scenario outcomes are test
evidence, not hard-coded measurement fields. The isolated smoke verifies a
repository-compatible pnpm `11.x` executable and repository-resolved TypeScript
`7.0.2`; it proves only the disposable
qualification artifact. It does not satisfy `PACKAGE-1` or publication evidence.

## Stop Rule And Reconsideration

The L1 candidate remains `NO-GO` because canonical admission records no approved
owning-product benchmark or executable product-owned authoring evidence. Because
shipping production LOC is zero, ADR-0013's production-glue stop rule is not
applicable. The synthetic ratio and marker counts are recorded only as
non-authoritative negative signals and never substitute for a production
denominator or a real rebind task.

Reconsider L1 after one owning product approves and runs a benchmark against
a real slice, including expected outcomes, repeated tasks, incorrect-edit
taxonomy, navigation/diagnostic thresholds, binding-change measurement, and a
deletion rule. Shared Foundation semantics still require a second independently
authored real consumer and a separate accepted extraction decision.

Until then, keep direct Pure DI. The executable proof has disposition
`delete-before-merge`: preserve the negative report and Git history, but do not
merge or maintain the synthetic validator, fixtures, packed harness, or grammar
as a Foundation capability. Do not move or rename the grammar into a production
package.
