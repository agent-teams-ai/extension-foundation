---
id: research.live-plugin-evolution
type: research
status: active
owner: architecture
summary: Records the owner-prioritized live plugin vision, current industry evidence, Effect fit, and unresolved replacement policies.
---

# Live Plugin Evolution Vision And Evidence 2026-11-14

<!-- cspell:words Koishi EBADF Reloadable restarter -->

## Scope and authority

**The owner has confirmed a high-priority product vision:** plugins across all
categories should be addable, initialized, updated and replaced while the
application and agents continue operating. Agents may author or request these
changes themselves. New architecture must preserve that direction now; useful
live behavior should arrive early where practical. The owning record is
[OD-003](../open-decisions/OD-003-module-runtime-and-public-spi-choices.md#owner-prioritized-live-plugin-vision-2026-11-14).

**Whether an ordinary update may interrupt current work remains explicitly
open.** The owner deferred that choice. Neither finish-before-replace nor
cancel-on-update is accepted by this research. Existing emergency revocation,
operation deadlines and authorization retain their owners.

This extends the confirmed static-composition/controlled-restart delivery
baseline into a broader product direction. Immutable composition inside one
generation is compatible with live selection between generations. Accepted ADRs
and adoption pins remain unchanged. Concrete runtimes, migration semantics,
public SPIs and product implementations require their owning decisions.

Observation date: **2026-11-14 in the client timezone; retrieval and execution
started 2026-11-13 UTC**. The work combines three parallel specialist lanes,
root research, two bounded rounds of criticism, and one four-case native-library
experiment. Evidence classes are kept separate: specification, official docs,
pinned source, reported issue, inspected upstream test, local execution, and
architectural inference. Main-branch versions do not establish npm publication.

The [evidence archive](evidence/live-plugin-evolution-20261114.tar.gz) contains
the detailed reports, source ledgers, criticism and exact experiment inputs and
logs. Its [manifest](evidence/live-plugin-evolution-20261114.manifest.json)
binds member bytes. Earlier research archives remain immutable.

## Research conclusion

The owner's direction has concrete support. Agent-written executable extensions,
same-session reload, mutable tool registries, durable revision selection and
isolated editable harnesses now exist in distinct projects. This is evidence of
an emerging direction, not measured market adoption or a universal winner.

The strongest candidate is **live evolution through explicit capability and
execution boundaries**. Keep a logical plugin stable, prepare an immutable new
revision, select it through the existing product owner, and settle the old
execution/resources according to an explicit policy. This can cover every plugin
category without promising that every suspended JavaScript stack migrates into
new code. Whether old work finishes, pauses, checkpoints or is cancelled remains
a separate choice.

The most consequential discoveries are these:

- Claude Code documents agent-authored mods that reload at turn end; Letta
  explicitly designs its mod surface around agent authorship and repair.
  These extend executable behavior, beyond saving instructions. [C1][claude],
  [L1][letta]
- Cloudflare's self-modifying example lets the agent edit its TypeScript loop
  and tools, validate a candidate and activate a revision for later turns. It
  is explicitly experimental, uses internal APIs and omits authentication.
  [CF1][cf-example], [CF2][cf-source]
- Real implementations expose failure tradeoffs: Letta empties its registry
  during replacement; OpenCode can reconstruct a previous plugin after setup
  failure but has reported catalog-loss races; Cordis restores import failures
  but does not roll back failed activation. [L2][letta-source],
  [O1][opencode-source], [O2][opencode-issue], [R1][cordis]
- Effect supplies useful construction and resource ownership. The actual
  experiment rejects bare `ScopedRef` as a graceful handover primitive and
  confirms scoped retention with `RcRef`. Neither is a complete plugin updater.

## What “live” must identify

| Level | Actual change | Required qualification |
| --- | --- | --- |
| Discovery | File, package or catalog entry becomes discoverable | Freshness, missed events, complete snapshots |
| Model surface | Agent sees a new skill or tool descriptor | Which request/turn adopts it; prompt-cache cost |
| Registry | Host adds/removes a handler or definition | Schema/execution agreement; stale handles; current grants |
| Execution generation | New code serves selected future work | Admission, readiness, owned resources, failure recovery |
| Persistent instance | Code changes while durable identity/state survives | Explicit restart or migration and schema compatibility |
| Running task migration | Existing semantic work continues on new code | Checkpoint, replay, state conversion, external-effect rules |

These levels are not a mandatory progression. An instruction-only plugin needs
no artificial process lifecycle. A native provider may need a separate process.
“The application stays live” is a weaker promise than “the current plugin call
continues uninterrupted.” The product must state the unit that survives.

## Current agent ecosystem

The detailed agent lane covers nine cases. Its source ledger records full
commits, dates, paths, symbols, issue status and claim scope. The following map
preserves differences that change an architecture decision.

| Case | Inspected mechanism | Boundary and maturity |
| --- | --- | --- |
| MCP 2026-07-28 and SDK v2 source | Mutable tool registrations; opt-in list-change subscriptions; refreshed list reads | Released protocol. Notifications are best effort; discovery does not install or authorize executable code. [M1][mcp], [M2][mcp-sdk] |
| Pi source 1.5.2 | Tools can register after startup; full runtime reload invalidates the old extension context | Registry edits can affect the same session. Full reload rejects streaming/compaction; the agent-driven example waits for `agent_settled`. [P1][pi], [P2][pi-session] |
| Claude Code mods, CLI 2.1.287+ | Agent authors JS/TS mods; enabled session changes reload at turn end | Officially documented feature, not a host-source audit. Module locals reset; explicit state facilities have different lifetimes. Some components still require a new session. [C1][claude], [C2][claude-state], [C3][claude-loading] |
| OpenCode dev source 2.3.0 | Watched V2 plugins, synchronous registry transforms, ordered suffix replacement | Current source implementation; package publication not established here. Retains the unchanged prefix, closes/rebuilds the suffix; fallback reactivates code, not old heap state. [O1][opencode-source] |
| Letta Code source 0.34.60 | Trusted mods, generation-scoped registrations, stale completion rejection | Current implementation/docs. Disposes old registrations and publishes empty state during reload; actionable repair and safe mode matter. [L1][letta], [L2][letta-source] |
| Hermes | Agent edits procedural skills; delta notice on the next message, catalog rebuilt at compaction | Skills and prompt consistency, not Python-host code replacement. Writes have atomicity and optional approval controls. [H1][hermes], [H2][hermes-write] |
| OpenClaw | Ordinary file skills adopt snapshots on the next turn; managed/learned selections have separate policies | Skill Workshop can retain a session snapshot. Executable plugin code, metadata or root changes require Gateway restart. [OC1][openclaw], [OC2][openclaw-workshop], [OC3][openclaw-security] |
| Voyager | Agent generates, validates, stores and replaces executable skills for later environment steps | 2023 research prototype; saved behaviors, not general production hot upgrade. [V1][voyager] |
| Darwin Gödel Machine | Agent edits candidate agent code, evaluates it and branches an archive of versions | 2025 research prototype; outer evolution loop. Authors also report evaluation manipulation and false tool/test claims. [D1][dgm] |

MCP deserves special attention because older descriptions are stale. The
2026-07-28 protocol has modern subscription behavior, and the SDK distinguishes
modern and legacy notification paths. A list change is an invalidation signal;
the client must obtain a fresh list, and its consuming host is responsible for
presenting the refreshed definitions to the model. The set may
vary by request authorization, not arbitrary connection history. None of this
defines a plugin installation transaction or moves an in-flight call.
[M1][mcp], [M3][mcp-client]

OpenCode supplies useful positive counterevidence: its inspected V2 documentation
says each model request captures tool definitions, descriptions and executors
together. Later transforms, reload and disposal affect future snapshots;
mutable captured data may still change. This binds the selected schema to an
executor, but does not establish that the old executor's resources remain
acquired: activation closes the changed scopes. Preserve this distinction when
designing our own descriptor and lifetime contracts. [O3][opencode-contract],
[O1][opencode-source]

Claude and Letta mods are trusted in-process code. Their lifecycle APIs or
permission interfaces do not sandbox arbitrary filesystem, network or other
direct effects of that code. A product needing stronger enforcement must use
its actual isolation boundary. [C4][claude-trust], [L1][letta]

Two promising directions require different responses. First, **several current
systems support agent-authored extensions**: make candidates inspectable and activation
diagnosable. Second, **some maintainers accept API breakage in exchange for agent
repair**: Letta states that stance explicitly. That is worth evaluating, but it
does not establish reliable unattended repair. The updater should not also own
the sole evaluator or the only evidence that a test ran. [L3][letta-thesis],
[D1][dgm]

## Runtime precedents and their limits

| Case | Mechanism worth borrowing | Limit that must remain visible |
| --- | --- | --- |
| Current Cordis / Koishi | Tracked effects, dependency-sensitive teardown; `Hmr.reconcile` serializes component/module changes | `cordis` 4.0.0-rc.13 source uses private Node loader access and skips some modules. Activation failure leaves the new fiber `FAILED`. Older Koishi development HMR is a separate mechanism. [R1][cordis] |
| OSGi / Apache Felix | Explicit bundle revisions, retained wiring, dependency-closure refresh | Refresh stops/restarts affected bundles. Ordinary stale Java service references cannot be erased generically. [R2][osgi] |
| Erlang/OTP | Genuine current/old module code, safe points and explicit `code_change` | State conversion participates in the upgrade; purging old code can terminate processes. Node does not inherit these VM semantics. [R3][erlang] |
| Extism / Wasm Component Model | Disposable instances, host capabilities, typed resource ownership | Instance/handle lifetime is not portable state migration; guest termination does not undo completed host effects. [R4][extism], [R5][wasm] |
| Cloudflare Dynamic Workers / facets | Immutable code/config IDs; state outside disposable execution | Same stub need not mean one isolate. Stateful facet update uses abort and recreation while SQLite remains; existing stubs invalidate. Introduced in open beta; current GA status was not established. [R6][workers], [R7][facets], [R12][workers-beta] |
| Envoy | New process readiness, listener handoff, old connection drain | Connections remain in the old process; deadlines may terminate them. The official restarter sample kills all children on abnormal child exit, not automatic healthy-old rollback. [R8][envoy], [R9][envoy-restarter] |
| systemd | Existing manager retains sockets/descriptors across process replacement | Retained descriptors do not preserve application heap or transactions; this is a Linux-specific precedent. [R10][systemd] |
| Temporal | Versioned admission and pinned workflow executions | Reverting routing does not move existing pinned executions. Recovery needs its own replay/reset/compensation rules. [R11][temporal] |

These are architectural precedents, not a proposal to install every runtime.
Source inspection supplied most evidence; upstream lifecycle tests were read,
not executed. No latency, fleet load or memory-reclamation benchmark was run.

### The most direct prototype: editable execution under stable control

Cloudflare's example separates editable source from the owner of turns,
revisions and privileged System tools. Candidate activation bundles source and
checks a runtime manifest in a fresh worker before recording an active revision.
This is not evidence of a strict TypeScript semantic check. A turn captures its
revision; later source edits affect later turns. The control owner rejects
custom tools that shadow System names. Restore appends a forward revision.
[CF2][cf-source], [CF3][cf-runtime], [CF4][cf-store]

This is a useful proof of design direction, with clear limits. Custom code can
replay, and an interrupted effect without a recorded result can run again.
No universal exactly-once effect or automatic state migration follows. Its
experimental status must remain separate from the underlying cloud platform's
status. We did not deploy it or make paid model calls. [CF1][cf-example]

### Packaging and browser UI are separate boundaries

Agent Plugins **1.0.0 is published**; **1.1.0 is a working draft** adding portable
command hooks. Portable Skills/MCP packaging and hook names do not define
activation, retirement or state migration. Path confinement in a package is
not a sandbox, and a manifest's requested permission is not an effective grant.
Keep interoperability at the artifact/component edge. [AP1][agent-plugins]

Module Federation dynamically registers remotes and its forced path removes
registration/cache entries. That operation does not own application component
unmounting, user form state or callbacks already returned to consumers.
Frontend plugins therefore need an explicit UI owner and state boundary; they
can share revision vocabulary with backend plugins without sharing a universal
plugin interface. [UI1][module-federation]

Node's ESM URL identity and separate cache also do not provide an unload
contract. Repeated query-string imports neither reclaim escaped resources nor
prove a closed dependency graph. Prior research already retains relevant import
and worker counterexamples, so another cache demonstration would add little.
[N1][node-esm], [earlier validation](static-composition-and-controlled-restart-validation.md)

## Fit of the current Get Modular Effect integration

The inspected Get Modular main is
`6c91ff1c3c8ce7088db215af9705f7ee3a9db103`, directly after PR240's merge
`28500bb686d1b91428bd5d7a9e1d26ce3d4ac839`. The adapter source manifest is
`0.0.0`, peer Effect is **4.1.4**, and its README identifies a candidate for
coordinated Core/Assembly 0.8.0 + Effect adapter 0.1.0. This research checked
source availability, not current npm publication. Library qualification and
application hot replacement are different claims. [GM1][gm-readme]

The adapter reuses neutral Assembly preparation and lowers each selected step
to a native Layer with private service identity. Calling `.layer()` produces
fresh mapper-owned Layer identities, allowing another closed composition.
It does not rewrite values captured by an earlier consumer. Reusing private
Layers, a shared MemoMap or externally borrowed mutable values still follows
their own identities and ownership. [GM2][gm-lower]

Current CMS already describes instance replacement behind a narrow facade and
Host-owned activation, route switching, quiesce and retirement. The existing
private lifecycle-kernel candidate records generation/call/custody facts; it
does not perform physical cleanup. A native Scope or resource lease and that
kernel can serve different facts under **one existing Host**. Do not duplicate
its phase table, native reference counter, resolver or supervisor. Adoption of
that candidate in a product remains unselected here. [GM3][gm-cms],
[GM4][gm-kernel]

The first kernel contract does not let retained consumers start new calls after
their owner retires. A callback or stream must distinguish continuing already
admitted work from a fresh call admitted through the current boundary. Retained
custody alone is not invocation authority. [GM3][gm-cms], [GM4][gm-kernel]

### Executed discriminating experiment

The retained **166-line TypeScript fixture** received an independent plan
review, strict **TypeScript 7.0.2** typecheck and execution with **Node 24.22.1 /
Effect 4.1.4**. Four tests passed; none failed, cancelled or skipped. Real
FileHandles, `EBADF` and Deferred barriers provide independent observations;
no sleep establishes the ordering and no custom plugin manager is tested.

| Case | Actual observation | Design consequence |
| --- | --- | --- |
| Active reader during `ScopedRef.set` | Old file closes before new value publication; a concurrent `get` can return the old closed handle while its finalizer is held | A reference is not a borrower lease; bare `ScopedRef` cannot promise graceful overlapping use. |
| Typed candidate acquisition failure | Partially acquired candidate closes; old file remains current and readable | Startup failure can preserve a healthy old resource in this path. |
| Old finalizer closes then defects | Exact `Die` cause survives; candidate closes; current reference still points at the old closed handle | “Replacement failed” does not imply healthy rollback. |
| `RcRef.invalidate` with an active borrower | New borrower gets a fresh file; old remains readable until its borrowing scope closes; both close exactly once | Native scoped retention can be reused. |

`RcRef` is not a ready-before-publish transaction: invalidation can make the
next caller encounter acquisition failure. Its owning scope must outlive the
borrowers whose continuity is promised. Prepared candidate ownership and Host
promotion remain separate. `LayerMap`/`RcMap` may help keyed resources;
`LayerMap` is unstable. No public `Reloadable` module was found in this Effect
4.1.4 source/distribution; Effect 3 examples must not be copied blindly.
[E1][scoped-ref], [E2][rc-ref]

The archive distinguishes Git-pinned source from installed package bytes.
Some hashes differ; the retained `ScopedRef` diff adds overload documentation
without changing its implementation. Executed compiled-file hashes are
retained; no byte-identical package-tree claim is made. This result does not
qualify a whole generation router, state migration, authorization, hard
preemption or thousands of agents. It makes one concrete choice clearer:
**use native scoped ownership where the consumer is already native; do not
wrap the whole live graph in a bare mutable reference.** Ordinary Assembly
with the existing Host/Resources contracts remains viable.

## Architecture candidate that preserves the vision

The following is a recommended direction to discuss, not a new accepted ADR.

| Concern | Existing owner and proposed boundary |
| --- | --- |
| Immutable artifacts and requested permissions | EF artifact/trust/distribution contracts; exact code/import identity and declared requests |
| Closed composition | Get Modular; rebuild the affected generation/cohort rather than mutate captured dependencies |
| Which revision may run | Product admission/authorization and its existing canonical selection |
| Physical resources and execution | Existing executor/Host; native Scope, process or other accepted boundary implements lifetime |
| State compatibility | Existing product/state owner; explicit private-state schema only where needed |
| Model-visible capabilities | Agent/tool owner; retain the presented descriptor and bind execution to its revision or reject stale calls explicitly |

The central invariant is **coherence, not mandatory uninterrupted lifetime**.
An admitted operation uses a declared implementation/schema; a policy may later
cancel, checkpoint or end it. It must not silently execute an A-shaped tool call
against incompatible B because a mutable name now resolves differently. Current
authorization may still revoke an effect. Code selection does not freeze grants.

Select and retain a generation as one acquisition step before an asynchronous
yield. At promotion, apply the existing owner's concurrency check so competing
agents cannot silently overwrite a newer revision. Stale cleanup completion must
only affect its own generation. Keep ordinary retained objects inside the
replacement cohort or behind a narrow consumer-owned facade; avoid a global
service locator or generic Proxy that conceals lifetime.

Agent-driven updates fit the same ownership. The agent writes a candidate and
requests activation; the existing owner validates and promotes according to
policy. That policy can authorize automatic updates. A tool running inside the old
generation must not await the drain of the generation that contains that tool:
return an operation receipt, then let the stable owner finish the change.
Effective permissions, canonical state, evaluator results and cleanup evidence
must remain outside mutable candidate authority.

This does not require a new universal manager. If a mechanism is concretely
needed by multiple products, design it once as a reusable library under its
existing owner and validate a real consumer plus an independent fixture. Keep
product policies in their own boundaries. Do not fork one updater per product
or publish a speculative plugin SPI before its conformance prerequisites.

### Coverage across plugin categories

| Category | Plausible live boundary | Contract to establish |
| --- | --- | --- |
| Pure data, instructions, declarative contributions | Complete snapshot; next read or turn | Revision selection and model-context freshness |
| Bounded tools and request handlers | Invocation or turn | Descriptor agreement; resource retention or explicit cancellation |
| UI panels and hooks | Mount/activation scope | Unmount, callbacks, subscriptions and preserved user state |
| Persistent provider sessions and streams | Session, stream or checkpoint | Reconnect/resume behavior; retained resource lifetime; current call authority; compatibility |
| Background jobs, timers and listeners | Executor-owned task or listener | No detached unowned work; completion and cleanup evidence |
| Exclusive/native resources | Existing custodian handoff or targeted restart | Overlap feasibility, bounded pause and physical ownership |
| Durable stateful workflows | Version pin or explicit checkpoint migration | Schema/replay/idempotency; external effects and compensation |

All categories belong to the vision. Qualification can arrive incrementally,
with unsupported boundaries visible; the first easy tool plugin must not become
an implicit restriction on the whole ecosystem. Equally, a public “all plugins
live” promise must wait until each supported category meets its actual contract.

## Alternatives, cost and uncertainty

The runtime report retains separate conditional mechanism estimates: selecting
an already versioned executor; targeted plugin stop/start; overlapping trusted
generations; an isolated executor adapter; and durable checkpoint migration.
These are different scopes, not cumulative phases or full product quotes.

For a first slice, compare **reuse of the current Host** with **an isolated
executor behind the same capability port**. The latter offers a stronger
reclamation/fault boundary when needed, but adds transport, packaging, platform
and debugging work. Wasm or another language is justified by actual capability
and isolation requirements, not by the word “critical.” A Node worker alone is
not a hostile-code sandbox. [runtime evidence archive](evidence/live-plugin-evolution-20261114.tar.gz)

The narrower Effect comparison assumes an already available Host, trusted
cooperative code, one selected lifetime policy and compatible state. **P** is
new mechanism glue at its existing owner, **I** is one consumer's wiring, and
**T** is tests/fixtures. The bands do not overlap; reused GM/kernel/native
primitives contribute zero new LOC. Changed existing code is not yet estimated.

| Conditional route | P LOC | I LOC | T LOC | Confidence /10 | Complexity /10 |
| --- | ---: | ---: | ---: | ---: | ---: |
| Promise Host + Assembly/Resources + existing kernel | 150–300 | 100–250 | 600–1,100 | 5 | 6 |
| Already-native Host + Effect adapter + existing kernel | 100–250 | 80–200 | 550–1,000 | 5 | 5 |
| Introduce Effect into a Promise-only slice | Native row + 50–200 | Native row + 100–300 | Native row + 200–600 | 4 | 7 |

These are conditional engineering judgments, not measured total delivery costs.
Combined P+I is 250–550 or 180–450 for the first two alternatives. If the actual
executor already supplies a required operation, subtract that work. The third
row is a migration increment only when native Effect is absent. The archive
retains the separate broader runtime estimates; they must not be added to these
local integration bands.

Both routes target the same bounded operation/resource-lifetime correctness
guarantee under the selected policy. Their hypothetical achievable reliability
rating is **8/10 after equal qualification**, not measured availability or a
ranking of currently shipped hot replacement. Higher complexity means more
burden. The native
route reduces some resource/concurrency glue; it does not buy missing
authorization, readiness or migration contracts. The ranges exclude executable
loading, installer/catalog/UI, durable admission/recovery, data migrations,
distributed rollout, all-category qualification and platform/release work.
Changed existing LOC cannot be estimated without choosing and inspecting the
real consumer. These exclusions must be priced before a product commitment.

## Critical failure cases and next decision

The evidence suggests three especially valuable next checks against the actual
consumer, after its scope is selected:

1. **Schema/execution consistency.** Present tool A to a model, promote
   incompatible B, then submit the A-shaped call. Independently prove A runs or
   explicit stale-call rejection occurs. Do not accept accidental dispatch to B.
2. **Real resource lifetime and failed activation.** Hold a bounded old call and
   a stream/callback, prepare a failing and successful candidate, and observe
   actual files/processes/connections. Check a post-await callback, stale cleanup
   completion and a self-update request that cannot wait for its own retirement.
3. **The real exclusive resource, if required.** Prove whether its existing owner
   can retain custody while handlers change; otherwise measure the actual pause
   or explicit handoff. A synthetic counter cannot establish this property.

Add migration/crash/replay tests only when that stronger continuity is selected.
Repeated-update resource growth, generations retained by long sessions,
backpressure and cleanup debt need qualification before scale claims. A single
successful replacement cannot establish a fleet guarantee.

The content question left with the owner is the recorded **ordinary-update
interruption policy**. There is no need to decide it to preserve immutable
artifacts, narrow ports, explicit ownership and descriptor identity now. The
recommended first implementation is one real capability through its current
Host, with the broad category matrix kept as the target; the chosen runtime and
continuity promise should follow that consumer's actual needs.

## Evidence, criticism and validation

The archive retains four research reports, primary ledgers, the user-direction
brief, cross-review findings and dispositions, and the exact four-case Effect
fixture with raw logs, package hashes and licensed source snapshots. Source-only
lanes did not execute third-party plugins, paid providers or remote mutations.
Closed issue status is not proof that every variant was fixed. Notably,
OpenCode #49982 closed completed on November 12 while #62068 remained open and
marked reproduced when retrieved; neither was reproduced locally.
[O2][opencode-issue], [O4][opencode-closed]

Criticism corrected overstated maturity labels, unconditional pinning language,
import-versus-activation rollback, independent code/resource authority,
source-package identity, and estimates that mixed mechanism with integration.
The maintained [review record](plugin-research-review-and-decision-record.md)
records final dispositions. The PR records local documentation results and
the original hosted CI runs for the exact delivered head; that validation does
not turn research recommendations into accepted production behavior.
The [local validation record](evidence/live-plugin-evolution-20261114.validation.json)
retains raw final Docs output and the preceding spelling rejection separately
from the frozen research archive. The general local Foundation gates remain
blocked by their installed API Extractor 7.58.12 / TypeScript 5.9.3 dependency;
no old compiler was initialized or gate weakened for this research.

[claude]: https://code.claude.com/docs/en/plugins/mods/create
[claude-state]: https://code.claude.com/docs/en/plugins/mods/interface
[claude-loading]: https://code.claude.com/docs/en/plugins/loading
[claude-trust]: https://code.claude.com/docs/en/plugins/mods/overview
[letta]: https://docs.letta.com/configuration/mods
[letta-source]: https://github.com/letta-ai/letta-code/blob/14a91736d9b0c5c33340d805a7422f694c9da28e/src/mods/mod-engine.ts
[letta-thesis]: https://github.com/letta-ai/letta-code/blob/14a91736d9b0c5c33340d805a7422f694c9da28e/src/mods/README.md
[cf-example]: https://developers.cloudflare.com/agents/harnesses/self-modifying/
[cf-source]: https://github.com/cloudflare/agents/blob/9b73399c7cee9550c19146b7f76a735a10700ada/examples/next/harnesses/self-modifying/src/self-modifying-harness.ts
[cf-runtime]: https://github.com/cloudflare/agents/blob/9b73399c7cee9550c19146b7f76a735a10700ada/examples/next/harnesses/self-modifying/src/harness-runtime.ts
[cf-store]: https://github.com/cloudflare/agents/blob/9b73399c7cee9550c19146b7f76a735a10700ada/examples/next/harnesses/self-modifying/src/store.ts
[mcp]: https://github.com/modelcontextprotocol/modelcontextprotocol/blob/06e923405df3df242f1471b9300d9db90ebd10fd/docs/specification/2026-07-28/server/tools.mdx
[mcp-sdk]: https://github.com/modelcontextprotocol/typescript-sdk/blob/919bb8ea88b6e10e72c2f8b6218fad4cfdc40b2c/packages/server/src/server/mcp.ts
[mcp-client]: https://github.com/modelcontextprotocol/typescript-sdk/blob/919bb8ea88b6e10e72c2f8b6218fad4cfdc40b2c/packages/client/src/client/client.ts
[pi]: https://github.com/earendil-works/pi/blob/97d539ce4c2c7db681bf7acdbbb07ca09533400d/packages/coding-agent/docs/extensions.md
[pi-session]: https://github.com/earendil-works/pi/blob/97d539ce4c2c7db681bf7acdbbb07ca09533400d/packages/coding-agent/src/core/agent-session.ts
[opencode-source]: https://github.com/anomalyco/opencode/blob/83960f8a56b2f2b8ad0b751f23baaf9d0eb65ad9/packages/core/src/plugin.ts
[opencode-issue]: https://github.com/anomalyco/opencode/issues/62068
[opencode-contract]: https://github.com/anomalyco/opencode/blob/83960f8a56b2f2b8ad0b751f23baaf9d0eb65ad9/services/site/src/docs/content/build/plugins/server.mdx
[opencode-closed]: https://github.com/anomalyco/opencode/issues/49982
[hermes]: https://github.com/NousResearch/hermes-agent/blob/04903d96e6590aca38a89f0339abb8015a9734a1/website/docs/user-guide/features/skills.md
[hermes-write]: https://github.com/NousResearch/hermes-agent/blob/04903d96e6590aca38a89f0339abb8015a9734a1/tools/skill_manager_tool.py
[openclaw]: https://github.com/openclaw/openclaw/blob/8e6768f91235b7b094f7f8dde96735d727a3f748/docs/tools/skills.md
[openclaw-workshop]: https://github.com/openclaw/openclaw/blob/8e6768f91235b7b094f7f8dde96735d727a3f748/docs/tools/skill-workshop.md
[openclaw-security]: https://github.com/openclaw/openclaw/blob/8e6768f91235b7b094f7f8dde96735d727a3f748/docs/gateway/security/tool-permissions.md
[voyager]: https://voyager.minedojo.org/
[dgm]: https://sakana.ai/dgm/
[cordis]: https://github.com/cordiverse/cordis/blob/1378a9c1237b6b8c26166a7375947468454f2e95/packages/hmr/src/index.ts
[osgi]: https://docs.osgi.org/specification/osgi.core/8.0.0/framework.service.html
[erlang]: https://www.erlang.org/doc/system/code_loading.html
[extism]: https://github.com/extism/extism/blob/051b765bb6abe4fe95d5e4f489f03ad7b137edbc/runtime/src/plugin.rs
[wasm]: https://github.com/WebAssembly/component-model/blob/dd1fefc0c618382359feca6f2c758a2b3ef21c36/design/mvp/Explainer.md
[workers]: https://github.com/cloudflare/cloudflare-docs/blob/f7388b9513672d30263e7e04eaaf087a3b06a0c1/src/content/docs/dynamic-workers/api-reference.mdx
[facets]: https://github.com/cloudflare/cloudflare-docs/blob/f7388b9513672d30263e7e04eaaf087a3b06a0c1/src/content/docs/dynamic-workers/usage/durable-object-facets.mdx
[workers-beta]: https://developers.cloudflare.com/changelog/post/2026-03-24-dynamic-workers-open-beta/
[envoy]: https://www.envoyproxy.io/docs/envoy/v1.40.2/intro/arch_overview/operations/hot_restart
[envoy-restarter]: https://github.com/envoyproxy/envoy/blob/b2d89e0ae53916f28770771fbdd49c5c99c5c5a2/restarter/hot-restarter.py
[systemd]: https://github.com/systemd/systemd/blob/781d9d0789379d1ea1f2ecefb804d41e9c8b6c38/src/core/service.c
[temporal]: https://github.com/temporalio/documentation/blob/ce2b620285f5f2ff5dbcbc7b26209111cad274fb/docs/encyclopedia/workers/worker-versioning.mdx
[agent-plugins]: https://github.com/agentplugins/agent-plugins-spec/tree/465e04661ccddfcccff95d0b99a4cf59d80c5478
[module-federation]: https://github.com/module-federation/core/blob/d4a31960d20a717626af43be59aab0881c7b6cc0/packages/runtime-core/src/remote/index.ts
[node-esm]: https://nodejs.org/api/esm.html
[gm-readme]: https://github.com/agent-teams-ai/get-modular/blob/6c91ff1c3c8ce7088db215af9705f7ee3a9db103/packages/effect/README.md
[gm-lower]: https://github.com/agent-teams-ai/get-modular/blob/6c91ff1c3c8ce7088db215af9705f7ee3a9db103/packages/effect/src/features/construction/lower.ts
[gm-cms]: https://github.com/agent-teams-ai/get-modular/blob/6c91ff1c3c8ce7088db215af9705f7ee3a9db103/docs/architecture/common-assembly.md
[gm-kernel]: https://github.com/agent-teams-ai/get-modular/blob/6c91ff1c3c8ce7088db215af9705f7ee3a9db103/packages/lifecycle-kernel/src/features/lifecycle/kernel.ts
[scoped-ref]: https://github.com/Effect-TS/effect/blob/289a53f7b1fc40049219c6e69022db2fb859c356/packages/effect/src/ScopedRef.ts
[rc-ref]: https://github.com/Effect-TS/effect/blob/289a53f7b1fc40049219c6e69022db2fb859c356/packages/effect/src/internal/rcRef.ts
