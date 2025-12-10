import type { Template } from '../types/template';

const MOCK_TEMPLATES: Template[] = [
  { id: '1', name: 'Standard Wedding Questionnaire', type: 'questionnaire', content: '{}' },
  { id: '2', name: 'Corporate Event Questionnaire', type: 'questionnaire', content: '{}' },
  { id: '3', name: 'Standard Service Agreement', type: 'contract', content: '...' },
  { id: '4', name: 'Vendor Agreement', type: 'contract', content: '...' },
  { id: '5', name: '50/50 Split', type: 'payment_plan', content: '50% deposit, 50% before event' },
  { id: '6', name: '3 Payments (30/30/40)', type: 'payment_plan', content: '30% deposit, 30% midway, 40% before event' },
];

export const templateService = {
  getTemplates: async (type?: Template['type']): Promise<Template[]> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    if (type) {
      return MOCK_TEMPLATES.filter(t => t.type === type);
    }
    return MOCK_TEMPLATES;
  },
};
