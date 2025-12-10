export type TemplateType = 'questionnaire' | 'contract' | 'payment_plan';

export interface Template {
  id: string;
  name: string;
  type: TemplateType;
  content: string; // JSON structure or HTML content
}
