export function createCounter(initial = 0) {
  let value = initial;
  return Object.freeze({
    next() {
      value += 1;
      return value;
    },
  });
}
