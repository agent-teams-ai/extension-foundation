let buffer = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", chunk => {
  buffer += chunk;
  for (;;) {
    const newline = buffer.indexOf("\n");
    if (newline < 0) break;
    const line = buffer.slice(0, newline);
    buffer = buffer.slice(newline + 1);
    handleLine(line);
  }
});

function handleLine(line) {
  const frame = JSON.parse(line);
  if (frame.kind === "hello") {
    process.stdout.write(`${JSON.stringify({ ...frame, kind: "result", payload: { protocol: frame.protocol } })}\n`);
  } else if (frame.kind === "prepare") {
    process.stdout.write(`${JSON.stringify({ ...frame, kind: "ready", payload: { ready: true } })}\n`);
  } else if (frame.kind === "stop") {
    process.stdout.write(`${JSON.stringify({ ...frame, kind: "result", payload: { stopped: true } })}\n`);
    process.exit(0);
  }
}
