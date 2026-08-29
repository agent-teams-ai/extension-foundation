export function evaluateSelectedLoaders(
  table: Readonly<Record<string, () => unknown>>,
  selectedKeys: readonly string[],
): readonly unknown[] {
  const selected: unknown[] = [];
  for (const key of selectedKeys) {
    if (!Object.hasOwn(table, key)) throw new Error(`INVALID_LITERAL_LOADER:${key}`);
    selected.push(table[key]!());
  }
  return Object.freeze(selected);
}
