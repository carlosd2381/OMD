export interface RunSheet {
  id: string;
  event_id: string;
  
  // Event Schedule
  event_start_time?: string;
  event_end_time?: string;
  meet_load_time?: string;
  leave_time?: string;
  arrive_time?: string;
  setup_time?: string;
  
  // Staff
  driver_a?: string;
  driver_b?: string;
  operator_1?: string;
  operator_2?: string;
  operator_3?: string;
  operator_4?: string;
  operator_5?: string;
  operator_6?: string;
  
  // Equipment
  cart_1?: boolean;
  cart_2?: boolean;
  booth_1?: boolean;
  booth_2?: boolean;
  freezer_1?: boolean;
  freezer_2?: boolean;
  rollz_1?: boolean;
  pancake_1?: boolean;
  pancake_2?: boolean;
  waffle_1?: boolean;
  waffle_2?: boolean;
  
  // Additional Info
  notes?: string;
  
  created_at: string;
  updated_at: string;
}

export type CreateRunSheetDTO = Omit<RunSheet, 'id' | 'created_at' | 'updated_at'>;
export type UpdateRunSheetDTO = Partial<CreateRunSheetDTO>;
