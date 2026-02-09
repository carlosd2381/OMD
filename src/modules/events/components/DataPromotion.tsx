import { useState } from 'react';
import { PlusCircle, MapPin, User, Building } from 'lucide-react';
import type { Event } from '../../../types/event';
import { venueService } from '../../../services/venueService';
import { plannerService } from '../../../services/plannerService';
import { eventService } from '../../../services/eventService';
import toast from 'react-hot-toast';

interface DataPromotionProps {
  event: Event;
  onUpdate: () => void;
}

export default function DataPromotion({ event, onUpdate }: DataPromotionProps) {
  const [loading, setLoading] = useState(false);

  // Check if we have unlinked venue data
  const hasUnlinkedVenue = !event.venue_id && event.venue_name;
  
  // Check if we have unlinked planner data
  const hasUnlinkedPlanner = !event.planner_id && (event.planner_company || event.planner_first_name);

  // Check if we have unlinked venue contact data (only if venue is linked)
  const hasUnlinkedVenueContact = event.venue_id && event.venue_contact_name;

  if (!hasUnlinkedVenue && !hasUnlinkedPlanner && !hasUnlinkedVenueContact) {
    return null;
  }

  const handleCreateVenue = async () => {
    if (!event.venue_name) return;
    setLoading(true);
    try {
      // 1. Check if venue already exists
      const venues = await venueService.getVenues();
      const existingVenue = venues.find(v => v.name.toLowerCase() === event.venue_name!.trim().toLowerCase());

      let venueId: string;

      if (existingVenue) {
        venueId = existingVenue.id;
        toast.success(`Found existing venue "${existingVenue.name}". Linking event...`);
      } else {
        // 2. Create Venue if it doesn't exist
        const newVenue = await venueService.createVenue({
          name: event.venue_name,
          address: event.venue_address || '',
          email: event.venue_contact_email || undefined,
          phone: event.venue_contact_phone || undefined,
          // Default values for required fields
          city: '',
          state: '',
          zip_code: '',
          country: 'Mexico',
          venue_area: 'Other',
        });
        venueId = newVenue.id;

        // 3. Create Venue Contact if name is provided (only for new venues)
        if (event.venue_contact_name) {
          const nameParts = event.venue_contact_name.trim().split(' ');
          const firstName = nameParts[0];
          const lastName = nameParts.slice(1).join(' ') || '-';

          await venueService.createVenueContact({
            venue_id: newVenue.id,
            first_name: firstName,
            last_name: lastName,
            email: event.venue_contact_email || '',
            phone: event.venue_contact_phone || undefined,
            role: 'Venue Contact',
            is_primary: true,
          });
        }
        toast.success('Venue created and linked successfully!');
      }

      // 4. Link Venue to Event
      await eventService.updateEvent(event.id, {
        venue_id: venueId,
      });

      onUpdate();
    } catch (error) {
      console.error(error);
      toast.error('Failed to process venue');
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePlanner = async () => {
    setLoading(true);
    try {
      // 1. Create Planner
      const newPlanner = await plannerService.createPlanner({
        company: event.planner_company || undefined,
        first_name: event.planner_first_name || 'Unknown',
        last_name: event.planner_last_name || 'Planner',
        email: event.planner_email || '',
        phone: event.planner_phone || undefined,
        instagram: event.planner_instagram || undefined,
      });

      // 2. Link Planner to Event
      await eventService.updateEvent(event.id, {
        planner_id: newPlanner.id,
      });

      toast.success('Planner created and linked successfully!');
      onUpdate();
    } catch (error) {
      console.error(error);
      toast.error('Failed to create planner');
    } finally {
      setLoading(false);
    }
  };

  const handleAddVenueContact = async () => {
    if (!event.venue_id || !event.venue_contact_name) return;
    setLoading(true);
    try {
      const nameParts = event.venue_contact_name.trim().split(' ');
      const firstName = nameParts[0];
      const lastName = nameParts.slice(1).join(' ') || '-';

      await venueService.createVenueContact({
        venue_id: event.venue_id,
        first_name: firstName,
        last_name: lastName,
        email: event.venue_contact_email || '',
        phone: event.venue_contact_phone || undefined,
        role: 'Venue Contact',
        is_primary: false,
      });

      // Clear the temp fields from event to stop showing this prompt? 
      // Or maybe just leave them as a record of what the client entered.
      // For now, we'll just notify success.
      
      toast.success('Contact added to Venue successfully!');
      // We might want to clear the "unlinked" state logic here, but since we check based on data existence, 
      // it will keep showing unless we clear the data from the event or have a way to know it's "processed".
      // For now, let's clear the contact name from the event to "dismiss" the card
      await eventService.updateEvent(event.id, {
          // Clear the contact name so it doesn't prompt again
          venue_contact_name: null, 
      });

      onUpdate();
    } catch (error) {
      console.error(error);
      toast.error('Failed to add venue contact');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 mb-6">
      {hasUnlinkedVenue && (
        <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
          <div className="flex justify-between items-center">
            <div className="flex">
              <div className="shrink-0">
                <MapPin className="h-5 w-5 text-blue-400" aria-hidden="true" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">New Venue Detected</h3>
                <div className="mt-2 text-sm text-blue-700">
                  <p>Client entered venue: <strong>{event.venue_name}</strong></p>
                  <p className="text-xs mt-1">{event.venue_address}</p>
                </div>
              </div>
            </div>
            <button
              onClick={handleCreateVenue}
              disabled={loading}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <PlusCircle className="h-4 w-4 mr-2" />
              Save to Database
            </button>
          </div>
        </div>
      )}

      {hasUnlinkedPlanner && (
        <div className="bg-purple-50 border-l-4 border-purple-400 p-4">
          <div className="flex justify-between items-center">
            <div className="flex">
              <div className="shrink-0">
                <User className="h-5 w-5 text-purple-400" aria-hidden="true" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-purple-800">New Planner Detected</h3>
                <div className="mt-2 text-sm text-purple-700">
                  <p>Client entered planner: <strong>{event.planner_company || `${event.planner_first_name} ${event.planner_last_name}`}</strong></p>
                </div>
              </div>
            </div>
            <button
              onClick={handleCreatePlanner}
              disabled={loading}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-purple-700 bg-purple-100 hover:bg-purple-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
            >
              <PlusCircle className="h-4 w-4 mr-2" />
              Save to Database
            </button>
          </div>
        </div>
      )}

      {hasUnlinkedVenueContact && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
          <div className="flex justify-between items-center">
            <div className="flex">
              <div className="shrink-0">
                <Building className="h-5 w-5 text-yellow-400" aria-hidden="true" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">New Venue Contact Detected</h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <p>Client entered contact: <strong>{event.venue_contact_name}</strong></p>
                  <p className="text-xs mt-1">for venue: {event.venue_name}</p>
                </div>
              </div>
            </div>
            <button
              onClick={handleAddVenueContact}
              disabled={loading}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-yellow-700 bg-yellow-100 hover:bg-yellow-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
            >
              <PlusCircle className="h-4 w-4 mr-2" />
              Add to Venue
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
