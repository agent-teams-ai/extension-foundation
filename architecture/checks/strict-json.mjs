function resourceLimit(message) {
  const error = new SyntaxError(message);
  error.code = "JSON_RESOURCE_LIMIT";
  return error;
}

function assertLexicalJsonLimitsAndNoDuplicateObjectKeys(text, {
  maxDepth = Number.POSITIVE_INFINITY,
  maxNodes = Number.POSITIVE_INFINITY,
  maxStringLength = Number.POSITIVE_INFINITY,
} = {}) {
  const stack = [];
  let nodes = 0;

  function countNode(depth) {
    nodes += 1;
    if (nodes > maxNodes) throw resourceLimit("JSON node limit exceeded");
    if (depth > maxDepth) throw resourceLimit("JSON depth limit exceeded");
  }

  for (let index = 0; index < text.length;) {
    const character = text[index];
    if (/\s/u.test(character)) {
      index += 1;
      continue;
    }
    if (character === '"') {
      const start = index;
      let rawLength = 0;
      index += 1;
      while (index < text.length) {
        if (text[index] === "\\") {
          rawLength += 2;
          if (rawLength > maxStringLength) throw resourceLimit("JSON string limit exceeded");
          index += 2;
          continue;
        }
        if (text[index] === '"') {
          index += 1;
          break;
        }
        rawLength += 1;
        if (rawLength > maxStringLength) throw resourceLimit("JSON string limit exceeded");
        index += 1;
      }
      const context = stack.at(-1);
      if (context?.type === "object" && context.expectKey) {
        const key = JSON.parse(text.slice(start, index));
        if (context.keys.has(key)) throw new Error(`DUPLICATE_JSON_KEY:${key}`);
        context.keys.add(key);
        context.expectKey = false;
      } else {
        countNode(stack.length);
      }
      continue;
    }
    if (character === "{" || character === "[") {
      countNode(stack.length);
      stack.push(character === "{"
        ? { type: "object", expectKey: true, keys: new Set() }
        : { type: "array" });
      index += 1;
      continue;
    }
    if (character === "}" || character === "]") {
      stack.pop();
      index += 1;
      continue;
    }
    if (character === ",") {
      const context = stack.at(-1);
      if (context?.type === "object") context.expectKey = true;
      index += 1;
      continue;
    }
    if (character === ":") {
      index += 1;
      continue;
    }
    countNode(stack.length);
    while (index < text.length && !/[\s,\]}]/u.test(text[index])) index += 1;
  }
}

export function parseStrictJson(text, limits) {
  assertLexicalJsonLimitsAndNoDuplicateObjectKeys(text, limits);
  return JSON.parse(text);
}
