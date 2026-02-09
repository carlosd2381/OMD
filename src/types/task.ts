export interface Task {
  id: string;
  client_id?: string;
  venue_id?: string;
  planner_id?: string;
  title: string;
  description?: string;
  status: 'pending' | 'completed';
  due_date?: string;
  assigned_to?: string; // User ID
  completed_at?: string;
  completed_by?: string; // User name or ID
  created_at: string;
}

export interface TaskTemplate {
  id: string;
  title: string;
  description?: string;
  category?: string; // e.g., 'Onboarding', 'Month Of', 'Post-Event'
}
