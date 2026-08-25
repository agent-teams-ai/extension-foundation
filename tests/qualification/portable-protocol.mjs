export const protocolName = "agent-teams.extension-host/v1";
export const maxFrameBytes = 64 * 1024;
const maxJsonDepth = 32;
const maxJsonNodes = 4_096;
const envelopeKeys = new Set([
  "protocol", "requestId", "operationId", "graphGeneration", "runtimeGeneration",
  "absoluteDeadline", "kind", "payload",
]);
const kinds = new Set(["hello", "prepare", "ready", "drain", "stop", "result"]);
const forbiddenKeys = new Set(["__proto__", "constructor", "prototype"]);

function normalizeJson(value, depth, budget) {
  if (depth > maxJsonDepth || budget.count++ >= maxJsonNodes) throw new Error("JSON_LIMIT_EXCEEDED");
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("INVALID_JSON_NUMBER");
    return value;
  }
  if (Array.isArray(value)) return Object.freeze(value.map(item => normalizeJson(item, depth + 1, budget)));
  if (!value || typeof value !== "object") throw new Error("INVALID_JSON_VALUE");
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) throw new Error("INVALID_JSON_OBJECT");
  if (Object.getOwnPropertySymbols(value).length > 0) throw new Error("INVALID_JSON_OBJECT");
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const output = {};
  for (const key of Object.keys(descriptors).sort()) {
    const descriptor = descriptors[key];
    if (!descriptor?.enumerable || !("value" in descriptor) || forbiddenKeys.has(key)) {
      throw new Error("INVALID_JSON_OBJECT");
    }
    Object.defineProperty(output, key, {
      value: normalizeJson(descriptor.value, depth + 1, budget),
      enumerable: true,
      configurable: false,
      writable: false,
    });
  }
  return Object.freeze(output);
}

function requireIdentifier(frame, key) {
  const value = frame[key];
  if (typeof value !== "string" || value.length === 0 || value.length > 128) {
    throw new Error(`INVALID_${key.toUpperCase()}`);
  }
}

function requireNonNegativeInteger(frame, key) {
  const value = frame[key];
  if (!Number.isSafeInteger(value) || value < 0) throw new Error(`INVALID_${key.toUpperCase()}`);
}

export function validateEnvelope(value) {
  const frame = normalizeJson(value, 0, { count: 0 });
  if (!frame || typeof frame !== "object" || Array.isArray(frame)) throw new Error("INVALID_FRAME");
  if (Object.keys(frame).some(key => !envelopeKeys.has(key)) || Object.keys(frame).length !== envelopeKeys.size) {
    throw new Error("UNKNOWN_OR_MISSING_FIELD");
  }
  if (frame.protocol !== protocolName) throw new Error("UNSUPPORTED_PROTOCOL");
  requireIdentifier(frame, "requestId");
  requireIdentifier(frame, "operationId");
  requireNonNegativeInteger(frame, "graphGeneration");
  requireNonNegativeInteger(frame, "runtimeGeneration");
  requireNonNegativeInteger(frame, "absoluteDeadline");
  if (!kinds.has(frame.kind)) throw new Error("INVALID_KIND");
  if (!frame.payload || typeof frame.payload !== "object" || Array.isArray(frame.payload)) throw new Error("INVALID_PAYLOAD");
  const bytes = new TextEncoder().encode(JSON.stringify(frame)).byteLength;
  if (bytes > maxFrameBytes) throw new Error("FRAME_TOO_LARGE");
  return frame;
}

export function handlePortableWorkerFrame(value, authority) {
  const request = validateEnvelope(value);
  if (request.graphGeneration !== authority.graphGeneration) throw new Error("STALE_GRAPH_GENERATION");
  if (request.runtimeGeneration !== authority.runtimeGeneration) throw new Error("STALE_RUNTIME_GENERATION");
  if (authority.now >= request.absoluteDeadline) throw new Error("DEADLINE_EXCEEDED");
  return validateEnvelope({ ...request, kind: "result", payload: { acceptedKind: request.kind } });
}

export function encodeLengthPrefixedFrame(value) {
  const frame = validateEnvelope(value);
  const payload = new TextEncoder().encode(JSON.stringify(frame));
  const output = new Uint8Array(payload.byteLength + 4);
  new DataView(output.buffer).setUint32(0, payload.byteLength, false);
  output.set(payload, 4);
  return output;
}

export function decodeLengthPrefixedFrame(value) {
  const bytes = value instanceof Uint8Array ? value : new Uint8Array(value);
  if (bytes.byteLength < 4) throw new Error("INCOMPLETE_FRAME");
  const length = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(0, false);
  if (length > maxFrameBytes) throw new Error("FRAME_TOO_LARGE");
  if (bytes.byteLength !== length + 4) throw new Error("FRAME_LENGTH_MISMATCH");
  let parsed;
  try {
    parsed = JSON.parse(new TextDecoder().decode(bytes.subarray(4)));
  } catch {
    throw new Error("INVALID_JSON_FRAME");
  }
  return validateEnvelope(parsed);
}
