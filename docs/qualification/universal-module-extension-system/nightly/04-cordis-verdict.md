---
id: qualification.universal-module-extension-system.nightly.cordis-verdict
type: qualification
status: qualified
owner: architecture
summary: Retains Cordis only as qualification evidence and rejects production lifecycle adoption now.
---

# Cordis Verdict

> Historical qualification evidence. This page is non-operative. Use the
> [current productization gate](../../module-system-v1-productization/README.md),
> [ADR-0014](../../../decisions/0014-product-local-module-authoring-composition-and-generation-guardrails.md),
> and [ADR-0015](../../../decisions/0015-authorize-get-modular-semantic-extraction.md)
> for current authority and implementation gates.

**Verdict: qualification-only. Do not adopt Cordis as the production baseline,
Foundation runtime, public API, or lifecycle authority.**

Cordis 4.0.1 is useful as a comparator for scoped effects. Existing parity
evidence shows only selected trace shapes. It does not prove complete reverse
cleanup, attempt-all behavior with visible aggregate failures, deadline-safe
rollback, joinable close, late-acquisition capture, physical realm termination,
leak freedom, authority isolation, generation fencing, durable recovery, or
meaningful owned-code deletion in a real product.

The first rehearsal therefore uses direct construction and owns no generic
lifecycle abstraction. Restart is the update and recovery mechanism. If the
rehearsal unexpectedly owns resources, its product-local cleanup must be
terminal, joinable, bounded independently of the operation deadline, and tested.

Reopen a private Cordis adapter only when a resource-heavy real consumer:

1. wins a predeclared scorecard after adapter guards and conformance are counted,
   including owned code as one input rather than an isolated percentage gate;
2. passes reverse, attempt-all, aggregate-failure, deadline, leak, physical
   termination, provenance, and dependency-leak tests;
3. uses no private API or vendor fork; and
4. remains a replaceable private helper under one product lifecycle authority.

Even after those gates, Cordis types must not enter a product port or Foundation
contract. See [dependency graph and DI](06-dependency-graph-and-di-decision.md),
the existing [OSS comparison](../oss-comparison.md), and the
[executive report](01-executive-report.md).
