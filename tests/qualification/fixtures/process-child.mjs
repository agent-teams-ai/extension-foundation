import {
  decodeLengthPrefixedFrame,
  encodeLengthPrefixedFrame,
  maxFrameBytes,
  protocolName,
} from "../portable-protocol.mjs";

let buffer = Buffer.alloc(0);
process.stdin.on("data", chunk => {
  buffer = Buffer.concat([buffer, chunk]);
  for (;;) {
    if (buffer.byteLength < 4) return;
    const length = buffer.readUInt32BE(0);
    if (length > maxFrameBytes) throw new Error("FRAME_TOO_LARGE");
    if (buffer.byteLength < length + 4) return;
    const packet = buffer.subarray(0, length + 4);
    buffer = buffer.subarray(length + 4);
    handleFrame(decodeLengthPrefixedFrame(packet));
  }
});

function send(frame) {
  process.stdout.write(encodeLengthPrefixedFrame(frame));
}

function handleFrame(frame) {
  if (frame.kind === "hello") {
    send({ ...frame, kind: "result", payload: { negotiatedProtocol: protocolName } });
  } else if (frame.kind === "prepare") {
    send({ ...frame, kind: "ready", payload: { ready: true } });
  } else if (frame.kind === "stop") {
    send({ ...frame, kind: "result", payload: { stopped: true } });
    process.exitCode = 0;
    process.stdin.destroy();
  }
}
