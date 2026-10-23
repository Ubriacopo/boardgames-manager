import type {BoxDimensions, BoxSizeSelection} from '../../entities/BoardGame';
import {GameBoxSizeFormComponent} from './game-box-size-form.component';
import {LibraryChipComponent} from './library-chip.component';
import {DatePipe, DecimalPipe} from '@angular/common';
import {
    ChangeDetectorRef,
    Component,
    EventEmitter,
    Input,
    OnChanges,
    Output,
    SimpleChanges,
    signal
} from '@angular/core';
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
import {GameCatalogService} from '../services/game-catalog.service';
import {GameAdminEditorComponent} from './game-admin-editor.component';
import {getBggGameId} from '../../utils/bggData';
import {renderMarkdown} from '../../utils/renderMarkdown';
import {ReviewService, type LocalReviewSummary} from '../services/review.service';

@Component({
    selector: 'app-game-detail-view',
    standalone: true,
    imports: [GameBoxSizeFormComponent, LibraryChipComponent, DatePipe, DecimalPipe, MatButtonModule, MatIconModule, MatDialogModule, RouterLink],
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
    @Input() libraryName = '';
    @Input() libraryColor = '#287f82';
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
    readonly definitionError = signal('');
    detailTab: 'overview' | 'ratings' | 'dimensions' = 'overview';

    constructor(private readonly reviews: ReviewService, readonly auth: AuthService, private readonly covers: GameCoverService, private readonly catalog: GameCatalogService, private readonly dialog: MatDialog, private readonly changeDetector: ChangeDetectorRef) {
    }

    get coverGameId(): number {
        return this.bggId || getBggGameId(this.bggUrl) || 0;
    }

    get definition() {
        return this.catalog.definitionFor(this.gameDefinitionId, this.coverGameId);
    }

    get displayName(): string {
        return this.definition?.name ?? this.name;
    }

    get displayYear(): number | null {
        return this.definition?.release_year ?? this.releaseYear;
    }

    get displayBggUrl(): string {
        return this.definition?.bgg_url ?? this.bggUrl;
    }

    coverUrl(): string | null {
        return this.covers.urls()[this.coverGameId]
                ?? (this.definition ? this.definition.image_url : this.imageUrl) ?? this.bggOverview?.imageUrl ?? null;
    }

    wallpaperUrl(): string | null {
        return this.covers.wallpapers()[this.coverGameId] ?? null;
    }

    logoUrl(): string | null {
        return this.covers.logos()[this.coverGameId] ?? this.coverUrl();
    }

    logoWidth(): string {
        return `min(100%, ${420 * this.logoRatio()}px)`;
    }

    onLogoLoad(event: Event): void {
        const image = event.target as HTMLImageElement;
        if (image.naturalWidth && image.naturalHeight) this.logoRatio.set(image.naturalWidth / image.naturalHeight);
    }

    editGame(): void {
        if (!this.auth.isAdmin() || (!this.coverGameId && !this.gameDefinitionId)) return;
        this.dialog.open(GameAdminEditorComponent, {
            width: '760px', maxWidth: '95vw', maxHeight: '90dvh',
            data: {
                gameId: this.definition?.id ?? this.gameDefinitionId,
                bggId: this.coverGameId, name: this.displayName, releaseYear: this.displayYear,
                imageUrl: (this.definition ? this.definition.image_url : this.imageUrl) ?? this.bggOverview?.imageUrl ?? null,
                bggUrl: this.displayBggUrl,
            },
        });
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['bggId'] && this.bggId) void this.loadReviews();
        if (changes['bggId'] || changes['bggUrl'] || changes['gameDefinitionId']) void this.loadDefinition();
    }

    async loadDefinition(): Promise<void> {
        this.definitionError.set('');
        if (!this.auth.session()) return;
        const gameId = this.gameDefinitionId;
        const bggId = this.coverGameId;
        try {
            await this.catalog.findDefinition(gameId, bggId);
        } catch {
            if (gameId === this.gameDefinitionId && bggId === this.coverGameId) {
                this.definitionError.set('Saved game details could not be loaded.');
            }
        }
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
