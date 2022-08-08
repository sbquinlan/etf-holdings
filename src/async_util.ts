
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

export async function* map<TThing, TResult>(
  iter: ChunkyIterator<TThing, unknown>,
  fn: (thing: TThing) => Promise<TResult>,
  concurrency: number = 1, // concurrency
) {
  let active: Promise<TResult>[] = [];
  let results: TResult[] = [];

  // once we create the promise to iterate we need to use it
  // or we could skip or drop elements.
  let iter_prom;
  while (true) {
    const open = Math.max(concurrency - active.length, 0);
    if (!iter_prom && open > 0) {
      iter_prom = iter_prom ?? iter.next(open);
    }

    const [first, ... _rest] = await any_va([
      ... iter_prom ? [iter_prom] : [],
      ... active,
    ]);
    
    if (iter_prom && first) {
      const iter_result = <IteratorResult<TThing[], unknown>>first;
      iter_prom = undefined;
      if (iter_result.done) break;
      
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

  // drain the remaining promises
  while (active.length) {
    await Promise.any(active)
    yield* results;
    results = [];
  }
}