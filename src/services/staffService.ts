import { supabase } from '../lib/supabase';
import type { StaffProfile, EventStaffAssignment } from '../types/staff';

export const staffService = {
  // --- Staff Profiles ---

  async getStaffMembers(): Promise<StaffProfile[]> {
    // 1. Get all users (since all users are staff/team members)
    const { data: users, error: userError } = await supabase
      .from('users')
      .select('*')
      .order('name');

    if (userError) throw userError;

    // 2. Get profiles for these users
    // Note: In a real scenario, we'd do a join. For now, we'll fetch and merge.
    const { data: profiles, error: profileError } = await supabase
      .from('staff_profiles')
      .select('*');

    if (profileError && profileError.code !== '42P01') { // Ignore "table does not exist" for now
      throw profileError;
    }

    // Merge data
    return users.map(user => {
      const profile: any = profiles?.find((p: any) => p.user_id === user.id) || {};
      return {
        id: user.id, // Using user_id as the main ID for simplicity
        user_id: user.id,
        first_name: profile.first_name || user.name.split(' ')[0],
        last_name: profile.last_name || user.name.split(' ').slice(1).join(' '),
        email: user.email,
        phone: profile.phone,
        address: profile.address,
        date_of_birth: profile.date_of_birth,
        id_type: profile.id_type,
        id_number: profile.id_number,
        id_expiration_date: profile.id_expiration_date,
        id_front_url: profile.id_front_url,
        id_back_url: profile.id_back_url,
        bank_name: profile.bank_name,
        card_number: profile.card_number,
        clabe: profile.clabe,
        account_number: profile.account_number,
        is_driver: profile.is_driver || false,
        created_at: user.created_at || new Date().toISOString(),
        updated_at: user.created_at || new Date().toISOString(),
      };
    });
  },

  async createStaffProfile(profile: Partial<StaffProfile> & { user_id: string }): Promise<void> {
    const { error } = await supabase
      .from('staff_profiles')
      .insert({
        user_id: profile.user_id,
        first_name: profile.first_name,
        last_name: profile.last_name,
        phone: profile.phone,
        address: profile.address,
        date_of_birth: profile.date_of_birth,
        id_type: profile.id_type,
        id_number: profile.id_number,
        id_expiration_date: profile.id_expiration_date,
        is_driver: profile.is_driver,
      });

    if (error) throw error;
  },

  async getStaffProfile(userId: string): Promise<StaffProfile | null> {
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (userError) throw userError;
    if (!user) return null;

    const { data: profile } = await supabase
      .from('staff_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    // Handle missing profile table or record gracefully
    const p: any = profile || {};

    return {
      id: user.id,
      user_id: user.id,
      first_name: p.first_name || user.name.split(' ')[0],
      last_name: p.last_name || user.name.split(' ').slice(1).join(' '),
      email: user.email,
      phone: p.phone,
      address: p.address,
      date_of_birth: p.date_of_birth,
      id_type: p.id_type,
      id_number: p.id_number,
      id_expiration_date: p.id_expiration_date,
      id_front_url: p.id_front_url,
      id_back_url: p.id_back_url,
      bank_name: p.bank_name,
      card_number: p.card_number,
      clabe: p.clabe,
      account_number: p.account_number,
      is_driver: p.is_driver || false,
      created_at: user.created_at || new Date().toISOString(),
      updated_at: user.created_at || new Date().toISOString(),
    };
  },

  async updateStaffProfile(userId: string, data: Partial<StaffProfile>): Promise<void> {
    // Upsert into staff_profiles
    const { error } = await supabase
      .from('staff_profiles')
      .upsert({
        user_id: userId,
        first_name: data.first_name,
        last_name: data.last_name,
        phone: data.phone,
        address: data.address,
        date_of_birth: data.date_of_birth || null,
        id_type: data.id_type,
        id_number: data.id_number,
        id_expiration_date: data.id_expiration_date || null,
        id_front_url: data.id_front_url,
        id_back_url: data.id_back_url,
        bank_name: data.bank_name,
        card_number: data.card_number,
        clabe: data.clabe,
        account_number: data.account_number,
        is_driver: data.is_driver,
        updated_at: new Date().toISOString(),
      });

    if (error) throw error;
  },

  // --- Event Assignments ---

  async getEventAssignments(eventId: string): Promise<EventStaffAssignment[]> {
    // Fetch raw assignments without relying on PostgREST relationship detection
    const { data, error } = await supabase
      .from('event_staff_assignments')
      .select('*')
      .eq('event_id', eventId);

    if (error && error.code !== '42P01') throw error;

    return (data || []).map((row: any) => ({
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
      staff: undefined as any
    }));
  },

  /**
   * Sync event assignments to match a canonical positions map.
   * positions: { positionKey: user_id }
   */
  async syncEventAssignmentsWithPositions(eventId: string, positions: Record<string, string | undefined>): Promise<{
    created: string[];
    updated: string[];
    deleted: string[];
    skipped: Array<{ role: string; reason: string }>;
  }> {
    console.debug('[staffService] syncEventAssignmentsWithPositions start', { eventId, positions });
    // Load current assignments
    await this.getEventAssignments(eventId);

    const created: string[] = [];
    const updated: string[] = [];
    const deleted: string[] = [];
    const skipped: Array<{ role: string; reason: string }> = [];

    for (const [roleKey, userId] of Object.entries(positions)) {
      const roleLabel = roleKey.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

      // If no user selected -> remove existing if present
      if (!userId) {
        try {
          const { data: existingData, error: selErr } = await supabase
            .from('event_staff_assignments')
            .select('id')
            .eq('event_id', eventId)
            .ilike('role', roleLabel)
            .limit(1);

          if (selErr) {
            console.error('Error selecting existing assignment for delete:', selErr);
            skipped.push({ role: roleLabel, reason: 'select_error' });
          } else if (existingData && existingData.length) {
            await this.removeStaffFromEvent(existingData[0].id);
            deleted.push(roleLabel);
          } else {
            console.debug('[staffService] no existing assignment to remove for role', roleLabel);
          }
        } catch (err) {
          console.error('Failed to remove assignment during sync:', err);
          skipped.push({ role: roleLabel, reason: 'delete_failed' });
        }
        continue;
      }

      // Validate user exists before attempting insert/update
      try {
        const { data: users } = await supabase.from('users').select('id').eq('id', userId).limit(1);
        if (!users || users.length === 0) {
          console.warn(`Skipping sync for ${roleLabel}: user ${userId} not found.`);
          skipped.push({ role: roleLabel, reason: 'user_not_found' });
          continue; // skip invalid user ids
        }
        console.debug('[staffService] validated user exists for', roleLabel, userId);
      } catch (err) {
        console.error('Failed to validate user existence during sync:', err);
        skipped.push({ role: roleLabel, reason: 'validate_failed' });
        continue;
      }

      // Check for existing assignment for this event+role
      try {
        const { data: existingData, error: selErr } = await supabase
          .from('event_staff_assignments')
          .select('id, staff_id')
          .eq('event_id', eventId)
          .ilike('role', roleLabel)
          .limit(1);

        if (selErr) {
          console.error('Error selecting existing assignment for upsert:', selErr);
          skipped.push({ role: roleLabel, reason: 'select_error' });
          continue;
        }

        if (existingData && existingData.length) {
          const existing = existingData[0];
          if (existing.staff_id !== userId) {
            await this.updateAssignment(existing.id, { staff_id: userId });
            updated.push(roleLabel);
          } else {
            console.debug('[staffService] assignment already matches for', roleLabel);
          }
        } else {
          // Create new assignment
          try {
            await this.assignStaffToEvent({ event_id: eventId, staff_id: userId, role: roleLabel });
            created.push(roleLabel);
          } catch (err) {
            // If there's a conflict, attempt to find the assignment again and update instead
            console.error('Failed to create assignment during sync:', err);
            const { data: retryData } = await supabase
              .from('event_staff_assignments')
              .select('id, staff_id')
              .eq('event_id', eventId)
              .ilike('role', roleLabel)
              .limit(1);
            if (retryData && retryData.length) {
              await this.updateAssignment(retryData[0].id, { staff_id: userId });
              updated.push(roleLabel);
            } else {
              skipped.push({ role: roleLabel, reason: 'create_failed' });
            }
          }
        }
      } catch (err) {
        console.error('Failed to upsert assignment during sync:', err);
        skipped.push({ role: roleLabel, reason: 'upsert_failed' });
      }
    }
    console.debug('[staffService] syncEventAssignmentsWithPositions complete', { created, updated, deleted, skipped });
    return { created, updated, deleted, skipped };
  },

  async getStaffSchedule(userId: string): Promise<EventStaffAssignment[]> {
    const { data, error } = await supabase
      .from('event_staff_assignments')
      .select(`
        *,
        events:event_id (name, date, venue_name)
      `)
      .eq('staff_id', userId)
      .order('events(date)', { ascending: true });

    if (error && error.code !== '42P01') throw error;

    return (data || []).map((row: any) => ({
      ...row,
      event: row.events
    }));
  },

  async assignStaffToEvent(assignment: Partial<EventStaffAssignment>): Promise<void> {
    console.debug('[staffService] assignStaffToEvent', assignment);
    const { error } = await supabase
      .from('event_staff_assignments')
      .insert({
        event_id: assignment.event_id!,
        staff_id: assignment.staff_id!,
        role: assignment.role!,
        status: 'confirmed',
        pay_type: assignment.pay_type || 'flat',
        pay_rate: assignment.pay_rate || 0,
        pay_rate_id: assignment.pay_rate_id,
        compensation_config: assignment.compensation_config || null,
        total_pay: assignment.total_pay || 0,
        is_paid: false
      });

    if (error) {
      console.error('[staffService] assignStaffToEvent error', error);
      throw error;
    }
    console.debug('[staffService] assignStaffToEvent success');
  },

  async updateAssignment(id: string, updates: Partial<EventStaffAssignment>): Promise<void> {
    console.debug('[staffService] updateAssignment', { id, updates });
    // Filter out fields that are not in the database table or have wrong types
    const { event, staff, ...dbUpdates } = updates;
    
    const { error } = await supabase
      .from('event_staff_assignments')
      .update(dbUpdates as any) // Cast to any to avoid strict type checking on status enum mismatch if any
      .eq('id', id);

    if (error) {
      console.error('[staffService] updateAssignment error', error);
      throw error;
    }
    console.debug('[staffService] updateAssignment success', id);
  },

  async removeStaffFromEvent(id: string): Promise<void> {
    console.debug('[staffService] removeStaffFromEvent', id);
    const { error } = await supabase
      .from('event_staff_assignments')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[staffService] removeStaffFromEvent error', error);
      throw error;
    }
    console.debug('[staffService] removeStaffFromEvent success', id);
  },

  // --- Payroll ---
  
  async getUnpaidCompletedAssignments(): Promise<EventStaffAssignment[]> {
    // In a real app, we'd filter by status='completed' and is_paid=false
    // and join with events to get the date for grouping
    const { data, error } = await supabase
      .from('event_staff_assignments')
      .select(`
        *,
        events:event_id (name, date)
      `)
      .eq('is_paid', false)
      .eq('status', 'completed');

    if (error && error.code !== '42P01') throw error;

    return (data || []).map((row: any) => ({
      ...row,
      event: row.events,
      // Caller can match staff_id to their staff list for names
    }));
  }
};
