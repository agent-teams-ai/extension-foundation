import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { lstat, readFile } from "node:fs/promises";
import { isAbsolute, join } from "node:path";
import { promisify } from "node:util";

/** Official Linux x64 release assets, checked against publisher checksum files. */
export const releases = Object.freeze({
  oras: Object.freeze({
    version: "1.4.0", executableDigest: "sha256:d1aea546c0f929151358925ff7b9693ea9c5ec9c13881ce13bcc71484a561ecd",
    archiveDigest: "sha256:d8e1dce2fd8ce996f1d901845b688eb0cf505a6082897606f053825bb47935d1",
    url: "https://github.com/oras-project/oras/releases/download/v1.4.0/oras_1.4.0_linux_amd64.tar.gz",
    member: "oras",
  }),
  cosign: Object.freeze({
    version: "3.1.6", executableDigest: "sha256:318a99ade4156a0c4113aa983b46c0a0830fa7896a096c63121ee47b610a94c6",
    archiveDigest: "sha256:318a99ade4156a0c4113aa983b46c0a0830fa7896a096c63121ee47b610a94c6",
    url: "https://github.com/sigstore/cosign/releases/download/v3.1.6/cosign-linux-amd64",
    member: null,
  }),
  registry: Object.freeze({
    version: "3.1.2", executableDigest: "sha256:7f9e0df42bd028efb1a11eb7f92ef494156bf308770303a256d3acdcadb378cd",
    archiveDigest: "sha256:40df2224d410f72ae425c3371873b078bbdbda3b8b612be9571f0e6751f3acc8",
    url: "https://github.com/distribution/distribution/releases/download/v3.1.2/registry_3.1.2_linux_amd64.tar.gz",
    member: "registry",
  }),
});

export const runFile = promisify(execFile);
export const sha256 = (value: Uint8Array | string): `sha256:${string}` =>
  `sha256:${createHash("sha256").update(value).digest("hex")}`;

export async function selectedTools(directory: string) {
  assert.ok(isAbsolute(directory), "EF_ARTIFACT_TOOLS_DIR must be an absolute directory");
  const select = async (name: keyof typeof releases) => {
    const path = join(directory, name);
    const metadata = await lstat(path);
    assert.ok(metadata.isFile() && !metadata.isSymbolicLink(), `Required native ${name} executable is missing or aliased`);
    const digest = sha256(await readFile(path));
    assert.equal(digest, releases[name].executableDigest, `Wrong ${name} executable bytes`);
    return { path, digest };
  };
  return { oras: await select("oras"), cosign: await select("cosign"), registry: await select("registry") };
}
