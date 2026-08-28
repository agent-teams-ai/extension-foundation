---
id: qualification.module-system-v1-productization.roadmap
type: qualification
status: active
owner: architecture
summary: Defines reversible, independently gated steps from Pure DI through any later shared module foundation.
---

# Qualification Roadmap Recommendation

The latest machine-readable, non-authoritative projection of this recommendation
is [`current-roadmap.yaml`](current-roadmap.yaml). Neither file is implementation
authority. Accepted ADRs and owning-product decisions remain authoritative, and
only an accepted owning-product decision may authorize a product step.

## Step 0: Preserve The Baseline

Keep product-owned typed ports, literal imports, pure factories, and explicit
composition roots. The canonical lock records exact Git custody for candidate
files at the pinned product revisions, without interpreting source or asserting
topology, semantics, or runtime behavior. Product-specific verification belongs
to the owning product. Correct qualification custody and source verification before
using the dossier for another decision. The package-policy correction remains
an external prerequisite owned by its separate task.

## Step 1: Measure One Product Candidate

A product-owned decision may measure Frontend Recent Projects or the repeated
Agent Runtime setup-inspection wiring without adding a module framework. It
must name the owner, product outcome, fixed contributions or sibling
capabilities, any seam-owned ordering authority, exclusions, deletion criteria,
and benchmark tasks. Codex and Claude Code must not be modeled as providers of
one slot.

Before any run, the owning product must approve a benchmark protocol containing
the pinned task corpus, expected outcomes, model/tool versions, repetitions,
thresholds, error taxonomy, output schema, and stop/delete rule. The future
protocol may record elapsed time, files opened, incorrect edits, diagnostic
quality, and generated drift. The Frontend Recent Projects
provider-contribution seam may ask an engineer or agent to:

- find the owner and composition root;
- add or remove one provider;
- change contribution order;
- trace a provider into the owning use case.

The Agent Runtime setup-inspection sibling-capability seam may instead ask an
engineer or agent to:

- find the owner and composition root;
- add or remove one sibling capability;
- wire a capability explicitly to its host dependency;
- trace a capability through the host and its access handle; and
- verify deterministic failure when a required sibling capability is missing.

Missing or ambiguous provider slots and optional-capability disablement are
excluded until a real product seam owns those semantics. A missing required
Agent Runtime sibling remains in scope only to benchmark its deterministic
failure. The measurement must not introduce the abstraction it is intended to
justify.

If direct composition remains clear, stop at `L0`.

## Step 2: Static Authoring, Conditional `L1`

Only measured authoring or drift evidence can admit a private product-local
comparison of:

1. TypeScript authoring plus generated inert JSON;
2. schema-first inert JSON plus generated nominal handles; and
3. handwritten JSON plus typed factory.

ADR-0014 is the accepted product-local authoring authority under ADR-0013; this
qualification recommendation adds no successor gate. No candidate is
preselected. Generated output is a projection, not a second authority, and
clean regeneration must be byte-identical.

Planning estimate only: `800-2,000 changed physical LOC`, counted across the
private candidate, generated projections, diagnostics, fixtures, and
root-conformance tests. No admitted consumer currently validates this range.
Delete the comparison if it does not improve the named measure.

## Step 3: Private Selection Graph, Conditional `L2`

Only a measured requirement to change providers without rebuild can admit a
product-local graph. It owns immutable plans, exact bindings,
`required/optional/many`, compatibility, cycles, ambiguity, and deterministic
diagnostics. It does not own lifecycle, process hosting, authorization, or
plugin installation.

Planning estimate only: `1.5k-3.5k changed physical LOC` across a private
prototype, differential tests, and fault tests. Re-estimate after admission.

## Step 4: Lifecycle Coordinator, Conditional `L3`

Only independently managed resources can admit lifecycle semantics. The owning
product defines `prepare`, `start`, `ready`, `drain`, `stop`, rollback,
generation fencing, deadlines, and recovery. Selection validity never implies
readiness or authorization.

Cordis `4.0.1` may be compared only as a replaceable resource-scope adapter.
Adoption uses a scorecard covering correctness, lifecycle ownership, failure
parity, provenance, maintenance, performance, leaks, and reversibility. No LOC
percentage decides adoption.

Planning estimate only: `1.5k-3.5k changed physical LOC` across the private
coordinator adapter and qualification tests. Re-estimate after admission.

## Step 5: Process Or WASM Host, Conditional `L4`

A separate product decision must prove placement or containment value. The
protocol requires structured-clone-safe envelopes, host-issued nonce, expected
response kind, one-shot receipt, deadline, generation fence, ambiguous-outcome
handling, explicit pending-dispatch cancellation, and N/N-1 fixtures. The host
remains outside the selection graph.

Re-estimate after a named consumer is admitted; historical ranges are not an
implementation authorization.

## Step 6: Shared Extraction, Conditional `L5`

After two products independently implement the same semantic candidate:

1. verify repository and provider independence through authenticated provider
   identities and executable conformance; the local source-record verifier does
   not satisfy this gate;
2. reconcile only the actual semantic intersection;
3. keep product ports, DTOs, adapters, authorization, and configuration local;
4. pass cross-consumer conformance; and
5. accept separate extraction, compatibility, ownership, migration, and release
   decisions.

Publication remains a later independent gate.

## Rollback Points

Every level is removable without changing the level below it. A failed
authoring spike returns to Pure DI; a failed graph returns to static bindings; a
failed lifecycle adapter returns to the product coordinator; a failed host does
not change product contracts. Framework types never cross those rollback
boundaries.

Moving back or stopping is required when the first two product slices spend
more than 30% of their changed production code on generic framework glue. A
safety requirement can justify that cost only with explicit evidence. This is a
stop condition, not an advisory metric.
