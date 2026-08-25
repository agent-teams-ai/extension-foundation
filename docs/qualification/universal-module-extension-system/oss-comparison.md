---
id: qualification.universal-module-extension-system.oss-comparison
type: qualification
status: qualified
owner: architecture
summary: Compares reusable module, plugin, lifecycle, DI, host, and control-plane systems against Agent Teams invariants.
related:
  - ADR-0001
  - ADR-0010
  - ADR-0012
  - OD-003
---

# OSS Comparison

## Result

No reviewed project supplies the complete required semantic contract. The
strongest composition libraries solve resource ownership or dependency
construction; product plugin platforms solve contribution discovery and host
placement; control planes solve durable reconciliation. Combining any of them
without one explicit authority would create duplicate graphs and lifecycles.

The recommended first kernel therefore remains a small native TypeScript
closed-world compiler plus product-owned lifecycle coordination. Existing OSS
is used behind private adapters, as test oracles, and as operational patterns.
This is a recommendation under `OD-003`, not an accepted dependency decision.

The conclusion is layer-specific, not a claim that one custom platform must
replace all OSS:

| Layer | Primary comparator or reusable primitive |
| --- | --- |
| ID-DAG and ordering | native algorithm checked against Graphlib; Avvio as boot-lifecycle reference |
| Scoped resources | Cordis and Effect as private adapter/reference candidates |
| Frontend contributions | Backstage and Lumino patterns; VS Code/Theia placement lessons |
| Process protocol | Terraform go-plugin handshake/versioning lessons |
| Reconciliation | Kubernetes desired/observed/finalization patterns; leases only for liveness |
| Language-neutral host | Extism/Wasmtime post-MVP qualification |

`oss-comparison.yaml` marks each source as immutable `pinned`, dated
`orientation`, or `qualified-experiment`; those evidence classes are not
interchangeable.

## Comparison

| System | What to reuse | Why it is not the kernel |
| --- | --- | --- |
| DeepSeek Harness / Cordis 4.0.1 | Fiber-owned effects, scoped resources, automatic cleanup | Runtime discovery is open and dynamic; settled is not ready; no durable generations, atomic replacement, deadlines, recovery, or isolation |
| VS Code | Contribution points, explicit extension hosts, remote placement, restart-safe upgrades | Product-specific API and host model; extension host does not own DDD authority or durable effects |
| Theia | Frontend/backend placement and VS Code compatibility | Compatibility surface is broader than our narrow product-owned SPI and does not provide fencing |
| Backstage | Product-owned extension points and composable application modules | Frontend composition does not qualify untrusted execution or durable lifecycle |
| Lumino/JupyterLab | Tokens, commands, activation and disposal ownership | UI-oriented runtime without crash recovery or hostile-code boundary |
| Fastify/Avvio 9.3.0 | Deterministic boot, encapsulation, ready/close ordering | Single boot graph; no generation replacement, durable intent, or authority fence |
| OSGi | Explicit bundles, service dynamics and lifecycle lessons | Dynamic-resolution complexity is a poor baseline for TypeScript closed-world profiles |
| IntelliJ Platform | Extension points, compatibility metadata, honest restart/unload limits | Product-specific and demonstrates that safe hot unload is costly |
| Terraform go-plugin | Process handshake, protocol negotiation and reattach lessons | Process-only, not browser portable, and not product lifecycle authority |
| Kubernetes | Desired/observed state, reconciliation, generations, finalizers and leases | Distributed control-plane patterns, not an embeddable module kernel |
| Effect 3.22.1 | Scoped resources and interruption vocabulary | Would impose a programming model while leaving plugin trust and durable lifecycle unsolved |
| Awilix/Inversify/Nest | Composition-root construction where locally useful | Containers expose resolution/scopes but do not prove graph closure, lifecycle, isolation, or wire compatibility |
| Vite/Rollup | Ordered hooks and build-time contributions | Build plugin semantics are not runtime authorization or recovery semantics |
| Extism/WASI/Wasmtime | Future language-neutral capability host | Valuable post-MVP host, but requires its own SPI, quotas, broker and OS containment evidence |
| Browser/Electron hosts | Worker, iframe, utility-process and preload patterns | Placement-specific containment; one label cannot imply a common security tier |
| modularity_dart | Explicit identities, declarative visibility, startup coalescing and graph visualization | Its parent fallback, service locator, first-import-wins and imperative hot reload are rejected; `777genius/modularity` has no public source |

The machine-readable record is [oss-comparison.yaml](oss-comparison.yaml).

## Cordis Decision Gate

Cordis is the strongest private adapter candidate, not the public model. The
lockfile verifies the exact `4.0.1` npm tarball, while DeepSeek Harness revision
`b150a551b8d465e31e418e1b2eaf5e79bbb7d28e` is a separately pinned source
reference. This qualification does not claim byte equivalence between them.
Cordis qualifies only if a bounded adapter passes the neutral conformance suite
and deletes at least 25% of equivalent owned runtime code.

Kill Cordis adoption if:

- a module receives `Context`, ambient service lookup, or mutable injection;
- invalid graphs reach plugin execution;
- Cordis and Foundation both own readiness, restart, cutover, drain, or retry;
- same-name replacement requires an upstream patch or availability gap;
- cleanup can block past the Foundation deadline without quarantine;
- adapter and guards exceed 75% of the measured native kernel;
- repeated replacement leaks fibers, effects, listeners, or services.

Current spike evidence confirms only scoped resource start/stop. It deliberately
does not claim readiness, publication, drain, recovery, or isolation.

## Source Baseline

- [VS Code extension host](https://code.visualstudio.com/api/advanced-topics/extension-host)
- [Theia extensions and plugins](https://theia-ide.org/docs/authoring_extensions/)
- [Backstage frontend system architecture](https://backstage.io/docs/frontend-system/architecture/)
- [JupyterLab extension points](https://jupyterlab.readthedocs.io/en/stable/extension/extension_points.html)
- [Fastify plugins](https://fastify.dev/docs/latest/Reference/Plugins/)
- [OSGi Core specification](https://docs.osgi.org/specification/osgi.core/8.0.0/)
- [IntelliJ dynamic plugins](https://plugins.jetbrains.com/docs/intellij/dynamic-plugins.html)
- [Terraform plugin protocol](https://developer.hashicorp.com/terraform/plugin/how-tf-plugins-work)
- [Kubernetes controllers](https://kubernetes.io/docs/concepts/architecture/controller/)
- [Extism concepts](https://extism.org/docs/concepts/plug-in)
- [modularity_dart source](https://github.com/cherrypick-agency/modularity_dart/tree/be9a2674f3a8ce7f0807d7b46e74dd6e8f283fe5)

Implementation qualification must pin exact release or commit evidence; living
documentation links are orientation, not immutable proof.
