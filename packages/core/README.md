# Extension Foundation Core

`@extension-foundation/core` selects compatible extension contributions against
contracts owned by the consuming application or library. It is a small ordinary
TypeScript/JavaScript library: no Get Modular dependency, Node API, registry,
credentials or Host is required.

This is a provisional private `0.0.0` package under
[ADR-0016](../../docs/decisions/0016-provisional-contribution-and-verified-artifact-packages.md).
The repository builds compiled ESM and declarations and tests installation from
the packed artifact. npm publication and a stable public extension SPI are
separate stages. Use the exact qualified artifact selected by your project;
pre-1.0 contract changes remain explicit.

## When to use it

Use the core after your Host has obtained bounded inert contribution metadata
and selected its own known contracts. The result tells the Host which declared
contributions it understands and which unsupported optional contributions it
omitted. A rejected candidate exposes no selected prefix.

The core does not load candidate code, verify artifact signatures, grant
permissions, install an extension or coordinate a live update. Those facts have
different owners. See the [delivery responsibilities](../../docs/architecture/plugin-delivery-plan.md)
and [system map](../../docs/architecture/live-extension-system-map.md) for their
integration boundaries.

## Installation from a built package

From this repository, create a distributable with its declared build tooling:

```sh
pnpm --dir packages/core pack --pack-destination /absolute/path/to/artifacts
```

An ordinary external project installs that `.tgz` with its own package manager:

```sh
npm install /absolute/path/to/artifacts/extension-foundation-core-0.0.0.tgz
```

Import only `@extension-foundation/core`. The package's export map closes deep
paths, and consumers use emitted `.js` and `.d.ts` files instead of repository
TypeScript source.

## An owner-defined contract

The owner defines the contract identity, exact revision and synchronous payload
predicate. The predicate is trusted Host code; it never comes from artifact
metadata.

```ts
import { matchContributions, type OwnerContract } from "@extension-foundation/core";

interface Heading {
  readonly text: string;
}

const heading: OwnerContract<Heading> = {
  id: "editor/heading",
  revision: 1,
  validate(value): value is Heading {
    return typeof value === "object" && value !== null &&
      Object.keys(value).length === 1 &&
      "text" in value && typeof value.text === "string" &&
      value.text.length > 0;
  },
};

export function headingsFor(metadata: unknown): readonly string[] {
  const decision = matchContributions(metadata, [heading]);
  if (!decision.ok) throw new Error(`Contribution refused: ${decision.reason}`);
  return decision.selected.map(({ payload }) => `Heading: ${payload.text}`);
}

const headings = headingsFor([
  {
    id: "document/heading",
    contract: "editor/heading",
    revision: 1,
    required: true,
    payload: { text: "Review queue" },
  },
]);
// ["Heading: Review queue"]
```

The same API supports materially different owner schemas. The installed
[heading consumer](../../tests/fixtures/packaged-core/headline-consumer.ts) and
[quota consumer](../../tests/fixtures/packaged-core/quota-consumer.ts) compile in
separate clean projects against the same archive and execute independent useful
operations. Their [campaign](../../tests/packaged-core.test.ts) also checks
rejection before consumer effects and closed package exports.

## Compatibility and failure semantics

| Input or owner condition | Result |
| --- | --- |
| Known contract, exact revision, valid payload | Selected in declaration order |
| Unknown required contract | Whole candidate refuses with `unknown-required-contract` |
| Required revision differs | Whole candidate refuses with `unsupported-required-revision` |
| Unknown optional contract | Explicit `unknown-contract` omission; no owner validator call |
| Unsupported optional revision | Explicit `unsupported-revision` omission; no owner validator call |
| Invalid payload for a supported contract, including optional | Whole candidate refuses with `invalid-contribution-payload` |
| Throwing or non-boolean owner predicate | Whole candidate refuses with `invalid-owner-validator` |
| Malformed envelope or non-inert metadata | Whole candidate refuses with `invalid-contribution-carrier` |
| Duplicate contribution identity | Whole candidate refuses with `duplicate-contribution-identity` |
| Invalid or duplicate owner definition | Whole candidate refuses with `invalid-owner-contracts` |

No semantic-version range or cross-revision compatibility is inferred. A
revision is a positive safe integer. A future compatibility relation requires
owner-authored behavior and its own evidence; updating the npm package version
does not negotiate contribution revisions.

A successful result contains `selected` and `omitted`. A failure contains only
`ok: false` and `reason`. The owner table is captured before validation, and the
entire carrier is copied and recursively frozen before any owner predicate runs.
Mutating the original input afterwards cannot change the selected snapshot.
Owner predicates may already have run when a later contribution rejects, so
predicates should validate data rather than perform application effects.

Payload types are supplied by the owner. When matching several distinct payload
schemas, use their union and narrow it explicitly before use. An arbitrary
string contract identity does not itself narrow a TypeScript union. The
[type fixtures](../../tests/fixtures/packaged-core/types.ts) demonstrate these
compile-time boundaries.

## Inert metadata and limits

Pass decoded current-realm JSON-like data: plain objects, arrays, null, booleans,
finite numbers and strings. Null-prototype records are also accepted. Functions,
accessors, class instances, sparse arrays, symbol or hidden properties, cycles
and non-finite numbers refuse. Envelope fields are exactly `id`, `contract`,
`revision`, `required` and `payload`.

The Host must bound decoding before calling the library and must not pass
candidate-created JavaScript objects. Proxy reflection traps can execute code;
this API is not a hostile-object sandbox. Getters and `toJSON` hooks on ordinary
metadata are not invoked. Only the separately supplied trusted predicates run.

| Bound | Maximum |
| --- | ---: |
| Contributions per nonempty carrier | 64 |
| Owner contracts | 64 |
| Visited values across the complete carrier | 2,048 |
| Nesting depth, including the carrier | 16 |
| Combined text in values and property names, in UTF-16 units | 65,536 |
| Contribution or contract identity, in UTF-16 units | 128 |

These fixed values are exported as frozen `contributionLimits`. The exported
`CompatibilityFailure`, `CompatibilityResult`, `OwnerContract`,
`SelectedContribution` and `OmittedContribution` types describe the public root
surface. Internal metadata helpers are not public API.

## Next boundary

Treat the result as compatibility data. Before executing a selected extension,
the Host still verifies its artifact and executable profile, chooses its known
loader/export contract, checks current authority, and owns effects and resource
lifetime. Optional omission is visible data for the caller; it is never a grant
or an implicit fallback after an authority failure.

See the [Feature Module Standard profile](../../docs/architecture/feature-module-standard-profile.md)
for the package's source boundaries and [agent navigation](../../AGENTS.md) for
the authoritative architecture and implementation entrypoints.
