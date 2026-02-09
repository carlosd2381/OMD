import { useState, useEffect, useMemo } from 'react';
import { Plus, Trash2, DollarSign, Edit, Save, Calculator, FileText, X } from 'lucide-react';
import { financialService } from '../../services/financialService';
import { staffService } from '../../services/staffService';
import { runSheetService } from '../../services/runSheetService';
import { quoteService } from '../../services/quoteService';
import { settingsService, type ExpenseCategory, type DeliverySettings } from '../../services/settingsService';
import { payRateService } from '../../services/payRateService';
import { useConfirm } from '../../contexts/ConfirmContext';
import { formatCurrency } from '../../utils/formatters';
import { calculateCompensation } from '../../utils/staffCompensation';
import { matchPosition } from '../../constants/staffPositions';
import type { Event } from '../../types/event';
import type { Venue } from '../../types/venue';
import type { EventExpense, EventCommission, EventFiscalDetails } from '../../types/financials';
import type { EventStaffAssignment, StaffPayRateRule } from '../../types/staff';
import type { Quote } from '../../types/quote';
import type { RunSheet } from '../../types/runSheet';
import toast from 'react-hot-toast';

interface EventFinancialsTabProps {
  event: Event;
  venue: Venue | null;
}

interface LabourRow extends EventStaffAssignment {
  displayTotal: number;
  payBreakdown?: string;
  usesManualTotal: boolean;
  usesSuggestedTotal: boolean;
  suggestedTotal: number;
}

export default function EventFinancialsTab({ event, venue }: EventFinancialsTabProps) {
  const { confirm } = useConfirm();
  const [loading, setLoading] = useState(true);
  const [expenses, setExpenses] = useState<EventExpense[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [commissions, setCommissions] = useState<EventCommission[]>([]);
  const [labourCosts, setLabourCosts] = useState<EventStaffAssignment[]>([]);
  const [payRates, setPayRates] = useState<StaffPayRateRule[]>([]);
  const [deliverySettings, setDeliverySettings] = useState<DeliverySettings | null>(null);
  const [fiscalDetails, setFiscalDetails] = useState<EventFiscalDetails | null>(null);
  const [acceptedQuote, setAcceptedQuote] = useState<Quote | null>(null);
  const [runSheet, setRunSheet] = useState<RunSheet | null>(null);

  // Editing states
  const [editingFiscal, setEditingFiscal] = useState(false);
  const [isAddingExpense, setIsAddingExpense] = useState(false);
  const [newExpense, setNewExpense] = useState<Partial<EventExpense>>({
    name: '',
    description: '',
    amount_usd: 0,
    amount_mxn: 0,
    date: new Date().toISOString().split('T')[0]
  });
  const [isEditingCommissions, setIsEditingCommissions] = useState(false);
  const [isLoggingFuel, setIsLoggingFuel] = useState(false);

  const canLogFuelExpense = Boolean(
    venue?.travel_distance_km &&
    (deliverySettings?.fuel_consumption || 0) > 0 &&
    (deliverySettings?.fuel_price || 0) > 0
  );

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

  const revenuePreTax = useMemo(() => {
    if (!acceptedQuote) return 0;
    const subtotal = acceptedQuote.items.reduce((sum, item) => sum + ((item.unit_price || 0) * (item.quantity || 0)), 0);
    return acceptedQuote.currency === 'MXN' ? subtotal : subtotal * (acceptedQuote.exchange_rate || 1);
  }, [acceptedQuote]);

  const payRateMap = useMemo(() => {
    const map = new Map<string, StaffPayRateRule>();
    payRates.forEach(rate => map.set(rate.position_key, rate));
    return map;
  }, [payRates]);

  const compensationContext = useMemo(() => ({
    revenuePreTax,
    eventDurationHours
  }), [revenuePreTax, eventDurationHours]);

  const labourRows: LabourRow[] = useMemo(() => {
    return labourCosts.map((assignment) => {
      const match = matchPosition(assignment.role) ?? matchPosition(assignment.role?.toLowerCase());
      const rule = match?.key ? payRateMap.get(match.key) : undefined;
      const compensation = calculateCompensation(rule, assignment.compensation_config, compensationContext);
      const persistedTotal = typeof assignment.total_pay === 'number' ? assignment.total_pay : undefined;
      const suggestedTotal = Number.isFinite(compensation.total)
        ? compensation.total
        : (assignment.pay_rate ?? 0);
      const displayTotal = persistedTotal ?? suggestedTotal;
      return {
        ...assignment,
        displayTotal,
        suggestedTotal,
        payBreakdown: rule ? compensation.breakdown : undefined,
        usesManualTotal: assignment.compensation_config?.manual_total !== undefined,
        usesSuggestedTotal: persistedTotal === undefined && suggestedTotal > 0
      };
    });
  }, [labourCosts, payRateMap, compensationContext]);

  // Totals calculations
  const totalRevenue = acceptedQuote 
    ? (acceptedQuote.currency === 'MXN' ? acceptedQuote.total_amount : acceptedQuote.total_amount * acceptedQuote.exchange_rate)
    : 0;
  const totalCOG = acceptedQuote?.items.reduce((sum, item) => sum + ((item.cost || 0) * (item.quantity || 0)), 0) || 0;
  const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount_mxn, 0);
  const totalCommissions = commissions.reduce((sum, comm) => sum + (comm.amount || 0), 0);
  const totalLabour = labourRows.reduce((sum, cost) => sum + (cost.displayTotal || 0), 0);
  const totalCosts = totalCOG + totalExpenses + totalCommissions + totalLabour;
  const profit = totalRevenue - totalCosts;
  const profitMargin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;

  useEffect(() => {
    loadData();
  }, [event.id]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [
        expenseData, 
        commissionData, 
        staffData, 
        fiscalData, 
        quoteData,
        categoryData,
        runSheetData,
        staffMembers,
        payRateData,
        deliverySettingsData
      ] = await Promise.all([
        financialService.getExpenses(event.id),
        financialService.getCommissions(event.id),
        staffService.getEventAssignments(event.id),
        financialService.getFiscalDetails(event.id),
        quoteService.getQuotesByEvent(event.id),
        settingsService.getExpenseCategories(),
        runSheetService.getRunSheetByEventId(event.id),
        staffService.getStaffMembers(),
        payRateService.getPayRates(),
        settingsService.getDeliverySettings()
      ]);

      setExpenses(expenseData);
      setCommissions(commissionData);
      
      // Map staff members to assignments for names
      const mappedStaffData = staffData.map(assignment => ({
        ...assignment,
        staff: staffMembers.find(s => s.id === assignment.staff_id)
      }));
      setLabourCosts(mappedStaffData);
      setPayRates(payRateData);
      setDeliverySettings(deliverySettingsData);

      setFiscalDetails(fiscalData || {
        id: '',
        event_id: event.id,
        currency: 'MXN',
        exchange_rate: 1,
        subtotal: 0,
        iva: 0,
        isr: 0,
        iva_ret: 0,
        isr_ret: 0,
        total: 0,
        created_at: ''
      });
      setCategories(categoryData);
      setRunSheet(runSheetData);
      
      const accepted = quoteData.find(q => q.status === 'accepted');
      setAcceptedQuote(accepted || null);

      // Initialize commissions if empty
      if (commissionData.length === 0) {
        setCommissions([
          { id: '', event_id: event.id, type: 'Venue Commission', percentage: 0, currency: 'MXN', amount: 0, created_at: '' },
          { id: '', event_id: event.id, type: 'Planner Commission', percentage: 0, currency: 'MXN', amount: 0, created_at: '' },
          { id: '', event_id: event.id, type: 'Referral Commission', percentage: 0, currency: 'MXN', amount: 0, created_at: '' }
        ]);
      }

    } catch (error) {
      console.error('Failed to load financial data', error);
      toast.error('Failed to load financial data');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveExpense = async () => {
    if (!newExpense.name || (!newExpense.amount_mxn && !newExpense.amount_usd)) {
      toast.error('Please enter a name and amount');
      return;
    }

    try {
      await financialService.saveExpense({
        ...newExpense,
        event_id: event.id
      } as EventExpense);
      
      toast.success('Expense saved');
      setIsAddingExpense(false);
      setNewExpense({
        name: '',
        description: '',
        amount_usd: 0,
        amount_mxn: 0,
        date: new Date().toISOString().split('T')[0]
      });
      loadData();
    } catch (error) {
      toast.error('Failed to save expense');
    }
  };

  const handleLogFuelExpense = async () => {
    if (!venue?.travel_distance_km || venue.travel_distance_km <= 0) {
      toast.error('Venue distance is required to log fuel cost');
      return;
    }
    if (!deliverySettings) {
      toast.error('Delivery settings not configured');
      return;
    }

    const fuelConsumption = deliverySettings.fuel_consumption || 0;
    const fuelPrice = deliverySettings.fuel_price || 0;

    if (!fuelConsumption || !fuelPrice) {
      toast.error('Fuel consumption and price must be set in Delivery Settings');
      return;
    }

    setIsLoggingFuel(true);
    try {
      const roundTripDistance = venue.travel_distance_km * 2;
      const litersUsed = (roundTripDistance / 100) * fuelConsumption;
      const amountMXN = Math.round(litersUsed * fuelPrice * 100) / 100;

      const existingFuelExpense = expenses.find(exp => exp.name === 'Fuel Cost');
      const description = `Auto logged fuel cost for ${roundTripDistance.toFixed(1)} km round trip @ ${fuelConsumption} L/100km`;

      await financialService.saveExpense({
        id: existingFuelExpense?.id,
        event_id: event.id,
        name: 'Fuel Cost',
        description,
        amount_usd: 0,
        amount_mxn: amountMXN,
        category_id: existingFuelExpense?.category_id,
        date: existingFuelExpense?.date || event.date || new Date().toISOString().split('T')[0]
      } as EventExpense);

      toast.success(existingFuelExpense ? 'Fuel cost updated' : 'Fuel cost logged');
      await loadData();
    } catch (error) {
      console.error('Failed to log fuel cost', error);
      toast.error('Failed to log fuel cost');
    } finally {
      setIsLoggingFuel(false);
    }
  };

  const handleSaveCommissions = async () => {
    try {
      await Promise.all(commissions.map(c => 
        financialService.saveCommission(c)
      ));
      toast.success('Commissions saved');
      setIsEditingCommissions(false);
    } catch (error) {
      toast.error('Failed to save commissions');
    }
  };

  const handleSaveFiscal = async () => {
    if (!fiscalDetails) return;
    try {
      await financialService.saveFiscalDetails(fiscalDetails);
      toast.success('Fiscal details saved');
      setEditingFiscal(false);
    } catch (error) {
      toast.error('Failed to save fiscal details');
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64 text-gray-500">Loading financial data...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Event Details */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <div className="flex items-center space-x-2 mb-4">
            <Calculator className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold dark:text-white">Event Details</h3>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Event Date:</p>
              <p className="font-medium dark:text-gray-300">{event.date}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Team Meet/Start Time:</p>
              <p className="font-medium dark:text-gray-300">{runSheet?.event_start_time || event.start_time || '--:--'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Service End Time:</p>
              <p className="font-medium dark:text-gray-300">{runSheet?.event_end_time || event.end_time || '--:--'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Est. Guests:</p>
              <p className="font-medium dark:text-gray-300">{event.guest_count || 0}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Min. Guests:</p>
              <p className="font-medium dark:text-gray-300">{Math.round((event.guest_count || 0) * 0.9)} (-10%)</p> 
            </div>
          </div>
        </div>

        {/* Venue Information */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <div className="flex items-center space-x-2 mb-4">
            <DollarSign className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold dark:text-white">Venue Information</h3>
          </div>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-500">Venue:</p>
              <p className="font-medium dark:text-gray-300">{venue?.name || event.venue_name || 'No Venue Specified'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Location:</p>
              <p className="text-sm dark:text-gray-400">{venue?.address || 'No Address'}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Distance Return (KM):</p>
                <p className="font-medium dark:text-gray-300">{venue?.travel_distance_km ? `${venue.travel_distance_km * 2} km` : '0 km'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Contact:</p>
                <p className="text-sm dark:text-gray-400">{venue?.phone || '---'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Financial Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4 border-l-4 border-blue-500">
          <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Total Revenue</p>
          <p className="text-2xl font-bold dark:text-white">{formatCurrency(totalRevenue, 'MXN')}</p>
          <p className="text-xs text-gray-400 mt-1">From accepted quote</p>
        </div>
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4 border-l-4 border-red-500">
          <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Total Costs</p>
          <p className="text-2xl font-bold dark:text-white">{formatCurrency(totalCosts, 'MXN')}</p>
          <p className="text-xs text-gray-400 mt-1">COG + Exp + Comm + Labour</p>
        </div>
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4 border-l-4 border-green-500">
          <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Estimated Profit</p>
          <p className="text-2xl font-bold dark:text-white">{formatCurrency(profit, 'MXN')}</p>
          <p className="text-xs text-gray-400 mt-1">Revision net</p>
        </div>
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4 border-l-4 border-primary">
          <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Profit Margin</p>
          <p className="text-2xl font-bold dark:text-white">{profitMargin.toFixed(1)}%</p>
          <p className="text-xs text-gray-400 mt-1">Target: 30%+</p>
        </div>
      </div>

      {/* Invoice Details */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <FileText className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold dark:text-white">Invoice Details</h3>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Qty</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount USD</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount MXN</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">COG MXN</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {acceptedQuote ? (
                <>
                  {acceptedQuote.items.map((item, idx) => {
                    const itemTotalMXN = item.unit_price * item.quantity;
                    const itemTotalUSD = itemTotalMXN / (acceptedQuote.exchange_rate || 1);
                    return (
                      <tr key={idx}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">{item.description}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.quantity}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {acceptedQuote.currency !== 'MXN' ? formatCurrency(itemTotalUSD, acceptedQuote.currency) : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatCurrency(itemTotalMXN, 'MXN')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatCurrency((item.cost || 0) * item.quantity, 'MXN')}</td>
                      </tr>
                    );
                  })}
                  
                  {acceptedQuote.taxes && acceptedQuote.taxes.length > 0 && (
                    <>
                      {/* Subtotal shown before taxes */}
                      <tr className="bg-gray-50/30 dark:bg-gray-900/10 font-medium">
                        <td colSpan={2} className="px-6 py-2 text-sm text-gray-900 dark:text-white uppercase tracking-wider">Sub-total</td>
                        <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {acceptedQuote.currency !== 'MXN' 
                            ? formatCurrency(acceptedQuote.items.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0) / acceptedQuote.exchange_rate, acceptedQuote.currency)
                            : '-'}
                        </td>
                        <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {formatCurrency(acceptedQuote.items.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0), 'MXN')}
                        </td>
                        <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {formatCurrency(acceptedQuote.items.reduce((sum, item) => sum + ((item.cost || 0) * item.quantity), 0), 'MXN')}
                        </td>
                      </tr>
                      
                      {/* Taxes */}
                      {acceptedQuote.taxes.map((tax, idx) => {
                        const taxAmountMXN = tax.amount;
                        const taxAmountUSD = taxAmountMXN / (acceptedQuote.exchange_rate || 1);
                        return (
                          <tr key={`tax-${idx}`} className="bg-gray-50/50 dark:bg-gray-900/20 italic">
                            <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                              {tax.name} ({tax.rate}%)
                            </td>
                            <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-500">-</td>
                            <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-500">
                              {acceptedQuote.currency !== 'MXN' ? formatCurrency(taxAmountUSD, acceptedQuote.currency) : '-'}
                            </td>
                            <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-500">
                              {formatCurrency(taxAmountMXN, 'MXN')}
                            </td>
                            <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-500">-</td>
                          </tr>
                        );
                      })}
                    </>
                  )}
                </>
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-gray-500 italic">No accepted quote found for this event.</td>
                </tr>
              )}
            </tbody>
            {acceptedQuote && (
              <tfoot className="bg-gray-50 dark:bg-gray-900/50 font-bold">
                <tr>
                  <td colSpan={2} className="px-6 py-4 text-sm text-gray-900 dark:text-white uppercase tracking-wider">Grand Total</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {acceptedQuote.currency !== 'MXN' 
                      ? formatCurrency(acceptedQuote.total_amount, acceptedQuote.currency) 
                      : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {acceptedQuote.currency === 'MXN' 
                      ? formatCurrency(acceptedQuote.total_amount, 'MXN') 
                      : formatCurrency(acceptedQuote.total_amount * acceptedQuote.exchange_rate, 'MXN')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {formatCurrency(acceptedQuote.items.reduce((sum, item) => sum + ((item.cost || 0) * item.quantity), 0), 'MXN')}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Expenses */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <DollarSign className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold dark:text-white">Expenses</h3>
          </div>
          <div className="flex items-center space-x-2">
            <button 
              onClick={() => setIsAddingExpense(true)}
              className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary hover:bg-primary/90"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Expense
            </button>
            <button
              onClick={handleLogFuelExpense}
              disabled={!canLogFuelExpense || isLoggingFuel}
              className="inline-flex items-center px-3 py-1.5 border text-sm font-medium rounded-md shadow-sm text-primary border-primary bg-white hover:bg-primary/5 disabled:opacity-50"
              title={!canLogFuelExpense ? 'Add venue distance and fuel settings to enable' : undefined}
            >
              {isLoggingFuel ? 'Logging...' : 'Log Fuel Cost'}
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount USD</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount MXN</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Account</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {expenses.length > 0 ? expenses.map((expense) => (
                <tr key={expense.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">{expense.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{expense.description}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{expense.amount_usd > 0 ? formatCurrency(expense.amount_usd, 'USD') : '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatCurrency(expense.amount_mxn, 'MXN')}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {categories.find(c => c.id === expense.category_id)?.name || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{expense.date}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button onClick={() => handleDeleteExpense(expense.id)} className="text-red-600 hover:text-red-900 ml-3">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500 italic">No expenses recorded.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Commissions */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <DollarSign className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold dark:text-white">Commissions</h3>
          </div>
          <button 
            onClick={isEditingCommissions ? handleSaveCommissions : () => setIsEditingCommissions(true)}
            className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary hover:bg-primary/90"
          >
            {isEditingCommissions ? <Save className="h-4 w-4 mr-1" /> : <Edit className="h-4 w-4 mr-1" />}
            {isEditingCommissions ? 'Save All' : 'Edit All'}
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-center">%</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Currency</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment Method</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">From Account</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">To Account</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {commissions.map((comm, idx) => (
                <tr key={comm.id || idx}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-300">{comm.type}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                    {isEditingCommissions ? (
                      <input 
                        type="number" 
                        value={comm.percentage} 
                        onChange={(e) => handleCommissionChange(idx, 'percentage', parseFloat(e.target.value))}
                        className="w-16 border rounded px-1 text-center dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      />
                    ) : `${comm.percentage}%`}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {isEditingCommissions ? (
                      <select 
                        value={comm.currency} 
                        onChange={(e) => handleCommissionChange(idx, 'currency', e.target.value)}
                        className="border rounded px-1 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      >
                        <option value="MXN">MXN</option>
                        <option value="USD">USD</option>
                      </select>
                    ) : comm.currency}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {isEditingCommissions ? (
                      <input 
                        type="text" 
                        value={comm.payment_method || ''} 
                        onChange={(e) => handleCommissionChange(idx, 'payment_method', e.target.value)}
                        className="w-24 border rounded px-1 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      />
                    ) : comm.payment_method || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {isEditingCommissions ? (
                      <input 
                        type="text" 
                        value={comm.from_account || ''} 
                        onChange={(e) => handleCommissionChange(idx, 'from_account', e.target.value)}
                        className="w-24 border rounded px-1 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      />
                    ) : comm.from_account || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {isEditingCommissions ? (
                      <input 
                        type="text" 
                        value={comm.to_account || ''} 
                        onChange={(e) => handleCommissionChange(idx, 'to_account', e.target.value)}
                        className="w-24 border rounded px-1 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      />
                    ) : comm.to_account || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-500">{formatCurrency(comm.amount || 0, comm.currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Labour Costs */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <DollarSign className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold dark:text-white">Labour Costs</h3>
          </div>
          <button 
            onClick={() => toast.success('Syncing with Staff Tab...')}
            className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary hover:bg-primary/90"
          >
            Edit All
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Job</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pay</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment Method</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">From Account</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">To Account</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {labourRows.length > 0 ? labourRows.map((cost) => (
                <tr key={cost.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-300">{cost.role}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {cost.staff ? `${cost.staff.first_name} ${cost.staff.last_name}` : 'Unassigned'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex flex-col">
                      <span>{cost.payBreakdown || (cost.pay_rate ? `${formatCurrency(cost.pay_rate, 'MXN')} (${cost.pay_type})` : '-')}</span>
                      {cost.usesManualTotal && <span className="text-xs text-amber-600">Manual override</span>}
                      {cost.usesSuggestedTotal && <span className="text-xs text-primary">Using suggested rule</span>}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{cost.payment_method || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{cost.from_account || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{cost.to_account || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-500">
                    {formatCurrency(cost.displayTotal ?? 0, 'MXN')}
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500 italic">No labour costs recorded. Assign staff in the Staff tab.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Fiscal Invoice Details */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 pb-24">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2">
            <FileText className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold dark:text-white">Fiscal Invoice Details (SAT Facturas)</h3>
          </div>
          <button 
            onClick={editingFiscal ? handleSaveFiscal : () => setEditingFiscal(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary hover:bg-primary/90"
          >
            {editingFiscal ? <Save className="h-4 w-4 mr-2" /> : <Edit className="h-4 w-4 mr-2" />}
            {editingFiscal ? 'Save Fiscal Details' : 'Edit Fiscal Details'}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-500">Date Required</label>
              {editingFiscal ? (
                <input 
                  type="date" 
                  value={fiscalDetails?.date_required || ''} 
                  onChange={(e) => setFiscalDetails({...fiscalDetails!, date_required: e.target.value})}
                  className="mt-1 block w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              ) : (
                <p className="mt-1 dark:text-white">{fiscalDetails?.date_required || 'dd/mm/yyyy'}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500">Date Requested</label>
              {editingFiscal ? (
                <input 
                  type="date" 
                  value={fiscalDetails?.date_requested || ''} 
                  onChange={(e) => setFiscalDetails({...fiscalDetails!, date_requested: e.target.value})}
                  className="mt-1 block w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              ) : (
                <p className="mt-1 dark:text-white">{fiscalDetails?.date_requested || 'dd/mm/yyyy'}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500">Date Submitted</label>
              {editingFiscal ? (
                <input 
                  type="date" 
                  value={fiscalDetails?.date_submitted || ''} 
                  onChange={(e) => setFiscalDetails({...fiscalDetails!, date_submitted: e.target.value})}
                  className="mt-1 block w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              ) : (
                <p className="mt-1 dark:text-white">{fiscalDetails?.date_submitted || 'dd/mm/yyyy'}</p>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-500">Currency</label>
              {editingFiscal ? (
                <select 
                  value={fiscalDetails?.currency || 'MXN'} 
                  onChange={(e) => setFiscalDetails({...fiscalDetails!, currency: e.target.value})}
                  className="mt-1 block w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  <option value="MXN">MXN</option>
                  <option value="USD">USD</option>
                </select>
              ) : (
                <p className="mt-1 dark:text-white">{fiscalDetails?.currency || 'MXN'}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500">Exchange Rate for Inv.</label>
              {editingFiscal ? (
                <input 
                  type="number" 
                  step="0.0001"
                  value={fiscalDetails?.exchange_rate || 1} 
                  onChange={(e) => setFiscalDetails({...fiscalDetails!, exchange_rate: parseFloat(e.target.value)})}
                  className="mt-1 block w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              ) : (
                <p className="mt-1 dark:text-white">{fiscalDetails?.exchange_rate || '1'}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500">Folio</label>
              {editingFiscal ? (
                <input 
                  type="text" 
                  value={fiscalDetails?.folio || ''} 
                  onChange={(e) => setFiscalDetails({...fiscalDetails!, folio: e.target.value})}
                  className="mt-1 block w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  placeholder="Folio number"
                />
              ) : (
                <p className="mt-1 dark:text-white">{fiscalDetails?.folio || 'Folio number'}</p>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-500">Link PDF</label>
              {editingFiscal ? (
                <input 
                  type="text" 
                  value={fiscalDetails?.link_pdf || ''} 
                  onChange={(e) => setFiscalDetails({...fiscalDetails!, link_pdf: e.target.value})}
                  className="mt-1 block w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  placeholder="https://"
                />
              ) : (
                <p className="mt-1 text-primary hover:underline cursor-pointer">{fiscalDetails?.link_pdf || 'https://'}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500">Link XML</label>
              {editingFiscal ? (
                <input 
                  type="text" 
                  value={fiscalDetails?.link_xml || ''} 
                  onChange={(e) => setFiscalDetails({...fiscalDetails!, link_xml: e.target.value})}
                  className="mt-1 block w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  placeholder="https://"
                />
              ) : (
                <p className="mt-1 text-primary hover:underline cursor-pointer">{fiscalDetails?.link_xml || 'https://'}</p>
              )}
            </div>
          </div>
        </div>

        <div className="mt-10 border-t border-gray-200 dark:border-gray-700 pt-6">
          <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-4 uppercase tracking-wider">Financial Breakdown</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500">Subtotal</label>
              {editingFiscal ? (
                <input 
                  type="number" 
                  value={fiscalDetails?.subtotal || 0} 
                  onChange={(e) => {
                    const subtotal = parseFloat(e.target.value);
                    const iva = subtotal * 0.16;
                    const total = subtotal + iva;
                    setFiscalDetails({...fiscalDetails!, subtotal, iva, total});
                  }}
                  className="w-full border rounded px-1 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              ) : (
                <p className="mt-1 font-bold dark:text-white">{formatCurrency(fiscalDetails?.subtotal || 0, 'MXN')}</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500">IVA</label>
              {editingFiscal ? (
                <input 
                  type="number" 
                  value={fiscalDetails?.iva || 0} 
                  onChange={(e) => setFiscalDetails({...fiscalDetails!, iva: parseFloat(e.target.value)})}
                  className="w-full border rounded px-1 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              ) : (
                <p className="mt-1 font-bold dark:text-white">{formatCurrency(fiscalDetails?.iva || 0, 'MXN')}</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500">ISR</label>
              {editingFiscal ? (
                <input 
                  type="number" 
                  value={fiscalDetails?.isr || 0} 
                  onChange={(e) => setFiscalDetails({...fiscalDetails!, isr: parseFloat(e.target.value)})}
                  className="w-full border rounded px-1 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              ) : (
                <p className="mt-1 font-bold dark:text-white">{formatCurrency(fiscalDetails?.isr || 0, 'MXN')}</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500">IVA Ret</label>
              {editingFiscal ? (
                <input 
                  type="number" 
                  value={fiscalDetails?.iva_ret || 0} 
                  onChange={(e) => setFiscalDetails({...fiscalDetails!, iva_ret: parseFloat(e.target.value)})}
                  className="w-full border rounded px-1 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              ) : (
                <p className="mt-1 font-bold dark:text-white">{formatCurrency(fiscalDetails?.iva_ret || 0, 'MXN')}</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500">ISR Ret</label>
              {editingFiscal ? (
                <input 
                  type="number" 
                  value={fiscalDetails?.isr_ret || 0} 
                  onChange={(e) => setFiscalDetails({...fiscalDetails!, isr_ret: parseFloat(e.target.value)})}
                  className="w-full border rounded px-1 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              ) : (
                <p className="mt-1 font-bold dark:text-white">{formatCurrency(fiscalDetails?.isr_ret || 0, 'MXN')}</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500">Total</label>
              {editingFiscal ? (
                <input 
                  type="number" 
                  value={fiscalDetails?.total || 0} 
                  onChange={(e) => setFiscalDetails({...fiscalDetails!, total: parseFloat(e.target.value)})}
                  className="w-full border rounded px-1 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              ) : (
                <p className="mt-1 font-bold dark:text-white text-lg">{formatCurrency(fiscalDetails?.total || 0, 'MXN')}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Add Expense Modal */}
      {isAddingExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold dark:text-white">Add Expense</h3>
              <button onClick={() => setIsAddingExpense(false)}><X className="h-5 w-5 dark:text-gray-400" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Name</label>
                <input 
                  type="text" 
                  value={newExpense.name} 
                  onChange={(e) => setNewExpense({...newExpense, name: e.target.value})}
                  className="mt-1 block w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  placeholder="e.g. Gas Cost"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
                <textarea 
                  value={newExpense.description} 
                  onChange={(e) => setNewExpense({...newExpense, description: e.target.value})}
                  className="mt-1 block w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Amount USD</label>
                  <input 
                    type="number" 
                    value={newExpense.amount_usd} 
                    onChange={(e) => setNewExpense({...newExpense, amount_usd: parseFloat(e.target.value)})}
                    className="mt-1 block w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Amount MXN</label>
                  <input 
                    type="number" 
                    value={newExpense.amount_mxn} 
                    onChange={(e) => setNewExpense({...newExpense, amount_mxn: parseFloat(e.target.value)})}
                    className="mt-1 block w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Account / Category</label>
                <select 
                  value={newExpense.category_id || ''} 
                  onChange={(e) => setNewExpense({...newExpense, category_id: e.target.value})}
                  className="mt-1 block w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  <option value="">Select Account</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Date</label>
                <input 
                  type="date" 
                  value={newExpense.date} 
                  onChange={(e) => setNewExpense({...newExpense, date: e.target.value})}
                  className="mt-1 block w-full border rounded-md p-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button 
                  onClick={() => setIsAddingExpense(false)}
                  className="px-4 py-2 border rounded-md text-gray-700 dark:text-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSaveExpense}
                  className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90"
                >
                  Add Expense
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // Handlers
  function handleCommissionChange(index: number, field: keyof EventCommission, value: any) {
    const updated = [...commissions];
    updated[index] = { ...updated[index], [field]: value };
    // Recalculate amount if percentage changed
    if (field === 'percentage' && acceptedQuote) {
      updated[index].amount = (acceptedQuote.total_amount * (value as number)) / 100;
    }
    setCommissions(updated);
  }

  async function handleDeleteExpense(id: string) {
    const confirmed = await confirm({
      title: 'Delete Expense',
      message: 'Are you sure you want to delete this expense?',
      confirmLabel: 'Delete',
      type: 'danger'
    });

    if (!confirmed) return;

    try {
      await financialService.deleteExpense(id);
      setExpenses(expenses.filter(e => e.id !== id));
      toast.success('Expense deleted');
    } catch (error) {
      toast.error('Failed to delete expense');
    }
  }
}
