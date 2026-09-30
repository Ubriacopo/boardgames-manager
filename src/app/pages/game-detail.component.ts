import {Component, OnInit} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {MatButtonModule} from '@angular/material/button';
import {ActivatedRoute, Router} from '@angular/router';
import {MatIconModule} from '@angular/material/icon';
import {LibraryService} from '../services/library.service';
import {GameDetailViewComponent} from '../components/game-detail-view.component';

@Component({
    standalone: true,
    imports: [FormsModule, GameDetailViewComponent, MatButtonModule, MatIconModule],
    templateUrl: './game-detail.component.html',
})
export class GameDetailComponent implements OnInit {
    gameId = '';
    dimensions = {width: 50, height: 200, depth: 100};
    savingDimensions = false;
    dimensionsError = '';

    constructor(readonly library: LibraryService, private readonly route: ActivatedRoute, private readonly router: Router,) {
    }

    ngOnInit(): void {
        this.gameId = this.route.snapshot.paramMap.get('id') ?? '';
        const game = this.library.game(this.gameId);
        if (game) {
            this.dimensions = {
                width: game.box_width_mm,
                height: game.box_height_mm,
                depth: game.box_depth_mm,
            };
        }
    }

    location(boxId: number | null): string {
        return this.library.boxes().find((box) => box.id === boxId)?.description ?? 'Unassigned';
    }

    back(): void {
        void this.router.navigate(['/library'], {queryParams: {tab: 'collection'}});
    }

    async saveDimensions(): Promise<void> {
        this.dimensionsError = '';
        this.savingDimensions = true;
        try {
            await this.library.updateGameDimensions(this.gameId, this.dimensions);
        } catch (error) {
            this.dimensionsError = error instanceof Error ? error.message : 'Unable to save dimensions.';
        } finally {
            this.savingDimensions = false;
        }
    }
}
