import { supabase } from '../lib/supabase';
import type { Database } from '../types/supabase';

export type UserRole = Database['public']['Enums']['user_role'];
export type UserStatus = Database['public']['Enums']['user_status'];

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  lastLogin: string;
  securityConfig?: any;
}

export interface Session {
  id: string;
  userId: string;
  userName: string;
  device: string;
  type: 'mobile' | 'desktop';
  ip: string;
  lastActive: string;
  location: string;
}

type UserRow = Database['public']['Tables']['users']['Row'];
type SessionRow = Database['public']['Tables']['user_sessions']['Row'];

function mapToUser(row: UserRow): User {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    status: row.status,
    lastLogin: row.last_login || '-',
    securityConfig: row.security_config,
  };
}

function mapToSession(row: SessionRow & { users: UserRow | null }): Session {
  return {
    id: row.id,
    userId: row.user_id,
    userName: row.users?.name || 'Unknown',
    device: row.device,
    type: row.device.toLowerCase().includes('mobile') ? 'mobile' : 'desktop',
    ip: row.ip_address,
    lastActive: row.last_active,
    location: row.location || 'Unknown',
  };
}

export const userService = {
  getUsers: async (): Promise<User[]> => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('name');

    if (error) throw error;
    return (data || []).map(mapToUser);
  },

  inviteUser: async (email: string, role: UserRole): Promise<void> => {
    const { error } = await supabase
      .from('users')
      .insert({
        email,
        name: email.split('@')[0],
        role,
        status: 'pending',
      });

    if (error) throw error;
  },

  updateUserStatus: async (id: string, status: UserStatus): Promise<void> => {
    const { error } = await supabase
      .from('users')
      .update({ status })
      .eq('id', id);

    if (error) throw error;
  },

  getSessions: async (): Promise<Session[]> => {
    const { data, error } = await supabase
      .from('user_sessions')
      .select('*, users(*)')
      .order('last_active', { ascending: false });

    if (error) throw error;
    // @ts-ignore
    return (data || []).map(mapToSession);
  },

  revokeSession: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('user_sessions')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  revokeAllSessions: async (): Promise<void> => {
    const { error } = await supabase
      .from('user_sessions')
      .delete()
      .neq('id', '0'); // Hack to delete all rows if no filter is applied, but usually delete() requires a filter. 
      // Actually, delete() without filter is allowed if RLS allows it.
      // But to be safe and explicit:
      
    if (error) throw error;
  }
};
