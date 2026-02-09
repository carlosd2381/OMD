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
    // Clean up empty strings to nulls for optional fields
    const cleanVenue = {
      ...venue,
      venue_area: venue.venue_area || null,
      website: venue.website || null,
      phone: venue.phone || null,
      instagram: venue.instagram || null,
      facebook: venue.facebook || null,
      notes: venue.notes || null,
      google_place_id: venue.google_place_id || null,
      map_url: venue.map_url || null,
      is_preferred: venue.is_preferred || false,
    };

    const { data, error } = await supabase
      .from('venues')
      .insert(cleanVenue)
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
    // First delete associated contacts
    const { error: contactError } = await supabase
      .from('venue_contacts')
      .delete()
      .eq('venue_id', id);

    if (contactError) throw contactError;

    // Unlink associated events (set venue_id to null)
    const { error: eventError } = await supabase
      .from('events')
      .update({ venue_id: null })
      .eq('venue_id', id);

    if (eventError) throw eventError;

    // Then delete the venue
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

  async getVenueContact(id: string): Promise<VenueContact | null> {
    const { data, error } = await supabase
      .from('venue_contacts')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!data) return null;

    return mapToVenueContact(data);
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
    google_place_id: data.google_place_id || undefined,
    latitude: data.latitude || undefined,
    longitude: data.longitude || undefined,
    travel_distance_km: data.travel_distance_km ?? undefined,
    travel_time_mins: data.travel_time_mins ?? undefined,
    flete_fee: data.flete_fee ?? undefined,
    map_url: data.map_url || undefined,
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
