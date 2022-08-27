import fetch from 'node-fetch';
import { fluent, map } from 'quinzlib';
import type { SPDRFundRecord, SPDRHoldingRecord } from './statestreet_types.js';
import { Factory, FundHoldingRow, FundRow, HoldingRow } from './download.js';
import { read, utils } from 'xlsx';

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
    yield* (payload.data.funds.etfs.datas as SPDRFundRecord[]).filter(
      (row) =>
        !~row.keywords.indexOf('Fixed Income') &&
        !~row.keywords.indexOf('Alternative') &&
        !~row.keywords.indexOf('Multi-Asset')
    );
  }

  private async genHoldingsTable(fund: SPDRFundRecord) {
    const holdings_uri = fund.documentPdf
      .filter((docs) => docs.docType === 'Holdings-daily')
      .at(0)
      ?.docs?.at(0)?.path;
    if (!holdings_uri) {
      return [];
    }
    const resp = await fetch(`${URI_BASE}${holdings_uri}`);
    if (!resp.ok) {
      const msg = await resp.text();
      throw new Error(`${resp.status} ${resp.statusText}: ${msg}`);
    }
    const workbook = read(await resp.arrayBuffer());
    const sheet = workbook.Sheets['holdings'];
    if (!sheet) {
      return [];
    }
    // The headers start on row 4 (0 indexed) as of this writing
    const raw = utils.sheet_to_json(sheet, { range: 4 }) as any[];

    // technically not sure the filtering is working so the excel format 
    // could result in different labels than SPDRHoldingRecord
    if (
      'Name' in raw[0] && 'Ticker' in raw[0] && 'Weight' in raw[0]
    ) {
      return raw as SPDRHoldingRecord[];
    }
    return [];
  } 

  private async genHoldings(
    fund: SPDRFundRecord
  ): Promise<[HoldingRow[], FundHoldingRow[]]> {
    const records = await this.genHoldingsTable(fund);
    return [
      records.map(
        r => ({
          ticker: r.Ticker,
          name: r.Name,
          // doesn't have this :(
          last: NaN,
        }),
      ),
      records.map(
        r => ({
          fund: fund.fundTicker,
          holding: r.Ticker,
          weight: parseFloat(r.Weight),
        }),
      ),
    ];
  }
}