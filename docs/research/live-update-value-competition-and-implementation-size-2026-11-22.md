---
id: research.live-update-value-and-size
type: research
status: active
owner: architecture
summary: Verified competing mechanisms, conditional usefulness ratings and scoped production code estimates for the standalone live update library.
---

# Live Update Value Competition and Implementation Size 2026-11-22

## Scope and authority

**Assessment date: 2026-11-22.** The owner asks whether the standalone library
is useful in AI-assisted development, distinctive against serious alternatives,
and expensive to implement. This document separates verified competing
mechanisms from engineering estimates. It does not select the seven open
[owner decisions](module-federation-update-boundaries-and-architecture-options-2026-11-22.md#owner-decision-matrix).

The accepted direction remains a TypeScript-first, separately reusable library
with a complete update operation and optional execution profiles. Consumers
provide narrow authority and state primitives; they do not rebuild the operation.
The [blueprint](standalone-live-plugin-library-blueprint-2026-11-22.md) and
[reliability study](live-update-reliability-and-industry-evidence-2026-11-22.md)
retain their original scope. Native Effect in a particular application does not
make Effect mandatory for every library consumer.

Three parallel reviews covered JS/UI alternatives, runtime alternatives and
independent sizing. This follow-up changes **zero production lines** and performs
**zero new native executions**. The prior MF 4/4 and SystemJS 2/2 probes qualify
their recorded mechanisms, not a production library or competitive superiority.

<!-- cspell:words Piral Pilet Zephyr SLOC relup appup rebinding wadm -->

## Evidence and lessons

### Value and distinctiveness

These scores are engineering judgments, not market measurements:

| Question | Current judgment | What would change it |
| --- | --- | --- |
| Value of the user outcome in a long-lived editor or agent workspace | **8/10** | Whether preserving current work actually saves users meaningful interruption |
| Value of building our portable library over a ready stack | **6–7/10, conditional** | Less consumer coordination code or better required behavior in a fair comparison |
| Additional value for a conventional site with little persistent session state | **3–4/10** | A demonstrated need beyond existing development refresh and deployment |

The useful promise is a changed capability in the current session, with an
understandable result for user work, old operations and retained resources.
Frequent AI-authored changes could increase this value; that is a hypothesis.
AI also makes one-off integrations cheaper. Demand, adoption cost and willingness
to pay have not been measured.

**The category and most individual mechanisms already exist.** A complete update
operation is necessary for our proposal, but is not itself novel. Neither a longer
design nor more runtime adapters establishes superiority over shipped systems.
Our possible advantage is a coherent, portable TS integration with a useful
state/UX/lifecycle contract and a smaller burden on consumers. It remains to be
demonstrated against a ready stack with reasonable integration code.

### Serious alternatives, with their actual comparison scope

| Existing option | Verified overlap | Implication for this project |
| --- | --- | --- |
| **Vite and framework refresh** | Ready development HMR; supported React/Vue paths preserve qualified state without reloading the page. [C01] | Basic instant feedback during coding is already available. Compare the additional production/session promise. |
| **Module Federation + Zephyr** | Runtime replacement, release versions and rollback. Zephyr's **Beta** Electron guide replaces a renderer React feature in place; state outside the feature remains. Main/preload/native/shell changes use ordinary releases. Its MCP supports authorized deployment operations. [C02–C05] | The closest overlap with live UI changes and AI-assisted release control. Do not describe it as only file delivery. |
| **Piral + Piral Cloud** | Pilet setup/teardown and registered UI contributions; the feed controls active versions, disabling, tags and environments. [C06–C07] | Compare a ready plugin shell and release service before building equivalent SDK, feed or lifecycle machinery. |
| **single-spa ecosystem** | Unload and reinitialization expressly support application hot reload; the API can wait for unmount. Unregister is distinct from clearing SystemJS code. [C08] | Lifecycle and delivery mechanisms can be reused; assess the remaining coordination for our consumer. |
| **OSGi and Erlang/OTP** | OSGi retains revisions and refreshes a dependency closure. OTP has atomic module-set loading and release upgrade/downgrade machinery. [C09–C11] | Strong counterexamples to claims that managed code replacement is new. Different runtimes limit direct substitution. |
| **Temporal Worker Versioning** | Version-pinned executions, current/ramping versions and old deployment versions draining; automatic upgrades still require replay-safe changes. [C12] | Existing patterns for long-lived work and version retention. It is a workflow platform, not a drop-in UI plugin library. |
| **wasmCloud and Extism** | Current wasmCloud v2 uses a Kubernetes runtime operator for workloads; Extism provides embedding SDKs and language toolchains. [C13–C14] | Reuse deployment/runtime primitives where appropriate. Neither source alone establishes our particular UI state contract. |

Theia is also relevant when the consumer is an IDE: its extension platform could
replace a larger part of the proposed product. Runtime extension installation
alone does not prove every extension can be replaced without a restart. [C15]

The live sources were inspected on the assessment date. The comparison is not
an exhaustive market census or a new native qualification of these products.
An omitted guarantee in a page is not evidence that the product lacks it.

### Lessons that constrain differentiation

- **Release rollback and session recovery differ.** Zephyr itself documents the
  distinction between changing an environment, a running client adopting it, and
  external effects that are not undone. Do not make a weaker baseline to claim
  an advantage. [C05]
- **Lifecycle calls have precise completion contracts.** The review of Piral
  1.12.5, commit `15af4fd41e049b5880916af81e130cf22e6ac44b`, found that its inspected
  cleanup path invokes teardown without awaiting its return. This does not prove
  arbitrary async drain, and does not establish a defect in the whole product.
  Exact source paths are retained in ledger entries J10–J11. [C07]
- **Module-set atomicity has a scope.** OTP's all-or-none code loading does not
  automatically make every application effect part of one transaction. [C10]
- **Current and historical architectures must stay separate.** wasmCloud v2
  replaced v1's `wadm` with an operator. Its migration rationale and performance
  statements are upstream reports, not our reproduced benchmark. [C13]
- **An API name is not runtime enforcement.** The Felix Framework 8 guide says
  the standard OSGi security layer was removed while permission APIs remain.
  This is a concrete warning for capability claims, scoped to that implementation.
  [C16]

### Production code estimates

Count authored production TypeScript `.ts`/`.tsx` and authored shipped declarations:
physical lines containing code after fixed formatting. Blank lines and lines
containing only comments are excluded; mixed code/comment lines count once.
Exclude dependencies, generated output/bindings, fixtures,
tests, examples, benchmarks, build/CI, documentation and consumer business code.
Library-supplied adapters count; product-specific integration is separate.
AI-authored code counts like any other maintained code.

| Conditional scenario | Library production SLOC | Test/fixture/E2E SLOC, separately | Confidence in production estimate |
| --- | ---: | ---: | ---: |
| Focused complete-operation MVP | **3,000–6,000** | 4,000–9,000 | 5/10 |
| Stable, bounded TS library | **7,000–14,000** | 12,000–25,000 | 4/10 |
| Broader product with selected runtime profiles | **15,000–30,000** | 25,000–55,000 | 3/10 |

These are **total sizes of each scenario, not successive additions**. They are
bottom-up engineering estimates, not a statistical forecast or a target line
quota. Test estimates have lower confidence and are not a fixed code ratio.
If a ready stack already supplies the required complete operation, the residual
library could be smaller; these numbers are not a reason to duplicate it.

**MVP assumptions:** one trusted TS execution profile, one host, one UI framework,
an existing loader and Get Modular composition. Existing product owners already
provide data, authorization and resources. One compatible update group and one
old-work policy are fully exercised. The promised draft/context is preserved,
while the chosen view may be reconstructed. The library owns planning, prepare,
publication coordination, useful B behavior, candidate failure, bounded retention,
cleanup coordination and observable results. Arbitrary schema migration, all
Undo/IME context, long offline operation and whole-host crash recovery are outside
this estimate; ambiguous publication must still be reported honestly.

**Stable TS assumptions:** declared browser and Node profiles, one UI framework,
competing attempts, supported streams/callbacks, exclusive handover with a defined
fallback, retention limits, observation recovery and an old-client/artifact window.
One versioned attempt/receipt schema and **one recovery policy** use existing
durable product primitives. Recovery coordination remains in the library. Public
packaging, a separate consumer and a supported version matrix are required.
Stable means quality in this area, not universal compatibility.

**Broader assumptions:** the stable scope plus native Effect, one Worker **or**
process logic profile, and one selected Wasm/Extism profile. Their cancellation,
native failure, message and state contracts require real work. This does not
include a marketplace, artifact service, distributed workflow engine, universal
sandbox/editor, Electron updater or every runtime/framework combination. Any
required authored Rust/C/C++ would need its own estimate.

These are costing scenarios, **not defaults or acceptance of open policies**.

### Bottom-up budget without duplicate engines

| Responsibility | MVP | Stable TS | Broader |
| --- | ---: | ---: | ---: |
| Contracts, validation, existing composition plan and compatibility | 400–800 | 900–1,700 | 1,400–2,700 |
| Complete operation, attempt/candidate ownership, publication reconciliation and recovery decisions | 650–1,300 | 1,600–3,100 | 2,400–4,700 |
| Operation/continuation affinity and adapters to existing resource scopes | 350–750 | 800–1,600 | 1,600–3,200 |
| Loading/execution adapters, readiness and native results | 250–550 | 700–1,500 | 2,600–5,300 |
| State handoff coordination and one framework/view adapter | 300–600 | 800–1,700 | 1,800–3,600 |
| Retention reasons, budget eligibility and cleanup requests | 200–450 | 650–1,300 | 1,200–2,300 |
| Correlated results, typed errors, bounded observation and user-visible status | 300–650 | 700–1,500 | 1,400–2,800 |
| Existing delivery/authority adapters, artifact availability and client version compatibility | 200–450 | 650–1,400 | 1,800–3,800 |
| Arithmetic sum before rounding | **2,650–5,550** | **6,800–13,800** | **14,200–28,400** |

These are responsibility boundaries, not eight mandatory packages. The operation
makes decisions; resource integration acquires lifetimes; retention explains
remaining holds. They must not become three copies of a generation counter.
State coordination does not implement product migrations, and delivery does not
become a second canonical-version authority.

Reuse is already included: Get Modular composition, qualified Resources/lifecycle,
native Effect, selected module loaders and Wasm SDKs, and product authority/state.
The inspected lifecycle kernel remains private; availability through a supported
public dependency is a gate, not free hidden work or permission to copy it.
Extism declaration/SDK qualification gaps keep their recorded status. See the
[reuse study](reuse-first-live-plugin-updates-2026-11-22.md) and blueprint.

With suitable existing application boundaries, first-consumer production
integration is estimated separately at **400–1,200 lines for MVP** and
**1,000–3,000 for stable TS**. It supplies product policies and narrow primitives,
not the common update algorithm. A legacy application's state/side-effect
refactoring can dominate and requires a separate estimate.

Earlier **900–1,800 production lines** described a first vertical slice, not this
MVP or the whole stable library. Neither count should be read as a schedule or
percentage complete.

### Critique and unresolved cost drivers

The first review removed duplicated graphs, loaders, stores, supervisors and
workflow engines from the estimate. It also separated consumer integration,
tests and runtime adapters instead of counting the same responsibility twice.

The independent challenge found a potential underestimate: existing owners and
loaders do not eliminate crash recovery or ambiguous cleanup coordination. The
stable scenario was narrowed to one attempt schema and recovery policy, while
that coordination stayed inside the library. The competitor review also rejected
uniqueness based on full operations, live component replacement or AI control.

The largest unresolved multipliers are the state/history promise, recovery after
external effects, and the old-client window. Arbitrary third-party UI, preserving
semantic Undo across crashes, more hosts or several migration policies can exceed
these ranges. Re-estimate the changed scenario; do not silently broaden "stable."

## Open questions and validation

All seven owner choices stay **OPEN**. No decision about trust, shared platform,
state, visibility, old work, recovery or old clients is adopted by the estimates.

Proposed next product validation, not a completed experiment: implement one real
consumer story using the nearest ready stack and the smallest complete library
operation under identical constraints. Compare:

1. Consumer-specific production code and integration effort, including all
   coordination that a framework leaves to the application.
2. Useful visible B behavior and preservation of the explicitly promised user
   work; time from validated artifact to this result.
3. Candidate rejection, late completion after cancellation, competing attempts,
   ambiguous publication and cleanup failure, with an intelligible outcome.
4. Repeated updates with real resources and long A operations; measured retention,
   old callbacks and recovery cost rather than a successful dispose callback.
5. A packed public API used by a separate application. Orchestration copied into
   the consumer is a library gap, not a hidden integration requirement.

If the ready stack meets the needed contract with less effort, the appropriate
result may be a thin shared integration or a smaller project. Until this comparison
exists, claim a promising design and qualified mechanisms, not a uniquely powerful
system or proved architectural superiority.

### Sources and evidence classes

The [source ledger and estimate assumptions](evidence/live-update-value-assessment-20261122.json)
preserve the broader review's exact URLs, revision scopes and review dispositions.
Living vendor documentation is source evidence, pinned code is implementation
evidence, and the budgets/ratings are our judgments. No new native competitive
benchmark is claimed.

- [C01: Vite framework refresh](https://vite.dev/guide/features.html)
- [C02: Module Federation runtime API](https://module-federation.io/guide/runtime/runtime-api)
- [C03: Zephyr Electron OTA, Beta](https://docs.zephyr-cloud.io/features/electron-ota-updates)
- [C04: Zephyr API MCP](https://docs.zephyr-cloud.io/tools/api-mcp)
- [C05: Zephyr rollback](https://docs.zephyr-cloud.io/features/instant-rollbacks)
- [C06: Piral Cloud documentation](https://docs.piral.cloud/)
- [C07: Piral pinned lifecycle implementation](https://github.com/smapiot/piral/tree/15af4fd41e049b5880916af81e130cf22e6ac44b/src/framework)
- [C08: single-spa application API](https://single-spa.js.org/docs/api/)
- [C09: OSGi Core R8 wiring](https://docs.osgi.org/specification/osgi.core/8.0.0/framework.wiring.html)
- [C10: OTP code loading](https://www.erlang.org/doc/apps/kernel/code.html)
- [C11: OTP release handling](https://www.erlang.org/doc/system/release_handling.html)
- [C12: Temporal Worker Versioning](https://docs.temporal.io/worker-versioning)
- [C13: wasmCloud v2 migration](https://wasmcloud.com/docs/migration/)
- [C14: Extism plugin systems](https://extism.org/docs/concepts/plug-in-system/)
- [C15: Theia extensions](https://theia-ide.org/docs/extensions/)
- [C16: Felix Framework 8 guide](https://felix.apache.org/documentation/subprojects/apache-felix-framework/apache-felix-framework-8-upgrade-guide.html)
