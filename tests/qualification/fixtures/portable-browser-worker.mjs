import { handlePortableWorkerFrame } from "../portable-protocol.mjs";

self.onmessage = event => {
  try {
    self.postMessage({
      ok: true,
      frame: handlePortableWorkerFrame(event.data, {
        authorityScope: "tenant:test/project:test",
        extensionInstanceId: "extension-instance-1",
        graphGeneration: 1,
        moduleActivationGeneration: 7,
        hostIncarnation: "host-incarnation-1",
        authenticatedPeerId: "product-host",
        localSenderId: "extension-host",
        audience: "extension-host",
        now: Date.now(),
      }),
    });
  } catch (error) {
    self.postMessage({ ok: false, error: error instanceof Error ? error.message : String(error) });
  }
};
