import {DatePipe, DecimalPipe} from '@angular/common';
import {ChangeDetectorRef, Component, EventEmitter, Input, OnChanges, Output, SimpleChanges} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {MatButtonModule} from '@angular/material/button';
import {MatIconModule} from '@angular/material/icon';
import {RouterLink} from '@angular/router';
import {
    getBggOverview,
    getBggReviews,
    type BggGameMetadata,
    type BggOverview,
    type BggReview,
} from '../../utils/bggData';
import {MatDialog, MatDialogModule} from '@angular/material/dialog';
import {AuthService} from '../services/auth.service';
import {GameCoverService} from '../services/game-cover.service';
import {CoverEditorComponent} from './cover-editor.component';
import {getBggGameId} from '../../utils/bggData';
import {renderMarkdown} from '../../utils/renderMarkdown';
import {ReviewService, type LocalReviewSummary} from '../services/review.service';

@Component({
    selector: 'app-game-detail-view',
    standalone: true,
    imports: [DatePipe, DecimalPipe, FormsModule, MatButtonModule, MatIconModule, MatDialogModule, RouterLink],
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
    bggReviews: BggReview[] = [];
    bggOverview?: BggOverview;
    detailTab: 'overview' | 'ratings' | 'dimensions' = 'overview';
    dimensions = {width: 50, height: 200, depth: 100};

    constructor(private readonly reviews: ReviewService, readonly auth: AuthService, private readonly covers: GameCoverService, private readonly dialog: MatDialog, private readonly changeDetector: ChangeDetectorRef) {
    }

    get coverGameId(): number { return this.bggId || getBggGameId(this.bggUrl) || 0; }

    coverUrl(): string | null {
        return this.covers.urls()[this.coverGameId] ?? this.imageUrl ?? this.bggOverview?.imageUrl ?? null;
    }

    editCover(): void {
        if (!this.auth.isAdmin() || !this.coverGameId) return;
        this.dialog.open(CoverEditorComponent, {
            width: '760px', maxWidth: '95vw', panelClass: 'cover-editor-dialog',
            data: { bggId: this.coverGameId, name: this.name, imageUrl: this.coverUrl() },
        });
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

    renderReview(markdown: string): string {
        return renderMarkdown(markdown);
    }

    private async loadReviews(): Promise<void> {
        await Promise.allSettled([
            this.loadLocalReviews(),
            getBggOverview(this.bggId).then((overview) => this.bggOverview = overview),
            getBggReviews(this.bggId).then((reviews) => this.bggReviews = reviews),
        ]);
        this.changeDetector.markForCheck();
    }

    private async loadLocalReviews(): Promise<void> {
        this.localSummary = await this.reviews.summary(this.bggId);
    }
}
