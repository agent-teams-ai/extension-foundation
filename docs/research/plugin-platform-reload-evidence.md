---
id: research.reload-platforms
type: research
status: active
owner: architecture
summary: Comparative lifecycle, dependency and unload evidence from mature IDE and RPC plugin platforms.
---

# Plugin Platform Reload Evidence

## Scope and evidence status

**Evidence date: 2026-10-21.** This reference synthesizes the primary-source audit of IntelliJ Platform, OSGi, VS Code, Eclipse Theia, and HashiCorp Vault/go-plugin. It is research, not architecture approval, a framework adoption proposal, or a comparative product ranking. The source audit checked the links on that date; this synthesis does not claim an additional independent verification.

**Confirmed documentation/specification** means an explicit published contract. **Observed implementation** means the named source path supports the claim, with release applicability limited by its pin. **Historical evidence** retains its date and known resolution. **Inference** identifies an engineering conclusion rather than a platform guarantee. Versioned OSGi references, the go-plugin v1.8.0 tag, and the Theia fix commit provide stable locators. Links to `main`, `master`, and current documentation remain moving evidence; they must be rechecked before release-specific reliance.

The central finding is that mature platforms support **bounded replacement under explicit constraints**. They distinguish installation, activation, service rebinding, code revision replacement, and execution-container restart. None of the evidence establishes arbitrary safe unloading of every feature module. Consumer references, retained resources, work already admitted, and restart behavior determine the real boundary.

## IntelliJ: production dynamic plugins require cooperative lifetimes

**Confirmed documentation.** IntelliJ supports production plugin installation, update, and removal without an IDE restart for eligible plugins. The [Dynamic Plugins documentation](https://plugins.jetbrains.com/docs/intellij/dynamic-plugins.html), dated **2024-10-31**, distinguishes this from development Auto-Reload. Restrictions include no Components or service overrides and use of dynamic extension points. Plugins can declare `require-restart`, including where native libraries prevent suitable unloading. Loading/unloading occurs on the event dispatch thread under a write action. During update/uninstall the IDE waits synchronously for unloading; failure requires a restart. Diagnostics inspect references retaining the plugin classloader.

The [Dynamic Extension Points documentation](https://plugins.jetbrains.com/docs/intellij/plugin-extension-points.html#dynamic-extension-points), dated **2025-03-25**, imposes obligations on consumers: enumerate extensions when needed without retaining instances, or observe extension-point changes and update owned structures. Declaring an extension point dynamic does not itself repair consumers' cached references.

The [Disposer documentation](https://plugins.jetbrains.com/docs/intellij/disposers.html), dated **2025-08-21**, ties cleanup to the owning lifetime. Plugin-provided application/project services are disposed during unloading. Extensions declared in `plugin.xml` are not automatically disposed. Plugin resources must not use the longer-lived Application or Project directly as their disposable parent. Otherwise those resources can retain the plugin after its intended lifetime.

**Strength and applicability.** This is concrete positive evidence for constrained production dynamic plugins. The transferable lesson is ownership: callbacks, listeners, tasks, and caches must end with the replaceable unit. Disposal of registrations and reclamation of a classloader are separate outcomes.

**Inference.** A consumer holding a provider export can defeat replacement after the provider's cleanup completes. A Host must specify whether such a reference remains valid for an instance lifetime, is mediated by a replaceable handle, or requires consumer reconstruction. Restart should be an observable supported outcome when the profile cannot satisfy unloading conditions. IntelliJ's EDT rules do not directly prescribe an asynchronous TypeScript implementation.

## OSGi: service rebinding and code refresh are different operations

**Confirmed versioned contract.** [OSGi Declarative Services 1.5, Compendium 8.1](https://docs.osgi.org/specification/osgi.cmpn/8.1.0/service.component.html), especially §§112.5.12, 112.5.14–18 and 112.7.1, describes component activation, deactivation, references, and configuration changes. The [ReferencePolicy contract](https://docs.osgi.org/javadoc/osgi.cmpn/8.1.0/org/osgi/service/component/annotations/ReferencePolicy.html) makes `STATIC` the default: bindings are established before activation and do not change within that component instance. Loss of a required bound service can require deactivation and, when satisfied again, activation of another instance.

`DYNAMIC` permits binding changes while an instance remains active. The implementation must tolerate changes on any thread at any time. For unary dynamic replacement, the new service is bound before the old service is unbound; old unbind logic must not clear the new binding. Dynamic policy does not preserve activation when minimum cardinality is no longer satisfied.

[ReferencePolicyOption](https://docs.osgi.org/javadoc/osgi.cmpn/8.1.0/org/osgi/service/component/annotations/ReferencePolicyOption.html) independently distinguishes reluctant and greedy selection. Reluctant policy minimizes unnecessary rebinding; greedy selection may cause dynamic rebinding or static reactivation when a better provider arrives. Configuration modification may invoke a `modified` callback or cause deactivation/reactivation. These lifecycle rules do not supply generic durable-state migration.

**Confirmed code-wiring contract.** [OSGi Core 8 Bundle Wiring](https://docs.osgi.org/specification/osgi.core/8.0.0/framework.wiring.html), §§7.2.1, 7.3 and 7.5.1, preserves old bundle wiring while it is still used after an update. A new revision does not redirect existing class references. Refresh computes a dependency closure and stops/restarts affected active bundles to resolve their wiring again. [FrameworkWiring.refreshBundles](https://docs.osgi.org/javadoc/osgi.core/8.0.0/org/osgi/framework/wiring/FrameworkWiring.html#refreshBundles-java.util.Collection-org.osgi.framework.FrameworkListener...-) is asynchronous: completion requires an event/callback, resolution can fail, and an implementation may refresh through a complete framework stop/restart.

The [Core 8 Service Layer](https://docs.osgi.org/specification/osgi.core/8.0.0/framework.service.html), §§5.6–5.7, also limits framework control over stale application references. Unregistering a service does not revoke arbitrary Java references; retained references require application cooperation.

**Strength and applicability.** OSGi provides a precise vocabulary and normative treatment of replacement dependencies. Its principal warning for other hosts is that the service graph and executable code graph differ. Replacing a registry entry cannot establish that imports, captured exports, or transitive consumers now use new code.

**Inference.** A Host needs an explicit consumer invalidation policy and a bounded replacement closure. Cleanup of generation G must check its identity before modifying a slot already published for G+1. Automatic greedy replacement can cascade through consumers; deterministic selection can make that operational cost explicit. These lessons do not require adopting OSGi or making an immutable graph mutable.

## VS Code: dynamic installation has an activation boundary

**Observed implementation; moving source.** In [AbstractExtensionService](https://github.com/microsoft/vscode/blob/main/src/vs/workbench/services/extensions/common/abstractExtensionService.ts), `canRemoveExtension` rejects dynamic removal once `activationStarted` is set. This boundary is the start of activation, not only successful activation. The delta pipeline can add extensions and activate a new extension when its activation event already occurred. An installed inactive artifact therefore has different removal semantics from executable code whose activation began.

In [extHostExtensionService](https://github.com/microsoft/vscode/blob/main/src/vs/workbench/api/common/extHostExtensionService.ts), termination stops activation, invalidates RPC proxies, and deactivates active extensions. Asynchronous deactivation races a **five-second timeout** before exit. Deactivation invokes an optional hook, logs errors, and disposes subscriptions. This supports extension-host shutdown cleanup; it does not establish safe individual JavaScript-code unloading.

**Confirmed documentation.** [Extension Host documentation](https://code.visualstudio.com/api/advanced-topics/extension-host) distinguishes local Node, remote Node, and browser WebWorker hosts. Placement depends on runtime capabilities, installation, and `extensionKind`. Their common API surface does not prove identical kill, storage, or recovery semantics.

**Strength and applicability.** VS Code demonstrates useful dynamic admission alongside a coarser executable restart boundary. A shared host can reduce operational cost while making several extensions share a restart lifetime.

**Inference.** Product contracts should distinguish artifact presence, selection, activation start, readiness, publication, retirement, and physical exit where those stages matter. Retirement callbacks must know which Host APIs remain usable after routing or RPC access changes. A successful cleanup promise alone cannot establish execution-container termination.

## Theia: retain current mechanisms and corrected history

**Observed implementation; moving source.** [plugin-manager.ts](https://github.com/eclipse-theia/theia/blob/master/packages/plugin-ext/src/plugin/plugin-manager.ts) contains internal `$stop(pluginId)`/`stopPlugin` mechanisms that remove lifecycle-map entries, call a stop function, dispose subscriptions, and await stopping. Loading activates declared dependencies. The inspected stop path does not establish transitive consumer recreation, revocation of previously returned exports, or module-cache eviction. That is an evidence limit, not proof that no additional system behavior exists.

[hosted-plugin.ts](https://github.com/eclipse-theia/theia/blob/master/packages/plugin-ext/src/hosted/browser/hosted-plugin.ts) coordinates deployment, connections, contributions, and readiness. Its ordering accounts for layout restoration depending on a filesystem provider that a plugin must first register. Waiting for all layout work before plugin startup can therefore create a readiness cycle.

**Historical evidence.** The [maintainer answer in discussion #14576](https://github.com/eclipse-theia/theia/discussions/14576), **2024-12-04**, discussed the then-missing individual-plugin and extension-host restart capabilities. [Discussion #15796](https://github.com/eclipse-theia/theia/discussions/15796), **June 2025**, distinguishes compile-time Theia extensions from runtime plugins. Neither is a complete current capability matrix.

**Fixed historical regression.** [Issue #17770](https://github.com/eclipse-theia/theia/issues/17770), opened **2026-07-08**, reported cleanup destroying a view container while layout restoration still retained it after readiness changes beginning with 1.71. It was completed **2026-07-09** through [PR #17772](https://github.com/eclipse-theia/theia/pull/17772). The immutable [fix commit `6f4bc1720636753c6c0f39530473d9df56c365fb`](https://github.com/eclipse-theia/theia/commit/6f4bc1720636753c6c0f39530473d9df56c365fb) defers view initialization. Present this as repaired evidence, not an unresolved platform defect.

**Strength and applicability.** Theia exposes concrete cleanup and readiness coordination mechanics. **Inference:** qualification must cover reverse readiness dependencies, late providers, and failed contributions; deleting management-map entries is insufficient evidence of executable reclamation.

## Vault/go-plugin: process lifetime plus product routing semantics

**Versioned implementation.** [go-plugin v1.8.0 client.go](https://github.com/hashicorp/go-plugin/blob/v1.8.0/client.go) and its [versioned API documentation](https://pkg.go.dev/github.com/hashicorp/go-plugin@v1.8.0) describe `Kill` and `Start`. The audited release was published **2026-04-29**; it is an evidence pin, not a claim about the latest version. `Kill` attempts graceful closure, allows two seconds, and then force-kills. A killed Client is not restarted by calling `Start` again; replacement needs a new client identity. Test reattachment has special non-killing semantics and is not production killability evidence. The [project README](https://github.com/hashicorp/go-plugin/blob/main/README.md) supplies RPC/protocol negotiation primitives, not a generic distributed runtime or application-state migration system.

**Confirmed product documentation.** [Vault plugin architecture](https://developer.hashicorp.com/vault/docs/plugins/plugin-architecture) distinguishes in-process built-ins from external processes. Catalog registration and artifact checksum verification are separate from enabling/mounting a backend. Catalog replication does not distribute binaries. Multiplexing can share one external process across mounts/namespaces, so a mount is not necessarily an independent killable unit.

[Upgrade documentation](https://developer.hashicorp.com/vault/docs/plugins/upgrade) says a running plugin continues using its old version until reload; reload creates execution using the selected/pinned version. The [reload CLI](https://developer.hashicorp.com/vault/docs/commands/plugin/reload) exposes plugin/mount selection and local/global scope, without establishing global atomic replacement.

**Observed implementation; moving source.** The audited [plugin_reload.go](https://github.com/hashicorp/vault/blob/main/vault/plugin_reload.go), `forceReloadBackend`/`reloadBackendCommon`, drains existing requests under a routing write lock, cleans up the backend, and creates/initializes its replacement. Initialization can fail after cleanup. This is not evidence of a ready-before-retire transaction. Cached forms of this moving source differed; the later persistence-after-swap detail remains unpinned and medium confidence, so it must not become a release guarantee.

[Rollback documentation](https://developer.hashicorp.com/vault/docs/plugins/rollback) requires checking unsupported transitions and distributing artifacts before global reload. [Deregistration documentation](https://developer.hashicorp.com/vault/docs/plugins/deregister) describes a live backend continuing after catalog removal, then failing to start on a later reload/restart. This is documented operational behavior, not a fixed historical incident.

**Strength and applicability.** Vault separates product routing/drain from process primitives. **Inference:** a Host must observe desired registration, running identity, readiness, publication, and persisted metadata separately. Process termination does not undo remote effects, prove subprocess-tree cleanup, or establish a hostile-code security boundary. State compatibility, permissions, and deployment distribution remain independent concerns.

## Host applicability and concrete qualification gates

**Inferences for owner review.** Artifact identity, digest verification, trust decisions, credentials, and protocol descriptors describe admission inputs. They do not authorize execution or prove readiness. Keep neutral artifact/trust/protocol ownership distinct from product executable loading, grants, routing, drain, and recovery. Under the supplied project boundaries, a product may construct another immutable GM instance and switch a capability route; this research does not authorize live graph mutation, expand EF into a runtime, or approve a private lifecycle candidate as public supervision.

Before claiming a replacement profile, qualify its promised behavior:

| Gate | Required observable result |
| --- | --- |
| Admission | An installed but unselected artifact does not execute; activation start is distinguishable from readiness. |
| Consumer lifetime | A retained generation-G reference has a documented result after G+1 publication: lease validity, explicit stale/revoked failure, or consumer restart. |
| Dependency closure | A diamond dependency replacement recreates the declared closure without surviving consumers silently retaining incompatible providers. |
| Publication ownership | Late cleanup of G cannot remove G+1 registrations or routes. |
| Drain | Concurrent requests show the declared queue/reject/route behavior; admitted old work completes or is cancelled within the stated policy. |
| Failed candidate | Initialization failure preserves the old route or reports the profile's permitted downtime; failed candidates are not published as ready. |
| Bounded retirement | Hanging cleanup reaches a deadline and an explicit failed/restart outcome; physical exit is measured separately where promised. |
| Recovery and state | Crashes around publication/metadata persistence reconcile identities; upgrade/downgrade checks durable-state compatibility. |
| Shared execution | A shared host crash exposes its actual blast radius and bounded recovery; multiplexing is not sold as individual isolation. |
| Repeated replacement | Multiple generations do not accumulate owned callbacks, tasks, or handles after retirement. |

Also test unsupported live replacement: a startup-only capability must reject it before partial teardown and identify its restart path. Hot reload is a first-class design concern when lifetime and failure semantics are explicit from the first contract; every module need not promise the same replacement strength.
