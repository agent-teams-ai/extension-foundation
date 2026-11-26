import { ArtifactError, type ArtifactFile, type ArtifactRequest, type Sha256 } from "./contracts.ts";

export const artifactType = "application/vnd.extension-foundation.esm-bundle.v1";
export const annotationPrefix = "dev.extension-foundation.";
export const limits = Object.freeze({ manifest: 256 * 1024, bundle: 256 * 1024, file: 4 * 1024 * 1024, total: 8 * 1024 * 1024, files: 16 });

export interface Descriptor {
  readonly digest: Sha256;
  readonly size: number;
  readonly mediaType: string;
}

export interface ArtifactManifest {
  readonly entry: string;
  readonly config: Descriptor;
  readonly files: readonly ArtifactFile[];
}

/** Selected wire representation; this is not a general JSON canonicalizer. */
export function decodeManifest(source: string): unknown {
  try {
    const value: unknown = JSON.parse(source);
    if (JSON.stringify(value) !== source) {
      throw new ArtifactError("artifact.manifest", "Manifest must use the exact compact JSON round-trip representation");
    }
    return value;
  } catch (error) {
    if (error instanceof ArtifactError) throw error;
    throw new ArtifactError("artifact.manifest", "Manifest JSON could not be decoded within the supported representation");
  }
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function isDigest(value: unknown): value is Sha256 {
  return typeof value === "string" && /^sha256:[a-f0-9]{64}$/.test(value);
}

export function validIdentifier(value: unknown): value is string {
  return typeof value === "string" && /^[a-zA-Z0-9][a-zA-Z0-9._/-]{0,191}$/.test(value);
}

export function isArtifactPath(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 240 || !/^[a-zA-Z0-9][a-zA-Z0-9._/-]*$/.test(value)) return false;
  return value.split("/").every(part => part !== "" && part !== "." && part !== ".." && !part.startsWith("."));
}

function descriptor(value: unknown, emptyConfig = false): Descriptor {
  if (!isRecord(value) || !isDigest(value.digest) || typeof value.mediaType !== "string"
      || !Number.isSafeInteger(value.size) || typeof value.size !== "number" || value.size < 0 || value.size > limits.file
      || value.urls !== undefined || (value.data !== undefined && (!emptyConfig || value.data !== "e30="))) {
    throw new ArtifactError("artifact.manifest", "Unsupported OCI descriptor");
  }
  return { digest: value.digest, size: value.size, mediaType: value.mediaType };
}

/** All metadata is checked before a layer can be evaluated. */
export function inspectManifest(value: unknown, expected: ArtifactRequest["expected"], publisher: string): ArtifactManifest {
  if (!isRecord(value) || value.schemaVersion !== 2 || value.mediaType !== "application/vnd.oci.image.manifest.v1+json"
      || value.artifactType !== artifactType || !isRecord(value.annotations) || !Array.isArray(value.layers)
      || value.layers.length < 1 || value.layers.length > limits.files || value.subject !== undefined) {
    throw new ArtifactError("artifact.manifest", "Unsupported OCI manifest/profile");
  }
  const annotations = new Map(Object.entries(value.annotations));
  for (const [key, wanted] of Object.entries({ ...expected, revision: String(expected.revision), publisher })) {
    if (annotations.get(annotationPrefix + key) !== wanted) {
      throw new ArtifactError("artifact.identity", `Artifact ${key} does not match the selected binding`);
    }
  }
  const entry = annotations.get(annotationPrefix + "entry");
  if (!isArtifactPath(entry) || !/\.(?:mjs|js)$/.test(entry)) throw new ArtifactError("artifact.manifest", "Invalid executable entry path");
  // ORAS emits OCI's embedded `{}` bytes for its empty configuration. No other
  // embedded content or alternate URL can bypass the separately fetched digest.
  const config = descriptor(value.config, true);
  if (config.mediaType !== "application/vnd.oci.empty.v1+json" || config.size !== 2) {
    throw new ArtifactError("artifact.manifest", "Only the empty OCI configuration is supported");
  }
  const paths = new Set<string>();
  let total = 0;
  let modules = 0;
  const files = value.layers.map((layer: unknown): ArtifactFile => {
    const item = descriptor(layer);
    if (!isRecord(layer) || !isRecord(layer.annotations)) throw new ArtifactError("artifact.manifest", "Missing layer title");
    const path = new Map(Object.entries(layer.annotations)).get("org.opencontainers.image.title");
    if (!isArtifactPath(path) || paths.has(path) || [...paths].some(other => path.startsWith(other + "/") || other.startsWith(path + "/"))) {
      throw new ArtifactError("artifact.manifest", "Unsafe, duplicate or overlapping layer path");
    }
    paths.add(path);
    total += item.size;
    if (total > limits.total) throw new ArtifactError("artifact.manifest", "Artifact exceeds the supported byte budget");
    const kind = path === entry ? "module" : "asset";
    if (kind === "module") {
      modules++;
      if (item.mediaType !== "text/javascript") throw new ArtifactError("artifact.manifest", "Entry is not a JavaScript layer");
    } else if (item.mediaType !== "application/octet-stream" || /\.(?:[cm]?js|wasm|node)$/i.test(path)) {
      throw new ArtifactError("artifact.manifest", "Only inert data assets accompany the self-contained module");
    }
    return Object.freeze({ path, digest: item.digest, size: item.size, kind });
  });
  if (modules !== 1) throw new ArtifactError("artifact.manifest", "The entry must identify exactly one module layer");
  return { entry, config, files: Object.freeze(files) };
}
