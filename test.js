import crypto from 'crypto';
import { readFile } from 'fs/promises';
import OAuth, { OAuthSigner } from './dist/oauth.js';

class RSASHA256 extends OAuthSigner {
  key;
  _signer;
  constructor(key) {
    super();
    this.key = key;
    this._signer = crypto.createSign('RSA-SHA256');
  }
  getMethod() {
    return 'RSA-SHA256';
  }
  sign(base) {
    const padding = crypto.constants.RSA_PKCS1_PSS_PADDING;
    const { key } = this;
    return this._signer.update(base).sign({ key, padding }, 'base64');
  }
}

const base =
  'POST&http%3A%2F%2Flocalhost%3A12345%2Ftradingapi%2Fv1%2Foauth%2Frequest_token&oauth_callback%3Doob%26oauth_consumer_key%3DTESTCONS%26oauth_nonce%3Dfcbc9c08d69ac269f7f1%26oauth_signature_method%3DRSA-SHA256%26oauth_timestamp%3D1473793701';
const signature =
  'nHpiG+/oGBtXtQPYOEc1PJKVUYCgFzbbUyQ1slb5GtvRVp+nfOKlm4eXt7P4DhNecsrg5gEc/AWHD+L7snXFmOWlj6c1XjcSCj1r8ERWHg/f8U43PwLkVHCarwgh3cVcH0KGioPpShefNcVvriAUxfBiScWKiB/1zmI1cs9yBHqoJS6pv4KlAGeLj3eXLmYphZGgJzLMLyj6X4UIT1RftHLKbqwmgfVMoBuDm5EDJDokN2VowepIMnkQBjiUJGWklUcgD8Jq9VHAgzTfdMsX33Nnfia+Z4ZcdJLUn2uUlNJX3FtWJeY02OImvXoQOZNXN6hiUH7q158Z/LOqWDyUAA==';

async function main() {
  const key = await readFile('./keys/test_private_rsa_signing.pem');
  const oa = new OAuth(
    'http://localhost:12345/tradingapi/v1/oauth/request_token',
    'http://localhost:12345/tradingapi/v1/oauth/access_token',
    'TESTCONS',
    new RSASHA256(key),
    'test_realm'
  );
  const auth_header = oa._buildAuthorizationHeaders(
    undefined,
    undefined,
    'POST',
    oa._requestUrl,
    {
      oauth_callback: 'oob',
      // override the timestamp and nonce to match the example pdf
      oauth_timestamp: '1473793701',
      oauth_nonce: 'fcbc9c08d69ac269f7f1',
    }
  );
  console.log(base);
  console.log(auth_header);
  const signer = crypto.createSign('RSA-SHA256');
  const result = signer.update(base).sign({ key }, 'base64');
  console.log(result === signature ? 'same' : 'different');
  console.log(result);
  console.log(signature);
}
main();
