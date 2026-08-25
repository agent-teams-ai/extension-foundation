export interface ProtocolEnvelope {
  readonly protocol: "agent-teams.extension-host/v1";
  readonly requestId: string;
  readonly operationId: string;
  readonly authorityScope: string;
  readonly extensionInstanceId: string;
  readonly graphGeneration: number;
  readonly moduleActivationGeneration: number;
  readonly hostIncarnation: string;
  readonly senderId: string;
  readonly audience: string;
  readonly absoluteDeadline: number;
  readonly kind: "hello" | "prepare" | "ready" | "drain" | "stop" | "result";
  readonly payload: Readonly<Record<string, unknown>>;
}

export declare const protocolName: ProtocolEnvelope["protocol"];
export declare const maxFrameBytes: number;
export declare function validateEnvelope(value: unknown): ProtocolEnvelope;
export declare function handlePortableWorkerFrame(
  value: unknown,
  authority: Readonly<{
    authorityScope: string;
    extensionInstanceId: string;
    graphGeneration: number;
    moduleActivationGeneration: number;
    hostIncarnation: string;
    authenticatedPeerId: string;
    audience: string;
    now: number;
  }>,
): ProtocolEnvelope;
export declare function encodeLengthPrefixedFrame(value: unknown): Uint8Array;
export declare function decodeLengthPrefixedFrame(value: Uint8Array | ArrayBuffer): ProtocolEnvelope;
