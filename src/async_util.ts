
export async function to_array<TThing>(
  gen: AsyncIterable<TThing> | Iterable<TThing>
): Promise<Array<TThing>> {
  const arr = [];
  for await (const thing of gen) {
    arr.push(thing);
  }
  return arr;
}

export async function sleep(delay: number) {
  return new Promise((res, _) => { setTimeout(res, Math.max(delay, 0)); })
}

export async function *take<TThing>(n: number, iter: AsyncIterator<TThing>) {
  let value, done = false;
  for (let i = 0; i < n; i++) { 
    ({ done = false, value } = await iter.next());
    if (done) return done;
    yield value;
  }
  return done;
}

export async function with_return<TThing, TReturn>(
  iter: AsyncGenerator<TThing, TReturn>,
): Promise<[TThing[], TReturn]> {
  let value, done;
  const result = [];
  do {
    ({value, done} = await iter.next());
    if (!done) result.push(<TThing>value);
  } while (!done);
  return [result, <TReturn>value];
}

export async function any_va<T extends readonly Promise<unknown>[]>(
  proms: [...T]
): Promise<{ -readonly [P in keyof T]: Awaited<T[P]> | undefined }> {
  if (proms.length === 0) {
    return [] as unknown as { -readonly [P in keyof T]: Awaited<T[P]> };
  }

  return new Promise((res, rej) => {
    for (let i = 0; i < proms.length; i++) {
      proms[i].then(
        (subresult) => { 
          const all_results = new Array(proms.length) as { -readonly [P in keyof T]: Awaited<T[P]> }; 
          all_results[i] = subresult;
          res(all_results);
        },
        rej,
      );
    }
  });
}

export class ChunkyIterator<TThing, TReturn> implements AsyncIterator<TThing[], TReturn, number> {
  private ret?: TReturn;
  constructor(private readonly iter: AsyncIterator<TThing>) {}

  async next(count: number): Promise<IteratorResult<TThing[], TReturn>> {
    const chunk = [];
    let done = false, value;
    for (let i = 0; !done && i < count; i++) { 
      ({ done = false, value } = await this.iter.next());
      if (done) this.ret = <TReturn> value;
      else chunk.push(value);
    }
    /**
     * possibilities:
     * 1. satisfied {count} and not done
     * 2. satisfied {count} and done
     * 3. unsatisfied {count} and done
     * 
     * #2 is tricky
     * We have to return { value: chunk, done: false } and expect another call for
     * { value: this.ret, done: true }.
     * 
     * There is the possibility that count === 0 and the iter previously finished.
     * In this case, we shouldn't wait for a call with count > 0, we should just 
     * return { value: this.ret, done: true }
     * 
     * #3 is tricky
     * 
     * If we did manage to put anything in chunk, then we obviously need to return 
     * that first { value: chunk, done: false } and expect another call for the 
     * { value: this.ret, done: true };
     * 
     * If chunk is empty, then we should return { value: this.ret, done: true }
     * ---- 
     * If chunk.length is truthy, we have to return { done: false, value: chunk }
     * else: done ? { done, value: this.ret } : { done, value: chunk }
     */
    return chunk.length
      ? { done: false, value: chunk }
      : (done ? { done, value: <TReturn>this.ret } : { done, value: chunk })
  }
}

export class LeakyIterator<TThing, TReturn> extends ChunkyIterator<TThing, TReturn> {
  private level: number = 0;
  private last: number = Date.now();

  constructor(
    iter: AsyncIterator<TThing>,
    private readonly limit: number,
    private readonly rate: number,
  ) { 
    super(iter);
  }

  async next(open: number = 1): Promise<IteratorResult<TThing[], TReturn>> {
    // recalc level after leak
    const now = Date.now();
    const leaked = (now - this.last) / this.rate;
    this.last = now;
    this.level = Math.max(this.level - leaked, 0)

    // do we need to wait for more to leak?
    const delay = Math.max((this.level - (this.limit - 1)) * this.rate, 0);
    if (delay > 0) {
      await sleep(delay);
    }

    // number of things to take, it's okay if it's zero
    const to_take = Math.floor(Math.min(
      Math.max(this.limit - this.level, 0),
      open,
    ));
    const result = await super.next(to_take);

    // increment the level
    this.level += Array.isArray(result.value) ? result.value.length : 0;
    return result;
  }
}

export async function* rate_limit<TThing, TResult>(
  iter: ChunkyIterator<TThing, unknown>,
  fn: (thing: TThing) => Promise<TResult>,
  limit: number = 1, // concurrency
) {
  let active: Promise<TResult>[] = [];
  let results: TResult[] = [];

  let iter_prom;
  while (true) {
    const open = Math.max(limit - active.length, 0);
    if (!iter_prom && open > 0) {
      iter_prom = iter_prom ?? iter.next(open);
    }

    const [iter_result, ... _rest] = await any_va([
      ... iter_prom ? [iter_prom] : [],
      ... active,
    ]);
    
    if (iter_prom && iter_result) {
      iter_prom = undefined;
      if ((<IteratorResult<TThing[], unknown>>iter_result).done) break;
      
      // create new promises if the iterator returned
      const promises = (<IteratorYieldResult<TThing[]>>iter_result).value.map(p => fn(p))
      active = [ ... active, ... promises ]
      promises.map(p => p.then((res) => { 
        // REVIEW: I don't love this for state management. 
        active.splice(active.indexOf(p), 1)
        results.push(res)
      }))
    }
    
    yield* results;
    results = [];
  }

  while (active.length) {
    await Promise.any(active)
    yield* results;
    results = [];
  }
}

export async function* limit<TThing, TResult>(
  source: AsyncIterable<TThing>,
  fn: (thing: TThing) => Promise<TResult>,
  limit: number, // bucket size (both concurrent jobs and bucket capacity)
  rate: number,  // ms it takes for 1 spot to leak
) {
  let level = 0;
  let last = Date.now();
  let done = false;
  let active: Promise<TResult>[] = [];
  let results: TResult[] = [];

  const iter = source[Symbol.asyncIterator]();

  while (!done) {
    let things: TThing[] = [], _rest;

    // recalc bucket level
    const now = Date.now();
    const leaked = (now - last) / rate;
    last = now;
    level = Math.max(level - leaked, 0);

    // number of things to take
    const open = Math.floor(Math.min(
      Math.max(limit - level, 0),
      Math.max(limit - active.length, 0),
    ));
    // time til more capacity if at limit
    const delay = Math.max(0, (level - (limit - 1)) * rate);
    const other = [
      // if we are over capacity we should wait til we have more
      ... delay > 0 ? [sleep(delay)] : [],
      // if any of the active finish we should yield the result
      ... active
    ]
    if (open > 0) {
      ([
        [ things, done ], 
        ... _rest
      ] = await any_va([
        with_return<TThing, boolean>(take(open, iter)),
        ... other,
      ]));
    } else {
      await Promise.any(other);
    }
    
    // create new promises if the iterator returned
    level += things.length;
    const promises = things.map(p => fn(p))
    active = [ ... active, ... promises ]
    promises.map(p => p.then((res) => { 
      // REVIEW: I don't love this for state management. 
      active.splice(active.indexOf(p), 1)
      results.push(res)
    }))
    
    console.log(results);
    yield* results;
    results = [];
  }
}