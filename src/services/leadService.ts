import type { Lead, CreateLeadDTO, UpdateLeadDTO } from '../types/lead';

// Mock data
const MOCK_LEADS: Lead[] = [
  {
    id: '1',
    first_name: 'Sarah',
    last_name: 'Johnson',
    email: 'sarah.j@example.com',
    phone: '+1 555 0123',
    role: 'Bride',
    event_type: 'Wedding',
    event_date: '2024-06-15',
    guest_count: 150,
    venue_name: 'Grand Hotel',
    services_interested: ['Mini-Churros', 'Ice Cream/Sorbet'],
    lead_source: 'Website',
    status: 'New',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '2',
    first_name: 'Michael',
    last_name: 'Smith',
    email: 'mike.smith@example.com',
    phone: '+1 555 9876',
    role: 'Groom',
    event_type: 'Wedding',
    event_date: '2024-08-20',
    guest_count: 200,
    venue_name: 'Beach Resort',
    services_interested: ['Mini-Donuts'],
    lead_source: 'Instagram',
    status: 'Contacted',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

export const leadService = {
  async getLeads(): Promise<Lead[]> {
    return new Promise((resolve) => {
      setTimeout(() => resolve(MOCK_LEADS), 500);
    });
  },

  async getLead(id: string): Promise<Lead | undefined> {
    return new Promise((resolve) => {
      setTimeout(() => resolve(MOCK_LEADS.find(l => l.id === id)), 500);
    });
  },

  async createLead(lead: CreateLeadDTO): Promise<Lead> {
    return new Promise((resolve) => {
      const newLead = {
        ...lead,
        id: Math.random().toString(36).substr(2, 9),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      MOCK_LEADS.push(newLead);
      setTimeout(() => resolve(newLead), 500);
    });
  },

  async updateLead(id: string, updates: UpdateLeadDTO): Promise<Lead> {
    return new Promise((resolve, reject) => {
      const index = MOCK_LEADS.findIndex(l => l.id === id);
      if (index === -1) {
        reject(new Error('Lead not found'));
        return;
      }
      const updatedLead = {
        ...MOCK_LEADS[index],
        ...updates,
        updated_at: new Date().toISOString(),
      };
      MOCK_LEADS[index] = updatedLead;
      setTimeout(() => resolve(updatedLead), 500);
    });
  },

  async deleteLead(id: string): Promise<void> {
    return new Promise((resolve) => {
      const index = MOCK_LEADS.findIndex(l => l.id === id);
      if (index !== -1) {
        MOCK_LEADS.splice(index, 1);
      }
      setTimeout(() => resolve(), 500);
    });
  },
};
