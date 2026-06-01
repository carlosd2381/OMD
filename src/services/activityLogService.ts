import { supabase } from '../lib/supabase';
import type { ActivityLog, CreateActivityLogDTO } from '../types/activity';
import type { Database } from '../types/supabase';

type ActivityLogRow = Database['public']['Tables']['activity_logs']['Row'];
type ActivityLogInsert = Database['public']['Tables']['activity_logs']['Insert'];

const NOTIFICATION_META_PREFIX = '@@notification_meta:';
const NOTIFICATION_PARSE_CACHE_MAX_ENTRIES = 500;

type NotificationDocumentType = 'quote' | 'contract' | 'invoice';

interface NotificationDetailsMeta {
  document_type: NotificationDocumentType;
  document_id: string;
}

type ParsedNotificationDetails = {
  cleanDetails?: string;
  metadata?: NotificationDetailsMeta;
};

const notificationDetailsParseCache = new Map<string, ParsedNotificationDetails>();

function setNotificationDetailsCache(details: string, parsed: ParsedNotificationDetails): ParsedNotificationDetails {
  if (notificationDetailsParseCache.size >= NOTIFICATION_PARSE_CACHE_MAX_ENTRIES) {
    const oldestKey = notificationDetailsParseCache.keys().next().value;
    if (oldestKey) {
      notificationDetailsParseCache.delete(oldestKey);
    }
  }

  notificationDetailsParseCache.set(details, parsed);
  return parsed;
}

function parseNotificationDetails(details?: string | null): ParsedNotificationDetails {
  if (!details) return {};

  const cached = notificationDetailsParseCache.get(details);
  if (cached) return cached;

  const markerWithNewline = `\n${NOTIFICATION_META_PREFIX}`;
  const markerIndex = details.lastIndexOf(markerWithNewline);
  const startsWithMarker = details.startsWith(NOTIFICATION_META_PREFIX);

  let rawMeta = '';
  let cleanDetails = details;

  if (markerIndex >= 0) {
    cleanDetails = details.slice(0, markerIndex).trimEnd();
    rawMeta = details.slice(markerIndex + markerWithNewline.length).trim();
  } else if (startsWithMarker) {
    cleanDetails = '';
    rawMeta = details.slice(NOTIFICATION_META_PREFIX.length).trim();
  }

  if (!rawMeta) {
    const parsed = { cleanDetails: cleanDetails || undefined };
    return setNotificationDetailsCache(details, parsed);
  }

  try {
    const parsed = JSON.parse(rawMeta) as Partial<NotificationDetailsMeta>;
    if (
      parsed.document_id &&
      parsed.document_type &&
      (parsed.document_type === 'quote' || parsed.document_type === 'contract' || parsed.document_type === 'invoice')
    ) {
      const value = {
        cleanDetails: cleanDetails || undefined,
        metadata: {
          document_id: parsed.document_id,
          document_type: parsed.document_type,
        },
      };
      return setNotificationDetailsCache(details, value);
    }
  } catch {
    const parsed = { cleanDetails: details };
    return setNotificationDetailsCache(details, parsed);
  }

  const parsed = { cleanDetails: cleanDetails || undefined };
  return setNotificationDetailsCache(details, parsed);
}

export function formatNotificationActivityDetails(
  details: string,
  documentType: NotificationDocumentType,
  documentId: string
): string {
  return `${details}\n${NOTIFICATION_META_PREFIX}${JSON.stringify({
    document_type: documentType,
    document_id: documentId,
  })}`;
}

function mapToActivityLog(row: ActivityLogRow): ActivityLog {
  const parsedDetails = parseNotificationDetails(row.details);

  return {
    id: row.id,
    entity_id: row.entity_id,
    entity_type: row.entity_type as ActivityLog['entity_type'],
    action: row.action,
    details: parsedDetails.cleanDetails,
    created_at: row.created_at || new Date().toISOString(),
    created_by: row.created_by,
  };
}

export type NotificationStatus = 'sent' | 'failed' | 'skipped';

export interface DocumentNotificationStatus {
  status: NotificationStatus;
  action: string;
  created_at: string;
  details?: string;
}

export interface AdminAlert {
  id: string;
  entity_id: string;
  entity_type: ActivityLog['entity_type'];
  action: string;
  details?: string;
  created_at: string;
  created_by: string;
}

const adminFailureActions = [
  'Questionnaire Sync Failed',
  'Quote Notification Failed',
  'Contract Notification Failed',
  'Invoice Notification Failed',
] as const;

const notificationActionMap = {
  quote: {
    sent: 'Quote Notification Sent',
    failed: 'Quote Notification Failed',
    skipped: 'Quote Notification Skipped',
  },
  contract: {
    sent: 'Contract Notification Sent',
    failed: 'Contract Notification Failed',
    skipped: 'Contract Notification Skipped',
  },
  invoice: {
    sent: 'Invoice Notification Sent',
    failed: 'Invoice Notification Failed',
    skipped: 'Invoice Notification Skipped',
  },
} as const;

export const activityLogService = {
  getLogs: async (entityId: string, entityType: string): Promise<ActivityLog[]> => {
    const { data, error } = await supabase
      .from('activity_logs')
      .select('*')
      .eq('entity_id', entityId)
      .eq('entity_type', entityType as ActivityLogRow['entity_type'])
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(mapToActivityLog);
  },

  logActivity: async (log: CreateActivityLogDTO): Promise<ActivityLog> => {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    
    let createdBy = 'System';

    if (user) {
      // Try to get name from public.users
      const { data: profile } = await supabase
        .from('users')
        .select('name')
        .eq('id', user.id)
        .single();

      if (profile?.name) {
        createdBy = profile.name;
      } else if (user.user_metadata?.full_name) {
        createdBy = user.user_metadata.full_name;
      } else if (user.email) {
        createdBy = user.email;
      }
    }

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

  getLatestDocumentNotificationStatus: async (
    clientId: string,
    documentType: NotificationDocumentType,
    documentId: string
  ): Promise<DocumentNotificationStatus | null> => {
    const actionSet = notificationActionMap[documentType];
    const actionList = [actionSet.sent, actionSet.failed, actionSet.skipped];

    const { data, error } = await supabase
      .from('activity_logs')
      .select('action,created_at,details')
      .eq('entity_id', clientId)
      .eq('entity_type', 'client')
      .in('action', actionList)
      .ilike('details', `%${documentId}%`)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const matchingLog = (data || []).find((row) => {
      const parsed = parseNotificationDetails(row.details);

      if (parsed.metadata) {
        return (
          parsed.metadata.document_type === documentType &&
          parsed.metadata.document_id === documentId
        );
      }

      const rawDetails = row.details || '';
      return rawDetails.includes(documentId);
    });

    if (!matchingLog) return null;

    const status: NotificationStatus =
      matchingLog.action === actionSet.sent
        ? 'sent'
        : matchingLog.action === actionSet.failed
          ? 'failed'
          : 'skipped';

    return {
      status,
      action: matchingLog.action,
      created_at: matchingLog.created_at || new Date().toISOString(),
      details: parseNotificationDetails(matchingLog.details).cleanDetails,
    };
  },

  getDocumentNotificationStatusMap: async (
    clientId: string,
    documentType: NotificationDocumentType,
    documentIds: string[]
  ): Promise<Record<string, DocumentNotificationStatus | null>> => {
    if (documentIds.length === 0) return {};

    const actionSet = notificationActionMap[documentType];
    const actionList = [actionSet.sent, actionSet.failed, actionSet.skipped];

    const detailsFilter = documentIds
      .map((documentId) => `details.ilike.%${documentId.replace(/,/g, '')}%`)
      .join(',');

    const { data, error } = await supabase
      .from('activity_logs')
      .select('action,created_at,details')
      .eq('entity_id', clientId)
      .eq('entity_type', 'client')
      .in('action', actionList)
      .or(detailsFilter)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const statusMap: Record<string, DocumentNotificationStatus | null> = Object.fromEntries(
      documentIds.map((documentId) => [documentId, null])
    );

    const unresolved = new Set(documentIds);
    for (const row of data || []) {
      if (unresolved.size === 0) break;

      const parsed = parseNotificationDetails(row.details);
      let matchedId: string | undefined;

      if (parsed.metadata && parsed.metadata.document_type === documentType && unresolved.has(parsed.metadata.document_id)) {
        matchedId = parsed.metadata.document_id;
      } else {
        const rawDetails = row.details || '';
        matchedId = documentIds.find((documentId) => unresolved.has(documentId) && rawDetails.includes(documentId));
      }

      if (!matchedId) continue;

      const status: NotificationStatus =
        row.action === actionSet.sent
          ? 'sent'
          : row.action === actionSet.failed
            ? 'failed'
            : 'skipped';

      statusMap[matchedId] = {
        status,
        action: row.action,
        created_at: row.created_at || new Date().toISOString(),
        details: parsed.cleanDetails,
      };
      unresolved.delete(matchedId);
    }

    return statusMap;
  },

  getRecentAdminAlerts: async (limit = 20): Promise<AdminAlert[]> => {
    const today = new Date();
    const lookAhead = new Date(today);
    lookAhead.setDate(lookAhead.getDate() + 14);

    const { data, error } = await supabase
      .from('activity_logs')
      .select('*')
      .in('action', [
        ...adminFailureActions,
        'New Lead',
        'Quote Accepted',
        'Questionnaire Completed',
        'Task Assigned',
      ])
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    const { data: dueInvoices, error: dueInvoiceError } = await supabase
      .from('invoices')
      .select('id, client_id, invoice_number, due_date, status, total_amount')
      .in('status', ['sent', 'overdue'])
      .lte('due_date', lookAhead.toISOString().slice(0, 10));

    if (dueInvoiceError) throw dueInvoiceError;

    const dueAlerts: AdminAlert[] = (dueInvoices || []).reduce<AdminAlert[]>((acc, invoice) => {
        const dueDate = invoice.due_date ? new Date(invoice.due_date) : null;
        if (!dueDate || Number.isNaN(dueDate.getTime())) return acc;

        const isOverdue = dueDate < today;
        acc.push({
          id: `invoice-due-${invoice.id}`,
          entity_id: invoice.client_id,
          entity_type: 'client' as const,
          action: isOverdue ? 'Payment Overdue' : 'Payment Due Soon',
          details: `Invoice ${invoice.invoice_number || invoice.id} ${isOverdue ? 'is overdue' : 'is due soon'} on ${invoice.due_date}. Amount: ${invoice.total_amount}.`,
          created_at: invoice.due_date,
          created_by: 'System',
        });

        return acc;
      }, []);

    const activityAlerts = (data || []).map((row) => {
      const mapped = mapToActivityLog(row);
      return {
        ...mapped,
        created_by: row.created_by || 'System',
      };
    });

    return [...activityAlerts, ...dueAlerts]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, limit);
  },
};
