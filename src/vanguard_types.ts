export interface VanguardFundRecord {
  type: string; // 'priceMonthEndPerformance'
  profile: {
    fundId: string; // '0924';
    ticker: string; // 'BSV';
    instrumentId: number; // 2845959;
    shortName: string; // 'Short-Term Bond ETF';
    longName: string; // 'Vanguard Short-Term Bond ETF';
    cusip: string; // '921937827';
    IOVTicker: string; // 'BSV.IV';
    inceptionDate: string; // '2007-04-03T00:00:00-04:00';
    newspaperAbbreviation: string; // 'Short-Term Bond     ';
    style: string; // 'Bond Funds';
    type: string; // 'Short-Term Bond';
    category: string; // 'Short-Term Bond';
    customizedStyle: string;  // 'Bond - Short-term Investment';
    fixedIncomeInvestmentStyleId: string; // '1'
    fixedIncomeInvestmentStyleName: string; // 'Short-term Treasury';
    secDesignation: string; // '';
    maximumYearlyInvestment: string; // '';
    expenseRatio: string; // '0.0400';
    expenseRatioAsOfDate: string; // '2022-04-29T00:00:00-04:00';
    isInternalFund: boolean; // true
    isExternalFund: boolean; // false
    isMutualFund: boolean; // false
    isETF: boolean; // true
    isVLIP: boolean; // false
    isVVAP: boolean; // false
    is529: boolean; // false
    hasAssociatedInvestorFund: boolean; // true
    hasMoreThan1ShareClass: boolean; // true
    isPESite: boolean; // false
    fundFact: {
      isActiveFund: boolean; // true
      isClosed: boolean; // false
      isClosedToNewInvestors: boolean; // false
      isFundOfFunds: boolean; // false
      isMSCIIndexedFund: boolean; // false
      isIndex: boolean; // true
      isLoadFund: boolean; // false
      isMoneyMarket: boolean; // false
      isBond: boolean; // true
      isBalanced: boolean; // false
      isStock: boolean; // false
      isInternational: boolean; // false
      isMarketNeutralFund: boolean; // false
      isInternationalStockFund: boolean; // false
      isInternationalBalancedFund: boolean; // false
      isDomesticStockFund: boolean; // false
      isTaxable: boolean; // true
      isTaxExempt: boolean; // false
      isTaxManaged: boolean; // false
      isTaxableBondFund: boolean; // true
      isTaxExemptBondFund: boolean; // false
      isTaxExemptMoneyMarketFund: boolean; // false
      isTaxSensitiveFund: boolean; // true
      isSpecialtyStockFund: boolean; // false
      isHybridFund: boolean; // false
      isGlobal: boolean; // false
      isManagedPayoutFund: boolean; // false
      isGNMAFund: boolean; // false
      isInvestorShare: boolean; // false
      isAdmiralShare: boolean; // false
      isInstitutionalShare: boolean; // false
      isAdmiralFund: boolean; // false
      isStableValueFund: boolean; // false
      isCompanyStockFund: boolean; // false
      isREITFund: boolean; // false
      isVariableInsuranceFund: boolean; // false
      isComingledTrustFund: boolean; // false
      isConvertibleFund: boolean; // false
      isAssetAllocationFund: boolean; // false
      isStateMunicipalBond: boolean; // false
      isNationalMunicipalBond: boolean; // false
      isQualifiedOnly: boolean; // false
      isPreciousMetalsFund: boolean; // false
      mIsVIPSFund: boolean; // false
      isSectorSpecific: boolean; // false
      hasOtherIndex: boolean; // false
      isTargetRetirementFund: boolean; // false
      isRetirementSavingsTrustFund: boolean; // false
      isNon40ActFund: boolean; // false
      isUnfundedFund: boolean; // false
      isCreditSuisseFund: boolean; // false
      isKaiserFund: boolean; // false
      isFundAccessFund: boolean; // false
      isFundTransferableToVGI: boolean; // false
      hasTransactionFee: boolean; // false
      isNTFFund: boolean; // false
      hasMoreThan1ShareClass: boolean; // true
      isOpenToFlagship: boolean; // false
      isOpenToFlagshipPlus: boolean; // false
      isCitFund: boolean; // false
      isAcctType15Fund: boolean; // false
      isEtfOfEtfs: boolean; // false
      isStandaloneEtf: boolean; // false
    };
    associatedFundIds: {
      investorFundId: string; // '0132'
      admiralFundId: string; // '5132'
      etfFundId: string; // '0924'
      institutionalFundId: string; // '0732'
      institutionalPlusFundId: string; // '0733'
    };
    fundCategory: {
      customizedHighCategoryName: string; // 'Bond - Short-term Investment'
      high: {
        type: string; // 'HIGH'
        id: number; // 3
        name: string; // 'Bond Funds'
      };
      mid: {
        type: string; // 'MID'
        id: number; // 31
        name: string; // 'Short-Term Bond'
      };
      low: {
        type: string; // 'LOW'
        id: number; // 3103
        name: string; // 'Short-Term Bond'
      };
    };
    signalFundFlag: boolean; // false
  };
  minimum: {};
  risk: {
    code: number; // 1
    level: string; // 'Conservative'
    levelDesc: string; // '<p>Vanguard funds are classified as conservative if their share prices are expected to remain stable or to fluctuate only slightly. Keep in mind that investments that offer stability of principal typically are the most vulnerable to income risk&#8212;the possibility that the income from the investment will fluctuate over brief periods&#8212;and tend to produce lower long-term returns than riskier assets. Such funds are appropriate for the short-term reserves portion of a long-term investment portfolio, for investors with short-term investment horizons (no longer than three years), and for investors whose tolerance for share-price fluctuations is very low or whose employment or financial situation is precarious.</p>'
    plainTalk: string; // 'The fund is designed for investors with a low tolerance for risk. Although Short-Term Bond ETF is listed for trading on the NYSE Arca, it is possible that an active trading market may not be maintained. Trading of Short-Term Bond ETF on the NYSE Arca may be halted if NYSE Arca officials deem such action appropriate, if Short-Term Bond ETF is delisted from the NYSE Arca, or if the activation of marketwide &#8220;circuit breakers&#8221; halts stock trading generally. The fund&#8217;s performance could be hurt by: <UL><LI><strong>Interest rate risk: </strong>The chance that bond prices overall will decline because of rising interest rates. Interest rate risk should be low for the fund because it invests primarily in short-term bonds, whose prices are much less sensitive to interest rate changes than are the prices of long-term bonds.</LI><LI><strong>Income risk: </strong>The chance that the fund&#8217;s income will decline because of falling interest rates.</LI><LI><strong>Credit risk: </strong>The chance that a bond issuer will fail to pay interest and principal in a timely manner, or that negative perceptions of the issuer&#8217;s ability to make such payments will cause the price of that bond to decline.</LI><LI><strong>Index sampling risk: </strong>The chance that the securities selected for the fund, in the aggregate, will not provide investment performance matching that of the index. Index sampling risk for the fund should be low.</LI></UL>'
    volatility: {
      asOfDate: string; // '2022-07-31T00:00:00-04:00'
      primaryBenchmarkName: string; // 'Spliced Bloomberg U.S. 1-5 Year Government/Credit Float Adjusted Index'
      broadBasedBenchmarkName: string; // 'Bloomberg U.S. Aggregate Bond Index'
      betaPrimary: string; // '0.99'
      rSquaredPrimary: string; // '1.00'
      betaBroadBased: string; // '0.40'
      rSquaredBroadBased: string; // '0.80'
    };
  };
  fees: {
    purchaseFee: {
      content: string; // 'None'
      FeeType: string; // 'PURCHASE_FEE'
    };
    redemptionFee: {
      content: string; // 'None'
      FeeType: string; // 'REDEMPTION_FEE'
    };
  };
  link: {
    type: string; // 'application/xml,application/json'
    href: string; // 'http://api.vanguard.com/rs/ire/01/ind/etf,mf,plan529/month-end/0924'
    ref: string; // 'self'
  };
  dailyPrice: {
    regular: {
      asOfDate: string; // '2022-08-19T00:00:00-04:00'
      price: string; // '76.68'
      priceChangeAmount: string; // '-0.11'
      priceChangePct: string; // '-0.14'
      currOrPrmlFlag: string; // 'CURR'
      currOrPrmlValue: string; // 'Price'
    };
    market: {
      asOfDate: string; // '2022-08-19T00:00:00-04:00'
      price: string; // '76.71'
      priceChangeAmount: string; // '-0.12'
      priceChangePct: string; // '-0.16'
      currOrPrmlFlag: string; // 'CURR'
      currOrPrmlValue: string; // 'Price'
    };
  };
  yield: {
    asOfDate: string; // '2022-08-18T00:00:00-04:00'
    yieldPct: string; // '3.30'
    hasDisclaimer: boolean; // false
    yieldNote: [
      {
        footnoteCode: string; // 'A'
        footnoteText: string; // "BASED ON HOLDINGS' YIELD TO MATURITY FOR PRIOR 30 DAYS;DISTRIBUTION MAY DIFFER";
      }
    ];
  };
  ytd: {
    asOfDate: string; // '2022-08-19T00:00:00-04:00'
    regular: string; // '-4.40'
    marketPrice: string; // '-4.37'
  };
  monthEndAvgAnnualRtn: {
    sinceInceptionAsOfDate: string; // '2007-04-03T00:00:00-04:00'
    asOfDate: string; // '2022-07-31T00:00:00-04:00'
    shortName: string; // 'Short-Term Bond ETF      '
    benchmarkShortName: string; // 'Spl Bloomberg US1-5YrGov/Cr FlAdjIx               '
    fundReturn: {
      asOfDate: string; // '2022-07-31T00:00:00-04:00'
      id: string; // '0924'
      name: string; // 'Short-Term Bond ETF      '
      calendarYTDPct: string; // '-3.61'
      prevMonthPct: string; // '0.97'
      threeMonthPct: string; // '0.82'
      oneYrPct: string; // '-4.65'
      threeYrPct: string; // '0.42'
      fiveYrPct: string; // '1.16'
      tenYrPct: string; // '1.16'
      sinceInceptionPct: string; // '2.32'
      isLastMonthEndPerformanceDataAvailable: boolean; // false
    };
    marketPriceFundReturn: {
      asOfDate: string; // '2022-07-31T00:00:00-04:00'
      id: string; // '0924'
      name: string; // 'Short-Term Bond ETF      '
      calendarYTDPct: string; // '-3.54'
      prevMonthPct: string; // '0.99'
      threeMonthPct: string; // '0.88'
      oneYrPct: string; // '-4.61'
      threeYrPct: string; // '0.43'
      fiveYrPct: string; // '1.16'
      tenYrPct: string; // '1.15'
      sinceInceptionPct: string; // '2.32'
      isLastMonthEndPerformanceDataAvailable: boolean; // false
    };
    benchmarkReturn: {
      asOfDate: string; // '2022-07-31T00:00:00-04:00'
      id: string; // '22243'
      name: string; // 'Spl Bloomberg US1-5YrGov/Cr FlAdjIx               '
      calendarYTDPct: string; // '-3.63'
      prevMonthPct: string; // '0.97'
      threeMonthPct: string; // '0.82'
      oneYrPct: string; // '-4.64'
      threeYrPct: string; // '0.47'
      fiveYrPct: string; // '1.20'
      tenYrPct: string; // '1.23'
      sinceInceptionPct: string; // '2.38'
      isLastMonthEndPerformanceDataAvailable: boolean; // true
    };
  };
}

export interface VanguardHoldingRecord {
  type: string; // 'portfolioHolding'
  asOfDate: string; // '2022-07-31T00:00:00-04:00'
  longName: string;
  shortName: string;
  sharesHeld: string; // number as string
  marketValue: string; // "338396632" number as string
  ticker: string;
  isin: string; // "US02079K3059",
  percentWeight: string; // "12.18", number as string
  notionalValue: string; // "0", number as string
  secMainType: string; // ''
  secSubType: string; // ''
  holdingType: string; // ''
  cusip: string; // "02079K305",
  sedol: string; // "BYVY8G0"
}
