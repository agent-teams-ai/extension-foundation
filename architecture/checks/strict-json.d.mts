export interface StrictJsonLimits {
  readonly maxDepth?: number;
  readonly maxNodes?: number;
  readonly maxStringLength?: number;
}

export function parseStrictJson(text: string, limits?: StrictJsonLimits): unknown;
