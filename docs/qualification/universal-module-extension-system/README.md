---
id: qualification.universal-module-extension-system.index
type: index
status: active
owner: architecture
summary: Index of the static-first recommendation and its preserved pre-implementation qualification evidence.
---

# Universal Module And Extension System Qualification

This dossier preserves the product-neutral qualification basis created before
any production package or public SPI was admitted. It distinguishes accepted
decisions, verified evidence, recommendations, unresolved product choices, and
post-MVP hypotheses.

The current qualification gate is the later
[Module System V1 Productization Gate](../module-system-v1-productization/README.md),
which re-audits newer exact product revisions and records current GO/NO-GO
results. The [final recommendation](final-recommendation.md) here is its
historical static-first input, not a competing current roadmap. No current Git
SHA, package, runtime, or public SPI is declared production-qualified by either
dossier.

## Evidence And Decisions

- [Current state](current-state.md)
- [Invariant map](invariant-map.md)
- [Decision ledger](decision-ledger.yaml)
- [OSS comparison](oss-comparison.md)
- [Machine-readable OSS comparison](oss-comparison.yaml)

## Preserved Historical Architecture Research

The following graph-first and generalized-runtime documents preserve exact
qualification evidence, constraints, and failure findings. Their graph-first
sequencing is superseded historical research, not a competing implementation
recommendation. Use them only after an owning-product decision triggers the
corresponding later gate in the current qualification projection.

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
- [Historical static-first recommendation](final-recommendation.md)

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
passed, and it does not qualify the current repository revision for production.
[Conformance Plan](conformance-plan.md#current-evidence-status) contains
the explicit human-reviewed status table for planned, implemented and passed
evidence. Historical nightly custody remains unproven because the reported
archive and manifest are not committed with a semantic verifier. Reported
counts, hashes, alias identities, and integrity results supply no promotion
evidence. Product-owner approval, bound primary-source independence,
successfully attested executable closure, and a separate ADR also remain
required.

The [decision ledger](decision-ledger.yaml) is the machine-readable navigation
source. It links to full rationale and never duplicates normative decisions.

## Evidence Custody Qualification Tool

The dependency-free Node 24 custody tool and its V2
[`manifest schema`](../../../architecture/evidence-custody-manifest.schema.json)
capture an explicit allowlist of job IDs into create-only SHA-256 objects and a
deterministic manifest. The tool never
discovers jobs with globs and must not be pointed at an authentication root or
`CODEX_HOME`. Its serializer supports JSON null, booleans, strings, finite
numbers, dense arrays and plain objects; it sorts object keys but does not claim
full RFC 8785 canonicalization.

Prepare a JSON configuration with `campaignId`, `repositoryRoot`, `jobIds`,
`runtimeRoot`, `jobConfigRoot` and `outputRoot`, then run:

```console
pnpm evidence:custody -- capture /absolute/path/to/config.json
pnpm evidence:custody -- verify /absolute/path/to/manifest.json /absolute/path/to/evidence EXPECTED_MANIFEST_SHA256
pnpm evidence:custody:test
```

Capture prints `manifestSha256`; the caller must retain that digest outside the
captured directory and provide it to verification. Manifest bytes cannot
authenticate themselves. Missing or mismatched trusted digest fails custody.
Capture derives the V2 baseline from the canonical, clean Git worktree and its
tracked package and lock files while observing the active Node.js and pnpm
versions. Caller-declared V1 baselines and continuations are rejected.

Capture includes each allowed job's configuration, current result alias,
progress, events, log, attempt journals and exactly decoded
`lastOutputSummary` bytes. Missing historical bytes and unproven alias identity
become explicit exceptions. They are never reconstructed. Malformed journals
and duplicate JSON keys are rejected.
Verification parses stored attempt journals again within fixed resource limits
and requires their attempt identity, terminal status, timestamps, output summary
and continuation lineage to match the manifest. Verification reports custody,
terminal-state, alias, path, source-independence, hypothesis, draft-scope,
synthesis and promotion gates independently; worker counts never satisfy a
source or voting requirement.

Attempt entries from every journal are combined before current-alias binding.
The mutable alias binds only when its recognized versioned wrapper identifies
the same job, canonical attempt ID, latest attempt count, and terminal status;
historical attempts cannot own it. Otherwise identity is
reported as unproven. Duplicate attempt numbers are rejected as ambiguous.
Identical bytes observed under different provenance are also rejected instead
of silently collapsing their source path or evidence kind. Promotion-eligible
claims require both two explicit publisher-to-source bindings over eligible
primary-source kinds and stored successful attestations for every executable
result. A future generalized custody service may model multiple provenance
occurrences explicitly, but this bounded research tool remains fail-closed.

After capture, verification treats the stored object's SHA-256 digest and byte
size as authoritative; checking whether a mutable source path still exists is a
separate, explicit live-source audit. Source paths in the manifest are portable
relative metadata, and a proven current alias is bound to the latest captured
attempt wrapper in the immutable object store. The store root must be
exclusively owned by the custody process. Publication revalidates root and parent directory
identity and fails closed on a detected swap, but Node's path-based filesystem
APIs cannot make this a security boundary against a hostile same-user process.
The `verify` command reports integrity for a portable NO-GO bundle. V2 has no
promotion mode: promotion requires a separate authenticated receipt schema and
operation that are not implemented by this qualification tooling.

Capture applies non-raisable defaults for per-file bytes, aggregate bytes, file
count, directory depth, JSON depth, JSON node count, JSON string length and
manifest collection sizes. It rejects symlinks and stores directories and
objects with owner-only POSIX permissions. Live-source
audit reopens and hashes the exact source bytes using canonical-parent and
identity checks, plus `O_NOFOLLOW` where Node exposes it. Platforms without
that flag do not receive an atomic no-follow guarantee. Secret
scanning recognizes common credential shapes but remains best-effort; passing
it is not proof that arbitrary sensitive content is absent.
