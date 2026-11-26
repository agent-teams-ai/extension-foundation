import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { lstat, readFile } from "node:fs/promises";
import { isAbsolute } from "node:path";
import { ArtifactError, type NativeExecutable, type Sha256 } from "./contracts.ts";
import { isDigest } from "./manifest.ts";

export function sha256(bytes: Uint8Array | string): Sha256 {
  return `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
}

export async function inspectExecutable(tool: NativeExecutable, label: "oras" | "cosign", timeout: number): Promise<void> {
  if (!isAbsolute(tool.path) || !isDigest(tool.digest)) throw new ArtifactError("artifact.input", "Native tool requires an absolute path and digest");
  try {
    const info = await lstat(tool.path);
    if (!info.isFile() || info.isSymbolicLink() || sha256(await readFile(tool.path)) !== tool.digest) {
      throw new ArtifactError("artifact.tool", "Native executable identity differs from the selected tool");
    }
  } catch (error) {
    if (error instanceof ArtifactError) throw error;
    throw new ArtifactError("artifact.tool", "Selected native executable is unavailable");
  }
  const result = await command(tool.path, ["version"], timeout, 16 * 1024, "artifact.tool");
  const expected = label === "oras" ? /Version:\s+1\.4\.0(?:\s|$)/ : /GitVersion:\s+v3\.1\.6(?:\s|$)/;
  if (!expected.test(result.toString("utf8"))) throw new ArtifactError("artifact.tool", "Unsupported native tool version");
}

/** No shell, CLI passwords or tool output in public errors. */
export function command(executable: string, args: readonly string[], timeout: number, maxBytes: number,
  code: "artifact.tool" | "artifact.transport" | "artifact.signature", input?: Uint8Array): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    let inputFailed = false;
    let settled = false;
    const child = execFile(executable, [...args], { encoding: "buffer", timeout, killSignal: "SIGKILL", maxBuffer: maxBytes, windowsHide: true }, (error, stdout) => {
      settled = true;
      if (error !== null || inputFailed) reject(new ArtifactError(code, "Native artifact command did not complete successfully"));
      else resolve(stdout);
    });
    // The verifier reads captured manifest bytes from stdin, never a later path.
    // A failed write requests termination, but only the close callback settles
    // custody. Staging must never be removed while this command still runs.
    child.stdin?.on("error", () => {
      if (!settled) { inputFailed = true; child.kill("SIGKILL"); }
    });
    child.stdin?.end(input);
  });
}
