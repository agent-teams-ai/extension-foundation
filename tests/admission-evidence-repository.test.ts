import assert from "node:assert/strict";
import { link, mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { assertQualificationPackageInputs, decodeRepositoryAdmissionPolicy, readRepositoryAdmissionPolicy } from "../architecture/checks/admission-evidence/repository-verifier.ts";
import { qualificationPackages, qualificationSourceInputs } from "../architecture/checks/admission-evidence/qualification-profile.ts";

function fixturePolicy() {
  const common = {
    repository: "agent-teams-ai/extension-foundation", repositoryId: 1333298097,
    workflowPath: ".github/workflows/package-conformance.yml", workflowSha256: `sha256:${"1".repeat(64)}`,
    jobName: "package-conformance", allowedEvents: ["push"], conformanceVersion: "0.1.0",
    conformanceSha256: `sha256:${"2".repeat(64)}`, artifactSha256: `sha256:${"3".repeat(64)}`,
    sourceInputs: structuredClone(qualificationSourceInputs),
  };
  return {
    schemaVersion: 1,
    packages: [
      { ...common, packageId: "extension.core", consumerId: "qualification.headline-and-quota",
        implementationId: "extension.core.contributions", artifactName: "extension-foundation-core-0.0.0.tgz", stepName: "Core conformance proof" },
      { ...common, packageId: "extension.node-artifact", consumerId: "qualification.signed-artifact-host",
        implementationId: "extension.node-artifact.verified-artifact", artifactName: "extension-foundation-node-artifact-0.0.0.tgz", stepName: "Artifact conformance proof" },
    ],
  };
}

test("repository metadata cannot narrow the executable qualification source subject", () => {
  const policy = fixturePolicy();
  assert.equal(decodeRepositoryAdmissionPolicy(policy).packages.length, 2);
  for (const replacement of [
    { roots: [], files: [".github/workflows/package-conformance.yml"] },
    { roots: ["packages/core/src"], files: [".github/workflows/package-conformance.yml"] },
    { roots: [...qualificationSourceInputs.roots, "unreviewed"], files: [...qualificationSourceInputs.files] },
  ]) {
    const changed = fixturePolicy();
    const selected = changed.packages.at(0);
    assert.ok(selected);
    selected.sourceInputs = replacement;
    assert.throws(() => decodeRepositoryAdmissionPolicy(changed), /executable closed qualification profile/u);
  }
});

test("repository policy binds the exact packages, consumer identities, workflow and proof step", () => {
  const missing = fixturePolicy(); missing.packages.pop();
  assert.throws(() => decodeRepositoryAdmissionPolicy(missing), /complete repository qualification/u);
  for (const key of ["packageId", "consumerId", "implementationId", "stepName", "jobName", "artifactName", "conformanceVersion"] as const) {
    const changed = fixturePolicy();
    const selected = changed.packages.at(0);
    assert.ok(selected);
    selected[key] = key === "artifactName" ? "different.tgz" : "different";
    assert.throws(() => decodeRepositoryAdmissionPolicy(changed), /E-(POLICY|BINDING)/u, key);
  }
});

test("repository authority reader rejects duplicate JSON, symbolic links, hardlinks and oversized policy", async () => {
  const root = await mkdtemp(join(tmpdir(), "ef-repository-evidence-"));
  const directory = join(root, "architecture");
  const path = join(directory, "package-evidence-policy.json");
  try {
    await mkdir(directory);
    const bytes = JSON.stringify(fixturePolicy());
    await writeFile(path, bytes);
    assert.equal((await readRepositoryAdmissionPolicy(root)).packages.length, 2);
    await writeFile(path, bytes.replace('"schemaVersion":1', '"schemaVersion":0,"schemaVersion":1'));
    await assert.rejects(() => readRepositoryAdmissionPolicy(root), /DUPLICATE_JSON_KEY:schemaVersion/u);
    await rm(path);
    const linked = join(root, "policy.json");
    await writeFile(linked, bytes);
    await symlink(linked, path);
    await assert.rejects(() => readRepositoryAdmissionPolicy(root), /bounded regular authority/u);
    await rm(path);
    await link(linked, path);
    await assert.rejects(() => readRepositoryAdmissionPolicy(root), /bounded regular authority/u);
    await rm(path);
    await writeFile(path, " ".repeat(128 * 1024 + 1));
    await assert.rejects(() => readRepositoryAdmissionPolicy(root), /bounded regular authority/u);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("package input envelope closes implicit archives over reviewed files and exact directories", async () => {
  const root = await mkdtemp(join(tmpdir(), "ef-package-inputs-"));
  try {
    for (const profile of qualificationPackages) {
      const directory = join(root, profile.packageRoot);
      await mkdir(directory, { recursive: true });
      for (const name of ["src", "test", "dist", ".cache", "node_modules"]) {
        await mkdir(join(directory, name));
      }
      for (const path of qualificationSourceInputs.files) {
        const prefix = `${profile.packageRoot}/`;
        if (path.startsWith(prefix) && !path.slice(prefix.length).includes("/")) {
          await writeFile(join(root, path), "reviewed source input");
        }
      }
    }
    await mkdir(join(root, "packages/node-artifact/qualification"));
    await assertQualificationPackageInputs(root);
    for (const name of [".pnpmfile.mjs", ".pnpmfile.cjs"]) {
      await writeFile(join(root, name), "throw new Error('unreviewed install input');");
      await assert.rejects(() => assertQualificationPackageInputs(root), /outside the reviewed package input envelope/u);
      await rm(join(root, name));
    }
    const directory = join(root, "packages/core");
    await mkdir(join(directory, "qualification"));
    await assert.rejects(() => assertQualificationPackageInputs(root), /outside the reviewed package input envelope/u);
    await rm(join(directory, "qualification"), { recursive: true });
    for (const name of ["LICENSE", "CHANGELOG.md", ".npmignore"]) {
      const path = join(directory, name);
      await writeFile(path, "new implicit package input");
      await assert.rejects(() => assertQualificationPackageInputs(root), /outside the reviewed package input envelope/u, name);
      await rm(path);
    }
    const additional = join(directory, "assets");
    await mkdir(additional);
    await assert.rejects(() => assertQualificationPackageInputs(root), /outside the reviewed package input envelope/u);
    await rm(additional, { recursive: true });
    const readme = join(directory, "README.md");
    await rm(readme);
    await symlink(join(directory, "package.json"), readme);
    await assert.rejects(() => assertQualificationPackageInputs(root), /outside the reviewed package input envelope/u);
  } finally { await rm(root, { recursive: true, force: true }); }
});
