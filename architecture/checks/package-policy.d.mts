export const CONFORMANCE_VERSION: RegExp;

export interface AdmissionVerificationRequest {
  readonly packageId: string;
  readonly admissionRecordDigest: string;
  readonly requiredGateId: "phase-3-module-semantic-package-admission" | "phase-3-package-admission";
}

export function packageAdmissionVerificationRequest(
  entry: Readonly<{ id: string }>,
  admission: Readonly<{ package_id: string; semantic_classification: string }>,
  admissionRecordDigest: string,
): AdmissionVerificationRequest;

export function admissionVerificationReceiptMatches(
  request: AdmissionVerificationRequest,
  receipt: unknown,
): boolean;
