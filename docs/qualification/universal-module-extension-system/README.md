---
id: qualification.universal-module-extension-system.index
type: index
status: active
owner: architecture
summary: Index of the pre-implementation qualification for the reusable Agent Teams module and extension system.
---

# Universal Module And Extension System Qualification

This dossier qualifies a product-neutral module and extension architecture before
any production package or public SPI is admitted. It distinguishes accepted
decisions, verified evidence, recommendations, unresolved product choices, and
post-MVP hypotheses.

## Evidence And Decisions

- [Current state](current-state.md)
- [Invariant map](invariant-map.md)
- [Decision ledger](decision-ledger.yaml)
- [OSS comparison](oss-comparison.md)
- [Machine-readable OSS comparison](oss-comparison.yaml)

## Proposed Architecture

- [Module graph](module-graph.md)
- [Lifecycle and concurrency](lifecycle-and-concurrency.md)
- [Trust and security](trust-and-security.md)
- [Packaging and reuse](packaging-and-reuse.md)
- [Product adoption](product-adoption.md)
- [Catalog and profiles](catalog-and-profiles.md)
- [Performance and SLOs](performance-and-slo.md)

## Qualification Outcome

- [Anti-pattern catalog](anti-patterns.md)
- [Spike results](spike-results.md)
- [Conformance plan](conformance-plan.md)
- [Unresolved decisions](unresolved-decisions.md)
- [Final recommendation](final-recommendation.md)

## Status Vocabulary

- **Accepted** means an effective accepted ADR already owns the decision.
- **Verified** means this qualification has repeatable evidence but no new
  product decision is implied.
- **Recommended** means evidence supports the option, but approval may still be
  required.
- **Hypothesis** means a spike or a real consumer must still prove the claim.
- **Deferred** means explicitly outside the first implementation slice.

The frontmatter status `qualified` means the document has completed this
research pass. It does not mean every requirement inside it is implemented or
passed. [Conformance Plan](conformance-plan.md#current-evidence-status) contains
the explicit human-reviewed status table for planned, implemented and passed
evidence. Machine-produced evidence manifests remain a promotion requirement,
not a property claimed by this research branch.

The [decision ledger](decision-ledger.yaml) is the machine-readable navigation
source. It links to full rationale and never duplicates normative decisions.
