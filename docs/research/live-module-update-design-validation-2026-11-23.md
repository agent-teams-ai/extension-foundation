---
id: research.live-module-update-design-validation
type: research
status: active
owner: architecture
summary: Detailed design checkpoints, source-backed reuse decisions, bounded spike plans, and standalone repository preparation.
---

# Live Module Update Design Validation 2026-11-23

<!-- cspell:words Piral OSGi OpenComponents -->

## Scope and authority

This delivery follows the owner's 2026-11-23 request to detail the reusable
library, evaluate implementation patterns critically, run discriminating spikes
and prepare a separate, purpose-neutral project. The working repository name is
**live-module-updates**. The existing [system map](../architecture/live-extension-system-map.md)
and [blueprint](standalone-live-plugin-library-blueprint-2026-11-22.md) remain the
entry points for confirmed direction. This research does not accept a public
API or resolve the [Q1-Q7 owner choices](module-federation-update-boundaries-and-architecture-options-2026-11-22.md#owner-decision-matrix).

Starting source: `f285333c5869b1f69070efee29b205da8fd19e49`.
Research, proposed contracts, native results, published package availability,
repository admission and production qualification remain separate claims.

## Detailed-design work

The proposed [Live Module Update Operation](../architecture/live-module-update-operation.md)
now specifies separate publication/adoption/cleanup outcomes, semantic ports,
feature-local authoring, integration dimensions and 13 adverse cases. It keeps
one substantive operation feature rather than creating a package per phase.

| Work | Required concrete result |
| --- | --- |
| Responsibility and public mechanism audit | Current Get Modular, Extension Foundation and Engineering Foundation owners; actual public APIs and missing qualification |
| Complete update operation | Planning, preparation, publication, reconciliation, useful adoption and retirement; narrow consumer primitives with adverse cases |
| Modularity and global use | Authoring seams for eligible built-in features and plugin artifacts; external consumers without Agent Teams infrastructure |
| Industry implementation review | What to reuse, what each mechanism actually promises, counterevidence and transferable tests |
| Bounded native spikes | Reviewed hypotheses, exact inputs, independent oracles, strict compiler coverage and preserved raw results |
| Standalone repository preparation | Discoverable specification, technology/decision registers, immutable provenance and honest bootstrap status |

The library owns the reusable operation implementation. Product authority,
canonical state and physical custody retain their existing owners. A resource
scope does not automatically provide call admission or generation retention;
a private upstream kernel is not a public dependency. Optional adapters must
expose their actual semantics without importing every framework into the core.

## Evidence and lessons

The first checkpoint retains the delivery plan and source-reviewed spike brief
in the [planning packet](evidence/live-module-design-plan-20261123.tar.gz), with
its [content manifest](evidence/live-module-design-plan-20261123.manifest.json).
They are planning evidence, not executed results.

Two candidate discriminators are narrower than another framework survey:

- Piral exposes asynchronous setup but declares synchronous teardown. Test
  readiness separately from action completion, and whether a delayed disposer
  for an old page registration can remove a new registration at the same route.
  Include its reference-specific extension disposer as counterevidence; do not
  generalize one registration contract to the whole framework.
- A scope's repeated close operation may have a different completion contract
  from its first close. Check the exact public native mechanism before using
  a repeated call as evidence that old resources are gone.

At the initial planning checkpoint these were hypotheses/source observations.
The frozen plan, dependency audit and independent review preceded execution.
The actual results appear below. Existing MF, SystemJS, editor and database
results remain historical evidence rather than a new test count.

### Detailed source review

The [design review packet](evidence/live-module-design-review-20261123.tar.gz)
and [manifest](evidence/live-module-design-review-20261123.manifest.json) preserve
the complete architecture report, 24 classified findings, critical industry
register, 42 source records and independent document/code reviews. They include
the original review findings and their dispositions.

| Finding | Design consequence |
| --- | --- |
| Public Resources owns cleanup; current GM lifecycle kernel remains private | Qualify a supported admission/custody mechanism through its owner; do not copy it or make each consumer implement counters |
| GM ADR-0030 withdrew ADR-0028's old eligibility order | Preserve the supersession and ADR-0029's surviving gates; withdrawal does not imply publication |
| Piral teardown is declared synchronous; page and extension disposers use different identities | Separate a cooperative resource bridge from arbitrary delayed registration cleanup; qualify the exact public path |
| Effect repeated close can return before earlier finalizers finish | Retain the actual original close outcome; do not equate state idempotence with joined cleanup |
| Effect already owns native Layer sharing and interruption accounting | Evaluate its public mechanisms in the optional native profile before adding a cache or reference counter |
| OSGi binds a replacement before unbinding the old reference | Old cleanup must preserve the successor's exact ownership; this does not establish whole-cohort atomicity |
| OTP offers a bounded native atomic-load operation and rechecks at finish | Expose each backend's actual guarantee; prepared does not imply publication is inevitable |
| Native Federation has staged rollback; OpenComponents accounts for reconnect | Preserve those useful protections and their exact scope instead of labelling the systems universally deficient |

These statements are source observations and proposed transfers. The primary
URLs and exact package/source cohorts are retained in the packet. Native
Federation's inspected source and published version differ; OC Node-client and
browser cohorts differ; the new Effect observation does not change an existing
consumer peer pin.

### Bounded execution inputs

The reviewed campaign has two declared Piral browser tests with five named
cases, plus one Effect Node test. It uses actual published libraries, the real
Piral renderer/registration APIs, a production bundle from its official code
generator, and native listener observations. It does not qualify the complete
live-update library or the previously proposed comparative application scenario.

Preparation exposed a real public-declaration dependency gap: Piral's full base
types require SystemJS declarations. The first strict compiler failure is
retained; installing actual SystemJS packages resolved it without declaration
shims or disabled library checking. Both fixture projects then passed strict
TypeScript 7.0.2. This is preparation evidence, not a native test result.

Independent source review corrected three evidence issues before execution:
retain observations even when host cleanup fails; preserve scenario and cleanup
errors separately; and record Effect assertion failures in its result. The
Piral runner executes the reviewed production build, and the original close
result remains retained across a successful cleanup retry.

Frozen inputs are in the [97-file campaign](evidence/live-module-contracts-v1-input-20261123.tar.gz)
and its [manifest](evidence/live-module-contracts-v1-input-20261123.manifest.json):
144,946 bytes, SHA-256
`5db80d05009fe298a6cc6d8a1a628a17c80fc8e429beb3dab811ecb5d1db99b1`.
The bounded hosted workflow runs only when those inputs or its own definition
change. It verifies archive members, exact installed dependency/TS identities,
strict compilation and the real build before native execution. A published
input is not a passed run; the result is recorded after actual completion.

The first hosted [run 45205566932](https://github.com/agent-teams-ai/extension-foundation/actions/runs/45205566932)
completed on `f40968f88a1fd29bea3dfcf207bab56e32b90e0d`: native logs report
Piral 2/2 and Effect 1/1 passed, with no failed or skipped tests. Both jobs then
failed artifact upload because the uploader rejects paths containing `..`.
No observation JSON was delivered, so comparison counts are not inferred from
the planned assertions. The [original failure packet](evidence/live-module-contracts-first-delivery-failure-20261123.tar.gz)
and [manifest](evidence/live-module-contracts-first-delivery-failure-20261123.manifest.json)
preserve complete job logs and the distinction between native success and
failed evidence delivery.

The correction uses canonical `runner.temp` roots for both profiles, including
early-failure artifact paths. Fixture code, test oracles and the 97-file input
archive remain byte-identical. The corrected execution receives a new source
and workflow identity; repeating these tests adds no distinct coverage.

The first path correction on `3b511d2a75829169c011baf3c114ec62c8c254b3`
produced [run 45207513737](https://github.com/agent-teams-ai/extension-foundation/actions/runs/45207513737),
which failed before any job or test ran. The source used `runner` in job-level
`env`, where the official [context table](https://docs.github.com/en/actions/reference/workflows-and-actions/contexts#context-availability)
does not permit it. The exact hosted validator annotation was unavailable;
this diagnosis is tied to the source and documented restriction, not a quoted
error. The [context failure packet](evidence/live-module-contracts-context-failure-20261123.tar.gz)
and [manifest](evidence/live-module-contracts-context-failure-20261123.manifest.json)
preserve that attempt and the corrected independent review.

The next correction initializes both paths in the first runner step through
`GITHUB_ENV`, before checkout or extraction. Review and bounded shell/path
checks passed; only actual hosted completion can establish evidence delivery.
The fixture and frozen archive are unchanged. The failed validation attempt
adds zero native executions and zero coverage.

### Observed native results

Corrected [run 45208310980](https://github.com/agent-teams-ai/extension-foundation/actions/runs/45208310980)
completed successfully on `b86e05988334f657d933fa412a02572b455dcd7e`.
Both native execution and artifact delivery passed. The [result packet](evidence/live-module-contracts-results-20261123.tar.gz)
and [manifest](evidence/live-module-contracts-results-20261123.manifest.json)
retain the two original downloaded ZIPs, full job logs, observations, exact
bindings and independent result review. Both ZIP digests match GitHub metadata
and upload logs; their contents passed integrity checks.

| Case | Actual bounded observation | Consequence for the proposed contract |
| --- | --- | --- |
| P1 | New setup rejected after acquiring a listener; outer action fulfilled and old managed contributions were already removed | Readiness must be separate from action completion; a captured callback is not a restored useful contribution |
| P2 | Delayed old page disposer removed the successor at the same route; the reference-specific extension survived | Require exact-instance ownership for the supported registration path; do not generalize every disposer as unsafe |
| B1 | The cooperative bridge exposed readiness rejection and closed the failed candidate's listener; old contributions remained absent | Failed-candidate cleanup is useful but does not provide nondestructive preparation or automatic rollback |
| B2/B3 | The successor remained useful while the old scope reported real cleanup debt; explicit retry removed the old listener, preserved the successor and retained the first failure report | Adoption, cleanup debt and successful retry are separate facts; reuse the existing Resources scope |
| E1 | Second Effect close returned before the original finalizer gate was released; joining the first close then established listener removal | Retain the actual original close outcome instead of treating repeated close as a join |

The delivered evidence records **3 tests, 6 named cases and 66 explicit
comparisons**: Piral 2 tests/5 cases/61 comparisons, Effect 1/1/5. All tests
passed with zero failures, cancellations or skips. Piral recorded no page or
infrastructure failures; its two deliberate setup-rejection console messages
remain in the observations. Repeated execution does not increase this coverage.

Both projects used Node 24.22.3, pnpm 11.25.0 and strict TypeScript 7.0.2.
The installed native-platform package graphs, real generated Piral bundle and
compiler identities were checked. These results qualify the frozen fixtures;
they do not implement the complete library, accept an adapter, prove arbitrary
foreign-plugin safety, select Q1-Q7 or establish comparative product advantage.

## Repository and Foundation boundary

The current organization [bootstrap route](https://github.com/agent-teams-ai/.github/blob/0b44c64c824f536bd1b085341e7669bcc64ef124/docs/repository-admission.md#new-repository-bootstrap)
requires full FMS v1.1, real feature ownership, Foundation coverage and native
gates for new production libraries. An archive, package envelope or successful
configuration check cannot substitute for this adoption. Foundation remains a
development dependency; its scaffold recipe supplies a package envelope and
does not invent the consumer's features or business layers.

The [registration route](https://github.com/agent-teams-ai/.github/blob/0b44c64c824f536bd1b085341e7669bcc64ef124/docs/repository-registration.md)
separates individual pending registration from a complete organization census,
Docs admission and enforced checks. Keep immutable standards and historical
evidence unchanged. Route repository instructions to central authority rather
than copying a second policy.

Repository creation is not yet observed. In this session the connected GitHub
tools have no creation operation, `gh` is unauthenticated, and the browser
extension requires the originating connected browser context. This limits
creation, not architecture, fixtures, review or publishing the prepared project
material in the existing branch. No organization registration is fabricated for
a nonexistent repository.

## Open questions and validation

The first complete-library consumer/profile and Q1-Q7 remain open. Detail the
compatible alternatives and their consequences before selecting a default.
Do not reopen the already accepted Agent Runtime provider journey as though it
were the same choice.

Completion requires cross-review of the proposed contracts, actual public API
availability, exact experiment evidence, reachable current documentation and
the final source's required checks. A prepared independent project must record
what was transferred, what changed and what still needs its owning admission or
publication gate. Useful commits are pushed immediately.
