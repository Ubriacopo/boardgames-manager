import { DecimalPipe } from '@angular/common';
import { Component } from '@angular/core';
import { CdkDrag, CdkDragEnd } from '@angular/cdk/drag-drop';

import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { RouterLink } from '@angular/router';
import { LibraryService } from '../services/library.service';
import type { BoardGame } from '../../entities/BoardGame';

@Component({
  standalone: true,
  imports: [CdkDrag, DecimalPipe, FormsModule, MatDividerModule, MatIconModule, MatSnackBarModule, RouterLink],
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

  constructor(readonly library: LibraryService, private readonly snackBar: MatSnackBar) {}
  async favorite(game: BoardGame): Promise<void> {
    try {
      await this.library.setFavorite(game.id, true);
      this.snackBar.open(`${game.name} added to favorites`, 'Dismiss', { duration: 3000 });
    } catch (error) {
      this.snackBar.open(error instanceof Error ? error.message : 'Unable to favorite this game.', 'Dismiss');
    }
  }
  async removeFromLibrary(game: BoardGame): Promise<void> {
    try {
      await this.library.removeGame(game.id);
      const notice = this.snackBar.open(`${game.name} removed from your library`, 'Undo', { duration: 5000 });
      notice.onAction().subscribe(() => void this.library.restoreGame(game));
    } catch (error) {
      this.snackBar.open(error instanceof Error ? error.message : 'Unable to remove this game.', 'Dismiss');
    }
  }
  swipeGame(game: BoardGame, event: CdkDragEnd): void {
    const distance = event.distance.x;
    event.source.reset();
    if (distance <= -72) void this.favorite(game);
    if (distance >= 72) void this.removeFromLibrary(game);
  }
  location(boxId: number | null): string {
    return this.library.boxes().find((box) => box.id === boxId)?.description ?? 'Unassigned';
  }
}
