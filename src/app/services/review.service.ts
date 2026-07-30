import { Injectable } from '@angular/core';
import type { Database } from '../../types/database.types';
import { supabase } from '../../utils/supabase';

export type LocalReview = Database['public']['Tables']['game_reviews']['Row'];
export type LocalReviewSummary = {
  average: number | null;
  count: number;
  rank: number | null;
  reviews: LocalReview[];
};

@Injectable({ providedIn: 'root' })
export class ReviewService {
  async summary(bggId: number): Promise<LocalReviewSummary> {
    const { data, error } = await supabase
      .from('game_reviews')
      .select('*')
      .order('updated_at', { ascending: false });
    // Review migrations can briefly lag behind a frontend deployment. Reviews
    // are optional enrichment and must never prevent the library from rendering.
    if (error) return { average: null, count: 0, rank: null, reviews: [] };

    const grouped = new Map<number, LocalReview[]>();
    data.forEach((review) => grouped.set(review.bgg_id, [...(grouped.get(review.bgg_id) ?? []), review]));
    const ranked = [...grouped.entries()]
      .map(([id, reviews]) => ({
        id,
        average: reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length,
      }))
      .sort((a, b) => b.average - a.average);
    const reviews = grouped.get(bggId) ?? [];
    return {
      average: reviews.length ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length : null,
      count: reviews.length,
      rank: ranked.findIndex((entry) => entry.id === bggId) + 1 || null,
      reviews,
    };
  }

  async save(bggId: number, rating: number, body: string): Promise<void> {
    const { data } = await supabase.auth.getSession();
    const userId = data.session?.user.id;
    if (!userId) throw new Error('Sign in to leave a review.');
    const { error } = await supabase.from('game_reviews').upsert(
      { user_id: userId, bgg_id: bggId, rating, body: body.trim(), updated_at: new Date().toISOString() },
      { onConflict: 'user_id,bgg_id' },
    );
    if (error) throw error;
  }
}
