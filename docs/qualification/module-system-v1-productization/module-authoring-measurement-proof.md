---
id: qualification.module-system-v1-productization.module-authoring-measurement-proof
type: qualification
status: active
owner: architecture
summary: Records a disposable source-shaped comparison of Pure DI and hybrid static authoring for two measurement fixtures.
---

# Hybrid Two-Consumer Module Authoring Measurement Proof

## Verdict

`CONDITIONAL`. This qualification-only proof shows that a small hybrid static
authoring candidate can preserve the expected behavior of two source-shaped
measurement fixtures. It does not supply the missing product-owner-approved
benchmark or product adoption evidence. It therefore admits no consumer,
shared extraction, production package, public SPI, or runtime module engine.

Agent Runtime and Frontend are measurement fixtures only. Orchestrator is
`second-consumer-not-admitted`: its pinned host-discovery slice has one fixed
source and no repeated authoring seam. The proof does not claim two admitted
consumers or a shared semantic intersection.

## Locked Inputs And Scope

| Input | Exact revision | Use |
| --- | --- | --- |
| Extension Foundation base | `4738aa329196f9d0c50a14edfcbe454d2cca0b98` | Proof base |
| Agent Runtime | `7be998237a4c262bee9c4198d554b43cd2757ac6` | Read-only source shaping |
| Frontend | `85c0850e2fc312b995ba3116f8d4aa46dcb0b1dd` | Read-only source shaping |
| Orchestrator | `4c5f55366ed8c83f97374b66c8e9f84059c47382` | Non-admission finding |

The private `source-shaped-shadow` lives only under `tests/qualification/`.
It compares literal imports, closed dependency objects, and explicit roots
against module-colocated fixed-name inert JSON, bounded build-time discovery,
validation, generated nominal handles and inventory, an explicit static
profile, separate typed activation factories, and target-local literal loader
tables. Compilation produces static factory arguments, not a runtime graph.
Generated outputs are written only to temporary directories.

The proof imports no graph, lifecycle, recovery, container, or framework spike
helper. It contains no production package, plugin installation, lifecycle,
recovery, service locator, global registry, decorator, executable metadata,
runtime file scan, or dynamic string import.

## Executable Scenarios

The root test contains 42 named scenarios with direct expected outcomes rather
than using agreement between candidates as its only oracle. The scenarios retain
the original Pure DI and hybrid behavior comparisons and add the following
closed-world evidence:

| Evidence area | Covered outcomes |
| --- | --- |
| Declaration authority | Checked-in fixed-name JSON is authoritative; TypeScript contains no duplicate payload; discovery and generation cause zero activation-sentinel evaluation |
| Admission shape | Unknown declaration/profile fields, duplicate provides, duplicate roots/modules/bindings/loaders, owner mismatch, unknown roots/modules/bindings/loaders, and conflicting IDs fail closed |
| Explicit composition | Required, optional, and ordered-many cardinalities cover zero, one, and many; missing required never auto-binds one or ambiguous installed providers; duplicate many providers fail |
| Compatibility | Capability IDs require `/vN`; same-family version incompatibility differs from unrelated mismatch |
| Static validation | Disabled root/required/optional cases and complete required-disable impact are covered; explicit-binding cycles fail with stable diagnostics |
| Determinism | Plans, inventories, regeneration, stale checks, and diagnostics ignore non-semantic declaration/profile permutations while ordered-many profile order remains intact |
| Discovery and loading | Root, candidate, and declaration-byte bounds apply; paths stay relative and safe; literal loader selection is an exact closed set with zero invalid/unselected evaluation |
| Private consumer smoke | Pinned pnpm creates a tarball; a private consumer installs it offline, pinned TypeScript 7 checks its nominal handle, and Node executes its runtime export |
| Governance | Measurement remains deterministic and `CONDITIONAL`; Orchestrator remains `second-consumer-not-admitted` |

Diagnostics use explicit binary code-unit ordering over code, consumer, relative
declaration path, field path, available module ID, and related paths. They
contain no absolute paths, stack traces, timestamps, locale dependence, or
discovery-order meaning.

## Raw Deterministic Measurements

These are qualification proof measurements, never production metrics.

| Category | Result |
| --- | --- |
| Source-shaped wiring LOC | `120` physical non-empty LOC |
| Generic proof glue LOC | `553` physical non-empty LOC |
| Generic proof glue ratio | `4.608333` generic/source-shaped |
| ADR production-glue ratio | `not-applicable-production-loc-zero` |
| Files in LOC sample | `6` |
| Binding change sites | baseline `2`; hybrid `2` |
| Diagnostics | immutable and deterministically sorted |
| Determinism | byte-identical regeneration plus stale check |
| Type declaration fixture | nominal `ModuleId<Value>` handles emitted into the qualification tarball |
| Private consumer smoke | offline packed install, typecheck, and execution passed |
| Focused typecheck | repository-pinned TypeScript `7.0.2` passed |
| Serializable projections | declarations, profiles, diagnostics, and inventory clone safely |
| Disable impact | complete required-dependency closure |
| Disposable classification | `30-50% disposable` label |

The physical LOC sample covers the two source-shaped wiring fixtures and four
generic validation, discovery, fixture-reading, and loader helpers. Tests, JSON
declarations/profiles, this report, and measurement reporting code are excluded
from that ratio. Shipping production LOC is zero, so the ADR production-glue
ratio is not applicable; synthetic proof LOC is not used as its denominator.

## Limitations And Stop Rules

The source snapshots supplied to the run contain source trees without Git
metadata. This proof records the supplied exact SHAs and uses the trees only to
shape fixtures; it does not independently verify Git custody or copy product
domain models. The fixtures prove mechanism behavior, not product semantics,
adoption value, runtime performance, or independent authorship.

The isolated consumer smoke uses repository-pinned pnpm `11.18.0` to create a
tarball and install it with `--offline`. Repository-pinned TypeScript `7.0.2`
then checks a private consumer before Node executes the package runtime
export. This qualifies the disposable package shape used by this proof. It does
not satisfy `PACKAGE-1`, establish a production package, prove publication, or
admit a public SPI.

Delete the hybrid shadow and retain direct Pure DI if a product-owned benchmark
does not demonstrate a repeated authoring or drift problem, if binding change
sites do not fall, or if navigation and diagnosis do not improve. Stop or move
back if the first two production slices exceed the ADR-0013 30% generic-glue
limit, ordinary feature work repeatedly changes Foundation, or framework types
cross product contracts. The disposable output must never be promoted by
renaming or moving it into a production package.

## Next Minimal Product-Owned Step

One owning product may approve a benchmark protocol and replay the same
baseline-versus-hybrid authoring tasks in its own repository against one real
slice. The protocol must name expected outcomes, repetitions, thresholds,
incorrect-edit taxonomy, binding-change measurement, deletion criteria, and
adoption owner. Until that evidence exists, retain product-owned Pure DI and do
not extract shared semantics.
