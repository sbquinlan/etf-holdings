import { sleep, any_partition } from './promise';

export function isAsyncIterable<TThing>(
  maybe_iterable: any
): maybe_iterable is AsyncIterable<TThing> {
  return Symbol.asyncIterator in maybe_iterable;
}

export function isIterable<TThing>(
  maybe_iterable: any
): maybe_iterable is Iterable<TThing> {
  return Symbol.iterator in maybe_iterable;
}

export function* range(n: number) {
  for (let i = 0; i < n; i++) yield i;
}

export async function collect<TThing>(
  upstream: AsyncIterable<TThing> | Iterable<TThing>
): Promise<Array<TThing>> {
  const arr = [];
  for await (const thing of upstream) {
    arr.push(thing);
  }
  return arr;
}

export async function* leaky<TThing>(
  upstream: AsyncIterable<TThing> | Iterable<TThing>,
  limit: number,
  rate: number
) {
  let level = 0,
    last = Date.now();

  for await (const thing of upstream) {
    yield thing;

    // calc leaked amount
    const now = Date.now();
    const leaked = (now - last) / rate;
    last = now;

    // update level
    level = Math.max(level - leaked + 1, 0);

    // do we need to wait for more to leak?
    const delay = Math.max((level - (limit - 1)) * rate, 0);
    if (delay > 0) {
      await sleep(delay);
    }
  }
}

export async function transformIter<TThing, TResult>(
  iter: AsyncIterator<TThing> | Iterator<TThing>,
  fn: (thing: TThing) => Promise<TResult>
): Promise<IteratorResult<TResult>> {
  const result = await iter.next();
  if (result.done) {
    return { done: true, value: undefined };
  }
  const value = await fn(result.value);
  return { done: false, value };
}

export async function* map<TThing, TResult>(
  upstream: AsyncIterable<TThing> | Iterable<TThing>,
  fn: (thing: TThing) => Promise<TResult>,
  concurrency: number = 1 // pool size
) {
  const iter = isAsyncIterable(upstream)
    ? upstream[Symbol.asyncIterator]()
    : upstream[Symbol.iterator]();
  let result,
    done = false,
    active: Promise<IteratorResult<TResult>>[] = [];

  do {
    while (!done && active.length < concurrency) {
      active.push(transformIter(iter, fn));
    }
    [result, active] = await any_partition(active);
    if (!result!.done) yield result!.value;
    done = done || result!.done === true;
  } while (!done && active.length);
}

export function pool<TThing>(
  upstream: AsyncIterable<TThing> | Iterable<TThing>,
  concurrency: number = 1
) {
  // technically, using map creates an extra promise, but i like less code
  return map(upstream, async (thing) => thing, concurrency);
}
