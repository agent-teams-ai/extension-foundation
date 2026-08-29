---
id: qualification.module-system-v1-productization.module-authoring-measurement-proof
type: qualification
status: active
owner: architecture
summary: Records the completed disposable comparison of Pure DI and a static authoring candidate without admitting L1.
---

# Synthetic Two-Fixture Module Authoring Measurement Proof

## Verdict

`NO-GO`. Product-owned Pure DI and `FeatureModuleFactory` remain the baseline.
The experiment did not establish an owning-product authoring problem and did not
justify a shared L1 declaration layer.

The executable experiment was intentionally removed before merge. Its exact
tested revision remains available in Git history:
`b1597fabab5b4f0b5e5060cfe594d6cc056b623d`.

Nothing in this record admits a consumer, production package, public SPI,
selection graph, lifecycle coordinator, process host, plugin host, or runtime
module engine.

## Locked Evidence

| Context | Exact revision | Meaning |
| --- | --- | --- |
| Extension Foundation base | `4738aa329196f9d0c50a14edfcbe454d2cca0b98` | Experiment base |
| Executable proof | `b1597fabab5b4f0b5e5060cfe594d6cc056b623d` | Exact reviewed and cross-platform-tested proof |
| Agent Runtime | `7be998237a4c262bee9c4198d554b43cd2757ac6` | Contextual source-custody label |
| Frontend | `85c0850e2fc312b995ba3116f8d4aa46dcb0b1dd` | Contextual source-custody label |
| Orchestrator | `4c5f55366ed8c83f97374b66c8e9f84059c47382` | Governed non-admission record |

Agent Runtime and Frontend names identified synthetic fixtures. The experiment
did not execute product trees or prove that the pinned product revisions
produced those fixture shapes. Exact source custody is not product approval,
semantic attribution, or shared-boundary admission.

## Tested Surface

The disposable proof executed 48 scenarios: 46 numbered cases and two
publication-recovery fault injections.

| Evidence area | Tested outcomes |
| --- | --- |
| Declaration authority | Inert fixed-name JSON; discovery and generation did not evaluate activation sentinels |
| Admission | Duplicate and unknown identities, owners, references, bindings, roots, providers, and loaders failed closed |
| Cardinality | `required`, `optional`, and ordered `many` covered zero, one, and multiple providers |
| Compatibility | Version mismatch and capability-family mismatch remained distinct |
| Disable impact | Disabled roots and providers produced deterministic impact reports without hidden fallback |
| Determinism | Plans, inventories, generated output, stale checks, and diagnostics ignored non-semantic input order |
| Discovery | Explicit bounded directories, counts, bytes, strict JSON, file identity checks, and sanitized paths |
| Loading | Literal loader tables validated all entries before invoking any selected factory |
| Isolation | A packed disposable artifact installed offline, typechecked, and executed in a temporary consumer |
| Publication recovery | Pre-publication ambiguity restored the previous generation; post-publication cleanup failure retained the replacement |
| Governance | Canonical admission remained L1 measurement-candidate and L2-L5 NO-GO |

The portable two-rename directory swap was explicitly found non-linearizable for
concurrent readers. Any production design with live readers requires
content-addressed generations and atomic active-head publication.

## Measurements

These values describe only the removed synthetic experiment.

| Category | Result |
| --- | --- |
| Baseline wiring | `23` non-empty LOC across `2` files |
| Candidate product-shaped footprint | `165` non-empty LOC across `13` files |
| Generic proof glue | `752` non-empty LOC across `4` files |
| Candidate plus generic glue | `917` non-empty LOC |
| Generic/candidate ratio | `4.557576` |
| Syntactic binding markers | baseline `2/2`; candidate `4/4` sites/files |
| Disposable executable surface | `94%` (`16/17` files) |

The ratio is non-authoritative negative evidence, not ADR-0013 production-glue
evidence. Shipping production LOC was zero, so the production-glue threshold was
not applicable. Binding counts were syntactic markers rather than a real
provider-rebind benchmark.

## Verification

At the exact executable proof revision:

- all 48 focused scenarios passed in writable local and CI environments;
- local `pnpm check` passed;
- architecture tests passed: `156` plus one expected Windows-only skip;
- qualification tests passed: `178/178`;
- exact source-custody verification passed for all three product revisions;
- GitHub CI passed on Linux, macOS, and Windows;
- Documentation Protocol, product-sources, and CodeQL passed;
- architecture/governance review passed with no P0-P3 findings;
- correctness/security/determinism review passed with no P0-P3 findings;
- measurement/DX review passed with no P0-P3 findings and independently
  reproduced every reported measurement.

The final docs-only revision is verified separately after removal of the
executable experiment.

## Reconsideration

Reconsider L1 only after one owning product approves and executes a benchmark on
a real slice with expected outcomes, repeated authoring tasks, incorrect-edit
taxonomy, navigation and diagnostic thresholds, binding-change measurement, and
a deletion rule.

Shared Foundation extraction still requires a second independently authored
real consumer and a separate accepted extraction decision. Until then, keep
direct Pure DI and product-owned factories.
