import { createPublicKey } from "node:crypto";
import { isAbsolute } from "node:path";
import { arch, platform } from "node:process";
import { init, parse } from "es-module-lexer";
import {
  ArtifactError, type ArtifactRequest,
  type NodeArtifactOptions, type NodeArtifactVerifier, type VerifiedArtifactFacts, type VerifiedNodeArtifact,
} from "./contracts.ts";
import { decodeManifest, inspectManifest, isDigest, limits, validIdentifier } from "./manifest.ts";
import { command, inspectExecutable, sha256 } from "./native.ts";
import { assertStagingEntries, captureStaged, stageFile, withStaging } from "./staging.ts";
import { createVerifiedArtifact } from "./evaluate.ts";

function snapshotRequest(input: ArtifactRequest): ArtifactRequest {
  const signatureBundle = input.signatureBundle;
  if (signatureBundle.length === 0 || signatureBundle.length > limits.bundle) {
    throw new ArtifactError("artifact.input", "Signature material exceeds the admitted input bounds");
  }
  const request: ArtifactRequest = {
    repository: input.repository, digest: input.digest, transport: input.transport,
    ...(input.registryConfig === undefined ? {} : { registryConfig: input.registryConfig }),
    signatureBundle: Uint8Array.from(signatureBundle),
    trustedPublisher: Object.freeze({ id: input.trustedPublisher.id,
      publicKeyPem: input.trustedPublisher.publicKeyPem, keyDigest: input.trustedPublisher.keyDigest }),
    expected: Object.freeze({ target: input.expected.target, scope: input.expected.scope,
      contract: input.expected.contract, revision: input.expected.revision, loader: input.expected.loader }),
  };
  const repo = request.repository;
  if (typeof repo !== "string" || repo.length > 255
      || !/^[a-z0-9][a-z0-9.-]*(?::[1-9][0-9]{0,4})?\/[a-z0-9]+(?:[._/-][a-z0-9]+)*$/.test(repo)
      || repo.includes("..") || !isDigest(request.digest)) throw new ArtifactError("artifact.input", "An immutable registry repository/digest is required");
  if (request.transport !== "https" && request.transport !== "loopback-http") throw new ArtifactError("artifact.input", "Unsupported registry transport");
  if (request.transport === "loopback-http" && !/^127\.0\.0\.1:[1-9][0-9]{0,4}\//.test(repo)) {
    throw new ArtifactError("artifact.input", "Plain HTTP is restricted to an explicit IPv4 loopback fixture registry");
  }
  if (request.registryConfig !== undefined && !isAbsolute(request.registryConfig)) throw new ArtifactError("artifact.input", "Registry configuration path must be absolute");
  const expected = request.expected;
  if (![expected.target, expected.scope, expected.contract, expected.loader, request.trustedPublisher.id].every(validIdentifier)
      || !Number.isSafeInteger(expected.revision) || expected.revision < 1
      || expected.target !== `node/${platform}/${arch}`
      || !isDigest(request.trustedPublisher.keyDigest)
      || typeof request.trustedPublisher.publicKeyPem !== "string" || request.trustedPublisher.publicKeyPem.length > 32 * 1024
      || request.signatureBundle.length === 0 || request.signatureBundle.length > limits.bundle) {
    throw new ArtifactError("artifact.input", "Invalid target, owner binding or signature material");
  }
  return request;
}

function registryArgs(request: ArtifactRequest): string[] {
  return [
    ...(request.transport === "loopback-http" ? ["--plain-http"] : []),
    ...(request.registryConfig === undefined ? [] : ["--registry-config", request.registryConfig]),
  ];
}

function executableSource(bytes: Uint8Array): string {
  let source: string;
  try { source = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(bytes); }
  catch { throw new ArtifactError("artifact.closure", "The executable must be valid UTF-8"); }
  try {
    const [imports, exports] = parse(source);
    if (imports.length !== 0 || exports.some(item => "name" in item && (item.name === "then" || item.name.includes("\\")))) {
      throw new ArtifactError("artifact.closure", "Only self-contained ESM without imports, import.meta, then or escaped export names is supported");
    }
  } catch (error) {
    if (error instanceof ArtifactError) throw error;
    throw new ArtifactError("artifact.closure", "Executable module syntax could not be inspected");
  }
  return source;
}

export function createNodeArtifactVerifier(input: NodeArtifactOptions): NodeArtifactVerifier {
  if (platform !== "linux" || arch !== "x64") {
    throw new ArtifactError("artifact.input", "The admitted native artifact profile currently requires Linux x64");
  }
  const options = {
    tools: { oras: { ...input.tools.oras }, cosign: { ...input.tools.cosign } },
    stagingRoot: input.stagingRoot,
    commandTimeoutMs: input.commandTimeoutMs ?? 30_000,
  };
  if (!Number.isInteger(options.commandTimeoutMs) || options.commandTimeoutMs < 1 || options.commandTimeoutMs > 60_000) {
    throw new ArtifactError("artifact.input", "Native command timeout must be between 1 and 60000 milliseconds");
  }
  return Object.freeze({ verify: async (inputRequest: ArtifactRequest): Promise<VerifiedNodeArtifact> => {
    const request = snapshotRequest(inputRequest);
    let key: Buffer;
    try { key = createPublicKey(request.trustedPublisher.publicKeyPem).export({ format: "der", type: "spki" }); }
    catch { throw new ArtifactError("artifact.signature", "Publisher key is not a supported public key"); }
    if (sha256(key) !== request.trustedPublisher.keyDigest) throw new ArtifactError("artifact.signature", "Trusted publisher key does not match its pinned identity");
    const preparation = await Promise.allSettled([
      inspectExecutable(options.tools.oras, "oras", options.commandTimeoutMs),
      inspectExecutable(options.tools.cosign, "cosign", options.commandTimeoutMs),
      init(),
    ]);
    // A failed parallel preparation still awaits every owned native process.
    for (const result of preparation) if (result.status === "rejected") throw result.reason;
    return withStaging(options.stagingRoot, async directory => {
      const args = registryArgs(request);
      const manifestBytes = await command(options.tools.oras.path,
        ["manifest", "fetch", ...args, `${request.repository}@${request.digest}`],
        options.commandTimeoutMs, limits.manifest, "artifact.transport");
      if (sha256(manifestBytes) !== request.digest) throw new ArtifactError("artifact.identity", "Fetched manifest does not match the requested immutable digest");
      const manifestPath = await stageFile(directory, "verification/manifest.json", manifestBytes);
      const keyPath = await stageFile(directory, "verification/publisher.pem", Buffer.from(request.trustedPublisher.publicKeyPem));
      const bundlePath = await stageFile(directory, "verification/signature.json", request.signatureBundle);
      const stagingFiles = [manifestPath, keyPath, bundlePath];
      // This explicitly selected direct-key profile makes no transparency-log claim.
      // There is no fallback from a failed signature or an unavailable verifier.
      await command(options.tools.cosign.path,
        ["verify-blob", "--key", keyPath, "--bundle", bundlePath, "--insecure-ignore-tlog", "-"],
        options.commandTimeoutMs, limits.bundle, "artifact.signature", manifestBytes);
      await captureStaged(manifestPath, manifestBytes);
      await captureStaged(keyPath, Buffer.from(request.trustedPublisher.publicKeyPem));
      await captureStaged(bundlePath, request.signatureBundle);
      let manifestSource: string;
      try { manifestSource = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(manifestBytes); }
      catch { throw new ArtifactError("artifact.manifest", "Manifest is not valid UTF-8"); }
      const manifest = inspectManifest(decodeManifest(manifestSource), request.expected, request.trustedPublisher.id);
      const fetchBlob = async (digest: string, size: number): Promise<Buffer> => {
        const bytes = await command(options.tools.oras.path,
          ["blob", "fetch", ...args, "--output", "-", `${request.repository}@${digest}`],
          options.commandTimeoutMs, Math.max(size + 1, 1024), "artifact.transport");
        if (bytes.length !== size || sha256(bytes) !== digest) throw new ArtifactError("artifact.closure", "Artifact blob differs from its closed descriptor");
        return bytes;
      };
      const config = await fetchBlob(manifest.config.digest, manifest.config.size);
      if (config.toString("utf8") !== "{}") throw new ArtifactError("artifact.manifest", "Unsupported OCI configuration content");
      const assets = new Map<string, Uint8Array>();
      let source: string | undefined;
      for (const file of manifest.files) {
        const bytes = await fetchBlob(file.digest, file.size);
        const path = await stageFile(directory, `payload/${file.path}`, bytes);
        stagingFiles.push(path);
        const captured = await captureStaged(path, bytes);
        if (file.kind === "module") source = executableSource(captured);
        else assets.set(file.path, captured);
      }
      if (source === undefined) throw new ArtifactError("artifact.manifest", "Executable entry is absent");
      await assertStagingEntries(directory, stagingFiles);
      const facts: VerifiedArtifactFacts = Object.freeze({
        repository: request.repository, digest: request.digest,
        publisher: request.trustedPublisher.id, publisherKeyDigest: request.trustedPublisher.keyDigest,
        ...request.expected, entry: manifest.entry, files: manifest.files,
        signatureProfile: "cosign-direct-key", executableProfile: "self-contained-esm-v1",
      });
      return createVerifiedArtifact(facts, source, assets);
    }).catch((error: unknown) => {
      if (error instanceof ArtifactError) throw error;
      throw new ArtifactError("artifact.staging", "Artifact staging did not complete successfully");
    });
  } });
}
