import { ListNode } from './channel'
import { Deferred } from './promise';



export class Producer<T> {
  constructor(private node: ListNode<IteratorResult<T>>) {}

  public async write(value: T, done = false): Promise<void> {
    const node = await this.next();
    const [left, right] = node.value;
    left.resolve({ value, done } as IteratorResult<T>);
    return right;
  }

  // Find a place to write to or create a place to write to
  private async next() {
    let [left, _] = this.node.value;
    while (left.resolved) {
      [left, _] = this.node.value;
      const { done } = await left;
      if (done) {
        throw new Error('Channel closed');
      }
      this.node =
        this.node.next ?? (this.node.next = new ListNode<IteratorResult<T>>());
    }
    return this.node;
  }
}

export class Consumer<T> implements AsyncIterableIterator<T> {
  private done = false;
  constructor(private node: ListNode<IteratorResult<T>>) {}

  public async next() {
    let [left, right] = this.node.value;
    while (right.resolved) {
      [left, right] = this.node.value;
      this.node =
        this.node.next ?? (this.node.next = new ListNode<IteratorResult<T>>());
    }
    const result = await left;
    // REVIEW: this doesn't work. you need to resolve the right before awaiting the left
    // but you won't know if it's done or not
    this.done = this.done || result.done === true;
    if (!this.done) {
      right.resolve();
    }
    return result;
  }

  async *[Symbol.asyncIterator]() {
    return this;
  }
}

/**
 * Kinda strange this is an iterable. It is a sort of way to collect a single,
 * changing value from an iterable.
 */
export class LastResult<T> implements AsyncIterable<T> {
  private closed: boolean = false;
  private buffer: Deferred<IteratorResult<T>> = new Deferred();

  push(value: T, done = false) {
    if (this.closed) {
      throw Error('Closed Channel');
    }
    if (this.buffer.resolved) {
      this.buffer = new Deferred();
    }
    this.buffer.resolve({ value, done });
  }

  async next(): Promise<IteratorResult<T>> {
    return this.closed ? { value: undefined, done: true } : this.buffer;
  }

  async return(value?: T): Promise<IteratorResult<T>> {
    this.closed = true;
    this.buffer.resolve({ value: undefined, done: true });
    return Promise.resolve({ value, done: true });
  }

  [Symbol.asyncIterator]() {
    return this;
  }
}