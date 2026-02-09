import { supabase } from '../lib/supabase';
import { activityLogService } from './activityLogService';
import { emailNotificationService } from './emailNotificationService';
import type { Contract, SignatureMetadata } from '../types/contract';

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

  updateStatus: async (id: string, status: Contract['status'], signedBy?: string, signatureMetadata?: SignatureMetadata): Promise<Contract | null> => {
    const updates: any = {
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
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    if (!data) return null;

    const updatedContract = mapToContract(data);

    await activityLogService.logActivity({
      entity_id: updatedContract.client_id,
      entity_type: 'client',
      action: 'Contract Status Updated',
      details: `Contract status updated to ${status}`,
    });

    if (status === 'signed') {
      try {
        await emailNotificationService.sendContractSignedNotification(updatedContract);
      } catch (notificationError) {
        console.error('Failed to send contract notification email:', notificationError);
      }
    }

    return updatedContract;
  }
};

// Helper to map DB result to Contract type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapToContract(data: any): Contract {
  return {
    ...data,
    status: data.status as Contract['status'],
    signature_metadata: data.signature_metadata as SignatureMetadata | undefined,
    document_version: data.document_version ?? 1,
    updated_at: data.created_at // Fallback
  };
}
