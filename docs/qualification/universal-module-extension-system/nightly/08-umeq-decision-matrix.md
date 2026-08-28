---
id: qualification.universal-module-extension-system.nightly.umeq-matrix
type: qualification
status: qualified
owner: architecture
summary: Gives non-operative recommendations, confidence, costs, and reversal gates for UMEQ-009 through UMEQ-018.
related:
  - OD-002
  - OD-003
---

# UMEQ Decision Matrix

UMEQ-011 and UMEQ-016 are **accepted-existing** under ADR-0014; the remaining
UMEQs in this table are open. Recommendations for open entries are approval
aids, not resolutions. W11 static Pure DI was the nightly implementation
recommendation; entries about a graph describe reversal gates and costs, not a
parallel graph-first roadmap.

| ID | Recommendation or accepted projection | Status / confidence | Triggered cost | Reversal condition |
| --- | --- | ---: | --- | --- |
| UMEQ-009 | Defer process host; strict framed JSON is only an oracle | 0.96 | Wire: 4k-6.5k LOC; host: 8k-13k, 4-8 weeks | Choose JSON for bounded local TS control; Protobuf/gRPC for funded polyglot, remote, streaming, or multiplexing |
| UMEQ-010 | Static trusted built-ins plus private declarative catalog | 0.94 | Static: 2k-4.5k LOC; dynamic: 12k-22k, 6-12 weeks | Dynamic UI only for funded no-rebuild value plus containment and admission; collapse to React composition if no placement value |
| UMEQ-011 | Accepted-existing: every provider binding is explicit; installed-provider uniqueness never selects it implicitly | ADR-0014 | Literal binding: 80-250 LOC; any future resolver remains constrained by the accepted explicit-binding rule | A later superseding ADR; this row is not an open reversal fork |
| UMEQ-012 | Private handwritten TS port; no generation or publication | 0.96 | Schema/port split: 1.4k-2.9k, 1-2 weeks | JSON Schema after two-language fixtures; Protobuf for admitted RPC; TS-first only with reproducible generation |
| UMEQ-013 | Static default; minimal native private graph only after trigger | 0.95 | Graph/lifecycle floor: 4.8k-9.8k, 3-6 weeks | Stop if direct factories suffice; Cordis reopens only under deletion and parity gates; hybrid remains rejected |
| UMEQ-014 | Private ESM with explicit exports; defer public all-host promise | 0.97 | ESM: 500-950 LOC, 3-7 days; dual: 1.2k-2.4k LOC | Add CJS only for a named unavoidable synchronous `require` consumer |
| UMEQ-015 | Keep packages internal; extraction and publication are separate | 0.98 | Internal extraction: 2.5k-5k, 2-4 weeks; stable train: 6k-11k, 3-8 weeks | Preview only for a blocked independent implementer; stable SPI needs independent implementations and release gates |
| UMEQ-016 | Accepted-existing: immutable desired profiles prepare distinct candidate generations and publish by compare-and-set active-head revision; arbitrary JavaScript unload is not promised | ADR-0014 | Generation baseline: 4k-9k LOC; host-specific termination or broader coexistence remains separately gated | A later superseding ADR; physical termination and distributed cutover remain host- and deployment-specific open decisions |
| UMEQ-017 | Retain L0/D1/D2/T1 vocabulary; defer distributed mechanism | 0.99 | D1: 10k-20k; D2: 18k-35k; multiple months | Select per named topology; never promise simultaneous global multi-store cutover |
| UMEQ-018 | Manual exact digest may be pin-only; managed freshness needs TUF | 0.99 | TUF: 3.5k-11k LOC, 3-8 weeks plus operations | Any remote latest, channel, mirror, cohort, automatic check, revocation, or delegation activates TUF |

## Product Forks

| Fork | W11 choice | Confidence | Reverse when |
| --- | --- | ---: | --- |
| Ownership | ADR-0013/ADR-0014 product-local path; ADR-0012 is superseded historical authority | 0.99 | A later accepted decision changes ownership without moving product authority into Foundation |
| Composition | Feature exports a pure `FeatureModuleFactory`; application root owns static selection, configuration, and lifetime | 0.97 | Measured runtime-selection or independent-lifecycle need improves outcomes within the glue threshold |
| Cordis | Comparator only | 0.98 | Real consumer meets deletion, lifecycle, and isolation gates |
| Extism/WASI | Defer | 0.96 | Funded non-TS or stronger isolation case passes ABI and host qualification |
| Module Federation | Defer; possible Frontend adapter only | 0.95 | Independent deployment value and full Web/Electron security and operations gates pass |

Foundation extraction remains a separate fork after a real second consumer and
semantic reconciliation. One-way imports bound movement, but ownership,
versioning, compatibility, migration, and release policy are reviewed work.

See [deferred decisions](12-deferred-decisions.md), the existing
[unresolved decisions](../unresolved-decisions.md), and the
[executive report](01-executive-report.md).
