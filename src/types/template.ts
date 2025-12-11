export type TemplateType = 'email' | 'contract' | 'invoice' | 'quote' | 'questionnaire' | 'payment_plan';

export interface Template {
  id: string;
  name: string;
  type: TemplateType;
  subject?: string;
  content: string; // JSON structure or HTML content
  lastModified?: string;
}
