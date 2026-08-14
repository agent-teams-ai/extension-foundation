# Documentation Authoring

Protocol: `agent-teams.docs-protocol/v1`

Use this Skill for every governed documentation task.

1. Read `AGENTS.md` and keep its product boundaries in force.
2. Run `pnpm docs:info`; treat its output as the authoring authority.
3. Search first with `pnpm docs:find -- <query>` and relevant filters.
4. Reuse or relate an existing document when it already owns the subject.
5. Select only a type, owner, status, and identity reported by `docs:info`.
6. Supply all required metadata and explicit relations.
7. Express implementation references as `{enforcement,pattern}` code anchors.
8. Preview with `pnpm docs:new -- <arguments> --dry-run`.
9. Confirm the destination, metadata, relations, anchors, and index instruction.
10. Resolve every diagnostic; a preview does not write or reserve an identity.
11. Apply the same reviewed intent with `pnpm docs:new -- <arguments> --apply`.
12. Preserve the returned receipt as the proof of the applied intent.
13. Manually add the exact reported Markdown link to the exact reported index.
14. Never let the writer create, infer, or silently rewrite an index entry.
15. Run `pnpm docs:check`, followed by the repository's normal quality gate.
16. If authority or transaction state is unclear, run `pnpm docs:doctor`.
17. Run `pnpm docs:recover` only when doctor reports a pending transaction.
18. Never hand-edit transaction state, recovery evidence, or generated metadata.
19. Never edit an accepted ADR; create an explicit superseding ADR instead.
20. Keep unresolved choices explicit until formally resolved.
