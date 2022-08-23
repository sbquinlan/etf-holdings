import fetch from 'node-fetch';
import type { HoldingRow } from './vanguard_types.js';

const URI_BASE = 'https://investor.vanguard.com';

export async function genVanguardFunds() {
  const resp = await fetch(`${URI_BASE}/investment-products/list/funddetail`);
  if (!resp.ok) {
    const msg = await resp.text();
    throw new Error(`${resp.status} ${resp.statusText}: ${msg}`);
  }
  return await resp.json();
}

export async function genHoldings(ticker: string) {
  // Does not include bonds, short term reserve, currency, derivative, commedity, etc.
  const resp = await fetch(
    `${URI_BASE}/investment-products/etfs/profile/api/${ticker}/portfolio-holding/stock`
  );
  if (!resp.ok) {
    const msg = await resp.text();
    throw new Error(`${resp.status} ${resp.statusText}: ${msg}`);
  }
  // root.fund.entity
  const holdings = (await resp.json()) as any;
  return holdings.fund.entity as HoldingRow[];
}
