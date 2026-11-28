import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { requireValidPackagePolicy } from "../architecture/checks/package-policy.mjs";
import { requireValidScaffoldPolicy } from "../architecture/checks/scaffold-preparation.ts";

const core = {
  id: "extension.core", path: "packages/core", package_name: "@extension-foundation/core",
  role: "foundation-component", owner_document: "ADR-0016",
};
const artifact = {
  id: "extension.node-artifact", path: "packages/node-artifact", package_name: "@extension-foundation/node-artifact",
  role: "integration-adapter", owner_document: "ADR-0016",
};

function owner() {
  return {
    id: "ADR-0016", type: "adr", status: "accepted", supersededBy: [] as string[],
    packageOwnershipErrors: [] as string[],
    packageOwnership: [
      {
        packageId: core.id, packageName: core.package_name, packagePath: core.path,
        semanticClassification: "ordinary-library", features: ["contributions"],
      },
      {
        packageId: artifact.id, packageName: artifact.package_name, packagePath: artifact.path,
        semanticClassification: "ordinary-library", features: ["verified-artifact"],
      },
    ],
  };
}

async function fixture(run: (root: string) => Promise<void>): Promise<void> {
  const root = await mkdtemp(join(tmpdir(), "ef-scaffold-preparation-"));
  try {
    await mkdir(join(root, "architecture/foundation"), { recursive: true });
    await writeFile(join(root, "architecture/package-catalog.json"), JSON.stringify({ version: 1, packages: [core, artifact] }));
    await writeFile(join(root, "architecture/foundation/scaffolding.yaml"), "compositions:\n  - targetRoles: [foundation-component, integration-adapter, testing-support]\n");
    await run(root);
  } finally { await rm(root, { recursive: true, force: true }); }
}

test("exact owned preparation is possible before evidence; full admission remains unavailable", async () => {
  await fixture(async root => {
    const prepared = await requireValidScaffoldPolicy(root, async () => owner());
    assert.deepEqual([...prepared.preparationsById ?? []], [
      [core.id, { ownerDocument: "ADR-0016", semanticClassification: "ordinary-library" }],
      [artifact.id, { ownerDocument: "ADR-0016", semanticClassification: "ordinary-library" }],
    ]);
    assert.equal(prepared.admissionsById.size, 0);
    assert.equal(prepared.admissionRecordDigestsById.size, 0);
    assert.equal("outcome" in prepared, false);
    await assert.rejects(() => requireValidPackagePolicy(root), /admission evidence is missing or invalid/u);
  });
});

test("preparation cannot admit foreign packages or change one selected package's identity or role", async () => {
  for (const changed of [
    { ...core, id: "extension.foreign" },
    { ...core, package_name: "@extension-foundation/foreign" },
    { ...core, path: "packages/foreign" },
    { ...core, role: "testing-support" },
    { ...core, owner_document: "ADR-0015" },
  ]) await fixture(async root => {
    await writeFile(join(root, "architecture/package-catalog.json"), JSON.stringify({ version: 1, packages: [changed, artifact] }));
    await assert.rejects(() => requireValidScaffoldPolicy(root, async () => owner()), /not authorized by ADR-0016/u);
  });
});

test("preparation reuses the closed catalog validator and selected role allowlist", async () => {
  for (const packages of [
    [core, core],
    [{ ...core, extra: true }, artifact],
    [{ ...core, path: "packages/../outside" }, artifact],
    [{ ...core, role: "unknown-role" }, artifact],
  ]) await fixture(async root => {
    await writeFile(join(root, "architecture/package-catalog.json"), JSON.stringify({ version: 1, packages }));
    await assert.rejects(() => requireValidScaffoldPolicy(root, async () => owner()), /package catalog is invalid/u);
  });
});

test("proposed, superseded, ambiguous and semantic owners cannot use the preparation route", async () => {
  const cases: ((value: ReturnType<typeof owner>) => void)[] = [
    value => { value.status = "proposed"; },
    value => { value.supersededBy.push("ADR-0017"); },
    value => { value.packageOwnershipErrors.push("invalid owner declaration"); },
    value => { const first = value.packageOwnership[0]; if (first) value.packageOwnership.push(first); },
    value => { const first = value.packageOwnership[0]; if (first) first.semanticClassification = "foundation-module-semantics"; },
    value => { const first = value.packageOwnership[0]; if (first) first.features = ["different"]; },
    value => { const first = value.packageOwnership[0]; if (first) first.features.push("extra"); },
  ];
  for (const change of cases) await fixture(async root => {
    const changed = owner(); change(changed);
    await assert.rejects(() => requireValidScaffoldPolicy(root, async () => changed), /exact effective accepted ADR-0016/u);
  });
});

test("existing empty, malformed and symbolic-link admission paths never fall back to preparation", async () => {
  for (const shape of ["empty", "malformed", "symlink"] as const) await fixture(async root => {
    const directory = join(root, "architecture/package-admissions");
    if (shape === "symlink") await symlink(join(root, "absent"), directory, process.platform === "win32" ? "junction" : "dir");
    else {
      await mkdir(directory);
      if (shape === "malformed") await writeFile(join(directory, "extension-dot-core.json"), "not JSON");
    }
    let resolved = false;
    await assert.rejects(() => requireValidScaffoldPolicy(root, async () => { resolved = true; return owner(); }), /package catalog is invalid/u);
    assert.equal(resolved, false);
  });
});

test("an admission directory appearing during owner resolution closes the preparation route", async () => {
  await fixture(async root => {
    await assert.rejects(() => requireValidScaffoldPolicy(root, async () => {
      await mkdir(join(root, "architecture/package-admissions"), { recursive: true });
      return owner();
    }), /admission evidence is missing or invalid/u);
  });
});

test("preparation refuses symbolic-link authority ancestors", async () => {
  await fixture(async root => {
    const outside = await mkdtemp(join(tmpdir(), "ef-scaffold-authority-"));
    try {
      await rm(join(root, "architecture"), { recursive: true });
      await symlink(outside, join(root, "architecture"), process.platform === "win32" ? "junction" : "dir");
      await assert.rejects(() => requireValidScaffoldPolicy(root, async () => owner()), /authority ancestors must be real/u);
    } finally { await rm(outside, { recursive: true, force: true }); }
  });
});
