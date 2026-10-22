import { Injectable, signal } from '@angular/core';
import { supabase } from '../../utils/supabase';
import { getBggGameId } from '../../utils/bggData';
import type { BoardGame } from '../../entities/BoardGame';

@Injectable({ providedIn: 'root' })
export class GameCoverService {
  readonly urls = signal<Partial<Record<number, string>>>({});

  async load(): Promise<void> {
    const urls: Record<number, string> = {};
    for (let from = 0; ; from += 500) {
      const { data, error } = await supabase.from('game_covers').select('bgg_id, image_url')
        .order('bgg_id').range(from, from + 499).abortSignal(AbortSignal.timeout(15000));
      if (error) throw error;
      data.forEach(cover => urls[cover.bgg_id] = cover.image_url);
      if (data.length < 500) break;
    }
    this.urls.set(urls);
  }

  forGame(game: BoardGame): BoardGame {
    const id = game.bgg_id ?? getBggGameId(game.bgg_url);
    const url = id ? this.urls()[id] : undefined;
    return url ? { ...game, image_url: url } : game;
  }

  async save(bggId: number, value: string, file: File | null): Promise<void> {
    if (!Number.isSafeInteger(bggId) || bggId <= 0) throw new Error('A BoardGameGeek game ID is required to edit this cover.');
    let url = value.trim();
    if (file) {
      const extension = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }[file.type];
      if (!extension || file.size > 5 * 1024 * 1024) throw new Error('Choose a JPG, PNG, or WebP image up to 5 MB.');
      const path = `${bggId}/${crypto.randomUUID()}.${extension}`;
      const { error } = await supabase.storage.from('game-covers').upload(path, file, { contentType: file.type, upsert: false });
      if (error) throw error;
      url = supabase.storage.from('game-covers').getPublicUrl(path).data.publicUrl;
    }
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== 'https:' || parsed.username || parsed.password) throw new Error();
    } catch { throw new Error('Enter a valid HTTPS image URL or choose an image to upload.'); }
    const { data, error } = await supabase.from('game_covers').upsert({
      bgg_id: bggId, image_url: url, updated_at: new Date().toISOString(),
    }).select('bgg_id, image_url').single();
    if (error) throw error;
    this.urls.update(urls => ({ ...urls, [data.bgg_id]: data.image_url }));
  }
}
