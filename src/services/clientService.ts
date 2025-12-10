import type { Client, CreateClientDTO, UpdateClientDTO } from '../types/client';
import { supabase } from '../lib/supabase';

export const clientService = {
  async getClients(): Promise<Client[]> {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    
    return (data || []).map(mapToClient);
  },

  async getClient(id: string): Promise<Client | null> {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!data) return null;

    return mapToClient(data);
  },

  async createClient(client: CreateClientDTO): Promise<Client> {
    const { data, error } = await supabase
      .from('clients')
      .insert({
        first_name: client.first_name,
        last_name: client.last_name,
        email: client.email,
        phone: client.phone,
        company_name: client.company_name,
        address: client.address,
        city: client.city,
        state: client.state,
        zip_code: client.zip_code,
        country: client.country,
        role: client.role,
        type: client.type,
        lead_source: client.lead_source,
        instagram: client.instagram,
        facebook: client.facebook,
        notes: client.notes,
        portal_access: client.portal_access,
        portal_settings: client.portal_settings
      })
      .select()
      .single();

    if (error) throw error;

    return mapToClient(data);
  },

  async updateClient(id: string, client: UpdateClientDTO): Promise<Client> {
    const { data, error } = await supabase
      .from('clients')
      .update({
        ...client,
        // updated_at: new Date().toISOString() // TODO: Add updated_at column to DB
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return mapToClient(data);
  },

  async deleteClient(id: string): Promise<void> {
    const { error } = await supabase
      .from('clients')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async updatePortalSettings(id: string, settings: Client['portal_settings']): Promise<void> {
    const { error } = await supabase
      .from('clients')
      .update({ portal_settings: settings })
      .eq('id', id);

    if (error) throw error;
  },

  async togglePortalAccess(id: string, enabled: boolean): Promise<void> {
    const { error } = await supabase
      .from('clients')
      .update({ portal_access: enabled })
      .eq('id', id);

    if (error) throw error;
  },

  async sendPortalInvite(id: string): Promise<void> {
    // TODO: Implement actual email sending logic (e.g. via Edge Function)
    console.log('Sending portal invite to client:', id);
    await new Promise(resolve => setTimeout(resolve, 1000));
  },

  async resetPortalPassword(id: string): Promise<void> {
    // TODO: Implement actual password reset logic
    console.log('Resetting portal password for client:', id);
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
};

// Helper to map DB result to Client type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapToClient(data: any): Client {
  return {
    ...data,
    phone: data.phone || undefined,
    company_name: data.company_name || undefined,
    address: data.address || undefined,
    city: data.city || undefined,
    state: data.state || undefined,
    zip_code: data.zip_code || undefined,
    country: data.country || undefined,
    role: data.role || undefined,
    type: data.type || undefined,
    lead_source: data.lead_source || undefined,
    instagram: data.instagram || undefined,
    facebook: data.facebook || undefined,
    notes: data.notes || undefined,
    portal_access: data.portal_access || undefined,
    portal_last_login: data.portal_last_login || undefined,
    portal_settings: data.portal_settings || undefined,
    updated_at: data.created_at // Fallback
  };
}
