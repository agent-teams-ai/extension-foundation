---
id: research.live-module-update-design-validation
type: research
status: active
owner: architecture
summary: Detailed design checkpoints, source-backed reuse decisions, bounded spike plans, and standalone repository preparation.
---

# Live Module Update Design Validation 2026-11-23

<!-- cspell:words Piral -->

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

These are hypotheses/source observations. The final frozen plan, dependency
audit and independent review precede execution. No new runtime test has passed
at this planning checkpoint. Existing MF, SystemJS, editor and database results
remain historical evidence rather than a new test count.

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
