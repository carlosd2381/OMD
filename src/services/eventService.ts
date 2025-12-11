import { supabase } from '../lib/supabase';
import type { Event } from '../types/event';

export const eventService = {
  async getEvents(): Promise<Event[]> {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .order('date', { ascending: true });

    if (error) throw error;

    return (data || []).map(mapToEvent);
  },

  async getEvent(id: string): Promise<Event | null> {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!data) return null;

    return mapToEvent(data);
  },

  async createEvent(event: Omit<Event, 'id' | 'created_at' | 'updated_at'>): Promise<Event> {
    const { data, error } = await supabase
      .from('events')
      .insert({
        name: event.name,
        date: event.date,
        client_id: event.client_id,
        secondary_client_id: event.secondary_client_id,
        venue_id: event.venue_id,
        venue_name: event.venue_name,
        planner_id: event.planner_id,
        status: event.status,
        guest_count: event.guest_count,
        budget: event.budget,
        services: event.services,
        notes: event.notes
      })
      .select()
      .single();

    if (error) throw error;

    return mapToEvent(data);
  },

  async updateEvent(id: string, updates: Partial<Event>): Promise<Event> {
    const { data, error } = await supabase
      .from('events')
      .update({
        ...updates,
        // updated_at: new Date().toISOString() // TODO: Add updated_at column to DB
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return mapToEvent(data);
  },

  async deleteEvent(id: string): Promise<void> {
    const { error } = await supabase
      .from('events')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
};

// Helper to map DB result to Event type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapToEvent(data: any): Event {
  return {
    ...data,
    venue_id: data.venue_id || undefined,
    planner_id: data.planner_id || undefined,
    guest_count: data.guest_count || undefined,
    budget: data.budget || undefined,
    notes: data.notes || undefined,
    updated_at: data.created_at // Fallback
  };
}
