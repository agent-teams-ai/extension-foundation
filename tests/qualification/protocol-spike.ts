export {
  createDispatchTracker,
  decodeLengthPrefixedFrame,
  encodeLengthPrefixedFrame,
  handlePortableWorkerFrame,
  maxFrameBytes,
  protocolName,
  validateAuthorizedEnvelope,
  validateEnvelope,
} from "./portable-protocol.mjs";
export type { Dispatch, DispatchReceipt, DispatchTracker, ProtocolEnvelope } from "./portable-protocol.mjs";
