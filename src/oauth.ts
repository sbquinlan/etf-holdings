import crypto from 'crypto';

import fetch from 'node-fetch';

const OAUTH_PARAM_PREFIX = /^oauth_/;

export abstract class OAuthSigner {
  abstract getMethod(): string;
  abstract sign(base: string, token: string | undefined): string;
}

export interface OAuthClientOptions {
  requestTokenHttpMethod: string;
  accessTokenHttpMethod: string;
  followRedirects: true;
  oauthParameterSeperator: string;
}

export default class OAuth {
  constructor(
    private _requestUrl: URL,
    private _accessUrl: URL,
    private _consumerKey: string,
    private _signer: OAuthSigner,
    private _realm: string,
    private _authCallback: string = 'oob',
    //    private _version: string = "1.0",
    private _nonceSize: number = 32,
    private _headers: Record<string, string> = {
      Accept: '*/*',
      Connection: 'close',
      'User-Agent': 'Node authentication',
    },
    private _options: OAuthClientOptions = {
      accessTokenHttpMethod: 'POST',
      requestTokenHttpMethod: 'POST',
      followRedirects: true,
      oauthParameterSeperator: ', ',
    }
  ) {}

  _encodeData(toEncode: string | undefined) {
    if (!toEncode) return '';

    // Fix the mismatch between OAuth's  RFC3986's and Javascript's beliefs in what is right and wrong ;)
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
    method: string,
    url: URL,
    parameters: string,
    token_secret: string | undefined
  ) {
    const cloned = new URL(url.toString());
    cloned.search = '';
    cloned.hash = '';
    return this._signer.sign(
      method.toUpperCase() +
        '&' +
        this._encodeData(cloned.toString()) +
        '&' +
        this._encodeData(parameters),
      // this encoded <consumer_key>&<token_secret>, but it doesn't seem to make sense with the ibkrs api so I removed it
      token_secret
    );
  }

  _normaliseRequestParams(params: Record<string, string>) {
    // First encode them #3.4.1.3.2 .1
    return (
      Object.entries(params)
        .map((pair) => pair.map((v) => this._encodeData(v)))
        // Then sort them #3.4.1.3.2 .2
        // Sorts the encoded key value pairs by encoded name, then encoded value
        .sort((a, b) =>
          a[0] == b[0] ? (a[1] < b[1] ? -1 : 1) : a[0] < b[0] ? -1 : 1
        )
        // Then concatenate together #3.4.1.3.2 .3 & .4
        .map((pair) => pair.join('='))
        .join('&')
    );
  }

  _prepareParameters(
    oauth_token: string | undefined,
    oauth_token_secret: string | undefined,
    method: string,
    url: URL,
    extra_params: Record<string, string>
  ) {
    const oauth_parameters = {
      ...(oauth_token && { oauth_token }),
      oauth_timestamp: String(Math.floor(new Date().getTime() / 1000)),
      oauth_nonce: crypto.randomBytes(this._nonceSize / 2).toString('hex'),
      // ibkr doesn't use this
      // oauth_version: this._version,
      oauth_signature_method: this._signer.getMethod(),
      oauth_consumer_key: this._consumerKey,
    };
    const signature_parameters = {
      ...oauth_parameters,
      ...extra_params,
      // 3.4.1.3.1 https://datatracker.ietf.org/doc/html/rfc5849#section-3.4.1.3.1 includes this idk
      ...Object.fromEntries(
        Array.from(new URLSearchParams(url.search).entries())
      ),
    };
    const oauth_signature = this._getSignature(
      method,
      url,
      this._normaliseRequestParams(signature_parameters),
      oauth_token_secret
    );

    // these are the header values, that should include only oauth_protocol stuff
    return {
      ...oauth_parameters,
      // only oauth extra_params
      ...Object.fromEntries(
        Object.entries(extra_params).filter(([key, _val]) =>
          OAUTH_PARAM_PREFIX.test(key)
        )
      ),
      oauth_signature,
      realm: this._realm,
    };
  }

  // build the OAuth request authorization header
  _buildAuthorizationHeaders(
    oauth_token: string | undefined,
    oauth_token_secret: string | undefined,
    method: string,
    url: URL,
    extra_params: Record<string, string>
  ) {
    const params = this._prepareParameters(
      oauth_token,
      oauth_token_secret,
      method,
      url,
      extra_params
    );
    const header_value = Object.entries(params)
      .sort((a, b) =>
        a[0] == b[0] ? (a[1] < b[1] ? -1 : 1) : a[0] < b[0] ? -1 : 1
      )
      .map(
        ([key, value]) =>
          `${this._encodeData(key)}="${this._encodeData(value)}"`
      )
      .join(this._options.oauthParameterSeperator);
    return `OAuth ${header_value}`;
  }

  async _performSecureRequest(
    oauth_token: string | undefined,
    oauth_token_secret: string | undefined,
    method: string,
    url: URL,
    extra_params: Record<string, string>
  ): Promise<any> {
    const filtered_extra_params = Object.fromEntries(
      Object.entries(extra_params).filter(
        ([key, _val]) => !OAUTH_PARAM_PREFIX.test(key)
      )
    );

    // this doesn't convert '*' to percent encoded like the previous implementation did, but something said it
    // was compliant with the RFC so I'm trusting it.
    const body = new URLSearchParams(filtered_extra_params).toString();
    const headers = {
      Authorization: this._buildAuthorizationHeaders(
        oauth_token,
        oauth_token_secret,
        method,
        url,
        extra_params
      ),
      'Content-Length': String(body.length),
      'Content-Type': 'application/x-www-form-urlencoded',
      Host: url.host,
      ...this._headers,
    };
    const resp = await fetch(url.toString(), { headers, method, body });
    if (
      (resp.status === 301 || resp.status === 302) &&
      this._options.followRedirects
    ) {
      return this._performSecureRequest(
        oauth_token,
        oauth_token_secret,
        method,
        new URL(url.origin, resp.headers.get('Location')!),
        extra_params
      );
    }
    if (!resp.ok) {
      const message = await resp.text();
      throw new Error(`${resp.status} ${resp.statusText}: ${message}`);
    }
    // the original implementation didn't assume json, but I'm going to
    return resp.json();
  }

  // first request
  async getOAuthRequestToken() {
    return this._performSecureRequest(
      undefined,
      undefined,
      this._options.requestTokenHttpMethod,
      this._requestUrl,
      // Callbacks are 1.0A related
      { oauth_callback: this._authCallback }
    );
  }

  // second request
  async getOAuthAccessToken(
    oauth_token: string,
    oauth_token_secret: string,
    oauth_verifier: string | undefined
  ) {
    return this._performSecureRequest(
      oauth_token,
      oauth_token_secret,
      this._options.accessTokenHttpMethod,
      this._accessUrl,
      oauth_verifier ? { oauth_verifier } : {}
    );
  }
}
