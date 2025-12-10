export interface Note {
  id: string;
  entity_id: string;
  entity_type: 'client' | 'event' | 'venue' | 'planner' | 'lead';
  content: string;
  created_at: string;
  created_by: string;
}

export interface CreateNoteDTO {
  entity_id: string;
  entity_type: 'client' | 'event' | 'venue' | 'planner' | 'lead';
  content: string;
}
