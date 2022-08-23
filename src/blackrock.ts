import fetch from 'node-fetch';
import { sink, pool, sluice, map } from './lib/iterator.js';

import {
  BlackrockListingTable,
  BlackrockFundRecord,
  BlackrockHoldingColumns,
  BlackrockHoldingRecord,
} from './blackrock_types.js';
import { FundRow, HoldingRow, FundHoldingRow, Factory } from './download.js';

const URI_BASE = 'https://www.blackrock.com';
const HOLDINGS_REGEX =
  /\/us\/individual\/products\/\d+\/[^/]+\/\d+.ajax\?tab=all&fileType=json/;

type BlackrockFundRow = FundRow & { holdingsURI?: string };
export class BlackrockFactory extends Factory<BlackrockFundRow> {
  private async genHoldingsURI(product_url: string) {
    const resp = await fetch(`${URI_BASE}${product_url}`);
    if (!resp.ok) {
      const msg = await resp.text();
      throw new Error(`${resp.status} ${resp.statusText}: ${msg}`);
    }
    const raw = await resp.text()!;
    // some funds don't have holdings like the gold trust etf
    return raw.match(HOLDINGS_REGEX)?.at(0);
  }

  async genFunds(): Promise<Array<BlackrockFundRow>> {
    const resp = await fetch(
      `${URI_BASE}/us/individual/product-screener/product-screener-v3.jsn?dcrPath=/templatedata/config/product-screener-v3/data/en/one/one-v4`
    );
    if (!resp.ok) {
      const msg = await resp.text();
      throw new Error(`${resp.status} ${resp.statusText}: ${msg}`);
    }
    const payload = await resp.json() as any;
    const table = payload.data.tableData as BlackrockListingTable;
    const column_to_index: [string, number][] = table.columns.map(
      (col, idx) => [col.name, idx]
    );
    const partials: Iterable<BlackrockFundRecord> = table.data.map(
      (row) =>
        Object.fromEntries(
          column_to_index.map(([name, idx]) => [name, row[idx]])
        ) as BlackrockFundRecord
      )
      // filter out non-etfs
      .filter((record) => record.productView[1] === 'ishares')
      .filter(record => record.aladdinAssetClass === 'equity')
      .values();
    const limited = sluice(partials, 3, 1000); // 1 every second (up to 3 burst)
    const mapped = map(
      limited,
      async (p) => {
        console.log(p.fundShortName);
        const holdingsURI = await this.genHoldingsURI(p.productPageUrl!);
        return {
          ticker: p.localExchangeTicker,
          name: p.fundShortName,
          holdingsURI,
        };
      },
    );
    const pooled = pool(mapped, 3);
    return await sink(pooled);
  }

  async genHoldings(
    fund: BlackrockFundRow
  ): Promise<[HoldingRow[], FundHoldingRow[]]> {
    if (!fund.holdingsURI) {
      return [[],[]];
    }
    const resp = await fetch(`${URI_BASE}${fund.holdingsURI}`);
    if (!resp.ok) {
      const msg = await resp.text();
      throw new Error(`${resp.status} ${resp.statusText}: ${msg}`);
    }
    const payload = await resp.json() as any;
    const column_to_index: [string, number][] = BlackrockHoldingColumns.map(
      (name, idx) => [name, idx]
    );
    const records: BlackrockHoldingRecord[] = payload.aaData.map(
      (record: any[]) =>
        Object.fromEntries(
          column_to_index.map(([name, idx]) => [name, record[idx]])
        ) as BlackrockHoldingRecord
    );
    return [
      records.map((raw) => ({
        ticker: raw.ticker,
        name: raw.name,
        last: raw.last.raw,
      })),
      records.map((raw) => ({
        fund: fund.ticker,
        holding: raw.ticker,
        weight: raw.weight.raw,
      })),
    ];
  }
}
