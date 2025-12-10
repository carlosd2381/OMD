import type { Venue, CreateVenueDTO, UpdateVenueDTO, VenueContact, CreateVenueContactDTO } from '../types/venue';

// Mock data
const MOCK_VENUES: Venue[] = [
  {
    id: '1',
    name: 'Hacienda Los Arcangeles',
    address: 'Real de Minas 123',
    city: 'San Miguel de Allende',
    venue_area: 'Playa Del Carmen',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '2',
    name: 'Rosewood San Miguel',
    address: 'Nemesio Diez 11',
    city: 'San Miguel de Allende',
    venue_area: 'Cancun',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const MOCK_CONTACTS: VenueContact[] = [
  {
    id: '101',
    venue_id: '1',
    first_name: 'Sofia',
    last_name: 'Ramirez',
    role: 'Wedding Planner',
    email: 'sofia@hacienda.com',
    phone: '+52 415 123 4567',
    is_primary: true,
  },
  {
    id: '102',
    venue_id: '2',
    first_name: 'Carlos',
    last_name: 'Ruiz',
    role: 'Sales Manager',
    email: 'events@rosewood.com',
    is_primary: true,
  }
];

export const venueService = {
  async getVenues(): Promise<Venue[]> {
    return new Promise((resolve) => {
      setTimeout(() => resolve(MOCK_VENUES), 500);
    });
  },

  async getVenue(id: string): Promise<Venue | undefined> {
    return new Promise((resolve) => {
      setTimeout(() => resolve(MOCK_VENUES.find(v => v.id === id)), 500);
    });
  },

  async createVenue(venue: CreateVenueDTO): Promise<Venue> {
    return new Promise((resolve) => {
      const newVenue = {
        ...venue,
        id: Math.random().toString(36).substr(2, 9),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      MOCK_VENUES.push(newVenue);
      setTimeout(() => resolve(newVenue), 500);
    });
  },

  async updateVenue(id: string, venue: UpdateVenueDTO): Promise<Venue> {
    return new Promise((resolve) => {
      const index = MOCK_VENUES.findIndex(v => v.id === id);
      if (index !== -1) {
        MOCK_VENUES[index] = { ...MOCK_VENUES[index], ...venue, updated_at: new Date().toISOString() };
        setTimeout(() => resolve(MOCK_VENUES[index]), 500);
      } else {
        throw new Error('Venue not found');
      }
    });
  },

  async deleteVenue(id: string): Promise<void> {
    return new Promise((resolve) => {
      const index = MOCK_VENUES.findIndex(v => v.id === id);
      if (index !== -1) {
        MOCK_VENUES.splice(index, 1);
      }
      setTimeout(() => resolve(), 500);
    });
  },

  // Contact Methods
  async getVenueContacts(venueId: string): Promise<VenueContact[]> {
    return new Promise((resolve) => {
      setTimeout(() => resolve(MOCK_CONTACTS.filter(c => c.venue_id === venueId)), 500);
    });
  },

  async addVenueContact(venueId: string, contact: CreateVenueContactDTO): Promise<VenueContact> {
    return new Promise((resolve) => {
      const newContact = {
        ...contact,
        id: Math.random().toString(36).substr(2, 9),
        venue_id: venueId,
      };
      MOCK_CONTACTS.push(newContact);
      setTimeout(() => resolve(newContact), 500);
    });
  },

  async deleteVenueContact(contactId: string): Promise<void> {
    return new Promise((resolve) => {
      const index = MOCK_CONTACTS.findIndex(c => c.id === contactId);
      if (index !== -1) {
        MOCK_CONTACTS.splice(index, 1);
      }
      setTimeout(() => resolve(), 500);
    });
  }
};
