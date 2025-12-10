import type { Quote } from '../types/quote';

// Shared Mock Data
export const MOCK_QUOTES: Quote[] = [
  {
    id: '1',
    client_id: '1',
    event_id: '1',
    items: [
      { id: '1', description: 'Full Wedding Planning', quantity: 1, unit_price: 5000, total: 5000 },
      { id: '2', description: 'Day-of Coordination', quantity: 1, unit_price: 1500, total: 1500 },
    ],
    total_amount: 6500,
    currency: 'MXN',
    exchange_rate: 1,
    status: 'sent',
    valid_until: '2025-12-31',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

export const quoteService = {
  getQuotesByClient: async (clientId: string): Promise<Quote[]> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    return MOCK_QUOTES.filter(q => q.client_id === clientId);
  },

  getQuote: async (id: string): Promise<Quote | undefined> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    return MOCK_QUOTES.find(q => q.id === id);
  },

  updateQuoteStatus: async (id: string, status: Quote['status']): Promise<Quote | undefined> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    const quote = MOCK_QUOTES.find(q => q.id === id);
    if (quote) {
      quote.status = status;
      quote.updated_at = new Date().toISOString();
    }
    return quote;
  },

  createQuote: async (quote: Omit<Quote, 'id' | 'created_at' | 'updated_at'>): Promise<Quote> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    const newQuote: Quote = {
      ...quote,
      id: Math.random().toString(36).substr(2, 9),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    MOCK_QUOTES.push(newQuote);
    return newQuote;
  },

  deleteQuote: async (id: string): Promise<void> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    const index = MOCK_QUOTES.findIndex(q => q.id === id);
    if (index !== -1) {
      MOCK_QUOTES.splice(index, 1);
    }
  }
};
