---
id: qualification.module-system-v1-productization.index
type: index
status: active
owner: architecture
summary: Evidence-bound gate for static product modules, private product graphs, and any later shared extraction.
---

# Module System V1 Productization Gate

This draft records the productization gate that follows the universal module
and extension qualification. It does not create a production runtime, public
SPI, Foundation package, or accepted product decision.

The gate evaluates six independently triggered levels:

1. product-owned Pure DI;
2. static authoring;
3. private runtime selection;
4. lifecycle coordination;
5. process or WASM placement; and
6. shared Foundation extraction.

The [consumer source evidence](consumer-source-evidence.yaml) is the canonical
source lock. It records executable candidate custody over exact local Git
origins, commits, trees, and selected regular-file blobs. It does not interpret
source, prove topology or semantics, attest remote publication, or grant product
approval. The [research manifest](research-manifest.yaml) links to that lock and
classifies historical hosted jobs as non-portable corroboration. The
[evidence ledger](evidence-ledger.yaml) remains fail-closed:
unknown or disputed claims are not promoted to decisions.

The current follow-up records `SOURCE_CUSTODY_BASELINE_RECORDED` only. Static
authoring remains a measurement candidate, while runtime
selection, lifecycle coordination, process hosting, shared extraction, and a
public SPI remain no-go.

## Evidence Custody Platform Contract

Strict evidence capture is supported on Linux and macOS only. Linux binds an
open file descriptor through `/proc/self/fd`; macOS uses the system
`/usr/sbin/lsof` command to prove the descriptor's canonical path before and
after reading. Capture fails closed when that proof is unavailable or changes.

Windows remains a supported verification platform for existing manifests and
objects, but it is not a capture platform in V2. A Windows capture attempt is
rejected before source I/O. This is an explicit custody limitation, not a
portable fallback with weaker symbolic-link or path-race guarantees.

## Results

- [Executive verdict](executive-verdict.md)
- [Consumer admission](consumer-admission.md)
- [Executable candidate source evidence](consumer-source-evidence.yaml)
- [Authoring API and gap matrix](authoring-api-and-gap-matrix.md)
- [Hybrid two-consumer module authoring measurement proof](module-authoring-measurement-proof.md)
- [Red-team findings](red-team-findings.md)
- [Production roadmap](roadmap.md)
- [Machine-readable qualification projection](current-roadmap.yaml)
