import type { Tables } from '../types/database.types';

export type GameDefinition = Tables<'games'>;
export type GameBoxSize = Tables<'game_box_sizes'>;
export type OwnedGame = Tables<'board_games_box_association'>;
export type BoxDimensions = { width: number; height: number; depth: number };
export type BoxSizeSelection = { sizeId: string | null; customDimensions: BoxDimensions | null };

// Presentation data combines a shared definition with one particular owned copy.
export type BoardGame = OwnedGame & Pick<GameDefinition, 'bgg_id' | 'bgg_url' | 'name' | 'release_year' | 'image_url'> & {
  box: number | null;
  size: number;
  box_width_mm: number;
  box_height_mm: number;
  box_depth_mm: number;
  box_size_label: string | null;
};
export type NewBoardGame = { gameId: string; selection: BoxSizeSelection };
