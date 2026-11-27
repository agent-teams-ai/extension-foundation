import { equal, fail, ok, rejects, throws } from "node:assert/strict";
import { arch, platform } from "node:process";
import test from "node:test";
import { ArtifactError, createNodeArtifactVerifier, type ArtifactRequest, type NodeArtifactOptions } from "../../../src/features/verified-artifact/index.ts";

const options: NodeArtifactOptions = {
  tools: {
    oras: { path: "/not-acquired/oras", digest: `sha256:${"0".repeat(64)}` },
    cosign: { path: "/not-acquired/cosign", digest: `sha256:${"0".repeat(64)}` },
  },
  stagingRoot: "/not-acquired/staging",
};

test("public artifact errors preserve their failure category and diagnostic name", () => {
  equal(new ArtifactError("artifact.input", "Invalid selected input").code, "artifact.input");
  equal(new ArtifactError("artifact.input", "Invalid selected input").name, "ArtifactError");
});

test("the public factory admits its execution profile and bounds the native command deadline before IO", () => {
  if (platform === "linux" && arch === "x64") {
    const verifier = createNodeArtifactVerifier(options);
    equal(typeof verifier.verify, "function");
    ok(Object.isFrozen(verifier));
    for (const commandTimeoutMs of [0, -1, 60_001, Infinity, NaN, 0.5]) {
      throws(() => createNodeArtifactVerifier({ ...options, commandTimeoutMs }),
        (error: unknown) => error instanceof ArtifactError && error.code === "artifact.input" && error.message.includes("between 1 and 60000"));
    }
  } else {
    throws(() => createNodeArtifactVerifier(options),
      (error: unknown) => error instanceof ArtifactError && error.code === "artifact.input" && error.message.includes("Linux x64"));
  }
});

test("oversized signature material is refused before allocating a snapshot", async context => {
  if (platform !== "linux" || arch !== "x64") {
    throws(() => createNodeArtifactVerifier(options),
      (error: unknown) => error instanceof ArtifactError && error.code === "artifact.input");
    return;
  }
  const signatureBundle = new Uint8Array(256 * 1024 + 1);
  context.mock.method(Uint8Array, "from", () => fail("Rejected bytes must not be copied"));
  const request: ArtifactRequest = {
    repository: "example.org/fixture", digest: `sha256:${"0".repeat(64)}`, transport: "https", signatureBundle,
    trustedPublisher: { id: "fixture/publisher", publicKeyPem: "unused", keyDigest: `sha256:${"0".repeat(64)}` },
    expected: { target: "node/linux/x64", scope: "fixture/scope", contract: "fixture/contract", revision: 1, loader: "fixture-loader" },
  };
  await rejects(createNodeArtifactVerifier(options).verify(request),
    (error: unknown) => error instanceof ArtifactError && error.code === "artifact.input");
});
