---
id: research.specialist-framework-comparison
type: research
status: active
owner: architecture
summary: Dated primary-source comparison of specialized extension frameworks with concrete contracts, tradeoffs and unadopted transfer hypotheses.
---

# Specialist Plugin Framework Evidence 2026-11-05

Research date: **2026-11-05 UTC**. Status: **non-normative research; every transfer hypothesis remains unadopted**. Author scope: independent source researcher. No investigated frameworks were installed; no upstream tests, experiments, product code, deployment, or remote mutations were run. The [specialist source ledger](evidence/plugin-frameworks-20261105-specialist-sources.json) retains the structured evidence. Immutable links identify inspected source; current documentation remains a dated observation.

## Finding and authority

The useful comparison is between actual extension units and their promises. Pluggy supplies hook dispatch; PF4J combines Java artifact lifecycle with typed extension discovery; Fastify/Avvio composes a boot tree and HTTP contexts; Hapi provides plugin registration realms and named server/request extension phases; Nest composes dependency-injection modules and providers; Drupal separates installed modules, hook implementations, and plugin-type definitions/instances. Calling all these units a plugin would obscure which owner chooses a provider, who may modify behavior, and what lifecycle completion means. The case evidence below supports those distinctions; it does not rank specialists above other systems.

Existing project authority remains unchanged: GM owns neutral declarations, cardinality/binding/graph semantics and diagnostics; EF owns neutral extension/artifact/trust/protocol/conformance concerns; products own concrete extension points, grants, loading, readiness, canonical state, lifecycle policy and domain invariants; the existing execution owner retains physical custody. Static composition plus controlled restart is confirmed. This research proposes no runtime Host, public SPI, new container, service locator, language migration, generic hot swap, admission owner, or new implementation.

### Evidence classes

- **Documented contract:** primary maintained documentation, with its version/moving-page caveat.
- **Inspected source:** code actually read at the full commit below; reasoning about its control flow is identified separately.
- **Inspected unrun test:** an upstream test read as intent and counterevidence; no execution result is claimed.
- **Historical report/fix:** dated upstream changelog, release note, or change record; repaired behavior stays repaired.
- **Inference:** a conclusion from inspected mechanisms, with scope and uncertainty.
- **Proposed experiment:** a small falsifier described only; not executed or adopted.

## Release and runtime pins

Tag identity was resolved with read-only `git ls-remote`; annotated tags use the peeled commit, not the tag-object SHA. Source/package metadata was also read. This proves the inspected tag/source relationship, not equivalence with every published package byte or platform build.

| Case | Inspected release tag and exact source commit | Runtime / actual units | Release relationship and caveat |
| --- | --- | --- | --- |
| SF-PLG | `pytest-dev/pluggy` `1.7.0`, `4c7f6365f2dde09c11e72db67d0f615231d64c19` | Python; plugin object/module, hookspec, hookimpl, hook caller | Changelog dates 1.7.0 to 2026-10-14; PyPI upload observed 2026-10-15. Source requires Python >=3.10. `stable` documentation currently renders a fallback development-looking version string; exact tag docs/source settle claims. [PLG-REL] [PLG-PYPI] [PLG-PKG] [PLG-DOC] |
| SF-PF4J | `pf4j/pf4j` `release-3.16.1`, `6ffa261f0e28f88a9115432482cad64979715a0d` | Java/JVM; descriptor/artifact, optional lifecycle Plugin class, extension-point interface, extension class | GitHub release published 2026-11-03, non-prerelease; parent POM version 3.16.1, compiler release 8. Runtime/dependency qualification was not performed. [PF4J-REL] [PF4J-PKG] |
| SF-FST | `fastify/fastify` `v5.12.8`, `0c7413a8332a7892e12dcc351c27a190fefc0053`; `fastify/avvio` `v9.3.1`, `dc35b4af2bd1d5d258d4f20e92d6087064390c50` | Node.js; plugin function/thenable, boot-tree node, encapsulated HTTP instance, phase hook | Fastify release 2026-11-02; Avvio release 2026-10-10. Fastify declares Avvio `^9.0.0`: 9.3.1 is a compatible separately inspected release, not a claim about an installed lockfile. Fastify 6 alpha tags are excluded. [FST-PKG] [FST-REL] [AVV-PKG] [AVV-REL] |
| SF-HAPI | `hapijs/hapi` `v21.4.13`, `f2837a006535a6fbbcf33692067c1bd497ba8124` | Node.js; plugin object, registration-specific realm, named extension phase | Tag and package version agree. Package engine says >=14.15.0; that metadata is not a recommendation or platform qualification. GitHub releases-by-tag endpoint returned 404; no release publication date is inferred. [HAPI-PKG] |
| SF-NEST | `nestjs/nest` `v12.3.3`, `59f33793c616eaf9669e8b81a35aa5f31accc5b4` | TypeScript/Node.js; module metadata, DI token/provider wrapper, application context | `packages/core/package.json` is 12.3.3 and ESM; repository-root package.json remains 12.0.0. The v12 migration guide is relevant. GitHub release endpoint returned 404; no release publication date is inferred. [NEST-PKG] [NEST-MIG] |
| SF-DRUPAL | `drupal/drupal` `11.4.11`, `76deda03b09b57d76941e2d30e6dade35e92a14a` | PHP/Symfony; installed module, hook implementation/listener, plugin type manager, definition ID and configured instance | `Drupal::VERSION` is 11.4.11; core Composer metadata requires PHP >=8.3.0. Drupal 12 beta/11.5 beta tags are excluded. GitHub release endpoint returned 404; tags/source, not a GitHub release record, anchor this case. [DRUPAL-PKG] [DRUPAL-VER] |

## SF-PLG — Pluggy: a hook is a contract, and result cardinality is a choice

**Question:** How can independent authors change a useful behavior without overriding internals, and which guarantees follow from a validated hook signature?

**Documented contract.** A host owns the hookspecs and invokes hook callers; a plugin may implement only the hooks it needs. Ordinary dispatch gathers non-None results; `firstresult` stops at the first non-None result. Ordering defaults to reverse registration, with `tryfirst`, `trylast`, and wrappers modifying the chain. Hookspec argument selection permits older implementations to accept only the arguments they need. These are dispatch semantics, not a general artifact/dependency/resource lifecycle. [PLG-DOC] [PLG-DOCSRC]

**Inspected source.** `PluginManager.register` rejects duplicate names/objects and validates discovered implementations before its ordinary registration pass. `_verify_hook` checks implementation arguments against the spec, rejects non-generator wrappers, rejects simultaneous old/new wrapper flags, and disallows wrappers on historic hooks; `check_pending` rejects unknown hooks unless optional. Entry-point discovery checks group/name/already-registered/blocked conditions before `ep.load()`. Static descriptor inspection avoids evaluating ordinary properties while scanning. This reduces avoidable discovery side effects but does not make importing a selected entry point inert. [PLG-MGR]

`HookCaller._add_hookimpl` separates wrapper/nonwrapper regions and applies the priority flags. `__call__` copies the current implementation list; `_multicall` traverses it in reverse. Thus one call has a bounded membership snapshot even if a hook registers another plugin. `_apply_defaults` merges hookspec defaults with explicit caller values; execution only passes accepted implementation parameters. In 1.7, adding an optional spec argument can preserve existing callers, while explicit call values now take precedence over implementation defaults. These compatibility rules do not validate domain postconditions or authorize an implementation. [PLG-CALLER] [PLG-EXEC] [PLG-REL]

**State and adverse mechanisms.** Historic dispatch retains argument/callback history and replays it to a newly registered implementation. The source stores supplied objects; it is not a durable event log, serialized snapshot, resource budget, or exactly-once effect protocol. Inference: retaining a large/mutable object or replaying a side-effecting hook can change memory/effect behavior; the host must bound and define that use. `unregister` removes hook memberships and the name mapping; this inspected path does not dispose resources an implementation acquired elsewhere. An already captured call list or external reference is a different lifetime. [PLG-CALLER] [PLG-MGR]

**Repaired history and remaining limit.** 1.7.0 records fixes for validation failures leaving partial registrations, unregister removing only one implementation, and mismatched unregister name/object identities. The current `register` still explicitly notes a narrower reentrant historic-replay case: user code may add a spec between passes, and later validation can then leave partial registration. This is a documented source caveat, not evidence that the ordinary validation repair failed. Upstream `test_register_validation_failure_leaves_no_state` and `test_register_verifies_spec_added_by_historic_replay` were inspected, not run. [PLG-REL] [PLG-MGR] [PLG-TEST]

**No-fork fit and transfer hypothesis — unadopted.** Product contract owners could explicitly distinguish contribution-list hooks, short-circuit selection, and around-call wrappers, documenting mutation/error/ordering semantics per seam. GM remains owner of neutral provider cardinality and graph/binding validation; a product hook result protocol is not automatically GM selection. EF could retain compatibility/conformance examples only after a real shared boundary needs them. Execution cleanup remains with its owner. The analogy breaks for asynchronous effects, authorization, state custody, or a promised unique provider: “first non-None” is not proof that exactly one candidate exists.

**Confidence and smallest falsifier.** High confidence in the named source paths; no installed-package, async, security, memory, or scale qualification. **Proposed experiment, unexecuted:** one historic hook whose replay adds a new spec and one later invalid implementation; inspect whether the manager is untouched, partially registered, or rejected with recovery possible. Separately, reversing two equal-priority registrations should expose whether a proposed product seam accidentally relies on discovery order. A failed result would narrow the seam, not justify a new universal manager.

## SF-PF4J — PF4J: descriptor closure, extension discovery, and runtime success differ

**Question:** What is gained by separating an installable plugin from the typed extensions it contributes, and how does dependency closure interact with lifecycle entrypoints?

**Documented contract.** Extension points are application-defined interfaces/abstract classes. An `@Extension` class implements a point; annotation processing publishes indexes/services, so discovery need not manually enumerate every class. A plugin can omit a Plugin subclass if no lifecycle callbacks are needed. Named descriptor dependencies, optional dependencies, version requirements, lifecycle states and classloading strategy are separate mechanisms. Only STARTED plugins normally contribute discoverable extensions. [PF4J-DOCEXT] [PF4J-DOCLIFE] [PF4J-DOCCL]

**Inspected source.** `DependencyResolver.resolve` constructs dependency/dependent graphs, reverse-topologically sorts required edges, detects missing dependencies and checks version constraints. Optional edges are deliberately excluded from that required graph. `AbstractPluginManager.loadPluginFromPath` rejects a second loaded plugin with the same ID. `isPluginValid` checks the system-version requirement, but the default `0.0.0` system version is a bypass sentinel; metadata fields enforce only their configured policy. [PF4J-RESOLVER] [PF4J-MGR]

`AbstractExtensionFinder.find` filters plugin state and Java `isAssignableFrom`, constructs wrappers, and sorts by ordinal; `ExtensionWrapper.compareTo` compares ordinal only. Inference: equal ordinals alone supply no stable total order contract. A wrapper lazily memoizes its own instance; `DefaultExtensionFactory.create` constructs a fresh instance, so the observed wrapper cache must not be relabeled a global singleton policy. When optional-extension checks are enabled, metadata inspection checks required plugins before loading that extension class. [PF4J-FINDER] [PF4J-WRAPPER] [PF4J-FACTORY]

**Good failure handling and entrypoint-specific counterevidence.** `startPlugin(id)` recursively starts dependencies, rejects a dependent when a required dependency does not reach STARTED, and allows an optional dependency failure with a warning. The inspected unrun test `shouldFailToStartPluginWhenRequiredDependencyFailsToStart` checks that path. However, `startPlugins()` loops the resolved list and calls `doStartPlugin()` directly. **Inference, not executed failure:** because `doStartPlugin` records a failed dependency then returns, the bulk path appears not to recheck the same runtime-success condition before a later dependent starts. A sorted descriptor graph is not itself evidence that dependencies started successfully. This path distinction is the most valuable falsifier in this case. [PF4J-MGR] [PF4J-TEST]

**Cleanup, compatibility and trust.** Stop methods invoke plugin callbacks and publish states. Unload traverses dependents, removes manager entries and closes a Closeable classloader; its source can proceed after recording a stop exception. Closing a URLClassLoader does not revoke external object references, terminate plugin-created threads, or establish completion of domain effects. `PluginClassLoader.loadClass` chooses system/framework special cases and configured application/plugin/dependency resolution; per-plugin loaders help dependency resolution, not hostile-code authorization. The official troubleshooting guide explicitly identifies duplicate API classloaders as a reason a nominally matching extension is not assignable. [PF4J-MGR] [PF4J-CL] [PF4J-TROUBLE]

**Repaired history.** Release 3.16.1 (2026-11-03) fixes inherited `@Extension.plugins` being overlooked. The inspected `asm.ExtensionInfo.load` now walks superclasses until it finds the annotation; unreadable extension bytecode is skipped, with a distinct superclass-default path. Preserve this repair as metadata/inheritance counterevidence, not a current missing-dependency defect. [PF4J-REL] [PF4J-ASM]

**No-fork fit and transfer hypothesis — unadopted.** Separating artifact identity, extension-point interface, implementation contribution, and lifecycle readiness is useful for EF/product vocabulary. GM already owns the graph: no PF4J manager is proposed. Product readiness must decide whether a dependency is usable; execution must verify retirement and retain cleanup uncertainty. Ordinal ordering could suit a UI contribution list, but would be a weak substitute for explicit provider selection or before/after constraints. Java type identity/classloading issues are an analogy for JS identity-bearing packages, not a reason to reproduce a JVM loader in TypeScript.

**Confidence and smallest falsifier.** High source confidence, lower confidence in any whole-system lifecycle conclusion; no JVM run, thread/resource measurement, optional-cycle test, or package-install verification. **Proposed experiment, unexecuted:** two disposable plugins, A.start throws and B requires A; compare `startPlugin("B")` with `startPlugins()` and record whether B.start ran, state transitions and retained failure. One independent invocation counter is enough. Any bulk-path protection outside the inspected flow would falsify the inference. No implementation or adoption follows from this proposal.

## SF-FST — Fastify/Avvio: scoped composition and explicit boot completion

**Question:** How much customization can a small boot tree and lexical registration scope provide, and what does a readiness timeout actually mean?

**Documented contract.** Fastify `register` composes plugins; descendants inherit selected decorators/hooks while sibling/ancestor visibility is constrained. `fastify-plugin` can deliberately alter that encapsulation. Avvio supplies `use/after/ready/close`: ready observes the boot tree; after attaches a stage/error boundary; nested plugins must finish before subsequent queued work proceeds. These are boot and HTTP composition mechanisms, not an artifact-admission or security boundary. [FST-DOC] [FST-DOCSRC] [AVV-DOC]

**Inspected source.** `lib/plugin-override.js::override` first checks metadata, then normally creates `Object.create(old)` and new child hook/request/reply/parser/schema state; the skip-override path reuses the parent. It also maintains inherited registered-plugin metadata. `plugin-utils::registerPlugin` checks async/callback shape, Fastify version, required decorators, and named dependencies. `checkDependencies` checks names already visible in that context; it does not topologically solve arbitrary future declarations. This makes registration order visible and fail-fast but places closure authoring with the registering application. [FST-OVERRIDE] [FST-UTILS]

`Avvio.Boot._addPlugin` queues work on the current node with concurrency one, rejects root/parent registration after boot/load, and derives a child timeout from the parent's remaining interval. `_loadPlugin` manages current context and lets Fastify override the server instance. `Plugin.finish` waits for the nested queue before marking a successful node loaded. These source paths explain the documented “await register finalizes the subtree” constraint and why late registration cannot be treated as seamless dynamic replacement. [AVV-BOOT] [AVV-PLUGIN]

**Lifecycle and adverse mechanism.** `Plugin.exec` installs a timer that calls done with a timeout error; a completed guard ignores later done calls. It still invokes the original function/promise and has no cancellation action in that path. **Inference:** a timeout settles boot observation while late user code can still finish an external acquisition/effect. This is not evidence that Avvio promised cancellation; it is a boundary the consuming product must not invent. Fastify's source checks reject common mixing of callback and async styles, reducing double-completion confusion. [AVV-PLUGIN] [FST-UTILS]

Avvio `onClose` prepends cleanup to the close queue; `close` waits for ready and then processes it. The unrun `close order` test demonstrates intended reverse registration cleanup. Fastify adds `preClose` before listener shutdown and resources' `onClose` afterward; 5.12.8 also accepts objects implementing `Symbol.asyncDispose` or `Symbol.dispose` at `addHook("onClose", ...)`. The normal HTTP documentation describes drained requests at onClose. Source also contains forced connection destruction and serverFactory branches, so normal drain wording must not become a cross-profile promise of natural completion for every request, WebSocket, timer or effect. [AVV-BOOT] [AVV-TEST] [FST-MAIN] [FST-HOOKDOC] [FST-REL]

**Encapsulation and no-fork tradeoff.** Prototype scopes and copied framework-owned lists are effective authoring boundaries; they are not separate processes or permission grants. Sharing a mutable object intentionally through a decorator still shares that object. Exporting through skip-override is a powerful composition choice with wider visibility. A plugin function receives a framework instance capable of broad setup; this is materially different from giving an extension a narrow consumer-owned port. Compatibility metadata tests host version/decorator/name requirements; it does not independently prove behavioral substitutability. [FST-OVERRIDE] [FST-UTILS]

**Transfer hypothesis — unadopted.** Product authoring could expose explicit subtree/profile visibility and one awaited preparation boundary before controlled restart becomes active. GM retains deterministic declaration/graph ownership; a plugin registration tree should not replace its compiler or silently choose providers by load order. A tiny disposable-resource adapter belongs with the current resource owner if a real seam needs it; it creates no universal plugin interface. EF may preserve timeout/cleanup conformance questions; physical cancellation/custody remains execution-owned.

**Confidence and smallest falsifier.** High on inspected JS paths, no installed Fastify/Avvio pair or server run. **Proposed experiment, unexecuted:** a plugin awaits a manually released acquisition longer than a small boot timeout; after ready rejects, release the acquisition and observe whether an independent side-effect counter changes and whether registered cleanup has actual custody. It would falsify any transfer claim equating a readiness deadline with cancellation. A sibling-decorator visibility fixture would separately check any proposed authoring scope.

## SF-HAPI — Hapi: registration realms and phase-specific ordering

**Question:** Can named plugin dependencies and restricted settings scope make composition explicit without claiming that each plugin has an independent runtime?

**Documented contract.** A plugin supplies `register(server, options)` and a name; `multiple` permits repeat registration and `once` skips repeats. Requirements can constrain Node/Hapi versions. `server.dependency` requires named/versioned registrations before initialization/start, and its optional after callback runs at onPreStart. Extension methods on a phase can declare before/after plugin names; otherwise addition order applies. Request extensions can target a plugin's routes with `sandbox: "plugin"`. Here sandbox means hook/settings scope, not execution security. [HAPI-DOC]

**Inspected source.** `Server._clone` creates a new Server referencing the same core and a new realm. `register` serially normalizes items, creates that clone, checks requirements/repetition, records registration metadata, attaches declared dependencies, then awaits user registration. `_validateDeps` checks required names and versions before initialization. `Ext.add` passes before/after/group plus a sequence number to `@hapi/topo`; `Ext.combine` combines route, server and realm extensions. `_ext` distinguishes realm-only request extensions from core-wide request/server phases. [HAPI-SERVER] [HAPI-CORE] [HAPI-EXT]

The exposed API is separate from local realm settings: `server.expose` writes into core plugin properties, and scoped package names are stripped by default unless configured otherwise. This is a documented/configurable naming behavior, not a new independent capability identity system. Inference: a product analogy should retain explicit identity and export rules, rather than assume a fresh realm also creates a unique exported service instance. Multiple registrations likewise do not imply multiple independently versioned plugin identities. [HAPI-SERVER] [HAPI-DOC]

**Good protections and adverse mechanisms.** Initialization rejects attempts while registration is pending, validates dependencies before onPreStart, and changes the core phase to invalid when initialization fails. Stop invokes onPreStop, stops listening/caches/controlled servers, then onPostStop, with invalid phase on failure. Its default 5-second network stop timeout may destroy sockets; this is an explicit connection policy, not proof of arbitrary plugin-effect completion. [HAPI-CORE]

**Inference, not a reproduced defect:** registration metadata is installed before `plugin.register` is awaited, and the inspected finally block decrements the registration counter without restoring earlier route/exposure/resource changes. A rejected register therefore cannot be assumed to leave an untouched candidate merely because the registration promise rejects. This is relevant to cold candidate construction and controlled restart. It does not mean Hapi promised transactional plugin registration. Upstream tests for missing dependency, duplicate registration, and allowed `multiple` registration were read, not run; they provide concrete counterevidence to a claim that Hapi has no dependency or cardinality protection. [HAPI-SERVER] [HAPI-TEST]

**No-fork fit and transfer hypothesis — unadopted.** Product extension owners could name phases and state which hooks affect the current contribution subtree versus all product routes. GM could evaluate a concrete need for relative order constraints under its existing authority; a Hapi before/after group is not automatically a required service dependency. EF could retain version and lifecycle conformance cases. Product candidate construction must own disposal/recovery for partial setup; execution owns actual socket/process custody. Importing Hapi realms, server.plugins or a second manager would not advance those existing owners.

**Confidence and smallest falsifier.** High in register/core/Ext control flow; Topo itself, auth schemes and every extension return contract were not audited. No HTTP/lifecycle run. **Proposed experiment, unexecuted:** a named plugin exposes one value and acquires one disposable handle, then throws. Observe registry/exposure/handle state and a repeat registration on the same candidate versus a freshly constructed candidate. If Hapi or an owning adapter rolls all three back, that falsifies the narrow partial-setup concern. A separate tiny cycle fixture would test phase ordering, not durable state closure.

## SF-NEST — NestJS: module visibility, provider selection and lifecycle are separate contracts

**Question:** What makes modular provider replacement easy, and where do DI scope and lifecycle orchestration stop short of extension safety?

**Documented contract.** Modules declare providers/controllers/imports/exports; exports form their injectable public API. Custom providers support values, classes, factories and aliases; dynamic modules package configurable declarations. These provide practical no-fork substitution seams. Default/scope choices determine instance lifetime; request-scoped classes do not receive application lifecycle hooks. `ModuleRef` offers provider lookup, but that optional escape is not a reason to introduce a service locator in our architecture. [NEST-DOC] [NEST-CUSTOM] [NEST-DYNAMIC] [NEST-LIFEDOC] [NEST-MODREF]

**Inspected source.** `Module` stores providers by injection-token Map and exports by Set; `validateExportedProvider` rejects an export absent from its providers/imported modules. `Injector.lookupComponentInImportsSync` traverses visible imports and stops at the first direct matching exported provider. Consequently the ordinary injection path is not a multi-provider reduction; ambiguous same-token imports have order-sensitive selection behavior in this code path. Other APIs may deliberately return multiple instances; do not generalize one path to all lookup methods. `ByReferenceModuleOpaqueKeyFactory` attaches an own-reference module ID; static/dynamic module identity therefore includes reference identity, not just a convenient class name. [NEST-MODULE] [NEST-INJECTOR] [NEST-ID]

**Lifecycle improvements and important costs.** `callModuleInitHook` groups static dependency-tree instances by hierarchy level, awaits levels in sequence, and runs members of a level concurrently; the module's own hook follows. Destroy reverses level order and uses Promise.allSettled, logs provider failures, then catches/logs a module-hook failure. The grouping helper skips non-static dependency trees and includes static transient instances. This is more precise than either “all hooks are serial” or “request scope is cleanup.” [NEST-INIT] [NEST-DESTROY] [NEST-GROUP]

`NestApplicationContext.shutdown` coalesces concurrent callers onto one in-flight promise. The sequence waits for initialization to settle even on failure, prepares close, runs destroy/before-shutdown/dispose/shutdown hooks, then unsubscribes signals. This is valuable protection against duplicate concurrent teardown. **Inference:** successful orchestration can coexist with logged destroy failures; it is not a receipt that every resource was released. The inspected tests explicitly expect rejecting destroy hooks not to throw and remaining providers still to run. That continuation is a deliberate cleanup policy with a tradeoff, not a newly demonstrated defect. [NEST-CONTEXT] [NEST-DESTROY] [NEST-TEST]

**Compatibility and trust.** The v12 migration guide calls out changed hierarchy-based hook ordering and ESM packaging/runtime implications. It also records a version-specific optional-constructor inheritance repair in 12.1; that historical issue is not asserted against 12.3.3. Version metadata is distinct from contract compatibility. A module export boundary governs injector visibility in the same application realm; imports and constructors still execute trusted application code. Neither a DI container nor request scope grants hostile-code isolation, authorization, cancellation or deterministic external cleanup. The last sentence is a scoped inference about these mechanisms, not an audit of every Nest security facility. [NEST-MIG] [NEST-PKG] [NEST-MODULE]

**Transfer hypothesis — unadopted.** Product-owned narrow factory/provider records and explicit exports could improve authoring if existing GM declarations cannot already express the real seam; first subtract what GM already owns. GM keeps token/cardinality/graph semantics; EF can retain compatibility and rejecting cleanup cases; products decide whether a failed cleanup blocks readiness/restart or becomes tracked debt; execution observes physical retirement. Do not transplant Nest, global modules, reference-key identity or ModuleRef into the product to obtain modularity. The analogy breaks for immutable canonical plan IDs, independently distributed artifacts and security boundaries.

**Confidence and smallest falsifier.** High for the selected core paths; not a Nest application, package-consumer, compiler or scalability qualification. **Proposed experiment, unexecuted:** three providers in a dependency chain, with one destroy rejection and one independently counted handle; call close twice concurrently. Record per-hook invocation count/order, close result, logged error and physical handle state. This can falsify any claim that coalesced close implies cleanup success. A two-import same-token probe would independently test provider-selection assumptions.

## SF-DRUPAL — Drupal: deep alteration is powerful because it has several distinct extension systems

**Question:** How can a mature modular product expose substantial no-fork customization while retaining explicit type/discovery/install semantics, and what costs come with alteration?

**Documented contract.** Drupal modules can implement hooks defined by core or other modules; the hook owns parameters/results. OOP Hook attributes support multiple implementations with documented exceptions and procedural-only install/update hooks. Hook ordering starts from module weight/name and can be altered explicitly. Separately, plugin types define their own interfaces, discovery metadata and managers. Attribute-based plugin discovery arrived in 10.2; annotation support depends on the specific manager/version. These are not one universal plugin lifecycle. [DRUPAL-HOOKDOC] [DRUPAL-HOOKATTR] [DRUPAL-PLUGDOC]

**Inspected source.** `DefaultPluginManager` gets cached definitions or discovers them, processes each definition, applies the configured alter hook, and removes definitions from missing module providers. `clearCachedDefinitions` clears its definition/cache layers. `BlockManager` concretely selects `Plugin/Block`, `BlockPluginInterface`, Block attribute/annotation classes, the `block` alter hook, and a cache key; it separately sorts labels/categories for its UI. `ContainerFactory.createInstance` chooses the selected definition/class and either calls its container-aware factory or constructs it directly. A discovery definition, a type's chosen implementation, and a configured instance therefore have distinct responsibilities. [DRUPAL-MANAGER] [DRUPAL-BLOCK] [DRUPAL-FACTORY]

`AttributeClassDiscovery.getDefinitions` scans declared PSR-4 locations with file caching and places results under definition IDs; it treats missing optional dependencies specially so unavailable classes can be rediscovered later. Inference: directory/namespace discovery and caching are authoring/performance mechanisms, not proof of inert metadata or security. Reflection/autoload remains executable PHP behavior. It would also be premature to claim duplicate IDs are rejected across every plugin type from this inspected map shape alone. [DRUPAL-DISCOVERY]

**Hooks, order and deliberate permissiveness.** `HookCollectorPass.process` gathers implementations during container compilation, registers services, and calculates ordering. Hook order declarations use a lower operation weight than ReorderHook declarations targeting other implementations, allowing a higher-level customization to revise earlier order. RemoveHook removes targeted implementations. `ModuleHandler.invokeAll` collects/merges results; `alter` passes shared data by reference through listeners; single-module `invoke` explicitly rejects more than one matching implementation. Cardinality therefore belongs to the invocation contract, not the module label. [DRUPAL-COLLECTOR] [DRUPAL-HANDLER]

The inspected unrun `HookOrderTest::testHookOrder` fixes expected relative results, and `testReorderMissingTarget` expects reorder/remove of missing targets to have no effect or error. This helps modules coexist when optional targets are absent, but the same permissiveness would conceal a typo if our selected required binding used it. Broad alter/remove hooks also permit later code to undo earlier contributions; that is meaningful deep customization, with debugging/provenance and invariant risks. It is not permission to expose authorization, fencing or canonical product-state enforcement as ordinary removable hooks. [DRUPAL-TEST]

**State, cleanup and repaired history.** `ModuleInstaller.install` validates dependencies/core compatibility and adds required modules; `uninstall` expands dependents and runs uninstall validators before proceeding. Its schema install/uninstall methods act on persistent tables. Module uninstall is therefore a deployment/data operation, not equivalent to discarding one plugin object or draining a request. The 2025-04-29 published change record says 11.2.0 made a module's procedural implementation run before its OOP implementations unless order attributes override; the earlier system-dependent ordering is repaired history. Current code/tests use explicit ordering operations. [DRUPAL-INSTALLER] [DRUPAL-HISTORY] [DRUPAL-COLLECTOR] [DRUPAL-TEST]

**Transfer hypothesis — unadopted.** Products can learn from separating extension type definition, discoverable contribution metadata, explicit alteration, configured instance and installation/data lifecycle. GM retains compilation/order/cardinality semantics; EF retains artifact/trust/compatibility evidence; products own which aspects are alterable and how users understand the resulting plan; execution owns process/resource retirement. Product diagnostics could explain which extension changed a value or removed a contribution. A restricted, typed adjustment seam may fit better than Drupal-wide by-reference alteration; that is a hypothesis needing a real consumer, not a new policy abstraction.

**Confidence and smallest falsifier.** High in the named core paths and documented 11.2 history; no Drupal install, cache benchmark, data migration, hostile-code audit, duplicate-ID run or arbitrary plugin-type generalization. **Proposed experiment, unexecuted:** one type with two contributions plus a third module reordering/removing a deliberately missing optional target; compare cold and warm-cache results and inspect whether diagnostics can explain the applied adjustment. Then mark one target required in the proposed product model: accepting the typo would falsify transferring permissive missing-target behavior to that model. Keep the CMS's intentional choice distinct from ours.

## Cross-case transfer questions and owner map

These are retained questions, not selected requirements. None creates implementation authority or a framework adoption decision.

| Conditional idea | Useful evidence | Existing owner | Why it might fail to transfer |
| --- | --- | --- | --- |
| Give each extension seam an explicit result/cardinality/mutation/error contract | Pluggy collect/firstresult/wrappers; Drupal invoke/invokeAll/alter | Product capability contract; GM only for neutral provider selection | A dispatch chain can hide ambiguity; mutable alteration cannot cross invariant/security enforcement |
| Distinguish discovered descriptor, loaded code, usable provider and completed resource retirement | PF4J descriptor/state/extension filter; Fastify boot timeout; Nest destroy logging | EF neutral evidence/protocol; product readiness; existing execution custody | A framework state enum or fulfilled promise does not prove external resource/effect state |
| Prefer explicit visibility/exports and candidate closure over ambient lookup | Fastify prototype scopes; Hapi realms/exports; Nest module export checks | GM declaration/binding semantics; product concrete contract | Containers/namespaces do not grant security isolation; widening exports can recreate ambient coupling |
| Validate rejected composition before ordinary mutation; separately retain reentrant callback limits | Pluggy 1.7 validation repair and historic-replay caveat; Hapi register sequence | GM inert validation; product executable prepare/dispose | Pure validation can be atomic; executing arbitrary user setup/replay cannot be assumed transactional |
| Record relative ordering and missing-target policy as distinct semantics | Hapi Topo groups; Drupal ordering/removal; PF4J ordinal comparator | GM neutral ordering if concrete need; product hook semantics | Optional UI adjustments can reasonably no-op; required bindings need explicit rejection; equal numeric priority is not a total order |
| Keep lifecycle API entrypoints behaviorally consistent where they claim the same guarantee | PF4J manual-start versus bulk-start source paths | Product readiness/conformance; EF only if a shared neutral obligation emerges | Similar names can promise different behavior; source inference needs an executed falsifier before a defect claim |
| Explain the final customized plan and who changed it | Drupal alter/reorder/remove; all frameworks' differing identities | GM bounded composition diagnostics; product authoring/explanation | Broad generic provenance can become overhead; only concrete changed decisions need explanation |

### What these cases do not establish

No case here qualifies thousands of third-party modules, independent package-version matrices, hostile execution, bounded memory, fleet throughput, distributed fencing, seamless hot replacement, durable publication or safe migration of product state. A project's module/plugin count, framework specialization or namespace hierarchy would not establish those outcomes. The six small proposed falsifiers would test particular mechanisms only; none would establish superiority, accept an architecture, reopen static-composition direction, or justify a second lifecycle/execution owner.

## Source index

The following links are the exact sources used in the case references. The JSON companion records symbols, claim scope, evidence class, revision and access limits. Primary docs are moving unless an exact source commit appears in the URL.

[PLG-PKG]: https://github.com/pytest-dev/pluggy/blob/4c7f6365f2dde09c11e72db67d0f615231d64c19/pyproject.toml

[PLG-DOCSRC]: https://github.com/pytest-dev/pluggy/blob/4c7f6365f2dde09c11e72db67d0f615231d64c19/docs/index.rst

[PLG-MGR]: https://github.com/pytest-dev/pluggy/blob/4c7f6365f2dde09c11e72db67d0f615231d64c19/src/pluggy/_manager.py

[PLG-CALLER]: https://github.com/pytest-dev/pluggy/blob/4c7f6365f2dde09c11e72db67d0f615231d64c19/src/pluggy/_caller.py

[PLG-EXEC]: https://github.com/pytest-dev/pluggy/blob/4c7f6365f2dde09c11e72db67d0f615231d64c19/src/pluggy/_execution.py

[PLG-REL]: https://github.com/pytest-dev/pluggy/blob/4c7f6365f2dde09c11e72db67d0f615231d64c19/CHANGELOG.rst

[PLG-TEST]: https://github.com/pytest-dev/pluggy/blob/4c7f6365f2dde09c11e72db67d0f615231d64c19/testing/test_pluginmanager.py

[PLG-DOC]: https://pluggy.readthedocs.io/en/stable/

[PLG-PYPI]: https://pypi.org/project/pluggy/1.7.0/

[PF4J-PKG]: https://github.com/pf4j/pf4j/blob/6ffa261f0e28f88a9115432482cad64979715a0d/pom.xml

[PF4J-MGR]: https://github.com/pf4j/pf4j/blob/6ffa261f0e28f88a9115432482cad64979715a0d/pf4j/src/main/java/org/pf4j/AbstractPluginManager.java

[PF4J-RESOLVER]: https://github.com/pf4j/pf4j/blob/6ffa261f0e28f88a9115432482cad64979715a0d/pf4j/src/main/java/org/pf4j/DependencyResolver.java

[PF4J-FINDER]: https://github.com/pf4j/pf4j/blob/6ffa261f0e28f88a9115432482cad64979715a0d/pf4j/src/main/java/org/pf4j/AbstractExtensionFinder.java

[PF4J-WRAPPER]: https://github.com/pf4j/pf4j/blob/6ffa261f0e28f88a9115432482cad64979715a0d/pf4j/src/main/java/org/pf4j/ExtensionWrapper.java

[PF4J-FACTORY]: https://github.com/pf4j/pf4j/blob/6ffa261f0e28f88a9115432482cad64979715a0d/pf4j/src/main/java/org/pf4j/DefaultExtensionFactory.java

[PF4J-CL]: https://github.com/pf4j/pf4j/blob/6ffa261f0e28f88a9115432482cad64979715a0d/pf4j/src/main/java/org/pf4j/PluginClassLoader.java

[PF4J-ASM]: https://github.com/pf4j/pf4j/blob/6ffa261f0e28f88a9115432482cad64979715a0d/pf4j/src/main/java/org/pf4j/asm/ExtensionInfo.java

[PF4J-TEST]: https://github.com/pf4j/pf4j/blob/6ffa261f0e28f88a9115432482cad64979715a0d/pf4j/src/test/java/org/pf4j/DefaultPluginManagerTest.java

[PF4J-DOCEXT]: https://pf4j.org/doc/extensions.html

[PF4J-DOCLIFE]: https://pf4j.org/doc/plugin-lifecycle.html

[PF4J-DOCCL]: https://pf4j.org/doc/class-loading.html

[PF4J-TROUBLE]: https://pf4j.org/doc/troubleshooting.html

[PF4J-REL]: https://github.com/pf4j/pf4j/releases/tag/release-3.16.1

[FST-PKG]: https://github.com/fastify/fastify/blob/0c7413a8332a7892e12dcc351c27a190fefc0053/package.json

[FST-OVERRIDE]: https://github.com/fastify/fastify/blob/0c7413a8332a7892e12dcc351c27a190fefc0053/lib/plugin-override.js

[FST-UTILS]: https://github.com/fastify/fastify/blob/0c7413a8332a7892e12dcc351c27a190fefc0053/lib/plugin-utils.js

[FST-MAIN]: https://github.com/fastify/fastify/blob/0c7413a8332a7892e12dcc351c27a190fefc0053/fastify.js

[FST-DOCSRC]: https://github.com/fastify/fastify/blob/0c7413a8332a7892e12dcc351c27a190fefc0053/docs/Reference/Plugins.md

[FST-DOC]: https://fastify.dev/docs/latest/Reference/Plugins/

[FST-HOOKDOC]: https://fastify.dev/docs/latest/Reference/Hooks/

[FST-REL]: https://github.com/fastify/fastify/releases/tag/v5.12.8

[AVV-PKG]: https://github.com/fastify/avvio/blob/dc35b4af2bd1d5d258d4f20e92d6087064390c50/package.json

[AVV-DOC]: https://github.com/fastify/avvio/blob/dc35b4af2bd1d5d258d4f20e92d6087064390c50/README.md

[AVV-BOOT]: https://github.com/fastify/avvio/blob/dc35b4af2bd1d5d258d4f20e92d6087064390c50/index.js

[AVV-PLUGIN]: https://github.com/fastify/avvio/blob/dc35b4af2bd1d5d258d4f20e92d6087064390c50/lib/plugin.js

[AVV-TEST]: https://github.com/fastify/avvio/blob/dc35b4af2bd1d5d258d4f20e92d6087064390c50/test/close.test.js

[AVV-REL]: https://github.com/fastify/avvio/releases/tag/v9.3.1

[HAPI-PKG]: https://github.com/hapijs/hapi/blob/f2837a006535a6fbbcf33692067c1bd497ba8124/package.json

[HAPI-SERVER]: https://github.com/hapijs/hapi/blob/f2837a006535a6fbbcf33692067c1bd497ba8124/lib/server.js

[HAPI-CORE]: https://github.com/hapijs/hapi/blob/f2837a006535a6fbbcf33692067c1bd497ba8124/lib/core.js

[HAPI-EXT]: https://github.com/hapijs/hapi/blob/f2837a006535a6fbbcf33692067c1bd497ba8124/lib/ext.js

[HAPI-TEST]: https://github.com/hapijs/hapi/blob/f2837a006535a6fbbcf33692067c1bd497ba8124/test/server.js

[HAPI-DOC]: https://hapi.dev/api/21.x.x

[NEST-PKG]: https://github.com/nestjs/nest/blob/59f33793c616eaf9669e8b81a35aa5f31accc5b4/packages/core/package.json

[NEST-MODULE]: https://github.com/nestjs/nest/blob/59f33793c616eaf9669e8b81a35aa5f31accc5b4/packages/core/injector/module.ts

[NEST-INJECTOR]: https://github.com/nestjs/nest/blob/59f33793c616eaf9669e8b81a35aa5f31accc5b4/packages/core/injector/injector.ts

[NEST-ID]: https://github.com/nestjs/nest/blob/59f33793c616eaf9669e8b81a35aa5f31accc5b4/packages/core/injector/opaque-key-factory/by-reference-module-opaque-key-factory.ts

[NEST-CONTEXT]: https://github.com/nestjs/nest/blob/59f33793c616eaf9669e8b81a35aa5f31accc5b4/packages/core/nest-application-context.ts

[NEST-INIT]: https://github.com/nestjs/nest/blob/59f33793c616eaf9669e8b81a35aa5f31accc5b4/packages/core/hooks/on-module-init.hook.ts

[NEST-DESTROY]: https://github.com/nestjs/nest/blob/59f33793c616eaf9669e8b81a35aa5f31accc5b4/packages/core/hooks/on-module-destroy.hook.ts

[NEST-GROUP]: https://github.com/nestjs/nest/blob/59f33793c616eaf9669e8b81a35aa5f31accc5b4/packages/core/hooks/utils/get-instances-grouped-by-hierarchy-level.ts

[NEST-TEST]: https://github.com/nestjs/nest/blob/59f33793c616eaf9669e8b81a35aa5f31accc5b4/packages/core/test/hooks/on-module-destroy.hook.spec.ts

[NEST-DOC]: https://docs.nestjs.com/modules

[NEST-CUSTOM]: https://docs.nestjs.com/fundamentals/custom-providers

[NEST-DYNAMIC]: https://docs.nestjs.com/fundamentals/dynamic-modules

[NEST-LIFEDOC]: https://docs.nestjs.com/fundamentals/lifecycle-events

[NEST-MODREF]: https://docs.nestjs.com/fundamentals/module-ref

[NEST-MIG]: https://docs.nestjs.com/migration-guide

[DRUPAL-PKG]: https://github.com/drupal/drupal/blob/76deda03b09b57d76941e2d30e6dade35e92a14a/core/composer.json

[DRUPAL-VER]: https://github.com/drupal/drupal/blob/76deda03b09b57d76941e2d30e6dade35e92a14a/core/lib/Drupal.php

[DRUPAL-MANAGER]: https://github.com/drupal/drupal/blob/76deda03b09b57d76941e2d30e6dade35e92a14a/core/lib/Drupal/Core/Plugin/DefaultPluginManager.php

[DRUPAL-BLOCK]: https://github.com/drupal/drupal/blob/76deda03b09b57d76941e2d30e6dade35e92a14a/core/lib/Drupal/Core/Block/BlockManager.php

[DRUPAL-FACTORY]: https://github.com/drupal/drupal/blob/76deda03b09b57d76941e2d30e6dade35e92a14a/core/lib/Drupal/Core/Plugin/Factory/ContainerFactory.php

[DRUPAL-DISCOVERY]: https://github.com/drupal/drupal/blob/76deda03b09b57d76941e2d30e6dade35e92a14a/core/lib/Drupal/Component/Plugin/Discovery/AttributeClassDiscovery.php

[DRUPAL-COLLECTOR]: https://github.com/drupal/drupal/blob/76deda03b09b57d76941e2d30e6dade35e92a14a/core/lib/Drupal/Core/Hook/HookCollectorPass.php

[DRUPAL-HANDLER]: https://github.com/drupal/drupal/blob/76deda03b09b57d76941e2d30e6dade35e92a14a/core/lib/Drupal/Core/Extension/ModuleHandler.php

[DRUPAL-INSTALLER]: https://github.com/drupal/drupal/blob/76deda03b09b57d76941e2d30e6dade35e92a14a/core/lib/Drupal/Core/Extension/ModuleInstaller.php

[DRUPAL-TEST]: https://github.com/drupal/drupal/blob/76deda03b09b57d76941e2d30e6dade35e92a14a/core/tests/Drupal/KernelTests/Core/Hook/HookOrderTest.php

[DRUPAL-HOOKDOC]: https://api.drupal.org/api/drupal/core%21core.api.php/group/hooks/11.x

[DRUPAL-HOOKATTR]: https://api.drupal.org/api/drupal/core%21lib%21Drupal%21Core%21Hook%21Attribute%21Hook.php/class/Hook/11.x

[DRUPAL-PLUGDOC]: https://www.drupal.org/docs/drupal-apis/plugin-api/attribute-based-plugins

[DRUPAL-HISTORY]: https://www.drupal.org/node/3515207
