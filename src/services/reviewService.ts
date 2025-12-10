import type { Review } from '../types/review';

export const MOCK_REVIEWS: Review[] = [
  {
    id: '1',
    client_id: '1',
    event_id: '1',
    rating: 0,
    comment: '',
    status: 'pending',
    created_at: new Date().toISOString(),
  },
];

export const reviewService = {
  getReviewsByClient: async (clientId: string): Promise<Review[]> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    return MOCK_REVIEWS.filter(r => r.client_id === clientId);
  },
  
  submitReview: async (id: string, rating: number, comment: string): Promise<Review | undefined> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    const r = MOCK_REVIEWS.find(x => x.id === id);
    if (r) {
      r.rating = rating;
      r.comment = comment;
      r.status = 'submitted';
      r.submitted_at = new Date().toISOString();
    }
    return r;
  }
};
