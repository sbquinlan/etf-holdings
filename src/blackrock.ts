import fetch from 'node-fetch';
import { collect, leaky, map } from './lib/iterator.js';

interface BlackrockListingTable {
  columns: Array<{ name: string }>;
  data: Array<Array<any>>;
}

const URI_BASE = 'https://www.blackrock.com';
const FUNDLIST_URI = `${URI_BASE}/us/individual/product-screener/product-screener-v3.jsn?dcrPath=/templatedata/config/product-screener-v3/data/en/one/one-v4`;

const COLUMNS = [
  'localExchangeTicker', // IVW
  'fundShortName', // iShares S&P 500 Growth
  'aladdinAssetClass', // Equity
  'aladdinSubAssetClass', // Large Cap
  'productPageUrl', // "/us/individual/products/239725/ishares-sp-500-growth-etf"
  'portfolioId', // 239725
];

interface iSharesRecord {
  localExchangeTicker: string;
  fundShortName: string;
  aladdinAssetClass: string | undefined;
  aladdinSubAssetClass: string | undefined;
  productPageUrl: string;
  holdingsUrl: string;
  portfolioId: number;
}
function isRecordEntry(
  entry: [string, number]
): entry is [keyof iSharesRecord, number] {
  return Boolean(~COLUMNS.indexOf(entry[0]));
}

async function genRawFundList() {
  const resp = await fetch(FUNDLIST_URI);
  if (!resp.ok) {
    const msg = await resp.text();
    throw new Error(`${resp.status} ${resp.statusText}: ${msg}`);
  }
  const raw = await resp.json();
  return (<any>raw).data.tableData as BlackrockListingTable;
}

export async function genFormattedFunds(): Promise<Array<iSharesRecord>> {
  const fund_payload = await genRawFundList();
  const column_to_index = Object.fromEntries(
    fund_payload.columns.map((col, idx) => [col.name, idx])
  );
  const record_entries = Object.entries(column_to_index).filter(isRecordEntry);
  const partials: Iterable<Partial<iSharesRecord>> = fund_payload.data
    // filter out all non-etfs
    .filter((row) => row[column_to_index['productView']]?.at(1) === 'ishares')
    // add in holdings uri
    .map((row) =>
      Object.fromEntries(record_entries.map(([name, idx]) => [name, row[idx]]))
    )
    .values();
  return await collect(
    map(
      leaky(partials, 3, 1000),
      async (p) => {
        console.log(p.fundShortName)
        const holdingsUrl = await genHoldingsURI(p.productPageUrl!);
        return <iSharesRecord>{ ...p, holdingsUrl };
      },
      3
    )
  );
}

/**
 * This is stupid. I don't know what the number is before .ajax. It looks like a timestamp,
 * but doesn't really correlate with anything else in the funds table. For example, the holdings
 * link for IVW is 1464253357814.ajax which would be May 26 2016, a Thursday, at just past 2am PST.
 * It doesn't make sense. The fund was launched May 22 2000. So it's not any other date.
 *
 * So we're left with scraping the link using a simple regex out of the page. This could easily break.
 */
const HOLDINGS_REGEX =
  /\/us\/individual\/products\/\d+\/[^/]+\/\d+.ajax\?tab=all&fileType=json/;
async function genHoldingsURI(product_url: string) {
  const resp = await fetch(`${URI_BASE}${product_url}`);
  if (!resp.ok) {
    const msg = await resp.text();
    throw new Error(`${resp.status} ${resp.statusText}: ${msg}`);
  }
  const raw = await resp.text()!;
  return raw.match(HOLDINGS_REGEX)?.at(0);
}
