import { Channel } from "./channel.js";
import { fluent, OperatorAsyncFunction } from "./fluent.js";
import { map } from "./iterator.js";
import { Deferred } from "./promise.js";

interface IteratedFunction<TArgs extends any[], TResult> {
  (... args: [... TArgs]): Promise<TResult>;
  stop(): void;
}

export function iterated_function<TArgs extends any[], TResult>(
  func: (... args: [... TArgs]) => TResult,
  operators: OperatorAsyncFunction<void, void>[],
): IteratedFunction<TArgs, TResult> {
  const channel: Channel<() => Promise<void>> = new Channel();

  setImmediate(async () => {
    const pipeline = fluent(
      channel, 
      map( (f: () => Promise<void>) => f() ), 
      ... operators,
    );
    // just pump the iterator
    for await (const _fun of pipeline) { }
  });
  
  function _limited(... args: [... TArgs]): Promise<TResult> {
    const deferred: Deferred<TResult> = new Deferred();
    channel.push(async () => {
      try {
        const result = await func(... args);
        deferred.resolve(result);
      } catch(e: any) {
        deferred.reject(e);
        return;
      }
    });
    return deferred;
  }
  _limited.stop = () => { channel.push(async () => {}, true); }
  return _limited;
}