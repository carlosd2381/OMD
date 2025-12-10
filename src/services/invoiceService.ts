import type { Invoice } from '../types/invoice';

export const MOCK_INVOICES: Invoice[] = [
  {
    id: '1',
    client_id: '1',
    event_id: '1',
    invoice_number: 'INV-001',
    items: [{ id: '1', description: 'Deposit', amount: 3250 }],
    total_amount: 3250,
    status: 'draft',
    due_date: '2025-12-31',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

export const invoiceService = {
  getInvoicesByClient: async (clientId: string): Promise<Invoice[]> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    return MOCK_INVOICES.filter(i => i.client_id === clientId);
  },

  updateStatus: async (id: string, status: Invoice['status']): Promise<Invoice | undefined> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    const i = MOCK_INVOICES.find(x => x.id === id);
    if (i) {
      i.status = status;
      i.updated_at = new Date().toISOString();
    }
    return i;
  }
};
