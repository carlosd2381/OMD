import { supabase } from '../lib/supabase';
import type { Event } from '../types/event';
import type { Task } from '../types/task';

export interface CalendarEvent extends Event {
  type: 'event';
}

export interface CalendarTask extends Task {
  type: 'task';
}

export type CalendarItem = CalendarEvent | CalendarTask;

export const calendarService = {
  async getCalendarItems(startDate: string, endDate: string): Promise<CalendarItem[]> {
    const items: CalendarItem[] = [];

    // Fetch Events
    const { data: events, error: eventsError } = await supabase
      .from('events')
      .select('*, venues(name)')
      .gte('date', startDate)
      .lte('date', endDate);

    if (eventsError) throw eventsError;

    if (events) {
      items.push(...events.map((event: any) => ({
        ...event,
        venue_id: event.venue_id || undefined,
        planner_id: event.planner_id || undefined,
        guest_count: event.guest_count || undefined,
        budget: event.budget || undefined,
        notes: event.notes || undefined,
        updated_at: event.created_at, // Fallback since updated_at might be missing in DB response
        venue_name: event.venues?.name || event.venue_name,
        type: 'event' as const
      } as CalendarEvent)));
    }

    // Fetch Tasks with due dates
    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select('*')
      .not('due_date', 'is', null)
      .gte('due_date', startDate)
      .lte('due_date', endDate);

    if (tasksError) throw tasksError;

    if (tasks) {
      items.push(...tasks.map(task => ({
        ...task,
        client_id: task.client_id || undefined,
        venue_id: task.venue_id || undefined,
        planner_id: task.planner_id || undefined,
        description: task.description || undefined,
        due_date: task.due_date || undefined,
        assigned_to: task.assigned_to || undefined,
        completed_at: task.completed_at || undefined,
        completed_by: task.completed_by || undefined,
        type: 'task' as const
      } as CalendarTask)));
    }

    return items;
  }
};
