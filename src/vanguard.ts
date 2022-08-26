import fetch from 'node-fetch';
import { Factory, FundHoldingRow, FundRow, HoldingRow } from './download.js';
import { fluent } from './lib/fluent.js';
import { map } from './lib/iterator.js';
import type { VanguardFundRecord, VanguardHoldingRecord } from './vanguard_types.js';

const URI_BASE = 'https://investor.vanguard.com';

export class VanguardFactory extends Factory {
  genFunds(): AsyncIterable<[FundRow, HoldingRow[], FundHoldingRow[]]> {
    return fluent(
      this.genFundsTable(),
      map(
        async (record) => {
          console.log(record.profile.longName)
          const [holdings, joins] = await this.genHoldings(record);
          const fund = {
            ticker: record.profile.ticker, 
            name: record.profile.longName,
          };
          return [fund, holdings, joins];
        }
      )
    )
  }

  private async *genFundsTable()  {
    const resp = await fetch(`${URI_BASE}/investment-products/list/funddetail`);
    if (!resp.ok) {
      const msg = await resp.text();
      throw new Error(`${resp.status} ${resp.statusText}: ${msg}`);
    }
    const payload = (await resp.json()) as any;
    const funds = (payload.fund.entity as VanguardFundRecord[])
      .filter(fund => fund.profile.isETF && fund.profile.fundFact.isStock)
    yield *funds;
  }

  private async genHoldingsTable(ticker: string) {
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
    return (holdings.fund?.entity as VanguardHoldingRecord[]) ?? [];
  }

  private async genHoldings(fund: VanguardFundRecord): Promise<[HoldingRow[], FundHoldingRow[]]> {
    const rows = await this.genHoldingsTable(fund.profile.ticker);
    return [
      rows.map(record => ({
        ticker: record.ticker,
        name: record.shortName,
        // jank but maybe it'll work
        last: (parseFloat(record.marketValue) / parseFloat(record.sharesHeld))
      })),
      rows.map(record => ({
        fund: fund.profile.ticker,
        holding: record.ticker,
        weight: parseFloat(record.percentWeight),
      }))
    ]
  }
}
