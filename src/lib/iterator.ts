import { OperatorAsyncFunction } from './fluent.js';
import { upsync } from './iterable.js';
import { sleep, any_partition } from './promise.js';

class MappingIterator<TThing, TResult> implements AsyncIterableIterator<Awaited<TResult>> {
  private readonly iter: AsyncIterator<TThing>;
  private done: boolean = false;
  constructor(
    upstream: AsyncIterable<TThing> | Iterable<TThing>,
    private readonly call: (thing: TThing) => TResult,
  ) {
    this.iter = upsync(upstream)[Symbol.asyncIterator]()
  }

  async next(): Promise<IteratorResult<Awaited<TResult>, any>> {
    if (this.done) {
      return { value: undefined, done: true };
    }
    const { value, done } = await this.iter.next();
    this.done = this.done || done === true;
    return { value: done ? value : await this.call(value), done };
  }

  [Symbol.asyncIterator]() {
    return this;
  }
}

class LeakyBucketIterable<TThing> implements AsyncIterableIterator<TThing> {
  private readonly iter: AsyncIterator<TThing>;
  private readonly limit: number;
  private readonly rate: number;

  private level: number = 0;
  private last: number = Date.now();
  private done: boolean = false;
  constructor(
    upstream: AsyncIterable<TThing> | Iterable<TThing>,
    limit: number,
    rate: number,
  ) {
    this.iter = upsync(upstream)[Symbol.asyncIterator]()
    this.limit = Math.floor(Math.max(1, limit));
    this.rate = Math.floor(Math.max(0, rate));
  }

  async next(): Promise<IteratorResult<TThing, any>> {
    // calc leaked amount
    const now = Date.now();
    const leaked = (now - this.last) / this.rate;
    this.last = now;

    // update level
    this.level = Math.max(this.level - leaked + 1, 0);

    // do we need to wait for more to leak?
    const delay = Math.max((this.level - this.limit) * this.rate, 0);
    if (delay > 0) {
      await sleep(delay);
      if (this.done) {
        return { done: true, value: undefined };
      }
    }
    const result = await this.iter.next();
    this.done = this.done || result.done === true;
    return result;
  }

  [Symbol.asyncIterator]() {
    return this;
  }
}


class PoolIterable<TThing> implements AsyncIterable<TThing> {
  private readonly concurrency: number;
  constructor(
    private upstream: AsyncIterable<TThing> | Iterable<TThing>,
    concurrency: number
  ) {
    this.concurrency = Math.floor(Math.max(0, concurrency))
  }

  async *[Symbol.asyncIterator]() {
    const iter = upsync(this.upstream)[Symbol.asyncIterator]()
    let result,
      done = false,
      active: Promise<IteratorResult<TThing>>[] = [];
  
    do {
      while (!done && active.length < this.concurrency) {
        active.push(iter.next());
      }
      [result, active] = await any_partition(active);
      done = done || result?.done === true;
      if (!result?.done) {
        yield result!.value;
      }
    } while (!done || active.length);
  }
}

class WindowIterable<TThing> implements AsyncIterable<TThing> {
  private readonly concurrency: number;
  constructor(
    private upstream: AsyncIterable<TThing> | Iterable<TThing>,
    concurrency: number
  ) {
    this.concurrency = Math.floor(Math.max(0, concurrency))
  }

  protected async settleBuffer(
    active: Promise<IteratorResult<TThing>>[],
  ): Promise<[IteratorResult<TThing> | undefined, Promise<IteratorResult<TThing>>[]]> {
    const result = await active[0]
    return [result, active.slice(1)];
  }

  async *[Symbol.asyncIterator]() {
    const iter = upsync(this.upstream)[Symbol.asyncIterator]()
    let result,
      done = false,
      active: Promise<IteratorResult<TThing>>[] = [];
  
    do {
      while (active.length < this.concurrency) {
        active.push(iter.next());
      }
      [result, active] = await this.settleBuffer(active);
      done = done || result?.done === true;
      if (!result?.done) {
        yield result!.value;
      }
    } while (!done);
  }
}

/**
 * map() is extremely similar to Array.map() with the 
 * added benefit that it can be used over iterators.
 */
export function map<TThing, TResult>(
  call: (thing: TThing) => TResult,
): OperatorAsyncFunction<TThing, Awaited<TResult>> {
  return (upstream: AsyncIterable<TThing> | Iterable<TThing>) => 
    new MappingIterator(upstream, call);
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
export function sluice<TThing>(
  limit: number,
  rate: number,
): OperatorAsyncFunction<TThing, TThing> {
  return (upstream: AsyncIterable<TThing> | Iterable<TThing>) => 
    new LeakyBucketIterable(upstream, limit, rate);
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
export function pool<TThing>(
  concurrency: number = 1 // pool size
): OperatorAsyncFunction<TThing, TThing> {
  return (upstream: AsyncIterable<TThing> | Iterable<TThing>) => 
    new PoolIterable(upstream, concurrency);
}

/**
 * Ordered version of pool().
 * 
 * This will maintain the order of the upstream iterator rather
 * than reordering based on what promises finish first. The difference
 * being that pool() uses a Promise.any() like approach to waiting
 * for the concurrently running promises.
 */
export function window<TThing>(
  concurrency: number = 1 // window size
): OperatorAsyncFunction<TThing, TThing> {
  return (upstream: AsyncIterable<TThing> | Iterable<TThing>) => 
    new WindowIterable(upstream, concurrency)
}