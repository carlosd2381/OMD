import { supabase } from '../lib/supabase';
import type { Review } from '../types/review';
import type { Database } from '../types/supabase';

type ReviewRow = Database['public']['Tables']['reviews']['Row'];
type ReviewUpdate = Database['public']['Tables']['reviews']['Update'];

function mapToReview(row: ReviewRow): Review {
  return {
    id: row.id,
    client_id: row.client_id,
    event_id: row.event_id,
    rating: row.rating,
    comment: row.comment,
    status: row.status,
    created_at: row.created_at || new Date().toISOString(),
    // submitted_at is not in the table, so we can't map it accurately from DB
    // We could potentially use created_at if we assume created_at updates on submission, but that's unlikely for an update.
  };
}

export const reviewService = {
  getReviewsByClient: async (clientId: string): Promise<Review[]> => {
    const { data, error } = await supabase
      .from('reviews')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(mapToReview);
  },
  
  submitReview: async (id: string, rating: number, comment: string): Promise<Review | undefined> => {
    const updates: ReviewUpdate = {
      rating,
      comment,
      status: 'submitted',
    };

    const { data, error } = await supabase
      .from('reviews')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return mapToReview(data);
  }
};
