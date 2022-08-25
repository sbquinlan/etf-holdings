function isAsyncIterable<TThing>(
  maybe_iterable: any
): maybe_iterable is AsyncIterable<TThing> {
  return Symbol.asyncIterator in maybe_iterable;
}

class AsyncWrapper<TThing> implements AsyncIterableIterator<TThing> {
  private iter: Iterator<TThing>;
  constructor(
    source: Iterable<TThing>,
  ) {
    this.iter = source[Symbol.iterator]();
  }

  async next(): Promise<IteratorResult<TThing, any>> {
    return this.iter.next();
  }

  [Symbol.asyncIterator]() {
    return this;
  }
}

export function upsync<TThing>(
  upstream: AsyncIterable<TThing> | Iterable<TThing>,
): AsyncIterable<TThing> {
  return isAsyncIterable(upstream)
    ? upstream
    : new AsyncWrapper(upstream)
}

/**
 * Very shitty version of python's range() that only supports
 * the most basic (and most useful) functionality of generating
 * a range from [0 - n) incrementing by 1.
 */
export function* range(n: number) {
  n = Math.max(0, n);
  for (let i = 0; i < n; i++) yield i;
}

/**
 * sink() pulls things from an interator as fast as possible to make
 * and array. Think Array.from, but supporting AsyncIterables.
 */
export async function sink<TThing>(
  upstream: AsyncIterable<TThing> | Iterable<TThing>
): Promise<Array<TThing>> {
  const iter = upsync(upstream)[Symbol.asyncIterator]();
  const arr = [];
  for (let next; !(next = await iter.next()).done; ) {
    arr.push(next.value);
  }
  return arr;
}