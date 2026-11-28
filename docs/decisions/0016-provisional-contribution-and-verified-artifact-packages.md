---
id: ADR-0016
type: adr
status: accepted
owner: architecture
summary: Admits two private pre-1.0 extension packages through source-bound fixture qualification while preserving product authority and stable SPI gates.
approved_by: product-owner
accepted_at: 2026-11-26
related:
  - ADR-0002
  - ADR-0011
  - ADR-0013
  - ADR-0015
  - OD-003
package_ownership:
  - package_id: extension.core
    package_name: "@extension-foundation/core"
    package_path: packages/core
    semantic_classification: ordinary-library
    features: [contributions]
  - package_id: extension.node-artifact
    package_name: "@extension-foundation/node-artifact"
    package_path: packages/node-artifact
    semantic_classification: ordinary-library
    features: [verified-artifact]
---

# ADR-0016: Provisional contribution and verified artifact packages

## Context

The owner approved implementation of workstream A from EF PR #70, requested one
implementation PR with review and corrections, and authorized its ordinary merge.
The two coordinated plans had received two independent review rounds before that
instruction. This decision records the bounded recommended EF-A/C/V/P packet
needed to execute that instruction. It does not treat plan review or merge as
approval of an unrelated production Host, stable SPI or application policy.

ADR-0015 retains ADR-0013's ordinary-library, package, adapter and independent
release responsibilities. Its fixture-first pre-1.0 permission expressly names
Get Modular. Waiting for production applications before a neutral EF library
can be qualified would contradict the owner's foundation-first sequence.
This is a package-specific successor to that extraction-timing restriction;
all other clauses of ADR-0013 retained by ADR-0015 remain effective. The accepted
documents and their immutable digests are preserved without rewriting history.

## Decision

### Exact package admission

The two packages declared in this document may materialize as substantive,
private `0.0.0` ordinary libraries in one reviewed change with their catalog,
official scaffold plans, source boundaries and genuine package qualification.
Their admission basis is `independent-replacement-or-release-lifecycle`.
The core is independently useful for owner-defined contribution metadata; the
Node adapter has a separate platform, native-tool and executable-loading
dependency lifecycle. Installing the core must not install the Node adapter,
Get Modular, Live Module Updates, product types or development tools.

For these two provisional boundaries, a real independently installed disposable
consumer with useful behavior and rejecting cases may provide the named
`independent-conformance` record before a product exists. It is not described as
a product slice, two real consumers or two SPI implementations. The verifier
must prove its actual source, built package and executed conformance lineage.
This permission admits no empty scaffold, additional package, stable SPI or
production extension Host. Public npm publication remains deferred.

Official scaffold preparation for exactly these two owned ordinary-library
boundaries may precede the first admission record. Preparation still verifies
the closed catalog, effective accepted owner, exact role and official recipe;
it produces no successful admission receipt. The full topology and publication
gates still refuse a missing record or unverified evidence. This separates
building the qualification subject from admitting it, without inventing a
passing record before the package exists. Existing semantic-extraction authority
requirements for other package classes remain unchanged.

Package names use the purpose-specific `@extension-foundation` scope. Existing
`@agent-teams` fixture identities remain valid; the exact catalog, ownership
bijection and scaffold authority still decide which real package exists.
Curated root exports contain compiled JavaScript and declarations. New code and
tests receive effective strict TypeScript 7.0.2 or newer checking.

### Contribution compatibility

The neutral feature selects bounded inert descriptors with `id`, `contract`,
one exact positive integer `revision`, `required` and `payload`. Contract
identity and payload meaning belong to the extension-point owner. No universal
contribution-category enumeration or capability service bag is introduced.

The Host supplies trusted synchronous typed payload validators independently
of artifact metadata. Required unknown or unsupported contracts reject the
whole candidate. An unsupported optional contract yields an explicit omission;
it does not reach owner validation or execution. A malformed carrier, duplicate
identity, invalid supported payload, throwing validator or non-boolean result
rejects the candidate even when the descriptor is optional. Selection returns
detached frozen snapshots in declaration order. It does not grant permission,
install an extension or prove live-update compatibility.

Exact revision agreement is the selected initial policy. Cross-revision
relations or negotiation need owner-authored behavior and independent evidence;
they cannot be inferred from package versions or additive-looking payload edits.
GM capability identities and their revision rules retain their own owner.

### Authenticated package evidence

Use the existing package-admission request and exact receipt matcher with an
online GitHub provider adapter. A policy binds the stable repository ID, exact
reviewed workflow bytes, successful run/attempt/job/step, actual source revision,
closed source-input digest, conformance identity and packed-artifact digest.
Retrieve and hash the provider's exact evidence bytes. A separate success step
emits the conformance proof only after the named useful and rejecting checks
pass; the admission verifier subsequently produces its own bound receipt.

The source subject includes implementation, package/build configuration,
toolchain lock, conformance harness and workflow. Receipt/admission metadata
that contains the resulting run coordinates is excluded from that subject to
avoid a self-reference; changing executable inputs invalidates old evidence.
The exact observed commit remains part of the authenticated proof. Receipt
matching is not a substitute for verifying the provider lineage.

Unavailable evidence, unsupported bases, conflicting identities, alias-created
independence, changed source/workflow/bytes, or unsuccessful and substituted
runs fail closed. No implicit offline fallback, fabricated historical success
or unqualified independence claim is allowed. Provider credentials stay in the
retrieval adapter and are not emitted in evidence. Publication must reverify
the immutable evidence through the same boundary.

### Verified Node artifact profile

The initial profile is trusted cooperative finite Node ESM, with an explicit
target and consumer scope. ORAS obtains a digest-addressed OCI artifact;
Cosign verifies the same captured manifest bytes against the Host's explicitly
selected trusted publisher key. The selected direct-key profile does not verify
a transparency log or establish a keyless Sigstore identity. A signature is a
provenance fact, not a grant.
The closed manifest binds the executable bundle and any declared data assets
by digest and bounded path. Staging rejects traversal, aliases, symbolic links,
unexpected entries and changed bytes.

The executable is one self-contained ESM bundle. A mature module lexer rejects
static imports, dynamic imports and `import.meta` in this initial profile;
unbundled dependencies, native addons and a general module loader are outside
its supported surface. Evaluation uses the captured verified source bytes,
not a later import of a mutable filesystem path. Each attempt receives its
own evaluation identity. The Host supplies the known typed export validator
and current authority check immediately before evaluation. Later protected
effects still require current authority at their actual receivers.

This is not hostile-code containment: trusted JavaScript has ambient process
capabilities, and neither a lexer nor a signature establishes isolation. A
disposable signing key proves the signature mechanism only; it never replaces
a production publisher's key or establishes trust in a production artifact.
Local OCI layout/registry evidence must name its actual transport and cannot
claim GHCR, Harbor, browser or desktop qualification without those real tests.

### Preserved owners and handoff

EF produces artifact, target, publisher and compatibility facts. The consuming
Host owns literal contract/loader binding, current grants, canonical state,
attempts, acquisition custody and cleanup. Get Modular owns composition; Live
Module Updates owns its complete update operation. Their inner neutral code
does not import EF TEST helpers. An outer consumer adapter maps exact facts to
those existing public mechanisms.

ADR-0011's applicable admission, custody, receiver, retirement and evidence
obligations remain unchanged. This slice does not implement durable extension
installation, enablement, state migration, a production Host, distributed
recovery, streams or a stable public extension SPI. The joint LMU scenario is
an update of an EF-verified artifact in a trusted Node qualification Host;
LMU's executor owns that operation and its independent lifetime/effect proof.

## Consequences

- Ordinary consumers can use the neutral package without a product deployment
  or optional runtime dependencies. Breaking pre-1.0 evolution remains explicit.
- Materialization now requires genuine source-bound installed-package evidence;
  offline development tests do not impersonate the provider's admission receipt.
- The constrained bundle format makes executable identity testable, while
  arbitrary dependency loading and stronger trust profiles remain separate work.
- Source, structural, artifact, conformance and product-adoption claims remain
  distinct. A failing external gate remains a failure and is not waived by this
  decision or by passing local tests.

## Rejected alternatives

- Wait for complete products: incompatible with the authorized foundation-first
  sequence and unnecessary for a bounded ordinary-library qualification.
- Admit every future package on toy evidence: broader than the named boundaries
  and insufficient for stable SPI or production Host claims.
- Publish a universal plugin API now: ownership, independent implementations and
  complete profile evidence are not present.
- Infer compatible revisions or silently omit invalid known payloads: conceals
  contract failures that must be visible before evaluation.
- Trust copied logs or hashes without source/run provenance: matching bytes do
  not prove who ran the required conformance on which implementation.
- Rehash a path then dynamically import it: the evaluated bytes can differ after
  the check. Captured immutable source avoids that substitution in this profile.
- Introduce a graph loader, sandbox or second update coordinator here: duplicates
  existing owners or adds guarantees outside the selected finite trusted scope.
