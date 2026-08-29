export function evaluateSelectedLoaders(
  table: Readonly<Record<string, () => unknown>>,
  selectedKeys: readonly string[],
): readonly unknown[] {
  for (const key of selectedKeys) {
    if (!Object.hasOwn(table, key)) throw new Error(`INVALID_LITERAL_LOADER:${key}`);
  }
  return Object.freeze(selectedKeys.map(key => table[key]!()));
}
