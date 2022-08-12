
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

type OptionalMappedPromises<T extends readonly Promise<unknown>[]> = { -readonly [P in keyof T]: Awaited<T[P]> | undefined };
export async function any_va<T extends readonly Promise<unknown>[]>(
  proms: [...T]
): Promise<OptionalMappedPromises<T>> {
  if (proms.length === 0) {
    return [] as unknown as OptionalMappedPromises<T>;
  }

  return new Promise((res, rej) => {
    for (let i = 0; i < proms.length; i++) {
      proms[i].then(
        (subresult) => { 
          const all_results = new Array(proms.length) as OptionalMappedPromises<T>; 
          all_results[i] = subresult;
          res(all_results);
        },
        rej,
      );
    }
  });
}

// basically like const [resolved, ... rest] = Promise.any([]) if it worked that way. 
export async function any_partition<T extends never[] | readonly Promise<unknown>[]>(
  proms: T,
): Promise<[T extends never[] ? undefined : Awaited<T[number]>, Promise<unknown>[]]> {
  if (proms.length === 0) {
    return [undefined, []] as any;
  }

  return new Promise((res, rej) => {
    for (let i = 0; i < proms.length; i++) {
      proms[i].then(
        (subresult) => {
          res([subresult as any, proms.slice().splice(i, 1)]);
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
    // only create a promise if we aren't already waiting on the iter.
    // don't create a iter.next(0) promise, because it's a noop
    const open = Math.max(concurrency - active.length, 0);
    if (!iter_prom && open > 0) {
      iter_prom = iter_prom ?? iter.next(open);
    }

    // I hate doing this:
    // if (active.length && iter_prom) {
    //   ([
    //     iter_result,
    //     [result, active]
    //   ] = await any_va([
    //     iter_prom,
    //     any_partition(active)
    //   ]))
    // } else if (active.length) {
    //   ([result, active] = await any_partition(active))
    // } else {
    //   iter_result = await iter_prom;
    // }
    /**
     * There's 3-ish things that would be nice to abstract out:
     * 1. An async iter that knows when I took the result or not, but being a middle layer and 
     * doing the any() call itself, advancing the iter that returned first and keeping the others
     * for another iteration until all are exhausted.
     * 
     * 2. The "pausing" of an iter when it doesn't have anything to advance through like when 
     * active is empty or open is zero or iter is done. In those cases, the promise would return
     * instantly, using cpu for noop and preventing the other promises from advancing.
     * 
     * I want to note that "pausing" can alternatively be solved by waiting for another iterator.
     * Like active being empty is really just waiting for the iter to enqueue more work. The iter
     * being called with zero is really just waiting for active to finish. So there's like this 
     * circular dependency that's hard to abstract. Where iterators are waiting on each other in 
     * some cases. I basically want to cleanly distill that into a clean pattern.
     * 
     * 3. It's related to 2, but basically having the types match up with the arguments so that 
     * we can set variables inline without having to do a bunch of parsing of the return.
     * 
     * I think it's probably possible to write an async iterator that takes N iterators, uses
     * any_va to await all the iterators, returning the result of the one that finishes and 
     * advancing the iterator with another promise. That's relatively straightforward. 
     * 
     * Two problems with that idea:
     * #2 kind of fucks that abstraction up. There's no way for an iterator to say "uh just go on 
     * without me for a bit until I'm ready again" You could kind of solve that by having the 
     * iterators dependent on each other. Like active will have more to wait for when the 
     * iter.next() can get more jobs. Similarly, we can call iter.next when there's more
     * space for jobs to run. Being able to interact between iterators is interesting.
     * 
     * #3 this iterator would just return something and we would have to inspect the result 
     * to understand what to do. If it's a result of iter.next then we need to put more jobs 
     * in the queue, and if it's job results then return those and keep going. 
     * 
     * The other idea is that this is basically the event loop at it's core. I'm basically 
     * writing an infinite loop that waits for tasks to run. I'm abstracting this out until
     * all I'm left with is some loop that manages tasks, which JS is already providing for 
     * me. I should be able to just set up the network of async code and await the result 
     * rather than writing the loop.
     * 
     * One way to do that might be to use the web streams. This is more or less a very similar 
     * pattern. I have units that I'm pushing through a pipeline and there's some backpressure
     * from the capacity of the job mapper. There's buffering of jobs and there's producers and 
     * consumers. Plus, it's completely compatible with generators/iterators. 
     * 
     * I feel like that might not be fun though. While it can support async generators and 
     * iterators, the api for backpressure and all that is quite heavy. Adds an extra bit
     * of learning to reading the code. It's like knowing how async / await + Promises work, 
     * but with a little more overhead.
     */
    const [first, ... _rest] = await any_va([
      ... iter_prom ? [iter_prom] : [],
      ... active,
    ]);

    // const [doneover, leftover] = await any_partition(active);
    
    // we waited for the iter and the result is non-null
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

  /**
   * It's like you're making a ladder. 
   * The promise you wait for here is resolved by the read(). The promise read() waits for is 
   * resolved by the write. The main mechanism for passing the data on is that read returns 
   * a promise that write resolves.
   * 
   * The tricky thing is that read or write can be called continuously without a paired call
   * to the other handler. So you have to create a new promise every time a method is called. 
   * Basically both methods are paired iterators. 
   * 
   * For example if you call read over and over, it creates promises, queueing the resolves 
   * for the write handler to iterate through. 
   * 
   * If you call write over and over it creates paired promises: 
   * a resolved promise that has the data for read to return
   * an unresolved promise that write returns, resolved when the data written is read. 
   * ("read" meaning that the resolved promise is returned from read())
   * 
   * If you call read over and over it creates paired promises:
   * an unresolved promise to return to the called that write will de-queue and resolve.
   * a resolved promise for write to wait on, basically saying that data written is 
   * immediately resolved.
   * 
   * Call write a bunch:
   * | read cursor | write cursor | read promise  | write promise |
   * |-------------|--------------|---------------|---------------|
   * | *           |              |  resolved(0)  | unresolved    |
   * |             |              |  resolved(1)  | unresolved    |
   * |             |              |  resolved(2)  | unresolved    |
   * |             | *            |  resolved(3)  | unresolved    |
   * 
   * Set the write promise, resolve the read promise, wait for the write promise to be resolved.
   */
  /**
 * I'm not sure what to do. The promise linked list thing is cool,
 * but the api doesn't quite make sense. Like having setNext() on a node
 * and then using that to append nodes is strange. You'd basically be writing 
 * an iterator that writes. It's not terrible but it's just like I have this collection of
 * functions that act on the AsyncNode. 
 * 
 * I also don't even like having getNext and setNext on the node itself. It's so
 * barebones anyways, I just want it to be pure data structure.
 * 
 * Another problem is that the next is a FlatPromise to be resolved separately because
 * I can't think of another way to separately resolve the next and iterators forward async.
 * 
 * Idk what to do really. I like need an iterator that adds a node as it goes. I need a iterator
 * that waits for next to be resolved. 
 * 
 * I need one thing that the next links are proper promises. And there's some promise creator right
 * like a async funciton or something. And so iterators when wait on next, they're really just waiting
 * on this function. It's like an on demand thing. As fast as the iterator can read it and as fast as the
 * function can do, you know?
 * 
 * The opposite is the links are the resolvable promises. So like the iterator is not free to create 
 * new promises, it has to wait for promises to be created and resolved. Like when a node is created
 * it'll have the next promise sitting there, waiting and something else will resolve it a similar node. 
 * 
 * But in the other case. The iterator just slaps another fucker on there. You know? Like it just calls the 
 * next promise waits on it. 
 * 
 * I mean at their core they really aren't that different honestly. Like it's just a promise for the next.
 * But I guess these two things are pretty significantly different.
 * 
 * It's sort of like a do-while and a while loop. Like the do while will iterate first before waiting.
 * That's like there's a node and it has it's promise already. The other is like a while. Where you have
 * wait for the next immediately. They're sort of similar but there's different in subtle that make
 * them hard to unify in one abstraction.
 * 
 * But yeah I mean the queue thing is certainly promising. I just dont know how to write. Like 
 * I could return at thing that appends and an iterator. So that like things can append to this
 * appendy thing and the iterator is free to do whatever it wants.
 * 
 * I guess the other thing is like paired iterators acting on the same thing you know and like 
 * the leading iterator adds the next link and waits on it? dude idk. The building blocks of this
 * aren't really great to easily building abstractions.
 */

type PromiseResolve<T> = (value: T | PromiseLike<T>) => void;
type PromiseReject = (reason?: any) => void;
class FlatPromise<T> extends Promise<T> {
  public readonly resolve: PromiseResolve<T>;
  public readonly reject: PromiseReject;
  public readonly resolved: boolean = false;
  public readonly rejected: boolean = false;

  constructor() {
    let temp_res: PromiseResolve<T>, temp_rej: PromiseReject;
    super((res, rej) => { temp_res = res; temp_rej = rej; })
    // @ts-ignore setting readonly in the constructor sorta.
    this.then(() => { this.resolved = true }, () => { this.rejected = true });
    this.resolve = temp_res!;
    this.reject = temp_rej!;
  }

  public get settled() {
    return this.resolved || this.rejected;
  }
}

class AsyncNode<T> implements AsyncIterable<T> {
  private innerNext?: Promise<this>;

  constructor(
    public value: T, 
    private promiseCreator: () => Promise<AsyncNode<T>>,
  ) { }
  
  /**
   * Don't start the promise in the constructor, because that 
   * could start infinite recursion.
   */
  public get next(): Promise<this> {
    if (!this.innerNext) {
      this.innerNext = this.promiseCreator() as Promise<this>;
    }
    return this.innerNext;
  }

  /**
   * Keep in mind that this iterates from the node it's called on.
   * This doesn't magically start from the head of a list or tail.
   */
  async *[Symbol.asyncIterator](
  ): AsyncIterableIterator<T> {
    let node = this;
    do {
      yield node.value
      node = await node.next;
    } while (node);
  }
}

class FlatAsyncNode<T> extends AsyncNode<T> {
  constructor(
    value: T
  ) {
    super(value, () => new FlatPromise());
  }

  // maybe I can use generics for this but idk
  public get next(): FlatPromise<this> {
    return super.next as FlatPromise<this>;
  }
}

class NodeAppender<T> {
  constructor(private tail: FlatAsyncNode<T>) { }
  
  public async append(val: T) {
    while (this.tail.next.settled) {
      this.tail = await this.tail.next;
    }
    this.tail.next.resolve(new FlatAsyncNode(val));
  }
}

/**
 * Though this probably works, it's stupid. The iterators could get really far 
 * in front of each other. If the read iterator isn't actually waiting for the 
 * read promise to resolve then it'll just create a ton of nodes in the linked 
 * list.
 * 
 * A solution would be a more complicated iterator that knew the distance between
 * itself and the other iterator, waiting for that distance to decrease when it 
 * gets too great. The iterator waiting would stop the read iteration.
 * 
 * The other thing that's potentially dumb is the read() using a loop on the iterator.
 * I don't know what that does. I think it might make another iterator everytime it's
 * called without changing the start of the internal iterator? Honestly I don't know.
 */
export class Pipe<T, TPromiseTuple extends [FlatPromise<T>, FlatPromise<void>]> {
  private readIter: AsyncIterableIterator<TPromiseTuple>;
  private writeIter: AsyncIterator<TPromiseTuple>;

  constructor() {
    const tuple_ctor = () => [new FlatPromise<T>(), new FlatPromise<void>()] as TPromiseTuple;
    const node_ctor: () => AsyncNode<TPromiseTuple> = 
      () => new AsyncNode(tuple_ctor(), async () => node_ctor());
    const head = node_ctor();
    this.readIter = head[Symbol.asyncIterator]();
    this.writeIter = head[Symbol.asyncIterator]();
  }

  public async write(value: T): Promise<void> {
    const { value: proms, done = false } = await this.writeIter.next();
    if (done) throw new Error("closed pipe");

    const [ rprom, wprom ] = proms;
    rprom.resolve(value);
    return wprom;
  } 

  public async *read(): AsyncIterator<T> {
    for await (const [ rprom, wprom ] of this.readIter) {
      wprom.resolve();
      yield await rprom;
    }
  }
}

function pair_iters() {
  
}