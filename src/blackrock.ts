import fetch from 'node-fetch';

import {
  BlackrockListingTable,
  BlackrockFundRecord,
  BlackrockHoldingColumns,
  BlackrockHoldingRecord,
} from './blackrock_types.js';
import { HoldingRow, Factory, FundRow } from './download.js';

const URI_BASE = 'https://www.blackrock.com';
const HOLDINGS_REGEX =
  /\/us\/individual\/products\/\d+\/[^/]+\/\d+.ajax\?tab=all&fileType=json/;
export class BlackrockFactory extends Factory<BlackrockFundRecord, BlackrockHoldingRecord> {
  protected async *genFundsTable() {
    const resp = await fetch(
      `${URI_BASE}/us/individual/product-screener/product-screener-v3.jsn?dcrPath=/templatedata/config/product-screener-v3/data/en/one/one-v4`
    );
    if (!resp.ok) {
      const msg = await resp.text();
      throw new Error(`${resp.status} ${resp.statusText}: ${msg}`);
    }
    const payload = (await resp.json()) as any;
    const table = payload.data.tableData as BlackrockListingTable;
    const column_to_index: [string, number][] = table.columns.map(
      (col, idx) => [col.name, idx]
    );
    yield* table.data
      .map(
        (row) =>
          Object.fromEntries(
            column_to_index.map(([name, idx]) => [name, row[idx]])
          ) as BlackrockFundRecord
      )
      // filter out non-etfs
      .filter((record) => record.productView[1] === 'ishares')
      .filter((record) => record.aladdinAssetClass === 'Equity');
  }

  protected convertFundRecord(p: BlackrockFundRecord): Omit<FundRow, 'holdings'> {
    console.log(p.fundShortName);
    throw new Error('isin missing');
    return {
      ticker: p.localExchangeTicker.trim().toUpperCase(),
      isin: '',
      cusip: '',
      name: p.fundShortName.trim(),
    };
  }

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

  protected async genHoldingsTable(fund_record: BlackrockFundRecord): Promise<BlackrockHoldingRecord[]> {
    const holdings_uri = await this.genHoldingsURI(fund_record.productPageUrl!);
    if (!holdings_uri) {
      return [];
    }
    const resp = await fetch(`${URI_BASE}${holdings_uri}`);
    if (!resp.ok) {
      const msg = await resp.text();
      throw new Error(`${resp.status} ${resp.statusText}: ${msg}`);
    }
    const payload = (await resp.json()) as any;
    const column_to_index: [string, number][] = BlackrockHoldingColumns.map(
      (name, idx) => [name, idx]
    );
    return payload.aaData.map(
      (record: any[]) =>
        Object.fromEntries(
          column_to_index.map(([name, idx]) => [name, record[idx]])
        ) as BlackrockHoldingRecord
    );
  }

  protected convertHoldingRecord(
    _: BlackrockFundRecord,
    record: BlackrockHoldingRecord,
  ): HoldingRow {
    return {
      ticker: record.ticker.trim().toUpperCase(),
      isin: record.isin.trim().toLowerCase(),
      cusip: record.cusip.trim().toLowerCase(),
      last: record.last.raw,
      weight: record.weight.raw,
    }
  }
}