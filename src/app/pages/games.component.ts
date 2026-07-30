import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { getBggCatalog, type BggGameMetadata } from '../../utils/bggData';
import { LibraryService } from '../services/library.service';
import { GameListRowComponent } from '../components/game-list-row.component';

@Component({
  standalone: true,
  imports: [FormsModule, GameListRowComponent, MatButtonModule, MatIconModule],
  templateUrl: './games.component.html',
})
export class GamesComponent implements OnInit {
  readonly categories = ['All', 'Strategy', 'Family', 'Party', 'Thematic', 'Card game', 'Abstract', 'War', "Children's"];
  catalog: BggGameMetadata[] = [];
  query = '';
  category = 'All';
  sort: 'rank' | 'rating' | 'popular' | 'newest' = 'rank';
  loading = true;
  error = '';

  constructor(readonly library: LibraryService) {}

  async ngOnInit(): Promise<void> {
    try {
      this.catalog = await getBggCatalog();
    } catch (error) {
      this.error = error instanceof Error ? error.message : 'Unable to load the game catalog.';
    } finally {
      this.loading = false;
    }
  }

  results(): BggGameMetadata[] {
    const query = this.query.trim().toLowerCase();
    return this.catalog
      .filter((game) => !game.isExpansion)
      .filter((game) => this.category === 'All' || game.themes.includes(this.category))
      .filter((game) => !query || game.searchText.includes(query))
      .sort((a, b) => {
        if (this.sort === 'rating') return (b.avgRating ?? 0) - (a.avgRating ?? 0);
        if (this.sort === 'popular') return (b.usersRated ?? 0) - (a.usersRated ?? 0);
        if (this.sort === 'newest') return (b.yearPublished ?? 0) - (a.yearPublished ?? 0);
        return (a.rank ?? Number.MAX_SAFE_INTEGER) - (b.rank ?? Number.MAX_SAFE_INTEGER);
      })
      .slice(0, 100);
  }

  owned(bggId: number): boolean {
    return this.library.games().some((game) => game.bgg_id === bggId);
  }

  gameLink(game: BggGameMetadata): unknown[] {
    const owned = this.library.games().find((item) => item.bgg_id === game.bggId);
    return owned ? ['/games', owned.id] : ['/games/discover', game.bggId];
  }
}
