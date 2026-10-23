import type { BoxDimensions, BoxSizeSelection } from '../../entities/BoardGame';
import { GameBoxSizeFormComponent } from './game-box-size-form.component';
import {DatePipe, DecimalPipe} from '@angular/common';
import {ChangeDetectorRef, Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, signal} from '@angular/core';
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
import {GameCoverService, type ArtworkKind} from '../services/game-cover.service';
import {CoverEditorComponent} from './cover-editor.component';
import {getBggGameId} from '../../utils/bggData';
import {renderMarkdown} from '../../utils/renderMarkdown';
import {ReviewService, type LocalReviewSummary} from '../services/review.service';

@Component({
    selector: 'app-game-detail-view',
    standalone: true,
    imports: [GameBoxSizeFormComponent, DatePipe, DecimalPipe, FormsModule, MatButtonModule, MatIconModule, MatDialogModule, RouterLink],
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
    @Input() gameDefinitionId = '';
    @Input() selectedSizeId: string | null = null;
    @Input() customDimensions: BoxDimensions | null = null;
    @Input() savingDimensions = false;
    @Input() dimensionsError = '';
    @Output() readonly back = new EventEmitter<void>();
    @Output() readonly primaryAction = new EventEmitter<void>();
    @Output() readonly specialAction = new EventEmitter<void>();
    @Output() readonly boxSizeSave = new EventEmitter<BoxSizeSelection>();

    localSummary: LocalReviewSummary = {average: null, count: 0, rank: null, reviews: []};
    bggReviews: BggReview[] = [];
    bggOverview?: BggOverview;
    private readonly logoRatio = signal(1);
    detailTab: 'overview' | 'ratings' | 'dimensions' = 'overview';

    constructor(private readonly reviews: ReviewService, readonly auth: AuthService, private readonly covers: GameCoverService, private readonly dialog: MatDialog, private readonly changeDetector: ChangeDetectorRef) {
    }

    get coverGameId(): number { return this.bggId || getBggGameId(this.bggUrl) || 0; }

    coverUrl(): string | null {
        return this.covers.urls()[this.coverGameId] ?? this.imageUrl ?? this.bggOverview?.imageUrl ?? null;
    }

    wallpaperUrl(): string | null {
        return this.covers.wallpapers()[this.coverGameId] ?? null;
    }

    logoUrl(): string | null {
        return this.covers.logos()[this.coverGameId] ?? this.coverUrl();
    }

    hasLogo(): boolean { return !!this.covers.logos()[this.coverGameId]; }
    hasBoxSide(): boolean { return !!this.covers.boxSides()[this.coverGameId]; }
    logoWidth(): string { return `min(100%, ${420 * this.logoRatio()}px)`; }

    onLogoLoad(event: Event): void {
        const image = event.target as HTMLImageElement;
        if (image.naturalWidth && image.naturalHeight) this.logoRatio.set(image.naturalWidth / image.naturalHeight);
    }

    editLogo(): void { this.editArtwork('logo'); }
    editBoxSide(): void { this.editArtwork('box-side'); }

    editCover(): void { this.editArtwork('cover'); }
    editWallpaper(): void { this.editArtwork('wallpaper'); }

    private editArtwork(kind: ArtworkKind): void {
        if (!this.auth.isAdmin() || !this.coverGameId) return;
        const imageUrl = {
            cover: this.coverUrl(), wallpaper: this.wallpaperUrl() ?? this.coverUrl(),
            logo: this.logoUrl(), 'box-side': this.covers.boxSides()[this.coverGameId] ?? this.wallpaperUrl() ?? this.coverUrl(),
        }[kind];
        this.dialog.open(CoverEditorComponent, {
            width: '760px', maxWidth: '95vw', panelClass: 'cover-editor-dialog',
            data: {
                bggId: this.coverGameId, name: this.name, kind,
                imageUrl,
            },
        });
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['bggId'] && this.bggId) void this.loadReviews();
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
