import { backoff } from './backoff.js'
import { map, range, sink, sluice } from './iterator.js';

class ThrowTill {
  private count: number = 0;
  constructor (private failures: number) {}
  async try(): Promise<number> {
    if (this.count < this.failures) { 
      this.count += 1;
      throw 'bad';
    }
    return this.count;
  }
}

describe('backoff', () => {
  it('should retry failures', async () => {
    const thrower = new ThrowTill(2);
    const result = backoff(
      () => thrower.try(),
      10, 
      3,
    );
    await expect(result()).resolves.toEqual(2);
  })
  
  it('should throw after limit', async () => {
    const thrower = new ThrowTill(4);
    await expect(
      backoff(
        () => thrower.try(),
        10, 
        3,
      )()
    ).rejects.toEqual('bad');
  })

  it('should validate limit', async () => {
    const thrower = new ThrowTill(2);
    await expect(
      backoff(
        () => thrower.try(),
        10, 
        -3,
      )()
    ).rejects.toEqual('bad');
  })

  it('should validate base', async () => {
    const thrower = new ThrowTill(2);
    const result = backoff(
      () => thrower.try(),
      -20.4, 
      3,
    );
    await expect(result()).resolves.toEqual(2);
  })

  it('should work in iterators', async () => {
    const might_throw = map(
      [... range(3)].map(_ => new ThrowTill(1)),
      backoff(
        async (thrower) => {
          await thrower.try();
          return 10;
        },
        10,
        4
      ),
    );
    const limited = sluice(might_throw, 1, 50);
    await expect(sink(limited)).resolves.toEqual([10, 10, 10]);
  });
})