import { supabase } from '../lib/supabase';
import type { Contract } from '../types/contract';

export const contractService = {
  getContractsByClient: async (clientId: string): Promise<Contract[]> => {
    const { data, error } = await supabase
      .from('contracts')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map(mapToContract);
  },

  updateStatus: async (id: string, status: Contract['status']): Promise<Contract | null> => {
    const { data, error } = await supabase
      .from('contracts')
      .update({
        status,
        // updated_at: new Date().toISOString() // TODO: Add updated_at column to DB
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    if (!data) return null;

    return mapToContract(data);
  }
};

// Helper to map DB result to Contract type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapToContract(data: any): Contract {
  return {
    ...data,
    status: data.status as Contract['status'],
    updated_at: data.created_at // Fallback
  };
}
