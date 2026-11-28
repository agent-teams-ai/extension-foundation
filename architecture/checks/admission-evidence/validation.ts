import { AdmissionEvidenceError } from "./contracts.ts";

export function fail(code: string, message: string): never {
  throw new AdmissionEvidenceError(code, message);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function record(value: unknown, label: string): Record<string, unknown> {
  if (!isRecord(value)) {
    fail("E-SCHEMA", `${label} must be an object`);
  }
  return value;
}

export function exactRecord(value: unknown, keys: readonly string[], label: string): Record<string, unknown> {
  const result = record(value, label);
  if (Object.keys(result).sort().join("\0") !== [...keys].sort().join("\0")) {
    fail("E-SCHEMA", `${label} has unsupported or missing fields`);
  }
  return result;
}

export function string(value: unknown, label: string, maximum = 256): string {
  if (typeof value !== "string" || value.length === 0 || value.length > maximum || /[\u0000-\u001f\u007f]/u.test(value)) {
    fail("E-SCHEMA", `${label} must be bounded text`);
  }
  return value;
}

export function positiveInteger(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value <= 0) {
    fail("E-SCHEMA", `${label} must be a positive safe integer`);
  }
  return value;
}

export function digest(value: unknown, label: string): string {
  const result = string(value, label);
  if (!/^sha256:[a-f0-9]{64}$/u.test(result)) fail("E-SCHEMA", `${label} must be a SHA-256 digest`);
  return result;
}

export function sourceRevision(value: unknown): string {
  const result = string(value, "source revision");
  if (!/^[a-f0-9]{40}$/u.test(result)) fail("E-SCHEMA", "source revision must be an exact commit");
  return result;
}

export function repositoryName(value: unknown): string {
  const result = string(value, "repository");
  if (!/^[a-z0-9][a-z0-9_.-]*\/[a-z0-9][a-z0-9_.-]*$/u.test(result) ||
      result.split("/").some(part => part.endsWith(".") || part.endsWith(".git"))) {
    fail("E-SCHEMA", "repository must be a canonical lowercase owner/name");
  }
  return result;
}

export function relativePath(value: unknown): string {
  const result = string(value, "source path", 512);
  if (result.startsWith("/") || result.includes("\\") || result.includes(":")) fail("E-PATH", "source path must be relative");
  if (result.split("/").some(part => !/^[A-Za-z0-9_.@+-]+$/u.test(part) || part === "." || part === ".." || part.endsWith("."))) {
    fail("E-PATH", "source path contains an unsupported component");
  }
  return result;
}

export function array(value: unknown, label: string, minimum = 1, maximum = 256): readonly unknown[] {
  if (!Array.isArray(value) || value.length < minimum || value.length > maximum) {
    fail("E-SCHEMA", `${label} has an invalid number of items`);
  }
  return value;
}

export function assertSame(actual: unknown, expected: unknown, label: string): void {
  if (actual !== expected) fail("E-BINDING", `${label} does not match its trusted binding`);
}
