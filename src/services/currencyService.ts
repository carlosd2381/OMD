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
  },

  fetchLiveRate: async (targetCurrency: CurrencyCode): Promise<number | null> => {
    if (targetCurrency === 'MXN') return 1;

    const tryEndpoints = [
      `https://api.exchangerate.host/convert?from=${targetCurrency}&to=MXN&amount=1`,
      `https://api.exchangerate.host/latest?base=${targetCurrency}&symbols=MXN`,
      `https://open.er-api.com/v6/latest/${targetCurrency}`,
    ];

    for (const url of tryEndpoints) {
      try {
        const response = await fetch(url);
        if (!response.ok) continue;
        const data = await response.json();

        // Handle convert endpoint shape
        if (typeof data?.result === 'number' && data.result > 0) {
          return data.result;
        }

        // Handle latest endpoint shape
        if (typeof data?.rates?.MXN === 'number' && data.rates.MXN > 0) {
          return data.rates.MXN;
        }

        // Handle open.er-api shape (result === "success")
        if (data?.result === 'success' && typeof data?.rates?.MXN === 'number') {
          return data.rates.MXN;
        }
      } catch (error) {
        console.warn('currencyService.fetchLiveRate endpoint error', url, error);
      }
    }

    return null;
  }
};
