import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Search, Edit, Trash2, MapPin, Eye, Star } from 'lucide-react';
import { venueService } from '../../services/venueService';
import { eventService } from '../../services/eventService';
import type { Venue } from '../../types/venue';
import toast from 'react-hot-toast';

export default function VenueList() {
  const navigate = useNavigate();
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadVenues();
  }, []);

  const loadVenues = async () => {
    try {
      const data = await venueService.getVenues();
      setVenues(data);
    } catch (error) {
      toast.error('Failed to load venues');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this venue?')) {
      try {
        // Check for associated events
        const events = await eventService.getEventsByVenue(id);
        if (events.length > 0) {
          toast.error(`Cannot delete venue. It is used by ${events.length} event(s).`);
          return;
        }

        await venueService.deleteVenue(id);
        toast.success('Venue deleted successfully');
        loadVenues();
      } catch (error) {
        console.error('Delete error:', error);
        toast.error('Failed to delete venue');
      }
    }
  };

  const sortedVenues = [...venues].sort((a, b) => {
    if (!!a.is_preferred === !!b.is_preferred) {
      return a.name.localeCompare(b.name);
    }
    return a.is_preferred ? -1 : 1;
  });

  const filteredVenues = sortedVenues.filter(venue =>
    venue.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (venue.city && venue.city.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white dark:text-white">Venues</h1>
        <Link
          to="/venues/new"
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
        >
          <Plus className="h-5 w-5 mr-2" />
          Add Venue
        </Link>
      </div>

      <div className="flex items-center px-4 py-3 bg-white dark:bg-gray-800 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 dark:border-gray-700 rounded-lg shadow-sm">
        <Search className="h-5 w-5 text-gray-400 mr-3" />
        <input
          type="text"
          placeholder="Search venues..."
          className="flex-1 border-none focus:ring-0 text-gray-900 dark:text-white dark:text-white placeholder-gray-500"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {filteredVenues.map((venue) => (
            <li key={venue.id}>
              <div 
                onClick={() => navigate(`/venues/${venue.id}`)}
                className="px-4 py-4 sm:px-6 hover:bg-gray-50 dark:bg-gray-700 dark:bg-gray-700 flex items-center justify-between cursor-pointer"
              >
                <div className="flex items-center min-w-0 flex-1">
                  <div className="min-w-0 flex-1 px-4 md:grid md:grid-cols-2 md:gap-4">
                    <div>
                      <div className="flex items-center space-x-2">
                        <p className="text-sm font-medium text-primary truncate">{venue.name}</p>
                        {venue.is_preferred && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold text-amber-700 bg-amber-100 border border-amber-200">
                            <Star className="h-3 w-3 mr-1" fill="#b45309" stroke="#b45309" />
                            Preferred
                          </span>
                        )}
                      </div>
                      <p className="mt-1 flex items-center text-sm text-gray-500 dark:text-gray-400 dark:text-gray-400">
                        <MapPin className="shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                        <span className="truncate">{venue.address}, {venue.city}</span>
                      </p>
                    </div>
                    <div className="hidden md:block">
                      <div>
                        <p className="text-sm text-gray-900 dark:text-white dark:text-white">
                          {venue.venue_area || <span className="text-gray-400 italic">No Area</span>}
                        </p>
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 dark:text-gray-400">
                          {venue.website ? (
                            <a 
                              href={venue.website} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="text-primary hover:underline"
                              onClick={(e) => e.stopPropagation()}
                            >
                              Visit Website
                            </a>
                          ) : (
                            <span className="text-gray-400 italic">No Website</span>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Link 
                    to={`/venues/${venue.id}`} 
                    className="inline-flex items-center px-2.5 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white dark:bg-gray-800 dark:bg-gray-800 hover:bg-gray-50 dark:bg-gray-700 dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Eye className="h-4 w-4 mr-1" /> View
                  </Link>
                  <Link 
                    to={`/venues/${venue.id}/edit`} 
                    className="inline-flex items-center px-2.5 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-blue-700 bg-white dark:bg-gray-800 dark:bg-gray-800 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Edit className="h-4 w-4 mr-1" /> Edit
                  </Link>
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleDelete(venue.id); }} 
                    className="inline-flex items-center px-2.5 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-red-700 bg-white dark:bg-gray-800 dark:bg-gray-800 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                  >
                    <Trash2 className="h-4 w-4 mr-1" /> Delete
                  </button>
                </div>
              </div>
            </li>
          ))}
          {filteredVenues.length === 0 && (
            <li className="px-4 py-8 text-center text-gray-500 dark:text-gray-400 dark:text-gray-400">
              No venues found matching your search.
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}
