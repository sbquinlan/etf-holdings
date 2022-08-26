import { sleep } from './promise'
import { iterated_function } from './iterated_function'
import { pool, sluice } from './iterator'

describe('iterated function', () => {
  it('works', async () => {
    function sleepyDate(n: number, ms: number) {
      const start = Date.now();
      return sleep(ms).then(() => [n, start, Date.now()]);
    }

    const iter_sleepy = iterated_function(
      sleepyDate, 
      [pool(3), sluice(1, 100)],
    )
    const result = await Promise.all([
      iter_sleepy(1, 1000),
      iter_sleepy(2, 100),
      iter_sleepy(3, 10)
    ])
    expect(result.map(r => r[0])).toEqual([1, 2, 3]);
    expect(result[0][2]).toBeGreaterThan(result[2][2]);
  })
})