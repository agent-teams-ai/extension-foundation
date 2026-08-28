---
id: qualification.module-system-v1-productization.red-team-findings
type: qualification
status: active
owner: architecture
summary: Exact-head red-team findings and their fail-closed dispositions.
---

# Red-Team Findings

Eight independent hosted red-team reviewers inspected exact revision
`c9a01739a3a0906bfd52d8573a76e9d0058568ca`; four later reviewers inspected
exact revision `4af823cdfd817660c4efe03fd62fb068ae8e9e49`. Eight follow-up reviews then
compared Extension Foundation `e1a3492` with the historical Agent Runtime
revision `493c6c3`, later superseded by the current source record at `7be9982`. Their
reports are corroborating evidence, not votes or decision authority. A
continuation of the first wave replayed completed reports without producing
edits; the ledger keeps those as second attempts rather than new independent
reviewers.

| Area | Confirmed finding | Disposition before final review |
| --- | --- | --- |
| Lifecycle | Response correlation omitted scope, extension instance, endpoint direction, and immutable dispatch identity | Added a host-created opaque dispatch receipt and cross-scope, cross-instance, reversed-endpoint, forged-receipt, and mutation tests |
| Lifecycle | A receipt could be replayed, leaked, or accept the wrong response kind | Bound host-issued nonce and expected response kind to one instance-local tracker; success consumes it, explicit cancellation releases one dispatch, and host close releases every abandoned receipt |
| Lifecycle | Cordis disposer ownership could collide across generations or overlapping coordinators | Keyed the qualification adapter by scope, coordinator incarnation, generation, and module identity; proved old/new cleanup and overlapping same-scope coordinators remain isolated |
| Security | JSON execution/publisher claims could describe their own trust | V1 is negative-only; no executable or publisher claim can authorize promotion without a separate authenticated receipt |
| Security | Lexically safe roots could traverse a symlinked auth-root ancestor | Canonical ancestry is checked before and after object-store creation and before source reads |
| Security | Verification trusted manifest bytes without an external trust anchor | Verification now requires the caller's expected manifest SHA-256 and rejects mismatched bytes |
| Security | Capture and source reads had no bounded file, aggregate, count, or depth policy | Added non-raisable default limits, no-follow reads, owner-only stores, and structured failures |
| Evidence | Baseline `{}` and incompatible object-role reuse were accepted | Baseline is closed and structured; object kind, provenance path, and custody role are bound exactly |
| Operations | Product dossier reported a completed status before final review | Current productization documents remain active and the manifest remains `review-ready` pending final exact-head review |
| Product | Frontend was promoted to Static V1 GO from self-asserted file records | Downgraded it to a no-go measurement candidate and retained only exact Git source custody in Foundation |
| Product | Agent Runtime was recorded before its Codex and Claude Code production paths landed | The historical `493c6c3` lineage was superseded by the exact current source lock at `7be9982`; recorded `SOURCE_CUSTODY_BASELINE_RECORDED` while keeping `L1-L5` closed |
| Product | Codex and Claude Code could be mistaken for interchangeable providers | Removed Foundation's product-specific interpretation; the owning product must verify any such claim |
| Testing | Claude Code lacks the direct default-root test shape already present for Codex | Recorded a non-blocking Agent Runtime follow-up; Foundation makes no topology verdict |
| Scope | Synthetic module scenarios could be mistaken for product demand | Rejected new profile, provider-failure, graph-shape, desired-state, durable-crash, and process-host fixtures until a real owner admits the level |
| AI DX | Candidate C was preselected without product evidence | No declarative candidate is preselected; handwritten typed factories and Pure DI remain the baseline |
| Lock-in | Cordis criteria conflicted across documents | Replaced the fixed LOC percentage with one multi-factor scorecard; Cordis remains a private resource-adapter candidate only |
| Performance | Heap delta was presented as a memory cap and property runs were not replayable | Heap delta is diagnostic only, graph claim is narrowed to an ID-DAG chain, and fixed seeds are recorded in tests |
| Cross-consumer | External product claims lacked executable source custody | Added bounded exact Git origin/commit/tree/declared-blob custody; source interpretation, semantic dataflow, runtime behavior, and independence remain unproved |
| Architecture | Authoring, selection, lifecycle, and process protocol were one roadmap step | Split them into independently triggered `L1-L4` gates with separate rollback points |
| Cross-consumer | Two IDs from one repository could satisfy the existing package checker | Shared extraction now independently requires provider-ownership verification; Package Policy remains owned by its separate active task |
| Governance | Qualification evidence falsely treated accepted ADR-0013 and ADR-0014 as conflicting authorities | ADR-0014 is the accepted product-local authoring authority under ADR-0013; removed the invented successor gate |

## Residual Limits

- No product runtime graph, dynamic module host, public SPI, or promotion
  authority is qualified.
- The 1,000/10,000-node samples prove chain stack safety and report diagnostic
  timings only. They do not enforce a timing or memory threshold and do not
  cover wide/dense graphs, peak RSS, retained memory, or a production SLO.
- Product source evidence is exact for the recorded local mirrors only and is
  not authenticated remote publication or product approval.
- Final exact-head reviews and CI remain required before this research gate can
  be considered complete.
