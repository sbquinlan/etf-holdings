type ShortLabeledData = { d: string; r: number };
type LabeledData = { display: string; raw: number };

export interface BlackrockListingTable {
  columns: Array<{ name: string }>;
  data: Array<Array<any>>;
}
export interface BlackrockFundRecord {
  aladdinAssetClass: string; // "Fixed Income",
  aladdinAssetClassCode: string; // "43515",
  aladdinCountry: string; // "United States",
  aladdinCountryCode: string; // "43632",
  aladdinEsgClassification: string; // "-",
  aladdinEsgClassificationCode: string; // "-",
  aladdinMarketType: string; // "Developed",
  aladdinMarketTypeCode: string; // "43513",
  aladdinRegion: string; // "North America",
  aladdinRegionCode: string; // "43512",
  aladdinSfdr: string; // "-",
  aladdinSfdrCode: string; // "-",
  aladdinSubAssetClass: string; // "Mortgages",
  aladdinSubAssetClassCode: string; // "43775",
  distYieldMkt: string; // "-",
  fundShortName: string; // "U.S. Mortgage Fund",
  glsDoc: string; // "-",
  inceptionDate: ShortLabeledData; // { "d": "Dec 06, 2010", "r": 20101206 },
  investmentStyle: string; // "[Active]",
  investmentStyleCode: string; // "[44341]",
  investorClassName: string; // "Investor C",
  localExchangeTicker: string; // "BMPCX",
  navFiveYearAnnualized: ShortLabeledData; // { "d": "0.47", "r": 0.47 }
  navOneYearAnnualized: ShortLabeledData; // { "d": "-9.20", "r": -9.2 }
  navPerfAsOf: ShortLabeledData; // { "d": "Jul 31, 2022", "r": 20220731 }
  navSinceInceptionAnnualized: ShortLabeledData; // { "d": "3.39", "r": 3.39 }
  navTenYearAnnualized: ShortLabeledData; // { "d": "1.39", "r": 1.39 }
  navThreeYearAnnualized: ShortLabeledData; // { "d": "-0.71", "r": -0.71 }
  navYearToDate: ShortLabeledData; // { "d": "-8.82", "r": -8.82 }
  portfolioId: number; // 227349,
  premiumDiscount: string; // "-",
  priceFiveYearAnnualized: string; // "-",
  priceOneYearAnnualized: string; // "-",
  priceSinceInceptionAnnualized: string; // "-",
  priceTenYearAnnualized: string; // "-",
  priceThreeYearAnnualized: string; // "-",
  priceYearToDate: string; // "-",
  productPageUrl: string; // "/us/individual/products/227349/blackrock-us-mortgage-portfolio-cl-c-fund",
  productView: [string, 'mutualFunds' | 'ishares' | string]; // ["all", "mutualFunds"],
  thirtyDaySecYield: ShortLabeledData; // { "d": "2.72", "r": 2.72 }
  totalNetAssets: ShortLabeledData; // { "d": "2,429,508", "r": 2429508 }
  twelveMonTrlYield: ShortLabeledData; // { "d": "0.00", "r": 0.000001 }
  unsubsidizedYield: ShortLabeledData; // { "d": "2.49", "r": 2.49 }
}

export interface BlackrockHoldingRecord {
  ticker: string; // "AAPL"
  name: string; // "APPLE INC"
  sector: string; // "Information Technology"
  assetClass: string; // "Equity"
  market: LabeledData; // market { "display": "$4,867,870,528.00", "raw": 4867870528 }
  weight: LabeledData; // weight { "display": "14.93", "raw": 14.93465 }
  notional: LabeledData; // notional { "display": "4,867,870,528.00", "raw": 4867870528 }
  shares: LabeledData; // shares { "display": "28,380,775.00", "raw": 28380775 }
  cusip: string; // "037833100"
  isin: string; // "US0378331005"
  sedol: string; // "2046251"
  last: LabeledData; // last { "display": "171.52", "raw": 171.52 }
  nation: string; // "United States"
  exchange: string; // "NASDAQ"
  currency: string; // "USD"
  fxRate: string; // "1.00"
  accrualDate: string; // "-"
}

// This isn't provided by the URI so I make it up to make it easier to deal with.
export const BlackrockHoldingColumns: Array<keyof BlackrockHoldingRecord> = [
  'ticker',
  'name',
  'sector',
  'assetClass',
  'market',
  'weight',
  'notional',
  'shares',
  'cusip',
  'isin',
  'sedol',
  'last',
  'nation',
  'exchange',
  'currency',
  'fxRate',
  'accrualDate',
];
