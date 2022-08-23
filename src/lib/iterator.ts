import { sleep, any_partition } from './promise.js';

/**
 * TODOs:
 * - No tests on throwing inside an iterable
 */

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

export async function *make_async<TThing>(
  upstream: Iterable<TThing>,
) {
  for await (const thing of upstream) yield thing;
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
  const arr = [];
  for await (const thing of upstream) {
    arr.push(thing);
  }
  return arr;
}
/**
 * You might expect map() to be as simple as: 
 * 
 * ```
 * async function *map(...) {
 *   for await (const thing of upstream) yield call(thing)
 * }
 * ```
 * 
 * Which does work, in that it yields Awaited<TResult>. The issue is that
 * ```yield call(thing)``` will wait for the ```call(thing)``` to settle 
 * before yielding. Basically async generator's cannot directly yield
 * unsettled promises. This detail fucks up the other async iteration util
 * functions, which rely on map not waiting on promises, but constructing 
 * the promises and yielding them immediately.
 */
class MappingIterator<TThing, TResult> implements AsyncIterableIterator<TResult> {
  private readonly iter: AsyncIterator<TThing>;
  constructor(
    upstream: AsyncIterable<TThing> | Iterable<TThing>,
    private readonly call: (thing: TThing) => TResult,
  ) {
    this.iter = isAsyncIterable(upstream)
      ? upstream[Symbol.asyncIterator]()
      : make_async(upstream)
  }

  async next(): Promise<IteratorResult<TResult, any>> {
    const { value, done } = await this.iter.next();
    return { value: done ? value : await this.call(value), done };
  }

  [Symbol.asyncIterator]() {
    return this;
  }
}

/**
 * map() is extremely similar to Array.map() with the 
 * added benefit that it can be used over iterators.
 */
export function map<TThing, TResult>(
  upstream: AsyncIterable<TThing> | Iterable<TThing>,
  call: (thing: TThing) => TResult,
) {
  return new MappingIterator(upstream, call);
}

/**
 * sluice() is a "leaky bucket" implementation for rate limiting. 
 * 
 * Every iteration adds 1 to the bucket. If the bucket is at it's 
 * limit then it sleeps until the leak rate would make space for 
 * 1 more unit in the bucket. 
 * 
 * Imagine a bucket that leaks at set rate (1 "unit" per <rate> ms) with a 
 * <limit> capacity. For example, you could have a bucket that leaks 1 "unit" 
 * every 1000 ms (or 1 sec) and has a capacity of 3. This bucket could
 * burst 3 iterations until it hits the limit of 3, then wait 1 second 
 * until the next iteration.
 */
export async function* sluice<TThing>(
  upstream: AsyncIterable<TThing> | Iterable<TThing>,
  limit: number,
  rate: number
) {
  limit = Math.floor(Math.max(1, limit));
  rate = Math.floor(Math.max(0, rate));

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

/**
 * Creates a concurrent collection of awaited promises. 
 * 
 * This is most useful when the upstream async iterator
 * creates promises on calls to next(). If upstream is a 
 * collection of already running promises, then this only 
 * reorders the upstream based on a sliding window of which 
 * promises resolve first. 
 */
export async function* pool<TThing>(
  upstream: AsyncIterable<TThing> | Iterable<TThing>,
  concurrency: number = 1 // pool size
): AsyncGenerator<Awaited<TThing>> {
  concurrency = Math.floor(Math.max(0, concurrency))
  const iter = isAsyncIterable(upstream)
    ? upstream[Symbol.asyncIterator]()
    : make_async(upstream);
  let result,
    done = false,
    active: Promise<IteratorResult<TThing>>[] = [];

  do {
    while (!done && active.length < concurrency) {
      active.push(iter.next());
    }
    [result, active] = await any_partition(active);
    if (!result?.done) yield result!.value;
    done = done || result?.done === true;
  } while (!done || active.length);
}

/**
 * Ordered version of pool().
 * 
 * This will maintain the order of the upstream iterator rather
 * than reordering based on what promises finish first. The difference
 * being that pool() uses a Promise.any() like approach to waiting
 * for the concurrently running promises.
 */
export async function* window<TThing>(
  upstream: AsyncIterable<TThing> | Iterable<TThing>,
  concurrency: number = 1 // pool size
): AsyncGenerator<Awaited<TThing>> {
  concurrency = Math.floor(Math.max(0, concurrency))
  const iter = isAsyncIterable(upstream)
    ? upstream[Symbol.asyncIterator]()
    : make_async(upstream);
  let done = false,
    active: Promise<IteratorResult<TThing>>[] = [];

  do {
    while (!done && active.length < concurrency) {
      active.push(iter.next());
    }
    let result = await active[0]
    active = active.slice(1);
    if (!result?.done) yield result!.value;
    done = done || result?.done === true;
  } while (!done || active.length);
}