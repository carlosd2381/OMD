import { supabase } from '../lib/supabase';
import type { ActivityLog, CreateActivityLogDTO } from '../types/activity';
import type { Database } from '../types/supabase';

type ActivityLogRow = Database['public']['Tables']['activity_logs']['Row'];
type ActivityLogInsert = Database['public']['Tables']['activity_logs']['Insert'];

function mapToActivityLog(row: ActivityLogRow): ActivityLog {
  return {
    id: row.id,
    entity_id: row.entity_id,
    entity_type: row.entity_type as ActivityLog['entity_type'],
    action: row.action,
    details: row.details || undefined,
    created_at: row.created_at || new Date().toISOString(),
    created_by: row.created_by,
  };
}

export const activityLogService = {
  getLogs: async (entityId: string, entityType: string): Promise<ActivityLog[]> => {
    const { data, error } = await supabase
      .from('activity_logs')
      .select('*')
      .eq('entity_id', entityId)
      .eq('entity_type', entityType as any)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(mapToActivityLog);
  },

  logActivity: async (log: CreateActivityLogDTO): Promise<ActivityLog> => {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    const createdBy = user?.email || 'System';

    const dbLog: ActivityLogInsert = {
      entity_id: log.entity_id,
      entity_type: log.entity_type,
      action: log.action,
      details: log.details,
      created_by: createdBy,
    };

    const { data, error } = await supabase
      .from('activity_logs')
      .insert(dbLog)
      .select()
      .single();

    if (error) throw error;
    return mapToActivityLog(data);
  },
};
