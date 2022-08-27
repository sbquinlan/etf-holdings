import fetch from 'node-fetch';
import type { SPDRFundRecord, SPDRHoldingRecord } from './statestreet_types.js';
import { Factory, FundRow, HoldingRow } from './download.js';
import { read, utils } from 'xlsx';

const URI_BASE = 'https://www.ssga.com';
export class StateStreetFactory extends Factory<SPDRFundRecord, SPDRHoldingRecord> {
  protected async *genFundsTable() {
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

  protected convertFundRecord(fund_record: SPDRFundRecord): FundRow {
    return {
      ticker: fund_record.fundTicker.trim().toUpperCase(),
      name: fund_record.fundName.trim(),
    };
  }

  protected async genHoldingsTable(fund: SPDRFundRecord) {
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

  protected convertHoldingRecord(fund_record: SPDRFundRecord, r: SPDRHoldingRecord): HoldingRow {
    return {
      fund: fund_record.fundTicker.trim(),
      holding: r.Ticker.trim().toUpperCase(),
      weight: parseFloat(r.Weight),
    }
  }
}