import { supabase } from '../lib/supabase';
import type { Database } from '../types/supabase';

export type BrandingSettings = Database['public']['Tables']['branding_settings']['Row'];
export type CalendarSettings = Database['public']['Tables']['calendar_settings']['Row'];
export type EmailSettings = Database['public']['Tables']['email_settings']['Row'];
export type FinancialSettings = Database['public']['Tables']['financial_settings']['Row'];
export type PaymentMethod = Database['public']['Tables']['payment_methods']['Row'];
export type PaymentSchedule = Database['public']['Tables']['payment_schedules']['Row'];
export type ContactForm = Database['public']['Tables']['contact_forms']['Row'];
export type ExpenseCategory = Database['public']['Tables']['expense_categories']['Row'];
export type Role = Database['public']['Tables']['roles']['Row'];
export type Token = Database['public']['Tables']['tokens']['Row'];

export const settingsService = {
  // Branding
  getBrandingSettings: async (): Promise<BrandingSettings | null> => {
    const { data, error } = await supabase
      .from('branding_settings')
      .select('*')
      .limit(1)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  updateBrandingSettings: async (settings: Partial<BrandingSettings>): Promise<BrandingSettings> => {
    const existing = await settingsService.getBrandingSettings();
    
    let result;
    if (existing) {
      const { data, error } = await supabase
        .from('branding_settings')
        .update(settings)
        .eq('id', existing.id)
        .select()
        .single();
      if (error) throw error;
      result = data;
    } else {
      const { data, error } = await supabase
        .from('branding_settings')
        .insert(settings as any)
        .select()
        .single();
      if (error) throw error;
      result = data;
    }
    return result;
  },

  // Calendar
  getCalendarSettings: async (): Promise<CalendarSettings | null> => {
    const { data, error } = await supabase
      .from('calendar_settings')
      .select('*')
      .limit(1)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  updateCalendarSettings: async (settings: Partial<CalendarSettings>): Promise<CalendarSettings> => {
    const existing = await settingsService.getCalendarSettings();
    
    let result;
    if (existing) {
      const { data, error } = await supabase
        .from('calendar_settings')
        .update(settings)
        .eq('id', existing.id)
        .select()
        .single();
      if (error) throw error;
      result = data;
    } else {
      const { data, error } = await supabase
        .from('calendar_settings')
        .insert(settings as any)
        .select()
        .single();
      if (error) throw error;
      result = data;
    }
    return result;
  },

  // Email
  getEmailSettings: async (): Promise<EmailSettings | null> => {
    const { data, error } = await supabase
      .from('email_settings')
      .select('*')
      .limit(1)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  updateEmailSettings: async (settings: Partial<EmailSettings>): Promise<EmailSettings> => {
    const existing = await settingsService.getEmailSettings();
    
    let result;
    if (existing) {
      const { data, error } = await supabase
        .from('email_settings')
        .update(settings)
        .eq('id', existing.id)
        .select()
        .single();
      if (error) throw error;
      result = data;
    } else {
      const { data, error } = await supabase
        .from('email_settings')
        .insert(settings as any)
        .select()
        .single();
      if (error) throw error;
      result = data;
    }
    return result;
  },

  // Financial
  getFinancialSettings: async (): Promise<FinancialSettings | null> => {
    const { data, error } = await supabase
      .from('financial_settings')
      .select('*')
      .limit(1)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  updateFinancialSettings: async (settings: Partial<FinancialSettings>): Promise<FinancialSettings> => {
    const existing = await settingsService.getFinancialSettings();
    
    let result;
    if (existing) {
      const { data, error } = await supabase
        .from('financial_settings')
        .update(settings)
        .eq('id', existing.id)
        .select()
        .single();
      if (error) throw error;
      result = data;
    } else {
      const { data, error } = await supabase
        .from('financial_settings')
        .insert(settings as any)
        .select()
        .single();
      if (error) throw error;
      result = data;
    }
    return result;
  },

  // Payment Methods
  getPaymentMethods: async (): Promise<PaymentMethod[]> => {
    const { data, error } = await supabase
      .from('payment_methods')
      .select('*')
      .order('created_at', { ascending: true });
    if (error) throw error;
    return data || [];
  },
  createPaymentMethod: async (item: Partial<PaymentMethod>): Promise<PaymentMethod> => {
    const { data, error } = await supabase.from('payment_methods').insert(item as any).select().single();
    if (error) throw error;
    return data;
  },
  updatePaymentMethod: async (id: string, item: Partial<PaymentMethod>): Promise<PaymentMethod> => {
    const { data, error } = await supabase.from('payment_methods').update(item).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },
  deletePaymentMethod: async (id: string): Promise<void> => {
    const { error } = await supabase.from('payment_methods').delete().eq('id', id);
    if (error) throw error;
  },

  // Payment Schedules
  getPaymentSchedules: async (): Promise<PaymentSchedule[]> => {
    const { data, error } = await supabase
      .from('payment_schedules')
      .select('*')
      .order('created_at', { ascending: true });
    if (error) throw error;
    return data || [];
  },
  createPaymentSchedule: async (item: Partial<PaymentSchedule>): Promise<PaymentSchedule> => {
    const { data, error } = await supabase.from('payment_schedules').insert(item as any).select().single();
    if (error) throw error;
    return data;
  },
  updatePaymentSchedule: async (id: string, item: Partial<PaymentSchedule>): Promise<PaymentSchedule> => {
    const { data, error } = await supabase.from('payment_schedules').update(item).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },
  deletePaymentSchedule: async (id: string): Promise<void> => {
    const { error } = await supabase.from('payment_schedules').delete().eq('id', id);
    if (error) throw error;
  },

  // Contact Forms
  getContactForms: async (): Promise<ContactForm[]> => {
    const { data, error } = await supabase
      .from('contact_forms')
      .select('*')
      .order('created_at', { ascending: true });
    if (error) throw error;
    return data || [];
  },
  createContactForm: async (item: Partial<ContactForm>): Promise<ContactForm> => {
    const { data, error } = await supabase.from('contact_forms').insert(item as any).select().single();
    if (error) throw error;
    return data;
  },
  updateContactForm: async (id: string, item: Partial<ContactForm>): Promise<ContactForm> => {
    const { data, error } = await supabase.from('contact_forms').update(item).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },
  deleteContactForm: async (id: string): Promise<void> => {
    const { error } = await supabase.from('contact_forms').delete().eq('id', id);
    if (error) throw error;
  },

  // Expense Categories
  getExpenseCategories: async (): Promise<ExpenseCategory[]> => {
    const { data, error } = await supabase
      .from('expense_categories')
      .select('*')
      .order('created_at', { ascending: true });
    if (error) throw error;
    return data || [];
  },
  createExpenseCategory: async (item: Partial<ExpenseCategory>): Promise<ExpenseCategory> => {
    const { data, error } = await supabase.from('expense_categories').insert(item as any).select().single();
    if (error) throw error;
    return data;
  },
  updateExpenseCategory: async (id: string, item: Partial<ExpenseCategory>): Promise<ExpenseCategory> => {
    const { data, error } = await supabase.from('expense_categories').update(item).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },
  deleteExpenseCategory: async (id: string): Promise<void> => {
    const { error } = await supabase.from('expense_categories').delete().eq('id', id);
    if (error) throw error;
  },

  // Roles
  getRoles: async (): Promise<Role[]> => {
    const { data, error } = await supabase
      .from('roles')
      .select('*')
      .order('created_at', { ascending: true });
    if (error) throw error;
    return data || [];
  },
  createRole: async (item: Partial<Role>): Promise<Role> => {
    const { data, error } = await supabase.from('roles').insert(item as any).select().single();
    if (error) throw error;
    return data;
  },
  updateRole: async (id: string, item: Partial<Role>): Promise<Role> => {
    const { data, error } = await supabase.from('roles').update(item).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },
  deleteRole: async (id: string): Promise<void> => {
    const { error } = await supabase.from('roles').delete().eq('id', id);
    if (error) throw error;
  },

  // Tokens
  getTokens: async (): Promise<Token[]> => {
    const { data, error } = await supabase
      .from('tokens')
      .select('*')
      .order('created_at', { ascending: true });
    if (error) throw error;
    return data || [];
  },
  createToken: async (item: Partial<Token>): Promise<Token> => {
    const { data, error } = await supabase.from('tokens').insert(item as any).select().single();
    if (error) throw error;
    return data;
  },
  updateToken: async (id: string, item: Partial<Token>): Promise<Token> => {
    const { data, error } = await supabase.from('tokens').update(item).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },
  deleteToken: async (id: string): Promise<void> => {
    const { error } = await supabase.from('tokens').delete().eq('id', id);
    if (error) throw error;
  },
};
