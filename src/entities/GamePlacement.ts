import type { BoardGame } from './BoardGame';

// Placement is stored on the copy; this projection keeps shelf rendering focused.
export type GamePlacement = {
  game_id: string;
  container_box_id: number | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
};
export function placementForGame(game: BoardGame): GamePlacement {
  return { game_id: game.id, container_box_id: game.container_box_id, sort_order: game.sort_order,
    created_at: game.created_at, updated_at: game.updated_at };
}
