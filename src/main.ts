import { fluent, sink, sluice, pool } from 'quinzlib';

import { BlackrockFactory } from './blackrock.js';
import { VanguardFactory } from './vanguard.js';
import { StateStreetFactory } from './statestreet.js';
import { InvescoFactory } from './invesco.js';

async function main() {
  new VanguardFactory();
  new BlackrockFactory();
  new StateStreetFactory();
  const factory = new InvescoFactory();
  const funds = await sink(
    fluent(factory.genFunds(), pool(3), sluice(1, 100))
  );
  console.log(funds);
}

main();
