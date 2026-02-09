import { useState, useEffect, useMemo } from 'react';
import { Plus, Trash2, User, RefreshCw } from 'lucide-react';
import { staffService } from '../../services/staffService';
import { runSheetService } from '../../services/runSheetService';
import type { EventStaffAssignment, StaffProfile, StaffCompensationConfig, StaffPayRateRule } from '../../types/staff';
import type { Event } from '../../types/event';
import toast from 'react-hot-toast';
import { payRateService } from '../../services/payRateService';
import { STAFF_POSITION_GROUPS, STAFF_POSITIONS, matchPosition } from '../../constants/staffPositions';
import { calculateCompensation, getOverrideFields } from '../../utils/staffCompensation';
import { quoteService } from '../../services/quoteService';
import type { RunSheet } from '../../types/runSheet';
import { formatCurrency } from '../../utils/formatters';

interface EventStaffTabProps {
  event: Event;
}

const POSITIONS = STAFF_POSITION_GROUPS;
const POSITION_LIST = STAFF_POSITIONS;

export default function EventStaffTab({ event }: EventStaffTabProps) {
  const [assignments, setAssignments] = useState<EventStaffAssignment[]>([]);
  const [availableStaff, setAvailableStaff] = useState<StaffProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [payRates, setPayRates] = useState<StaffPayRateRule[]>([]);
  const [payConfigDrafts, setPayConfigDrafts] = useState<Record<string, StaffCompensationConfig>>({});
  const [runSheet, setRunSheet] = useState<RunSheet | null>(null);
  const [revenuePreTax, setRevenuePreTax] = useState(0);
  const [savingPayId, setSavingPayId] = useState<string | null>(null);

  // New Assignment State (legacy add form)
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [selectedRole, setSelectedRole] = useState('Server');
  const [payType] = useState<'hourly' | 'flat'>('flat');
  const [payRate, setPayRate] = useState(0);

  // Structured positions state: key -> { staff_id, assignmentId? }
  const [positionSelections, setPositionSelections] = useState<Record<string, { staff_id: string; assignmentId?: string }>>({});

  const parseTimeToMinutes = (value?: string | null) => {
    if (!value) return null;
    const [hours, minutes] = value.split(':').map(Number);
    if (Number.isNaN(hours)) return null;
    return hours * 60 + (Number.isNaN(minutes) ? 0 : minutes);
  };

  const eventDurationHours = useMemo(() => {
    const start = parseTimeToMinutes(runSheet?.event_start_time || event.start_time);
    const end = parseTimeToMinutes(runSheet?.event_end_time || event.end_time);
    if (start === null || end === null) return 6;
    let diff = end - start;
    if (diff <= 0) diff += 24 * 60;
    return Math.max(1, diff / 60);
  }, [runSheet?.event_start_time, runSheet?.event_end_time, event.start_time, event.end_time]);

  const payRateMap = useMemo(() => {
    const map = new Map<string, StaffPayRateRule>();
    payRates.forEach((rate) => map.set(rate.position_key, rate));
    return map;
  }, [payRates]);

  const compensationContext = useMemo(() => ({
    revenuePreTax,
    eventDurationHours
  }), [revenuePreTax, eventDurationHours]);

  const enrichedAssignments = useMemo(() => {
    return assignments.map((assignment) => {
      const position = matchPosition(assignment.role) ?? matchPosition(assignment.role?.toLowerCase());
      const roleKey = position?.key;
      const rule = roleKey ? payRateMap.get(roleKey) : undefined;
      const draft = payConfigDrafts[assignment.id];
      const baseConfig = assignment.compensation_config || undefined;
      const mergedConfig: StaffCompensationConfig | undefined = draft || baseConfig
        ? {
            overrides: {
              ...(baseConfig?.overrides || {}),
              ...(draft?.overrides || {})
            },
            manual_total: draft?.manual_total ?? baseConfig?.manual_total
          }
        : undefined;

      const compensationResult = calculateCompensation(rule, mergedConfig, compensationContext);
      const overrideFields = getOverrideFields(rule);

      return {
        ...assignment,
        roleKey,
        payRule: rule,
        compensationResult,
        overrideFields,
        localConfig: mergedConfig
      };
    });
  }, [assignments, payConfigDrafts, payRateMap, compensationContext]);

  useEffect(() => {
    loadData();

    // Listen for run sheet updates by other tabs/components
    const handler = (e: any) => {
      console.debug('[EventStaffTab] received run_sheet:updated', e?.detail);
      if (e?.detail?.eventId === event.id) loadData();
    };
    window.addEventListener('run_sheet:updated', handler as any);

    return () => window.removeEventListener('run_sheet:updated', handler as any);
  }, [event.id]);

  const upsertDraft = (
    assignmentId: string,
    updater: (draft: StaffCompensationConfig) => StaffCompensationConfig
  ) => {
    setPayConfigDrafts((prev) => {
      const existing = prev[assignmentId];
      if (existing) {
        return {
          ...prev,
          [assignmentId]: updater({
            overrides: { ...(existing.overrides || {}) },
            manual_total: existing.manual_total
          })
        };
      }

      const assignment = assignments.find((a) => a.id === assignmentId);
      const fallback: StaffCompensationConfig = {
        overrides: { ...(assignment?.compensation_config?.overrides || {}) },
        manual_total: assignment?.compensation_config?.manual_total
      };

      return {
        ...prev,
        [assignmentId]: updater(fallback)
      };
    });
  };

  const handleOverrideValueChange = (assignmentId: string, key: string, rawValue: string) => {
    upsertDraft(assignmentId, (draft) => {
      const overrides = { ...(draft.overrides || {}) };
      if (rawValue === '' || Number.isNaN(Number(rawValue))) {
        delete overrides[key];
      } else {
        overrides[key] = Number(rawValue);
      }
      return { ...draft, overrides };
    });
  };

  const handleManualTotalChange = (assignmentId: string, rawValue: string) => {
    upsertDraft(assignmentId, (draft) => ({
      ...draft,
      manual_total: rawValue === '' || Number.isNaN(Number(rawValue)) ? undefined : Number(rawValue)
    }));
  };

  const buildConfigForAssignment = (assignment: EventStaffAssignment): StaffCompensationConfig | undefined => {
    const draft = payConfigDrafts[assignment.id];
    if (!draft && !assignment.compensation_config) return undefined;
    return {
      overrides: {
        ...(assignment.compensation_config?.overrides || {}),
        ...(draft?.overrides || {})
      },
      manual_total: draft?.manual_total ?? assignment.compensation_config?.manual_total
    };
  };

  const buildDefaultCompensation = (roleKey?: string) => {
    if (!roleKey) {
      return { pay_rate: 0, total_pay: 0, compensation_config: null, pay_rate_id: undefined };
    }
    const rule = payRateMap.get(roleKey);
    if (!rule) {
      return { pay_rate: 0, total_pay: 0, compensation_config: null, pay_rate_id: undefined };
    }
    const result = calculateCompensation(rule, undefined, compensationContext);
    return {
      pay_rate: result.total,
      total_pay: result.total,
      compensation_config: null,
      pay_rate_id: rule.id
    };
  };

  const handleSaveCompensation = async (assignmentId: string, useSuggested = false) => {
    const assignment = assignments.find((a) => a.id === assignmentId);
    if (!assignment) return;

    const position = matchPosition(assignment.role);
    const rule = position?.key ? payRateMap.get(position.key) : undefined;
    let config = buildConfigForAssignment(assignment);
    if (useSuggested && config) {
      config = { ...config, manual_total: undefined };
    }
    const compensationResult = calculateCompensation(rule, config, compensationContext);
    const total = useSuggested ? compensationResult.total : (config?.manual_total ?? compensationResult.total);

    setSavingPayId(assignmentId);
    try {
      await staffService.updateAssignment(assignmentId, {
        pay_rate: compensationResult.total,
        total_pay: total,
        compensation_config: config ?? null,
        pay_rate_id: rule?.id
      });
      toast.success('Pay details saved');
      await loadData();
    } catch (error) {
      console.error('Failed to save compensation', error);
      toast.error('Failed to save pay details');
    } finally {
      setSavingPayId(null);
    }
  };

  const loadData = async () => {
    try {
      const [staffData, assignmentData, rateData, runSheetData, quotes] = await Promise.all([
        staffService.getStaffMembers(),
        staffService.getEventAssignments(event.id),
        payRateService.getPayRates(),
        runSheetService.getRunSheetByEventId(event.id),
        quoteService.getQuotesByEvent(event.id)
      ]);
      console.debug('[EventStaffTab] loadData loaded', { staffCount: staffData?.length, assignmentsCount: assignmentData?.length });
      setAvailableStaff(staffData);
      setAssignments(assignmentData);
      setPayRates(rateData);
      setRunSheet(runSheetData);

      const accepted = quotes.find(q => q.status === 'accepted') || null;
      if (accepted) {
        const subtotal = accepted.items.reduce((sum, item) => sum + (item.unit_price || 0) * (item.quantity || 0), 0);
        setRevenuePreTax(accepted.currency === 'MXN' ? subtotal : subtotal * (accepted.exchange_rate || 1));
      } else {
        setRevenuePreTax(0);
      }

      // Build initial structured selections map from assignments
      const map: Record<string, { staff_id: string; assignmentId?: string }> = {};
      assignmentData.forEach(a => {
        const match = POSITION_LIST.find(r => r.label.toLowerCase() === (a.role || '').toLowerCase() || r.key === (a.role || ''));
        if (match) {
          map[match.key] = { staff_id: a.staff_id, assignmentId: a.id };
        } else {
          // If role doesn't match our canonical keys, store using role string as key (safe fallback)
          map[a.role] = { staff_id: a.staff_id, assignmentId: a.id } as any;
        }
      });

      // Ensure all positions exist in map (default unassigned)
      POSITION_LIST.forEach(p => {
        if (!map[p.key]) map[p.key] = { staff_id: '' };
      });

      setPositionSelections(map);

      const drafts: Record<string, StaffCompensationConfig> = {};
      assignmentData.forEach(a => {
        drafts[a.id] = {
          overrides: { ...(a.compensation_config?.overrides || {}) },
          manual_total: a.compensation_config?.manual_total
        };
      });
      setPayConfigDrafts(drafts);
    } catch (error) {
      console.error('Error loading staff data:', error);
      toast.error('Failed to load staff data');
    } finally {
      setLoading(false);
    }
  };

  const handleAddStaff = async () => {
    if (!selectedStaffId) return;
    try {
      const matchedPosition = matchPosition(selectedRole);
      const defaults = buildDefaultCompensation(matchedPosition?.key);
      const useManual = payRate > 0;
      await staffService.assignStaffToEvent({
        event_id: event.id,
        staff_id: selectedStaffId,
        role: selectedRole,
        pay_type: payType,
        pay_rate: useManual ? payRate : defaults.pay_rate,
        total_pay: useManual ? payRate : defaults.total_pay,
        compensation_config: useManual ? { manual_total: payRate } : defaults.compensation_config,
        pay_rate_id: defaults.pay_rate_id,
      });
      toast.success('Staff assigned successfully');
      setIsAdding(false);
      loadData();
    } catch (error) {
      console.error('Error assigning staff:', error);
      toast.error('Failed to assign staff');
    }
  };

  const handleSaveAll = async () => {
    try {
      console.debug('[EventStaffTab] handleSaveAll positions:', positionSelections);
      // Validate selections: ensure all selected staff IDs exist
      const invalid: string[] = [];
      Object.entries(positionSelections).forEach(([key, sel]) => {
        if (sel.staff_id && !availableStaff.find(s => s.user_id === sel.staff_id)) {
          const pos = POSITION_LIST.find(p => p.key === key);
          invalid.push(pos?.label || key);
        }
      });
      if (invalid.length) {
        toast.error(`Cannot save: invalid staff selections for ${invalid.join(', ')}`);
        return;
      }

      setLoading(true);
      const promises: Promise<void>[] = [];

      for (const [roleKey, selection] of Object.entries(positionSelections)) {
        const pos = POSITION_LIST.find(p => p.key === roleKey);
        const roleLabel = pos ? pos.label : roleKey;

        // If assignment exists
        if (selection.assignmentId) {
          if (!selection.staff_id) {
            // User cleared selection -> delete assignment
            promises.push(staffService.removeStaffFromEvent(selection.assignmentId));
          } else {
            // Update staff_id if changed
            const existing = assignments.find(a => a.id === selection.assignmentId);
            if (existing && existing.staff_id !== selection.staff_id) {
              promises.push(staffService.updateAssignment(selection.assignmentId, { staff_id: selection.staff_id }));
            }
          }
        } else {
          if (selection.staff_id) {
            const defaults = buildDefaultCompensation(pos?.key);
            promises.push(staffService.assignStaffToEvent({
              event_id: event.id,
              staff_id: selection.staff_id,
              role: roleLabel,
              pay_type: 'flat',
              pay_rate: defaults.pay_rate,
              total_pay: defaults.total_pay,
              compensation_config: defaults.compensation_config,
              pay_rate_id: defaults.pay_rate_id
            }));
          }
        }
      }

      await Promise.all(promises);
      toast.success('Staff assignments saved');

      // After saving assignments, update the run sheet positions to keep in sync
      const positions: Record<string, string | undefined> = {};
      Object.entries(positionSelections).forEach(([key, sel]) => {
        positions[key] = sel.staff_id || undefined;
      });
      try {
        await runSheetService.syncRunSheetPositions(event.id, positions);
        console.debug('[EventStaffTab] runSheetService.syncRunSheetPositions succeeded', positions);
        // Notify other components
        window.dispatchEvent(new CustomEvent('staff_assignments:updated', { detail: { eventId: event.id } }));
        // Optionally show summary toast for run sheet sync
        toast.success('Assignments saved and Run Sheet updated');
      } catch (err) {
        console.error('Failed to sync run sheet after saving assignments:', err);
        toast.error('Assignments saved but failed to sync Run Sheet fields');
      }

      await loadData();
    } catch (error) {
      console.error('Error saving assignments:', error);
      toast.error('Failed to save assignments');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectionChange = (roleKey: string, staffId: string) => {
    setPositionSelections(prev => ({ ...prev, [roleKey]: { ...prev[roleKey], staff_id: staffId } }));
  };


  const handleRemoveStaff = async (id: string) => {
    if (!window.confirm('Are you sure you want to remove this staff member?')) return;
    try {
      await staffService.removeStaffFromEvent(id);
      toast.success('Staff removed successfully');
      loadData();
    } catch (error) {
      console.error('Error removing staff:', error);
      toast.error('Failed to remove staff');
    }
  };

  if (loading) return <div className="text-center py-8">Loading staff...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white dark:text-white">Event Staffing</h3>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setIsAdding(true)}
            className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
          >
            <Plus className="h-4 w-4 mr-2" />
            Assign Staff
          </button>
          <button
            onClick={handleSaveAll}
            className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
          >
            Save Changes
          </button>
        </div>
      </div>

      {/* Add Staff Form */}
      {isAdding && (
        <div className="bg-gray-50 dark:bg-gray-700 dark:bg-gray-700 p-4 rounded-lg border border-gray-200 dark:border-gray-700 dark:border-gray-700 mb-6">
          <h4 className="text-sm font-medium text-gray-900 dark:text-white dark:text-white mb-3">New Assignment</h4>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-5 items-end">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-400 mb-1">Staff Member</label>
              <select
                value={selectedStaffId}
                onChange={(e) => setSelectedStaffId(e.target.value)}
                className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md"
              >
                <option value="">Select Staff...</option>
                {availableStaff.map(s => (
                  <option key={s.id} value={s.user_id}>
                    {s.first_name} {s.last_name} {s.is_driver ? '(Driver)' : ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-400 mb-1">Role</label>
              <input
                type="text"
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm"
                placeholder="e.g. Server"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-400 mb-1">Pay Rate ($)</label>
              <div className="relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 dark:text-gray-400 dark:text-gray-400 sm:text-sm">$</span>
                </div>
                <input
                  type="number"
                  value={payRate}
                  onChange={(e) => setPayRate(parseFloat(e.target.value))}
                  className="focus:ring-primary focus:border-primary block w-full pl-7 sm:text-sm border-gray-300 rounded-md"
                />
              </div>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={handleAddStaff}
                disabled={!selectedStaffId}
                className="flex-1 inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
              >
                Save
              </button>
              <button
                onClick={() => setIsAdding(false)}
                className="flex-1 inline-flex justify-center items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white dark:bg-gray-800 dark:bg-gray-800 hover:bg-gray-50 dark:bg-gray-700 dark:bg-gray-700"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Structured Positions */}
      <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 shadow overflow-hidden sm:rounded-md p-4">
        {Object.entries(POSITIONS).map(([category, positions]) => (
          <section key={category} className="mb-6">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-400 mb-3">{category}</h4>
            {/* Two-column layout; label above select for better visibility */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-2">
              {positions.map((p: any) => (
                <div key={p.key} className="flex flex-col">
                  <label className="text-sm text-gray-600 dark:text-gray-400 mb-1">{p.label}</label>
                  <select
                    value={positionSelections[p.key]?.staff_id || ''}
                    onChange={(e) => handleSelectionChange(p.key, e.target.value)}
                    className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md"
                  >
                    <option value="">Unassigned</option>
                    {availableStaff.map(s => (
                      <option key={s.id} value={s.user_id}>{s.first_name} {s.last_name}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      {/* Legacy assignments list (kept for backward compatibility) */}
      <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 shadow overflow-hidden sm:rounded-md mt-6">
        <ul className="divide-y divide-gray-200">
          {enrichedAssignments.length === 0 ? (
            <li className="px-4 py-8 text-center text-gray-500 dark:text-gray-400 dark:text-gray-400 text-sm">
              No staff assigned to this event yet.
            </li>
          ) : (
            enrichedAssignments.map((assignment) => {
              const staff = availableStaff.find(s => s.user_id === assignment.staff_id);
              const overrides = assignment.localConfig?.overrides || {};
              const manualTotal = assignment.localConfig?.manual_total;
              const showRevenueWarning = assignment.payRule?.rate_type === 'percent_revenue' && !revenuePreTax;

              return (
                <li key={assignment.id} className="px-4 py-5 sm:px-6 space-y-4 hover:bg-gray-50 dark:bg-gray-700 dark:bg-gray-700">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 bg-pink-100 rounded-full p-2">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-primary truncate">
                          {staff ? `${staff.first_name} ${staff.last_name}` : 'Unknown'}
                        </p>
                        <p className="flex items-center text-sm text-gray-500 dark:text-gray-400 dark:text-gray-400">
                          <span className="font-medium mr-2">{assignment.role}</span>
                          {assignment.status === 'confirmed' && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                              Confirmed
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveStaff(assignment.id)}
                      className="text-gray-400 hover:text-red-600"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide">Current Pay</p>
                      <p className="text-base font-semibold text-gray-900 dark:text-white">
                        {formatCurrency(assignment.total_pay || 0, 'MXN')}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {assignment.is_paid ? 'Paid' : 'Unpaid'} • {assignment.pay_type}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide">Suggested</p>
                      <p className="text-base font-semibold text-emerald-600">
                        {formatCurrency(assignment.compensationResult.total, 'MXN')}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {assignment.compensationResult.breakdown || 'Rule not configured'}
                      </p>
                      {showRevenueWarning && (
                        <p className="text-xs text-amber-600 mt-1">Add revenue to calculate percentage-based pay.</p>
                      )}
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide">Rule</p>
                      <p className="text-sm text-gray-900 dark:text-white">
                        {assignment.payRule?.notes || 'Manual'}
                      </p>
                    </div>
                  </div>

                  {assignment.overrideFields.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {assignment.overrideFields.map((field) => (
                        <div key={`${assignment.id}-${field.key}`}>
                          <label className="block text-xs font-medium text-gray-500 mb-1">{field.label}</label>
                          <input
                            type="number"
                            min={field.min}
                            step={field.step || 1}
                            value={overrides[field.key] ?? ''}
                            onChange={(e) => handleOverrideValueChange(assignment.id, field.key, e.target.value)}
                            className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary text-sm"
                          />
                          {field.helperText && (
                            <p className="text-xs text-gray-400 mt-1">{field.helperText}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Manual Override (MXN)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        value={manualTotal ?? ''}
                        onChange={(e) => handleManualTotalChange(assignment.id, e.target.value)}
                        placeholder="Leave empty to use suggested"
                        className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary text-sm"
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3 pt-2">
                    <button
                      onClick={() => handleSaveCompensation(assignment.id)}
                      disabled={savingPayId === assignment.id}
                      className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50"
                    >
                      {savingPayId === assignment.id ? 'Saving…' : 'Save Pay'}
                    </button>
                    <button
                      onClick={() => handleSaveCompensation(assignment.id, true)}
                      disabled={savingPayId === assignment.id}
                      className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                    >
                      <RefreshCw className="h-4 w-4 mr-1" />
                      Apply Suggested
                    </button>
                  </div>
                </li>
              );
            })
          )}
        </ul>
      </div>
    </div>
  );
}
