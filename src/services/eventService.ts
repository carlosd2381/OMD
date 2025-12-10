import type { Event } from '../types/event';

const MOCK_EVENTS: Event[] = [
  {
    id: '1',
    name: 'Gonzalez Wedding',
    date: '2024-06-15',
    client_id: '1',
    venue_id: '1',
    status: 'confirmed',
    guest_count: 150,
    budget: 50000,
    notes: 'Outdoor ceremony',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '2',
    name: 'Corporate Gala',
    date: '2024-09-20',
    client_id: '2',
    venue_id: '2',
    status: 'inquiry',
    guest_count: 300,
    budget: 100000,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

export const eventService = {
  async getEvents(): Promise<Event[]> {
    return new Promise((resolve) => {
      setTimeout(() => resolve(MOCK_EVENTS), 500);
    });
  },

  async getEvent(id: string): Promise<Event | undefined> {
    return new Promise((resolve) => {
      setTimeout(() => resolve(MOCK_EVENTS.find(e => e.id === id)), 500);
    });
  },

  async createEvent(event: Omit<Event, 'id' | 'created_at' | 'updated_at'>): Promise<Event> {
    const newEvent: Event = {
      ...event,
      id: Math.random().toString(36).substr(2, 9),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    MOCK_EVENTS.push(newEvent);
    return new Promise((resolve) => setTimeout(() => resolve(newEvent), 500));
  },

  async updateEvent(id: string, updates: Partial<Event>): Promise<Event> {
    const index = MOCK_EVENTS.findIndex(e => e.id === id);
    if (index === -1) throw new Error('Event not found');
    
    MOCK_EVENTS[index] = { ...MOCK_EVENTS[index], ...updates, updated_at: new Date().toISOString() };
    return new Promise((resolve) => setTimeout(() => resolve(MOCK_EVENTS[index]), 500));
  },

  async deleteEvent(id: string): Promise<void> {
    const index = MOCK_EVENTS.findIndex(e => e.id === id);
    if (index !== -1) {
      MOCK_EVENTS.splice(index, 1);
    }
    return new Promise((resolve) => setTimeout(() => resolve(), 500));
  }
};
