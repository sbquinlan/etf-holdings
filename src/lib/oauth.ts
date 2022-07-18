import crypto, { BinaryToTextEncoding } from 'crypto';

import fetch from 'node-fetch';

const OAUTH_PARAM_PREFIX = /^oauth_/;

const BODY_MODE = 'body';
const HEADER_MODE = 'header';

const FORM_URLENCODED = 'application/x-www-form-urlencoded';
const JSON_ENCODED = 'application/json';

/**
 * IBKRs doesn't allow Oauth on retail accounts so I guess I can't use this but
 * here's the example of how to use it if you could:
 * 
    import 'dotenv/config';
    import { readFile } from 'fs/promises';

    import OAuth, { CryptoSigner } from './oauth.js';

    const BASE_URI = 'https://www.interactivebrokers.com/tradingapi/v1/oauth/';

    async function main() {
      try {
        const key = await readFile('./keys/private_signature.pem');
        const oa = new OAuth(
          new URL(`${BASE_URI}request_token`),
          new URL(`${BASE_URI}access_token`),
          // @ts-ignore
          process.env.CONSUMER_KEY,
          new CryptoSigner('RSA-SHA256', key),
          { realm: 'limited_poa' },
        );

        const token = await oa.getOAuthRequestToken();
        console.log(token);
      } catch (e: any) {
        console.error(e);
      }
    }

    main();
 */

export abstract class OAuthSigner {
  abstract getMethod(): string;
  abstract sign(base: string, token: string | undefined): string;
}

export class CryptoSigner extends OAuthSigner {
  private _signer: crypto.Sign;

  constructor(
    private method: string,
    private key: string | Buffer,
    private outputFormat: BinaryToTextEncoding = 'base64'
  ) {
    super();
    this._signer = crypto.createSign(this.method);
  }

  public getMethod(): string {
    return this.method;
  }

  public sign(base: string): string {
    return this._signer.update(base).sign(this.key, this.outputFormat);
  }
}

export interface OAuthClientOptions {
  authParameterSeperator: string;
  contentType: typeof FORM_URLENCODED | typeof JSON_ENCODED;
  headers: Record<string, string>;
  mode: typeof BODY_MODE | typeof HEADER_MODE;
  nonceSize: number;
}
const OAuthClientOptionDefaults: OAuthClientOptions = {
  authParameterSeperator: ', ',
  contentType: FORM_URLENCODED,
  headers: {
    Accept: '*/*',
    Connection: 'close',
    'User-Agent': 'Node authentication',
  },
  mode: HEADER_MODE,
  nonceSize: 20,
};

export default class OAuth {
  private _options: OAuthClientOptions;
  constructor(
    private _requestUrl: URL,
    private _accessUrl: URL,
    private _consumerKey: string,
    private _signer: OAuthSigner,
    private _extraParams: Record<string, string> = {
      // optional oauth param
      oauth_version: '1.0',
      // realm is an Authentication header spec thing
      // realm: 'test',
    },
    // oauth param only used for "request token" step
    private _authCallback: string = 'oob',
    options: Partial<OAuthClientOptions> = OAuthClientOptionDefaults
  ) {
    this._options = { ...OAuthClientOptionDefaults, ...options };
  }

  _encodeData(toEncode: string | undefined) {
    if (!toEncode) return '';

    // Fix the mismatch between RFC3986's and Javascript's beliefs in what is right and wrong ;)
    return encodeURIComponent(toEncode)
      .replace(/\!/g, '%21')
      .replace(/\'/g, '%27')
      .replace(/\(/g, '%28')
      .replace(/\)/g, '%29')
      .replace(/\*/g, '%2A');
  }

  _decodeData(toDecode: string | undefined) {
    if (!toDecode) return '';
    return decodeURIComponent(toDecode.replace(/\+/g, ' '));
  }

  _getSignature(
    url: URL,
    parameters: string,
    token_secret: string | undefined
  ) {
    const cloned = new URL(url.toString());
    cloned.search = '';
    cloned.hash = '';
    return this._signer.sign(
      'POST&' +
        this._encodeData(cloned.toString()) +
        '&' +
        this._encodeData(parameters),
      // this encoded <consumer_key>&<token_secret>, but it doesn't seem to make sense with the ibkrs api so I removed it
      token_secret
    );
  }

  _sortPair(a: [any, any], b: [any, any]): number {
    return a[0] == b[0] ? (a[1] < b[1] ? -1 : 1) : a[0] < b[0] ? -1 : 1;
  }

  _normaliseRequestParams(params: Record<string, string>) {
    // First encode them #3.4.1.3.2 .1
    return (
      Object.entries(params)
        .map((pair) => pair.map((v) => this._encodeData(v)))
        // Then sort them #3.4.1.3.2 .2
        // Sorts the encoded key value pairs by encoded name, then encoded value
        .sort((a, b) =>
          this._sortPair(a as [string, string], b as [string, string])
        )
        // Then concatenate together #3.4.1.3.2 .3 & .4
        .map((pair) => pair.join('='))
        .join('&')
    );
  }

  /**
   * Three buckets of params:
   * 1. signature base
   * 2. auth header
   * 3. body
   *
   * Method is assumed to be BODY, which is recommended by spec. this._mode decides where the oauth
   * params end up (either in the body or in the Authorization header.) Between this._contentType and
   * this._mode, this leaves 4 combinations:
   *
   * this._mode this._contentType
   * HEADER     json
   * HEADER     form
   * BODY       json
   * BODY       form
   *
   * Signature base is always HTTP method, normalized URL, query params from the URL. If 'form' is used
   * for content type then any additional params in the body are included as well. If 'json' is used then
   * the additional params are ignored.
   *
   * Auth header is only relevant if mode is HEADER. If mode is BODY, then the header is not used. Auth header
   * is all the oauth params and realm (optional)
   *
   * Body is always non-oauth params (except realm). If mode is BODY, then body contains all params (except realm)
   */
  _prepareParameters(url: URL, extra_params: Record<string, string>) {
    const [oauth_and_secret, other_and_realm] = Object.entries(extra_params)
      .reduce<[[string, string][], [string, string][]]>(
        ([oauth_entries, other_entries], entry) => {
          if (OAUTH_PARAM_PREFIX.test(entry[0])) {
            oauth_entries = [...oauth_entries, entry];
          } else {
            other_entries = [...other_entries, entry];
          }
          return [oauth_entries, other_entries];
        },
        [[], []]
      )
      .map((entries) => Object.fromEntries(entries));

    // token secret is only for signature creation
    const { oauth_token_secret = undefined, ...oauth_extras } =
      oauth_and_secret;
    // realm is only for auth header
    const { realm = undefined, ...other_extras } = other_and_realm;

    const oauth_parameters = {
      oauth_consumer_key: this._consumerKey,
      oauth_nonce: crypto
        .randomBytes(this._options.nonceSize / 2)
        .toString('hex'),
      oauth_signature_method: this._signer.getMethod(),
      oauth_timestamp: String(Math.floor(new Date().getTime() / 1000)),
      ...oauth_extras,
    };

    const oauth_signature = this._getSignature(
      url,
      // BUCKET 1: Signature Base
      this._normaliseRequestParams({
        ...oauth_parameters,
        // 3.4.1.3.1 https://datatracker.ietf.org/doc/html/rfc5849#section-3.4.1.3.1 includes
        // post body if post body is form-urlencoded
        ...(this._options.contentType === FORM_URLENCODED && {
          ...other_extras,
        }),
        // the query params from the url
        ...Object.fromEntries(
          Array.from(new URLSearchParams(url.search).entries())
        ),
      }),
      oauth_token_secret
    );

    return {
      // BUCKET 2: Header (only relevant if mode is header)
      header_params: {
        ...oauth_parameters,
        oauth_signature,
        ...(realm && { realm }), // optional realm
      },
      // BUCKET 3: BODY
      body_params: {
        ...other_extras,
        ...(this._options.mode === BODY_MODE && {
          ...oauth_parameters,
          oauth_signature,
        }),
      },
    };
  }

  _buildAuthorizationHeaders(params: Record<string, string>) {
    const header_value = Object.entries(params)
      // technically don't have to sort them
      .sort((a, b) => this._sortPair(a, b))
      .map(
        ([key, value]) =>
          `${this._encodeData(key)}="${this._encodeData(value)}"`
      )
      .join(this._options.authParameterSeperator);
    return `OAuth ${header_value}`;
  }

  async _performSecureRequest(
    url: URL,
    extra_params: Record<string, string>
  ): Promise<any> {
    const { header_params, body_params } = this._prepareParameters(
      url,
      extra_params
    );
    const body =
      this._options.contentType === FORM_URLENCODED
        ? new URLSearchParams(body_params)
        : JSON.stringify(body_params);
    const headers = {
      ...this._options.headers,
      ...(this._options.mode === HEADER_MODE && {
        Authorization: this._buildAuthorizationHeaders(header_params),
      }),
      ...(this._options.contentType === JSON_ENCODED && {
        'Content-Type': JSON_ENCODED,
        'Content-Length': String((<String>body).length),
      }),
      Host: url.host,
    };
    const resp = await fetch(url.toString(), { method: 'POST', headers, body });

    if (resp.status === 301 || resp.status === 302) {
      return this._performSecureRequest(
        new URL(url.origin, resp.headers.get('Location')!),
        extra_params
      );
    }
    if (!resp.ok) {
      const message = await resp.text();
      throw new Error(`${resp.status} ${resp.statusText}: ${message}`);
    }

    return resp.headers.get('Content-Type') === JSON_ENCODED
      ? resp.json()
      : resp.text();
  }

  // first request
  async getOAuthRequestToken() {
    return this._performSecureRequest(this._requestUrl, {
      ...this._extraParams,
      oauth_callback: this._authCallback,
    });
  }

  // second request
  async getOAuthAccessToken(
    oauth_token: string,
    oauth_token_secret: string,
    oauth_verifier: string | undefined
  ) {
    return this._performSecureRequest(this._accessUrl, {
      ...this._extraParams,
      oauth_token,
      oauth_token_secret,
      ...(oauth_verifier && { oauth_verifier }),
    });
  }
}
