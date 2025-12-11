import { supabase } from '../lib/supabase';
import type { Note, CreateNoteDTO } from '../types/note';
import type { Database } from '../types/supabase';

type NoteRow = Database['public']['Tables']['notes']['Row'];
type NoteInsert = Database['public']['Tables']['notes']['Insert'];

function mapToNote(row: NoteRow): Note {
  return {
    id: row.id,
    entity_id: row.entity_id,
    entity_type: row.entity_type as Note['entity_type'],
    content: row.content,
    created_at: row.created_at || new Date().toISOString(),
    created_by: row.created_by,
  };
}

export const noteService = {
  getNotes: async (entityId: string, entityType: string): Promise<Note[]> => {
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .eq('entity_id', entityId)
      .eq('entity_type', entityType as any)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(mapToNote);
  },

  addNote: async (note: CreateNoteDTO): Promise<Note> => {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    const createdBy = user?.email || 'System';

    const dbNote: NoteInsert = {
      entity_id: note.entity_id,
      entity_type: note.entity_type,
      content: note.content,
      created_by: createdBy,
    };

    const { data, error } = await supabase
      .from('notes')
      .insert(dbNote)
      .select()
      .single();

    if (error) throw error;
    return mapToNote(data);
  },

  deleteNote: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('notes')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },
};
