import { parentPort, workerData } from "node:worker_threads";

import { handlePortableWorkerFrame } from "../portable-protocol.mjs";

parentPort.on("message", frame => {
  try {
    parentPort.postMessage({
      ok: true,
      frame: handlePortableWorkerFrame(frame, {
        graphGeneration: workerData.graphGeneration,
        runtimeGeneration: workerData.runtimeGeneration,
        now: Date.now(),
      }),
    });
  } catch (error) {
    parentPort.postMessage({ ok: false, error: error instanceof Error ? error.message : String(error) });
  }
});
