---
id: research.agent-framework-comparison
type: research
status: active
owner: architecture
summary: Dated primary-source comparison of six agent frameworks; observations and unadopted transfer hypotheses, not product decisions.
---

# Agent Framework Extension Evidence 2026-11-05

Research cut: **2026-11-05 UTC**. Case family: `AF`. Status: **retained research; every transfer hypothesis is unadopted**. Companion machine-readable evidence: [agent source ledger](evidence/plugin-frameworks-20261105-agent-sources.json).

## Scope, authority and result

The six systems expose substantially different units. Google ADK has runner-wide interception plugins. Pydantic AI now has composable capabilities as well as toolsets. Microsoft Agent Framework exposes agent/chat/function middleware and indivisible middleware bundles. Mastra has phase-specific processors, tools and workflows. ElizaOS has a broad plugin contribution and lifecycle model. Current Letta Code has fully trusted local harness mods. Calling all six a generic plugin Host would erase the most useful distinctions.

The useful comparison is **which owner controls a particular contribution, invocation, state lifetime or cleanup obligation**, and how authors express that contract. None of these source inspections qualifies a thousand-plugin product fleet, hostile-code isolation or an Agent Teams product Host. No investigated frameworks were installed, no upstream tests or runtime experiments were executed, and no product code or remote state was changed.

The assignment brief, shared Engineering Quality Standard, EF `AGENTS.md`, existing plugin research hub and its ownership/qualification limits were read. The prior public-package E2E remains bounded fixture/public package integration, including unchanged copied discovery source; it is not production Host, restart/drain, artifact custody or fleet qualification. Existing static composition plus controlled restart remains the agreed direction. The observations below do not authorize seamless hot swap, a new public SPI, another Host/PluginManager/supervisor/container, language migration or a framework choice.

Ownership remains: **GM** owns neutral declarations/bindings/graph compilation/plans; **EF** owns neutral extension/artifact/trust/protocol/conformance concerns; **products** own concrete extension points, payloads, grants, loaders, readiness and operational state; the **existing execution owner** retains physical custody. An upstream framework's internal manager is evidence about that framework, not a proposal to create an equivalent Agent Teams owner. Ordinary third-party extensions cannot replace product invariants, authorization, canonical state, fencing or enforcement.

### Evidence vocabulary

`D` = documented contract; `S` = inspected source; `T` = inspected existing test, **not run**; `H` = historical report/fix; `I` = inference; `E` = proposed experiment, **not run**. Source IDs below resolve to exact URLs and symbols in the companion ledger. Moving hosted documentation was retrieved on the research date and was not presumed to match a release. A version string in a manifest is not proof that all inspected default-branch bytes were published.

### Source and release identities

| Case | Inspected implementation pin | Separate release evidence and relationship |
| --- | --- | --- |
| AF-001 Google ADK Python | `google/adk-python` `b33b43e5b5388b9454c71f440eb885901075f43a`, committer date 2026-11-05 21:46:31 UTC | `v2.13.0`, published 2026-10-23; tag commit `d68ca857d5e3bab8e968d4e5f98ef028eb37dc87`. Default-branch inspection is a different identity. |
| AF-002 Pydantic AI | `pydantic/pydantic-ai` `e2332baaba4feb2c92f5ed47b7343374c2ba3546`, 2026-11-05 17:06:33 UTC | `v2.66.0`, published 2026-11-04; tag commit `7d1d3f0191fd5d500b02e58dee2bf6d7adc1b967`. The release collection also contains `clai2-bleeding`, explicitly described upstream as not a release; that item is not the product baseline. |
| AF-003 Microsoft Agent Framework | `microsoft/agent-framework` `1c3264b065ef4b2b9b3614b19394bdd49d98334f`, 2026-11-05 21:29:14 UTC | Python `python-1.24.0`, published 2026-10-30; tag commit `43d767c55050480e470ebf0a89caa4141d325ebf`. Inspected Python core manifest says 1.24.0 and Python >=3.11; matching version text does not equate head with release. |
| AF-004 Mastra | `mastra-ai/mastra` `0ab5441946936c0c5c02a8f684e74ac4b5df0cfa`, 2026-11-05 21:36:06 UTC | `@mastra/core@1.82.0`, published 2026-11-04; annotated tag object `949afa750dc50749b140a9159528208274958172` dereferences to commit `6e8dfcb83facb0861ebefa4fee384429a113acf4`. Inspected core manifest is **1.83.0-alpha.0**, Node >=22.13.0. |
| AF-005 ElizaOS | `elizaOS/eliza` **default branch `develop`**, `74b8e6a22ef915680f55dd4018ee118d1018d33d`, 2026-11-05 21:48:02 UTC | Inspected `@elizaos/core` manifest says **2.0.12-beta.0**. A corresponding published product tag/byte identity was not established by this lane. GitHub release results included `pr-evidence-*` artifact stores, which are not treated as software releases. These are pinned development-source claims. |
| AF-006 current Letta | `letta-ai/letta-code` `8ec417abb05a0d7f4c2b7be3968345fbc48da294`, 2026-11-05 17:52:53 UTC | `v0.34.41`, published 2026-11-05 04:23:03 UTC; tag commit `233c0034492b9782c9bec01002226b891e514745`. Inspected package also says 0.34.41; head still differs from tag. |

The Letta repository correction is material: `letta-ai/letta` default head `8816d3a8516893bfdc0fa14bfb1235226012e295` contains policy/navigation files, and its **pinned README explicitly routes current development to `letta-code` and calls the old archive branch the retired V1 API server**. The current case therefore follows the successor rather than manufacturing a product deficiency from the old repository's current contents. Historical V1 `0.16.8` is separately pinned to `1131535716e8a31c9a437f8695e25ac98f203a24`. [LET-L1], [LET-R1], [LET-H1]

## AF-001 — Google ADK: interception is an ordered contract, resource borrowing is separate

**Question:** How can a small cross-cutting extension contract make order and cleanup meaningful without pretending to be an artifact/dependency host?

**Actual unit and technology.** This case inspects the Python implementation, whose package declares Python >=3.11, not the separate JavaScript/Go/Kotlin implementations. `BasePlugin` bundles callbacks attached to a runner and applies across agents in that runner; an agent's own callbacks are a different, narrower seam. Hosted docs describe plugin registration and hook families. Neither a `BasePlugin` object nor a function tool is, by itself, an independently admitted artifact package with a dependency solver. [ADK-D1], [ADK-S1], [ADK-M1]

### Mechanism 1: distinguish interception from notification

**D/S.** `BasePlugin` states that plugin callbacks precede agent callbacks, preserve registration order, propagate input mutations and can stop the remaining chain. `PluginManager.register_plugin` rejects duplicate plugin names. `_run_callbacks` awaits each callback serially and returns immediately on the first result that **is not `None`**. Empty dictionaries or other false-like non-`None` values still count. It wraps callback exceptions in an attributed `RuntimeError`. The actual contract is ordered first-result interception; it is not an all-providers reduction. [ADK-S1], [ADK-S2]

**S.** The same implementation deliberately distinguishes new notification hooks: `run_on_agent_error_callback` and `run_on_run_error_callback` use `_run_notification_callbacks`, which ignores return values and continues through registered plugins after individual ordinary callback exceptions. This does not promise continuation through task cancellation or every abnormal termination. That is valuable counterevidence to a sweeping claim that ADK always stops every plugin chain on error or early return. Phase semantics are explicit in the concrete dispatch path, even when the broad class description talks about early exit. [ADK-S2]

**I.** This is economical for observability, cache interception and request shaping. The cost is that composition behavior depends on the hook's exact result algebra: a plugin that returns a synthetic tool result also suppresses later observers on that interception path. A product that needs mandatory audit/enforcement cannot merely append it to such an optional ordered chain and infer that it will always execute. This is a transfer warning about contract choice, not evidence of an ADK security defect.

### Mechanism 2: borrowed plugins do not acquire a second cleanup owner

**S.** `PluginManager.close` closes plugins sequentially, attempts later closes after errors, aggregates ordinary failures and re-raises cancellation after remaining closes. A per-plugin timeout defaults to five seconds. The source explains why same-task sequential cleanup matters for libraries such as anyio/MCP that use task-local contexts; Python >=3.11 uses `asyncio.timeout`. `set_skip_closing_plugins(True)` makes close a no-op for borrowed objects. `AgentTool` actually invokes that path when a child runner inherits plugins from a parent, so the parent remains cleanup owner. [ADK-S2], [ADK-S3]

**H.** Commit `f9558b36e8d70cb69978cd96b7abcd310691d125` (2026-10-07) explicitly repaired cancellation handling: the previous `except Exception` branch could not catch `CancelledError`, so later plugins were skipped. The current loop has the dedicated cancellation branch. This is a repaired historical mechanism, not an outstanding defect. Existing tests inspect actual task cancellation, continuation after close error, timeout and the borrowed no-close path; none was executed here. [ADK-H1], [ADK-T1]

**Tradeoffs and limits.** Sequential close preserves task context but can take approximately the sum of cooperative close delays; timeout is not proof that arbitrary extension effects or subprocesses have physically ended. Registration scans existing names and callback dispatch walks the plugin list; those source facts identify work proportional to selected plugins, not measured capacity or a practical maximum. No hostile-code boundary was inspected: Python callbacks are ordinary executable application code. Dependency declarations, release compatibility and artifact trust are not supplied by this callback list. This statement describes the inspected unit, not every ADK subsystem. [ADK-S1], [ADK-S2], [ADK-S3]; I

**Conditional transfer, unadopted.** Products could specify each narrow hook as first-result interception, all-observer notification or a defined reducer. GM can retain deterministic selection/order facts only where those are part of the declared composition contract; EF can retain conformance vocabulary, while actual callbacks, mandatory policy and cleanup custody stay with product/execution owners. Borrowed-versus-owned cleanup is a useful local obligation without importing ADK's internal manager.

**Smallest falsifier / E, not run.** Three trivial callbacks record visits: the first mutates arguments, the second returns `{}`, the third records a visit. An independent oracle expects the third to be skipped on an interception hook but reached on a notification hook even if the second raises an ordinary exception. Separately close an inherited child runner and then use the parent's exporter; the expected observation is no child-owned exporter close. A mismatch would change the proposed hook/borrowing analogy. This is a bounded fixture proposal, not a product lifecycle test.

## AF-002 — Pydantic AI: capability order and per-run rebinding are real extension semantics

**Question:** What can typed, composable agent behavior bundles teach us beyond a tool-name registry?

**Actual unit and technology.** Current docs call capabilities the main extension point. `AbstractCapability` can contribute instructions, model settings, tools and lifecycle hooks; a convenience `Capability` bundles behavior without subclassing. Python >=3.11 and typed `RunContext[Deps]` are the inspected stack. Toolsets remain a narrower model-facing tool collection and execution dispatcher. Capabilities can wrap other capabilities, toolsets and model behavior, but this is not evidence of a neutral binary-artifact host. [PYD-D1], [PYD-D2], [PYD-S1], [PYD-M1]

### Mechanism 1: order constraints are distinct from type-presence requirements

**D/S.** `CapabilityOrdering` expresses `outermost`/`innermost`, `wraps`, `wrapped_by` and `requires`. `_ordering.py` constructs `graphlib.TopologicalSorter` edges, uses insertion order as a tiebreaker and turns cycle detection into `UserError`. Type references use subclass matching; instance references use object identity. `requires` declares type presence and **does not imply order**; the inspected multi-entry sorting path validates presence, with the singleton fast-path caveat below. Therefore this is neither a service-instance binding language nor a semantic-version dependency solver. [PYD-D2], [PYD-S1], [PYD-S2]

**S.** `CombinedCapability` flattens ordinary nested groups, then sorts leaves where ordering is declared. It carries a separate composition view for instruction overrides and rebinds by copying rather than rerunning constructors. Its comments explain why rebuilding from flattened children would lose a nested container's overridden instructions, and why repeated occurrences of one object need occurrence-specific decisions. This is concrete maintenance complexity created by useful no-fork customization: grouping, specialization and ordering are allowed, so composition must preserve all three deliberately. [PYD-S3]

**T, not run.** `tests/test_capabilities.py` includes constrained order, multiple tier members, missing requirements, cycles, nested groups and run-specific replacement cases. These independently stated expectations strengthen source interpretation but do not constitute an executed result here. The read missing-requirement test uses two children. The sorting function's `n <= 1` fast path precedes requirement validation; a singleton missing-requirement boundary is therefore a useful **unrun question**, not a reported public defect. Higher-level construction/normalization may matter. [PYD-T1], [PYD-S2]

### Mechanism 2: distinguish configuration rebinding, resources and callable provenance

**D/S.** `for_agent` binds capability configuration; `for_run` may return a fresh instance for isolated run state. Default `for_run` returns the same object, so isolation is an explicit author choice. Its contract warns authors not to acquire resources there: setup precedes run hooks, so acquisition should instead sit inside an owned run wrapper that can release it. Innermost durability capabilities bind in a second phase after toolset contributions are known, and cannot contribute their own toolsets in that phase. These are substantive lifecycle constraints, not stylistic advice. [PYD-S1]

**S.** `CombinedToolset` uses `AsyncExitStack` to enter children in order and close them through the stack, gathers child tool descriptions, rejects duplicate exposed names, and retains the source tool/source toolset in the combined entry for dispatch. Dispatch forwards the currently prepared definition while restoring the source toolset's own ID. This avoids treating a renamed/prepared model-facing definition as an unrelated execution provider. Its explicit-ID handling also avoids turning hostname-derived identity into serialized/durably hashed tool definitions. [PYD-S4]

**D.** Deferred capabilities collapse instructions/tools behind a short catalog entry and stable ID until loaded. This addresses model-visible context; it is separate from deferred tool calls that pause for approval or external execution. The docs' model-selection threshold language is not adopted as a benchmark or universal limit. No catalog scale, activation throughput or hostile-isolation measurement was performed. [PYD-D3]

**Tradeoffs, trust and scale.** Capability hooks are executable Python behavior, and wrappers can alter requests, arguments, results and flow. A model-visible hidden tool is not an authority revocation. Typed dependencies improve authoring but are not runtime privilege isolation. Ordering has pairwise matching/position-edge loops; densely constrained capabilities can increase edges and preparation work. Per-run rebinding reduces accidental shared state when used correctly but creates identity caveats for references to original instances. None of these observations establishes an observed bottleneck or justifies moving application code to Python. [PYD-S1], [PYD-S2], [PYD-S3], [PYD-S4]; I

**Conditional transfer, unadopted.** The transferable distinction is presence/order/binding/state lifetime, not Pydantic's capability supertype. GM already owns neutral dependency binding and diagnostics, so any neutral ordering requirement belongs there if a real consumer contract needs it; products own hook semantics and run state. EF can preserve name/provenance/conformance obligations without importing the graph. Provider-specific durability remains an adapter above the same owned operation.

**Smallest falsifier / E, not run.** Compose two separately defined capability packages with duplicate tool names and an explicit prefix; independently expect rejection before prefixing and provenance-preserving dispatch afterward. A second tiny setup uses one capability with a missing `requires` type, then the same capability plus an unrelated sibling, to locate the exact validation boundary before treating the requirement as unconditional. Add one `for_run` replacement with an original-instance ordering reference to test the documented identity caveat. These are narrow qualification questions, not permission to build a general runtime.

## AF-003 — Microsoft Agent Framework: indivisible middleware and stream finality

**Question:** How does a composable invocation pipeline avoid silently installing only half a feature, and what does completion mean for streaming policy?

**Actual unit and technology.** The inspected implementation is **Python core**, not .NET or the separate Go SDK. Its extension units include agent, chat and function middleware, context providers and tools. The current README links separate Semantic Kernel and AutoGen migration guidance; their historical plugin contracts are not treated as today's Python contracts. Hosted Learn content retrieved without the Python pivot rendered primarily .NET examples; Python claims below rely on exact Python source and tests, with the language mismatch explicitly retained. [MS-D1], [MS-L1], [MS-M1]

### Mechanism 1: an all-or-nothing feature bundle across separate pipelines

**S.** `AgentMiddlewarePipeline` and `FunctionMiddlewarePipeline` store an ordered sequence and build nested `call_next` closures. A middleware can inspect/mutate context, run downstream processing, modify results or stop before the terminal handler. The source does not imply that a callback registry is a plugin installation lifecycle. Existing tests explicitly cover no-next short circuit and entry/exit order. [MS-S1], [MS-T1]

**S.** `MiddlewareBundle` is a deliberately non-sequence opaque group. It validates members, rejects nested bundles and preserves member order. Categorization splits members into agent/function/chat pipelines but refuses partial installation at seams supporting only some categories. That distinction matters: a feature requiring both function enforcement and agent observation is not silently accepted with one member dropped. This is category/member closure at those seams, not transactional rollback of arbitrary constructor or registration effects. By contrast, the bare invalid-middleware registration route retains lenient historical behavior and warns that the object will not execute. Bundles make a stronger category-acceptance promise than unrelated optional middleware objects. [MS-S1]

**T, not run.** The existing tests assert that supported-category filtering warns for a bare unsupported middleware and raises `MiddlewareException` for an indivisible bundle with an unsupported member; a bundle containing supported members expands. This is direct counterevidence to a broad statement that the framework always silently ignores unsupported extensions. [MS-T1]

### Mechanism 2: creating a stream is not checking its final answer

**S/T.** Middleware `await call_next()` can complete with a `ResponseStream` before its lazy body has been consumed. The read tests distinguish middleware before/after ordering from the subsequent stream handler start/end, and test stream result transforms in unwind order. The implementation registers separate update/result transforms, gates and cleanup hooks onto the stream after the middleware chain unwinds. [MS-S1], [MS-T1]

**S.** `_warn_unbuffered_result_gates` explicitly warns that final result gates on an unbuffered stream run after updates have already reached consumers; a rejecting final gate cannot retroactively withhold those updates. Buffering or `stream_buffer_updates=True` is the relevant contract when a result gate must block release. This is a useful built-in protection and diagnostic, not a discovered unmitigated leak. Hosted .NET guidance similarly distinguishes streaming and non-streaming middleware but is not assumed implementation-equivalent. [MS-S1], [MS-D1]

**Tradeoffs, dependencies and trust.** Middleware bundles encode a small feature's installation closure without a universal dependency container. They do not themselves resolve package versions, authenticate artifacts, isolate untrusted Python or prove function side effects are reversible. Ordering is ordinary pipeline order, not capability-provider cardinality or a graph-wide binding decision. User middleware may short circuit, retry or transform behavior; required security still needs a product-owned, qualified receiver boundary. Buffering strengthens pre-release checks at the cost of streaming latency and retained output. Resource cleanup hooks remain narrower than process/remote effect retirement. No throughput, maximum middleware count or fleet guarantee is established. [MS-S1]; I

**Release nuance.** The Python 1.24.0 release notes record changed approval defaults and a Python baseline transition; the inspected head has Python >=3.11. Release notes and head differ in identity, so the current middleware bundle/gate source is not automatically claimed released in 1.24.0. [MS-R1], [MS-M1]

**Conditional transfer, unadopted.** A product extension point could require a set of related contributions to be admitted together and emit a precise unsupported-seam error. GM already owns composition closure; it should not be duplicated as an EF middleware installer. Products own whether a feature's stream must be held, the response representation and the invariant it protects. EF can preserve conformance scenarios that distinguish construction, emission and finalization.

**Smallest falsifier / E, not run.** Two middleware members form a bundle, one agent-level and one function-level; attempt installation at a function/chat-only seam and expect a rejection before either executes. For streaming, a two-chunk deterministic stream has a final rejecting gate: the buffered profile must emit neither chunk; the unbuffered profile may have delivered them and must not claim pre-release rejection. A contrary observation changes the proposed contract. This proposal requires no model/network or product Host.

## AF-004 — Mastra: phase/state identity and bounded recovery

**Question:** How can narrowly staged processors support deep customization while making state and retry costs explicit?

**Actual unit and technology.** TypeScript `Processor` objects operate at specific agent phases; tools are agent-callable functions, and workflows provide their own execution composition. The core package is a Node library, with inspected manifest Node >=22.13.0. A processor is not an artifact admission unit, and a workflow is not automatically a plugin dependency/lifecycle host. Hosted docs and source distinguish input, per-step, streaming, result and API-error work. The current source also has additional hooks such as `processLLMRequest`/`processLLMResponse`; older six-method summaries are not a complete current interface. [MAS-D1], [MAS-S1], [MAS-M1]

### Mechanism 1: phase order and request state have explicit identity

**D/S.** Docs say configured processors run in array order; memory processors load history before user input processors and persist after user output processors. Aborting in the output guardrail can therefore stop memory processors from saving that output. Workflows can supply explicit conditional/parallel execution rather than making every processor concurrent. Source `ProcessorRunner` loops over each configured phase, chains modifications and throws `TripWire` for abort; existing tests cover order, model/tool/settings changes, chain-stopping aborts/errors and rejected external `MessageList` instances. [MAS-D1], [MAS-S2], [MAS-T1]

**S/D.** `ProcessorRunner.processorStates` is keyed by processor **ID**, shared between input/output methods and loop iterations for that runner. Current ClassifierProcessor docs explicitly explain that same-ID instances share per-run state, including accumulated stream chunks, and tell authors to choose unique IDs. Therefore accidental state sharing from duplicate IDs is a documented authoring boundary, not an invented absent-validation bug. It can also be intentional when one processor participates in several phases. This must not be confused with all fields of a reused JavaScript processor object automatically becoming request-local. [MAS-S2], [MAS-D2]

**D/I.** The ClassifierProcessor API separates model evidence (scores/probabilities/refusal) from application `onResult` policy. Its `warn` and `strict` failure strategies deliberately differ. This is a useful concrete example of preserving successful protections and naming a failure policy, while refusing to treat classifier output or a user-configured guardrail as the product's canonical authorization authority. It also illustrates why a nominally identical plugin type can carry different deployment promises. [MAS-D2]

### Mechanism 2: recovery has a bounded, visible cost

**S.** `resolveMaxProcessorRetries` returns an explicit caller value when supplied; otherwise, when error processors exist, it applies `DEFAULT_MAX_PROCESSOR_RETRIES = 3`. The source describes this as a backstop for a processor that keeps requesting retry, not a budget applications should aim to exhaust. A warning is deduplicated per agent for a caller-configured error-processor list lacking an explicit cap. Built-in processors self-limit below that cap. [MAS-S3]

**S.** Agent error-processor resolution keeps configured order, inserts missing shared stability defaults by canonical default IDs and does not reorder user processors. Per-run overrides replace configured entries while auto-derived memory/skills processors have their own preservation rules. This is concrete composition policy, not interchangeable with GM's neutral graph semantics. [MAS-S4]

**H.** Commit `6fd532a2462858637a5f0b38096e9ab105bc146f` (2026-09-22), titled `fix(core): cap implicit error-processor retries at 3 and warn (#24503)`, records the cap repair. Later `c260e429ff30cc19859555985cacd5b70cfd63d9` (2026-09-30) enabled the stability stack by default. Current source contains the backstop. No endless-retry defect is asserted for the inspected head; neither historical change was executed here. [MAS-H1], [MAS-H2], [MAS-S3], [MAS-S4]

**Tradeoffs, trust, dependencies and scale.** A per-step processor can alter model choice, tools, instructions and messages, making source-level customization powerful without a project fork. Each configured hook, chunk and retry adds work; a stream classifier can make one classifier call per text chunk, which the docs explicitly identify as cost-sensitive. A three-retry cap is scoped to this recovery path, not a universal cap on tool effects, workflow retries or total tenant work. Imported processors are trusted application code, and model-visible active-tool filtering is separate from execution grants. Async callbacks and an `AbortSignal` do not independently prove subprocess or external effect closure. No installed-module count, memory envelope or aggregate throughput was measured. [MAS-D2], [MAS-S1], [MAS-S2], [MAS-S3], [MAS-S4]; I

**Conditional transfer, unadopted.** Products could define per-phase state identities and immutable selected processor order under restart composition; GM would retain neutral selection/bindings, not Mastra's agent policy. EF could preserve phase/cardinality/retry conformance language. The existing operation/execution owners would still own effect idempotency, cancellation and actual cleanup. No generic Processor interface is proposed for every Agent Teams extension.

**Smallest falsifier / E, not run.** Two independent processor packages accidentally share an ID and each appends a marker to state; observe the documented sharing, then use distinct IDs and independently expect isolation. A deterministic API-error stub always requests retry: verify retries separately from total attempts and the final error at the implicit cap and an explicitly smaller cap. The initial attempt is separate from the retry budget. Count the caller's selected phase only; do not relabel that as total agent/fleet capacity. These results would determine whether a proposed identity/cost contract needs stricter admission, not justify a new runtime.

## AF-005 — ElizaOS: contribution ownership is real, dependency tolerance is not closed-world admission

**Question:** How does a broad plugin system track partial activation and teardown, and where do friendly discovery semantics diverge from hard dependency admission?

**Actual unit and technology.** The current `Plugin` is a TypeScript contribution bundle containing actions, providers, services, models, events, evaluators and other surfaces, with initialization/configuration/disposal hooks. Core's README distinguishes Node runtime, browser-safe contracts and host-owned lifecycle/process concerns. `plugin.ts` uses an injected host `PluginResolver`; core does not import arbitrary plugin package names or install packages itself. A string reference without a resolver is skipped with a warning, while already loaded plugin objects can still be supplied. This is a concrete separation of loading ownership worth retaining. [ELI-D1], [ELI-S1], [ELI-S2], [ELI-M1]

### Mechanism 1: dependency order, discovery tolerance and version compatibility are different

**D/S.** Current hosted architecture docs describe dependencies loaded before dependents and higher plugin priority loaded first. The pinned `resolvePluginDependencies` does dependency-first DFS with visited/visiting sets and alias lookup. It logs and returns on a missing dependency; it logs and returns when it encounters a cycle; the enclosing traversal can still append the encountered plugins. `resolvePluginsImpl` queues declared dependencies through the injected resolver, including dependencies of plugin objects supplied up front. The current source explicitly comments on that latter repair. [ELI-D1], [ELI-S2]

**S/I.** The inspected core dependency function does **not** use `priority` to sort its outer traversal. Priority is also used for model-provider selection elsewhere; the doc's broad loading claim should therefore not be transferred as this core function's guarantee without inspecting the consuming host. Alias normalization strips scope and `plugin-` for short-name resolution, a convenience that must not be equated with immutable artifact identity. Requirements here are string plugin names, not semantic-version ranges or typed service cardinality. This is a scoped discrepancy between general docs and a function, not a claim that every Eliza host ignores priority or lacks compatibility machinery. [ELI-S1], [ELI-S2]; I

**Tradeoff.** Tolerant partial resolution lets optional integrations fail without necessarily blocking the entire application. A consumer needing a complete required closure must choose that stronger policy explicitly; it cannot use an array returned by this function as proof that no dependency was missing or cyclic. No hostile bypass was demonstrated.

### Mechanism 2: capture owned contributions and unwind partial registration

**S.** `installRuntimePluginLifecycle` wraps registration calls and uses `AsyncLocalStorage` capture to collect the plugin's actual contributions, including services registered through runtime calls. On registration failure it tracks partial ownership and attempts teardown. If cleanup succeeds, the catch branch rethrows the original registration error; if teardown throws its `AggregateError`, that cleanup error can propagate instead. Teardown invokes plugin disposal, attempts connector/service/event/model/component removal and aggregates cleanup errors. Array removals for owned components are by reference; other registries retain exact ownership facts. This is more than merely deleting a plugin name from a list. [ELI-S3]

**Correction provenance, 2026-11-05.** Independent criticism identified that the earlier phrase about preserving the registration failure was unconditional. Re-reading the pinned catch at lines 1244–1254 and teardown's aggregate throw at lines 865–872 confirms the conditional behavior above. This is a corrected source interpretation, not an executed failure or an upstream defect assertion.

**S.** Database-adapter ownership is treated specially: ordinary unload rejects with a runtime-reload requirement. `reloadPlugin` first tears down the existing ownership and then registers the new plugin; it does not prepare both versions and atomically publish a ready candidate. This is a deliberate simpler replacement shape. If preparation then fails, preserving the predecessor cannot be inferred from this function. Likewise `applyPluginConfig` is a separate hook, not proof of full state migration or effect rollback. [ELI-S3]

**S.** Runtime stop has explicit best-effort and `requireQuiescence` paths. Strict stop joins original retirement work and room/post-delivery drains, while best-effort stop should not be relabeled strict. The read `RuntimeRetirement` retains promises and teardown failures independently of lookup-registry clearing. These are useful counterexamples to claiming that Eliza simply clears registries and assumes physical closure. The guarantee remains bounded by the actual work tracked and the caller-selected stop profile. [ELI-S4], [ELI-S5]

**H/T, not run.** Historical commit `7cbb4327b4d09cd7b7a358997841e84995b5ff33` (2026-10-28, PR #37157) repaired connector ownership on unload: message/post connector registrations had remained after services stopped. Current source tracks message/post connectors and send-handler sources. The pinned test file also verifies teardown of chat pre-handlers/response evaluators and fresh instances after unload. These are repaired/covered mechanisms; they are not asserted current failures, and no regression test was executed here. [ELI-H1], [ELI-T1], [ELI-S3]

**Trust and compatibility limits.** The typed contract describes direct mode as trusted in-process execution, and also describes a separate remote plugin mode with requested permissions and host narrowing. This lane inspected the type descriptions, **not the remote enforcement implementation or sandbox**, so it does not certify either an escape or isolation guarantee. The broad `IAgentRuntime` received by direct plugins is powerful; its extensibility is not permission for ordinary Agent Teams extensions to replace invariants. Current hosted reference types also differ from the development pin, for example the adapter is now a factory handled before runtime construction. Use exact contracts rather than copying documentation snippets as current code. [ELI-D2], [ELI-S1], [ELI-S4]

**Scale.** The DFS mechanism and ownership store are concrete, but name normalization, final scans and a broad set of contribution surfaces add distinct authoring/cleanup costs. Marketplace plugin counts are not runtime coexistence, dependency-closure or tenant-capacity evidence. This lane did not establish a supported plugin count or production fleet envelope.

**Conditional transfer, unadopted.** Ownership-ledger conformance is relevant to product/execution cleanup; exact provenance, cleanup debt and borrowed ownership can be neutral EF obligations when independently qualified. GM already owns hard composition closure and diagnostics; do not copy this tolerant resolver into EF or infer its returned list is a canonical GM plan. Product loaders decide whether an integration is optional and how a controlled restart handles adapter/exclusive resources. This does not propose importing Eliza's broad runtime interface.

**Smallest falsifier / E, not run.** Supply three inert plugin objects to the exported resolver, one with an unavailable dependency and a two-node cycle, and independently inspect returned names plus emitted diagnostics before deciding whether the route satisfies required-closure policy. For lifecycle, register one action, connector and service, deliberately fail initialization, and check each real registry plus cleanup debt; then fail the replacement after old teardown to determine the exact available-state contract. No external model/database/service is required, and this would still be fixture evidence only.

## AF-006 — Letta Code: agent-repairable trusted mods with owned generations

**Question:** What does deep no-fork customization buy when a product deliberately favors recoverability over a stable semantic SDK, and what do its generation guards actually prove?

**Current source lineage.** The retired Python API server is not used to stand in for current Letta. Its pinned README sends active projects to `letta-code`, now including the harness, terminal UI, App Server, channels and runtime used by apps. The current official mods docs describe fully trusted code inside the Letta Code process; the 2026-06-24 introduction explains the agent-authored harness customization goal. Cloud inference/compaction does not automatically make local mod events run on the cloud server. [LET-L1], [LET-D1], [LET-D2]

**Actual unit and technology.** A local JavaScript/TypeScript mod exports an activation function and may register commands, tools, event hooks, permission policies, providers and UI; it can return a disposer. Current docs distinguish mods, which change the harness, from skills, which teach a task. The implementation loads selected local files, creates an owner and abort controller per activation, awaits activation and records path/phase/owner diagnostics. Package dependencies are ordinary runtime/managed-package concerns, not a capability graph with versioned provider bindings. No installation was performed. [LET-D1], [LET-S1], [LET-S2]

### Mechanism 1: recoverable customization is a deliberate compatibility choice

**D/S.** The pinned mod-engine README explicitly prioritizes agent-editable, low-level trusted code, useful diagnostics, safe mode and repair/reload over a strongly stable semantic SDK. It still reserves narrow host calls where turns, tools, UI, permissions, scoped conversations, cancellation and state need coordination. The authoring reference says to avoid importing internals and to guard contributions with host capability support. This is a coherent tradeoff for a local harness whose agent can inspect and rewrite its mods; it is not evidence that compatibility is unnecessary for independently released third-party product modules. [LET-S3], [LET-D1], [LET-S4]

**S.** Source resolution sorts files within each directory and orders legacy/global/agent sources; the priority function distinguishes legacy, bundled, global, agent and project scopes, but current resolver/docs do not enable every enumerated scope. Tool registration rejects reserved built-in names. Existing same-scope contributions need an explicit override unless source priority permits shadowing, and a lower-priority owner cannot silently replace a higher-priority one. The registry retains an activation signal and owner; unregister removes an entry only when owner IDs match. This is useful protection against stale cleanup removing a successor contribution. The lower-level map setter alone is not the public registration contract. [LET-S1], [LET-S2], [LET-S5], [LET-T2]

**Trust boundary.** The docs explicitly grant mods the process's access. Host capability booleans describe available APIs, not an untrusted-code sandbox. A mod can register permission policy precisely because this is trusted harness adaptation. That must not be transferred to ordinary Agent Teams third-party extension authority; any similarly powerful mechanism would be a separately owned privileged product profile. There is no evidence here of a remote untrusted mod boundary, either strong or broken. [LET-D1], [LET-S3]; I

### Mechanism 2: stale activation guards are narrower than atomic replacement

**S.** `disposeLocalMods` aborts activation signals, reverses returned disposers, records synchronous disposal errors, unregisters owned providers/permissions/tools and clears local registries. The disposer type is synchronous `() => void`; it is not an awaited asynchronous drain protocol. New tool calls check an activation signal before invoking the tool. Existing async tool work therefore must honor cancellation and its own effect contract; a guard on future calls is not proof that in-flight work stopped. [LET-S1], [LET-S5]

**S.** `createModEngine.reload` disposes the current registry first, increments a generation, publishes an empty registry, loads a new registry and publishes changes. A stale loading completion is disposed rather than becoming current. The loading registry may be published progressively during activation. This gives useful stale-handle and late-completion protection, but it is not all-or-nothing old-active-until-new-ready publication. A failed mod can be diagnosed and other mods continue. Arbitrary import side effects cannot be undone merely by removing registered contributions. [LET-S1]; I

**T, not run.** Existing engine tests explicitly cover old activation abortion/stale handle diagnostics, an empty snapshot while mods load and ignored stale reload completions. A separate loader test checks reserved built-in names. These tests preserve intended semantics but were not executed here. Calling this seamless production hot swap would erase precisely the behavior the test names document. [LET-T1], [LET-T2]

**Historical fix kept separate.** Retired server release `0.16.8` and merged PR #3343 (2026-05-14; merge/tag commit `1131535716e8a31c9a437f8695e25ac98f203a24`) record switching sandbox-to-server tool-result transport from pickle to JSON. This is a resolved historical security fix for V1. Its PR/release metadata was read; its runtime was not executed, and it does not establish current Letta Code/cloud transport behavior. [LET-H1], [LET-H2]

**Scale and maintenance.** Sequential activation, per-file import caching, per-owner registries, event handlers and retained model-visible tools are separate costs. A local trusted repair workflow can be productive with few coordination rules; thousands of independently versioned third-party modules add compatibility/release/revocation concerns not answered by the repair philosophy. No scale maximum or benchmark was established, and no claim that the product cannot scale follows from this inspection. [LET-S1], [LET-S2], [LET-S3], [LET-S4], [LET-S5]; I

**Conditional transfer, unadopted.** Owner/path/phase diagnostics, precise source precedence, protected built-ins and exact-owner cleanup are useful product authoring/conformance ideas. GM remains responsible for neutral binding/selection identity; EF may retain provenance/cleanup obligations; product/execution owners retain allowed APIs and actual resource closure. Static composition and controlled restart can use those lessons without adopting Letta's live reload or allowing ordinary extensions to rewrite authorization.

**Smallest falsifier / E, not run.** Let a first activation pause on a manually controlled promise, start a second reload, register a successor tool, then release the first promise. Independently expect stale completion not to replace the successor and old owner cleanup not to delete it. Keep one old tool invocation pending and check whether it actually stops or merely becomes unavailable to new calls. The latter distinction tests the narrow proposed guarantee; it is not a defect assertion or full Host qualification.

## Cross-case transfer register — all unadopted

| Hypothesis | Evidence that makes it plausible | Owner and analogy boundary | Smallest proposed rejection |
| --- | --- | --- | --- |
| Name hook cardinality/result behavior explicitly | ADK first-result callbacks versus all-observer notifications; Pydantic before/after/wrapper differences | Product extension contract; GM only where neutral composition needs declared order | An early result or exception suppresses a receiver the product promised must run |
| Preserve a feature's required contribution closure | MS indivisible middleware bundles; Pydantic type requirements; Eliza tolerant missing dependencies | GM owns neutral closure, products own required/optional semantics; EF does not install another graph | One member is absent yet the product accepts the feature as complete |
| Separate contribution ID, source provider, activation owner and run state | Pydantic source toolset provenance, Mastra ID-keyed state, Letta owner IDs | GM identities; EF artifact/provenance; product run/execution ownership | A renamed/prepared tool dispatches to the wrong provider, or a stale disposer deletes its successor |
| Distinguish descriptor visibility, activation and permission | Pydantic deferred capabilities; Mastra active tools; Letta fully trusted mods | Product protocol/tool shortlist and authorization; EF trust evidence stays distinct | A hidden tool remains callable under a receiver policy that claimed revocation |
| Make cleanup observations precise | ADK borrowed close/cancellation, Eliza best-effort versus strict retirement, Letta synchronous disposers | Existing execution owner, product shutdown/recovery, neutral EF evidence vocabulary | A successful API result is claimed as physical drain while original work remains |
| Give stream release its own policy boundary | MS buffered final gates; Mastra per-chunk/result phases | Product response/effect policy, not a generic plugin manager | Rejected content reaches a consumer before a promised pre-release gate |
| Prefer explicit bounded authoring surfaces over a universal plugin shape | All six use different meaningful seams | Consumer-owned narrow contracts; no framework adoption | One proposed common interface forces irrelevant methods, service bags or duplicated owners |

These findings do not require a new architecture decision in this research task. A future concrete product slice may justify one disputed choice; its owning decision should state exact invariants, qualified inputs, costs and falsifiers. The present work preserves sources and questions rather than converting competitor behavior or critic agreement into that decision.

## Source navigation and inspection limits

The companion JSON ledger stores each code file's exact commit and fetched blob SHA where available, symbols, source class, hosted-document observation date, release/tag objects, historical fix IDs and bounded claims. It also retains the relevant access limitations. Primary technical sources were used; search snippets were discovery aids, not sole evidence for current implementation claims.

Key primary routes:

- ADK: [plugin documentation](https://adk.dev/plugins/), [BasePlugin](https://github.com/google/adk-python/blob/b33b43e5b5388b9454c71f440eb885901075f43a/src/google/adk/plugins/base_plugin.py), [PluginManager](https://github.com/google/adk-python/blob/b33b43e5b5388b9454c71f440eb885901075f43a/src/google/adk/plugins/plugin_manager.py), [borrowed AgentTool plugins](https://github.com/google/adk-python/blob/b33b43e5b5388b9454c71f440eb885901075f43a/src/google/adk/tools/agent_tool.py), [cancellation fix](https://github.com/google/adk-python/commit/f9558b36e8d70cb69978cd96b7abcd310691d125).
- Pydantic AI: [capability docs](https://pydantic.dev/docs/ai/capabilities/overview/), [custom contract at pin](https://github.com/pydantic/pydantic-ai/blob/e2332baaba4feb2c92f5ed47b7343374c2ba3546/docs/capabilities/custom.md), [ordering](https://github.com/pydantic/pydantic-ai/blob/e2332baaba4feb2c92f5ed47b7343374c2ba3546/pydantic_ai_slim/pydantic_ai/capabilities/_ordering.py), [AbstractCapability](https://github.com/pydantic/pydantic-ai/blob/e2332baaba4feb2c92f5ed47b7343374c2ba3546/pydantic_ai_slim/pydantic_ai/capabilities/abstract.py), [CombinedToolset](https://github.com/pydantic/pydantic-ai/blob/e2332baaba4feb2c92f5ed47b7343374c2ba3546/pydantic_ai_slim/pydantic_ai/toolsets/combined.py).
- Microsoft: [Learn middleware](https://learn.microsoft.com/en-us/agent-framework/concepts/agents/middleware/), [Python middleware](https://github.com/microsoft/agent-framework/blob/1c3264b065ef4b2b9b3614b19394bdd49d98334f/python/packages/core/agent_framework/_middleware.py), [existing tests](https://github.com/microsoft/agent-framework/blob/1c3264b065ef4b2b9b3614b19394bdd49d98334f/python/packages/core/tests/core/test_middleware.py).
- Mastra: [processors](https://mastra.ai/docs/agents/processors), [ClassifierProcessor identity/policy](https://mastra.ai/reference/processors/classifier-processor), [runner](https://github.com/mastra-ai/mastra/blob/0ab5441946936c0c5c02a8f684e74ac4b5df0cfa/packages/core/src/processors/runner.ts), [retry budget](https://github.com/mastra-ai/mastra/blob/0ab5441946936c0c5c02a8f684e74ac4b5df0cfa/packages/core/src/processors/retry-budget.ts), [agent processor resolution](https://github.com/mastra-ai/mastra/blob/0ab5441946936c0c5c02a8f684e74ac4b5df0cfa/packages/core/src/agent/agent.ts).
- ElizaOS: [current plugin architecture](https://docs.elizaos.ai/plugins/architecture), [pinned Plugin](https://github.com/elizaOS/eliza/blob/74b8e6a22ef915680f55dd4018ee118d1018d33d/packages/core/src/types/plugin.ts), [resolver](https://github.com/elizaOS/eliza/blob/74b8e6a22ef915680f55dd4018ee118d1018d33d/packages/core/src/plugin.ts), [ownership lifecycle](https://github.com/elizaOS/eliza/blob/74b8e6a22ef915680f55dd4018ee118d1018d33d/packages/core/src/plugin-lifecycle.ts), [connector fix](https://github.com/elizaOS/eliza/commit/7cbb4327b4d09cd7b7a358997841e84995b5ff33).
- Letta: [current-source migration README](https://github.com/letta-ai/letta/blob/8816d3a8516893bfdc0fa14bfb1235226012e295/README.md), [current mods docs](https://docs.letta.com/configuration/mods), [design tradeoff README](https://github.com/letta-ai/letta-code/blob/8ec417abb05a0d7f4c2b7be3968345fbc48da294/src/mods/README.md), [mod engine](https://github.com/letta-ai/letta-code/blob/8ec417abb05a0d7f4c2b7be3968345fbc48da294/src/mods/mod-engine.ts), [tool owner guards](https://github.com/letta-ai/letta-code/blob/8ec417abb05a0d7f4c2b7be3968345fbc48da294/src/mods/tool-registry.ts), [historical resolved V1 transport fix](https://github.com/letta-ai/letta/pull/3343).

No external documentation or code was copied wholesale into this deliverable. Exact source identifiers are retained for later review; observations remain dated and source-scoped.

## Source identifiers

| ID | Evidence class | Primary source |
| --- | --- | --- |
| [ADK-D1] | documented contract | ADK Plugins |
| [ADK-S1] | inspected source | src/google/adk/plugins/base_plugin.py |
| [ADK-S2] | inspected source | src/google/adk/plugins/plugin_manager.py |
| [ADK-S3] | inspected source | src/google/adk/tools/agent_tool.py |
| [ADK-T1] | inspected unrun test | tests/unittests/plugins/test_plugin_manager.py |
| [ADK-M1] | inspected source | pyproject.toml |
| [ADK-H1] | historical report/fix | fix: close remaining plugins when plugin close is cancelled |
| [PYD-D1] | documented contract | Pydantic AI Capabilities |
| [PYD-D2] | documented contract | Building Custom Capabilities |
| [PYD-D3] | documented contract | On-Demand Capabilities |
| [PYD-S1] | inspected source | pydantic_ai_slim/pydantic_ai/capabilities/abstract.py |
| [PYD-S2] | inspected source | pydantic_ai_slim/pydantic_ai/capabilities/_ordering.py |
| [PYD-S3] | inspected source | pydantic_ai_slim/pydantic_ai/capabilities/combined.py |
| [PYD-S4] | inspected source | pydantic_ai_slim/pydantic_ai/toolsets/combined.py |
| [PYD-S5] | inspected source | pydantic_ai_slim/pydantic_ai/toolsets/abstract.py |
| [PYD-T1] | inspected unrun test | tests/test_capabilities.py |
| [PYD-M1] | inspected source | pyproject.toml |
| [PYD-D4] | documented contract | docs/capabilities/custom.md |
| [PYD-D5] | documented contract | docs/capabilities/on-demand.md |
| [MS-D1] | documented contract | Microsoft Learn Agent Middleware |
| [MS-L1] | documented contract | README.md |
| [MS-S1] | inspected source | python/packages/core/agent_framework/_middleware.py |
| [MS-T1] | inspected unrun test | python/packages/core/tests/core/test_middleware.py |
| [MS-M1] | inspected source | python/packages/core/pyproject.toml |
| [MAS-D1] | documented contract | Mastra Processors |
| [MAS-D2] | documented contract | ClassifierProcessor |
| [MAS-S1] | inspected source | packages/core/src/processors/index.ts |
| [MAS-S2] | inspected source | packages/core/src/processors/runner.ts |
| [MAS-S3] | inspected source | packages/core/src/processors/retry-budget.ts |
| [MAS-S4] | inspected source | packages/core/src/agent/agent.ts |
| [MAS-T1] | inspected unrun test | packages/core/src/processors/process-input-step.test.ts |
| [MAS-M1] | inspected source | packages/core/package.json |
| [MAS-H1] | historical report/fix | fix(core): cap implicit error-processor retries at 3 and warn (#24503) |
| [MAS-H2] | historical report/fix | Enable the stability processor stack by default (#24473) |
| [ELI-D1] | documented contract | ElizaOS Plugin Architecture |
| [ELI-D2] | documented contract | ElizaOS Plugin Reference |
| [ELI-D3] | documented contract | ElizaOS Runtime and Lifecycle |
| [ELI-S1] | inspected source | packages/core/src/types/plugin.ts |
| [ELI-S2] | inspected source | packages/core/src/plugin.ts |
| [ELI-S3] | inspected source | packages/core/src/plugin-lifecycle.ts |
| [ELI-S4] | inspected source | packages/core/src/runtime.ts |
| [ELI-S5] | inspected source | packages/core/src/runtime/retirement.ts |
| [ELI-T1] | inspected unrun test | packages/core/test/plugin-handler-teardown.test.ts |
| [ELI-M1] | documented contract | packages/core/README.md |
| [ELI-M2] | inspected source | packages/core/package.json |
| [ELI-H1] | historical report/fix | fix(core): remove a plugin's message and post connectors on unload (#37157) |
| [LET-L1] | documented contract | README.md |
| [LET-D1] | documented contract | Letta Mods |
| [LET-D2] | documented contract | Introducing Mods: Enabling Agents to Self-Improve through Harness-Level Adaptation |
| [LET-S1] | inspected source | src/mods/mod-engine.ts |
| [LET-S2] | inspected source | src/mods/mod-sources.ts |
| [LET-S3] | documented contract | src/mods/README.md |
| [LET-S4] | documented contract | src/skills/builtin/creating-mods/references/architecture.md |
| [LET-S5] | inspected source | src/mods/tool-registry.ts |
| [LET-S6] | inspected source | src/mods/permission-registry.ts |
| [LET-S7] | inspected source | src/mods/package-manifest.ts |
| [LET-T1] | inspected unrun test | src/mods/mod-engine.test.ts |
| [LET-T2] | inspected unrun test | src/cli/mods/local-mod-loader-reserved-tools.test.ts |
| [LET-M1] | inspected source | package.json |
| [LET-H1] | historical report/fix | Retired server release 0.16.8 |
| [LET-H2] | historical report/fix | Merged V1 server PR #3343 |
| [ADK-R1] | documented contract | Release v2.13.0 |
| [PYD-R1] | documented contract | Release v2.66.0 |
| [MS-R1] | documented contract | Release python-1.24.0 |
| [MAS-R1] | documented contract | Release @mastra/core@1.82.0 |
| [LET-R1] | documented contract | Release v0.34.41 |

[ADK-D1]: https://adk.dev/plugins/
[ADK-S1]: https://github.com/google/adk-python/blob/b33b43e5b5388b9454c71f440eb885901075f43a/src/google/adk/plugins/base_plugin.py
[ADK-S2]: https://github.com/google/adk-python/blob/b33b43e5b5388b9454c71f440eb885901075f43a/src/google/adk/plugins/plugin_manager.py
[ADK-S3]: https://github.com/google/adk-python/blob/b33b43e5b5388b9454c71f440eb885901075f43a/src/google/adk/tools/agent_tool.py
[ADK-T1]: https://github.com/google/adk-python/blob/b33b43e5b5388b9454c71f440eb885901075f43a/tests/unittests/plugins/test_plugin_manager.py
[ADK-M1]: https://github.com/google/adk-python/blob/b33b43e5b5388b9454c71f440eb885901075f43a/pyproject.toml
[ADK-H1]: https://github.com/google/adk-python/commit/f9558b36e8d70cb69978cd96b7abcd310691d125
[PYD-D1]: https://pydantic.dev/docs/ai/capabilities/overview/
[PYD-D2]: https://pydantic.dev/docs/ai/capabilities/custom/
[PYD-D3]: https://pydantic.dev/docs/ai/capabilities/on-demand/
[PYD-S1]: https://github.com/pydantic/pydantic-ai/blob/e2332baaba4feb2c92f5ed47b7343374c2ba3546/pydantic_ai_slim/pydantic_ai/capabilities/abstract.py
[PYD-S2]: https://github.com/pydantic/pydantic-ai/blob/e2332baaba4feb2c92f5ed47b7343374c2ba3546/pydantic_ai_slim/pydantic_ai/capabilities/_ordering.py
[PYD-S3]: https://github.com/pydantic/pydantic-ai/blob/e2332baaba4feb2c92f5ed47b7343374c2ba3546/pydantic_ai_slim/pydantic_ai/capabilities/combined.py
[PYD-S4]: https://github.com/pydantic/pydantic-ai/blob/e2332baaba4feb2c92f5ed47b7343374c2ba3546/pydantic_ai_slim/pydantic_ai/toolsets/combined.py
[PYD-S5]: https://github.com/pydantic/pydantic-ai/blob/e2332baaba4feb2c92f5ed47b7343374c2ba3546/pydantic_ai_slim/pydantic_ai/toolsets/abstract.py
[PYD-T1]: https://github.com/pydantic/pydantic-ai/blob/e2332baaba4feb2c92f5ed47b7343374c2ba3546/tests/test_capabilities.py
[PYD-M1]: https://github.com/pydantic/pydantic-ai/blob/e2332baaba4feb2c92f5ed47b7343374c2ba3546/pyproject.toml
[PYD-D4]: https://github.com/pydantic/pydantic-ai/blob/e2332baaba4feb2c92f5ed47b7343374c2ba3546/docs/capabilities/custom.md
[PYD-D5]: https://github.com/pydantic/pydantic-ai/blob/e2332baaba4feb2c92f5ed47b7343374c2ba3546/docs/capabilities/on-demand.md
[MS-D1]: https://learn.microsoft.com/en-us/agent-framework/concepts/agents/middleware/
[MS-L1]: https://github.com/microsoft/agent-framework/blob/1c3264b065ef4b2b9b3614b19394bdd49d98334f/README.md
[MS-S1]: https://github.com/microsoft/agent-framework/blob/1c3264b065ef4b2b9b3614b19394bdd49d98334f/python/packages/core/agent_framework/_middleware.py
[MS-T1]: https://github.com/microsoft/agent-framework/blob/1c3264b065ef4b2b9b3614b19394bdd49d98334f/python/packages/core/tests/core/test_middleware.py
[MS-M1]: https://github.com/microsoft/agent-framework/blob/1c3264b065ef4b2b9b3614b19394bdd49d98334f/python/packages/core/pyproject.toml
[MAS-D1]: https://mastra.ai/docs/agents/processors
[MAS-D2]: https://mastra.ai/reference/processors/classifier-processor
[MAS-S1]: https://github.com/mastra-ai/mastra/blob/0ab5441946936c0c5c02a8f684e74ac4b5df0cfa/packages/core/src/processors/index.ts
[MAS-S2]: https://github.com/mastra-ai/mastra/blob/0ab5441946936c0c5c02a8f684e74ac4b5df0cfa/packages/core/src/processors/runner.ts
[MAS-S3]: https://github.com/mastra-ai/mastra/blob/0ab5441946936c0c5c02a8f684e74ac4b5df0cfa/packages/core/src/processors/retry-budget.ts
[MAS-S4]: https://github.com/mastra-ai/mastra/blob/0ab5441946936c0c5c02a8f684e74ac4b5df0cfa/packages/core/src/agent/agent.ts
[MAS-T1]: https://github.com/mastra-ai/mastra/blob/0ab5441946936c0c5c02a8f684e74ac4b5df0cfa/packages/core/src/processors/process-input-step.test.ts
[MAS-M1]: https://github.com/mastra-ai/mastra/blob/0ab5441946936c0c5c02a8f684e74ac4b5df0cfa/packages/core/package.json
[MAS-H1]: https://github.com/mastra-ai/mastra/commit/6fd532a2462858637a5f0b38096e9ab105bc146f
[MAS-H2]: https://github.com/mastra-ai/mastra/commit/c260e429ff30cc19859555985cacd5b70cfd63d9
[ELI-D1]: https://docs.elizaos.ai/plugins/architecture
[ELI-D2]: https://docs.elizaos.ai/plugins/reference
[ELI-D3]: https://docs.elizaos.ai/agents/runtime-and-lifecycle
[ELI-S1]: https://github.com/elizaOS/eliza/blob/74b8e6a22ef915680f55dd4018ee118d1018d33d/packages/core/src/types/plugin.ts
[ELI-S2]: https://github.com/elizaOS/eliza/blob/74b8e6a22ef915680f55dd4018ee118d1018d33d/packages/core/src/plugin.ts
[ELI-S3]: https://github.com/elizaOS/eliza/blob/74b8e6a22ef915680f55dd4018ee118d1018d33d/packages/core/src/plugin-lifecycle.ts
[ELI-S4]: https://github.com/elizaOS/eliza/blob/74b8e6a22ef915680f55dd4018ee118d1018d33d/packages/core/src/runtime.ts
[ELI-S5]: https://github.com/elizaOS/eliza/blob/74b8e6a22ef915680f55dd4018ee118d1018d33d/packages/core/src/runtime/retirement.ts
[ELI-T1]: https://github.com/elizaOS/eliza/blob/74b8e6a22ef915680f55dd4018ee118d1018d33d/packages/core/test/plugin-handler-teardown.test.ts
[ELI-M1]: https://github.com/elizaOS/eliza/blob/74b8e6a22ef915680f55dd4018ee118d1018d33d/packages/core/README.md
[ELI-M2]: https://github.com/elizaOS/eliza/blob/74b8e6a22ef915680f55dd4018ee118d1018d33d/packages/core/package.json
[ELI-H1]: https://github.com/elizaOS/eliza/commit/7cbb4327b4d09cd7b7a358997841e84995b5ff33
[LET-L1]: https://github.com/letta-ai/letta/blob/8816d3a8516893bfdc0fa14bfb1235226012e295/README.md
[LET-D1]: https://docs.letta.com/configuration/mods
[LET-D2]: https://letta.one/blog/introducing-mods/
[LET-S1]: https://github.com/letta-ai/letta-code/blob/8ec417abb05a0d7f4c2b7be3968345fbc48da294/src/mods/mod-engine.ts
[LET-S2]: https://github.com/letta-ai/letta-code/blob/8ec417abb05a0d7f4c2b7be3968345fbc48da294/src/mods/mod-sources.ts
[LET-S3]: https://github.com/letta-ai/letta-code/blob/8ec417abb05a0d7f4c2b7be3968345fbc48da294/src/mods/README.md
[LET-S4]: https://github.com/letta-ai/letta-code/blob/8ec417abb05a0d7f4c2b7be3968345fbc48da294/src/skills/builtin/creating-mods/references/architecture.md
[LET-S5]: https://github.com/letta-ai/letta-code/blob/8ec417abb05a0d7f4c2b7be3968345fbc48da294/src/mods/tool-registry.ts
[LET-S6]: https://github.com/letta-ai/letta-code/blob/8ec417abb05a0d7f4c2b7be3968345fbc48da294/src/mods/permission-registry.ts
[LET-S7]: https://github.com/letta-ai/letta-code/blob/8ec417abb05a0d7f4c2b7be3968345fbc48da294/src/mods/package-manifest.ts
[LET-T1]: https://github.com/letta-ai/letta-code/blob/8ec417abb05a0d7f4c2b7be3968345fbc48da294/src/mods/mod-engine.test.ts
[LET-T2]: https://github.com/letta-ai/letta-code/blob/8ec417abb05a0d7f4c2b7be3968345fbc48da294/src/cli/mods/local-mod-loader-reserved-tools.test.ts
[LET-M1]: https://github.com/letta-ai/letta-code/blob/8ec417abb05a0d7f4c2b7be3968345fbc48da294/package.json
[LET-H1]: https://github.com/letta-ai/letta/releases/tag/0.16.8
[LET-H2]: https://github.com/letta-ai/letta/pull/3343
[ADK-R1]: https://github.com/google/adk-python/releases/tag/v2.13.0
[PYD-R1]: https://github.com/pydantic/pydantic-ai/releases/tag/v2.66.0
[MS-R1]: https://github.com/microsoft/agent-framework/releases/tag/python-1.24.0
[MAS-R1]: https://github.com/mastra-ai/mastra/releases/tag/%40mastra/core%401.82.0
[LET-R1]: https://github.com/letta-ai/letta-code/releases/tag/v0.34.41
