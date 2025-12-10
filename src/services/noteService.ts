import type { Note, CreateNoteDTO } from '../types/note';

const MOCK_NOTES: Note[] = [
  {
    id: '1',
    entity_id: '1',
    entity_type: 'client',
    content: 'Initial consultation went well. Client is interested in the full package.',
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    created_by: 'Admin User',
  },
  {
    id: '2',
    entity_id: '1',
    entity_type: 'event',
    content: 'Need to follow up on catering options.',
    created_at: new Date(Date.now() - 86400000).toISOString(),
    created_by: 'Admin User',
  },
];

export const noteService = {
  getNotes: async (entityId: string, entityType: string): Promise<Note[]> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    return MOCK_NOTES.filter(n => n.entity_id === entityId && n.entity_type === entityType).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },

  addNote: async (note: CreateNoteDTO): Promise<Note> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    const newNote: Note = {
      id: Math.random().toString(36).substr(2, 9),
      ...note,
      created_at: new Date().toISOString(),
      created_by: 'Admin User', // Hardcoded for now
    };
    MOCK_NOTES.unshift(newNote);
    return newNote;
  },

  deleteNote: async (id: string): Promise<void> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    const index = MOCK_NOTES.findIndex(n => n.id === id);
    if (index !== -1) {
      MOCK_NOTES.splice(index, 1);
    }
  },
};
