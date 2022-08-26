import fetch from 'node-fetch';
import { fluent, map } from 'quinzlib';
import type { SPDRFundRow } from './statestreet_types.js';
import { Factory, FundHoldingRow, FundRow, HoldingRow } from './download.js';

const URI_BASE = 'https://www.ssga.com';
export class StateStreetFactory extends Factory {
  genFunds(): AsyncIterable<[FundRow, HoldingRow[], FundHoldingRow[]]> {
    return fluent(
      this.genFundsTable(),
      map(async (record) => {
        console.log(record.fundName);
        const [holdings, joins] = await this.genHoldings(record);
        const fund = {
          ticker: record.fundTicker,
          name: record.fundName,
        };
        return [fund, holdings, joins];
      })
    );
  }

  private async *genFundsTable() {
    const resp = await fetch(
      `${URI_BASE}/bin/v1/ssmp/fund/fundfinder?country=us&language=en&role=intermediary&product=etfs&ui=fund-finder`
    );
    if (!resp.ok) {
      const msg = await resp.text();
      throw new Error(`${resp.status} ${resp.statusText}: ${msg}`);
    }
    const payload = (await resp.json()) as any;
    // no way real to filter these
    yield* (payload.data.funds.etfs.datas as SPDRFundRow[]).filter(
      (row) =>
        !~row.keywords.indexOf('Fixed Income') ||
        !~row.keywords.indexOf('Alternative') ||
        !~row.keywords.indexOf('Multi-Asset')
    );
  }

  private async genHoldingsTable(fund: SPDRFundRow) {
    const holdings_uri = fund.documentPdf
      .filter((docs) => docs.docType === 'Holdings-daily')
      .at(0)
      ?.docs?.at(0)?.path;
    if (!holdings_uri) {
      return [];
    }
    // need excel to parse this uri.
    return [];
  }

  private async genHoldings(
    fund: SPDRFundRow
  ): Promise<[HoldingRow[], FundHoldingRow[]]> {
    await this.genHoldingsTable(fund);
    return [
      [],
      [],
      // rows.map(record => ({
      //   ticker: record.ticker,
      //   name: record.shortName,
      //   // jank but maybe it'll work
      //   last: (parseFloat(record.marketValue) / parseFloat(record.sharesHeld))
      // })),
      // rows.map(record => ({
      //   fund: fund.profile.ticker,
      //   holding: record.ticker,
      //   weight: parseFloat(record.percentWeight),
      // }))
    ];
  }
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
