export interface StaffPosition {
  key: string;
  label: string;
  category: string;
}

export type StaffPositionGroups = Record<string, Array<{ key: string; label: string }>>;

export const STAFF_POSITION_GROUPS: StaffPositionGroups = {
  Drivers: [
    { key: 'driver_a', label: 'Driver A' },
    { key: 'driver_b', label: 'Driver B' }
  ],
  'Event Operators': [
    { key: 'operator_1', label: 'Operator 1' },
    { key: 'operator_2', label: 'Operator 2' },
    { key: 'operator_3', label: 'Operator 3' },
    { key: 'operator_4', label: 'Operator 4' },
    { key: 'operator_5', label: 'Operator 5' },
    { key: 'operator_6', label: 'Operator 6' }
  ],
  Warehouse: [
    { key: 'box_prep', label: 'Box Prep' },
    { key: 'cleaning', label: 'Cleaning' }
  ],
  Kitchen: [
    { key: 'churro_dough', label: 'Churro Dough' },
    { key: 'pancakes_mix', label: 'Pancakes Mix' },
    { key: 'waffles_mix', label: 'Waffles Mix' },
    { key: 'rollz_mix', label: 'Rollz Mix' },
    { key: 'donut_mix', label: 'Donut Mix' },
    { key: 'crepe_mix', label: 'Crepe Mix' }
  ],
  'Sales & Logistics': [
    { key: 'sales_logistics_1', label: 'Sales & Logistics' }
  ]
};

export const STAFF_POSITIONS: StaffPosition[] = Object.entries(STAFF_POSITION_GROUPS).flatMap(([category, list]) =>
  list.map((item) => ({ category, ...item }))
);

const POSITION_LOOKUP = new Map(
  STAFF_POSITIONS.map((pos) => [pos.key, pos])
);

export function getPositionByKey(key?: string | null): StaffPosition | undefined {
  if (!key) return undefined;
  return POSITION_LOOKUP.get(key);
}

export function findPositionKeyByLabel(label?: string | null): string | undefined {
  if (!label) return undefined;
  const normalized = label.trim().toLowerCase();
  const entry = STAFF_POSITIONS.find((pos) => pos.label.toLowerCase() === normalized);
  return entry?.key;
}

export function matchPosition(labelOrKey?: string | null): StaffPosition | undefined {
  if (!labelOrKey) return undefined;
  const value = labelOrKey.trim();
  return getPositionByKey(value) ?? getPositionByKey(findPositionKeyByLabel(value));
}
