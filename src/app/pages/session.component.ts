import {Component, OnInit} from '@angular/core';

import {ActivatedRoute} from '@angular/router';
import {MatButtonModule} from '@angular/material/button';
import {MatIconModule} from '@angular/material/icon';
import {VotingLobby, VotingSessionService} from '../services/voting-session.service';

@Component({
    standalone: true,
    imports: [MatButtonModule, MatIconModule],
    templateUrl: './session.component.html',
})
export class SessionComponent implements OnInit {
    lobby?: VotingLobby;
    error = '';
    copied = false;
    myVote: string | null = null;
    private voterId = '';

    constructor(private readonly sessions: VotingSessionService, private readonly route: ActivatedRoute) {
    }

    async ngOnInit(): Promise<void> {
        this.voterId = localStorage.getItem('meeple-voter-id') ?? crypto.randomUUID();
        localStorage.setItem('meeple-voter-id', this.voterId);
        try {
            this.lobby = await this.sessions.get(this.route.snapshot.paramMap.get('code') ?? '');
            this.myVote = localStorage.getItem(`meeple-vote-${this.lobby.code}`);
        } catch {
            this.error = 'This lobby could not be found.';
        }
    }

    count(gameId: string): number {
        return this.lobby?.session_votes.filter((vote) => vote.game_id === gameId).length ?? 0;
    }

    async vote(gameId: string): Promise<void> {
        if (!this.lobby) return;
        await this.sessions.vote(this.lobby.id, gameId, this.voterId);
        this.myVote = gameId;
        localStorage.setItem(`meeple-vote-${this.lobby.code}`, gameId);
        this.lobby = await this.sessions.get(this.lobby.code);
    }

    async share(): Promise<void> {
        await navigator.clipboard.writeText(location.href);
        this.copied = true;
        window.setTimeout(() => this.copied = false, 1800);
    }
}
