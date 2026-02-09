import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Search, Edit, Trash2, Eye } from 'lucide-react';
import { clientService } from '../../services/clientService';
import { eventService } from '../../services/eventService';
import { useConfirm } from '../../contexts/ConfirmContext';
import type { Client } from '../../types/client';
import type { Event } from '../../types/event';
import toast from 'react-hot-toast';

export default function ClientList() {
  const navigate = useNavigate();
  const { confirm } = useConfirm();
  const [clients, setClients] = useState<Client[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [clientFilters, setClientFilters] = useState({ hasEvent: 'all', eventStatus: 'all', sort: 'asc' as 'asc' | 'desc' });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [clientsData, eventsData] = await Promise.all([
        clientService.getClients(),
        eventService.getEvents()
      ]);
      setClients(clientsData);
      setEvents(eventsData);
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = await confirm({
      title: 'Delete Client',
      message: 'Are you sure you want to delete this client? This will also affect their associated events. This action cannot be undone.',
      confirmLabel: 'Delete',
      type: 'danger'
    });

    if (confirmed) {
      try {
        await clientService.deleteClient(id);
        toast.success('Client deleted successfully');
        loadData();
      } catch (error) {
        toast.error('Failed to delete client');
      }
    }
  };

  const eventsByClient = useMemo(() => {
    const map = new Map<string, Event[]>();
    events.forEach(event => {
      const current = map.get(event.client_id) || [];
      current.push(event);
      map.set(event.client_id, current);
    });
    return map;
  }, [events]);

  const availableEventStatuses = useMemo(() => {
    return Array.from(new Set(events.map(event => event.status))).sort();
  }, [events]);

  const sortedClients = useMemo(() => {
    const direction = clientFilters.sort === 'asc' ? 1 : -1;
    return [...clients].sort((a, b) => {
      const clientEventsA = eventsByClient.get(a.id) || [];
      const clientEventsB = eventsByClient.get(b.id) || [];
      const earliestA = clientEventsA.reduce((min, current) => {
        if (!current.date) return min;
        const time = new Date(current.date).getTime();
        return Math.min(min, time);
      }, Number.POSITIVE_INFINITY);
      const earliestB = clientEventsB.reduce((min, current) => {
        if (!current.date) return min;
        const time = new Date(current.date).getTime();
        return Math.min(min, time);
      }, Number.POSITIVE_INFINITY);

      if (earliestA === earliestB) {
        return a.last_name.localeCompare(b.last_name) * direction;
      }
      return (earliestA - earliestB) * direction;
    });
  }, [clients, eventsByClient, clientFilters.sort]);

  const filteredClients = sortedClients.filter(client => {
    const matchesSearch =
      client.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (client.company_name && client.company_name.toLowerCase().includes(searchTerm.toLowerCase()));

    if (!matchesSearch) return false;

    const clientEvents = eventsByClient.get(client.id) || [];
    const hasEvent = clientEvents.length > 0;

    if (clientFilters.hasEvent === 'with' && !hasEvent) return false;
    if (clientFilters.hasEvent === 'without' && hasEvent) return false;

    if (clientFilters.eventStatus !== 'all') {
      const statusMatch = clientEvents.some(event => event.status === clientFilters.eventStatus);
      if (!statusMatch) return false;
    }

    return true;
  });

  const resetClientFilters = () => setClientFilters({ hasEvent: 'all', eventStatus: 'all', sort: 'asc' });

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white dark:text-white">Clients</h1>
        <Link
          to="/clients/new"
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
        >
          <Plus className="h-5 w-5 mr-2" />
          Add Client
        </Link>
      </div>

      <div className="space-y-3">
        <div className="flex items-center px-4 py-3 bg-white dark:bg-gray-800 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 dark:border-gray-700 rounded-lg shadow-sm">
          <Search className="h-5 w-5 text-gray-400 mr-3" />
          <input
            type="text"
            placeholder="Search clients..."
            className="flex-1 border-none focus:ring-0 text-gray-900 dark:text-white dark:text-white placeholder-gray-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 dark:border-gray-700 rounded-lg shadow-sm p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-500 mb-1">Event Relationship</label>
              <select
                className="w-full rounded-md border-gray-300 focus:ring-primary focus:border-primary text-sm"
                value={clientFilters.hasEvent}
                onChange={(e) => setClientFilters(prev => ({ ...prev, hasEvent: e.target.value }))}
              >
                <option value="all">All Clients</option>
                <option value="with">With Event</option>
                <option value="without">Without Event</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-500 mb-1">Event Status</label>
              <select
                className="w-full rounded-md border-gray-300 focus:ring-primary focus:border-primary text-sm"
                value={clientFilters.eventStatus}
                onChange={(e) => setClientFilters(prev => ({ ...prev, eventStatus: e.target.value }))}
              >
                <option value="all">All Statuses</option>
                {availableEventStatuses.map(status => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-500 mb-1">Sort by Event Date</label>
              <select
                className="w-full rounded-md border-gray-300 focus:ring-primary focus:border-primary text-sm"
                value={clientFilters.sort}
                onChange={(e) => setClientFilters(prev => ({ ...prev, sort: e.target.value as 'asc' | 'desc' }))}
              >
                <option value="asc">Earliest first</option>
                <option value="desc">Latest first</option>
              </select>
            </div>
            <div className="md:self-end">
              <button
                type="button"
                onClick={resetClientFilters}
                className="px-4 py-2 text-sm font-medium text-primary hover:text-primary/80"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {filteredClients.map((client) => {
            const clientEvents = eventsByClient.get(client.id) || [];
            const clientEvent = clientEvents[0];
            return (
              <li key={client.id}>
                <div 
                  onClick={() => navigate(`/clients/${client.id}`)}
                  className="px-4 py-4 sm:px-6 hover:bg-gray-50 dark:bg-gray-700 dark:bg-gray-700 flex items-center justify-between cursor-pointer"
                >
                  <div className="flex items-center min-w-0 flex-1">
                    <div className="min-w-0 flex-1 px-4 md:grid md:grid-cols-2 md:gap-4">
                      <div>
                        <p className="text-sm font-medium text-primary truncate">{client.first_name} {client.last_name}</p>
                        {clientEvent ? (
                          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 dark:text-gray-400">
                            {clientEvent.date} • {clientEvent.venue_name || 'Venue TBD'}
                          </p>
                        ) : (
                          <p className="mt-1 text-sm text-gray-400 italic">No Event Date • Venue TBD</p>
                        )}
                      </div>
                      <div className="hidden md:block">
                        {clientEvent ? (
                          <div>
                            <p className="text-sm text-gray-900 dark:text-white dark:text-white">
                              {clientEvent.guest_count ? `${clientEvent.guest_count} Guests` : 'Guests TBD'}
                            </p>
                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 dark:text-gray-400 truncate">
                              {clientEvent.services && clientEvent.services.length > 0 ? clientEvent.services.join(', ') : 'No Services'}
                            </p>
                          </div>
                        ) : (
                          <div>
                            <p className="text-sm text-gray-400 italic">Guests TBD</p>
                            <p className="mt-1 text-sm text-gray-400 italic">No Services</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Link
                      to={`/clients/${client.id}`}
                      className="inline-flex items-center px-2.5 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white dark:bg-gray-800 dark:bg-gray-800 hover:bg-gray-50 dark:bg-gray-700 dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Eye className="h-4 w-4 mr-1" /> View
                    </Link>
                    <Link
                      to={`/clients/${client.id}/edit`}
                      className="inline-flex items-center px-2.5 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-blue-700 bg-white dark:bg-gray-800 dark:bg-gray-800 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Edit className="h-4 w-4 mr-1" /> Edit
                    </Link>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(client.id); }}
                      className="inline-flex items-center px-2.5 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-red-700 bg-white dark:bg-gray-800 dark:bg-gray-800 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                    >
                      <Trash2 className="h-4 w-4 mr-1" /> Delete
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
          {filteredClients.length === 0 && (
            <li className="px-4 py-8 text-center text-gray-500 dark:text-gray-400 dark:text-gray-400">
              No clients found.
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}
