export interface ProtocolEnvelope {
  readonly protocol: "agent-teams.extension-host/v1";
  readonly requestId: string;
  readonly operationId: string;
  readonly graphGeneration: number;
  readonly runtimeGeneration: number;
  readonly absoluteDeadline: number;
  readonly kind: "hello" | "prepare" | "ready" | "drain" | "stop" | "result";
  readonly payload: Readonly<Record<string, unknown>>;
}

const envelopeKeys = new Set([
  "protocol",
  "requestId",
  "operationId",
  "graphGeneration",
  "runtimeGeneration",
  "absoluteDeadline",
  "kind",
  "payload",
]);

export function validateEnvelope(value: unknown): ProtocolEnvelope {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("INVALID_FRAME");
  const frame = value as Record<string, unknown>;
  if (Object.keys(frame).some(key => !envelopeKeys.has(key))) throw new Error("UNKNOWN_FIELD");
  if (frame.protocol !== "agent-teams.extension-host/v1") throw new Error("UNSUPPORTED_PROTOCOL");
  for (const key of ["requestId", "operationId"] as const) {
    if (typeof frame[key] !== "string" || frame[key].length === 0 || frame[key].length > 128) {
      throw new Error(`INVALID_${key.toUpperCase()}`);
    }
  }
  for (const key of ["graphGeneration", "runtimeGeneration", "absoluteDeadline"] as const) {
    if (!Number.isSafeInteger(frame[key]) || (frame[key] as number) < 0) throw new Error(`INVALID_${key.toUpperCase()}`);
  }
  const kinds = new Set(["hello", "prepare", "ready", "drain", "stop", "result"]);
  if (!kinds.has(String(frame.kind))) throw new Error("INVALID_KIND");
  if (!frame.payload || typeof frame.payload !== "object" || Array.isArray(frame.payload)) throw new Error("INVALID_PAYLOAD");
  let serialized: string;
  try {
    serialized = JSON.stringify(frame);
  } catch {
    throw new Error("INVALID_PAYLOAD");
  }
  const bytes = new TextEncoder().encode(serialized).byteLength;
  if (bytes > 64 * 1024) throw new Error("FRAME_TOO_LARGE");
  return Object.freeze(frame as unknown as ProtocolEnvelope);
}

export function handlePortableWorkerFrame(
  value: unknown,
  currentGeneration: number,
  now: number,
): ProtocolEnvelope {
  const request = validateEnvelope(value);
  if (request.runtimeGeneration !== currentGeneration) throw new Error("STALE_GENERATION");
  if (now >= request.absoluteDeadline) throw new Error("DEADLINE_EXCEEDED");
  return {
    ...request,
    kind: "result",
    payload: { acceptedKind: request.kind },
  };
}
