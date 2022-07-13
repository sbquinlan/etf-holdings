import crypto from 'crypto';
import { readFile } from 'fs/promises';
import 'dotenv/config';

import OAuth, { OAuthSigner } from './oauth.js';

const BASE_URI = 'https://www.interactivebrokers.com/tradingapi/v1/oauth/';

class RSASHA256 extends OAuthSigner {
  private readonly METHOD: string = 'RSA-SHA256';
  private _signer: crypto.Sign;

  constructor(private key: string | Buffer) {
    super();
    this._signer = crypto.createSign(this.METHOD);
  }

  public getMethod(): string {
    return this.METHOD;
  }

  public sign(base: string): string {
    return this._signer.update(base).sign(this.key, 'base64');
  }
}

async function main() {
  try {
    const key = await readFile('./keys/private_signature.pem');
    const oa = new OAuth(
      new URL(`${BASE_URI}request_token`),
      new URL(`${BASE_URI}access_token`),
      // @ts-ignore
      process.env.CONSUMER_KEY,
      new RSASHA256(key),
      'limited_poa',
      'oob',
      20
    );

    const token = await oa.getOAuthRequestToken();
    console.log(token);
  } catch (e: any) {
    console.error(e);
  }
}

main();
