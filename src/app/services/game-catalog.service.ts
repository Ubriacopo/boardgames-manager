import { Injectable, computed, inject, signal } from '@angular/core';
import type { BoardGame, BoxDimensions, BoxSizeSelection, GameBoxSize, GameDefinition } from '../../entities/BoardGame';
import type { TablesInsert, TablesUpdate } from '../../types/database.types';
import { supabase } from '../../utils/supabase';
import { AuthService } from './auth.service';
import type { BggGameMetadata } from '../../utils/bggData';

const collectionSelect = '*, game:games!board_games_box_association_game_id_fkey(*), box_size:game_box_sizes!association_size_game_fkey(*)' as const;
export const estimatedDimensions: BoxDimensions = { width: 50, height: 200, depth: 100 };
export type EditableGameProperties = Pick<GameDefinition, 'name' | 'release_year' | 'image_url' | 'default_box_size_id'>;

export function validateDimensions(dimensions: BoxDimensions): void {
  if (Object.values(dimensions).some(value => !Number.isInteger(value) || value < 1 || value > 2000)) {
    throw new Error('Enter whole-number dimensions between 1 and 2,000 mm.');
  }
}
export function selectionColumns(selection: BoxSizeSelection): TablesUpdate<'board_games_box_association'> {
  const d = selection.customDimensions;
  if (d) validateDimensions(d);
  if (!selection.sizeId && !d) throw new Error('Choose a box-size variant or enter custom dimensions.');
  return { game_box_size_id: selection.sizeId, custom_width_mm: d?.width ?? null,
    custom_height_mm: d?.height ?? null, custom_depth_mm: d?.depth ?? null };
}

@Injectable({ providedIn: 'root' })
export class GameCatalogService {
  private readonly auth = inject(AuthService);
  private readonly definitions = signal<Record<string, GameDefinition>>({});
  private readonly definitionsByBggId = computed<Partial<Record<number, GameDefinition>>>(() =>
    Object.fromEntries(Object.values(this.definitions()).filter(game => game.bgg_id !== null)
      .map(game => [game.bgg_id, game])));

  definitionFor(gameId: string, bggId: number): GameDefinition | undefined {
    const definitions = this.definitions();
    return definitions[gameId] ?? this.definitionsByBggId()[bggId];
  }

  metadataFor(game: BggGameMetadata): BggGameMetadata {
    const definition = this.definitionsByBggId()[game.bggId];
    return definition ? {...game, name: definition.name, yearPublished: definition.release_year,
      searchText: `${game.searchText} ${definition.name}`} : game;
  }

  async loadDefinitions(): Promise<void> {
    const definitions: Record<string, GameDefinition> = {};
    for (let from = 0; ; from += 500) {
      const {data, error} = await supabase.from('games').select('*').order('id').range(from, from + 499)
        .abortSignal(AbortSignal.timeout(15000));
      if (error) throw error;
      for (const game of data) definitions[game.id] = game;
      if (data.length < 500) break;
    }
    this.definitions.set(definitions);
  }

  async findDefinition(gameId: string, bggId: number): Promise<GameDefinition | null> {
    if (!gameId && !bggId) return null;
    const query = supabase.from('games').select('*');
    const {data, error} = await (gameId ? query.eq('id', gameId) : query.eq('bgg_id', bggId))
      .abortSignal(AbortSignal.timeout(15000)).maybeSingle();
    if (error) throw error;
    if (data) this.rememberDefinition(data);
    return data;
  }

  private rememberDefinition(game: GameDefinition): GameDefinition {
    this.definitions.update(definitions => ({...definitions, [game.id]: game}));
    return game;
  }

  forGame(game: BoardGame): BoardGame {
    const definition = this.definitionFor(game.game_id, game.bgg_id ?? 0);
    return definition ? {...game, name: definition.name, release_year: definition.release_year,
      bgg_id: definition.bgg_id, bgg_url: definition.bgg_url, image_url: definition.image_url} : game;
  }

  async saveDefinition(identity: Pick<GameDefinition, 'bgg_id' | 'bgg_url'> & {id?: string}, properties: EditableGameProperties): Promise<GameDefinition> {
    if (!this.auth.isAdmin()) throw new Error('Only administrators can edit shared game details.');
    const name = properties.name.trim();
    if (!name || name.length > 300) throw new Error('Enter a game name of up to 300 characters.');
    if (!Number.isInteger(properties.release_year) || properties.release_year < 1800 || properties.release_year > 2200) {
      throw new Error('Enter a whole-number release year between 1800 and 2200.');
    }
    const imageUrl = properties.image_url?.trim() || null;
    if (imageUrl) {
      try {
        const url = new URL(imageUrl);
        if (url.protocol !== 'https:' || url.username || url.password) throw new Error();
      } catch { throw new Error('Enter a valid HTTPS fallback cover URL.'); }
    }
    const changes: EditableGameProperties = {...properties, name, image_url: imageUrl};
    const id = identity.id ?? (await this.ensureGame({...identity, name,
      release_year: changes.release_year, image_url: imageUrl})).id;
    const {data, error} = await supabase.from('games').update(changes).eq('id', id)
      .select('*').abortSignal(AbortSignal.timeout(15000)).single();
    if (error) throw error;
    return this.rememberDefinition(data);
  }

  async formatStatus(gameId: string): Promise<{defaultId: string | null; adminId: string | null; ownVote: string | null; votes: Record<string, number>}> {
    const [resolved, game, votes, session] = await Promise.all([
      supabase.rpc('default_game_box_size', {p_game_id: gameId}),
      supabase.from('games').select('default_box_size_id').eq('id', gameId).single(),
      supabase.from('game_box_size_votes').select('*').eq('game_id', gameId),
      supabase.auth.getSession(),
    ]);
    if (resolved.error) throw resolved.error;
    if (game.error) throw game.error;
    if (votes.error) throw votes.error;
    const counts: Record<string, number> = {};
    for (const vote of votes.data) counts[vote.size_id] = (counts[vote.size_id] ?? 0) + 1;
    return {defaultId: resolved.data, adminId: game.data.default_box_size_id,
      ownVote: votes.data.find(vote => vote.user_id === session.data.session?.user.id)?.size_id ?? null, votes: counts};
  }

  async voteFormat(gameId: string, sizeId: string | null): Promise<void> {
    const {data} = await supabase.auth.getSession();
    const userId = data.session?.user.id;
    if (!userId) throw new Error('Sign in to vote.');
    const result = sizeId
      ? await supabase.from('game_box_size_votes').upsert({game_id: gameId, size_id: sizeId, user_id: userId}, {onConflict: 'game_id,user_id'})
      : await supabase.from('game_box_size_votes').delete().eq('game_id', gameId).eq('user_id', userId);
    if (result.error) throw result.error;
  }

  async setDefaultFormat(gameId: string, sizeId: string | null): Promise<void> {
    const {data, error} = await supabase.from('games').update({default_box_size_id: sizeId}).eq('id', gameId).select('*').single();
    if (error) throw error;
    this.rememberDefinition(data);
  }

  async ensureGame(input: Pick<GameDefinition, 'bgg_id' | 'bgg_url' | 'name' | 'release_year' | 'image_url'>): Promise<GameDefinition> {
    const lookup = () => input.bgg_id
      ? supabase.from('games').select('*').eq('bgg_id', input.bgg_id).maybeSingle()
      : supabase.from('games').select('*').eq('bgg_url', input.bgg_url).maybeSingle();
    const existing = await lookup();
    if (existing.error) throw existing.error;
    if (existing.data) return this.rememberDefinition(existing.data);
    const added = await supabase.from('games').insert(input).select('*').single();
    // Another collector may have created this same definition concurrently.
    if (added.error?.code === '23505') {
      const retry = await lookup();
      if (retry.error) throw retry.error;
      if (retry.data) return this.rememberDefinition(retry.data);
    }
    if (added.error) throw added.error;
    return this.rememberDefinition(added.data!);
  }

  async sizes(gameId: string): Promise<GameBoxSize[]> {
    const { data, error } = await supabase.from('game_box_sizes').select('*').eq('game_id', gameId).order('label').order('country')
      .abortSignal(AbortSignal.timeout(15000));
    if (error) throw error;
    return data;
  }

  async publishSize(gameId: string, label: string, country: string, dimensions: BoxDimensions): Promise<GameBoxSize> {
    validateDimensions(dimensions);
    const name = label.trim();
    if (!name || name.length > 120 || country.trim().length > 80) throw new Error('Enter an edition name (up to 120 characters) and country (up to 80).');
    const { data, error } = await supabase.from('game_box_sizes').insert({ game_id: gameId, label: name,
      country: country.trim(), width_mm: dimensions.width, height_mm: dimensions.height, depth_mm: dimensions.depth }).select('*').single();
    if (error?.code === '23505') throw new Error('This edition and size already exist. Choose it from the list.');
    if (error) throw error;
    return data;
  }

  async collection(ownerId: string): Promise<BoardGame[]> {
    const { data, error } = await supabase.from('board_games_box_association').select(collectionSelect).eq('user_id', ownerId);
    if (error) throw error;
    this.definitions.update(definitions => ({...definitions,
      ...Object.fromEntries(data.map(({game}) => [game.id, game]))}));
    return data.map(({ game, box_size, ...copy }) => ({
      ...game, ...copy, box: copy.container_box_id, size: copy.capacity_units,
      box_width_mm: copy.custom_width_mm ?? box_size?.width_mm ?? estimatedDimensions.width,
      box_height_mm: copy.custom_height_mm ?? box_size?.height_mm ?? estimatedDimensions.height,
      box_depth_mm: copy.custom_depth_mm ?? box_size?.depth_mm ?? estimatedDimensions.depth,
      box_size_label: box_size ? `${box_size.label}${box_size.country ? ' · ' + box_size.country : ''}` : null,
    })).sort((a, b) => a.name.localeCompare(b.name));
  }

  async copy(id: string): Promise<BoardGame> {
    const result = await supabase.from('board_games_box_association').select('user_id').eq('id', id).single();
    if (result.error) throw result.error;
    if (!result.data.user_id) throw new Error('This copy has no known owner.');
    const copy = (await this.collection(result.data.user_id)).find(game => game.id === id);
    if (!copy) throw new Error('This copy is no longer in your collection.');
    return copy;
  }

  copyInsert(game: BoardGame): TablesInsert<'board_games_box_association'> {
    return { id: game.id, game_id: game.game_id, user_id: game.user_id, library_id: game.library_id,
      container_box_id: game.container_box_id, game_box_size_id: game.game_box_size_id,
      custom_width_mm: game.custom_width_mm, custom_height_mm: game.custom_height_mm, custom_depth_mm: game.custom_depth_mm,
      box_face: game.box_face, capacity_units: game.capacity_units, favorite: game.favorite, sort_order: game.sort_order, created_at: game.created_at };
  }
}
