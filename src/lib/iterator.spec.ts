import { range, collect, leaky, pool } from './iterator.js';

async function* asyncRange(n: number) {
  for await (const x of range(n)) yield x;
}

describe('collect', () => {
  it('should consume an async iterable', async () => {
    const result = await collect(asyncRange(10));
    expect(result).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  // equivalent to Array.from
  it('should consume an iterable', async () => {
    const result = await collect(range(10));
    expect(result).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });
});

describe('leaky', () => {
  it('should work with empty iterator', async () => {
    const iter = asyncRange(0)[Symbol.asyncIterator]();
    const result = await collect(leaky(iter, 3, 100));
    expect(result).toEqual([]);
  });

  it('should work with 1', async () => {
    const start = Date.now();
    const iter = asyncRange(10)[Symbol.asyncIterator]();
    const result = await collect(leaky(iter, 1, 100));
    expect(result).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(Date.now() - start).toBeGreaterThanOrEqual(1000);
  });

  it('should work with 3', async () => {
    const start = Date.now();
    const iter = asyncRange(10)[Symbol.asyncIterator]();
    const result = await collect(leaky(iter, 3, 100));
    expect(result).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(Date.now() - start).toBeGreaterThanOrEqual(800);
  });
});

// this tests map because pool is just the same thing with the identity lambda
describe('map', () => {
  it('should work on empty iterator', async () => {
    const iter = asyncRange(0)[Symbol.asyncIterator]();
    const result = await collect(pool(iter));
    expect(result).toEqual([]);
  });

  it('should work with pool size 3 on empty iterator', async () => {
    const iter = asyncRange(0)[Symbol.asyncIterator]();
    const result = await collect(pool(iter, 3));
    expect(result).toEqual([]);
  });

  it('should work with pool size 3', async () => {
    const iter = asyncRange(10)[Symbol.asyncIterator]();
    const result = await collect(pool(iter, 3));
    expect(result).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });
});
