import { fluent } from './fluent.js';
import { map, sluice, pool, window } from './iterator.js';
import { sink, range } from './iterable.js';
import { sleep } from './promise.js';

describe('sink', () => {
  it('should consume an iterable', async () => {
    const result = await sink(range(10));
    expect(result).toEqual([... range(10)]);
  });
});

describe('sluice', () => {
  it('should work with empty iterator', async () => {
    const result = await sink(
      fluent(
        range(0),
        sluice(3, 100),
      )
    )
    expect(result).toEqual([]);
  });

  it('should work with 1', async () => {
    const start = Date.now();
    const result = await sink(
      fluent(
        range(10),
        sluice(1, 100),
      )
    )
    expect(result).toEqual([... range(10)]);
    expect(Date.now() - start).toBeGreaterThanOrEqual(1000);
  });

  it('should work with 3', async () => {
    const start = Date.now();
    const result = await sink(
      fluent(
        range(10),
        sluice(3, 100),
      )
    )
    expect(result).toEqual([... range(10)]);
    expect(Date.now() - start).toBeGreaterThanOrEqual(800);
  });

  it('should backpressure', async () => {
    const start = Date.now();
    const result = sink(
      fluent(
        range(10),
        map((num: number) => sleep(10).then(() => num)),
        sluice(5, 10),
        sluice(1, 100),
      )
    );
    await expect(result).resolves.toEqual([... range(10)])
    expect(Date.now() - start).toBeGreaterThanOrEqual(1000);
  })

  it('should forwardpressure', async () => {
    const start = Date.now();
    const result = sink(
      fluent(
        range(10),
        map((num: number) => sleep(10).then(() => num)),
        sluice(1, 100),
        sluice(5, 10),
      )
    );
    await expect(result).resolves.toEqual([... range(10)])
    expect(Date.now() - start).toBeGreaterThanOrEqual(1000);
  })

  it('should stop on throw', async () => {
    const pending = sink(
      fluent(
        range(10),
        map(
          async (num: number) => {
            await sleep(10)
            if (num % 6 === 0) {
              throw 'bad';
            }
            return num;
          }
        ),
        sluice(5, 10),
      )
    );
    await expect(pending).rejects.toEqual('bad')
  });
});

describe('pool', () => {
  it('should work on empty iterator', async () => {
    const result = await sink(
      fluent(
        range(0),
        pool(1),
      )
    );
    expect(result).toEqual([]);
  });

  it('should work with pool size 3 on empty iterator', async () => {
    const result = await sink(
      fluent(
        range(0),
        pool(3),
      )
    );
    expect(result).toEqual([]);
  });

  it('should work with pool size 3', async () => {
    const result = await sink(
      fluent(
        range(10),
        pool(3),
      )
    );
    expect(result).toEqual([... range(10)]);
  });

  it('should be unordered', async () => {
    const result = await sink(
      fluent(
        range(10),
        map(
          async (num: number) => {
            const now = Date.now()
            await sleep(num % 3 ? 1 : 100)
            return [num, now, Date.now()]; 
          }
        ),
        pool(5),
      )
    );
    expect(result.map(p => p[0])).toEqual([1, 2, 4, 5, 7, 8, 0, 3, 6, 9])
  })

  it('should be forward pressured', async () => {
    const start = Date.now();
    const probes = await sink(
      fluent(
        range(10),
        map(async () => [Date.now()]),
        sluice(1, 100),
        pool(3),
        map(async (arr) => { arr.push(Date.now()); return arr; }),
      )
    );
    expect(probes[9][0]).toBeGreaterThanOrEqual(start + 700);
    expect(Date.now() - start).toBeGreaterThanOrEqual(1000);
  })

  it('should be back pressured', async () => {
    const start = Date.now();
    const probes = await sink(
      fluent(
        range(10),
        map(async () => Date.now()),
        pool(3),
        sluice(1, 100),
        map(async (s) => [s, Date.now()])
      )
    );
    expect(probes[9][0]).toBeGreaterThanOrEqual(start + 700);
    expect(Date.now() - start).toBeGreaterThanOrEqual(1000);
  })
});

describe('window', () => {
  it('should work on empty iterator', async () => {
    const result = await sink(
      fluent(
        range(0),
        window(1),
      )
    );
    expect(result).toEqual([]);
  });

  it('should work with window size 3 on empty iterator', async () => {
    const result = await sink(
      fluent(
        range(0),
        window(3),
      )
    );
    expect(result).toEqual([]);
  });

  it('should work with window size 3', async () => {
    const result = await sink(
      fluent(
        range(10),
        window(3),
      )
    );
    expect(result).toEqual([... range(10)]);
  });

  it('should be ordered', async () => {
    const result = sink(
      fluent(
        range(10),
        map(
          async (num: number) => {
            await sleep(num % 3 ? 1 : 100)
            return num; 
          }
        ),
        window(3),
      )
    );
    await expect(result).resolves.toEqual([... range(10)])
  })

  it('should be forward pressured', async () => {
    const start = Date.now();
    const result = sink(
      fluent(
        range(10),
        sluice(1, 100),
        window(3),
      )
    );
    await expect(result).resolves.toEqual([... range(10)]);
    expect(Date.now() - start).toBeGreaterThanOrEqual(1000);
  })

  it('should be back pressured', async () => {
    const start = Date.now();
    const probes = await sink(
      fluent(
        range(10),
        map(async () => Date.now()),
        window(3),
        sluice(1, 100),
        map(async (start) => [start, Date.now()])
      )
    );
    expect(probes[9][0]).toBeGreaterThanOrEqual(start + 700);
    expect(Date.now() - start).toBeGreaterThanOrEqual(1000);
  })
});
