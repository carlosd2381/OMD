import { supabase } from '../lib/supabase';
import type { Event } from '../types/event';
import type { Task } from '../types/task';

export interface CalendarEvent extends Event {
  item_type: 'event';
  client_name?: string;
  secondary_client_name?: string;
}

export interface CalendarTask extends Task {
  item_type: 'task';
}

export type CalendarItem = CalendarEvent | CalendarTask;

type CalendarEventWithVenue = Event & {
  venues?: {
    name?: string | null;
  } | null;
};

type ClientNameRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
};

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
      const typedEvents = events as CalendarEventWithVenue[];
      const clientIds = Array.from(
        new Set(
          typedEvents
            .flatMap((event) => [event.client_id, event.secondary_client_id])
            .filter((id): id is string => Boolean(id))
        )
      );

      let clientNameMap = new Map<string, string>();
      if (clientIds.length > 0) {
        const { data: clients, error: clientsError } = await supabase
          .from('clients')
          .select('id, first_name, last_name')
          .in('id', clientIds);

        if (clientsError) throw clientsError;

        clientNameMap = new Map(
          ((clients || []) as ClientNameRow[]).map((client) => {
            const fullName = [client.first_name, client.last_name].filter(Boolean).join(' ').trim();
            return [client.id, fullName || 'Client'];
          })
        );
      }

      items.push(...typedEvents.map((event) => ({
        ...event,
        venue_id: event.venue_id || undefined,
        planner_id: event.planner_id || undefined,
        guest_count: event.guest_count || undefined,
        budget: event.budget || undefined,
        notes: event.notes || undefined,
        updated_at: event.created_at, // Fallback since updated_at might be missing in DB response
        venue_name: event.venues?.name || event.venue_name,
        client_name: clientNameMap.get(event.client_id),
        secondary_client_name: event.secondary_client_id ? clientNameMap.get(event.secondary_client_id) : undefined,
        item_type: 'event' as const
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
        item_type: 'task' as const
      } as CalendarTask)));
    }

    return items;
  }
};
