import { Deferred } from './promise';

/**
 * Based on Channel from 'queueable'
 */
const done_result = Object.freeze({ done: true, value: undefined });

export class PairedPromise<TLeft, TRight> {
  private readonly _left: Deferred<TLeft> = new Deferred<TLeft>();
  private readonly _right: Deferred<TRight> = new Deferred<TRight>();
  constructor() {}
  
  leftResolved(): boolean {
    return this._left.resolved;
  }

  left(rval: TRight): Promise<TLeft> {
    this._right.resolve(rval);
    return this._left;
  }
  
  rightResolved(): boolean { 
    return this._right.resolved;
  }
  
  right(lval: TLeft): Promise<TRight> {
    this._left.resolve(lval);
    return this._right;
  }
}

export class Channel<T> implements AsyncIterable<T> {
  private readonly queue: PairedPromise<IteratorResult<T>, void>[] = [];
  private closed = false;
  private sealed = false;

  // filter is true if push
  pushOrShift(
    filter: (pair: PairedPromise<IteratorResult<T>, void>) => boolean,
  ): PairedPromise<IteratorResult<T>, void> {
    if (!this.sealed && (!this.queue.length || filter(this.queue[0]))) {
      const pair = new PairedPromise<IteratorResult<T>, void>();
      this.queue.push(pair);
      return pair;
    }
    return this.queue.shift()!;
  }

  async next(): Promise<IteratorResult<T>> {
    if (this.closed) {
      return Promise.resolve(done_result);
    }
    const pair = this.pushOrShift(p => p.rightResolved());
    const { value, done = false } = await pair.left();
    this.closed = this.closed || done;
    return { value, done };
  }

  push(value: T, done: boolean = false) {
    if (this.sealed || this.closed) {
      throw Error('Closed Channel');
    }
    // need a separate flag to support the read side flushing after write side seals
    this.sealed = this.sealed || done === true;
    const pair = this.pushOrShift(p => p.leftResolved());
    return pair.right({ value, done })
  }

  async return(value?: T): Promise<IteratorResult<T>> {
    this.close();
    return { done: true, value };
  }

  [Symbol.asyncIterator]() {
    return this;
  }

  // only for the reader closing the channel
  private close(): void {
    if (this.closed) return;

    this.closed = true;
    this.queue.forEach((pair) => {
      pair.right(done_result)
      pair.left();
    });
    this.queue.splice(0, this.queue.length);
  }
}

/**
 * Using Linked List
 */

export class ListNode<TLeft, TRight> {
  constructor(
    public readonly value: PairedPromise<TLeft, TRight> = new PairedPromise(),
  ) {}
  public next?: this;
}

export class NodeChannel<T> {
  private readonly writer: IterableIterator<PairedPromise<IteratorResult<T>, void>>;
  private readonly riter: IterableIterator<PairedPromise<IteratorResult<T>, void>>;
  private closed: boolean = false;
  private sealed: boolean = false;

  private head: ListNode<IteratorResult<T>, void> = new ListNode<IteratorResult<T>, void>();
  constructor() {
    this.writer = this.gen(this.head);
    this.riter = this.gen(this.head);
  }

  private *gen(node: ListNode<IteratorResult<T>, void> | undefined) {
    do {
      yield node!.value;
      node = node!.next ?? (node!.next = this.sealed ? undefined : new ListNode<IteratorResult<T>, void>());
    } while (node)
  }

  async next(): Promise<IteratorResult<T>> {
    if (this.closed) {
      return done_result;
    }
    
    const maybe_node = this.riter.next();
    if (maybe_node.done) {
      this.closed = maybe_node.done;
      return done_result;
    }
    
    return maybe_node.value.left();
  }

  async push(value: T, done = false): Promise<void> {
    if (this.sealed || this.closed) {
      throw Error('Closed Channel');
    }
    if (this.sealed = this.sealed || done === true) {
      const result = Array.from(
        this.writer, 
        (result) => result.right({ value: undefined, done: true })
      )[0];
      return result;
    }
     
    const result = this.writer.next()
    const prom = result.value.right({ value, done: false });
    return prom;
  }

  async return(value?: T): Promise<IteratorResult<T>> {
    this.close();
    return { done: true, value };
  }

  [Symbol.asyncIterator]() {
    return this;
  }

  // only for the reader closing the channel
  private close(): void {
    if (this.closed) return;
    this.closed = true;
  }
}
