import {DatePipe, DecimalPipe} from '@angular/common';
import {Component, EventEmitter, Input, OnChanges, Output, SimpleChanges} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {MatButtonModule} from '@angular/material/button';
import {MatIconModule} from '@angular/material/icon';
import {RouterLink} from '@angular/router';
import {
    getBggOverview,
    type BggGameMetadata,
    type BggOverview,
} from '../../utils/bggData';
import {ReviewService, type LocalReviewSummary} from '../services/review.service';

@Component({
    selector: 'app-game-detail-view',
    standalone: true,
    imports: [DatePipe, DecimalPipe, FormsModule, MatButtonModule, MatIconModule, RouterLink],
    templateUrl: './game-detail-view.component.html',
})
export class GameDetailViewComponent implements OnChanges {
    @Input({required: true}) bggId = 0;
    @Input({required: true}) name = '';
    @Input({required: true}) releaseYear: number | null = null;
    @Input() imageUrl: string | null = null;
    @Input() metadata?: BggGameMetadata;
    @Input() owned = false;
    @Input() location = '';
    @Input() bggUrl = '';
    @Input() backLabel = 'Back';
    @Input() actionLabel = 'Add to library';
    @Input() actionDisabled = false;
    @Input() error = '';
    @Input() boxWidthMm: number | null = null;
    @Input() boxHeightMm: number | null = null;
    @Input() boxDepthMm: number | null = null;
    @Input() savingDimensions = false;
    @Input() dimensionsError = '';
    @Output() readonly back = new EventEmitter<void>();
    @Output() readonly primaryAction = new EventEmitter<void>();
    @Output() readonly dimensionsSave = new EventEmitter<{ width: number; height: number; depth: number }>();

    localSummary: LocalReviewSummary = {average: null, count: 0, rank: null, reviews: []};
    bggOverview?: BggOverview;
    detailTab: 'overview' | 'ratings' | 'dimensions' = 'overview';
    dimensions = {width: 50, height: 200, depth: 100};

    constructor(private readonly reviews: ReviewService) {
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['bggId'] && this.bggId) void this.loadReviews();
        if (changes['boxWidthMm'] || changes['boxHeightMm'] || changes['boxDepthMm']) {
            this.dimensions = {
                width: this.boxWidthMm ?? 50,
                height: this.boxHeightMm ?? 200,
                depth: this.boxDepthMm ?? 100,
            };
        }
    }

    saveDimensions(): void {
        this.dimensionsSave.emit({...this.dimensions});
    }

    private async loadReviews(): Promise<void> {
        await Promise.allSettled([
            this.loadLocalReviews(),
            getBggOverview(this.bggId).then((overview) => this.bggOverview = overview),
        ]);
    }

    private async loadLocalReviews(): Promise<void> {
        this.localSummary = await this.reviews.summary(this.bggId);
    }
}
