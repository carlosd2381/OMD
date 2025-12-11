import { supabase } from '../lib/supabase';
import type { Questionnaire, QuestionnaireAnswer } from '../types/questionnaire';
import type { Database } from '../types/supabase';

type QuestionnaireRow = Database['public']['Tables']['questionnaires']['Row'];


function mapToQuestionnaire(row: QuestionnaireRow): Questionnaire {
  return {
    id: row.id,
    client_id: row.client_id,
    event_id: row.event_id,
    title: row.title,
    status: row.status as Questionnaire['status'],
    answers: (row.answers as unknown as QuestionnaireAnswer[]) || undefined,
    created_at: row.created_at || new Date().toISOString(),
    updated_at: row.created_at || new Date().toISOString(), // Fallback
  };
}

export const questionnaireService = {
  getQuestionnairesByClient: async (clientId: string): Promise<Questionnaire[]> => {
    const { data, error } = await supabase
      .from('questionnaires')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(mapToQuestionnaire);
  },

  getQuestionnaire: async (id: string): Promise<Questionnaire | undefined> => {
    const { data, error } = await supabase
      .from('questionnaires')
      .select('*')
      .eq('id', id)
      .single();

    if (error) return undefined;
    return mapToQuestionnaire(data);
  },

  updateStatus: async (id: string, status: Questionnaire['status']): Promise<Questionnaire | undefined> => {
    const { data, error } = await supabase
      .from('questionnaires')
      .update({ status })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return mapToQuestionnaire(data);
  },

  saveAnswers: async (id: string, answers: QuestionnaireAnswer[]): Promise<Questionnaire | undefined> => {
    const { data, error } = await supabase
      .from('questionnaires')
      .update({ 
        answers: answers as unknown as Database['public']['Tables']['questionnaires']['Update']['answers'],
        status: 'completed' // Assume saving answers completes it, or maybe just updates it. But usually save = submit.
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return mapToQuestionnaire(data);
  }
};
