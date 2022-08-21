import { sleep, any_va, any_partition, Deferred } from './promise.js';

describe('defer', () => {
  it('should resolve', async () => {
    const result = new Deferred();
    result.resolve(10);
    expect(await result).toEqual(10);

    expect(result.settled).toEqual(true);
    expect(result.rejected).toEqual(false);
    expect(result.resolved).toEqual(true);
  });

  it('should reject', async () => {
    const result = new Deferred();
    result.reject('bad');

    try {
      await result;
    } catch (e: any) {
      expect(e).toEqual('bad');
    }
    expect(result.settled).toEqual(true);
    expect(result.rejected).toEqual(true);
    expect(result.resolved).toEqual(false);
  });

  it('should chain', async () => {
    const start = new Deferred<number>();
    const end = start.then((prev) => prev + 10);
    start.resolve(10);
    expect(await start).toEqual(10);
    expect(await end).toEqual(20);
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
        sleep(100).then(() => 'good'),
      ]);
    } catch (e: any) {
      expect(e).toEqual('bad');
    }
  });
});

describe('any_partition', () => {
  it('should return undefined from empty array', async () => {
    const [result, leftovers] = await any_partition([]);
    expect(result).toEqual(undefined);
    expect(leftovers).toEqual([]);
  });

  it('should return empty array with one promise', async () => {
    const [result, leftovers] = await any_partition([Promise.resolve(10)]);
    expect(result).toEqual(10);
    expect(leftovers).toEqual([]);
  });

  it('should return first result with rest of promises', async () => {
    const [result, leftovers] = await any_partition([
      sleep(100),
      Promise.resolve(10),
    ]);
    expect(result).toEqual(10);
    expect(leftovers).toHaveLength(1);
  });

  it('should throw on error', async () => {
    try {
      const [_, __] = await any_partition([
        Promise.reject('bad'),
        sleep(100).then(() => 'good'),
      ]);
    } catch (e: any) {
      expect(e).toEqual('bad');
    }
  });
});
