export async function to_array<TThing>(
  gen: AsyncIterable<TThing> | Iterable<TThing>
): Promise<Array<TThing>> {
  const arr = [];
  for await (const thing of gen) {
    arr.push(thing);
  }
  return arr;
}

export function *take<TThing>(n: number, iter: Iterator<TThing>) {
  let value, done = false;
  for (let i = 0; i < n; i++) { 
    ({ done = false, value } = iter.next());
    if (done) return done;
    yield value;
  }
  return done;
}

export function with_return<TThing, TReturn>(
  iter: Generator<TThing, TReturn>,
): [TThing[], TReturn] {
  let value, done;
  const result = [];
  do {
    ({value, done} = iter.next());
    if (!done) result.push(<TThing>value);
  } while (!done);
  return [result, <TReturn>value];
}


/**
 * This kind of works but it doesn't support parallelism. Normally you'd 
 * allow limit things to run in parallel, but this implementation just allows 
 * allows limit things to run within a certain time period, sequentially. 
 * 
 * If you say the limit is 3 and the rate is 1000, that means the bucket is 3
 * big, but leaks 1 per second. So if the bucket hasn't been filled you could
 * run 3 things in the first second assuming that the "things" take less than 300 ms.
 * 
 * To support parallelism this thing would have to be more interactive with the upstream.
 * It would have to go:
 * 
 * Current capacity is N
 * Ask for N things
 * Get M things
 * Run M things in parallel, don't wait
 * Increment capacity
 * If at or over capacity, wait X ms for capacity to run more
 * Update capacity
 * 
 * Basically the await on the async iterator should just waiting for more jobs to appear
 * not running the rate limited work you see?
 * 
 * So I think there's two ways to do this:
 * 1. You have the source give you promise constructors. map_gen is not this thing because 
 * it awaits the promise it creates when you call next() on it. So you have to wait for the 
 * promise you created to be done. That's the error in map_gen. What you really want is it 
 * to give you an unawaited promise (which I'm guessing makes Awaited<> useful) to run 
 * with other promises. But you can't yield a promise from an async gen.
 * 
 * 2. You have a source that gives you thingg as you ask for them, you construct the promise and
 * manage awaiting results. The problem is that it's really hard to yield the results. If you yield
 * an unawaited promise then you'll wait for it to finish. There doesn't seem to be a way to not await
 * the promises. 
 * 
 * 3. You have the source give you things as you ask for them, you output those things at a rate, 
 * you don't construct promises. Whatever is downstream is free to construct the promises into a 
 * sink and await all. The only thing that sucks about not being involved in the promises is concurrency.
 * If you want limit to mean only N things can be running at the same time maximally, then you'll need
 * actually look out for reaching that number of running promises and wait for them to be done.
 * 
 * Assuming we actually do care about concurrent jobs. Then we need to change the logic a bit:
 * 
 * Calculate extra capacity N:
 *   Calculate space in bucket B
 *   Calculate available jobs space J
 *   N = min(B, J)
 * If N == 0:
 *   If J == 0:
 *      wait for any jobs to resolve.
 *   If B == 0:
 *      wait for more capacity
 * Add N jobs to active
 */
export async function* rate_limit<TThing, TResult>(
  source: Iterable<TThing>,
  fn: (thing: TThing) => Promise<TResult>,
  limit: number, // bucket size (both concurrent jobs and bucket capacity)
  rate: number,  // ms it takes for 1 spot to leak
) {
  let level = 0;
  let last = Date.now();
  let done = false;
  let active: Promise<TResult>[] = [];
  let results: TResult[] = [];

  const iter = source[Symbol.iterator]();

  while (!done) {
    // recalc bucket level (ignoring capacity)
    const now = Date.now();
    const leaked = (now - last) / rate;
    last = now;

    level = Math.max(0, level - leaked);
    const open = Math.min(
      Math.max(limit - level, 0),
      Math.max(limit - active.length, 0),
    );

    let things; ([ things, done ] = with_return(take(Math.floor(open), iter)));
    level += things.length;

    // new promises, add to active, remove when completed, add resolved to results
    const promises = things.map(p => fn(p))
    active = [ ... active, ... promises ]

    // TODO: I don't love this for state management. I think more centralized state management
    // would be great. If I could key the promises, 
    promises.map(p => p.then((res) => { 
      active.splice(active.indexOf(p), 1)
      results.push(res)
    }))

    const delay = Math.max(0, (level - (limit - 1)) * rate);
    if (delay > 0 || active.length >= limit) {
      // include the delay promise if we need to wait
      // any finished promise should trigger returning results
      await delay > 0 
        ? Promise.any([
            ... active,
            new Promise((res, _) => { setTimeout(res, delay); })
          ])
        : Promise.any(active);
    }

    yield* results;
    results = [];
  }
}

// this is the original implementation that doesn't do parallel
export async function* limit<TThing>(
  list: Iterable<Promise<TThing>>,
  limit: number,
  rate: number
) {
  let level = 0;
  let last = Date.now();
  for (const thing of list) {
    yield thing;

    // update the level based on time spent awaiting and add 1
    const now = Date.now();
    const leaked = (now - last) / rate;
    level = Math.max(0, level - leaked + 1);
    last = now;

    // if we've exceeded our capacity, then wait til it drains to have space for one
    const delay = Math.max(0, (level - (limit - 1)) * rate);
    if (delay > 0) {
      await new Promise((res, _) => { setTimeout(res, delay); });
    }
  }
}