---
id: qualification.universal-module-extension-system.nightly.oss-lessons
type: qualification
status: qualified
owner: architecture
summary: Distills applicable OSS lessons without promoting a framework or universal runtime.
related:
  - ADR-0001
  - ADR-0010
---

# OSS Lessons And Anti-Patterns

## Retained Lessons

- Mature extension systems separate declared contributions from runtime
  components, deployment units, and installation artifacts. Preserve that
  separation instead of seeking one universal `Module` interface.
- Closed-world validation and deterministic diagnostics are useful only when a
  real graph exists. They do not justify a graph for two statically imported
  implementations.
- Scoped resource helpers can improve local code, but resource ownership,
  authority, readiness, publication, fencing, cleanup debt, and recovery remain
  application semantics.
- Loader technology is placement-specific. Node, process, browser, Electron,
  and Wasm choices must remain adapters outside product ports and Foundation
  contracts.
- OCI digest identity, signature evidence, catalog listing, entitlement,
  product authorization, grant, and runtime enforcement are independent facts.

## Anti-Patterns

| Anti-pattern | Failure mode | W11 disposition |
| --- | --- | --- |
| Universal `Module` or `Plugin` root | Collapses design, runtime, contribution, artifact, and deployment roles | Reject |
| Framework types in public or product ports | Locks consumers to Cordis, React, Electron, MF, or Extism | Reject |
| Service locator or ambient container | Hides dependencies and authority | Reject |
| Registration order, priority, or fallback selection | Makes installs and updates silently change behavior | Reject |
| Dynamic loader before product need | Creates security, lifecycle, and compatibility obligations without value | Defer |
| Graph validity treated as authorization | Allows structurally valid but unauthorized execution | Reject |
| Signature treated as sandbox or permission | Confuses publisher evidence with runtime authority | Reject |
| Codec treated as authentication | Enables spoofing and replay | Reject |
| Deadline treated as cleanup proof | Hides live work, leaks, or suppressed cleanup | Reject |
| Side-by-side as universal baseline | Assumes fencing, state compatibility, capacity, and rollback | Use restart-first |
| Manual remote pins as freshness | Permits replay of old release or revocation state | Require TUF for managed freshness |
| Extraction after repository count | Mistakes duplicated bytes for independent semantics | Require a real second consumer and conformance |
| Worker consensus | Counts correlated roles as independent evidence | Weight primary and executable evidence instead |

The pre-W11 catalogs remain useful context:
[OSS comparison](../oss-comparison.md) and
[anti-pattern catalog](../anti-patterns.md). Return to the
[executive report](01-executive-report.md).
