export interface ProtocolEnvelope {
  readonly protocol: "agent-teams.extension-host/v1";
  readonly requestId: string;
  readonly operationId: string;
  readonly dispatchNonce: string;
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

export type ProtocolResponseKind = Extract<ProtocolEnvelope["kind"], "ready" | "result">;
declare const dispatchReceiptBrand: unique symbol;
export interface DispatchReceipt {
  readonly [dispatchReceiptBrand]: true;
  readonly requestId: string;
  readonly operationId: string;
  readonly dispatchNonce: string;
  readonly authorityScope: string;
  readonly extensionInstanceId: string;
  readonly graphGeneration: number;
  readonly moduleActivationGeneration: number;
  readonly hostIncarnation: string;
  readonly senderId: string;
  readonly audience: string;
  readonly absoluteDeadline: number;
}
export interface Dispatch {
  readonly request: ProtocolEnvelope;
  readonly receipt: DispatchReceipt;
}

export declare const protocolName: ProtocolEnvelope["protocol"];
export declare const maxFrameBytes: number;
export declare function validateEnvelope(value: unknown): ProtocolEnvelope;
export declare function validateAuthorizedEnvelope(
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
export interface ProtocolAuthority {
  readonly authorityScope: string;
  readonly extensionInstanceId: string;
  readonly graphGeneration: number;
  readonly moduleActivationGeneration: number;
  readonly hostIncarnation: string;
  readonly authenticatedPeerId: string;
  readonly audience: string;
  readonly now: number;
}
export interface DispatchTracker {
  readonly pendingCount: number;
  createDispatch(
    value: unknown,
    authority: Readonly<ProtocolAuthority>,
    expectedResponseKind: ProtocolResponseKind,
  ): Dispatch;
  validateResponseEnvelope(
    value: unknown,
    authority: Readonly<ProtocolAuthority>,
    receipt: DispatchReceipt,
  ): ProtocolEnvelope;
  cancelDispatch(receipt: DispatchReceipt): boolean;
  close(): number;
}
export declare function createDispatchTracker(): DispatchTracker;
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
    localSenderId: string;
  }>,
): ProtocolEnvelope;
export declare function encodeLengthPrefixedFrame(value: unknown): Uint8Array;
export declare function decodeLengthPrefixedFrame(value: Uint8Array | ArrayBuffer): ProtocolEnvelope;
