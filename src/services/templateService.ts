import { supabase } from '../lib/supabase';
import type { Template, TemplateType } from '../types/template';
import type { Database } from '../types/supabase';

type TemplateRow = Database['public']['Tables']['templates']['Row'];
type TemplateInsert = Database['public']['Tables']['templates']['Insert'];
type TemplateUpdate = Database['public']['Tables']['templates']['Update'];

function mapToTemplate(row: TemplateRow): Template {
  let content = row.content || '';
  if (row.type === 'questionnaire' && row.questions) {
    content = JSON.stringify(row.questions);
  }

  return {
    id: row.id,
    name: row.name,
    type: row.type as TemplateType,
    subject: row.subject || undefined,
    content: content,
    lastModified: row.last_modified || row.created_at || undefined,
  };
}

export const templateService = {
  getTemplates: async (type?: Template['type']): Promise<Template[]> => {
    let query = supabase
      .from('templates')
      .select('*')
      .order('name', { ascending: true });

    if (type) {
      query = query.eq('type', type as any);
    }

    const { data, error } = await query;

    if (error) throw error;
    return (data || []).map(mapToTemplate);
  },

  createTemplate: async (template: Omit<Template, 'id' | 'lastModified'>): Promise<Template> => {
    const insertData: TemplateInsert = {
      name: template.name,
      type: template.type as any,
      subject: template.subject,
      content: template.type !== 'questionnaire' ? template.content : null,
      questions: template.type === 'questionnaire' ? JSON.parse(template.content) : null,
      is_active: true,
    };

    const { data, error } = await supabase
      .from('templates')
      .insert(insertData)
      .select()
      .single();

    if (error) throw error;
    return mapToTemplate(data);
  },

  updateTemplate: async (id: string, template: Partial<Template>): Promise<Template> => {
    const updateData: TemplateUpdate = {
      last_modified: new Date().toISOString(),
    };

    if (template.name) updateData.name = template.name;
    if (template.type) updateData.type = template.type as any;
    if (template.subject !== undefined) updateData.subject = template.subject;
    
    if (template.content !== undefined) {
      if (template.type === 'questionnaire') {
         updateData.questions = JSON.parse(template.content);
         updateData.content = null;
      } else if (template.type) {
         updateData.content = template.content;
         updateData.questions = null;
      } else {
         // Fallback: try to detect if it's a questionnaire update
         try {
            const parsed = JSON.parse(template.content);
            if (Array.isArray(parsed)) {
                updateData.questions = parsed;
            } else {
                updateData.content = template.content;
            }
         } catch {
            updateData.content = template.content;
         }
      }
    }

    const { data, error } = await supabase
      .from('templates')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return mapToTemplate(data);
  },

  deleteTemplate: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('templates')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
};
