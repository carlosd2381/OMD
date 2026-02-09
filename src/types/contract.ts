export interface SignaturePartyMetadata {
  name: string;
  email?: string;
  role?: string;
  signed_at?: string;
  ip_address?: string;
  user_agent?: string;
  fingerprint?: string;
}

export interface SignatureMetadata {
  client?: SignaturePartyMetadata;
  provider?: SignaturePartyMetadata;
  transaction?: {
    method?: string;
    location?: string;
    reference?: string;
  };
}

export interface Contract {
  id: string;
  client_id: string;
  event_id: string;
  quote_id?: string;
  content: string; // HTML or Markdown content
  status: 'draft' | 'sent' | 'signed';
  signed_at?: string;
  signed_by?: string; // Client name or IP
  signature_metadata?: SignatureMetadata;
  document_version?: number;
  created_at: string;
  updated_at: string;
}
