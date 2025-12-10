export interface QuestionnaireAnswer {
  question_id: string;
  answer: string;
}

export interface Questionnaire {
  id: string;
  client_id: string;
  event_id: string;
  title: string;
  status: 'pending' | 'completed';
  answers?: QuestionnaireAnswer[];
  due_date?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}
