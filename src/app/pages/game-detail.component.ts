import type { BoardGame, BoxDimensions, BoxSizeSelection } from '../../entities/BoardGame';
import {Component, OnInit, signal} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import {MatIconModule} from '@angular/material/icon';
import {LibraryService} from '../services/library.service';
import {GameDetailViewComponent} from '../components/game-detail-view.component';

@Component({
    standalone: true,
    imports: [GameDetailViewComponent, MatIconModule],
    templateUrl: './game-detail.component.html',
})
export class GameDetailComponent implements OnInit {
    gameId = '';
    readonly savingDimensions = signal(false);
    readonly dimensionsError = signal('');

    constructor(readonly library: LibraryService, private readonly route: ActivatedRoute, private readonly router: Router,) {
    }

    ngOnInit(): void {
        this.gameId = this.route.snapshot.paramMap.get('id') ?? '';
    }

    private dimensionsKey = '';
    private dimensionsValue: BoxDimensions | null = null;
    customDimensions(game: BoardGame): BoxDimensions | null {
        const key = `${game.id}:${game.custom_width_mm}:${game.custom_height_mm}:${game.custom_depth_mm}`;
        if (key !== this.dimensionsKey) {
            this.dimensionsKey = key;
            this.dimensionsValue = game.custom_width_mm !== null && game.custom_height_mm !== null && game.custom_depth_mm !== null
                ? { width: game.custom_width_mm, height: game.custom_height_mm, depth: game.custom_depth_mm } : null;
        }
        return this.dimensionsValue;
    }

    location(boxId: number | null): string {
        return this.library.boxes().find((box) => box.id === boxId)?.description ?? 'Unassigned';
    }

    back(): void {
        void this.router.navigate(['/library'], {queryParams: {tab: 'collection'}});
    }

    async saveBoxSize(selection: BoxSizeSelection): Promise<void> {
        this.dimensionsError.set('');
        this.savingDimensions.set(true);
        try {
            await this.library.updateGameBoxSize(this.gameId, selection);
        } catch (error) {
            this.dimensionsError.set(error && typeof error === 'object' && 'message' in error ? String(error.message) : 'Unable to save box size.');
        } finally {
            this.savingDimensions.set(false);
        }
    }
}
