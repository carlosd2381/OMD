import { supabase } from '../lib/supabase';
import type { Venue, CreateVenueDTO, UpdateVenueDTO, VenueContact, CreateVenueContactDTO, UpdateVenueContactDTO } from '../types/venue';

export const venueService = {
  async getVenues(): Promise<Venue[]> {
    const { data, error } = await supabase
      .from('venues')
      .select('*')
      .order('name', { ascending: true });

    if (error) throw error;

    return (data || []).map(mapToVenue);
  },

  async getVenue(id: string): Promise<Venue | null> {
    const { data, error } = await supabase
      .from('venues')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!data) return null;

    return mapToVenue(data);
  },

  async createVenue(venue: CreateVenueDTO): Promise<Venue> {
    const { data, error } = await supabase
      .from('venues')
      .insert({
        name: venue.name,
        address: venue.address,
        city: venue.city,
        state: venue.state,
        zip_code: venue.zip_code,
        country: venue.country,
        venue_area: venue.venue_area,
        email: venue.email,
        phone: venue.phone,
        website: venue.website,
        instagram: venue.instagram,
        facebook: venue.facebook,
        notes: venue.notes
      })
      .select()
      .single();

    if (error) throw error;

    return mapToVenue(data);
  },

  async updateVenue(id: string, venue: UpdateVenueDTO): Promise<Venue> {
    const { data, error } = await supabase
      .from('venues')
      .update({
        ...venue,
        // updated_at: new Date().toISOString() // TODO: Add updated_at column to DB
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return mapToVenue(data);
  },

  async deleteVenue(id: string): Promise<void> {
    const { error } = await supabase
      .from('venues')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  // Contact Methods
  async getVenueContacts(venueId: string): Promise<VenueContact[]> {
    const { data, error } = await supabase
      .from('venue_contacts')
      .select('*')
      .eq('venue_id', venueId);

    if (error) throw error;

    return (data || []).map(mapToVenueContact);
  },

  async createVenueContact(contact: CreateVenueContactDTO): Promise<VenueContact> {
    const { data, error } = await supabase
      .from('venue_contacts')
      .insert(contact)
      .select()
      .single();

    if (error) throw error;

    return mapToVenueContact(data);
  },

  async updateVenueContact(id: string, contact: UpdateVenueContactDTO): Promise<VenueContact> {
    const { data, error } = await supabase
      .from('venue_contacts')
      .update(contact)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return mapToVenueContact(data);
  },

  async deleteVenueContact(id: string): Promise<void> {
    const { error } = await supabase
      .from('venue_contacts')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
};

// Helper to map DB result to Venue type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapToVenue(data: any): Venue {
  return {
    ...data,
    email: data.email || undefined,
    phone: data.phone || undefined,
    venue_area: data.venue_area || undefined,
    city: data.city || undefined,
    state: data.state || undefined,
    zip_code: data.zip_code || undefined,
    country: data.country || undefined,
    website: data.website || undefined,
    instagram: data.instagram || undefined,
    facebook: data.facebook || undefined,
    notes: data.notes || undefined,
    updated_at: data.created_at // Fallback
  };
}

// Helper to map DB result to VenueContact type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapToVenueContact(data: any): VenueContact {
  return {
    ...data,
    phone: data.phone || undefined,
    is_primary: data.is_primary || false
  };
}
