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
