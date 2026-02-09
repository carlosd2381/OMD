import { supabase } from '../lib/supabase';
import type { StaffPayRateRule } from '../types/staff';
import type { Json } from '../types/supabase';
import { DEFAULT_STAFF_PAY_RULES } from '../constants/staffPayRules';

const toConfigObject = (config: Json): Record<string, any> => {
  if (config && typeof config === 'object' && !Array.isArray(config)) {
    return config as Record<string, any>;
  }
  return {};
};

export const payRateService = {
  async getPayRates(): Promise<StaffPayRateRule[]> {
    try {
      const { data, error } = await supabase
        .from('staff_pay_rates')
        .select('*')
        .order('position_key');

      if (error || !data?.length) {
        if (error && error.code !== '42P01') {
          console.warn('[payRateService] falling back to defaults:', error.message);
        }
        return DEFAULT_STAFF_PAY_RULES;
      }

      return data.map((row) => ({
        id: row.id,
        position_key: row.position_key,
        position_label: row.position_label,
        rate_type: row.rate_type as StaffPayRateRule['rate_type'],
        config: toConfigObject(row.config),
        notes: row.notes || undefined
      }));
    } catch (err) {
      console.error('[payRateService] failed to fetch rates, using defaults', err);
      return DEFAULT_STAFF_PAY_RULES;
    }
  }
};
