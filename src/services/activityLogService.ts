import type { ActivityLog, CreateActivityLogDTO } from '../types/activity';

const MOCK_LOGS: ActivityLog[] = [
  {
    id: '1',
    entity_id: '1',
    entity_type: 'client',
    action: 'Client Created',
    details: 'Client profile was created.',
    created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
    created_by: 'Admin User',
  },
  {
    id: '2',
    entity_id: '1',
    entity_type: 'client',
    action: 'Status Updated',
    details: 'Status changed from Lead to Active.',
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    created_by: 'Admin User',
  },
  {
    id: '3',
    entity_id: '1',
    entity_type: 'event',
    action: 'Event Created',
    details: 'Wedding event created.',
    created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
    created_by: 'Admin User',
  },
];

export const activityLogService = {
  getLogs: async (entityId: string, entityType: string): Promise<ActivityLog[]> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    return MOCK_LOGS.filter(l => l.entity_id === entityId && l.entity_type === entityType).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },

  logActivity: async (log: CreateActivityLogDTO): Promise<ActivityLog> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    const newLog: ActivityLog = {
      id: Math.random().toString(36).substr(2, 9),
      ...log,
      created_at: new Date().toISOString(),
      created_by: 'Admin User',
    };
    MOCK_LOGS.unshift(newLog);
    return newLog;
  },
};
