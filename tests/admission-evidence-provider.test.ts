import assert from "node:assert/strict";
import { test } from "node:test";
import { createGitHubEvidenceProvider } from "../architecture/checks/admission-evidence/index.ts";
import type { EvidenceHttpRequest, EvidenceHttpTransport } from "../architecture/checks/admission-evidence/index.ts";

const repository = "agent-teams-ai/extension-foundation";
const token = "unit-test-provider-token-not-a-real-credential";
const logUrl = "https://productionresultstest.blob.core.windows.net/logs/proof.txt?sig=fixture-signed-url";

test("online adapter authenticates API metadata and downloads exact step bytes without forwarding credentials", async () => {
  const calls: { url: URL; request: EvidenceHttpRequest }[] = [];
  const transport: EvidenceHttpTransport = async (url, request) => {
    calls.push({ url, request });
    if (url.hostname === "api.github.com" && url.pathname.endsWith("/logs")) {
      return new Response(null, { status: 302, headers: { location: logUrl } });
    }
    if (url.hostname.endsWith(".blob.core.windows.net")) return new Response("exact log bytes\n");
    if (url.pathname.includes("/contents/")) return new Response("name: conformance\n");
    return Response.json({ id: 1333298097 });
  };
  const provider = createGitHubEvidenceProvider({ token, transport });
  assert.deepEqual(await provider.getRepository(repository), { id: 1333298097 });
  assert.equal(new TextDecoder().decode(await provider.getStepLogs(repository, 301, 4)), "exact log bytes\n");
  assert.equal(new TextDecoder().decode(await provider.getWorkflow(repository, "a".repeat(40), ".github/workflows/package-conformance.yml")), "name: conformance\n");
  assert.equal(calls.length, 4);
  for (const call of calls) {
    assert.equal(call.request.redirect, "manual");
    assert.ok(call.request.signal instanceof AbortSignal);
    if (call.url.hostname === "api.github.com") assert.equal(call.request.headers["Authorization"], `Bearer ${token}`);
    else {
      assert.equal(call.request.headers["Authorization"], undefined);
      assert.equal(call.request.headers["X-GitHub-Api-Version"], undefined);
    }
  }
  assert.equal(calls[1]?.url.pathname, `/repos/${repository}/actions/jobs/301/steps/4/logs`);
  assert.equal(calls[3]?.url.searchParams.get("ref"), "a".repeat(40));
});

test("repository rename redirects fail instead of changing authority or following aliases", async () => {
  let calls = 0;
  const provider = createGitHubEvidenceProvider({ token, transport: async () => {
    calls += 1;
    return new Response(null, { status: 301, headers: { location: "https://api.github.com/repos/other/alias" } });
  } });
  await assert.rejects(() => provider.getRepository(repository), /E-PROVIDER/u);
  assert.equal(calls, 1);
});

test("collector requests exactly the selected run attempt with a bounded complete job page", async () => {
  const urls: URL[] = [];
  const provider = createGitHubEvidenceProvider({ token, transport: async url => {
    urls.push(url);
    return Response.json({ total_count: 2, jobs: [] });
  } });
  assert.deepEqual(await provider.getRunAttemptJobs(repository, 107, 2), { total_count: 2, jobs: [] });
  assert.equal(urls.length, 1);
  assert.equal(urls[0]?.pathname, `/repos/${repository}/actions/runs/107/attempts/2/jobs`);
  assert.equal(urls[0]?.search, "?per_page=100");
  await assert.rejects(() => provider.getRunAttemptJobs(repository, 107, 0), /positive/u);
  assert.equal(urls.length, 1);
});

test("step log redirects cannot reach local services, credentialed URLs or arbitrary hosts", async () => {
  for (const location of [
    "http://productionresultstest.blob.core.windows.net/log", "https://127.0.0.1/log",
    "https://productionresultstest.blob.core.windows.net.evil.example/log",
    "https://api.github.com/repos/other/private", "https://user:secret@productionresultstest.blob.core.windows.net/log",
    "https://productionresultstest.blob.core.windows.net:8443/log", "https://evil.example/log",
    "file:///tmp/log", "https://productionresultstest.blob.core.windows.net/log#fragment",
  ]) {
    let calls = 0;
    const provider = createGitHubEvidenceProvider({ token, transport: async () => {
      calls += 1; return new Response(null, { status: 302, headers: { location } });
    } });
    await assert.rejects(() => provider.getStepLogs(repository, 301, 4), /E-REDIRECT/u);
    assert.equal(calls, 1, location);
  }
});

test("a second storage redirect and expired logs fail with no weaker full-job route", async () => {
  for (const status of [302, 403, 404, 410, 500]) {
    const paths: string[] = [];
    const provider = createGitHubEvidenceProvider({ token, transport: async url => {
      paths.push(url.pathname);
      return paths.length === 1
        ? new Response(null, { status: 302, headers: { location: logUrl } })
        : new Response(null, { status, headers: { location: "https://evil.example/log" } });
    } });
    await assert.rejects(() => provider.getStepLogs(repository, 301, 4), /E-PROVIDER/u);
    assert.equal(paths.length, 2);
    assert.ok(paths[0]?.includes("/steps/4/logs"));
  }
});

test("malformed metadata and oversized bodies refuse before caller interpretation", async () => {
  const malformed = createGitHubEvidenceProvider({ token, transport: async () => new Response("not json") });
  await assert.rejects(() => malformed.getRepository(repository), /UTF-8 JSON/u);
  for (const contentLength of ["1048577", "not-a-length"]) {
    const provider = createGitHubEvidenceProvider({ token, transport: async () => new Response("{}", { headers: { "content-length": contentLength } }) });
    await assert.rejects(() => provider.getRepository(repository), /E-SIZE/u);
  }
  let cancelled = false;
  const provider = createGitHubEvidenceProvider({ token, transport: async () => new Response(new ReadableStream<Uint8Array>({
    start(controller) { controller.enqueue(new Uint8Array(1024 * 1024 + 1)); },
    cancel() { cancelled = true; },
  })) });
  await assert.rejects(() => provider.getRepository(repository), /E-SIZE/u);
  assert.equal(cancelled, true);
});

test("network error details and signed URLs never enter diagnostic messages", async () => {
  const provider = createGitHubEvidenceProvider({ token, transport: async () => { throw new Error(`Authorization: ${token}; ${logUrl}`); } });
  await assert.rejects(() => provider.getRepository(repository), error => {
    assert.ok(error instanceof Error);
    assert.match(error.message, /E-PROVIDER/u);
    assert.equal(error.message.includes(token), false);
    assert.equal(error.message.includes("sig="), false);
    return true;
  });
});

test("only canonical exact provider coordinates reach transport", async () => {
  let calls = 0;
  const provider = createGitHubEvidenceProvider({ token, transport: async () => { calls += 1; return Response.json({}); } });
  await assert.rejects(() => provider.getJob("agent-teams-ai/extension-foundation?x=1", 1), /E-SCHEMA/u);
  await assert.rejects(() => provider.getRunAttempt(repository, 1, 0), /positive/u);
  await assert.rejects(() => provider.getWorkflow(repository, "main", ".github/workflows/ci.yml"), /exact commit/u);
  await assert.rejects(() => provider.getWorkflow(repository, "a".repeat(40), "../private"), /E-PATH/u);
  assert.equal(calls, 0);
  assert.throws(() => createGitHubEvidenceProvider({ token: "" }), /E-CREDENTIAL/u);
});
