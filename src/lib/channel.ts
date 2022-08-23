import { Deferred } from './promise.js';

const done_result = Object.freeze({ done: true, value: undefined });

/**
 * PairedPromise contains two promises (referred to as left and right). Awaiting one promise
 * resolves the other promise. This is useful for doing some concurrent communication. 
 * 
 * TODO: A future improvement would be to have this not require two promises on creation.
 * So when you create a new node on the right side you could just have a resolved promise.
 */
export class PairedPromise<TLeft, TRight> {
  private readonly _left: Deferred<TLeft> = new Deferred<TLeft>();
  private readonly _right: Deferred<TRight> = new Deferred<TRight>();
  constructor() {}

  left(rval: TRight): Promise<TLeft> {
    this._right.resolve(rval);
    return this._left;
  }

  right(lval: TLeft): Promise<TRight> {
    this._left.resolve(lval);
    return this._right;
  }
}

class ChannelNode<TLeft, TRight> {
  constructor(
    public readonly value: PairedPromise<TLeft, TRight> = new PairedPromise()
  ) {}
  public next?: this;
}

/**
 * Channel creates a pumpable iterator. It's useful as a concurrent communication
 * medium.
 * 
 * It enables you to use the iterable utility functions this library provides in cases
 * where you don't have an iterator, but you have maybe an event listener and every time
 * the event is triggered you want to push a new element into an async iterator chain.
 * 
 * Another way to think about it is forward pressure. Async iterators inherently support
 * back pressure, meaning an async iterator calls next at it's pleasure and the upstream 
 * source has to wait. In this case, the upstream source can fulfill the request for next
 * whenever it likes.
 * 
 * A final way to think about this abstraction is that of streams. A readable string is 
 * equivalent to an async iterator. It provides an api for reading from it as fast as you want
 * (and as fast as it'll go). What's the equivalent for a writable stream that writes 
 * into a readable stream? That's where Channel is useful.
 * 
 * The underlying data structure is a linked list with two iterators that can append new nodes 
 * as they need to. For example, if writes outpace reads or reads outpace writes then new 
 * nodes are created to make promises for future fulfillment using PairedPromises.
 * 
 * TODO: Should write the base class that support two way.
 */
export class Channel<T> {
  private readonly writer: IterableIterator<
    PairedPromise<IteratorResult<T>, void>
  >;
  private readonly riter: IterableIterator<
    PairedPromise<IteratorResult<T>, void>
  >;
  private closed: boolean = false;
  private sealed: boolean = false;

  private head: ChannelNode<IteratorResult<T>, void> = new ChannelNode<
    IteratorResult<T>,
    void
  >();
  constructor() {
    this.writer = this.gen(this.head);
    this.riter = this.gen(this.head);
  }

  private *gen(node: ChannelNode<IteratorResult<T>, void> | undefined) {
    do {
      yield node!.value;
      node =
        node!.next ??
        (node!.next = this.sealed
          ? undefined
          : new ChannelNode<IteratorResult<T>, void>());
    } while (node);
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
    // Resolve the pending reads.
    if ((this.sealed = this.sealed || done === true)) {
      return Array.from(this.writer, (result) =>
        result.right({ value: undefined, done: true })
      )[0];
    }

    const result = this.writer.next();
    return result.value.right({ value, done: false });
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
