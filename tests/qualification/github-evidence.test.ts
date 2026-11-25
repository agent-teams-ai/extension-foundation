import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import test from "node:test";

import {
  admissionVerificationReceiptMatches,
  packageAdmissionVerificationRequest,
} from "../../architecture/checks/package-policy.mjs";
import {
  EvidenceRefusal,
  observeEvidence,
  refusalCode,
  sha256,
  type ProviderEvidence,
  type Witness,
} from "./github-evidence.ts";
import { retrieveEvidence } from "./github-evidence-http.ts";

// Controlled transport data is deliberately not a genuine provider observation.
const encode = (text: string): Uint8Array<ArrayBuffer> => new TextEncoder().encode(text);
const digest = (bytes: Uint8Array): string => createHash("sha256").update(bytes).digest("hex");
const sourceRevision = "a".repeat(40);
const workflow = encode("\uFEFFname: Controlled research\n");
const log = encode("\uFEFFcheckout " + sourceRevision + "\nqualification 239/239\n");
const witness: Witness = {
  repository: "research/evidence",
  repositoryId: 101,
  sourceRevision,
  runId: 301,
  attempt: 1,
  workflowId: 201,
  workflowPath: ".github/workflows/ci.yml",
  jobId: 401,
  jobName: "check",
  checkoutStep: "Run actions/checkout@controlled-pin",
  checkStep: "Run pnpm check",
  workflowSha256: digest(workflow),
  logSha256: digest(log),
  logMarkers: ["checkout " + sourceRevision, "qualification 239/239"],
};
const request = packageAdmissionVerificationRequest(
  { id: "research.provider" },
  { package_id: "research.provider", semantic_classification: "ordinary-library" },
  "sha256:" + "b".repeat(64),
);

function fixture() {
  const repository = { id: 101, full_name: "research/evidence", fork: false };
  const success = { status: "completed", conclusion: "success" };
  return {
    repository,
    run: {
      id: 301, run_attempt: 1, head_sha: sourceRevision, workflow_id: 201,
      path: ".github/workflows/ci.yml", event: "push", ...success,
      repository: { ...repository }, head_repository: { ...repository },
    },
    jobs: {
      total_count: 1,
      jobs: [{
        id: 401, name: "check", run_id: 301, run_attempt: 1,
        head_sha: sourceRevision, ...success,
        steps: [
          { name: witness.checkoutStep, number: 2, ...success },
          { name: witness.checkStep, number: 6, ...success },
        ],
      }],
    },
    workflow: workflow.slice(),
    log: log.slice(),
  };
}

async function refuses(action: () => unknown, code?: string): Promise<void> {
  await assert.rejects(async () => await action(), (error: unknown) => {
    assert.ok(error instanceof EvidenceRefusal);
    if (code !== undefined) assert.equal(refusalCode(error), code);
    assert.doesNotMatch(String(error), /TOKEN_SENTINEL|REDIRECT_SENTINEL|PRIVATE_BODY/);
    return true;
  });
}

test("controlled valid evidence preserves request custody but cannot satisfy admission", () => {
  const result = observeEvidence(request, witness, fixture());
  assert.equal(result.kind, "github-provider-observation/v1");
  assert.equal(result.outcome, "observed");
  assert.deepEqual(result.request, request);
  assert.equal(admissionVerificationReceiptMatches(request, result), false);
  assert.equal(sha256(workflow), digest(workflow));
  assert.equal(sha256(log), digest(log));
});

test("lineage refusals preserve valid byte hashes and allow a later valid observation", async () => {
  const cases: [string, (value: ReturnType<typeof fixture>) => void, string][] = [
    ["provider repository ID", (v) => { v.repository.id = 102; }, "repository"],
    ["repository alias", (v) => { v.repository.full_name += ".git"; }, "repository"],
    ["fork", (v) => { v.repository.fork = true; }, "repository"],
    ["run ID", (v) => { v.run.id = 302; }, "run"],
    ["run attempt", (v) => { v.run.run_attempt = 2; }, "run"],
    ["run source", (v) => { v.run.head_sha = "c".repeat(40); }, "run"],
    ["run workflow", (v) => { v.run.workflow_id = 202; }, "run"],
    ["workflow path", (v) => { v.run.path = ".github/workflows/other.yml"; }, "run"],
    ["event", (v) => { v.run.event = "pull_request"; }, "run"],
    ["unfinished run", (v) => { v.run.status = "in_progress"; }, "run"],
    ["failed run", (v) => { v.run.conclusion = "failure"; }, "run"],
    ["job count", (v) => { v.jobs.total_count = 2; }, "jobs"],
    ["missing job", (v) => { v.jobs.jobs[0]!.id = 402; }, "job"],
    ["job name", (v) => { v.jobs.jobs[0]!.name = "unrelated"; }, "job"],
    ["job run", (v) => { v.jobs.jobs[0]!.run_id = 302; }, "job"],
    ["job attempt", (v) => { v.jobs.jobs[0]!.run_attempt = 2; }, "job"],
    ["job source", (v) => { v.jobs.jobs[0]!.head_sha = "c".repeat(40); }, "job"],
    ["failed job", (v) => { v.jobs.jobs[0]!.conclusion = "failure"; }, "job"],
    ["skipped check", (v) => { v.jobs.jobs[0]!.steps[1]!.conclusion = "skipped"; }, "steps"],
    ["unfinished checkout", (v) => { v.jobs.jobs[0]!.steps[0]!.status = "queued"; }, "steps"],
    ["duplicate step", (v) => { v.jobs.jobs[0]!.steps.push({ ...v.jobs.jobs[0]!.steps[1]! }); }, "steps"],
  ];
  for (const [name, mutate, code] of cases) {
    const value = fixture();
    mutate(value);
    assert.equal(digest(value.workflow), witness.workflowSha256, name);
    assert.equal(digest(value.log), witness.logSha256, name);
    await refuses(() => observeEvidence(request, witness, value), code);
    assert.equal(observeEvidence(request, witness, fixture()).outcome, "observed", name);
  }
  for (const subject of ["repository", "head_repository"] as const) {
    const value = fixture();
    value.run[subject].id = 102;
    await refuses(() => observeEvidence(request, witness, value));
  }
  const duplicate = fixture();
  duplicate.jobs.jobs.push(structuredClone(duplicate.jobs.jobs[0]!));
  duplicate.jobs.total_count = 2;
  await refuses(() => observeEvidence(request, witness, duplicate), "jobs");
  duplicate.jobs.jobs[1]!.id = 402;
  await refuses(() => observeEvidence(request, witness, duplicate), "job");
});

test("original BOM and newline bytes are required; markers cannot replace byte custody", async () => {
  const alteredWorkflow = fixture();
  alteredWorkflow.workflow = workflow.slice(3);
  await refuses(() => observeEvidence(request, witness, alteredWorkflow), "workflow-bytes");
  for (const changed of [log.slice(3), encode(new TextDecoder().decode(log).replaceAll("\n", "\r\n"))]) {
    const value = fixture();
    value.log = changed;
    await refuses(() => observeEvidence(request, witness, value), "log-bytes");
  }
  await refuses(
    () => observeEvidence(request, { ...witness, logMarkers: ["absent independent marker"] }, fixture()),
    "log-markers",
  );
});

const token = "TOKEN_SENTINEL";
const api = "https://api.github.com/repos/research/evidence";
const runUrl = api + "/actions/runs/301/attempts/1";
const jobsUrl = runUrl + "/jobs?per_page=50";
const workflowUrl = api + "/contents/.github/workflows/ci.yml?ref=" + sourceRevision;
const logsUrl = api + "/actions/jobs/401/logs";
const blobUrl = "https://logstorage.blob.core.windows.net/container/log?sig=REDIRECT_SENTINEL";
type RecordedRequest = {
  url: string; headers: Headers; credentials: RequestCredentials | undefined;
  redirect: RequestRedirect | undefined;
};
type Intercept = (url: string) => Response | undefined;

function transport(intercept?: Intercept) {
  const requests: RecordedRequest[] = [];
  const fetcher: typeof globalThis.fetch = async (input, init) => {
    const url = input instanceof Request ? input.url : String(input);
    const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined));
    requests.push({ url, headers, credentials: init?.credentials, redirect: init?.redirect });
    const override = intercept?.(url);
    if (override !== undefined) return override;
    const data = fixture();
    if (url === api) return Response.json(data.repository);
    if (url === runUrl) return Response.json(data.run);
    if (url === jobsUrl) return Response.json(data.jobs);
    if (url === workflowUrl) return new Response(new Uint8Array(data.workflow));
    if (url === logsUrl) return new Response(null, { status: 302, headers: { location: blobUrl } });
    if (url === blobUrl) return new Response(new Uint8Array(data.log));
    throw new Error("Unexpected controlled endpoint");
  };
  return { fetcher, requests };
}

test("HTTP retrieval confines the token and follows only the API-issued log redirect", async () => {
  const controlled = transport();
  const value = await retrieveEvidence(witness, { token, fetch: controlled.fetcher });
  assert.equal(observeEvidence(request, witness, value).outcome, "observed");
  assert.deepEqual(controlled.requests.map((r) => r.url).sort(),
    [api, runUrl, jobsUrl, workflowUrl, logsUrl, blobUrl].sort());
  for (const call of controlled.requests) {
    assert.equal(call.credentials, "omit");
    assert.equal(call.redirect, "manual");
    assert.equal(call.headers.get("cookie"), null);
    assert.equal(call.headers.get("authorization"), call.url === blobUrl ? null : "Bearer " + token);
  }
  assert.deepEqual(value.log, log);
  assert.doesNotMatch(JSON.stringify(observeEvidence(request, witness, value)),
    /TOKEN_SENTINEL|REDIRECT_SENTINEL/);
});

test("redirect, pagination and provider failures refuse without disclosing private material", async () => {
  const invalidLocations = [
    "https://logstorage.blob.core.windows.net.attacker.example/log",
    "https://attackerblob.core.windows.net/log",
    "http://logstorage.blob.core.windows.net/log",
    "https://user:password@logstorage.blob.core.windows.net/log",
    "https://logstorage.blob.core.windows.net:444/log",
    "https://logstorage.blob.core.windows.net/log#fragment",
    "file:///tmp/log",
  ];
  for (const location of invalidLocations) {
    const controlled = transport((url) => url === logsUrl
      ? new Response(null, { status: 302, headers: { location } }) : undefined);
    await refuses(() => retrieveEvidence(witness, { token, fetch: controlled.fetcher }), "redirect");
    assert.equal(controlled.requests.some((r) => r.url === location), false);
  }
  const cases: [string, () => Response, string | undefined][] = [
    [api, () => new Response(null, { status: 302, headers: { location: blobUrl } }), "redirect"],
    [blobUrl, () => new Response(null, { status: 302, headers: { location: blobUrl } }), "redirect"],
    [jobsUrl, () => Response.json(fixture().jobs, { headers: { link: '<https://example.test>; rel="next"' } }), "jobs"],
    [api, () => Response.json(fixture().repository, { headers: { "set-cookie": "PRIVATE_BODY" } }), "http"],
    [api, () => new Response("PRIVATE_BODY TOKEN_SENTINEL", { status: 403 }), undefined],
    [api, () => new Response("PRIVATE_BODY TOKEN_SENTINEL"), "malformed"],
  ];
  for (const [url, response, code] of cases) {
    const controlled = transport((current) => current === url ? response() : undefined);
    await refuses(() => retrieveEvidence(witness, { token, fetch: controlled.fetcher }), code);
  }
  const unavailable: typeof globalThis.fetch = async () => {
    throw new Error("PRIVATE_BODY TOKEN_SENTINEL REDIRECT_SENTINEL");
  };
  await refuses(() => retrieveEvidence(witness, { token, fetch: unavailable }));
  assert.doesNotMatch(String(refusalCode(new Error("TOKEN_SENTINEL"))), /TOKEN_SENTINEL/);
  const restored = transport();
  assert.equal(observeEvidence(request, witness,
    await retrieveEvidence(witness, { token, fetch: restored.fetcher })).outcome, "observed");
});

test("body limits count actual streamed bytes despite absent or dishonest length", async () => {
  for (const headers of [{}, { "content-length": "1" }] as HeadersInit[]) {
    const controlled = transport((url) => url === api
      ? new Response(new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(new Uint8Array(128 * 1024));
          controller.enqueue(new Uint8Array(128 * 1024 + 1));
          controller.close();
        },
      }), { headers }) : undefined);
    await refuses(() => retrieveEvidence(witness, { token, fetch: controlled.fetcher }), "size");
  }
  const largeLog = transport((url) => url === blobUrl
    ? new Response(new Uint8Array(1024 * 1024 + 1)) : undefined);
  await refuses(() => retrieveEvidence(witness, { token, fetch: largeLog.fetcher }), "size");
});

test("refusal is not held by a stream whose cancellation never settles", { timeout: 2000 }, async () => {
  let cancellationStarted = false;
  const controlled = transport((url) => url === api
    ? new Response(new ReadableStream<Uint8Array>({
      start(controller) { controller.enqueue(new Uint8Array(256 * 1024 + 1)); },
      cancel() {
        cancellationStarted = true;
        return new Promise<void>(() => {});
      },
    })) : undefined);
  await refuses(() => retrieveEvidence(witness, {
    token, fetch: controlled.fetcher, deadlineMs: 100,
  }), "size");
  assert.equal(cancellationStarted, true);
});

test("one deadline includes a stalled response body and releases its reader", { timeout: 3000 }, async () => {
  let cancelled = false;
  const controlled = transport((url) => url === blobUrl
    ? new Response(new ReadableStream<Uint8Array>({
      start(controller) { controller.enqueue(encode("partial")); },
      cancel() { cancelled = true; },
    })) : undefined);
  await refuses(() => retrieveEvidence(witness, {
    token, fetch: controlled.fetcher, deadlineMs: 30,
  }), "deadline");
  assert.equal(cancelled, true);
  const restored = transport();
  assert.equal(observeEvidence(request, witness,
    await retrieveEvidence(witness, { token, fetch: restored.fetcher })).outcome, "observed");
});

test("independent attempt oracle catches an actual weakened lineage comparison", async () => {
  const original = await readFile(new URL("./github-evidence.ts", import.meta.url), "utf8");
  const requiredLine = '  same(job.run_attempt, witness.attempt, "job");';
  assert.equal(original.split(requiredLine).length, 2, "mutant must remove exactly one real check");
  const directory = await mkdtemp(join(tmpdir(), "ef-evidence-mutant-"));
  try {
    const path = join(directory, "github-evidence-mutant.ts");
    await writeFile(path, original.replace(requiredLine, ""), "utf8");
    const mutant = await import(pathToFileURL(path).href) as { observeEvidence: typeof observeEvidence };
    const foreignAttempt: ProviderEvidence = fixture();
    (foreignAttempt.jobs as ReturnType<typeof fixture>["jobs"]).jobs[0]!.run_attempt = 2;
    await refuses(() => observeEvidence(request, witness, foreignAttempt), "job");
    const result = mutant.observeEvidence(request, witness, foreignAttempt);
    assert.equal(result.outcome, "observed", "mutant must reach its incorrect acceptance");
    const independentOracle = (outcome: string): void => {
      assert.notEqual(outcome, "observed", "attempt 2 cannot establish the attempt 1 observation");
    };
    assert.throws(() => independentOracle(result.outcome), /attempt 2 cannot establish/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
