type LabelAndData = [string, number | string];

export interface SPDRFundRecord {
  domicile: string; // "US",
  fundName: string; // "SPDR® Blackstone High Income ETF",
  fundTicker: string; // "HYBL",
  fundUri: string; // "/us/en/intermediary/etfs/funds/spdr-blackstone-high-income-etf-hybl",
  ter: LabelAndData; // [0.70%, 0.7]
  nav: LabelAndData; // [$28.59, 28.59]
  aum: LabelAndData; // [$122.95 M, 122.95]
  asOfDate: LabelAndData; // [Aug 18 2022, "2022-08-18"]
  PerfAsOf: LabelAndData; // [Jul 31 2022, "2022-07-31"]
  mo1: LabelAndData; // [4.15%, 4.15]
  qtd: LabelAndData; // [4.15%, 4.15]
  ytd: LabelAndData; // [-, -5e-324]
  yr1: LabelAndData; // [-, -5e-324]
  yr3: LabelAndData; // [-, -5e-324]
  yr5: LabelAndData; // [-, -5e-324]
  yr10: LabelAndData; // [-, -5e-324]
  sinceInception: LabelAndData; // [-4.11%, -4.11]
  inceptionDate: LabelAndData; // [Feb 16 2022, "2022-02-16"]
  PerfAsOf_1: LabelAndData; // [Jun 30 2022, "2022-06-30"]
  mo1_1: LabelAndData; // [-5.13%, -5.13]
  qtd_1: LabelAndData; // [-7.69%, -7.69]
  ytd_1: LabelAndData; // [-, -5e-324]
  yr1_1: LabelAndData; // [-, -5e-324]
  yr3_1: LabelAndData; // [-, -5e-324]
  yr5_1: LabelAndData; // [-, -5e-324]
  yr10_1: LabelAndData; // [-, -5e-324]
  sinceInception_1: LabelAndData; // [-7.93%, -7.93]
  primaryExchange: string, // 'Cboe BZX Exchange, Inc';
  closePrice: LabelAndData; // [$28.73, 28.73]
  bidAsk: LabelAndData; // [$28.73, 28.73]
  premiumDiscount: LabelAndData; // [0.48%, 0.48]
  documentPdf: {
    docType:
      | 'Prospectus'
      | 'Summary-prospectus'
      | 'Sai'
      | 'Navhist'
      | 'Holdings-daily';
    docs: [
      {
        language: string; // "",
        name: string; // "Daily Holdings",
        path: string; // "/library-content/products/fund-data/etfs/us/holdings-daily-us-en-hybl.xlsx",
        canDownload: boolean; // true,
        docViewer?: string; // "/us/en/intermediary/etfs/resources/doc-viewer#hybl&prospectus"
      }
    ];
  }[];
  fundFilter: string; // "HYBL",
  popUp: boolean; // false,
  keywords: string; // "SPDR® Blackstone High Income ETF, HYBL, Fixed Income, US78470P8462, 78470P846, Multi-Sector, High Yield",
  perfIndex: [
    {
      fundName: 'Bloomberg U.S. Aggregate Bond Index';
      fundTicker: '-';
      ter: '-';
      PerfAsOf: 'Jul 31 2022';
      mo1: '2.44%';
      qtd: '2.44%';
      ytd: '-8.16%';
      yr1: '-9.12%';
      yr3: '-0.21%';
      yr5: '1.28%';
      yr10: '1.65%';
      sinceInception: '-4.27%';
      inceptionDate: 'Feb 16 2022';
      PerfAsOf_1: 'Jun 30 2022';
      mo1_1: '-1.57%';
      qtd_1: '-4.69%';
      ytd_1: '-10.35%';
      yr1_1: '-10.29%';
      yr3_1: '-0.93%';
      yr5_1: '0.88%';
      yr10_1: '1.54%';
      sinceInception_1: '-6.55%';
      num: 13;
    }
  ];
}

export  interface SPDRHoldingRecord {
  Name: string, // 'Boeing Company',
  Ticker: string, // 'BA',
  Identifier: string, // '09702310',
  SEDOL: string, // '2108601',
  Weight: string, // '0.589645',
  Sector: string,  // 'Industrials',
  'Shares Held': string, // '3510.000',
  'Local Currency': string, // 'USD'
}