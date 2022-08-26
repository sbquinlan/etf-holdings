import { Channel, PairedPromise } from './channel.js';
import { sink } from './iterable.js';

describe('Paired Promise', () => {
  it('should resolve right', async () => {
    const pair = new PairedPromise<number, void>();
    pair.right(10);
    expect((<any>pair)._left.resolved).toEqual(true);
    expect((<any>pair)._right.resolved).toEqual(false);
    expect(await pair.left()).toEqual(10);
    expect((<any>pair)._left.resolved).toEqual(true);
    expect((<any>pair)._right.resolved).toEqual(true);
  });

  it('should resolve left', async () => {
    const pair = new PairedPromise<void, number>();
    pair.left(10);
    expect((<any>pair)._right.resolved).toEqual(true);
    expect((<any>pair)._left.resolved).toEqual(false);
    expect(await pair.right()).toEqual(10);
    expect((<any>pair)._right.resolved).toEqual(true);
    expect((<any>pair)._left.resolved).toEqual(true);
  });
});

describe('Channel', () => {
  it('should pass a value', async () => {
    const chan = new Channel();

    chan.push(10);
    expect((await chan.next()).value).toEqual(10);
  });

  it('should pass values', async () => {
    const chan = new Channel();

    chan.push(10);
    chan.push(9);
    expect((await chan.next()).value).toEqual(10);
    expect((await chan.next()).value).toEqual(9);
  });

  it('should pass values to an iterator', async () => {
    const chan = new Channel();

    chan.push(10);
    chan.push(9);
    chan.push(8);
    chan.push(7, true);
    const result = sink(chan);
    expect(await result).toEqual([10, 9, 8]);
  });

  it('should pass values to an iterator created before push', async () => {
    const chan = new Channel();
    const result = sink(chan);

    chan.push(10);
    chan.push(9);
    chan.push(8);
    chan.push(7, true);
    expect(await result).toEqual([10, 9, 8]);
  });

  it('should handle a trailing seal', async () => {
    const chan = new Channel();

    const reads = Promise.all([chan.next(), chan.next(), chan.next()]);
    chan.push(10);
    chan.push(9, true);

    expect(await reads).toEqual([
      { value: 10, done: false },
      { value: undefined, done: true },
      { value: undefined, done: true },
    ]);
  });

  it('should handle reader closing', async () => {
    const chan = new Channel();

    chan.push(10);
    chan.push(9);
    await chan.next();
    expect(await chan.return()).toEqual({ value: undefined, done: true });
  });

  it('should throw on writing after sealed', async () => {
    const chan = new Channel();
    chan.push(undefined, true);
    await expect(chan.push(10)).rejects.toThrow();
  });

  it('should throw on writing after closed', async () => {
    const chan = new Channel();
    chan.push(10);
    chan.push(9);
    chan.push(8);
    chan.next();
    chan.return(undefined);
    await expect(chan.push(7)).rejects.toThrow();
  });
});
