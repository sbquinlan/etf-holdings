
export interface InvescoFundRecord {
  ticker: string,
  name: string,
}

export interface InvescoHoldingRecord {
  "Fund Ticker": string; // ADRE
  "Security Identifier": string; // 874039100
  "Holding Ticker": string; // TSM
  "Shares/Par Value": string; // "305,938"
  "MarketValue": string; // "26,790,990.66"
  "Weight": string; // 19.633
  "Name": string; // Taiwan Semiconductor Manufacturing Co Ltd ADR
  "Class of Shares": string; // American Depository Receipt
  "Sector": string; // Information Technology
  "Date": string; // 08/25/2022
}