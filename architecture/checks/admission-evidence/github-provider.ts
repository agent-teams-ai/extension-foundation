import type { GitHubEvidenceProvider } from "./contracts.ts";
import { MAX_EVIDENCE_LOG_BYTES } from "./proof.ts";
import { fail, positiveInteger, relativePath, repositoryName, sourceRevision } from "./validation.ts";

export interface EvidenceHttpRequest {
  readonly headers: Readonly<Record<string, string>>;
  readonly redirect: "manual";
  readonly signal: AbortSignal;
}

export type EvidenceHttpTransport = (url: URL, request: EvidenceHttpRequest) => Promise<Response>;

export interface GitHubProviderOptions {
  readonly token: string;
  readonly transport?: EvidenceHttpTransport;
  readonly timeoutMs?: number;
}

export interface GitHubEvidenceCollectionProvider extends GitHubEvidenceProvider {
  getRunAttemptJobs(repository: string, runId: number, attempt: number): Promise<unknown>;
}

const API_ORIGIN = "https://api.github.com";
const MAX_API_BYTES = 1024 * 1024;
const MAX_WORKFLOW_BYTES = 128 * 1024;

/** GitHub's authenticated log redirect may use its Actions or Azure log storage. */
function permittedLogLocation(value: string): URL {
  let url: URL;
  try { url = new URL(value); }
  catch { return fail("E-REDIRECT", "log provider returned an invalid location"); }
  if (url.protocol !== "https:" || url.username !== "" || url.password !== "" || url.port !== "" || url.hash !== "" ||
      !(url.hostname.endsWith(".actions.githubusercontent.com") ||
        /^[a-z0-9-]+\.blob\.core\.windows\.net$/u.test(url.hostname))) {
    fail("E-REDIRECT", "log provider location is outside the supported storage route");
  }
  return url;
}

async function boundedBody(response: Response, maximum: number): Promise<Uint8Array> {
  const length = response.headers.get("content-length");
  if (length !== null && (!/^\d+$/u.test(length) || Number(length) > maximum)) {
    await response.body?.cancel();
    fail("E-SIZE", "provider body exceeds the admitted byte limit");
  }
  if (!response.body) fail("E-PROVIDER", "provider body is absent");
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const result = await reader.read();
      if (result.done) break;
      size += result.value.byteLength;
      if (size > maximum) {
        await reader.cancel();
        fail("E-SIZE", "provider body exceeds the admitted byte limit");
      }
      chunks.push(result.value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return bytes;
}

/**
 * Online-only adapter. Repository redirects are rejected; a single authenticated
 * step-log redirect is followed without forwarding provider credentials.
 * GitHub REST /actions/jobs/{id}/steps/{number}/logs supplies plain text.
 */
export function createGitHubEvidenceProvider(options: GitHubProviderOptions): GitHubEvidenceCollectionProvider {
  if (typeof options.token !== "string" || options.token.length < 1 || options.token.length > 8192 || /\s/u.test(options.token)) {
    fail("E-CREDENTIAL", "an ordinary provider token is required");
  }
  const timeoutMs = options.timeoutMs ?? 30_000;
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 60_000) fail("E-CONFIG", "invalid provider timeout");
  const transport: EvidenceHttpTransport = options.transport ?? ((url, init) => fetch(url, init));
  async function request(url: URL, authenticated: boolean, accept: string, signal: AbortSignal): Promise<Response> {
    const headers: Record<string, string> = { Accept: accept, "User-Agent": "extension-foundation-package-admission" };
    if (authenticated) {
      if (url.origin !== API_ORIGIN) fail("E-ORIGIN", "provider credentials may only reach the GitHub API");
      headers["Authorization"] = `Bearer ${options.token}`;
      headers["X-GitHub-Api-Version"] = "2026-03-10";
    }
    try { return await transport(url, { headers, redirect: "manual", signal }); }
    catch { return fail("E-PROVIDER", "authenticated evidence is unavailable or timed out"); }
  }
  async function get(path: string, accept: string, maximum: number): Promise<Uint8Array> {
    const signal = AbortSignal.timeout(timeoutMs);
    const response = await request(new URL(path, API_ORIGIN), true, accept, signal);
    if (response.status !== 200) {
      await response.body?.cancel();
      fail("E-PROVIDER", "provider evidence request did not return success");
    }
    try { return await boundedBody(response, maximum); }
    catch (error) {
      if (error instanceof Error && error.name === "AdmissionEvidenceError") throw error;
      return fail("E-PROVIDER", "provider evidence body is unavailable");
    }
  }
  async function json(path: string): Promise<unknown> {
    const bytes = await get(path, "application/vnd.github+json", MAX_API_BYTES);
    try { return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)); }
    catch { return fail("E-PROVIDER", "provider metadata is not valid UTF-8 JSON"); }
  }
  return Object.freeze({
    getRepository: async (repository: string) => json(`/repos/${repositoryName(repository)}`),
    getJob: async (repository: string, jobId: number) => json(`/repos/${repositoryName(repository)}/actions/jobs/${positiveInteger(jobId, "job identity")}`),
    getRunAttempt: async (repository: string, runId: number, attempt: number) => json(`/repos/${repositoryName(repository)}/actions/runs/${positiveInteger(runId, "run identity")}/attempts/${positiveInteger(attempt, "run attempt")}`),
    getRunAttemptJobs: async (repository: string, runId: number, attempt: number) => json(`/repos/${repositoryName(repository)}/actions/runs/${positiveInteger(runId, "run identity")}/attempts/${positiveInteger(attempt, "run attempt")}/jobs?per_page=100`),
    getWorkflow: async (repository: string, revision: string, workflowPath: string) => {
      const path = relativePath(workflowPath);
      if (!/^\.github\/workflows\/[A-Za-z0-9_-]+\.ya?ml$/u.test(path)) fail("E-PATH", "unsupported workflow location");
      return get(`/repos/${repositoryName(repository)}/contents/${path}?ref=${sourceRevision(revision)}`, "application/vnd.github.raw+json", MAX_WORKFLOW_BYTES);
    },
    getStepLogs: async (repository: string, jobId: number, stepNumber: number) => {
      const path = `/repos/${repositoryName(repository)}/actions/jobs/${positiveInteger(jobId, "job identity")}/steps/${positiveInteger(stepNumber, "step number")}/logs`;
      const signal = AbortSignal.timeout(timeoutMs);
      const response = await request(new URL(path, API_ORIGIN), true, "application/vnd.github+json", signal);
      if (response.status !== 302) {
        await response.body?.cancel();
        fail("E-PROVIDER", "the provider did not supply the qualified step-log route");
      }
      const location = response.headers.get("location");
      await response.body?.cancel();
      if (!location) fail("E-REDIRECT", "the log provider location is absent");
      const result = await request(permittedLogLocation(location), false, "text/plain", signal);
      if (result.status !== 200) {
        await result.body?.cancel();
        fail("E-PROVIDER", "the exact step log is unavailable");
      }
      try { return await boundedBody(result, MAX_EVIDENCE_LOG_BYTES); }
      catch (error) {
        if (error instanceof Error && error.name === "AdmissionEvidenceError") throw error;
        return fail("E-PROVIDER", "the exact step log is unavailable");
      }
    },
  });
}
