---
id: research.live-application-spikes
type: research
status: active
owner: architecture
summary: Expanded owner vision, additional source-backed mechanisms and bounded backend/browser qualification of live logic and durable plugin lifecycle.
---

# Live Application Evolution: Vision and Executed Spikes

<!-- cspell:words Directus NocoBase Pharo EBADF -->

## Scope and authority

**Observed: 2026-11-18, Europe/Kiev.** The owner wants substantive application
logic to change while the frontend or backend remains running. Changes authored
with an agent should become reusable, shareable plugins, survive restart, and
remain manageable alongside eligible built-in features. The
[canonical high-priority vision](../open-decisions/OD-003-module-runtime-and-public-spi-choices.md#owner-prioritized-live-application-platform-vision-2026-11-18)
is now prominently linked from the repository README, AGENTS and documentation
index. It must inform new feature boundaries from the start.

This continuation adds four implementation studies and two disposable execution
profiles to the [preceding deep study](live-plugin-evolution-final-research-and-architecture-2026-11-17.md).
That study already covers OTP, Felix, Temporal, Restate, Envoy, Golem, wasmCloud,
MCP and native Effect boundaries; this report concentrates on persistent plugin
products, live programming and practical application behavior. Source inspection,
executed local behavior and production qualification remain distinct.

**Executed result:** the corrected backend run passed all five cases. The real
Chromium end-to-end scenario also passed, with 41 recorded comparisons and no
uncaught page errors. Strict TypeScript 7.0.2 checks passed for both fixtures.
The browser result was downloaded and bound to the exact reviewed inputs;
screenshots show the live and restored states. These observations establish the
named trusted fixtures, not complete production readiness.

Research does not adopt a production runtime, publish an SPI, supersede accepted
ADRs, release a package or authorize merge. Ordinary-update interruption remains
explicitly OPEN in OD-003. Retaining old operations is the backend experiment's
chosen profile, not an owner-selected universal default.

## What the additional industry mechanisms show

| Implementation inspected | Concrete mechanism | Useful boundary for this architecture |
| --- | --- | --- |
| Directus 12.6.1, `b17d2e94ac8dd118f6c3c28b5b04337e97fdd418` | Durable extension settings plus package storage; serialized server unregister/load; separate browser reload handling. | A settings acknowledgement, completed reload and capability readiness are separate facts. This source does not establish healthy-old generation retention. |
| NocoBase 2.2.47, `03efe7e0681aca73987e19b718997e8ce4ddb364` | Persisted installed/enabled/version records reconstruct plugins. Enable/disable of an already-started application takes its restart path. | Persistent plugin management is useful independently of whether a given feature can change live. Plugin-shaped architecture alone does not establish uninterrupted current work. |
| Lively.next, `694053603639947be013f3e6d803979a87af988b` | Instrumented module bindings, class/prototype updates and object-package persistence support live authoring. | Existing object identity can survive while later method lookups change. Saving source and applying a live edit are not one transaction in the inspected path. |
| Pharo 14.0.0, `1ad0bf20f22fd3a720ec809b2b84096c3c6d1129` | VM-supported method installation, slot copying and identity forwarding during structural class changes. | Even this dynamic runtime invalidates some retained closures when an instance layout shrinks. Logical image persistence does not preserve external sockets. |

These are release/source observations, not executed upstream reproductions or
claims of defects. The pinned implementation references are
[Directus service](https://github.com/directus/directus/blob/b17d2e94ac8dd118f6c3c28b5b04337e97fdd418/api/src/services/extensions.ts),
[Directus manager](https://github.com/directus/directus/blob/b17d2e94ac8dd118f6c3c28b5b04337e97fdd418/api/src/extensions/manager.ts),
[NocoBase application](https://github.com/nocobase/nocobase/blob/03efe7e0681aca73987e19b718997e8ce4ddb364/packages/core/server/src/application.ts),
[Lively module implementation](https://github.com/LivelyKernel/lively.next/blob/694053603639947be013f3e6d803979a87af988b/lively.modules/src/module.js)
and [Pharo class installer](https://github.com/pharo-project/pharo/blob/1ad0bf20f22fd3a720ec809b2b84096c3c6d1129/src/Shift-ClassBuilder/ShiftClassInstaller.class.st).

### Persistence and visible application readiness need separate contracts

Directus's settings update awaits its database transaction, then starts reload
without awaiting that promise. Its queue can also coalesce a pending reload by
returning an already-resolved promise; the actual task unregisters before loading.
These are concrete reasons to report persisted selection and observed capability
readiness separately. They are not evidence that every extension callback has
ended when a router or listener is removed.

Directus's [rich-text contract](https://directus.com/docs/guides/extensions/app-extensions/richtext)
also shows why state ownership matters: an already-open editor retains its
schema through server extension reload; saving and reloading the browser page
applies the new version. Removing an extension does not immediately erase stored
content. NocoBase's [installation guide](https://nocode.docs.nocobase.com/nocobase-cli/plugins/third-party)
separates import, application restart, enablement and verification. Those useful
distinctions should remain explicit in our user experience even where a narrower
feature supports immediate live replacement.

### Live programming is an inspiration, with a different execution contract

Lively's `changeSource` starts source writing and live evaluation together using
`Promise.all`; the inspected function supplies no shared rollback transaction.
Its [README](https://github.com/LivelyKernel/lively.next/blob/694053603639947be013f3e6d803979a87af988b/README.md)
describes a beta authoring environment and distinguishes deployed frozen apps
from the powerful development server. Borrowing its immediate feedback loop
does not qualify that development server as a multi-user plugin sandbox.

Pharo's structural migration can preserve object identity through VM support,
but the inspected shrinking-layout path replaces affected retained block code
with an error-producing block. Its
[socket implementation](https://github.com/pharo-project/pharo/blob/1ad0bf20f22fd3a720ec809b2b84096c3c6d1129/src/Network-Kernel/Socket.class.st)
also states that sockets do not survive image snapshots. A JavaScript library
should define a supported operation/state boundary instead of promising arbitrary
VM-level continuation or copying this machinery into a new framework.

**Inference:** the strongest common direction for our goal is a mutable authoring
workspace feeding admitted immutable executable generations, with explicit
consumer-owned selection and recovery. The user can experience a fast live loop
while the architecture preserves these distinctions. Trusted in-place editing
can remain a separately qualified profile where its semantics are acceptable.

## Executed backend: live logic, native resources and actual restart

The final local run used Node 24.22.1, strict TypeScript 7.0.2, public Get Modular
Core/Assembly 0.8.0, native Effect adapter 0.1.1 and Effect 4.1.4. **Five cases
passed; zero failed, cancelled or skipped.** The final runtime took 4.040 seconds.
These are bounded test observations, not a performance benchmark.

The fixture uses a real loopback HTTP endpoint, a GM provider and a separate
consuming endpoint module. Public preparation and `prepared.layer` construct
the native composition. Effect `RcMap` with zero TTL owns keyed acquisition and
borrower lifetime. Native child Scopes own candidate readiness holds; each HTTP
operation uses `Effect.scoped` for its borrow. The entry Scope owns its resource.
One consumer semaphore joins selection with scoped borrowing, while candidate
preparation occurs outside the admission critical section. A request revision
rejects a preparation made stale by a newer intention.

| Executed case | Independent observation | Bounded conclusion |
| --- | --- | --- |
| Live replacement | An admitted v1 request returned 140 while v2 remained active and new calls returned 120; another v2 branch returned 32. | New requests can use changed business logic while an old operation keeps coherent old semantics. |
| Same artifact activated again | A second held old call retained its readable file while identical v1 bytes received a new activation incarnation and resource. After final release, `FileHandle.stat()` rejected with `EBADF`; each observed physical close occurred once. | Content identity and runtime incarnation differ; native resources can retain the old instance until its actual borrower ends. |
| Partial acquisition fails | A candidate opened a real file, then failed initialization. Its file closed; old serving logic and the prior parsed persisted profile remained. | Candidate startup failure did not publish it or destroy the healthy selected instance in this path. |
| Older preparation completes late | A paused candidate lost to a newer selected intention; it returned `stale` and released only its own resource. | Completion order must not override the single owner's current intention. |
| Process recovery and altered bytes | Fresh processes restored saved selections and disabled state. At a parent-observed checkpoint, persisted v2 coexisted with active v1; after actual SIGKILL, a new process restored v2. Changed artifact bytes failed before a top-level sentinel. | Persisted target, active implementation and resource lifetime are separate facts; verification must precede evaluation of the exact captured bytes. |

The first two rows belong to one runtime test; the last row combines two tests.
The case count remains five. The SIGKILL observation makes **no claim that Effect
finalizers ran**. A single-writer JSON profile with atomic rename is ordinary
fixture configuration, not the EF PostgreSQL catalog, OCI trust admission,
distributed compare-and-swap or power-loss durability.

Generated plugin modules have zero runtime imports. The loader hashes captured
bytes and evaluates that exact snapshot through a data URL. This avoids a
verify-path/execute-path race for the self-contained fixture; it is not a
general dependency-closure resolver. Node may retain imported code in its module
cache: file closure does not prove physical code unload or bounded memory across
unlimited updates.

The original runtime attempt exposed a fixture identity error: a raw UUID can
start a segment with a digit, which GM correctly rejected before factories ran.
The fixture now derives implementation identity from the artifact digest and
keeps incarnation separately. Independent result review then strengthened the
old-call oracle: one old call must complete while v2 is still active, while a
second checks same-artifact reactivation. Original failures and the intermediate
pass are retained; only the corrected final run supports the result above.

## Executed browser: live logic, persistence and compatible transfer

The reviewed browser fixture changes a quote algorithm, not only styles. v1
produces 120.00 including the eligible built-in shipping feature; v2 produces
102.50 for the same input. The v2 JavaScript is deliberately built and published
only after the running document visibly computes v1. An immutable held call
captures implementation, input and built-in selection; later UI input changes
must not alter its result. Candidate TypeScript source is predetermined; its
build and publication happen after that first visible result.

The successful hosted scenario exercised:

- unchanged document-instance token through live logic replacement;
- preserved application-owned draft, followed by a real page reload that restores
  the selected plugin and draft in a new document;
- exact exported artifact imported into a fresh isolated browser context;
- disable/re-enable, then remove/reload without resurrection or user-data loss;
- persisted eligible built-in selection and rejected management commands for
  the fixture's protected control surface;
- wrong-target and altered-digest rejection before a module's top-level sentinel;
- a plain JavaScript negative control showing mixed revisions through mutable
  method lookup, compared with coherent captured functions.

Transfer means a fresh installation of the same compatible consumer, not an
independently authored public SPI implementation. Protected-command checks do
not establish hostile-code isolation. The negative control is not a reproduced
Lively or Pharo defect. Backend and browser artifacts have different concrete
contracts and execution targets; no universal executable format is claimed.

**Observed values:** the held v1 result stayed 120.00 while current input and
shipping selection changed and v2 returned 205.50. Restoring the original input
produced 102.50, with the original document-instance token unchanged. Page reload
created a different document and restored v2, the draft and the same 102.50
calculation. A clean browser context imported the exported exact artifact and
independently computed 102.50 using its compatible consumer.

Disabling retained the installed bytes across reload; removing the installation
did not revive it and did not erase the draft. The built-in shipping selection
persisted independently. Rejected target/digest candidates left the prior
profile and active binding intact and did not execute their top-level sentinel.
The plain-JavaScript control produced mixed 110 versus captured 11 and whole-new
115, exposing why retaining an object reference alone is not operation affinity.

This is **one native end-to-end test with 41 recorded comparisons**, plus its
additional assertions, not 41 independent tests. It passed with zero failed,
cancelled or skipped tests; total native suite time was 3.471 seconds. That
duration is an execution observation, not a benchmark. The browser was Chromium
151.0.7922.34, driven by pinned Playwright 1.62.1 on Node 24.22.1.
Persistence here means document reload under the same browser storage profile;
the test does not terminate and restart the entire browser executable.

Local strict TypeScript checks passed. The local Chromium process failed before
page creation with an OS socket permission error. The official connected browser
route lacked an originating extension context; the separate cloud browser could
not reach the local fixture server. No security workaround or altered assertion
was used. The same frozen source then ran through a bounded official GitHub
Actions job using pinned Playwright 1.62.1 and its installed Chromium.

The first hosted test also passed, but its overall job failed when the artifact
uploader rejected a path containing `..`; no result archive was produced. The
minimal correction passed the canonical absolute path to the uploader. Source,
assertions, dependency pins and permissions were unchanged. The original failed
job and its successful test step remain visible; they are not relabelled as a
successful complete delivery.

The [input archive](evidence/live-application-browser-input-20261118.tar.gz) and
[input manifest](evidence/live-application-browser-input-20261118.manifest.json)
bind all fourteen files to archive SHA-256
`ee51b6c1cddd63f33b4a56a505140b46876fb8e2414b62920345705b38138ac4`.
The corrected [hosted run](https://github.com/agent-teams-ai/extension-foundation/actions/runs/44205511602)
completed successfully at commit `4f77b5f61b1053e9493091043c14a3caa447b7cf`,
including result upload. Artifact `14383646439` contained 20 files, 255,662 bytes;
the downloaded ZIP matched GitHub SHA-256
`5411de8b302497d496fc9dcb841675cacd1037588c90ee951d154df7a8a8320f`.
Its input receipt names that commit, run and the unchanged input archive digest.
The workflow has only contents-read permission, no secrets, and no changes to
existing required gates or repository dependency pins. Later report-only commits
can reuse this result because its frozen source/workflow inputs are unchanged;
their own required repository checks remain separate.

## Architecture recommendation and modular ownership

This is a proposed implementation direction for the owning decision, informed
by the measured backend behavior and the source studies above:

1. **Keep authoring separate from executable admission.** Agents edit a workspace;
   the consuming contract validates and tests a candidate, binds its complete
   executable identity and requests only permitted capabilities.
2. **Prepare a candidate before selecting it.** A ready candidate can be selected
   under the existing authority. Failed or stale preparation releases its own
   resources without silently changing the current intention.
3. **Define the consistency unit of each operation.** Admission obtains selection
   and required lifetime together. A pure calculation, editor, stream and durable
   agent workflow need different explicit boundaries; retained code alone does
   not version shared data or remote services.
4. **Persist named facts and reconcile on startup.** Installed bytes, desired
   profile, observed activation, disabled state and retained user data must not
   be collapsed into a single loaded flag. Restart reacquires physical resources.
5. **Reuse before extracting new mechanics.** GM owns composition; native Effect
   can own scoped resources for the new application; the consumer owns policy,
   selection, contracts and state. A shared residual library is justified only
   after those existing responsibilities have been subtracted.

| Responsibility | Existing or proposed owner | Consequence for Clean Architecture and SOLID |
| --- | --- | --- |
| Module declarations and dependency composition | Get Modular | Do not duplicate the graph or introduce a global service locator. |
| Concrete feature contract and data meaning | Consuming module/product | Depend on narrow ports; substitution must preserve the declared behavioral contract. |
| Native acquisition and finalization | Existing execution/resource mechanism | Do not add a second reference counter, disposer or independently advancing lifecycle owner. |
| Desired selection, grants and operational policy | One consuming authority | The reusable implementation acts for that owner; it does not become another catalog or policy writer. |
| Persistence, transport, UI and execution adapters | Their existing boundaries | Keep infrastructure behind ports; runtime-specific details do not enter neutral feature contracts. |
| A proven shared residual mechanism | Library owner only after external qualification | Ordinary users should not inherit Agent Teams models, a universal plugin API or mandatory Effect adoption. |

DRY here means one authoritative implementation of each invariant, not one giant
abstraction for all plugin categories. Eligible built-in features can use the
same narrow contribution/provider boundaries, but **built-in module does not
mean external plugin artifact**. Authorization, canonical state and enforcement
remain protected. Removing code does not implicitly delete application data.

The backend result reduces the case for inventing a new runtime kernel: the
tested lifetime mechanics already exist. A reusable first delivery may be a
small adapter or recipe, and its genuinely shared residual can be zero. If code
is extracted, it must be useful to an ordinary independent consumer from that
first delivery, with the existing stronger gates still applying before a stable
public SPI or package publication.

### Support several explicit update profiles

The user experience can remain one coherent plugin management flow while each
feature advertises the update boundary it actually supports. The following is
a proposed classification, not a new mandatory interface or accepted default:

| Feature shape | Candidate update mechanism | Required boundary |
| --- | --- | --- |
| Declarative contribution or configuration | Validate and replace the selected contribution/configuration. | Consumers must declare when a new selection is observed; no resource lifecycle hook is needed for inert data. |
| Pure or bounded calculation | Prepare immutable code and select it for new operations. | Capture the operation's implementation and required inputs together; the browser/backend quote fixtures target this behavior. |
| Provider with native resources | Prepare a new composition and retain old resources for admitted work under a named policy. | Reuse the execution owner's scoped lifetime; declare finalizer failure, overload and shutdown behavior before production. |
| Isolated third-party service or worker | Prepare a replacement execution unit and switch a compatible transport route. | Isolation, grants, transport affinity and actual retirement need their own evidence; the current trusted fixtures do not qualify them. |
| Long-lived workflow or incompatible state/schema | Use a qualified workflow-version, migration or controlled restart boundary. | State meaning and external effects stay consumer-owned; retaining old code alone cannot make a shared schema compatible. |

For the first real slice, the recommendation is a narrow provider/calculation
contract with application-owned state and observable selection. This reaches
meaningful live behavior without requiring arbitrary object-memory migration.
The [prior mechanism study](portable-live-plugin-mechanisms-and-library-design-2026-11-17.md)
retains process/RPC, Wasm and browser alternatives; the
[deeper stateful study](live-plugin-evolution-final-research-and-architecture-2026-11-17.md)
retains durable workflow and VM tradeoffs. These remain available when a real
consumer needs their stronger or different boundary.

## Open questions and validation

The [owning open decision](../open-decisions/OD-003-module-runtime-and-public-spi-choices.md)
still holds the product question: may an ordinary update initiate interruption
of current work? Keeping healthy old work until a suitable boundary remains a
recommendation for discussion. These experiments do not decide it.

The next production qualification must use an actual consumer's state and
authority: a named feature contract, real artifact admission, grant checks,
state compatibility and observable recovery. Additional scenarios are justified
where that slice depends on them: long streams/sessions, failed finalizers,
overload, replica rollout, frontend/backend version skew, schema migration or
hostile-plugin isolation. Passing the present fixtures proves none of those
broader promises. No in-application LLM authoring loop was exercised: the fixtures
use predetermined candidate source. An agent's candidate must pass the same
admission as other code.

Actual new handwritten TypeScript is **1,291 lines**: backend 767 and browser
524, including independent tests, harnesses and the small local server. Generated
output, dependencies, configuration and prose are excluded. Production code is
zero. This is measured research cost, not an implementation estimate for the
complete platform. The initial plan estimated 800–1,350 combined lines.

The unchanged general local Foundation route remains unexecuted because it
would initialize its embedded TypeScript 5.9.3 dependency. Strict experiment
checking uses exactly 7.0.2. The standalone Docs Protocol route and unchanged
required hosted repository checks remain separate delivery gates; no compiler
pin or required check is weakened to make this research pass.

## Evidence and review custody

The complete [research and execution packet](evidence/live-application-evolution-20261118.tar.gz)
and [member manifest](evidence/live-application-evolution-20261118.manifest.json)
preserve the common plan, independent plan critiques, four-project source ledgers,
strict source/configuration files, exact dependency lock, generated fixtures,
original failures, corrected results and independent reviews. The browser's
original downloaded ZIP, extracted JSON, screenshots, exact input receipt and
official job log are retained together. Third-party dependency trees and copied
upstream implementations are excluded.

The [review dispositions](plugin-research-review-and-decision-record.md#live-application-evolution-and-executed-spikes-2026-11-18)
explain the material corrections: executable byte snapshots, separate activation
identity, meaningful held-call inputs, actual crash/resource oracles, accurate
scope/cleanup wording and the artifact upload path. A visual preview ambiguity
was resolved by inspecting the original PNGs: the draft-text region is identical
in both screenshots and independent OCR reads the same note. No additional
browser defect or runtime rerun was inferred from that initial misreading.

The [delivery validation](evidence/live-application-evolution-20261118.validation.json)
records exact documentation identities and the complete local Docs Protocol
result. Final publication and hosted checks are attached to the existing
[Draft PR 55](https://github.com/agent-teams-ai/extension-foundation/pull/55).
The successful browser run remains bound to its unchanged input commit;
report publication is a separate commit with its own required checks. The
historical November 14 and November 17 evidence archives were reverified and
remain unchanged.
