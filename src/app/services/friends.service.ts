import { Injectable } from '@angular/core';
import { validateHandle } from '../../utils/handles';
import { GameCoverService } from './game-cover.service';
import { supabase } from '../../utils/supabase';
import type { Tables } from '../../types/database.types';
import type { BoardGame } from '../../entities/BoardGame';
import type { ContainerBox } from '../../entities/ContainerBox';
import type { GamePlacement } from '../../entities/GamePlacement';

export type SocialProfile = Tables<'social_profiles'>;
export type Connection = Tables<'social_connections'>;
export type FriendCollection = { games: BoardGame[]; boxes: ContainerBox[]; placements: GamePlacement[]; columns: number | null; rows: number | null };

@Injectable({ providedIn: 'root' })
export class FriendsService {
  constructor(private readonly covers: GameCoverService) {}
  async ensureProfile(userId: string): Promise<SocialProfile> {
    // ignoreDuplicates avoids overwriting a collector's chosen identity/settings.
    const result = await supabase.from('social_profiles').upsert({
      id: userId, handle: `player.${userId.replaceAll('-', '')}`, display_name: 'Board game collector',
    }, { onConflict: 'id', ignoreDuplicates: true }).abortSignal(AbortSignal.timeout(15000));
    if (result.error) throw result.error;
    return this.profile(userId);
  }

  async profile(userId: string): Promise<SocialProfile> {
    const { data, error } = await supabase.from('social_profiles').select('*').eq('id', userId).abortSignal(AbortSignal.timeout(15000)).single();
    if (error) throw error;
    return data;
  }

  async saveProfile(userId: string, handle: string, displayName: string, mode: SocialProfile['connection_mode']): Promise<void> {
    handle = validateHandle(handle);
    if (!displayName.trim() || displayName.trim().length > 80) {
      throw new Error('Choose a display name between 1 and 80 characters.');
    }
    const { error } = await supabase.from('social_profiles').update({
      handle, display_name: displayName.trim(), connection_mode: mode,
    }).eq('id', userId).select('id').single();
    if (error) throw error;
  }

  async saveConnectionMode(userId: string, connectionMode: SocialProfile['connection_mode']): Promise<void> {
    const { error } = await supabase.from('social_profiles').update({ connection_mode: connectionMode })
      .eq('id', userId).select('id').single();
    if (error) throw error;
  }

  async connections(userId: string): Promise<Connection[]> {
    const { data, error } = await supabase.from('social_connections').select('*')
      .or(`requester_id.eq.${userId},recipient_id.eq.${userId}`).order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  }

  async profiles(ids: string[]): Promise<SocialProfile[]> {
    if (!ids.length) return [];
    const { data, error } = await supabase.from('social_profiles').select('*').in('id', ids);
    if (error) throw error;
    return data;
  }

  async search(query: string, userId: string): Promise<SocialProfile[]> {
    const handle = query.trim().toLowerCase().replace(/^@/, '');
    if (handle.length < 2 || handle.length > 40) return [];
    const { data, error } = await supabase.rpc('search_collectors', { query: handle });
    if (error) throw error;
    return data.filter(profile => profile.id !== userId);
  }

  async connect(userId: string, profile: SocialProfile): Promise<void> {
    const follow = profile.connection_mode === 'follow';
    const { error } = await supabase.from('social_connections').insert({
      requester_id: userId, recipient_id: profile.id,
      kind: follow ? 'follow' : 'friend', status: follow ? 'accepted' : 'pending',
    });
    if (error) throw error;
  }

  async accept(id: string): Promise<void> {
    const { error } = await supabase.from('social_connections').update({ status: 'accepted' }).eq('id', id).select('id').single();
    if (error) throw error;
  }

  async remove(id: string): Promise<void> {
    const { error } = await supabase.from('social_connections').delete().eq('id', id).select('id').single();
    if (error) throw error;
  }

  async collection(userId: string): Promise<FriendCollection> {
    const library = await supabase.from('libraries').select('id, shelf_columns, shelf_rows').eq('user_id', userId).maybeSingle();
    if (library.error) throw library.error;
    if (!library.data) throw new Error('This collection is unavailable. You may need an approved friendship or to follow this collector.');
    const [games, boxes] = await Promise.all([
      supabase.from('board_games').select('*').eq('library_id', library.data.id).order('name'),
      supabase.from('container_box').select('*').eq('library_id', library.data.id).order('id'),
    ]);
    if (games.error) throw games.error;
    if (boxes.error) throw boxes.error;
    const placements = games.data.length
      ? await supabase.from('game_placements').select('*').in('game_id', games.data.map(game => game.id))
      : { data: [], error: null };
    if (placements.error) throw placements.error;
    return { games: games.data.map(game => this.covers.forGame(game)), boxes: boxes.data, placements: placements.data ?? [], columns: library.data.shelf_columns, rows: library.data.shelf_rows };
  }
}
