import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { analyzeSource } from "../architecture/checks/source-safety.mjs";

test("the existing classifier admits direct inert inspection without granting reflective dispatch", async (context) => {
  for (const expression of [
    "Object.getPrototypeOf(value)",
    "Object.getOwnPropertyDescriptor(value, key)",
    "Object.getOwnPropertyDescriptors(value)",
    "Object.getOwnPropertySymbols(value)",
    "Reflect.ownKeys(value)",
  ]) {
    await context.test(expression, () => {
      assert.deepEqual(analyzeSource("inspection.ts", `export const result = ${expression};`).errors, []);
    });
  }
  for (const relativePath of [
    "packages/core/src/features/contributions/contracts.ts",
    "packages/core/src/features/contributions/inert-metadata.ts",
    "packages/core/src/features/contributions/match-contributions.ts",
    "packages/core/src/features/contributions/index.ts",
    "packages/core/test/features/contributions/match.test.ts",
    "packages/core/test/features/contributions/carrier.test.ts",
  ]) {
    const path = fileURLToPath(new URL(`../${relativePath}`, import.meta.url));
    assert.deepEqual(analyzeSource(relativePath, await readFile(path, "utf8")).errors, [], relativePath);
  }
});

test("inspection permission rejects aliases, callbacks, shadowed or mutated globals", async (context) => {
  for (const source of [
    "const inspect = Object.getPrototypeOf; export const result = inspect(value);",
    "export const result = values.map(Object.getOwnPropertyDescriptors);",
    "const { getPrototypeOf } = Object; export const result = getPrototypeOf(value);",
    "const reflection = Reflect; export const result = reflection.ownKeys(value);",
    "function inspect(Object: unknown) { return Object.getPrototypeOf(value); }",
    "Object.getPrototypeOf = substitute; export const result = Object.getPrototypeOf(value);",
    "Object.assign(Object, replacement); export const result = Object.getPrototypeOf(value);",
    "export const result = Object.getPrototypeOf.call(Object, value);",
    "export const result = Object.getOwnPropertyDescriptor(...args);",
    "export const result = Object?.getPrototypeOf(value);",
    "export const result = Object.getPrototypeOf?.(value);",
    "export const result = Object.getOwnPropertyDescriptor(() => {}, key);",
    "export const result = Object.getPrototypeOf(function operation() {});",
    "export const result = Object.getOwnPropertyDescriptors(Object.getPrototypeOf(value));",
  ]) {
    await context.test(source, () => {
      assert.notEqual(analyzeSource("inspection.ts", source).errors.length, 0, source);
    });
  }
});

test("descriptor and prototype results cannot be invoked or escaped through a local alias", async (context) => {
  for (const source of [
    'Object.getOwnPropertyDescriptor(value, key).value("source")();',
    'Object.getOwnPropertyDescriptor(value, key)?.value?.("source");',
    'new (Object.getOwnPropertyDescriptor(value, key).value)();',
    'Object.getOwnPropertyDescriptor(value, key).value`source`;',
    'const descriptor = Object.getOwnPropertyDescriptor(value, key); descriptor.value("source");',
    'const f = Object.getOwnPropertyDescriptor(value, key).value; f("source");',
    'const descriptor = Object.getOwnPropertyDescriptor(value, key); const f = descriptor.value; f("source");',
    'const descriptor = Object.getOwnPropertyDescriptor(value, key); let f; f = descriptor.value; f("source");',
    'const { value: f } = Object.getOwnPropertyDescriptor(value, key); f("source");',
    'const prototype = Object.getPrototypeOf(value); prototype("source");',
  ]) {
    await context.test(source, () => {
      assert.match(analyzeSource("inspection.ts", source).errors.join("\n"), /reflective (property-descriptor|prototype) access/u);
    });
  }
});

test("the inert-data allowance preserves loader, constructor and computed-dispatch refusals", async (context) => {
  const cases: readonly (readonly [string, RegExp])[] = [
    ["Reflect.apply(operation, value, [])", /reflective runtime access/u],
    ["Reflect.construct(operation, [])", /reflective runtime access/u],
    ["Reflect.get(value, key)", /reflective runtime access/u],
    ["Reflect.ownKeys[method](value)", /computed runtime property access/u],
    ["Object[key](value)", /computed runtime property access/u],
    ["value.constructor('return 1')()", /Function-constructor/u],
    ["Object.getPrototypeOf(value).constructor('return 1')()", /Function-constructor/u],
    ["eval(source)", /eval-based/u],
    ["new Function(source)", /Function-constructor/u],
    ["import(specifier)", /dynamic module loading/u],
    ["process.getBuiltinModule('fs')", /process/u],
    ["require('fs')", /CommonJS/u],
    ["globalThis[key]", /globalThis/u],
  ];
  for (const [expression, expected] of cases) {
    await context.test(expression, () => {
      assert.match(analyzeSource("inspection.ts", `export const result = ${expression};`).errors.join("\n"), expected);
    });
  }
});
