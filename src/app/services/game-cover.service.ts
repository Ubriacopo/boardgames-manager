import { Injectable, signal } from '@angular/core';
import { supabase } from '../../utils/supabase';
import { getBggGameId } from '../../utils/bggData';
import type { BoardGame } from '../../entities/BoardGame';

export type ArtworkKind = 'cover' | 'wallpaper' | 'logo' | 'box-side';
const ARTWORK_TABLES = {
  cover: 'game_covers', wallpaper: 'game_wallpapers', logo: 'game_logos', 'box-side': 'game_box_sides',
} as const;
type ArtworkTable = typeof ARTWORK_TABLES[ArtworkKind];

@Injectable({ providedIn: 'root' })
export class GameCoverService {
  readonly urls = signal<Partial<Record<number, string>>>({});

  readonly wallpapers = signal<Partial<Record<number, string>>>({});

  readonly logos = signal<Partial<Record<number, string>>>({});
  readonly boxSides = signal<Partial<Record<number, string>>>({});

  async load(): Promise<void> {
    const [covers, wallpapers, logos, boxSides] = await Promise.all([
      this.loadArtwork('game_covers'), this.loadArtwork('game_wallpapers'),
      this.loadArtwork('game_logos'), this.loadArtwork('game_box_sides'),
    ]);
    this.urls.set(covers);
    this.wallpapers.set(wallpapers);
    this.logos.set(logos);
    this.boxSides.set(boxSides);
  }

  private async loadArtwork(table: ArtworkTable): Promise<Record<number, string>> {
    const urls: Record<number, string> = {};
    for (let from = 0; ; from += 500) {
      const { data, error } = await supabase.from(table).select('bgg_id, image_url')
        .order('bgg_id').range(from, from + 499).abortSignal(AbortSignal.timeout(15000));
      if (error) throw error;
      data.forEach(cover => urls[cover.bgg_id] = cover.image_url);
      if (data.length < 500) break;
    }
    return urls;
  }

  forGame(game: BoardGame): BoardGame {
    const id = game.bgg_id ?? getBggGameId(game.bgg_url);
    const url = id ? this.urls()[id] : undefined;
    return url ? { ...game, image_url: url } : game;
  }

  sideForGame(game: BoardGame): string | null {
    const id = game.bgg_id ?? getBggGameId(game.bgg_url);
    if (!id) return game.image_url ?? null;
    return this.boxSides()[id] ?? this.wallpapers()[id] ?? this.urls()[id] ?? game.image_url ?? null;
  }

  async save(bggId: number, value: string, file: File | null, kind: ArtworkKind = 'cover'): Promise<void> {
    if (!Number.isSafeInteger(bggId) || bggId <= 0) throw new Error('A BoardGameGeek game ID is required to edit this artwork.');
    let url = value.trim();
    if (file) {
      const extension = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }[file.type];
      if (!extension || file.size > 5 * 1024 * 1024) throw new Error('Choose a JPG, PNG, or WebP image up to 5 MB.');
      const path = `${bggId}/${kind}/${crypto.randomUUID()}.${extension}`;
      const { error } = await supabase.storage.from('game-covers').upload(path, file, { contentType: file.type, upsert: false });
      if (error) throw error;
      url = supabase.storage.from('game-covers').getPublicUrl(path).data.publicUrl;
    }
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== 'https:' || parsed.username || parsed.password) throw new Error();
    } catch { throw new Error('Enter a valid HTTPS image URL or choose an image to upload.'); }
    const table = ARTWORK_TABLES[kind];
    const { data, error } = await supabase.from(table).upsert({
      bgg_id: bggId, image_url: url, updated_at: new Date().toISOString(),
    }).select('bgg_id, image_url').single();
    if (error) throw error;
    const images = { cover: this.urls, wallpaper: this.wallpapers, logo: this.logos, 'box-side': this.boxSides }[kind];
    images.update(urls => ({ ...urls, [data.bgg_id]: data.image_url }));
  }
}
