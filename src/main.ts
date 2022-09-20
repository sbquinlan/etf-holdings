import { writeFile } from 'fs/promises';
import { fluent, flatten, sink, sluice, pool, zip, filter } from 'quinzlib';

import { BlackrockFactory } from './blackrock.js';
import { VanguardFactory } from './vanguard.js';
import { StateStreetFactory } from './statestreet.js';
import { InvescoFactory } from './invesco.js';
import { ErrorTF, FundRow, HoldingRow } from './download.js';

async function main() {
  const results = await fluent(
    zip(
      (new VanguardFactory()).genFunds(), 
      (new BlackrockFactory()).genFunds(), 
      (new StateStreetFactory()).genFunds(), 
      (new InvescoFactory()).genFunds(), 
    ),
    pool(3), 
    sluice(1, 100),
    flatten(),
    filter((t): t is ErrorTF | [FundRow, HoldingRow[]] => !!t),
    sink(),
  );
  const [errors, funds] = results.reduce<[ErrorTF[], [FundRow, HoldingRow[]][]]>(
    ([errors, funds], next) => (
      next instanceof ErrorTF 
        ? [errors.concat([next]), funds] 
        : [errors, funds.concat([next] as [FundRow, HoldingRow[]][])]
    ),
    [[], []],
  );
  console.log(`${errors.length} Errors: `);
  for (const e of errors) {
    console.log(e.fund);
  }
  await writeFile('./etf-holdings.json', JSON.stringify(funds));
}

main();
