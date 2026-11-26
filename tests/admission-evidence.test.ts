import assert from "node:assert/strict";
import { test } from "node:test";
import {
  collectConformanceEvidence, createGitHubAdmissionEvidenceVerifier,
  decodeAdmissionEvidencePolicy, digestSourceInputs, evidenceReference,
  formatPackageConformanceProof, readPackageConformanceProof, sha256,
} from "../architecture/checks/admission-evidence/index.ts";
import type { GitHubEvidenceProvider, PackageConformanceProof, SourceInput } from "../architecture/checks/admission-evidence/index.ts";

/** Provider-port fixtures test the decision boundary; these are not historical CI receipts. */
function fixture() {
  const repository = "agent-teams-ai/extension-foundation";
  const source = "a".repeat(40);
  const workflowPath = ".github/workflows/package-conformance.yml";
  const workflow = new TextEncoder().encode("name: Package conformance\non: push\n");
  const inputs: SourceInput[] = [
    { path: "packages/core/src/index.ts", sha256: sha256("export const useful = 42;\n") },
    { path: workflowPath, sha256: sha256(workflow) },
    { path: "tests/packed-consumer.test.ts", sha256: sha256("owned independent oracle") },
  ];
  const policy = {
    schemaVersion: 1,
    packages: [{
      packageId: "extension.core", repository, repositoryId: 1333298097,
      workflowPath, workflowSha256: sha256(workflow),
      jobName: "Core qualification", stepName: "Emit package conformance", allowedEvents: ["push"],
      conformanceVersion: "0.1.0", consumerId: "external.core-consumer", implementationId: "core.installed",
      conformanceSha256: sha256("useful+denied+installed-export"), artifactName: "extension-foundation-core-0.0.0.tgz",
      artifactSha256: sha256("actual fixture tarball bytes"),
      sourceInputs: { roots: ["packages/core/src"], files: [workflowPath, "tests/packed-consumer.test.ts"] },
    }],
  };
  const selected = policy.packages[0];
  assert.ok(selected);
  const proof: PackageConformanceProof = {
    schemaVersion: 1, packageId: selected.packageId, repositoryId: selected.repositoryId,
    sourceRevision: source, runId: 107, runAttempt: 2, consumerId: selected.consumerId,
    implementationId: selected.implementationId, conformanceVersion: selected.conformanceVersion,
    conformanceSha256: selected.conformanceSha256, sourceInputsSha256: digestSourceInputs(inputs),
    artifactName: selected.artifactName, artifactSha256: selected.artifactSha256,
  };
  const encode = (value: PackageConformanceProof) => new TextEncoder().encode(`2026-11-26T20:00:00.0000000Z ${formatPackageConformanceProof(value)}\n`);
  const state = {
    repo: { id: selected.repositoryId, full_name: repository, fork: false } as Record<string, unknown>,
    job: {
      id: 301, name: selected.jobName, head_sha: source, status: "completed", conclusion: "success", run_id: 107, run_attempt: 2,
      steps: [
        { number: 3, name: "Run useful and rejecting conformance", status: "completed", conclusion: "success" },
        { number: 4, name: selected.stepName, status: "completed", conclusion: "success" },
      ],
    } as Record<string, unknown>,
    run: {
      id: 107, run_attempt: 2, head_sha: source, event: "push", status: "completed", conclusion: "success", path: workflowPath,
      repository: { id: selected.repositoryId, full_name: repository },
      head_repository: { id: selected.repositoryId, full_name: repository },
    } as Record<string, unknown>,
    log: encode(proof), workflow, inputs,
  };
  const provider: GitHubEvidenceProvider = {
    getRepository: async name => { assert.equal(name, repository); return structuredClone(state.repo); },
    getJob: async (name, job) => { assert.equal(name, repository); assert.equal(job, 301); return structuredClone(state.job); },
    getRunAttempt: async (name, run, attempt) => {
      assert.equal(name, repository); assert.equal(run, 107); assert.equal(attempt, 2); return structuredClone(state.run);
    },
    getWorkflow: async (name, revision, path) => {
      assert.equal(name, repository); assert.equal(revision, source); assert.equal(path, workflowPath); return state.workflow;
    },
    getStepLogs: async (name, job, step) => {
      assert.equal(name, repository); assert.equal(job, 301); assert.equal(step, 4); return state.log;
    },
  };
  const evidence = {
    consumer_id: selected.consumerId, implementation_id: selected.implementationId, consumer_repository: repository,
    source_revision: source, conformance_result: "passed", evidence_kind: "independent-conformance",
    evidence_reference: evidenceReference(repository, 301, 4, state.log),
  };
  const admission = {
    schema_version: 4, package_id: selected.packageId, owner_repository: repository,
    conformance_version: selected.conformanceVersion, semantic_classification: "ordinary-library",
    semantic_extraction_decision: "not-applicable", admission_basis: "independent-replacement-or-release-lifecycle",
    consumer_evidence: [evidence],
  };
  const input = {
    root: "/fixture", entry: { id: selected.packageId }, admission,
    request: { packageId: selected.packageId, admissionRecordDigest: sha256("actual admission record"), requiredGateId: "phase-3-package-admission" },
  };
  const verify = () => createGitHubAdmissionEvidenceVerifier({ policy, provider, readSourceInputs: async () => state.inputs })(input);
  const replaceProof = (changed: PackageConformanceProof): void => {
    state.log = encode(changed);
    evidence.evidence_reference = evidenceReference(repository, 301, 4, state.log);
  };
  return { repository, selected, policy, proof, state, provider, input, admission, evidence, verify, replaceProof };
}

test("real decision boundary returns only the existing exactly bound admission receipt", async () => {
  const f = fixture();
  const actual = await f.verify();
  assert.deepEqual(actual, { ...f.input.request, outcome: "satisfied" });
  assert.equal(Object.isFrozen(actual), true);
  const collected = await collectConformanceEvidence(f.provider, f.repository, 301, f.selected.stepName);
  assert.equal(collected.evidence_reference, f.evidence.evidence_reference);
  assert.deepEqual(collected.proof, f.proof);
  assert.equal("outcome" in collected, false);
});

test("source subject binds newly added files, changed implementation and changed harness independently", async () => {
  for (const kind of ["added", "implementation", "harness"] as const) {
    const f = fixture();
    if (kind === "added") f.state.inputs.push({ path: "packages/core/src/late.ts", sha256: sha256("unqualified") });
    else {
      const path = kind === "implementation" ? "packages/core/src/index.ts" : "tests/packed-consumer.test.ts";
      f.state.inputs = f.state.inputs.map(item => item.path === path ? { ...item, sha256: sha256("changed input") } : item);
    }
    await assert.rejects(f.verify, /current source\/build inputs/u);
  }
});

test("receipt metadata can change while the genuine source input subject stays fixed", async () => {
  const f = fixture();
  f.input.request.admissionRecordDigest = sha256("new metadata containing immutable run coordinates");
  assert.equal((await f.verify()).admissionRecordDigest, f.input.request.admissionRecordDigest);
});

test("evidence bytes, artifact bytes and conformance identity each require their exact binding", async () => {
  const bytes = fixture();
  bytes.state.log = new TextEncoder().encode("substituted bytes");
  await assert.rejects(bytes.verify, /evidence bytes/u);
  for (const key of ["artifactSha256", "conformanceSha256", "sourceRevision", "sourceInputsSha256", "packageId", "consumerId", "implementationId", "conformanceVersion"] as const) {
    const f = fixture();
    const replacement = key.endsWith("Sha256") ? sha256("substituted") : key === "sourceRevision" ? "b".repeat(40) : "different";
    f.replaceProof({ ...f.proof, [key]: replacement });
    await assert.rejects(f.verify, /E-BINDING/u, key);
  }
});

test("repo aliases, changed stable identity and fork execution cannot manufacture provenance", async () => {
  for (const mutate of [
    (f: ReturnType<typeof fixture>) => { f.state.repo["full_name"] = "other/alias"; },
    (f: ReturnType<typeof fixture>) => { f.state.repo["id"] = 8; },
    (f: ReturnType<typeof fixture>) => { f.state.repo["fork"] = true; },
    (f: ReturnType<typeof fixture>) => { f.state.run["head_repository"] = { id: 8, full_name: f.repository }; },
    (f: ReturnType<typeof fixture>) => { f.state.run["repository"] = { id: 8, full_name: f.repository }; },
  ]) {
    const f = fixture(); mutate(f); await assert.rejects(f.verify, /E-BINDING/u);
  }
});

test("failed, cancelled, skipped, pending and foreign-attempt runs never become passed evidence", async () => {
  for (const conclusion of ["failure", "cancelled", "skipped", null]) {
    const f = fixture(); f.state.run["conclusion"] = conclusion;
    await assert.rejects(f.verify, /run conclusion/u);
  }
  for (const key of ["id", "run_attempt", "head_sha", "event", "path", "status"] as const) {
    const f = fixture(); f.state.run[key] = key === "id" || key === "run_attempt" ? 99 : "different";
    await assert.rejects(f.verify, /E-BINDING/u, key);
  }
});

test("a named green job cannot substitute another source, workflow, proof step or job identity", async () => {
  for (const key of ["id", "name", "head_sha", "conclusion", "status"] as const) {
    const f = fixture(); f.state.job[key] = key === "id" ? 9 : "different";
    await assert.rejects(f.verify, /E-BINDING/u, key);
  }
  const workflow = fixture(); workflow.state.workflow = new TextEncoder().encode("name: counterfeit green workflow\n");
  await assert.rejects(workflow.verify, /reviewed workflow bytes/u);
  for (const steps of [
    [{ number: 4, name: "Run untrusted package stdout", status: "completed", conclusion: "success" }],
    [{ number: 5, name: "Emit package conformance", status: "completed", conclusion: "success" }],
    [{ number: 4, name: "Emit package conformance", status: "completed", conclusion: "skipped" }],
    [{ number: 4, name: "Emit package conformance", status: "completed", conclusion: "success" }, { number: 5, name: "Emit package conformance", status: "completed", conclusion: "success" }],
  ]) {
    const f = fixture(); f.state.job["steps"] = steps; await assert.rejects(f.verify, /E-(BINDING|STEP)/u);
  }
});

test("missing online evidence fails; there is no cached or local-path success fallback", async () => {
  const f = fixture();
  const verify = createGitHubAdmissionEvidenceVerifier({
    policy: f.policy,
    provider: { ...f.provider, getStepLogs: async () => { throw new Error("provider unavailable"); } },
    readSourceInputs: async () => f.state.inputs,
  });
  await assert.rejects(() => verify(f.input), /provider unavailable/u);
  f.evidence.evidence_reference = `docs/copied-receipt.json#sha256=${"a".repeat(64)}`;
  await assert.rejects(f.verify, /E-REFERENCE/u);
});

test("other admission bases remain outside this exact evidence profile", async () => {
  for (const basis of ["public-spi", "second-real-consumer", "independent-deployment-or-isolation"]) {
    const f = fixture(); f.admission.admission_basis = basis; await assert.rejects(f.verify, /E-BASIS/u);
  }
  const semantic = fixture(); semantic.admission.semantic_classification = "foundation-module-semantics";
  await assert.rejects(semantic.verify, /E-BASIS/u);
  const extra = fixture(); extra.admission.consumer_evidence.push({ ...extra.evidence, consumer_id: "extra" });
  await assert.rejects(extra.verify, /consumer evidence/u);
});

test("proof parsing rejects duplicate markers, duplicate JSON keys, unrelated stdout and bad UTF-8", () => {
  const f = fixture();
  const line = formatPackageConformanceProof(f.proof);
  for (const text of [
    `${line}\n${line}\n`,
    line.replace('"schemaVersion":1', '"schemaVersion":0,"schemaVersion":1'),
    `Run echo '${line}'\n`,
    `${line.replace("EF_PACKAGE_CONFORMANCE_V1 ", "EF_PACKAGE_CONFORMANCE_V1  ")}\n`,
  ]) assert.throws(() => readPackageConformanceProof(new TextEncoder().encode(text)), /E-LOG/u);
  assert.throws(() => readPackageConformanceProof(new Uint8Array([0xff])), /UTF-8/u);
});

test("reviewed policy is detached from caller mutation and requires exact workflow source coverage", async () => {
  const f = fixture();
  const verify = createGitHubAdmissionEvidenceVerifier({ policy: f.policy, provider: f.provider, readSourceInputs: async () => f.state.inputs });
  f.selected.artifactSha256 = sha256("later caller mutation");
  assert.equal((await verify(f.input)).outcome, "satisfied");
  f.selected.sourceInputs.files = ["tests/packed-consumer.test.ts"];
  assert.throws(() => decodeAdmissionEvidencePolicy(f.policy), /trusted workflow/u);
});

test("source inventory is order independent but preserves filenames, contents and closed membership", () => {
  const f = fixture();
  assert.equal(digestSourceInputs([...f.state.inputs].reverse()), digestSourceInputs(f.state.inputs));
  assert.throws(() => digestSourceInputs([...f.state.inputs, ...f.state.inputs]), /duplicate/u);
  assert.throws(() => digestSourceInputs([{ path: "../outside", sha256: sha256("x") }]), /E-PATH/u);
});
