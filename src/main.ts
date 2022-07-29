import { paths } from './ibweb'

/**
 * Taken from ajaishankar/openapi-typescript-fetch/blob/main/src/types.ts
 * TApi[TPath][TMethod] should contain a 'responses' key defining the return types
 * 
 * In OpenAPI 2, this has a 'schema' field that maps our response type
 * In OpenAPI 3, this has a 'content'-type field that maps to our response type
 */
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

function api<TApi>({ base } : { base: string }) {
  async function typedFetch<
    TPath extends keyof TApi, 
    TMethod extends keyof TApi[TPath],
    TResult extends ApiStatusSchema<ApiResponseSchema<TApi[TPath][TMethod]>>,
  >(path: TPath, init: { method: TMethod } & RequestInit): Promise<TResult> {
    const resp = await fetch(`${base}${String(path)}`, init)
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
    this._schedule();
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
      { method: 'post' }
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

  const resp = await ib_fetch('/portfolio/accounts', { method: 'get' });
  console.log(resp)
}

main()