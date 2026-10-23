import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { GameCatalogService } from '../services/game-catalog.service';
import {CollectionAddService} from '../services/collection-add.service';
import {Component, OnInit, signal} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import {getBggMetadataByIds, getBggOverview, type BggGameMetadata} from '../../utils/bggData';
import {LibraryService} from '../services/library.service';
import {GameDetailViewComponent} from '../components/game-detail-view.component';

@Component({
    standalone: true,
    imports: [GameDetailViewComponent, MatDialogModule],
    templateUrl: './search-game-detail.component.html',
})
export class SearchGameDetailComponent implements OnInit {
    game?: BggGameMetadata;
    readonly loading = signal(true);
    error = '';
    readonly adding = signal(false);

    constructor(readonly library: LibraryService, private readonly route: ActivatedRoute, private readonly router: Router, private readonly catalog: GameCatalogService, private readonly collectionAdd: CollectionAddService) {
    }

    async ngOnInit(): Promise<void> {
        const bggId = Number(this.route.snapshot.paramMap.get('bggId'));
        try {
            this.game = (await getBggMetadataByIds([bggId])).get(bggId);
            if (!this.game) this.error = 'Game details were not found.';
        } catch (error) {
            this.error = error instanceof Error ? error.message : 'Unable to load game details.';
        } finally {
            this.loading.set(false);
        }
    }

    owned(): boolean {
        return Boolean(this.game && this.library.games().some((game) => game.bgg_id === this.game!.bggId));
    }

    back(): void {
        void this.router.navigate(['/games']);
    }

    async add(special = false): Promise<void> {
        if (!this.game || this.adding()) return;
        this.error = '';
        this.adding.set(true);
        try {
            let imageUrl: string | null = null;
            try {
                imageUrl = (await getBggOverview(this.game.bggId)).imageUrl;
            } catch {
                // A cover is optional; adding a game must still work when BGG is unavailable.
            }
            const definition = await this.catalog.ensureGame({
                bgg_id: this.game.bggId,
                bgg_url: `https://boardgamegeek.com/boardgame/${this.game.bggId}`,
                name: this.game.name,
                release_year: this.game.yearPublished ?? new Date().getFullYear(),
                image_url: imageUrl,
            });
            const copy = await this.collectionAdd.add(definition, special);
            if (copy) await this.router.navigate(['/games', copy.id]);
        } catch (error) {
            this.error = error instanceof Error ? error.message : 'Unable to add this game.';
        } finally {
            this.adding.set(false);
        }
    }
}
