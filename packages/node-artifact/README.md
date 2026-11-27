# Verified Node artifacts

<!-- cspell:words opencontainers -->

`@extension-foundation/node-artifact` verifies an immutable OCI artifact and
evaluates its captured JavaScript bundle through a Host-owned typed binding.
It is a private `0.0.0` package; npm publication is deferred. Package admission
and the initial profile belong to
[ADR-0016](../../docs/decisions/0016-provisional-contribution-and-verified-artifact-packages.md).
The [delivery plan](../../docs/architecture/plugin-delivery-plan.md) owns the
remaining installation and production Host work.

## Supported profile

The initial native adapter requires **Linux x64**. Its qualification uses
Node 24.22.3 and 26.12.1, ORAS 1.4.0, Cosign 3.1.6 and a disposable Distribution 3.1.2
registry on IPv4 loopback. Other operating systems and architectures fail at
verifier construction. Expanding that scope needs actual native qualification.
HTTPS is the production transport option; the local campaign does not establish
GHCR or Harbor integration.

The artifact contains one self-contained ESM bundle and optional inert data
assets. `es-module-lexer` 3.0.5 rejects explicit static imports, re-exports,
dynamic imports, `import.meta`, a `then` export and escaped export names before
evaluation. The escaped-name restriction also closes alternate Unicode spellings
of `then`, which JavaScript treats as a namespace thenable. The module
lexer is not a JavaScript security sandbox or a complete syntax validator.
Native Node parsing still validates the module at evaluation.

This is a **trusted cooperative finite-code profile**. JavaScript still has
ambient process, global and dynamically constructed code capabilities. The
bundle convention and import inspection do not prove hostile-code containment.
There is no dependency graph loader, native addon profile or unloading promise.
Each evaluation receives a fresh identity; Node may retain its module cache
entry until the owning process exits. The Host owns attempt budgets and runtime
retirement.

## Ownership and useful guarantees

| Step | Package responsibility | Host responsibility |
| --- | --- | --- |
| Selection | Refuse a mutable tag, mismatched digest or unsupported target | Choose the repository, exact artifact digest and consumer scope |
| Provenance | Verify the captured manifest bytes with Cosign and the pinned public key | Choose the trusted publisher and protect native executable locations |
| Compatibility | Match exact target, scope, contract, revision and loader metadata | Own the export contract and its trusted type guard |
| Staging | Bound descriptors, check every fetched blob, reject path aliases and capture verified bytes | Supply an existing staging root and recover any reported cleanup debt |
| Evaluation | Request current authority, then import the captured bundle with a fresh identity | Decide current admission and construct the module within its owning runtime |
| Effects and replacement | Return verified facts and typed exports | Enforce grants at receivers; own invocation, cleanup, retirement and updates |

Cosign uses the explicitly selected direct-key profile. The public key identity
is SHA-256 of canonical DER SubjectPublicKeyInfo. This profile does not verify a
transparency log or establish a keyless Sigstore identity. A valid signature
does not grant authority, validate commercial entitlement or install an
extension. A disposable qualification key never stands in for a production
publisher's key.

The Host must protect configured ORAS/Cosign executables from concurrent
replacement. The adapter checks their selected executable digests and supported
versions before invocation; this is not a defense against a hostile process
with equivalent filesystem authority.

## Public root and typed binding

Import only the package root. Internal verifier, staging, native-process and
evaluation modules are absent from the package export map. Build and pack the
private package using `pnpm --dir packages/node-artifact pack`, then install that
actual archive in the consumer.

The example contract below belongs to its hypothetical document Host. It is not
a global extension contract supplied by EF:

```ts
import {
  createNodeArtifactVerifier,
  type ArtifactRequest,
  type NodeArtifactTools,
  type VerifiedArtifactFacts,
} from "@extension-foundation/node-artifact";

interface DocumentExport {
  readonly publish: (title: string) => {
    readonly title: string;
    readonly slug: string;
  };
}

function isDocumentExport(value: unknown): value is DocumentExport {
  return value !== null && typeof value === "object"
    && "publish" in value && typeof value.publish === "function";
}

export async function prepareDocumentModule(
  tools: NodeArtifactTools,
  stagingRoot: string,
  request: ArtifactRequest,
  authorize: (facts: VerifiedArtifactFacts) => boolean,
) {
  const verifier = createNodeArtifactVerifier({ tools, stagingRoot });
  const artifact = await verifier.verify(request);
  return artifact.evaluate({
    contract: "document/export",
    revision: 3,
    loader: "document-export-v3",
    authorize,
    validate: isDocumentExport,
  });
}
```

`request` supplies the registry repository without a scheme/tag, a `sha256:`
manifest digest, `https` or the explicit `loopback-http` fixture transport, the
signature bundle bytes, trusted publisher/key identity, and exact expected
`target`, `scope`, `contract`, `revision` and `loader`. An optional absolute
`registryConfig` path gives ORAS its Host-owned authentication configuration;
credentials are never placed in CLI arguments or public diagnostic output.

The returned exports are inputs to the Host's known construction adapter. Put
them behind its invocation/lifetime boundary before exposing operations to other
modules. Do not preserve raw instances across replacement. GM owns composition;
Live Module Updates owns the complete update operation. Neither mechanism is
reimplemented here.

The synchronous `authorize` callback runs immediately before the evaluation
request. A later protected effect still needs current authority at its actual
receiver. Export validation runs **after trusted code evaluation**: rejection of
an export shape cannot undo top-level JavaScript effects. The Host's contract
must define acceptable initialization behavior.

## Artifact format

An OCI image manifest with schema version 2 uses artifact type
`application/vnd.extension-foundation.esm-bundle.v1`. Its configuration is the
OCI empty `{}` descriptor; any embedded descriptor data must be exactly those
bytes. The adapter also fetches and verifies that configuration by digest.

The signed manifest uses valid UTF-8 and the exact compact representation
obtained by `JSON.stringify(JSON.parse(source)) === source`. Duplicate keys,
alternate numeric/escape spellings and additional whitespace are refused. This
bounded ORAS profile restriction is not a claim of general JSON canonicalization
or JCS compliance; publishers must sign the same accepted wire bytes.

The required manifest annotations have prefix `dev.extension-foundation.`:
`target`, `scope`, `publisher`, `contract`, `revision`, `loader` and `entry`.
Revision is an exact positive integer serialized as a string. The initial target
is `node/linux/x64`. There is no inferred revision or package-version negotiation.

The `entry` points to one `.mjs` or `.js` layer with media type `text/javascript`.
Other layers have media type `application/octet-stream` and cannot use executable
`.js`, `.mjs`, `.cjs`, `.wasm` or `.node` suffixes. Every layer has an exact SHA-256,
byte length and `org.opencontainers.image.title` relative path. External
descriptor URLs, alternate embedded data, subjects, traversal, hidden path
components, duplicate/overlapping paths and symbolic-link aliases are refused.

Bounds are 256 KiB each for manifest and signature bundle, 16 layers, 4 MiB per
layer and 8 MiB total payload. Assets are retrieved through `readAsset(path)`,
which returns a detached byte copy. No staging path or caller-controlled loader
callback is exposed. Evaluation imports a data URL of the captured verified
source, so a later filesystem or registry substitution does not change it.

## Failure and resource semantics

`ArtifactError.code` distinguishes invalid input, unavailable or changed tools,
transport, signature, manifest, identity, closure, staging, binding, authority
and export failures. Native command failures expose no raw tool stderr or
credential-bearing output. Command deadlines are bounded to 1–60,000 ms, with a
30,000 ms default. Failed input delivery, timeout and output overflow terminate
the native process and await its close before staging can be released.

Native ESM parsing failures and exceptions thrown by trusted module code during
evaluation propagate unchanged. They are not necessarily `ArtifactError`
instances; the Host must handle its module's own initialization failures.

Each verification owns only a fresh private child of the supplied staging root.
The adapter removes it on success or failure, preserving unrelated Host files.
`ArtifactCleanupError` identifies a failed cleanup location and preserves the
original verification error separately. The Host must retain that recovery debt;
an unsuccessful cleanup is not reported as completed installation or retirement.
The verifier awaits all parallel preparation even if one native-tool check fails.

## Run the actual qualification

From the repository root, using its pinned Node and pnpm toolchain:

```sh
pnpm exec node tests/qualification/artifact/install-native-tools.ts /absolute/native-tools
EF_ARTIFACT_TOOLS_DIR=/absolute/native-tools pnpm qualification:artifact-packed:check
```

The [installer](../../tests/qualification/artifact/install-native-tools.ts) checks
official release archive and executable hashes from the
[pinned tool inventory](../../tests/qualification/artifact/native-tools.ts).
It refuses existing changed executables. Missing tools fail qualification;
the campaign has no skip or substitute-success path.

The [packed campaign](../../tests/qualification/artifact/packed.qualification.ts)
starts a real disposable OCI registry, pushes actual bundle/data blobs with ORAS,
signs exact manifest bytes with a disposable Cosign key, and installs the actual
package archive into an isolated external consumer. That consumer compiles
against installed declarations with strict TypeScript 7.0.2 or newer and executes
the complete verification-to-typed-export path. No checkout source alias or
provider TEST helper supplies its runtime API.

Rejecting cases include wrong target, scope, publisher and ABI; altered signature,
key pin, manifest and executable bytes; forbidden module imports; incompatible
typed binding; refused/throwing authority; changed tools; and symlinked staging.
Independent witnesses distinguish refusal before evaluation from export refusal
after evaluation. The same captured bytes survive a deliberate post-verification
registry substitution. Separate attempts produce separate module namespaces.

Package unit tests check descriptor bounds and the public execution-profile
guard across the repository's Node/OS matrix. The explicit Linux campaign also
requires staging alias/tamper controls, cleanup-debt checks and native subprocess
termination tests. Those Node subprocess fixtures are deterministic custody
controls, not ORAS/Cosign qualification. They cannot be silently skipped by the
native campaign. Package admission authenticates its own source-bound workflow
proof separately.

Primary mechanisms: [ORAS 1.4.0](https://github.com/oras-project/oras/releases/tag/v1.4.0),
[Cosign 3.1.6](https://github.com/sigstore/cosign/releases/tag/v3.1.6),
[Distribution 3.1.2](https://github.com/distribution/distribution/releases/tag/v3.1.2),
[es-module-lexer](https://github.com/guybedford/es-module-lexer),
and [Node ESM data imports](https://nodejs.org/api/esm.html#data-imports).
