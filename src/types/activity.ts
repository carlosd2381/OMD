export interface ActivityLog {
  id: string;
  entity_id: string;
  entity_type: 'client' | 'event' | 'venue' | 'planner' | 'lead';
  action: string;
  details?: string;
  created_at: string;
  created_by: string;
}

export interface CreateActivityLogDTO {
  entity_id: string;
  entity_type: 'client' | 'event' | 'venue' | 'planner' | 'lead';
  action: string;
  details?: string;
}
