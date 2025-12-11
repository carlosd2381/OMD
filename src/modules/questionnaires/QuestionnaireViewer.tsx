import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Questionnaire } from '../../types/questionnaire';

export default function QuestionnaireViewer() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [questionnaire, setQuestionnaire] = useState<Questionnaire | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchQuestionnaire() {
      if (!id) return;
      const { data, error } = await supabase
        .from('questionnaires')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) {
        console.error('Error fetching questionnaire:', error);
      } else {
        setQuestionnaire(data as unknown as Questionnaire);
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
          className="flex items-center text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="h-5 w-5 mr-2" />
          Back
        </button>
      </div>
      
      <div className="bg-white shadow sm:rounded-lg overflow-hidden">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            {questionnaire.title}
          </h3>
          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
            questionnaire.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
          }`}>
            {questionnaire.status.toUpperCase()}
          </span>
        </div>
        <div className="px-4 py-5 sm:p-6">
          {/* Placeholder for generic questionnaire rendering */}
          <p className="text-gray-500 italic">Generic questionnaire viewer not yet implemented.</p>
          <div className="mt-4">
            <h4 className="text-sm font-medium text-gray-900">Details</h4>
            <dl className="mt-2 grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500">Created At</dt>
                <dd className="mt-1 text-sm text-gray-900">{new Date(questionnaire.created_at).toLocaleDateString()}</dd>
              </div>
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500">Due Date</dt>
                <dd className="mt-1 text-sm text-gray-900">{questionnaire.due_date || 'N/A'}</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}
