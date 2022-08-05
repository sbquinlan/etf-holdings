import { rate_limit, take, with_return, to_array } from './async_util';

async function* asyncRange(n: number) {
  for (let i = 0; i < n; i++) yield i;
}

function* range(n: number) {
  for (let i = 0; i < n; i++) yield i;
}

async function sleep(delay: number) {
  return new Promise((res, _) => { setTimeout(res, delay) });
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

describe('take', () => {
  it('should work', async () => {
    const arr = [0, 1, 2, 3];
    const iter = take(3, arr.values());
    expect(iter.next()).toEqual({ value: 0, done: false });
    expect(iter.next()).toEqual({ value: 1, done: false });
    expect(iter.next()).toEqual({ value: 2, done: false });
    expect(iter.next()).toEqual({ value: false, done: true });
    expect(iter.next()).toEqual({ value: undefined, done: true });
  });

  it('spread should work', async () => {
    const arr = [0, 1, 2, 3];
    const iter = take(3, arr.values());
    expect([... iter]).toEqual([0, 1, 2]);
  });

  it('out of range should include whole array', async () => {
    const arr = [0, 1, 2, 3];
    const iter = take(5, arr.values());
    expect([... iter]).toEqual(arr);
  });

  it('should be empty array for take 0', async () => {
    const arr = [0, 1, 2, 3];
    const iter = take(0, arr.values());
    expect([... iter]).toEqual([]);
  });

  it('should include the return with array.from using partial', async () => {
    const arr = [0, 1, 2, 3];
    const iter = take(3, arr.values());
    expect(Array.from(iter)).toEqual([0, 1, 2]);
    expect(iter.next()).toEqual({ value: undefined, done: true });
  });

  it('should include the return using array.from', async () => {
    const arr = [0, 1, 2, 3];
    const iter = take(4, arr.values());
    expect(Array.from(iter)).toEqual(arr);
    expect(iter.next()).toEqual({ value: undefined, done: true });
  });

  it('should include the return using spread', async () => {
    const arr = [0, 1, 2, 3];
    const iter = take(4, arr.values());
    expect([... iter]).toEqual(arr);
    expect(iter.next()).toEqual({ value: undefined, done: true });
  });
})

describe('with_return', () => {
  it('should separate the yields and the return', async () =>  {
    const arr = [0, 1, 2, 3];
    const [yields, returns] = with_return(take(3, arr.values()));
    expect(yields).toEqual([0, 1, 2]);
    expect(returns).toEqual(false);
  });

  it('should separate the yields and the return when exhausting the iter', async () =>  {
    const arr = [0, 1, 2, 3];
    const [yields, returns] = with_return(take(5, arr.values()));
    expect(yields).toEqual(arr);
    expect(returns).toEqual(true);
  });
})

describe('rate_limit', () => {
  it('should work with 3', async () => {
    const result = await to_array(
      rate_limit(
        [... range(10)], 
        async (x) => {
          sleep(100)
          return x 
        },
        3, 
        100
      )
    );
    expect(result).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it('should work with 1', async () => {
    const result = await to_array(
      rate_limit(
        [... range(10)], 
        async (x) => {
          sleep(100)
          return x 
        },
        1, 
        100
      )
    );
    expect(result).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });
});
