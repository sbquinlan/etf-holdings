import { writeFile } from 'fs/promises';
import { fluent, flatten, sink, sluice, pool, zip, reduce, sift, map } from 'quinzlib';

import { ErrorTF, FundRow, HoldingRow } from './download.js';
import { StateStreetFactory } from './statestreet.js';
import { VanguardFactory } from './vanguard.js';

async function main() {
  const full_data = await fluent(
    zip(
      (new VanguardFactory()).genFunds(), 
      // (new BlackrockFactory()).genFunds(), 
      (new StateStreetFactory()).genFunds(), 
      // (new InvescoFactory()).genFunds(), 
    ),
    pool(3), 
    sluice(1, 100),
    flatten(),
    sift((t): t is FundRow => {
      if (!t) return false;
      if (t instanceof ErrorTF) {
        console.error(`Error with ${t.fund}`);
        return false;
      }
      if (!t.holdings.every(h => typeof h.ticker === 'string')) {
        throw new Error(`Ticker is not a string: ${t.holdings[0].ticker} in ${t.ticker}`);
      }
      if (!t.holdings.every(h => String(parseInt(h.ticker)) !== h.ticker)) {
        console.log(JSON.stringify(t, null, 2));
        throw new Error(`Ticker is a number: ${t.holdings[0].ticker} in ${t.ticker}`);
      }
      return true;
    }),
    sink(),
  ) as FundRow[];

  const collapsed_holdings = await fluent(
    full_data,
    map(async fund => fund.holdings),
    flatten(),
    reduce(
      (collapsed: Record<string, Partial<HoldingRow>>, next) => {
        const { weight, ticker, ... fields } = next;
        if (ticker in collapsed) {
          collapsed[ticker] = {
            ... Object.fromEntries(
              Object.entries(fields).filter(([_, v]) => !!v)
              ),
              ... Object.fromEntries(
                Object.entries(collapsed[next.ticker]).filter(([_, v]) => !!v)
              ),
              ticker,
            };
        } else {
          collapsed[ticker] = next;
        }
        return collapsed;
      },
      {},
    )
  );

  const rectified = full_data.map(fund => {
    const holdings = fund.holdings.map(holding => {
      const { weight } = holding;
      return { weight, ... collapsed_holdings[holding.ticker] };
    });
    return { ... fund, holdings };
  });
  
  await Promise.all([
    writeFile('./data/all-holdings.json', JSON.stringify(collapsed_holdings)),
    writeFile('./data/etf-holdings.json', JSON.stringify(rectified))
  ]);
}

main();
