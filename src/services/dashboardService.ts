import { supabase } from '../lib/supabase';
import type { Event } from '../types/event';
import type { Task } from '../types/task';

export interface DashboardStats {
  newLeads: number;
  newEmails: number;
  pendingTasks: number;
}

export const dashboardService = {
  async getStats(): Promise<DashboardStats> {
    // New Leads
    const { count: newLeads } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'New');

    // Pending Tasks (All)
    const { count: pendingTasks } = await supabase
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

    return {
      newLeads: newLeads || 0,
      newEmails: 0, // Placeholder
      pendingTasks: pendingTasks || 0,
    };
  },

  async getMyTasks(userId: string): Promise<Task[]> {
    // Check if assigned_to column exists by trying to select it
    // If it doesn't exist, we might need to fallback or just return empty
    // For now, let's assume we want to filter by assigned_to if it exists
    // But since we suspect it might not, let's just fetch pending tasks and filter in memory if needed
    // or just fetch all pending tasks if we can't filter by user.
    
    // However, to be safe and avoid 400 errors if column is missing:
    // We will try to fetch tasks. If the schema doesn't have assigned_to, we can't filter by it on DB side easily without error.
    // Let's try to fetch all pending tasks for now as a fallback if we are unsure.
    // But the requirement is "Tasks Assigned to logged in staff member".
    
    // Let's try to use the column. If it fails, we catch it.
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('status', 'pending')
        .eq('assigned_to', userId)
        .order('due_date', { ascending: true });

      if (error) {
        // If error is about missing column, fallback to all pending tasks (or empty)
        if (error.code === '42703') { // Undefined column
           console.warn('assigned_to column missing in tasks table');
           return [];
        }
        throw error;
      }
      return (data || []).map(task => ({
        ...task,
        client_id: task.client_id || undefined,
        venue_id: task.venue_id || undefined,
        planner_id: task.planner_id || undefined,
        description: task.description || undefined,
        due_date: task.due_date || undefined,
        assigned_to: task.assigned_to || undefined,
        completed_at: task.completed_at || undefined,
        completed_by: task.completed_by || undefined,
        created_at: task.created_at || new Date().toISOString(),
      }));
    } catch (error) {
      console.error('Error fetching my tasks:', error);
      return [];
    }
  },

  async getUpcomingEvents(limit = 10): Promise<Event[]> {
    const today = new Date().toISOString().split('T')[0];
    
    const { data, error } = await supabase
      .from('events')
      .select('*, venues(name)')
      .gte('date', today)
      .order('date', { ascending: true })
      .limit(limit);

    if (error) throw error;

    return (data || []).map((event: any) => ({
      ...event,
      client_id: event.client_id,
      secondary_client_id: event.secondary_client_id || undefined,
      venue_id: event.venue_id || undefined,
      planner_id: event.planner_id || undefined,
      guest_count: event.guest_count || undefined,
      budget: event.budget || undefined,
      notes: event.notes || undefined,
      updated_at: event.created_at, // Fallback
      venue_name: event.venues?.name || event.venue_name
    }));
  },

  async getMonthEvents(year: number, month: number): Promise<Event[]> {
    // Construct date range for the month
    const startDate = new Date(year, month, 1).toISOString().split('T')[0];
    const endDate = new Date(year, month + 1, 0).toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('events')
      .select('*, venues(name)')
      .gte('date', startDate)
      .lte('date', endDate)
      .eq('status', 'confirmed');

    if (error) throw error;

    return (data || []).map((event: any) => ({
      ...event,
      client_id: event.client_id,
      secondary_client_id: event.secondary_client_id || undefined,
      venue_id: event.venue_id || undefined,
      planner_id: event.planner_id || undefined,
      guest_count: event.guest_count || undefined,
      budget: event.budget || undefined,
      notes: event.notes || undefined,
      updated_at: event.created_at, // Fallback
      venue_name: event.venues?.name || event.venue_name
    }));
  }
};
