import fetch from 'node-fetch';

export async function genVanguardFunds() {
  const resp = await fetch(
    'https://investor.vanguard.com/investment-products/list/funddetail'
  );
  if (!resp.ok) {
    const msg = await resp.text();
    throw new Error(`${resp.status} ${resp.statusText}: ${msg}`);
  }
  return await resp.json();
}
