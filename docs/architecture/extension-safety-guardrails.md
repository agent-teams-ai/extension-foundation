---
id: architecture.extension-safety-guardrails
type: architecture
status: accepted
owner: architecture/security
summary: Defines fail-closed composition, authority, lifecycle, trust, and data-ownership rules for modules and independently distributed extensions.
related:
  - ADR-0001
  - ADR-0002
  - architecture.extension-model
---

# Extension Safety Guardrails

## Purpose

Extension mechanisms increase variability but do not transfer product authority.
These rules apply to built-in modules, first-party extensions, private engines,
and third-party plugins. A product may impose stricter rules for its own host.

## Composition and dependency boundaries

- A product owns every extension point and validates every result before changing
  canonical state.
- Foundation contracts never expose a dependency-injection container, resolver,
  cradle, Cordis Context, Awilix type, or generic `get` operation.
- Modules receive only explicitly declared dependencies. Parent-scope fallback,
  ambient discovery, and package registration order cannot satisfy a dependency.
- Multiple providers require an explicit selection or collection contract. A later
  registration never silently replaces an earlier provider.
- Product domain and application code do not import a module-host or plugin-runtime
  implementation. Concrete hosts are selected only in composition.
- Direct capability calls use narrow typed ports. Events represent facts,
  interception, observation, or durable integration; an event bus is not a hidden
  request-response service locator.
- Module discovery and graph compilation are pure. Importing a manifest,
  calculating a plan, or resolving dependency order cannot execute extension code
  or perform external effects.
- Extensions do not import each other's private packages or resolve unpublished
  services by string name. Collaboration uses product-owned contracts and explicit
  graph edges.

## Authority and transaction boundaries

- A plugin can propose a decision or contribution but cannot mutate an aggregate,
  write product tables, bypass authorization, or weaken a protected invariant.
- Plugin or provider calls never occur inside a product Unit of Work. Commit
  durable intent first, then invoke the external effect and reconcile its outcome.
- Requested manifest permissions are not grants. Product authorization, commercial
  entitlement, catalog admission, artifact verification, and runtime capability
  enforcement remain separate decisions.
- Raw credentials remain inside product-owned secret adapters. Extensions receive
  scoped capabilities or opaque secret references, never unrestricted secret-store
  access.
- Unknown external outcomes are reconciled before retry unless the operation has a
  proven idempotency key and protocol guarantee.
- A dependency-injection scope is not a security boundary. Untrusted code runs in
  a process, worker, sandbox, or WASM host with explicit capabilities and resource
  limits; it never runs in-process merely because the container is scoped.
- Filesystem, network, environment, process, IPC, and secret access are denied by
  default and exposed only through capability-scoped host ports.

## Identity, lifecycle, and updates

- Extension, publisher, artifact, installation, contribution, and running
  generation identities are distinct and stable.
- Artifact selection is digest-pinned. Mutable tags such as `latest` are discovery
  hints only and never runtime identity or rollback evidence.
- Activation, drain, deactivation, uninstall, and data deletion are separate
  operations. Uninstall never deletes user-owned data implicitly.
- Runtime replacement creates a new generation, validates and health-checks it,
  switches routing explicitly, drains the old generation, and then disposes it.
  In-place mutation of an active object graph is not a reliable update protocol.
- Cleanup hooks are necessary but insufficient. The host owns resource scopes,
  deadlines, cancellation, leak diagnostics, and forced containment.
- Registration order is never business semantics. Dependency and contribution
  ordering must be explicit, deterministic, and testable.
- Activation is transactional at the graph level: partial startup failure drains
  and disposes everything activated by that attempt before the generation can
  become routable.
- Update and uninstall wait for explicit drain or fencing. A cleanup callback does
  not prove that timers, child processes, listeners, streams, or remote effects
  have stopped.

## Distribution and admission boundaries

- Discovery, manifest parsing, signature verification, and permission review do
  not execute plugin code. Package install scripts and equivalent pre-admission
  hooks are prohibited.
- The admitted identity binds publisher, artifact digest, manifest digest,
  protocol versions, requested capabilities, and target products. Resolving a tag
  or package name again cannot silently change an admitted artifact.
- Plugin-to-plugin dependencies are explicit lockfile edges with compatible
  digests and one selected authority. Hosts do not perform ambient dependency
  discovery or registry fallback during activation.
- Admission and activation are distinct. Installing an artifact never grants
  permissions, starts code, migrates product state, or changes active routing.

## Resource, data, and presentation boundaries

- Every invocation has a deadline, cancellation contract, bounded input/output,
  backpressure policy, and typed terminal outcome. Unbounded listeners, queues,
  streams, retries, or telemetry cardinality are prohibited.
- Extension failure is contained by an error boundary and bulkhead. An exception,
  malformed stream item, or stalled contribution cannot crash the product host or
  block unrelated extensions.
- Extension-owned state declares an owner, schema version, migration policy,
  retention, export, backup, and deletion behavior. Update and uninstall never
  infer destructive data migration.
- Cross-process and WASM contracts use explicit serializable values. Framework
  objects, functions, classes, container tokens, native handles, and object
  identity do not cross the wire.
- UI contributions cannot mutate global DOM, CSS, routing, storage, or privileged
  IPC directly. They receive product-owned contribution surfaces and scoped
  commands.
- Logs, metrics, traces, and diagnostics follow product data classification,
  redaction, tenant scope, and cardinality budgets. Raw user content and secrets
  are not emitted by default.

## Public API evolution

- A public extension point requires stable ownership, two independent
  implementations, compatibility fixtures, and a conformance suite.
- Foundation does not publish one broad universal plugin interface. Each product
  owns narrow capability contracts and maps them to product-neutral lifecycle and
  distribution primitives.
- Product domain models, database records, framework objects, and implementation
  library types never cross a public extension contract.
- One contract begins with one version family. Speculative parallel major versions
  and mutable wire schemas are prohibited.

## Required enforcement

Once production packages materialize, CI must fail closed on hidden dependencies,
cycles, undeclared providers, deep imports, framework-type leakage, missing public
entrypoints, and absent conformance evidence. Architecture validation complements
runtime containment; neither replaces the other.

The following shortcuts are prohibited even if they appear convenient:

- one global `PluginManager`, container, resolver, or event bus as the integration
  surface for unrelated features;
- one universal plugin interface spanning product domains;
- optional extension availability silently changing a protected domain invariant;
- mutable `latest` resolution, silent provider override, or registration order as
  runtime selection;
- blind retry after an ambiguous external effect;
- direct extension writes to product databases, aggregates, migration tables, or
  authorization state;
- hot replacement by mutating an active object graph in place;
- treating successful cleanup, signature verification, entitlement, or manifest
  permission requests as proof of authorization or containment.
