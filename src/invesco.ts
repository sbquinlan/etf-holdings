
import fetch from 'node-fetch';
import Papa from 'papaparse';
import { parse } from 'node-html-parser';

import { Factory, FundRow, HoldingRow } from './download.js';
import { InvescoHoldingRecord, InvescoFundRecord } from './invesco_types.js';

const URI_BASE = 'https://www.invesco.com/';

export class InvescoFactory extends Factory<InvescoFundRecord, InvescoHoldingRecord> {
  protected async *genFundsTable() {
    const resp = await fetch(
      `${URI_BASE}/us/financial-products/etfs/performance/main/performance/0?audienceType=Investor&action=getPerformance&FilterList=FCLASS_ASSET_TYPE%2526EQUITY&showNav=true&monthly=true`
    );
    if (!resp.ok) {
      const msg = await resp.text();
      throw new Error(`${resp.status} ${resp.statusText}: ${msg}`);
    }
    const payload = parse(await resp.text());
    // this one is more complicated than previously thought
    const html_rows = payload.querySelectorAll('#etfPerformancesTable > tbody:not(.tablesorter-no-sort) tr');
    yield* Array.from(
      html_rows, 
      row => {
        const labels = row.querySelectorAll('td:nth-child(1) > .fund-link > div > a');
        const [name, ticker] = Array.from(labels, div => div.innerText);
        return { name: name.trim(), ticker: ticker.trim().toUpperCase() };
      },
    );
  }

  protected convertFundRecord(record: InvescoFundRecord): FundRow {
    console.log(record);
    return record;
  }

  protected async genHoldingsTable(fund: InvescoFundRecord) {
    const resp = await fetch(`${URI_BASE}/us/financial-products/etfs/holdings/main/holdings/0?audienceType=Investor&action=download&ticker=${fund.ticker}`);
    if (!resp.ok) {
      const msg = await resp.text();
      throw new Error(`${resp.status} ${resp.statusText}: ${msg}`);
    }
    return Papa.parse(
      await resp.text(), 
      { header: true, skipEmptyLines: true }
    ).data as InvescoHoldingRecord[];
  } 

  protected convertHoldingRecord(f: InvescoFundRecord, r: InvescoHoldingRecord): HoldingRow {
    return {
      fund: r['Fund Ticker'].trim().toUpperCase(),
      holding: r['Holding Ticker'].trim().toUpperCase(),
      weight: parseFloat(r.Weight),
    };
  }
}
