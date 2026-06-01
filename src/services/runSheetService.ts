import { supabase } from '../lib/supabase';
import type { RunSheet, CreateRunSheetDTO, UpdateRunSheetDTO } from '../types/runSheet';

type UntypedSupabaseClient = {
  from: (table: string) => ReturnType<typeof supabase.from>;
};

const untypedSupabase = supabase as unknown as UntypedSupabaseClient;

export const runSheetService = {
  async getRunSheetByEventId(eventId: string): Promise<RunSheet | null> {
    const { data, error } = await untypedSupabase
      .from('run_sheets')
      .select('*')
      .eq('event_id', eventId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw error;
    }

    return data as RunSheet;
  },

  async createRunSheet(runSheet: CreateRunSheetDTO): Promise<RunSheet> {
    const { data, error } = await untypedSupabase
      .from('run_sheets')
      .insert(runSheet as unknown as Record<string, unknown>)
      .select()
      .single();

    if (error) throw error;

    return data as RunSheet;
  },

  async updateRunSheet(id: string, runSheet: UpdateRunSheetDTO): Promise<RunSheet> {
    const { data, error } = await untypedSupabase
      .from('run_sheets')
      .update(runSheet)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return data as RunSheet;
  },

  async upsertRunSheet(runSheet: CreateRunSheetDTO): Promise<RunSheet> {
    const { data, error } = await untypedSupabase
      .from('run_sheets')
      .upsert(runSheet as unknown as Record<string, unknown>, { onConflict: 'event_id' })
      .select()
      .single();

    if (error) throw error;

    return data as RunSheet;
  },

  /**
   * Update run_sheet staff fields to reflect position selections map and upsert
   * positions: { positionKey: user_id }
   */
  async syncRunSheetPositions(eventId: string, positions: Record<string, string | undefined>): Promise<void> {
    await this.getRunSheetByEventId(eventId);
    const payload: CreateRunSheetDTO & Record<string, string | null | undefined> = { event_id: eventId };

    // Only set known fields
    const allowed = ['driver_a','driver_b','operator_1','operator_2','operator_3','operator_4','operator_5','operator_6'];
    for (const key of allowed) {
      if (positions[key] !== undefined) payload[key] = positions[key] || null;
    }

    await this.upsertRunSheet(payload);
  }
};
