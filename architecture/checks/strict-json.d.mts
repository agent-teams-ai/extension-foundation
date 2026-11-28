export interface JsonLimits {
  readonly maxDepth?: number;
  readonly maxNodes?: number;
  readonly maxStringLength?: number;
}

export function parseStrictJson(text: string, limits?: JsonLimits): unknown;
