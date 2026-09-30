import {Component, OnInit} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import {getBggMetadataByIds, getBggOverview, type BggGameMetadata} from '../../utils/bggData';
import {LibraryService} from '../services/library.service';
import {GameDetailViewComponent} from '../components/game-detail-view.component';

@Component({
    standalone: true,
    imports: [GameDetailViewComponent],
    templateUrl: './search-game-detail.component.html',
})
export class SearchGameDetailComponent implements OnInit {
    game?: BggGameMetadata;
    loading = true;
    error = '';
    adding = false;

    constructor(readonly library: LibraryService, private readonly route: ActivatedRoute, private readonly router: Router,) {
    }

    async ngOnInit(): Promise<void> {
        const bggId = Number(this.route.snapshot.paramMap.get('bggId'));
        try {
            this.game = (await getBggMetadataByIds([bggId])).get(bggId);
            if (!this.game) this.error = 'Game details were not found.';
        } catch (error) {
            this.error = error instanceof Error ? error.message : 'Unable to load game details.';
        } finally {
            this.loading = false;
        }
    }

    owned(): boolean {
        return Boolean(this.game && this.library.games().some((game) => game.bgg_id === this.game!.bggId));
    }

    back(): void {
        void this.router.navigate(['/games']);
    }

    async add(): Promise<void> {
        if (!this.game) return;
        this.adding = true;
        try {
            let imageUrl: string | null = null;
            try {
                imageUrl = (await getBggOverview(this.game.bggId)).imageUrl;
            } catch {
                // A cover is optional; adding a game must still work when BGG is unavailable.
            }
            await this.library.addGame({
                bgg_id: this.game.bggId,
                bgg_url: `https://boardgamegeek.com/boardgame/${this.game.bggId}`,
                name: this.game.name,
                release_year: this.game.yearPublished ?? new Date().getFullYear(),
                size: 1,
                image_url: imageUrl,
            });
            await this.router.navigate(['/library']);
        } catch (error) {
            this.error = error instanceof Error ? error.message : 'Unable to add this game.';
        } finally {
            this.adding = false;
        }
    }
}
