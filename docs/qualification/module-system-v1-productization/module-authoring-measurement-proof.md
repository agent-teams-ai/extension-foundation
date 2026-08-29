---
id: qualification.module-system-v1-productization.module-authoring-measurement-proof
type: qualification
status: active
owner: architecture
summary: Records a disposable synthetic comparison of Pure DI and a static authoring candidate without admitting L1.
---

# Hybrid Two-Consumer Module Authoring Measurement Proof

## Verdict

`NO-GO`. The disposable candidate validates useful closed-world failure cases,
but it does not justify an L1 authoring layer now:

- generic proof glue is `4.94958` times the candidate product-shaped footprint;
- a modeled provider rebind touches four candidate files versus two baseline files;
- no owning-product-approved benchmark exists; and
- no second real consumer is admitted.

The result applies ADR-0013's stop rule. Product-owned Pure DI and
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

Agent Runtime and Frontend names identify synthetic measurement fixtures. The
executable proof does not consume product trees or prove that those revisions
produced the fixture shapes. Exact Git custody remains the responsibility of the
separate source-evidence records. Orchestrator admission is read directly from
`consumer-admission.md`; it is not duplicated as a measurement constant.

All executable code lives under `tests/qualification/`. Candidate declarations
are fixed-name inert JSON, loaded from explicit bounded fixture directories.
The synthetic validator produces deterministic diagnostics and a disposable
plan projection, but runtime behavior never interprets that plan. Both candidate
fixtures continue to execute through direct, product-shaped Pure DI.

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
| Discovery/loading | Root/candidate/byte limits and explicit directory lists apply; invalid/unselected literal loaders receive zero evaluation |
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
| Candidate product-shaped footprint | `119` non-empty LOC across `9` TypeScript/JSON files |
| Generic proof glue | `589` non-empty LOC across `4` files |
| Candidate plus generic glue | `708` non-empty LOC |
| Generic/candidate ratio | `4.94958` |
| ADR production-glue ratio | `not-applicable-production-loc-zero` |
| Modeled provider-rebind sites/files | baseline `2/2`; candidate `4/4` |
| Disposable executable proof | `100%` |

The inventory includes every baseline composition file, every candidate
composition/declaration/profile file, and all generic validator/discovery/loader
helpers. Shared feature-core fixtures, tests, generated temporary output,
measurement code, and this report are excluded from both sides. Binding probes
must each match exactly one checked-in source token or the measurement fails.

Packed-install, typecheck, execution, determinism, and scenario outcomes are test
evidence, not hard-coded measurement fields. The isolated smoke uses repository-
pinned pnpm `11.18.0` and TypeScript `7.0.2`; it proves only the disposable
qualification artifact. It does not satisfy `PACKAGE-1` or publication evidence.

## Stop Rule And Reconsideration

The candidate already triggers deletion/no-go conditions: it does not reduce
binding-change files and its synthetic generic-glue ratio is far above 30%.
Because shipping production LOC is zero, the ADR production ratio itself remains
not applicable; the synthetic ratio is additional negative evidence, not a
substitute denominator.

Reconsider L1 only after one owning product approves and runs a benchmark against
a real slice, including expected outcomes, repeated tasks, incorrect-edit
taxonomy, navigation/diagnostic thresholds, binding-change measurement, and a
deletion rule. Shared Foundation semantics still require a second independently
authored real consumer and a separate accepted extraction decision.

Until then, keep direct Pure DI, delete rather than promote the disposable
candidate, and do not move or rename its grammar into a production package.
