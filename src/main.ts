import { BlackrockFactory } from './blackrock.js';
import { fluent } from './lib/fluent.js';
import { sink } from './lib/iterable.js';
import { sluice, pool } from './lib/iterator.js';
import { VanguardFactory } from './vanguard.js';

async function main() {
  const van_factor = new VanguardFactory();
  new BlackrockFactory();
  const funds = await sink(
    fluent(
      van_factor.genFunds(),
      pool(3),
      sluice(1, 100),
    ),
  );
  console.log(funds);
}

main();