export interface VenueContact {
  id: string;
  venue_id: string;
  first_name: string;
  last_name: string;
  role: string; // e.g., 'Wedding Planner', 'Sales Manager', 'Accounting'
  email: string;
  phone?: string;
  is_primary: boolean;
}

export interface Venue {
  id: string;
  name: string;
  address: string;
  website?: string;
  instagram?: string;
  facebook?: string;
  email?: string; // General venue email
  phone?: string; // General venue phone
  venue_area?: 'Playa/Costa Mujeres' | 'Cancun Z/H' | 'Cancun' | 'Puerto Morelos' | 'Playa Del Carmen' | 'Puerto Aventuras' | 'Akumal' | 'Tulum' | 'Isla Mujeres' | 'Cozumel' | 'Other';
  city?: string;
  state?: string;
  zip_code?: string;
  country?: string;
  notes?: string;
  google_place_id?: string;
  latitude?: number;
  longitude?: number;
  travel_distance_km?: number;
  travel_time_mins?: number;
  flete_fee?: number;
  map_url?: string;
  is_preferred?: boolean;
  created_at: string;
  updated_at: string;
}

export type CreateVenueDTO = Omit<Venue, 'id' | 'created_at' | 'updated_at'>;
export type UpdateVenueDTO = Partial<CreateVenueDTO>;
export type CreateVenueContactDTO = Omit<VenueContact, 'id'>;
export type UpdateVenueContactDTO = Partial<CreateVenueContactDTO>;
