import { Component } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { LibraryService } from '../services/library.service';
import { GameCardComponent } from '../components/game-card.component';
import type { BoardGame } from '../../entities/BoardGame';

@Component({
  standalone: true,
  imports: [FormsModule, MatIconModule, GameCardComponent],
  templateUrl: './games.component.html',
})
export class GamesComponent {
  query = '';
  sort = 'name';
  filtered(): BoardGame[] {
    const query = this.query.trim().toLowerCase();
    const metadata = this.library.metadata();
    return this.library.games().filter((game) => {
      const meta = metadata[game.id];
      return !query || [game.name, game.release_year, ...(meta?.themes ?? [])].join(' ').toLowerCase().includes(query);
    }).sort((a, b) => {
      if (this.sort === 'newest') return b.release_year - a.release_year;
      if (this.sort === 'rating') return (metadata[b.id]?.avgRating ?? 0) - (metadata[a.id]?.avgRating ?? 0);
      return a.name.localeCompare(b.name);
    });
  }

  constructor(readonly library: LibraryService) {}
  location(boxId: number | null): string {
    return this.library.boxes().find((box) => box.id === boxId)?.description ?? 'Unassigned';
  }
}
