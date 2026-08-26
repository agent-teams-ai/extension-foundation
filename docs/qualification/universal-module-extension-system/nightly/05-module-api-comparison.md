---
id: qualification.universal-module-extension-system.nightly.module-api-comparison
type: qualification
status: qualified
owner: architecture
summary: Compares API shapes for the private rehearsal and later serialization or publication gates.
---

# Module API Comparison

| Shape | Use now | Strength | Blocking concern | Reversal trigger |
| --- | --- | --- | --- | --- |
| Handwritten private TypeScript port | Yes | Small, typed, product-owned, easy to delete | In-process and non-portable | Keep while every real consumer is TypeScript and local |
| Descriptor plus factory | Not yet | Can separate inert declaration from construction | Starts identity, sealing, graph, and diagnostics obligations | Real runtime-selected provider with accepted ownership path |
| JSON Schema plus handwritten executable port | Later candidate | Explicit wire data and language-neutral validation | Does not define callbacks, authority, or transport security | Two-language serialized contract with hostile and N/N-1 fixtures |
| Protobuf or gRPC family | Deferred | Strong polyglot and streaming ecosystem | Imposes wire and tooling choices on direct composition | Funded polyglot, remote, streaming, or multiplexed process consumer |
| TypeScript-first generation | Deferred | Familiar authoring for a TS-only estate | Generated schema fidelity and compatibility unproved | Reproducible independent generation and all stable consumers remain TS |
| WIT or Extism ABI | Deferred | Potential Wasm language boundary | ABI, capabilities, quotas, provenance, lifecycle, and containment absent | Funded non-TS or stronger isolation case |
| Public provider SPI | No-go | Enables independent implementations | No stable owner, implementation independence, compatibility, or support | Two independently authored implementations and publication gates |

The rehearsal port returns non-authoritative evidence states such as `evidence`,
`pending`, `reconciliation-required`, and `unsupported`. It does not mutate Work,
expose a general resolver, accept ambient context, or include framework types.
The owning use case supplies explicit inputs and revalidates the returned state
and policy revisions before mutation.

Package shape is private ESM with explicit exports only after packing is useful.
No stable all-host format, CommonJS, generated SDK, or wire-format promise exists
now. The following concepts remain distinct:

- `Library`: reusable behavior with no runtime dependency;
- `DesignModule`: inert authoring-time composition definition;
- `SourceModule`: source/package unit from which definitions are obtained;
- `RuntimeComponent`: activated instance with runtime ownership;
- `Contribution`: capability offered to a product extension point;
- `PluginArtifact`: distribution, trust, install, and update envelope; and
- `DeploymentUnit`: independently placed and operated executable unit.

See [UMEQ decisions](08-umeq-decision-matrix.md), the existing
[packaging guidance](../packaging-and-reuse.md), and the
[executive report](01-executive-report.md).
