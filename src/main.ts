import { BlackrockFactory } from './blackrock.js';

async function main() {
  const br_factory = new BlackrockFactory();
  const funds = await br_factory.genFunds();
  console.log(funds);
}

main();