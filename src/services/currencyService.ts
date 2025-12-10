export type CurrencyCode = 'MXN' | 'USD' | 'GBP' | 'EUR' | 'CAD';

export const currencyService = {
  getExchangeRate: async (from: CurrencyCode, to: CurrencyCode): Promise<number> => {
    // Mock exchange rates relative to MXN
    // In a real app, fetch from an API
    const rates: Record<CurrencyCode, number> = {
      MXN: 1,
      USD: 17.50, // 1 USD = 17.50 MXN
      GBP: 22.10,
      EUR: 18.90,
      CAD: 12.80,
    };

    if (from === to) return 1;
    
        // Convert 'from' to MXN, then MXN to 'to'
    const fromRate = rates[from];
    const toRate = rates[to];

    return fromRate / toRate;
  },

  // Helper to convert MXN to target currency
  convertFromMXN: (amountMXN: number, targetCurrency: CurrencyCode): number => {
    const rates: Record<CurrencyCode, number> = {
      MXN: 1,
      USD: 17.50,
      GBP: 22.10,
      EUR: 18.90,
      CAD: 12.80,
    };
    return amountMXN / rates[targetCurrency];
  },
  
  // Helper to get the rate used for display
  getRate: (targetCurrency: CurrencyCode): number => {
     const rates: Record<CurrencyCode, number> = {
      MXN: 1,
      USD: 17.50,
      GBP: 22.10,
      EUR: 18.90,
      CAD: 12.80,
    };
    return rates[targetCurrency];
  }
};
