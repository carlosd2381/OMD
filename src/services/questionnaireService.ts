import type { Questionnaire } from '../types/questionnaire';

export const MOCK_QUESTIONNAIRES: Questionnaire[] = [
  {
    id: '1',
    client_id: '1',
    event_id: '1',
    title: 'Wedding Details Questionnaire',
    status: 'pending',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

export const questionnaireService = {
  getQuestionnairesByClient: async (clientId: string): Promise<Questionnaire[]> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    return MOCK_QUESTIONNAIRES.filter(q => q.client_id === clientId);
  },

  getQuestionnaire: async (id: string): Promise<Questionnaire | undefined> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    return MOCK_QUESTIONNAIRES.find(q => q.id === id);
  },

  updateStatus: async (id: string, status: Questionnaire['status']): Promise<Questionnaire | undefined> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    const q = MOCK_QUESTIONNAIRES.find(x => x.id === id);
    if (q) {
      q.status = status;
      q.updated_at = new Date().toISOString();
    }
    return q;
  }
};
