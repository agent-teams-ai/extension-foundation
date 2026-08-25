export {
  decodeLengthPrefixedFrame,
  encodeLengthPrefixedFrame,
  handlePortableWorkerFrame,
  maxFrameBytes,
  protocolName,
  validateAuthorizedEnvelope,
  validateEnvelope,
} from "./portable-protocol.mjs";
export type { ProtocolEnvelope } from "./portable-protocol.mjs";
