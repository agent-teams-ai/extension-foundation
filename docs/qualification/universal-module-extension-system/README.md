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

- [Completed nightly research dossier](nightly/README.md)
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
evidence. The nightly worker corpus now has a machine-produced immutable
evidence manifest, but its promotion gate remains intentionally closed. Corpus
integrity does not replace product-owner approval, primary-source independence,
executable closure, or a separate ADR.

The [decision ledger](decision-ledger.yaml) is the machine-readable navigation
source. It links to full rationale and never duplicates normative decisions.

## Evidence Custody Qualification Tool

The dependency-free Node 24 custody tool and its
[`manifest schema`](../../../architecture/evidence-custody-manifest.schema.json)
capture an explicit allowlist of job IDs into create-only SHA-256 objects and a
deterministic manifest. The tool never
discovers jobs with globs and must not be pointed at an authentication root or
`CODEX_HOME`. Its serializer supports JSON null, booleans, strings, finite
numbers, dense arrays and plain objects; it sorts object keys but does not claim
full RFC 8785 canonicalization.

Prepare a JSON configuration with `campaignId`, `baseline`, `jobIds`,
`runtimeRoot`, `jobConfigRoot` and `outputRoot`, then run:

```console
pnpm evidence:custody -- capture /absolute/path/to/config.json
pnpm evidence:custody -- verify /absolute/path/to/manifest.json /absolute/path/to/evidence
pnpm evidence:custody:test
```

Capture includes each allowed job's configuration, current result alias,
progress, events, log, attempt journals and exactly decoded
`lastOutputSummary` bytes. Missing or unknown historical bytes become explicit
exceptions. They are never reconstructed. Verification reports custody,
terminal-state, alias, path, source-independence, hypothesis, draft-scope,
synthesis and promotion gates independently; worker counts never satisfy a
source or voting requirement.

Attempt entries from every journal are combined before current-alias binding;
duplicate attempt numbers are rejected as ambiguous. Identical bytes observed
under different provenance are also rejected instead of silently collapsing
their source path or evidence kind. A future generalized custody service may
model multiple provenance occurrences explicitly, but this bounded research
tool remains fail-closed.

After capture, verification treats the stored object's SHA-256 digest and byte
size as authoritative; checking whether a mutable source path still exists is a
separate, explicit live-source audit. Source paths in the manifest are portable
relative metadata, and the current alias is bound to the latest captured attempt
wrapper in the immutable object store. The store root must be exclusively owned
by the custody process. Publication revalidates root and parent directory
identity and fails closed on a detected swap, but Node's path-based filesystem
APIs cannot make this a security boundary against a hostile same-user process.
The default `verify` command reports success for an intact portable NO-GO bundle;
`verify ... --require-promotion` is the explicit admission check and remains
fail-closed while any promotion prerequisite is unproven.
