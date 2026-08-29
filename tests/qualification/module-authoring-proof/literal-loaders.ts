export function evaluateSelectedLoaders(
  table: Readonly<Record<string, () => unknown>>,
  selectedKeys: readonly string[],
): readonly unknown[] {
  if (new Set(selectedKeys).size !== selectedKeys.length) throw new Error("DUPLICATE_LITERAL_LOADER");
  const factories: Array<() => unknown> = [];
  for (const key of selectedKeys) {
    const descriptor = Object.getOwnPropertyDescriptor(table, key);
    if (descriptor === undefined || descriptor.get !== undefined || descriptor.set !== undefined || typeof descriptor.value !== "function") {
      throw new Error(`INVALID_LITERAL_LOADER:${key}`);
    }
    factories.push(descriptor.value as () => unknown);
  }
  return Object.freeze(factories.map(factory => factory()));
}
