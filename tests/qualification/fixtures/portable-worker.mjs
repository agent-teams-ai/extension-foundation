import { parentPort, workerData } from "node:worker_threads";

import { handlePortableWorkerFrame } from "../protocol-spike.ts";

parentPort.on("message", frame => {
  try {
    parentPort.postMessage({ ok: true, frame: handlePortableWorkerFrame(frame, workerData.generation, Date.now()) });
  } catch (error) {
    parentPort.postMessage({ ok: false, error: error instanceof Error ? error.message : String(error) });
  }
});
