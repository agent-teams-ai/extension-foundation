---
id: qualification.universal-module-extension-system.nightly.module-federation-verdict
type: qualification
status: qualified
owner: architecture
summary: Defers Module Federation 2 and keeps any future loader Frontend-owned.
---

# Module Federation 2 Verdict

**Verdict: defer Module Federation 2. It is not V1 architecture and never a
Foundation runtime.**

Frontend adoption follows Orchestrator and Agent Runtime. Begin, if approved,
with co-released trusted built-ins and a minimal Frontend-owned compiled catalog.
Use native ESM or generated import maps only after independent loading has
demonstrated value. Consider Module Federation last, solely as a Frontend-owned
trusted-code delivery adapter for a measured independent-deployment need.

Module Federation does not provide a security boundary. Same-realm remote code
has host authority. Shared dependency negotiation, React-family singleton
identity, remote asset closure, offline behavior, CSP, Electron differences,
pre-execution compatibility, provenance, rollback, and tenant switching all
remain product obligations.

Reopen only when a real Frontend slice proves measurable deployment, rollback,
or optional-loading value and passes:

- immutable complete asset-closure verification before execution;
- React-family identity and compatibility tests;
- Web and applicable Electron CSP, offline, and rollback tests;
- publisher and build provenance with exact deployed bytes; and
- a separate isolation profile for any less-trusted code.

No W11 result establishes a quantitative native-ESM advantage over MF2; that
positive claim is omitted. The decision is based on absent need and unresolved
obligations, not a universal performance ranking.

See [UMEQ decisions](08-umeq-decision-matrix.md), the existing
[product adoption guidance](../product-adoption.md), and the
[executive report](01-executive-report.md).
