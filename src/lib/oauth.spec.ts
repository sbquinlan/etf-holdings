import { jest } from '@jest/globals';
import { readFile } from 'fs/promises';
import { Response } from 'node-fetch';
import { URLSearchParams } from 'url';

const fetch = jest.fn(() => Promise.resolve(new Response()));
jest.unstable_mockModule('node-fetch', () => ({ default: fetch }));

const { default: OAuth, CryptoSigner } = await import('./oauth');

describe('ibkrs example', () => {
  it('should match the request_token example', async () => {
    const sig = encodeURIComponent(
      'nHpiG+/oGBtXtQPYOEc1PJKVUYCgFzbbUyQ1slb5GtvRVp+nfOKlm4eXt7P4DhNecsrg5gEc/AWHD+L7snXFmOWlj6c1XjcSCj1r8ERWHg/f8U43PwLkVHCarwgh3cVcH0KGioPpShefNcVvriAUxfBiScWKiB/1zmI1cs9yBHqoJS6pv4KlAGeLj3eXLmYphZGgJzLMLyj6X4UIT1RftHLKbqwmgfVMoBuDm5EDJDokN2VowepIMnkQBjiUJGWklUcgD8Jq9VHAgzTfdMsX33Nnfia+Z4ZcdJLUn2uUlNJX3FtWJeY02OImvXoQOZNXN6hiUH7q158Z/LOqWDyUAA=='
    );
    const key = await readFile('./keys/test_private_rsa_signing.pem');
    const oa = new OAuth(
      new URL('http://localhost:12345/tradingapi/v1/oauth/request_token'),
      new URL('http://localhost:12345/tradingapi/v1/oauth/access_token'),
      'TESTCONS',
      new CryptoSigner('RSA-SHA256', key),
      {
        realm: 'test_realm',

        // override
        oauth_timestamp: '1473793701',
        oauth_nonce: 'fcbc9c08d69ac269f7f1',
      }
    );
    await oa.getOAuthRequestToken();
    expect(fetch).toHaveBeenLastCalledWith(
      'http://localhost:12345/tradingapi/v1/oauth/request_token',
      {
        body: new URLSearchParams(),
        headers: {
          Accept: '*/*',
          Authorization: `OAuth oauth_callback="oob", oauth_consumer_key="TESTCONS", oauth_nonce="fcbc9c08d69ac269f7f1", oauth_signature="${sig}", oauth_signature_method="RSA-SHA256", oauth_timestamp="1473793701", realm="test_realm"`,
          Connection: 'close',
          Host: 'localhost:12345',
          'User-Agent': 'Node authentication',
        },
        method: 'POST',
      }
    );
  });

  it('should match the request_token example in POST mode', async () => {
    const sig =
      'nHpiG+/oGBtXtQPYOEc1PJKVUYCgFzbbUyQ1slb5GtvRVp+nfOKlm4eXt7P4DhNecsrg5gEc/AWHD+L7snXFmOWlj6c1XjcSCj1r8ERWHg/f8U43PwLkVHCarwgh3cVcH0KGioPpShefNcVvriAUxfBiScWKiB/1zmI1cs9yBHqoJS6pv4KlAGeLj3eXLmYphZGgJzLMLyj6X4UIT1RftHLKbqwmgfVMoBuDm5EDJDokN2VowepIMnkQBjiUJGWklUcgD8Jq9VHAgzTfdMsX33Nnfia+Z4ZcdJLUn2uUlNJX3FtWJeY02OImvXoQOZNXN6hiUH7q158Z/LOqWDyUAA==';
    const key = await readFile('./keys/test_private_rsa_signing.pem');
    const oa = new OAuth(
      new URL('http://localhost:12345/tradingapi/v1/oauth/request_token'),
      new URL('http://localhost:12345/tradingapi/v1/oauth/access_token'),
      'TESTCONS',
      new CryptoSigner('RSA-SHA256', key),
      {
        realm: 'test_realm',

        // override
        oauth_timestamp: '1473793701',
        oauth_nonce: 'fcbc9c08d69ac269f7f1',
      },
      'oob',
      { mode: 'body' }
    );
    await oa.getOAuthRequestToken();
    expect(fetch).toHaveBeenLastCalledWith(
      'http://localhost:12345/tradingapi/v1/oauth/request_token',
      {
        body: new URLSearchParams({
          oauth_consumer_key: 'TESTCONS',
          oauth_nonce: 'fcbc9c08d69ac269f7f1',
          oauth_signature_method: 'RSA-SHA256',
          oauth_timestamp: '1473793701',
          oauth_callback: 'oob',
          oauth_signature: sig,
        }),
        headers: {
          Accept: '*/*',
          Connection: 'close',
          Host: 'localhost:12345',
          'User-Agent': 'Node authentication',
        },
        method: 'POST',
      }
    );
  });

  it('should match the request_token example in POST + JSON ', async () => {
    const sig =
      'nHpiG+/oGBtXtQPYOEc1PJKVUYCgFzbbUyQ1slb5GtvRVp+nfOKlm4eXt7P4DhNecsrg5gEc/AWHD+L7snXFmOWlj6c1XjcSCj1r8ERWHg/f8U43PwLkVHCarwgh3cVcH0KGioPpShefNcVvriAUxfBiScWKiB/1zmI1cs9yBHqoJS6pv4KlAGeLj3eXLmYphZGgJzLMLyj6X4UIT1RftHLKbqwmgfVMoBuDm5EDJDokN2VowepIMnkQBjiUJGWklUcgD8Jq9VHAgzTfdMsX33Nnfia+Z4ZcdJLUn2uUlNJX3FtWJeY02OImvXoQOZNXN6hiUH7q158Z/LOqWDyUAA==';
    const key = await readFile('./keys/test_private_rsa_signing.pem');
    const oa = new OAuth(
      new URL('http://localhost:12345/tradingapi/v1/oauth/request_token'),
      new URL('http://localhost:12345/tradingapi/v1/oauth/access_token'),
      'TESTCONS',
      new CryptoSigner('RSA-SHA256', key),
      {
        realm: 'test_realm',

        // override
        oauth_timestamp: '1473793701',
        oauth_nonce: 'fcbc9c08d69ac269f7f1',
      },
      'oob',
      {
        contentType: 'application/json',
        mode: 'body',
      }
    );
    await oa.getOAuthRequestToken();
    expect(fetch).toHaveBeenLastCalledWith(
      'http://localhost:12345/tradingapi/v1/oauth/request_token',
      {
        body: JSON.stringify({
          oauth_consumer_key: 'TESTCONS',
          oauth_nonce: 'fcbc9c08d69ac269f7f1',
          oauth_signature_method: 'RSA-SHA256',
          oauth_timestamp: '1473793701',
          oauth_callback: 'oob',
          oauth_signature: sig,
        }),
        headers: {
          Accept: '*/*',
          Connection: 'close',
          'Content-Length': '527',
          'Content-Type': 'application/json',
          Host: 'localhost:12345',
          'User-Agent': 'Node authentication',
        },
        method: 'POST',
      }
    );
  });

  it('should match the access_token example', async () => {
    const sig = encodeURIComponent(
      'YbO1qrhY8HvK7+wUg7q8pxyBv4IeqcCqvZkES+XrCGvP77KZP7D+7iovvLjnyyOMlzuNpqNtZEVmDzN/9OGYwEAZWAhTMESlqB9+kmrBpg51/vIhlFUiZBvjLcqNyH49aKpbJvlCliSs3eHi9GWoHdEb1jDzu01UK3vsiFrSLfYTVc7xqviq3Ml5TBgwb8Ccxk28PFYRu4W9NSlez9J/jBkkwTwEpmeIn6RT1zTypXv5gyVCzeJdgJg1U4LzHIa26w+Tli0EmqKPLdwWwW57wQaOzegBeKqWmwrqbmDzbXoFz7FiXl4NXgcGXwB/yWjMgChhE0VjiBgfk3W1zTrWBA=='
    );
    const key = await readFile('./keys/test_private_rsa_signing.pem');
    const oa = new OAuth(
      new URL('http://localhost:12345/tradingapi/v1/oauth/request_token'),
      new URL('http://localhost:12345/tradingapi/v1/oauth/access_token'),
      'TESTCONS',
      new CryptoSigner('RSA-SHA256', key),
      {
        realm: 'test_realm',

        // override
        oauth_timestamp: '1473793702',
        oauth_nonce: 'afd6f94d3784db186f0e',
      }
    );
    await oa.getOAuthAccessToken(
      '25ebcc75204da80b73f4', // token
      '', // no token secret for ibkrs
      '61c107d4cf34ac6d9f2b' // verifier
    );
    expect(fetch).toHaveBeenLastCalledWith(
      'http://localhost:12345/tradingapi/v1/oauth/access_token',
      {
        body: new URLSearchParams(),
        headers: {
          Accept: '*/*',
          Authorization: `OAuth oauth_consumer_key="TESTCONS", oauth_nonce="afd6f94d3784db186f0e", oauth_signature="${sig}", oauth_signature_method="RSA-SHA256", oauth_timestamp="1473793702", oauth_token="25ebcc75204da80b73f4", oauth_verifier="61c107d4cf34ac6d9f2b", realm="test_realm"`,
          Connection: 'close',
          Host: 'localhost:12345',
          'User-Agent': 'Node authentication',
        },
        method: 'POST',
      }
    );
  });
});
