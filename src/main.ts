import { stat } from 'fs';
import { posix } from 'path';
import { paths } from './ibweb'

/**
 * Taken from ajaishankar/openapi-typescript-fetch/blob/main/src/types.ts
 * TApi[TPath][TMethod] should contain a 'responses' key defining the return types
 * 
 * In OpenAPI 2, this has a 'schema' field that maps our response type
 * In OpenAPI 3, this has a 'content'-type field that maps to our response type
 */
type ApiPathArgs<OP> = OP extends { 
  // openapi 2
  parameters?: { path? : infer P, query?: infer Q, body?: infer B },
  // openapi 3
  requestBody?: { content: { 'application/json': infer RB } }
} ? P & Q & B & RB
  : undefined;
type ApiResponseSchema<OP> = OP extends { responses: infer R } 
  ? { 
      [S in keyof R]: R[S] extends { schema?: infer S } // openapi 2
        ? S
        : R[S] extends { content: { 'application/json': infer C } } // openapi 3
          ? C
          : S extends 'default'
            ? R[S]
            : unknown
    }
  : never
type ApiStatusSchema<TResponseSchema> = 200 extends keyof TResponseSchema 
  ? TResponseSchema[200] 
  : unknown;

function form_path(path: string, args?: Record<string, string>, method: string) {
  if (!args) {
    return { path, body: undefined };
  }

  const search_params = new URLSearchParams();
  for (const [key, value] of Object.entries(args)) {
    const search = `{${key}}`;
    if (path.indexOf(search)) {
      path = String(path).replace(search, String(value))
    } else {
      search_params.set(key, value);
    }
  }
  return { 
    path: method === 'get' ? path + '?' + search_params : path,
    body: method !== 'get' ? JSON.stringify(Object.fromEntries(search_params.entries())) : undefined,
  }
}

function api<TApi>({ base } : { base: string }) {
  async function typedFetch<
    TPath extends keyof TApi, 
    TMethod extends keyof TApi[TPath],
    TResult extends ApiStatusSchema<ApiResponseSchema<TApi[TPath][TMethod]>>,
  >(fpath: TPath, init: { method: TMethod } & RequestInit, args?: ApiPathArgs<TApi[TPath][TMethod]>): Promise<TResult> {
    // try to replace path args
    const { path, body } = form_path(
      String(fpath), 
      args as Record<string, string> | undefined,
      init.method
    );
    const resp = await fetch(`${base}${path}`, { ... init, body })
    if (!resp.ok) {
      throw new Error(resp.statusText);
    }
    return await resp.json();
  }
  return typedFetch;
}


const ib_fetch = api<paths>({
  'base': 'http://localhost:5000/v1/api'
});

class AuthHeartbeat {
  private _timeout: NodeJS.Timeout | undefined;
  constructor(
    private _interval: number,
  ) {
    
  }

  start() {
    if (this._timeout) return;
    this._heartbeat().then(() => this._schedule())
  }

  stop() {
    if (!this._timeout) return;
    clearTimeout(this._timeout);
    this._timeout?.unref();
    this._timeout = undefined;
  }

  private _schedule() {
    this._timeout = setTimeout(
      () => {
        this._heartbeat().then(() => this._schedule())
      },
      this._interval,
    );
  }

  private async _heartbeat() {
    const { authenticated, connected, fail } = await ib_fetch(
      '/iserver/auth/status', 
      { method: 'post' },
    );
    if (fail) {
      this._throwError(<string>fail);
    }
    if (!connected) {
      this._throwError('Gateway Disconnected');
    }
    if (authenticated) {
      console.log('Authenticated')
      return;
    }
    await ib_fetch(
      '/iserver/reauthenticate', 
      { method: 'post' },
    );
  }

  private _throwError(msg: string) {
    throw new Error(`Auth Heartbeat Error: ${msg}`)
  }
}

async function main() {
  const heartbeat = new AuthHeartbeat(60000);
  heartbeat.start();

  // const accounts = await ib_fetch('/portfolio/accounts', { method: 'get' });
  // const acctId = accounts && accounts[0].accountId;
  // const summary = await ib_fetch('/portfolio/{accountId}/summary', { method: 'get' }, { accountId: String(acctId) });
  // const trades = await ib_fetch('/iserver/account/trades', { method: 'get'});
//  console.log(trades);
}

main()