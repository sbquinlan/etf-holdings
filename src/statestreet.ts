import fetch from 'node-fetch';
import type { SPDRFundRow } from './statestreet_types.js';
import { HoldingRow } from './download.js';

const URI_BASE = 'https://www.ssga.com';
export async function genFunds() {
  const resp = await fetch(
    `${URI_BASE}/bin/v1/ssmp/fund/fundfinder?country=us&language=en&role=intermediary&product=etfs&ui=fund-finder`
  );
  if (!resp.ok) {
    const msg = await resp.text();
    throw new Error(`${resp.status} ${resp.statusText}: ${msg}`);
  }
  const payload = await resp.json();
  return (<any>payload).data.funds.etfs.datas as SPDRFundRow[];
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
