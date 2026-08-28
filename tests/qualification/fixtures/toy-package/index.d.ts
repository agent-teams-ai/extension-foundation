export interface Counter {
  next(): number;
}

export declare function createCounter(initial?: number): Counter;
