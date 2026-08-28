---
id: qualification.package-policy-coordination-primitives
type: qualification
status: qualified
owner: architecture/tooling
summary: Records candidate local lock primitives and the limits that apply before package-policy multi-writer coordination is admitted.
---

# Package Policy Coordination Primitives

## Scope

This record preserves dependency research for
[issue 25](https://github.com/agent-teams-ai/extension-foundation/issues/25).
It does not admit a dependency, select a protocol, authorize distributed
coordination, or change the current trusted single-writer contract.

The issue trigger is reached only when package-policy mutation supports multiple
cooperating writers or scaffold publication claims linearizability with those
writers. Until then, adding a lock dependency would be premature.

## Preferred Local Candidate

[`fs-native-extensions@1.5.0`](https://github.com/holepunchto/fs-native-extensions/tree/v1.5.0)
is the strongest same-host local-workspace primitive observed on 2026-08-28:

- Apache-2.0 license, npm provenance, exact-version pinning, and active upstream;
- shared and exclusive advisory locks;
- `LockFileEx` on Windows, open-file-description locks on Linux, and `flock` on
  macOS;
- kernel-owned release after process termination, avoiding heartbeat-based
  stale-lock takeover; and
- upstream Windows, Linux, and macOS continuous integration.

A disposable Node 24.18.0 macOS arm64 probe verified cross-process exclusion
and reacquisition after the lock owner was terminated. This local probe is not
Windows, Linux, NetworkFS, crash-matrix, or production qualification.

If the issue trigger is reached, the package may be evaluated only behind a
Foundation-owned `PolicySnapshotCoordinator` adapter. The adapter must own a
stable lock file that is never removed or replaced, bounded non-blocking
acquisition, deadline and cancellation, process-local fairness, canonical
workspace identity, error translation, and deterministic crash and ABA tests.
Native handles, package errors, and package types must not cross the adapter.

## Other Candidates

[`proper-lockfile@4.1.2`](https://github.com/moxystudio/node-proper-lockfile/tree/v4.1.2)
remains a possible explicit NetworkFS adapter candidate because it uses atomic
directory creation. Its modified-time heartbeat, stale-lock takeover,
exclusive-only model, old release, and suspended-event-loop behavior require a
separate qualification. It must not be an automatic fallback from a failed
native adapter.

`fs-ext`, `fs-native-lock`, `@ster5/global-mutex`, `cross-process-lock`, and a
repository-owned `mkdir` protocol are not preferred. They add portability,
maintenance, fallback, adoption, or stale-owner uncertainty without a proved
advantage over the two candidates above.

SQLite transaction locking is crash-safe and cross-platform, but introducing a
database solely for repository scaffolding coordination would create more
state, recovery, and lifecycle responsibility than this problem justifies.

## Hard Boundaries

- Same-host advisory locking coordinates only writers that use the coordinator.
- An editor or process that ignores the coordinator remains outside the
  linearizability guarantee; apply-time validation must continue to fail closed.
- Network filesystems require an explicit adapter and qualification.
- Hosted multi-instance coordination requires a database-backed generation and
  fencing protocol, not a local file lock.
- No lock primitive may enter domain, application, module, plugin, or public SPI
  contracts.
- No package is installed until the issue trigger, exact-version recheck, and
  Windows, Linux, macOS, cancellation, crash, ABA, and recovery tests pass.

## Reversal Conditions

Re-evaluate the preferred candidate if its supported-platform prebuilds,
provenance, maintenance, Node 24 compatibility, or advisory-lock behavior no
longer pass qualification. Reject the entire lock approach if the real writer
topology is distributed or cannot require every writer to cooperate.
