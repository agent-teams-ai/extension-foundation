function assertNoDuplicateObjectKeys(text) {
  const stack = [];
  for (let index = 0; index < text.length;) {
    const character = text[index];
    if (character === '"') {
      const start = index;
      index += 1;
      while (index < text.length) {
        if (text[index] === "\\") {
          index += 2;
          continue;
        }
        if (text[index] === '"') {
          index += 1;
          break;
        }
        index += 1;
      }
      const context = stack.at(-1);
      if (context?.type === "object" && context.expectKey) {
        const key = JSON.parse(text.slice(start, index));
        if (context.keys.has(key)) throw new Error(`DUPLICATE_JSON_KEY:${key}`);
        context.keys.add(key);
        context.expectKey = false;
      }
      continue;
    }
    if (character === "{") stack.push({ type: "object", expectKey: true, keys: new Set() });
    else if (character === "[") stack.push({ type: "array" });
    else if (character === "}" || character === "]") stack.pop();
    else if (character === ",") {
      const context = stack.at(-1);
      if (context?.type === "object") context.expectKey = true;
    }
    index += 1;
  }
}

export function parseStrictJson(text) {
  assertNoDuplicateObjectKeys(text);
  return JSON.parse(text);
}
