import { parentPort, workerData } from "node:worker_threads";

import { handlePortableWorkerFrame } from "../portable-protocol.mjs";

parentPort.on("message", frame => {
  try {
    parentPort.postMessage({
      ok: true,
      frame: handlePortableWorkerFrame(frame, {
        authorityScope: workerData.authorityScope,
        extensionInstanceId: workerData.extensionInstanceId,
        graphGeneration: workerData.graphGeneration,
        moduleActivationGeneration: workerData.moduleActivationGeneration,
        hostIncarnation: workerData.hostIncarnation,
        authenticatedPeerId: workerData.authenticatedPeerId,
        localSenderId: workerData.localSenderId,
        audience: workerData.audience,
        now: Date.now(),
      }),
    });
  } catch (error) {
    parentPort.postMessage({ ok: false, error: error instanceof Error ? error.message : String(error) });
  }
});
