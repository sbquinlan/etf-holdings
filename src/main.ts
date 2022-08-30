import { fluent, flatten, sink, sluice, pool, zip } from 'quinzlib';

import { BlackrockFactory } from './blackrock.js';
import { VanguardFactory } from './vanguard.js';
import { StateStreetFactory } from './statestreet.js';
import { InvescoFactory } from './invesco.js';

async function main() {
  const funds = await fluent(
    zip(
      (new VanguardFactory()).genFunds(), 
      (new BlackrockFactory()).genFunds(), 
      (new StateStreetFactory()).genFunds(), 
      (new InvescoFactory()).genFunds(), 
    ),
    pool(3), 
    sluice(1, 100),
    flatten(),
    sink(),
  );
  console.log(funds);
}

main();
