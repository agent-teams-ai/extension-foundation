---
id: qualification.module-system-v1-productization.consumer-admission
type: qualification
status: active
owner: architecture
summary: Applies fail-closed, level-specific admission to exact Agent Runtime, Orchestrator, and Frontend revisions.
---

# Consumer Admission

## Admission Rules

Every level requires a real owner, production capability, typed product port,
observable outcome, exact committed source, and product composition root. Its
additional trigger is level-specific:

| Level | Additional evidence required |
| --- | --- |
| `L1` Static authoring | Two same-seam implementations or contributions plus measured authoring, drift, or zero-evaluation discovery cost |
| `L2` Selection graph | Provider set or binding must change without rebuild; static configuration is insufficient |
| `L3` Lifecycle | Independently managed resources need dependency-aware start, readiness, drain, rollback, or recovery |
| `L4` Process host | Named placement or containment requirement and a product-owned protocol boundary |
| `L5` Shared extraction | Two independent product implementations of the same semantics plus executable conformance |

Plans, documentation, test doubles, package IDs, fixtures, and shared source
files do not satisfy these triggers.

## Exact Candidate Sources

| Product | Revision | Result |
| --- | --- | --- |
| Agent Runtime | `493c6c37e247f021fc110c5fc624b72f1502d743` | Product-owned Pure DI source architecture demonstrated; `L0_GO`; `L1-L5_NO_GO` |
| Orchestrator | `4c5f55366ed8c83f97374b66c8e9f84059c47382` | Typed-port evidence only; `L1-L5_NO_GO` |
| Frontend | `85c0850e2fc312b995ba3116f8d4aa46dcb0b1dd` | Restricted syntactic composition candidate; `L1_NO_GO_MEASUREMENT_CANDIDATE`; `L2-L5_NO_GO` |

The machine-readable records are intentionally
`candidate-source-records`. Their verifier binds local mirrors to exact commit,
tree, blob, AST export, negative-search, import-resolution, and restricted
factory-shape evidence. It does not prove runtime use, independent ownership,
or authorize a product decision or shared extraction.

### Agent Runtime

Codex Setup and Claude Code Setup are two sibling product capabilities exposed
through one `RuntimeAccessHandle`. They have different inputs, outputs,
diagnostics, policy, and configuration semantics; they are not alternative
providers for one common slot. The exact source record proves literal production
composition through `createDefaultAgentRuntimeHost`, owner-local feature
factories, and a product-owned handle. This demonstrates the `L0` Pure DI
source architecture. The captured tests and host implementation remain source
records; this verifier does not execute or promote cancellation, isolation, or
disposal behavior.

The two capabilities share one host-owned lifetime. They do not prove runtime
selection, independent module lifecycle, process placement, or shared
Foundation semantics. Claude Code has product E2E evidence but lacks a test that
traverses the default root in the same direct form as Codex; this is a
non-blocking confidence gap owned by Agent Runtime, not an admission reason for
`L1` or a Foundation runtime.

### Orchestrator

Host Discovery has a typed source port and deterministic tests. At the exact
revision it has no committed production source adapter, second contribution,
or application root. Work Completion and other candidates remain product
documentation rather than executable consumer evidence.

### Frontend

Recent Projects has two fixed source adapters behind one feature-owned port and
composition root. The local verifier checks exact blobs, alias resolution from
the captured `tsconfig.json`, explicit port implementation, direct factory-body
construction, closed dependency-object shape, and provider order:

1. `ClaudeRecentProjectsSourceAdapter`;
2. `CodexSessionFileRecentProjectsSourceAdapter`.

This is candidate evidence for deciding whether a measurement is worthwhile;
it is not runtime execution proof. The product still needs executable
product-owned wiring evidence, an accountable owner, approved benchmark
protocol, root-owned ordering decision, deletion criteria, and product
approval. Hosted routing, Token Usage, and the broad legacy Extensions adapter
are excluded.

## Cross-Consumer Result

The products share explicit dependencies and product-owned composition, but not
one identity grammar, binding semantics, lifecycle, diagnostics, or failure
contract. Agent Runtime now demonstrates that source-architecture baseline.
The common result across products remains an architectural pattern, not a
runtime package or public SPI.
