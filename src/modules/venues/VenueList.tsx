import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Search, Edit, Trash2, MapPin, Eye } from 'lucide-react';
import { venueService } from '../../services/venueService';
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
        await venueService.deleteVenue(id);
        toast.success('Venue deleted successfully');
        loadVenues();
      } catch (error) {
        toast.error('Failed to delete venue');
      }
    }
  };

  const filteredVenues = venues.filter(venue =>
    venue.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (venue.city && venue.city.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Venues</h1>
        <Link
          to="/venues/new"
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-pink-600 hover:bg-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500"
        >
          <Plus className="h-5 w-5 mr-2" />
          Add Venue
        </Link>
      </div>

      <div className="flex items-center px-4 py-3 bg-white border border-gray-200 rounded-lg shadow-sm">
        <Search className="h-5 w-5 text-gray-400 mr-3" />
        <input
          type="text"
          placeholder="Search venues..."
          className="flex-1 border-none focus:ring-0 text-gray-900 placeholder-gray-500"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {filteredVenues.map((venue) => (
            <li key={venue.id}>
              <div 
                onClick={() => navigate(`/venues/${venue.id}`)}
                className="px-4 py-4 sm:px-6 hover:bg-gray-50 flex items-center justify-between cursor-pointer"
              >
                <div className="flex items-center min-w-0 flex-1">
                  <div className="min-w-0 flex-1 px-4 md:grid md:grid-cols-2 md:gap-4">
                    <div>
                      <p className="text-sm font-medium text-pink-600 truncate">{venue.name}</p>
                      <p className="mt-1 flex items-center text-sm text-gray-500">
                        <MapPin className="shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                        <span className="truncate">{venue.address}, {venue.city}</span>
                      </p>
                    </div>
                    <div className="hidden md:block">
                      <div>
                        <p className="text-sm text-gray-900">
                          {venue.venue_area || <span className="text-gray-400 italic">No Area</span>}
                        </p>
                        <p className="mt-1 text-sm text-gray-500">
                          {venue.website ? (
                            <a 
                              href={venue.website} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="text-pink-600 hover:underline"
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
                <div className="flex items-center space-x-4">
                  <Link 
                    to={`/venues/${venue.id}`} 
                    className="text-gray-400 hover:text-gray-500" 
                    title="View"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Eye className="h-5 w-5" />
                  </Link>
                  <Link 
                    to={`/venues/${venue.id}/edit`} 
                    className="text-gray-400 hover:text-gray-500" 
                    title="Edit"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Edit className="h-5 w-5" />
                  </Link>
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleDelete(venue.id); }} 
                    className="text-gray-400 hover:text-red-500" 
                    title="Delete"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </li>
          ))}
          {filteredVenues.length === 0 && (
            <li className="px-4 py-8 text-center text-gray-500">
              No venues found matching your search.
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}
