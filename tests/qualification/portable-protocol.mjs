export const protocolName = "agent-teams.extension-host/v1";
export const maxFrameBytes = 64 * 1024;
const maxJsonDepth = 32;
const maxJsonNodes = 4_096;
const envelopeKeys = new Set([
  "protocol", "requestId", "operationId", "dispatchNonce", "authorityScope", "extensionInstanceId",
  "graphGeneration", "moduleActivationGeneration", "hostIncarnation", "senderId",
  "audience", "absoluteDeadline", "kind", "payload",
]);
const kinds = new Set(["hello", "prepare", "ready", "drain", "stop", "result"]);
const requestKinds = new Set(["hello", "prepare", "drain", "stop"]);
const responseKinds = new Set(["ready", "result"]);
const exactIntegerWireFields = new Set([
  "absoluteDeadline",
  "graphGeneration",
  "moduleActivationGeneration",
]);
const canonicalNonNegativeInteger = /^(?:0|[1-9]\d*)$/;
const forbiddenKeys = new Set(["__proto__", "constructor", "prototype"]);
const identifierPattern = /^[A-Za-z0-9][A-Za-z0-9._:/@+-]*$/;
let dispatchSequence = 0;

function normalizeJson(value, depth, budget) {
  if (depth > maxJsonDepth || budget.count++ >= maxJsonNodes) throw new Error("JSON_LIMIT_EXCEEDED");
  if (value === null || typeof value === "boolean") return value;
  if (typeof value === "string") {
    if (!isWellFormedUnicode(value)) throw new Error("INVALID_UNICODE_STRING");
    return value;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)
      || Object.is(value, -0)
      || (Number.isInteger(value) && !Number.isSafeInteger(value))) {
      throw new Error("INVALID_JSON_NUMBER");
    }
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

function parseWireJson(text) {
  const integerSourcesByHolder = new WeakMap();
  return JSON.parse(text, function parseWithSource(key, value, context) {
    if (key !== "" && exactIntegerWireFields.has(key) && typeof this === "object" && this !== null) {
      const sources = integerSourcesByHolder.get(this) ?? new Map();
      sources.set(key, context?.source);
      integerSourcesByHolder.set(this, sources);
    }
    if (key === "" && typeof value === "object" && value !== null && !Array.isArray(value)) {
      const sources = integerSourcesByHolder.get(value);
      if (sources) {
        for (const source of sources.values()) {
          if (typeof source !== "string" || !canonicalNonNegativeInteger.test(source)) {
            throw new Error("INVALID_JSON_NUMBER");
          }
        }
      }
    }
    return value;
  });
}

function requireIdentifier(frame, key) {
  const value = frame[key];
  if (typeof value !== "string" || value.length > 128 || !identifierPattern.test(value)) {
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
  requireIdentifier(frame, "dispatchNonce");
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
  if (!Number.isSafeInteger(authority.now) || authority.now < 0) throw new Error("INVALID_AUTHORITY_NOW");
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

function dispatchIdentity(request) {
  return [
    request.authorityScope,
    request.extensionInstanceId,
    request.graphGeneration,
    request.moduleActivationGeneration,
    request.hostIncarnation,
    request.requestId,
    request.operationId,
  ].join("\u0000");
}

function issueDispatchNonce() {
  dispatchSequence += 1;
  return `dispatch-${dispatchSequence.toString(36)}-${Date.now().toString(36)}`;
}

export function createDispatchTracker() {
  const dispatchReceipts = new WeakMap();
  const pendingDispatches = new Map();
  let closed = false;

  const assertOpen = () => {
    if (closed) throw new Error("DISPATCH_TRACKER_CLOSED");
  };

  const cancelDispatch = receipt => {
    const dispatch = receipt && typeof receipt === "object" ? dispatchReceipts.get(receipt) : undefined;
    if (!dispatch || pendingDispatches.get(dispatch.identity) !== receipt) return false;
    pendingDispatches.delete(dispatch.identity);
    dispatchReceipts.delete(receipt);
    return true;
  };

  const createDispatch = (value, authority, expectedResponseKind) => {
    assertOpen();
    if (!responseKinds.has(expectedResponseKind)) throw new Error("INVALID_EXPECTED_RESPONSE_KIND");
    const request = validateAuthorizedEnvelope(value, authority);
    if (!requestKinds.has(request.kind)) throw new Error("INVALID_REQUEST_KIND");
    const identity = dispatchIdentity(request);
    if (pendingDispatches.has(identity)) throw new Error("DISPATCH_ALREADY_PENDING");
    const dispatchedRequest = validateEnvelope({
      ...request,
      dispatchNonce: issueDispatchNonce(),
    });
    const receipt = Object.freeze({
      requestId: dispatchedRequest.requestId,
      operationId: dispatchedRequest.operationId,
      dispatchNonce: dispatchedRequest.dispatchNonce,
      authorityScope: dispatchedRequest.authorityScope,
      extensionInstanceId: dispatchedRequest.extensionInstanceId,
      graphGeneration: dispatchedRequest.graphGeneration,
      moduleActivationGeneration: dispatchedRequest.moduleActivationGeneration,
      hostIncarnation: dispatchedRequest.hostIncarnation,
      senderId: dispatchedRequest.senderId,
      audience: dispatchedRequest.audience,
      absoluteDeadline: dispatchedRequest.absoluteDeadline,
    });
    dispatchReceipts.set(receipt, Object.freeze({
      identity,
      requestKind: dispatchedRequest.kind,
      expectedResponseKind,
      requestPayload: JSON.stringify(dispatchedRequest.payload),
    }));
    pendingDispatches.set(identity, receipt);
    return Object.freeze({ request: dispatchedRequest, receipt });
  };

  const validateResponseEnvelope = (value, authority, receipt) => {
    assertOpen();
    const dispatch = receipt && typeof receipt === "object" ? dispatchReceipts.get(receipt) : undefined;
    if (!dispatch || pendingDispatches.get(dispatch.identity) !== receipt) {
      throw new Error("INVALID_DISPATCH_RECEIPT");
    }
    if (Number.isSafeInteger(authority.now) && authority.now >= receipt.absoluteDeadline) {
      cancelDispatch(receipt);
    }
    const response = validateAuthorizedEnvelope(value, authority);
    if (response.requestId !== receipt.requestId) throw new Error("RESPONSE_REQUEST_MISMATCH");
    if (response.operationId !== receipt.operationId) throw new Error("RESPONSE_OPERATION_MISMATCH");
    if (response.dispatchNonce !== receipt.dispatchNonce) throw new Error("RESPONSE_DISPATCH_NONCE_MISMATCH");
    if (response.authorityScope !== receipt.authorityScope) throw new Error("RESPONSE_AUTHORITY_SCOPE_MISMATCH");
    if (response.extensionInstanceId !== receipt.extensionInstanceId) {
      throw new Error("RESPONSE_EXTENSION_INSTANCE_MISMATCH");
    }
    if (response.graphGeneration !== receipt.graphGeneration) {
      throw new Error("RESPONSE_GRAPH_GENERATION_MISMATCH");
    }
    if (response.moduleActivationGeneration !== receipt.moduleActivationGeneration) {
      throw new Error("RESPONSE_MODULE_ACTIVATION_GENERATION_MISMATCH");
    }
    if (response.hostIncarnation !== receipt.hostIncarnation) {
      throw new Error("RESPONSE_HOST_INCARNATION_MISMATCH");
    }
    if (response.senderId !== receipt.audience || response.audience !== receipt.senderId) {
      throw new Error("RESPONSE_ENDPOINT_DIRECTION_MISMATCH");
    }
    if (response.absoluteDeadline !== receipt.absoluteDeadline) throw new Error("RESPONSE_DEADLINE_MISMATCH");
    if (response.kind !== dispatch.expectedResponseKind) throw new Error("UNEXPECTED_RESPONSE_KIND");
    cancelDispatch(receipt);
    return response;
  };

  const close = () => {
    if (closed) return 0;
    closed = true;
    const abandonedCount = pendingDispatches.size;
    for (const receipt of pendingDispatches.values()) dispatchReceipts.delete(receipt);
    pendingDispatches.clear();
    return abandonedCount;
  };

  return Object.freeze({
    createDispatch,
    validateResponseEnvelope,
    cancelDispatch,
    close,
    get pendingCount() { return pendingDispatches.size; },
  });
}

export function handlePortableWorkerFrame(value, authority) {
  const request = validateAuthorizedEnvelope(value, authority);
  if (!requestKinds.has(request.kind)) throw new Error("INVALID_REQUEST_KIND");
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
    parsed = parseWireJson(text);
  } catch (error) {
    if (error instanceof Error && error.message === "INVALID_JSON_NUMBER") throw error;
    throw new Error("INVALID_JSON_FRAME");
  }
  return validateEnvelope(parsed);
}
