
export type UnaryFunction<T, R> = (source: T) => R;
export type OperatorAsyncFunction<T, R> = UnaryFunction<AsyncIterable<T> | Iterable<T>, AsyncIterable<R>>;

export function fluent<T>(source: AsyncIterable<T> | Iterable<T>): AsyncIterable<T>;
export function fluent<T, A>(
  source: AsyncIterable<T> | Iterable<T>,
  op1: OperatorAsyncFunction<T, A>
): AsyncIterable<A>;
export function fluent<T, A, B>(
  source: AsyncIterable<T> | Iterable<T>,
  op1: OperatorAsyncFunction<T, A>,
  op2: OperatorAsyncFunction<A, B>
): AsyncIterable<B>;
export function fluent<T, A, B, C>(
  source: AsyncIterable<T> | Iterable<T>,
  op1: OperatorAsyncFunction<T, A>,
  op2: OperatorAsyncFunction<A, B>,
  op3: OperatorAsyncFunction<B, C>
): AsyncIterable<C>;
export function fluent<T, A, B, C, D>(
  source: AsyncIterable<T> | Iterable<T>,
  op1: OperatorAsyncFunction<T, A>,
  op2: OperatorAsyncFunction<A, B>,
  op3: OperatorAsyncFunction<B, C>,
  op4: OperatorAsyncFunction<C, D>
): AsyncIterable<D>;
export function fluent<T, A, B, C, D, E>(
  source: AsyncIterable<T> | Iterable<T>,
  op1: OperatorAsyncFunction<T, A>,
  op2: OperatorAsyncFunction<A, B>,
  op3: OperatorAsyncFunction<B, C>,
  op4: OperatorAsyncFunction<C, D>,
  op5: OperatorAsyncFunction<D, E>
): AsyncIterable<E>;
export function fluent<T, A, B, C, D, E, F>(
  source: AsyncIterable<T> | Iterable<T>,
  op1: OperatorAsyncFunction<T, A>,
  op2: OperatorAsyncFunction<A, B>,
  op3: OperatorAsyncFunction<B, C>,
  op4: OperatorAsyncFunction<C, D>,
  op5: OperatorAsyncFunction<D, E>,
  op6: OperatorAsyncFunction<E, F>
): AsyncIterable<F>;
export function fluent<T, A, B, C, D, E, F, G>(
  source: AsyncIterable<T> | Iterable<T>,
  op1: OperatorAsyncFunction<T, A>,
  op2: OperatorAsyncFunction<A, B>,
  op3: OperatorAsyncFunction<B, C>,
  op4: OperatorAsyncFunction<C, D>,
  op5: OperatorAsyncFunction<D, E>,
  op6: OperatorAsyncFunction<E, F>,
  op7: OperatorAsyncFunction<F, G>
): AsyncIterable<G>;
export function fluent<T, A, B, C, D, E, F, G, H>(
  source: AsyncIterable<T> | Iterable<T>,
  op1: OperatorAsyncFunction<T, A>,
  op2: OperatorAsyncFunction<A, B>,
  op3: OperatorAsyncFunction<B, C>,
  op4: OperatorAsyncFunction<C, D>,
  op5: OperatorAsyncFunction<D, E>,
  op6: OperatorAsyncFunction<E, F>,
  op7: OperatorAsyncFunction<F, G>,
  op8: OperatorAsyncFunction<G, H>
): AsyncIterable<H>;
export function fluent<T, A, B, C, D, E, F, G, H, I>(
  source: AsyncIterable<T> | Iterable<T>,
  op1: OperatorAsyncFunction<T, A>,
  op2: OperatorAsyncFunction<A, B>,
  op3: OperatorAsyncFunction<B, C>,
  op4: OperatorAsyncFunction<C, D>,
  op5: OperatorAsyncFunction<D, E>,
  op6: OperatorAsyncFunction<E, F>,
  op7: OperatorAsyncFunction<F, G>,
  op8: OperatorAsyncFunction<G, H>,
  op9: OperatorAsyncFunction<H, I>
): AsyncIterable<I>;
export function fluent<T>(
  source: AsyncIterable<T> | Iterable<T>, ... operations: OperatorAsyncFunction<T, T>[]
): AsyncIterable<T>;
export function fluent<T, A>(
  source: AsyncIterable<T> | Iterable<T>, 
  map: OperatorAsyncFunction<T, A>,
  ... operations: OperatorAsyncFunction<A, A>[]
): AsyncIterable<T>;
export function fluent<T>(
  source: AsyncIterable<T> | Iterable<T>, ... operations: OperatorAsyncFunction<T, T>[]
): AsyncIterable<T>;
export function fluent<T>(source: AsyncIterable<T> | Iterable<T>, ... operations: any[]) {
  return operations.reduce((acc, oper) => oper(acc), source);
}