export const protocolName = "agent-teams.extension-host/v1";
export const maxFrameBytes = 64 * 1024;
const maxJsonDepth = 32;
const maxJsonNodes = 4_096;
const envelopeKeys = new Set([
  "protocol", "requestId", "operationId", "authorityScope", "extensionInstanceId",
  "graphGeneration", "moduleActivationGeneration", "hostIncarnation", "senderId",
  "audience", "absoluteDeadline", "kind", "payload",
]);
const kinds = new Set(["hello", "prepare", "ready", "drain", "stop", "result"]);
const forbiddenKeys = new Set(["__proto__", "constructor", "prototype"]);

function normalizeJson(value, depth, budget) {
  if (depth > maxJsonDepth || budget.count++ >= maxJsonNodes) throw new Error("JSON_LIMIT_EXCEEDED");
  if (value === null || typeof value === "boolean") return value;
  if (typeof value === "string") {
    if (!isWellFormedUnicode(value)) throw new Error("INVALID_UNICODE_STRING");
    return value;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value) || Object.is(value, -0)) throw new Error("INVALID_JSON_NUMBER");
    return value;
  }
  if (Array.isArray(value)) {
    if (Object.getPrototypeOf(value) !== Array.prototype || Object.getOwnPropertySymbols(value).length > 0) {
      throw new Error("INVALID_JSON_ARRAY");
    }
    const descriptors = Object.getOwnPropertyDescriptors(value);
    const keys = Object.keys(descriptors).filter(key => key !== "length");
    if (keys.length !== value.length) throw new Error("INVALID_JSON_ARRAY");
    const output = [];
    for (let index = 0; index < value.length; index += 1) {
      const descriptor = descriptors[String(index)];
      if (!descriptor?.enumerable || !("value" in descriptor)) throw new Error("INVALID_JSON_ARRAY");
      output.push(normalizeJson(descriptor.value, depth + 1, budget));
    }
    return Object.freeze(output);
  }
  if (!value || typeof value !== "object") throw new Error("INVALID_JSON_VALUE");
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) throw new Error("INVALID_JSON_OBJECT");
  if (Object.getOwnPropertySymbols(value).length > 0) throw new Error("INVALID_JSON_OBJECT");
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const output = {};
  for (const key of Object.keys(descriptors).sort()) {
    const descriptor = descriptors[key];
    if (!isWellFormedUnicode(key)) throw new Error("INVALID_UNICODE_STRING");
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

function isWellFormedUnicode(value) {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (!Number.isInteger(next) || next < 0xdc00 || next > 0xdfff) return false;
      index += 1;
    } else if (code >= 0xdc00 && code <= 0xdfff) {
      return false;
    }
  }
  return true;
}

function assertNoDuplicateObjectKeys(text) {
  const stack = [];
  for (let index = 0; index < text.length;) {
    const character = text[index];
    if (character === '"') {
      const start = index;
      index += 1;
      while (index < text.length) {
        if (text[index] === "\\") {
          index += 2;
          continue;
        }
        if (text[index] === '"') {
          index += 1;
          break;
        }
        index += 1;
      }
      const context = stack.at(-1);
      if (context?.type === "object" && context.expectKey) {
        const key = JSON.parse(text.slice(start, index));
        if (context.keys.has(key)) throw new Error("DUPLICATE_JSON_KEY");
        context.keys.add(key);
        context.expectKey = false;
      }
      continue;
    }
    if (character === "{") stack.push({ type: "object", expectKey: true, keys: new Set() });
    else if (character === "[") stack.push({ type: "array" });
    else if (character === "}" || character === "]") stack.pop();
    else if (character === ",") {
      const context = stack.at(-1);
      if (context?.type === "object") context.expectKey = true;
    }
    index += 1;
  }
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
  try {
    structuredClone(value);
  } catch {
    throw new Error("INVALID_JSON_VALUE");
  }
  if (!frame || typeof frame !== "object" || Array.isArray(frame)) throw new Error("INVALID_FRAME");
  if (Object.keys(frame).some(key => !envelopeKeys.has(key)) || Object.keys(frame).length !== envelopeKeys.size) {
    throw new Error("UNKNOWN_OR_MISSING_FIELD");
  }
  if (frame.protocol !== protocolName) throw new Error("UNSUPPORTED_PROTOCOL");
  requireIdentifier(frame, "requestId");
  requireIdentifier(frame, "operationId");
  requireIdentifier(frame, "authorityScope");
  requireIdentifier(frame, "extensionInstanceId");
  requireIdentifier(frame, "hostIncarnation");
  requireIdentifier(frame, "senderId");
  requireIdentifier(frame, "audience");
  requireNonNegativeInteger(frame, "graphGeneration");
  requireNonNegativeInteger(frame, "moduleActivationGeneration");
  requireNonNegativeInteger(frame, "absoluteDeadline");
  if (!kinds.has(frame.kind)) throw new Error("INVALID_KIND");
  if (!frame.payload || typeof frame.payload !== "object" || Array.isArray(frame.payload)) throw new Error("INVALID_PAYLOAD");
  const bytes = new TextEncoder().encode(JSON.stringify(frame)).byteLength;
  if (bytes > maxFrameBytes) throw new Error("FRAME_TOO_LARGE");
  return frame;
}

export function validateAuthorizedEnvelope(value, authority) {
  const request = validateEnvelope(value);
  if (request.authorityScope !== authority.authorityScope) throw new Error("AUTHORITY_SCOPE_MISMATCH");
  if (request.extensionInstanceId !== authority.extensionInstanceId) throw new Error("EXTENSION_INSTANCE_MISMATCH");
  if (request.graphGeneration !== authority.graphGeneration) throw new Error("STALE_GRAPH_GENERATION");
  if (request.moduleActivationGeneration !== authority.moduleActivationGeneration) {
    throw new Error("STALE_MODULE_ACTIVATION_GENERATION");
  }
  if (request.hostIncarnation !== authority.hostIncarnation) throw new Error("STALE_HOST_INCARNATION");
  if (request.senderId !== authority.authenticatedPeerId) throw new Error("AUTHENTICATED_PEER_MISMATCH");
  if (request.audience !== authority.audience) throw new Error("AUDIENCE_MISMATCH");
  if (authority.now >= request.absoluteDeadline) throw new Error("DEADLINE_EXCEEDED");
  return request;
}

export function validateResponseEnvelope(value, authority, request, expectedKind) {
  const response = validateAuthorizedEnvelope(value, authority);
  if (response.requestId !== request.requestId) throw new Error("RESPONSE_REQUEST_MISMATCH");
  if (response.operationId !== request.operationId) throw new Error("RESPONSE_OPERATION_MISMATCH");
  if (response.absoluteDeadline !== request.absoluteDeadline) throw new Error("RESPONSE_DEADLINE_MISMATCH");
  if (response.kind !== expectedKind) throw new Error("UNEXPECTED_RESPONSE_KIND");
  return response;
}

export function handlePortableWorkerFrame(value, authority) {
  const request = validateAuthorizedEnvelope(value, authority);
  if (typeof authority.localSenderId !== "string" || authority.localSenderId.length === 0) {
    throw new Error("INVALID_LOCAL_SENDER_ID");
  }
  if (authority.localSenderId !== authority.audience) throw new Error("LOCAL_IDENTITY_MISMATCH");
  return validateEnvelope({
    ...request,
    senderId: authority.localSenderId,
    audience: authority.authenticatedPeerId,
    kind: "result",
    payload: { acceptedKind: request.kind },
  });
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
    const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes.subarray(4));
    assertNoDuplicateObjectKeys(text);
    parsed = JSON.parse(text);
  } catch {
    throw new Error("INVALID_JSON_FRAME");
  }
  return validateEnvelope(parsed);
}
