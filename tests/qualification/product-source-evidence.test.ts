import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { promisify } from "node:util";

import {
  PRODUCT_SOURCE_CLAIM_KIND,
  PRODUCT_SOURCE_PROOF_LIMITS,
  PRODUCT_SOURCE_PROOF_MODE,
  PRODUCT_SOURCE_VERIFICATION_AUTHORITY,
  ProductSourceEvidenceError,
  verifyProductSourceEvidence,
} from "../../architecture/checks/product-source-evidence.mjs";

const execFileAsync = promisify(execFile);

interface ProductRecord {
  repository: string;
  commit: string;
  tree: string;
  files: { path: string; blob: string }[];
}

async function git(root: string, args: readonly string[]): Promise<string> {
  const result = await execFileAsync("git", [...args], {
    cwd: root,
    encoding: "utf8",
    env: {
      ...process.env,
      GIT_AUTHOR_EMAIL: "qualification@example.invalid",
      GIT_AUTHOR_NAME: "Qualification Fixture",
      GIT_COMMITTER_EMAIL: "qualification@example.invalid",
      GIT_COMMITTER_NAME: "Qualification Fixture",
    },
  });
  return result.stdout.trim();
}

async function put(root: string, path: string, source: string | Buffer): Promise<void> {
  await mkdir(dirname(join(root, path)), { recursive: true });
  await writeFile(join(root, path), source);
}

async function initialize(root: string): Promise<void> {
  await git(root, ["init", "--quiet"]);
  await git(root, ["remote", "add", "origin", "https://github.com/example/product.git"]);
}

async function snapshot(root: string): Promise<{ commit: string; tree: string; blob(path: string): Promise<string> }> {
  await git(root, ["add", "."]);
  await git(root, ["commit", "--quiet", "-m", "test: exact source fixture"]);
  const commit = await git(root, ["rev-parse", "HEAD"]);
  return { commit, tree: await git(root, ["rev-parse", `${commit}^{tree}`]), blob: path => git(root, ["rev-parse", `${commit}:${path}`]) };
}

function envelope(product: ProductRecord) {
  return {
    schemaVersion: 3,
    proofMode: PRODUCT_SOURCE_PROOF_MODE,
    capturedAt: "2026-08-28",
    status: "candidate-source-records",
    claim: { kind: PRODUCT_SOURCE_CLAIM_KIND },
    verification: { authority: PRODUCT_SOURCE_VERIFICATION_AUTHORITY, promotionAuthority: false },
    products: { fixture: product },
    limitations: [...PRODUCT_SOURCE_PROOF_LIMITS],
  };
}

async function fixture(root: string) {
  await initialize(root);
  await put(root, "src/source.ts", "export const source = 'exact';\n");
  const exact = await snapshot(root);
  return envelope({
    repository: "example/product",
    commit: exact.commit,
    tree: exact.tree,
    files: [{ path: "src/source.ts", blob: await exact.blob("src/source.ts") }],
  });
}

test("verifier reports only exact Git source custody", async () => {
  const root = await mkdtemp(join(tmpdir(), "exact-git-custody-"));
  try {
    const result = await verifyProductSourceEvidence(await fixture(root), { fixture: root });
    assert.equal(result.schemaVersion, 3);
    assert.equal(result.proofMode, "exact-git-source-custody");
    assert.equal(result.claimKind, "exact-git-source-custody");
    assert.equal(result.verificationAuthority, PRODUCT_SOURCE_VERIFICATION_AUTHORITY);
    assert.equal(result.promotionAuthority, false);
    assert.deepEqual(result.limits, PRODUCT_SOURCE_PROOF_LIMITS);
    assert.equal(result.reports[0]?.files.length, 1);
    assert.ok((result.reports[0]?.totalBlobBytes ?? 0) > 0);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("fixed claim, authority, limitations, and promotion boundary fail closed", async () => {
  const root = await mkdtemp(join(tmpdir(), "exact-git-envelope-"));
  try {
    const evidence = await fixture(root);
    for (const mutate of [
      (copy: any) => { copy.claim.kind = "runtime-semantics-proved"; },
      (copy: any) => { copy.verification.authority = "product-approval"; },
      (copy: any) => { copy.verification.promotionAuthority = true; },
      (copy: any) => { copy.limitations = ["none"]; },
      (copy: any) => { copy.products.fixture.claim = "semantic dataflow verified"; },
    ]) {
      const copy = structuredClone(evidence);
      mutate(copy);
      await assert.rejects(verifyProductSourceEvidence(copy, { fixture: root }), /E-(?:CLAIM|AUTHORITY|STATUS|LIMITATIONS|SCHEMA)/u);
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("exact tree, blob, origin, and repository mappings fail closed", async () => {
  const root = await mkdtemp(join(tmpdir(), "exact-git-identity-"));
  try {
    const evidence = await fixture(root);
    const wrongTree = structuredClone(evidence);
    wrongTree.products.fixture.tree = "0".repeat(40);
    await assert.rejects(verifyProductSourceEvidence(wrongTree, { fixture: root }), /E-TREE/u);
    const wrongBlob = structuredClone(evidence);
    wrongBlob.products.fixture.files[0]!.blob = "0".repeat(40);
    await assert.rejects(verifyProductSourceEvidence(wrongBlob, { fixture: root }), /E-BLOB/u);
    await assert.rejects(verifyProductSourceEvidence(evidence, {}), /E-REPOSITORY/u);
    await assert.rejects(verifyProductSourceEvidence(evidence, { fixture: root, inferredSibling: root }), /E-REPOSITORY/u);
    const duplicate = structuredClone(evidence) as typeof evidence & {
      products: Record<string, ProductRecord>;
    };
    duplicate.products.duplicate = {
      ...structuredClone(duplicate.products.fixture),
      repository: "Example/Product",
    };
    await assert.rejects(
      verifyProductSourceEvidence(duplicate, { fixture: root, duplicate: root }),
      /E-INDEPENDENCE/u,
    );
    await git(root, ["remote", "set-url", "origin", "git@GitHub.com:Example/Product.git"]);
    await verifyProductSourceEvidence(evidence, { fixture: root });
    await git(root, ["remote", "set-url", "origin", "https://github.com/example/other.git"]);
    await assert.rejects(verifyProductSourceEvidence(evidence, { fixture: root }), /E-REPOSITORY/u);
    await git(root, ["remote", "set-url", "origin", "file://github.com/example/product.git"]);
    await assert.rejects(verifyProductSourceEvidence(evidence, { fixture: root }), /E-REPOSITORY/u);
    await git(root, ["remote", "set-url", "origin", "ssh://git:secret@github.com/example/product.git"]);
    await assert.rejects(verifyProductSourceEvidence(evidence, { fixture: root }), /E-REPOSITORY/u);
    await git(root, ["remote", "set-url", "origin", "https://github.com:8443/example/product.git"]);
    await assert.rejects(verifyProductSourceEvidence(evidence, { fixture: root }), /E-REPOSITORY/u);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("ordinary Git failures are not misreported as timeouts", async () => {
  const root = await mkdtemp(join(tmpdir(), "exact-git-failure-"));
  try {
    const evidence = await fixture(root);
    await git(root, ["remote", "remove", "origin"]);
    await assert.rejects(
      verifyProductSourceEvidence(evidence, { fixture: root }),
      (error: unknown) => {
        assert.ok(error instanceof ProductSourceEvidenceError);
        assert.equal(error.code, "E-GIT");
        assert.equal(error.message.includes(root), false);
        return true;
      },
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("gitlinks cannot masquerade as reviewed files", async () => {
  const root = await mkdtemp(join(tmpdir(), "exact-git-gitlink-"));
  try {
    const evidence = await fixture(root);
    const target = evidence.products.fixture.commit;
    await git(root, ["update-index", "--add", "--cacheinfo", `160000,${target},linked-product`]);
    await git(root, ["commit", "--quiet", "-m", "test: add gitlink"]);
    const commit = await git(root, ["rev-parse", "HEAD"]);
    const tree = await git(root, ["rev-parse", `${commit}^{tree}`]);
    const gitlink = envelope({ repository: "example/product", commit, tree, files: [{ path: "linked-product", blob: target }] });
    await assert.rejects(verifyProductSourceEvidence(gitlink, { fixture: root }), /E-MODE.*160000 commit/u);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("a forged regular-file tree entry cannot point at a non-blob object", async () => {
  const root = await mkdtemp(join(tmpdir(), "exact-git-forged-tree-"));
  try {
    const evidence = await fixture(root);
    const realTree = evidence.products.fixture.tree;
    const rawTreePath = join(root, "forged-tree.raw");
    await writeFile(rawTreePath, Buffer.concat([
      Buffer.from("100644 forged.ts\0"),
      Buffer.from(realTree, "hex"),
    ]));
    const forgedTree = await git(root, ["hash-object", "-t", "tree", "-w", "--literally", rawTreePath]);
    const forgedCommit = await git(root, ["commit-tree", forgedTree, "-m", "test: forged tree entry"]);
    const forged = envelope({
      repository: "example/product",
      commit: forgedCommit,
      tree: forgedTree,
      files: [{ path: "forged.ts", blob: realTree }],
    });
    await assert.rejects(
      verifyProductSourceEvidence(forged, { fixture: root }),
      /E-MODE.*must reference a blob object, observed tree/u,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("portable path and blob-size bounds reject adversarial custody records", async () => {
  const invalidPaths = ["src/NUL.ts", "src/bad?.ts", "src/trailing. ", "src/tab\t.ts", "src/../escape.ts"];
  for (const invalidPath of invalidPaths) {
    const root = await mkdtemp(join(tmpdir(), "exact-git-path-"));
    try {
      const evidence = await fixture(root);
      evidence.products.fixture.files[0]!.path = invalidPath;
      await assert.rejects(verifyProductSourceEvidence(evidence, { fixture: root }), /E-PATH/u);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  }
  const root = await mkdtemp(join(tmpdir(), "exact-git-size-"));
  try {
    await initialize(root);
    await put(root, "large.bin", Buffer.alloc(2 * 1024 * 1024 + 1));
    const exact = await snapshot(root);
    const evidence = envelope({ repository: "example/product", commit: exact.commit, tree: exact.tree, files: [{ path: "large.bin", blob: await exact.blob("large.bin") }] });
    await assert.rejects(verifyProductSourceEvidence(evidence, { fixture: root }), /E-BOUNDS/u);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("typed error constructor matches the runtime contract", () => {
  const error = new ProductSourceEvidenceError("E-TEST", "detail");
  assert.equal(error.code, "E-TEST");
  assert.equal(error.message, "E-TEST: detail");
});

test("CLI requires explicit absolute repository mappings and emits custody-only fields", async () => {
  const root = await mkdtemp(join(tmpdir(), "exact-git-cli-"));
  try {
    const evidencePath = join(root, "evidence.yaml");
    const evidence = await fixture(root);
    await writeFile(evidencePath, JSON.stringify(evidence));
    await assert.rejects(execFileAsync(process.execPath, ["architecture/checks/product-source-evidence-cli.mjs", evidencePath], { cwd: process.cwd() }), /usage/u);
    await assert.rejects(execFileAsync(process.execPath, ["architecture/checks/product-source-evidence-cli.mjs", evidencePath, "--repository", "fixture=relative"], { cwd: process.cwd() }), /absolute path/u);
    const oversizedPath = join(root, "oversized.yaml");
    await writeFile(oversizedPath, Buffer.alloc(1024 * 1024 + 1, "x"));
    await assert.rejects(execFileAsync(process.execPath, [
      "architecture/checks/product-source-evidence-cli.mjs",
      oversizedPath,
      "--repository",
      `fixture=${root}`,
    ], { cwd: process.cwd() }), /no larger than 1048576 bytes/u);
    const multiChunkPath = join(root, "multi-chunk.yaml");
    await writeFile(multiChunkPath, `${JSON.stringify(evidence)}${" ".repeat(70 * 1024)}`);
    const multiChunk = await execFileAsync(process.execPath, [
      "architecture/checks/product-source-evidence-cli.mjs",
      multiChunkPath,
      "--repository",
      `fixture=${root}`,
    ], { cwd: process.cwd(), encoding: "utf8" });
    assert.equal(JSON.parse(multiChunk.stdout).proofMode, PRODUCT_SOURCE_PROOF_MODE);

    const secret = "sentinel-origin-secret";
    await git(root, ["remote", "set-url", "origin", `https://user:${secret}@github.com/example/product.git`]);
    await assert.rejects(execFileAsync(process.execPath, [
      "architecture/checks/product-source-evidence-cli.mjs",
      evidencePath,
      "--repository",
      `fixture=${root}`,
    ], { cwd: process.cwd(), encoding: "utf8" }), (error: unknown) => {
      const stderr = typeof error === "object" && error !== null && "stderr" in error
        ? String(error.stderr)
        : String(error);
      assert.match(stderr, /E-REPOSITORY/u);
      assert.equal(stderr.includes(secret), false);
      return true;
    });
    await git(root, ["remote", "set-url", "origin", "https://github.com/example/product.git"]);
    const result = await execFileAsync(process.execPath, [
      "architecture/checks/product-source-evidence-cli.mjs",
      evidencePath,
      "--",
      "--repository",
      `fixture=${root}`,
    ], { cwd: process.cwd(), encoding: "utf8" });
    const report = JSON.parse(result.stdout);
    assert.equal(report.proofMode, PRODUCT_SOURCE_PROOF_MODE);
    assert.equal(report.claimKind, PRODUCT_SOURCE_CLAIM_KIND);
    assert.equal(report.products[0].files, 1);
    assert.equal(Object.hasOwn(report.products[0], "topology"), false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
