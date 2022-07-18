import fetch from 'node-fetch';

async function main() {
  const resp = await fetch('https://localhost:4001/v1/api/iserver/accounts', { method: 'GET' });
  const body = await resp.text();
  console.log(resp.status, resp.statusText, body);
}

main()