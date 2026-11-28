import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { arch, execPath, kill, platform } from "node:process";
import test from "node:test";
import { ArtifactError } from "../src/features/verified-artifact/contracts.ts";
import { command } from "../src/features/verified-artifact/native.ts";

assert.equal(platform, "linux", "Native process custody qualification selects Linux x64");
assert.equal(arch, "x64", "Native process custody qualification selects Linux x64");

// These literal Node programs are intentional process-behavior fixtures. They
// exercise command custody and do not impersonate ORAS/Cosign qualification.
const recordPid = 'import { closeSync, writeFileSync } from "node:fs"; writeFileSync(process.argv[1], String(process.pid));';
const retainProcess = 'setInterval(() => {}, 1000);';

for (const kind of ["stdin", "timeout", "output-limit"]) {
  test(`native command ${kind} failure settles only after its process has terminated`, { timeout: 10_000 }, async context => {
    const directory = await mkdtemp(join(tmpdir(), "ef-command-test-"));
    context.after(() => rm(directory, { recursive: true, force: true }));
    const pidFile = join(directory, "pid");
    const source = recordPid + (kind === "stdin" ? "closeSync(0);" :
      kind === "timeout" ? 'process.on("SIGTERM", () => {});' : 'process.stdout.write("x".repeat(8192));') + retainProcess;
    await assert.rejects(command(execPath, ["--input-type=module", "-e", source, pidFile],
      kind === "timeout" ? 500 : 5_000, 1024, "artifact.transport", kind === "stdin" ? Buffer.alloc(1024 * 1024) : undefined),
    (error: unknown) => error instanceof ArtifactError && error.code === "artifact.transport"
      && !error.message.includes("pid") && !error.message.includes("xxxx"));
    const pid = Number(await readFile(pidFile, "utf8"));
    assert.ok(Number.isSafeInteger(pid) && pid > 0);
    assert.throws(() => kill(pid, 0), (error: unknown) => error instanceof Error && "code" in error && error.code === "ESRCH",
      "Rejected command must have physically exited before the caller can release staging");
  });
}
