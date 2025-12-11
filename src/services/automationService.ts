import { supabase } from '../lib/supabase';
import type { Database } from '../types/supabase';

export interface WorkflowAction {
  id: string;
  type: 'send_email' | 'create_task' | 'update_status' | 'webhook';
  config: Record<string, any>;
}

export interface Workflow {
  id: string;
  name: string;
  active: boolean;
  trigger: string;
  actions: WorkflowAction[];
}

export interface ExecutionLog {
  id: string;
  workflowId: string;
  workflowName: string;
  triggeredAt: string;
  status: 'success' | 'failed';
  details: string;
}

type WorkflowRow = Database['public']['Tables']['workflows']['Row'];
type WorkflowInsert = Database['public']['Tables']['workflows']['Insert'];
type WorkflowUpdate = Database['public']['Tables']['workflows']['Update'];

type LogRow = Database['public']['Tables']['automation_logs']['Row'];

function mapToWorkflow(row: WorkflowRow): Workflow {
  return {
    id: row.id,
    name: row.name,
    active: row.active,
    trigger: row.trigger,
    actions: (row.actions as unknown as WorkflowAction[]) || [],
  };
}

function mapToLog(row: LogRow & { workflows: WorkflowRow | null }): ExecutionLog {
  return {
    id: row.id,
    workflowId: row.workflow_id,
    workflowName: row.workflows?.name || 'Unknown Workflow',
    triggeredAt: row.triggered_at,
    status: row.status as 'success' | 'failed',
    details: row.details || '',
  };
}

export const automationService = {
  getWorkflows: async (): Promise<Workflow[]> => {
    const { data, error } = await supabase
      .from('workflows')
      .select('*')
      .order('name');

    if (error) throw error;
    return (data || []).map(mapToWorkflow);
  },

  saveWorkflow: async (workflow: Omit<Workflow, 'id'> & { id?: string }): Promise<Workflow> => {
    if (workflow.id && !workflow.id.startsWith('temp_')) {
      // Update
      const updates: WorkflowUpdate = {
        name: workflow.name,
        active: workflow.active,
        trigger: workflow.trigger,
        actions: workflow.actions as unknown as Database['public']['Tables']['workflows']['Update']['actions'],
      };
      
      const { data, error } = await supabase
        .from('workflows')
        .update(updates)
        .eq('id', workflow.id)
        .select()
        .single();
        
      if (error) throw error;
      return mapToWorkflow(data);
    } else {
      // Create
      const insert: WorkflowInsert = {
        name: workflow.name,
        active: workflow.active,
        trigger: workflow.trigger,
        actions: workflow.actions as unknown as Database['public']['Tables']['workflows']['Insert']['actions'],
      };
      
      const { data, error } = await supabase
        .from('workflows')
        .insert(insert)
        .select()
        .single();
        
      if (error) throw error;
      return mapToWorkflow(data);
    }
  },

  deleteWorkflow: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('workflows')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  getLogs: async (): Promise<ExecutionLog[]> => {
    const { data, error } = await supabase
      .from('automation_logs')
      .select('*, workflows(*)')
      .order('triggered_at', { ascending: false });

    if (error) throw error;
    // @ts-ignore
    return (data || []).map(mapToLog);
  }
};
