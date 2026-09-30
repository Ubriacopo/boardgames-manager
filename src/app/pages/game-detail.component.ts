import {Component, OnInit} from '@angular/core';
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
    savingDimensions = false;
    dimensionsError = '';

    constructor(readonly library: LibraryService, private readonly route: ActivatedRoute, private readonly router: Router,) {
    }

    ngOnInit(): void {
        this.gameId = this.route.snapshot.paramMap.get('id') ?? '';
    }

    location(boxId: number | null): string {
        return this.library.boxes().find((box) => box.id === boxId)?.description ?? 'Unassigned';
    }

    back(): void {
        void this.router.navigate(['/library'], {queryParams: {tab: 'collection'}});
    }

    async saveDimensions(dimensions: {width: number; height: number; depth: number}): Promise<void> {
        this.dimensionsError = '';
        this.savingDimensions = true;
        try {
            await this.library.updateGameDimensions(this.gameId, dimensions);
        } catch (error) {
            this.dimensionsError = error instanceof Error ? error.message : 'Unable to save dimensions.';
        } finally {
            this.savingDimensions = false;
        }
    }
}
