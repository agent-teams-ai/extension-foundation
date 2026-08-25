import {
  decodeLengthPrefixedFrame,
  encodeLengthPrefixedFrame,
  handlePortableWorkerFrame,
  maxFrameBytes,
  protocolName,
} from "../portable-protocol.mjs";

const authority = Object.freeze({
  authorityScope: "tenant:test/project:test",
  extensionInstanceId: "extension-instance-1",
  graphGeneration: 1,
  moduleActivationGeneration: 7,
  hostIncarnation: "host-incarnation-1",
  authenticatedPeerId: "product-host",
  localSenderId: "extension-host",
  audience: "extension-host",
});

let buffer = Buffer.alloc(0);
let stopped = false;
process.stdin.on("data", chunk => {
  if (stopped) return;
  buffer = Buffer.concat([buffer, chunk]);
  for (;;) {
    if (buffer.byteLength < 4) return;
    const length = buffer.readUInt32BE(0);
    if (length > maxFrameBytes) throw new Error("FRAME_TOO_LARGE");
    if (buffer.byteLength < length + 4) return;
    const packet = buffer.subarray(0, length + 4);
    buffer = buffer.subarray(length + 4);
    if (!handleFrame(decodeLengthPrefixedFrame(packet))) {
      buffer = Buffer.alloc(0);
      return;
    }
  }
});
process.stdin.on("end", () => {
  if (!stopped && buffer.byteLength > 0) {
    process.stderr.write("TRUNCATED_FRAME_AT_EOF\n");
    process.exitCode = 1;
  }
});

function send(frame) {
  process.stdout.write(encodeLengthPrefixedFrame(frame));
}

function handleFrame(frame) {
  const response = handlePortableWorkerFrame(frame, { ...authority, now: Date.now() });
  if (frame.kind === "hello") {
    send({ ...response, kind: "result", payload: { negotiatedProtocol: protocolName } });
  } else if (frame.kind === "prepare") {
    send({ ...response, kind: "ready", payload: { ready: true } });
  } else if (frame.kind === "drain") {
    send({ ...response, kind: "result", payload: { drained: true } });
  } else if (frame.kind === "stop") {
    send({ ...response, kind: "result", payload: { stopped: true } });
    stopped = true;
    process.exitCode = 0;
    process.stdin.pause();
    process.stdin.destroy();
    return false;
  }
  return true;
}
