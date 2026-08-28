---
id: qualification.module-system-v1-productization.authoring-api-and-gap-matrix
type: qualification
status: active
owner: architecture
summary: Compares private authoring candidates and records proved, missing, contradicted, and inapplicable evidence.
---

# Authoring API And Gap Matrix

## Current API Decision

The current product-private contract is the baseline, not a new framework:

```ts
export interface FeatureDependencies {
  readonly source: FeatureSourcePort;
  readonly clock: FeatureClock;
}

export function createFeature(
  dependencies: FeatureDependencies,
): FeatureApi {
  // Product-owned composition only.
}
```

The product root imports the selected built-ins literally and passes a closed
dependency object. No runtime resolver or ambient container enters the feature.

## Candidate Comparison

| Candidate | Current verdict | Future role | Main risk |
| --- | --- | --- | --- |
| A. JSON Schema declaration + handwritten TypeScript factory | No-go now | Strong future option for inert, language-neutral metadata | Schema cannot prove bindings, cycles, lifecycle, or runtime wiring |
| B. TypeScript builder + generated inert JSON | No-go now | Useful only as a tightly restricted parsed DSL | Executing authoring code breaks zero-evaluation discovery; dual authority |
| C. Inert JSON authority + generated nominal TypeScript handles | No-go now | Candidate only when real discovery/profile drift exists | Generated-code drift, type-map duplication, profile-to-runtime mismatch |
| D. Handwritten typed port/factory + static Pure DI | Selected now | `L0` baseline and default until a measured trigger | Can become inconsistent if roots multiply without product-owned checks |

No declarative candidate is preselected. A future product must compare the
smallest candidates against handwritten factories using a named outcome,
measured production/glue LOC, failure behavior, and deletion criteria. Candidate
C is inert and serializable, but still requires a product-owned parser,
semantic compiler, diagnostics, generated drift checks, and root-conformance
proof. Those costs have no admitted product value in the inspected slices.

Reviewers disagreed only about the future order of A and B. TypeScript ergonomics
favor B, while strict zero-evaluation discovery favors A. The disagreement does
not affect the current verdict: an unrestricted TypeScript builder is rejected;
an AST-restricted builder becomes another private declarative grammar and must be
qualified as such.

## Gap Matrix

| Requirement | Status | Evidence or consequence |
| --- | --- | --- |
| Product-owned direct Pure DI | `source-custody-recorded` | The canonical lock records exact Git custody only; product topology and behavior require owning-product verification |
| At least one real static multi-contribution seam | `evidence-candidate` | Pinned product sources are candidate reference material only; no portable executable evidence proves a qualifying seam |
| Repeated authoring workflow | `measurement-candidate` | No portable product-owned benchmark proves repeated authoring cost or drift |
| Completed `L1` authoring rehearsal | `missing` | No owning-product decision, approved benchmark, grammar, executable outcome, or exit evidence exists |
| Orchestrator product rehearsal | `missing` | No portable owning-product evidence admits a rehearsal |
| Product-owned authoring decision | `missing` | No portable owning-product decision accepts a module declaration/profile grammar |
| Product-local authoring ownership | `accepted` | ADR-0013 assigns private semantics to the first product; ADR-0014 is the accepted product-local authoring authority under it, with no qualification-invented successor gate |
| Runtime-selection trigger beyond static configuration | `missing` | No portable owning-product evidence admits runtime selection |
| Independent module lifecycle trigger | `missing` | No portable owning-product evidence admits dependency-aware lifecycle coordination |
| Required/optional/many production semantics | `missing` | Synthetic tests cover mechanism behavior only; no consumer-owned production semantics or product grammar is admitted |
| Deterministic graph compilation | `partially proved` | Disposable synthetic tests only; not a production grammar |
| Generation replacement and recovery | `partially proved` | Disposable evidence only; commit `7632385` closes reviewed identity/correlation defects but no product runtime is admitted |
| Cordis lifecycle equivalence | `not applicable` | No portable product evidence admits the runtime or independently managed lifecycle trigger required for a comparison |
| Literal loader zero evaluation | `not applicable` | No admitted deferred executable loading target |
| Shared cross-consumer semantics | `missing` | No portable evidence proves two independent implementations of one semantic contract |
| Public SPI prerequisites | `missing` | No independent implementations of a publication candidate |
| Package admission independence | `contradicted` | Current checker can count two IDs from one repository; its correction is an external task, and shared extraction remains closed |
| Product-source reproducibility | `candidate` | Exact origin/commit/tree/declared-blob checks pass all three local mirrors. Source interpretation, semantic dataflow, runtime use, provider execution, independent ownership, and remote attestation remain absent |
| Evidence custody integrity | `partially proved` | Trusted manifest digest, bounded capture, latest-attempt aliasing, platform-qualified source checks, and focused tests pass; final exact-head review is pending |

## Why No New Spike Was Added

The gate permits a new spike only for a missing or contradicted requirement that
an admitted product must resolve now. No portable owning-product evidence admits
a descriptor compiler or runtime graph. The accepted ADR baseline already keeps
static Pure DI product-local; exact source custody cannot prove a stronger need.

A static compiler spike would be premature until an owning product measures an
authoring problem and accepts a grammar. A selection-graph spike requires a
separate runtime-selection trigger. A native/Cordis lifecycle spike requires
independently managed resources. Repeating existing synthetic evidence would
add volume without changing a decision.

## Future Declarative Candidate Constraints

If a product later admits an inert declaration plus generated handles:

- identity is declared beside the owning feature, never in a central enum;
- discovery reads bounded fixed-name JSON without importing executable code;
- each binding coordinate is explicit, including optional absence;
- `many` preserves profile order and never uses discovery order;
- selected-provider failure is not optional absence;
- generated handles are projections, not a runtime registry;
- clean regeneration is byte-identical and CI fails on stale output;
- product ports and factories remain handwritten and framework-neutral;
- a conformance test proves profile-to-root wiring; and
- authoring/runtime types remain private until separate publication evidence.
