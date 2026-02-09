import { supabase } from '../lib/supabase';
import type { Database } from '../types/supabase';

export type UserRole = string;
export type UserStatus = Database['public']['Enums']['user_status'];

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole[];
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
    role: Array.isArray(row.role) ? row.role : [row.role as unknown as string],
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

  createUser: async (user: { name: string; email: string; role: UserRole[]; status?: UserStatus }): Promise<User> => {
    const { data, error } = await supabase
      .from('users')
      .insert({
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status || 'active',
      })
      .select()
      .single();

    if (error) throw error;
    return mapToUser(data);
  },

  inviteUser: async (email: string, role: UserRole[]): Promise<void> => {
    const { error } = await supabase
      .from('users')
      .insert({
        email,
        name: email.split('@')[0],
        role: role,
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

  updateUser: async (id: string, updates: { name?: string; role?: UserRole[]; status?: UserStatus }): Promise<void> => {
    const { error } = await supabase
      .from('users')
      .update(updates as any)
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
  },

  recordLogin: async (userId: string): Promise<void> => {
    const now = new Date().toISOString();
    
    // Update user last_login
    await supabase
      .from('users')
      .update({ last_login: now })
      .eq('id', userId);

    // Create session
    const userAgent = navigator.userAgent;
    const isMobile = /iPhone|iPad|iPod|Android/i.test(userAgent);
    const device = isMobile ? 'Mobile' : 'Desktop';
    
    // Simple IP placeholder - in a real app you'd use an external service or edge function
    const ip = '127.0.0.1'; 

    await supabase
      .from('user_sessions')
      .insert({
        user_id: userId,
        device: `${device} (${navigator.platform})`,
        ip_address: ip,
        location: 'Unknown',
        last_active: now
      });
  },

  linkAuthUser: async (authUserId: string, email?: string | null): Promise<void> => {
    if (!email) return;

    const { error } = await supabase
      .from('users')
      .update({ auth_user_id: authUserId })
      .eq('email', email.toLowerCase())
      .is('auth_user_id', null);

    if (error) throw error;
  }
};
