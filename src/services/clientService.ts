import type { Client, CreateClientDTO, UpdateClientDTO } from '../types/client';
import { supabase } from '../lib/supabase';
import { activityLogService } from './activityLogService';

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

  async getClientByAuthUser(authUserId: string): Promise<Client | null> {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('auth_user_id', authUserId)
      .maybeSingle();

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

    await activityLogService.logActivity({
      entity_id: data.id,
      entity_type: 'client',
      action: 'Client Created',
      details: `Client ${data.first_name} ${data.last_name} created`,
    });

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

    await activityLogService.logActivity({
      entity_id: id,
      entity_type: 'client',
      action: 'Client Updated',
      details: 'Client details updated',
    });

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

    // If enabling access, ensuring the auth user exists or is invited
    if (enabled) {
      try {
        await supabase.functions.invoke('invite-client', {
          body: { clientId: id },
        });
      } catch (err) {
        console.error("Failed to invoke invite-client after toggling access:", err);
      }
    }
  },

  async sendPortalInvite(id: string): Promise<void> {
    const client = await clientService.getClient(id);
    if (!client?.email) throw new Error('Client email is missing');

    const portalBaseUrl = import.meta.env.VITE_PORTAL_URL || window.location.origin;
    const redirectTo = `${portalBaseUrl}/auth/update-password`;

    const { error } = await supabase.functions.invoke('invite-client', {
      body: { clientId: id },
    });

    if (error) throw error;

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(client.email, {
      redirectTo,
    });

    if (resetError) throw resetError;
  },

  async resetPortalPassword(id: string): Promise<void> {
    const client = await clientService.getClient(id);
    if (!client?.email) throw new Error('Client email is missing');

    const portalBaseUrl = import.meta.env.VITE_PORTAL_URL || window.location.origin;
    const redirectTo = `${portalBaseUrl}/auth/update-password`;

    const { error } = await supabase.auth.resetPasswordForEmail(client.email, {
      redirectTo,
    });

    if (error) throw error;
  }
};

// Helper to map DB result to Client type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapToClient(data: any): Client {
  return {
    ...data,
    auth_user_id: data.auth_user_id ?? undefined,
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
