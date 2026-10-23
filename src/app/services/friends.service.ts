import { GameCatalogService } from './game-catalog.service';
import { placementForGame } from '../../entities/GamePlacement';
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
  constructor(private readonly covers: GameCoverService, private readonly catalog: GameCatalogService) {}
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

  async saveAvatar(userId: string, file: File): Promise<SocialProfile> {
    const extension = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }[file.type];
    if (!extension || file.size > 5 * 1024 * 1024) throw new Error('Choose a JPG, PNG, or WebP picture up to 5 MB.');
    const path = `${userId}/${crypto.randomUUID()}.${extension}`;
    const upload = await supabase.storage.from('profile-pictures').upload(path, file, { contentType: file.type, upsert: false });
    if (upload.error) throw upload.error;
    const url = supabase.storage.from('profile-pictures').getPublicUrl(path).data.publicUrl;
    const { data, error } = await supabase.from('social_profiles').update({ avatar_url: url })
      .eq('id', userId).select('*').single();
    if (error) throw error;
    return data;
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

  async libraries(userId: string): Promise<Tables<'libraries'>[]> {
    const { data, error } = await supabase.from('libraries').select('*').eq('user_id', userId).order('created_at').order('id');
    if (error) throw error;
    return data;
  }

  async collection(userId: string, libraryId?: string): Promise<FriendCollection> {
    let query = supabase.from('libraries').select('id, shelf_columns, shelf_rows').eq('user_id', userId);
    if (libraryId) query = query.eq('id', libraryId);
    const library = await query.order('created_at').order('id').limit(1).maybeSingle();
    if (library.error) throw library.error;
    if (!library.data) throw new Error('This collection is unavailable. You may need an approved friendship or to follow this collector.');
    const [games, boxes] = await Promise.all([
      this.catalog.collection(userId),
      supabase.from('container_box').select('*').eq('library_id', library.data.id).order('id'),
    ]);
    if (boxes.error) throw boxes.error;
    const selectedLibrary = library.data;
    const visible = games.filter(game => game.library_id === selectedLibrary.id || game.library_id === null);
    return { games: visible.map(game => this.covers.forGame(game)), boxes: boxes.data, placements: visible.map(placementForGame), columns: library.data.shelf_columns, rows: library.data.shelf_rows };
  }
}
