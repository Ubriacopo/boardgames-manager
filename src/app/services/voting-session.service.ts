import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import type { BoardGame } from '../../entities/BoardGame';
import { supabase } from '../../utils/supabase';

export type VotingGame = { id: string; name: string; image_url: string | null; release_year: number };
export type VotingLobby = {
  id: string; code: string; title: string; status: string; expires_at: string;
  session_games: Array<{ game_id: string; game_snapshot: VotingGame }>;
  session_votes: Array<{ game_id: string }>;
};

@Injectable({ providedIn: 'root' })
export class VotingSessionService {
  constructor(private readonly router: Router) {}

  async createAndOpen(games: BoardGame[]): Promise<void> {
    const code = crypto.randomUUID().replaceAll('-', '').slice(0, 8).toUpperCase();
    const client = supabase as any;
    const { data: session, error } = await client.from('voting_sessions')
      .insert({ code, title: 'What should we play?' }).select('*').single();
    if (error) throw error;
    const rows = games.map((game) => ({
      session_id: session.id,
      game_id: game.id,
      game_snapshot: {
        id: game.id, name: game.name, image_url: game.image_url ?? null, release_year: game.release_year,
      },
    }));
    const result = await client.from('session_games').insert(rows);
    if (result.error) throw result.error;
    await this.router.navigate(['/session', code]);
  }

  async get(code: string): Promise<VotingLobby> {
    const { data, error } = await (supabase as any).from('voting_sessions')
      .select('id,code,title,status,expires_at,session_games(game_id,game_snapshot),session_votes(game_id)')
      .eq('code', code.toUpperCase()).single();
    if (error) throw error;
    return data as unknown as VotingLobby;
  }

  async vote(sessionId: string, gameId: string, voterId: string): Promise<void> {
    const { error } = await (supabase as any).from('session_votes')
      .upsert({ session_id: sessionId, game_id: gameId, voter_id: voterId }, { onConflict: 'session_id,voter_id' });
    if (error) throw error;
  }
}
