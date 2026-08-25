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

export declare const protocolName: ProtocolEnvelope["protocol"];
export declare const maxFrameBytes: number;
export declare function validateEnvelope(value: unknown): ProtocolEnvelope;
export declare function handlePortableWorkerFrame(
  value: unknown,
  authority: Readonly<{ graphGeneration: number; runtimeGeneration: number; now: number }>,
): ProtocolEnvelope;
export declare function encodeLengthPrefixedFrame(value: unknown): Uint8Array;
export declare function decodeLengthPrefixedFrame(value: Uint8Array | ArrayBuffer): ProtocolEnvelope;
