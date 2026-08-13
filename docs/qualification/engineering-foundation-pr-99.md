---
id: qualification.engineering-foundation-pr-99
type: qualification
status: qualified
owner: architecture/tooling
summary: Records disposable compatibility evidence against the exact document writer candidate from Engineering Foundation PR 99.
related:
  - ADR-0001
---

# Engineering Foundation Document Writer PR 99

## Qualified Input

- Repository: `agent-teams-ai/engineering-foundation`
- Pull request: `#99`
- Exact head: `6a2703d267032a0a19847e6b80ad96bdeeddf584`
- Published registry baseline retained by this repository: `0.15.0`

## Evidence

The exact head was built in a clean detached checkout and attached locally to
this repository. The following checks passed:

- Foundation self-check and all enabled consumer capabilities;
- development-only dependency enforcement;
- document catalog doctor and literal search;
- create-only `docs new` dry-run and apply in a disposable consumer copy;
- discovery of the created document;
- clean post-apply doctor and no-op recovery.

The local attach was removed after qualification. Registry-mode checks remain
the merge gate.

## Adoption Rule

This record does not authorize depending on a pull request or mutable branch.
After the change is merged and published, adoption requires an exact-version
dependency update, lockfile update, explicit reachability policy in the
authoring profile, removal of the temporary `0.15.x` read-only catalog profile,
and the complete repository gate. The canonical authoring profile already
declares reachability; the old registry release rejects that new field.
