import { Deferred } from './promise.js';

const done_result = Object.freeze({ done: true, value: undefined });

/**
 * A future improvement would be to have this not require two promises on creation.
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

export class ChannelNode<TLeft, TRight> {
  constructor(
    public readonly value: PairedPromise<TLeft, TRight> = new PairedPromise()
  ) {}
  public next?: this;
}

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
    if ((this.sealed = this.sealed || done === true)) {
      const result = Array.from(this.writer, (result) =>
        result.right({ value: undefined, done: true })
      )[0];
      return result;
    }

    const result = this.writer.next();
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
