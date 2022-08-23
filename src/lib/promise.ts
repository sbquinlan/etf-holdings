export async function sleep(delay: number) {
  return new Promise((res, _) => {
    setTimeout(res, Math.max(delay, 0));
  });
}

// Convienence type for matching args to outputs
type OptionalMappedPromises<T extends readonly Promise<unknown>[]> = {
  -readonly [P in keyof T]: Awaited<T[P]> | undefined;
};

/**
 * any_va takes an array/tuple of Promises and returns the first result 
 * from those promises. The catch is that the return type is an empty 
 * array except for the one result that finished first, in the same
 * position as the promise that resolved. This, plus the typing,
 * is slightly helpful in cases where you want any promise that finishes
 * but you also need to know what finished.
 */
export async function any_va<T extends readonly Promise<unknown>[]>(
  proms: [...T]
): Promise<OptionalMappedPromises<T>> {
  if (proms.length === 0) {
    return [] as unknown as OptionalMappedPromises<T>;
  }

  return new Promise((res, rej) => {
    for (let i = 0; i < proms.length; i++) {
      proms[i].then((subresult) => {
        const all_results = new Array(
          proms.length
        ) as OptionalMappedPromises<T>;
        all_results[i] = subresult;
        res(all_results);
      }, rej);
    }
  });
}

/**
 * any_partition() is like Promise.any() but the tuple it returns 
 * contains both the result (first element) and the promises that 
 * didn't resolve yet as an array (second element).
 * 
 * Basically like ```const [resolved, ... rest] = Promise.any([...])``` 
 */
export async function any_partition<TThing>(
  proms: Promise<TThing>[]
): Promise<[TThing | undefined, Promise<TThing>[]]> {
  if (proms.length === 0) {
    return [undefined, []] as any;
  }

  return new Promise((res, rej) => {
    for (let i = 0; i < proms.length; i++) {
      proms[i].then((subresult) => {
        const remaining = proms.slice();
        remaining.splice(i, 1);
        res([subresult as any, remaining]);
      }, rej);
    }
  });
}

type PromiseResolve<T> = (value: T | PromiseLike<T>) => void;
type PromiseReject = (reason?: any) => void;
/**
 * Deferred is a Promise that exposes it's resolve() and reject() 
 * as class properties as well as it's settled state. The primary
 * use case of this is to reverse the API. Meaning, if you wanted 
 * to give some abstraction a promise rather than giving some 
 * abstraction the settle callbacks.
 * 
 * Being an event listener vs being the event emitter.
 */
export class Deferred<T> extends Promise<T> {
  public readonly resolve: PromiseResolve<T>;
  public readonly reject: PromiseReject;
  public readonly resolved: boolean = false;
  public readonly rejected: boolean = false;

  constructor() {
    let temp_res: PromiseResolve<T>, temp_rej: PromiseReject;
    super((res, rej) => {
      temp_res = res;
      temp_rej = rej;
    });
    this.resolve = (val: T | PromiseLike<T>) => {
      if (this.settled) return;
      // @ts-ignore setting readonly in the constructor sorta.
      this.resolved = true;
      temp_res(val);
    };
    this.reject = (val: any) => {
      if (this.settled) return;
      // @ts-ignore setting readonly in the constructor sorta.
      this.rejected = true;
      temp_rej(val);
    };
  }

  public get settled() {
    return this.resolved || this.rejected;
  }

  static get [Symbol.species]() {
    return Promise;
  }
}
