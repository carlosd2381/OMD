import type { StaffCompensationConfig, StaffPayRateRule } from '../types/staff';

export interface CompensationContext {
  revenuePreTax?: number;
  eventDurationHours?: number;
}

export interface CompensationResult {
  total: number;
  breakdown: string;
  effectiveConfig: Record<string, number>;
}

export interface CompensationFieldConfig {
  key: 'directions' | 'hours' | 'quantity' | 'percentage';
  label: string;
  min?: number;
  step?: number;
  helperText?: string;
}

export function calculateCompensation(
  rule: StaffPayRateRule | undefined,
  config: StaffCompensationConfig | null | undefined,
  context: CompensationContext
): CompensationResult {
  if (config?.manual_total !== undefined) {
    return {
      total: config.manual_total,
      breakdown: 'Manual override',
      effectiveConfig: { manual_total: config.manual_total }
    };
  }

  if (!rule) {
    return {
      total: 0,
      breakdown: 'No rule configured',
      effectiveConfig: {}
    };
  }

  const overrides = config?.overrides ?? {};
  const merged: Record<string, number> = {};
  const base = rule.config || {};

  const pick = (key: string, fallback = 0): number => {
    const value = overrides[key] ?? base[key];
    if (value === undefined || value === null) return fallback;
    return Number(value);
  };

  let total = 0;
  let breakdown = '';

  switch (rule.rate_type) {
    case 'flat': {
      const amount = pick('amount');
      total = amount;
      breakdown = 'Flat per event';
      merged.amount = amount;
      break;
    }
    case 'per_direction': {
      const amountPerDirection = pick('amount_per_direction');
      const directions = overrides.directions ?? base.directions ?? base.default_directions ?? 2;
      const parsedDirections = Number(directions) || 0;
      total = amountPerDirection * parsedDirections;
      breakdown = `${parsedDirections} directions × ${amountPerDirection}`;
      merged.amount_per_direction = amountPerDirection;
      merged.directions = parsedDirections;
      break;
    }
    case 'percent_revenue': {
      const percentage = overrides.percentage ?? base.percentage ?? 0;
      const revenue = context.revenuePreTax ?? 0;
      total = revenue * (Number(percentage) / 100);
      breakdown = `${percentage}% of MX$${revenue.toFixed(2)}`;
      merged.percentage = Number(percentage);
      break;
    }
    case 'tiered_hours': {
      const baseHours = pick('base_hours');
      const baseAmount = pick('base_amount');
      const overtimeRate = pick('overtime_rate');
      const defaultHours = overrides.hours ?? base.hours ?? base.default_hours ?? baseHours;
      const hours = Number(defaultHours) || 0;
      const baseRate = baseHours > 0 ? baseAmount / baseHours : 0;
      const baseSpan = Math.min(hours, baseHours);
      const overtimeHours = Math.max(0, hours - baseHours);
      total = baseSpan * baseRate + overtimeHours * overtimeRate;
      breakdown = `${baseSpan}h base + ${overtimeHours}h overtime`;
      merged.hours = hours;
      merged.base_hours = baseHours;
      merged.overtime_rate = overtimeRate;
      break;
    }
    case 'tiered_quantity': {
      const baseQuantity = pick('base_quantity');
      const baseAmount = pick('base_amount');
      const extraRate = pick('extra_rate');
      const quantity = Number(overrides.quantity ?? base.quantity ?? base.base_quantity ?? baseQuantity) || 0;
      total = quantity <= baseQuantity
        ? baseAmount
        : baseAmount + (quantity - baseQuantity) * extraRate;
      breakdown = `${quantity} ${base.unit_label ?? 'units'}`;
      merged.quantity = quantity;
      merged.base_quantity = baseQuantity;
      merged.extra_rate = extraRate;
      break;
    }
    default: {
      const amount = pick('amount');
      total = amount;
      breakdown = 'Flat rule';
      merged.amount = amount;
    }
  }

  return {
    total: Number.isFinite(total) ? Math.max(0, Number(total.toFixed(2))) : 0,
    breakdown,
    effectiveConfig: merged
  };
}

export function getOverrideFields(rule?: StaffPayRateRule): CompensationFieldConfig[] {
  if (!rule) return [];
  switch (rule.rate_type) {
    case 'per_direction':
      return [{ key: 'directions', label: 'Directions', min: 0, step: 1, helperText: 'Depart + return legs' }];
    case 'percent_revenue':
      return [{ key: 'percentage', label: 'Percent (%)', min: 0, step: 0.1 }];
    case 'tiered_hours':
      return [{ key: 'hours', label: 'Hours Worked', min: 0, step: 0.25 }];
    case 'tiered_quantity':
      return [{ key: 'quantity', label: 'Quantity', min: 0, step: 0.25 }];
    default:
      return [];
  }
}
