import { genFormattedFunds } from './blackrock.js';

async function main() {
  const funds = await genFormattedFunds();
  console.log(funds);
}

main();
