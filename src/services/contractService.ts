import type { Contract } from '../types/contract';

export const MOCK_CONTRACTS: Contract[] = [
  {
    id: '1',
    client_id: '1',
    event_id: '1',
    content: 'Standard Service Agreement...',
    status: 'draft',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

export const contractService = {
  getContractsByClient: async (clientId: string): Promise<Contract[]> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    return MOCK_CONTRACTS.filter(c => c.client_id === clientId);
  },

  updateStatus: async (id: string, status: Contract['status']): Promise<Contract | undefined> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    const c = MOCK_CONTRACTS.find(x => x.id === id);
    if (c) {
      c.status = status;
      c.updated_at = new Date().toISOString();
    }
    return c;
  }
};
