import { useState, useEffect } from 'react';
import { Plus, Trash2, Clock, User, MessageSquare, AlertCircle } from 'lucide-react';
import { noteService } from '../services/noteService';
import { activityLogService } from '../services/activityLogService';
import type { Note } from '../types/note';
import type { ActivityLog } from '../types/activity';
import toast from 'react-hot-toast';

interface NotesTabProps {
  entityId: string;
  entityType: 'client' | 'event' | 'venue' | 'planner' | 'lead';
}

export default function NotesTab({ entityId, entityType }: NotesTabProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [newNote, setNewNote] = useState('');
  const [isAddingNote, setIsAddingNote] = useState(false);

  useEffect(() => {
    loadData();
  }, [entityId, entityType]);

  const loadData = async () => {
    try {
      const [fetchedNotes, fetchedLogs] = await Promise.all([
        noteService.getNotes(entityId, entityType),
        activityLogService.getLogs(entityId, entityType),
      ]);
      setNotes(fetchedNotes);
      setLogs(fetchedLogs);
    } catch (error) {
      toast.error('Failed to load notes and activity logs');
    } finally {
      setLoading(false);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;

    try {
      const addedNote = await noteService.addNote({
        entity_id: entityId,
        entity_type: entityType,
        content: newNote,
      });
      setNotes([addedNote, ...notes]);
      setNewNote('');
      setIsAddingNote(false);
      toast.success('Note added');
      
      // Log the activity
      const log = await activityLogService.logActivity({
        entity_id: entityId,
        entity_type: entityType,
        action: 'Note Added',
        details: 'Internal note added to profile',
      });
      setLogs([log, ...logs]);
    } catch (error) {
      toast.error('Failed to add note');
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!confirm('Are you sure you want to delete this note?')) return;

    try {
      await noteService.deleteNote(noteId);
      setNotes(notes.filter(n => n.id !== noteId));
      toast.success('Note deleted');
    } catch (error) {
      toast.error('Failed to delete note');
    }
  };

  if (loading) {
    return <div className="py-4 text-center text-gray-500">Loading notes and activity...</div>;
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* Internal Notes Section */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <MessageSquare className="h-5 w-5 mr-2 text-gray-400" />
            Internal Notes
          </h3>
          <button
            onClick={() => setIsAddingNote(!isAddingNote)}
            className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-pink-600 hover:bg-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Note
          </button>
        </div>

        {isAddingNote && (
          <form onSubmit={handleAddNote} className="bg-gray-50 p-4 rounded-md border border-gray-200">
            <label htmlFor="note" className="block text-sm font-medium text-gray-700">
              New Note
            </label>
            <div className="mt-1">
              <textarea
                id="note"
                rows={3}
                className="shadow-sm focus:ring-pink-500 focus:border-pink-500 block w-full sm:text-sm border-gray-300 rounded-md"
                placeholder="Enter internal note..."
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
              />
            </div>
            <div className="mt-3 flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setIsAddingNote(false)}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="inline-flex items-center px-3 py-2 border border-transparent shadow-sm text-sm leading-4 font-medium rounded-md text-white bg-pink-600 hover:bg-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500"
              >
                Save Note
              </button>
            </div>
          </form>
        )}

        <div className="space-y-4">
          {notes.length === 0 ? (
            <p className="text-sm text-gray-500 italic">No internal notes yet.</p>
          ) : (
            notes.map((note) => (
              <div key={note.id} className="bg-white shadow sm:rounded-lg p-4 border border-gray-200 relative group">
                <div className="flex justify-between items-start">
                  <div className="flex items-center space-x-2 text-xs text-gray-500 mb-2">
                    <User className="h-3 w-3" />
                    <span>{note.created_by}</span>
                    <span>•</span>
                    <Clock className="h-3 w-3" />
                    <span>{new Date(note.created_at).toLocaleString()}</span>
                  </div>
                  <button
                    onClick={() => handleDeleteNote(note.id)}
                    className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Delete Note"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <p className="text-sm text-gray-800 whitespace-pre-wrap">{note.content}</p>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Activity Log Section */}
      <div className="space-y-6">
        <h3 className="text-lg font-medium text-gray-900 flex items-center">
          <Clock className="h-5 w-5 mr-2 text-gray-400" />
          Activity Log
        </h3>
        
        <div className="flow-root">
          <ul className="-mb-8">
            {logs.length === 0 ? (
              <li className="text-sm text-gray-500 italic">No activity recorded yet.</li>
            ) : (
              logs.map((log, logIdx) => (
                <li key={log.id}>
                  <div className="relative pb-8">
                    {logIdx !== logs.length - 1 ? (
                      <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true" />
                    ) : null}
                    <div className="relative flex space-x-3">
                      <div>
                        <span className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center ring-8 ring-white">
                          <AlertCircle className="h-5 w-5 text-gray-500" aria-hidden="true" />
                        </span>
                      </div>
                      <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                        <div>
                          <p className="text-sm text-gray-900">
                            {log.action} <span className="font-medium text-gray-500">by {log.created_by}</span>
                          </p>
                          {log.details && (
                            <p className="text-sm text-gray-500 mt-0.5">{log.details}</p>
                          )}
                        </div>
                        <div className="text-right text-sm whitespace-nowrap text-gray-500">
                          <time dateTime={log.created_at}>{new Date(log.created_at).toLocaleDateString()}</time>
                          <div className="text-xs">{new Date(log.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              ))
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
