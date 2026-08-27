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
- A selected optional provider is part of the compiled candidate. Its failure
  is not equivalent to the provider never being selected.
- Graph meaning, publication generation and runtime lifetime are separate.
  Operation-specific lifecycle orders and staged runtime pins preserve those
  distinctions.

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
| `T1` process advertised as hostile-code isolation | Gives same-user native code ambient product authority | Require `T3/T4` or defer |
| Contribution automatically promoted to application module | Lets publisher packaging dictate product ownership and composition | Require a consumer-owned adapter and separate graph admission |
| Codec treated as authentication | Enables spoofing and replay | Reject |
| Deadline treated as cleanup proof | Hides live work, leaks, or suppressed cleanup | Reject |
| Side-by-side as universal baseline | Assumes fencing, state compatibility, capacity, and rollback | Use restart-first |
| Manual remote pins as freshness | Permits replay of old release or revocation state | Require TUF for managed freshness |
| Mutable tag or `latest` as authority | Tag movement impersonates an approved update and publisher currentness | Pin digest; require TUF for mutable channels |
| One graph or lifecycle DAG across all targets and operations | Erases placement and edge semantics | Compile target- and operation-specific projections |
| Runtime reuse without staged pins | Candidate publication races retirement | Pin under the retirement fence before reuse |
| Update before custody-authorized migration | Publishes code over incompatible or ambiguously migrated state | Complete custody, migration and reconciliation gates first |
| Open decision used as hidden normative authority | Bypasses acceptance and supersession governance | Move the decision to an ADR |
| Extraction after repository count | Mistakes duplicated bytes for independent semantics | Require a real second consumer and conformance |
| Worker consensus | Counts correlated roles as independent evidence | Weight primary and executable evidence instead |

The pre-W11 catalogs remain useful context:
[OSS comparison](../oss-comparison.md) and
[anti-pattern catalog](../anti-patterns.md). Return to the
[executive report](01-executive-report.md).
