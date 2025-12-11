import { supabase } from '../lib/supabase';
import type { ClientFile } from '../types/clientFile';
import type { Database } from '../types/supabase';

type ClientFileRow = Database['public']['Tables']['client_files']['Row'];
type ClientFileInsert = Database['public']['Tables']['client_files']['Insert'];

function mapToClientFile(row: ClientFileRow): ClientFile {
  return {
    id: row.id,
    client_id: row.client_id,
    name: row.name,
    description: row.description || undefined,
    url: row.url,
    type: row.type,
    size: row.size,
    uploaded_at: row.created_at || new Date().toISOString(),
    uploaded_by: row.uploaded_by,
  };
}

export const fileService = {
  getFilesByClient: async (clientId: string): Promise<ClientFile[]> => {
    const { data, error } = await supabase
      .from('client_files')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(mapToClientFile);
  },

  uploadFile: async (clientId: string, file: File, description: string): Promise<ClientFile> => {
    // 1. Upload file to Supabase Storage
    const fileName = `${clientId}/${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from('client-files')
      .upload(fileName, file);

    if (uploadError) throw uploadError;

    // 2. Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('client-files')
      .getPublicUrl(fileName);

    // 3. Get current user
    const { data: { user } } = await supabase.auth.getUser();
    const uploadedBy = user?.email || 'Unknown User';

    // 4. Save metadata to database
    const dbFile: ClientFileInsert = {
      client_id: clientId,
      name: file.name,
      description: description,
      url: publicUrl,
      type: file.type,
      size: file.size,
      uploaded_by: uploadedBy,
    };

    const { data, error } = await supabase
      .from('client_files')
      .insert(dbFile)
      .select()
      .single();

    if (error) throw error;
    return mapToClientFile(data);
  },

  deleteFile: async (id: string): Promise<void> => {
    // First get the file to know the path (if we want to delete from storage too)
    // For now, just deleting the record from DB. 
    // Ideally, we should also delete from storage using the URL or storing the path.
    
    const { error } = await supabase
      .from('client_files')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
};
