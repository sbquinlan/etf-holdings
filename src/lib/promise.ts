export async function sleep(delay: number) {
  return new Promise((res, _) => {
    setTimeout(res, Math.max(delay, 0));
  });
}

type OptionalMappedPromises<T extends readonly Promise<unknown>[]> = {
  -readonly [P in keyof T]: Awaited<T[P]> | undefined;
};
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

// basically like const [resolved, ... rest] = Promise.any([]) if it worked that way.
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

export type PromiseResolve<T> = (value: T | PromiseLike<T>) => void;
export type PromiseReject = (reason?: any) => void;
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
    }
    this.reject = (val: any) => { 
      if (this.settled) return;
      // @ts-ignore setting readonly in the constructor sorta.
      this.rejected = true; 
      temp_rej(val);
    }
  }

  public get settled() {
    return this.resolved || this.rejected;
  }

  static get [Symbol.species]() {
    return Promise;
  }
}
