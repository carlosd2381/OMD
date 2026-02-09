import { supabase } from '../lib/supabase';
import { activityLogService } from './activityLogService';
import type { Task, TaskTemplate } from '../types/task';
import type { Database } from '../types/supabase';

type TaskRow = Database['public']['Tables']['tasks']['Row'];
type TaskInsert = Database['public']['Tables']['tasks']['Insert'];
type TaskUpdate = Database['public']['Tables']['tasks']['Update'];

type TaskTemplateRow = Database['public']['Tables']['task_templates']['Row'];

function mapToTask(row: TaskRow): Task {
  return {
    id: row.id,
    client_id: row.client_id || undefined,
    venue_id: row.venue_id || undefined,
    planner_id: row.planner_id || undefined,
    title: row.title,
    description: row.description || undefined,
    status: row.status,
    due_date: row.due_date || undefined,
    assigned_to: row.assigned_to || undefined,
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

  getTasksByVenue: async (venueId: string): Promise<Task[]> => {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('venue_id', venueId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(mapToTask);
  },

  getTasksByPlanner: async (plannerId: string): Promise<Task[]> => {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('planner_id', plannerId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(mapToTask);
  },

  getAllTasks: async (): Promise<Task[]> => {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(mapToTask);
  },

  addTask: async (task: Omit<Task, 'id' | 'created_at'>): Promise<Task> => {
    const dbTask: TaskInsert = {
      client_id: task.client_id,
      venue_id: task.venue_id,
      planner_id: task.planner_id,
      title: task.title,
      description: task.description,
      status: task.status,
      due_date: task.due_date,
      assigned_to: task.assigned_to,
      completed_at: task.completed_at,
      completed_by: task.completed_by,
    };

    const { data, error } = await supabase
      .from('tasks')
      .insert(dbTask)
      .select()
      .single();

    if (error) throw error;

    if (task.client_id) {
      await activityLogService.logActivity({
        entity_id: task.client_id,
        entity_type: 'client',
        action: 'Task Created',
        details: `Task "${task.title}" created`,
      });
    } else if (task.venue_id) {
      await activityLogService.logActivity({
        entity_id: task.venue_id,
        entity_type: 'venue',
        action: 'Task Created',
        details: `Task "${task.title}" created`,
      });
    } else if (task.planner_id) {
      await activityLogService.logActivity({
        entity_id: task.planner_id,
        entity_type: 'planner',
        action: 'Task Created',
        details: `Task "${task.title}" created`,
      });
    }

    return mapToTask(data);
  },

  updateTask: async (id: string, updates: Partial<Task>): Promise<Task | undefined> => {
    const dbUpdates: TaskUpdate = {
      title: updates.title,
      description: updates.description,
      status: updates.status,
      due_date: updates.due_date,
      assigned_to: updates.assigned_to,
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
    
    const updatedTask = mapToTask(data);

    if (updatedTask.client_id) {
      await activityLogService.logActivity({
        entity_id: updatedTask.client_id,
        entity_type: 'client',
        action: updates.status === 'completed' ? 'Task Completed' : 'Task Updated',
        details: `Task "${updatedTask.title}" ${updates.status === 'completed' ? 'completed' : 'updated'}`,
      });
    } else if (updatedTask.venue_id) {
      await activityLogService.logActivity({
        entity_id: updatedTask.venue_id,
        entity_type: 'venue',
        action: updates.status === 'completed' ? 'Task Completed' : 'Task Updated',
        details: `Task "${updatedTask.title}" ${updates.status === 'completed' ? 'completed' : 'updated'}`,
      });
    } else if (updatedTask.planner_id) {
      await activityLogService.logActivity({
        entity_id: updatedTask.planner_id,
        entity_type: 'planner',
        action: updates.status === 'completed' ? 'Task Completed' : 'Task Updated',
        details: `Task "${updatedTask.title}" ${updates.status === 'completed' ? 'completed' : 'updated'}`,
      });
    }

    return updatedTask;
  },

  deleteTask: async (id: string): Promise<void> => {
    // Fetch task first to get client_id/venue_id/planner_id for logging
    const { data: taskData } = await supabase
      .from('tasks')
      .select('client_id, venue_id, planner_id, title')
      .eq('id', id)
      .single();

    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', id);

    if (error) throw error;

    if (taskData) {
      if (taskData.client_id) {
        await activityLogService.logActivity({
          entity_id: taskData.client_id,
          entity_type: 'client',
          action: 'Task Deleted',
          details: `Task "${taskData.title}" deleted`,
        });
      } else if (taskData.venue_id) {
        await activityLogService.logActivity({
          entity_id: taskData.venue_id,
          entity_type: 'venue',
          action: 'Task Deleted',
          details: `Task "${taskData.title}" deleted`,
        });
      } else if (taskData.planner_id) {
        await activityLogService.logActivity({
          entity_id: taskData.planner_id,
          entity_type: 'planner',
          action: 'Task Deleted',
          details: `Task "${taskData.title}" deleted`,
        });
      }
    }
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
