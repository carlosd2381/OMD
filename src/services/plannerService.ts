import { supabase } from '../lib/supabase';
import type { Planner, CreatePlannerDTO, UpdatePlannerDTO } from '../types/planner';

export const plannerService = {
  async getPlanners(): Promise<Planner[]> {
    const { data, error } = await supabase
      .from('planners')
      .select('*')
      .order('first_name', { ascending: true });

    if (error) throw error;

    return (data || []).map(mapToPlanner);
  },

  async getPlanner(id: string): Promise<Planner | null> {
    const { data, error } = await supabase
      .from('planners')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!data) return null;

    return mapToPlanner(data);
  },

  async createPlanner(planner: CreatePlannerDTO): Promise<Planner> {
    const { data, error } = await supabase
      .from('planners')
      .insert({
        first_name: planner.first_name,
        last_name: planner.last_name,
        email: planner.email,
        phone: planner.phone,
        company: planner.company,
        website: planner.website,
        instagram: planner.instagram,
        facebook: planner.facebook
      })
      .select()
      .single();

    if (error) throw error;

    return mapToPlanner(data);
  },

  async updatePlanner(id: string, planner: UpdatePlannerDTO): Promise<Planner> {
    const { data, error } = await supabase
      .from('planners')
      .update({
        ...planner,
        // updated_at: new Date().toISOString() // TODO: Add updated_at column to DB
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return mapToPlanner(data);
  },

  async deletePlanner(id: string): Promise<void> {
    const { error } = await supabase
      .from('planners')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
};

// Helper to map DB result to Planner type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapToPlanner(data: any): Planner {
  return {
    ...data,
    company: data.company || undefined,
    phone: data.phone || undefined,
    website: data.website || undefined,
    instagram: data.instagram || undefined,
    facebook: data.facebook || undefined,
    updated_at: data.created_at // Fallback
  };
}
