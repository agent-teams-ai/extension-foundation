---
id: qualification.universal-module-extension-system.unresolved-decisions
type: qualification
status: qualified
owner: architecture
summary: Presents the eight product and architecture forks that still require approval after the static-first decisions.
related:
  - ADR-0010
  - ADR-0013
  - ADR-0014
  - OD-001
  - OD-002
  - OD-003
---

# Unresolved Decisions

These forks do not weaken accepted invariants. Approval selects the first
implementation and compatibility surface. LOC ranges include focused tests but
exclude substantive product behavior.

## UMEQ-009: Process Wire Format

**Problem:** choose the first isolated-host transport without prematurely
publishing one protocol for every placement.

| Option | Assessment |
| --- | --- |
| Length-prefixed strict JSON with frozen N/N-1 codecs, recommended | 🎯 8/10 · 🛡️ 8/10 · 🧠 6/10 · 2,500-4,500 LOC |
| Protobuf/gRPC-family protocol now | 🎯 6/10 · 🛡️ 9/10 · 🧠 8/10 · 4,000-7,000 LOC |
| Product-private ad hoc stdio | 🎯 3/10 · 🛡️ 4/10 · 🧠 4/10 · 1,000-2,000 LOC |

**Evidence:** strict JSON is debuggable and sufficient for lifecycle control,
but still needs byte framing, schema limits, negotiation, backpressure,
idempotency and authentication. Serialization technology cannot supply these
semantics. **Reversibility:** high while public protocol is withheld. **Impact:**
selecting Protobuf later changes only the process adapter if neutral envelopes
remain serializable. **Approval:** required through `OD-003`.

## UMEQ-010: Frontend Extension Model

**Problem:** define Web/Electron contribution and isolation contracts without
leaking React, store, browser or Electron types into Foundation.

| Option | Assessment |
| --- | --- |
| Product-owned declarative contributions plus placement adapters, recommended | 🎯 8/10 · 🛡️ 9/10 · 🧠 7/10 · 4,000-8,000 LOC |
| Trusted built-ins only for V1, extension seam kept private | 🎯 9/10 · 🛡️ 9/10 · 🧠 4/10 · 1,500-3,000 LOC |
| General public UI plugin API immediately | 🎯 4/10 · 🛡️ 5/10 · 🧠 10/10 · 10,000-20,000 LOC |

**Evidence:** Worker, iframe and Electron utility hosts have different authority.
The same product contract may use different placements, but no host provides a
universal security claim. **Reversibility:** medium after public UI SPI.
**Impact:** controls first Frontend slice and permission UX. **Approval:**
required separately by the Frontend product owner.

## UMEQ-012: Contract Source And Compatibility Model

**Problem:** choose sources of truth for serialized protocol and executable
TypeScript ports, plus the constrained compatibility grammar used by module
slots.

| Option | Assessment |
| --- | --- |
| JSON Schema 2020-12 for wire data plus handwritten TS executable ports, recommended | 🎯 8/10 · 🛡️ 9/10 · 🧠 7/10 · 1,200-2,400 LOC |
| TypeScript-first generation for all contracts | 🎯 6/10 · 🛡️ 6/10 · 🧠 5/10 · 800-1,600 LOC |
| Protobuf-first for every boundary | 🎯 5/10 · 🛡️ 9/10 · 🧠 8/10 · 2,500-5,000 LOC |

**Evidence:** serialized data needs language-neutral runtime validation; callbacks
and ports need TypeScript expressiveness. Generation is deterministic and
consumers never generate at install time. **Reversibility:** medium after schema
publication. **Impact:** compatibility tooling and future non-TS hosts.
**Approval:** required before stable contracts.

## UMEQ-013: Trusted Module Runtime

**Problem:** after a measured runtime-selection or independent-lifecycle trigger,
select the private product implementation of closed-world construction and
resource ownership.

| Option | Assessment |
| --- | --- |
| Minimal native TypeScript kernel, recommended | 🎯 9/10 · 🛡️ 9/10 · 🧠 5/10 · 900-1,500 LOC including tests |
| Cordis 4.0.1 behind a private adapter | 🎯 6/10 · 🛡️ 7/10 · 🧠 7/10 · 1,700-2,300 LOC including conformance |
| Native compiler plus Cordis lifecycle hybrid | 🎯 3/10 · 🛡️ 5/10 · 🧠 9/10 · 2,000-3,000 LOC |

**Evidence:** Cordis reliably owns scoped effects, but the trivial qualification
adapter does not prove meaningful code deletion and would overlap lifecycle
authority. The 25% threshold remains a real-consumer kill criterion. **Reversibility:**
high because contracts exclude framework types. **Impact:** Foundation
extraction and runtime admission, not the private product-local rehearsal.
**Approval:** required through `OD-003` plus an accepted owning-product runtime
decision. This fork cannot block the Phase 1 static Pure DI rehearsal and cannot
authorize a Foundation runtime. Evidence currently favors native.

## UMEQ-014: Package Module Formats

**Problem:** decide whether the first reusable packages support CommonJS.

| Option | Assessment |
| --- | --- |
| ESM-only MVP with explicit exports, recommended | 🎯 9/10 · 🛡️ 9/10 · 🧠 4/10 · 400-800 LOC tooling/tests |
| Parallel ESM/CJS from first release | 🎯 6/10 · 🛡️ 8/10 · 🧠 8/10 · 900-1,800 LOC |
| One smart conditional package switching runtime hosts | 🎯 3/10 · 🛡️ 5/10 · 🧠 9/10 · rejected |

**Evidence:** current Agent Teams consumers are modern ESM. CJS doubles
declaration and dual-package tests without a demonstrated consumer. Explicit
Node/browser/Electron host packages are safer than runtime-switching roots.
**Reversibility:** medium; CJS can be added with a major/minor policy after real
demand. **Impact:** third-party ergonomics. **Approval:** required before publish.

## UMEQ-015: Package Publication Topology

**Problem:** decide when internal qualification packages become public SDK,
contracts and conformance packages.

| Option | Assessment |
| --- | --- |
| Internal packages first; publish after two consumers and packed conformance, recommended | 🎯 10/10 · 🛡️ 10/10 · 🧠 5/10 · 2,000-4,000 LOC before publish |
| Public fixed-version package train during first product slice | 🎯 5/10 · 🛡️ 7/10 · 🧠 8/10 · 5,000-9,000 LOC |
| One public monolithic package | 🎯 2/10 · 🛡️ 4/10 · 🧠 5/10 · rejected |

**Evidence:** ADR-0010 already requires two independently authored conforming
implementations before production SPI. A fixed-version train is a good eventual
release model, not permission to publish now. **Reversibility:** low after public
API. **Impact:** release workload and compatibility obligations. **Approval:**
product owner through a future publication ADR, only after the accepted evidence
floor is met.

## UMEQ-017: Distributed Cutover Guarantee

**Problem:** state the strongest honest guarantee across multiple routers and
effect stores.

| Option | Assessment |
| --- | --- |
| Atomic route-head decision plus per-sink fencing and asynchronous convergence, recommended | 🎯 10/10 · 🛡️ 10/10 · 🧠 8/10 · 4,000-9,000 LOC per hosted binding |
| Shared admission gate for stronger bounded cutover | 🎯 7/10 · 🛡️ 9/10 · 🧠 9/10 · +4,000-8,000 LOC |
| Claim globally atomic multi-store cutover | 🎯 1/10 · 🛡️ 1/10 · 🧠 10/10 · rejected |

**Evidence:** routers cannot observe a decision simultaneously. Safety comes
from request and commit-time fences; leases only improve liveness. **Reversibility:**
medium because stronger gates can be added per deployment. **Impact:** hosted
SLOs and adapter conformance. **Approval:** required before distributed claims.

## UMEQ-018: Managed Update Metadata

**Problem:** decide whether TUF is mandatory in the first digest-pinned release.

| Option | Assessment |
| --- | --- |
| Pin-only MVP with signed release/revocation record; require TUF before mutable channels, recommended | 🎯 9/10 · 🛡️ 9/10 · 🧠 7/10 · 2,000-4,000 LOC MVP |
| TUF catalog metadata from first release | 🎯 8/10 · 🛡️ 10/10 · 🧠 9/10 · 5,000-10,000 LOC |
| OCI tags plus Cosign only | 🎯 3/10 · 🛡️ 5/10 · 🧠 5/10 · rejected for managed updates |

**Evidence:** digest and signatures do not provide freshness, rollback/freeze
protection or revocation distribution. TUF is mandatory once channels,
delegated publishers, mirrors or automatic updates exist. **Reversibility:**
medium; release records should already map cleanly to future TUF targets.
**Impact:** catalog update schedule. **Approval:** required through `OD-002`;
`OD-001` is already resolved and its accepted federation routing is not reopened.

## Recommended Approval Order

Phase 1 is the product-local static module rehearsal authorized by ADR-0013 and
ADR-0014 plus the owning product's feature decision. It uses explicit profile
bindings and static Pure DI and does not wait for `UMEQ-013`. A private runtime
graph is a later path requiring measured runtime-selection or independent-
lifecycle evidence, an owning-product runtime decision, and resolution of
`UMEQ-013`.

Foundation semantic extraction is separate again: two real independently
authored consumers, cross-consumer conformance, and a dedicated accepted
extraction decision are all required. A package admitted for an independent
release, replacement, deployment, isolation, reuse, or qualified public-SPI
lifecycle does not thereby transfer semantic ownership to Foundation.

Public package publication is cumulative: package admission must already be
satisfied; `UMEQ-012`, `UMEQ-014`, and `UMEQ-015` must be resolved; ADR-0014's
generation baseline remains effective; packed-package `PACKAGE-1` and public API
evidence must pass; the immutable package admission record must be verified;
release promotion must verify stable provider identities, the accepted basis,
implementation independence, and referenced bytes; and the Foundation owner
must accept artifact-specific package admission and publication decisions.
Those release decisions are not additional strategic UMEQ forks.
`UMEQ-009` is additionally needed before a process release. `UMEQ-017` is
required before hosted distributed claims. `UMEQ-018` is needed before managed
update channels. `UMEQ-010` remains a separate Frontend decision and cannot
bypass the ADR-0011 production-host gate.
