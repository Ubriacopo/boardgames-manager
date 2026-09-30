import { Injectable, computed, signal } from '@angular/core';
import type { Session } from '@supabase/supabase-js';
import type { BoardGame, NewBoardGame } from '../../entities/BoardGame';
import type { ContainerBox } from '../../entities/ContainerBox';
import type { GamePlacement } from '../../entities/GamePlacement';
import { getBggGameId, getBggMetadataByIds, type BggGameMetadata } from '../../utils/bggData';
import { supabase } from '../../utils/supabase';

export type Library = { id: string; user_id: string; name: string; created_at: string };
export type LibraryBox = ContainerBox & { capacity: number };
export type BoxLayoutDirection = 'vertical' | 'horizontal';
const BOX_COUNT = 16;
const BOX_CAPACITY = 8;

@Injectable({ providedIn: 'root' })
export class LibraryService {
  readonly library = signal<Library | null>(null);
  readonly games = signal<BoardGame[]>([]);
  readonly boxes = signal<LibraryBox[]>([]);
  readonly placements = signal<Record<string, GamePlacement>>({});
  readonly metadata = signal<Record<string, BggGameMetadata>>({});
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly unassigned = computed(() => this.games().filter((game) => game.box === null));
  private loadedForUser: string | null = null;

  async load(session: Session, force = false): Promise<void> {
    if (!force && this.loadedForUser === session.user.id) return;
    this.loading.set(true);
    this.error.set(null);
    try {
      const library = await this.ensureLibrary(session);
      const [games, boxes, placements] = await Promise.all([
        supabase.from('board_games').select('*').eq('library_id', library.id).order('name'),
        supabase.from('container_box').select('*').eq('library_id', library.id).order('id'),
        supabase.from('game_placements').select('*'),
      ]);
      if (games.error) throw games.error;
      if (boxes.error) throw boxes.error;
      if (placements.error) throw placements.error;
      this.library.set(library);
      this.games.set(games.data);
      this.boxes.set(boxes.data.map((box) => ({ ...box, capacity: box.capacity ?? BOX_CAPACITY })));
      this.placements.set(Object.fromEntries(placements.data.map((placement) => [placement.game_id, placement])));
      this.loadedForUser = session.user.id;
      await this.loadMetadata();
    } catch (error) {
      this.error.set(this.message(error));
    } finally {
      this.loading.set(false);
    }
  }

  game(id: string): BoardGame | undefined {
    return this.games().find((game) => game.id === id);
  }

  async addGame(input: NewBoardGame): Promise<BoardGame> {
    const library = this.library();
    if (!library) throw new Error('Your library is not ready.');
    const { data, error } = await supabase.from('board_games')
      .insert({ ...input, library_id: library.id }).select('*').single();
    if (error) throw error;
    this.games.update((games) => [...games, data].sort((a, b) => a.name.localeCompare(b.name)));
    await this.loadMetadata();
    return data;
  }

  placement(gameId: string): GamePlacement | undefined {
    return this.placements()[gameId];
  }

  async moveGame(gameId: string, box: number | null, index?: number): Promise<void> {
    const previous = this.games();
    const previousPlacements = this.placements();
    const targetGames = this.gamesInPlacement(box).filter((game) => game.id !== gameId);
    const insertionIndex = Math.max(0, Math.min(index ?? targetGames.length, targetGames.length));
    targetGames.splice(insertionIndex, 0, this.game(gameId)!);
    const nextPlacements = { ...previousPlacements };
    targetGames.forEach((game, sortOrder) => {
      nextPlacements[game.id] = {
        ...(nextPlacements[game.id] ?? this.newPlacement(game.id)),
        container_box_id: box,
        sort_order: sortOrder,
      };
    });

    this.games.update((games) => games.map((game) => game.id === gameId ? { ...game, box } : game));
    this.placements.set(nextPlacements);

    const { error } = await supabase.from('game_placements')
      .upsert(targetGames.map((game, sortOrder) => ({
        game_id: game.id,
        container_box_id: box,
        sort_order: sortOrder,
      })), { onConflict: 'game_id' });
    if (error) {
      this.games.set(previous);
      this.placements.set(previousPlacements);
      throw error;
    }
  }

  async setBoxLayoutDirection(boxId: number, layoutDirection: BoxLayoutDirection): Promise<void> {
    const previous = this.boxes();
    this.boxes.update((boxes) => boxes.map((box) => box.id === boxId
      ? { ...box, layout_direction: layoutDirection }
      : box));
    const { error } = await supabase.from('container_box')
      .update({ layout_direction: layoutDirection })
      .eq('id', boxId);
    if (error) {
      this.boxes.set(previous);
      throw error;
    }
  }

  async renameBox(boxId: number, label: string): Promise<void> {
    const normalized = label.trim();
    if (!normalized) throw new Error('A cube needs a name.');
    const previous = this.boxes();
    this.boxes.update((boxes) => boxes.map((box) => box.id === boxId
      ? { ...box, label: normalized, description: normalized }
      : box));
    const { error } = await supabase.from('container_box')
      .update({ label: normalized, description: normalized })
      .eq('id', boxId);
    if (error) {
      this.boxes.set(previous);
      throw error;
    }
  }

  async updateGameDimensions(
    gameId: string,
    dimensions: { width: number; height: number; depth: number },
  ): Promise<void> {
    const normalized = {
      box_width_mm: Math.round(dimensions.width),
      box_height_mm: Math.round(dimensions.height),
      box_depth_mm: Math.round(dimensions.depth),
    };
    if (Object.values(normalized).some((value) => !Number.isInteger(value) || value < 1 || value > 2_000)) {
      throw new Error('Enter whole-number dimensions between 1 and 2,000 mm.');
    }

    const previous = this.games();
    this.games.update((games) => games.map((game) => game.id === gameId ? { ...game, ...normalized } : game));
    const { error } = await supabase.from('board_games').update(normalized).eq('id', gameId);
    if (error) {
      this.games.set(previous);
      throw error;
    }
  }

  async addBox(): Promise<LibraryBox> {
    const library = this.library();
    if (!library) throw new Error('Your library is not ready.');
    const number = this.boxes().length + 1;
    const { data, error } = await supabase.from('container_box').insert({
      library_id: library.id,
      label: `Cube ${String(number).padStart(2, '0')}`,
      description: `Cube ${number}`,
      capacity: BOX_CAPACITY,
    }).select('*').single();
    if (error) throw error;
    const box = { ...data, capacity: data.capacity ?? BOX_CAPACITY };
    this.boxes.update((boxes) => [...boxes, box]);
    return box;
  }

  async removeLastBox(): Promise<void> {
    const boxes = this.boxes();
    await this.removeBox(boxes[boxes.length - 1]?.id);
  }

  async removeBox(boxId: number | undefined): Promise<void> {
    const boxes = this.boxes();
    if (boxes.length <= 1) throw new Error('Your Kallax needs at least one cube.');
    const box = boxes.find((item) => item.id === boxId);
    if (!box) throw new Error('That cube no longer exists.');

    const games = this.games().filter((game) =>
      (this.placement(game.id)?.container_box_id ?? game.box) === box.id,
    );
    const previousPlacements = this.placements();
    if (games.length) {
      const { error: unassignError } = await supabase.from('game_placements').upsert(games.map((game) => {
        const placement = this.placement(game.id) ?? this.newPlacement(game.id);
        return {
          game_id: game.id,
          container_box_id: null,
          sort_order: placement.sort_order,
        };
      }), { onConflict: 'game_id' });
      if (unassignError) throw unassignError;
    }

    const { error } = await supabase.from('container_box').delete().eq('id', box.id);
    if (error) {
      if (games.length) {
        await supabase.from('game_placements').upsert(games.map((game) => {
          const placement = previousPlacements[game.id] ?? this.newPlacement(game.id);
          return {
            game_id: game.id,
            container_box_id: placement.container_box_id,
            sort_order: placement.sort_order,
          };
        }), { onConflict: 'game_id' });
      }
      throw error;
    }

    this.games.update((current) => current.map((game) => game.box === box.id ? { ...game, box: null } : game));
    this.placements.update((current) => Object.fromEntries(Object.entries(current).map(([gameId, placement]) => [
      gameId,
      placement.container_box_id === box.id ? { ...placement, container_box_id: null } : placement,
    ])));
    this.boxes.update((current) => current.filter((item) => item.id !== box.id));
  }

  async setFavorite(gameId: string, favorite: boolean): Promise<void> {
    const previous = this.games();
    this.games.update((games) => games.map((game) => game.id === gameId ? { ...game, favorite } : game));
    const { error } = await supabase.from('board_games').update({ favorite }).eq('id', gameId);
    if (error) {
      this.games.set(previous);
      throw error;
    }
  }

  async removeGame(gameId: string): Promise<void> {
    const previous = this.games();
    const previousPlacements = this.placements();
    this.games.update((games) => games.filter((game) => game.id !== gameId));
    this.placements.update((placements) => {
      const { [gameId]: _removed, ...remaining } = placements;
      return remaining;
    });
    const { error } = await supabase.from('board_games').delete().eq('id', gameId);
    if (error) {
      this.games.set(previous);
      this.placements.set(previousPlacements);
      throw error;
    }
  }

  async restoreGame(game: BoardGame): Promise<void> {
    const { data, error } = await supabase.from('board_games').insert(game).select('*').single();
    if (error) throw error;
    this.games.update((games) => [...games, data].sort((a, b) => a.name.localeCompare(b.name)));
  }

  private gamesInPlacement(box: number | null): BoardGame[] {
    return this.games()
      .filter((game) => (this.placement(game.id)?.container_box_id ?? game.box) === box)
      .sort((left, right) => (this.placement(left.id)?.sort_order ?? 0) - (this.placement(right.id)?.sort_order ?? 0));
  }

  private newPlacement(gameId: string): GamePlacement {
    return {
      game_id: gameId,
      container_box_id: this.game(gameId)?.box ?? null,
      sort_order: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  private async ensureLibrary(session: Session): Promise<Library> {
    const { error: userError } = await supabase.from('app_users')
      .upsert({ id: session.user.id, email: session.user.email ?? null }, { onConflict: 'id' });
    if (userError) throw userError;
    const existing = await supabase.from('libraries').select('*').eq('user_id', session.user.id).maybeSingle();
    if (existing.error) throw existing.error;
    let library = existing.data;
    if (!library) {
      const created = await supabase.from('libraries')
        .insert({ user_id: session.user.id, name: 'My game library' }).select('*').single();
      if (created.error) throw created.error;
      library = created.data;
    }
    const boxes = Array.from({ length: BOX_COUNT }, (_value, index) => ({
      library_id: library.id,
      label: `Cube ${String(index + 1).padStart(2, '0')}`,
      description: `Cube ${index + 1}`,
      capacity: BOX_CAPACITY,
    }));
    const result = await supabase.from('container_box')
      .upsert(boxes, { onConflict: 'library_id,label', ignoreDuplicates: true });
    if (result.error) throw result.error;
    return library;
  }

  private async loadMetadata(): Promise<void> {
    const ids = new Map<number, string>();
    this.games().forEach((game) => {
      const id = game.bgg_id ?? getBggGameId(game.bgg_url);
      if (id) ids.set(id, game.id);
    });
    const metadata = await getBggMetadataByIds([...ids.keys()]);
    const result: Record<string, BggGameMetadata> = {};
    metadata.forEach((value, bggId) => {
      const gameId = ids.get(bggId);
      if (gameId) result[gameId] = value;
    });
    this.metadata.set(result);
  }

  private message(error: unknown): string {
    return error instanceof Error ? error.message : 'Something went wrong while loading your library.';
  }
}
