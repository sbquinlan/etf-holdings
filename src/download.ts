import { fluent, map } from "quinzlib";

export interface FundRow {
  ticker: string;
  name: string;
}

export interface HoldingRow {
  fund: string;
  holding: string;
  weight: number; // 11.0 means 11%
}

export abstract class Factory<TFundRecord, THoldingRecord> {
  genFunds(): AsyncIterable<[FundRow, HoldingRow[]]> {
    return fluent(
      this.genFundsTable(),
      map(async (fund_record) => {
        const holdings = await this.genHoldings(fund_record);
        return [this.convertFundRecord(fund_record), holdings];
      })
    );
  }

  async genHoldings(fund_record: TFundRecord) {
    const holdings = await this.genHoldingsTable(fund_record);
    return holdings.map(h => this.convertHoldingRecord(fund_record, h));
  }
  
  protected abstract genFundsTable(): AsyncIterable<TFundRecord>;
  protected abstract convertFundRecord(fund_record: TFundRecord): FundRow;

  protected abstract genHoldingsTable(fund_record: TFundRecord): Promise<THoldingRecord[]>;
  protected abstract convertHoldingRecord(
    fund_record: TFundRecord, 
    holding_record: THoldingRecord
  ): HoldingRow;
}
