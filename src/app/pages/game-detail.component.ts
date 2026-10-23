import type { BoardGame, BoxDimensions, BoxSizeSelection } from '../../entities/BoardGame';
import {Component, DestroyRef, inject, OnInit, signal} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {ActivatedRoute, Router} from '@angular/router';
import {MatIconModule} from '@angular/material/icon';
import {LibraryService} from '../services/library.service';
import {GameDetailViewComponent} from '../components/game-detail-view.component';
import {MatDialog, MatDialogModule} from '@angular/material/dialog';
import {CollectionAddService} from '../services/collection-add.service';

@Component({
    standalone: true,
    imports: [GameDetailViewComponent, MatIconModule, MatDialogModule],
    templateUrl: './game-detail.component.html',
})
export class GameDetailComponent implements OnInit {
    gameId = '';
    readonly savingDimensions = signal(false);
    readonly dimensionsError = signal('');
    readonly addingCopy = signal(false);
    readonly addError = signal('');
    private readonly destroyRef = inject(DestroyRef);

    constructor(readonly library: LibraryService, private readonly route: ActivatedRoute, private readonly router: Router, private readonly collectionAdd: CollectionAddService) {
    }

    ngOnInit(): void {
        this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(params => {
            this.gameId = params.get('id') ?? '';
        });
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
        return this.library.location(boxId);
    }

    back(): void {
        void this.router.navigate(['/library']);
    }

    async addCopy(special = false): Promise<void> {
        const game = this.library.game(this.gameId);
        if (!game || this.addingCopy()) return;
        this.addingCopy.set(true);
        this.addError.set('');
        try {
            const copy = await this.collectionAdd.add({id: game.game_id, name: game.name}, special);
            if (copy) {
                await this.router.navigate(['/games', copy.id]);
                this.gameId = copy.id;
            }
        } catch (error) {
            this.addError.set(error && typeof error === 'object' && 'message' in error ? String(error.message) : 'Unable to add this copy.');
        } finally { this.addingCopy.set(false); }
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
