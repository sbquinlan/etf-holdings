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
    
    const equity_etfs = payload.data.funds.etfs.categories
      .find((cat: any) => cat.key === 'assetclass')?.subCategories
      ?.find((cat: any) => cat.key === 'equity')?.funds
      ?.split('|');
    const us_etfs = payload.data.funds.etfs.categories
      .find((cat: any) => cat.key === 'geographical-exposure')?.subCategories
      ?.find((cat: any) => cat.key === 'geographical-exposure')?.subCategories
      ?.find((cat: any) => cat.key === 'investment-geography')?.subCategories
      ?.find((cat: any) => cat.key === 'United-States')?.funds
      ?.split('|');
    
    // set intersection of us_etfs and equity_etfs
    const etfs = new Set(us_etfs?.filter((etf: string) => equity_etfs?.includes(etf)));
    yield* (payload.data.funds.etfs.datas as SPDRFundRecord[]).filter(
      (fund) => etfs.has(fund.fundFilter)
    );
  }

  protected convertFundRecord(fund_record: SPDRFundRecord): Omit<FundRow, 'holdings'> {
    console.log(fund_record.fundName.trim())
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
    return raw.filter(
      r => 'Name' in r && 'Ticker' in r && 'Weight' in r
    )
  }

  protected convertHoldingRecord(_f: SPDRFundRecord, r: SPDRHoldingRecord): HoldingRow {
    return {
      ticker: r.Ticker.trim().toUpperCase(),
      sedol: r.SEDOL.trim().toLowerCase(),
      ski: r.Identifier.trim().toLowerCase(),
      last: 0,
      weight: parseFloat(r.Weight),
    }
  }
}