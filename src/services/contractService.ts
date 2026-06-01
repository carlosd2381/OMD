import { supabase } from '../lib/supabase';
import { activityLogService, formatNotificationActivityDetails } from './activityLogService';
import { emailNotificationService } from './emailNotificationService';
import type { Contract, SignatureMetadata } from '../types/contract';

type ContractData = {
  id: string;
  client_id: string;
  event_id: string;
  content: string;
  status: string;
  created_at: string | null;
  signed_at?: string | null;
  signed_by?: string | null;
  signature_metadata?: SignatureMetadata | null;
  document_version?: number | null;
  updated_at?: string | null;
};

export const contractService = {
  getContractsByClient: async (clientId: string): Promise<Contract[]> => {
    const { data, error } = await supabase
      .from('contracts')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map(mapToContract);
  },

  updateStatus: async (
    id: string,
    status: Contract['status'],
    signedBy?: string,
    signatureMetadata?: SignatureMetadata,
    options?: { sendNotification?: boolean }
  ): Promise<Contract | null> => {
    const { data: previousContract } = await supabase
      .from('contracts')
      .select('status')
      .eq('id', id)
      .maybeSingle();

    const updates: {
      status: Contract['status'];
      signed_at?: string | null;
      signed_by?: string | null;
      signature_metadata?: SignatureMetadata | null;
    } = {
      status,
      // updated_at: new Date().toISOString() // TODO: Add updated_at column to DB
    };

    if (status === 'signed') {
      updates.signed_at = new Date().toISOString();
      if (signedBy) {
        updates.signed_by = signedBy;
      }
      if (signatureMetadata) {
        updates.signature_metadata = signatureMetadata;
      }
    } else {
      // Reset signature if status is not signed
      updates.signed_at = null;
      updates.signed_by = null;
      updates.signature_metadata = null;
    }

    const { data, error } = await supabase
      .from('contracts')
      .update(updates as unknown as Record<string, unknown>)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    if (!data) return null;

    const updatedContract = mapToContract(data as unknown as ContractData);

    await activityLogService.logActivity({
      entity_id: updatedContract.client_id,
      entity_type: 'client',
      action: 'Contract Status Updated',
      details: `Contract status updated to ${status}`,
    });

    const logNotificationActivity = async (action: string, details: string) => {
      try {
        await activityLogService.logActivity({
          entity_id: updatedContract.client_id,
          entity_type: 'client',
          action,
          details: formatNotificationActivityDetails(details, 'contract', updatedContract.id),
        });
      } catch (logError) {
        console.error('Failed to write contract notification activity log:', logError);
      }
    };

    const shouldNotifyContractSigned =
      status === 'signed' &&
      previousContract?.status !== 'signed' &&
      options?.sendNotification !== false;

    if (shouldNotifyContractSigned) {
      try {
        await emailNotificationService.sendContractSignedNotification(updatedContract);
        await logNotificationActivity('Contract Notification Sent', `Contract signed email delivered for contract ${updatedContract.id}`);
      } catch (notificationError) {
        console.error('Failed to send contract notification email:', notificationError);
        await logNotificationActivity('Contract Notification Failed', `Contract signed email failed for contract ${updatedContract.id}`);
      }
    } else if (status === 'signed') {
      await logNotificationActivity('Contract Notification Skipped', `Contract signed email skipped for contract ${updatedContract.id} (already signed or suppressed)`);
    }

    return updatedContract;
  }
};

// Helper to map DB result to Contract type
function mapToContract(data: ContractData): Contract {
  return {
    id: data.id,
    client_id: data.client_id,
    event_id: data.event_id,
    content: data.content,
    status: data.status as Contract['status'],
    signed_at: data.signed_at || undefined,
    signed_by: data.signed_by || undefined,
    signature_metadata: data.signature_metadata || undefined,
    document_version: data.document_version ?? 1,
    created_at: data.created_at || new Date().toISOString(),
    updated_at: data.updated_at || data.created_at || new Date().toISOString(),
  };
}
