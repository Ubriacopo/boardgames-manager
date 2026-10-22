import { Injectable, computed, signal } from '@angular/core';
import type { Session } from '@supabase/supabase-js';
import type { BoardGame, NewBoardGame, BoxSizeSelection } from '../../entities/BoardGame';
import type { ContainerBox } from '../../entities/ContainerBox';
import type { Tables } from '../../types/database.types';
import { placementForGame, type GamePlacement } from '../../entities/GamePlacement';
import { GameCatalogService, selectionColumns } from './game-catalog.service';
import { getBggGameId, getBggMetadataByIds, type BggGameMetadata } from '../../utils/bggData';
import { GameCoverService } from './game-cover.service';
import { supabase } from '../../utils/supabase';

export type Library = Tables<'libraries'>;
export type LibraryBox = ContainerBox & { capacity: number };
export type BoxLayoutDirection = 'vertical' | 'horizontal';
const BOX_COUNT = 16;
const BOX_CAPACITY = 8;

@Injectable({ providedIn: 'root' })
export class LibraryService {
  readonly library = signal<Library | null>(null);
  private readonly storedGames = signal<BoardGame[]>([]);
  readonly games = computed(() => this.storedGames().map(game => this.covers.forGame(game)));
  readonly boxes = signal<LibraryBox[]>([]);
  readonly placements = computed<Record<string, GamePlacement>>(() => Object.fromEntries(this.games().map(game => [game.id, placementForGame(game)])));
  readonly metadata = signal<Record<string, BggGameMetadata>>({});
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly unassigned = computed(() => this.games().filter((game) => game.box === null));
  private loadedForUser: string | null = null;

  constructor(private readonly covers: GameCoverService, private readonly catalog: GameCatalogService) {}

  async load(session: Session, force = false): Promise<void> {
    if (!force && this.loadedForUser === session.user.id) return;
    this.loading.set(true);
    this.error.set(null);
    try {
      const library = await this.ensureLibrary(session);
      await this.covers.load();
      const [games, boxes] = await Promise.all([
        this.catalog.collection(library.id),
        supabase.from('container_box').select('*').eq('library_id', library.id).order('id'),
      ]);
      if (boxes.error) throw boxes.error;
      this.library.set(library);
      this.storedGames.set(games);
      this.boxes.set(boxes.data.map((box) => ({ ...box, capacity: box.capacity ?? BOX_CAPACITY })));
      this.loadedForUser = session.user.id;
      await this.loadMetadata();
    } catch (error) {
      this.error.set(this.message(error));
    } finally {
      this.loading.set(false);
    }
  }

  sideImage(game: BoardGame): string | null { return this.covers.sideForGame(game); }

  game(id: string): BoardGame | undefined {
    return this.games().find((game) => game.id === id);
  }

  async saveShelfLayout(columns: number, rows: number): Promise<void> {
    const library = this.library();
    if (!library) throw new Error('Your library is not ready.');
    const { data, error } = await supabase.from('libraries')
      .update({ shelf_columns: columns, shelf_rows: rows }).eq('id', library.id).select('*').single();
    if (error) throw error;
    this.library.set(data);
  }

  async addGame(input: NewBoardGame): Promise<BoardGame> {
    const library = this.library();
    if (!library) throw new Error('Your library is not ready.');
    const { data, error } = await supabase.from('board_games_box_association')
      .insert({ game_id: input.gameId, library_id: library.id, ...selectionColumns(input.selection) }).select('id').single();
    if (error) throw error;
    const game = await this.catalog.copy(data.id);
    this.storedGames.update(games => [...games, game].sort((a, b) => a.name.localeCompare(b.name)));
    await this.loadMetadata();
    return game;
  }

  placement(gameId: string): GamePlacement | undefined {
    return this.placements()[gameId];
  }

  async moveGame(gameId: string, box: number | null, index?: number): Promise<void> {
    const previous = this.games();
    const moving = this.game(gameId);
    if (!moving) throw new Error('This game is no longer in your collection.');
    const targetGames = this.gamesInPlacement(box).filter(game => game.id !== gameId);
    const insertionIndex = Math.max(0, Math.min(index ?? targetGames.length, targetGames.length));
    targetGames.splice(insertionIndex, 0, moving);
    const positions = new Map(targetGames.map((game, i) => [game.id, i]));
    this.storedGames.update(games => games.map(game => positions.has(game.id)
      ? { ...game, box, container_box_id: box, sort_order: positions.get(game.id)! } : game));
    const { error } = await supabase.rpc('move_collection_game', {
      p_copy_id: gameId, p_container_box_id: box, p_index: insertionIndex,
    });
    if (error) { this.storedGames.set(previous); throw error; }
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

  async updateGameBoxSize(gameId: string, selection: BoxSizeSelection): Promise<void> {
    const { error } = await supabase.from('board_games_box_association')
      .update(selectionColumns(selection)).eq('id', gameId).select('id').single();
    if (error) throw error;
    const updated = await this.catalog.copy(gameId);
    this.storedGames.update(games => games.map(game => game.id === gameId ? updated : game));
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

    // The copy's cube foreign key unassigns its games in the same transaction.
    const { error } = await supabase.from('container_box').delete().eq('id', box.id).select('id').single();
    if (error) throw error;
    this.storedGames.update(games => games.map(game => game.container_box_id === box.id
      ? { ...game, box: null, container_box_id: null } : game));
    this.boxes.update((current) => current.filter((item) => item.id !== box.id));
  }

  async setFavorite(gameId: string, favorite: boolean): Promise<void> {
    const previous = this.games();
    this.storedGames.update((games) => games.map((game) => game.id === gameId ? { ...game, favorite } : game));
    const { error } = await supabase.from('board_games_box_association').update({ favorite }).eq('id', gameId).select('id').single();
    if (error) {
      this.storedGames.set(previous);
      throw error;
    }
  }

  async removeGame(gameId: string): Promise<void> {
    const previous = this.games();
    this.storedGames.update((games) => games.filter((game) => game.id !== gameId));
    const { error } = await supabase.from('board_games_box_association').delete().eq('id', gameId).select('id').single();
    if (error) {
      this.storedGames.set(previous);
      throw error;
    }
  }

  async restoreGame(game: BoardGame): Promise<void> {
    const { error } = await supabase.from('board_games_box_association').insert(this.catalog.copyInsert(game));
    if (error) throw error;
    const restored = await this.catalog.copy(game.id);
    this.storedGames.update(games => [...games, restored].sort((a, b) => a.name.localeCompare(b.name)));
  }

  private gamesInPlacement(box: number | null): BoardGame[] {
    return this.games()
      .filter((game) => (this.placement(game.id)?.container_box_id ?? game.box) === box)
      .sort((left, right) => left.sort_order - right.sort_order || left.name.localeCompare(right.name) || left.id.localeCompare(right.id));
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
    const ids = this.games().map(game => game.bgg_id ?? getBggGameId(game.bgg_url)).filter((id): id is number => !!id);
    const metadata = await getBggMetadataByIds([...new Set(ids)]);
    const result: Record<string, BggGameMetadata> = {};
    for (const game of this.games()) {
      const bggId = game.bgg_id ?? getBggGameId(game.bgg_url);
      const value = bggId ? metadata.get(bggId) : undefined;
      if (value) result[game.id] = value;
    }
    this.metadata.set(result);
  }

  private message(error: unknown): string {
    return error instanceof Error ? error.message : 'Something went wrong while loading your library.';
  }
}
