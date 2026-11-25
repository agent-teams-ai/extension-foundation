import {
  EvidenceRefusal, refusalCode, validateWitness,
  type ProviderEvidence, type Witness,
} from "./github-evidence.ts";

const API = "https://api.github.com";
const METADATA_LIMIT = 256 * 1024;
const LOG_LIMIT = 1024 * 1024;
const TOTAL_LIMIT = 2 * 1024 * 1024;

export interface RetrievalOptions {
  readonly token: string;
  readonly fetch?: typeof globalThis.fetch;
  readonly deadlineMs?: number;
}

export async function retrieveEvidence(
  witness: Witness,
  options: RetrievalOptions,
): Promise<ProviderEvidence> {
  validateWitness(witness);
  const deadlineMs = options.deadlineMs ?? 20_000;
  if (!Number.isSafeInteger(deadlineMs) || deadlineMs <= 0 || deadlineMs > 60_000 ||
      typeof options.token !== "string" || options.token.length === 0 ||
      /[\r\n]/.test(options.token)) {
    throw new EvidenceRefusal("input");
  }
  const fetcher = options.fetch ?? globalThis.fetch;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), deadlineMs);
  let remaining = TOTAL_LIMIT;
  const base = API + "/repos/" + witness.repository;
  const run = base + "/actions/runs/" + witness.runId + "/attempts/" + witness.attempt;

  async function discard(response: Response): Promise<void> {
    await response.body?.cancel().catch(() => undefined);
  }

  async function request(url: string, authenticated: boolean, raw = false): Promise<Response> {
    const headers: Record<string, string> = authenticated ? {
      Accept: raw ? "application/vnd.github.raw+json" : "application/vnd.github+json",
      Authorization: "Bearer " + options.token,
      "X-GitHub-Api-Version": "2022-11-28",
    } : {};
    const response = await fetcher(url, {
      method: "GET", headers, redirect: "manual", credentials: "omit", signal: controller.signal,
    });
    if (response.redirected || response.headers.has("set-cookie")) {
      await discard(response);
      throw new EvidenceRefusal(response.redirected ? "redirect" : "http");
    }
    return response;
  }

  async function bytes(response: Response, limit: number): Promise<Uint8Array> {
    const declared = response.headers.get("content-length");
    if (declared !== null && (!/^\d+$/.test(declared) || Number(declared) > Math.min(limit, remaining))) {
      await discard(response);
      throw new EvidenceRefusal("size");
    }
    if (response.body === null) throw new EvidenceRefusal("malformed");
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let count = 0;
    const abort = (): void => { void reader.cancel().catch(() => undefined); };
    controller.signal.addEventListener("abort", abort, { once: true });
    try {
      for (;;) {
        if (controller.signal.aborted) throw new EvidenceRefusal("deadline");
        const chunk = await reader.read();
        if (controller.signal.aborted) throw new EvidenceRefusal("deadline");
        if (chunk.done) break;
        count += chunk.value.byteLength;
        remaining -= chunk.value.byteLength;
        if (count > limit || remaining < 0) throw new EvidenceRefusal("size");
        chunks.push(chunk.value);
      }
      const result = new Uint8Array(count);
      let offset = 0;
      for (const chunk of chunks) {
        result.set(chunk, offset);
        offset += chunk.byteLength;
      }
      return result;
    } finally {
      controller.signal.removeEventListener("abort", abort);
      await reader.cancel().catch(() => undefined);
      reader.releaseLock();
    }
  }

  async function ordinary(url: string, raw = false): Promise<Response> {
    const response = await request(url, true, raw);
    if (response.status !== 200 || response.headers.has("link")) {
      await discard(response);
      throw new EvidenceRefusal(response.status >= 300 && response.status < 400 ? "redirect" :
        response.headers.has("link") ? "jobs" : "http");
    }
    return response;
  }

  async function json(url: string): Promise<unknown> {
    const data = await bytes(await ordinary(url), METADATA_LIMIT);
    try {
      return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(data));
    } catch {
      throw new EvidenceRefusal("malformed");
    }
  }

  async function logBytes(): Promise<Uint8Array> {
    const response = await request(base + "/actions/jobs/" + witness.jobId + "/logs", true);
    if (response.status !== 302) {
      await discard(response);
      throw new EvidenceRefusal(response.status >= 300 && response.status < 400 ? "redirect" : "http");
    }
    const location = response.headers.get("location");
    await discard(response);
    let url: URL;
    try {
      if (location === null) throw new Error("missing");
      url = new URL(location);
    } catch {
      throw new EvidenceRefusal("redirect");
    }
    if (url.protocol !== "https:" || url.username !== "" || url.password !== "" ||
        url.port !== "" || url.hash !== "" ||
        !/^[a-z0-9]{3,24}\.blob\.core\.windows\.net$/.test(url.hostname)) {
      throw new EvidenceRefusal("redirect");
    }
    const download = await request(url.href, false);
    if (download.status !== 200) {
      await discard(download);
      throw new EvidenceRefusal(download.status >= 300 && download.status < 400 ? "redirect" : "http");
    }
    return bytes(download, LOG_LIMIT);
  }

  try {
    const repository = await json(base);
    const attempt = await json(run);
    const jobs = await json(run + "/jobs?per_page=50");
    const workflow = await bytes(await ordinary(
      base + "/contents/" + witness.workflowPath + "?ref=" + witness.sourceRevision, true,
    ), METADATA_LIMIT);
    const log = await logBytes();
    if (controller.signal.aborted) throw new EvidenceRefusal("deadline");
    return { repository, run: attempt, jobs, workflow, log };
  } catch (error) {
    throw new EvidenceRefusal(controller.signal.aborted ? "deadline" : refusalCode(error));
  } finally {
    clearTimeout(timer);
    controller.abort();
  }
}
