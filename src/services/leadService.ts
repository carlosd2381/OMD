import { supabase } from '../lib/supabase';
import type { Lead, CreateLeadDTO, UpdateLeadDTO } from '../types/lead';

export const leadService = {
  async getLeads(): Promise<Lead[]> {
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map(mapToLead);
  },

  async getLead(id: string): Promise<Lead | null> {
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!data) return null;

    return mapToLead(data);
  },

  async createLead(lead: CreateLeadDTO): Promise<Lead> {
    const { data, error } = await supabase
      .from('leads')
      .insert({
        first_name: lead.first_name,
        last_name: lead.last_name,
        email: lead.email,
        phone: lead.phone,
        role: lead.role,
        event_type: lead.event_type,
        event_date: lead.event_date,
        guest_count: lead.guest_count,
        venue_name: lead.venue_name,
        services_interested: lead.services_interested,
        notes: lead.notes,
        lead_source: lead.lead_source,
        status: lead.status
      })
      .select()
      .single();

    if (error) throw error;

    return mapToLead(data);
  },

  async updateLead(id: string, updates: UpdateLeadDTO): Promise<Lead> {
    const { data, error } = await supabase
      .from('leads')
      .update({
        ...updates,
        // updated_at: new Date().toISOString() // TODO: Add updated_at column to DB
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return mapToLead(data);
  },

  async deleteLead(id: string): Promise<void> {
    const { error } = await supabase
      .from('leads')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },
};

// Helper to map DB result to Lead type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapToLead(data: any): Lead {
  return {
    ...data,
    phone: data.phone || undefined,
    role: data.role || undefined,
    event_type: data.event_type || undefined,
    event_date: data.event_date || undefined,
    guest_count: data.guest_count || undefined,
    venue_name: data.venue_name || undefined,
    services_interested: data.services_interested || undefined,
    notes: data.notes || undefined,
    lead_source: data.lead_source || undefined,
    updated_at: data.created_at // Fallback
  };
}
