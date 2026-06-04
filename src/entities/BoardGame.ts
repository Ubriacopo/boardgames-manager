import type { Database } from '../types/database.types';

export type BoardGame = Database['public']['Tables']['board_games']['Row'] & {
  image_url?: string | null;
};
export type NewBoardGame = Database['public']['Tables']['board_games']['Insert'];
export type BoardGameUpdate = Database['public']['Tables']['board_games']['Update'];
