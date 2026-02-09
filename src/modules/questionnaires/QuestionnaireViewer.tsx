import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { eventService } from '../../services/eventService';
import { formatDocumentID } from '../../utils/formatters';
import { buildDocSequenceMap, buildEventSequenceMap, buildEventsMap, resolveDocumentId } from '../../utils/documentSequences';
import type { Questionnaire } from '../../types/questionnaire';
import BookingQuestionnaire from './BookingQuestionnaire';

export default function QuestionnaireViewer() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [questionnaire, setQuestionnaire] = useState<Questionnaire | null>(null);
  const [loading, setLoading] = useState(true);
  const [documentId, setDocumentId] = useState('');

  useEffect(() => {
    async function fetchQuestionnaire() {
      if (!id) return;
      const { data, error } = await supabase
        .from('questionnaires')
        .select('*, event:events(date)')
        .eq('id', id)
        .single();
      
      if (error) {
        console.error('Error fetching questionnaire:', error);
      } else {
        const typedQuestionnaire = data as unknown as Questionnaire;
        setQuestionnaire(typedQuestionnaire);

        const [eventsList, questionnaireScope] = await Promise.all([
          eventService.getEvents(),
          fetchQuestionnaireScope(typedQuestionnaire)
        ]);

        const resolvedId = resolveDocumentId('QST', typedQuestionnaire, {
          eventsMap: buildEventsMap(eventsList),
          eventSequences: buildEventSequenceMap(eventsList),
          docSequences: buildDocSequenceMap(questionnaireScope)
        });
        setDocumentId(resolvedId);
      }
      setLoading(false);
    }
    fetchQuestionnaire();
  }, [id]);

  if (loading) return <div className="p-8">Loading...</div>;
  if (!questionnaire) return <div className="p-8">Questionnaire not found</div>;

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="mb-6">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center text-gray-500 dark:text-gray-400 dark:text-gray-400 hover:text-gray-700"
        >
          <ArrowLeft className="h-5 w-5 mr-2" />
          Back
        </button>
      </div>
      
      <div className="bg-white dark:bg-gray-800 dark:bg-gray-800 shadow sm:rounded-lg overflow-hidden">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200 dark:border-gray-700 dark:border-gray-700 flex justify-between items-center">
          <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white dark:text-white">
            {documentId || formatDocumentID('QST', (questionnaire as any).event?.date || questionnaire.created_at)} - {questionnaire.title}
          </h3>
          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
            questionnaire.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
          }`}>
            {questionnaire.status.toUpperCase()}
          </span>
        </div>
        <div className="px-4 py-5 sm:p-6">
          {/* Render Booking Questionnaire if it matches */}
          {/* For now, we assume all questionnaires are Booking Questionnaires or fallback to it */}
          <BookingQuestionnaire embedded={true} eventId={questionnaire.event_id} />
          
          <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-700 dark:border-gray-700">
            <h4 className="text-sm font-medium text-gray-900 dark:text-white dark:text-white">System Details</h4>
            <dl className="mt-2 grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 dark:text-gray-400">Created At</dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-white dark:text-white">{new Date(questionnaire.created_at).toLocaleDateString()}</dd>
              </div>
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 dark:text-gray-400">Due Date</dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-white dark:text-white">{questionnaire.due_date || 'N/A'}</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}

type QuestionnaireSequenceRow = Pick<Questionnaire, 'id' | 'event_id' | 'created_at' | 'client_id'>;

async function fetchQuestionnaireScope(questionnaire: Questionnaire): Promise<QuestionnaireSequenceRow[]> {
  let query = supabase
    .from('questionnaires')
    .select('id, event_id, created_at, client_id')
    .order('created_at', { ascending: true });

  if (questionnaire.event_id) {
    query = query.eq('event_id', questionnaire.event_id);
  } else {
    query = query.eq('client_id', questionnaire.client_id).is('event_id', null);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as QuestionnaireSequenceRow[];
}
