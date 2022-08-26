export interface FundRow {
  ticker: string;
  name: string;
}

export interface HoldingRow {
  ticker: string;
  name: string;
  last: number;
}

export interface FundHoldingRow {
  fund: string;
  holding: string;
  weight: number; // 11.0 means 11%
}

export abstract class Factory {
  abstract genFunds(): AsyncIterable<[FundRow, HoldingRow[], FundHoldingRow[]]>;
}

