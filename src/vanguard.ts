import fetch from 'node-fetch';
import { Factory, FundRow, HoldingRow } from './download.js';
import type {
  VanguardFundRecord,
  VanguardHoldingRecord,
} from './vanguard_types.js';

const URI_BASE = 'https://investor.vanguard.com';

export class VanguardFactory extends Factory<VanguardFundRecord, VanguardHoldingRecord> {
  protected async *genFundsTable() {
    const resp = await fetch(`${URI_BASE}/investment-products/list/funddetail`, {
      "headers": {
        "accept": "application/json, text/plain, */*",
        "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.0.0 Safari/537.36"
      },
    });
    if (!resp.ok) {
      const msg = await resp.text();
      throw new Error(`${resp.status} ${resp.statusText}: ${msg}`);
    }
    const payload = (await resp.json()) as any;
    yield* (payload.fund.entity as VanguardFundRecord[])
      .filter((fund) => fund.profile.isETF && fund.profile.fundFact.isStock && fund.profile.fundFact.isDomesticStockFund);
  }

  protected convertFundRecord(fund_record: VanguardFundRecord): Omit<FundRow, 'holdings'> {
    console.log(fund_record.profile.longName.trim());
    return {
      ticker: fund_record.profile.ticker.trim().toUpperCase(),
      name: fund_record.profile.longName.trim(),
    };
  }

  protected async genHoldingsTable(fund_record: VanguardFundRecord) {
    // Does not include bonds, short term reserve, currency, derivative, commedity, etc.
    const ticker = fund_record.profile.ticker.trim().toUpperCase();
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

  protected convertHoldingRecord(
    _f: VanguardFundRecord, 
    holding_record: VanguardHoldingRecord,
  ): HoldingRow {
    return {
      ticker: holding_record.ticker.trim().toUpperCase(),
      isin: holding_record.isin.trim().toLowerCase(),
      // janky
      last: parseFloat(holding_record.marketValue) / parseFloat(holding_record.sharesHeld),
      weight: parseFloat(holding_record.percentWeight),
    }
  }
}
