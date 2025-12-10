export interface ClientFile {
  id: string;
  client_id: string;
  name: string;
  description?: string;
  url: string;
  type: string; // MIME type
  size: number;
  uploaded_at: string;
  uploaded_by: string;
}
