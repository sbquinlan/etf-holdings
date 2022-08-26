import { fluent, sink, sluice, pool } from 'quinzlib';

import { BlackrockFactory } from './blackrock.js';
import { VanguardFactory } from './vanguard.js';

async function main() {
  const van_factor = new VanguardFactory();
  new BlackrockFactory();
  const funds = await sink(
    fluent(van_factor.genFunds(), pool(3), sluice(1, 100))
  );
  console.log(funds);
}

main();
