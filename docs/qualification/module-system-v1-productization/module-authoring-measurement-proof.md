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

The root test contains 26 named scenarios with direct expected outcomes rather
than using agreement between candidates as its only oracle:

1. Agent Runtime Pure DI outcome;
2. Agent Runtime hybrid static arguments and outcome;
3. Frontend Pure DI ordered-source outcome;
4. Frontend hybrid static arguments and ordered-source outcome;
5. inert serializable declarations;
6. bounded fixed-name discovery;
7. zero activation evaluation during discovery;
8. malformed declaration diagnostics;
9. duplicate declaration diagnostics;
10. missing required binding rejection;
11. explicit optional absence and profile-ordered many binding;
12. disabled root rejection;
13. disabled required provider and complete impact closure;
14. disabled selected optional provider diagnostics;
15. selected literal loader evaluation only;
16. unselected and invalid loader zero-evaluation;
17. loader-key bijection;
18. deterministic AI inventory and nominal navigation handles;
19. byte-identical regeneration and stale-output detection;
20. plugin-shaped data becoming an ordinary typed product contribution;
21. absence of framework, Foundation, graph, lifecycle, and container leaks;
22. structured-clone-safe data with factories kept separate;
23. isolated private-consumer package surface without authoring internals;
24. deterministic measurement and deletion decision;
25. explicit Orchestrator non-admission; and
26. immutable, deterministically sorted, path-safe diagnostics.

Diagnostics sort by code, consumer, relative declaration path, field path,
available module ID, and sorted related paths. They contain no absolute paths,
stack traces, timestamps, or discovery-order meaning.

## Raw Deterministic Measurements

These are qualification proof measurements, never production metrics.

| Category | Result |
| --- | --- |
| Source-shaped wiring LOC | `194` physical nonblank LOC |
| Generic proof glue LOC | `392` physical nonblank LOC |
| Generic proof glue ratio | `2.020619` generic/source-shaped |
| ADR production-glue ratio | `not-applicable-production-loc-zero` |
| Files in LOC sample | `5` |
| Binding change sites | baseline `2`; hybrid `2` |
| Diagnostics | immutable and deterministically sorted |
| Determinism | byte-identical regeneration plus stale check |
| Type inference fixture | nominal `ModuleId<Value>` handles |
| Packed/private consumer leakage | isolated private surface absent |
| Serializability | declarations, profiles, diagnostics, and inventory clone safely |
| Disable impact | complete required-dependency closure |
| Disposable classification | `30-50% disposable` label |

The physical LOC sample covers the two source-shaped wiring fixtures and three
generic authoring/discovery/loader helpers. Tests, this report, and measurement
reporting code are excluded from that ratio. Shipping production LOC is zero,
so the ADR production-glue ratio is not applicable; synthetic proof LOC is not
used as its denominator.

## Limitations And Stop Rules

The source snapshots supplied to the run contain source trees without Git
metadata. This proof records the supplied exact SHAs and uses the trees only to
shape fixtures; it does not independently recertify Git custody or copy product
domain models. The fixtures prove mechanism behavior, not product semantics,
adoption value, runtime performance, or independent authorship.

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
