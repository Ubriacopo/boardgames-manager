import { DecimalPipe } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Router, RouterLink } from '@angular/router';
import { searchBggMetadataByName, type BggGameMetadata } from '../../utils/bggData';
import { LibraryService } from '../services/library.service';

@Component({
  standalone: true,
  imports: [DecimalPipe, FormsModule, MatButtonModule, MatIconModule, RouterLink],
  templateUrl: './add-game.component.html',
})
export class AddGameComponent {
  query = '';
  results: BggGameMetadata[] = [];
  error = '';
  searching = false;
  adding: number | null = null;
  private timer?: number;

  constructor(readonly library: LibraryService, private readonly router: Router) {}

  exists(id: number): boolean {
    return this.library.games().some((game) => game.bgg_id === id);
  }

  searchSoon(): void {
    if (this.timer) window.clearTimeout(this.timer);
    if (this.query.trim().length < 2) {
      this.results = [];
      return;
    }
    this.timer = window.setTimeout(() => void this.search(), 200);
  }

  async search(): Promise<void> {
    this.searching = true;
    this.error = '';
    try {
      this.results = await searchBggMetadataByName(this.query, 24);
    } catch (error) {
      this.error = error instanceof Error ? error.message : 'Search failed.';
    } finally {
      this.searching = false;
    }
  }

  async add(game: BggGameMetadata): Promise<void> {
    this.adding = game.bggId;
    try {
      await this.library.addGame({
        bgg_id: game.bggId,
        bgg_url: `https://boardgamegeek.com/boardgame/${game.bggId}`,
        name: game.name,
        release_year: game.yearPublished ?? new Date().getFullYear(),
        size: 1,
      });
      await this.router.navigate(['/library']);
    } catch (error) {
      this.error = error instanceof Error ? error.message : 'Unable to add this game.';
    } finally {
      this.adding = null;
    }
  }
}
