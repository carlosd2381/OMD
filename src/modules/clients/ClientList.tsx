import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Search, Edit, Trash2, Eye } from 'lucide-react';
import { clientService } from '../../services/clientService';
import type { Client } from '../../types/client';
import toast from 'react-hot-toast';

export default function ClientList() {
  const navigate = useNavigate();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    try {
      const data = await clientService.getClients();
      setClients(data);
    } catch (error) {
      toast.error('Failed to load clients');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this client?')) {
      try {
        await clientService.deleteClient(id);
        toast.success('Client deleted successfully');
        loadClients();
      } catch (error) {
        toast.error('Failed to delete client');
      }
    }
  };

  const filteredClients = clients.filter(client =>
    client.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (client.company_name && client.company_name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
        <Link
          to="/clients/new"
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-pink-600 hover:bg-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500"
        >
          <Plus className="h-5 w-5 mr-2" />
          Add Client
        </Link>
      </div>

      <div className="flex items-center px-4 py-3 bg-white border border-gray-200 rounded-lg shadow-sm">
        <Search className="h-5 w-5 text-gray-400 mr-3" />
        <input
          type="text"
          placeholder="Search clients..."
          className="flex-1 border-none focus:ring-0 text-gray-900 placeholder-gray-500"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {filteredClients.map((client) => (
            <li key={client.id}>
              <div 
                onClick={() => navigate(`/clients/${client.id}`)}
                className="px-4 py-4 sm:px-6 hover:bg-gray-50 flex items-center justify-between cursor-pointer"
              >
                <div className="flex items-center min-w-0 flex-1">
                  <div className="min-w-0 flex-1 px-4 md:grid md:grid-cols-2 md:gap-4">
                    <div>
                      <p className="text-sm font-medium text-pink-600 truncate">{client.first_name} {client.last_name}</p>
                      <p className="mt-1 flex items-center text-sm text-gray-500">
                        <span className="truncate">{client.email}</span>
                      </p>
                    </div>
                    <div className="hidden md:block">
                      <div>
                        <p className="text-sm text-gray-900">
                          {client.company_name || <span className="text-gray-400 italic">No Company</span>}
                        </p>
                        <p className="mt-1 text-sm text-gray-500">
                          {client.phone || <span className="text-gray-400 italic">No Phone</span>}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <Link
                    to={`/clients/${client.id}`}
                    className="text-gray-400 hover:text-gray-500"
                    title="View"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Eye className="h-5 w-5" />
                  </Link>
                  <Link
                    to={`/clients/${client.id}/edit`}
                    className="text-gray-400 hover:text-gray-500"
                    title="Edit"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Edit className="h-5 w-5" />
                  </Link>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(client.id); }}
                    className="text-gray-400 hover:text-red-500"
                    title="Delete"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </li>
          ))}
          {filteredClients.length === 0 && (
            <li className="px-4 py-8 text-center text-gray-500">
              No clients found.
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}
