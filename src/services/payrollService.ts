import { supabase } from '../lib/supabase';
import type { PayrollRun, EventStaffAssignment } from '../types/staff';
import { staffService } from './staffService';
import { startOfWeek, endOfWeek, addDays, format } from 'date-fns';

const normalizeAssignment = (
  row: any,
  staffOverride?: { first_name?: string; last_name?: string }
): EventStaffAssignment => ({
  id: row.id,
  event_id: row.event_id,
  staff_id: row.staff_id,
  role: row.role,
  status: row.status,
  start_time: row.start_time,
  end_time: row.end_time,
  hours_worked: row.hours_worked,
  pay_rate: row.pay_rate,
  pay_type: row.pay_type,
  total_pay: row.total_pay,
  pay_rate_id: row.pay_rate_id,
  compensation_config: row.compensation_config,
  is_paid: row.is_paid,
  paid_at: row.paid_at,
  payment_reference: row.payment_reference,
  payment_method: row.payment_method,
  from_account: row.from_account,
  to_account: row.to_account,
  event: row.event || row.events || undefined,
  staff: staffOverride || row.staff || row.staff_profiles || undefined
});

export const payrollService = {
  async getPayrollRuns(): Promise<PayrollRun[]> {
    const { data, error } = await supabase
      .from('payroll_runs')
      .select('*')
      .order('period_start', { ascending: false });

    if (error) {
      console.error('Error fetching payroll runs:', error);
      // Return mock data if table doesn't exist yet
      return [];
    }
    return data;
  },

  async getPayrollRunDetails(id: string): Promise<PayrollRun | null> {
    const { data: run, error: runError } = await supabase
      .from('payroll_runs')
      .select('*')
      .eq('id', id)
      .single();

    if (runError) throw runError;

    // Fetch items linked to this run (assuming we link via payment_reference or a join table)
    // For this implementation, let's assume we store the run_id on the assignment
    const { data: items, error: itemsError } = await supabase
      .from('event_staff_assignments')
      .select(`
        *,
        event:events(name, date, venue_name)
      `)
      .eq('payroll_run_id', id); // Assuming we added this column

    if (itemsError) throw itemsError;

    // Map staff names manually since there isn't a direct FK relationship in Supabase
    const staffMembers = await staffService.getStaffMembers();
    const staffMap = new Map(staffMembers.map(member => [member.id, {
      first_name: member.first_name,
      last_name: member.last_name
    }]));

    const normalizedItems = (items || []).map((row: any) =>
      normalizeAssignment(row, staffMap.get(row.staff_id))
    );

    return { ...run, items: normalizedItems };
  },

  async createPayrollRun(startDate: Date): Promise<string> {
    // Period: Sunday to Saturday
    const start = startOfWeek(startDate, { weekStartsOn: 0 }); // 0 = Sunday
    const end = endOfWeek(startDate, { weekStartsOn: 0 });
    const payDate = addDays(start, 3); // Wednesday

    const startStr = format(start, 'yyyy-MM-dd');
    const endStr = format(end, 'yyyy-MM-dd');
    const payDateStr = format(payDate, 'yyyy-MM-dd');

    // 1. Find eligible assignments
    // Completed, Not Paid, Date within range
    // Note: Filtering by joined table column (event.date) might require specific Supabase syntax or client-side filtering
    // Supabase doesn't support filtering on joined columns in the top-level query easily without !inner
    // Let's try a different approach: Get assignments, then filter client side if needed, or use !inner
    
    const { data: assignmentRows, error: fetchError } = await supabase
      .from('event_staff_assignments')
      .select(`
        *,
        event:events!inner(name, date, venue_name)
      `)
      .in('status', ['confirmed', 'completed'])
      .eq('is_paid', false)
      .is('payroll_run_id', null);

    if (fetchError) throw fetchError;

    const eligibleAssignments = (assignmentRows || [])
      .map((row: any) => normalizeAssignment(row))
      .filter((assignment) => {
        const eventDate = assignment.event?.date;
        if (!eventDate) return false;
        return eventDate >= startStr && eventDate <= endStr;
      });

    if (!eligibleAssignments.length) {
      throw new Error('No eligible assignments found for this period.');
    }

    const totalAmount = eligibleAssignments.reduce((sum, assignment) => {
      const payout = typeof assignment.total_pay === 'number'
        ? assignment.total_pay
        : (assignment.pay_rate ?? 0);
      return sum + payout;
    }, 0);

    // 2. Create Run Record
    const { data: newRun, error: createError } = await supabase
      .from('payroll_runs')
      .insert({
        period_start: startStr,
        period_end: endStr,
        payment_date: payDateStr,
        total_amount: totalAmount,
        status: 'draft'
      })
      .select()
      .single();

    if (createError) throw createError;

    // 3. Link assignments to Run
    const assignmentIds = eligibleAssignments.map(a => a.id);
    const { error: updateError } = await supabase
      .from('event_staff_assignments')
      .update({ 
        payroll_run_id: newRun.id,
        payment_reference: `RUN-${newRun.id.slice(0, 8)}`
      })
      .in('id', assignmentIds);

    if (updateError) throw updateError;

    return newRun.id;
  },

  async processPayrollRun(id: string): Promise<void> {
    // Mark run as paid
    const { error: runError } = await supabase
      .from('payroll_runs')
      .update({ status: 'paid' })
      .eq('id', id);

    if (runError) throw runError;

    // Mark items as paid
    const { error: itemsError } = await supabase
      .from('event_staff_assignments')
      .update({ 
        is_paid: true,
        paid_at: new Date().toISOString()
      })
      .eq('payroll_run_id', id);

    if (itemsError) throw itemsError;
  }
};
