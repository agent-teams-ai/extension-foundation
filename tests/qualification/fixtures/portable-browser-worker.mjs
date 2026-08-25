import { handlePortableWorkerFrame } from "../portable-protocol.mjs";

self.onmessage = event => {
  try {
    self.postMessage({
      ok: true,
      frame: handlePortableWorkerFrame(event.data, { graphGeneration: 1, runtimeGeneration: 7, now: Date.now() }),
    });
  } catch (error) {
    self.postMessage({ ok: false, error: error instanceof Error ? error.message : String(error) });
  }
};
