import { supabase } from '../lib/supabase';
import type { Email } from '../types/email';

export const emailService = {
  async getEmails(page = 1, pageSize = 50, filters?: { search?: string, status?: string }): Promise<{ emails: Email[], count: number }> {
    let query = supabase
      .from('inbox_emails')
      .select('*', { count: 'exact' });

    if (filters?.status) {
      if (filters.status === 'inbox') {
        // Just general inbox for now
        // query = query.in('status', ['unread', 'read']);
      } else {
        query = query.eq('status', filters.status);
      }
    }

    if (filters?.search) {
      query = query.or(`subject.ilike.%${filters.search}%,from_address.ilike.%${filters.search}%,text_body.ilike.%${filters.search}%`);
    }

    const { data, error, count } = await query
      .order('received_at', { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);

    if (error) throw error;
    return { emails: (data as Email[]) || [], count: count || 0 };
  },

  async getEmailsByContact(emailAddress: string): Promise<Email[]> {
    if (!emailAddress) return [];
    
    const { data, error } = await supabase
      .from('inbox_emails')
      .select('*')
      .or(`from_address.ilike.%${emailAddress}%,to_address.ilike.%${emailAddress}%`)
      .order('received_at', { ascending: false });

    if (error) throw error;
    return (data as Email[]) || [];
  },

  async getEmail(id: string): Promise<Email | null> {
    const { data, error } = await supabase
      .from('inbox_emails')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data as Email;
  },

  async markAsRead(id: string): Promise<void> {
    const { error } = await supabase
      .from('inbox_emails')
      .update({ status: 'read' })
      .eq('id', id);

    if (error) throw error;
  }
};
