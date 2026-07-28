import { Injectable, computed, signal } from '@angular/core';
import type { Session } from '@supabase/supabase-js';
import type { BoardGame, NewBoardGame } from '../../entities/BoardGame';
import type { ContainerBox } from '../../entities/ContainerBox';
import { getBggGameId, getBggMetadataByIds, type BggGameMetadata } from '../../utils/bggData';
import { supabase } from '../../utils/supabase';

export type Library = { id: string; user_id: string; name: string; created_at: string };
export type LibraryBox = ContainerBox & { capacity: number };
const BOX_COUNT = 16;
const BOX_CAPACITY = 8;

@Injectable({ providedIn: 'root' })
export class LibraryService {
  readonly library = signal<Library | null>(null);
  readonly games = signal<BoardGame[]>([]);
  readonly boxes = signal<LibraryBox[]>([]);
  readonly metadata = signal<Record<string, BggGameMetadata>>({});
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly addDialogOpen = signal(false);
  readonly unassigned = computed(() => this.games().filter((game) => game.box === null));
  private loadedForUser: string | null = null;

  async load(session: Session, force = false): Promise<void> {
    if (!force && this.loadedForUser === session.user.id) return;
    this.loading.set(true);
    this.error.set(null);
    try {
      const library = await this.ensureLibrary(session);
      const [games, boxes] = await Promise.all([
        supabase.from('board_games').select('*').eq('library_id', library.id).order('name'),
        supabase.from('container_box').select('*').eq('library_id', library.id).order('id'),
      ]);
      if (games.error) throw games.error;
      if (boxes.error) throw boxes.error;
      this.library.set(library);
      this.games.set(games.data);
      this.boxes.set(boxes.data.map((box) => ({ ...box, capacity: box.capacity ?? BOX_CAPACITY })));
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

  async moveGame(gameId: string, box: number | null): Promise<void> {
    const previous = this.games();
    this.games.update((games) => games.map((game) => game.id === gameId ? { ...game, box } : game));
    const { error } = await supabase.from('board_games').update({ box }).eq('id', gameId);
    if (error) {
      this.games.set(previous);
      throw error;
    }
  }

  async removeGame(gameId: string): Promise<void> {
    const previous = this.games();
    this.games.update((games) => games.filter((game) => game.id !== gameId));
    const { error } = await supabase.from('board_games').delete().eq('id', gameId);
    if (error) {
      this.games.set(previous);
      throw error;
    }
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
