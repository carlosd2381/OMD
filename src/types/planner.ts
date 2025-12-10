export interface Planner {
  id: string;
  first_name: string;
  last_name: string;
  company?: string;
  email: string;
  phone?: string;
  website?: string;
  instagram?: string;
  facebook?: string;
  created_at: string;
  updated_at: string;
}

export type CreatePlannerDTO = Omit<Planner, 'id' | 'created_at' | 'updated_at'>;
export type UpdatePlannerDTO = Partial<CreatePlannerDTO>;
