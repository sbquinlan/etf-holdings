import { range, make_async, map, sink, sluice, pool, window } from './iterator.js';
import { sleep } from './promise.js';

function asyncRange(n: number) {
  return make_async(range(n));
}

describe('sink', () => {
  it('should consume an async iterable', async () => {
    const result = await sink(asyncRange(10));
    expect(result).toEqual([... range(10)]);
  });

  it('should consume an iterable', async () => {
    const result = await sink(range(10));
    expect(result).toEqual([... range(10)]);
  });
});

describe('sluice', () => {
  it('should work with empty iterator', async () => {
    const iter = asyncRange(0)[Symbol.asyncIterator]();
    const result = await sink(sluice(iter, 3, 100));
    expect(result).toEqual([]);
  });

  it('should work with 1', async () => {
    const start = Date.now();
    const iter = asyncRange(10)[Symbol.asyncIterator]();
    const result = await sink(sluice(iter, 1, 100));
    expect(result).toEqual([... range(10)]);
    expect(Date.now() - start).toBeGreaterThanOrEqual(1000);
  });

  it('should work with 3', async () => {
    const start = Date.now();
    const iter = asyncRange(10)[Symbol.asyncIterator]();
    const result = await sink(sluice(iter, 3, 100));
    expect(result).toEqual([... range(10)]);
    expect(Date.now() - start).toBeGreaterThanOrEqual(800);
  });

  it('should backpressure', async () => {
    const start = Date.now();
    const sleepy_nums = map(
      range(10),
      (num: number) => sleep(10).then(() => num)
    );
    const fast = sluice(sleepy_nums, 5, 10);
    const slow = sluice(fast, 1, 100)
    await expect(sink(slow)).resolves.toEqual([... range(10)])
    expect(Date.now() - start).toBeGreaterThanOrEqual(1000);
  })

  it('should forwardpressure', async () => {
    const start = Date.now();
    const sleepy_nums = map(
      range(10),
      (num: number) => sleep(10).then(() => num)
    );
    const slow = sluice(sleepy_nums, 1, 100);
    const fast = sluice(slow, 5, 10)
    await expect(sink(fast)).resolves.toEqual([... range(10)])
    expect(Date.now() - start).toBeGreaterThanOrEqual(1000);
  })

  it('should stop on throw', async () => {
    const sleepy_nums = map(
      range(10),
      async (num: number) => {
        await sleep(10)
        if (num % 6 === 0) {
          throw 'bad';
        }
        return num;
      }
    );
    const fast = sluice(sleepy_nums, 5, 10);
    await expect(sink(fast)).rejects.toEqual('bad')
  });
});

describe('pool', () => {
  it('should work on empty iterator', async () => {
    const iter = asyncRange(0)[Symbol.asyncIterator]();
    const result = await sink(pool(iter));
    expect(result).toEqual([]);
  });

  it('should work with pool size 3 on empty iterator', async () => {
    const iter = asyncRange(0)[Symbol.asyncIterator]();
    const result = await sink(pool(iter, 3));
    expect(result).toEqual([]);
  });

  it('should work with pool size 3', async () => {
    const iter = asyncRange(10)[Symbol.asyncIterator]();
    const result = await sink(pool(iter, 3));
    expect(result).toEqual([... range(10)]);
  });

  it('should be unordered', async () => {
    const sleepy_nums = map(
      range(10),
      async (num: number) => {
        await sleep(num % 3 ? 1 : 100)
        return num; 
      }
    );
    await expect(sink(pool(sleepy_nums, 5))).resolves.toEqual([1, 2, 4, 5, 7, 8, 0, 3, 6, 9])
  })

  it('should be forward pressured', async () => {
    const start = Date.now();
    const source = sluice(range(10), 1, 100);
    const pooled = pool(source, 3);
    await expect(sink(pooled)).resolves.toEqual([... range(10)]);
    expect(Date.now() - start).toBeGreaterThanOrEqual(1000);
  })

  it('should be back pressured', async () => {
    const start = Date.now();
    const sleepy_nums = map(
      range(10),
      async () => Date.now(),
    );
    const pooled = pool(sleepy_nums, 3);
    const limited = sluice(pooled, 1, 100);
    const probes = await sink(limited);
    expect(probes[9]).toBeGreaterThanOrEqual(start + 700);
    expect(Date.now() - start).toBeGreaterThanOrEqual(1000);
  })
});

describe('window', () => {
  it('should work on empty iterator', async () => {
    const iter = asyncRange(0)[Symbol.asyncIterator]();
    const result = await sink(window(iter));
    expect(result).toEqual([]);
  });

  it('should work with window size 3 on empty iterator', async () => {
    const iter = asyncRange(0)[Symbol.asyncIterator]();
    const result = await sink(window(iter, 3));
    expect(result).toEqual([]);
  });

  it('should work with window size 3', async () => {
    const iter = asyncRange(10)[Symbol.asyncIterator]();
    const result = await sink(window(iter, 3));
    expect(result).toEqual([... range(10)]);
  });

  it('should be ordered', async () => {
    const sleepy_nums = map(
      range(10),
      async (num: number) => {
        await sleep(num % 3 ? 1 : 100)
        return num; 
      }
    );
    await expect(sink(window(sleepy_nums, 5))).resolves.toEqual([... range(10)])
  })

  it('should be forward pressured', async () => {
    const start = Date.now();
    const source = sluice(range(10), 1, 100);
    const pooled = pool(source, 3);
    await expect(sink(pooled)).resolves.toEqual([... range(10)]);
    expect(Date.now() - start).toBeGreaterThanOrEqual(1000);
  })

  it('should be back pressured', async () => {
    const start = Date.now();
    const sleepy_nums = map(
      range(10),
      async () => Date.now(),
    );
    const pooled = pool(sleepy_nums, 3);
    const limited = sluice(pooled, 1, 100);
    const probes = await sink(limited);
    expect(probes[9]).toBeGreaterThanOrEqual(start + 700);
    expect(Date.now() - start).toBeGreaterThanOrEqual(1000);
  })
});
