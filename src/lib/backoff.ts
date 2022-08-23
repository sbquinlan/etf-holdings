import { sleep } from "./promise.js";

export function backoff<TThing, TArgs extends unknown[]>(
  call: (... args: [... TArgs]) => Promise<TThing>,
  base: number, 
  retries: number,
  jitter: number = 0,
) {
  base = Math.max(0, base);
  retries = Math.floor(Math.max(0, retries));

  return async (... args: [... TArgs]) => {
    let count = 0;
    do {
      try {
        return await call(... args);
      } catch (error: any) {
        if (++count > retries) throw error;
      }
      await sleep(base ** count + Math.random() * jitter)
    } while (true)
  }
}