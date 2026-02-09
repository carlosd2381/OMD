import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Save, Printer, FileText } from 'lucide-react';
import { runSheetService } from '../../services/runSheetService';
import { clientService } from '../../services/clientService';
import { plannerService } from '../../services/plannerService';
import { venueService } from '../../services/venueService';
import { staffService } from '../../services/staffService';
import type { Event } from '../../types/event';
import type { Venue, VenueContact } from '../../types/venue';
import type { RunSheet } from '../../types/runSheet';
import type { Client } from '../../types/client';
import type { Planner } from '../../types/planner';
import type { StaffProfile } from '../../types/staff';
import toast from 'react-hot-toast';

interface RunSheetTabProps {
  event: Event;
  venue: Venue | null;
}

export default function RunSheetTab({ event, venue }: RunSheetTabProps) {
  const [loading, setLoading] = useState(false);
  const [client, setClient] = useState<Client | null>(null);
  const [planner, setPlanner] = useState<Planner | null>(null);
  const [venueContact, setVenueContact] = useState<VenueContact | null>(null);
  const [runSheet, setRunSheet] = useState<RunSheet | null>(null);
  const [staffList, setStaffList] = useState<StaffProfile[]>([]);

  const { register, handleSubmit, reset, setValue } = useForm<RunSheet>();

  useEffect(() => {
    loadData();

    // Listen for staff assignment changes from the Event Staff tab
    const handler = (e: any) => {
      console.debug('[RunSheetTab] received staff_assignments:updated', e?.detail);
      if (e?.detail?.eventId === event.id) loadData();
    };
    window.addEventListener('staff_assignments:updated', handler as any);

    return () => window.removeEventListener('staff_assignments:updated', handler as any);
  }, [event.id]);

  const calculateDefaultTimes = () => {
    if (!venue?.travel_time_mins) return {};

    const travelTime = Math.ceil(venue.travel_time_mins);
    const bufferTime = 30;
    const totalTravelTime = travelTime + bufferTime;
    
    // Base time logic (similar to EventTimeline)
    let baseDate = new Date();
    if (event.date && event.date.includes('T')) {
        baseDate = new Date(event.date);
    } else {
        baseDate.setHours(23, 0, 0, 0);
    }

    const formatTime = (offsetMinutes: number) => {
      const itemDate = new Date(baseDate.getTime() + offsetMinutes * 60000);
      // Return HH:mm format for input type="time"
      return itemDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    };

    // Offsets
    const eventStartOffset = 0;
    const eventEndOffset = 120;
    const setupOffset = -40;
    const arriveOffset = -65;
    const leaveOffset = arriveOffset - totalTravelTime;
    const meetOffset = leaveOffset - 15;

    return {
      event_start_time: formatTime(eventStartOffset),
      event_end_time: formatTime(eventEndOffset),
      setup_time: formatTime(setupOffset),
      arrive_time: formatTime(arriveOffset),
      leave_time: formatTime(leaveOffset),
      meet_load_time: formatTime(meetOffset),
    };
  };

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load Client
      if (event.client_id) {
        const clientData = await clientService.getClient(event.client_id);
        setClient(clientData);
      }

      // Load Planner
      if (event.planner_id) {
        const plannerData = await plannerService.getPlanner(event.planner_id);
        setPlanner(plannerData);
      }

      // Load Venue Contact
      if (event.venue_contact_id) {
        const contactData = await venueService.getVenueContact(event.venue_contact_id);
        setVenueContact(contactData);
      }

      // Load Staff list
      const staffMembers = await staffService.getStaffMembers();
      setStaffList(staffMembers);

      // Load Run Sheet
      const runSheetData = await runSheetService.getRunSheetByEventId(event.id);
      if (runSheetData) {
        // Normalize staff fields to use user_id where possible (stored values may be names)
        const resolveStaffValue = (val?: string) => {
          if (!val) return '';
          // Match by user_id first
          const byId = staffMembers.find(s => s.user_id === val || s.id === val);
          if (byId) return byId.user_id;
          // Match by full name
          const cleaned = val.trim().toLowerCase();
          const byName = staffMembers.find(s => `${s.first_name} ${s.last_name}`.trim().toLowerCase() === cleaned);
          if (byName) return byName.user_id;
          // Leave value as-is (backwards compatibility)
          return val;
        };

        const normalized: RunSheet = {
          ...runSheetData,
          driver_a: resolveStaffValue(runSheetData.driver_a),
          driver_b: resolveStaffValue(runSheetData.driver_b),
          operator_1: resolveStaffValue(runSheetData.operator_1),
          operator_2: resolveStaffValue(runSheetData.operator_2),
          operator_3: resolveStaffValue(runSheetData.operator_3),
          operator_4: resolveStaffValue(runSheetData.operator_4),
          operator_5: resolveStaffValue(runSheetData.operator_5),
          operator_6: resolveStaffValue(runSheetData.operator_6),
        };

        setRunSheet(normalized);
        reset(normalized);
      } else {
        // Pre-fill times if no run sheet exists
        const defaultTimes = calculateDefaultTimes();
        Object.entries(defaultTimes).forEach(([key, value]) => {
          setValue(key as keyof RunSheet, value as string);
        });
      }
    } catch (error) {
      console.error('Failed to load run sheet data', error);
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: any) => {
    try {
      setLoading(true);
      const payload = {
        ...data,
        event_id: event.id
      };
      console.debug('[RunSheet] onSubmit payload:', payload);
      
      const saved = await runSheetService.upsertRunSheet(payload);
      setRunSheet(saved);
      toast.success('Run sheet saved successfully');

    // Sync assignments with run sheet positions (drivers/operators)
    try {
      const positions = {
        driver_a: saved.driver_a || undefined,
        driver_b: saved.driver_b || undefined,
        operator_1: saved.operator_1 || undefined,
        operator_2: saved.operator_2 || undefined,
        operator_3: saved.operator_3 || undefined,
        operator_4: saved.operator_4 || undefined,
        operator_5: saved.operator_5 || undefined,
        operator_6: saved.operator_6 || undefined,
      };
      console.debug('[RunSheet] syncing positions:', positions);
      const report = await staffService.syncEventAssignmentsWithPositions(event.id, positions);
      console.debug('[RunSheet] syncEventAssignmentsWithPositions completed', report);

      // Show a concise sync report toast
      const summary = `Sync: ${report.created.length} created, ${report.updated.length} updated, ${report.deleted.length} deleted, ${report.skipped.length} skipped`;
      toast.success(`Run Sheet saved — ${summary}`);
      if (report.skipped.length) {
        const details = report.skipped.map(s => `${s.role}: ${s.reason}`).join(', ');
        toast.error(`Sync issues: ${details}`);
      }
    } catch (err) {
      console.error('Failed to sync staff assignments after run sheet save:', err);
      toast.error('Run sheet saved but failed to sync staff assignments (see console)');
    }

    // Dispatch event so other tabs/components can refresh
    console.debug('[RunSheet] dispatching run_sheet:updated for', event.id);
    window.dispatchEvent(new CustomEvent('run_sheet:updated', { detail: { eventId: event.id } }));

    // Reload to reflect assignment changes in the UI
    await loadData();    } catch (error) {
      console.error('Failed to save run sheet', error);
      toast.error('Failed to save run sheet');
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePDF = async () => {
    try {
      const [{ pdf }, { default: RunSheetPDF }] = await Promise.all([
        import('@react-pdf/renderer'),
        import('./RunSheetPDF'),
      ]);

      const blob = await pdf(
        <RunSheetPDF 
          event={event} 
          venue={venue} 
          venueContact={venueContact}
          runSheet={runSheet} 
          client={client} 
          planner={planner}
          staffList={staffList}
        />
      ).toBlob();
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch (error) {
      console.error('Failed to generate PDF', error);
      toast.error('Failed to generate PDF');
    }
  };

  if (loading && !runSheet) {
    return <div className="text-center py-12">Loading run sheet...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end space-x-3 no-print">
        <button
          onClick={handleGeneratePDF}
          className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white dark:bg-gray-800 dark:bg-gray-800 hover:bg-gray-50 dark:bg-gray-700 dark:bg-gray-700 focus:outline-none"
        >
          <Printer className="h-4 w-4 mr-2" />
          Generate PDF
        </button>
        <button
          onClick={handleSubmit(onSubmit)}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary/90 focus:outline-none"
        >
          <Save className="h-4 w-4 mr-2" />
          Save Changes
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg print:shadow-none">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200 dark:border-gray-700 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 dark:bg-gray-700 print:bg-white dark:bg-gray-800 dark:bg-gray-800">
          <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white dark:text-white">Event Run Sheet</h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500 dark:text-gray-400 dark:text-gray-400">Operational details for the event crew.</p>
        </div>

        <div className="px-4 py-5 sm:p-6 space-y-8">
          {/* Venue Details */}
          <section>
            <h4 className="text-md font-medium text-gray-900 dark:text-white dark:text-white mb-4 flex items-center">
              <FileText className="h-4 w-4 mr-2 text-gray-400" />
              Venue Details
            </h4>
            <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2 bg-gray-50 dark:bg-gray-700 dark:bg-gray-700 p-4 rounded-md print:bg-white dark:bg-gray-800 dark:bg-gray-800 print:border print:border-gray-200 dark:border-gray-700 dark:border-gray-700">
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 dark:text-gray-400">Venue Name</dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-white dark:text-white">{venue?.name || 'N/A'}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 dark:text-gray-400">Venue Area</dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-white dark:text-white">{venue?.venue_area || 'N/A'}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 dark:text-gray-400">Address</dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-white dark:text-white">{venue?.address || 'N/A'}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 dark:text-gray-400">Venue Contact</dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-white dark:text-white">
                  {venueContact ? (
                    <span>
                      {venueContact.first_name} {venueContact.last_name}
                      {venueContact.phone && <span className="ml-2 text-gray-500 dark:text-gray-400 dark:text-gray-400">{venueContact.phone}</span>}
                    </span>
                  ) : (
                    venue?.phone || venue?.email || 'N/A'
                  )}
                </dd>
              </div>
            </div>
          </section>

          {/* External Planner */}
          <section>
            <h4 className="text-md font-medium text-gray-900 dark:text-white dark:text-white mb-4">External Planner</h4>
            <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-3 bg-gray-50 dark:bg-gray-700 dark:bg-gray-700 p-4 rounded-md print:bg-white dark:bg-gray-800 dark:bg-gray-800 print:border print:border-gray-200 dark:border-gray-700 dark:border-gray-700">
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 dark:text-gray-400">Name</dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-white dark:text-white">{planner?.first_name} {planner?.last_name || 'N/A'}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 dark:text-gray-400">Phone</dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-white dark:text-white">{planner?.phone || 'N/A'}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 dark:text-gray-400">Email</dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-white dark:text-white">{planner?.email || 'N/A'}</dd>
              </div>
            </div>
          </section>

          {/* Client Details */}
          <section>
            <h4 className="text-md font-medium text-gray-900 dark:text-white dark:text-white mb-4">Client Details</h4>
            <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2 bg-gray-50 dark:bg-gray-700 dark:bg-gray-700 p-4 rounded-md print:bg-white dark:bg-gray-800 dark:bg-gray-800 print:border print:border-gray-200 dark:border-gray-700 dark:border-gray-700">
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 dark:text-gray-400">Client 1</dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-white dark:text-white">
                  {client?.first_name} {client?.last_name} <br/>
                  <span className="text-gray-500 dark:text-gray-400 dark:text-gray-400 text-xs">{client?.email} • {client?.phone}</span>
                </dd>
              </div>
              {/* Placeholder for Client 2 if data model supports it */}
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 dark:text-gray-400">Client 2</dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-white dark:text-white">
                  {event.secondary_client_id ? 'Secondary Client Info' : 'N/A'}
                </dd>
              </div>
            </div>
          </section>

          {/* Event Schedule */}
          <section>
            <h4 className="text-md font-medium text-gray-900 dark:text-white dark:text-white mb-4">Event Schedule</h4>
            <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Event Date</label>
                <div className="mt-1 text-sm text-gray-900 dark:text-white dark:text-white font-medium">{event.date}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Guest Count</label>
                <div className="mt-1 text-sm text-gray-900 dark:text-white dark:text-white font-medium">{event.guest_count}</div>
              </div>
              <div className="col-span-2"></div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Meet & Load</label>
                <input type="time" {...register('meet_load_time')} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Leave to Event</label>
                <input type="time" {...register('leave_time')} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Arrive at Venue</label>
                <input type="time" {...register('arrive_time')} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Setup Time</label>
                <input type="time" {...register('setup_time')} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Event Start</label>
                <input type="time" {...register('event_start_time')} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Event End</label>
                <input type="time" {...register('event_end_time')} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm" />
              </div>
            </div>
          </section>

          {/* Staff Details */}
          <section>
            <h4 className="text-md font-medium text-gray-900 dark:text-white dark:text-white mb-4">Staff Details</h4>
            <div className="grid grid-cols-1 gap-y-4 gap-x-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Driver A</label>
                <select {...register('driver_a')} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm">
                  <option value="">Unassigned</option>
                  {staffList.map(s => (
                    <option key={s.id} value={s.user_id}>{s.first_name} {s.last_name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Driver B</label>
                <select {...register('driver_b')} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm">
                  <option value="">Unassigned</option>
                  {staffList.map(s => (
                    <option key={s.id} value={s.user_id}>{s.first_name} {s.last_name}</option>
                  ))}
                </select>
              </div>
              {[1, 2, 3, 4, 5, 6].map(num => (
                <div key={`op-${num}`}>
                  <label className="block text-sm font-medium text-gray-700">Operator {num}</label>
                  <select {...register(`operator_${num}` as any)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm">
                    <option value="">Unassigned</option>
                    {staffList.map(s => (
                      <option key={s.id} value={s.user_id}>{s.first_name} {s.last_name}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </section>

          {/* Equipment */}
          <section>
            <h4 className="text-md font-medium text-gray-900 dark:text-white dark:text-white mb-4">Equipment</h4>
            <div className="grid grid-cols-2 gap-y-4 gap-x-4 sm:grid-cols-3 lg:grid-cols-4">
              <div className="flex items-center">
                <input
                  id="cart_1"
                  type="checkbox"
                  {...register('cart_1')}
                  className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                />
                <label htmlFor="cart_1" className="ml-2 block text-sm text-gray-900 dark:text-white dark:text-white">
                  Cart 1
                </label>
              </div>
              <div className="flex items-center">
                <input
                  id="cart_2"
                  type="checkbox"
                  {...register('cart_2')}
                  className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                />
                <label htmlFor="cart_2" className="ml-2 block text-sm text-gray-900 dark:text-white dark:text-white">
                  Cart 2
                </label>
              </div>
              <div className="flex items-center">
                <input
                  id="booth_1"
                  type="checkbox"
                  {...register('booth_1')}
                  className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                />
                <label htmlFor="booth_1" className="ml-2 block text-sm text-gray-900 dark:text-white dark:text-white">
                  Booth 1
                </label>
              </div>
              <div className="flex items-center">
                <input
                  id="booth_2"
                  type="checkbox"
                  {...register('booth_2')}
                  className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                />
                <label htmlFor="booth_2" className="ml-2 block text-sm text-gray-900 dark:text-white dark:text-white">
                  Booth 2
                </label>
              </div>
              <div className="flex items-center">
                <input
                  id="freezer_1"
                  type="checkbox"
                  {...register('freezer_1')}
                  className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                />
                <label htmlFor="freezer_1" className="ml-2 block text-sm text-gray-900 dark:text-white dark:text-white">
                  Freezer 1
                </label>
              </div>
              <div className="flex items-center">
                <input
                  id="freezer_2"
                  type="checkbox"
                  {...register('freezer_2')}
                  className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                />
                <label htmlFor="freezer_2" className="ml-2 block text-sm text-gray-900 dark:text-white dark:text-white">
                  Freezer 2
                </label>
              </div>
              <div className="flex items-center">
                <input
                  id="rollz_1"
                  type="checkbox"
                  {...register('rollz_1')}
                  className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                />
                <label htmlFor="rollz_1" className="ml-2 block text-sm text-gray-900 dark:text-white dark:text-white">
                  Rollz 1
                </label>
              </div>
              <div className="flex items-center">
                <input
                  id="pancake_1"
                  type="checkbox"
                  {...register('pancake_1')}
                  className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                />
                <label htmlFor="pancake_1" className="ml-2 block text-sm text-gray-900 dark:text-white dark:text-white">
                  Pancake 1
                </label>
              </div>
              <div className="flex items-center">
                <input
                  id="pancake_2"
                  type="checkbox"
                  {...register('pancake_2')}
                  className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                />
                <label htmlFor="pancake_2" className="ml-2 block text-sm text-gray-900 dark:text-white dark:text-white">
                  Pancake 2
                </label>
              </div>
              <div className="flex items-center">
                <input
                  id="waffle_1"
                  type="checkbox"
                  {...register('waffle_1')}
                  className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                />
                <label htmlFor="waffle_1" className="ml-2 block text-sm text-gray-900 dark:text-white dark:text-white">
                  Waffle 1
                </label>
              </div>
              <div className="flex items-center">
                <input
                  id="waffle_2"
                  type="checkbox"
                  {...register('waffle_2')}
                  className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                />
                <label htmlFor="waffle_2" className="ml-2 block text-sm text-gray-900 dark:text-white dark:text-white">
                  Waffle 2
                </label>
              </div>
            </div>
          </section>

          {/* Additional Info */}
          <section>
            <h4 className="text-md font-medium text-gray-900 dark:text-white dark:text-white mb-4">Additional Event Info - Issues - Problems</h4>
            <div>
              <textarea
                {...register('notes')}
                rows={4}
                className="shadow-sm focus:ring-primary focus:border-primary block w-full sm:text-sm border-gray-300 rounded-md"
                placeholder="Enter any additional information, issues, or problems here..."
              />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
