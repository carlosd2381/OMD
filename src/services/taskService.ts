import { supabase } from '../lib/supabase';
import type { Task, TaskTemplate } from '../types/task';
import type { Database } from '../types/supabase';

type TaskRow = Database['public']['Tables']['tasks']['Row'];
type TaskInsert = Database['public']['Tables']['tasks']['Insert'];
type TaskUpdate = Database['public']['Tables']['tasks']['Update'];

type TaskTemplateRow = Database['public']['Tables']['task_templates']['Row'];

function mapToTask(row: TaskRow): Task {
  return {
    id: row.id,
    client_id: row.client_id,
    title: row.title,
    description: row.description || undefined,
    status: row.status,
    due_date: row.due_date || undefined,
    completed_at: row.completed_at || undefined,
    completed_by: row.completed_by || undefined,
    created_at: row.created_at || new Date().toISOString(),
  };
}

function mapToTaskTemplate(row: TaskTemplateRow): TaskTemplate {
  return {
    id: row.id,
    title: row.title,
    description: row.description || undefined,
    category: row.category || undefined,
  };
}

export const taskService = {
  getTasksByClient: async (clientId: string): Promise<Task[]> => {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(mapToTask);
  },

  addTask: async (task: Omit<Task, 'id' | 'created_at'>): Promise<Task> => {
    const dbTask: TaskInsert = {
      client_id: task.client_id,
      title: task.title,
      description: task.description,
      status: task.status,
      due_date: task.due_date,
      completed_at: task.completed_at,
      completed_by: task.completed_by,
    };

    const { data, error } = await supabase
      .from('tasks')
      .insert(dbTask)
      .select()
      .single();

    if (error) throw error;
    return mapToTask(data);
  },

  updateTask: async (id: string, updates: Partial<Task>): Promise<Task | undefined> => {
    const dbUpdates: TaskUpdate = {
      title: updates.title,
      description: updates.description,
      status: updates.status,
      due_date: updates.due_date,
      completed_at: updates.completed_at,
      completed_by: updates.completed_by,
    };

    const { data, error } = await supabase
      .from('tasks')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return mapToTask(data);
  },

  deleteTask: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  getTemplates: async (): Promise<TaskTemplate[]> => {
    const { data, error } = await supabase
      .from('task_templates')
      .select('*')
      .order('title', { ascending: true });

    if (error) throw error;
    return (data || []).map(mapToTaskTemplate);
  }
};
