import type { Database } from '../types/database.types';

export type Rating = Database['public']['Tables']['rating']['Row'];
export type NewRating = Database['public']['Tables']['rating']['Insert'];
export type RatingUpdate = Database['public']['Tables']['rating']['Update'];
