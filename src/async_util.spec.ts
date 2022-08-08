import { map, sleep, to_array, any_va, LeakyIterator } from './async_util';

async function* asyncRange(n: number) {
  for (let i = 0; i < n; i++) yield i;
}

function* range(n: number) {
  for (let i = 0; i < n; i++) yield i;
}

describe('to_array', () => {
  it('should consume an async iterable', async () => {
    const result = await to_array(asyncRange(10));
    expect(result).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  // equivalent to Array.from
  it('should consume an iterable', async () => {
    const result = await to_array(range(10));
    expect(result).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });
});

describe('any_va', () => {
  it('should return first promise', async () => {
    const [first, _] = await any_va([
      Promise.resolve(10),
      sleep(100).then(() => 'abc'),
    ]);

    expect(first).toEqual(10);
  });

  it('should throw on error', async () => {
    try {
      const [_, __] = await any_va([
        Promise.reject('bad'),
        sleep(100).then(() => 'abc'),
      ]);
    } catch(e: any) {
      expect(e).toEqual('bad')
    }
  })
})

describe('rate_limit', () => {
  it('should work with 3', async () => {
    const iter = asyncRange(10)[Symbol.asyncIterator]();
    const result = await to_array(
      map(
        new LeakyIterator(
          iter,
          3,
          100
        ), 
        async (x) => {
          await sleep(100)
          return x 
        },
        3,
      )
    );
    expect(result).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it('should work with 1', async () => {
    const iter = asyncRange(10)[Symbol.asyncIterator]();
    const result = await to_array(
      map(
        new LeakyIterator(
          iter,
          3,
          100
        ), 
        async (x) => {
          await sleep(100)
          return x 
        },
      )
    );
    expect(result).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });
});
