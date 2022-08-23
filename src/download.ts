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

export abstract class Factory<TFundRow extends FundRow> {
  abstract genFunds(): Promise<Array<TFundRow>>;
  abstract genHoldings(
    row: TFundRow
  ): Promise<[HoldingRow[], FundHoldingRow[]]>;
}

