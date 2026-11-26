import { contributionLimits } from "./contracts.ts";

export type MetadataValue = null | boolean | number | string | readonly MetadataValue[] | MetadataRecord;
export interface MetadataRecord { readonly [key: string]: MetadataValue }

export const metadataRecord = (value: MetadataValue): value is MetadataRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * Copy decoded, current-realm inert metadata without reading accessors. The
 * receiver must bound decoding and never pass candidate-created JS objects:
 * reflective Proxy traps are executable and cannot be contained by this API.
 */
export function snapshotMetadata(value: unknown): MetadataValue {
  const ancestors = new Set<object>();
  let nodes = contributionLimits.nodes;
  let textUnits = contributionLimits.textUnits;

  function accountText(text: string): string {
    textUnits -= text.length;
    if (textUnits < 0) throw new Error("metadata text limit");
    return text;
  }

  function visit(input: unknown, depth: number): MetadataValue {
    nodes -= 1;
    if (nodes < 0 || depth > contributionLimits.depth) throw new Error("metadata shape limit");
    if (input === null || typeof input === "boolean") return input;
    if (typeof input === "string") return accountText(input);
    if (typeof input === "number" && Number.isFinite(input)) return input;
    if (typeof input !== "object" || ancestors.has(input)) throw new Error("non-JSON metadata");

    const array = Array.isArray(input);
    const prototype: unknown = Object.getPrototypeOf(input);
    if (prototype !== Object.getPrototypeOf(array ? [] : {}) && (array || prototype !== null)) {
      throw new Error("non-JSON prototype");
    }
    const keys = Reflect.ownKeys(input);
    if (keys.length > nodes + (array ? 1 : 0) || keys.some(key => typeof key !== "string")) {
      throw new Error("metadata properties");
    }

    ancestors.add(input);
    let result: MetadataValue;
    if (array) {
      const length: unknown = Object.getOwnPropertyDescriptor(input, "length")?.value;
      if (typeof length !== "number" || !Number.isInteger(length) || length < 0 ||
          length > nodes || keys.length !== length + 1) throw new Error("non-JSON array");
      const items: MetadataValue[] = [];
      for (let index = 0; index < length; index += 1) {
        const property = Object.getOwnPropertyDescriptor(input, String(index));
        if (!property?.enumerable || !("value" in property)) throw new Error("non-JSON array item");
        items.push(visit(property.value, depth + 1));
      }
      result = Object.freeze(items);
    } else {
      const entries: [string, MetadataValue][] = [];
      for (const key of keys) {
        if (typeof key !== "string") throw new Error("symbol metadata");
        const property = Object.getOwnPropertyDescriptor(input, key);
        if (!property?.enumerable || !("value" in property)) throw new Error("non-JSON property");
        entries.push([accountText(key), visit(property.value, depth + 1)]);
      }
      result = Object.freeze(Object.fromEntries(entries));
    }
    ancestors.delete(input);
    return result;
  }

  return visit(value, 0);
}
