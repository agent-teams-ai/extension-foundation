export {
  decodeLengthPrefixedFrame,
  encodeLengthPrefixedFrame,
  handlePortableWorkerFrame,
  maxFrameBytes,
  protocolName,
  validateAuthorizedEnvelope,
  validateEnvelope,
  validateResponseEnvelope,
} from "./portable-protocol.mjs";
export type { ProtocolEnvelope } from "./portable-protocol.mjs";
