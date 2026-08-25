---
id: qualification.universal-module-extension-system.anti-patterns
type: qualification
status: qualified
owner: architecture
summary: Defines fail-closed architecture, graph, lifecycle, security, packaging, and catalog anti-patterns for modules and extensions.
related:
  - ADR-0001
  - ADR-0010
  - ADR-0012
  - OD-003
---

# Anti-Pattern Catalog

These rules are intended for deterministic source checks, manifest validation,
conformance fixtures, or review gates. A rule is not weakened merely because a
framework makes the unsafe behavior convenient.

## Ownership And Domain

| ID | Forbidden pattern | Failure mode | Required alternative |
| --- | --- | --- | --- |
| AP-001 | Everything is a runtime plugin | Product ownership and invariants become replaceable implementation detail | Make ordinary code a feature/module; expose only intentional extension points |
| AP-002 | One product-wide god kernel | Unrelated bounded contexts share authority and release fate | Keep domain authority in each owning context and use narrow ports |
| AP-003 | Foundation as shared product kernel | Product language leaks into every consumer | Keep Foundation product-neutral and consumer-owned contracts in products |
| AP-004 | Common contracts dump | Ownership, compatibility, and navigation become ambiguous | Colocate contracts with the owning feature; extract only a real Published Language |
| AP-005 | Plugin replaces aggregate invariants | External code can create invalid canonical state | Plugin returns a proposal or evidence; owning use case validates and mutates |
| AP-006 | Adapter automatically becomes a plugin | Internal technology choices gain unnecessary distribution and lifecycle | Make it a plugin only for independent install, update, replacement, or isolation |
| AP-007 | Package per feature without evidence | Version and compatibility surface explodes | Extract after a second consumer or independent release/deployment need |
| AP-008 | Cross-context database access | Transactions bypass language and ownership boundaries | Use a consumer-owned port or versioned Published Language |
| AP-009 | DRY by merging different domain semantics | Similar shapes hide different invariants and change cadence | Duplicate small mappings or extract only proved identical semantics |
| AP-010 | Runtime topology as product authorization | Presence in a graph becomes authority | Validate independent revision- and scope-bound authorization and grants |

## Graph And Dependency Injection

| ID | Forbidden pattern | Failure mode | Required alternative |
| --- | --- | --- | --- |
| AP-011 | Global mutable registry or `PluginManager` | Hidden state, order dependence, and unbounded authority | Compile an immutable profile-owned graph |
| AP-012 | Service locator, ambient container, or `get<T>()` | Dependencies and authority are invisible | Inject one frozen object with exact declared direct dependencies |
| AP-013 | Parent-container fallback | A child can consume undeclared transitive services | Resolve every dependency in the complete graph before activation |
| AP-014 | Cordis Context, Effect Context, or framework Tag in module code | Framework and ambient lookup become the public model | Keep framework tokens private to an adapter |
| AP-015 | Registration, filesystem, or object iteration order as semantics | Equivalent inputs produce different graphs | Use explicit selection and canonical identity ordering |
| AP-016 | Silent provider replacement or last-registration-wins | Misconfiguration changes behavior without evidence | Reject duplicate single providers or require explicit profile selection |
| AP-017 | JavaScript object, constructor, or duplicated package token as durable identity | Bundling or reload splits identity | Use a serializable canonical contract ID and version family |
| AP-018 | Positional dependency arrays | Reordering changes meaning without a type-safe name | Use named dependency declarations and named injected properties |
| AP-019 | Treat provider failure as optional absence | A broken provider silently changes capability | Distinguish absent optional provider from selected provider failure |
| AP-020 | Resolve cycles through laziness, `forwardRef`, or runtime lookup | Initialization order and invariants become indeterminate | Reject hard cycles or redesign responsibility around an explicit mediator |
| AP-021 | Generated runtime registry from a hand-maintained allowlist | Two sources of truth drift | Derive indexes from validated colocated descriptors and selected profiles |
| AP-022 | Load executable code while compiling the graph | Invalid or malicious code runs before admission | Compile from bounded declarative descriptors only |
| AP-023 | Top-level effects during module import | Discovery acquires untracked resources | Make imports declarative and effects lifecycle-owned |
| AP-024 | One untyped `dependsOn` edge | Calls, events, tests, and activation constraints are conflated | Preserve typed edge kinds and validate each policy separately |

## Transactions, Lifecycle, And Concurrency

| ID | Forbidden pattern | Failure mode | Required alternative |
| --- | --- | --- | --- |
| AP-025 | Plugin, provider, network, or filesystem call inside a Unit of Work | Locks are held and external effects cannot roll back atomically | Commit state plus durable intent, then dispatch and reconcile |
| AP-026 | One lifecycle implementation for trusted and isolated hosts | Cooperative cleanup is mistaken for hard termination | Share semantic outcomes, but use host-specific execution and containment |
| AP-027 | Timeout without cancellation and late-result fencing | Timed-out code publishes or mutates later | Use one absolute deadline, cancellation, and generation checks at commit |
| AP-028 | Refreshing a relative timeout at each phase | A workflow can run forever | Derive every phase budget from one absolute deadline |
| AP-029 | Unbounded retry | A bad extension creates endless load or effects | Bound attempts, classify failures, back off, and quarantine |
| AP-030 | Blind retry after an ambiguous external effect | Duplicate external behavior | Query or reconcile authoritative state before deciding |
| AP-031 | Claim exactly-once external effects | Crash windows are hidden | Use idempotency, fencing, durable intent, and explicit uncertainty |
| AP-032 | Unbounded drain or disposer | Update and shutdown can hang forever | Set a drain deadline, cancellation policy, and hard host termination path |
| AP-033 | Stop cleanup after the first disposer failure | Later resources leak | Run all bounded cleanup and aggregate failures |
| AP-034 | Infer rollback from registration order | Parallel or partial activation cleans in the wrong order | Record successful activation and unwind its reverse dependency DAG |
| AP-035 | Hot unload without leak and compatibility proof | Timers, listeners, code references, or native state survive | Use staged replacement and a controlled restart fallback |
| AP-036 | Mutable `latest` tag as installation or routing identity | Existing version resolves to new bytes | Pin immutable artifact and recursive dependency digests |
| AP-037 | Restartless update as correctness requirement | Failure to unload makes security rollback impossible | Treat restartless replacement as qualified optimization |
| AP-038 | External effect without durable intent | Crash loses whether work was attempted | Record intent before dispatch and outcome after acknowledgement |
| AP-039 | Multiple unrelated epoch/fence systems | Stale work can satisfy the wrong check | Reuse one authority-scope graph/runtime/grant tuple with explicit revisions |
| AP-040 | In-memory mutex or distributed lock as correctness | Process loss or lease expiry allows stale mutation | Use compare-and-set revisions, fences, idempotency, and reconciliation |
| AP-041 | Late candidate completion can publish | Timed-out or superseded startup replaces active routing | Recheck candidate state and generation at the single publication point |
| AP-042 | Caller cancellation cancels shared startup implicitly | One impatient caller breaks every waiter | Separate caller wait cancellation from coordinator-owned startup cancellation |

## Security And Isolation

| ID | Forbidden pattern | Failure mode | Required alternative |
| --- | --- | --- | --- |
| AP-043 | Manifest permissions automatically become grants | Publisher requests become product authority | Render requests, decide policy, and issue narrower revocable grants |
| AP-044 | Signature or catalog listing treated as sandbox | Correctly signed malware receives ambient authority | Verify provenance and still enforce isolation and capabilities |
| AP-045 | Untrusted third-party Node code in process | It has host filesystem, network, environment, and process authority | Use an OS-enforced isolated host or defer support |
| AP-046 | Electron `utilityProcess` treated as malicious-code sandbox | Node authority remains broad | Use it only for trusted crash-prone code unless OS confinement is added |
| AP-047 | Web Worker treated as no-network sandbox | Worker normally retains origin network and storage APIs | Enforce CSP/origin policy and mediate capabilities independently |
| AP-048 | Raw secrets, cookies, or ambient environment in dependencies | Extension can retain and exfiltrate credentials | Pass `SecretRef` or one-operation capability handles through a broker |
| AP-049 | Generic IPC such as `callMain(channel, payload)` | One bridge exposes the whole host | Use versioned operation-specific messages and validate schema, size, and rate |
| AP-050 | One shared host for unrelated trust domains | One crash or compromise affects all extensions | Partition by trust, tenant, resource class, and blast radius |
| AP-051 | Uncontrolled outbound HTTP | SSRF, redirect, DNS rebinding, and credential leakage | Use a product-owned egress broker with destination and response limits |
| AP-052 | Cross-tenant cache, storage, port, or grant reuse | Identity substitution leaks data and authority | Bind every resource to tenant, extension, generation, and scope |

## Events, Packages, And Compatibility

| ID | Forbidden pattern | Failure mode | Required alternative |
| --- | --- | --- | --- |
| AP-053 | Everything is an event | Owner, result type, order, and call stack disappear | Use direct typed ports for commands/queries and events for facts |
| AP-054 | Command-shaped event used to hide a forbidden call | Coupling remains but failure semantics worsen | Define a command port with an explicit owner and result |
| AP-055 | Synchronous listener masquerading as integration event | Transaction and latency coupling are hidden | Commit outbox evidence and consume asynchronously when independence is real |
| AP-056 | Subscriber order as product semantics | Adding a listener changes behavior | Define an explicit ordered pipeline contract or independent consumers |
| AP-057 | Framework, container, React, Electron, ORM, or host types in public API | Consumers cannot use or replace the core independently | Publish plain project-owned DTOs, ports, schemas, and errors |
| AP-058 | Reusable library core imports module/plugin runtime | Every consumer inherits the stack | Keep module adapter one-way toward the pure core |
| AP-059 | Public SPI after one implementation | Accidental implementation details become permanent | Require two independent implementations and conformance evidence |
| AP-060 | SemVer alone as compatibility evidence | Wire direction, unknown fields, and behavior remain untested | Run N/N-1 request/response and oldest/newest packed-consumer matrices |
| AP-061 | Empty DDD layers or placeholder package admission | Structure exists without semantic ownership | Admit only a value-level feature slice with executable tests |
| AP-062 | Global `adapters/` or `modules/` dumping ground | Feature ownership and navigation erode | Colocate ports and adapters with the owning feature by default |

## Catalog, Update, And Data Custody

| ID | Forbidden pattern | Failure mode | Required alternative |
| --- | --- | --- | --- |
| AP-063 | Catalog discovery used as runtime service resolution | Search availability controls live composition | Resolve a profile to an immutable lock before runtime activation |
| AP-064 | Platform required for self-hosted or direct-digest install | Product cannot operate independently | Keep Platform an optional catalog source/operator |
| AP-065 | Registry mirror silently inherits upstream trust | Self-hosted policy is bypassed | Quarantine, verify, and promote under local authority |
| AP-066 | Search result treated as signed installation metadata | Ranking or index corruption selects code | Resolve through signed catalog metadata and immutable digest |
| AP-067 | Revocation deletes artifacts or transparency evidence | Incident investigation and rollback evidence disappear | Quarantine execution while retaining immutable evidence |
| AP-068 | Plugin uninstall automatically deletes user data | Lifecycle target is confused with custody | Run a separately authorized retention/export/deletion process |
| AP-069 | Code rollback assumed to reverse state migration | Destructive data changes remain | Version state, prove backward compatibility, and retain migration evidence |
| AP-070 | Offline snapshot accepted without freshness/rollback checks | A frozen snapshot re-enables vulnerable code | Verify signed inventory, expiry, monotonic sequence, and revocation state |
| AP-071 | Display name or package-manager fallback resolves an extension dependency | Typosquatting or dependency confusion substitutes another publisher | Canonicalize namespace ownership and pin the approved artifact digest |

## Qualification And Evidence Integrity

| ID | Forbidden pattern | Failure mode | Required alternative |
| --- | --- | --- | --- |
| AP-072 | Freeze an object that exposes a mutable `Map`, `Set`, buffer, or nested record | Recorded digest and observable plan can diverge | Publish deeply immutable serializable data only |
| AP-073 | Single-flight keyed only by graph digest | Different scope, configuration, grant, host policy, or source joins the wrong attempt | Bind idempotency to the complete activation fingerprint and reject conflicts |
| AP-074 | Omitted readiness hook interpreted as ready | Serving authority is granted without evidence | Require explicit probe or explicit inert-module policy |
| AP-075 | Refresh cleanup timeout for every disposer or batch | Total cleanup is unbounded by graph size | Carry one monotonic absolute cleanup deadline |
| AP-076 | In-process cancellation described as termination | Ignored abort continues effects after the coordinator returns | Report `termination_unproven`; use host kill for stronger claims and fence late effects |
| AP-077 | Reducer enum cases described as crash-recovery proof | Persistence, ambiguous writes and replay seams remain untested | Label reducer evidence narrowly and require a persistent fault-injection harness |
| AP-078 | Signature described as trusted code | Authenticated malicious code passes policy | Validate signer authorization, provenance subject, builder/source and dependency closure, then sandbox separately |
| AP-079 | Duplicate approval entries for one semantic fork | Agents count one decision twice or accept contradictory states | Keep one machine-readable topic/ID and validate links/counts in CI |
| AP-080 | Extract a neutral package before a second consumer | Product assumptions freeze into Foundation | Rehearse product-locally and extract only demonstrated repetition |

## Enforcement Plan

- Engineering Foundation source-dependency and dependency-declaration checks
  enforce static import and package rules.
- Extension Foundation graph compilation enforces descriptor, provider, scope,
  ordering, and compatibility rules.
- Product architecture tests enforce feature ownership and forbid direct domain
  mutation from extension adapters.
- Host conformance suites enforce lifecycle, cancellation, fencing, isolation,
  IPC, update, and resource limits.
- Catalog and supply-chain fixtures enforce digest, provenance, namespace,
  revocation, rollback, and permission-diff rules.
