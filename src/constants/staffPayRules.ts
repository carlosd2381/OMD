import type { StaffPayRateRule } from '../types/staff';
import { getPositionByKey } from './staffPositions';

const label = (key: string, fallback: string) => getPositionByKey(key)?.label ?? fallback;

const OPERATOR_KEYS = ['operator_1', 'operator_2', 'operator_3', 'operator_4', 'operator_5', 'operator_6'];

export const DEFAULT_STAFF_PAY_RULES: StaffPayRateRule[] = [
  {
    position_key: 'sales_logistics_1',
    position_label: label('sales_logistics_1', 'Sales & Logistics'),
    rate_type: 'percent_revenue',
    config: {
      percentage: 6,
      revenue_basis: 'pre_tax'
    },
    notes: '6% of accepted quote pre-tax revenue'
  },
  {
    position_key: 'driver_a',
    position_label: label('driver_a', 'Driver A'),
    rate_type: 'per_direction',
    config: {
      amount_per_direction: 125,
      default_directions: 2
    },
    notes: 'MX$125 per direction (depart + return)'
  },
  {
    position_key: 'driver_b',
    position_label: label('driver_b', 'Driver B'),
    rate_type: 'per_direction',
    config: {
      amount_per_direction: 125,
      default_directions: 2
    },
    notes: 'MX$125 per direction (depart + return)'
  },
  ...OPERATOR_KEYS.map<StaffPayRateRule>((key) => ({
    position_key: key,
    position_label: label(key, key.replace('_', ' ')),
    rate_type: 'tiered_hours',
    config: {
      base_hours: 6,
      base_amount: 600,
      overtime_rate: 50,
      default_hours: 6
    },
    notes: 'MX$600 first 6 hours, MX$50 per additional hour'
  })),
  {
    position_key: 'box_prep',
    position_label: label('box_prep', 'Box Prep'),
    rate_type: 'flat',
    config: {
      amount: 200
    },
    notes: 'MX$200 per event'
  },
  {
    position_key: 'cleaning',
    position_label: label('cleaning', 'Cleaning'),
    rate_type: 'flat',
    config: {
      amount: 350
    },
    notes: 'MX$350 per event'
  },
  {
    position_key: 'churro_dough',
    position_label: label('churro_dough', 'Churro Dough'),
    rate_type: 'tiered_quantity',
    config: {
      base_quantity: 2,
      base_amount: 600,
      extra_rate: 100,
      unit_label: 'kg'
    },
    notes: 'First 2kg = MX$600, +MX$100 per extra kg'
  }
];
