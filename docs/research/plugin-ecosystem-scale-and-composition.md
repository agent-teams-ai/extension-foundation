---
id: research.ecosystem-scale
type: research
status: active
owner: architecture
summary: Industry lessons for extension points, dependency identity, compatibility and independent plugin growth.
---

# Plugin Ecosystem Scale and Composition

Research date: **2026-10-21**. Scope: Backstage backend extension points, JupyterLab/Lumino service identity, Gradle cache/isolation contracts, Jenkins independent plugin compatibility, and Chrome Manifest V3 privilege/lifetime boundaries. Companion [platform](plugin-platform-reload-evidence.md), [production-system](production-reload-system-evidence.md) and [OpenClaw](openclaw-plugin-and-reload-audit.md) references cover unload and process replacement. No runtime implementation, remote change, architecture approval, or quantitative superiority claim follows from this memo.

## Executive finding

The useful target is **more independently maintainable capabilities under explicit composition, compatibility, trust, and lifetime contracts**. The number of packages or descriptors alone is a weak proxy. These ecosystems demonstrate useful protections, substantial integration costs, and deliberate limits. None provides evidence that our stack will support a larger active graph, more tenants, cheaper TypeScript inference, or more reload churn than OpenClaw. Those require separate measurements.

Three especially transferable findings:

1. A small public extension point can be a strong compatibility boundary even when its implementation and clients share a process. Backstage makes that boundary explicit but also explicitly refuses to treat plugins as sandboxed code. [B1–B4]
2. Dependency injection has a packaging contract as well as a type contract. JupyterLab and Jenkins show that duplicate runtime identities can invalidate apparently matching APIs. Conversely, forcing one shared package creates version coordination obligations. [J1–J2, K1]
3. DRY does not justify shared mutable configuration or an omniscient registry. Gradle obtains cacheability and concurrency by constraining state access and tracking inputs; Chrome separates privilege and execution contexts while requiring callers to tolerate worker termination. [G1–G4, C1–C4]

**Evidence labels:** **Fact** means primary documentation or source; **Report** means a specific first-person integration report, not independently reproduced here; **Inference** means a recommendation for this stack. Confidence is high for the cited documented behavior and medium for incident root causes not independently tested. Current unversioned documentation is a **2026-10-21 retrieval snapshot**, not an immutable release guarantee. Evidence versions below are research pins, not installation recommendations.

## 1. Separate the scale dimensions before comparing systems

The following is a proposed measurement vocabulary, not a new framework contract.

| Dimension | What to count or vary | Main risk it reveals |
| --- | --- | --- |
| Installed descriptors | Available manifests, revisions, disabled packages; fraction selected | Discovery/indexing/admission cost and accidental executable discovery |
| Active instances | Constructed providers, scopes, graph generations, workers/processes | Construction latency, retained state, cleanup cost, shared fate |
| Dependency edges | Required/optional/many edges, fan-out, depth, strongly connected regions | Closure calculation, invalidation radius, diagnostic size and ordering |
| Tenants | Tenant profiles, grants, configuration variants, live instances | Cross-tenant cache contamination, isolation and per-tenant duplication |
| Package copies | Same package/version in distinct resolutions; incompatible major versions | Token/class identity, singleton collisions, duplicated globals and memory |
| Compiler/editor inference | Public type size, generic nesting, declaration emit, tsserver requests | Authoring latency and editor reliability independently of runtime cost |
| Reload churn | Attempted and successful replacements, overlap duration, retained generations | Leaks, stale references, cache growth, recovery and retirement debt |
| Independent author releases | Concurrent contract/provider/consumer versions and upgrade sequences | Compatibility blast radius, coordination work, release governance cost |

A catalog can be large while the selected graph is small; a graph can be large but rarely replaced; a small graph can have expensive inferred types or many tenant copies. Report these axes separately and publish the tested envelope. In particular, do not infer runtime scalability from extension-marketplace counts, repository size, or the existence of a plugin API.

## 2. Backstage: narrow extension points, startup discipline, explicit trust limits

**Fact.** A Backstage backend module extends one plugin in the same backend instance. Its dependencies are extension points exported by the plugin's node-library package, rather than its implementation package. Documentation explicitly motivates this by avoiding duplicate installation of the plugin implementation while requiring library packages to support duplicate installation. Modules finish initialization before the owning plugin starts; extension-point interaction ends when module initialization resolves. This is a deliberate startup composition profile, not a failed live-reload feature. [B1]

**Fact.** Extension points belong to their plugin and are available only to modules extending it. Backstage recommends multiple small interfaces over a few large ones, explicit rejection of duplicate additions or singleton setters, and a new named/versioned extension point when making breaking changes. Current docs also describe a factory variant with per-module attribution of startup failures, avoiding the assumption that every failed contribution must be diagnosed as failure of the whole plugin. [B2]

**Fact.** Backstage's threat model treats plugin builders as highly trusted. Plugins run with host access and can read configuration/secrets; the framework does not aim to sandbox them. Logical database separation is not a security boundary when another plugin has its credentials or database access. Deployment and credential separation establish that boundary. The page scopes its built-in unauthorized-access discussion to the backend system and release **1.24 or later**. [B3]

**Fact / deliberate policy tradeoff.** Backstage publishes an umbrella set verified together while packages retain independent versions. Its versioning policy distinguishes stable, beta and alpha exports, but also explicitly permits producer-side breaking changes to certain framework-provided Utility API/Backend Service interfaces without a normal breaking-version classification; such changes are marked `BREAKING PRODUCERS`. Consumer stability and replacement-implementation stability are therefore different promises. [B4]

**Inference for author DX and Clean Architecture.** Preserve one owner for each contract and its behavioral suite, with implementation packages outside that contract's import graph. The current GM module-authoring guide already makes this distinction and supplies compiled examples; improve those routes rather than creating a parallel industry-derived authoring standard. An extension author should see the allowed methods, cardinality, registration phase, duplicate behavior, failure ownership, and compatibility policy without reading Host internals.

**Inference for admission and reload.** Freeze a selected composition at the point the owning contract specifies; do not keep a startup registration object as a universal mutable runtime registry. Backstage's additive-only startup interface is a useful precedent for limiting mutation, but cannot justify an additive-only API for an actually live-replaceable Host. Any future Host profile must separately specify removal, stale references and retirement. Keep source/contribution attribution on every admitted record so diagnostics can identify the plugin, module, extension point and artifact that caused a conflict.

## 3. JupyterLab/Lumino: nominal runtime identity survives only with packaging discipline

**Fact, JupyterLab 4.6.4 documentation.** A service token is a concrete Lumino `Token` instance. Required services missing at activation prevent activation; missing optional services arrive as `null`; activation is ordered provider-before-consumer and a token is registered once. Tokens can be published separately from implementations so another provider can implement the same contract. `sharedPackages` controls bundling, singleton selection and version-range checking through distinct options. Token-bearing packages must be deduplicated; Lumino widgets also require the same package copy. Required consumers may omit a token package from their bundle; optional consumers cannot assume a provider will supply that package. [J1]

**Report / resolved packaging diagnosis, 2024-09-04.** An author migrating a JupyterLab 3 extension from source installation to a prebuilt wheel reported `No provider for: @jupyterlab/coreutils:ISettingRegistry` despite source installation working. The reply identified a deep import from `@jupyterlab/settingregistry/lib/tokens`, replacing it with the public package entry point. Module federation could otherwise vendor another token instance. This is evidence of an authoring/packaging failure and its documented diagnosis, **not** evidence that current JupyterLab has an unfixed provider-resolution bug or that every such message has this cause. [J2]

**Fact / tradeoff.** Prebuilt bundles avoid rebuilding the entire application and permit per-user/environment/system installations, but the developer guide warns that extensions may break across releases and recommends explicit maintenance/compatibility metadata. Prebuilt installation and dynamic browser loading do not establish production unload or memory reclamation. [J1]

**Inference.** “Same TypeScript interface,” “same token name,” “same npm version,” and “same runtime reference” are separate assertions. Do not copy JupyterLab's identity mechanism into GM or silently reinterpret GM's accepted identity rules. Instead, prove the existing rules under two physical installations, symlink/workspace versus packed consumer, public entry point versus forbidden deep import, and cross-version contract packages. A useful diagnostic explains both logical contract identity and the source package/artifact that introduced it, rather than returning only “no provider.”

**Inference for release and authoring conformance.** Publish contract-owner packages with explicit supported entry points and test the **packed** provider/consumer combination. Test an optional dependency both absent and present; otherwise a source workspace can hide accidental reliance on the provider's bundled copy. Sharing every library is not automatically better: share identity-bearing contracts where required, retain private implementation dependencies where permitted, and document who coordinates security fixes and incompatible revisions. This is dependency inversion with an executable distribution contract, rather than a global singleton convention left to chance.

## 4. Gradle: cache validity and parallelism come from constrained state, not optimism

**Fact, Gradle 9.7.0.** Configuration Cache keys a candidate entry from requested work/environment and checks recorded configuration-input fingerprints. On a miss it calculates, serializes and then reloads the graph before execution; on a hit it skips configuration. The documented always-load path deliberately exposes serialization incompatibility on the first cache-enabled run. Therefore a hook executed during configuration cannot be assumed to run on every execution. [G1]

**Fact / documented limitation, Gradle 9.7.0.** Tasks may not use `Project` at execution time or reach into another task's state; inputs and injected services replace those accesses. Cross-task reference equality is not preserved, and shared mutable state belongs in a supported Build Service. Many violations fail with a report, but instrumentation cannot detect every bypass: an untracked external process result can produce an incorrect cache hit. Cache acceptance is consequently weaker than proof that arbitrary plugin code declared every input. [G2]

**Fact / scoped evolving profile.** Isolated Projects is **incubating in 9.7.0**. It constrains access to other projects' mutable state so project configuration can run safely in parallel. The 9.7 documentation records deterministic sequential Diagnostics mode introduced in **9.6.0**, and a fix to Kotlin build-script/precompiled-plugin editor support in IDEA-based IDEs. It also documents a current limitation: a lifecycle callback alone does not resolve a lazily resolved plugin onto the needed classloader scope. These are distinct: documented constraints, a recorded tooling fix, and a remaining supported-profile limitation. [G3]

**Fact / fixed over-invalidation, Gradle 9.6.0, released 2026-06-18.** Earlier configuration-cache entries were invalidated when certain system/environment project properties changed even when configuration never read the property. Release 9.6.0 added more precise tracking. The same release deprecates implicit parent-project property/method lookup because it creates hidden coupling and can make a typo resolve to an ancestor's value. This is a documented cache-granularity improvement and an intentional compatibility migration, not evidence of universal cache correctness. [G4]

**Inference for our stack.** Descriptor indexing, compatibility, policy admission, compiled plans and running instances are different cacheable products with different invalidators. Artifact identity alone does not capture changed grants or tenant configuration. Conversely, one unrelated environment change should not invalidate every tenant's otherwise identical compiled plan. Write down the semantic owner and dependency inputs for each existing/proposed cache before adding it; retain a reason for every invalidation and a bounded retention policy.

**Inference for DRY/SOLID.** Reuse an immutable convention or narrow service rather than a callback that mutates every child graph. A Host-global service bag makes dependencies invisible and frustrates both cache validity and independent testing. Prefer the current declared slots/run inputs and contract-owner fakes. A diagnostic profile can deliberately serialize validation to produce repeatable complete reports even if production preparation later uses parallel work; stable diagnostics and maximum parallelism are separate goals. Do not import Gradle's serialization machinery or bytecode instrumentation into the neutral cores.

## 5. Jenkins: shared APIs reduce duplication while increasing compatibility blast radius

**Fact.** Jenkins's default parent-first loading helps upstream and downstream APIs resolve to the same `Class` objects. It also allows an upstream bundled library to shadow a plugin's preferred version. `pluginFirstClassLoader` or `maskClasses` can work around some collisions, but duplicating types that cross a public method signature causes linkage errors, and masking must respect transitive linkage. Wrapper plugins can share libraries; naming incompatible major versions separately permits coexistence but creates security-maintenance obligations for each supported line. These are documented class-space tradeoffs, not proof that every plugin gets independent isolation. [K1]

**Fact.** Mandatory missing dependencies disable the plugin. Optional dependencies allow the plugin to load, but touching their unavailable classes can still throw `NoClassDefFoundError`. Jenkins can disable a failed extension after `LinkageError` and continue discovering others. Its documentation even distinguishes installed/disabled/uninstalled states before versus after restart: installation state and actual class availability are different observations. [K2]

**Report, 2025-05-02, Jenkins 2.504.1 / plugin manager 2.13.0.** Issue #797 reports controller startup failure after dependency version conflicts despite attempts with “latest” selection options. A project member recommends explicit versions, reviewable updates, and verifying that the assembled image starts before publishing. The reporter acknowledges legacy configuration that did not preserve plugin versions in each image. This supports treating resolved installation state as a separate artifact; the thread does not establish a fixed resolver defect or a universal failure of those selection flags. [K3]

**Fact.** Jenkins counters integration cost with a plugin BOM and compatibility testing. The BOM repository regularly tests forthcoming core/plugin combinations, recommends matching the BOM line to the chosen core baseline, and warns that dependency analysis sees Java binary references rather than every behavioral requirement. PCT generates a compatibility matrix, taking exact plugin versions from an assembled WAR. These are valuable positive protections; a passing selected matrix is not evidence that all marketplace combinations work. [K4–K5]

**Inference.** A contract suite should run against every supported implementation, and a **composition** fixture should test actual resolved packages together. Neither substitutes for the other. Required runtime components invisible to static import analysis must remain explicit in the selected profile. Preserve exact locks/digests and assembly evidence while keeping general onboarding instructions current; “latest” is a discovery/update policy, not an installation identity. For impact analysis, index reverse dependencies and show the affected closure when a shared contract changes. Measure maintenance work and upgrade failure rate, rather than assuming DRY shared libraries remove coordination costs.

## 6. Chrome Manifest V3: code identity, privilege, and durable state are separate boundaries

**Fact.** Content scripts share page DOM access but use isolated JavaScript worlds, avoiding variable conflicts with page scripts and other extensions. They have only a restricted direct extension-API surface; privileged operations use messaging. Web-accessible resources are also exposed to scripts on the relevant site. This is a concrete isolation mechanism with deliberately limited scope, not a claim that DOM input or resources became trustworthy. [C1]

**Fact.** Chrome explicitly treats content scripts as less trustworthy than the extension service worker. Message receivers must assume attacker-crafted input and limit privileged operations. Messaging is a boundary for data validation and authority, not a generic “invoke any method” tunnel. [C2]

**Fact / versioned lifetime evolution.** MV3 workers may be terminated after inactivity or long-running operations, and globals disappear on shutdown. The lifecycle guide records changes by Chrome version: **114** changed port/timer behavior, **116** extended lifetime through WebSocket traffic, and other APIs have their own rules. The migration guide warns that asynchronously registering an event listener can miss the event that started the worker; registration belongs at top level. These are intentional lifecycle constraints with version-sensitive improvements, not an unresolved “worker randomly dies” defect. [C3–C4]

**Inference for our Host boundary.** A declared port is architectural separation; it becomes a security boundary only when the selected execution environment enforces it. A process/worker/Wasm profile still needs validated messages and scoped grants. Keep tenant, caller, operation, artifact/generation and grant context distinguishable at admission; do not let an extension name or familiar capability ID stand in for authority. Test restart with empty globals and duplicate delivery if a durable event source permits retries. Stable descriptor metadata may support indexing without executing plugin factories, but executable loading must remain an explicit Host-owned phase.

## 7. Actions useful now, without building a runtime

These are research-derived review/qualification recommendations. Check current coverage first; extend the existing CMS, conformance kit and qualification matrix instead of creating duplicate semantic owners.

1. **Create an evidence-to-fixture map.** Name each ecosystem failure mode, the current local rule that addresses it, the exact test/diagnostic proving that rule, and any uncovered case. Include duplicate package copies, deep imports, required/optional absence, duplicate registration, stale observation, and config/grant changes with unchanged artifact identity. Keep observational reports distinct from reproduced local failures.
2. **Specify extension-point discipline in author-facing terms.** For each public port/contribution point record its owner, cardinality, phase, duplicate behavior, ordering, error attribution, compatibility and lifetime. Avoid ceremonial interfaces for private implementation details. Link the normative owner instead of repeating its semantics across guides.
3. **Qualify distributions and combinations.** Preserve existing dual-compiler/module-resolution checks; add packed-consumer and independently released provider/consumer combinations where absent. A workspace compile is insufficient evidence for runtime identity or published export correctness. Test producers as well as consumers when replacement implementations are part of the promise.
4. **Make admission/indexing claims precise.** Record what can be read inertly, which stage executes code, which stage validates compatibility, and which stage grants authority. Require attributable rejection before construction where the selected profile permits it. Index by stable accepted identities; maintain reverse-edge attribution for impact explanations. Do not advertise cached trust decisions without their policy/configuration inputs.
5. **Expose deterministic diagnostics and bounded failure.** Check canonical ordering across input permutations and repeated runs; report the offending declaration and affected dependent closure. Distinguish rejected descriptor, incompatible contract, absent optional feature, failed activation, stale generation and pending restart. Avoid best-effort discovery that silently drops a required capability.
6. **Publish separate resource envelopes.** Before asserting scale, vary the dimensions in section 1 independently and in credible combinations. Record cold/warm indexing and preparation, construction time, diagnostics time/bytes, peak and retained memory, cache hit/miss reasons, tenant cross-contamination checks, editor p50/p95 response and compiler instantiations, and retention after repeated replacements. Record exact runtime/compiler/artifact versions, graph shape and machine conditions.
7. **Measure author and maintainer cost.** Have independent authors add a provider, replace an implementation, handle an optional capability, consume another feature, and upgrade a contract. Count changes outside the owning feature, undocumented conventions, duplicated rules, time to an actionable diagnostic, migration effort and matrix-maintenance cost. A fast runtime with fragile distribution or slow editor feedback is not a successful extensibility system.

The comparison supports retaining GM's pure declaration/immutable-plan boundary, EF's neutral artifact/trust/custody/protocol responsibilities, and a product Host's operational ownership. It does not approve any new admission cache, identity policy, compatibility semantics or replacement profile. Any genuinely unresolved alternative still needs the repository's decision process and scoped estimates; this memo deliberately supplies evidence and qualification questions rather than inventing a competing runtime.

## Primary-source ledger

All sources retrieved **2026-10-21**. Unversioned pages/repository branches may move. Dates shown are source publication/event dates where available; historical versions are evidence pins only.

- **B1:** [Backstage Plugin Modules](https://backstage.io/docs/backend-system/architecture/modules/) — current docs snapshot; startup ordering, one-plugin scope, library/implementation dependency distinction.
- **B2:** [Backstage Backend Plugin Extension Points](https://backstage.io/docs/backend-system/architecture/extension-points/) — current docs snapshot; interface discipline, duplicates, factory attribution and breaking-change guidance.
- **B3:** [Backstage Threat Model](https://backstage.io/docs/overview/threat-model/) — current living model; explicitly scopes backend protection to **1.24+**.
- **B4:** [Backstage Release & Versioning Policy](https://backstage.io/docs/overview/versioning-policy/) — current policy snapshot; package/release separation and producer exception.
- **J1:** [JupyterLab Develop Extensions](https://jupyterlab.readthedocs.io/en/stable/extension/extension_dev.html) — retrieved page title **4.6.4**; token/packaging semantics, prebuilt tradeoffs.
- **J2:** [JupyterLab first-person prebuilt-extension failure and diagnosis](https://discourse.jupyter.org/t/prebuilt-extension-error-no-provider-for-jupyterlab-coreutils-isettingregistry/28104) — **2024-09-04**, JupyterLab 3 extension migration; no new platform code fix established.
- **G1:** [Gradle 9.7.0 Configuration Cache](https://docs.gradle.org/9.7.0/userguide/configuration_cache.html) — versioned mechanics.
- **G2:** [Gradle 9.7.0 Configuration Cache Requirements](https://docs.gradle.org/9.7.0/userguide/configuration_cache_requirements.html) — declared isolation and incomplete automatic detection.
- **G3:** [Gradle 9.7.0 Isolated Projects](https://docs.gradle.org/9.7.0/userguide/isolated_projects.html) — incubating status, versioned recent changes, deterministic diagnostic mode and classpath limitation.
- **G4:** [Gradle 9.6.0 release notes](https://docs.gradle.org/9.6.0/release-notes.html) — **2026-06-18**; narrower invalidation and parent-lookup deprecation.
- **K1:** [Jenkins Dependencies and Class Loading](https://www.jenkins.io/doc/developer/plugin-development/dependencies-and-class-loading/) — current developer-guide snapshot, not a release-specific claim.
- **K2:** [Jenkins Optional Dependencies](https://www.jenkins.io/doc/developer/plugin-development/optional-dependencies/) — current guide snapshot; failure and restart-state distinctions.
- **K3:** [Jenkins plugin-installation-manager-tool issue #797](https://github.com/jenkinsci/plugin-installation-manager-tool/issues/797) — report **2025-05-02**, Jenkins **2.504.1**, plugin manager **2.13.0**; member recommendations **May 2–3, 2025**.
- **K4:** [Jenkins plugin BOM repository](https://github.com/jenkinsci/bom) — current README snapshot; baseline-specific curated versions and PCT.
- **K5:** [Jenkins Plugin Compatibility Tester](https://github.com/jenkinsci/plugin-compat-tester) — current README snapshot; exact assembled WAR as matrix input.
- **C1:** [Chrome Content Scripts](https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts) — current page; displayed last-update **2012-09-17** predates later content and is not a complete behavior-version pin.
- **C2:** [Chrome Message Passing](https://developer.chrome.com/docs/extensions/develop/concepts/messaging) — displayed last-update **2025-12-03**.
- **C3:** [Chrome Extension Service Worker Lifecycle](https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle) — displayed last-update **2023-05-02**, explicit subsections for Chrome **105, 109, 110, 114, 116, 118, 120**; use behavior-specific version gates.
- **C4:** [Chrome Migrate to a Service Worker](https://developer.chrome.com/docs/extensions/develop/migrate/to-service-workers) — displayed last-update **2023-03-09**; MV3 general availability **Chrome 88+**, synchronous listener requirement.

Local context read: `brief.md`; prior platform/systems memos; GM `docs/guides/module-authoring.md` and `docs/qualification/growth-and-release-readiness-review.md` at the worktree baselines recorded in the brief. Their accepted contracts, not this research, own current project semantics.
